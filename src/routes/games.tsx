import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, type ElementType, type ReactNode, type RefObject } from "react";
import type { Socket } from "socket.io-client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { io } from "socket.io-client";
import {
  ArrowLeft, Users, Play, Zap, Trophy, Clock, Check, X, Loader2, Gamepad2,
  Skull, Search, Drama, Info, Crown, User,
  ShieldCheck, VenetianMask, Gavel, MoonStar, SunMedium, Vote as VoteIcon,
  Hourglass, Lightbulb, Puzzle, Eye, MessagesSquare, Brain, DoorOpen, Send,
} from "lucide-react";

export const Route = createFileRoute("/games")({ ssr: false, component: GamesPage });

// ── Types ──────────────────────────────────────────────────────
type PastContact = {
  user: { _id: string; firstName: string; lastName: string; role: string; avatar?: string };
  lastMessage: { content: string; createdAt: string; sender: string } | null;
  messageCount: number;
  conversationId: string;
};

type BuzzerGame = {
  id: string; type: "buzzer_quiz";
  players: string[]; scores: Record<string, number>; correctCount: Record<string, number>;
  state: "waiting" | "playing" | "finished";
  quizStatus: "generating" | "ready"; questionIndex: number; totalQuestions: number;
  currentQuestion: { id: string; question: string; answers: string[]; difficulty: string; points: number } | null;
  pstate: string; currentBuzz: string | null; buzzOrder: string[]; deadline: number | null;
  lastQuestionResult: any; scoresHistory: any[]; winner: string | null; createdBy: string;
};

type QuizGame = {
  id: string; type: "quiz";
  players: string[]; scores: Record<string, number>; correctCount: Record<string, number>;
  state: "waiting" | "playing" | "finished";
  quizStatus: "generating" | "ready" | "error"; quizError?: string | null;
  questions: Array<{ id: string; question: string; answers: string[]; difficulty: string; points: number }>;
  order: number[]; progress: number;
  pstate: "idle" | "question" | "feedback" | "done";
  deadline: number | null; lastResult: any;
  opponents: Array<{ id: string; progress: number; score: number }>;
  winner: string | null; createdBy: string;
};

type InfiltratedGame = {
  id: string; type: "infiltrated";
  players: string[]; createdBy: string;
  state: "waiting" | "night" | "day" | "voting" | "finished";
  phase: "lobby" | "night_action" | "night_result" | "day_discussion" | "day_vote" | "vote_result";
  day: number;
  playerRoles: Record<string, string>;
  alive: Record<string, boolean>;
  eliminated: Array<{ player: string; day: number; reason: string; role?: string; roleName?: string }>;
  votes: string[];
  voteCount: Record<string, number> | null;
  clues: Array<{ day: number; text: string }>;
  discussionTime: number; voteTime: number;
  phaseDeadline: number | null;
  winner: string | null; winReason: string | null;
  lastNightResult: { day: number; eliminated: string | null; wasProtected?: boolean } | null;
  lastVoteResult: { day: number; eliminated: string | null; tie: boolean; tally: Record<string, number>; noMajority: boolean } | null;
  myAction: { type: string; target: string } | null;
  rolesLegend: Array<{ key: string; name: string; icon: string; team: string }>;
};

type MotIntrusGame = {
  id: string; type: "mot_intrus_multi";
  players: string[]; createdBy: string;
  state: "waiting" | "playing" | "finished";
  roundIndex: number; totalRounds: number;
  scores: Record<string, number>; roundWins: Record<string, number>;
  pstate: string; lockedUntil: number;
  roundWinner: string | null;
  lastRoundResult: { winner: string | null; timedOut?: boolean; explanation: string; points?: number } | null;
  deadline: number | null; winner: string | null;
  currentRound: { words: string[]; difficulty: string; points: number } | null;
};

type AnyGame = BuzzerGame | InfiltratedGame | MotIntrusGame | QuizGame;

type GameMode = {
  id: string; name: string; icon: ElementType;
  description: string; minPlayers: number; maxPlayers: number; category: string;
};

// ── Icônes de rôles (L'Infiltré) — Lucide uniquement ───────────
const ROLE_ICONS: Record<string, ElementType> = {
  citizen: User, infiltrated: VenetianMask, detective: Search, guard: ShieldCheck, impostor: Drama,
};
const ROLE_COLORS: Record<string, string> = {
  village: "text-sky-400 bg-sky-500/20", infiltrated: "text-red-400 bg-red-500/20", neutral: "text-yellow-400 bg-yellow-500/20",
};

// ── Horloge partagée (compte à rebours) ────────────────────────
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════
function GamesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [socketReady, setSocketReady] = useState(false);

  const [contacts, setContacts] = useState<PastContact[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [game, setGame] = useState<AnyGame | null>(null);
  const [selectedGameMode, setSelectedGameMode] = useState<string>("infiltrated");
  const [showRules, setShowRules] = useState<string | null>(null);
  const [abandonNotice, setAbandonNotice] = useState<string | null>(null);

  const resetSessionState = () => {};

  // Socket
  useEffect(() => {
    const token = localStorage.getItem("token") || document.cookie.match(/token=([^;]+)/)?.[1] || "";
    const socket = io(import.meta.env["VITE_API_URL"] || "http://localhost:5200", {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    setSocketReady(true);

    socket.on("connect", () => socket.emit("get-online-users"));

    socket.on("online-users", (data: { userIds: string[] }) => {
      setOnlineUsers(new Set(data.userIds || []));
    });

    // La page Jeux ne gère que les parties multijoueur (le quiz multijoueur
    // partage le type "quiz" avec le duel, d'où le marqueur `multiplayer`).
    const MULTI_TYPES = ["infiltrated", "mot_intrus_multi", "buzzer_quiz"];
    const isMultiGame = (g: any) => !!g && (MULTI_TYPES.includes(g.type) || g.multiplayer === true);

    socket.on("game-invite", (data: { game: AnyGame; from: string }) => {
      if (!isMultiGame(data.game)) return;
      setGame(data.game);
    });

    socket.on("game-start", (data: { game: AnyGame }) => {
      if (!isMultiGame(data.game)) return;
      setGame(data.game);
    });

    socket.on("game-state", (data: { game: AnyGame | null; removed?: boolean }) => {
      if (data.removed || !data.game) {
        setGame(null);
        return;
      }
      if (!isMultiGame(data.game)) return;
      setGame(data.game);
    });

    // Un joueur a abandonné : la partie s'arrête pour tout le monde
    socket.on("game-abandoned", (data: { by?: string }) => {
      setGame(null);
      setAbandonNotice(data?.by || "un joueur");
    });

    socket.on("presence-update", (data: { userId: string; online: boolean }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (data.online) next.add(data.userId);
        else next.delete(data.userId);
        return next;
      });
    });

    const poll = setInterval(() => socket.emit("get-online-users"), 15000);

    return () => { clearInterval(poll); socket.disconnect(); };
  }, []);

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const res = await api.chat.getPastContacts();
      if (res.success) setContacts((res as any).contacts || []);
    } catch (e) {
      console.error("Erreur chargement contacts:", e);
    } finally {
      setLoading(false);
    }
  };

  const nameOf = useCallback((id: string) => {
    if (id === user?.id) return "Vous";
    const c = contacts.find((x) => x.user._id === id);
    return c ? `${c.user.firstName} ${c.user.lastName.charAt(0)}.` : `Joueur ${id.slice(0, 5)}`;
  }, [contacts, user?.id]);

  const selectedMode = GAME_MODES.find((m) => m.id === selectedGameMode) || null;

  const togglePlayer = (userId: string) => {
    if (!selectedMode) return;
    setSelectedPlayers((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      if (prev.length >= selectedMode.maxPlayers - 1) return prev;
      return [...prev, userId];
    });
  };

  const createGame = () => {
    if (!socketRef.current || !selectedMode) return;
    if (selectedPlayers.length + 1 < selectedMode.minPlayers) return;
    const s = socketRef.current;
    if (selectedMode.id === "infiltrated") s.emit("infiltrated-create", { players: selectedPlayers });
    else if (selectedMode.id === "quiz") s.emit("quiz-create", { players: selectedPlayers });
    else if (selectedMode.id === "mot_intrus_multi") s.emit("motintrusmulti-create", { players: selectedPlayers });
    setShowRules(null);
  };

  // ══════════════════════════════════════════════════════════════
  // EN PARTIE — délégation aux sessions (composants module-level)
  // ══════════════════════════════════════════════════════════════
  if (game && socketReady) {
    const exitGame = () => {
      // Abandon : la partie s'arrête pour TOUT LE MONDE
      socketRef.current?.emit("game-abandon", { gameId: game.id });
      setGame(null);
    };
    if (game.type === "infiltrated") {
      return <InfiltratedSession key={game.id} game={game} socketRef={socketRef} me={user?.id || ""} nameOf={nameOf} exitGame={exitGame} />;
    }
    if (game.type === "mot_intrus_multi") {
      return <MotIntrusSession key={game.id} game={game} socketRef={socketRef} me={user?.id || ""} nameOf={nameOf} exitGame={exitGame} />;
    }
    if (game.type === "quiz") {
      return <QuizSession key={game.id} game={game} socketRef={socketRef} me={user?.id || ""} nameOf={nameOf} exitGame={exitGame} />;
    }
    return <BuzzerSession key={game.id} game={game} socketRef={socketRef} me={user?.id || ""} nameOf={nameOf} exitGame={exitGame} />;
  }

  // ══════════════════════════════════════════════════════════════
  // LOBBY — CHOIX DU JEU + JOUEURS
  // ══════════════════════════════════════════════════════════════
  const onlineContacts = contacts.filter((c) => onlineUsers.has(c.user._id));
  const offlineContacts = contacts.filter((c) => !onlineUsers.has(c.user._id));

  return (
    <ProtectedRoute>
      <div className="grain flex-1 min-h-0 flex flex-col overflow-hidden">
        {abandonNotice && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] bg-[#111] border border-red-500/40 rounded-2xl px-4 py-3 flex items-center gap-3 max-w-[92vw]">
            <Info className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-xs">
              {abandonNotice === "un joueur" ? "Un joueur a abandonné" : `${nameOf(abandonNotice)} a abandonné la partie`} — la partie est annulée.
            </p>
            <button onClick={() => setAbandonNotice(null)} className="p-1 rounded-lg hover:bg-white/10 shrink-0"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <div className="px-3 sm:px-6 lg:px-8 pt-14 pb-24 overflow-y-auto overflow-x-hidden flex-1">
          <div className="max-w-3xl mx-auto w-full">
          {/* En-tête */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate({ to: "/chat" })} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2"><Gamepad2 className="h-6 w-6 text-primary" /> Jeux multijoueur</h1>
              <p className="text-[11px] text-muted-foreground">Joue à plusieurs avec tes contacts en ligne</p>
            </div>
          </div>

          {/* Choix du jeu */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-3">Choisis un jeu</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {GAME_MODES.map((mode) => {
                const IconComp = mode.icon;
                const isSelected = selectedGameMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => { setSelectedGameMode(mode.id); setSelectedPlayers([]); }}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      isSelected ? "bg-primary/20 border-primary/40" : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-primary/30" : "bg-white/10"
                      }`}>
                        <IconComp className={`h-6 w-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{mode.name}</p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-muted-foreground shrink-0">{mode.category}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{mode.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{mode.minPlayers} à {mode.maxPlayers} joueurs</p>
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-primary shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedMode && (
              <button
                onClick={() => setShowRules(selectedMode.id)}
                className="mt-3 w-full py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-xs text-muted-foreground"
              >
                <Info className="h-4 w-4" />
                Voir les règles
              </button>
            )}
          </div>

          {/* Joueurs sélectionnés */}
          {selectedMode && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold mb-3">
                Joueurs ({selectedPlayers.length + 1}/{selectedMode.maxPlayers})
              </h2>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/20 border border-primary/40 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary-foreground">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                  <span className="text-xs font-medium">{user?.firstName} (toi)</span>
                </div>
                {selectedPlayers.map((pId) => {
                  const contact = contacts.find((c) => c.user._id === pId);
                  if (!contact) return null;
                  return (
                    <div key={pId} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 min-w-0 max-w-full">
                      <PlayerAvatar contact={contact} size={24} online />
                      <span className="text-xs font-medium truncate">{contact.user.firstName}</span>
                      <button onClick={() => togglePlayer(pId)} className="p-0.5 rounded hover:bg-white/10 transition-colors">
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {selectedPlayers.length + 1 < selectedMode.minPlayers
                  ? `Il faut au moins ${selectedMode.minPlayers} joueurs pour créer la partie`
                  : "Prêt ! Les règles s'afficheront avant le lancement."}
              </p>
            </div>
          )}

          {/* Contacts en ligne */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              En ligne ({onlineContacts.length})
            </h2>
            {loading ? (
              <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
            ) : onlineContacts.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Aucun contact en ligne pour le moment.
                <br />Les joueurs hors ligne ne peuvent pas être invités.
              </div>
            ) : (
              <div className="space-y-1">
                {onlineContacts.map((contact) => {
                  const isSel = selectedPlayers.includes(contact.user._id);
                  const disabled = !isSel && !!selectedMode && selectedPlayers.length >= selectedMode.maxPlayers - 1;
                  return (
                    <button
                      key={contact.user._id}
                      onClick={() => togglePlayer(contact.user._id)}
                      disabled={disabled}
                      className={`w-full p-3 flex items-center gap-3 rounded-xl transition-colors text-left ${
                        isSel ? "bg-primary/20 border border-primary/40" : "hover:bg-white/5 border border-transparent"
                      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <PlayerAvatar contact={contact} size={40} online />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{contact.user.firstName} {contact.user.lastName}</p>
                        <p className="text-[10px] text-green-400">En ligne</p>
                      </div>
                      {isSel && <Check className="h-5 w-5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hors ligne (informatif) */}
          {offlineContacts.length > 0 && (
            <div className="mb-6 opacity-60">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                Hors ligne ({offlineContacts.length})
              </h2>
              <div className="space-y-1">
                {offlineContacts.slice(0, 8).map((contact) => (
                  <div key={contact.user._id} className="w-full p-3 flex items-center gap-3 rounded-xl opacity-50">
                    <PlayerAvatar contact={contact} size={40} online={false} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{contact.user.firstName} {contact.user.lastName}</p>
                      <p className="text-[10px] text-muted-foreground">Hors ligne</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bouton créer */}
          {selectedMode && selectedPlayers.length + 1 >= selectedMode.minPlayers && (
            <div className="sticky bottom-0 py-4 bg-background/80 backdrop-blur-xl">
              <button
                onClick={() => setShowRules(selectedMode.id)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Play className="h-5 w-5" />
                Créer la partie ({selectedPlayers.length + 1} joueurs)
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Panneau des règles — obligatoire avant de lancer */}
        {showRules && selectedMode && (
          <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowRules(null)}>
            <div className="bg-[#111] border border-white/10 rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <selectedMode.icon className="h-5 w-5 text-primary" />
                  <h2 className="font-bold text-sm">{selectedMode.name}</h2>
                </div>
                <button onClick={() => setShowRules(null)} className="p-1 rounded-lg hover:bg-white/10"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(85vh-120px)]">
                <h3 className="text-xs font-semibold text-primary mb-2">Comment jouer</h3>
                <ul className="space-y-1.5 mb-4">
                  {GAME_RULES[selectedMode.id]?.rules.map((rule, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
                <h3 className="text-xs font-semibold text-yellow-400 mb-2 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" /> Conseils
                </h3>
                <ul className="space-y-1.5">
                  {GAME_RULES[selectedMode.id]?.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-4 py-3 border-t border-white/10">
                <button
                  onClick={createGame}
                  disabled={selectedPlayers.length + 1 < selectedMode.minPlayers}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Play className="h-5 w-5" />
                  {selectedPlayers.length + 1 < selectedMode.minPlayers
                    ? `Encore ${selectedMode.minPlayers - selectedPlayers.length - 1} joueur(s) requis`
                    : "Lancer la partie"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANTS PARTAGÉS (module-level : pas de remount sauvage)
// ═══════════════════════════════════════════════════════════════

function PlayerAvatar({ contact, size, online }: { contact: PastContact; size: number; online: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden">
        {contact.user.avatar ? (
          <img src={contact.user.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-primary font-bold" style={{ fontSize: size * 0.34 }}>
            {contact.user.firstName[0]}{contact.user.lastName[0]}
          </span>
        )}
      </div>
      <span
        className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background ${online ? "bg-green-500" : "bg-gray-500"}`}
        style={{ width: size * 0.3, height: size * 0.3 }}
      />
    </div>
  );
}

function SessionShell({ title, subtitle, onExit, children, headerExtra }: {
  title: ReactNode; subtitle: ReactNode;
  onExit: () => void; children: ReactNode; headerExtra?: ReactNode;
}) {
  const abandon = () => {
    if (window.confirm("Abandonner la partie pour tout le monde ?")) onExit();
  };
  return (
    <ProtectedRoute>
      <div className="grain flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
        <div className="shrink-0 bg-background/80 backdrop-blur-xl border-b border-white/10 px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
          <button onClick={abandon} title="Abandonner la partie" className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm truncate">{title}</h1>
            <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
          </div>
          {headerExtra}
          <button
            onClick={abandon}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-[11px] font-semibold hover:bg-red-500/25 transition-colors"
          >
            <DoorOpen className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Abandonner</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4">
          <div className="w-full max-w-3xl mx-auto">{children}</div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function Countdown({ seconds, total, icon: Icon }: { seconds: number | null; total?: number; icon: ElementType }) {
  if (seconds === null) return null;
  const pct = total ? Math.max(0, Math.min(100, (seconds / total) * 100)) : null;
  const urgent = seconds <= 5;
  return (
    <div className="flex items-center justify-center gap-2 mb-3">
      <Icon className={`h-4 w-4 ${urgent ? "text-red-400 animate-pulse" : "text-muted-foreground"}`} />
      <span className={`text-sm font-semibold ${urgent ? "text-red-400" : "text-muted-foreground"}`}>{seconds}s</span>
      {pct !== null && (
        <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${urgent ? "bg-red-400" : "bg-primary"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function WaitingLobby({ game, me, nameOf, minLabel, onStart, onlineUsers }: {
  game: AnyGame; me: string; nameOf: (id: string) => string;
  minLabel: string; onStart: () => void; onlineUsers: Set<string>;
}) {
  const isCreator = game.createdBy === me;
  const mode = GAME_MODES.find((m) =>
    (game.type === "quiz" && m.id === "quiz") ||
    (game.type === "buzzer_quiz" && m.id === "buzzer_quiz") ||
    (game.type === "infiltrated" && m.id === "infiltrated") ||
    (game.type === "mot_intrus_multi" && m.id === "mot_intrus_multi")
  );
  const canStart = game.players.length >= (mode?.minPlayers || 2);
  return (
    <div className="text-center py-8 max-w-md mx-auto">
      <Users className="h-12 w-12 mx-auto mb-3 text-primary/40" />
      <p className="font-medium mb-1">{game.players.length} joueur(s) dans le salon</p>
      <p className="text-xs text-muted-foreground mb-4">
        {canStart ? "Tout le monde est prêt !" : minLabel}
      </p>
      <div className="space-y-1.5 mb-6 text-left max-w-xs mx-auto">
        {game.players.map((pId) => (
          <div key={pId} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <span className={`w-2 h-2 rounded-full ${onlineUsers.has(pId) ? "bg-green-500" : "bg-gray-500"}`} />
            <span className="text-sm">{nameOf(pId)}</span>
            {pId === game.createdBy && <Crown className="h-3.5 w-3.5 text-yellow-400 ml-auto" />}
          </div>
        ))}
      </div>
      {isCreator ? (
        <button
          onClick={onStart}
          disabled={!canStart}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <Play className="h-5 w-5" /> Commencer la partie
        </button>
      ) : (
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Hourglass className="h-4 w-4" /> En attente que l'hôte lance la partie…
        </p>
      )}
    </div>
  );
}

function ScoreStrip({ game, players, nameOf }: { game: BuzzerGame | MotIntrusGame | QuizGame; players: string[]; nameOf: (id: string) => string }) {
  const scores = game.scores || {};
  return (
    <div className="shrink-0 px-4 py-3 border-b border-white/10">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {players.map((pId) => (
          <div key={pId} className={`flex-shrink-0 px-3 py-2 rounded-xl text-center min-w-[84px] border ${
            (game as any).currentBuzz === pId || (game as any).roundWinner === pId ? "bg-primary/20 border-primary/40" : "bg-white/5 border-transparent"
          }`}>
            <p className="text-[10px] text-muted-foreground truncate max-w-[76px]">{nameOf(pId)}</p>
            <p className="text-lg font-bold">{scores[pId] ?? 0}</p>
            {"correctCount" in game ? (
              <p className="text-[9px] text-muted-foreground">{game.correctCount[pId] ?? 0} bonnes</p>
            ) : (
              <p className="text-[9px] text-muted-foreground">{game.roundWins[pId] ?? 0} rounds</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FinishedScreen({ game, players, nameOf, onRematch, onExit, statLabel }: {
  game: BuzzerGame | MotIntrusGame | QuizGame; players: string[]; nameOf: (id: string) => string;
  onRematch: () => void; onExit: () => void; statLabel: string;
}) {
  return (
    <div className="text-center py-8 max-w-md mx-auto">
      <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
      <h2 className="text-2xl font-bold mb-1">
        {game.winner === "draw" ? "Match nul !" : `${nameOf(game.winner || "")} gagne !`}
      </h2>
      <div className="flex flex-wrap justify-center gap-3 mb-6 mt-4">
        {players.map((pId) => (
          <div key={pId} className={`text-center px-4 py-3 rounded-xl border ${game.winner === pId ? "bg-yellow-500/20 border-yellow-500/40" : "bg-white/5 border-transparent"}`}>
            <p className="text-xs text-muted-foreground">{nameOf(pId)}</p>
            <p className="text-2xl font-bold">{game.scores[pId] ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">{statLabel}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-center">
        <button onClick={onRematch} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">Revanche</button>
        <button onClick={onExit} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 font-semibold hover:bg-white/10 transition-colors">Quitter</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SESSION — QUIZ BUZZER
// ═══════════════════════════════════════════════════════════════
function BuzzerSession({ game, socketRef, me, nameOf, exitGame }: {
  game: BuzzerGame; socketRef: RefObject<Socket | null>; me: string;
  nameOf: (id: string) => string; exitGame: () => void;
}) {
  const now = useNow();
  const secondsLeft = (deadline: number | null) => deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;

  const difficultyStyle = (d: string) =>
    ({ facile: "text-green-400 bg-green-500/20", moyen: "text-yellow-400 bg-yellow-500/20", difficile: "text-orange-400 bg-orange-500/20", tres_difficile: "text-red-400 bg-red-500/20" } as any)[d] || "text-gray-400 bg-gray-500/20";
  const difficultyLabel = (d: string) =>
    ({ facile: "Facile", moyen: "Moyen", difficile: "Difficile", tres_difficile: "Très difficile" } as any)[d] || d;

  return (
    <SessionShell
      title={<span className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4 text-yellow-400" /> Quiz Buzzer</span>}
      subtitle={
        game.state === "waiting" ? "Salon en attente" :
        game.state === "playing" ? `Question ${game.questionIndex + 1} / ${game.totalQuestions}` :
        "Partie terminée"
      }
      onExit={exitGame}
      headerExtra={game.quizStatus === "generating" ? (
        <div className="flex items-center gap-2 text-xs text-primary"><Loader2 className="h-4 w-4 animate-spin" /> Génération…</div>
      ) : undefined}
    >
      {game.state !== "waiting" && <ScoreStrip game={game} players={game.players} nameOf={nameOf} />}
      <div className="pt-4">
        {game.state === "waiting" && (
          <WaitingLobby
            game={game} me={me} nameOf={nameOf}
            minLabel="Il faut au moins 2 joueurs pour lancer."
            onStart={() => socketRef.current?.emit("buzzer-start", { gameId: game.id })}
            onlineUsers={new Set()}
          />
        )}

        {game.state === "playing" && game.currentQuestion && (
          <div className="max-w-lg mx-auto">
            <div className="flex justify-center mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyStyle(game.currentQuestion.difficulty)}`}>
                {difficultyLabel(game.currentQuestion.difficulty)} · +{game.currentQuestion.points} pts
              </span>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/10">
              <p className="text-center text-lg font-medium leading-relaxed">{game.currentQuestion.question}</p>
            </div>

            {game.pstate === "buzzing" && (
              <button
                onClick={() => socketRef.current?.emit("buzzer-buzz", { gameId: game.id })}
                className="w-full py-6 rounded-2xl bg-red-500 text-white text-xl font-bold hover:bg-red-600 active:scale-95 transition-all animate-pulse flex items-center justify-center gap-2"
              >
                <Zap className="h-7 w-7" /> BUZZER !
              </button>
            )}

            {game.pstate === "waiting_answer" && (
              <div className="text-center py-6 bg-white/5 rounded-2xl border border-white/10">
                <Hourglass className="h-8 w-8 mx-auto mb-2 text-yellow-400 animate-pulse" />
                <p className="text-sm text-muted-foreground">
                  {game.currentBuzz ? `${nameOf(game.currentBuzz)} a buzzé en premier` : "En attente de la réponse…"}
                </p>
              </div>
            )}

            {game.pstate === "answering" && (
              <div className="space-y-3">
                <p className="text-center text-sm text-primary font-medium">À toi de répondre !</p>
                <Countdown seconds={secondsLeft(game.deadline)} total={10} icon={Clock} />
                <div className="grid grid-cols-2 gap-3">
                  {game.currentQuestion.answers.map((answer, i) => (
                    <button key={i} onClick={() => socketRef.current?.emit("buzzer-answer", { gameId: game.id, answerIndex: i })}
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
                <div className="flex items-center gap-2 mb-1.5">
                  {game.lastQuestionResult.correct ? <Check className="h-5 w-5 text-green-400" /> : <X className="h-5 w-5 text-red-400" />}
                  <span className="font-medium text-sm">
                    {game.lastQuestionResult.nobodyBuzzed ? "Personne n'a buzzé" :
                     game.lastQuestionResult.timedOut ? "Temps écoulé" :
                     game.lastQuestionResult.correct ? `${nameOf(game.lastQuestionResult.buzzedBy)} marque +${game.lastQuestionResult.points} pts` :
                     `${nameOf(game.lastQuestionResult.buzzedBy)} s'est trompé`}
                  </span>
                </div>
                {!game.lastQuestionResult.correct && game.currentQuestion && (
                  <p className="text-xs text-muted-foreground">
                    Bonne réponse : {game.currentQuestion.answers[game.lastQuestionResult.correctIndex] ?? "?"}
                  </p>
                )}
              </div>
            )}

            {game.pstate === "done" && (
              <div className="text-center py-6 bg-white/5 rounded-2xl border border-white/10">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                <p className="text-sm text-muted-foreground">En attente de la suite…</p>
              </div>
            )}
          </div>
        )}

        {game.state === "finished" && (
          <FinishedScreen
            game={game} players={game.players} nameOf={nameOf}
            onRematch={() => socketRef.current?.emit("game-rematch", { gameId: game.id })}
            onExit={exitGame}
            statLabel={`${game.winner ? game.correctCount[game.winner] ?? 0 : 0} bonnes réponses`}
          />
        )}
      </div>
    </SessionShell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SESSION — L'INFILTRÉ
// ═══════════════════════════════════════════════════════════════
function InfiltratedSession({ game, socketRef, me, nameOf, exitGame }: {
  game: InfiltratedGame; socketRef: RefObject<Socket | null>; me: string;
  nameOf: (id: string) => string; exitGame: () => void;
}) {
  const now = useNow();
  const secondsLeft = (deadline: number | null) => deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;

  const [myRole, setMyRole] = useState<{ role: string; roleName: string; icon: string; objective: string; team: string } | null>(null);
  const [investigation, setInvestigation] = useState<{ target: string; isInfiltrated: boolean } | null>(null);
  const [chatMsgs, setChatMsgs] = useState<Array<{ from: string; text: string; at: number }>>([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const onRole = (data: any) => setMyRole(data);
    const onInvest = (data: any) => setInvestigation(data);
    const onChat = (data: { from: string; text: string; at: number }) => setChatMsgs((prev) => [...prev.slice(-60), data]);
    socket.on("infiltrated-role", onRole);
    socket.on("infiltrated-investigation", onInvest);
    socket.on("infiltrated-chat-message", onChat);
    return () => {
      socket.off("infiltrated-role", onRole);
      socket.off("infiltrated-investigation", onInvest);
      socket.off("infiltrated-chat-message", onChat);
    };
  }, [socketRef]);

  const alivePlayers = game.players.filter((p) => game.alive[p]);
  const MyRoleIcon = (myRole && ROLE_ICONS[myRole.role]) || User;

  const sendChat = () => {
    if (!chatInput.trim()) return;
    socketRef.current?.emit("infiltrated-chat", { gameId: game.id, text: chatInput.trim() });
    setChatInput("");
  };

  const emitMove = (move: string, targetId: string) =>
    socketRef.current?.emit("game-move", { gameId: game.id, move, targetId });

  return (
    <SessionShell
      title={<span className="inline-flex items-center gap-1.5"><VenetianMask className="h-4 w-4 text-red-400" /> L'Infiltré</span>}
      subtitle={
        game.state === "waiting" ? `Salon · ${game.players.length} joueurs` :
        game.state === "night" ? `Nuit ${game.day}` :
        game.state === "day" ? `Jour ${game.day} · Discussion` :
        game.state === "voting" ? `Jour ${game.day} · Vote en cours` :
        "Partie terminée"
      }
      onExit={exitGame}
      headerExtra={game.state !== "waiting" && game.state !== "finished" ? (
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" /> {alivePlayers.length}/{game.players.length} en vie
        </div>
      ) : undefined}
    >
      {/* Salon d'attente */}
      {game.state === "waiting" && (
        <WaitingLobby
          game={game} me={me} nameOf={nameOf}
          minLabel="Il faut au moins 4 joueurs pour lancer la partie."
          onStart={() => socketRef.current?.emit("infiltrated-start", { gameId: game.id })}
          onlineUsers={new Set()}
        />
      )}

      {/* Carte de rôle */}
      {myRole && game.state !== "waiting" && game.state !== "finished" && (
        <div className="max-w-md mx-auto mb-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${ROLE_COLORS[myRole.team] || "bg-white/10"}`}>
              <MyRoleIcon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{myRole.roleName}</p>
              <p className="text-[10px] text-muted-foreground leading-snug">{myRole.objective}</p>
            </div>
          </div>
          {investigation && myRole.role === "detective" && (
            <div className={`mt-2 rounded-xl px-3 py-2 text-xs border ${investigation.isInfiltrated ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-green-500/10 border-green-500/30 text-green-300"}`}>
              Enquête : {nameOf(investigation.target)} {investigation.isInfiltrated ? "EST un Infiltré" : "n'est PAS un Infiltré"}
            </div>
          )}
        </div>
      )}

      {/* Nuit : actions */}
      {game.state === "night" && game.phase === "night_action" && (
        <div className="max-w-md mx-auto">
          <Countdown seconds={secondsLeft(game.phaseDeadline)} total={30} icon={MoonStar} />
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><MoonStar className="h-4 w-4 text-blue-300" /> Le village s'endort…</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {myRole?.role === "infiltrated" ? "Choisis ta cible à éliminer." :
               myRole?.role === "detective" ? "Enquête sur un joueur." :
               myRole?.role === "guard" ? "Protège un joueur (toi inclus)." :
               "Tu n'as pas d'action cette nuit. Ferme les yeux…"}
            </p>
            {game.myAction && (
              <p className="text-xs text-green-400 mb-3 flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Choix enregistré — attends la fin de la nuit.</p>
            )}
            {!game.myAction && myRole && ["infiltrated", "detective", "guard"].includes(myRole.role) && (
              <div className="space-y-2">
                {(myRole.role === "guard" ? alivePlayers : alivePlayers.filter((p) => p !== me)).map((pId) => (
                  <button
                    key={pId}
                    onClick={() => emitMove(
                      myRole.role === "infiltrated" ? "night_eliminate" : myRole.role === "detective" ? "night_investigate" : "night_protect",
                      pId,
                    )}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-colors text-left text-sm"
                  >
                    {nameOf(pId)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Résultat de la nuit */}
      {game.phase === "night_result" && game.lastNightResult && (
        <div className="max-w-md mx-auto text-center py-6">
          <MoonStar className="h-10 w-10 mx-auto mb-3 text-blue-300" />
          {game.lastNightResult.eliminated ? (
            <>
              <p className="font-bold text-lg mb-1">{nameOf(game.lastNightResult.eliminated)} a disparu cette nuit…</p>
              {game.eliminated[game.eliminated.length - 1]?.roleName && (
                <p className="text-xs text-muted-foreground">Son rôle était : {game.eliminated[game.eliminated.length - 1]?.roleName}</p>
              )}
            </>
          ) : (
            <p className="font-bold text-lg">Personne n'est mort cette nuit — le Garde a protégé la cible !</p>
          )}
          {game.clues.length > 0 && (
            <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-left">
              <p className="text-[10px] font-semibold text-yellow-400 mb-1 flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" /> INDICE</p>
              <p className="text-sm">{game.clues[game.clues.length - 1]?.text}</p>
            </div>
          )}
        </div>
      )}

      {/* Jour : discussion avec chat */}
      {game.state === "day" && game.phase === "day_discussion" && (
        <div className="max-w-md mx-auto">
          <Countdown seconds={secondsLeft(game.phaseDeadline)} total={game.discussionTime} icon={SunMedium} />
          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2">
              <SunMedium className="h-4 w-4 text-yellow-400" />
              <h3 className="text-sm font-semibold">Discussion — débattez !</h3>
            </div>
            <div className="h-56 overflow-y-auto px-4 py-3 space-y-2">
              {chatMsgs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">Aucun message. Accuse quelqu'un, défends-toi…</p>
              )}
              {chatMsgs.map((m, i) => (
                <div key={i} className={`text-sm ${m.from === me ? "text-right" : ""}`}>
                  <span className="text-[10px] text-muted-foreground block">{nameOf(m.from)}</span>
                  <span className={`inline-block px-3 py-1.5 rounded-xl max-w-[85%] break-words ${m.from === me ? "bg-primary/20" : "bg-white/5 border border-white/10"}`}>
                    {m.text}
                  </span>
                </div>
              ))}
            </div>
            {game.alive[me] && (
              <div className="p-3 border-t border-white/10 flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Écris ton accusation…"
                  maxLength={300}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/40"
                />
                <button onClick={sendChat} className="px-3 rounded-xl bg-primary text-primary-foreground"><MessagesSquare className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Jour : vote */}
      {game.state === "voting" && game.phase === "day_vote" && (
        <div className="max-w-md mx-auto">
          <Countdown seconds={secondsLeft(game.phaseDeadline)} total={game.voteTime} icon={Gavel} />
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><Gavel className="h-4 w-4 text-orange-300" /> Vote pour éliminer un suspect</h3>
            <p className="text-xs text-muted-foreground mb-3">Majorité stricte requise — sinon personne ne part.</p>
            {game.votes.includes(me) ? (
              <p className="text-xs text-green-400 flex items-center gap-1.5 py-4 justify-center"><Check className="h-4 w-4" /> Vote enregistré — attends les autres.</p>
            ) : (
              <div className="space-y-2">
                {alivePlayers.filter((p) => p !== me).map((pId) => (
                  <button
                    key={pId}
                    onClick={() => emitMove("vote", pId)}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/40 transition-colors text-left text-sm flex items-center gap-2"
                  >
                    <VoteIcon className="h-4 w-4 text-muted-foreground" /> {nameOf(pId)}
                  </button>
                ))}
              </div>
            )}
            {game.votes.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-3">{game.votes.length}/{alivePlayers.length} vote(s) déposé(s)</p>
            )}
          </div>
        </div>
      )}

      {/* Résultat du vote */}
      {game.phase === "vote_result" && game.lastVoteResult && (
        <div className="max-w-md mx-auto text-center py-6">
          <Gavel className="h-10 w-10 mx-auto mb-3 text-orange-300" />
          {game.lastVoteResult.eliminated ? (
            <>
              <p className="font-bold text-lg mb-1">Le village a éliminé {nameOf(game.lastVoteResult.eliminated)}</p>
              {(() => {
                const e = game.eliminated[game.eliminated.length - 1];
                if (!e?.roleName) return null;
                const IconComp = ROLE_ICONS[e.role || "citizen"] || User;
                return (
                  <div className="inline-flex items-center gap-2 mt-1 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <IconComp className="h-4 w-4" />
                    <span className="text-xs">C'était : {e.roleName}</span>
                  </div>
                );
              })()}
            </>
          ) : (
            <p className="font-bold text-lg">
              {game.lastVoteResult.tie ? "Égalité — personne n'est éliminé." : "Pas de majorité — personne n'est éliminé."}
            </p>
          )}
          <div className="mt-4 space-y-1 max-w-xs mx-auto">
            {Object.entries(game.lastVoteResult.tally || {}).sort(([, a], [, b]) => b - a).map(([pId, count]) => (
              <div key={pId} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/5 text-xs">
                <span>{nameOf(pId)}</span><span className="font-bold">{count} vote(s)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fin de partie */}
      {game.state === "finished" && (
        <div className="max-w-md mx-auto text-center py-6">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-2xl font-bold mb-1">
            {game.winner === "village" ? "Victoire du Village !" :
             game.winner === "infiltrated" ? "Victoire des Infiltrés !" :
             game.winner === "impostor" ? "Victoire de l'Imposteur !" :
             game.winner === "disconnect" ? "Partie interrompue" : "Partie terminée"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">{game.winReason}</p>

          {/* Révélation des rôles */}
          <div className="space-y-1.5 mb-6 text-left">
            {game.players.map((pId) => {
              const roleKey = game.playerRoles[pId];
              const legend = game.rolesLegend.find((r) => r.key === roleKey);
              const IconComp = ROLE_ICONS[roleKey || "citizen"] || User;
              return (
                <div key={pId} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ROLE_COLORS[legend?.team || "village"] || "bg-white/10"}`}>
                    <IconComp className="h-4 w-4" />
                  </div>
                  <span className="text-sm flex-1">{nameOf(pId)}</span>
                  {!game.alive[pId] && <Skull className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-xs text-muted-foreground">{legend?.name || roleKey}</span>
                </div>
              );
            })}
          </div>

          <button onClick={exitGame} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" /> Retour aux jeux
          </button>
        </div>
      )}
    </SessionShell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SESSION — MOT INTRUS MULTI
// ═══════════════════════════════════════════════════════════════
function MotIntrusSession({ game, socketRef, me, nameOf, exitGame }: {
  game: MotIntrusGame; socketRef: RefObject<Socket | null>; me: string;
  nameOf: (id: string) => string; exitGame: () => void;
}) {
  const now = useNow();
  const secondsLeft = (deadline: number | null) => deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;

  const difficultyStyle = (d: string) =>
    ({ facile: "text-green-400 bg-green-500/20", moyen: "text-yellow-400 bg-yellow-500/20", difficile: "text-orange-400 bg-orange-500/20", expert: "text-red-400 bg-red-500/20" } as any)[d] || "text-gray-400 bg-gray-500/20";
  const difficultyLabel = (d: string) =>
    ({ facile: "Facile", moyen: "Moyen", difficile: "Difficile", expert: "Expert" } as any)[d] || d;

  const locked = game.pstate === "locked" && game.lockedUntil > now;
  const lockSeconds = locked ? Math.ceil((game.lockedUntil - now) / 1000) : 0;

  return (
    <SessionShell
      title={<span className="inline-flex items-center gap-1.5"><Search className="h-4 w-4 text-cyan-300" /> Mot Intrus</span>}
      subtitle={
        game.state === "waiting" ? "Salon en attente" :
        game.state === "playing" ? `Manche ${game.roundIndex + 1} / ${game.totalRounds}` :
        "Partie terminée"
      }
      onExit={exitGame}
    >
      {game.state !== "waiting" && <ScoreStrip game={game} players={game.players} nameOf={nameOf} />}
      <div className="pt-4">
        {game.state === "waiting" && (
          <WaitingLobby
            game={game} me={me} nameOf={nameOf}
            minLabel="Il faut au moins 2 joueurs pour lancer."
            onStart={() => socketRef.current?.emit("motintrusmulti-start", { gameId: game.id })}
            onlineUsers={new Set()}
          />
        )}

        {game.state === "playing" && game.currentRound && (
          <div className="max-w-lg mx-auto">
            <div className="flex justify-center mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyStyle(game.currentRound.difficulty)}`}>
                {difficultyLabel(game.currentRound.difficulty)} · +{game.currentRound.points} pts
              </span>
            </div>
            <p className="text-center text-sm text-muted-foreground mb-3">Trouve l'intrus le plus vite possible :</p>
            <Countdown seconds={secondsLeft(game.deadline)} total={20} icon={Clock} />

            {game.roundWinner ? (
              <div className="p-4 rounded-2xl border bg-green-500/10 border-green-500/30 text-center">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                <p className="font-medium text-sm">{nameOf(game.roundWinner)} a trouvé l'intrus !</p>
                <p className="text-xs text-muted-foreground mt-1">{game.lastRoundResult?.explanation}</p>
              </div>
            ) : game.lastRoundResult?.timedOut ? (
              <div className="p-4 rounded-2xl border bg-orange-500/10 border-orange-500/30 text-center">
                <Hourglass className="h-8 w-8 mx-auto mb-2 text-orange-300" />
                <p className="font-medium text-sm">Temps écoulé — personne n'a trouvé.</p>
                <p className="text-xs text-muted-foreground mt-1">{game.lastRoundResult.explanation}</p>
              </div>
            ) : (
              <>
                {locked && (
                  <p className="text-center text-xs text-red-300 mb-3 flex items-center justify-center gap-1.5">
                    <X className="h-3.5 w-3.5" /> Mauvaise réponse — réessaie dans {lockSeconds}s
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {game.currentRound.words.map((word, i) => (
                    <button
                      key={i}
                      onClick={() => socketRef.current?.emit("game-move", { gameId: game.id, move: "answer", answerIndex: i })}
                      disabled={locked}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed break-words"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {game.state === "finished" && (
          <FinishedScreen
            game={game} players={game.players} nameOf={nameOf}
            onRematch={() => socketRef.current?.emit("game-rematch", { gameId: game.id })}
            onExit={exitGame}
            statLabel={`${game.winner ? game.roundWins[game.winner] ?? 0 : 0} intrus trouvés`}
          />
        )}
      </div>
    </SessionShell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SESSION — QUIZ CULTURE (mêmes questions pour tous, chacun son rythme)
// ═══════════════════════════════════════════════════════════════
function QuizSession({ game, socketRef, me, nameOf, exitGame }: {
  game: QuizGame; socketRef: RefObject<Socket | null>; me: string;
  nameOf: (id: string) => string; exitGame: () => void;
}) {
  const now = useNow();
  const total = game.questions?.length || 20;
  const progress = game.progress || 0;
  const qIndex = game.order?.[progress];
  const question = qIndex !== undefined ? game.questions?.[qIndex] : undefined;
  const secondsLeft = game.deadline ? Math.max(0, Math.ceil((game.deadline - now) / 1000)) : null;

  const difficultyLabel = (d: string) => ({ facile: "Facile", moyen: "Moyen", difficile: "Difficile", tres_difficile: "Très difficile", expert: "Expert" } as any)[d] || d;
  const difficultyStyle = (d: string) => ({ facile: "text-green-400 bg-green-500/20", moyen: "text-yellow-400 bg-yellow-500/20", difficile: "text-orange-400 bg-orange-500/20", tres_difficile: "text-red-400 bg-red-500/20", expert: "text-pink-400 bg-pink-500/20" } as any)[d] || "text-gray-400 bg-gray-500/20";

  const answer = (i: number) => socketRef.current?.emit("game-move", { gameId: game.id, move: "answer", answerIndex: i });
  const next = () => socketRef.current?.emit("game-move", { gameId: game.id, move: "next" });

  return (
    <SessionShell
      title={<span className="inline-flex items-center gap-1.5"><Brain className="h-4 w-4 text-primary" /> Quiz Culture</span>}
      subtitle={
        game.state === "waiting" ? "Salon en attente" :
        game.quizStatus !== "ready" ? "Préparation des questions…" :
        game.pstate === "done" ? "Tu as terminé !" :
        `Question ${Math.min(progress + 1, total)} / ${total}`
      }
      onExit={exitGame}
      headerExtra={game.quizStatus !== "ready" && game.state === "playing" ? (
        <div className="flex items-center gap-2 text-xs text-primary shrink-0"><Loader2 className="h-4 w-4 animate-spin" /> <span className="hidden sm:inline">Génération…</span></div>
      ) : undefined}
    >
      {game.state !== "waiting" && <ScoreStrip game={game} players={game.players} nameOf={nameOf} />}
      <div className="pt-4">
        {game.state === "waiting" && (
          <WaitingLobby
            game={game} me={me} nameOf={nameOf}
            minLabel="Il faut au moins 2 joueurs pour lancer."
            onStart={() => socketRef.current?.emit("quiz-start", { gameId: game.id })}
            onlineUsers={new Set()}
          />
        )}

        {game.state === "playing" && game.quizStatus !== "ready" && (
          <div className="text-center py-10">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm text-muted-foreground">Préparation des questions…</p>
            <p className="text-[10px] text-muted-foreground mt-1">La partie démarre automatiquement</p>
          </div>
        )}

        {game.state === "playing" && game.quizStatus === "ready" && (
          <div className="max-w-xl mx-auto">
            {/* Progression de tous les joueurs */}
            <div className="mb-4 space-y-1">
              {game.players.map((pId) => {
                const isMe = pId === me;
                const opp = game.opponents?.find((o) => o.id === pId);
                const pr = isMe ? progress : (opp?.progress ?? 0);
                const pct = total ? Math.round((pr / total) * 100) : 0;
                return (
                  <div key={pId} className="flex items-center gap-2">
                    <span className={`text-[11px] w-20 sm:w-24 truncate ${isMe ? "font-semibold" : "text-muted-foreground"}`}>{isMe ? "Toi" : nameOf(pId)}</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-10 text-right shrink-0">{pr}/{total}</span>
                  </div>
                );
              })}
            </div>

            {game.pstate === "question" && question && (
              <>
                <Countdown seconds={secondsLeft} total={20} icon={Clock} />
                <div className="flex justify-center mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyStyle(question.difficulty)}`}>
                    {difficultyLabel(question.difficulty)} · +{question.points} pts
                  </span>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/10">
                  <p className="text-center text-base sm:text-lg font-medium leading-relaxed break-words">{question.question}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {question.answers.map((a, i) => (
                    <button key={i} onClick={() => answer(i)}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all text-left text-sm break-words">
                      <span className="text-xs font-bold text-primary mr-2">{String.fromCharCode(65 + i)}.</span>{a}
                    </button>
                  ))}
                </div>
              </>
            )}

            {game.pstate === "feedback" && game.lastResult && (
              <div className={`p-4 rounded-2xl border text-center ${game.lastResult.correct ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  {game.lastResult.correct ? <Check className="h-5 w-5 text-green-400" /> : <X className="h-5 w-5 text-red-400" />}
                  <span className="font-medium text-sm">
                    {game.lastResult.correct ? `Bonne réponse ! +${game.lastResult.points} pts` : game.lastResult.timedOut ? "Temps écoulé" : "Mauvaise réponse"}
                  </span>
                </div>
                {!game.lastResult.correct && question && (
                  <p className="text-xs text-muted-foreground break-words">Bonne réponse : {question.answers[game.lastResult.correctIndex] ?? "?"}</p>
                )}
                <button onClick={next} className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Question suivante</button>
              </div>
            )}

            {game.pstate === "done" && (
              <div className="text-center py-10">
                <Trophy className="h-10 w-10 mx-auto mb-3 text-yellow-400" />
                <p className="font-semibold">Tu as terminé tes {total} questions !</p>
                <p className="text-xs text-muted-foreground mt-1">En attente des autres joueurs…</p>
              </div>
            )}
          </div>
        )}

        {game.state === "finished" && (
          <FinishedScreen
            game={game} players={game.players} nameOf={nameOf}
            onRematch={() => socketRef.current?.emit("game-rematch", { gameId: game.id })}
            onExit={exitGame}
            statLabel="points"
          />
        )}
      </div>
    </SessionShell>
  );
}

// ── Catalogue des modes multijoueur ────────────────────────────
const GAME_MODES: GameMode[] = [
  {
    id: "infiltrated", name: "L'Infiltré", icon: VenetianMask,
    description: "Déduction et bluff — démasque les traîtres",
    minPlayers: 4, maxPlayers: 12, category: "Social",
  },
  {
    id: "quiz", name: "Quiz Culture", icon: Brain,
    description: "Les mêmes questions pour tous, chacun à son rythme",
    minPlayers: 2, maxPlayers: 8, category: "Culture",
  },
  {
    id: "mot_intrus_multi", name: "Mot Intrus", icon: Puzzle,
    description: "Course contre la montre — trouve l'intrus",
    minPlayers: 2, maxPlayers: 6, category: "Logique",
  },
];

// ── Règles affichées avant chaque partie ───────────────────────
const GAME_RULES: Record<string, { rules: string[]; tips: string[] }> = {
  infiltrated: {
    rules: [
      "4 à 12 joueurs. Chacun reçoit un rôle secret : Citoyen, Infiltré, Détective, Garde ou Imposteur.",
      "La nuit : l'Infiltré élimine un joueur, le Détective enquête, le Garde protège quelqu'un.",
      "Le jour : tout le monde discute (2 min) puis vote pour éliminer un suspect.",
      "Un suspect n'est éliminé qu'avec une majorité stricte des votes.",
      "Un indice public est révélé à chaque fin de nuit.",
      "Le Village gagne en éliminant tous les Infiltrés. Les Infiltrés gagnent en devenant majoritaires.",
      "L'Imposteur gagne si le Détective est éliminé.",
    ],
    tips: [
      "Observe les votes et les justifications de chacun.",
      "Si tu es Infiltré, mêle-toi à la foule et accuse prudemment.",
      "Si tu es Détective, garde ta découverte pour le bon moment.",
    ],
  },
  quiz: {
    rules: [
      "2 à 8 joueurs. Tout le monde reçoit EXACTEMENT les mêmes questions, mais dans un ordre différent pour chacun.",
      "Chacun joue à son rythme : aucune course, ta connexion ne te désavantage pas.",
      "4 réponses possibles par question, 20 secondes pour répondre.",
      "Points : Facile +100, Moyen +200, Difficile +300, Très difficile +500.",
      "20 questions au total, de facile à très difficile. Le meilleur score gagne.",
      "Tu peux abandonner à tout moment : la partie s'arrête alors pour tout le monde.",
    ],
    tips: [
      "Prends ton temps : répondre juste rapporte plus qu'aller vite.",
      "Les questions difficiles valent beaucoup plus de points.",
    ],
  },
  mot_intrus_multi: {
    rules: [
      "2 à 6 joueurs. 5 mots s'affichent, un seul ne va pas avec les autres.",
      "Le premier à cliquer sur le bon intrus marque les points de la manche.",
      "Une mauvaise réponse te bloque 2 secondes — la fenêtre est grande ouverte pour les autres !",
      "8 manches, difficulté croissante. Le meilleur score gagne.",
    ],
    tips: [
      "Cherche la catégorie commune : pays, animaux, couleurs…",
      "Les manches expertes contiennent des pièges sémantiques.",
    ],
  },
};
