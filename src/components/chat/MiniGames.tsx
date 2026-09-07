import { useState, useEffect, useRef } from "react";

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const RPS_EMOJI: Record<string, string> = { rock: "✊", paper: "✋", scissors: "✌️" };

export type GameType = "reflex" | "tictactoe" | "rps" | "dice";

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
export function GameMenu({ onSelect, onClose }: { onSelect: (type: GameType) => void; onClose: () => void }) {
  const games: { type: GameType; icon: string; name: string; desc: string }[] = [
    { type: "reflex", icon: "⚡", name: "Réflexe", desc: "Le plus rapide gagne" },
    { type: "tictactoe", icon: "❌", name: "Morpion", desc: "Aligne 3 symboles" },
    { type: "rps", icon: "✊", name: "Pierre-Feuille-Ciseaux", desc: "Le classique" },
    { type: "dice", icon: "🎲", name: "Duel de dés", desc: "Meilleur score en 3 manches" },
  ];

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="font-bold text-sm">🎮 JOUER</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">✕</button>
        </div>
        <div className="p-2">
          {games.map(g => (
            <button key={g.type} onClick={() => { onSelect(g.type); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors text-left">
              <span className="text-xl w-8 text-center">{g.icon}</span>
              <div>
                <p className="text-sm font-semibold">{g.name}</p>
                <p className="text-[11px] text-muted-foreground">{g.desc}</p>
              </div>
            </button>
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
  reflex: "⚡ Réflexe", tictactoe: "❌ Morpion",
  rps: "✊ Pierre-Feuille-Ciseaux", dice: "🎲 Duel de dés",
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
    default:
      return <p className="text-sm text-muted-foreground text-center">Jeu non supporté</p>;
  }
}
