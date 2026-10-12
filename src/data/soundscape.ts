import type { RoomId } from '../maps/types';

export const MUSIC = {
  exploration: { key: 'music-exploration', path: 'assets/audio/music/exploracao_cinzas.m4a', volume: 0.09 },
  reaper: { key: 'music-reaper', path: 'assets/audio/music/ceifador_lamento.m4a', volume: 0.13 },
  root: { key: 'music-root', path: 'assets/audio/music/raiz_profundezas.m4a', volume: 0.13 },
} as const;
// Trilha de luta de cada arena (toca quando o boss desperta).
export const BOSS_MUSIC: Partial<Record<RoomId, keyof typeof MUSIC>> = {
  'prison-boss-lair': 'reaper',
  'prison-root-arena': 'root',
  'prison-surgical-theater': 'reaper',
};
export const LOCAL_AMBIENCE = {
  fire: { key: 'local-fire', path: 'assets/audio/ambience/fogo_proximo.m4a', volume: 0.10 },
  chains: { key: 'local-chains', path: 'assets/audio/ambience/correntes_distantes.m4a', volume: 0.08 },
} as const;
export const SOUNDSCAPE = { radius: 650, fadeMs: 900, combatAmbienceFactor: 0.45 };
