import Phaser from 'phaser';
import { SERVICE_ATLASES } from '../../data/serviceWingSprites';
import { ITEMS, ITEM_IMAGES } from '../../data/items';
import { MeleeEnemy, type MeleeEnemyConfig } from '../../entities/enemies/MeleeEnemy';
import { Bonfire } from '../../entities/world/Bonfire';
import { Chest } from '../../entities/world/Chest';
import { Ladder } from '../../entities/world/Ladder';
import type { WorldState } from '../../systems/WorldState';
import type { Room } from '../types';
import { FLOOR_Y, PRISON_ATLAS_KEY, addTorchGlow, createOneWayPlatform, createStaticCollider } from './prisonKit';

const WIDTH = 4200;
const UPPER = 180;
const CHECKPOINT = 'bonfire:prison-service-wing';
const CHEST = 'prison-service-wing-infirmary-chest';
// Porta do Anfiteatro Cirúrgico (último boss), no fim do andar de baixo,
// depois da lanterna.
const THEATER_DOOR_X = 4080;
// O bloco central interrompe o piso; a passarela e as duas escadas permitem
// cruzá-lo nos dois sentidos. Todos os patamares têm uma escada de retorno.
const PLATFORMS = [[80, 1120], [1740, 2650], [3120, 4120]] as const;
const LADDER_X = [980, 1830, 2540, 3250, 3990];
const SPAWNS: MeleeEnemyConfig[] = [
  { kind: 'chainedPrisoner', x: 760, floorY: UPPER, patrolMinX: 580, patrolMaxX: 860, facing: 'left' },
  { kind: 'shackleRat', x: 700, floorY: FLOOR_Y, patrolMinX: 580, patrolMaxX: 840, facing: 'left' },
  { kind: 'prisonSurgeon', x: 1510, floorY: FLOOR_Y, patrolMinX: 1320, patrolMaxX: 1740, facing: 'left' },
  { kind: 'veilJailer', x: 2200, floorY: UPPER, patrolMinX: 2000, patrolMaxX: 2370, facing: 'left' },
  { kind: 'sludgeSupplicant', x: 2940, floorY: FLOOR_Y, patrolMinX: 2780, patrolMaxX: 3080, facing: 'left' },
  { kind: 'shackleRat', x: 3570, floorY: UPPER, patrolMinX: 3420, patrolMaxX: 3710, facing: 'left' },
];

function kitAt(x: number): string {
  return x < 1400 ? 'isolation' : x < 2800 ? 'workshop' : 'cistern';
}

function prop(scene: Phaser.Scene, kit: string, frame: string, x: number, y: number, height: number, depth = 4) {
  const image = scene.add.image(x, y, SERVICE_ATLASES[kit].key, frame).setOrigin(0.5, 1).setDepth(depth);
  image.setScale(height / image.height);
  return image;
}

function platform(scene: Phaser.Scene, from: number, to: number, y: number): void {
  // A aresta frontal da superfície fica na altura da colisão. Cortar a face
  // superior evita que a perspectiva pintada faça o jogador parecer flutuar.
  for (let x = from; x < to; x += 160) {
    const image = scene.add.image(x, y, SERVICE_ATLASES[kitAt(x)].key, 'floor').setOrigin(0, 0).setDepth(6);
    const top = Math.round(image.height * 0.43);
    image.setCrop(0, top, image.width, image.height - top);
    image.setDisplaySize(Math.min(162, to - x + 2), 100);
    image.y -= top * image.scaleY;
  }
}

export function createServiceWing(scene: Phaser.Scene, world: WorldState): Room {
  scene.add.rectangle(WIDTH / 2, 100, WIDTH, 1200, 0x100e17).setDepth(-5);
  // Dois andares com material próprio em cada setor, conservando a alvenaria.
  for (let x = 0, i = 0; x < WIDTH; x += 238, i++) {
    for (const y of [UPPER, FLOOR_Y]) {
      const wall = prop(scene, kitAt(x), i % 4 === 1 ? 'wall-worn' : i % 4 === 3 ? 'wall-marked' : 'wall', x + 120, y, 382, 0);
      wall.setDisplaySize(242, 382).setTint(y === UPPER ? 0x82778d : 0x706878);
    }
  }
  platform(scene, 0, WIDTH, FLOOR_Y);
  for (const [from, to] of PLATFORMS) platform(scene, from, to, UPPER);
  for (const x of [70, 1120, 1690, 2690, 3120, 4140]) {
    prop(scene, kitAt(x), 'column', x, FLOOR_Y, 390, 2).setTint(0x777080);
  }
  // Massa de alvenaria visível, exatamente sobre o bloqueio físico central.
  prop(scene, 'workshop', 'wall-worn', 2110, FLOOR_Y, 245, 5).setDisplaySize(220, 245);
  prop(scene, 'isolation', 'door', 240, UPPER, 230, 3);
  prop(scene, 'cistern', 'door', 3920, UPPER, 230, 3);
  prop(scene, 'isolation', 'door', THEATER_DOOR_X, FLOOR_Y, 250, 3);
  const theaterGlow = scene.add
    .ellipse(THEATER_DOOR_X, FLOOR_Y - 100, 150, 210, 0xb0121e, 0.12)
    .setDepth(2.9)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: theaterGlow, alpha: { from: 0.5, to: 1 }, duration: 2200, yoyo: true, repeat: -1 });
  prop(scene, 'furniture', 'keys', 460, UPPER, 150);
  prop(scene, 'furniture', 'stretcher', 350, FLOOR_Y, 115);
  prop(scene, 'furniture', 'cauldron', 1330, FLOOR_Y, 115);
  prop(scene, 'furniture', 'bench', 1600, FLOOR_Y, 130);
  prop(scene, 'mechanisms', 'cart', 2340, FLOOR_Y, 120);
  prop(scene, 'mechanisms', 'winch', 2450, UPPER, 120);
  prop(scene, 'mechanisms', 'pump', 3020, FLOOR_Y, 150);
  prop(scene, 'mechanisms', 'lift', 3420, FLOOR_Y, 260, 2).setTint(0x777080);
  for (const [x, y] of [[340, UPPER], [1300, FLOOR_Y], [1920, UPPER], [2450, FLOOR_Y], [3790, UPPER]]) {
    scene.add.image(x, y - 105, PRISON_ATLAS_KEY, 'corridor-torch').setOrigin(0.5, 0.5).setScale(0.45).setDepth(3);
    addTorchGlow(scene, x, y - 125);
  }
  const ladders = LADDER_X.map((x) => new Ladder(scene, {
    atlasKey: PRISON_ATLAS_KEY, x, bottomY: FLOOR_Y, topY: UPPER, scale: 1.1, tint: 0xb4a397, depth: 7,
  }));
  return {
    title: 'Alas Esquecidas', subtitle: 'Isolamento · Oficinas · Cisterna',
    floorY: FLOOR_Y, bounds: { x: 0, y: -250, width: WIDTH, height: 1000 }, zoom: 0.9,
    entries: {
      galleries: { x: 330, y: UPPER, facing: 'right' },
      cistern: { x: 3820, y: UPPER, facing: 'left' },
      bonfire: { x: 3590, facing: 'left' },
      theater: { x: 3960, facing: 'left' },
    },
    exits: [],
    passages: [
      { x: 240, floorY: UPPER, label: 'Voltar às galerias', toRoom: 'prison-drowned-galleries', toEntry: 'service-wing' },
      { x: 3920, floorY: UPPER, label: 'Abrir passagem às galerias', toRoom: 'prison-drowned-galleries', toEntry: 'cistern-wing' },
      { x: THEATER_DOOR_X, floorY: FLOOR_Y, label: 'Entrar no anfiteatro', toRoom: 'prison-surgical-theater', toEntry: 'wing' },
    ],
    colliders: [
      createStaticCollider(scene, WIDTH / 2, FLOOR_Y + 30, WIDTH, 60),
      createStaticCollider(scene, 0, 150, 40, 1300),
      createStaticCollider(scene, WIDTH, 150, 40, 1300),
      createStaticCollider(scene, 2110, FLOOR_Y - 122.5, 220, 245),
      ...PLATFORMS.map(([from, to]) => createOneWayPlatform(scene, from, UPPER, to - from)),
    ],
    gates: [], pickups: [], stairs: [], ladders,
    enemies: SPAWNS.map((spawn) => new MeleeEnemy(scene, spawn)),
    bonfires: [new Bonfire(scene, {
      id: CHECKPOINT, x: 3670, floorY: FLOOR_Y, depth: 8,
      checkpoint: { roomId: 'prison-service-wing', entryId: 'bonfire' }, lit: world.hasFlag(CHECKPOINT),
    })],
    chests: [new Chest(scene, {
      id: CHEST, x: 160, floorY: FLOOR_Y, scale: 0.55, tint: 0xd8cede, depth: 8,
      item: ITEMS.veiledEmberAmpoule, itemTextureKey: ITEM_IMAGES['veiled-ember-ampoule'].key,
      startsOpen: world.hasFlag(CHEST),
    })],
  };
}
