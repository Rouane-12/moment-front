import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import * as LucideIcons from "lucide-react";

const { ArrowLeft, Users, Play, Zap, Trophy, Clock, Check, X, Loader2, Gamepad2 } = LucideIcons;

export const Route = createFileRoute("/games")({ ssr: false, component: GamesPage });

type PastContact = {
  user: { _id: string; firstName: string; lastName: string; role: string; avatar?: string };
  lastMessage: { content: string; createdAt: string; sender: string } | null;
  messageCount: number;
  conversationId: string;
};

type BuzzerGame = {
  id: string;
  type: "buzzer_quiz";
  players: string[];
  scores: Record<string, number>;
  correctCount: Record<string, number>;
  state: "waiting" | "playing" | "finished";
  quizStatus: "generating" | "ready";
  questionIndex: number;
  totalQuestions: number;
  currentQuestion: { id: string; question: string; answers: string[]; difficulty: string; points: number } | null;
  pstate: string;
  currentBuzz: string | null;
  buzzOrder: string[];
  deadline: number | null;
  lastQuestionResult: any;
  scoresHistory: any[];
  winner: string | null;
  createdBy: string;
};

function GamesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  const [contacts, setContacts] = useState<PastContact[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [game, setGame] = useState<BuzzerGame | null>(null);
  const [buzzing, setBuzzing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Connect socket
  useEffect(() => {
    const token = localStorage.getItem("token") || document.cookie.match(/token=([^;]+)/)?.[1] || "";
    const socket = io(import.meta.env["VITE_API_URL"] || "http://localhost:5200", {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("game-invite", (data: { game: BuzzerGame }) => {
      setGame(data.game);
    });

    socket.on("game-start", (data: { game: BuzzerGame }) => {
      setGame(data.game);
    });

    socket.on("game-state", (data: { game: BuzzerGame }) => {
      setGame(data.game);
      if (data.game.lastQuestionResult) {
        setShowResult(true);
        setTimeout(() => setShowResult(false), 2000);
      }
    });

    socket.on("presence-update", (data: { userId: string; online: boolean }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (data.online) next.add(data.userId);
        else next.delete(data.userId);
        return next;
      });
    });

    // Request online users
    socket.emit("get-online-users");

    return () => { socket.disconnect(); };
  }, []);

  // Load contacts
  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const res = await api.chat.getPastContacts();
      if (res.success) {
        setContacts((res as any).contacts || []);
      }
    } catch (e) {
      console.error("Error loading contacts:", e);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayer = (userId: string) => {
    setSelectedPlayers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      if (prev.length >= 4) return prev; // max 4 additional players (5 total with creator)
      return [...prev, userId];
    });
  };

  const createGame = () => {
    if (!socketRef.current || selectedPlayers.length < 2) return;
    socketRef.current.emit("buzzer-create", {});
  };

  const addPlayerToGame = (playerId: string) => {
    if (!game || !socketRef.current) return;
    socketRef.current.emit("buzzer-add-player", { gameId: game.id, playerId });
  };

  const removePlayerFromGame = (playerId: string) => {
    if (!game || !socketRef.current) return;
    socketRef.current.emit("buzzer-remove-player", { gameId: game.id, playerId });
  };

  const startGame = () => {
    if (!game || !socketRef.current) return;
    socketRef.current.emit("buzzer-start", { gameId: game.id });
  };

  const handleBuzz = () => {
    if (!game || !socketRef.current || game.pstate !== "buzzing") return;
    setBuzzing(true);
    socketRef.current.emit("buzzer-buzz", { gameId: game.id });
  };

  const handleAnswer = (answerIndex: number) => {
    if (!game || !socketRef.current || game.pstate !== "answering") return;
    socketRef.current.emit("buzzer-answer", { gameId: game.id, answerIndex });
  };

  const handleRematch = () => {
    if (!game || !socketRef.current) return;
    socketRef.current.emit("game-rematch", { gameId: game.id });
  };

  const getOnlineContacts = () => contacts.filter((c) => onlineUsers.has(c.user._id));
  const getOfflineContacts = () => contacts.filter((c) => !onlineUsers.has(c.user._id));

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "facile": return "text-green-400 bg-green-500/20";
      case "moyen": return "text-yellow-400 bg-yellow-500/20";
      case "difficile": return "text-orange-400 bg-orange-500/20";
      case "tres_difficile": return "text-red-400 bg-red-500/20";
      default: return "text-gray-400 bg-gray-500/20";
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "facile": return "Facile";
      case "moyen": return "Moyen";
      case "difficile": return "Difficile";
      case "tres_difficile": return "Très difficile";
      default: return difficulty;
    }
  };

  // ===== GAME IN PROGRESS =====
  if (game) {
    return (
      <ProtectedRoute>
        <div className="grain flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
          {/* Header */}
          <div className="shrink-0 bg-background/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center gap-3">
            <button onClick={() => { setGame(null); socketRef.current?.emit("game-close", { gameId: game.id }); }}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-bold text-sm">🎯 Quiz Buzzer</h1>
              <p className="text-[10px] text-muted-foreground">
                {game.state === "waiting" ? "En attente des joueurs..." :
                 game.state === "playing" ? `Question ${game.questionIndex + 1}/${game.totalQuestions}` :
                 "Partie terminée"}
              </p>
            </div>
            {game.quizStatus === "generating" && (
              <div className="flex items-center gap-2 text-xs text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Génération...</span>
              </div>
            )}
          </div>

          {/* Scores */}
          <div className="shrink-0 px-4 py-3 border-b border-white/10">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {game.players.map((pId) => (
                <div key={pId} className={`flex-shrink-0 px-3 py-2 rounded-xl text-center min-w-[80px] ${
                  game.currentBuzz === pId ? "bg-primary/20 border border-primary/40" :
                  "bg-white/5"
                }`}>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {pId === user?.id ? "Vous" : pId.substring(0, 8)}
                  </p>
                  <p className="text-lg font-bold">{game.scores[pId] || 0}</p>
                  <p className="text-[9px] text-muted-foreground">{game.correctCount[pId] || 0}/{game.questionIndex}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Game Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {/* Waiting State */}
            {game.state === "waiting" && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-3 text-primary/40" />
                <p className="font-medium mb-2">{game.players.length}/5 joueurs</p>
                <p className="text-xs text-muted-foreground mb-4">
                  {game.players.length < 3 ? `Ajoutez au moins ${3 - game.players.length} joueur(s)` : "Vous pouvez commencer !"}
                </p>
                {game.createdBy === user?.id && game.players.length >= 3 && (
                  <button onClick={startGame}
                    className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
                    <Play className="h-5 w-5 inline mr-2" />
                    Commencer
                  </button>
                )}
              </div>
            )}

            {/* Playing State */}
            {game.state === "playing" && game.currentQuestion && (
              <div className="max-w-lg mx-auto">
                {/* Difficulty Badge */}
                <div className="flex justify-center mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(game.currentQuestion.difficulty)}`}>
                    {getDifficultyLabel(game.currentQuestion.difficulty)} · +{game.currentQuestion.points} pts
                  </span>
                </div>

                {/* Question */}
                <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/10">
                  <p className="text-center text-lg font-medium leading-relaxed">
                    {game.currentQuestion.question}
                  </p>
                </div>

                {/* Buzz Button or Answer Options */}
                {game.pstate === "buzzing" && (
                  <button onClick={handleBuzz}
                    className="w-full py-6 rounded-2xl bg-red-500 text-white text-xl font-bold hover:bg-red-600 active:scale-95 transition-all animate-pulse">
                    <Zap className="h-8 w-8 inline mr-2" />
                    BUZZER !
                  </button>
                )}

                {game.pstate === "waiting_answer" && (
                  <div className="text-center py-6 bg-white/5 rounded-2xl border border-white/10">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-400 animate-spin" />
                    <p className="text-sm text-muted-foreground">En attente de la réponse...</p>
                  </div>
                )}

                {game.pstate === "answering" && (
                  <div className="space-y-3">
                    <p className="text-center text-sm text-primary font-medium">Vous avez buzzé ! Répondez :</p>
                    <div className="grid grid-cols-2 gap-3">
                      {game.currentQuestion.answers.map((answer, i) => (
                        <button key={i} onClick={() => handleAnswer(i)}
                          className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all text-left">
                          <span className="text-xs font-bold text-primary mr-2">{String.fromCharCode(65 + i)}.</span>
                          <span className="text-sm">{answer}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {game.pstate === "feedback" && game.lastQuestionResult && (
                  <div className={`p-4 rounded-2xl border ${
                    game.lastQuestionResult.correct ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {game.lastQuestionResult.correct ? (
                        <Check className="h-5 w-5 text-green-400" />
                      ) : (
                        <X className="h-5 w-5 text-red-400" />
                      )}
                      <span className="font-medium">
                        {game.lastQuestionResult.nobodyBuzzed ? "Personne n'a buzzé" :
                         game.lastQuestionResult.timedOut ? "Temps écoulé" :
                         game.lastQuestionResult.correct ? "Bonne réponse !" : "Mauvaise réponse"}
                      </span>
                    </div>
                    {!game.lastQuestionResult.correct && (
                      <p className="text-xs text-muted-foreground">
                        Bonne réponse : {game.currentQuestion?.answers[game.lastQuestionResult.correctIndex]}
                      </p>
                    )}
                  </div>
                )}

                {game.pstate === "done" && (
                  <div className="text-center py-6 bg-white/5 rounded-2xl border border-white/10">
                    <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                    <p className="text-sm text-muted-foreground">En attente des autres joueurs...</p>
                  </div>
                )}
              </div>
            )}

            {/* Finished State */}
            {game.state === "finished" && (
              <div className="text-center py-8">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
                <h2 className="text-2xl font-bold mb-2">
                  {game.winner === "draw" ? "Match nul !" :
                   game.winner === user?.id ? "Vous avez gagné !" :
                   "Victoire !"}
                </h2>
                <div className="flex justify-center gap-4 mb-6">
                  {game.players.map((pId) => (
                    <div key={pId} className={`text-center px-4 py-3 rounded-xl ${
                      game.winner === pId ? "bg-yellow-500/20 border border-yellow-500/40" : "bg-white/5"
                    }`}>
                      <p className="text-xs text-muted-foreground">{pId === user?.id ? "Vous" : pId.substring(0, 8)}</p>
                      <p className="text-2xl font-bold">{game.scores[pId] || 0}</p>
                      <p className="text-[10px] text-muted-foreground">{game.correctCount[pId] || 0} bonnes</p>
                    </div>
                  ))}
                </div>
                <button onClick={handleRematch}
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
                  Revanche
                </button>
              </div>
            )}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // ===== LOBBY - SELECT PLAYERS =====
  return (
    <ProtectedRoute>
      <div className="grain flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 pt-14 pb-24 overflow-y-auto flex-1">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate({ to: "/chat" })}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">🎮 Jeux</h1>
              <p className="text-[11px] text-muted-foreground">Jouez avec vos amis en ligne</p>
            </div>
          </div>

          {/* Game Mode Selection */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-3">Mode de jeu</h2>
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">🎯 Quiz Buzzer</p>
                  <p className="text-xs text-muted-foreground">3-5 joueurs · Le plus rapide répond</p>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Players */}
          {selectedPlayers.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold mb-3">
                Joueurs sélectionnés ({selectedPlayers.length + 1}/5)
              </h2>
              <div className="flex flex-wrap gap-2">
                {/* Creator (you) */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/20 border border-primary/40">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary-foreground">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                  <span className="text-xs font-medium">{user?.firstName} (Vous)</span>
                </div>
                {/* Selected players */}
                {selectedPlayers.map((pId) => {
                  const contact = contacts.find((c) => c.user._id === pId);
                  if (!contact) return null;
                  return (
                    <div key={pId} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                      <div className="relative">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-primary">
                            {contact.user.firstName[0]}{contact.user.lastName[0]}
                          </span>
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-background" />
                      </div>
                      <span className="text-xs font-medium">{contact.user.firstName}</span>
                      <button onClick={() => togglePlayer(pId)}
                        className="p-0.5 rounded hover:bg-white/10 transition-colors">
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Online Contacts */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              En ligne ({getOnlineContacts().length})
            </h2>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : getOnlineContacts().length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">Aucun contact en ligne</p>
            ) : (
              <div className="space-y-1">
                {getOnlineContacts().map((contact) => (
                  <button key={contact.user._id}
                    onClick={() => togglePlayer(contact.user._id)}
                    disabled={selectedPlayers.includes(contact.user._id) || selectedPlayers.length >= 4}
                    className={`w-full p-3 flex items-center gap-3 rounded-xl transition-colors text-left ${
                      selectedPlayers.includes(contact.user._id)
                        ? "bg-primary/20 border border-primary/40"
                        : "hover:bg-white/5"
                    }`}>
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                      {contact.user.avatar ? (
                        <img src={contact.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-primary font-bold text-xs">
                          {contact.user.firstName[0]}{contact.user.lastName[0]}
                        </span>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{contact.user.firstName} {contact.user.lastName}</p>
                      <p className="text-[10px] text-green-400">En ligne</p>
                    </div>
                    {selectedPlayers.includes(contact.user._id) && (
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Offline Contacts */}
          {getOfflineContacts().length > 0 && (
            <div className="mb-6 opacity-60">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                Hors ligne ({getOfflineContacts().length})
              </h2>
              <div className="space-y-1">
                {getOfflineContacts().map((contact) => (
                  <div key={contact.user._id}
                    className="w-full p-3 flex items-center gap-3 rounded-xl text-left opacity-50">
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center flex-shrink-0">
                      <span className="text-muted-foreground font-bold text-xs">
                        {contact.user.firstName[0]}{contact.user.lastName[0]}
                      </span>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gray-500 rounded-full border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{contact.user.firstName} {contact.user.lastName}</p>
                      <p className="text-[10px] text-muted-foreground">Hors ligne</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create Game Button */}
          {selectedPlayers.length >= 2 && (
            <div className="sticky bottom-0 py-4 bg-background/80 backdrop-blur-xl">
              <button onClick={createGame}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
                <Gamepad2 className="h-5 w-5 inline mr-2" />
                Créer la partie ({selectedPlayers.length + 1} joueurs)
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
