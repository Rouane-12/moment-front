import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { EmojiPicker } from "@/components/EmojiPicker";

import * as LucideIcons from "lucide-react";

const {
  MessageCircle, Send, QrCode, ArrowLeft, Check, CheckCheck, Search, X,
  Camera, Shield, Mic, Paperclip, FileText, Square, Phone, PhoneOff,
  Play, Pause, Trash2, Pencil, Download, Video, Smile, Loader2
} = LucideIcons;
const ImageIcon = LucideIcons.Image;

export const Route = createFileRoute("/chat")({ ssr: false, component: ChatPage });

type Attachment = {
  type: "image" | "voice" | "document" | "video" | "call";
  url: string;
  name?: string;
  size?: number;
  duration?: number;
  mimeType?: string;
  status?: string;
};

type Conversation = {
  conversationId: string;
  otherUser: { _id: string; firstName: string; lastName: string; role: string; avatar?: string };
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
  edited?: boolean;
  editedAt?: string;
  createdAt: string;
};

function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: "image" | "video"; name?: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null);
  const [editingMsg, setEditingMsg] = useState<Msg | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingDurationRef = useRef(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // === SOCKET.IO ===
  useEffect(() => {
    const token = localStorage.getItem("token") || document.cookie.match(/token=([^;]+)/)?.[1] || "";
    const socket = io(import.meta.env["VITE_API_URL"] || "http://localhost:5200", {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("new-message", (msg: Msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      loadConversations();
    });

    socket.on("messages-read", () => { loadConversations(); });

    socket.on("message-edited", (msg: Msg) => {
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    });

    socket.on("message-deleted", (data: { messageId: string; conversationId: string }) => {
      setMessages((prev) => prev.filter((m) => m._id !== data.messageId));
    });

    socket.on("presence-update", (data: { userId: string; online: boolean }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (data.online) next.add(data.userId);
        else next.delete(data.userId);
        return next;
      });
    });

    return () => { socket.disconnect(); };
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
      setLoadingMessages(true);
      setMessages([]);
      const res = await api.chat.getMessages(convId);
      if (res.success) setMessages((res as any).messages || []);
      await api.chat.markRead(convId);
      setConversations((prev) =>
        prev.map((c) => c.conversationId === convId ? { ...c, unreadCount: 0 } : c)
      );
    } catch (e) { console.error(e); }
    finally { setLoadingMessages(false); }
  }, []);

  useEffect(() => {
    if (!selectedConv || !socketRef.current) return;
    const socket = socketRef.current;
    socket.emit("join", selectedConv.conversationId);
    loadMessages(selectedConv.conversationId);
    return () => { socket.emit("leave", selectedConv.conversationId); };
  }, [selectedConv?.conversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMessages]);

  // === SEND TEXT MESSAGE ===
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    const text = newMessage.trim();
    setNewMessage("");
    setSending(true);
    // Reset textarea height
    const ta = document.querySelector('textarea[placeholder="Écrire..."]') as HTMLTextAreaElement | null;
    if (ta) ta.style.height = 'auto';
    try {
      await api.chat.send(selectedConv.otherUser._id, text);
    } catch (e) { console.error(e); setNewMessage(text); }
    finally { setSending(false); }
  };

  // === EDIT / DELETE MESSAGE ===
  const handleEditMessage = async () => {
    if (!editingMsg || !editContent.trim()) return;
    try {
      const res = await api.chat.editMessage(editingMsg._id, editContent.trim());
      if (res.success) {
        setMessages((prev) => prev.map((m) => (m._id === editingMsg._id ? { ...m, content: editContent.trim(), edited: true } : m)));
      }
    } catch (e: any) { alert(e.message || "Erreur lors de la modification"); }
    setEditingMsg(null);
    setEditContent("");
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Supprimer ce message ?")) return;
    try {
      await api.chat.deleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
    } catch (e: any) { alert(e.message || "Erreur lors de la suppression"); }
    setContextMenu(null);
  };

  const showContextMenuFor = (msgId: string, x: number, y: number) => {
    setContextMenu({ msgId, x: Math.min(x, window.innerWidth - 180), y: Math.min(y, window.innerHeight - 100) });
  };

  useEffect(() => {
    const close = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", close);
      document.addEventListener("scroll", close, true);
      return () => { document.removeEventListener("click", close); document.removeEventListener("scroll", close, true); };
    }
  }, [contextMenu]);

  // === COMPRESS IMAGE ===
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const img = new window.Image();
      img.onload = () => {
        const maxW = 800;
        const ratio = Math.min(maxW / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // === SEND IMAGE ===
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;
    try {
      setSending(true);
      const base64 = await compressImage(file);
      setSending(true);
      await api.chat.send(selectedConv.otherUser._id, " ", {
        attachments: [{ type: "image", url: base64, name: file.name, size: file.size, mimeType: file.type }],
      });
    } catch (e) { console.error("Image send error:", e); }
    finally { setSending(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  // === SEND VIDEO ===
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;
    setSending(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      await api.chat.send(selectedConv.otherUser._id, " ", {
        attachments: [{ type: "video", url: base64, name: file.name, size: file.size, mimeType: file.type }],
      });
    } catch (e) { console.error("Video send error:", e); }
    finally { setSending(false); if (videoInputRef.current) videoInputRef.current.value = ""; }
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
      await api.chat.send(selectedConv.otherUser._id, " ", {
        attachments: [{ type: "document", url: base64, name: file.name, size: file.size, mimeType: file.type }],
      });
    } catch (e) { console.error("Doc send error:", e); }
    finally { setSending(false); }
  };

  // === VOICE MESSAGE ===
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, sampleRate: 16000 } });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      const startTime = Date.now();

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.onstop = async () => {
        const durationSec = Math.round((Date.now() - startTime) / 1000);
        if (chunks.length === 0) { stream.getTracks().forEach((t) => t.stop()); return; }
        const blob = new Blob(chunks, { type: mimeType });
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        if (selectedConv) {
          await api.chat.send(selectedConv.otherUser._id, " ", {
            attachments: [{ type: "voice", url: base64, duration: durationSec, mimeType }],
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
      console.error("Recording error:", e);
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

  const formatLastMessage = (msg: Conversation["lastMessage"]) => {
    if (!msg.content && (!msg.attachments || msg.attachments.length === 0)) return "Démarrer la conversation";
    if (msg.attachments && msg.attachments.length > 0) {
      const att = msg.attachments[0]!;
      if (att.type === "image") return "📷 Photo";
      if (att.type === "video") return "🎥 Vidéo";
      if (att.type === "voice") return "🎤 Message vocal";
      if (att.type === "document") return `📄 ${att.name || "Document"}`;
      if (att.type === "call") return att.status === "missed" ? "📞 Appel manqué" : "📞 Appel";
    }
    return msg.content || "";
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const formatSize = (b?: number) => b ? `${(b / 1024).toFixed(0)} Ko` : "";
  const isPartnerOrAdmin = user?.role === "partner_owner" || user?.role === "admin" || user?.role === "super_admin";

  // ===== FULLSCREEN MEDIA VIEWER =====
  const MediaViewer = () => {
    if (!mediaPreview) return null;
    return (
      <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center"
        onClick={() => setMediaPreview(null)}>
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-10">
          <span className="text-white/70 text-xs truncate max-w-[60%]">{mediaPreview.name || ""}</span>
          <div className="flex items-center gap-2">
            <a href={mediaPreview.url} download={mediaPreview.name || "media"}
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
              title="Télécharger">
              <Download className="h-5 w-5" />
            </a>
            <button onClick={(e) => { e.stopPropagation(); setMediaPreview(null); }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="w-full h-full flex items-center justify-center p-4 pt-14 pb-16"
          onClick={(e) => e.stopPropagation()}>
          {mediaPreview.type === "image" ? (
            <img src={mediaPreview.url} alt=""
              className="max-w-full max-h-full object-contain rounded-lg" />
          ) : (
            <video src={mediaPreview.url} controls autoPlay
              className="max-w-full max-h-full rounded-lg" />
          )}
        </div>
      </div>
    );
  };

  // ===== CONVERSATION LIST =====
  if (!selectedConv) {
    return (
      <ProtectedRoute>
        <div className="grain flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 lg:px-8 pt-14 pb-24 overflow-y-auto flex-1">
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 focus:outline-none focus:border-primary text-sm" />
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
                    <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                      {conv.otherUser.avatar ? (
                        <img src={conv.otherUser.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-primary font-bold text-sm">
                          {conv.otherUser.firstName[0]}{conv.otherUser.lastName[0]}
                        </span>
                      )}
                      {onlineUsers.has(conv.otherUser._id) && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
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

            <MediaViewer />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // ===== MESSAGE VIEW =====
  // Use absolute positioning to fill the ENTIRE available space.
  // Header and input are position:sticky within this container — they NEVER scroll.
  return (
    <ProtectedRoute>
      <div className="grain flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
        {/* ── HEADER (sticky, never scrolls) ── */}
        <div className="shrink-0 bg-background/80 backdrop-blur-xl border-b border-white/10 px-3 py-2.5 flex items-center gap-2.5 z-10">
          <button onClick={() => setSelectedConv(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
            {selectedConv.otherUser.avatar ? (
              <img src={selectedConv.otherUser.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-primary font-bold text-xs">{selectedConv.otherUser.firstName[0]}{selectedConv.otherUser.lastName[0]}</span>
            )}
            {onlineUsers.has(selectedConv.otherUser._id) && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{selectedConv.otherUser.firstName} {selectedConv.otherUser.lastName}</p>
            <p className="text-[10px] text-muted-foreground">
              {onlineUsers.has(selectedConv.otherUser._id)
                ? <span className="text-green-400">En ligne</span>
                : selectedConv.otherUser.role === "admin" || selectedConv.otherUser.role === "super_admin" ? "Administrateur" : selectedConv.otherUser.role === "partner_owner" ? "Partenaire" : "Membre"
              }
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => {
              window.dispatchEvent(new CustomEvent("start-outgoing-call", { detail: { targetUser: selectedConv.otherUser } }));
            }}
              className="p-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
              title="Appel vocal">
              <Phone className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── MESSAGES (the ONLY scrollable area) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-1.5 overscroll-contain scrollbar-hide">
          {loadingMessages ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Chargement des messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-15" />
              <p className="text-xs">Envoyez le premier message</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isMe = msg.sender._id === user?.id;
                return (
                  <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[70%] sm:max-w-[50%] md:max-w-[40%] flex flex-col">
                      {msg.content && msg.content.trim() !== " " && (!msg.attachments || msg.attachments.length === 0 || msg.content.trim().length > 2) && (
                        <div
                          className={`px-3 py-2 rounded-2xl ${
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-white/8 border border-white/5 text-foreground rounded-bl-sm"
                          }`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (isMe) showContextMenuFor(msg._id, e.clientX, e.clientY);
                          }}
                          onClick={() => {
                            if (isMe) {
                              const timer = setTimeout(() => showContextMenuFor(msg._id, window.innerWidth / 2, window.innerHeight / 2), 500);
                              const cancel = () => { clearTimeout(timer); document.removeEventListener("touchend", cancel); };
                              document.addEventListener("touchend", cancel, { once: true });
                            }
                          }}
                        >
                          <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap">{msg.content.trim()}</p>
                          {msg.edited && <span className="text-[9px] opacity-50 italic">modifié</span>}
                        </div>
                      )}

                      {msg.attachments?.map((att, i) => (
                        <div key={i} className="mt-1">
                          {att.type === "image" && (
                            <div className="relative group">
                              <img src={att.url} alt=""
                                className="max-w-full sm:max-w-[240px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setMediaPreview({ url: att.url, type: "image", name: att.name })} />
                              <a href={att.url} download={att.name || "image.jpg"}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <Download className="h-4 w-4" />
                              </a>
                            </div>
                          )}
                          {att.type === "video" && (
                            <div className="relative group rounded-xl overflow-hidden">
                              <video src={att.url} controls preload="metadata"
                                className="max-w-full sm:max-w-[280px] rounded-xl cursor-pointer"
                                onClick={() => setMediaPreview({ url: att.url, type: "video", name: att.name })} />
                              <a href={att.url} download={att.name || "video.mp4"}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <Download className="h-4 w-4" />
                              </a>
                            </div>
                          )}
                          {att.type === "voice" && (
                            <VoiceMessage url={att.url} duration={att.duration} isMe={isMe} />
                          )}
                          {att.type === "document" && (
                            <a href={att.url} download={att.name}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl max-w-[260px] ${
                                isMe ? "bg-primary/20 border border-primary/30" : "bg-white/8 border border-white/5"
                              }`}>
                              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5 text-red-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold truncate" title={att.name}>{att.name}</p>
                                <p className="text-[10px] text-muted-foreground">{formatSize(att.size)}</p>
                              </div>
                            </a>
                          )}
                          {att.type === "call" && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                              att.status === "missed"
                                ? "bg-red-500/10 border border-red-500/20"
                                : "bg-green-500/10 border border-green-500/20"
                            }`}>
                              {att.status === "missed" ? (
                                <PhoneOff className="h-4 w-4 text-red-400" />
                              ) : (
                                <Phone className="h-4 w-4 text-green-400" />
                              )}
                              <span className={`text-xs font-semibold ${
                                att.status === "missed" ? "text-red-400" : "text-green-400"
                              }`}>
                                {att.status === "missed" ? "Appel manqué" : "Appel"}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}

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
              {/* Sending indicator */}
              {sending && (
                <div className="flex justify-end">
                  <div className="bg-primary/20 border border-primary/30 px-3 py-2 rounded-2xl rounded-br-sm flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                    <span className="text-xs text-primary">Envoi...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* ── CONTEXT MENU ── */}
        {contextMenu && (() => {
          const msg = messages.find((m) => m._id === contextMenu.msgId);
          if (!msg) return null;
          return (
            <div
              className="fixed z-[200] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[160px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => {
                setEditingMsg(msg);
                setEditContent(msg.content);
                setContextMenu(null);
              }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors">
                <Pencil className="h-4 w-4 text-blue-400" />
                Modifier
              </button>
              <button onClick={() => handleDeleteMessage(msg._id)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-white/10 transition-colors">
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            </div>
          );
        })()}

        {/* ── EDIT BAR (sticky, above input) ── */}
        {editingMsg && (
          <div className="shrink-0 bg-blue-900/30 border-t border-blue-500/30 px-3 py-2 z-10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-blue-400 font-medium">Modification du message</span>
              <button onClick={() => { setEditingMsg(null); setEditContent(""); }} className="text-white/50 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={editContent} autoFocus
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleEditMessage(); if (e.key === "Escape") { setEditingMsg(null); setEditContent(""); } }}
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500 text-sm" />
              <button onClick={handleEditMessage} disabled={!editContent.trim()}
                className="p-2.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-30">
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── INPUT BAR (sticky, NEVER scrolls) ── */}
        <div className="shrink-0 bg-background/80 backdrop-blur-xl border-t border-white/10 px-2 pt-2 pb-4 sm:pb-3 safe-area-pb z-10">
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
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground shrink-0"
                title="Envoyer une photo">
                <ImageIcon className="h-5 w-5" />
              </button>

              <input type="file" accept="video/*" ref={videoInputRef} onChange={handleVideoUpload} className="hidden" />
              <button onClick={() => videoInputRef.current?.click()}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground shrink-0"
                title="Envoyer une vidéo">
                <Video className="h-5 w-5" />
              </button>

              <input type="file" accept=".pdf,.doc,.docx,.txt,.zip,.xls,.xlsx,.ppt,.pptx" onChange={handleDocUpload} className="hidden" id="doc-input" />
              <label htmlFor="doc-input"
                className="p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground cursor-pointer shrink-0"
                title="Envoyer un document">
                <Paperclip className="h-5 w-5" />
              </label>

              <div className="relative">
                <button onClick={() => setShowEmoji(!showEmoji)}
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground shrink-0"
                  title="Emoji">
                  <Smile className="h-5 w-5" />
                </button>
                {showEmoji && (
                  <EmojiPicker
                    onSelect={(emoji) => {
                      setNewMessage((prev) => prev + emoji);
                      setShowEmoji(false);
                    }}
                    onClose={() => setShowEmoji(false)}
                  />
                )}
              </div>

              <textarea value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                    setTimeout(() => {
                      const ta = e.target as HTMLTextAreaElement;
                      if (ta) { ta.style.height = 'auto'; }
                    }, 0);
                  }
                }}
                placeholder="Écrire..."
                rows={1}
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary text-sm min-w-0 resize-none leading-relaxed overflow-y-auto"
                style={{ maxHeight: '120px' }}
                disabled={sending} />

              {newMessage.trim() ? (
                <button onClick={handleSend} disabled={sending}
                  className="p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-30 shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              ) : (
                <button onClick={startRecording}
                  className="p-2.5 rounded-full bg-white/10 text-muted-foreground hover:bg-white/20 transition-colors shrink-0">
                  <Mic className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <MediaViewer />
    </ProtectedRoute>
  );
}

// === Voice Message Player ===
function VoiceMessage({ url, duration, isMe }: { url: string; duration: number | undefined; isMe: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (duration && duration > 0) setTotalDuration(duration);
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
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl min-w-[180px] max-w-[240px] ${
      isMe ? "bg-primary/80 text-primary-foreground" : "bg-white/8 border border-white/5"
    }`}>
      <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
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
