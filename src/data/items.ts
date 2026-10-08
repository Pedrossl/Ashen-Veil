export type ItemCategory = 'key' | 'consumable' | 'weapon' | 'ring';

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
  darkSword: {
    id: 'dark-sword',
    name: 'Espada Medieval Sombria',
    category: 'weapon',
  },
  veiledEmberAmpoule: {
    id: 'veiled-ember-ampoule',
    name: 'Ampola da Brasa Velada',
    category: 'consumable',
  },
  // Recompensa da Raiz dos Condenados vencida no Fosso Afogado.
  veiledBreathRing: {
    id: 'veiled-breath-ring',
    name: 'Anel do Fôlego Velado',
    category: 'ring',
  },
} as const satisfies Record<string, ItemDefinition>;

// Imagens dos itens para quando aparecem no mundo (ex.: saindo de um baú).
export const ITEM_IMAGES = {
  'bamboo-sword': {
    key: 'item-bamboo-sword',
    path: 'assets/weapons/arma_espada_bambu.webp',
  },
  'dark-sword': {
    key: 'item-dark-sword',
    path: 'assets/weapons/arma_espada_medieval_sombria.webp',
  },
  'veiled-ember-ampoule': {
    key: 'item-veiled-ember-ampoule',
    path: 'assets/items/consumiveis/ampola_brasa_velada.webp',
  },
  // Originais em 03_itens_e_armas/itens/aneis/anel_folego_velado/.
  'veiled-breath-ring': {
    key: 'item-veiled-breath-ring',
    path: 'assets/items/aneis/item_anel_folego_velado_grande_128.webp',
  },
} as const satisfies Partial<Record<string, { key: string; path: string }>>;

// Ícones simplificados para o HUD.
export const ITEM_ICONS = {
  'veiled-ember-ampoule': {
    key: 'icon-veiled-ember-ampoule',
    path: 'assets/items/consumiveis/icone_ampola_brasa_velada.webp',
  },
  'veiled-breath-ring': {
    key: 'icon-veiled-breath-ring',
    path: 'assets/items/aneis/item_anel_folego_velado_medio_64.webp',
  },
} as const satisfies Partial<Record<string, { key: string; path: string }>>;

// Anéis valem só por estarem no inventário (ainda não há slot de acessório).
// `staminaRegenFactor` multiplica as duas regenerações da stamina.
export type RingEffect = {
  description: string;
  staminaRegenFactor?: number;
};

export const RING_EFFECTS = {
  'veiled-breath-ring': {
    description: 'Stamina se recupera 40% mais rápido',
    staminaRegenFactor: 1.4,
  },
} as const satisfies Record<string, RingEffect>;

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
