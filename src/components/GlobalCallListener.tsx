import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
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
 * Global call system — works on ANY page of the app.
 * Single persistent socket for call signaling.
 */
export function GlobalCallListener() {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [callPeer, setCallPeer] = useState<IncomingCall["from"] | null>(null);
  const [callDirection, setCallDirection] = useState<"incoming" | "outgoing">("outgoing");
  const [socketAuthenticated, setSocketAuthenticated] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const incomingCallRef = useRef<IncomingCall | null>(null);
  const callActiveRef = useRef(false);
  const callEndedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);
  useEffect(() => { callActiveRef.current = callActive; }, [callActive]);

  // Connect socket — ONLY depends on user, NOT on callActive
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token") || "";
    if (!token) return;
    
    const socket = io(import.meta.env["VITE_API_URL"] || "http://localhost:5200", {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("📞 Global call socket connected:", socket.id);
    });

    socket.on("socket-authenticated", (data: any) => {
      console.log("📞 Socket authenticated with userId:", data.userId);
      (socket as any).userId = data.userId;
      setSocketAuthenticated(true);
    });

    socket.on("connect_error", (error) => {
      console.error("📞 Socket connection error:", error.message);
    });

    socket.on("disconnect", () => {
      console.log("📞 Socket disconnected");
      setSocketAuthenticated(false);
    });

    // === INCOMING CALL ===
    socket.on("call-init", (data: any) => {
      console.log("📞📞📞 INCOMING CALL from:", data.from?.firstName, "offer:", !!data.offer);
      // Always show incoming call if not currently in an active call
      if (!callActiveRef.current) {
        setIncomingCall({ offer: data.offer, from: data.from });
      } else {
        console.log("📞 Call ignored — already in active call");
      }
    });

    // === CALL ENDED (from other party) ===
    socket.on("call-ended", () => {
      console.log("📞 call-ended received — cleaning up");
      setIncomingCall(null);
      setCallActive(false);
      setCallPeer(null);
      callActiveRef.current = false;
      callEndedRef.current = true;
    });

    // === CALL ANSWER (caller receives this) ===
    socket.on("call-answer", () => {
      console.log("📞 call-answer received");
    });

    // === ICE CANDIDATE ===
    socket.on("call-ice-candidate", () => {
      // Handled by ActiveCallOverlay
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]); // ONLY depends on user!

  // Outgoing call trigger from chat page
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      console.log("📞 start-outgoing-call event:", e.detail?.targetUser?.firstName);
      if (e.detail?.targetUser && socketRef.current?.connected && user && !callActiveRef.current) {
        setCallActive(true);
        setCallPeer(e.detail.targetUser);
        setCallDirection("outgoing");
      }
    };
    window.addEventListener("start-outgoing-call", handler as any);
    return () => window.removeEventListener("start-outgoing-call", handler as any);
  }, [user]);

  const acceptCall = (call: IncomingCall) => {
    setIncomingCall(null);
    setCallActive(true);
    setCallPeer(call.from);
    setCallDirection("incoming");
  };

  const rejectCall = useCallback(() => {
    if (incomingCall && socketRef.current?.connected) {
      socketRef.current.emit("call-end", { to: incomingCall.from._id });
    }
    setIncomingCall(null);
  }, [incomingCall]);

  const endCall = useCallback(() => {
    if (callEndedRef.current) return; // Guard against double end
    callEndedRef.current = true;
    
    console.log("📞 endCall — peer:", callPeer?._id);
    if (callPeer && socketRef.current?.connected) {
      socketRef.current.emit("call-end", { to: callPeer._id });
    }
    
    // Send missed call message if outgoing call wasn't answered
    if (callDirection === "outgoing" && callPeer && user) {
      fetch(`${import.meta.env["VITE_API_URL"] || "http://localhost:5200"}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiverId: callPeer._id,
          content: "Appel manqué",
          attachments: [{ type: "call", status: "missed", url: "" }],
        }),
      }).catch(() => {});
    }
    
    setCallActive(false);
    setCallPeer(null);
    setCallDirection("outgoing");
  }, [callPeer, callDirection, user]);

  // Reset callEndedRef when starting a new call
  useEffect(() => {
    if (callActive) {
      callEndedRef.current = false;
    }
  }, [callActive]);

  // Show active call overlay
  if (callActive && callPeer) {
    return (
      <ActiveCallOverlay
        peer={callPeer}
        socket={socketRef.current}
        user={user}
        direction={callDirection}
        incomingCall={callDirection === "incoming" ? incomingCallRef.current : null}
        onEnd={endCall}
      />
    );
  }

  // Show incoming call UI (ringing)
  if (incomingCall) {
    return (
      <IncomingCallUI
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
  const cleanupDone = useRef(false);

  useEffect(() => {
    cleanupDone.current = false;
    
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const playTone = () => {
        if (cleanupDone.current) return;
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 440;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
        } catch {}
      };
      playTone();
      intervalRef.current = setInterval(playTone, 800);
    } catch (e) {}

    // Browser notification
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("📞 Appel entrant", {
          body: `${from.firstName} ${from.lastName} vous appelle`,
          icon: "/favicon.ico",
        });
      } catch {}
    }

    return () => {
      cleanupDone.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      try { audioCtxRef.current?.close(); } catch {}
    };
  }, [from]);

  const stopSound = () => {
    cleanupDone.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    try { audioCtxRef.current?.close(); } catch {}
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center">
      {/* Pulsing rings */}
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
          <button onClick={() => { stopSound(); onReject(); }}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-110">
            <PhoneOff className="h-7 w-7 text-white" />
          </button>
          <span className="text-xs text-white/50">Refuser</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button onClick={() => { stopSound(); onAccept(); }}
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
  socket: Socket | null;
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
  const cleanupRef = useRef(false);
  const startedRef = useRef(false);
  const endCalledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (cleanupRef.current) return;
    cleanupRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  }, []);

  const endCall = useCallback(() => {
    if (endCalledRef.current) return;
    endCalledRef.current = true;
    cleanup();
    onEnd();
  }, [cleanup, onEnd]);

  const setupPeer = useCallback((targetId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) socket?.emit("call-ice-candidate", { to: targetId, candidate: event.candidate });
    };
    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        setStatus("connected");
      }
      if (state === "disconnected" || state === "failed" || state === "closed") {
        endCall();
      }
    };
    return pc;
  }, [socket, endCall]);

  // OUTGOING — create offer
  useEffect(() => {
    if (direction !== "outgoing" || !socket || !user || startedRef.current) return;
    // Wait for auth
    if (!(socket as any).userId) return;
    startedRef.current = true;

    (async () => {
      try {
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
        console.error("📞 Failed to start call:", e);
        endCall();
      }
    })();
  }, [socket, direction, user, peer, setupPeer, endCall]);

  // INCOMING — answer with pending offer
  useEffect(() => {
    if (direction !== "incoming" || !socket || !incomingCall || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        const pc = setupPeer(incomingCall.from._id, stream);
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call-answer", { to: incomingCall.from._id, answer });
      } catch (e) {
        console.error("📞 Failed to answer:", e);
        endCall();
      }
    })();
  }, [socket, direction, incomingCall, setupPeer, endCall]);

  // Socket event listeners for call signaling
  useEffect(() => {
    if (!socket) return;

    const handleAnswer = async (data: any) => {
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setStatus("connected");
      }
    };
    const handleIce = async (data: any) => {
      if (peerRef.current) {
        try { await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch {}
      }
    };
    const handleEnded = () => {
      console.log("📞 call-ended in ActiveCallOverlay");
      endCall();
    };

    socket.on("call-answer", handleAnswer);
    socket.on("call-ice-candidate", handleIce);
    socket.on("call-ended", handleEnded);

    return () => {
      socket.off("call-answer", handleAnswer);
      socket.off("call-ice-candidate", handleIce);
      socket.off("call-ended", handleEnded);
      cleanup();
    };
  }, [socket, endCall, cleanup]);

  // Call timer
  useEffect(() => {
    if (status === "connected") {
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
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
      <p className="text-[11px] text-white/30 mt-6">Appuyez sur ✕ pour raccrocher</p>
    </div>
  );
}
