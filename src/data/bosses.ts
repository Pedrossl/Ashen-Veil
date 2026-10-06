import type { HitboxDefinition } from './combat';

// Golpe do boss em fases: aviso legível, janela de acerto e brecha para punir.
export type BossAttackDefinition = {
  damage: number;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  hitbox: HitboxDefinition;
};

// Valores provisórios; a dificuldade deve vir de leitura e timing.
export const REAPER_KING = {
  id: 'reaper-king',
  name: 'Rei Ceifador',
  maxHealth: 320,
  runSpeed: 290,
  // O boss desperta quando o jogador passa desta linha da arena.
  awakenX: 900,
  // Corpo vulnerável, a partir dos pés.
  hurtbox: { width: 170, height: 260 },
  // Distâncias horizontais entre o boss e o jogador.
  slashRange: 270,
  throwRange: { min: 260, max: 620 },
  // Corre no máximo por este tempo antes de reavaliar (evita perseguição eterna).
  maxRunMs: 1600,
  // Pausa entre ações; o jitter quebra o ritmo previsível.
  cooldownMs: 480,
  cooldownJitterMs: 380,
  // Chances (0–1) de escolher cada ação quando várias são possíveis.
  throwChance: 0.5,
  teleportChance: 0.32,
  // Ao teleportar, aparece a esta distância do jogador.
  teleportDistance: 250,
  introMs: 1300,
  slash: {
    damage: 32,
    windupMs: 440,
    activeMs: 170,
    recoveryMs: 440,
    // Varredura larga da foice, do alto da cabeça até o chão à frente.
    hitbox: { forward: 10, up: 230, width: 290, height: 230 },
  },
  throwScythe: {
    damage: 26,
    windupMs: 560,
    activeMs: 260,
    recoveryMs: 500,
    // A foice espectral voa longe, na altura do peito.
    hitbox: { forward: 40, up: 200, width: 560, height: 110 },
  },
  // Segunda fase: com metade da vida ele brilha mais forte, acelera tudo e
  // passa a arremessar a foice girando enquanto flutua sem ela.
  phaseTwo: {
    healthRatio: 0.5,
    // Divide avisos, pausas e recuperações; multiplica corrida e flutuação.
    speedMultiplier: 1.35,
    enrageMs: 1500,
    flingChance: 0.45,
    fling: {
      damage: 24,
      windupMs: 360,
      releaseMs: 120,
      // A foice vai até esta distância (ou até a parede) e volta para a mão.
      maxDistance: 900,
      outSpeed: 980,
      returnSpeed: 1150,
      spinDegreesPerSecond: 1080,
      // Área da foice girando, centrada nela.
      hitbox: { width: 130, height: 100 },
      // Enquanto a foice voa, ele flutua de mão vazia pela arena.
      glideSpeed: 230,
      // Altura (acima dos pés) por onde a foice voa.
      flightHeight: 120,
    },
  },
} as const satisfies {
  slash: BossAttackDefinition;
  throwScythe: BossAttackDefinition;
} & Record<string, unknown>;
