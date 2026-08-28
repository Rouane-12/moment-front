import beach from "@/assets/beach.jpg";
import restaurantImg from "@/assets/restaurant.jpg";
import gamingImg from "@/assets/gaming.jpg";
import rooftopImg from "@/assets/rooftop.jpg";
import nightCity from "@/assets/night-city.jpg";

export type Category =
  | "plage"
  | "food"
  | "gaming"
  | "bar"
  | "cinema"
  | "concert"
  | "culture"
  | "rooftop";

export type Venue = {
  id: string;
  name: string;
  category: Category;
  district: string;
  rating: number;
  reviews: number;
  pricePerPerson: number;
  durationMin: number;
  image: string;
  tagline: string;
  partner: boolean;
  x: number; // stylised map coords 0-100
  y: number;
};

export const VENUES: Venue[] = [
  {
    id: "v-sunset",
    name: "Sunset Beach Club",
    category: "plage",
    district: "Fidjrossè",
    rating: 4.6,
    reviews: 214,
    pricePerPerson: 3000,
    durationMin: 105,
    image: beach,
    tagline: "Transats, cocktails et coucher de soleil sur l'Atlantique",
    partner: true,
    x: 18,
    y: 74,
  },
  {
    id: "v-braise",
    name: "La Braise d'Or",
    category: "food",
    district: "Haie Vive",
    rating: 4.4,
    reviews: 389,
    pricePerPerson: 6500,
    durationMin: 90,
    image: restaurantImg,
    tagline: "Grillades, poisson braisé, ambiance feutrée",
    partner: true,
    x: 44,
    y: 52,
  },
  {
    id: "v-atinkanka",
    name: "Atinkanka Table",
    category: "food",
    district: "Cadjèhoun",
    rating: 4.7,
    reviews: 142,
    pricePerPerson: 8500,
    durationMin: 100,
    image: restaurantImg,
    tagline: "Cuisine béninoise contemporaine, menu groupe",
    partner: true,
    x: 33,
    y: 41,
  },
  {
    id: "v-arcade",
    name: "Pixel Arena",
    category: "gaming",
    district: "Ganhi",
    rating: 4.3,
    reviews: 96,
    pricePerPerson: 3000,
    durationMin: 75,
    image: gamingImg,
    tagline: "Consoles, simulateurs et tournois flash",
    partner: true,
    x: 62,
    y: 60,
  },
  {
    id: "v-rooftop",
    name: "Terrasse 9e",
    category: "rooftop",
    district: "Ganhi",
    rating: 4.5,
    reviews: 178,
    pricePerPerson: 5000,
    durationMin: 90,
    image: rooftopImg,
    tagline: "Desserts, DJ set doux et vue sur la lagune",
    partner: true,
    x: 71,
    y: 38,
  },
  {
    id: "v-live",
    name: "Kpanlingan Live",
    category: "concert",
    district: "Akpakpa",
    rating: 4.8,
    reviews: 311,
    pricePerPerson: 7000,
    durationMin: 120,
    image: nightCity,
    tagline: "Scène live afrobeat & percussions",
    partner: true,
    x: 82,
    y: 66,
  },
  {
    id: "v-cine",
    name: "Ciné Lagune",
    category: "cinema",
    district: "Cotonou Centre",
    rating: 4.2,
    reviews: 88,
    pricePerPerson: 4000,
    durationMin: 130,
    image: nightCity,
    tagline: "Salles neuves, séances tardives",
    partner: false,
    x: 52,
    y: 30,
  },
  {
    id: "v-bar",
    name: "Zémi Bar",
    category: "bar",
    district: "Jéricho",
    rating: 4.1,
    reviews: 205,
    pricePerPerson: 4500,
    durationMin: 85,
    image: rooftopImg,
    tagline: "Bar à cocktails, terrasse et vinyles",
    partner: true,
    x: 27,
    y: 57,
  },
  {
    id: "v-culture",
    name: "Fondation Zinsou",
    category: "culture",
    district: "Cotonou Centre",
    rating: 4.9,
    reviews: 132,
    pricePerPerson: 2000,
    durationMin: 70,
    image: nightCity,
    tagline: "Art contemporain béninois, nocturne le samedi",
    partner: false,
    x: 47,
    y: 20,
  },
  {
    id: "v-plage2",
    name: "Plage de l'Étoile",
    category: "plage",
    district: "Fidjrossè",
    rating: 4.3,
    reviews: 156,
    pricePerPerson: 2500,
    durationMin: 120,
    image: beach,
    tagline: "Ambiance décontractée, musique live le week-end",
    partner: true,
    x: 15,
    y: 78,
  },
  {
    id: "v-food2",
    name: "Le Petit Bistro",
    category: "food",
    district: "Cotonou Centre",
    rating: 4.5,
    reviews: 267,
    pricePerPerson: 7500,
    durationMin: 95,
    image: restaurantImg,
    tagline: "Cuisine française, vins sélectionnés",
    partner: true,
    x: 55,
    y: 35,
  },
  {
    id: "v-food3",
    name: "Saveurs d'Afrique",
    category: "food",
    district: "Akpakpa",
    rating: 4.6,
    reviews: 198,
    pricePerPerson: 5500,
    durationMin: 85,
    image: restaurantImg,
    tagline: "Spécialités ouest-africaines, ambiance chaleureuse",
    partner: true,
    x: 78,
    y: 58,
  },
  {
    id: "v-food4",
    name: "Chez Maman",
    category: "food",
    district: "Ganhi",
    rating: 4.8,
    reviews: 423,
    pricePerPerson: 4000,
    durationMin: 80,
    image: restaurantImg,
    tagline: "Cuisine familiale, portions généreuses",
    partner: false,
    x: 68,
    y: 55,
  },
  {
    id: "v-gaming2",
    name: "Game Zone",
    category: "gaming",
    district: "Cotonou Centre",
    rating: 4.4,
    reviews: 134,
    pricePerPerson: 3500,
    durationMin: 90,
    image: gamingImg,
    tagline: "VR, billard et jeux de société",
    partner: true,
    x: 58,
    y: 28,
  },
  {
    id: "v-gaming3",
    name: "Cyber Café",
    category: "gaming",
    district: "Haie Vive",
    rating: 4.2,
    reviews: 87,
    pricePerPerson: 2000,
    durationMin: 60,
    image: gamingImg,
    tagline: "PC gaming, tournois en ligne",
    partner: false,
    x: 40,
    y: 48,
  },
  {
    id: "v-rooftop2",
    name: "Sky Lounge",
    category: "rooftop",
    district: "Cotonou Centre",
    rating: 4.7,
    reviews: 289,
    pricePerPerson: 8000,
    durationMin: 100,
    image: rooftopImg,
    tagline: "Vue panoramique, cocktails signature",
    partner: true,
    x: 50,
    y: 25,
  },
  {
    id: "v-rooftop3",
    name: "Horizon Bar",
    category: "rooftop",
    district: "Jéricho",
    rating: 4.4,
    reviews: 167,
    pricePerPerson: 6000,
    durationMin: 85,
    image: rooftopImg,
    tagline: "Tapas, musique douce, coucher de soleil",
    partner: true,
    x: 30,
    y: 50,
  },
  {
    id: "v-concert2",
    name: "Jazz Club",
    category: "concert",
    district: "Cotonou Centre",
    rating: 4.6,
    reviews: 245,
    pricePerPerson: 5500,
    durationMin: 110,
    image: nightCity,
    tagline: "Jazz, blues et soirées acoustiques",
    partner: true,
    x: 48,
    y: 32,
  },
  {
    id: "v-concert3",
    name: "La Scène",
    category: "concert",
    district: "Haie Vive",
    rating: 4.5,
    reviews: 178,
    pricePerPerson: 6500,
    durationMin: 130,
    image: nightCity,
    tagline: "Artistes locaux, programmation variée",
    partner: true,
    x: 42,
    y: 56,
  },
  {
    id: "v-cinema2",
    name: "Plaza Cinéma",
    category: "cinema",
    district: "Ganhi",
    rating: 4.3,
    reviews: 156,
    pricePerPerson: 3500,
    durationMin: 140,
    image: nightCity,
    tagline: "Films récents, confort moderne",
    partner: false,
    x: 65,
    y: 45,
  },
  {
    id: "v-bar2",
    name: "Le Speakeasy",
    category: "bar",
    district: "Cotonou Centre",
    rating: 4.7,
    reviews: 312,
    pricePerPerson: 5500,
    durationMin: 90,
    image: rooftopImg,
    tagline: "Cocktails artisanaux, ambiance intimiste",
    partner: true,
    x: 53,
    y: 38,
  },
  {
    id: "v-bar3",
    name: "Beach Bar",
    category: "bar",
    district: "Fidjrossè",
    rating: 4.4,
    reviews: 189,
    pricePerPerson: 4000,
    durationMin: 80,
    image: beach,
    tagline: "Pieds dans le sable, rafraîchissements",
    partner: true,
    x: 20,
    y: 70,
  },
  {
    id: "v-bar4",
    name: "Pub Anglais",
    category: "bar",
    district: "Haie Vive",
    rating: 4.3,
    reviews: 145,
    pricePerPerson: 4500,
    durationMin: 75,
    image: rooftopImg,
    tagline: "Bière sur tapas, matchs sportifs",
    partner: true,
    x: 38,
    y: 58,
  },
  {
    id: "v-culture2",
    name: "Musée da Silva",
    category: "culture",
    district: "Cotonou Centre",
    rating: 4.8,
    reviews: 267,
    pricePerPerson: 1500,
    durationMin: 60,
    image: nightCity,
    tagline: "Histoire du Bénin, expositions temporaires",
    partner: false,
    x: 45,
    y: 22,
  },
  {
    id: "v-culture3",
    name: "Galerie d'Art",
    category: "culture",
    district: "Jéricho",
    rating: 4.5,
    reviews: 98,
    pricePerPerson: 2500,
    durationMin: 75,
    image: nightCity,
    tagline: "Art moderne, vernissages mensuels",
    partner: false,
    x: 25,
    y: 52,
  },
];

export const VIBES = [
  { id: "festif", label: "Festif", icon: "Flame" },
  { id: "chill", label: "Chill", icon: "PalmTree" },
  { id: "gaming", label: "Gaming", icon: "Gamepad2" },
  { id: "food", label: "Gastronomie", icon: "UtensilsCrossed" },
  { id: "cine", label: "Cinéma", icon: "Clapperboard" },
  { id: "romantique", label: "Romantique", icon: "Heart" },
  { id: "concert", label: "Concert", icon: "Music" },
  { id: "culture", label: "Culture", icon: "Palette" },
] as const;

export const TRANSPORTS = [
  { id: "voiture", label: "Voiture", icon: "Car" },
  { id: "moto", label: "Zem / moto", icon: "Bike" },
  { id: "taxi", label: "Taxi", icon: "Taxi" },
  { id: "pied", label: "À pied", icon: "Footprints" },
  { id: "peu_importe", label: "Peu importe", icon: "Shuffle" },
] as const;

export const ROLL_THEMES: Record<
  number,
  { key: string; label: string; icon: string; categories: Category[] }
> = {
  1: { key: "chill", label: "Détente", icon: "Palmtree", categories: ["plage", "bar", "food"] },
  2: { key: "food", label: "Gastronomie", icon: "UtensilsCrossed", categories: ["food", "rooftop", "bar"] },
  3: { key: "fun", label: "Fun", icon: "Gamepad2", categories: ["gaming", "food", "bar"] },
  4: {
    key: "entertainment",
    label: "Divertissement",
    icon: "Clapperboard",
    categories: ["gaming", "food", "rooftop"],
  },
  5: { key: "night", label: "Soirée", icon: "Music", categories: ["food", "concert", "rooftop"] },
  6: { key: "surprise", label: "Surprise", icon: "Sparkles", categories: ["culture", "food", "concert"] },
};

export type MomentParams = {
  city: string;
  people: number;
  budgetPerPerson: number;
  when: string;
  startTime: string;
  vibes: string[];
  transport: string;
  roll: number;
};

export type Step = {
  venue: Venue;
  start: string;
  end: string;
  price: number;
  distanceKm: number;
};

export type Moment = {
  id: string;
  title: string;
  theme: { key: string; label: string; emoji: string };
  steps: Step[];
  total: number;
  perPerson: number;
  score: number;
  distanceKm: number;
  adapted: boolean;
  params: MomentParams;
};

const TITLES: Record<string, string[]> = {
  chill: ["Coucher de Soleil", "Cotonou Zen", "Palmeraie & Brise"],
  food: ["Table Ouverte", "Braise & Co", "Goût de la Nuit"],
  fun: ["Manettes & Grillades", "Session Arcade", "Soirée Jeux"],
  entertainment: ["Écran Total", "Soirée Ciné", "Grand Jeu"],
  night: ["Afrobeat Nocturne", "Live & Tard", "Cotonou After"],
  surprise: ["Carte Blanche", "Le Détour", "Hasard Choisi"],
};

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addMinutes(time: string, minutes: number) {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const total = (h * 60 + m + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function dist(a: Venue, b: Venue) {
  const dx = (a.x - b.x) * 0.14;
  const dy = (a.y - b.y) * 0.14;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 10) / 10;
}

export function encodeParams(p: MomentParams) {
  return {
    city: p.city,
    people: p.people,
    budget: p.budgetPerPerson,
    when: p.when,
    start: p.startTime,
    vibes: p.vibes.join(","),
    transport: p.transport,
    roll: p.roll,
  };
}

export function composeMoment(params: MomentParams, variant = 0): Moment {
  const theme = ROLL_THEMES[params.roll] ?? ROLL_THEMES[1]!;
  const seed = hash(
    `${params.city}|${params.people}|${params.budgetPerPerson}|${params.when}|${params.vibes.join(",")}|${params.roll}|${variant}`,
  );
  const rand = rng(seed);
  const budgetTotal = params.budgetPerPerson * params.people;

  const vibeCats: Category[] = [];
  for (const v of params.vibes) {
    if (v === "food") vibeCats.push("food");
    if (v === "gaming") vibeCats.push("gaming");
    if (v === "chill") vibeCats.push("plage", "bar");
    if (v === "festif") vibeCats.push("concert", "rooftop");
    if (v === "cine") vibeCats.push("cinema");
    if (v === "romantique") vibeCats.push("rooftop", "food");
    if (v === "concert") vibeCats.push("concert");
    if (v === "culture") vibeCats.push("culture");
  }

  // Merge user vibe categories into the wanted list
  const wanted = [...theme.categories];
  for (const vc of vibeCats) {
    if (!wanted.includes(vc)) {
      wanted.push(vc);
    }
  }
  let adapted = false;

  const picked: Venue[] = [];
  for (const cat of wanted) {
    const pool = VENUES.filter(
      (v) => v.category === cat && !picked.some((p) => p.id === v.id),
    );
    let candidates = pool;
    if (candidates.length === 0) {
      // catégorie voisine : le moteur adapte légèrement le lancer
      const fallbackOrder: Category[] = ["food", "bar", "rooftop", "plage", "gaming"];
      candidates = VENUES.filter(
        (v) => fallbackOrder.includes(v.category) && !picked.some((p) => p.id === v.id),
      );
      adapted = true;
    }
    candidates = [...candidates].sort((a, b) => {
      const bonus = (v: Venue) => (vibeCats.includes(v.category) ? 0.5 : 0);
      return b.rating / 5 + bonus(b) - (a.rating / 5 + bonus(a)) + (rand() - 0.5) * 0.4;
    });
    if (candidates[0]) picked.push(candidates[0]);
  }

  // contrainte budget : on retire l'étape la plus chère si ça déborde
  let total = () => picked.reduce((s, v) => s + v.pricePerPerson * params.people, 0);
  // d'abord on tente une offre moins chère dans la même catégorie
  for (let i = 0; i < picked.length && total() > budgetTotal; i++) {
    const step = picked[i] as Venue;
    const cheaper = VENUES.filter(
      (v) =>
        v.category === step.category &&
        v.pricePerPerson < step.pricePerPerson &&
        !picked.some((p) => p.id === v.id),
    ).sort((a, b) => b.pricePerPerson - a.pricePerPerson)[0];
    if (cheaper) {
      picked[i] = cheaper;
      adapted = true;
    }
  }

  while (total() > budgetTotal && picked.length > 2) {
    const worst = [...picked].sort((a, b) => b.pricePerPerson - a.pricePerPerson)[0] as Venue;
    picked.splice(picked.indexOf(worst), 1);
    adapted = true;
  }

  // séquence optimale : on part du lieu le plus à l'ouest, puis plus proche voisin
  const ordered: Venue[] = [];
  const remaining = [...picked];
  remaining.sort((a, b) => a.x - b.x);
  let current = remaining.shift() as Venue;
  ordered.push(current);
  while (remaining.length) {
    const from = current;
    remaining.sort((a, b) => dist(from, a) - dist(from, b));
    current = remaining.shift() as Venue;
    ordered.push(current);
  }

  let clock = params.startTime;
  let distanceKm = 0;
  const steps: Step[] = ordered.map((venue, i) => {
    const travel = i === 0 ? 0 : dist(ordered[i - 1] as Venue, venue);
    distanceKm += travel;
    if (i > 0) clock = addMinutes(clock, Math.round(travel * 4) + 10);
    const start = clock;
    const end = addMinutes(start, venue.durationMin);
    clock = end;
    return {
      venue,
      start,
      end,
      price: venue.pricePerPerson * params.people,
      distanceKm: travel,
    };
  });

  const spent = steps.reduce((s, st) => s + st.price, 0);
  const budgetScore = Math.max(0, 1 - Math.abs(budgetTotal * 0.85 - spent) / budgetTotal);
  const ratingScore = steps.reduce((s, st) => s + st.venue.rating, 0) / (steps.length * 5);
  const distScore = Math.max(0, 1 - distanceKm / 25);
  const prefScore =
    steps.filter((st) => vibeCats.includes(st.venue.category)).length / steps.length;
  const score = Math.round(
    (budgetScore * 0.25 + distScore * 0.2 + ratingScore * 0.25 + prefScore * 0.2 + 0.1) * 100,
  );

  const titles = TITLES[theme.key] ?? ["Ton Moment"];

  return {
    id: `MOM-${(seed % 100000).toString().padStart(5, "0")}`,
    title: titles[Math.floor(rand() * titles.length)] ?? "Ton Moment",
    theme: { key: theme.key, label: theme.label, emoji: theme.emoji },
    steps,
    total: spent,
    perPerson: Math.round(spent / params.people),
    score: Math.min(98, Math.max(62, score)),
    distanceKm: Math.round(distanceKm * 10) / 10,
    adapted,
    params,
  };
}

export function formatFcfa(n: number) {
  return `${n.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} FCFA`;
}

export const CATEGORY_META: Record<Category, { label: string; icon: string }> = {
  plage: { label: "Plage", icon: "Waves" },
  food: { label: "Restaurant", icon: "UtensilsCrossed" },
  gaming: { label: "Gaming", icon: "Gamepad2" },
  bar: { label: "Bar", icon: "Wine" },
  cinema: { label: "Cinéma", icon: "Clapperboard" },
  concert: { label: "Concert", icon: "Music" },
  culture: { label: "Culture", icon: "Palette" },
  rooftop: { label: "Rooftop", icon: "Sunset" },
};
