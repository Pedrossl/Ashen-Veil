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
