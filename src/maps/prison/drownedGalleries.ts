import Phaser from 'phaser';

import { GroundMessage } from '../../entities/world/GroundMessage';
import { MeleeEnemy, type MeleeEnemyConfig } from '../../entities/enemies/MeleeEnemy';
import { ITEM_IMAGES, ITEMS } from '../../data/items';
import { Bonfire } from '../../entities/world/Bonfire';
import { Chest } from '../../entities/world/Chest';
import { Ladder } from '../../entities/world/Ladder';
import { LockedDoor } from '../../entities/world/LockedDoor';
import type { WorldState } from '../../systems/WorldState';
import type { Room } from '../types';
import {
  addBackWall,
  addProp,
  addTorchGlow,
  createOneWayPlatform,
  createStaticCollider,
  EXPANSION_ATLASES,
  expansionPiece,
  FLOOR_Y,
  PRISON_ATLAS_KEY,
  type PropPlacement,
} from './prisonKit';

// Galerias Alagadas: área vertical entre o Poço das Correntes
// e o covil do boss, montada com os tilesets da expansão. Entra-se pelo alto
// à esquerda, desce-se pulando das bordas até o canal alagado e volta-se a
// subir por escadas de madeira até a porta do covil, no alto à direita.
// De 2100 a 2900: trecho do pilar caído, com o baú escondido atrás de uma coluna.
const WIDTH = 3800;
const CEILING_Y = -520;
// Três andares: canal (chão), galerias do meio e passarelas altas.
const LOW_Y = FLOOR_Y;
const MID_Y = 200;
const TOP_Y = -160;
const BONFIRE_ID = 'bonfire:prison-drowned-galleries';
const SEWER_ENTRANCE_X = 330;
const HIDDEN_CHEST_ID = 'prison-drowned-galleries-hidden-chest';
const HIDDEN_CHEST_X = 2720;
// Plataforma sobre o pilar caído, no meio do trecho novo.
const PILLAR_TOP_Y = 330;
const WALL_TINT = 0x5f5869;
const STONE_TINT = 0xa89eb4;
const BACK_TINT = 0x7a7186;
const WOOD_TINT = 0xb8a890;

// Plataformas de mão única [início, fim, altura].
const PLATFORMS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 920, TOP_Y],
  [2380, 2640, PILLAR_TOP_Y],
  [640, 1760, MID_Y],
  [2920, WIDTH, MID_Y],
  [3080, WIDTH, TOP_Y],
];

// Escadas de madeira [x, piso de baixo, piso de cima].
const LADDERS: ReadonlyArray<readonly [number, number, number]> = [
  [770, MID_Y, TOP_Y],
  [1660, LOW_Y, MID_Y],
  [2420, LOW_Y, PILLAR_TOP_Y],
  [3040, LOW_Y, MID_Y],
  [3680, MID_Y, TOP_Y],
];

// Ratos no canal alagado, um prisioneiro na galeria do meio e o Carcereiro
// guardando a subida para a lanterna.
const ENEMY_SPAWNS: MeleeEnemyConfig[] = [
  { kind: 'shackleRat', x: 1250, floorY: LOW_Y, patrolMinX: 1100, patrolMaxX: 1500, facing: 'left' },
  { kind: 'shackleRat', x: 1420, floorY: LOW_Y, patrolMinX: 1250, patrolMaxX: 1700, facing: 'right' },
  { kind: 'shackleRat', x: 1850, floorY: LOW_Y, patrolMinX: 1700, patrolMaxX: 2050, facing: 'left' },
  { kind: 'shackleRat', x: 2250, floorY: LOW_Y, patrolMinX: 2150, patrolMaxX: 2600, facing: 'right' },
  { kind: 'shackleRat', x: 2520, floorY: PILLAR_TOP_Y, patrolMinX: 2450, patrolMaxX: 2620, facing: 'left' },
  { kind: 'chainedPrisoner', x: 1200, floorY: MID_Y, patrolMinX: 1000, patrolMaxX: 1550, facing: 'left' },
  { kind: 'veilJailer', x: 3250, floorY: MID_Y, patrolMinX: 3120, patrolMaxX: 3580, facing: 'left' },
];

const piece = expansionPiece(STONE_TINT);

const PROPS: PropPlacement[] = [
  // Estrutura: colunas sustentando as passarelas e arcos entre os andares.
  piece('corridors', 'column', 110, LOW_Y + 6, 2.9, 4, { tint: BACK_TINT }),
  piece('corridors', 'column', 880, LOW_Y + 6, 2.9, 4, { tint: BACK_TINT }),
  piece('corridors', 'column', 690, LOW_Y + 6, 1.45, 5),
  piece('corridors', 'column', 1180, LOW_Y + 6, 1.45, 5),
  piece('corridors', 'column-broken', 1980, LOW_Y + 6, 1.3, 5),
  piece('corridors', 'column', 2970, LOW_Y + 6, 1.45, 5),
  piece('corridors', 'column', 3440, LOW_Y + 6, 1.45, 5),
  piece('corridors', 'arch', 3270, MID_Y + 4, 1.42, 3, { tint: BACK_TINT }),
  piece('corridors', 'arch-half-left', 1500, MID_Y + 4, 1.42, 3, { tint: BACK_TINT }),
  piece('corridors', 'arch', 1350, LOW_Y + 4, 1.42, 2, { tint: BACK_TINT }),
  // Paredes úmidas, infiltrações e quedas d'água sobre o canal.
  piece('damp', 'wall-waterfall', 1450, LOW_Y, 1.1, 2, { tint: BACK_TINT }),
  piece('damp', 'wall-seep', 400, MID_Y + 10, 1.0, 2, { tint: BACK_TINT }),
  piece('damp', 'wall-leak', 1900, MID_Y, 1.0, 2, { tint: BACK_TINT }),
  piece('damp', 'wall-moss', 3500, TOP_Y - 10, 1.0, 2, { tint: BACK_TINT }),
  piece('damp', 'drain-pipe', 1820, LOW_Y + 4, 0.9, 3),
  piece('damp', 'sewer-mouth', 3420, LOW_Y + 4, 0.9, 3),
  piece('damp', 'rubble-wet', 1040, LOW_Y + 8, 0.55, 8),
  piece('damp', 'floor-grate', 3220, LOW_Y + 30, 0.5, 6.5),
  // Celas e correntes: janela gradeada, gaiolas e grilhões espalhados.
  piece('cells', 'window-barred', 1050, MID_Y - 70, 0.8, 2, { tint: BACK_TINT }),
  piece('cells', 'window-barred', 520, TOP_Y - 80, 0.8, 2, { tint: BACK_TINT }),
  piece('cells', 'cage', 1240, -60, 0.8, 7),
  piece('cells', 'chain', 1240, -280, 1.0, 7),
  piece('cells', 'cage', 2050, 40, 0.7, 7),
  piece('cells', 'chain', 2050, -150, 1.0, 7),
  piece('cells', 'hanging-grate', 330, MID_Y - 40, 0.7, 3, { tint: BACK_TINT }),
  piece('cells', 'gallows-beam', 640, TOP_Y + 2, 0.55, 8),
  piece('cells', 'bench', 940, MID_Y + 2, 0.42, 8),
  piece('cells', 'floor-shackles', 1480, MID_Y + 2, 0.4, 8),
  piece('cells', 'wall-ring', 3180, MID_Y - 60, 0.55, 3),
  piece('cells', 'chain-shackles', 3560, MID_Y - 50, 0.6, 3),
  piece('cells', 'fence-broken', 3500, TOP_Y + 2, 0.5, 8),
  // Trecho do pilar caído: arcos ao fundo, queda d'água e o pilar que sustenta a plataforma.
  piece('corridors', 'arch', 2300, LOW_Y + 4, 1.6, 2, { tint: BACK_TINT }),
  piece('corridors', 'arch', 2850, LOW_Y + 4, 1.6, 2, { tint: BACK_TINT }),
  piece('damp', 'wall-waterfall', 2580, PILLAR_TOP_Y - 10, 1.0, 2, { tint: BACK_TINT }),
  piece('corridors', 'wall-pillar-block', 2510, LOW_Y + 6, 1.0, 5),
  piece('corridors', 'column-broken', 2180, LOW_Y + 6, 1.3, 5),
  piece('cells', 'chain', 2460, -40, 1.0, 7),
  piece('damp', 'rubble-wet', 2620, LOW_Y + 8, 0.5, 8),
  // Coluna escura em primeiro plano que esconde o baú (sem parallax, para cobrir o lugar certo).
  piece('corridors', 'column', HIDDEN_CHEST_X + 10, LOW_Y + 140, 2.7, 14, { tint: 0x0b0810 }),
  // Primeiro plano escuro com parallax.
  piece('corridors', 'column', 1600, LOW_Y + 140, 2.6, 14, { tint: 0x07050a, scrollFactor: 1.25 }),
  piece('corridors', 'column', 3700, LOW_Y + 140, 2.6, 14, { tint: 0x07050a, scrollFactor: 1.25 }),
];

export function createDrownedGalleries(scene: Phaser.Scene, world: WorldState): Room {
  addBackWall(scene, 0, WIDTH, WALL_TINT, CEILING_Y, LOW_Y + 40);
  addGround(scene);
  PLATFORMS.forEach(([from, to, y]) => addPlatformRun(scene, from, to, y));

  for (const prop of PROPS) {
    addProp(scene, prop);
  }

  const ladders = LADDERS.map(
    ([x, bottomY, topY]) =>
      new Ladder(scene, { atlasKey: PRISON_ATLAS_KEY, x, bottomY, topY, scale: 1.1, tint: WOOD_TINT, depth: 3.5 }),
  );

  // Caminhos para depois: portas e grades trancadas em todos os andares.
  const lockedDoors = [
    new LockedDoor(scene, {
      texture: EXPANSION_ATLASES.cells.key, frame: 'door-closed', x: 420, floorY: TOP_Y, scale: 0.6, depth: 3, tint: STONE_TINT,
      message: 'Trancada por fora. Do outro lado, alguém arrasta correntes.',
    }),
  ];
  addProp(scene, piece('cells', 'door-open', 1380, MID_Y, 0.6, 3));
  addProp(scene, piece('cells', 'door-open', 3360, MID_Y, 0.6, 3));

  // Boca do bueiro no canal: com E, desce para os esgotos.
  addProp(scene, piece('damp', 'sewer-mouth', SEWER_ENTRANCE_X, LOW_Y + 6, 0.85, 3));

  // Porta do covil, aberta, no fim da passarela alta.
  addProp(scene, piece('cells', 'door-open', 3730, TOP_Y + 4, 0.62, 3));

  // Recompensa de quem explora: escondido atrás da coluna escura do primeiro plano.
  const hiddenChest = new Chest(scene, {
    id: HIDDEN_CHEST_ID,
    x: HIDDEN_CHEST_X,
    floorY: LOW_Y,
    scale: 0.55,
    tint: 0xd8cede,
    depth: 8,
    item: ITEMS.veiledEmberAmpoule,
    itemTextureKey: ITEM_IMAGES['veiled-ember-ampoule'].key,
    startsOpen: world.hasFlag(HIDDEN_CHEST_ID),
  });

  const bonfire = new Bonfire(scene, {
    id: BONFIRE_ID,
    x: 3400,
    floorY: TOP_Y,
    depth: 8,
    checkpoint: { roomId: 'prison-drowned-galleries', entryId: 'bonfire' },
    lit: world.hasFlag(BONFIRE_ID),
  });

  addTorchGlow(scene, 300, TOP_Y - 90);
  addTorchGlow(scene, 1550, MID_Y - 90);
  addTorchGlow(scene, 3150, LOW_Y - 90);
  addWaterShimmer(scene);

  return {
    title: 'Galerias Alagadas',
    groundMessages: [
      new GroundMessage(scene, { x: 820, floorY: TOP_Y, text: 'Sem escada? Caia da borda para descer.' }),
      new GroundMessage(scene, { x: 2250, floorY: LOW_Y, text: 'Colunas escuras escondem o que está atrás delas.' }),
    ],
    subtitle: 'Bloco de Celas · Subnível III',
    floorY: LOW_Y,
    bounds: { x: 0, y: CEILING_Y - 60, width: WIDTH, height: LOW_Y + 155 - CEILING_Y + 60 },
    zoom: 0.9,
    entries: {
      well: { x: 170, y: TOP_Y, facing: 'right' },
      boss: { x: 3620, y: TOP_Y, facing: 'left' },
      bonfire: { x: 3310, y: TOP_Y, facing: 'right' },
      sewer: { x: SEWER_ENTRANCE_X + 60, facing: 'right' },
      'service-wing': { x: 1450, y: MID_Y, facing: 'right' },
      'cistern-wing': { x: 3435, y: MID_Y, facing: 'right' },
    },
    exits: [
      { side: 'left', x: 60, toRoom: 'prison-chain-well', toEntry: 'ledge', maxFeetY: 0 },
      { side: 'right', x: 3715, toRoom: 'prison-boss-lair', toEntry: 'well', maxFeetY: 0 },
    ],
    colliders: [
      createStaticCollider(scene, WIDTH / 2, LOW_Y + 24, WIDTH, 48),
      createStaticCollider(scene, 20, 0, 30, 1400),
      createStaticCollider(scene, WIDTH - 20, 0, 30, 1400),
      ...PLATFORMS.map(([from, to, y]) => createOneWayPlatform(scene, from, y, to - from)),
    ],
    gates: [],
    pickups: [],
    enemies: ENEMY_SPAWNS.map((spawn) => new MeleeEnemy(scene, spawn)),
    stairs: [],
    ladders,
    bonfires: [bonfire],
    chests: [hiddenChest],
    passages: [
      { x: 1380, floorY: MID_Y, label: 'Entrar nas alas esquecidas', toRoom: 'prison-service-wing', toEntry: 'galleries' },
      { x: 3360, floorY: MID_Y, label: 'Entrar na cisterna antiga', toRoom: 'prison-service-wing', toEntry: 'cistern' },
      { x: SEWER_ENTRANCE_X, floorY: LOW_Y, label: 'Entrar no bueiro', toRoom: 'prison-sewers', toEntry: 'galleries' },
    ],
    lockedDoors,
  };
}

// Passarela de pedra com goteiras, repetida de ponta a ponta.
function addPlatformRun(scene: Phaser.Scene, fromX: number, toX: number, topY: number): void {
  const frames = ['platform-long', 'platform-drip', 'platform-long', 'platform-rubble'];
  const scale = 0.62;
  const key = EXPANSION_ATLASES.corridors.key;
  const step = scene.textures.getFrame(key, 'platform-long').width * scale * 0.9;

  for (let x = fromX, index = 0; x < toX; x += step, index += 1) {
    scene.add
      .image(Math.min(x + step / 2, toX - step / 2), topY - 6, key, frames[index % frames.length])
      .setOrigin(0.5, 0)
      .setScale(scale)
      .setDepth(6)
      .setTint(STONE_TINT);
  }
}

// Chão do canal: borda molhada de pedra com o trecho alagado no meio.
function addGround(scene: Phaser.Scene): void {
  const key = EXPANSION_ATLASES.damp.key;
  const scale = 0.6;
  const step = scene.textures.getFrame(key, 'ledge-wet').width * scale * 0.9;

  for (let x = 0, index = 0; x < WIDTH + step; x += step, index += 1) {
    const flooded = x > 1050 && x < 2950;
    scene.add
      .image(x, LOW_Y - 8, key, flooded ? 'channel' : index % 2 ? 'ledge-wet-rings' : 'ledge-wet')
      .setOrigin(0.5, 0)
      .setScale(scale)
      .setDepth(6)
      .setTint(STONE_TINT);
  }
}

// Reflexos na água do canal, pulsando devagar.
function addWaterShimmer(scene: Phaser.Scene): void {
  for (let x = 1120; x < 2920; x += 140) {
    const shimmer = scene.add
      .ellipse(x, LOW_Y + 6, 120, 10, 0x9fb4ff, 0.12)
      .setDepth(6.5)
      .setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: shimmer,
      alpha: { from: 0.04, to: 0.18 },
      scaleX: { from: 0.8, to: 1.15 },
      duration: 1400 + (x % 700),
      yoyo: true,
      repeat: -1,
    });
  }
}
