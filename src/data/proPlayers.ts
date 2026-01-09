import { ClashRoyaleCard } from '@/services/clashRoyaleApi';

// Lightweight profile interface - no deck data, fetched via API
export interface ProPlayerProfile {
  id: string;
  name: string;
  tag: string; // Real CR Player Tag (e.g., #Q982PQ)
  avatarUrl: string;
  archetype: string; // e.g., "Cycle", "Control", "Siege"
  playstyle: string; // Translation key
  specialty: string; // Translation key
}

// Real pro player tags
export const PRO_PLAYER_PROFILES: ProPlayerProfile[] = [
  {
    id: 'mohamed-light',
    name: 'Mohamed Light',
    tag: '#Q982PQ',
    avatarUrl: '/placeholder.svg',
    archetype: 'Cycle',
    playstyle: 'proPlayers.mohamedLight.playstyle',
    specialty: 'proPlayers.mohamedLight.specialty',
  },
  {
    id: 'morten',
    name: 'Morten',
    tag: '#R9J0',
    avatarUrl: '/placeholder.svg',
    archetype: 'Control',
    playstyle: 'proPlayers.morten.playstyle',
    specialty: 'proPlayers.morten.specialty',
  },
  {
    id: 'surgical-goblin',
    name: 'Surgical Goblin',
    tag: '#90L0',
    avatarUrl: '/placeholder.svg',
    archetype: 'Siege',
    playstyle: 'proPlayers.surgicalGoblin.playstyle',
    specialty: 'proPlayers.surgicalGoblin.specialty',
  },
  {
    id: 'ryley',
    name: 'Ryley',
    tag: '#2Y2J09',
    avatarUrl: '/placeholder.svg',
    archetype: 'Log Bait',
    playstyle: 'proPlayers.ryley.playstyle',
    specialty: 'proPlayers.ryley.specialty',
  },
  {
    id: 'ian77',
    name: 'Ian77',
    tag: '#2U00J8K',
    avatarUrl: '/placeholder.svg',
    archetype: 'Hog',
    playstyle: 'proPlayers.ian77.playstyle',
    specialty: 'proPlayers.ian77.specialty',
  },
];

// Legacy type alias for backward compatibility during migration
export type ProPlayer = ProPlayerProfile & {
  trophies?: number;
  signatureDeck?: ClashRoyaleCard[];
};

// Legacy export for components that haven't migrated yet
export const PRO_PLAYERS = PRO_PLAYER_PROFILES;
