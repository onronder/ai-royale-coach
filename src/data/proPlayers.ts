import { ClashRoyaleCard } from '@/services/clashRoyaleApi';

export interface ProPlayer {
  id: string;
  name: string;
  tag: string;
  avatarUrl: string;
  trophies: number;
  signatureDeck: ClashRoyaleCard[];
  playstyle: string;
  specialty: string;
}

// Helper to create card objects with real CDN URLs
const createCard = (
  id: number,
  name: string,
  elixirCost: number,
  rarity: string,
  key: string // Card key for CDN URL
): ClashRoyaleCard => ({
  id,
  name,
  level: 14,
  maxLevel: 14,
  elixirCost,
  rarity,
  iconUrls: {
    medium: `https://cdn.royaleapi.com/static/img/cards-150/${key}.png`,
  },
});

// Mohamed Light's Log Bait deck
const logBaitDeck: ClashRoyaleCard[] = [
  createCard(1, 'Goblin Barrel', 3, 'Epic', 'goblin-barrel'),
  createCard(2, 'Princess', 3, 'Legendary', 'princess'),
  createCard(3, 'Knight', 3, 'Common', 'knight'),
  createCard(4, 'Rocket', 6, 'Rare', 'rocket'),
  createCard(5, 'Goblin Gang', 3, 'Common', 'goblin-gang'),
  createCard(6, 'Inferno Tower', 5, 'Rare', 'inferno-tower'),
  createCard(7, 'Ice Spirit', 1, 'Common', 'ice-spirit'),
  createCard(8, 'The Log', 2, 'Legendary', 'the-log'),
];

// Morten's Miner Control deck
const minerControlDeck: ClashRoyaleCard[] = [
  createCard(9, 'Miner', 3, 'Legendary', 'miner'),
  createCard(10, 'Poison', 4, 'Epic', 'poison'),
  createCard(11, 'Tesla', 4, 'Common', 'tesla'),
  createCard(12, 'Guards', 3, 'Epic', 'guards'),
  createCard(13, 'Electro Wizard', 4, 'Legendary', 'electro-wizard'),
  createCard(14, 'Prince', 5, 'Epic', 'prince'),
  createCard(15, 'The Log', 2, 'Legendary', 'the-log'),
  createCard(16, 'Fireball', 4, 'Rare', 'fireball'),
];

// Surgical Goblin's X-Bow 3.0 deck
const xbowDeck: ClashRoyaleCard[] = [
  createCard(17, 'X-Bow', 6, 'Epic', 'x-bow'),
  createCard(18, 'Tesla', 4, 'Common', 'tesla'),
  createCard(19, 'Archers', 3, 'Common', 'archers'),
  createCard(20, 'Ice Golem', 2, 'Rare', 'ice-golem'),
  createCard(21, 'Fireball', 4, 'Rare', 'fireball'),
  createCard(22, 'The Log', 2, 'Legendary', 'the-log'),
  createCard(23, 'Skeletons', 1, 'Common', 'skeletons'),
  createCard(24, 'Ice Spirit', 1, 'Common', 'ice-spirit'),
];

// Oyassuu's Classic Hog 2.6 Cycle deck
const hog26Deck: ClashRoyaleCard[] = [
  createCard(25, 'Hog Rider', 4, 'Rare', 'hog-rider'),
  createCard(26, 'Musketeer', 4, 'Rare', 'musketeer'),
  createCard(27, 'Ice Golem', 2, 'Rare', 'ice-golem'),
  createCard(28, 'Cannon', 3, 'Common', 'cannon'),
  createCard(29, 'Fireball', 4, 'Rare', 'fireball'),
  createCard(30, 'The Log', 2, 'Legendary', 'the-log'),
  createCard(31, 'Ice Spirit', 1, 'Common', 'ice-spirit'),
  createCard(32, 'Skeletons', 1, 'Common', 'skeletons'),
];

// Ryley's Log Bait Prince deck
const logBaitPrinceDeck: ClashRoyaleCard[] = [
  createCard(33, 'Goblin Barrel', 3, 'Epic', 'goblin-barrel'),
  createCard(34, 'Prince', 5, 'Epic', 'prince'),
  createCard(35, 'Rascals', 5, 'Common', 'rascals'),
  createCard(36, 'Goblin Gang', 3, 'Common', 'goblin-gang'),
  createCard(37, 'Princess', 3, 'Legendary', 'princess'),
  createCard(38, 'Rocket', 6, 'Rare', 'rocket'),
  createCard(39, 'The Log', 2, 'Legendary', 'the-log'),
  createCard(40, 'Dart Goblin', 3, 'Rare', 'dart-goblin'),
];

// Ian77's Hog Earthquake deck
const hogEQDeck: ClashRoyaleCard[] = [
  createCard(41, 'Hog Rider', 4, 'Rare', 'hog-rider'),
  createCard(42, 'Earthquake', 3, 'Rare', 'earthquake'),
  createCard(43, 'Valkyrie', 4, 'Rare', 'valkyrie'),
  createCard(44, 'Firecracker', 3, 'Common', 'firecracker'),
  createCard(45, 'Skeletons', 1, 'Common', 'skeletons'),
  createCard(46, 'Ice Spirit', 1, 'Common', 'ice-spirit'),
  createCard(47, 'The Log', 2, 'Legendary', 'the-log'),
  createCard(48, 'Cannon', 3, 'Common', 'cannon'),
];

export const PRO_PLAYERS: ProPlayer[] = [
  {
    id: 'mohamed-light',
    name: 'Mohamed Light',
    tag: '#LIGHT',
    avatarUrl: '/placeholder.svg',
    trophies: 9500,
    signatureDeck: logBaitDeck,
    playstyle: 'proPlayers.mohamedLight.playstyle',
    specialty: 'proPlayers.mohamedLight.specialty',
  },
  {
    id: 'oyassuu',
    name: 'Oyassuu',
    tag: '#OYASSUU',
    avatarUrl: '/placeholder.svg',
    trophies: 9300,
    signatureDeck: hog26Deck,
    playstyle: 'proPlayers.oyassuu.playstyle',
    specialty: 'proPlayers.oyassuu.specialty',
  },
  {
    id: 'morten',
    name: 'Morten',
    tag: '#MORTEN',
    avatarUrl: '/placeholder.svg',
    trophies: 9200,
    signatureDeck: minerControlDeck,
    playstyle: 'proPlayers.morten.playstyle',
    specialty: 'proPlayers.morten.specialty',
  },
  {
    id: 'ryley',
    name: 'Ryley',
    tag: '#RYLEY',
    avatarUrl: '/placeholder.svg',
    trophies: 9100,
    signatureDeck: logBaitPrinceDeck,
    playstyle: 'proPlayers.ryley.playstyle',
    specialty: 'proPlayers.ryley.specialty',
  },
  {
    id: 'ian77',
    name: 'Ian77',
    tag: '#IAN77',
    avatarUrl: '/placeholder.svg',
    trophies: 9050,
    signatureDeck: hogEQDeck,
    playstyle: 'proPlayers.ian77.playstyle',
    specialty: 'proPlayers.ian77.specialty',
  },
  {
    id: 'surgical-goblin',
    name: 'Surgical Goblin',
    tag: '#SURG',
    avatarUrl: '/placeholder.svg',
    trophies: 9000,
    signatureDeck: xbowDeck,
    playstyle: 'proPlayers.surgicalGoblin.playstyle',
    specialty: 'proPlayers.surgicalGoblin.specialty',
  },
];
