import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Mic, MicOff, X } from "lucide-react";

interface VoiceCallProps {
  socket: any;
  user: any;
  targetUser: { _id: string; firstName: string; lastName: string };
  onEnd: () => void;
}

export function VoiceCall({ socket, user, targetUser, onEnd }: VoiceCallProps) {
  const [status, setStatus] = useState<"calling" | "ringing" | "connected" | "ended">("calling");
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const servers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(servers);
      peerRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call-ice-candidate", {
            to: targetUser._id,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call-init", {
        to: targetUser._id,
        offer,
        from: { _id: user.id, firstName: user.firstName, lastName: user.lastName },
      });

      // Start duration timer
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (e) {
      console.error("Failed to start call:", e);
      onEnd();
    }
  }, [socket, targetUser, user, onEnd]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on("call-init", async (data: any) => {
      setStatus("ringing");
      // Auto-accept for now (in real app, show incoming call UI)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(servers);
      peerRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call-ice-candidate", {
            to: data.from._id,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call-answer", {
        to: data.from._id,
        answer,
      });

      setStatus("connected");
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    });

    socket.on("call-answer", async (data: any) => {
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setStatus("connected");
      }
    });

    socket.on("call-ice-candidate", async (data: any) => {
      if (peerRef.current) {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socket.on("call-ended", () => {
      cleanup();
      onEnd();
    });

    return () => {
      socket.off("call-init");
      socket.off("call-answer");
      socket.off("call-ice-candidate");
      socket.off("call-ended");
    };
  }, [socket]);

  useEffect(() => {
    startCall();
    return () => cleanup();
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const endCall = () => {
    socket.emit("call-end", { to: targetUser._id });
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

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
      <audio ref={remoteAudioRef} autoPlay />

      {/* Avatar */}
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-6">
        <span className="text-primary text-3xl font-bold">
          {targetUser.firstName[0]}{targetUser.lastName[0]}
        </span>
      </div>

      {/* Name + status */}
      <h2 className="text-xl font-bold text-white">{targetUser.firstName} {targetUser.lastName}</h2>
      <p className="text-sm text-muted-foreground mt-1">
        {status === "calling" && "Appel en cours..."}
        {status === "ringing" && "Appel entrant..."}
        {status === "connected" && formatDuration(duration)}
        {status === "ended" && "Appel terminé"}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-6 mt-12">
        <button onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            muted ? "bg-red-500" : "bg-white/10 hover:bg-white/20"
          }`}>
          {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>

        <button onClick={endCall}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors">
          <PhoneOff className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
