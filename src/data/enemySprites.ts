// Sheet do prisioneiro acorrentado: quadros de 560x360 numa grade de 6 colunas,
// todos com os pés na linha `feetY` e alinhados horizontalmente em `feetX`.
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
  // Golpes: quadros de cada fase (aviso, acerto e recuperação). As durações
  // vêm da definição do golpe em data/enemies.ts.
  attacks: {
    // Agacha com a corrente para trás e chicoteia na horizontal.
    sweep: { windup: [15, 18], active: [19, 22], recovery: [23, 26] },
    // Ergue a corrente acima da cabeça e esmaga no chão à frente.
    smash: { windup: [27, 31], active: [32, 34], recovery: [35, 38] },
  },
} as const;

export type ChainedPrisonerAttackAnimation = keyof typeof CHAINED_PRISONER_SPRITE.attacks;

export type ChainedPrisonerAnimation = keyof typeof CHAINED_PRISONER_SPRITE.animations;
