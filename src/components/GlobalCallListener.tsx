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
 * Handles incoming calls (ring + accept/reject) and outgoing calls.
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

  // Keep ref in sync
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

  // Connect socket
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token") || "";
    console.log("📞 Connecting socket with token:", token ? "present" : "missing");
    console.log("📞 User ID:", user.id);
    const socket = io(import.meta.env["VITE_API_URL"] || "http://localhost:5200", {
      auth: { token },
      transports: ["websocket", "polling"],
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
      console.error("📞 Socket connection error:", error);
    });

    socket.on("disconnect", () => {
      console.log("📞 Socket disconnected, resetting auth state");
      setSocketAuthenticated(false);
    });

    socket.on("call-init", (data: any) => {
      console.log("📞📞📞 INCOMING CALL from:", data.from);
      console.log("📞 Current state - incomingCall:", !!incomingCallRef.current, "callActive:", callActive);
      if (!incomingCallRef.current && !callActive) {
        setIncomingCall({ offer: data.offer, from: data.from });
      } else {
        console.log("📞 Call ignored - already in call or incoming call");
      }
    });

    socket.on("call-ended", () => {
      console.log("📞 Call ended event received");
      setIncomingCall(null);
      setCallActive(false);
      setCallPeer(null);
    });

    return () => { 
      console.log("📞 Disconnecting socket");
      socket.disconnect(); 
      socketRef.current = null; 
    };
  }, [user, callActive]);

  // Outgoing call trigger from chat page
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      console.log("📞 start-outgoing-call event received:", e.detail);
      if (e.detail?.targetUser && socketRef.current && user) {
        console.log("📞 Starting outgoing call to:", e.detail.targetUser);
        setCallActive(true);
        setCallPeer(e.detail.targetUser);
        setCallDirection("outgoing");
      } else {
        console.log("📞 Cannot start call - missing:", {
          targetUser: !!e.detail?.targetUser,
          socket: !!socketRef.current,
          user: !!user
        });
      }
    };
    window.addEventListener("start-outgoing-call", handler as any);
    return () => window.removeEventListener("start-outgoing-call", handler as any);
  }, [user]);

  const [pendingOffer, setPendingOffer] = useState<IncomingCall | null>(null);

  const acceptCall = (call: IncomingCall) => {
    setIncomingCall(null);
    setPendingOffer(call); // Set BEFORE callActive to ensure it's available
    setCallActive(true);
    setCallPeer(call.from);
    setCallDirection("incoming");
  };

  const rejectCall = () => {
    if (incomingCall && socketRef.current) {
      socketRef.current.emit("call-end", { to: incomingCall.from._id });
    }
    setIncomingCall(null);
  };

  const endCall = () => {
    console.log("📞 GlobalCallListener endCall called:", {
      callPeer: callPeer?._id,
      socket: !!socketRef.current,
      callDirection
    });
    if (callPeer && socketRef.current) {
      socketRef.current.emit("call-end", { to: callPeer._id });
    }
    // If outgoing call ended before connection, send missed call message
    if (callDirection === "outgoing" && callPeer && user) {
      const convId = [user.id, callPeer._id].sort().join("_");
      console.log("📞 Sending missed call message");
      fetch(`${import.meta.env["VITE_API_URL"] || "http://localhost:5200"}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiverId: callPeer._id,
          content: "Appel manqué",
          attachments: [{ type: "call", status: "missed" }],
        }),
      }).catch(() => {});
    }
    console.log("📞 Resetting call state");
    setCallActive(false);
    setCallPeer(null);
    setCallDirection("outgoing");
    setPendingOffer(null);
  };

  if (callActive && callPeer && socketAuthenticated) {
    return (
      <ActiveCallOverlay
        peer={callPeer}
        socket={socketRef.current}
        user={user}
        direction={callDirection}
        pendingOffer={pendingOffer}
        onEnd={endCall}
      />
    );
  }

  if (callActive && callPeer && !socketAuthenticated) {
    console.log("📞 Call active but socket not authenticated yet, waiting...");
    return (
      <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-6">
          <span className="text-primary text-3xl font-bold">{callPeer.firstName[0]}{callPeer.lastName[0]}</span>
        </div>
        <h2 className="text-xl font-bold text-white">{callPeer.firstName} {callPeer.lastName}</h2>
        <p className="text-sm text-muted-foreground mt-1">Connexion...</p>
      </div>
    );
  }

  if (incomingCall) {
    return <IncomingCallUI from={incomingCall.from} onAccept={() => acceptCall(incomingCall)} onReject={rejectCall} />;
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

  useEffect(() => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const playTone = () => {
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
      };
      playTone();
      intervalRef.current = setInterval(playTone, 800);
    } catch (e) {}

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("📞 Appel entrant", { body: `${from.firstName} ${from.lastName} vous appelle` });
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      audioCtxRef.current?.close();
    };
  }, [from]);

  const handleAccept = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    audioCtxRef.current?.close();
    onAccept();
  };
  const handleReject = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    audioCtxRef.current?.close();
    onReject();
  };

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
          <button onClick={handleReject} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-110">
            <PhoneOff className="h-7 w-7 text-white" />
          </button>
          <span className="text-xs text-white/50">Refuser</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button onClick={handleAccept} className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all hover:scale-110 animate-bounce">
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
function ActiveCallOverlay({ peer, socket, user, direction, pendingOffer, onEnd }: {
  peer: { _id: string; firstName: string; lastName: string };
  socket: Socket | null;
  user: any;
  direction: "incoming" | "outgoing";
  pendingOffer?: IncomingCall;
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

  const cleanup = useCallback(() => {
    if (cleanupRef.current) return;
    cleanupRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  }, []);

  const startTimer = () => {
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  };

  const setupPeer = (targetId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) socket?.emit("call-ice-candidate", { to: targetId, candidate: event.candidate });
    };
    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) remoteAudioRef.current.srcObject = event.streams[0];
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") { cleanup(); onEnd(); }
    };
    return pc;
  };

  // OUTGOING — create offer
  useEffect(() => {
    console.log("📞 ActiveCallOverlay OUTGOING effect triggered:", {
      socket: !!socket,
      socketId: socket?.id,
      socketUserId: (socket as any)?.userId,
      direction,
      user: !!user,
      userId: user?.id,
      started: startedRef.current,
      peer: peer?._id
    });
    if (!socket || direction !== "outgoing" || !user || startedRef.current) {
      console.log("📞 OUTGOING effect early return:", {
        noSocket: !socket,
        wrongDirection: direction !== "outgoing",
        noUser: !user,
        alreadyStarted: startedRef.current
      });
      return;
    }
    // Wait for socket authentication before starting call
    if (!(socket as any).userId) {
      console.log("📞 Socket not authenticated yet, waiting...");
      return;
    }
    startedRef.current = true;

    (async () => {
      try {
        console.log("📞 Getting user media...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        console.log("📞 Setting up peer connection...");
        const pc = setupPeer(peer._id, stream);
        console.log("📞 Creating offer...");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("📞 Emitting call-init to:", peer._id, "from:", user.id);
        socket.emit("call-init", { to: peer._id, offer, from: { _id: user.id, firstName: user.firstName, lastName: user.lastName } });
      } catch (e) { console.error("Failed to start call:", e); onEnd(); }
    })();
  }, [socket, direction, user]);

  // INCOMING — answer with pending offer
  useEffect(() => {
    if (!socket || direction !== "incoming" || !pendingOffer || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        const pc = setupPeer(pendingOffer.from._id, stream);
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call-answer", { to: pendingOffer.from._id, answer });
      } catch (e) { console.error("Failed to answer:", e); onEnd(); }
    })();
  }, [socket, direction, pendingOffer]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleAnswer = async (data: any) => {
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setStatus("connected");
        startTimer();
      }
    };
    const handleIce = async (data: any) => {
      if (peerRef.current) { try { await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) {} }
    };
    const handleEnded = () => { cleanup(); onEnd(); };

    socket.on("call-answer", handleAnswer);
    socket.on("call-ice-candidate", handleIce);
    socket.on("call-ended", handleEnded);

    return () => {
      socket.off("call-answer", handleAnswer);
      socket.off("call-ice-candidate", handleIce);
      socket.off("call-ended", handleEnded);
      cleanup();
    };
  }, [socket]);

  const endCall = () => {
    console.log("📞 ActiveCallOverlay endCall called, peer:", peer._id, "socket:", !!socket);
    if (!socket) {
      console.log("📞 No socket, calling onEnd directly");
      cleanup();
      onEnd();
      return;
    }
    socket.emit("call-end", { to: peer._id });
    cleanup();
    onEnd();
  };
  const toggleMute = () => { localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = muted)); setMuted(!muted); };
  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

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
      <div className="flex items-center gap-6 mt-12">
        <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${muted ? "bg-red-500" : "bg-white/10 hover:bg-white/20"}`}>
          {muted ? <PhoneOff className="h-6 w-6 text-white" /> : <Phone className="h-6 w-6 text-white" />}
        </button>
        <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors">
          <PhoneOff className="h-7 w-7 text-white" />
        </button>
      </div>
    </div>
  );
}
