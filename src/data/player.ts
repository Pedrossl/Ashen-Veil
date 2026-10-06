import type { PlayerAttackAnimationId, WeaponId } from './weapons';

// Valores provisórios de movimento do jogador; ajustar aqui durante o balanceamento.
export const PLAYER_MOVEMENT = {
  maxSpeed: 235,
  acceleration: 1600,
  deceleration: 2000,
  // Abaixo desta velocidade o jogador volta à pose parada.
  idleSpeedThreshold: 12,
  // Frenagem durante o ataque: o golpe compromete o jogador no lugar.
  attackDeceleration: 2600,
} as const;

// Corrida segurando a tecla. Bem rápida de propósito durante o desenvolvimento;
// o planejamento prevê consumo contínuo de stamina (staminaPerSecond), hoje zerado.
export const PLAYER_RUN = {
  maxSpeed: 460,
  acceleration: 2600,
  staminaPerSecond: 0,
} as const;

// Escada de mão: sobe com a animação de caminhada mais lenta por enquanto.
export const PLAYER_CLIMB = {
  speed: 200,
  // Distância horizontal até o centro da escada para conseguir agarrá-la.
  grabRange: 40,
  animationTimeScale: 0.7,
} as const;

// Rolamento: impulso curto com invulnerabilidade no meio do giro.
export const PLAYER_DODGE = {
  staminaCost: 25,
  speed: 390,
  // Agacha, enrola, gira, apoia, levanta, passada (ms por quadro).
  frameDurations: [60, 80, 85, 85, 90, 80],
  // Quadros com velocidade cheia; depois disso o impulso freia.
  burstFrames: 4,
  endDeceleration: 1800,
  // Quadros em que golpes atravessam o jogador (i-frames).
  invulnerableFrames: { from: 1, to: 3 },
} as const;

// Atributos iniciais; números provisórios do planejamento.
export const PLAYER_STATS = {
  maxHealth: 100,
  stamina: { max: 160, regenPerSecond: 75, regenDelayMs: 420 },
  startingWeapon: 'unarmed' as WeaponId,
} as const;

export const PLAYER_ANIMATION = {
  walkFrames: { start: 0, end: 7 },
  idleFrame: 8,
  // Cada quadro avança o pé de apoio ~11px em tela; 19 fps casa com maxSpeed
  // e evita que o pé deslize no chão.
  walkFrameRate: 19,
  // Respiração parado (desarmado): o tronco sobe e desce com as pernas plantadas.
  idleBreathFrameRate: 5,
  // Armado, a pose de guarda respira por escala vertical sutil.
  armedBreath: { amplitude: 0.012, periodMs: 2600 },
  // Pegar item: em pé, inclina, agacha (2 quadros com brilho), levanta, em pé.
  pickupFrameDurations: [90, 110, 220, 260, 150, 120],
  // Quadro em que a mão alcança o item; o item some do chão aqui.
  pickupGrabFrame: 2,
  // Descansar na fogueira reaproveita a coleta: agacha até o quadro com brilho
  // nas mãos (aquecendo-as) e fica ali até o jogador agir.
  restHoldFrame: 3,
  // Morte: tempo caído antes de a tela escurecer e ele renascer.
  deathMs: 2600,
} as const;

// Pose parada por categoria de arma: armado, ele fica em guarda (primeiro
// quadro do golpe da categoria); desarmado, usa a pose parada da caminhada.
export const PLAYER_ARMED_IDLE = {
  sword: { sheet: 'swordAttack', frame: 0 },
} as const satisfies Partial<Record<string, { sheet: keyof typeof PLAYER_SPRITE.sheets; frame: number }>>;

// Animações de ataque referenciadas pelas armas (data/weapons.ts).
// Armas da mesma categoria reutilizam a mesma animação.
export const PLAYER_ATTACK_ANIMATIONS = {
  // Soco: guarda, preparação, impacto e recuperação (ms por quadro).
  'unarmed-light': { sheet: 'unarmedAttack', frameDurations: [70, 120, 150, 180] },
  // Espada: guarda, ergue acima da cabeça, estoca e recolhe.
  'sword-light': { sheet: 'swordAttack', frameDurations: [80, 160, 170, 220] },
} as const satisfies Record<
  PlayerAttackAnimationId,
  { sheet: keyof typeof PLAYER_SPRITE.sheets; frameDurations: readonly number[] }
>;

// Todas as sheets do jogador usam o mesmo tamanho de quadro para que a
// hitbox física não mude de posição ao trocar de animação.
const PLAYER_FRAME = { frameWidth: 420, frameHeight: 340 } as const;

export const PLAYER_SPRITE = {
  ...PLAYER_FRAME,
  scale: 0.48,
  body: { width: 88, height: 300, offsetX: 166, offsetY: 34 },
  sheets: {
    walk: {
      key: 'player-walk-sheet',
      path: 'assets/player/sprite_sheet_jogador_caminhada.png',
    },
    unarmedAttack: {
      key: 'player-unarmed-attack-sheet',
      path: 'assets/player/sprite_sheet_jogador_soco.png',
    },
    pickup: {
      key: 'player-pickup-sheet',
      path: 'assets/player/sprite_sheet_jogador_coleta.png',
    },
    dodge: {
      key: 'player-dodge-sheet',
      path: 'assets/player/sprite_sheet_jogador_rolamento.png',
    },
    // Respiração parada, gerada do mesmo recorte da caminhada.
    idle: {
      key: 'player-idle-sheet',
      path: 'assets/player/sprite_sheet_jogador_parado.png',
    },
    // Corpo sem arma; a arma é desenhada por cima pelo WeaponSocket.
    swordAttack: {
      key: 'player-sword-attack-sheet',
      path: 'assets/player/sprite_sheet_jogador_espada.png',
    },
  },
} as const;
