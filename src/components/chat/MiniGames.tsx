import { useState, useEffect, useRef } from "react";

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const RPS_EMOJI: Record<string, string> = { rock: "✊", paper: "✋", scissors: "✌️" };

export type GameType = "reflex" | "tictactoe" | "rps" | "dice" | "quiz" | "code_secret" | "mot_intrus" | "devine_ce_que_je_pense" | "a_quel_point" | "deux_verites" | "memoire_flash" | "action_verite";

export interface QuizQuestion {
  id: string;
  question: string;
  answers: string[];
  difficulty: string;
  points: number;
}

export interface QuizLastResult {
  qIndex: number;
  answerIndex: number;
  correct: boolean;
  points: number;
  timedOut?: boolean;
  correctIndex: number;
}

export interface GameState {
  id: string;
  type: GameType;
  players: string[];
  scores: Record<string, number>;
  currentRound: number;
  maxRounds: number;
  state: "waiting" | "playing" | "finished";
  winner?: string | "draw" | "declined" | "disconnect";
  createdBy?: string;
  phase?: string;
  signalTime?: number | null;
  reactionTimes?: Record<string, number>;
  roundWinner?: string;
  board?: (string | null)[];
  currentTurn?: string;
  marks?: Record<string, string>;
  isDraw?: boolean;
  winLine?: number[];
  choices?: Record<string, string>;
  dice?: Record<string, number[]>;
  total?: Record<string, number>;
  quizStatus?: "generating" | "ready" | "error";
  quizError?: string | null;
  questions?: QuizQuestion[];
  order?: number[];
  progress?: number;
  pstate?: "idle" | "question" | "feedback" | "done";
  deadline?: number | null;
  lastResult?: any;
  // Mémoire Flash
  level?: { len: number; points: number; label: string } | null;
  sequence?: string[];
  input?: string[];
  // Action ou Vérité (flux joueur : choix → rédaction → réponse)
  avStatus?: "generating" | "ready";
  isMyTurn?: boolean;
  asker?: string | null;
  answerer?: string | null;
  amAsker?: boolean;
  amAnswerer?: boolean;
  choice?: "verite" | "action" | null;
  prompt?: string | null;
  answer?: string | null;
  actionDone?: boolean | null;
  veritePoints?: number;
  actionPoints?: number;
  currentCard?: { kind: "verite" | "action"; text: string } | null;
  verdict?: { by: string; accepted: boolean } | null;
  skipsLeft?: number;
  canJudge?: boolean;
  canSkip?: boolean;
  // A quel point
  canSet?: boolean;
  canGuess?: boolean;
  filledCount?: number;
  guessedCount?: number;
  settingIndex?: number;
  settingPlayer?: string | null;
  guessingPlayer?: string | null;
  compatibility?: number;
  compatibilityMessage?: string | null;
  // Code Secret (nouveau protocole)
  round?: number;
  myRole?: "creator" | "guesser" | "spectator";
  colors?: string[];
  codeLength?: number;
  maxAttempts?: number;
  myCode?: string[];
  results?: Record<string, { solved: boolean; attempts: number }>;
  attemptsBy?: Record<string, Array<{ guess: string[]; result: Array<{ color: string; status: string }> }>>;
  // Quiz multijoueur
  opponents?: Array<{ id: string; progress: number; score: number }>;
  // Champs utilisés par les jeux historiques
  currentPlayer?: string;
  currentQuestion?: any;
  attempts?: Array<{ guess: string[]; result: Array<{ color: string; status: string }> }>;
  codeCreator?: string;
  currentGuesser?: string;
  thinker?: string;
  guesser?: string;
  secretItem?: string;
  lastAnswer?: any;
  questionCount?: number;
  maxQuestions?: number;
  statements?: Record<string, string[]>;
  category?: any; // catégorie de jeu (objet pour les jeux historiques)
  // Deux Vérités, Un Mensonge (envoyé par le backend au rédacteur)
  currentStatements?: string[];
  correctCount?: Record<string, number>;
  opponent?: { progress: number };
}

export interface GamePlayer {
  _id: string;
  firstName: string;
  lastName: string;
}

function PlayerName({ id, players }: { id: string; players: Record<string, GamePlayer> }) {
  const p = players[id];
  return <>{p ? p.firstName : "Joueur"}</>;
}

// ══════════════════════════════════════
// GAME MENU POPUP
// ══════════════════════════════════════
import * as LucideIcons from "lucide-react";

const iconMap: Record<string, any> = {
  Brain: LucideIcons.Brain,
  Zap: LucideIcons.Zap,
  Lock: LucideIcons.Lock,
  Search: LucideIcons.Search,
  Lightbulb: LucideIcons.Lightbulb,
  Heart: LucideIcons.Heart,
  Mask: LucideIcons.UserX,
  Hand: LucideIcons.Hand,
  Dice1: LucideIcons.Dice1,
  Grid3X3: LucideIcons.Grid3X3,
  Target: LucideIcons.Target,
  MemoryStick: LucideIcons.MemoryStick,
  Drama: LucideIcons.Drama,
};

const GAME_RULES: Record<GameType, { title: string; rules: string[]; tips: string[] }> = {
  reflex: {
    title: "Le Reflexe",
    rules: [
      "Attendez le signal vert",
      "Le premier a cliquer gagne la manche",
      "3 manches au total",
      "Attention au faux depart !",
    ],
    tips: ["Ne cliquez pas trop tot", "Concentrez-vous sur l'ecran"],
  },
  dice: {
    title: "Duel de Des",
    rules: [
      "Chaque joueur lance 2 des",
      "Le total le plus haut gagne la manche",
      "3 manches au total",
    ],
    tips: ["C'est du hasard pur !"],
  },
  rps: {
    title: "Pierre-Feuille-Ciseaux",
    rules: [
      "Pierre bat Ciseaux",
      "Ciseaux bat Papier",
      "Papier bat Pierre",
      "5 manches au total",
    ],
    tips: ["Observez les habitudes de votre adversaire"],
  },
  tictactoe: {
    title: "Morpion",
    rules: [
      "Alignez 3 symboles (X ou O)",
      "Horizontalement, verticalement ou en diagonale",
      "3 manches au total",
    ],
    tips: ["Évitez les coins au début"],
  },
  quiz: {
    title: "Quiz Culture",
    rules: [
      "20 questions de culture generale",
      "4 reponses possibles par question",
      "20 secondes par question",
      "Points : Facile +100, Moyen +200, Difficile +300, Expert +500",
      "Celui qui a le plus de points gagne",
    ],
    tips: ["Reflechissez vite mais ne vous precipitez pas"],
  },
  code_secret: {
    title: "Le Code Secret",
    rules: [
      "Celui qui lance la partie compose un code de 4 couleurs",
      "L'autre doit deviner ce code en 6 tentatives",
      "Vert = bonne couleur, bonne position",
      "Orange = bonne couleur, mauvaise position",
      "On inverse les roles, puis celui qui a devine en le moins d'essais gagne",
    ],
    tips: ["Eliminez les couleurs une par une a chaque essai"],
  },
  mot_intrus: {
    title: "Le Mot Intrus",
    rules: [
      "5 mots sont affiches",
      "4 appartiennent a la meme categorie",
      "Trouvez l'intrus !",
      "5 manches, difficulte croissante",
    ],
    tips: ["Pensez a la categorie generale"],
  },
  memoire_flash: {
    title: "Memoire Flash",
    rules: [
      "Une sequence de couleurs s'affiche brievement",
      "Reproduisez-la de memoire dans le bon ordre",
      "La difficulte augmente a chaque manche",
      "3 couleurs au debut, jusqu'a 7 en fin de partie",
    ],
    tips: ["Associez les couleurs a des images"],
  },
  devine_ce_que_je_pense: {
    title: "Devine ce que je pense",
    rules: [
      "Un joueur choisit un mot secret",
      "L'autre pose des questions Oui/Non",
      "Apres chaque reponse, vous pouvez proposer",
      "On inverse les roles apres",
    ],
    tips: ["Posez des questions precises"],
  },
  a_quel_point: {
    title: "A quel point tu me connais ?",
    rules: [
      "Phase 1 : Vous remplissez vos vraies preferences",
      "Phase 2 : Votre ami devine vos reponses",
      "On inverse les roles",
      "Score + pourcentage de compatibilite",
    ],
    tips: ["Soyez honnete dans vos reponses !"],
  },
  deux_verites: {
    title: "Une Verite, Deux Mensonges",
    rules: [
      "Ecrivez 3 affirmations : 1 seule est VRAIE, 2 sont fausses",
      "L'autre doit trouver l'unique verite",
      "On inverse les roles",
      "Celui qui trouve le plus de verites gagne",
    ],
    tips: ["Rendez les mensonges credibles pour brouiller les pistes !"],
  },
  action_verite: {
    title: "Action ou Verite",
    rules: [
      "A chaque tour, un joueur choisit : Action ou Verite",
      "L'autre ecrit alors la question (Verite) ou le defi (Action)",
      "Verite : tu ecris ta reponse, qui repart chez l'autre",
      "Action : tu declares « je l'ai faite » ou « je refuse »",
      "Verite repondue +100 pts, Action faite +200 pts",
      "Les questions sont ecrites par vous, jamais predefinies",
    ],
    tips: ["Posez des questions personnelles, c'est plus drole !"],
  },
};

export function GameMenu({ onSelect, onClose }: { onSelect: (type: GameType) => void; onClose: () => void }) {
  const [selectedType, setSelectedType] = useState<GameType | null>(null);
  const games: { type: GameType; icon: string; name: string; desc: string; category: string }[] = [
    // Jeux de reflexes / hasard
    { type: "rps", icon: "Hand", name: "Pierre-Feuille-Ciseaux", desc: "Le classique", category: "Reflexes" },
    // Jeux de logique
    { type: "tictactoe", icon: "Grid3X3", name: "Morpion", desc: "Aligne 3 symboles", category: "Logique" },
    { type: "quiz", icon: "Brain", name: "Quiz Culture", desc: "20 questions de culture generale", category: "Culture" },
    { type: "code_secret", icon: "Lock", name: "Le Code Secret", desc: "Devinez le code en 4 symboles", category: "Logique" },
    { type: "mot_intrus", icon: "Search", name: "Le Mot Intrus", desc: "Trouvez le mot different", category: "Logique" },
    { type: "memoire_flash", icon: "MemoryStick", name: "Memoire Flash", desc: "Reproduisez la sequence de couleurs", category: "Reflexes" },
    // Jeux sociaux
    { type: "devine_ce_que_je_pense", icon: "Lightbulb", name: "Devine ce que je pense", desc: "Questions Oui/Non pour deviner", category: "Social" },
    { type: "a_quel_point", icon: "Heart", name: "A quel point tu me connais ?", desc: "Test de compatibilite", category: "Social" },
    { type: "deux_verites", icon: "Mask", name: "Une Verite, Deux Mensonges", desc: "Trouvez l'unique verite", category: "Bluff" },
    { type: "action_verite", icon: "Drama", name: "Action ou Verite", desc: "Questions ecrites par vous", category: "Social" },
  ];

  const categories = [...new Set(games.map(g => g.category))];

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="font-bold text-sm">Jouer</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <LucideIcons.X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-2 overflow-y-auto max-h-[calc(80vh-60px)]">
          {categories.map(cat => (
            <div key={cat} className="mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase px-3 py-1">{cat}</p>
              {games.filter(g => g.category === cat).map(g => {
                const IconComp = iconMap[g.icon] || LucideIcons.Gamepad2;
                return (
                  <button key={g.type} onClick={() => setSelectedType(g.type)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <IconComp className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">{g.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RULES CARD ═══ */}
      {selectedType && (
        <div className="fixed inset-0 z-[260] bg-black/70 flex items-center justify-center p-4" onClick={() => setSelectedType(null)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="font-bold text-sm">{GAME_RULES[selectedType]?.title || selectedType}</span>
              <button onClick={() => setSelectedType(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <LucideIcons.X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
              <p className="text-xs font-semibold text-primary mb-3">Comment jouer</p>
              <ol className="space-y-2 mb-4">
                {(GAME_RULES[selectedType]?.rules || []).map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ol>
              {(GAME_RULES[selectedType]?.tips || []).length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-medium text-primary mb-1">Conseils</p>
                  {(GAME_RULES[selectedType]?.tips || []).map((tip, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">- {tip}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => { onSelect(selectedType); onClose(); }}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <LucideIcons.Gamepad2 className="h-5 w-5" />
                Lancer la partie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// GAME INVITE CARD
// ══════════════════════════════════════
const GAME_NAMES: Record<GameType, string> = {
  reflex: "Le Reflexe",
  tictactoe: "Morpion",
  rps: "Pierre-Feuille-Ciseaux",
  dice: "Duel de Des",
  quiz: "Quiz Culture",
  code_secret: "Le Code Secret",
  mot_intrus: "Le Mot Intrus",
  devine_ce_que_je_pense: "Devine ce que je pense",
  a_quel_point: "A quel point tu me connais ?",
  deux_verites: "Une Verite, Deux Mensonges",
  memoire_flash: "Memoire Flash",
  action_verite: "Action ou Verite",
};

export function GameInviteCard({
  game, currentUserId, onAccept, onDecline,
}: {
  game: GameState; currentUserId: string;
  onAccept: () => void; onDecline: () => void;
}) {
  const isFromMe = game.createdBy === currentUserId;
  return (
    <div className="fixed inset-0 z-[250] bg-black/60 flex items-center justify-center p-4" onClick={onDecline}>
      <div className={`rounded-2xl border p-6 text-center max-w-[280px] w-full ${isFromMe ? "bg-[#111] border-primary/30" : "bg-[#111] border-white/10"}`}
        onClick={e => e.stopPropagation()}>
        <p className="text-2xl mb-2">🎮</p>
        <p className="text-sm font-bold mb-1">{GAME_NAMES[game.type]}</p>
        {game.type === "quiz" && (
          <p className="text-[10px] text-muted-foreground mb-1">20 questions · 4 réponses · questions IA 🧠</p>
        )}
        <p className="text-[11px] text-muted-foreground mb-4">
          {isFromMe ? "En attente de réponse..." : "Tu as été défié !"}
        </p>
        {!isFromMe && game.state === "waiting" && (
          <div className="flex gap-2 justify-center">
            <button onClick={onAccept} className="px-5 py-2 rounded-full bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors">
              Accepter
            </button>
            <button onClick={onDecline} className="px-5 py-2 rounded-full bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors">
              Refuser
            </button>
          </div>
        )}
        {isFromMe && game.state === "waiting" && (
          <button onClick={onDecline} className="px-5 py-2 rounded-full bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors">
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// REFLEX GAME
// ══════════════════════════════════════
function ReflexGame({
  game, currentUserId, players, onMove, onClose,
}: {
  game: GameState; currentUserId: string;
  players: Record<string, GamePlayer>;
  onMove: (move: string) => void; onClose: () => void;
}) {
  const p1 = game.players[0], p2 = game.players[1];

  if (game.state === "finished") {
    const winnerName = game.winner === "draw" ? null : game.winner === "declined" ? null : game.winner === "disconnect" ? null : game.winner;
    return (
      <div className="mx-auto max-w-[300px] text-center">
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm">✕</button>
        <p className="text-lg mb-3">🏆 FIN DU DUEL</p>
        <div className="flex justify-around mb-4">
          <div className={game.winner === p1 ? "text-primary" : ""}>
            <p className="text-xs text-muted-foreground"><PlayerName id={p1} players={players} /></p>
            <p className="text-3xl font-bold">{game.scores[p1]}</p>
          </div>
          <div className="text-muted-foreground self-center text-lg">—</div>
          <div className={game.winner === p2 ? "text-primary" : ""}>
            <p className="text-xs text-muted-foreground"><PlayerName id={p2} players={players} /></p>
            <p className="text-3xl font-bold">{game.scores[p2]}</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-primary">
          {game.winner === "draw" ? "Match nul !" :
           game.winner === "declined" ? "Défi refusé" :
           game.winner === "disconnect" ? "Déconnexion" :
           `${winnerName === currentUserId ? "Tu" : <PlayerName id={winnerName!} players={players} />} gagnes !`}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[300px] text-center relative">
      <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
      <p className="text-sm font-bold mb-1">⚡ DUEL DE RÉFLEXE</p>
      <p className="text-[11px] text-muted-foreground mb-3">Manche {game.currentRound}/{game.maxRounds}</p>

      <div className="flex justify-around mb-4">
        <div className={game.scores[p1] > game.scores[p2] ? "text-primary" : ""}>
          <p className="text-[11px] text-muted-foreground"><PlayerName id={p1} players={players} /></p>
          <p className="text-2xl font-bold">{game.scores[p1]}</p>
        </div>
        <div className={game.scores[p2] > game.scores[p1] ? "text-primary" : ""}>
          <p className="text-[11px] text-muted-foreground"><PlayerName id={p2} players={players} /></p>
          <p className="text-2xl font-bold">{game.scores[p2]}</p>
        </div>
      </div>

      {game.phase === "result" && game.roundWinner && (
        <div className="mb-4 py-3 rounded-xl bg-white/5">
          {game.roundWinner === "false_start" ? (
            <p className="text-sm text-red-400 font-semibold">🚫 Faux départ !</p>
          ) : (
            <p className="text-sm font-semibold">
              {game.roundWinner === currentUserId ? "✅ Tu es plus rapide !" :
               <><PlayerName id={game.roundWinner} players={players} /> est plus rapide !</>}
            </p>
          )}
          {game.reactionTimes && Object.keys(game.reactionTimes).length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {Object.entries(game.reactionTimes).map(([uid, time]) =>
                `${players[uid]?.firstName || "?"}: ${time}ms`
              ).join(" vs ")}
            </p>
          )}
        </div>
      )}

      {game.phase === "green" && (
        <button onClick={() => onMove("react")}
          className="w-full h-36 rounded-2xl bg-green-500 text-white text-3xl font-black animate-pulse active:scale-95 transition-transform shadow-lg shadow-green-500/30">
          MAINTENANT !
        </button>
      )}

      {game.phase === "waiting" && (
        <button onClick={() => onMove("false-start")}
          className="w-full h-36 rounded-2xl bg-red-500/15 border-2 border-red-500/30 text-red-400 text-xl font-bold active:scale-95 transition-transform">
          ATTENDS...
          <p className="text-[11px] mt-2 opacity-60 font-normal">Appuie quand ça devient vert 🟢</p>
        </button>
      )}

      {game.phase === "idle" && (
        <div className="w-full h-36 rounded-2xl bg-white/5 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// TIC-TAC-TOE
// ══════════════════════════════════════
function TicTacToeGame({
  game, currentUserId, players, onMove, onClose,
}: {
  game: GameState; currentUserId: string;
  players: Record<string, GamePlayer>;
  onMove: (cellIndex: number) => void; onClose: () => void;
}) {
  const p1 = game.players[0], p2 = game.players[1];
  const myMark = game.marks?.[currentUserId];
  const board = game.board || Array(9).fill(null);

  if (game.state === "finished") {
    return (
      <div className="mx-auto max-w-[280px] text-center relative">
        <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
        <p className="text-lg mb-3">🏆 FIN DU MORPION</p>
        <div className="flex justify-around mb-4">
          <div className={game.winner === p1 ? "text-primary" : ""}>
            <p className="text-xs text-muted-foreground"><PlayerName id={p1} players={players} /></p>
            <p className="text-3xl font-bold">{game.scores[p1]}</p>
          </div>
          <div className="text-muted-foreground self-center text-lg">—</div>
          <div className={game.winner === p2 ? "text-primary" : ""}>
            <p className="text-xs text-muted-foreground"><PlayerName id={p2} players={players} /></p>
            <p className="text-3xl font-bold">{game.scores[p2]}</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-primary">
          {game.winner === "draw" ? "Match nul !" :
           game.winner === currentUserId ? "🏆 Tu gagnes !" :
           <><PlayerName id={game.winner!} players={players} /> gagne !</>}
        </p>
      </div>
    );
  }

  const isMyTurn = game.currentTurn === currentUserId;

  return (
    <div className="mx-auto max-w-[280px] text-center relative">
      <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
      <p className="text-sm font-bold mb-1">❌ MORPION</p>
      <p className="text-[11px] text-muted-foreground mb-2">
        Manche {game.currentRound}/{game.maxRounds} · Tu es <span className="font-bold text-primary">{myMark}</span>
      </p>

      <div className="flex justify-around mb-3">
        <div className={game.currentTurn === p1 ? "text-primary" : ""}>
          <p className="text-[11px] text-muted-foreground"><PlayerName id={p1} players={players} /> ({game.marks?.[p1]})</p>
          <p className="text-lg font-bold">{game.scores[p1]}</p>
        </div>
        <div className={game.currentTurn === p2 ? "text-primary" : ""}>
          <p className="text-[11px] text-muted-foreground"><PlayerName id={p2} players={players} /> ({game.marks?.[p2]})</p>
          <p className="text-lg font-bold">{game.scores[p2]}</p>
        </div>
      </div>

      <div className="inline-grid grid-cols-3 gap-1.5 mb-3 p-2 bg-white/5 rounded-xl">
        {board.map((cell, i) => {
          const isWin = game.winLine?.includes(i);
          return (
            <button key={i} onClick={() => isMyTurn && !cell && onMove(i)}
              className={`w-[70px] h-[70px] rounded-lg text-3xl font-black flex items-center justify-center transition-all
                ${isWin ? "bg-primary/30 border-2 border-primary animate-pulse" :
                  cell ? "bg-white/10" :
                  isMyTurn ? "bg-white/5 hover:bg-primary/20 cursor-pointer active:scale-95" : "bg-white/5"}`}
              style={{ color: cell === "X" ? "#f5a623" : cell === "O" ? "#60a5fa" : undefined }}>
              {cell || ""}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {isMyTurn ? "🟢 À toi de jouer" : "⏳ En attente..."}
      </p>
    </div>
  );
}

// ══════════════════════════════════════
// RPS
// ══════════════════════════════════════
function RPSGame({
  game, currentUserId, players, onMove, onRematch, onNextRound, onClose,
}: {
  game: GameState; currentUserId: string;
  players: Record<string, GamePlayer>;
  onMove: (choice: string) => void;
  onRematch: () => void; onNextRound: () => void; onClose: () => void;
}) {
  const p1 = game.players[0], p2 = game.players[1];
  const myChoice = game.choices?.[currentUserId];

  if (game.state === "finished") {
    return (
      <div className="mx-auto max-w-[280px] text-center relative">
        <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
        <p className="text-lg mb-3">🏆 FIN</p>
        <div className="flex justify-around mb-4">
          <div className={game.winner === p1 ? "text-primary" : ""}>
            <p className="text-xs text-muted-foreground"><PlayerName id={p1} players={players} /></p>
            <p className="text-3xl font-bold">{game.scores[p1]}</p>
          </div>
          <div className="text-muted-foreground self-center text-lg">—</div>
          <div className={game.winner === p2 ? "text-primary" : ""}>
            <p className="text-xs text-muted-foreground"><PlayerName id={p2} players={players} /></p>
            <p className="text-3xl font-bold">{game.scores[p2]}</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-primary mb-3">
          {game.winner === "draw" ? "Match nul !" :
           game.winner === currentUserId ? "🏆 Tu gagnes !" :
           <><PlayerName id={game.winner!} players={players} /> gagne !</>}
        </p>
        <button onClick={onRematch} className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
          Revanche
        </button>
      </div>
    );
  }

  if (game.phase === "revealed" && myChoice) {
    const oppId = game.players.find(p => p !== currentUserId)!;
    return (
      <div className="mx-auto max-w-[280px] text-center relative">
        <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
        <p className="text-sm font-bold mb-2">✊ MANCHE {game.currentRound}/{game.maxRounds}</p>
        <div className="flex justify-around mb-3">
          <div className={game.scores[p1] > game.scores[p2] ? "text-primary" : ""}>
            <p className="text-[11px] text-muted-foreground"><PlayerName id={p1} players={players} /></p>
            <p className="text-xl font-bold">{game.scores[p1]}</p>
          </div>
          <div className={game.scores[p2] > game.scores[p1] ? "text-primary" : ""}>
            <p className="text-[11px] text-muted-foreground"><PlayerName id={p2} players={players} /></p>
            <p className="text-xl font-bold">{game.scores[p2]}</p>
          </div>
        </div>
        <div className="flex justify-center items-center gap-6 mb-4">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground"><PlayerName id={p1} players={players} /></p>
            <p className="text-5xl mt-1">{RPS_EMOJI[game.choices?.[p1] || ""]}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{game.choices?.[p1]}</p>
          </div>
          <span className="text-xl font-bold text-muted-foreground">VS</span>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground"><PlayerName id={p2} players={players} /></p>
            <p className="text-5xl mt-1">{RPS_EMOJI[game.choices?.[p2] || ""]}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{game.choices?.[p2]}</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-primary mb-3">
          {game.roundWinner === "draw" ? "Égalité !" :
           game.roundWinner === currentUserId ? "✅ Tu gagnes cette manche !" :
           <><PlayerName id={game.roundWinner!} players={players} /> gagne cette manche !</>}
        </p>
        <button onClick={onNextRound} className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
          Manche suivante →
        </button>
      </div>
    );
  }

  const choices = [
    { value: "rock", emoji: "✊", label: "Pierre" },
    { value: "paper", emoji: "✋", label: "Feuille" },
    { value: "scissors", emoji: "✌️", label: "Ciseaux" },
  ];

  return (
    <div className="mx-auto max-w-[280px] text-center relative">
      <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
      <p className="text-sm font-bold mb-1">✊ MANCHE {game.currentRound}/{game.maxRounds}</p>
      <div className="flex justify-around mb-4">
        <div className={game.scores[p1] > game.scores[p2] ? "text-primary" : ""}>
          <p className="text-[11px] text-muted-foreground"><PlayerName id={p1} players={players} /></p>
          <p className="text-lg font-bold">{game.scores[p1]}</p>
        </div>
        <div className={game.scores[p2] > game.scores[p1] ? "text-primary" : ""}>
          <p className="text-[11px] text-muted-foreground"><PlayerName id={p2} players={players} /></p>
          <p className="text-lg font-bold">{game.scores[p2]}</p>
        </div>
      </div>
      <div className="flex justify-center gap-4 mb-3">
        {choices.map(c => (
          <button key={c.value} onClick={() => onMove(c.value)}
            className={`w-[72px] h-[72px] rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90
              ${myChoice === c.value
                ? "bg-primary/30 border-2 border-primary shadow-lg shadow-primary/20"
                : "bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105"
              }`}>
            <span className="text-3xl">{c.emoji}</span>
            <span className="text-[9px] text-muted-foreground mt-0.5">{c.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {myChoice ? "⏳ En attente de l'adversaire..." : "👆 Choisis ton move !"}
      </p>
    </div>
  );
}

// ══════════════════════════════════════
// DICE DUEL
// ══════════════════════════════════════
function DiceGame({
  game, currentUserId, players, onMove, onRematch, onNextRound, onClose,
}: {
  game: GameState; currentUserId: string;
  players: Record<string, GamePlayer>;
  onMove: (move: string) => void;
  onRematch: () => void; onNextRound: () => void; onClose: () => void;
}) {
  const p1 = game.players[0], p2 = game.players[1];
  const myRoll = game.moves?.[currentUserId];
  const [rolling, setRolling] = useState(false);
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
  }, []);

  const handleRoll = () => {
    if (rolling || myRoll || game.phase !== "rolling") return;
    // Short spin for visual feedback, then send the roll right away
    setRolling(true);
    rollTimerRef.current = setTimeout(() => {
      setRolling(false);
      onMove("roll");
    }, 450);
  };

  if (game.state === "finished") {
    return (
      <div className="mx-auto max-w-[280px] text-center relative">
        <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
        <p className="text-lg mb-3">🏆 FIN DU DUEL DE DÉS</p>
        <div className="flex justify-around mb-4">
          <div className={game.winner === p1 ? "text-primary" : ""}>
            <p className="text-xs text-muted-foreground"><PlayerName id={p1} players={players} /></p>
            <p className="text-3xl font-bold">{game.scores[p1]}</p>
          </div>
          <div className="text-muted-foreground self-center text-lg">—</div>
          <div className={game.winner === p2 ? "text-primary" : ""}>
            <p className="text-xs text-muted-foreground"><PlayerName id={p2} players={players} /></p>
            <p className="text-3xl font-bold">{game.scores[p2]}</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-primary mb-3">
          {game.winner === "draw" ? "Match nul !" :
           game.winner === currentUserId ? "🏆 Tu gagnes !" :
           <><PlayerName id={game.winner!} players={players} /> gagne !</>}
        </p>
        <button onClick={onRematch} className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
          Revanche
        </button>
      </div>
    );
  }

  if (game.phase === "done" && myRoll) {
    const oppId = game.players.find(p => p !== currentUserId)!;
    return (
      <div className="mx-auto max-w-[280px] text-center relative">
        <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
        <p className="text-sm font-bold mb-2">🎲 MANCHE {game.currentRound}/{game.maxRounds}</p>
        <div className="flex justify-around mb-4">
          <div className={game.scores[p1] > game.scores[p2] ? "text-primary" : ""}>
            <p className="text-[11px] text-muted-foreground"><PlayerName id={p1} players={players} /></p>
            <p className="text-xl font-bold">{game.scores[p1]}</p>
          </div>
          <div className={game.scores[p2] > game.scores[p1] ? "text-primary" : ""}>
            <p className="text-[11px] text-muted-foreground"><PlayerName id={p2} players={players} /></p>
            <p className="text-xl font-bold">{game.scores[p2]}</p>
          </div>
        </div>

        <div className="flex justify-around items-center mb-4">
          {[p1, p2].map(pid => {
            const d = game.dice?.[pid] || [];
            const t = game.total?.[pid] || 0;
            const won = game.roundWinner === pid;
            return (
              <div key={pid} className={`text-center p-3 rounded-xl ${won ? "bg-primary/20 border border-primary/30" : "bg-white/5"}`}>
                <p className="text-[10px] text-muted-foreground mb-1"><PlayerName id={pid} players={players} /></p>
                <div className="flex gap-2 justify-center mb-2">
                  <span className="text-4xl">{DICE_FACES[(d[0] || 1) - 1]}</span>
                  <span className="text-4xl">{DICE_FACES[(d[1] || 1) - 1]}</span>
                </div>
                <p className={`text-2xl font-black ${won ? "text-primary" : ""}`}>{t}</p>
              </div>
            );
          })}
        </div>

        <p className="text-sm font-semibold text-primary">
          {game.roundWinner === "draw" ? "Égalité !" :
           game.roundWinner === currentUserId ? "✅ Tu gagnes cette manche !" :
           <><PlayerName id={game.roundWinner!} players={players} /> gagne cette manche !</>}
        </p>
        <button onClick={onNextRound} className="mt-3 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
          Manche suivante →
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[280px] text-center relative">
      <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
      <p className="text-sm font-bold mb-1">🎲 DUEL DE DÉS</p>
      <p className="text-[11px] text-muted-foreground mb-3">Manche {game.currentRound}/{game.maxRounds}</p>
      <div className="flex justify-around mb-4">
        <div><p className="text-[11px] text-muted-foreground"><PlayerName id={p1} players={players} /></p><p className="text-lg font-bold">{game.scores[p1]}</p></div>
        <div><p className="text-[11px] text-muted-foreground"><PlayerName id={p2} players={players} /></p><p className="text-lg font-bold">{game.scores[p2]}</p></div>
      </div>

      {rolling ? (
        <div className="flex justify-center gap-3 mb-3">
          <span className="text-5xl animate-spin" style={{ animationDuration: "0.3s" }}>🎲</span>
          <span className="text-5xl animate-spin" style={{ animationDuration: "0.4s" }}>🎲</span>
        </div>
      ) : (
        <div className="flex justify-center gap-3 mb-3">
          <span className="text-5xl">🎲</span>
          <span className="text-5xl">🎲</span>
        </div>
      )}

      <button onClick={handleRoll} disabled={!!myRoll || rolling}
        className="w-full py-4 rounded-xl bg-primary text-primary-foreground text-lg font-black hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
        {rolling ? "Lancement..." : myRoll ? "En attente..." : "🎲 LANCER"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════
// QUIZ (IA)
// ══════════════════════════════════════
const QUIZ_LETTERS = ["A", "B", "C", "D"];
const QUIZ_TOTAL = 20;
const QUIZ_DIFF: Record<string, { label: string; badge: string }> = {
  facile: { label: "Facile", badge: "text-green-400 border-green-400/40 bg-green-400/10" },
  moyen: { label: "Moyen", badge: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" },
  difficile: { label: "Difficile", badge: "text-orange-400 border-orange-400/40 bg-orange-400/10" },
  tres_difficile: { label: "Très difficile", badge: "text-red-400 border-red-400/40 bg-red-400/10" },
};

function QuizGame({
  game, currentUserId, players, onMove, onRematch, onClose,
}: {
  game: GameState; currentUserId: string;
  players: Record<string, GamePlayer>;
  onMove: (data: any) => void; onRematch: () => void; onClose: () => void;
}) {
  const p1 = game.players[0] ?? "", p2 = game.players[1] ?? "";
  const otherId = game.players.find(p => p !== currentUserId) || p2;
  const total = game.questions?.length || QUIZ_TOTAL;
  const [now, setNow] = useState(Date.now());
  const [pending, setPending] = useState(false);

  // Reset local state + clock whenever a new question arrives
  useEffect(() => {
    setNow(Date.now());
    setPending(false);
  }, [game.progress, game.pstate, game.deadline]);

  // Tick once per second for the countdown
  useEffect(() => {
    if (game.pstate !== "question" || !game.deadline) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [game.pstate, game.deadline]);

  const remaining = game.pstate === "question" && game.deadline
    ? Math.max(0, Math.ceil((game.deadline - now) / 1000))
    : null;

  const answered = game.progress ?? 0;
  const myCorrect = game.correctCount?.[currentUserId] ?? 0;
  const oppCorrect = game.correctCount?.[otherId] ?? 0;

  // ── Génération du pack IA ──
  if (game.quizStatus === "generating") {
    return (
      <div className="mx-auto max-w-[340px] text-center relative">
        <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
        <p className="text-4xl mb-2 animate-bounce">🧠</p>
        <p className="text-sm font-bold mb-1">GÉNÉRATION DU QUIZ</p>
        <p className="text-[11px] text-muted-foreground mb-4">L'IA prépare 20 questions de culture générale...</p>
        <div className="flex justify-center gap-1 mb-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent mx-auto" />
      </div>
    );
  }

  // ── Partie terminée ──
  if (game.state === "finished") {
    const win = game.winner;
    const winnerName = win && !["draw", "declined", "disconnect"].includes(win as string) ? win : null;
    return (
      <div className="mx-auto max-w-[340px] text-center relative">
        <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
        <p className="text-lg mb-3">🏆 QUIZ TERMINÉ</p>
        <div className="flex justify-around mb-4">
          <div className={win === p1 ? "text-primary" : ""}>
            <p className="text-xs text-muted-foreground"><PlayerName id={p1} players={players} /></p>
            <p className="text-3xl font-black">{game.scores[p1]}</p>
            <p className="text-[11px] text-muted-foreground">{game.correctCount?.[p1] ?? 0}/{total} bonnes</p>
          </div>
          <div className="text-muted-foreground self-center text-lg">—</div>
          <div className={win === p2 ? "text-primary" : ""}>
            <p className="text-xs text-muted-foreground"><PlayerName id={p2} players={players} /></p>
            <p className="text-3xl font-black">{game.scores[p2]}</p>
            <p className="text-[11px] text-muted-foreground">{game.correctCount?.[p2] ?? 0}/{total} bonnes</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-primary mb-3">
          {win === "draw" ? "Match nul !" :
           win === currentUserId ? "🎉 Tu remportes le quiz !" :
           win === "declined" ? "Défi refusé" :
           win === "disconnect" ? "Déconnexion" :
           <><PlayerName id={winnerName || ""} players={players} /> remporte le quiz !</>}
        </p>
        <button onClick={onRematch} className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
          Revanche
        </button>
      </div>
    );
  }

  // ── J'ai fini, l'adversaire joue encore ──
  if (game.pstate === "done") {
    return (
      <div className="mx-auto max-w-[340px] text-center relative">
        <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
        <p className="text-3xl mb-2">🎉</p>
        <p className="text-sm font-bold mb-1">TU AS TERMINÉ LE QUIZ !</p>
        <p className="text-[11px] text-muted-foreground mb-3">{myCorrect}/{total} bonnes réponses · {game.scores[currentUserId]} pts</p>
        <p className="text-[11px] text-muted-foreground">
          ⏳ En attente de <PlayerName id={otherId} players={players} /> ({oppCorrect}/{total})...
        </p>
      </div>
    );
  }

  // ── Retour après réponse ──
  if (game.pstate === "feedback" && game.lastResult) {
    const lr = game.lastResult;
    const q = game.questions?.[lr.qIndex];
    if (q) {
      const finished = answered >= total;
      return (
        <div className="mx-auto max-w-[340px] text-center relative">
          <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
          <div className="flex justify-around mb-3">
            <div><p className="text-[11px] text-muted-foreground"><PlayerName id={p1} players={players} /></p><p className="text-lg font-black">{game.scores[p1]}</p></div>
            <div><p className="text-[11px] text-muted-foreground"><PlayerName id={p2} players={players} /></p><p className="text-lg font-black">{game.scores[p2]}</p></div>
          </div>
          <p className={`text-sm font-bold mb-1 ${lr.correct ? "text-green-400" : "text-red-400"}`}>
            {lr.correct ? "✅ Bonne réponse !" : lr.timedOut ? "⏰ Temps écoulé !" : "❌ Mauvaise réponse !"}
          </p>
          {lr.correct && <p className="text-xs text-green-400/80 font-bold mb-2">+{lr.points} points</p>}
          {!lr.correct && <p className="text-[11px] text-muted-foreground mb-2">La bonne réponse était :</p>}
          <p className="text-xs font-semibold text-primary mb-3">{q.question}</p>
          <div className="grid grid-cols-1 gap-1.5 mb-3">
            {q.answers.map((a, i) => {
              const isCorrect = i === lr.correctIndex;
              const isMine = i === lr.answerIndex;
              return (
                <div key={i}
                  className={`px-3 py-2 rounded-xl text-left text-[13px] border
                    ${isCorrect ? "bg-green-500/15 border-green-500/40 text-green-300" :
                      isMine ? "bg-red-500/15 border-red-500/40 text-red-300" :
                      "bg-white/5 border-white/10 text-white/60"}`}>
                  <span className="font-bold mr-1.5">{QUIZ_LETTERS[i]}.</span>{a}
                  {isCorrect && <span className="float-right">✅</span>}
                  {isMine && !isCorrect && <span className="float-right">❌</span>}
                </div>
              );
            })}
          </div>
          <button onClick={() => onMove({ move: "next" })}
            className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
            {finished ? "Voir les résultats 🏆" : "Question suivante →"}
          </button>
        </div>
      );
    }
  }

  // ── Question en cours ──
  const qIndex = game.order?.[answered];
  const question = qIndex !== undefined ? game.questions?.[qIndex] : undefined;
  if (game.pstate === "question" && question) {
    const diff = QUIZ_DIFF[question.difficulty] || { label: question.difficulty, badge: "text-primary border-primary/40 bg-primary/10" };
    return (
      <div className="mx-auto max-w-[340px] text-center relative">
        <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
        <div className="flex justify-around mb-3">
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground"><PlayerName id={p1} players={players} /></p>
            <p className="text-lg font-black">{game.scores[p1]}</p>
            <p className="text-[10px] text-muted-foreground">{game.correctCount?.[p1] ?? 0}/{total}</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground"><PlayerName id={p2} players={players} /></p>
            <p className="text-lg font-black">{game.scores[p2]}</p>
            <p className="text-[10px] text-muted-foreground">{game.correctCount?.[p2] ?? 0}/{total}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-1">
          <p className="text-sm font-bold">QUESTION {answered + 1} / {total}</p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${diff.badge}`}>{diff.label}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2">+{question.points} pts</p>

        <p className="text-sm font-semibold leading-snug mb-3 min-h-[44px]">{question.question}</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {question.answers.map((a, i) => (
            <button key={i} disabled={pending}
              onClick={() => { setPending(true); onMove({ move: "answer", answerIndex: i }); }}
              className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-left text-[13px] leading-snug
                hover:bg-white/10 hover:border-primary/40 active:scale-95 transition-all
                disabled:opacity-50 disabled:cursor-default">
              <span className="font-bold text-primary mr-1.5">{QUIZ_LETTERS[i]}.</span>{a}
            </button>
          ))}
        </div>

        <div className="mb-1">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>⏱ {remaining ?? 0}s</span>
            <span>🟢 <PlayerName id={otherId} players={players} /> : {oppCorrect}/{total}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-primary transition-all duration-1000"
              style={{ width: `${((remaining ?? 0) / 20) * 100}%` }} />
          </div>
        </div>
      </div>
    );
  }

  // Sécurité : état intermédiaire (pack prêt, question pas encore poussée)
  return (
    <div className="mx-auto max-w-[340px] text-center relative">
      <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">✕</button>
      <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent mx-auto" />
    </div>
  );
}

// ══════════════════════════════════════
// GENERIC GAME WRAPPER
// ══════════════════════════════════════
function GenericGameWrapper({
  game, currentUserId, players, onMove, onRematch, onClose, title, children,
}: {
  game: GameState; currentUserId: string;
  players: Record<string, GamePlayer>;
  onMove: (data: any) => void; onRematch: () => void; onClose: () => void;
  title: string; children: React.ReactNode;
}) {
  const p1 = game.players[0] ?? "", p2 = game.players[1] ?? "";
  
  if (game.state === "finished") {
    const win = game.winner;
    return (
      <div className="mx-auto max-w-[340px] text-center relative">
        <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">
          <LucideIcons.X className="h-4 w-4" />
        </button>
        <p className="text-lg mb-3">FIN DE LA PARTIE</p>
        <div className="flex justify-around mb-4">
          <div className={win === p1 ? "text-primary" : ""}>
            <p className="text-xs text-muted-foreground"><PlayerName id={p1} players={players} /></p>
            <p className="text-3xl font-black">{game.scores[p1]}</p>
          </div>
          <div className="text-muted-foreground self-center text-lg">-</div>
          <div className={win === p2 ? "text-primary" : ""}>
            <p className="text-xs text-muted-foreground"><PlayerName id={p2} players={players} /></p>
            <p className="text-3xl font-black">{game.scores[p2]}</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-primary mb-3">
          {win === "draw" ? "Match nul !" :
           win === currentUserId ? "Tu gagnes !" :
           <><PlayerName id={win || ""} players={players} /> gagne !</>}
        </p>
        {game.type === "a_quel_point" && game.compatibility !== undefined && (
          <div className="mb-4">
            <p className="text-3xl font-black text-primary">{game.compatibility}%</p>
            <p className="text-[11px] text-muted-foreground px-2">{game.compatibilityMessage || "de compatibilite"}</p>
          </div>
        )}
        <button onClick={onRematch} className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
          Revanche
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[340px] text-center relative">
      <button onClick={onClose} className="absolute -top-1 -right-1 p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground text-sm z-10">
        <LucideIcons.X className="h-4 w-4" />
      </button>
      <p className="text-sm font-bold mb-2">{title}</p>
      <div className="flex justify-around mb-3">
        <div className={(game.scores[p1] ?? 0) > (game.scores[p2] ?? 0) ? "text-primary" : ""}>
          <p className="text-[11px] text-muted-foreground"><PlayerName id={p1} players={players} /></p>
          <p className="text-xl font-bold">{game.scores[p1] ?? 0}</p>
        </div>
        <div className={(game.scores[p2] ?? 0) > (game.scores[p1] ?? 0) ? "text-primary" : ""}>
          <p className="text-[11px] text-muted-foreground"><PlayerName id={p2} players={players} /></p>
          <p className="text-xl font-bold">{game.scores[p2] ?? 0}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ══════════════════════════════════════
// CODE SECRET GAME
// ══════════════════════════════════════
const CODE_LENGTH = 4;
const CS_SYMBOLS = ["red", "green", "blue", "yellow", "purple", "orange"];
const COLOR_CLASSES: Record<string, string> = {
  red: "bg-red-500", green: "bg-green-500", blue: "bg-blue-500",
  yellow: "bg-yellow-400", purple: "bg-purple-500", orange: "bg-orange-500",
};

function CodeSecretGame({
  game, currentUserId, players, onMove, onRematch, onClose,
}: {
  game: GameState; currentUserId: string; players: Record<string, GamePlayer>;
  onMove: (data: any) => void; onRematch: () => void; onClose: () => void;
}) {
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);
  const isCreator = game.myRole ? game.myRole === "creator" : game.codeCreator === currentUserId;
  const isGuesser = game.myRole ? game.myRole === "guesser" : game.currentGuesser === currentUserId;
  const isMyTurn = isGuesser && game.phase === 'guessing';
  const codeLength = game.codeLength ?? CODE_LENGTH;
  const maxAttempts = game.maxAttempts ?? 6;
  const myCode = game.myCode ?? [];
  const colors = (game.colors && game.colors.length ? game.colors : CS_SYMBOLS);

  // On vide la proposition en cours dès qu'on change de phase ou de manche
  useEffect(() => { setCurrentGuess([]); }, [game.phase, game.round]);

  const addSymbol = (color: string) => {
    if (currentGuess.length >= codeLength) return;
    setCurrentGuess((prev) => [...prev, color]);
  };

  const removeLast = () => setCurrentGuess((prev) => prev.slice(0, -1));

  const submitGuess = () => {
    if (currentGuess.length !== codeLength) return;
    onMove({ gameId: game.id, move: "guess", guess: currentGuess });
    setCurrentGuess([]);
  };

  const addCodeSymbol = (color: string) => {
    if (myCode.length >= codeLength) return;
    onMove({ gameId: game.id, move: "set_code", symbol: color, action: "add" });
  };

  const getColorClass = (color?: string) => COLOR_CLASSES[color || ""] || "bg-white/10";

  const renderPeg = (color: string, status: string | undefined, key: number | string) => {
    const ring = status === "correct" ? "ring-2 ring-green-400" : status === "wrong_position" ? "ring-2 ring-orange-400" : "";
    return <span key={key} className={`w-9 h-9 rounded-lg ${getColorClass(color)} ${ring} border border-white/20`} />;
  };

  return (
    <GenericGameWrapper game={game} currentUserId={currentUserId} players={players} onMove={onMove} onRematch={onRematch} onClose={onClose} title="Le Code Secret">
      <p className="text-[10px] text-muted-foreground text-center mb-2">
        Manche {game.round || 1}/2 · {isCreator ? "Tu composes le code" : "Tu devines le code"}
      </p>
      {/* ═══ CREATOR: choose the code ═══ */}
      {game.phase === 'setting_code' && isCreator && (
        <div>
          <p className="text-[11px] text-primary font-semibold mb-2">
            Choisis ton code secret ({myCode.length}/{codeLength})
          </p>
          <p className="text-[10px] text-muted-foreground mb-3">
            {myCode.length < codeLength
              ? "Compose ton code couleur par couleur, puis l'autre devra le deviner."
              : "Code verrouille. L'adversaire va deviner..."}
          </p>
          {/* Le code en construction */}
          <div className="flex justify-center gap-2 mb-3">
            {myCode.map((c, i) => renderPeg(c, undefined, i))}
            {Array.from({ length: codeLength - myCode.length }).map((_, i) => (
              <span key={`empty-${i}`} className="w-9 h-9 rounded-lg bg-white/5 border border-dashed border-white/15" />
            ))}
          </div>
          <div className="flex justify-center gap-2 mb-3 flex-wrap">
            {colors.map((c) => (
              <button key={c} onClick={() => addCodeSymbol(c)} disabled={myCode.length >= codeLength}
                className={`w-10 h-10 rounded-lg ${getColorClass(c)} border border-white/20 transition-transform hover:scale-105 disabled:opacity-40`}
                aria-label={c} />
            ))}
          </div>
          {myCode.length > 0 && (
            <div className="flex justify-center gap-2">
              <button onClick={() => onMove({ gameId: game.id, move: "set_code", action: "remove" })}
                className="px-4 py-2 rounded-lg bg-white/10 text-sm">Retour</button>
              <button onClick={() => onMove({ gameId: game.id, move: "set_code", action: "reset" })}
                className="px-4 py-2 rounded-lg bg-white/10 text-sm">Effacer</button>
            </div>
          )}
        </div>
      )}

      {/* ═══ CREATOR attend pendant la devinette ═══ */}
      {game.phase === 'guessing' && isCreator && (
        <div className="text-center py-3">
          <p className="text-sm text-muted-foreground">
            Tu as defini le code. <PlayerName id={game.currentGuesser || ''} players={players} /> essaie de le deviner.
          </p>
        </div>
      )}

      {/* ═══ GUESSER: try to break the code ═══ */}
      {isGuesser && game.phase === 'guessing' && (
        <div>
          <p className="text-[11px] text-muted-foreground text-center mb-2">
            Tentative {(game.attempts?.length || 0) + 1}/{maxAttempts}
          </p>
          <div className="flex justify-center gap-2 mb-3">
            {currentGuess.map((c, i) => renderPeg(c, undefined, i))}
            {Array.from({ length: codeLength - currentGuess.length }).map((_, i) => (
              <span key={`empty-${i}`} className="w-9 h-9 rounded-lg bg-white/5 border border-dashed border-white/15" />
            ))}
          </div>
          <div className="flex justify-center gap-2 mb-3 flex-wrap">
            {colors.map((c) => (
              <button key={c} onClick={() => addSymbol(c)} aria-label={c}
                className={`w-10 h-10 rounded-lg ${getColorClass(c)} border border-white/20 transition-transform hover:scale-105`} />
            ))}
          </div>
          <div className="flex justify-center gap-2 mb-1">
            <button onClick={removeLast} className="px-4 py-2 rounded-lg bg-white/10 text-sm">Retour</button>
            <button onClick={submitGuess} disabled={currentGuess.length !== codeLength}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40">
              Valider
            </button>
          </div>
          <div className="flex justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-white/20 ring-2 ring-green-400 inline-block" /> bonne position</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-white/20 ring-2 ring-orange-400 inline-block" /> mauvaise position</span>
          </div>
        </div>
      )}

      {/* ═══ PREVIOUS ATTEMPTS */}
      {game.attempts && game.attempts.length > 0 && (
        <div className="mb-3 mt-3 space-y-1">
          {game.attempts.map((attempt: any, i: number) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-muted-foreground w-4">{i + 1}.</span>
              <div className="flex gap-1">
                {attempt.guess.map((c: string, j: number) => renderPeg(c, attempt.result?.[j]?.status, j))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ DERNIER RESULTAT */}
      {game.lastResult && (
        <div className={`p-3 rounded-xl mb-2 ${game.lastResult.correct ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5 border border-white/10'}`}>
          {game.lastResult.correct ? (
            <p className="text-sm font-semibold text-green-400">Code trouve !</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {game.lastResult.result.filter((r: any) => r.status === 'correct').length} bien place(s),{" "}
              {game.lastResult.result.filter((r: any) => r.status === 'wrong_position').length} mal place(s)
            </p>
          )}
        </div>
      )}

      {/* ═══ EN ATTENTE */}
      {!isCreator && game.phase === 'setting_code' && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            En attente que <PlayerName id={game.codeCreator || ''} players={players} /> compose son code...
          </p>
        </div>
      )}

      {!isCreator && !isGuesser && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">En attente...</p>
        </div>
      )}
    </GenericGameWrapper>
  );
}

// ══════════════════════════════════════
// MOT INTRUS GAME
// ══════════════════════════════════════
function MotIntrusGame({
  game, currentUserId, players, onMove, onRematch, onClose,
}: {
  game: GameState; currentUserId: string; players: Record<string, GamePlayer>;
  onMove: (data: any) => void; onRematch: () => void; onClose: () => void;
}) {
  const isMyTurn = game.currentPlayer === currentUserId;
  const question = game.currentQuestion;

  return (
    <GenericGameWrapper game={game} currentUserId={currentUserId} players={players} onMove={onMove} onRematch={onRematch} onClose={onClose} title="Le Mot Intrus">
      <p className="text-[11px] text-muted-foreground mb-3">Manche {game.currentRound}/{game.maxRounds}</p>

      {question && question.words && (
        <div className="grid grid-cols-1 gap-2 mb-4">
          {question.words.map((word: string, i: number) => (
            <button key={i} onClick={() => isMyTurn && onMove({ gameId: game.id, move: 'answer', answerIndex: i })}
              disabled={!isMyTurn || game.phase !== 'playing'}
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-primary/20 hover:border-primary/40 transition-all disabled:opacity-50">
              {word}
            </button>
          ))}
        </div>
      )}

      {game.phase === 'result' && game.lastResult && (
        <div className={`p-3 rounded-xl ${game.lastResult.correct ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
          <p className="text-sm font-semibold mb-1">{game.lastResult.correct ? "Correct !" : "Faux !"}</p>
          <p className="text-[11px] text-muted-foreground">{game.lastResult.explanation}</p>
        </div>
      )}
    </GenericGameWrapper>
  );
}

// ══════════════════════════════════════
// DEVINE CE QUE JE PENSE
// ══════════════════════════════════════
function DevineGame({
  game, currentUserId, players, onMove, onRematch, onClose,
}: {
  game: GameState; currentUserId: string; players: Record<string, GamePlayer>;
  onMove: (data: any) => void; onRematch: () => void; onClose: () => void;
}) {
  const [questionText, setQuestionText] = useState("");
  const isThinker = game.thinker === currentUserId;
  const isGuesser = game.guesser === currentUserId;

  return (
    <GenericGameWrapper game={game} currentUserId={currentUserId} players={players} onMove={onMove} onRematch={onRematch} onClose={onClose} title="Devine ce que je pense">
      <p className="text-[11px] text-muted-foreground mb-3">
        {game.category?.icon || ""} Categorie: {game.category?.name || "???"}
      </p>

      {isThinker && (
        <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/30">
          <p className="text-[11px] text-muted-foreground mb-1">Votre mot secret :</p>
          <p className="text-lg font-bold text-primary">{game.secretItem}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Repondez Oui ou Non aux questions</p>
        </div>
      )}

      {/* Affiche la question EN COURS pendant la phase answering */}
      {isThinker && game.phase === 'answering' && game.currentQuestion && (
        <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/30">
          <p className="text-[11px] text-primary font-semibold mb-1">Question de votre ami :</p>
          <p className="text-sm font-medium">{game.currentQuestion.text}</p>
        </div>
      )}

      {/* Affiche la PRECEDENTE reponse pour l'historique */}
      {game.lastAnswer && (
        <div className="mb-4 p-3 rounded-xl bg-white/5">
          <p className="text-[11px] text-muted-foreground">{game.lastAnswer.question}</p>
          <p className="text-sm font-semibold">{game.lastAnswer.answer}</p>
        </div>
      )}

      {isGuesser && game.phase === 'asking' && (
        <div className="flex gap-2">
          <input type="text" value={questionText} onChange={e => setQuestionText(e.target.value)}
            placeholder="Votre question..."
            className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary"
            onKeyDown={e => { if (e.key === 'Enter' && questionText.trim()) {
              onMove({ gameId: game.id, move: 'question', question: questionText });
              setQuestionText("");
            }}}
          />
          <button onClick={() => { if (questionText.trim()) {
            onMove({ gameId: game.id, move: 'question', question: questionText });
            setQuestionText("");
          }}} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
            Envoyer
          </button>
        </div>
      )}

      {isThinker && game.phase === 'answering' && (
        <div className="flex gap-2 justify-center">
          <button onClick={() => onMove({ gameId: game.id, move: 'answer', answer: 'Oui' })}
            className="px-6 py-3 rounded-xl bg-green-500 text-white font-bold">Oui</button>
          <button onClick={() => onMove({ gameId: game.id, move: 'answer', answer: 'Non' })}
            className="px-6 py-3 rounded-xl bg-red-500 text-white font-bold">Non</button>
        </div>
      )}

      {isGuesser && game.phase === 'asking' && (
        <div className="mt-3">
          <button onClick={() => {
            const guess = prompt("Quel est votre guess ?");
            if (guess) onMove({ gameId: game.id, move: 'guess', guess });
          }} className="px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-400 text-sm font-semibold">
            Proposer une reponse
          </button>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-3">Question {game.questionCount}/{game.maxQuestions}</p>
    </GenericGameWrapper>
  );
}

// ══════════════════════════════════════
// A QUEL POINT TU ME CONNAIS
// ══════════════════════════════════════
function AQuelPointGame({
  game, currentUserId, players, onMove, onRematch, onClose,
}: {
  game: GameState; currentUserId: string; players: Record<string, GamePlayer>;
  onMove: (data: any) => void; onRematch: () => void; onClose: () => void;
}) {
  const question = game.currentQuestion;
  const canSet = game.canSet;
  const canGuess = game.canGuess;
  const filledCount = game.filledCount ?? 0;
  const guessedCount = game.guessedCount ?? 0;

  const send = (move: string, extra: Record<string, unknown> = {}) =>
    onMove({ gameId: game.id, move, ...extra });

  return (
    <GenericGameWrapper game={game} currentUserId={currentUserId} players={players} onMove={onMove} onRematch={onRematch} onClose={onClose} title="A quel point tu me connais ?">
      {/* ═══ PHASE DE REMPLISSAGE ═══ */}
      {canSet && (
        <div>
          <p className="text-[11px] text-primary font-semibold mb-2">
            Remplis tes verites ! (Question {(game.settingIndex || 0) + 1}/{game.maxRounds})
          </p>
          <p className="text-[10px] text-muted-foreground mb-3">
            Reponds honnetement, l'autre devinera apres.
          </p>
          {question && (
            <div className="mb-4">
              <p className="text-sm font-semibold mb-3">{question.text}</p>
              <div className="grid grid-cols-2 gap-2">
                {question.options.map((opt: string, i: number) => (
                  <button key={i} onClick={() => send('set_answer', { questionId: question.id, answerIndex: i })}
                    className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-primary/20 hover:border-primary/40 transition-all">
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ PHASE DE DEVINETTE ═══ */}
      {canGuess && (
        <div>
          <p className="text-[11px] text-primary font-semibold mb-2">
            Devine ses reponses ! ({guessedCount}/{game.maxRounds} faites)
          </p>
          <p className="text-[10px] text-muted-foreground mb-3">
            Que pense-t-il etre la bonne reponse ?
          </p>
          {question && (
            <div className="mb-4">
              <p className="text-sm font-semibold mb-3">{question.text}</p>
              <div className="grid grid-cols-2 gap-2">
                {question.options.map((opt: string, i: number) => (
                  <button key={i} onClick={() => send('answer', { questionId: question.id, answerIndex: i })}
                    className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-primary/20 hover:border-primary/40 transition-all">
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ EN ATTENTE ═══ */}
      {!canSet && !canGuess && game.state === 'playing' && (
        <div className="text-center py-6">
          {(game.phase === 'setting_p1' || game.phase === 'setting_p2') ? (
            <p className="text-sm text-muted-foreground">
              En attente que <PlayerName id={game.settingPlayer || ''} players={players} /> remplisse ses donnees...
            </p>
          ) : (game.phase === 'guessing_p1' || game.phase === 'guessing_p2') ? (
            <p className="text-sm text-muted-foreground">
              En attente que <PlayerName id={game.guessingPlayer || ''} players={players} /> devine tes reponses...
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Calcul des resultats…</p>
          )}
        </div>
      )}

      {/* ═══ RESULTAT ═══ */}
      {game.lastResult && (
        <div className={`p-3 rounded-xl mb-2 ${game.lastResult.correct ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
          <p className="text-sm font-semibold">
            {game.lastResult.correct ? 'Bonne devinette ! +1 pt' : 'Mauvaise devinette...'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            La vraie reponse : {game.lastResult.theAnswer}
          </p>
        </div>
      )}

      {/* ═══ COMPATIBILITE (duo, phase de fin gere par le wrapper) ═══ */}
      {game.state !== 'finished' && game.compatibility !== undefined && game.compatibility > 0 && (
        <div className="text-center py-3">
          <p className="text-sm">Compatibilite : <span className="font-bold text-primary">{game.compatibility}%</span></p>
        </div>
      )}
    </GenericGameWrapper>
  );
}

// ══════════════════════════════════════
// DEUX VERITES UN MENSONGE
// ══════════════════════════════════════
function DeuxVeritesGame({
  game, currentUserId, players, onMove, onRematch, onClose,
}: {
  game: GameState; currentUserId: string; players: Record<string, GamePlayer>;
  onMove: (data: any) => void; onRematch: () => void; onClose: () => void;
}) {
  const [statements, setStatements] = useState(["", "", ""]);
  const [truthIndex, setTruthIndex] = useState<number | null>(null);
  const isWriter = game.currentPlayer === currentUserId;

  // Les affirmations de l'autre joueur (pendant guessing)
  const otherStatements = !isWriter && game.statements && game.currentPlayer ? game.statements[game.currentPlayer] : null;

  return (
    <GenericGameWrapper game={game} currentUserId={currentUserId} players={players} onMove={onMove} onRematch={onRematch} onClose={onClose} title="Une Vérité, Deux Mensonges">
      <p className="text-[11px] text-muted-foreground mb-3">Manche {game.currentRound}/{game.maxRounds}</p>

      {/* ═══ ECRITURE (le joueur courant remplit) ═══ */}
      {game.phase === 'writing' && isWriter && (
        <div>
          <p className="text-[11px] text-primary mb-2">Ecrivez 3 affirmations : <strong>1 verite</strong> et <strong>2 mensonges</strong></p>
          {statements.map((s, i) => (
            <input key={i} type="text" value={s} onChange={e => {
              const newStatements = [...statements];
              newStatements[i] = e.target.value;
              setStatements(newStatements);
            }}
              placeholder={`Affirmation ${i + 1}...`}
              className="w-full px-3 py-2 mb-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary"
            />
          ))}
          <p className="text-[10px] text-muted-foreground mb-2">Quelle est la VERITE ? (les 2 autres sont des mensonges)</p>
          <div className="flex gap-2 mb-3">
            {[0, 1, 2].map(i => (
              <button key={i} onClick={() => setTruthIndex(i)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${truthIndex === i ? 'bg-green-500 text-white' : 'bg-white/5 text-muted-foreground'}`}>
                Verite {i + 1}
              </button>
            ))}
          </div>
          <button onClick={() => {
            if (statements.every(s => s.trim()) && truthIndex !== null) {
              onMove({ gameId: game.id, move: 'statements', statements, truthIndex });
              setStatements(["", "", ""]);
              setTruthIndex(null);
            }
          }} disabled={!statements.every(s => s.trim()) || truthIndex === null}
            className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40">
            Valider
          </button>
        </div>
      )}

      {/* ═══ EN ATTENTE (pendant que l'autre ecrit) ═══ */}
      {game.phase === 'writing' && !isWriter && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            En attente que <PlayerName id={game.currentPlayer || ''} players={players} /> ecrit ses affirmations...
          </p>
        </div>
      )}

      {/* ═══ DEVINETTE (l'autre joueur choisit la verite) ═══ */}
      {game.phase === 'guessing' && !isWriter && otherStatements && (
        <div>
          <p className="text-[11px] text-primary mb-2">Quelle est la <strong>VERITE</strong> ? (les 2 autres sont des mensonges)</p>
          {otherStatements.map((s: string, i: number) => (
            <button key={i} onClick={() => onMove({ gameId: game.id, move: 'guess', guessIndex: i })}
              className="w-full px-4 py-3 mb-2 rounded-xl bg-white/5 border border-white/10 text-sm text-left hover:bg-primary/20">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ═══ EN ATTENTE (pendant que l'autre devine) ═══ */}
      {game.phase === 'guessing' && isWriter && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            En attente que <PlayerName id={game.players.find(p => p !== currentUserId) || ''} players={players} /> devine...
          </p>
        </div>
      )}

      {/* ═══ RESULTAT ═══ */}
      {game.phase === 'result' && game.lastResult && (
        <div>
          <div className={`p-3 rounded-xl mb-3 ${game.lastResult.correct ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
            <p className="text-sm font-semibold mb-1">{game.lastResult.correct ? "Bonne reponse ! +100 pts" : "Mauvaise reponse..."}</p>
            <p className="text-[11px] text-muted-foreground">La verite etait : {game.lastResult.statements?.[game.lastResult.truthIndex]}</p>
          </div>
          {game.lastResult.statements && (
            <div className="space-y-1">
              {game.lastResult.statements.map((s: string, i: number) => (
                <div key={i} className={`px-3 py-2 rounded-lg text-xs ${i === game.lastResult.truthIndex ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/10 border border-red-500/20'}`}>
                  {i === game.lastResult.truthIndex ? '✅ Verite' : '❌ Mensonge'} : {s}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </GenericGameWrapper>
  );
}

// ══════════════════════════════════════
// MÉMOIRE FLASH GAME
// ══════════════════════════════════════

const MF_COLORS: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
};

function MemoireFlashGame({
  game, currentUserId, players, onMove, onRematch, onClose,
}: {
  game: GameState; currentUserId: string; players: Record<string, GamePlayer>;
  onMove: (data: any) => void; onRematch: () => void; onClose: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const phase = game.phase ?? "idle";
  const sequence = game.sequence ?? [];
  const input = game.input ?? [];
  const result = game.lastResult;

  // Compte à rebours local basé sur deadline serveur
  useEffect(() => {
    if (!game.deadline) { setSecondsLeft(null); return; }
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((game.deadline! - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [game.deadline]);

  const send = (move: string, extra: Record<string, unknown> = {}) =>
    onMove({ gameId: game.id, move, ...extra });

  return (
    <GenericGameWrapper game={game} currentUserId={currentUserId} players={players} onMove={onMove} onRematch={onRematch} onClose={onClose} title="Mémoire Flash">
      <p className="text-[11px] text-muted-foreground mb-2">
        Manche {game.currentRound}/{game.maxRounds}
        {game.level ? <> · {game.level.label} · {game.level.len} couleurs · +{game.level.points} pts</> : null}
      </p>

      {phase === "show" && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-primary mb-2">Mémorise la séquence…</p>
          <div className="flex justify-center gap-1.5 flex-wrap mb-2">
            {sequence.map((c, i) => (
              <span key={i} className={`w-9 h-9 rounded-lg ${MF_COLORS[c] ?? "bg-white/20"}`} />
            ))}
          </div>
          {secondsLeft !== null && <p className="text-[10px] text-muted-foreground">Affichage : {secondsLeft}s</p>}
        </div>
      )}

      {phase === "reproduce" && (
        <div>
          <div className="flex justify-center gap-1.5 mb-3 min-h-[36px]">
            {Array.from({ length: (game.level?.len ?? 0) }).map((_, i) => (
              <span key={i} className={`w-9 h-9 rounded-lg ${input[i] ? MF_COLORS[input[i]] : "bg-white/10"}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {Object.keys(MF_COLORS).map((c) => (
              <button key={c} onClick={() => send("input", { color: c })}
                className={`h-11 rounded-xl ${MF_COLORS[c]} active:scale-95 transition-transform`} />
            ))}
          </div>
          <div className="flex justify-center gap-2">
            <button onClick={() => send("undo")} disabled={input.length === 0}
              className="px-4 py-2 rounded-lg bg-white/10 text-sm disabled:opacity-40">
              Effacer
            </button>
          </div>
          {secondsLeft !== null && <p className="text-[10px] text-muted-foreground mt-2">⏱ {secondsLeft}s</p>}
        </div>
      )}

      {phase === "feedback" && result && (
        <div className={`p-3 rounded-xl ${result.correct ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
          <p className="text-sm font-semibold mb-1">
            {result.correct ? `Parfait ! +${result.points} pts` : result.timedOut ? "Temps écoulé !" : "Raté !"}
          </p>
          <p className="text-[11px] text-muted-foreground mb-2">La séquence était :</p>
          <div className="flex justify-center gap-1.5">
            {(result.expected ?? []).map((c: string, i: number) => (
              <span key={i} className={`w-7 h-7 rounded ${MF_COLORS[c] ?? "bg-white/20"}`} />
            ))}
          </div>
        </div>
      )}

      {phase === "idle" && <p className="text-[11px] text-muted-foreground">La partie va commencer…</p>}
      <p className="text-[10px] text-muted-foreground mt-2">Adversaire : manche {game.opponent?.progress ?? 0}/{game.maxRounds}</p>
    </GenericGameWrapper>
  );
}

// ══════════════════════════════════════
// ACTION OU VÉRITÉ GAME
// ══════════════════════════════════════

function ActionVeriteGame({
  game, currentUserId, players, onMove, onRematch, onClose,
}: {
  game: GameState; currentUserId: string; players: Record<string, GamePlayer>;
  onMove: (data: any) => void; onRematch: () => void; onClose: () => void;
}) {
  const [promptInput, setPromptInput] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const send = (move: string, extra: Record<string, unknown> = {}) =>
    onMove({ gameId: game.id, move, ...extra });

  useEffect(() => { setPromptInput(""); setAnswerInput(""); }, [game.phase, game.round]);

  const choiceLabel = game.choice === "action" ? "Action" : "Vérité";
  const asker = <PlayerName id={game.asker || ""} players={players} />;
  const answerer = <PlayerName id={game.answerer || ""} players={players} />;

  return (
    <GenericGameWrapper game={game} currentUserId={currentUserId} players={players} onMove={onMove} onRematch={onRematch} onClose={onClose} title="Action ou Vérité">
      <p className="text-[11px] text-muted-foreground mb-2">Tour {game.currentRound}/{game.maxRounds}</p>

      {/* 1. CHOIX : le joueur questionne choisit Action ou Verite */}
      {game.phase === "choosing" && (
        <div>
          {game.amAnswerer ? (
            <>
              <p className="text-sm font-semibold mb-3 text-center">{asker} va te demander… choisis :</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => send("choose", { choice: "verite" })}
                  className="px-5 py-3 rounded-xl bg-blue-500/20 border border-blue-500/40 text-sm font-bold hover:bg-blue-500/30 transition-colors">Vérité</button>
                <button onClick={() => send("choose", { choice: "action" })}
                  className="px-5 py-3 rounded-xl bg-orange-500/20 border border-orange-500/40 text-sm font-bold hover:bg-orange-500/30 transition-colors">Action</button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">En attente : {answerer} choisit Vérité ou Action…</p>
          )}
        </div>
      )}

      {/* 2. REDACTION : l'autre ecrit la question / le defi */}
      {game.phase === "writing" && (
        <div>
          <p className="text-[11px] text-primary font-semibold mb-2 text-center">{answerer} a choisi : {choiceLabel}</p>
          {game.amAsker ? (
            <>
              <p className="text-sm mb-2">{game.choice === "verite" ? "Écris ta question :" : "Écris ton défi :"}</p>
              <textarea value={promptInput} onChange={(e) => setPromptInput(e.target.value)} maxLength={220} rows={3}
                placeholder={game.choice === "verite" ? "Ex : Quelle est ta plus grande peur ?" : "Ex : Imite une célébrité pendant 10 secondes…"}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/40 resize-none" />
              <button onClick={() => send("prompt", { text: promptInput })} disabled={promptInput.trim().length < 3}
                className="mt-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40">
                Envoyer la {choiceLabel.toLowerCase()}
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">En attente : {asker} écrit ta {choiceLabel.toLowerCase()}…</p>
          )}
        </div>
      )}

      {/* 3. REPONSE */}
      {game.phase === "answering" && (
        <div>
          <div className={`p-3 rounded-xl border mb-3 ${game.choice === "action" ? "bg-orange-500/10 border-orange-500/30" : "bg-blue-500/10 border-blue-500/30"}`}>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1 text-center">{choiceLabel}</p>
            <p className="text-sm font-medium text-center break-words">{game.prompt}</p>
          </div>
          {game.amAnswerer ? (
            game.choice === "verite" ? (
              <>
                <textarea value={answerInput} onChange={(e) => setAnswerInput(e.target.value)} maxLength={300} rows={3}
                  placeholder="Ta réponse… (elle sera envoyée à l'autre)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/40 resize-none" />
                <button onClick={() => send("respond", { text: answerInput })} disabled={!answerInput.trim()}
                  className="mt-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40">
                  Envoyer ma réponse
                </button>
              </>
            ) : (
              <div className="flex gap-2 justify-center">
                <button onClick={() => send("respond", { done: true })}
                  className="px-4 py-2.5 rounded-xl bg-green-500/20 border border-green-500/40 text-sm font-bold hover:bg-green-500/30 transition-colors">Je l'ai faite</button>
                <button onClick={() => send("respond", { done: false })}
                  className="px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-sm font-bold hover:bg-red-500/30 transition-colors">Je refuse</button>
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">En attente de la réponse de {answerer}…</p>
          )}
        </div>
      )}

      {/* 4. RESULTAT DU TOUR */}
      {game.phase === "result" && game.lastResult && (
        <div className="p-3 rounded-xl mb-2 bg-white/5 border border-white/10">
          <p className="text-sm font-semibold mb-1">
            {game.lastResult.choice === "verite" ? "Vérité répondue" : (game.lastResult.accepted ? "Action faite" : "Action refusée")} · +{game.lastResult.points} pts
          </p>
          <p className="text-[11px] text-muted-foreground">« {game.lastResult.prompt} »</p>
          <p className="text-[11px] text-muted-foreground mt-1">Réponse : {game.lastResult.answer}</p>
        </div>
      )}
    </GenericGameWrapper>
  );
}

// ══════════════════════════════════════
// MAIN GAME RENDERER
// ══════════════════════════════════════
export function GameRenderer({
  game, currentUserId, players, onMove, onRematch, onNextRound, onClose,
}: {
  game: GameState; currentUserId: string;
  players: Record<string, GamePlayer>;
  onMove: (data: any) => void;
  onRematch: () => void; onNextRound: () => void; onClose: () => void;
}) {
  const common = { currentUserId, players, onClose };
  switch (game.type) {
    case "reflex":
      return <ReflexGame game={game} {...common} onMove={(move) => onMove({ gameId: game.id, move })} />;
    case "tictactoe":
      return <TicTacToeGame game={game} {...common} onMove={(cellIndex) => onMove({ gameId: game.id, cellIndex })} />;
    case "rps":
      return <RPSGame game={game} {...common} onMove={(choice) => onMove({ gameId: game.id, choice })} onRematch={onRematch} onNextRound={onNextRound} />;
    case "dice":
      return <DiceGame game={game} {...common} onMove={(move) => onMove({ gameId: game.id, move })} onRematch={onRematch} onNextRound={onNextRound} />;
    case "quiz":
      return <QuizGame game={game} {...common} onMove={(data) => onMove({ gameId: game.id, ...data })} onRematch={onRematch} />;
    case "code_secret":
      return <CodeSecretGame game={game} {...common} onMove={(data) => onMove({ gameId: game.id, ...data })} onRematch={onRematch} />;
    case "mot_intrus":
      return <MotIntrusGame game={game} {...common} onMove={(data) => onMove({ gameId: game.id, ...data })} onRematch={onRematch} />;
    case "devine_ce_que_je_pense":
      return <DevineGame game={game} {...common} onMove={(data) => onMove({ gameId: game.id, ...data })} onRematch={onRematch} />;
    case "a_quel_point":
      return <AQuelPointGame game={game} {...common} onMove={(data) => onMove({ gameId: game.id, ...data })} onRematch={onRematch} />;
    case "deux_verites":
      return <DeuxVeritesGame game={game} {...common} onMove={(data) => onMove({ gameId: game.id, ...data })} onRematch={onRematch} />;
    case "memoire_flash":
      return <MemoireFlashGame game={game} {...common} onMove={(data) => onMove({ gameId: game.id, ...data })} onRematch={onRematch} />;
    case "action_verite":
      return <ActionVeriteGame game={game} {...common} onMove={(data) => onMove({ gameId: game.id, ...data })} onRematch={onRematch} />;
    default:
      return <p className="text-sm text-muted-foreground text-center">Jeu non supporté</p>;
  }
}
