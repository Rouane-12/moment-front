import { useState, useRef, useEffect } from "react";
import * as LucideIcons from "lucide-react";
const { Smile, X } = LucideIcons;

const EMOJI_CATEGORIES = [
  {
    name: "Fréquents",
    emojis: ["😀", "😂", "😍", "🥰", "😎", "🤩", "😭", "🥺", "🔥", "❤️", "👍", "🙏", "✨", "💯", "🎉", "💪"],
  },
  {
    name: "Visages",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺", "🥹", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"],
  },
  {
    name: "Gestes",
    emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪"],
  },
  {
    name: "Cœurs",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟"],
  },
  {
    name: "Animaux",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞"],
  },
  {
    name: "Nourriture",
    emojis: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🍕", "🍔", "🍟", "🌭", "🍿", "🧂", "🥓", "🥚", "🍳", "🥞", "🧇", "🥓", "🍗", "🍖", "🥩", "🍝", "🍜", "🍛", "🍣", "🍱", "🥟", "🍤", "🍚", "🍙", "🍘", "🍥", "🥮", "🍡", "🍧", "🍨", "🍦", "☕", "🍵", "🧃", "🥤", "🍶", "🍺", "🍻", "🥂", "🍷", "🍸", "🍹", "🧉", "🍾"],
  },
  {
    name: "Activités",
    emojis: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "🎯", "🪩", "🎲", "🎮", "🎰", "🧩", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🪘", "🎷", "🎺", "🪗", "🎸", "🪕", "🎻"],
  },
  {
    name: "Objets",
    emojis: ["⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️"],
  },
  {
    name: "Symboles",
    emojis: ["💯", "🎉", "🎊", "✅", "☑️", "✔️", "❌", "❎", "➕", "➖", "➗", "✖️", "‼️", "⁉️", "❓", "❔", "❕", "❗", "‼️", "⁉️", "🔅", "🔆", "〽️", "⚠️", "🚸", "🔱", "⚜️", "🔰", "♻️", "✅", "🈯", "💹", "❇️", "✳️", "❎", "🌐", "💠", "Ⓜ️", "🌀", "💤", "🏧", "🚾", "♿", "🅿️", "🛗", "🈳", "🈶", "🉐", "🈹", "㊗️", "㊙️", "🈺", "🈵"],
  },
  {
    name: "Drapeaux",
    emojis: ["🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️", "🇺🇸", "🇬🇧", "🇫🇷", "🇩🇪", "🇮🇹", "🇪🇸", "🇧🇷", "🇯🇵", "🇰🇷", "🇨🇳", "🇮🇳", "🇷🇺", "🇨🇦", "🇦🇺", "🇲🇽", "🇳🇬", "🇧🇯", "🇿🇦", "🇪🇬", "🇰🇪", "🇹🇳", "🇲🇦"],
  },
];

type Props = {
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export function EmojiPicker({ onSelect, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const filteredCategories = search
    ? [{
        name: "Recherche",
        emojis: EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((_, i, arr) => arr.indexOf(_) === i),
      }]
    : EMOJI_CATEGORIES;

  return (
    <div ref={pickerRef}
      className="absolute bottom-full left-0 mb-2 w-[320px] sm:w-[360px] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <Smile className="h-4 w-4 text-primary" />
        <input type="text" placeholder="Rechercher un emoji..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 mx-2 px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary" />
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0.5 px-2 py-1.5 border-b border-white/10 overflow-x-auto">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button key={cat.name} onClick={() => { setActiveCategory(i); setSearch(""); }}
            className={`px-2 py-1 text-[10px] rounded-lg whitespace-nowrap transition-colors ${
              activeCategory === i && !search
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-white/5"
            }`}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 h-[200px] overflow-y-auto">
        <div className="grid grid-cols-8 gap-0.5">
          {(search ? filteredCategories[0].emojis : EMOJI_CATEGORIES[activeCategory]?.emojis || []).map((emoji, i) => (
            <button key={`${emoji}-${i}`} onClick={() => onSelect(emoji)}
              className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-white/10 transition-colors">
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
