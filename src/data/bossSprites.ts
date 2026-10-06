// Sheet do Rei Ceifador: quadros de 820x340 numa grade de 4 colunas, todos com
// os pés na linha `feetY` e alinhados horizontalmente em `feetX`.
export const REAPER_KING_SPRITE = {
  key: 'boss-reaper-king',
  path: 'assets/bosses/sprite_sheet_rei_ceifador.png',
  frameWidth: 820,
  frameHeight: 340,
  feetX: 300,
  feetY: 330,
  // Cerca de duas vezes a altura do jogador.
  scale: 1,
  animations: {
    idle: { start: 0, end: 3, frameRate: 4 },
    slash: { start: 4, end: 7, frameRate: 9 },
    summon: { start: 8, end: 8, frameRate: 1 },
    throwScythe: { start: 9, end: 10, frameRate: 6 },
    run: { start: 11, end: 14, frameRate: 10 },
  },
} as const;

// Foice espectral girando no arremesso da segunda fase.
export const SPECTRAL_SCYTHE_IMAGE = {
  key: 'boss-spectral-scythe',
  path: 'assets/bosses/foice_espectral.png',
} as const;

export type ReaperKingAnimation = keyof typeof REAPER_KING_SPRITE.animations;
