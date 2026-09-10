import { useState } from "react";
import * as LucideIcons from "lucide-react";
import type { GameMetadata } from "./GameCatalog";

const iconMap: Record<string, any> = {
  Brain: LucideIcons.Brain,
  Zap: LucideIcons.Zap,
  Lock: LucideIcons.Lock,
  Search: LucideIcons.Search,
  Hash: LucideIcons.Hash,
  KeyRound: LucideIcons.KeyRound,
  DoorOpen: LucideIcons.DoorOpen,
  Eye: LucideIcons.Eye,
  ScanEye: LucideIcons.ScanEye,
  Lightbulb: LucideIcons.Lightbulb,
  Heart: LucideIcons.Heart,
  Mask: LucideIcons.Mask,
  Timer: LucideIcons.Timer,
  PlayingCard: LucideIcons.Club,
  Target: LucideIcons.Target,
  Hand: LucideIcons.Hand,
  Users: LucideIcons.Users,
  Dice1: LucideIcons.Dice1,
  X: LucideIcons.X,
  ChevronRight: LucideIcons.ChevronRight,
  Gamepad2: LucideIcons.Gamepad2,
};

interface GameCardProps {
  game: GameMetadata;
  onStart: () => void;
  onClose?: () => void;
}

export function GameCard({ game, onStart, onClose }: GameCardProps) {
  const [showRules, setShowRules] = useState(false);
  const IconComponent = iconMap[game.icon] || LucideIcons.Gamepad2;

  const genreColors: Record<string, string> = {
    logique: "text-blue-400 bg-blue-500/20",
    culture: "text-purple-400 bg-purple-500/20",
    social: "text-pink-400 bg-pink-500/20",
    reflexes: "text-orange-400 bg-orange-500/20",
    strategie: "text-green-400 bg-green-500/20",
    bluff: "text-red-400 bg-red-500/20",
  };

  const genreLabels: Record<string, string> = {
    logique: "Logique",
    culture: "Culture",
    social: "Social",
    reflexes: "Reflexes",
    strategie: "Strategie",
    bluff: "Bluff",
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#111] rounded-2xl max-w-sm w-full border border-white/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative p-5 text-center border-b border-white/10">
          {onClose && (
            <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <LucideIcons.X className="h-5 w-5" />
            </button>
          )}
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
            <IconComponent className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-bold mb-1">{game.name}</h2>
          <div className="flex items-center justify-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${genreColors[game.genre] || "text-gray-400 bg-gray-500/20"}`}>
              {genreLabels[game.genre] || game.genre}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {game.minPlayers === game.maxPlayers
                ? `${game.minPlayers} joueur${game.minPlayers > 1 ? "s" : ""}`
                : `${game.minPlayers}-${game.maxPlayers} joueurs`}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="p-5">
          <p className="text-sm text-muted-foreground text-center mb-4 leading-relaxed">
            {game.description}
          </p>

          {/* Rules Toggle */}
          <button
            onClick={() => setShowRules(!showRules)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mb-4"
          >
            <span className="text-sm font-medium">Comment jouer</span>
            <LucideIcons.ChevronRight
              className={`h-4 w-4 transition-transform ${showRules ? "rotate-90" : ""}`}
            />
          </button>

          {/* Rules List */}
          {showRules && (
            <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <ol className="space-y-2">
                {game.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ol>
              {game.tips && game.tips.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-[10px] font-medium text-primary mb-1">Conseils</p>
                  {game.tips.map((tip, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">- {tip}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={onStart}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <LucideIcons.Gamepad2 className="h-5 w-5" />
            Lancer la partie
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact game card for lists
interface GameListItemProps {
  game: GameMetadata;
  onClick: () => void;
}

export function GameListItem({ game, onClick }: GameListItemProps) {
  const IconComponent = iconMap[game.icon] || LucideIcons.Gamepad2;

  const genreColors: Record<string, string> = {
    logique: "text-blue-400",
    culture: "text-purple-400",
    social: "text-pink-400",
    reflexes: "text-orange-400",
    strategie: "text-green-400",
    bluff: "text-red-400",
  };

  return (
    <button
      onClick={onClick}
      className="w-full p-4 flex items-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
        <IconComponent className={`h-6 w-6 ${genreColors[game.genre] || "text-primary"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{game.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{game.description}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[10px] text-muted-foreground">
          {game.minPlayers === game.maxPlayers
            ? `${game.minPlayers}j`
            : `${game.minPlayers}-${game.maxPlayers}j`}
        </p>
      </div>
    </button>
  );
}
