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
// Agarrado e puxado para baixo da terra (boss do esgoto): a animação vai de
// pé até o tronco, depois o que sobra afunda `sinkDistance` px do quadro.
export const PLAYER_DRAGGED = {
  frameRate: 11,
  sinkDistance: 170,
  sinkMs: 420,
  riseMs: 380,
} as const;

export const PLAYER_CLIMB = {
  speed: 200,
  // Distância horizontal até o centro da escada para conseguir agarrá-la.
  grabRange: 40,
  animationTimeScale: 1,
  // Ciclo de subida (mão e pé alternando), quadros 0–7 da sheet `climb`.
  frameRate: 9,
} as const;

// Rolamento: impulso curto com invulnerabilidade no meio do giro.
export const PLAYER_DODGE = {
  staminaCost: 25,
  // Cortar um golpe em curso é forte: custa mais do que uma esquiva normal.
  attackCancelStaminaCost: 40,
  speed: 390,
  // Agacha, enrola, gira, apoia, levanta, passada (ms por quadro).
  frameDurations: [60, 80, 85, 85, 90, 80],
  // Quadros com velocidade cheia; depois disso o impulso freia.
  burstFrames: 4,
  endDeceleration: 1800,
  // Quadros em que golpes atravessam o jogador (i-frames).
  invulnerableFrames: { from: 1, to: 3 },
} as const;

// Modo VIDA, ligado pelo código secreto (CHEAT_CODE em core/controls.ts):
// vida infinita e golpes muito mais fortes, para testar e mostrar o jogo.
export const CHEAT_MODE = {
  damageMultiplier: 10,
} as const;

// Atributos iniciais; números provisórios do planejamento.
export const PLAYER_STATS = {
  maxHealth: 100,
  // Regenera sempre um pouco (inclusive no meio de golpes e rolamentos); depois
  // de `regenDelayMs` sem gastar, acelera para `regenPerSecond`. Andar e correr
  // não contam como ação.
  stamina: { max: 160, trickleRegenPerSecond: 20, regenPerSecond: 80, regenDelayMs: 700 },
  startingWeapon: 'unarmed' as WeaponId,
} as const;

export const PLAYER_ANIMATION = {
  walkFrames: { start: 0, end: 7 },
  idleFrame: 8,
  // Cada quadro avança o pé de apoio ~11px em tela; 19 fps casa com maxSpeed
  // e evita que o pé deslize no chão.
  walkFrameRate: 19,
  // Respiração parado (desarmado): o tronco sobe e desce com as pernas plantadas.
  idleBreathFrameRate: 3,
  idleFrames: { start: 0, end: 7 },
  // Armado, a pose de guarda respira por escala vertical sutil.
  armedBreath: { amplitude: 0.012, periodMs: 2600 },
  // Pegar item: em pé, inclina, agacha (2 quadros com brilho), levanta, em pé.
  pickupFrameDurations: [90, 110, 220, 260, 150, 120],
  // Quadro em que a mão alcança o item; o item some do chão aqui.
  pickupGrabFrame: 2,
  // Queda própria: impacto, joelhos, desabamento e corpo imóvel.
  deathFrameDurations: [100, 130, 150, 160, 130, 110, 140, 180],
  // Descanso na lanterna (sprite_sheet_jogador_descanso, quadros 0–7 sentar e
  // 8–15 levantar): fica no último quadro de sentar até o jogador agir.
  restSitFrameDurations: [120, 130, 140, 150, 160, 170, 180, 200],
  restStandFrameDurations: [140, 130, 140, 150, 160, 150, 140, 130],
  // Morte: tempo caído antes de a tela escurecer e ele renascer.
  deathMs: 1500,
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
    death: {
      key: 'player-death-sheet',
      path: 'assets/player/sprite_sheet_jogador_morte.webp',
    },
    walk: {
      key: 'player-walk-sheet',
      path: 'assets/player/sprite_sheet_jogador_caminhada.webp',
    },
    unarmedAttack: {
      key: 'player-unarmed-attack-sheet',
      path: 'assets/player/sprite_sheet_jogador_soco.webp',
    },
    pickup: {
      key: 'player-pickup-sheet',
      path: 'assets/player/sprite_sheet_jogador_coleta.webp',
    },
    dodge: {
      key: 'player-dodge-sheet',
      path: 'assets/player/sprite_sheet_jogador_rolamento.webp',
    },
    // Idle natural desarmado (05_documentacao/personagem/IDLE_NATURAL.md),
    // 8 quadros normalizados e alinhados pelos pés plantados.
    idle: {
      key: 'player-idle-sheet',
      path: 'assets/player/sprite_sheet_jogador_idle.webp',
    },
    // Sentar e levantar na lanterna (05_documentacao/personagem/DESCANSO_NA_LANTERNA.md),
    // normalizada para os quadros do jogador; sem encaixe de arma, ela some.
    rest: {
      key: 'player-rest-sheet',
      path: 'assets/player/sprite_sheet_jogador_descanso.webp',
    },
    // Subindo a escada de madeira de costas (ciclo de 05_documentacao/personagem/
    // ESCADA_MADEIRA_PAREDE.md), normalizada para os quadros do jogador.
    // Bebendo a ampola parado (05_documentacao/personagem/CURA_COM_AMPOLA.md);
    // andando, ele usa a caminhada com a ampola na mão.
    drink: {
      key: 'player-drink-sheet',
      path: 'assets/player/sprite_sheet_jogador_cura.webp',
    },
    climb: {
      key: 'player-climb-sheet',
      path: 'assets/player/sprite_sheet_jogador_escada.webp',
    },
    // Arrastado para baixo da terra: a saída da escada de corda
    // (public/assets/player/escada_corda/saida_8_frames.png) invertida, de pé
    // até só o tronco para fora; tocada ao contrário, ele sai do buraco.
    dragged: {
      key: 'player-dragged-sheet',
      path: 'assets/player/sprite_sheet_jogador_arrastado.webp',
    },
    // Corpo sem arma; a arma é desenhada por cima pelo WeaponSocket.
    swordAttack: {
      key: 'player-sword-attack-sheet',
      path: 'assets/player/sprite_sheet_jogador_espada.webp',
    },
  },
} as const;
