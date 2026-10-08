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

// Raiz dos Condenados: as 10 animações do corpo de
// `public/assets/bosses/raiz_dos_condenados/` (células e escalas diferentes)
// normalizadas pela largura do corpo e alinhadas pelos pés. Quadros de
// 478x412, grade de 10 colunas. Índices de `active`/`fire` são relativos ao
// início de cada animação, como no manifesto.
export const ROOT_BOSS_SPRITE = {
  key: 'boss-root-of-condemned',
  path: 'assets/bosses/sprite_sheet_raiz_dos_condenados.png',
  frameWidth: 478,
  frameHeight: 412,
  feetY: 408,
  scale: 1.1,
  animations: {
    idle: { start: 0, end: 5, frameRate: 5 },
    crawl: { start: 6, end: 13, frameRate: 8 },
    bite: { start: 14, end: 25, frameRate: 12, active: [5, 7] },
    sweep: { start: 26, end: 37, frameRate: 11, active: [5, 7] },
    spit: { start: 38, end: 49, frameRate: 10, fire: 6 },
    cage: { start: 50, end: 61, frameRate: 10, active: [5, 8] },
    burrow: { start: 62, end: 69, frameRate: 9, intangibleFrom: 5 },
    emerge: { start: 70, end: 77, frameRate: 9, active: [2, 4] },
    hit: { start: 78, end: 81, frameRate: 10 },
    death: { start: 82, end: 93, frameRate: 8 },
  },
} as const;

// Monte de terra e raízes que segue o boss por baixo do chão (6 quadros).
export const ROOT_TRAIL_SPRITE = {
  key: 'boss-root-trail',
  path: 'assets/bosses/sprite_sheet_raiz_rastro.png',
  frameWidth: 425,
  frameHeight: 361,
  frames: 6,
  frameRate: 10,
  scale: 0.6,
} as const;

// Globo de lodo, ossos e pedras do cuspe (6 quadros girando).
export const ROOT_SPIT_SPRITE = {
  key: 'boss-root-spit',
  path: 'assets/bosses/sprite_sheet_raiz_cuspe.png',
  frameWidth: 151,
  frameHeight: 130,
  frameCount: 6,
  frameRate: 12,
  displayWidth: 64,
} as const;
