import type { HitboxDefinition } from './combat';

// Valores provisórios; a dificuldade deve vir de padrão e timing, não de vida alta.
export type EnemyAttackDefinition = {
  // Animação do golpe (ver data/enemySprites.ts).
  animation: 'sweep' | 'smash';
  damage: number;
  // Distância (centro a centro) em que ele decide golpear.
  range: number;
  // Fases do golpe em ms: aviso legível, janela de acerto e brecha para punir.
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  hitbox: HitboxDefinition;
  // Pausa entre golpes; a variação evita um ritmo previsível demais.
  cooldownMs: number;
  cooldownJitterMs: number;
  // Sensação de peso: recua um pouco no aviso e avança no acerto (velocidade
  // inicial, que cai até zero no fim da fase). `effect` é o rastro do golpe.
  motion: {
    windupDrawBackSpeed: number;
    lungeSpeed: number;
    effect: 'sweep-arc' | 'ground-smash';
  };
};

export type EnemyDefinition = {
  id: string;
  name: string;
  maxHealth: number;
  moveSpeed: number;
  // Distâncias horizontais a partir do centro do inimigo.
  detectionRange: number;
  // Desiste da perseguição quando o jogador se afasta além disso.
  loseInterestRange: number;
  // Pausa ao notar o jogador, antes de perseguir (leitura para o jogador).
  alertMs: number;
  // Tempo atordoado ao levar um golpe.
  hitStunMs: number;
  // Chance (0–1) de um golpe atordoar. No meio do próprio golpe a chance é
  // menor: ele aguenta e termina o ataque, então trocar golpes é arriscado.
  staggerChance: number;
  staggerChanceWhileAttacking: number;
  hurtbox: { width: number; height: number };
  attacks: Record<string, EnemyAttackDefinition>;
  // Chance de preferir o esmagamento quando está perto o bastante para ambos.
  closeAttackChance: number;
};

export const ENEMIES = {
  // Primeiro inimigo da prisão (sprite: sprite_sheet_morto_vivo_acorrentado).
  chainedPrisoner: {
    id: 'chained-prisoner',
    name: 'Prisioneiro Acorrentado',
    maxHealth: 40,
    moveSpeed: 70,
    detectionRange: 280,
    loseInterestRange: 460,
    alertMs: 450,
    hitStunMs: 320,
    staggerChance: 0.35,
    staggerChanceWhileAttacking: 0.15,
    hurtbox: { width: 52, height: 140 },
    // Dois golpes com a corrente, com papéis diferentes:
    attacks: {
      // Varredura: média distância, chicote horizontal na altura da cintura.
      sweep: {
        animation: 'sweep',
        damage: 14,
        range: 165,
        windupMs: 520,
        activeMs: 220,
        recoveryMs: 620,
        hitbox: { forward: 20, up: 110, width: 160, height: 70 },
        cooldownMs: 500,
        cooldownJitterMs: 400,
        motion: { windupDrawBackSpeed: 45, lungeSpeed: 300, effect: 'sweep-arc' },
      },
      // Esmagamento: perto, aviso longo e área alta que bate até o chão.
      smash: {
        animation: 'smash',
        damage: 20,
        range: 110,
        windupMs: 650,
        activeMs: 180,
        recoveryMs: 760,
        hitbox: { forward: 10, up: 150, width: 110, height: 150 },
        cooldownMs: 600,
        cooldownJitterMs: 400,
        motion: { windupDrawBackSpeed: 30, lungeSpeed: 180, effect: 'ground-smash' },
      },
    },
    closeAttackChance: 0.6,
  },
} as const satisfies Record<string, EnemyDefinition>;
