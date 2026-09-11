import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import * as LucideIcons from "lucide-react";

const { ArrowLeft, Users, Play, Zap, Trophy, Clock, Check, X, Loader2, Gamepad2, Skull, Dice, Brain, Target, Search, Mask, Info } = LucideIcons;

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

type InfiltratedGame = {
  id: string;
  type: "infiltrated";
  players: string[];
  createdBy: string;
  state: "waiting" | "night" | "day" | "voting" | "finished";
  phase: "lobby" | "night_action" | "night_result" | "day_discussion" | "day_vote" | "vote_result";
  day: number;
  playerRoles: Record<string, string>;
  alive: Record<string, boolean>;
  eliminated: Array<{ player: string; day: number; reason: string }>;
  nightActions: Record<string, any>;
  votes: Record<string, string>;
  clues: Array<{ day: number; text: string }>;
  discussionTime: number;
  voteTime: number;
  phaseStartTime: number | null;
  winner: string | null;
  winReason: string | null;
};

type GameMode = {
  id: string;
  name: string;
  icon: any;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  category: string;
};

function GamesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  const [contacts, setContacts] = useState<PastContact[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [game, setGame] = useState<BuzzerGame | InfiltratedGame | null>(null);
  const [buzzing, setBuzzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [selectedGameMode, setSelectedGameMode] = useState<string>("infiltrated");
  const [showGameExplanation, setShowGameExplanation] = useState(false);
  const [myRole, setMyRole] = useState<{ role: string; roleName: string; emoji: string; objective: string; team: string } | null>(null);

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

    socket.on("game-state", (data: { game: BuzzerGame | InfiltratedGame }) => {
      setGame(data.game);
      if (data.game.type === "buzzer_quiz" && data.game.lastQuestionResult) {
        setShowResult(true);
        setTimeout(() => setShowResult(false), 2000);
      }
    });

    socket.on("infiltrated-role", (data: { role: string; roleName: string; emoji: string; objective: string; team: string }) => {
      setMyRole(data);
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
    if (!selectedMode) return;
    setSelectedPlayers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      if (prev.length >= selectedMode.maxPlayers - 1) return prev; // max players with creator
      return [...prev, userId];
    });
  };

  const createGame = () => {
    if (!socketRef.current || !selectedMode) return;
    if (selectedPlayers.length + 1 < selectedMode.minPlayers) return;

    if (selectedGameMode === "infiltrated") {
      socketRef.current.emit("infiltrated-create", { players: selectedPlayers });
    } else if (selectedGameMode === "buzzer_quiz") {
      socketRef.current.emit("buzzer-create", {});
    }
    // Other games would be handled similarly
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

  const gameModes: GameMode[] = [
    {
      id: "infiltrated",
      name: "🕵️ L'Infiltré",
      icon: Skull,
      description: "4-12 joueurs · Un jeu social de déduction et bluff",
      minPlayers: 4,
      maxPlayers: 12,
      category: "Social"
    },
    {
      id: "buzzer_quiz",
      name: "🎯 Quiz Buzzer",
      icon: Zap,
      description: "3-5 joueurs · Le plus rapide répond aux questions",
      minPlayers: 3,
      maxPlayers: 5,
      category: "Culture"
    },
    {
      id: "trivia",
      name: "🧠 Quiz Culture",
      icon: Brain,
      description: "2-5 joueurs · 20 questions de culture générale",
      minPlayers: 2,
      maxPlayers: 5,
      category: "Culture"
    },
    {
      id: "dice_duel",
      name: "🎲 Duel de Dés",
      icon: Dice,
      description: "2-4 joueurs · Meilleur score en 3 manches",
      minPlayers: 2,
      maxPlayers: 4,
      category: "Hasard"
    },
    {
      id: "reflex",
      name: "⚡ Le Reflexe",
      icon: Target,
      description: "2-4 joueurs · Le plus rapide gagne",
      minPlayers: 2,
      maxPlayers: 4,
      category: "Reflexes"
    },
    {
      id: "mot_intrus",
      name: "🔍 Le Mot Intrus",
      icon: Search,
      description: "2-5 joueurs · Trouvez le mot différent",
      minPlayers: 2,
      maxPlayers: 5,
      category: "Logique"
    },
    {
      id: "deux_verites",
      name: "🎭 Deux Vérités, Un Mensonge",
      icon: Mask,
      description: "3-6 joueurs · Trouvez le mensonge",
      minPlayers: 3,
      maxPlayers: 6,
      category: "Bluff"
    }
  ];

  const selectedMode = gameModes.find(m => m.id === selectedGameMode);

  const getGameExplanation = (gameId: string) => {
    const explanations: Record<string, { title: string; rules: string[]; tips: string[] }> = {
      infiltrated: {
        title: "🕵️ L'Infiltré",
        rules: [
          "4 à 12 joueurs · Un jeu social de déduction et bluff",
          "Chaque joueur reçoit secrètement un rôle : Citoyen, Infiltré, Détective, Garde ou Imposteur",
          "La nuit : L'Infiltré élimine, le Détective enquête, le Garde protège",
          "Le jour : Discutez et votez pour éliminer un suspect",
          "Des indices publics sont révélés à chaque tour",
          "L'équipe qui accomplit son objectif gagne"
        ],
        tips: [
          "Observez bien les indices et les comportements",
          "Bluffez intelligemment si vous êtes l'Infiltré",
          "Protégez les bons joueurs si vous êtes le Garde"
        ]
      },
      buzzer_quiz: {
        title: "🎯 Quiz Buzzer",
        rules: [
          "3 à 5 joueurs · Le plus rapide répond aux questions",
          "Appuyez sur le buzzer dès que vous connaissez la réponse",
          "Le premier à buzzer a le droit de répondre",
          "Bonne réponse = points, mauvaise réponse = pénalité",
          "20 questions de culture générale en français"
        ],
        tips: [
          "Soyez rapide mais précis",
          "Lisez toutes les réponses avant de buzzer"
        ]
      },
      trivia: {
        title: "🧠 Quiz Culture",
        rules: [
          "2 à 5 joueurs · 20 questions de culture générale",
          "Chaque joueur répond à toutes les questions",
          "Points selon la difficulté de la question",
          "Le joueur avec le plus de points gagne"
        ],
        tips: [
          "Prenez votre temps pour bien réfléchir",
          "Les questions sont en français"
        ]
      },
      dice_duel: {
        title: "🎲 Duel de Dés",
        rules: [
          "2 à 4 joueurs · Meilleur score en 3 manches",
          "Lancez les dés et essayez d'obtenir le meilleur score",
          "Le joueur avec le plus de points après 3 manches gagne"
        ],
        tips: [
          "Le hasard fait partie du jeu, amusez-vous !"
        ]
      },
      reflex: {
        title: "⚡ Le Reflexe",
        rules: [
          "2 à 4 joueurs · Le plus rapide gagne",
          "Appuyez dès que le signal apparaît",
          "Le plus rapide marque le point"
        ],
        tips: [
          "Concentrez-vous sur l'écran",
          "Ne réagissez pas aux fausses alertes"
        ]
      },
      mot_intrus: {
        title: "🔍 Le Mot Intrus",
        rules: [
          "2 à 5 joueurs · Trouvez le mot différent",
          "4 mots sont présentés, 1 est l'intrus",
          "Le premier à trouver l'intrus marque le point"
        ],
        tips: [
          "Cherchez les catégories sémantiques",
          "Attention aux pièges !"
        ]
      },
      deux_verites: {
        title: "🎭 Deux Vérités, Un Mensonge",
        rules: [
          "3 à 6 joueurs · Trouvez le mensonge",
          "Un joueur dit 3 affirmations : 2 vraies, 1 fausse",
          "Les autres votent pour trouver le mensonge",
          "Si le mensonge est trouvé, les votants marquent"
        ],
        tips: [
          "Soyez crédible dans vos mensonges",
          "Observez les hésitations des autres joueurs"
        ]
      }
    };
    return explanations[gameId] || { title: "Jeu", rules: [], tips: [] };
  };

  // ===== GAME IN PROGRESS =====
  if (game) {
    // Infiltrated Game UI
    if (game.type === "infiltrated") {
      const infGame = game as InfiltratedGame;

      return (
        <ProtectedRoute>
          <div className="grain flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
            {/* Header */}
            <div className="shrink-0 bg-background/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center gap-3">
              <button onClick={() => { setGame(null); setMyRole(null); socketRef.current?.emit("game-close", { gameId: game.id }); }}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex-1">
                <h1 className="font-bold text-sm">🕵️ L'Infiltré</h1>
                <p className="text-[10px] text-muted-foreground">
                  {infGame.state === "waiting" ? "En attente des joueurs..." :
                   infGame.state === "night" ? `🌙 Nuit ${infGame.day}` :
                   infGame.state === "day" ? `☀️ Jour ${infGame.day}` :
                   infGame.state === "voting" ? "🗳️ Vote en cours" :
                   "Partie terminée"}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {infGame.players.filter(p => infGame.alive[p]).length}/{infGame.players.length} en vie
              </div>
            </div>

            {/* Role Reveal (only shown once at start) */}
            {myRole && infGame.state === "night" && infGame.phase === "night_action" && (
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="max-w-md mx-auto">
                  <div className="bg-primary/20 border border-primary/40 rounded-2xl p-6 text-center mb-4">
                    <div className="text-6xl mb-3">{myRole.emoji}</div>
                    <h2 className="text-xl font-bold mb-2">{myRole.roleName}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{myRole.objective}</p>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      myRole.team === "village" ? "bg-green-500/20 text-green-400" :
                      myRole.team === "infiltrated" ? "bg-red-500/20 text-red-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      Équipe: {myRole.team === "village" ? "Village" : myRole.team === "infiltrated" ? "Infiltrés" : "Neutre"}
                    </div>
                  </div>

                  {/* Night Actions */}
                  {myRole.role === "infiltrated" && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-sm font-semibold mb-3">Choisis ta cible</h3>
                      <div className="space-y-2">
                        {infGame.players.filter(p => infGame.alive[p] && p !== user?.id).map(pId => (
                          <button
                            key={pId}
                            onClick={() => socketRef.current?.emit("game-move", { gameId: infGame.id, move: "night_eliminate", targetId: pId })}
                            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/40 transition-colors text-left"
                          >
                            <span className="text-sm">{pId === user?.id ? "Vous" : pId.substring(0, 8)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {myRole.role === "detective" && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-sm font-semibold mb-3">Enquête sur un joueur</h3>
                      <div className="space-y-2">
                        {infGame.players.filter(p => infGame.alive[p] && p !== user?.id).map(pId => (
                          <button
                            key={pId}
                            onClick={() => socketRef.current?.emit("game-move", { gameId: infGame.id, move: "night_investigate", targetId: pId })}
                            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors text-left"
                          >
                            <span className="text-sm">{pId === user?.id ? "Vous" : pId.substring(0, 8)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {myRole.role === "guard" && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-sm font-semibold mb-3">Protège un joueur</h3>
                      <div className="space-y-2">
                        {infGame.players.filter(p => infGame.alive[p]).map(pId => (
                          <button
                            key={pId}
                            onClick={() => socketRef.current?.emit("game-move", { gameId: infGame.id, move: "night_protect", targetId: pId })}
                            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-green-500/20 hover:border-green-500/40 transition-colors text-left"
                          >
                            <span className="text-sm">{pId === user?.id ? "Vous (auto-protection)" : pId.substring(0, 8)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {myRole.role === "citizen" && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                      <p className="text-sm text-muted-foreground">Attends la phase de jour pour discuter et voter.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Day Phase */}
            {infGame.state === "day" && (
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="max-w-md mx-auto">
                  {/* Latest Clue */}
                  {infGame.clues.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                      <h3 className="text-xs font-semibold text-yellow-400 mb-2">🔎 INDICE</h3>
                      <p className="text-sm">{infGame.clues[infGame.clues.length - 1].text}</p>
                    </div>
                  )}

                  {/* Discussion Phase */}
                  {infGame.phase === "day_discussion" && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-sm font-semibold mb-2">☀️ Discussion</h3>
                      <p className="text-xs text-muted-foreground mb-3">Discutez avec les autres joueurs pour trouver les Infiltrés.</p>
                      <div className="text-center py-4">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-400 animate-spin" />
                        <p className="text-sm text-muted-foreground">Vote dans quelques instants...</p>
                      </div>
                    </div>
                  )}

                  {/* Voting Phase */}
                  {infGame.phase === "day_vote" && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="text-sm font-semibold mb-3">🗳️ Vote pour éliminer</h3>
                      <div className="space-y-2">
                        {infGame.players.filter(p => infGame.alive[p] && p !== user?.id).map(pId => (
                          <button
                            key={pId}
                            onClick={() => socketRef.current?.emit("game-move", { gameId: infGame.id, move: "vote", targetId: pId })}
                            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/40 transition-colors text-left"
                          >
                            <span className="text-sm">{pId.substring(0, 8)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vote Result */}
                  {infGame.phase === "vote_result" && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                      <p className="text-sm text-muted-foreground">Résultat du vote...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Finished State */}
            {infGame.state === "finished" && (
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="max-w-md mx-auto text-center">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
                  <h2 className="text-2xl font-bold mb-2">
                    {infGame.winner === "village" ? "Victoire du Village !" :
                     infGame.winner === "infiltrated" ? "Victoire des Infiltrés !" :
                     infGame.winner === "impostor" ? "Victoire de l'Imposteur !" :
                     "Partie terminée"}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">{infGame.winReason}</p>
                  <div className="space-y-2 mb-6">
                    {infGame.eliminated.map((e, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3 text-left">
                        <p className="text-xs text-muted-foreground">Jour {e.day} - {e.reason}</p>
                        <p className="text-sm">{e.player.substring(0, 8)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ProtectedRoute>
      );
    }

    // Buzzer Quiz UI (existing)
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
            <h2 className="text-sm font-semibold mb-3">Choisissez un jeu</h2>
            <div className="space-y-2">
              {gameModes.map((mode) => {
                const IconComp = mode.icon;
                const isSelected = selectedGameMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedGameMode(mode.id)}
                    className={`w-full p-4 rounded-xl border transition-all text-left ${
                      isSelected
                        ? "bg-primary/20 border-primary/40"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isSelected ? "bg-primary/30" : "bg-white/10"
                      }`}>
                        <IconComp className={`h-6 w-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{mode.name}</p>
                        <p className="text-xs text-muted-foreground">{mode.description}</p>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedMode && (
              <button onClick={() => setShowGameExplanation(true)}
                className="mt-3 w-full py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4" />
                Comment ça marche ?
              </button>
            )}
          </div>

          {/* Selected Players */}
          {selectedPlayers.length > 0 && selectedMode && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold mb-3">
                Joueurs sélectionnés ({selectedPlayers.length + 1}/{selectedMode.maxPlayers})
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
              <p className="text-[10px] text-muted-foreground mt-2">
                {selectedPlayers.length + 1 < selectedMode.minPlayers
                  ? `Il faut au moins ${selectedMode.minPlayers} joueurs pour commencer`
                  : "Vous pouvez commencer !"}
              </p>
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
          {selectedMode && selectedPlayers.length + 1 >= selectedMode.minPlayers && (
            <div className="sticky bottom-0 py-4 bg-background/80 backdrop-blur-xl">
              <button onClick={() => setShowGameExplanation(true)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
                <Gamepad2 className="h-5 w-5 inline mr-2" />
                Créer la partie ({selectedPlayers.length + 1} joueurs)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Game Explanation Modal */}
      {showGameExplanation && selectedMode && (() => {
        const explanation = getGameExplanation(selectedMode.id);
        return (
          <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowGameExplanation(false)}>
            <div className="bg-[#111] border border-white/10 rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h2 className="font-bold text-sm">{explanation.title}</h2>
                <button onClick={() => setShowGameExplanation(false)} className="p-1 rounded-lg hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-primary mb-2">Règles du jeu</h3>
                  <ul className="space-y-1">
                    {explanation.rules.map((rule, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-primary mb-2">Conseils</h3>
                  <ul className="space-y-1">
                    {explanation.tips.map((tip, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-yellow-400 mt-0.5">💡</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-white/10">
                <button onClick={() => {
                  setShowGameExplanation(false);
                  createGame();
                }}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
                  <Play className="h-5 w-5 inline mr-2" />
                  Commencer
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </ProtectedRoute>
  );
}
