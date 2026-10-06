import Phaser from 'phaser';

import { MeleeEnemy } from '../../entities/enemies/MeleeEnemy';
import type { WorldState } from '../../systems/WorldState';
import type { Room } from '../types';
import {
  addBackWall,
  addDust,
  addPillar,
  addProp,
  addStoneLedges,
  addTorchGlow,
  CEILING_Y,
  createStaticCollider,
  FLOOR_Y,
  PRISON_ATLAS_KEY,
  TINTS,
  type PropPlacement,
} from './prisonKit';

const WIDTH = 2700;

// Pilares dividem o corredor em vãos; cada vão recebe uma peça principal.
const PILLARS_X = [232, 470, 900, 1240, 1600, 2060] as const;
const TORCHES_X = [330, 1760] as const;

const WALL_PROPS: PropPlacement[] = [
  ...TORCHES_X.map((x) => ({
    frame: 'corridor-torch',
    x,
    bottomY: FLOOR_Y - 20,
    scale: 1.05,
    depth: 2,
    tint: TINTS.corridorWall,
  })),
  { frame: 'wall-banner', x: 1070, bottomY: FLOOR_Y - 14, scale: 1.1, depth: 2, tint: TINTS.corridorWall },
  { frame: 'iron-door', x: 1420, bottomY: FLOOR_Y + 4, scale: 1.2, depth: 9, tint: TINTS.iron },
  { frame: 'wall-shackles', x: 1530, bottomY: 470, scale: 1.05, depth: 3, tint: TINTS.corridorWall },
  { frame: 'wall-ring', x: 2200, bottomY: FLOOR_Y - 6, scale: 1.05, depth: 2, tint: TINTS.corridorWall },
  { frame: 'rubble', x: 2120, bottomY: FLOOR_Y + 6, scale: 0.85, depth: 8, tint: TINTS.cellWall },
  { frame: 'clay-pot', x: 1310, bottomY: FLOOR_Y + 4, scale: 0.9, depth: 8 },
];

// Silhuetas escuras à frente da câmera dão profundidade sem esconder nada importante.
const FOREGROUND_PROPS: PropPlacement[] = [
  { frame: 'hanging-chains', x: 760, bottomY: 470, scale: 1.25, depth: 14, tint: 0x0a070e, scrollFactor: 1.3 },
  { frame: 'hanging-chains', x: 1980, bottomY: 450, scale: 1.4, depth: 14, tint: 0x0a070e, scrollFactor: 1.3, flipX: true },
];

const HANGING_CAGES = [
  { frame: 'hanging-cage', x: 800, scale: 1 },
  { frame: 'hanging-cage-small', x: 1880, scale: 1.1 },
] as const;

export function createCellBlockCorridor(scene: Phaser.Scene, _world: WorldState): Room {
  addBackWall(scene, 0, WIDTH, TINTS.corridorWall);
  addStoneLedges(scene, -20, WIDTH, FLOOR_Y - 4, false);
  addStoneLedges(scene, -20, WIDTH, CEILING_Y + 8, true);

  addOpenCellDoorway(scene, 110);
  addLockedCell(scene, 680);
  addExitArch(scene, 2520);

  for (const x of PILLARS_X) {
    addPillar(scene, x);
  }

  for (const prop of [...WALL_PROPS, ...FOREGROUND_PROPS]) {
    addProp(scene, prop);
  }

  for (const cage of HANGING_CAGES) {
    addHangingCage(scene, cage.frame, cage.x, cage.scale);
  }

  for (const x of TORCHES_X) {
    addTorchGlow(scene, x - 12, 468);
    addDust(scene, [
      [x - 40, 430, 1.1],
      [x + 30, 470, 1],
      [x + 5, 505, 1.3],
    ], 0xffd2a0);
  }

  addFloorMist(scene);
  addDarkness(scene);

  // O primeiro inimigo ronda o fim do corredor, diante do arco.
  const prisoner = new MeleeEnemy(scene, {
    kind: 'chainedPrisoner',
    x: 2330,
    floorY: FLOOR_Y,
    patrolMinX: 2150,
    patrolMaxX: 2420,
    facing: 'left',
  });

  return {
    title: 'Corredor do Bloco de Celas',
    subtitle: 'Bloco de Celas · Subnível I',
    floorY: FLOOR_Y,
    bounds: { x: 0, y: 183, width: WIDTH, height: 534 },
    zoom: 1.35,
    entries: {
      cell: { x: 200, facing: 'right' },
      deep: { x: 2440, facing: 'left' },
    },
    exits: [
      { side: 'left', x: 70, toRoom: 'prison-cell', toEntry: 'corridor' },
      // O arco do fim desce para o Poço das Correntes.
      { side: 'right', x: 2545, toRoom: 'prison-chain-well', toEntry: 'corridor' },
    ],
    colliders: [
      createStaticCollider(scene, WIDTH / 2, FLOOR_Y + 24, WIDTH, 48),
      createStaticCollider(scene, 20, 360, 30, 720),
      createStaticCollider(scene, 2600, 360, 30, 720),
    ],
    gates: [],
    pickups: [],
    enemies: [prisoner],
    stairs: [],
  };
}

// A própria cela vista do corredor: arco aberto com escuridão dentro.
function addOpenCellDoorway(scene: Phaser.Scene, x: number): void {
  addDarkPassage(scene, x, 120, 180);
  scene.add
    .image(x, FLOOR_Y + 4, PRISON_ATLAS_KEY, 'cell-gate-frame')
    .setOrigin(0.5, 1)
    .setScale(1.25)
    .setDepth(9.5)
    .setTint(TINTS.iron);
}

// Cela trancada de outro prisioneiro; só restaram os ossos.
function addLockedCell(scene: Phaser.Scene, x: number): void {
  addDarkPassage(scene, x, 120, 180);
  scene.add
    .image(x + 6, FLOOR_Y, PRISON_ATLAS_KEY, 'bones')
    .setOrigin(0.5, 1)
    .setScale(0.5)
    .setDepth(8.6)
    .setTint(0x7a7088);

  for (const frame of ['cell-gate-bars', 'cell-gate-frame']) {
    scene.add
      .image(x, FLOOR_Y + 4, PRISON_ATLAS_KEY, frame)
      .setOrigin(0.5, 1)
      .setScale(1.25)
      .setDepth(frame === 'cell-gate-bars' ? 9 : 9.5)
      .setTint(TINTS.iron);
  }
}

// Arco largo no fim do corredor; a escuridão dentro dele leva ao subnível seguinte.
function addExitArch(scene: Phaser.Scene, x: number): void {
  addDarkPassage(scene, x, 230, 230, 0.97);
  scene.add
    .image(x, FLOOR_Y + 8, PRISON_ATLAS_KEY, 'arch-passage')
    .setOrigin(0.5, 1)
    .setScale(1.3)
    .setDepth(9.5)
    .setTint(TINTS.corridorWall);

  // Corrente de ar frio saindo da passagem.
  addDust(scene, [
    [x - 60, 520, 1.2],
    [x - 10, 480, 1],
    [x + 40, 535, 1.3],
  ], 0x9fa6ff);
}

function addDarkPassage(
  scene: Phaser.Scene,
  x: number,
  width: number,
  height: number,
  alpha = 0.85,
): void {
  scene.add
    .rectangle(x, FLOOR_Y, width, height, 0x030205, alpha)
    .setOrigin(0.5, 1)
    .setDepth(8);
}

function addHangingCage(scene: Phaser.Scene, frame: string, x: number, scale: number): void {
  const cage = scene.add
    .image(x, CEILING_Y + 4, PRISON_ATLAS_KEY, frame)
    .setOrigin(0.5, 0)
    .setScale(scale)
    .setDepth(8)
    .setTint(TINTS.iron);

  // Balança devagar, como se algo tivesse passado por ali.
  scene.tweens.add({
    targets: cage,
    angle: { from: -2.5, to: 2.5 },
    duration: 2400 + (x % 700),
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  });
}

// Névoa baixa e úmida que se arrasta pelo piso.
function addFloorMist(scene: Phaser.Scene): void {
  for (let x = 0; x < WIDTH; x += 420) {
    const mist = scene.add
      .ellipse(x, FLOOR_Y - 6, 520, 34, 0x8a80a8, 0.07)
      .setDepth(11)
      .setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: mist,
      x: x + 90,
      alpha: { from: 0.04, to: 0.09 },
      duration: 6000 + (x % 1300),
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }
}

function addDarkness(scene: Phaser.Scene): void {
  const shade = 0x020104;

  scene.add.rectangle(0, 0, WIDTH, CEILING_Y - 60, shade, 0.96).setOrigin(0, 0).setDepth(15);
  scene.add.rectangle(0, FLOOR_Y + 70, WIDTH, 720, shade, 0.9).setOrigin(0, 0).setDepth(15);
}
