import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";

interface VoiceCallProps {
  socket: any;
  user: any;
  targetUser: { _id: string; firstName: string; lastName: string };
  /** If provided, this is an incoming call — answer it. If null, initiate a new call. */
  incomingOffer?: any;
  incomingFrom?: { _id: string; firstName: string; lastName: string };
  onEnd: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function VoiceCall({
  socket,
  user,
  targetUser,
  incomingOffer,
  incomingFrom,
  onEnd,
}: VoiceCallProps) {
  const [status, setStatus] = useState<"calling" | "ringing" | "connected" | "ended">(
    incomingOffer ? "ringing" : "calling",
  );
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanupRef = useRef(false);

  const cleanup = () => {
    if (cleanupRef.current) return;
    cleanupRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  };

  // ── Create peer connection (shared logic) ──
  const createPeer = (targetId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("call-ice-candidate", {
          to: targetId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        cleanup();
        onEnd();
      }
    };

    return pc;
  };

  const startLocalStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    return stream;
  };

  const startTimer = () => {
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  };

  // ── Effect: handle incoming call (answer) OR outgoing call (initiate) ──
  useEffect(() => {
    if (!socket) return;

    // INCOMING CALL — answer it
    if (incomingOffer && incomingFrom) {
      (async () => {
        try {
          const stream = await startLocalStream();
          const pc = createPeer(incomingFrom._id);
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));

          await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("call-answer", {
            to: incomingFrom._id,
            answer,
          });

          setStatus("connected");
          startTimer();
        } catch (e) {
          console.error("Failed to answer call:", e);
          onEnd();
        }
      })();
    }
    // OUTGOING CALL — initiate
    else {
      (async () => {
        try {
          const stream = await startLocalStream();
          const pc = createPeer(targetUser._id);
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("call-init", {
            to: targetUser._id,
            offer,
            from: { _id: user.id, firstName: user.firstName, lastName: user.lastName },
          });
        } catch (e) {
          console.error("Failed to start call:", e);
          onEnd();
        }
      })();
    }

    // Listen for answer (outgoing call) and ice candidates (both)
    const handleAnswer = async (data: any) => {
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setStatus("connected");
        startTimer();
      }
    };

    const handleIce = async (data: any) => {
      if (peerRef.current) {
        try {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("ICE candidate error:", e);
        }
      }
    };

    const handleEnded = () => {
      cleanup();
      onEnd();
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
  }, [socket, targetUser._id, incomingOffer]);

  const endCall = () => {
    const otherId = incomingFrom?._id || targetUser._id;
    socket.emit("call-end", { to: otherId });
    // If caller ends before connection, send missed call message via API
    if (status === "calling" && !incomingOffer) {
      const convId = [user.id, targetUser._id].sort().join("_");
      fetch(`${import.meta.env["VITE_API_URL"] || "http://localhost:5200"}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiverId: targetUser._id,
          content: "📹 Appel manqué",
          attachments: [{ type: "call", status: "missed" }],
        }),
      }).catch(() => {});
    }
    cleanup();
    onEnd();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = muted));
      setMuted(!muted);
    }
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const displayName = incomingFrom
    ? `${incomingFrom.firstName} ${incomingFrom.lastName}`
    : `${targetUser.firstName} ${targetUser.lastName}`;
  const initials = incomingFrom
    ? `${incomingFrom.firstName[0]}${incomingFrom.lastName[0]}`
    : `${targetUser.firstName[0]}${targetUser.lastName[0]}`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Avatar */}
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-6">
        <span className="text-primary text-3xl font-bold">{initials}</span>
      </div>

      {/* Name + status */}
      <h2 className="text-xl font-bold text-white">{displayName}</h2>
      <p className="text-sm text-muted-foreground mt-1">
        {status === "calling" && "Appel en cours..."}
        {status === "ringing" && (incomingOffer ? "Appel entrant..." : "Sonner...")}
        {status === "connected" && formatDuration(duration)}
        {status === "ended" && "Appel terminé"}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-6 mt-12">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            muted ? "bg-red-500" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          {muted ? <MicOff className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />}
        </button>

        <button
          onClick={endCall}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
        >
          <PhoneOff className="h-7 w-7 text-white" />
        </button>
      </div>
    </div>
  );
}
