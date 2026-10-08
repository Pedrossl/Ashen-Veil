import Phaser from 'phaser';

import { GroundMessage } from '../../entities/world/GroundMessage';
import { ITEM_IMAGES, ITEMS } from '../../data/items';
import { SEWER_BACKGROUND, SEWER_BOSS_GATE } from '../../data/sewerSprites';
import { MeleeEnemy, type MeleeEnemyConfig } from '../../entities/enemies/MeleeEnemy';
import { Bonfire } from '../../entities/world/Bonfire';
import { Chest } from '../../entities/world/Chest';
import { Ladder } from '../../entities/world/Ladder';
import type { WorldState } from '../../systems/WorldState';
import type { Room, SlowZone } from '../types';
import {
  addTorchGlow,
  createOneWayPlatform,
  createStaticCollider,
  FLOOR_Y,
  PRISON_ATLAS_KEY,
} from './prisonKit';
import { addHangingPlant, addSewerPiece, addShallowWater, addWaterfall } from './sewerKit';

// Esgotos: túnel longo e alto sob as Galerias Alagadas, entrado pelo bueiro do
// canal. Verde e úmido: trepadeiras pendendo, quedas d'água, trechos alagados
// que atrasam o passo e três alturas de passarelas ligadas por escadas. No fim,
// o portão que levará a um boss.
const WIDTH = 5400;
const CEILING_Y = -300;
// Andares: chão do túnel, passarelas baixas e passarelas altas.
const LOW_WALK_Y = 330;
const HIGH_WALK_Y = 100;
const BAY_WIDTH = 600;
// Tintas: pedra seca roxo-carvão; o verde fica perto da água (doc do esgoto).
const STONE_TINT = 0xc8bcd4;
const BACK_TINT = 0x8a7f9a;
const FAR_TINT = 0x6f6a80;
const WOOD_TINT = 0xb8a890;
const WATER_SPEED_FACTOR = 0.55;
const BOSS_GATE_X = WIDTH - 260;
// Velocidade do fundo distante em relação à câmera.
const FAR_SCROLL = 0.3;
// Lanterna antes do portão: último descanso antes do boss do esgoto.
const BONFIRE_ID = 'bonfire:prison-sewers';
const BONFIRE_X = 4880;
// Baú escondido no fim de uma passarela alta, atrás de uma coluna escura.
const HIDDEN_CHEST_ID = 'prison-sewers-hidden-chest';
const HIDDEN_CHEST_X = 2950;
// A passagem no chão cedeu. Para atravessar, é preciso usar a primeira
// escada, cruzar a passarela alta e descer do outro lado.
const COLLAPSED_PASSAGE_X = 1800;

const LOW_WALKWAYS: ReadonlyArray<readonly [number, number]> = [
  [700, 1250],
  [1900, 2500],
  [3300, 3900],
  [4500, 4950],
];
const HIGH_WALKWAYS: ReadonlyArray<readonly [number, number]> = [
  [1100, 2050],
  [2400, 3000],
  [3800, 4400],
];

// Escadas [x, piso de baixo, piso de cima]: do chão às baixas e das baixas às altas.
const LADDERS: ReadonlyArray<readonly [number, number, number]> = [
  ...LOW_WALKWAYS.map(([from]) => [from + 40, FLOOR_Y, LOW_WALK_Y] as const),
  [1180, LOW_WALK_Y, HIGH_WALK_Y],
  [1960, FLOOR_Y, HIGH_WALK_Y],
  [2450, LOW_WALK_Y, HIGH_WALK_Y],
  [3850, LOW_WALK_Y, HIGH_WALK_Y],
];

// Trechos do chão com água pela canela.
const FLOODED: ReadonlyArray<readonly [number, number]> = [
  [900, 1600],
  [2600, 3300],
  [4000, 4550],
];

// Grupos de 2 a 4 ratos por todos os andares (mais inimigos virão depois).
const ENEMY_SPAWNS: MeleeEnemyConfig[] = [
  rat(620, FLOOR_Y, 'left'),
  rat(760, FLOOR_Y, 'right'),
  rat(950, LOW_WALK_Y, 'left'),
  rat(1080, LOW_WALK_Y, 'right'),
  rat(1450, HIGH_WALK_Y, 'left'),
  rat(1560, HIGH_WALK_Y, 'right'),
  rat(2150, FLOOR_Y, 'left'),
  rat(2280, FLOOR_Y, 'right'),
  rat(2400, FLOOR_Y, 'left'),
  rat(2150, LOW_WALK_Y, 'left'),
  rat(2700, HIGH_WALK_Y, 'right'),
  rat(2850, HIGH_WALK_Y, 'left'),
  rat(3500, LOW_WALK_Y, 'left'),
  rat(3650, LOW_WALK_Y, 'right'),
  rat(3700, FLOOR_Y, 'left'),
  rat(4100, HIGH_WALK_Y, 'right'),
  rat(4250, HIGH_WALK_Y, 'left'),
  rat(4750, LOW_WALK_Y, 'left'),
  rat(4300, FLOOR_Y, 'right'),
  rat(4420, FLOOR_Y, 'left'),
];

// Suplicantes do Lodo arremessando das passarelas e do fundo dos trechos alagados.
const SUPPLICANT_SPAWNS: MeleeEnemyConfig[] = [
  supplicant(1450, FLOOR_Y, 'left'),
  supplicant(2250, LOW_WALK_Y, 'left'),
  supplicant(3200, FLOOR_Y, 'left'),
  supplicant(4200, HIGH_WALK_Y, 'left'),
];

function supplicant(x: number, floorY: number, facing: 'left' | 'right'): MeleeEnemyConfig {
  return { kind: 'sludgeSupplicant', x, floorY, patrolMinX: x - 60, patrolMaxX: x + 60, facing };
}

function rat(x: number, floorY: number, facing: 'left' | 'right'): MeleeEnemyConfig {
  return { kind: 'shackleRat', x, floorY, patrolMinX: x - 100, patrolMaxX: x + 100, facing };
}

export function createSewers(scene: Phaser.Scene, world: WorldState): Room {
  addFarBackground(scene);

  for (let bay = 0; bay * BAY_WIDTH < WIDTH; bay += 1) {
    addBay(scene, bay);
  }

  addCeiling(scene);
  addFloor(scene);
  addForegroundChannel(scene);
  LOW_WALKWAYS.forEach(([from, to]) => addWalkway(scene, from, to, LOW_WALK_Y));
  HIGH_WALKWAYS.forEach(([from, to]) => addWalkway(scene, from, to, HIGH_WALK_Y));
  addWaterfalls(scene);
  addHangingVegetation(scene);
  addProps(scene);
  addBossGateFrame(scene);

  const ladders = LADDERS.map(
    ([x, bottomY, topY]) =>
      new Ladder(scene, { atlasKey: PRISON_ATLAS_KEY, x, bottomY, topY, scale: 1.1, tint: WOOD_TINT, depth: 3.5 }),
  );

  // Passagem aberta para o reservatório; o bloqueio de combate virá com o boss.
  scene.add.image(BOSS_GATE_X, FLOOR_Y + 4, SEWER_BOSS_GATE.key, SEWER_BOSS_GATE.openFrame)
    .setOrigin(0.5, 1).setScale(0.55).setDepth(3);

  const hiddenChest = new Chest(scene, {
    id: HIDDEN_CHEST_ID,
    x: HIDDEN_CHEST_X,
    floorY: HIGH_WALK_Y,
    scale: 0.55,
    tint: 0xd8cede,
    depth: 8,
    item: ITEMS.darkSword,
    itemTextureKey: ITEM_IMAGES['dark-sword'].key,
    startsOpen: world.hasFlag(HIDDEN_CHEST_ID),
  });
  // Coluna escura em primeiro plano escondendo o baú.
  addSewerPiece(scene, 'architecture', 'column', HIDDEN_CHEST_X + 10, HIGH_WALK_Y + 120, 1.3, 14, { tint: 0x0a0a0e });

  const bonfire = new Bonfire(scene, {
    id: BONFIRE_ID,
    x: BONFIRE_X,
    floorY: FLOOR_Y,
    depth: 8,
    checkpoint: { roomId: 'prison-sewers', entryId: 'bonfire' },
    lit: world.hasFlag(BONFIRE_ID),
  });

  // Saída de volta: a boca do túnel por onde se entrou.
  addSewerPiece(scene, 'channels', 'tunnel-outflow', 140, FLOOR_Y + 8, 0.6, 3, { tint: STONE_TINT });

  const slowZones: SlowZone[] = FLOODED.map(([fromX, toX]) => ({
    fromX,
    toX,
    floorY: FLOOR_Y,
    speedFactor: WATER_SPEED_FACTOR,
  }));

  return {
    title: 'Esgotos do Grilhão',
    groundMessages: [
      new GroundMessage(scene, { x: 860, floorY: FLOOR_Y, text: 'A água atrasa o passo. O rolamento, não.' }),
    ],
    subtitle: 'Bloco de Celas · Subsolo',
    floorY: FLOOR_Y,
    bounds: { x: 0, y: CEILING_Y - 80, width: WIDTH, height: FLOOR_Y + 160 - CEILING_Y + 80 },
    zoom: 0.95,
    entries: {
      galleries: { x: 230, facing: 'right' },
      bonfire: { x: BONFIRE_X - 90, facing: 'right' },
      'root-arena': { x: BOSS_GATE_X - 100, facing: 'left' },
    },
    exits: [],
    colliders: [
      createStaticCollider(scene, WIDTH / 2, FLOOR_Y + 24, WIDTH, 48),
      createStaticCollider(scene, 20, 100, 30, 1200),
      createStaticCollider(scene, WIDTH - 20, 100, 30, 1200),
      // Destroços fecham o piso, mas a passarela alta passa por cima deles.
      createStaticCollider(scene, COLLAPSED_PASSAGE_X, FLOOR_Y - 105, 120, 210),
      ...LOW_WALKWAYS.map(([from, to]) => createOneWayPlatform(scene, from, LOW_WALK_Y, to - from)),
      ...HIGH_WALKWAYS.map(([from, to]) => createOneWayPlatform(scene, from, HIGH_WALK_Y, to - from)),
    ],
    gates: [],
    pickups: [],
    enemies: [...ENEMY_SPAWNS, ...SUPPLICANT_SPAWNS].map((spawn) => new MeleeEnemy(scene, spawn)),
    stairs: [],
    ladders,
    slowZones,
    bonfires: [bonfire],
    chests: [hiddenChest],
    passages: [
      { x: BOSS_GATE_X, floorY: FLOOR_Y, label: 'Entrar no sumidouro', toRoom: 'prison-root-arena', toEntry: 'sewers' },
      { x: 140, floorY: FLOOR_Y, label: 'Subir pelo bueiro', toRoom: 'prison-drowned-galleries', toEntry: 'sewer' },
    ],
  };
}

// Fundo panorâmico do túnel (arcos, pontes e água ao longe), escurecido e
// passando bem mais devagar que a camada jogável.
function addFarBackground(scene: Phaser.Scene): void {
  const frame = scene.textures.getFrame(SEWER_BACKGROUND.key);
  const scale = (FLOOR_Y + 160 - CEILING_Y + 80) / frame.height;
  const width = frame.width * scale;

  for (let x = 0, index = 0; x < WIDTH * FAR_SCROLL + width; x += width, index += 1) {
    scene.add
      .image(x, CEILING_Y - 80, SEWER_BACKGROUND.key)
      .setOrigin(0, 0)
      .setScale(scale)
      .setFlipX(index % 2 === 1)
      .setScrollFactor(FAR_SCROLL, 1)
      .setDepth(0.2)
      .setTint(FAR_TINT);
  }
}

// Um vão do túnel: parede de pedra embaixo (com arco, nicho ou boca de túnel
// alternando), colunas nas bordas e canos atravessando a parede.
function addBay(scene: Phaser.Scene, bay: number): void {
  const left = bay * BAY_WIDTH;
  const center = left + BAY_WIDTH / 2;
  const variant = bay % 3;
  const wallFrame = bay % 2 ? 'wall-moss' : 'wall-seep';

  addSewerPiece(scene, 'architecture', wallFrame, center - 150, FLOOR_Y, 1.1, 1.6, { tint: BACK_TINT });
  addSewerPiece(scene, 'architecture', wallFrame, center + 150, FLOOR_Y, 1.1, 1.6, { tint: BACK_TINT, flipX: true });

  if (variant === 0) {
    addSewerPiece(scene, 'architecture', 'arch-big', center, FLOOR_Y, 1.25, 2, { tint: BACK_TINT });
  } else if (variant === 1) {
    addSewerPiece(scene, 'architecture', 'niche', center, FLOOR_Y, 1.2, 2, { tint: BACK_TINT });
    addSewerPiece(scene, 'pipes', 'sluice-closed', center + 190, FLOOR_Y, 0.55, 2.2, { tint: BACK_TINT });
  } else {
    addSewerPiece(scene, 'architecture', 'tunnel-mouth', center, FLOOR_Y, 1.2, 2, { tint: BACK_TINT });
    addTorchGlow(scene, center, FLOOR_Y - 230);
  }

  // Coluna de duas peças do chão até perto do teto.
  addSewerPiece(scene, 'architecture', bay % 4 === 3 ? 'column-broken' : 'column', left, FLOOR_Y + 4, 1.7, 4);
  addSewerPiece(scene, 'architecture', 'column', left, FLOOR_Y - 420, 1.5, 4, { tint: BACK_TINT });

  // Canos correndo pela parede, ligados por cotovelos e válvulas.
  const pipeY = LOW_WALK_Y - 110 + (bay % 2) * 40;
  addSewerPiece(scene, 'pipes', 'pipe-h', center - 120, pipeY, 0.6, 2.3, { tint: BACK_TINT });
  addSewerPiece(scene, 'pipes', bay % 3 === 1 ? 'valve' : 'pipe-h', center + 80, pipeY, 0.6, 2.3, { tint: BACK_TINT });
}

// Teto: lajes molhadas viradas para baixo, com trepadeiras.
function addCeiling(scene: Phaser.Scene): void {
  const scale = 0.7;
  const step = 330 * scale;

  for (let x = 0, index = 0; x < WIDTH + step; x += step, index += 1) {
    addSewerPiece(scene, 'architecture', index % 3 === 1 ? 'bridge-arch' : 'floor-wet', x, CEILING_Y + 70, scale, 7, {
      tint: BACK_TINT,
      flipX: index % 2 === 1,
    });
  }
}

// Chão: calçada de pedra molhada; nos trechos alagados, canal com água rasa
// animada por cima, na frente dos pés.
function addFloor(scene: Phaser.Scene): void {
  const scale = 0.62;
  const step = 330 * scale;

  for (let x = step / 2, index = 0; x < WIDTH + step; x += step, index += 1) {
    const flooded = FLOODED.some(([from, to]) => x > from && x < to);
    addSewerPiece(scene, flooded ? 'channels' : 'architecture', flooded ? 'channel-foam' : 'floor-wet', x, FLOOR_Y - 10, scale, 6, {
      originY: 0,
      tint: STONE_TINT,
    });
  }

  for (const [from, to] of FLOODED) {
    addShallowWater(scene, from, to, FLOOR_Y - 6, 0.4, 10.4, 0.85);
  }
}

// Canal correndo em primeiro plano, por toda a extensão do túnel.
function addForegroundChannel(scene: Phaser.Scene): void {
  addShallowWater(scene, 0, WIDTH, FLOOR_Y + 70, 0.55, 13);
}

// Passarela de pedra gotejante, com musgo pendendo da borda.
function addWalkway(scene: Phaser.Scene, fromX: number, toX: number, topY: number): void {
  const scale = 0.55;
  const step = 330 * scale;

  for (let x = fromX + step / 2, index = 0; x < toX + step / 2; x += step, index += 1) {
    addSewerPiece(scene, 'architecture', 'floor-wet', Math.min(x, toX - step / 2), topY - 8, scale, 6, {
      originY: 0,
      tint: STONE_TINT,
      flipX: index % 2 === 1,
    });
  }

  const mosses = ['moss-a', 'moss-b', 'moss-c', 'moss-curtain'];
  for (let x = fromX + 60, index = 0; x < toX - 40; x += 130, index += 1) {
    addHangingPlant(scene, mosses[index % mosses.length], x, topY + 50, 0.4, 6.2);
  }
}

// Canos despejando água (animados) e quedas estáticas nas paredes.
function addWaterfalls(scene: Phaser.Scene): void {
  for (const x of [1000, 1650, 2950, 3450, 4350]) {
    addWaterfall(scene, x, FLOOR_Y, 0.5, 2.8);
  }

  addSewerPiece(scene, 'channels', 'fall-wide', 2250, FLOOR_Y + 6, 0.75, 2.6, { tint: STONE_TINT });
  addSewerPiece(scene, 'channels', 'grate-outflow', 4600, FLOOR_Y + 6, 0.75, 2.6, { tint: STONE_TINT });
}

// Trepadeiras, raízes e musgo pendendo do teto em duas camadas: meio e
// primeiro plano (escuras, com parallax).
function addHangingVegetation(scene: Phaser.Scene): void {
  const frames = ['vine-thick', 'vine-thin', 'vine-wide', 'roots-a', 'moss-curtain', 'vine-garland', 'roots-long', 'roots-b'];

  for (let x = 60, index = 0; x < WIDTH; x += Phaser.Math.Between(110, 190), index += 1) {
    addHangingPlant(scene, frames[index % frames.length], x, CEILING_Y + 40, Phaser.Math.FloatBetween(0.55, 0.8), 7.5);
  }

  for (let x = 300, index = 0; x < WIDTH; x += Phaser.Math.Between(500, 800), index += 1) {
    addHangingPlant(scene, index % 2 ? 'roots-long' : 'vine-thick', x, CEILING_Y - 10, 1.1, 14, {
      tint: 0x1a1a22,
      scrollFactor: 1.2,
    });
  }

  // Samambaias e fungos crescendo nas colunas.
  for (let bay = 1; bay * BAY_WIDTH < WIDTH; bay += 2) {
    addSewerPiece(scene, 'vegetation', bay % 4 === 1 ? 'fern-wall' : 'fungus-wall', bay * BAY_WIDTH + 30, FLOOR_Y - 120, 0.45, 4.2);
  }
}

// Objetos pelo túnel: ninhos e ossos onde os ratos se juntam, barris vazando,
// fungos perto da água, gaiolas e ganchos pendurados.
function addProps(scene: Phaser.Scene): void {
  const floor: ReadonlyArray<readonly [string, number, number]> = [
    ['nest', 700, 0.45],
    ['skeleton', 900, 0.4],
    ['barrel-spilled', 1400, 0.4],
    ['mushrooms-green', 1750, 0.35],
    ['barricade', COLLAPSED_PASSAGE_X, 0.58],
    ['crates-sacks', 2050, 0.42],
    ['nest', 2300, 0.45],
    ['sludge-bubbles', 2700, 0.4],
    ['barrel', 3150, 0.35],
    ['mushrooms-purple', 3550, 0.35],
    ['cart-broken', 3780, 0.42],
    ['nest', 4150, 0.45],
    ['skeleton', 4450, 0.4],
    ['workbench', 4720, 0.4],
    ['barricade', WIDTH - 60, 0.45],
  ];

  for (const [frame, x, scale] of floor) {
    addSewerPiece(scene, 'props', frame, x, FLOOR_Y + 4, scale, 8.5);
  }

  addSewerPiece(scene, 'props', 'mushrooms-green', 1350, LOW_WALK_Y + 2, 0.3, 8.5);
  addSewerPiece(scene, 'props', 'barrel', 3400, LOW_WALK_Y + 2, 0.3, 8.5);
  addSewerPiece(scene, 'props', 'mushrooms-purple', 2600, HIGH_WALK_Y + 2, 0.3, 8.5);

  for (const [frame, x, topY] of [
    ['cage', 1250, CEILING_Y + 60],
    ['hooks', 2100, CEILING_Y + 60],
    ['gas-sac', 3300, CEILING_Y + 60],
    ['cage', 4050, CEILING_Y + 60],
  ] as const) {
    addHangingPlant(scene, 'vine-thin', x, topY - 20, 0.5, 7.4);
    addSewerPiece(scene, 'props', frame, x, topY + 120, 0.5, 7.6, { originY: 0 });
  }
}

// Moldura do portão do boss: colunas, manivela e luz verde vazando.
function addBossGateFrame(scene: Phaser.Scene): void {
  const glow = scene.add
    .ellipse(BOSS_GATE_X, FLOOR_Y - 180, 420, 380, 0x6adf8a, 0.1)
    .setDepth(2.9)
    .setBlendMode(Phaser.BlendModes.ADD);

  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.05, to: 0.16 },
    scale: { from: 0.95, to: 1.08 },
    duration: 2200,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  });

  addSewerPiece(scene, 'pipes', 'counterweight', BOSS_GATE_X - 290, FLOOR_Y - 160, 0.6, 2.5);
}
