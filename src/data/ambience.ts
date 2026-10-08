import type { RoomId } from '../maps/types';

export const AMBIENCE = {
  prison: { key: 'ambience-prison', path: 'assets/audio/ambience/prisao_vento.wav', volume: 0.10 },
  sewer: { key: 'ambience-sewer', path: 'assets/audio/ambience/esgoto_agua.wav', volume: 0.12 },
} as const;
export const AMBIENCE_BOSS_FACTOR = 0.45;
export const AMBIENCE_FADE_MS = 1000;
export const ROOM_AMBIENCE: Record<RoomId, keyof typeof AMBIENCE> = {
  'prison-cell': 'prison',
  'prison-cell-block': 'prison',
  'prison-chain-well': 'prison',
  'prison-boss-lair': 'prison',
  'prison-drowned-galleries': 'sewer',
  'prison-sewers': 'sewer',
  'prison-root-arena': 'sewer',
};
