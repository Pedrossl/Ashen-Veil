import type Phaser from 'phaser';

// A dificuldade só altera a troca de dano. Ritmo, IA, stamina e janelas de
// esquiva permanecem iguais para o jogador continuar aprendendo as lutas.
export const DIFFICULTIES = {
  normal: {
    id: 'normal',
    playerDamageMultiplier: 1,
    enemyDamageMultiplier: 1,
  },
  easy: {
    id: 'easy',
    playerDamageMultiplier: 2,
    enemyDamageMultiplier: 0.45,
  },
} as const;

// Partida cooperativa (dois jogadores): inimigos e bosses aguentam o dobro e
// batem um pouco mais forte, por cima da dificuldade escolhida. A vida maior
// é aplicada como dano recebido dividido (mesmo efeito, barras iguais).
export const COOP_MODIFIERS = {
  enemyHealthMultiplier: 2,
  enemyDamageMultiplier: 1.2,
} as const;

export type DifficultyId = keyof typeof DIFFICULTIES;
export type Difficulty = (typeof DIFFICULTIES)[DifficultyId];

const REGISTRY_KEY = 'game:difficulty';

export function setDifficulty(game: Phaser.Game, difficulty: DifficultyId): void {
  game.registry.set(REGISTRY_KEY, difficulty);
}

export function getDifficulty(game: Phaser.Game): Difficulty {
  const selected = game.registry.get(REGISTRY_KEY) as DifficultyId | undefined;
  return DIFFICULTIES[selected ?? 'normal'];
}
