// Tilesets da expansão da prisão (02_cenarios_e_tilesets/tilesets/prisao_expansao),
// cada um com 16 peças nomeadas no JSON ao lado (caixa recortada ao conteúdo).
const EXPANSION_DIR = 'assets/prison/expansao';
export const EXPANSION_ATLASES = {
  corridors: {
    key: 'prison-expansion-corridors',
    imagePath: `${EXPANSION_DIR}/tileset_prisao_corredores_e_arcos_16_tiles.png`,
    dataPath: `${EXPANSION_DIR}/tileset_prisao_corredores_e_arcos_16_tiles.json`,
  },
  damp: {
    key: 'prison-expansion-damp',
    imagePath: `${EXPANSION_DIR}/tileset_prisao_umida_e_drenos_16_tiles.png`,
    dataPath: `${EXPANSION_DIR}/tileset_prisao_umida_e_drenos_16_tiles.json`,
  },
  cells: {
    key: 'prison-expansion-cells',
    imagePath: `${EXPANSION_DIR}/tileset_prisao_celas_e_correntes_16_tiles.png`,
    dataPath: `${EXPANSION_DIR}/tileset_prisao_celas_e_correntes_16_tiles.json`,
  },
} as const;

export type ExpansionAtlas = keyof typeof EXPANSION_ATLASES;

// Baú da prisão abrindo (props/sprite_sheet_bau_prisao_abertura_6_frames.png,
// reduzido à metade e alinhado pela base): 0 fechado … 5 aberto.
export const PRISON_CHEST_SPRITE = {
  key: 'prison-chest-opening',
  path: 'assets/prison/sprite_sheet_bau_abrindo.png',
  frameWidth: 238,
  frameHeight: 184,
  footY: 180,
  openFrame: 5,
  frameRate: 10,
} as const;
