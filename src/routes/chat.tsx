import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { EmojiPicker } from "@/components/EmojiPicker";
import { GameMenu, GameRenderer, GameInviteCard, type GameType } from "@/components/chat/MiniGames";

import * as LucideIcons from "lucide-react";

const {
  MessageCircle, Send, QrCode, ArrowLeft, Check, CheckCheck, Search, X,
  Camera, Shield, Mic, Paperclip, FileText, Square, Phone, PhoneOff,
  Play, Pause, Trash2, Pencil, Download, Video, Smile, Loader2, Gamepad2, Users, MoreVertical, Flag
} = LucideIcons;
const ImageIcon = LucideIcons.Image;

// Libellés français des jeux (vraies icônes + noms corrects dans l'entête)
const GAME_LABELS: Record<string, string> = {
  reflex: "Le Réflexe", tictactoe: "Morpion", rps: "Pierre-Feuille-Ciseaux", dice: "Lancer de Dés",
  quiz: "Quiz Culture", code_secret: "Le Code Secret", mot_intrus: "Le Mot Intrus",
  devine_ce_que_je_pense: "Devine ce que je pense", a_quel_point: "À quel point tu me connais ?",
  deux_verites: "Une Vérité, Deux Mensonges", memoire_flash: "Mémoire Flash",
  action_verite: "Action ou Vérité", dice_duel: "Duel de Dés", dice_spirale: "Course en Spirale",
  buzzer_quiz: "Quiz", infiltrated: "L'Infiltré", mot_intrus_multi: "Mot Intrus",
};

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
  const navigate = useNavigate();
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
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [convContextMenu, setConvContextMenu] = useState<{ convId: string; otherUserId: string; x: number; y: number } | null>(null);
  const [showGameMenu, setShowGameMenu] = useState(false);
  // Invitation à un jeu multijoueur (page Jeux) reçue pendant qu'on est dans le chat
  const [multiInvite, setMultiInvite] = useState<{ type: string; from: string } | null>(null);
  const [activeGame, setActiveGame] = useState<any>(null);
  const [gameAbandonNotice, setGameAbandonNotice] = useState<string | null>(null);
  const [gamePlayers, setGamePlayers] = useState<Record<string, any>>({});
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
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

    socket.on("conversation-cleared", (data: { conversationId: string }) => {
      setMessages([]);
      loadConversations();
    });

    // === MINI-GAMES ===
    // Helper: resolve player names from conversations list + current user
    const resolveGamePlayers = (game: any) => {
      const me = { _id: user?.id, firstName: user?.firstName || "Toi", lastName: user?.lastName || "" };
      const players: Record<string, any> = { [user?.id || ""]: me };
      game.players.forEach((pid: string) => {
        if (pid === user?.id) { players[pid] = me; return; }
        // Look up from conversations list (already loaded)
        const conv = conversationsRef.current.find(c => c.otherUser._id === pid);
        if (conv) {
          players[pid] = conv.otherUser;
        } else {
          players[pid] = { _id: pid, firstName: "Joueur", lastName: "" };
        }
      });
      return players;
    };

    const MULTIPLAYER_GAMES = ["buzzer_quiz", "infiltrated", "mot_intrus_multi"];
    // Une partie créée depuis la page Jeux (y compris le quiz multijoueur)
    const isMultiplayerGame = (g: any) => !!g && (MULTIPLAYER_GAMES.includes(g.type) || g.multiplayer === true);
    socket.on("game-invite", (data: { game: any; from: string }) => {
      if (isMultiplayerGame(data.game)) {
        setMultiInvite({ type: data.game.type, from: data.from });
        return;
      }
      // FIX: Only overwrite activeGame if it's null or still in 'waiting' state.
      // If game-start already arrived (race condition), don't overwrite the playing game
      // back to waiting — that would make the inviter never see the game interface.
      console.log("🎮 game-invite received:", data.game?.type, "from:", data.from, "prev state:", "...");
      setActiveGame((prev: any) => {
        if (prev && prev.state !== "waiting") {
          console.log("🎮 game-invite IGNORED (prev state:", prev.state, ")");
          return prev;
        }
        return data.game;
      });
      setGamePlayers(resolveGamePlayers(data.game));
    });

    socket.on("game-start", (data: { game: any }) => {
      if (isMultiplayerGame(data.game)) return;
      console.log("🎮 game-start received:", data.game?.type, data.game?.state);
      setActiveGame(data.game);
      setGamePlayers(resolveGamePlayers(data.game));
    });

    socket.on("game-state", (data: { game: any }) => {
      if (isMultiplayerGame(data.game)) return;
      setActiveGame(data.game);
      // Merge — don't overwrite existing good names
      setGamePlayers(prev => {
        const resolved = resolveGamePlayers(data.game);
        // Keep any names we already have (they're better than defaults)
        const merged = { ...resolved };
        Object.keys(prev).forEach(k => {
          if (prev[k]?.firstName && prev[k].firstName !== "Joueur") merged[k] = prev[k];
        });
        return merged;
      });
    });

    // Un joueur a abandonné : la partie s'arrête pour tout le monde
    socket.on("game-abandoned", (data: { by?: string }) => {
      setActiveGame(null);
      setGameAbandonNotice(data?.by || "un joueur");
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

  // Keep conversationsRef in sync for socket handlers
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

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
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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

  // === INVITATION LINK ===
  const handleGenerateInviteLink = async () => {
    try {
      const res = await api.chat.generateInvitationLink();
      if (res.success) {
        setInviteLink((res as any).link);
        setShowInviteLink(true);
      }
    } catch (e) { console.error(e); alert("Erreur lors de la génération du lien"); }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert("Lien copié !");
  };

  const handleAcceptInviteLink = async () => {
    try {
      // L'utilisateur peut coller le lien complet au lieu du code seul : on extrait le token.
      let raw = (inviteToken || "").trim();
      const m = raw.match(/[?&]invite=([0-9a-fA-F]+)/);
      if (m) raw = m[1] || "";
      if (!raw) return;
      const res = await api.chat.acceptInvitationLink(raw);
      if (res.success) {
        loadConversations();
        if ((res as any).user) {
          const convId = [user?.id, (res as any).user._id].sort().join("_");
          setSelectedConv({
            conversationId: (res as any).conversationId || convId,
            otherUser: (res as any).user,
            lastMessage: { content: "Connecté via lien !", createdAt: new Date().toISOString(), sender: "" },
            unreadCount: 0,
          });
        }
        setShowInviteInput(false);
        setInviteToken("");
        // Lien accepté : on peut retirer le paramètre de l'URL.
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e: any) { alert(e.message || "Lien invalide ou expiré"); }
  };

  // Check for invite token in URL on mount.
  // On ne retire PAS le paramètre immédiatement : s'il y a eu une redirection
  // de connexion ou un rechargement, il sera recapturé. Il est retiré à l'acceptation.
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite');
    if (inviteToken) {
      setInviteToken(inviteToken);
      setShowInviteInput(true);
    }
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

  // === CONVERSATION MANAGEMENT ===
  const handleClearConversation = async (convId: string) => {
    if (!confirm("Supprimer tous les messages de cette conversation ?")) return;
    try {
      await api.chat.deleteConversation(convId);
      setMessages([]);
      loadConversations();
    } catch (e) { console.error(e); }
    setConvContextMenu(null);
    setShowChatMenu(false);
  };

  const handleHideConversation = async (convId: string, otherUserId: string) => {
    if (!confirm("Supprimer cette conversation de la liste ?")) return;
    try {
      await api.chat.hideConversation(convId);
      if (selectedConv?.conversationId === convId) setSelectedConv(null);
      loadConversations();
    } catch (e) { console.error(e); }
    setConvContextMenu(null);
  };

  const handleBlockUser = async (userId: string) => {
    if (!confirm("Bloquer cet utilisateur ?")) return;
    try {
      await api.chat.blockUser(userId);
      alert("Utilisateur bloqué");
    } catch (e) { console.error(e); }
    setConvContextMenu(null);
    setShowChatMenu(false);
  };

  // === MINI-GAMES ===
  const handleGameSelect = (type: GameType) => {
    if (!selectedConv || !socketRef.current) return;
    // Populate player names immediately
    const me = { _id: user?.id, firstName: user?.firstName || "Toi", lastName: user?.lastName || "" };
    setGamePlayers({ [user?.id || ""]: me, [selectedConv.otherUser._id]: selectedConv.otherUser });
    socketRef.current.emit("game-invite", {
      to: selectedConv.otherUser._id,
      gameType: type,
    });
  };

  // Fermer / abandonner : la partie s'arrête pour tous les joueurs
  const handleGameClose = () => {
    if (activeGame && socketRef.current) {
      socketRef.current.emit("game-abandon", { gameId: activeGame.id });
    }
    setActiveGame(null);
  };

  const handleGameAbandon = () => {
    if (!activeGame || !socketRef.current) return;
    if (!window.confirm("Abandonner la partie ? Elle s'arrêtera pour tout le monde.")) return;
    handleGameClose();
  };

  const handleGameMove = (data: any) => {
    if (!socketRef.current) return;
    socketRef.current.emit("game-move", data);
  };

  const handleGameAccept = () => {
    if (!activeGame || !socketRef.current) return;
    socketRef.current.emit("game-accept", { gameId: activeGame.id });
  };

  const handleGameDecline = () => {
    if (!activeGame || !socketRef.current) return;
    socketRef.current.emit("game-decline", { gameId: activeGame.id });
    setActiveGame(null);
  };

  const handleGameRematch = () => {
    if (!activeGame || !socketRef.current) return;
    socketRef.current.emit("game-rematch", { gameId: activeGame.id });
  };

  const handleGameNextRound = () => {
    if (!activeGame || !socketRef.current) return;
    socketRef.current.emit("game-next-round", { gameId: activeGame.id });
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

  // Close conv context menu on outside click
  useEffect(() => {
    const close = () => setConvContextMenu(null);
    if (convContextMenu) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [convContextMenu]);

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
                    {/* Desktop: show all buttons */}
                    <button onClick={handleGenerateInviteLink}
                      className="hidden sm:block p-2.5 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                      title="Lien d'invitation">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    </button>
                    <button onClick={() => setShowInviteInput(true)}
                      className="hidden sm:block p-2.5 rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
                      title="Rejoindre via lien">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                    </button>
                    <button onClick={handleGenerateQR}
                      className="hidden sm:block p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      title="Mon QR code">
                      <QrCode className="h-5 w-5" />
                    </button>
                    <button onClick={startScanner}
                      className="hidden sm:block p-2.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                      title="Scanner un QR">
                      <Camera className="h-5 w-5" />
                    </button>
                    <button onClick={() => navigate({ to: "/past-contacts" })}
                      className="hidden sm:block p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                      title="Contacts historiques">
                      <Users className="h-5 w-5" />
                    </button>
                    <button onClick={() => navigate({ to: "/games" })}
                      className="hidden sm:block p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                      title="Jeux">
                      <Gamepad2 className="h-5 w-5" />
                    </button>

                    {/* Mobile: show more menu button */}
                    <div className="relative sm:hidden">
                      <button onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className="p-2.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
                        title="Plus d'options">
                        <MoreVertical className="h-5 w-5" />
                      </button>

                      {/* Mobile dropdown menu */}
                      <div className={showMoreMenu ? "absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50" : "hidden"}>
                        <button onClick={() => { setShowMoreMenu(false); handleGenerateInviteLink(); }}
                          className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3">
                          <svg className="h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                          <span className="text-sm">Lien d'invitation</span>
                        </button>
                        <button onClick={() => { setShowMoreMenu(false); setShowInviteInput(true); }}
                          className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3">
                          <svg className="h-4 w-4 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                          <span className="text-sm">Rejoindre via lien</span>
                        </button>
                        <button onClick={() => { setShowMoreMenu(false); handleGenerateQR(); }}
                          className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3">
                          <QrCode className="h-4 w-4 text-primary" />
                          <span className="text-sm">Mon QR code</span>
                        </button>
                        <button onClick={() => { setShowMoreMenu(false); startScanner(); }}
                          className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3">
                          <Camera className="h-4 w-4 text-green-400" />
                          <span className="text-sm">Scanner un QR</span>
                        </button>
                        <button onClick={() => { setShowMoreMenu(false); navigate({ to: "/past-contacts" }); }}
                          className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3">
                          <Users className="h-4 w-4 text-cyan-400" />
                          <span className="text-sm">Contacts historiques</span>
                        </button>
                        <button onClick={() => { setShowMoreMenu(false); navigate({ to: "/games" }); }}
                          className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3">
                          <Gamepad2 className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm">Jeux</span>
                        </button>
                      </div>
                    </div>
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
                  <div key={conv.conversationId} className="relative">
                  <button onClick={() => setSelectedConv(conv)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setConvContextMenu({ convId: conv.conversationId, otherUserId: conv.otherUser._id, x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 120) });
                    }}
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
                  {convContextMenu?.convId === conv.conversationId && (
                    <div className="absolute right-2 top-12 z-[200] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[180px]"
                      onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setSelectedConv(conv); setConvContextMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-white/10">
                        <MessageCircle className="h-4 w-4 text-blue-400" /> Ouvrir
                      </button>
                      <button onClick={() => handleHideConversation(conv.conversationId, conv.otherUser._id)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-white/10">
                        <Trash2 className="h-4 w-4" /> Supprimer
                      </button>
                    </div>
                  )}
                  </div>
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

            {showInviteLink && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setShowInviteLink(false); setInviteLink(""); }}>
                <div className="bg-[#111] rounded-2xl max-w-sm w-full p-5 text-center border border-white/10" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold">Lien d'invitation</h2>
                    <button onClick={() => { setShowInviteLink(false); setInviteLink(""); }} className="p-1 rounded-lg hover:bg-white/10"><X className="h-5 w-5" /></button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-4">Partagez ce lien pour vous connecter à distance</p>
                  <div className="bg-white/5 rounded-xl p-3 mb-3 break-all text-xs text-primary">
                    {inviteLink}
                  </div>
                  <button onClick={handleCopyInviteLink} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                    Copier le lien
                  </button>
                  <p className="text-[10px] text-muted-foreground mt-2">Valide 24 heures</p>
                </div>
              </div>
            )}

            {showInviteInput && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setShowInviteInput(false); setInviteToken(""); }}>
                <div className="bg-[#111] rounded-2xl max-w-sm w-full p-5 border border-white/10" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold text-sm">Rejoindre via lien</h2>
                    <button onClick={() => { setShowInviteInput(false); setInviteToken(""); }} className="p-1 rounded-lg hover:bg-white/10"><X className="h-5 w-5" /></button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3">Collez le lien d'invitation reçu (ou son code)</p>
                  <input
                    type="text"
                    placeholder="https://moment-front.vercel.app/chat?invite=..."
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 focus:outline-none focus:border-primary text-sm mb-3"
                  />
                  <button onClick={handleAcceptInviteLink} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                    Rejoindre
                  </button>
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
        <div className="shrink-0 bg-background/80 backdrop-blur-xl border-b border-white/10 px-3 py-2.5 flex items-center gap-2.5 z-10 relative">
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
            <button onClick={() => setShowGameMenu(true)}
              className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="Mini-jeux">
              <Gamepad2 className="h-5 w-5" />
            </button>
            <button onClick={() => {
              window.dispatchEvent(new CustomEvent("start-outgoing-call", { detail: { targetUser: selectedConv.otherUser } }));
            }}
              className="p-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
              title="Appel vocal">
              <Phone className="h-5 w-5" />
            </button>
            <button onClick={() => setShowChatMenu(!showChatMenu)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
          </div>
          {showChatMenu && (
            <div className="absolute right-3 top-full mt-1 z-[200] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[220px]">
              <button onClick={() => { handleClearConversation(selectedConv.conversationId); setShowChatMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-orange-400 hover:bg-white/10">
                <Trash2 className="h-4 w-4" /> Vider la conversation
              </button>
              <button onClick={() => { handleBlockUser(selectedConv.otherUser._id); setShowChatMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-white/10">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                Bloquer
              </button>
              <button onClick={() => { handleHideConversation(selectedConv.conversationId, selectedConv.otherUser._id); setShowChatMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-white/10">
                <Trash2 className="h-4 w-4" /> Supprimer la conversation
              </button>
            </div>
          )}
        </div>

        {/* ── MESSAGES (the ONLY scrollable area) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 overscroll-contain scrollbar-hide" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="flex-1" />
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
        <div className="relative shrink-0 bg-background/80 backdrop-blur-xl border-t border-white/10 px-2 pt-2 pb-4 sm:pb-3 safe-area-pb z-10">
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

              {/* Le picker est ancré à la barre de saisie (relative ci-dessus) :
                  il reste centré et jamais coupé, même en responsive. */}
              <div>
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

      {/* ── GAME MENU POPUP ── */}
      {showGameMenu && (
        <GameMenu onSelect={handleGameSelect} onClose={() => setShowGameMenu(false)} />
      )}

      {/* ── ACTIVE GAME OVERLAY ── */}
      {activeGame && activeGame.state !== "waiting" && (
        <div className="fixed inset-0 z-[250] bg-black/70 flex items-center justify-center p-3 sm:p-4">
          <div
            className={`bg-[#111] border border-white/10 rounded-2xl overflow-hidden w-full relative max-h-[92vh] flex flex-col ${activeGame.type === "quiz" ? "max-w-lg" : "max-w-[22rem]"}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-white/10 shrink-0">
              <span className="text-xs font-bold text-primary inline-flex items-center gap-1.5 min-w-0">
                <Gamepad2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{GAME_LABELS[activeGame.type] || "Jeu"}</span>
              </span>
              <button
                onClick={handleGameAbandon}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-[11px] font-semibold hover:bg-red-500/25 transition-colors"
              >
                <Flag className="h-3.5 w-3.5" /> Abandonner
              </button>
            </div>
            <div className={`${activeGame.type === "quiz" ? "p-3" : "p-4"} overflow-y-auto overflow-x-hidden`}>
              <GameRenderer
                game={activeGame}
                currentUserId={user?.id || ""}
                players={gamePlayers}
                onMove={handleGameMove}
                onRematch={handleGameRematch}
                onNextRound={handleGameNextRound}
                onClose={handleGameAbandon}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── PARTIE ABANDONNÉE ── */}
      {gameAbandonNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[260] bg-[#111] border border-red-500/40 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-[92vw]">
          <Flag className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-xs">
            {gameAbandonNotice === "un joueur" ? "Un joueur a abandonné" : `${gamePlayers[gameAbandonNotice]?.firstName || "Un joueur"} a abandonné la partie`}
            {" "}— la partie est annulée.
          </p>
          <button onClick={() => setGameAbandonNotice(null)} className="p-1.5 rounded-lg hover:bg-white/10 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── BANNIÈRE INVITATION JEU MULTIJOUEUR ── */}
      {multiInvite && !activeGame && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[260] bg-[#111] border border-primary/40 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-[92vw]">
          <Gamepad2 className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">
              {multiInvite.type === "infiltrated" ? "L'Infiltré" : multiInvite.type === "buzzer_quiz" ? "Quiz Buzzer" : "Mot Intrus"} · invitation reçue
            </p>
            <p className="text-[10px] text-muted-foreground">Ouvre la page Jeux pour rejoindre la partie</p>
          </div>
          <button
            onClick={() => { setMultiInvite(null); navigate({ to: "/games" }); }}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shrink-0"
          >
            Rejoindre
          </button>
          <button onClick={() => setMultiInvite(null)} className="p-1.5 rounded-lg hover:bg-white/10 shrink-0">✕</button>
        </div>
      )}

      {/* ── GAME INVITE CARD ── */}
      {activeGame && activeGame.state === "waiting" && (
        <GameInviteCard
          game={activeGame}
          currentUserId={user?.id || ""}
          onAccept={handleGameAccept}
          onDecline={handleGameDecline}
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
