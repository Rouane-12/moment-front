import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { VoiceCall } from "@/components/VoiceCall";
import * as LucideIcons from "lucide-react";

const {
  MessageCircle, Send, QrCode, ArrowLeft, Check, CheckCheck, Search, X,
  Camera, Shield, Mic, Paperclip, FileText, Square, Phone,
  Play, Pause
} = LucideIcons;

export const Route = createFileRoute("/chat")({ ssr: false, component: ChatPage });

type Attachment = {
  type: "image" | "voice" | "document";
  url: string;
  name?: string;
  size?: number;
  duration?: number;
  mimeType?: string;
};

type Conversation = {
  conversationId: string;
  otherUser: { _id: string; firstName: string; lastName: string; role: string };
  lastMessage: { content: string; createdAt: string; sender: string; attachments?: Attachment[] };
  unreadCount: number;
};

type Msg = {
  _id: string;
  sender: { _id: string; firstName: string; lastName: string; role: string };
  receiver: { _id: string; firstName: string; lastName: string; role: string };
  content: string;
  read: boolean;
  readAt?: string;
  attachments?: Attachment[];
  createdAt: string;
};

function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [callUser, setCallUser] = useState<{ _id: string; firstName: string; lastName: string } | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ offer: any; from: { _id: string; firstName: string; lastName: string } } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingDurationRef = useRef(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // === SOCKET.IO ===
  useEffect(() => {
    const rawCookie = document.cookie.match(/token=([^;]+)/)?.[1] || "";
    const token = decodeURIComponent(rawCookie);
    console.log("🔌 Socket token exists:", !!token, "length:", token.length);
    const socket = io(import.meta.env["VITE_API_URL"] || "http://localhost:5200", {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => console.log("🔌 Socket connected"));

    socket.on("new-message", (msg: Msg) => {
      // Update messages if viewing this conversation
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      // Refresh conversations
      loadConversations();
    });

    socket.on("messages-read", () => {
      loadConversations();
    });

    // === INCOMING CALL ===
    socket.on("call-init", (data: any) => {
      console.log("📞 Incoming call from:", data.from, "offer:", !!data.offer);
      setCallUser(data.from);
      setIncomingCall({ offer: data.offer, from: data.from });
    });

    socket.on("connect", () => {
      console.log("🔌 Socket connected, id:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("🔌 Socket connection error:", err.message);
    });

    return () => {
      socket.off("call-init");
      socket.disconnect();
    };
  }, []);

  // === DATA LOADING ===
  const loadConversations = useCallback(async () => {
    try {
      const res = await api.chat.getConversations();
      if (res.success) setConversations((res as any).conversations || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const res = await api.chat.getMessages(convId);
      if (res.success) setMessages((res as any).messages || []);
      await api.chat.markRead(convId);
      // Clear unread badge locally
      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === convId ? { ...c, unreadCount: 0 } : c,
        ),
      );
    } catch (e) { console.error(e); }
  }, []);

  // Join/leave conversation rooms
  useEffect(() => {
    if (!selectedConv || !socketRef.current) return;
    const socket = socketRef.current;
    socket.emit("join", selectedConv.conversationId);
    loadMessages(selectedConv.conversationId);
    return () => { socket.emit("leave", selectedConv.conversationId); };
  }, [selectedConv?.conversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // === SEND TEXT MESSAGE ===
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    setSending(true);
    try {
      await api.chat.send(selectedConv.otherUser._id, newMessage.trim());
      setNewMessage("");
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  // Compress image to max 800px width
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const img = new window.Image();
      img.onload = () => {
        const maxW = 800;
        const ratio = Math.min(maxW / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // === SEND IMAGE ===
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;
    setSending(true);
    try {
      const base64 = await compressImage(file);
      await api.chat.send(selectedConv.otherUser._id, " ", {
        attachments: [{ type: "image", url: base64, name: file.name, size: file.size, mimeType: file.type }],
      });
    } catch (e) { console.error('Image send error:', e); }
    finally { setSending(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  // === SEND DOCUMENT ===
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;
    setSending(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      // Send document ONLY as attachment, no text content to avoid duplication
      await api.chat.send(selectedConv.otherUser._id, " ", {
        attachments: [{ type: "document", url: base64, name: file.name, size: file.size, mimeType: file.type }],
      });
    } catch (e) { console.error('Doc send error:', e); }
    finally { setSending(false); }
  };

  // === VOICE MESSAGE ===
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, sampleRate: 16000 } });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      const startTime = Date.now();

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.onstop = async () => {
        // Calculate duration from actual recording time
        const durationSec = Math.round((Date.now() - startTime) / 1000);
        console.log('Voice duration:', durationSec, 'seconds');

        if (chunks.length === 0) { stream.getTracks().forEach((t) => t.stop()); return; }
        const blob = new Blob(chunks, { type: mimeType });

        // Use Date.now() duration directly — audio.duration returns Infinity for base64
        const finalDuration = durationSec;
        console.log('Final voice duration:', finalDuration, 'seconds');

        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        if (selectedConv) {
          await api.chat.send(selectedConv.otherUser._id, " ", {
            attachments: [{ type: "voice", url: base64, duration: finalDuration, mimeType }],
          });
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      recordingDurationRef.current = 0;
      recordingIntervalRef.current = setInterval(() => {
        recordingDurationRef.current += 1;
        setRecordingTime(recordingDurationRef.current);
      }, 1000);
    } catch (e) {
      console.error('Recording error:', e);
      alert("Autorisez l'accès au microphone pour les messages vocaux");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  // === QR CODE ===
  const handleGenerateQR = async () => {
    try {
      const res = await api.chat.generateQR();
      if (res.success) { setQrToken((res as any).token); setShowQR(true); }
    } catch (e) { console.error(e); }
  };

  const startScanner = useCallback(async () => {
    setShowScanner(true);
    await new Promise((r) => setTimeout(r, 300));
    try {
      const scanner = new Html5Qrcode("qr-scanner-region");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          try { await scanner.stop(); } catch {}
          setShowScanner(false);
          try {
            const res = await api.chat.scanQR(decodedText);
            if (res.success) {
              loadConversations();
              if ((res as any).user) {
                const convId = [user?.id, (res as any).user._id].sort().join("_");
                setSelectedConv({
                  conversationId: (res as any).convId || convId,
                  otherUser: (res as any).user,
                  lastMessage: { content: "Connecté !", createdAt: new Date().toISOString(), sender: "" },
                  unreadCount: 0,
                });
              }
            }
          } catch (e: any) { alert(e.message || "QR invalide"); }
        },
        () => {}
      );
    } catch (e) {
      setShowScanner(false);
      alert("Caméra non disponible. Autorisez l'accès.");
    }
  }, [user, loadConversations]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) { try { await scannerRef.current.stop(); } catch {} }
    setShowScanner(false);
  }, []);

  useEffect(() => {
    return () => { if (scannerRef.current) { try { scannerRef.current.stop(); } catch {} } };
  }, []);

  // === ADMIN CHAT ===
  const startAdminChat = async () => {
    try {
      const res = await api.chat.getAdminInfo();
      if (res.success && (res as any).admin) {
        const admin = (res as any).admin;
        setSelectedConv({
          conversationId: [user?.id, admin._id].sort().join("_"),
          otherUser: admin,
          lastMessage: { content: "", createdAt: "", sender: "" },
          unreadCount: 0,
        });
        loadConversations();
      }
    } catch (e) { console.error(e); }
  };

  const filtered = conversations.filter((c) =>
    `${c.otherUser.firstName} ${c.otherUser.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format last message preview based on attachment type
  const formatLastMessage = (msg: Conversation['lastMessage']) => {
    if (!msg.content && (!msg.attachments || msg.attachments.length === 0)) return "Démarrer la conversation";
    if (msg.attachments && msg.attachments.length > 0) {
      const att = msg.attachments[0]!;
      if (att.type === 'image') return '📷 Photo';
      if (att.type === 'voice') return '🎤 Message vocal';
      if (att.type === 'document') return `📄 ${att.name || 'Document'}`;
    }
    return msg.content || '';
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const formatSize = (b?: number) => b ? `${(b / 1024).toFixed(0)} Ko` : "";
  const isPartnerOrAdmin = user?.role === "partner_owner" || user?.role === "admin" || user?.role === "super_admin";

  // ===== CONVERSATION LIST =====
  if (!selectedConv) {
    return (
      <ProtectedRoute>
        <div className="grain min-h-screen">
          <div className="mx-auto max-w-lg px-4 sm:px-6 py-5 pb-24">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold">Messages</h1>
                <p className="text-[11px] text-muted-foreground">Conversations privées</p>
              </div>
              <div className="flex gap-1.5">
                {isPartnerOrAdmin ? (
                  <button onClick={startAdminChat}
                    className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                    title="Contacter l'admin">
                    <Shield className="h-5 w-5" />
                  </button>
                ) : (
                  <>
                    <button onClick={handleGenerateQR}
                      className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      title="Mon QR code">
                      <QrCode className="h-5 w-5" />
                    </button>
                    <button onClick={startScanner}
                      className="p-2.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                      title="Scanner un QR">
                      <Camera className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Rechercher..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 focus:outline-none focus:border-primary text-sm" />
            </div>

            {loading ? (
              <div className="text-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
                <p className="font-medium text-sm">Aucune conversation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isPartnerOrAdmin ? "Contactez l'admin pour démarrer" : "Scannez un QR code pour démarrer"}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filtered.map((conv) => (
                  <button key={conv.conversationId} onClick={() => setSelectedConv(conv)}
                    className="w-full p-3 flex items-center gap-3 rounded-xl hover:bg-white/5 transition-colors text-left">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-sm">
                        {conv.otherUser.firstName[0]}{conv.otherUser.lastName[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm truncate">{conv.otherUser.firstName} {conv.otherUser.lastName}</span>
                        <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                          {conv.lastMessage.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {conv.lastMessage.sender === user?.id ? "Vous : " : ""}{formatLastMessage(conv.lastMessage)}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 flex-shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* QR Modals */}
            {showQR && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setShowQR(false); setQrToken(""); }}>
                <div className="bg-[#111] rounded-2xl max-w-xs w-full p-5 text-center border border-white/10" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold">Mon QR Code</h2>
                    <button onClick={() => { setShowQR(false); setQrToken(""); }} className="p-1 rounded-lg hover:bg-white/10"><X className="h-5 w-5" /></button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-4">Montrez ce code pour démarrer une conversation</p>
                  {qrToken && (
                    <div className="bg-white p-3 rounded-xl inline-block mb-2">
                      <QRCodeSVG value={qrToken} size={160} level="M" />
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">Valable 5 minutes</p>
                </div>
              </div>
            )}

            {showScanner && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-[#111] rounded-2xl max-w-sm w-full overflow-hidden border border-white/10" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-3 border-b border-white/10">
                    <h2 className="font-bold text-sm">Scanner un QR Code</h2>
                    <button onClick={stopScanner} className="p-1 rounded-lg hover:bg-white/10"><X className="h-5 w-5" /></button>
                  </div>
                  <div className="p-3">
                    <div id="qr-scanner-region" className="w-full rounded-xl overflow-hidden" />
                    <p className="text-[11px] text-muted-foreground text-center mt-2">Pointez la caméra vers un QR code</p>
                  </div>
                </div>
              </div>
            )}

            {previewImage && (
              <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setPreviewImage(null)}>
                <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
              </div>
            )}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // ===== MESSAGE VIEW =====
  return (
    <ProtectedRoute>
      <div className="grain min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/10 px-3 py-2 flex items-center gap-2.5">
          <button onClick={() => setSelectedConv(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors lg:hidden">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-xs">{selectedConv.otherUser.firstName[0]}{selectedConv.otherUser.lastName[0]}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{selectedConv.otherUser.firstName} {selectedConv.otherUser.lastName}</p>
            <p className="text-[10px] text-muted-foreground">
              {selectedConv.otherUser.role === "admin" || selectedConv.otherUser.role === "super_admin" ? "Administrateur" : selectedConv.otherUser.role === "partner_owner" ? "Partenaire" : "Membre"}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => { setCallUser(selectedConv.otherUser); setIncomingCall(null); }}
              className="p-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
              title="Appel vocal">
              <Phone className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {messages.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-15" />
              <p className="text-xs">Envoyez le premier message</p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender._id === user?.id;
            return (
              <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  {/* Text content — hide if message is only an attachment */}
                  {msg.content && msg.content.trim() !== " " && (!msg.attachments || msg.attachments.length === 0 || msg.content.trim().length > 2) && (
                    <div className={`px-3 py-2 rounded-2xl ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-white/8 border border-white/5 text-foreground rounded-bl-sm"
                    }`}>
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content.trim()}</p>
                    </div>
                  )}

                  {/* Attachments */}
                  {msg.attachments?.map((att, i) => (
                    <div key={i} className="mt-1">
                      {att.type === "image" && (
                        <div className="relative group">
                          <img src={att.url} alt="" className="max-w-[220px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setPreviewImage(att.url)} />
                          <a href={att.url} download={att.name || "image.jpg"}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          </a>
                        </div>
                      )}
                      {att.type === "voice" && (
                        <VoiceMessage url={att.url} duration={att.duration} isMe={isMe} />
                      )}
                      {att.type === "document" && (
                        <a href={att.url} download={att.name}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                            isMe ? "bg-primary/20 border border-primary/30" : "bg-white/8 border border-white/5"
                          }`}>
                          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-red-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">{att.name}</p>
                            <p className="text-[10px] text-muted-foreground">{formatSize(att.size)}</p>
                          </div>
                        </a>
                      )}
                    </div>
                  ))}

                  {/* Timestamp + read receipt */}
                  <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? "justify-end" : ""}`}>
                    <span className="text-[9px] text-muted-foreground/60">
                      {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isMe && (
                      msg.read
                        ? <CheckCheck className="h-3 w-3 text-blue-400" />
                        : <Check className="h-3 w-3 text-muted-foreground/40" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-white/10 px-2 py-2">
          {isRecording ? (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-red-400 font-mono">{formatTime(recordingTime)}</span>
              </div>
              <button onClick={stopRecording}
                className="p-2.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors">
                <Square className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* Attachment buttons */}
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              </button>
              <input type="file" accept=".pdf,.doc,.docx,.txt,.zip" onChange={handleDocUpload} className="hidden" id="doc-input" />
              <label htmlFor="doc-input"
                className="p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground cursor-pointer">
                <Paperclip className="h-5 w-5" />
              </label>

              {/* Text input */}
              <input type="text" value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Écrire..."
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary text-sm min-w-0"
                disabled={sending} />

              {/* Voice or Send */}
              {newMessage.trim() ? (
                <button onClick={handleSend} disabled={sending}
                  className="p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-30 flex-shrink-0">
                  <Send className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={startRecording}
                  className="p-2.5 rounded-full bg-white/10 text-muted-foreground hover:bg-white/20 transition-colors flex-shrink-0">
                  <Mic className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Voice Call Overlay */}
      {callUser && socketRef.current && (
        <VoiceCall
          socket={socketRef.current}
          user={user!}
          targetUser={callUser}
          incomingOffer={incomingCall?.offer}
          incomingFrom={incomingCall?.from}
          onEnd={() => { setCallUser(null); setIncomingCall(null); }}
        />
      )}
    </ProtectedRoute>
  );
}

// === Voice Message Player ===
function VoiceMessage({ url, duration, isMe }: { url: string; duration: number | undefined; isMe: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use saved duration as primary source (base64 audio returns Infinity for duration)
  useEffect(() => {
    if (duration && duration > 0) {
      setTotalDuration(duration);
    }
  }, [duration]);

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) setCurrentTime(Math.round(audioRef.current.currentTime));
      };
      audioRef.current.onended = () => { setPlaying(false); setCurrentTime(0); };
    }
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl min-w-[200px] ${
      isMe ? "bg-primary/80 text-primary-foreground" : "bg-white/8 border border-white/5"
    }`}>
      <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-current rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] opacity-60">{formatDuration(currentTime)}</span>
          <span className="text-[9px] opacity-60">{formatDuration(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
}

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
