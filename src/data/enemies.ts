import type { HitboxDefinition } from './combat';
import {
  CHAINED_PRISONER_SPRITE,
  SHACKLE_RAT_SPRITE,
  SLUDGE_SUPPLICANT_SPRITE,
  VEIL_JAILER_SPRITE,
  type EnemySpriteDefinition,
} from './enemySprites';

// Valores provisórios; a dificuldade deve vir de padrão e timing, não de vida alta.
export type EnemyAttackDefinition = {
  // Animação do golpe: chave em `attacks` do sprite (data/enemySprites.ts).
  animation: string;
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
  // Golpe à distância: no início do acerto solta um projétil em arco, saindo
  // da mão (relativa aos pés), em vez de usar a hitbox.
  projectile?: {
    hand: { forward: number; up: number };
    speed: number;
    lift: number;
    gravity: number;
  };
  motion: {
    windupDrawBackSpeed: number;
    lungeSpeed: number;
    effect: 'sweep-arc' | 'ground-smash' | 'none';
  };
};

export type EnemyDefinition = {
  id: string;
  name: string;
  sprite: EnemySpriteDefinition;
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
    sprite: CHAINED_PRISONER_SPRITE,
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
  // Inimigo de enxame (05_documentacao/inimigos/RATO_DO_GRILHAO.md): frágil,
  // rápido em trajetos curtos, morde de perto e quase sempre se interrompe.
  shackleRat: {
    id: 'shackle-rat',
    name: 'Rato do Grilhão',
    sprite: SHACKLE_RAT_SPRITE,
    maxHealth: 14,
    moveSpeed: 160,
    detectionRange: 240,
    loseInterestRange: 420,
    alertMs: 220,
    hitStunMs: 260,
    staggerChance: 0.9,
    staggerChanceWhileAttacking: 0.6,
    hurtbox: { width: 70, height: 42 },
    attacks: {
      bite: {
        animation: 'bite',
        damage: 6,
        range: 75,
        windupMs: 300,
        activeMs: 210,
        recoveryMs: 450,
        hitbox: { forward: 10, up: 48, width: 70, height: 48 },
        cooldownMs: 700,
        cooldownJitterMs: 600,
        motion: { windupDrawBackSpeed: 25, lungeSpeed: 380, effect: 'none' },
      },
    },
    closeAttackChance: 0,
  },
  // Suplicante do Lodo: lento e frágil de perto, mas arremessa bolas de lodo
  // em arco de longe. Fica parado arremessando quando o jogador está no alcance.
  sludgeSupplicant: {
    id: 'sludge-supplicant',
    name: 'Suplicante do Lodo',
    sprite: SLUDGE_SUPPLICANT_SPRITE,
    maxHealth: 45,
    moveSpeed: 45,
    detectionRange: 520,
    loseInterestRange: 700,
    alertMs: 500,
    hitStunMs: 300,
    staggerChance: 0.5,
    staggerChanceWhileAttacking: 0.3,
    hurtbox: { width: 60, height: 140 },
    attacks: {
      throw: {
        animation: 'throw',
        damage: 12,
        range: 430,
        windupMs: 700,
        activeMs: 160,
        recoveryMs: 650,
        hitbox: { forward: 0, up: 0, width: 0, height: 0 },
        cooldownMs: 1200,
        cooldownJitterMs: 800,
        projectile: { hand: { forward: 70, up: 90 }, speed: 360, lift: 380, gravity: 900 },
        motion: { windupDrawBackSpeed: 0, lungeSpeed: 0, effect: 'none' },
      },
    },
    closeAttackChance: 0,
  },
  // Inimigo pesado da prisão (05_documentacao/inimigos/CARCEREIRO_DO_VEU.md):
  // lento, não corre, quase não se interrompe e tem um golpe só, forte, com
  // aviso longo e recuperação longa para ser punido.
  veilJailer: {
    id: 'veil-jailer',
    name: 'Carcereiro do Véu',
    sprite: VEIL_JAILER_SPRITE,
    maxHealth: 90,
    moveSpeed: 55,
    detectionRange: 300,
    loseInterestRange: 420,
    alertMs: 600,
    hitStunMs: 380,
    staggerChance: 0.12,
    staggerChanceWhileAttacking: 0,
    hurtbox: { width: 70, height: 160 },
    attacks: {
      // Puxão do gancho: avança o gancho na horizontal, alcance médio.
      hook: {
        animation: 'hook',
        damage: 28,
        range: 150,
        windupMs: 760,
        activeMs: 240,
        recoveryMs: 1050,
        hitbox: { forward: 25, up: 115, width: 125, height: 60 },
        cooldownMs: 700,
        cooldownJitterMs: 500,
        motion: { windupDrawBackSpeed: 35, lungeSpeed: 260, effect: 'sweep-arc' },
      },
    },
    closeAttackChance: 0,
  },
} as const satisfies Record<string, EnemyDefinition>;
