// Sheet de inimigo comum: grade uniforme, todos os quadros com os pés na linha
// `feetY` e alinhados horizontalmente em `feetX` (origem e espelhamento usam isso).
export type EnemySpriteDefinition = {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  feetX: number;
  feetY: number;
  scale: number;
  animations: Record<EnemyAnimation, { start: number; end: number; frameRate: number }>;
  // Golpes: quadros de cada fase (aviso, acerto e recuperação). As durações
  // vêm da definição do golpe em data/enemies.ts.
  attacks: Record<string, { windup: readonly [number, number]; active: readonly [number, number]; recovery: readonly [number, number] }>;
};

export type EnemyAnimation = 'idle' | 'walk' | 'hit' | 'death';

// Prisioneiro acorrentado: quadros de 560x360 numa grade de 6 colunas.
export const CHAINED_PRISONER_SPRITE = {
  key: 'enemy-chained-prisoner',
  path: 'assets/enemies/sprite_sheet_morto_vivo_acorrentado.png',
  frameWidth: 560,
  frameHeight: 360,
  feetX: 250,
  feetY: 352,
  // Altura em tela parecida com a do jogador, um pouco mais curvado.
  scale: 0.49,
  animations: {
    idle: { start: 0, end: 3, frameRate: 5 },
    walk: { start: 4, end: 9, frameRate: 8 },
    hit: { start: 10, end: 10, frameRate: 1 },
    death: { start: 11, end: 14, frameRate: 7 },
  },
  attacks: {
    // Agacha com a corrente para trás e chicoteia na horizontal.
    sweep: { windup: [15, 18], active: [19, 22], recovery: [23, 26] },
    // Ergue a corrente acima da cabeça e esmaga no chão à frente.
    smash: { windup: [27, 31], active: [32, 34], recovery: [35, 38] },
  },
} as const satisfies EnemySpriteDefinition;

// Rato do Grilhão: as sheets de `01_sprites/inimigos/rato_do_grilhao` (a de
// mordida e a de dano vieram em escalas diferentes) normalizadas e alinhadas
// pelas patas. Quadros de 206x99, grade de 8 colunas.
export const SHACKLE_RAT_SPRITE = {
  key: 'enemy-shackle-rat',
  path: 'assets/enemies/sprite_sheet_rato_do_grilhao.png',
  frameWidth: 206,
  frameHeight: 99,
  feetX: 103,
  feetY: 96,
  scale: 0.95,
  animations: {
    idle: { start: 0, end: 7, frameRate: 6 },
    walk: { start: 8, end: 15, frameRate: 12 },
    hit: { start: 28, end: 31, frameRate: 12 },
    death: { start: 32, end: 39, frameRate: 10 },
  },
  attacks: {
    // Salto de mordida: baixa o corpo, salta com a boca aberta e aterrissa.
    bite: { windup: [16, 19], active: [20, 22], recovery: [23, 27] },
  },
} as const satisfies EnemySpriteDefinition;

// Suplicante do Lodo: as sheets de `01_sprites/inimigos/suplicante_do_lodo`
// (suplicando, caminhada manca, arremesso, dano e morte; a de dano veio maior)
// normalizadas pela altura em pé e alinhadas pelos pés. Quadros de 267x241,
// grade de 8 colunas.
export const SLUDGE_SUPPLICANT_SPRITE = {
  key: 'enemy-sludge-supplicant',
  path: 'assets/enemies/sprite_sheet_suplicante_do_lodo.png',
  frameWidth: 267,
  frameHeight: 241,
  feetX: 133,
  feetY: 238,
  scale: 0.67,
  animations: {
    idle: { start: 0, end: 7, frameRate: 5 },
    walk: { start: 8, end: 15, frameRate: 7 },
    hit: { start: 28, end: 31, frameRate: 10 },
    death: { start: 32, end: 39, frameRate: 8 },
  },
  attacks: {
    // Tira o detrito do cesto, ergue acima da cabeça, arremessa e recolhe.
    throw: { windup: [16, 20], active: [21, 22], recovery: [23, 27] },
  },
} as const satisfies EnemySpriteDefinition;

// Carcereiro do Véu: as sheets de `01_sprites/inimigos/carcereiro_do_veu`
// juntas, reduzidas à metade e normalizadas na mesma escala (a de dano veio
// desenhada maior). Quadros de 297x220, grade de 6 colunas.
export const VEIL_JAILER_SPRITE = {
  key: 'enemy-veil-jailer',
  path: 'assets/enemies/sprite_sheet_carcereiro_do_veu.png',
  frameWidth: 297,
  frameHeight: 220,
  feetX: 142,
  feetY: 216,
  // ~10% mais alto que o jogador.
  scale: 0.78,
  animations: {
    idle: { start: 0, end: 7, frameRate: 6 },
    walk: { start: 8, end: 15, frameRate: 8 },
    hit: { start: 28, end: 31, frameRate: 10 },
    death: { start: 32, end: 39, frameRate: 8 },
  },
  attacks: {
    // Puxão do gancho: recua a arma, avança o gancho na horizontal e recolhe.
    hook: { windup: [16, 19], active: [20, 22], recovery: [23, 27] },
  },
} as const satisfies EnemySpriteDefinition;

// Detrito de lodo (pedra, osso e lodo) girando: 6 quadros de 80x76.
export const SLUDGE_BALL_SPRITE = {
  key: 'projectile-sludge-debris',
  path: 'assets/enemies/sprite_sheet_projetil_detrito_lodo.png',
  frameWidth: 80,
  frameHeight: 76,
  frameCount: 6,
  frameRate: 14,
  displayWidth: 44,
} as const;
