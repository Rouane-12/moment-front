import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, PhoneIncoming } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type IncomingCall = {
  offer: any;
  from: { _id: string; firstName: string; lastName: string };
};

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/**
 * Global call system — works on ANY page.
 * Socket.io imported dynamically to avoid SSR issues.
 */
export function GlobalCallListener() {
  const { user } = useAuth();
  const [renderState, setRenderState] = useState<{
    phase: "none" | "ringing" | "active";
    incomingCall: IncomingCall | null;
    callPeer: IncomingCall["from"] | null;
    callDirection: "incoming" | "outgoing";
  }>({ phase: "none", incomingCall: null, callPeer: null, callDirection: "outgoing" });

  const socketRef = useRef<any>(null);
  const phaseRef = useRef<"none" | "ringing" | "active">("none");
  const callEndedRef = useRef(false);
  const peerEndedRef = useRef(false);
  const lastCallEndTimeRef = useRef(0);
  const processedCallIds = useRef<Set<string>>(new Set());
  const onEndRef = useRef<() => void>(() => {});
  const mountedRef = useRef(false);

  // Keep onEndRef fresh
  useEffect(() => { mountedRef.current = true; }, []);

  // End call function — defined early so onEndRef can reference it
  const endCall = useCallback(() => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;
    lastCallEndTimeRef.current = Date.now();

    const peer = renderState.callPeer;
    const dir = renderState.callDirection;
    const s = socketRef.current;

    // ONLY emit call-end if I initiated the end (not if peer already ended)
    if (!peerEndedRef.current && s?.connected && peer) {
      s.emit("call-end", { to: peer._id });
    }

    // Send missed call message
    if (dir === "outgoing" && peer && user) {
      fetch(`${import.meta.env["VITE_API_URL"] || "http://localhost:5200"}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiverId: peer._id,
          content: "Appel manqué",
          attachments: [{ type: "call", status: "missed", url: "" }],
        }),
      }).catch(() => {});
    }

    setRenderState({ phase: "none", incomingCall: null, callPeer: null, callDirection: "outgoing" });
    phaseRef.current = "none";
  }, [renderState.callPeer, renderState.callDirection, user]);

  useEffect(() => { onEndRef.current = endCall; }, [endCall]);

  // === SOCKET — only depends on user, imported dynamically ===
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token") || "";
    if (!token) return;

    let cancelled = false;

    // Dynamic import to avoid SSR issues
    import("socket.io-client").then(({ io }) => {
      if (cancelled) return;

      const socket = io(import.meta.env["VITE_API_URL"] || "http://localhost:5200", {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on("connect", () => console.log("📞 Socket connected:", socket.id));
      socket.on("socket-authenticated", (d: any) => {
        (socket as any).userId = d.userId;
        console.log("📞 Socket auth:", d.userId);
      });
      socket.on("disconnect", () => console.log("📞 Socket disconnected"));

      // === INCOMING CALL ===
      socket.on("call-init", (data: any) => {
        const callId = `${data.from?._id}-${Date.now()}`;
        console.log("📞 INCOMING call-init from:", data.from?.firstName);

        // Already in a call → auto-reject
        if (phaseRef.current === "active") {
          console.log("📞 AUTO-REJECT — already in call");
          socket.emit("call-end", { to: data.from?._id });
          return;
        }

        // Recently ended → cooldown
        if (Date.now() - lastCallEndTimeRef.current < 3000) {
          console.log("📞 AUTO-REJECT — cooldown");
          socket.emit("call-end", { to: data.from?._id });
          return;
        }

        // Duplicate
        if (processedCallIds.current.has(callId)) {
          console.log("📞 AUTO-REJECT — duplicate");
          return;
        }
        processedCallIds.current.add(callId);
        if (processedCallIds.current.size > 30) {
          const arr = Array.from(processedCallIds.current);
          processedCallIds.current = new Set(arr.slice(-30));
        }

        // Show ringing UI
        setRenderState({
          phase: "ringing",
          incomingCall: { offer: data.offer, from: data.from },
          callPeer: null,
          callDirection: "outgoing",
        });
      });

      // === CALL ENDED by other party ===
      // CRITICAL: do NOT call endCall() here — it would re-emit call-end creating a loop
      socket.on("call-ended", () => {
        console.log("📞 call-ended received — peer ended");
        lastCallEndTimeRef.current = Date.now();
        callEndedRef.current = true;
        peerEndedRef.current = true;

        // Cleanup WebRTC resources directly
        // (the ActiveCallOverlay cleanup effect handles peer/stream closure)

        // Reset state — no emit
        setRenderState({ phase: "none", incomingCall: null, callPeer: null, callDirection: "outgoing" });
        phaseRef.current = "none";
      });
    });

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  // === OUTGOING CALL TRIGGER from chat page ===
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.targetUser && socketRef.current?.connected && user && phaseRef.current === "none") {
        console.log("📞 START OUTGOING to:", e.detail.targetUser.firstName);
        callEndedRef.current = false;
        peerEndedRef.current = false;
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
    return () => window.removeEventListener("start-outgoing-call", handler as any);
  }, [user]);

  // ── Accept incoming call ──
  const acceptCall = useCallback((call: IncomingCall) => {
    console.log("📞 ACCEPTING call from:", call.from.firstName);
    callEndedRef.current = false;
    peerEndedRef.current = false;
    setRenderState({
      phase: "active",
      incomingCall: call,
      callPeer: call.from,
      callDirection: "incoming",
    });
    phaseRef.current = "active";
  }, []);

  // ── Reject incoming call ──
  const rejectCall = useCallback(() => {
    const call = renderState.incomingCall;
    if (call && socketRef.current?.connected) {
      socketRef.current.emit("call-end", { to: call.from._id });
    }
    lastCallEndTimeRef.current = Date.now();
    setRenderState((prev) => ({ ...prev, phase: "none", incomingCall: null }));
    phaseRef.current = "none";
  }, [renderState.incomingCall]);

  // ── RENDER ──
  const { phase, incomingCall, callPeer, callDirection } = renderState;

  if (phase === "active" && callPeer) {
    return (
      <ActiveCallOverlay
        key={`call-${callPeer._id}-${phase}`}
        peer={callPeer}
        socket={socketRef.current}
        user={user}
        direction={callDirection}
        incomingCall={callDirection === "incoming" ? incomingCall : null}
        onEnd={endCall}
      />
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


/* ══════════════════════════════════════
   Incoming Call UI — ring + accept/reject
   ══════════════════════════════════════ */
function IncomingCallUI({ from, onAccept, onReject }: {
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
      ctx = new AudioContext();
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
          gain.gain.exponentialRampToValueAtTime(0.001, ctx!.currentTime + 0.35);
          osc.start(ctx!.currentTime);
          osc.stop(ctx!.currentTime + 0.35);
        } catch {}
      };
      playTone();
      intervalRef.current = setInterval(playTone, 800);
    } catch {}

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification("📞 Appel entrant", { body: `${from.firstName} ${from.lastName} vous appelle` }); } catch {}
    }

    return () => {
      // CRITICAL: always stop on unmount
      stoppedRef.current = true;
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      try { audioCtxRef.current?.close(); } catch {}
      audioCtxRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center">
      <div className="relative mb-8">
        <div className="absolute -inset-8 rounded-full border-2 border-green-400/30 animate-ping" />
        <div className="absolute -inset-16 rounded-full border border-green-400/15 animate-ping" style={{ animationDelay: "0.5s" }} />
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-500/30 to-green-600/10 flex items-center justify-center">
          <span className="text-green-400 text-4xl font-bold">{from.firstName[0]}{from.lastName[0]}</span>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white">{from.firstName} {from.lastName}</h2>
      <p className="text-sm text-green-400 mt-2 animate-pulse">Appel entrant...</p>
      <div className="flex items-center gap-12 mt-16">
        <div className="flex flex-col items-center gap-2">
          <button onClick={onReject}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-110">
            <PhoneOff className="h-7 w-7 text-white" />
          </button>
          <span className="text-xs text-white/50">Refuser</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button onClick={onAccept}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all hover:scale-110 animate-bounce">
            <PhoneIncoming className="h-7 w-7 text-white" />
          </button>
          <span className="text-xs text-white/50">Accepter</span>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════
   Active Call — WebRTC + controls
   ══════════════════════════════════════ */
function ActiveCallOverlay({ peer, socket, user, direction, incomingCall, onEnd }: {
  peer: { _id: string; firstName: string; lastName: string };
  socket: any;
  user: any;
  direction: "incoming" | "outgoing";
  incomingCall: IncomingCall | null;
  onEnd: () => void;
}) {
  const [status, setStatus] = useState<"connecting" | "connected">("connecting");
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);
  const cleanupDoneRef = useRef(false);

  // Refs for callbacks (always fresh — never stale)
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const socketRef = useRef(socket);
  socketRef.current = socket;

  // Cleanup: close peer + stop tracks + clear timer
  const cleanup = useCallback(() => {
    if (cleanupDoneRef.current) return;
    cleanupDoneRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (peerRef.current) { try { peerRef.current.close(); } catch {} peerRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  }, []);

  // Setup peer — uses refs so never stale
  const setupPeer = useCallback((targetId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("call-ice-candidate", { to: targetId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log("📞 WebRTC state:", state);
      if (state === "connected") {
        setStatus("connected");
      }
      if (state === "failed" || state === "closed") {
        console.log("📞 WebRTC failed → ending call");
        cleanup();
        onEndRef.current();
      }
    };

    return pc;
  }, []); // Empty deps — uses refs

  // OUTGOING: create offer (runs ONCE per mount)
  useEffect(() => {
    if (direction !== "outgoing" || !socket || startedRef.current) return;
    if (!(socket as any).userId) return;
    startedRef.current = true;

    (async () => {
      try {
        console.log("📞 Getting media for outgoing call");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        const pc = setupPeer(peer._id, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("📞 Emitting call-init to:", peer._id);
        socket.emit("call-init", {
          to: peer._id,
          offer,
          from: { _id: user.id, firstName: user.firstName, lastName: user.lastName },
        });
      } catch (e) {
        console.error("📞 Failed to start outgoing call:", e);
        onEndRef.current();
      }
    })();

    return () => { cleanup(); };
  }, []); // Empty deps — runs ONCE

  // INCOMING: answer with offer (runs ONCE per mount)
  useEffect(() => {
    if (direction !== "incoming" || !socket || !incomingCall || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        console.log("📞 Getting media for incoming call");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        const pc = setupPeer(incomingCall.from._id, stream);
        console.log("📞 Setting remote description (offer)");
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
        console.log("📞 Creating answer");
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("📞 Emitting call-answer to:", incomingCall.from._id);
        socket.emit("call-answer", { to: incomingCall.from._id, answer });
      } catch (e) {
        console.error("📞 Failed to answer incoming call:", e);
        onEndRef.current();
      }
    })();

    return () => { cleanup(); };
  }, []); // Empty deps — runs ONCE

  // Socket listeners for signaling — runs ONCE per socket
  useEffect(() => {
    if (!socket) return;

    const handleAnswer = async (data: any) => {
      console.log("📞 Received call-answer, setting remote description");
      if (peerRef.current) {
        try {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log("📞 Remote description set → connected!");
          setStatus("connected");
        } catch (e) {
          console.error("📞 Failed to set remote description:", e);
        }
      } else {
        console.log("📞 WARNING: received call-answer but no peer connection!");
      }
    };

    const handleIce = async (data: any) => {
      if (peerRef.current) {
        try { await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch {}
      }
    };

    const handleEnded = () => {
      console.log("📞 call-ended in ActiveCallOverlay — cleaning up");
      cleanup();
      // Do NOT call onEnd here — the parent's call-ended handler already resets state
      // Calling onEnd would re-emit call-end creating a loop
    };

    socket.on("call-answer", handleAnswer);
    socket.on("call-ice-candidate", handleIce);
    socket.on("call-ended", handleEnded);

    return () => {
      socket.off("call-answer", handleAnswer);
      socket.off("call-ice-candidate", handleIce);
      socket.off("call-ended", handleEnded);
    };
  }, [socket]); // Only socket

  // Call timer
  useEffect(() => {
    if (status === "connected") {
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const endCall = useCallback(() => {
    cleanup();
    onEndRef.current();
  }, [cleanup]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted(!muted);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center">
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-6">
        <span className="text-primary text-3xl font-bold">{peer.firstName[0]}{peer.lastName[0]}</span>
      </div>
      <h2 className="text-xl font-bold text-white">{peer.firstName} {peer.lastName}</h2>
      <p className="text-sm text-muted-foreground mt-1">
        {status === "connecting" && (direction === "outgoing" ? "Appel en cours..." : "Connexion...")}
        {status === "connected" && fmt(duration)}
      </p>
      {status === "connecting" && (
        <div className="flex gap-1 mt-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
        </div>
      )}
      <div className="flex items-center gap-6 mt-12">
        <button onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${muted ? "bg-red-500" : "bg-white/10 hover:bg-white/20"}`}>
          {muted ? <PhoneOff className="h-6 w-6 text-white" /> : <Phone className="h-6 w-6 text-white" />}
        </button>
        <button onClick={endCall}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors hover:scale-105">
          <PhoneOff className="h-7 w-7 text-white" />
        </button>
      </div>
    </div>
  );
}
