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
