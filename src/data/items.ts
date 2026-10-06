export type ItemCategory = 'key' | 'consumable' | 'weapon';

export type ItemDefinition = {
  id: string;
  name: string;
  category: ItemCategory;
};

export const ITEMS = {
  cellKey: {
    id: 'cell-key',
    name: 'Chave enferrujada da cela',
    category: 'key',
  },
  // Arma inicial: fraca e improvisada, existe para ensinar o combate.
  bambooSword: {
    id: 'bamboo-sword',
    name: 'Espada de Bambu Improvisada',
    category: 'weapon',
  },
} as const satisfies Record<string, ItemDefinition>;

// Imagens dos itens para quando aparecem no mundo (ex.: saindo de um baú).
export const ITEM_IMAGES = {
  'bamboo-sword': {
    key: 'item-bamboo-sword',
    path: 'assets/weapons/arma_espada_bambu.png',
  },
} as const satisfies Partial<Record<string, { key: string; path: string }>>;
