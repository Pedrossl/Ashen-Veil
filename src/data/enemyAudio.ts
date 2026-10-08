import type { ENEMIES } from './enemies';
import type { SoundEffect } from './audio';

// Cada família tem sua assinatura; alertas não são loops de idle.
export const ENEMY_AUDIO: Record<keyof typeof ENEMIES, { alert: SoundEffect; attack: SoundEffect; death: SoundEffect }> = {
  chainedPrisoner: { alert: 'prisonerAlert', attack: 'chainSweep', death: 'prisonerDeath' },
  veilJailer: { alert: 'jailerAlert', attack: 'jailerHook', death: 'jailerDeath' },
  shackleRat: { alert: 'ratAlert', attack: 'ratBite', death: 'ratDeath' },
  sludgeSupplicant: { alert: 'sludgeAlert', attack: 'sludgeThrow', death: 'sludgeDeath' },
};
