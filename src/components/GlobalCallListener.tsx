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
  const socketRef = useRef<Socket | null>(null);
  const incomingCallRef = useRef<IncomingCall | null>(null);

  // Keep ref in sync
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

  // Connect socket
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token") || "";
    const socket = io(import.meta.env["VITE_API_URL"] || "http://localhost:5200", {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => console.log("📞 Global call socket connected:", socket.id));

    socket.on("call-init", (data: any) => {
      console.log("📞📞📞 INCOMING CALL from:", data.from);
      if (!incomingCallRef.current && !callActive) {
        setIncomingCall({ offer: data.offer, from: data.from });
      }
    });

    socket.on("call-ended", () => {
      setIncomingCall(null);
      setCallActive(false);
      setCallPeer(null);
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user, callActive]);

  // Outgoing call trigger from chat page
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.targetUser && socketRef.current && user) {
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
    // Store the offer for the ActiveCallOverlay to use
    window.__pendingCallOffer = call;
  };

  const rejectCall = () => {
    if (incomingCall && socketRef.current) {
      socketRef.current.emit("call-end", { to: incomingCall.from._id });
    }
    setIncomingCall(null);
  };

  const endCall = () => {
    if (callPeer && socketRef.current) {
      socketRef.current.emit("call-end", { to: callPeer._id });
    }
    setCallActive(false);
    setCallPeer(null);
  };

  if (callActive && callPeer) {
    return (
      <ActiveCallOverlay
        peer={callPeer}
        socket={socketRef.current}
        user={user}
        direction={callDirection}
        pendingOffer={window.__pendingCallOffer}
        onEnd={endCall}
      />
    );
  }

  if (incomingCall) {
    return <IncomingCallUI from={incomingCall.from} onAccept={() => acceptCall(incomingCall)} onReject={rejectCall} />;
  }

  return null;
}

// Extend window for pending offer
declare global {
  interface Window { __pendingCallOffer?: IncomingCall; }
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
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center">
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
    if (!socket || direction !== "outgoing" || !user || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        const pc = setupPeer(peer._id, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call-init", { to: peer._id, offer, from: { _id: user.id, firstName: user.firstName, lastName: user.lastName } });
      } catch (e) { console.error("Failed to start call:", e); onEnd(); }
    })();
  }, [socket, direction]);

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

  const endCall = () => { socket?.emit("call-end", { to: peer._id }); cleanup(); onEnd(); };
  const toggleMute = () => { localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = muted)); setMuted(!muted); };
  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center">
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
