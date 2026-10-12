// Kit do esgoto (05_documentacao/cenarios/ESGOTO_DA_PRISAO.md). Os tilesets
// têm 16 peças nomeadas no JSON ao lado de cada PNG (caixa recortada ao conteúdo).
const DIR = 'assets/prison/esgoto';

export const SEWER_ATLASES = {
  architecture: {
    key: 'sewer-architecture',
    imagePath: `${DIR}/tileset_esgoto_arquitetura_16_tiles.webp`,
    dataPath: `${DIR}/tileset_esgoto_arquitetura_16_tiles.json`,
  },
  channels: {
    key: 'sewer-channels',
    imagePath: `${DIR}/tileset_esgoto_canais_lodo_16_tiles.webp`,
    dataPath: `${DIR}/tileset_esgoto_canais_lodo_16_tiles.json`,
  },
  pipes: {
    key: 'sewer-pipes',
    imagePath: `${DIR}/tileset_esgoto_tubulacoes_comportas_16_tiles.webp`,
    dataPath: `${DIR}/tileset_esgoto_tubulacoes_comportas_16_tiles.json`,
  },
  props: {
    key: 'sewer-props',
    imagePath: `${DIR}/tileset_esgoto_props_perigos_16_tiles.webp`,
    dataPath: `${DIR}/tileset_esgoto_props_perigos_16_tiles.json`,
  },
  vegetation: {
    key: 'sewer-vegetation',
    imagePath: `${DIR}/tileset_esgoto_vegetacao_16_tiles.webp`,
    dataPath: `${DIR}/tileset_esgoto_vegetacao_16_tiles.json`,
  },
} as const;

export type SewerAtlas = keyof typeof SEWER_ATLASES;

export type SheetAnimation = {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  frameRate: number;
  repeat: number;
};

// Animações do kit: superfície de água rasa (repetível na horizontal),
// cano despejando água e espirro (some ao fim).
export const SEWER_ANIMATIONS = {
  shallowWater: {
    key: 'sewer-shallow-water',
    path: `${DIR}/animacoes/sprite_sheet_agua_rasa_6_frames.webp`,
    // A folha é uma grade 3×2: seis quadros quadrados, não seis faixas
    // horizontais. Ler 724px juntava duas células e criava blocos gigantes.
    frameWidth: 362,
    frameHeight: 362,
    frames: 6,
    frameRate: 6,
    repeat: -1,
  },
  waterfall: {
    key: 'sewer-waterfall',
    path: `${DIR}/animacoes/sprite_sheet_cachoeira_6_frames.webp`,
    frameWidth: 512,
    frameHeight: 512,
    frames: 6,
    frameRate: 8,
    repeat: -1,
  },
  splash: {
    key: 'sewer-splash',
    path: `${DIR}/animacoes/sprite_sheet_espirro_6_frames.webp`,
    frameWidth: 512,
    frameHeight: 512,
    frames: 6,
    frameRate: 12,
    repeat: 0,
  },
} as const satisfies Record<string, SheetAnimation>;

// Portão monumental do boss do esgoto: quadro 0 fechado, 1 aberto.
export const SEWER_BOSS_GATE = {
  key: 'sewer-boss-gate',
  path: `${DIR}/portao_boss_fechado_aberto.webp`,
  frameWidth: 887,
  frameHeight: 887,
  closedFrame: 0,
  openFrame: 1,
} as const;

// Fundo panorâmico do túnel para parallax lento.
export const SEWER_BACKGROUND = {
  key: 'sewer-background',
  path: `${DIR}/fundos/fundo_tunel_distante.webp`,
} as const;
