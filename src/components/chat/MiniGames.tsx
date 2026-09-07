import { useState, useEffect, useRef, useCallback } from "react";
import * as LucideIcons from "lucide-react";
const { Zap, Brain, Hash, MousePointer, Gamepad2, X } = LucideIcons;

const DICE_EMOJI = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const RPS_EMOJI: Record<string, string> = { rock: "✊", paper: "✋", scissors: "✌️" };
const RPS_LABELS: Record<string, string> = { rock: "Pierre", paper: "Feuille", scissors: "Ciseaux" };

export type GameType = "reflex" | "tictactoe" | "rps" | "dice";

interface GamePlayer {
  _id: string;
  firstName: string;
  lastName: string;
}

interface GameState {
  id: string;
  type: GameType;
  players: string[];
  scores: Record<string, number>;
  currentRound: number;
  maxRounds: number;
  state: "waiting" | "playing" | "finished";
  winner?: string | "draw";
  createdBy?: string;
  // Reflex
  phase?: string;
  signalTime?: number | null;
  reactionTimes?: Record<string, number>;
  roundWinner?: string;
  // TicTacToe
  board?: (string | null)[];
  currentTurn?: string;
  marks?: Record<string, string>;
  isDraw?: boolean;
  // RPS
  choices?: Record<string, string>;
  // Dice
  mode?: string;
  dice?: Record<string, number[]>;
  total?: Record<string, number>;
}

// ═══════════════════════════════════════
// GAME MENU POPUP
// ═══════════════════════════════════════
export function GameMenu({ onSelect, onClose }: { onSelect: (type: GameType) => void; onClose: () => void }) {
  const games: { type: GameType; icon: string; name: string; desc: string }[] = [
    { type: "reflex", icon: "⚡", name: "Réflexe", desc: "Le plus rapide gagne" },
    { type: "tictactoe", icon: "❌⭕", name: "Morpion", desc: "Aligne 3 symboles" },
    { type: "rps", icon: "✋", name: "Pierre-Feuille-Ciseaux", desc: "Le classique" },
    { type: "dice", icon: "🎲", name: "Duel de dés", desc: "Meilleur score en 3 manches" },
  ];

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm">JOUER</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-2">
          {games.map(g => (
            <button key={g.type} onClick={() => { onSelect(g.type); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors text-left">
              <span className="text-xl">{g.icon}</span>
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

// ═══════════════════════════════════════
// GAME INVITE CARD (inside chat)
// ═══════════════════════════════════════
const GAME_NAMES: Record<GameType, string> = {
  reflex: "⚡ Réflexe",
  tictactoe: "❌⭕ Morpion",
  rps: "✋ Pierre-Feuille-Ciseaux",
  dice: "🎲 Duel de dés",
};

export function GameInviteCard({
  game, currentUserId, onAccept, onDecline,
}: {
  game: GameState;
  currentUserId: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const isFromMe = game.createdBy === currentUserId;
  return (
    <div className={`mx-auto max-w-[280px] rounded-xl border p-4 text-center ${
      isFromMe ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/10"
    }`}>
      <p className="text-lg mb-1">🎮 Défi</p>
      <p className="text-sm font-semibold mb-1">{GAME_NAMES[game.type]}</p>
      <p className="text-[11px] text-muted-foreground mb-3">
        {isFromMe ? "En attente de réponse..." : "Tu as été défié !"}
      </p>
      {!isFromMe && game.state === "waiting" && (
        <div className="flex gap-2 justify-center">
          <button onClick={onAccept} className="px-4 py-1.5 rounded-full bg-green-500 text-white text-xs font-semibold hover:bg-green-600">Accepter</button>
          <button onClick={onDecline} className="px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold hover:bg-white/20">Refuser</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// REFLEX GAME
// ═══════════════════════════════════════
function ReflexGame({
  game, currentUserId, players, onMove,
}: {
  game: GameState;
  currentUserId: string;
  players: Record<string, GamePlayer>;
  onMove: (move: string) => void;
}) {
  const p1 = game.players[0];
  const p2 = game.players[1];
  const name1 = players[p1]?.firstName || "Joueur 1";
  const name2 = players[p2]?.firstName || "Joueur 2";

  if (game.state === "finished") {
    const winnerName = game.winner === "draw" ? null : (players[game.winner as string]?.firstName || "???");
    return (
      <div className="mx-auto max-w-[300px] rounded-xl bg-white/5 border border-white/10 p-5 text-center">
        <p className="text-lg mb-3">🏆 FIN DU DUEL</p>
        <div className="flex justify-around mb-4">
          <div><p className="text-xs text-muted-foreground">{name1}</p><p className="text-2xl font-bold">{game.scores[p1]}</p></div>
          <div className="text-muted-foreground self-center">—</div>
          <div><p className="text-xs text-muted-foreground">{name2}</p><p className="text-2xl font-bold">{game.scores[p2]}</p></div>
        </div>
        <p className="text-sm font-semibold text-primary">
          {game.winner === "draw" ? "Match nul !" : `🔥 Victoire de ${winnerName}`}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[300px] rounded-xl bg-white/5 border border-white/10 p-5 text-center">
      <p className="text-sm font-semibold mb-2">⚡ DUEL DE RÉFLEXE</p>
      <p className="text-[11px] text-muted-foreground mb-3">Manche {game.currentRound}/{game.maxRounds}</p>
      <div className="flex justify-around mb-4">
        <div><p className="text-xs text-muted-foreground">{name1}</p><p className="text-xl font-bold">{game.scores[p1]}</p></div>
        <div><p className="text-xs text-muted-foreground">{name2}</p><p className="text-xl font-bold">{game.scores[p2]}</p></div>
      </div>

      {game.phase === "result" && game.roundWinner && (
        <div className="mb-3">
          {game.roundWinner === "false_start" ? (
            <p className="text-sm text-red-400">🚫 Faux départ !</p>
          ) : (
            <p className="text-sm">
              {game.roundWinner === currentUserId ? "✅ Tu es plus rapide !" : `${players[game.roundWinner]?.firstName || "???"} est plus rapide !`}
            </p>
          )}
          {game.reactionTimes && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {Object.entries(game.reactionTimes).map(([uid, time]) => `${players[uid]?.firstName}: ${time}ms`).join(" vs ")}
            </p>
          )}
        </div>
      )}

      {game.phase === "green" && (
        <button onClick={() => onMove("react")}
          className="w-full h-32 rounded-xl bg-green-500 text-white text-2xl font-bold animate-pulse hover:bg-green-600 active:scale-95 transition-all">
          MAINTENANT !
        </button>
      )}

      {game.phase === "waiting" && (
        <button onClick={() => onMove("false-start")}
          className="w-full h-32 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-lg font-semibold hover:bg-red-500/30 active:scale-95 transition-all">
          ATTENDS...
          <p className="text-[11px] mt-1 opacity-60">Appuie quand ça devient vert</p>
        </button>
      )}

      {game.phase === "idle" && (
        <p className="text-xs text-muted-foreground py-8">En attente du prochain round...</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// TIC-TAC-TOE GAME
// ═══════════════════════════════════════
function TicTacToeGame({
  game, currentUserId, players, onMove,
}: {
  game: GameState;
  currentUserId: string;
  players: Record<string, GamePlayer>;
  onMove: (cellIndex: number) => void;
}) {
  const p1 = game.players[0];
  const p2 = game.players[1];
  const name1 = players[p1]?.firstName || "Joueur 1";
  const name2 = players[p2]?.firstName || "Joueur 2";
  const myMark = game.marks?.[currentUserId];

  if (game.state === "finished") {
    return (
      <div className="mx-auto max-w-[280px] rounded-xl bg-white/5 border border-white/10 p-5 text-center">
        <p className="text-lg mb-3">🏆 FIN DU MORPION</p>
        <div className="flex justify-around mb-4">
          <div><p className="text-xs text-muted-foreground">{name1}</p><p className="text-2xl font-bold">{game.scores[p1]}</p></div>
          <div className="text-muted-foreground self-center">—</div>
          <div><p className="text-xs text-muted-foreground">{name2}</p><p className="text-2xl font-bold">{game.scores[p2]}</p></div>
        </div>
        <p className="text-sm font-semibold text-primary">
          {game.winner === "draw" ? "Match nul !" : game.winner === currentUserId ? "🏆 Tu gagnes !" : `${players[game.winner as string]?.firstName || "???"} gagne !`}
        </p>
      </div>
    );
  }

  const board = game.board || Array(9).fill(null);
  const isMyTurn = game.currentTurn === currentUserId;

  return (
    <div className="mx-auto max-w-[280px] rounded-xl bg-white/5 border border-white/10 p-5 text-center">
      <p className="text-sm font-semibold mb-1">❌⭕ MORPION</p>
      <p className="text-[11px] text-muted-foreground mb-3">
        Manche {game.currentRound}/{game.maxRounds} · Tu es <span className="font-bold text-primary">{myMark}</span>
      </p>
      <div className="flex justify-around mb-3">
        <div><p className="text-xs text-muted-foreground">{name1}</p><p className="text-lg font-bold">{game.scores[p1]}</p></div>
        <div><p className="text-xs text-muted-foreground">{name2}</p><p className="text-lg font-bold">{game.scores[p2]}</p></div>
      </div>
      <div className="grid grid-cols gap-1.5 mx-auto max-w-[210px] mb-3">
        {board.map((cell, i) => (
          <button key={i} onClick={() => isMyTurn && !cell && onMove(i)}
            className={`aspect-square rounded-lg text-2xl font-bold flex items-center justify-center transition-all ${
              cell ? "bg-white/10" : isMyTurn ? "bg-primary/20 hover:bg-primary/30 cursor-pointer" : "bg-white/5"
            } ${cell === "X" ? "text-primary" : cell === "O" ? "text-blue-400" : ""}`}>
            {cell || ""}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {isMyTurn ? "🟢 À toi de jouer" : "⏳ En attente..."}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════
// RPS GAME
// ═══════════════════════════════════════
function RPSGame({
  game, currentUserId, players, onMove, onRematch, onNextRound,
}: {
  game: GameState;
  currentUserId: string;
  players: Record<string, GamePlayer>;
  onMove: (choice: string) => void;
  onRematch: () => void;
  onNextRound: () => void;
}) {
  const p1 = game.players[0];
  const p2 = game.players[1];
  const name1 = players[p1]?.firstName || "Joueur 1";
  const name2 = players[p2]?.firstName || "Joueur 2";
  const myChoice = game.choices?.[currentUserId];

  if (game.state === "finished") {
    return (
      <div className="mx-auto max-w-[280px] rounded-xl bg-white/5 border border-white/10 p-5 text-center">
        <p className="text-lg mb-3">🏆 FIN</p>
        <div className="flex justify-around mb-4">
          <div><p className="text-xs text-muted-foreground">{name1}</p><p className="text-2xl font-bold">{game.scores[p1]}</p></div>
          <div className="text-muted-foreground self-center">—</div>
          <div><p className="text-xs text-muted-foreground">{name2}</p><p className="text-2xl font-bold">{game.scores[p2]}</p></div>
        </div>
        <p className="text-sm font-semibold text-primary mb-3">
          {game.winner === "draw" ? "Match nul !" : game.winner === currentUserId ? "🏆 Tu gagnes !" : `${players[game.winner as string]?.firstName || "???"} gagne !`}
        </p>
        <button onClick={onRematch} className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">Revanche</button>
      </div>
    );
  }

  if (game.phase === "revealed" && myChoice) {
    const oppChoice = game.choices?.[game.players.find(p => p !== currentUserId)!];
    return (
      <div className="mx-auto max-w-[280px] rounded-xl bg-white/5 border border-white/10 p-5 text-center">
        <p className="text-sm font-semibold mb-2">✋ MANCHE {game.currentRound}/{game.maxRounds}</p>
        <div className="flex justify-around mb-3">
          <div><p className="text-xs text-muted-foreground">{name1}</p><p className="text-xl font-bold">{game.scores[p1]}</p></div>
          <div><p className="text-xs text-muted-foreground">{name2}</p><p className="text-xl font-bold">{game.scores[p2]}</p></div>
        </div>
        <div className="flex justify-center items-center gap-6 mb-4">
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground">{name1}</p>
            <p className="text-4xl">{RPS_EMOJI[game.choices?.[p1] || ""]}</p>
          </div>
          <span className="text-xl font-bold text-muted-foreground">VS</span>
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground">{name2}</p>
            <p className="text-4xl">{RPS_EMOJI[game.choices?.[p2] || ""]}</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-primary mb-3">
          {game.roundWinner === "draw" ? "Égalité !" : game.roundWinner === currentUserId ? "✅ Tu gagnes !" : "❌ Tu perds !"}
        </p>
        <button onClick={onNextRound} className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">Manche suivante</button>
      </div>
    );
  }

  const choices = [
    { value: "rock", emoji: "✊", label: "Pierre" },
    { value: "paper", emoji: "✋", label: "Feuille" },
    { value: "scissors", emoji: "✌️", label: "Ciseaux" },
  ];

  return (
    <div className="mx-auto max-w-[280px] rounded-xl bg-white/5 border border-white/10 p-5 text-center">
      <p className="text-sm font-semibold mb-1">✋ MANCHE {game.currentRound}/{game.maxRounds}</p>
      <div className="flex justify-around mb-4">
        <div><p className="text-xs text-muted-foreground">{name1}</p><p className="text-lg font-bold">{game.scores[p1]}</p></div>
        <div><p className="text-xs text-muted-foreground">{name2}</p><p className="text-lg font-bold">{game.scores[p2]}</p></div>
      </div>
      <div className="flex justify-center gap-3 mb-3">
        {choices.map(c => (
          <button key={c.value} onClick={() => onMove(c.value)}
            className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95 ${
              myChoice === c.value ? "bg-primary/30 border-2 border-primary" : "bg-white/5 border border-white/10 hover:bg-white/10"
            }`}>
            <span className="text-2xl">{c.emoji}</span>
            <span className="text-[9px] text-muted-foreground">{c.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{myChoice ? "En attente de l'adversaire..." : "Choisis ton move !"}</p>
    </div>
  );
}

// ═══════════════════════════════════════
// DICE DUEL GAME
// ═══════════════════════════════════════
function DiceGame({
  game, currentUserId, players, onMove, onRematch,
}: {
  game: GameState;
  currentUserId: string;
  players: Record<string, GamePlayer>;
  onMove: (move: string) => void;
  onRematch: () => void;
}) {
  const p1 = game.players[0];
  const p2 = game.players[1];
  const name1 = players[p1]?.firstName || "Joueur 1";
  const name2 = players[p2]?.firstName || "Joueur 2";
  const myDice = game.dice?.[currentUserId];
  const myRoll = game.moves?.[currentUserId];

  if (game.state === "finished") {
    return (
      <div className="mx-auto max-w-[280px] rounded-xl bg-white/5 border border-white/10 p-5 text-center">
        <p className="text-lg mb-3">🏆 FIN DU DUEL DE DÉS</p>
        <div className="flex justify-around mb-4">
          <div><p className="text-xs text-muted-foreground">{name1}</p><p className="text-2xl font-bold">{game.scores[p1]}</p></div>
          <div className="text-muted-foreground self-center">—</div>
          <div><p className="text-xs text-muted-foreground">{name2}</p><p className="text-2xl font-bold">{game.scores[p2]}</p></div>
        </div>
        <p className="text-sm font-semibold text-primary mb-3">
          {game.winner === "draw" ? "Match nul !" : game.winner === currentUserId ? "🏆 Tu gagnes !" : `${players[game.winner as string]?.firstName || "???"} gagne !`}
        </p>
        <button onClick={onRematch} className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">Revanche</button>
      </div>
    );
  }

  if (game.phase === "done" && myDice) {
    const oppId = game.players.find(p => p !== currentUserId)!;
    const oppDice = game.dice?.[oppId] || [];
    const myTotal = game.total?.[currentUserId] || 0;
    const oppTotal = game.total?.[oppId] || 0;
    return (
      <div className="mx-auto max-w-[280px] rounded-xl bg-white/5 border border-white/10 p-5 text-center">
        <p className="text-sm font-semibold mb-2">🎲 MANCHE {game.currentRound}/{game.maxRounds}</p>
        <div className="flex justify-around mb-4">
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground">{name1}</p>
            <p className="text-3xl">{(game.dice?.[p1] || []).map(d => DICE_EMOJI[d - 1]).join(" ")}</p>
            <p className="text-lg font-bold mt-1">{game.total?.[p1] || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground">{name2}</p>
            <p className="text-3xl">{(game.dice?.[p2] || []).map(d => DICE_EMOJI[d - 1]).join(" ")}</p>
            <p className="text-lg font-bold mt-1">{game.total?.[p2] || 0}</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-primary mb-3">
          {game.roundWinner === "draw" ? "Égalité !" : game.roundWinner === currentUserId ? "✅ Tu gagnes !" : "❌ Tu perds !"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[280px] rounded-xl bg-white/5 border border-white/10 p-5 text-center">
      <p className="text-sm font-semibold mb-1">🎲 DUEL DE DÉS</p>
      <p className="text-[11px] text-muted-foreground mb-3">Manche {game.currentRound}/{game.maxRounds}</p>
      <div className="flex justify-around mb-4">
        <div><p className="text-xs text-muted-foreground">{name1}</p><p className="text-lg font-bold">{game.scores[p1]}</p></div>
        <div><p className="text-xs text-muted-foreground">{name2}</p><p className="text-lg font-bold">{game.scores[p2]}</p></div>
      </div>
      <button onClick={() => onMove("roll")} disabled={!!myRoll}
        className="w-full py-4 rounded-xl bg-primary text-primary-foreground text-lg font-bold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40">
        {myRoll ? "En attente..." : "🎲 LANCER"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN GAME RENDERER
// ═══════════════════════════════════════
export function GameRenderer({
  game, currentUserId, players, onMove, onRematch, onNextRound,
}: {
  game: GameState;
  currentUserId: string;
  players: Record<string, GamePlayer>;
  onMove: (data: any) => void;
  onRematch: () => void;
  onNextRound: () => void;
}) {
  switch (game.type) {
    case "reflex":
      return <ReflexGame game={game} currentUserId={currentUserId} players={players} onMove={(move) => onMove({ gameId: game.id, move })} />;
    case "tictactoe":
      return <TicTacToeGame game={game} currentUserId={currentUserId} players={players} onMove={(cellIndex) => onMove({ gameId: game.id, cellIndex })} />;
    case "rps":
      return <RPSGame game={game} currentUserId={currentUserId} players={players} onMove={(choice) => onMove({ gameId: game.id, choice })} onRematch={onRematch} onNextRound={onNextRound} />;
    case "dice":
      return <DiceGame game={game} currentUserId={currentUserId} players={players} onMove={(move) => onMove({ gameId: game.id, move })} onRematch={onRematch} />;
    default:
      return <p className="text-sm text-muted-foreground text-center">Jeu non supporté</p>;
  }
}
