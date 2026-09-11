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
  // Action ou Vérité
  avStatus?: "generating" | "ready";
  isMyTurn?: boolean;
  currentCard?: { kind: "verite" | "action"; text: string } | null;
  verdict?: { by: string; accepted: boolean } | null;
  skipsLeft?: number;
  canJudge?: boolean;
  canSkip?: boolean;
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

export function GameMenu({ onSelect, onClose }: { onSelect: (type: GameType) => void; onClose: () => void }) {
  const games: { type: GameType; icon: string; name: string; desc: string; category: string }[] = [
    // Jeux de reflexes
    { type: "reflex", icon: "Zap", name: "Le Reflexe", desc: "Le plus rapide gagne", category: "Reflexes" },
    { type: "dice", icon: "Dice1", name: "Duel de Des", desc: "Meilleur score en 3 manches", category: "Reflexes" },
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
    { type: "deux_verites", icon: "Mask", name: "Deux Verites, Un Mensonge", desc: "Trouvez le mensonge", category: "Bluff" },
    { type: "action_verite", icon: "Drama", name: "Action ou Verite", desc: "Cartes generees par l'IA", category: "Social" },
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
                  <button key={g.type} onClick={() => { onSelect(g.type); onClose(); }}
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
  deux_verites: "Deux Verites, Un Mensonge",
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
        <div className={game.scores[p1] > game.scores[p2] ? "text-primary" : ""}>
          <p className="text-[11px] text-muted-foreground"><PlayerName id={p1} players={players} /></p>
          <p className="text-xl font-bold">{game.scores[p1]}</p>
        </div>
        <div className={game.scores[p2] > game.scores[p1] ? "text-primary" : ""}>
          <p className="text-[11px] text-muted-foreground"><PlayerName id={p2} players={players} /></p>
          <p className="text-xl font-bold">{game.scores[p2]}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ══════════════════════════════════════
// CODE SECRET GAME
// ══════════════════════════════════════
const CS_SYMBOLS = ["🔴", "🟢", "🔵", "🟡", "🟣", "🟠"];

function CodeSecretGame({
  game, currentUserId, players, onMove, onRematch, onClose,
}: {
  game: GameState; currentUserId: string; players: Record<string, GamePlayer>;
  onMove: (data: any) => void; onRematch: () => void; onClose: () => void;
}) {
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);
  const isMyTurn = game.currentGuesser === currentUserId;
  
  const addSymbol = (symbol: string) => {
    if (currentGuess.length >= 4) return;
    setCurrentGuess([...currentGuess, symbol]);
  };
  
  const removeLast = () => {
    setCurrentGuess(currentGuess.slice(0, -1));
  };
  
  const submitGuess = () => {
    if (currentGuess.length !== 4) return;
    onMove({ gameId: game.id, move: "guess", guess: currentGuess });
    setCurrentGuess([]);
  };

  return (
    <GenericGameWrapper game={game} currentUserId={currentUserId} players={players} onMove={onMove} onRematch={onRematch} onClose={onClose} title="Le Code Secret">
      {game.attempts && game.attempts.length > 0 && (
        <div className="mb-4 space-y-1">
          {game.attempts.map((attempt: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-[10px] text-muted-foreground w-4">{i + 1}.</span>
              <div className="flex gap-1">
                {attempt.guess.map((s: string, j: number) => {
                  const result = attempt.result?.[j];
                  const bgColor = result?.status === 'correct' ? 'bg-green-500/30' :
                                  result?.status === 'wrong_position' ? 'bg-orange-500/30' : 'bg-white/10';
                  return <span key={j} className={`px-2 py-1 rounded ${bgColor}`}>{s}</span>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {isMyTurn && game.phase === 'guessing' && (
        <div>
          <div className="flex justify-center gap-2 mb-3">
            {currentGuess.map((s, i) => (
              <span key={i} className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg">{s}</span>
            ))}
            {Array.from({ length: 4 - currentGuess.length }).map((_, i) => (
              <span key={`empty-${i}`} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground text-xs">?</span>
            ))}
          </div>
          <div className="flex justify-center gap-2 mb-3">
            {CS_SYMBOLS.map(s => (
              <button key={s} onClick={() => addSymbol(s)} className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-lg transition-colors">{s}</button>
            ))}
          </div>
          <div className="flex justify-center gap-2">
            <button onClick={removeLast} className="px-4 py-2 rounded-lg bg-white/10 text-sm">Retour</button>
            <button onClick={submitGuess} disabled={currentGuess.length !== 4}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40">
              Valider
            </button>
          </div>
        </div>
      )}

      {game.phase === 'setting_code' && (
        <p className="text-[11px] text-muted-foreground">Le createur du code prepare la partie...</p>
      )}

      {!isMyTurn && game.phase === 'guessing' && (
        <p className="text-[11px] text-muted-foreground">En attente de l'adversaire...</p>
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
  const isSetting = game.phase === 'setting' && game.settingPlayer === currentUserId;
  const isAnswering = game.phase === 'answering';
  const question = game.currentQuestion;

  return (
    <GenericGameWrapper game={game} currentUserId={currentUserId} players={players} onMove={onMove} onRematch={onRematch} onClose={onClose} title="A quel point tu me connais ?">
      <p className="text-[11px] text-muted-foreground mb-3">Manche {game.currentRound}/{game.maxRounds}</p>

      {question && (
        <div className="mb-4">
          <p className="text-sm font-semibold mb-3">{question.text}</p>
          <div className="grid grid-cols-2 gap-2">
            {question.options.map((opt: string, i: number) => (
              <button key={i} onClick={() => {
                if (isSetting) onMove({ gameId: game.id, move: 'set_answer', questionId: question.id, answerIndex: i });
                else if (isAnswering) onMove({ gameId: game.id, move: 'answer', questionId: question.id, answerIndex: i });
              }}
                disabled={!isSetting && !isAnswering}
                className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-primary/20 hover:border-primary/40 transition-all disabled:opacity-50">
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {isSetting && <p className="text-[11px] text-primary">Choisissez votre reponse (l'autre devinera)</p>}
      {isAnswering && <p className="text-[11px] text-primary">Devinez la reponse de l'autre</p>}
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
  const [lieIndex, setLieIndex] = useState<number | null>(null);
  const isWriter = game.currentPlayer === currentUserId;

  return (
    <GenericGameWrapper game={game} currentUserId={currentUserId} players={players} onMove={onMove} onRematch={onRematch} onClose={onClose} title="Deux Verites, Un Mensonge">
      <p className="text-[11px] text-muted-foreground mb-3">Manche {game.currentRound}/{game.maxRounds}</p>

      {game.phase === 'writing' && isWriter && (
        <div>
          <p className="text-[11px] text-primary mb-2">Ecrivez 3 affirmations (2 vraies, 1 fausse)</p>
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
          <div className="flex gap-2 mb-3">
            {[0, 1, 2].map(i => (
              <button key={i} onClick={() => setLieIndex(i)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${lieIndex === i ? 'bg-red-500 text-white' : 'bg-white/5 text-muted-foreground'}`}>
                Mensonge {i + 1}
              </button>
            ))}
          </div>
          <button onClick={() => {
            if (statements.every(s => s.trim()) && lieIndex !== null) {
              onMove({ gameId: game.id, move: 'statements', statements, lieIndex });
              setStatements(["", "", ""]);
              setLieIndex(null);
            }
          }} disabled={!statements.every(s => s.trim()) || lieIndex === null}
            className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40">
            Valider
          </button>
        </div>
      )}

      {game.phase === 'guessing' && !isWriter && (
        <div>
          <p className="text-[11px] text-primary mb-2">Lequel est le mensonge ?</p>
          {game.currentStatements && game.currentStatements.map((s: string, i: number) => (
            <button key={i} onClick={() => onMove({ gameId: game.id, move: 'guess', guessIndex: i })}
              className="w-full px-4 py-3 mb-2 rounded-xl bg-white/5 border border-white/10 text-sm text-left hover:bg-primary/20">
              {s}
            </button>
          ))}
        </div>
      )}

      {game.phase === 'result' && game.lastResult && (
        <div className={`p-3 rounded-xl ${game.lastResult.correct ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
          <p className="text-sm font-semibold mb-1">{game.lastResult.correct ? "Correct !" : "Faux !"}</p>
          <p className="text-[11px] text-muted-foreground">Le mensonge etait: {game.lastResult.statements?.[game.lastResult.lieIndex]}</p>
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
  const card = game.currentCard;
  const lastResult = game.lastResult;
  const send = (move: string, extra: Record<string, unknown> = {}) =>
    onMove({ gameId: game.id, move, ...extra });

  if (game.avStatus === "generating") {
    return (
      <GenericGameWrapper game={game} currentUserId={currentUserId} players={players} onMove={onMove} onRematch={onRematch} onClose={onClose} title="Action ou Vérité">
        <div className="py-8 text-center">
          <LucideIcons.Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-sm">Génération des cartes par l'IA…</p>
          <p className="text-[10px] text-muted-foreground mt-1">Quelques secondes</p>
        </div>
      </GenericGameWrapper>
    );
  }

  return (
    <GenericGameWrapper game={game} currentUserId={currentUserId} players={players} onMove={onMove} onRematch={onRematch} onClose={onClose} title="Action ou Vérité">
      <p className="text-[11px] text-muted-foreground mb-2">Carte {game.currentRound}/{game.maxRounds}</p>

      {card && !game.verdict && (
        <div className="mb-3">
          <div className={`p-4 rounded-xl border mb-3 ${card.kind === "action" ? "bg-orange-500/10 border-orange-500/30" : "bg-blue-500/10 border-blue-500/30"}`}>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1 flex items-center gap-1 justify-center">
              {card.kind === "action" ? <LucideIcons.Zap className="h-3 w-3" /> : <LucideIcons.MessageCircle className="h-3 w-3" />}
              {card.kind === "action" ? "Action" : "Vérité"}
            </p>
            <p className="text-sm font-medium">{card.text}</p>
          </div>
          {game.isMyTurn ? (
            <p className="text-[11px] text-primary">À toi de jouer ! L'autre validera ta carte.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground text-center">Tu es le juge de ce tour</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => send("verdict", { accepted: true })}
                  className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-bold">Réussie</button>
                <button onClick={() => send("verdict", { accepted: false })}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold">Refusée</button>
              </div>
              {game.canSkip && (
                <div className="text-center">
                  <button onClick={() => send("skip")} className="text-[11px] text-muted-foreground underline">
                    Demander une autre carte ({game.skipsLeft ?? 0} restants)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!card && game.verdict && lastResult && (
        <div className={`p-3 rounded-xl mb-2 ${lastResult.accepted ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
          <p className="text-sm font-semibold">{lastResult.accepted ? `Carte réussie ! +${lastResult.points} pts` : "Carte refusée…"}</p>
          <p className="text-[11px] text-muted-foreground mt-1">« {lastResult.text} »</p>
        </div>
      )}

      {!card && !game.verdict && game.state === "playing" && (
        <p className="text-[11px] text-muted-foreground">Préparation de la carte suivante…</p>
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
