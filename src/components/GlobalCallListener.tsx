import { useState, useEffect, useRef, useCallback, Component, type ReactNode } from "react";
import { Phone, PhoneOff, PhoneIncoming } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { io, Socket } from "socket.io-client";

/* ── Error Boundary ── */
class CallErrorBoundary extends Component<
  { children: ReactNode; onForceClose: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.error("📞 Call overlay crashed:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center">
          <p className="text-white text-sm mb-4">L&apos;appel a rencontré une erreur</p>
          <button
            onClick={this.props.onForceClose}
            className="px-6 py-2.5 rounded-full bg-red-500 text-white text-sm font-medium"
          >
            Fermer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type IncomingCall = {
  offer: any;
  from: { _id: string; firstName: string; lastName: string };
};

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

// ── Module-level state ──
let lastOutgoingCallTime = 0;
const OUTGOING_COOLDOWN = 3000;
let lastCallEndTime = 0;
const CALL_END_COOLDOWN = 2000;
let outgoingCallId = 0;
const processedCallInits = new Set<string>();
let parentSocketRef: Socket | null = null;

function cleanupDedup() {
  if (processedCallInits.size > 100) {
    const arr = Array.from(processedCallInits);
    for (let i = 0; i < Math.floor(arr.length / 2); i++)
      processedCallInits.delete(arr[i]!);
  }
}

function GlobalCallListenerInner() {
  const { user } = useAuth();
  const [renderState, setRenderState] = useState<{
    phase: "none" | "ringing" | "active";
    incomingCall: IncomingCall | null;
    callPeer: { _id: string; firstName: string; lastName: string } | null;
    callDirection: "incoming" | "outgoing";
  }>({
    phase: "none",
    incomingCall: null,
    callPeer: null,
    callDirection: "outgoing",
  });

  const socketRef = useRef<Socket | null>(null);
  const phaseRef = useRef<"none" | "ringing" | "active">("none");
  const callEndedRef = useRef(false);
  const peerEndedRef = useRef(false);
  const renderStateRef = useRef(renderState);
  renderStateRef.current = renderState;

  // ── Parent-level buffer for call events that arrive BEFORE overlay mounts ──
  const bufferedIce = useRef<any[]>([]);
  const bufferedAnswer = useRef<any[]>([]);

  // ── Permission management ──
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      if (permissionsChecked) return;
      
      try {
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log("📞 Microphone permission granted");
        
        // Request notification permission
        if ("Notification" in window && Notification.permission === "default") {
          await Notification.requestPermission();
          console.log("📞 Notification permission:", Notification.permission);
        }
        
        setPermissionsChecked(true);
      } catch (error) {
        console.error("📞 Permission request failed:", error);
        // Don't block the app if permissions are denied
        setPermissionsChecked(true);
      }
    };

    // Check permissions on first user interaction or after a delay
    const timer = setTimeout(checkPermissions, 2000);
    return () => clearTimeout(timer);
  }, [permissionsChecked]);

  // ── Caller ringtone management ──
  const callerRingtoneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play ringtone for caller when outgoing call starts
    if (renderState.phase === "active" && renderState.callDirection === "outgoing") {
      if (!callerRingtoneRef.current) {
        // Try to load the ringtone file
        callerRingtoneRef.current = new Audio("/sounds/caller-ringtone.mp3");
        callerRingtoneRef.current.loop = true;
        callerRingtoneRef.current.volume = 0.5;
        
        // Handle load errors
        callerRingtoneRef.current.addEventListener('error', (e) => {
          console.error("📞 Failed to load caller ringtone:", e);
          // Fallback to Web Audio API if file fails
          createFallbackRingtone();
        });
      }
      
      // Try to play
      callerRingtoneRef.current.play().catch((error) => {
        console.error("📞 Failed to play caller ringtone:", error);
        createFallbackRingtone();
      });
    } else {
      if (callerRingtoneRef.current) {
        callerRingtoneRef.current.pause();
        callerRingtoneRef.current.currentTime = 0;
      }
      stopFallbackRingtone();
    }

    return () => {
      if (callerRingtoneRef.current) {
        callerRingtoneRef.current.pause();
        callerRingtoneRef.current.currentTime = 0;
      }
      stopFallbackRingtone();
    };
  }, [renderState.phase, renderState.callDirection]);

  // Fallback ringtone using Web Audio API
  const fallbackAudioCtxRef = useRef<AudioContext | null>(null);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createFallbackRingtone = useCallback(() => {
    if (fallbackAudioCtxRef.current) return;
    
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      fallbackAudioCtxRef.current = ctx;
      
      const playTone = () => {
        if (!fallbackAudioCtxRef.current) return;
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 440;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
          console.error("📞 Fallback ringtone error:", e);
        }
      };
      
      playTone();
      fallbackIntervalRef.current = setInterval(playTone, 1000);
    } catch (e) {
      console.error("📞 Failed to create fallback ringtone:", e);
    }
  }, []);

  const stopFallbackRingtone = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    if (fallbackAudioCtxRef.current) {
      try {
        fallbackAudioCtxRef.current.close();
      } catch (e) {
        console.error("📞 Error closing fallback audio context:", e);
      }
      fallbackAudioCtxRef.current = null;
    }
  }, []);

  const endCall = useCallback((sendMissed = false) => {
    if (callEndedRef.current) {
      console.log("📞 endCall skipped — already ended");
      return;
    }
    callEndedRef.current = true;
    lastCallEndTime = Date.now();

    const s = socketRef.current;
    const st = renderStateRef.current;
    const peer = st.callPeer;
    const dir = st.callDirection;

    if (!peerEndedRef.current && s?.connected && peer) {
      console.log("📞 endCall — emitting call-end to:", peer._id, "sendMissed:", sendMissed);
      s.emit("call-end", { to: peer._id, callId: outgoingCallId, from: user?.id });
    } else {
      console.log("📞 endCall — NOT emitting:", {
        peerEnded: peerEndedRef.current,
        connected: s?.connected,
        hasPeer: !!peer,
      });
    }

    if (sendMissed && dir === "outgoing" && peer) {
      const apiBase =
        import.meta.env["VITE_API_URL"] || "http://localhost:5200";
      fetch(`${apiBase}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiverId: peer._id,
          content: " ",
          attachments: [{ type: "call", status: "missed", url: "" }],
        }),
      }).catch(() => {});
    }

    // Clear parent-level buffers
    bufferedIce.current = [];
    bufferedAnswer.current = [];

    setRenderState({
      phase: "none",
      incomingCall: null,
      callPeer: null,
      callDirection: "outgoing",
    });
    phaseRef.current = "none";
  }, []);

  // === SOCKET ===
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token") || "";
    if (!token) return;

    const socket = io(
      import.meta.env["VITE_API_URL"] || "http://localhost:5200",
      {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        reconnectionDelayMax: 5000,
        forceNew: false,
        timeout: 10000,
      }
    );
    socketRef.current = socket;
    parentSocketRef = socket;

    socket.on("connect", () => {
      console.log("📞 Socket connected:", socket.id, "transport:", socket.io.engine.transport.name);
    });
    socket.on("socket-authenticated", (d: any) => {
      (socket as any).userId = d.userId;
      console.log("📞 Socket auth:", d.userId);
    });
    socket.on("disconnect", (reason) =>
      console.log("📞 Socket disconnected:", reason)
    );
    socket.on("connect_error", (error) => {
      console.error("📞 Socket connection error:", error);
    });

    // === PARENT-LEVEL BUFFER for call-answer and call-ice-candidate ===
    // These arrive BEFORE the overlay mounts (race condition fix)
    const handleParentAnswer = (data: any) => {
      if (phaseRef.current === "active") {
        console.log("📞 Parent buffering call-answer (overlay not mounted yet)");
        bufferedAnswer.current.push(data);
      }
    };
    const handleParentIce = (data: any) => {
      if (phaseRef.current === "active") {
        console.log("📞 Parent buffering call-ice-candidate (overlay not mounted yet)");
        bufferedIce.current.push(data);
      }
    };
    socket.on("call-answer", handleParentAnswer);
    socket.on("call-ice-candidate", handleParentIce);

    // === INCOMING CALL ===
    socket.on("call-init", (data: any) => {
      // CRITICAL: Ignore our own call-init
      if (data.from?._id === user?.id) {
        console.log("📞 call-init from SELF — ignoring");
        return;
      }

      const dedupeKey = `${data.from?._id}-${Math.floor(
        (data.timestamp || 0) / 2000
      )}`;
      console.log(
        "📞 INCOMING call-init from:",
        data.from?.firstName,
        "dedupeKey:",
        dedupeKey,
        "phase:",
        phaseRef.current
      );

      if (processedCallInits.has(dedupeKey)) {
        console.log("📞 call-init DUPLICATE — ignoring");
        return;
      }
      processedCallInits.add(dedupeKey);
      cleanupDedup();

      if (phaseRef.current !== "none") {
        console.log("📞 call-init IGNORED — already", phaseRef.current, "sending busy");
        if (socket.connected && data.from?._id) {
          socket.emit("call-end", {
            to: data.from._id,
            callId: data.callId || "busy",
            from: user?.id,
          });
        }
        return;
      }
      if (Date.now() - lastCallEndTime < CALL_END_COOLDOWN) {
        console.log("📞 IGNORED — cooldown");
        if (socket.connected && data.from?._id) {
          socket.emit("call-end", {
            to: data.from._id,
            callId: data.callId || "busy",
            from: user?.id,
          });
        }
        return;
      }

      console.log("📞 NEW incoming call from:", data.from?.firstName);

      // Show notification for incoming call
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`Appel entrant de ${data.from?.firstName}`, {
          body: "Appuyez pour répondre",
          icon: "/logo.png",
          tag: `call-${data.from?._id}`,
          requireInteraction: true,
        });
      }

      // Clear any stale buffers
      bufferedIce.current = [];
      bufferedAnswer.current = [];

      setRenderState({
        phase: "ringing",
        incomingCall: { offer: data.offer, from: data.from },
        callPeer: null,
        callDirection: "outgoing",
      });
      phaseRef.current = "ringing";
    });

    // === CALL ENDED ===
    socket.on("call-ended", (data: any) => {
      if (data.from === user?.id) {
        console.log("📞 call-ended from SELF — ignoring");
        return;
      }

      const callId = data?.callId || "unknown";
      const dedupeKey = `ended-${callId}-${data?.from || "x"}`;
      if (processedCallInits.has(dedupeKey)) {
        console.log("📞 call-ended DUPLICATE — ignoring");
        return;
      }
      processedCallInits.add(dedupeKey);
      cleanupDedup();

      console.log(
        "📞 call-ended received:",
        callId,
        "phase:",
        phaseRef.current,
        "from:",
        data.from
      );
      lastCallEndTime = Date.now();
      callEndedRef.current = true;
      peerEndedRef.current = true;

      // Clear buffers
      bufferedIce.current = [];
      bufferedAnswer.current = [];

      setRenderState({
        phase: "none",
        incomingCall: null,
        callPeer: null,
        callDirection: "outgoing",
      });
      phaseRef.current = "none";
    });

    return () => {
      parentSocketRef = null;
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // === OUTGOING CALL TRIGGER ===
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (
        e.detail?.targetUser &&
        socketRef.current?.connected &&
        user &&
        phaseRef.current === "none"
      ) {
        if (Date.now() - lastOutgoingCallTime < OUTGOING_COOLDOWN) return;
        if (!(socketRef.current as any).userId) {
          console.log("📞 Socket not authenticated yet, waiting...");
          const check = () => {
            if ((socketRef.current as any)?.userId) {
              console.log("📞 Socket now authenticated, starting call");
              lastOutgoingCallTime = Date.now();
              outgoingCallId++;
              callEndedRef.current = false;
              peerEndedRef.current = false;
              // Clear stale buffers
              bufferedIce.current = [];
              bufferedAnswer.current = [];
              setRenderState({
                phase: "active",
                incomingCall: null,
                callPeer: e.detail.targetUser,
                callDirection: "outgoing",
              });
              phaseRef.current = "active";
            }
          };
          setTimeout(check, 500);
          setTimeout(check, 1500);
          setTimeout(check, 3000);
          return;
        }
        lastOutgoingCallTime = Date.now();
        outgoingCallId++;
        callEndedRef.current = false;
        peerEndedRef.current = false;
        // Clear stale buffers
        bufferedIce.current = [];
        bufferedAnswer.current = [];
        console.log(
          "📞 START OUTGOING to:",
          e.detail.targetUser.firstName
        );

        setRenderState({
          phase: "active",
          incomingCall: null,
          callPeer: e.detail.targetUser,
          callDirection: "outgoing",
        });
        phaseRef.current = "active";
      }
    };
    window.addEventListener("start-outgoing-call", handler as any);
    return () =>
      window.removeEventListener("start-outgoing-call", handler as any);
  }, [user]);

  const acceptCall = useCallback((call: IncomingCall) => {
    console.log("📞 ACCEPTING call from:", call.from.firstName);
    callEndedRef.current = false;
    peerEndedRef.current = false;

    // Clear stale buffers from previous attempts
    bufferedIce.current = [];
    bufferedAnswer.current = [];

    setRenderState({
      phase: "active",
      incomingCall: call,
      callPeer: call.from,
      callDirection: "incoming",
    });
    phaseRef.current = "active";
  }, []);

  const rejectCall = useCallback(() => {
    const call = renderState.incomingCall;
    if (call && socketRef.current?.connected) {
      socketRef.current.emit("call-end", {
        to: call.from._id,
        callId: "reject",
        from: user?.id,
      });
    }
    lastCallEndTime = Date.now();
    setRenderState((prev) => ({
      ...prev,
      phase: "none",
      incomingCall: null,
    }));
    phaseRef.current = "none";
    bufferedIce.current = [];
    bufferedAnswer.current = [];
  }, [renderState.incomingCall, user?.id]);

  const { phase, incomingCall, callPeer, callDirection } = renderState;

  if (phase === "active" && callPeer) {
    return (
      <CallErrorBoundary
        onForceClose={() => {
          phaseRef.current = "none";
          callEndedRef.current = true;
          bufferedIce.current = [];
          bufferedAnswer.current = [];
          setRenderState({
            phase: "none",
            incomingCall: null,
            callPeer: null,
            callDirection: "outgoing",
          });
        }}
      >
        <ActiveCallOverlay
          key={`call-${callPeer._id}-${outgoingCallId}`}
          peer={callPeer}
          socket={socketRef.current}
          user={user}
          direction={callDirection}
          incomingCall={callDirection === "incoming" ? incomingCall : null}
          onEnd={endCall}
          parentIceBuffer={bufferedIce.current.splice(0)}
          parentAnswerBuffer={bufferedAnswer.current.splice(0)}
        />
      </CallErrorBoundary>
    );
  }

  if (phase === "ringing" && incomingCall) {
    return (
      <IncomingCallUI
        key={`ring-${incomingCall.from._id}`}
        from={incomingCall.from}
        onAccept={() => acceptCall(incomingCall)}
        onReject={rejectCall}
      />
    );
  }

  return null;
}

export function GlobalCallListener() {
  // Early return before any hooks for SSR
  if (typeof window === 'undefined') {
    return null;
  }

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything before mount
  if (!mounted) {
    return null;
  }

  return <GlobalCallListenerInner />;
}

/* ══════════════════════════════════════
   Incoming Call UI
   ══════════════════════════════════════ */
function IncomingCallUI({
  from,
  onAccept,
  onReject,
}: {
  from: { _id: string; firstName: string; lastName: string };
  onAccept: () => void;
  onReject: () => void;
}) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    let ctx: AudioContext | null = null;

    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const playTone = () => {
        if (stoppedRef.current) return;
        try {
          const osc = ctx!.createOscillator();
          const gain = ctx!.createGain();
          osc.connect(gain);
          gain.connect(ctx!.destination);
          osc.frequency.value = 440;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.25, ctx!.currentTime);
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            ctx!.currentTime + 0.35
          );
          osc.start(ctx!.currentTime);
          osc.stop(ctx!.currentTime + 0.35);
        } catch {}
      };
      playTone();
      intervalRef.current = setInterval(playTone, 800);
    } catch {}

    return () => {
      stoppedRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      try {
        audioCtxRef.current?.close();
      } catch {}
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <PhoneIncoming className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {from.firstName} {from.lastName}
        </h2>
        <p className="text-muted-foreground">Appel entrant...</p>
      </div>
      
      <div className="flex gap-4">
        <button
          onClick={onAccept}
          className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
        >
          <Phone className="w-8 h-8 text-white" />
        </button>
        <button
          onClick={onReject}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
        >
          <PhoneOff className="w-8 h-8 text-white" />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   Active Call — WebRTC + controls
   ══════════════════════════════════════ */
function ActiveCallOverlay({
  peer,
  socket,
  user,
  direction,
  incomingCall,
  onEnd,
  parentIceBuffer,
  parentAnswerBuffer,
}: {
  peer: { _id: string; firstName: string; lastName: string };
  socket: any;
  user: any;
  direction: "incoming" | "outgoing";
  incomingCall: IncomingCall | null;
  onEnd: (sendMissed?: boolean) => void;
  parentIceBuffer: any[];
  parentAnswerBuffer: any[];
}) {
  const [status, setStatus] = useState<"connecting" | "connected">(
    "connecting"
  );
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);
  const unmountedRef = useRef(false);
  const statusRef = useRef<"connecting" | "connected">("connecting");
  statusRef.current = status;

  // Local buffers for ICE/answer
  const iceBuffer = useRef<any[]>([]);
  const answerBuffer = useRef<any[]>([]);

  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  // Seed buffers with parent-level data
  useEffect(() => {
    if (parentIceBuffer.length > 0) {
      console.log("📞 Overlay: ingesting", parentIceBuffer.length, "parent-buffered ICE candidates");
      iceBuffer.current.push(...parentIceBuffer);
    }
    if (parentAnswerBuffer.length > 0) {
      console.log("📞 Overlay: ingesting", parentAnswerBuffer.length, "parent-buffered answers");
      answerBuffer.current.push(...parentAnswerBuffer);
    }
    // Drain immediately after ingesting
    setTimeout(() => drainBuffer(), 50);
    setTimeout(() => drainBuffer(), 200);
    setTimeout(() => drainBuffer(), 500);
  }, []);

  const cleanup = useCallback(() => {
    if (unmountedRef.current) return;
    unmountedRef.current = true;
    console.log("📞 cleanup called");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (peerRef.current) {
      try {
        peerRef.current.close();
      } catch {}
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    iceBuffer.current = [];
    answerBuffer.current = [];
  }, []);

  // Drain buffers — ANSWER FIRST, then ICE
  const drainBuffer = useCallback(async () => {
    if (unmountedRef.current) return;
    const pc = peerRef.current;
    if (!pc) {
      const total = answerBuffer.current.length + iceBuffer.current.length;
      if (total > 0) {
        console.log("📞 drainBuffer: peer not ready, buffers:", answerBuffer.current.length, iceBuffer.current.length);
      }
      return;
    }

    // 1) Apply buffered answer FIRST
    while (
      answerBuffer.current.length > 0 &&
      peerRef.current &&
      !unmountedRef.current
    ) {
      const data = answerBuffer.current.shift()!;
      try {
        await peerRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
        console.log("📞 Applied buffered call-answer → connected!");
        if (!unmountedRef.current) {
          setStatus("connected");
          statusRef.current = "connected";
        }
      } catch (e) {
        console.error("📞 Buffered answer error:", e);
      }
    }

    // 2) Apply buffered ICE candidates
    while (
      iceBuffer.current.length > 0 &&
      peerRef.current &&
      !unmountedRef.current
    ) {
      const data = iceBuffer.current.shift()!;
      try {
        await peerRef.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
        console.log("📞 Applied buffered ICE candidate");
      } catch (e: any) {
        if (e?.name === "InvalidStateError") {
          // Remote description not set yet — re-queue
          iceBuffer.current.push(data);
          console.log("📞 ICE re-queued (remote desc not ready)");
          break;
        }
        console.error("📞 Buffered ICE error:", e);
      }
    }
  }, []);

  // === SUBSCRIBE to call-answer and call-ice-candidate ===
  useEffect(() => {
    const s = parentSocketRef;
    if (!s) {
      console.error("📞 No parent socket available!");
      return;
    }

    console.log(
      "📞 Subscribing to call-answer and call-ice-candidate on socket, connected:",
      s.connected
    );

    const handleAnswer = (data: any) => {
      console.log(
        "📞 call-answer received, peer ready:",
        !!peerRef.current,
        "unmounted:",
        unmountedRef.current
      );
      if (unmountedRef.current) return;
      if (data.answer) {
        answerBuffer.current.push(data);
        console.log("📞 call-answer buffered, calling drainBuffer");
        drainBuffer();
      }
    };

    const handleIce = (data: any) => {
      if (unmountedRef.current) return;
      if (data.candidate) {
        iceBuffer.current.push(data);
        console.log(
          "📞 ICE candidate queued, peer ready:",
          !!peerRef.current,
          "buffer:",
          iceBuffer.current.length
        );
        drainBuffer();
      }
    };

    s.on("call-answer", handleAnswer);
    s.on("call-ice-candidate", handleIce);

    return () => {
      console.log("📞 Unsubscribing from call-answer and call-ice-candidate");
      s.off("call-answer", handleAnswer);
      s.off("call-ice-candidate", handleIce);
    };
  }, [peer._id, drainBuffer]);

  // Periodic drain
  useEffect(() => {
    const interval = setInterval(() => {
      if (!unmountedRef.current && peerRef.current) {
        drainBuffer();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [drainBuffer]);

  // === SETUP PEER ===
  const setupPeer = useCallback(
    (targetId: string, stream: MediaStream) => {
      console.log("📞 Setting up peer connection to:", targetId);
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate && !unmountedRef.current) {
          const s = parentSocketRef;
          if (s?.connected) {
            console.log("📞 Sending ICE candidate to:", targetId, "candidate:", event.candidate.candidate?.substring(0, 50) + "...");
            s.emit("call-ice-candidate", {
              to: targetId,
              candidate: event.candidate.toJSON(),
              from: user?.id,
            });
          } else {
            console.log("📞 Socket not connected, ICE candidate NOT sent");
          }
        } else if (!event.candidate) {
          console.log("📞 ICE gathering complete");
        }
      };

      pc.onicecandidateerror = (event: any) => {
        console.error("📞 ICE candidate error:", event);
      };

      pc.ontrack = (event) => {
        console.log("📞 ontrack received!");
        if (
          !unmountedRef.current &&
          remoteAudioRef.current &&
          event.streams[0]
        ) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        if (unmountedRef.current) return;
        const state = pc.connectionState;
        console.log("📞 WebRTC connection state:", state);
        if (state === "connected") {
          setStatus("connected");
          statusRef.current = "connected";
        }
        if (state === "failed") {
          console.log("📞 WebRTC failed — waiting for timeout or recovery");
        }
        if (state === "closed") {
          console.log("📞 WebRTC closed → ending call");
          cleanup();
          onEndRef.current(false);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (!unmountedRef.current) {
          console.log("📞 ICE state:", pc.iceConnectionState);
          if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
            setStatus("connected");
            statusRef.current = "connected";
          }
        }
      };

      // Drain any candidates that arrived before peer was ready
      setTimeout(() => drainBuffer(), 100);
      setTimeout(() => drainBuffer(), 500);
      setTimeout(() => drainBuffer(), 1500);
      setTimeout(() => drainBuffer(), 3000);

      return pc;
    },
    [user?.id, cleanup, drainBuffer]
  );

  // OUTGOING: create offer
  useEffect(() => {
    if (direction !== "outgoing" || !socket || startedRef.current) return;
    startedRef.current = true;

    let aborted = false;

    (async () => {
      try {
        console.log("📞 Getting media for outgoing call");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (aborted || unmountedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        const pc = setupPeer(peer._id, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("📞 Local description set (offer)");

        // Wait for ICE gathering to start
        await new Promise((r) => setTimeout(r, 500));

        const s = parentSocketRef;
        if (!s?.connected) {
          console.error("📞 Socket not connected, aborting");
          cleanup();
          onEndRef.current(false);
          return;
        }

        console.log(
          "📞 Emitting call-init to:",
          peer._id,
          "callId:",
          outgoingCallId
        );
        s.emit("call-init", {
          to: peer._id,
          offer,
          from: {
            _id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          callId: outgoingCallId,
          timestamp: Date.now(),
        });
        console.log("📞 call-init emitted, waiting for call-answer...");
      } catch (e) {
        console.error("📞 Outgoing failed:", e);
        onEndRef.current(false);
      }
    })();

    return () => {
      aborted = true;
      cleanup();
    };
  }, [direction, socket, peer._id, user, setupPeer, cleanup]);

  // INCOMING: answer
  useEffect(() => {
    if (
      direction !== "incoming" ||
      !socket ||
      !incomingCall ||
      startedRef.current
    )
      return;
    startedRef.current = true;

    let aborted = false;

    (async () => {
      try {
        console.log("📞 Getting media for incoming call");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (aborted || unmountedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        const pc = setupPeer(incomingCall.from._id, stream);
        await pc.setRemoteDescription(
          new RTCSessionDescription(incomingCall.offer)
        );
        console.log(
          "📞 Remote description set (offer), creating answer..."
        );
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("📞 Local description set (answer)");

        // Wait for ICE candidates to generate
        await new Promise((r) => setTimeout(r, 500));

        const s = parentSocketRef;
        console.log("📞 Emitting call-answer to:", incomingCall.from._id);
        s?.emit("call-answer", {
          to: incomingCall.from._id,
          answer,
          from: user?.id,
        });
        console.log("📞 call-answer emitted, waiting for connection...");

        // Drain buffered candidates from the phone (may have arrived before peer was ready)
        setTimeout(() => drainBuffer(), 100);
        setTimeout(() => drainBuffer(), 500);
        setTimeout(() => drainBuffer(), 1500);
        setTimeout(() => drainBuffer(), 3000);
      } catch (e) {
        console.error("📞 Incoming failed:", e);
        onEndRef.current(false);
      }
    })();

    return () => {
      aborted = true;
      cleanup();
    };
  }, [direction, socket, incomingCall, setupPeer, cleanup, user, drainBuffer]);

  // Timer
  useEffect(() => {
    if (status === "connected") {
      setDuration(0);
      timerRef.current = setInterval(() => {
        if (!unmountedRef.current) setDuration((d) => d + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [status]);

  // Connection timeout — 45s
  useEffect(() => {
    if (status === "connecting") {
      const timeout = setTimeout(() => {
        if (!unmountedRef.current && statusRef.current === "connecting") {
          console.log("📞 Call timeout (45s) — ending");
          console.log("📞 Final state check - peer exists:", !!peerRef.current, "iceBuffer:", iceBuffer.current.length, "answerBuffer:", answerBuffer.current.length);
          cleanup();
          onEndRef.current(false);
        }
      }, 45000);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  const endCall = useCallback(() => {
    const wasConnected = status === "connected";
    console.log("📞 User ending call, wasConnected:", wasConnected);
    cleanup();
    onEndRef.current(!wasConnected);
  }, [cleanup, status]);

  const toggleMute = () => {
    localStreamRef.current
      ?.getAudioTracks()
      .forEach((t) => (t.enabled = muted));
    setMuted(!muted);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center">
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-6">
        <span className="text-primary text-3xl font-bold">
          {peer.firstName[0]}
          {peer.lastName[0]}
        </span>
      </div>
      <h2 className="text-xl font-bold text-white">
        {peer.firstName} {peer.lastName}
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        {status === "connecting" &&
          (direction === "outgoing"
            ? "Appel en cours..."
            : "Connexion...")}
        {status === "connected" && fmt(duration)}
      </p>
      {status === "connecting" && (
        <div className="flex gap-1 mt-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/50 animate-pulse"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-6 mt-12">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            muted
              ? "bg-red-500"
              : "bg-white/10 hover:bg-white/20"
          }`}
        >
          {muted ? (
            <PhoneOff className="h-6 w-6 text-white" />
          ) : (
            <Phone className="h-6 w-6 text-white" />
          )}
        </button>
        <button
          onClick={endCall}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors hover:scale-105"
        >
          <PhoneOff className="h-7 w-7 text-white" />
        </button>
      </div>
    </div>
  );
}
