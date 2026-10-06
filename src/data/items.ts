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
  veiledEmberAmpoule: {
    id: 'veiled-ember-ampoule',
    name: 'Ampola da Brasa Velada',
    category: 'consumable',
  },
} as const satisfies Record<string, ItemDefinition>;

// Imagens dos itens para quando aparecem no mundo (ex.: saindo de um baú).
export const ITEM_IMAGES = {
  'bamboo-sword': {
    key: 'item-bamboo-sword',
    path: 'assets/weapons/arma_espada_bambu.png',
  },
  'veiled-ember-ampoule': {
    key: 'item-veiled-ember-ampoule',
    path: 'assets/items/consumiveis/ampola_brasa_velada.png',
  },
} as const satisfies Partial<Record<string, { key: string; path: string }>>;

// Ícones simplificados para o HUD.
export const ITEM_ICONS = {
  'veiled-ember-ampoule': {
    key: 'icon-veiled-ember-ampoule',
    path: 'assets/items/consumiveis/icone_ampola_brasa_velada.png',
  },
} as const satisfies Partial<Record<string, { key: string; path: string }>>;

// Cura principal (05_documentacao/itens/AMPOLA_DA_BRASA_VELADA.md). O jogador
// não para para beber: anda mais devagar, sem correr, atacar nem rolar, e a
// vida volta no meio do gole. Cargas voltam ao descansar e ao renascer.
export const AMPOULE = {
  itemId: ITEMS.veiledEmberAmpoule.id,
  name: ITEMS.veiledEmberAmpoule.name,
  maxCharges: 3,
  healAmount: 45,
  drinkMs: 820,
  healAtMs: 430,
  moveSpeedFactor: 0.5,
} as const;
