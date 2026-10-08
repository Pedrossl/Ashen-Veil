import type { RoomId } from '../maps/types';

// Desligados (soavam como chiado contínuo) e fora da build: os arquivos estão
// em 06_assets_nao_carregados/audio/ambience/. Para religar, gere a versão
// .m4a em public/assets/audio/ambience/, volte a carregá-los no PreloadScene
// e chame o sistema Ambience na PrisonScene.
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
