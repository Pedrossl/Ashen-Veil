import Phaser from 'phaser';

import { ITEM_IMAGES, ITEMS } from '../../data/items';
import { MeleeEnemy } from '../../entities/enemies/MeleeEnemy';
import { Bonfire } from '../../entities/world/Bonfire';
import { Chest } from '../../entities/world/Chest';
import { Ladder } from '../../entities/world/Ladder';
import { Staircase } from '../../entities/world/Staircase';
import type { WorldState } from '../../systems/WorldState';
import type { Room } from '../types';
import {
  addBackWall,
  addDust,
  addPillar,
  addProp,
  addStoneLedges,
  addTorchGlow,
  createStaticCollider,
  FLOOR_Y,
  PRISON_ATLAS_KEY,
  TINTS,
  type PropPlacement,
} from './prisonKit';

// Câmara vertical: chão embaixo, galeria elevada à direita e teto muito alto.
const WIDTH = 2050;
const GALLERY_Y = 262;
const GALLERY_START_X = 1100;
const CEILING_Y = -380;
// Plataforma alta, alcançada pela escada de mão a partir da galeria.
const LEDGE_Y = -60;
const LEDGE_START_X = 1640;
const LADDER_X = 1700;
const CHEST_ID = 'prison-chain-well-chest';
const BONFIRE_ID = 'bonfire:prison-boss-door';
const WALL_TINT = 0x6d6578;

const STAIRS = {
  bottom: { x: 700, y: FLOOR_Y },
  top: { x: GALLERY_START_X, y: GALLERY_Y },
  stepCount: 10,
} as const;

const PROPS: PropPlacement[] = [
  // Embaixo da galeria: restos de quem caiu no poço.
  { frame: 'bones', x: 1430, bottomY: FLOOR_Y + 4, scale: 0.8, depth: 8, tint: 0x8a8098 },
  { frame: 'rubble', x: 1760, bottomY: FLOOR_Y + 6, scale: 0.9, depth: 8, tint: TINTS.cellWall },
  { frame: 'wall-shackles', x: 1640, bottomY: 470, scale: 1.05, depth: 3, tint: WALL_TINT },
  // Na galeria.
  { frame: 'corridor-torch', x: 1320, bottomY: GALLERY_Y - 20, scale: 1.05, depth: 2, tint: WALL_TINT },
  { frame: 'wall-banner', x: 1560, bottomY: GALLERY_Y - 14, scale: 1.1, depth: 2, tint: WALL_TINT },
  { frame: 'hanging-chains', x: 1180, bottomY: GALLERY_Y + 230, scale: 1, depth: 7, tint: TINTS.iron },
  // Na plataforma alta: a porta para o covil do boss.
  { frame: 'iron-door', x: 1955, bottomY: LEDGE_Y + 4, scale: 1.2, depth: 3, tint: TINTS.iron },
  // Silhuetas de pilares em primeiro plano reforçam a altura da câmara.
  { frame: 'pillar', x: 330, bottomY: 760, scale: 2.4, depth: 14, tint: 0x07050a, scrollFactor: 1.25 },
  { frame: 'pillar', x: 1500, bottomY: 760, scale: 2.4, depth: 14, tint: 0x07050a, scrollFactor: 1.25 },
];

export function createChainWell(scene: Phaser.Scene, world: WorldState): Room {
  addBackWall(scene, 0, WIDTH, WALL_TINT, CEILING_Y, FLOOR_Y + 40);
  addStoneLedges(scene, -20, WIDTH, FLOOR_Y - 4, false);
  addStoneLedges(scene, -20, WIDTH, CEILING_Y + 8, true);

  addEntranceArch(scene, 100);
  addGallery(scene);
  addLedge(scene);

  const ladder = new Ladder(scene, {
    atlasKey: PRISON_ATLAS_KEY,
    x: LADDER_X,
    bottomY: GALLERY_Y,
    topY: LEDGE_Y,
    scale: 1.1,
    tint: 0xb8a890,
    depth: 3.5,
  });

  // Lanterna de descanso diante da porta do covil: último checkpoint antes do boss.
  const bonfire = new Bonfire(scene, {
    id: BONFIRE_ID,
    x: 1835,
    floorY: LEDGE_Y,
    depth: 8,
    checkpoint: { roomId: 'prison-chain-well', entryId: 'bonfire' },
    lit: world.hasFlag(BONFIRE_ID),
  });

  // O baú no fim da galeria guarda a primeira arma.
  const chest = new Chest(scene, {
    id: CHEST_ID,
    atlasKey: PRISON_ATLAS_KEY,
    x: 1880,
    floorY: GALLERY_Y + 2,
    scale: 1.5,
    tint: 0xe6dcef,
    depth: 8,
    item: ITEMS.bambooSword,
    itemTextureKey: ITEM_IMAGES['bamboo-sword'].key,
    startsOpen: world.hasFlag(CHEST_ID),
  });

  const stairs = new Staircase(scene, {
    atlasKey: PRISON_ATLAS_KEY,
    ...STAIRS,
    tint: 0x8e86a0,
    depth: 6,
  });

  for (const prop of PROPS) {
    addProp(scene, prop);
  }

  // O Carcereiro do Véu guarda o pé da escadaria, sob o feixe da lua.
  const jailer = new MeleeEnemy(scene, {
    kind: 'veilJailer',
    x: 600,
    floorY: FLOOR_Y,
    patrolMinX: 470,
    patrolMaxX: 680,
    facing: 'left',
  });

  addCageOnChain(scene, 'hanging-cage', 560, 300);
  addCageOnChain(scene, 'hanging-cage-small', 980, 170);
  addCageOnChain(scene, 'hanging-cage', 1440, 30);

  addTorchGlow(scene, 1308, GALLERY_Y - 94);
  addMoonShaft(scene, 760, -170);
  addFloorMist(scene);
  addDepthShading(scene);

  return {
    title: 'Poço das Correntes',
    subtitle: 'Bloco de Celas · Subnível II',
    floorY: FLOOR_Y,
    bounds: { x: 0, y: CEILING_Y - 60, width: WIDTH, height: FLOOR_Y + 155 - CEILING_Y + 60 },
    zoom: 1.35,
    entries: {
      corridor: { x: 180, facing: 'right' },
      gallery: { x: 1780, y: GALLERY_Y, facing: 'left' },
      ledge: { x: 1880, y: LEDGE_Y, facing: 'left' },
      bonfire: { x: 1745, y: LEDGE_Y, facing: 'right' },
    },
    exits: [
      { side: 'left', x: 60, toRoom: 'prison-cell-block', toEntry: 'deep' },
      // A porta de ferro da plataforma alta desce ao covil do boss.
      { side: 'right', x: 1935, toRoom: 'prison-boss-lair', toEntry: 'well', maxFeetY: 0 },
    ],
    colliders: [
      createStaticCollider(scene, WIDTH / 2, FLOOR_Y + 24, WIDTH, 48),
      createStaticCollider(scene, 20, 200, 30, 900),
      createStaticCollider(scene, WIDTH - 20, 200, 30, 900),
      createOneWayPlatform(scene, GALLERY_START_X, GALLERY_Y, WIDTH - GALLERY_START_X),
      createOneWayPlatform(scene, LEDGE_START_X, LEDGE_Y, WIDTH - LEDGE_START_X),
    ],
    gates: [],
    pickups: [],
    enemies: [jailer],
    stairs: [stairs],
    ladders: [ladder],
    chests: [chest],
    bonfires: [bonfire],
  };
}

// Arco por onde o jogador chega do corredor.
function addEntranceArch(scene: Phaser.Scene, x: number): void {
  scene.add.rectangle(x, FLOOR_Y, 230, 230, 0x030205, 0.95).setOrigin(0.5, 1).setDepth(8);
  scene.add
    .image(x, FLOOR_Y + 8, PRISON_ATLAS_KEY, 'arch-passage')
    .setOrigin(0.5, 1)
    .setScale(1.3)
    .setDepth(9.5)
    .setTint(WALL_TINT);
}

// Galeria de pedra apoiada em pilares altos, com sombra embaixo.
function addGallery(scene: Phaser.Scene): void {
  scene.add
    .rectangle(GALLERY_START_X, GALLERY_Y, WIDTH - GALLERY_START_X, FLOOR_Y - GALLERY_Y, 0x05030a, 0.4)
    .setOrigin(0, 0)
    .setDepth(4.5);

  for (const x of [1250, 1560, 1870]) {
    addPillar(scene, x, FLOOR_Y, 1.55);
  }

  addStoneLedges(scene, GALLERY_START_X - 10, WIDTH, GALLERY_Y - 4, false);
}

// Plataforma estreita perto do teto, presa à parede.
function addLedge(scene: Phaser.Scene): void {
  scene.add
    .rectangle(LEDGE_START_X, LEDGE_Y, WIDTH - LEDGE_START_X, 70, 0x05030a, 0.35)
    .setOrigin(0, 0)
    .setDepth(4.5);
  addStoneLedges(scene, LEDGE_START_X - 10, WIDTH, LEDGE_Y - 4, false);
}

// Gaiola pendurada por uma corrente longa, balançando a partir do teto.
function addCageOnChain(scene: Phaser.Scene, frame: string, x: number, cageTopY: number): void {
  const anchorY = CEILING_Y + 10;
  const length = cageTopY - anchorY;
  const swing = scene.add
    .container(x, anchorY, [
      scene.add.rectangle(0, 0, 3, length, 0x3a2a24).setOrigin(0.5, 0),
      scene.add.image(0, length, PRISON_ATLAS_KEY, frame).setOrigin(0.5, 0).setTint(TINTS.iron),
    ])
    .setDepth(8);

  scene.tweens.add({
    targets: swing,
    angle: { from: -1.6, to: 1.6 },
    duration: 3200 + (x % 900),
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  });
}

// Luz da lua entrando por uma janela lá no alto e cruzando a câmara.
function addMoonShaft(scene: Phaser.Scene, windowX: number, windowBottomY: number): void {
  addProp(scene, {
    frame: 'barred-window',
    x: windowX,
    bottomY: windowBottomY,
    scale: 1.4,
    depth: 3,
    tint: 0xb8b0c8,
  });

  const beam = scene.add
    .polygon(
      0,
      0,
      [
        windowX - 26, windowBottomY - 90,
        windowX + 26, windowBottomY - 90,
        560, FLOOR_Y,
        360, FLOOR_Y,
      ],
      0x9fa6ff,
      0.1,
    )
    .setOrigin(0, 0)
    .setDepth(12)
    .setBlendMode(Phaser.BlendModes.ADD);

  scene.tweens.add({
    targets: beam,
    alpha: { from: 0.7, to: 1 },
    duration: 3000,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  });

  scene.add
    .ellipse(460, FLOOR_Y + 2, 240, 20, 0x9fa6ff, 0.14)
    .setDepth(7)
    .setBlendMode(Phaser.BlendModes.ADD);

  addDust(scene, [
    [windowX - 40, 40, 1.2],
    [windowX - 110, 160, 1],
    [windowX - 180, 280, 1.3],
    [windowX - 250, 390, 1.1],
    [windowX - 320, 490, 1.4],
  ]);
}

function addFloorMist(scene: Phaser.Scene): void {
  for (let x = 0; x < WIDTH; x += 380) {
    const mist = scene.add
      .ellipse(x, FLOOR_Y - 8, 480, 40, 0x8a80a8, 0.08)
      .setDepth(11)
      .setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: mist,
      x: x + 80,
      alpha: { from: 0.05, to: 0.1 },
      duration: 5600 + (x % 1100),
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }
}

// O alto do poço some no escuro; embaixo do piso também.
function addDepthShading(scene: Phaser.Scene): void {
  const shade = 0x020104;

  scene.add.rectangle(0, CEILING_Y - 120, WIDTH, 120, shade, 0.96).setOrigin(0, 0).setDepth(15);
  scene.add.rectangle(0, CEILING_Y, WIDTH, 160, shade, 0.45).setOrigin(0, 0).setDepth(11);
  scene.add.rectangle(0, FLOOR_Y + 70, WIDTH, 400, shade, 0.9).setOrigin(0, 0).setDepth(15);
}

// Plataforma que só segura por cima: dá para passar embaixo e subir pela escada.
function createOneWayPlatform(
  scene: Phaser.Scene,
  fromX: number,
  topY: number,
  width: number,
): Phaser.GameObjects.Rectangle {
  const platform = createStaticCollider(scene, fromX + width / 2, topY + 10, width, 20);
  const body = platform.body as Phaser.Physics.Arcade.StaticBody;

  body.checkCollision.down = false;
  body.checkCollision.left = false;
  body.checkCollision.right = false;
  return platform;
}
