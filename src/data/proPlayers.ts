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

// Helper to create card objects
const createCard = (
  id: number,
  name: string,
  elixirCost: number,
  rarity: string
): ClashRoyaleCard => ({
  id,
  name,
  level: 14,
  maxLevel: 14,
  elixirCost,
  rarity,
  iconUrls: {
    medium: `/placeholder.svg`,
  },
});

// Mohamed Light's Log Bait deck
const logBaitDeck: ClashRoyaleCard[] = [
  createCard(1, 'Goblin Barrel', 3, 'Epic'),
  createCard(2, 'Princess', 3, 'Legendary'),
  createCard(3, 'Knight', 3, 'Common'),
  createCard(4, 'Rocket', 6, 'Rare'),
  createCard(5, 'Goblin Gang', 3, 'Common'),
  createCard(6, 'Inferno Tower', 5, 'Rare'),
  createCard(7, 'Ice Spirit', 1, 'Common'),
  createCard(8, 'The Log', 2, 'Legendary'),
];

// Morten's Miner Control deck
const minerControlDeck: ClashRoyaleCard[] = [
  createCard(9, 'Miner', 3, 'Legendary'),
  createCard(10, 'Poison', 4, 'Epic'),
  createCard(11, 'Tesla', 4, 'Common'),
  createCard(12, 'Guards', 3, 'Epic'),
  createCard(13, 'Electro Wizard', 4, 'Legendary'),
  createCard(14, 'Prince', 5, 'Epic'),
  createCard(15, 'The Log', 2, 'Legendary'),
  createCard(16, 'Fireball', 4, 'Rare'),
];

// Surgical Goblin's X-Bow 3.0 deck
const xbowDeck: ClashRoyaleCard[] = [
  createCard(17, 'X-Bow', 6, 'Epic'),
  createCard(18, 'Tesla', 4, 'Common'),
  createCard(19, 'Archers', 3, 'Common'),
  createCard(20, 'Ice Golem', 2, 'Rare'),
  createCard(21, 'Fireball', 4, 'Rare'),
  createCard(22, 'The Log', 2, 'Legendary'),
  createCard(23, 'Skeletons', 1, 'Common'),
  createCard(24, 'Ice Spirit', 1, 'Common'),
];

// Oyassuu's Classic Hog 2.6 Cycle deck
const hog26Deck: ClashRoyaleCard[] = [
  createCard(25, 'Hog Rider', 4, 'Rare'),
  createCard(26, 'Musketeer', 4, 'Rare'),
  createCard(27, 'Ice Golem', 2, 'Rare'),
  createCard(28, 'Cannon', 3, 'Common'),
  createCard(29, 'Fireball', 4, 'Rare'),
  createCard(30, 'The Log', 2, 'Legendary'),
  createCard(31, 'Ice Spirit', 1, 'Common'),
  createCard(32, 'Skeletons', 1, 'Common'),
];

// Ryley's Log Bait Prince deck
const logBaitPrinceDeck: ClashRoyaleCard[] = [
  createCard(33, 'Goblin Barrel', 3, 'Epic'),
  createCard(34, 'Prince', 5, 'Epic'),
  createCard(35, 'Rascals', 5, 'Common'),
  createCard(36, 'Goblin Gang', 3, 'Common'),
  createCard(37, 'Princess', 3, 'Legendary'),
  createCard(38, 'Rocket', 6, 'Rare'),
  createCard(39, 'The Log', 2, 'Legendary'),
  createCard(40, 'Dart Goblin', 3, 'Rare'),
];

// Ian77's Hog Earthquake deck
const hogEQDeck: ClashRoyaleCard[] = [
  createCard(41, 'Hog Rider', 4, 'Rare'),
  createCard(42, 'Earthquake', 3, 'Rare'),
  createCard(43, 'Valkyrie', 4, 'Rare'),
  createCard(44, 'Firecracker', 3, 'Common'),
  createCard(45, 'Skeletons', 1, 'Common'),
  createCard(46, 'Ice Spirit', 1, 'Common'),
  createCard(47, 'The Log', 2, 'Legendary'),
  createCard(48, 'Cannon', 3, 'Common'),
];

export const PRO_PLAYERS: ProPlayer[] = [
  {
    id: 'mohamed-light',
    name: 'Mohamed Light',
    tag: '#LIGHT',
    avatarUrl: '/placeholder.svg',
    trophies: 9500,
    signatureDeck: logBaitDeck,
    playstyle: 'Aggressive bait specialist who punishes every mistake with pixel-perfect Goblin Barrels',
    specialty: 'Bridge Spammer',
  },
  {
    id: 'oyassuu',
    name: 'Oyassuu',
    tag: '#OYASSUU',
    avatarUrl: '/placeholder.svg',
    trophies: 9300,
    signatureDeck: hog26Deck,
    playstyle: 'Legendary cycle master who out-rotates every deck with lightning-fast Hog Riders',
    specialty: 'Cycle Master',
  },
  {
    id: 'morten',
    name: 'Morten',
    tag: '#MORTEN',
    avatarUrl: '/placeholder.svg',
    trophies: 9200,
    signatureDeck: minerControlDeck,
    playstyle: 'Patient controller who wears down opponents with relentless Miner chip damage',
    specialty: 'Defensive Wall',
  },
  {
    id: 'ryley',
    name: 'Ryley',
    tag: '#RYLEY',
    avatarUrl: '/placeholder.svg',
    trophies: 9100,
    signatureDeck: logBaitPrinceDeck,
    playstyle: 'Aggressive bait player who applies dual-lane pressure with Prince and Rascals',
    specialty: 'Bait Specialist',
  },
  {
    id: 'ian77',
    name: 'Ian77',
    tag: '#IAN77',
    avatarUrl: '/placeholder.svg',
    trophies: 9050,
    signatureDeck: hogEQDeck,
    playstyle: 'Building destroyer who melts towers with perfectly timed Earthquakes',
    specialty: 'Earthquake King',
  },
  {
    id: 'surgical-goblin',
    name: 'Surgical Goblin',
    tag: '#SURG',
    avatarUrl: '/placeholder.svg',
    trophies: 9000,
    signatureDeck: xbowDeck,
    playstyle: 'Calculated siege player who locks X-Bows at the perfect moment',
    specialty: 'Siege Master',
  },
];
