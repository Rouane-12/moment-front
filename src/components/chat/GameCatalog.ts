/**
 * Game Catalog - Central registry of all games
 * Categories: 'duo' (2 players), 'multi' (3+ players), 'both'
 */

export type GameCategory = 'duo' | 'multi' | 'both';
export type GameGenre = 'logique' | 'culture' | 'social' | 'reflexes' | 'strategie' | 'bluff';

export interface GameMetadata {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  category: GameCategory;
  genre: GameGenre;
  minPlayers: number;
  maxPlayers: number;
  description: string;
  rules: string[];
  tips?: string[];
}

export const GAME_CATALOG: GameMetadata[] = [
  // ══════════════════════════════════════
  // JEUX DE CULTURE
  // ══════════════════════════════════════
  {
    id: 'quiz',
    name: 'Quiz Culture',
    icon: 'Brain',
    category: 'both',
    genre: 'culture',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Testez vos connaissances avec des questions de culture generale. 20 questions, 4 reponses, points selon la difficulte.',
    rules: [
      'Chaque joueur repond a 20 questions',
      'Chaque question a 4 propositions',
      '20 secondes par question',
      'Points : Facile +100, Moyen +200, Difficile +300, Tres difficile +500',
      'Celui qui a le plus de points gagne',
    ],
    tips: ['Reflechissez vite mais ne vous precipitez pas', 'Les questions difficiles valent plus de points'],
  },
  {
    id: 'buzzer_quiz',
    name: 'Quiz Buzzer',
    icon: 'Zap',
    category: 'multi',
    genre: 'culture',
    minPlayers: 3,
    maxPlayers: 5,
    description: 'Quiz multijoueur en mode buzzer. Le premier a buzzer peut repondre. Vitesse + connaissances = victoire.',
    rules: [
      '3 a 5 joueurs en meme temps',
      'La question est affichee a tous',
      'Le premier a buzzer peut repondre',
      'Bonne reponse = points',
      'Mauvaise reponse = les autres peuvent buzzer',
      '20 secondes pour buzzer, 10 pour repondre',
    ],
    tips: ['Ne buzzez pas si vous ne savez pas', 'La vitesse compte autant que le savoir'],
  },

  // ══════════════════════════════════════
  // JEUX DE LOGIQUE
  // ══════════════════════════════════════
  {
    id: 'code_secret',
    name: 'Le Code Secret',
    icon: 'Lock',
    category: 'duo',
    genre: 'logique',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Devinez un code cache en 4 symboles. Chaque tentative donne des indices sur les symboles corrects.',
    rules: [
      'Un joueur cree un code de 4 symboles',
      'L\'autre propose des combinaisons',
      'Vert = bon symbole, bonne position',
      'Orange = bon symbole, mauvaise position',
      'Gris = symbole absent',
      '6 tentatives maximum',
    ],
    tips: ['Eliminez les symboles un par un', 'Notez vos tentatives precedentes'],
  },
  {
    id: 'mot_intrus',
    name: 'Le Mot Intrus',
    icon: 'Search',
    category: 'both',
    genre: 'logique',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Trouvez le mot qui ne fait pas partie du groupe. 5 mots, 1 intrus a trouver.',
    rules: [
      '5 mots sont affiches a l\'ecran',
      'Un seul mot ne fait pas partie du groupe',
      'Vous avez 30 secondes pour trouver',
      'Plus c\'est difficile, plus ca demande de reflexion',
      'Attention aux pieges semantiques',
    ],
    tips: ['Cherchez le lien entre les mots', 'Parfois c\'est la logique, parfois la culture'],
  },
  {
    id: 'suite_mystere',
    name: 'Suite Mystere',
    icon: 'Hash',
    category: 'both',
    genre: 'logique',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Decouvrez la logique derriere une suite de nombres et trouvez le suivant.',
    rules: [
      'Une suite de nombres est affichee',
      'Vous devez trouver le nombre suivant',
      'La difficulte augmente a chaque niveau',
      '30 secondes par question',
      '5 niveaux par partie',
    ],
    tips: ['Cherchez les differences entre les nombres', 'Parfois c\'est une multiplication, parfois une addition'],
  },
  {
    id: 'le_coffre',
    name: 'Le Coffre',
    icon: 'KeyRound',
    category: 'duo',
    genre: 'logique',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Trouvez le code d\'un coffre grace a des indices logiques. 3 chiffres a decouvrir.',
    rules: [
      'Un coffre avec 3 cadrans s\'affiche',
      'Des indices logiques sont donnes',
      'Exemple : "Le premier chiffre est superieur a 5"',
      'Vous avez 60 secondes pour trouver le code',
      'Plusieurs niveaux de difficulte',
    ],
    tips: ['Lisez bien tous les indices', 'Eliminez les impossibilites'],
  },
  {
    id: 'les_3_portes',
    name: 'Les 3 Portes',
    icon: 'DoorOpen',
    category: 'duo',
    genre: 'logique',
    minPlayers: 2,
    maxPlayers: 2,
    description: '3 portes s\'offrent a vous. Une seule contient le tresor. Decouvrez la bonne grace aux indices.',
    rules: [
      '3 portes : A, B et C',
      'Chaque porte donne un indice',
      'Une seule affirmation est vraie',
      'Vous devez determiner la bonne porte',
      '5 niveaux de difficulte',
    ],
    tips: ['Testez chaque hypothese', 'Si une affirmation est vraie, les autres sont fausses'],
  },

  // ══════════════════════════════════════
  // JEUX DE REFLEXES
  // ══════════════════════════════════════
  {
    id: 'reflexe',
    name: 'Le Reflexe',
    icon: 'Zap',
    category: 'duo',
    genre: 'reflexes',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Testez vos reflexes ! Quand l\'ecran devient vert, cliquez le plus vite possible.',
    rules: [
      'L\'ecran est rouge, puis devient vert',
      'Cliquez le plus vite possible quand c\'est vert',
      'Si vous cliquez avant = fausse demarrage',
      '3 manches, le plus rapide gagne',
    ],
    tips: ['Ne vous impatientez pas', 'Concentrez-vous sur la couleur'],
  },
  {
    id: 'memoire_flash',
    name: 'Memoire Flash',
    icon: 'Eye',
    category: 'both',
    genre: 'reflexes',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Memorisez la sequence de couleurs affichee puis reproduisez-la.',
    rules: [
      'Une sequence de couleurs s\'affiche 2 secondes',
      'Puis tout disparait',
      'Reproduisez la sequence dans l\'ordre',
      'La sequence devient plus longue a chaque niveau',
      '5 niveaux par partie',
    ],
    tips: ['Associez chaque couleur a un chiffre', 'Entrainez-vous a memoriser progressivement'],
  },
  {
    id: 'trouve_difference',
    name: 'Trouve la Difference',
    icon: 'ScanEye',
    category: 'both',
    genre: 'reflexes',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Dans une grille de symboles identiques, trouvez celui qui est different.',
    rules: [
      'Une grille de symboles s\'affiche',
      'Un seul symbole est different',
      'Trouvez-le le plus vite possible',
      'La grille devient plus grande',
      'La difference devient plus subtile',
    ],
    tips: ['Scannez la grille ligne par ligne', 'Le temps compte !'],
  },

  // ══════════════════════════════════════
  // JEUX SOCIAUX
  // ══════════════════════════════════════
  {
    id: 'devine_ce_que_je_pense',
    name: 'Devine ce que je pense',
    icon: 'Lightbulb',
    category: 'duo',
    genre: 'social',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Un joueur choisit un element secret, l\'autre pose des questions Oui/Non pour le deviner.',
    rules: [
      'Le Joueur A choisit un element (animal, objet, etc.)',
      'Le Joueur B pose des questions Oui/Non',
      'Le Joueur A repond uniquement Oui ou Non',
      'Limite de 20 questions',
      'Puis on inverse les roles',
    ],
    tips: ['Posez des questions qui eliminent des possibilities', 'Commencez par des questions generales'],
  },
  {
    id: 'a_quel_point',
    name: 'A quel point tu me connais ?',
    icon: 'Heart',
    category: 'duo',
    genre: 'social',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Testez la compatibilite ! Les deux joueurs repondent a des questions sur l\'autre.',
    rules: [
      'Chaque joueur repond a des questions sur l\'autre',
      'Exemple : "Quelle est ma nourriture favorite ?"',
      'Puis le jeu compare les reponses',
      'Score de compatibilite sur 10',
      'Plus on se connait, mieux c\'est',
    ],
    tips: ['Soyez honnete dans vos reponses', 'C\'est l\'occasion de decouvrir des choses'],
  },
  {
    id: 'deux_verites',
    name: 'Deux Verites, Un Mensonge',
    icon: 'Mask',
    category: 'duo',
    genre: 'bluff',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Chaque joueur ecrit 3 affirmations. L\'autre doit trouver le mensonge.',
    rules: [
      'Chaque joueur ecrit 3 affirmations sur lui',
      '2 sont vraies, 1 est fausse',
      'L\'autre doit trouver le mensonge',
      'Si bon = 1 point',
      '5 manches, le plus de points gagne',
    ],
    tips: ['Rendez les vraies affirmations surprenantes', 'Le mensonge doit etre credible'],
  },
  {
    id: '5_secondes',
    name: '5 Secondes',
    icon: 'Timer',
    category: 'both',
    genre: 'social',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Vous avez 5 secondes pour citer 3 elements d\'une categorie. Paniquez pas !',
    rules: [
      'Une categorie est affichee',
      'Vous devez citer 3 elements en 5 secondes',
      'Exemple : "Cite 3 pays d\'Afrique"',
      'L\'autre valide ou refuse les reponses',
      '5 manches, le plus de points gagne',
    ],
    tips: ['Ne cherchez pas la perfection', 'Vite et correct = points'],
  },

  // ══════════════════════════════════════
  // JEUX DE BLUFF / STRATEGIE
  // ══════════════════════════════════════
  {
    id: 'bluff',
    name: 'Le Bluff',
    icon: 'PlayingCard',
    category: 'duo',
    genre: 'bluff',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Annoncez des cartes et laissez l\'autre deviner si vous mentez ou pas.',
    rules: [
      'Chaque joueur recoit 3 cartes virtuelles',
      'Annoncez combien d\'un type de carte vous avez',
      'L\'autre peut vous croire ou vous defier',
      'Si vous mentez et etes pris = vous perdez',
      'Si vous dites vrai = l\'autre perd',
    ],
    tips: ['Mentez avec assurance', 'Ne bluffyez pas tout le temps'],
  },
  {
    id: 'le_plus_proche',
    name: 'Le Plus Proche',
    icon: 'Target',
    category: 'duo',
    genre: 'strategie',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Un nombre cible apparait. Choisissez un nombre entre 1 et 1000. Le plus proche gagne.',
    rules: [
      'Un nombre cible est affiche (1-1000)',
      'Chaque joueur choisit un nombre',
      'Celui qui est le plus proche gagne',
      '10 secondes pour choisir',
      '5 manches, le plus de points gagne',
    ],
    tips: ['Pensez a la psychologie de l\'adversaire', 'Les extremites sont risquees'],
  },
  {
    id: 'pierre_papier_ciseaux',
    name: 'Pierre, Papier, Ciseaux',
    icon: 'Hand',
    category: 'duo',
    genre: 'reflexes',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Le jeu classique ! Pierre bat Ciseaux, Ciseaux bat Papier, Papier bat Pierre.',
    rules: [
      'Choisissez Pierre, Papier ou Ciseaux',
      'Pierre bat Ciseaux',
      'Ciseaux bat Papier',
      'Papier bat Pierre',
      '5 manches, le plus de points gagne',
    ],
    tips: ['Observez les patterns de l\'adversaire', 'Ne rejouez jamais la meme chose'],
  },

  // ══════════════════════════════════════
  // JEUX MULTIJOUEUR SOCIAUX
  // ══════════════════════════════════════
  {
    id: 'linfiltre',
    name: "L'Infiltré",
    icon: 'Users',
    category: 'multi',
    genre: 'social',
    minPlayers: 4,
    maxPlayers: 12,
    description: 'Jeu de deduction sociale. Trouvez l\'infiltré parmi vous avant qu\'il n\'elimine tout le monde.',
    rules: [
      'Chaque joueur recoit un role secret',
      'Citoyens : eliminez les infiltres',
      'Infiltres : eliminez les citoyens sans etre decouverts',
      'Phase Nuit : les roles speciaux agissent',
      'Phase Jour : discussion puis vote',
      'Le jeu continue jusqu\'a ce qu\'un camp gagne',
    ],
    tips: ['Observiez les comportements', 'Les indices sont vos meilleurs allies'],
  },
  {
    id: 'dice_duel',
    name: 'Duel de Des',
    icon: 'Dice1',
    category: 'duo',
    genre: 'reflexes',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Lancez les des ! Le joueur avec le plus de points gagne la manche.',
    rules: [
      'Chaque joueur lance 2 des',
      'Le total le plus eleve gagne la manche',
      '3 manches au total',
      'En cas d\'egalite, on rejoue',
    ],
    tips: ['C\'est de la chance pure', 'Amusez-vous !'],
  },
];

// Helper functions
export function getGamesByCategory(category: GameCategory): GameMetadata[] {
  return GAME_CATALOG.filter(g => g.category === category || g.category === 'both');
}

export function getGamesByGenre(genre: GameGenre): GameMetadata[] {
  return GAME_CATALOG.filter(g => g.genre === genre);
}

export function getGameById(id: string): GameMetadata | undefined {
  return GAME_CATALOG.find(g => g.id === id);
}

export function getDuoGames(): GameMetadata[] {
  return GAME_CATALOG.filter(g => g.category === 'duo' || g.category === 'both');
}

export function getMultiGames(): GameMetadata[] {
  return GAME_CATALOG.filter(g => g.category === 'multi' || g.category === 'both');
}
