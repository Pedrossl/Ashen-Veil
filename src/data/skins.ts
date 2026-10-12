import type Phaser from 'phaser';

// Skins do jogador: aplicadas via setTint() sobre os sprites existentes.
// O personagem base tem capa roxa; cada skin desloca a paleta com uma cor
// multiplicativa. Branco (0xffffff) mantém a arte original sem alteração.
export const SKINS = {
  veil: {
    id: 'veil',
    name: 'Manto do Véu',
    // Branco = original (capa roxa/violeta escura, sem alteração).
    tint: 0xffffff as number,
    // Cor de destaque usada na UI da tela de seleção.
    accentColor: '#a070d8',
    accentHex: 0xa070d8,
  },
  forest: {
    id: 'forest',
    name: 'Manto Cinzento',
    // Verde acinzentado frio — desloca a capa para tons de floresta densa.
    tint: 0x7abf8a as number,
    accentColor: '#5a9e6a',
    accentHex: 0x5a9e6a,
  },
  ember: {
    id: 'ember',
    name: 'Manto da Brasa',
    // Âmbar/dourado — desloca a capa para tons de ferrugem e fogo apagado.
    tint: 0xe8b860 as number,
    accentColor: '#c8902a',
    accentHex: 0xc8902a,
  },
} as const;

export type SkinId = keyof typeof SKINS;
export type SkinDefinition = (typeof SKINS)[SkinId];

export const SKIN_ORDER: SkinId[] = ['veil', 'forest', 'ember'];

// Aparência do solo (a arte original); as outras se escolhem no cooperativo.
export const DEFAULT_SKIN: SkinId = 'veil';

const REGISTRY_KEY = 'game:skin';

export function setSkin(game: Phaser.Game, skinId: SkinId): void {
  game.registry.set(REGISTRY_KEY, skinId);
}

export function getSkin(game: Phaser.Game): SkinDefinition {
  const id = game.registry.get(REGISTRY_KEY) as SkinId | undefined;
  return SKINS[id ?? DEFAULT_SKIN];
}
