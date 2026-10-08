import type { HitboxDefinition } from './combat';

// Categorias compartilham conjuntos de animação: várias armas da mesma
// categoria reutilizam os mesmos movimentos do jogador.
export type WeaponCategory =
  | 'unarmed'
  | 'light'
  | 'sword'
  | 'greatsword'
  | 'spear'
  | 'axe'
  | 'scythe'
  | 'blunt'
  | 'special';

// Animações de ataque do jogador; cada uma é definida em data/player.ts.
export type PlayerAttackAnimationId = 'unarmed-light' | 'sword-light';

export type AttackDefinition = {
  animation: PlayerAttackAnimationId;
  // Multiplica o dano base da arma (golpes fortes > 1).
  damageMultiplier: number;
  staminaCost: number;
  hitbox: HitboxDefinition;
  // Quadros da animação (índice a partir de 0) em que o golpe pode acertar.
  activeFrames: { from: number; to: number };
};

export type WeaponDefinition = {
  id: string;
  name: string;
  category: WeaponCategory;
  baseDamage: number;
  // Chance (0–1) de um golpe ser crítico e quanto ele multiplica o dano.
  critChance: number;
  critMultiplier: number;
  // Sprite da arma no encaixe da mão; desarmado não tem.
  sprite?: string;
  // Tamanho da lâmina na mão em relação ao padrão (WEAPON_BLADE_LENGTH).
  bladeScale?: number;
  // Ponto vertical da arte que corresponde à mão. Algumas armas têm cabo
  // maior que outras e não podem compartilhar exatamente o mesmo encaixe.
  gripOriginY?: number;
  // Velocidade do golpe: > 1 mais rápido, < 1 mais lento (mesma animação da categoria).
  attackSpeed?: number;
  moveset: {
    light: AttackDefinition;
  };
};

export const WEAPONS = {
  unarmed: {
    id: 'unarmed',
    name: 'Punhos',
    category: 'unarmed',
    baseDamage: 8,
    critChance: 0.1,
    critMultiplier: 1.5,
    moveset: {
      light: {
        animation: 'unarmed-light',
        damageMultiplier: 1,
        staminaCost: 18,
        // Alcance do punho no quadro de impacto (braço esticado).
        hitbox: { forward: 28, up: 132, width: 70, height: 112 },
        activeFrames: { from: 2, to: 2 },
      },
    },
  },
  // Arma inicial: improvisada e fraca, mas alcança bem mais que o punho.
  bambooSword: {
    id: 'bamboo-sword',
    name: 'Espada de Bambu Improvisada',
    category: 'sword',
    // Leve: golpeia mais rápido, mas bate menos.
    baseDamage: 10,
    critChance: 0.15,
    critMultiplier: 1.8,
    sprite: 'item-bamboo-sword',
    // O cabo de bambu é comprido: a mão deve ficar no meio dele, abaixo da
    // guarda, e não no começo da empunhadura.
    gripOriginY: 0.87,
    attackSpeed: 1.2,
    moveset: {
      light: {
        animation: 'sword-light',
        damageMultiplier: 1,
        staminaCost: 22,
        // Estocada: a ponta chega a ~130px à frente dos pés, na altura do peito.
        hitbox: { forward: 30, up: 135, width: 105, height: 125 },
        activeFrames: { from: 2, to: 2 },
      },
    },
  },
  // Achada escondida nos Esgotos: lâmina de aço gasta, bem mais forte que o
  // bambu, mas mais pesada (custa mais stamina).
  darkSword: {
    id: 'dark-sword',
    name: 'Espada Medieval Sombria',
    category: 'sword',
    // Pesada e longa: golpe lento, compensado por dano alto e alcance maior.
    baseDamage: 28,
    critChance: 0.12,
    critMultiplier: 1.7,
    sprite: 'item-dark-sword',
    bladeScale: 1.35,
    attackSpeed: 0.75,
    moveset: {
      light: {
        animation: 'sword-light',
        damageMultiplier: 1,
        staminaCost: 30,
        hitbox: { forward: 30, up: 145, width: 140, height: 135 },
        activeFrames: { from: 2, to: 2 },
      },
    },
  },
} as const satisfies Record<string, WeaponDefinition>;

export type WeaponId = keyof typeof WEAPONS;

export function attackDamage(
  weapon: WeaponDefinition,
  attack: AttackDefinition,
  critical = false,
): number {
  const multiplier = critical ? weapon.critMultiplier : 1;
  return Math.round(weapon.baseDamage * attack.damageMultiplier * multiplier);
}

// Sorteado uma vez por golpe: o golpe inteiro é crítico ou não.
export function rollCritical(weapon: WeaponDefinition): boolean {
  return Math.random() < weapon.critChance;
}
