import Phaser from 'phaser';

import { GroundMessage } from '../../entities/world/GroundMessage';
import { ITEMS } from '../../data/items';
import { CellGate } from '../../entities/world/CellGate';
import { ItemPickup } from '../../entities/world/ItemPickup';
import type { WorldState } from '../../systems/WorldState';
import type { Room } from '../types';
import {
  addBackWall,
  addDust,
  addPillar,
  addProp,
  addStoneLedges,
  addTorchGlow,
  CELL_BED_KEY,
  CEILING_Y,
  createStaticCollider,
  FLOOR_Y,
  PRISON_ATLAS_KEY,
  TINTS,
  type PropPlacement,
} from './prisonKit';

export const CELL_GATE_ID = 'prison-cell-gate';

// A cela é pequena de propósito: o resto da tela fica no escuro.
const CELL = {
  leftWallX: 392,
  gateX: 1000,
  corridorEndX: 1280,
} as const;

const CELL_PROPS: PropPlacement[] = [
  { frame: 'barred-window', x: 612, bottomY: 440, scale: 1.15, depth: 3 },
  { frame: 'wall-shackles', x: 812, bottomY: 478, scale: 1.15, depth: 3 },
  { frame: 'stool', x: 770, bottomY: FLOOR_Y + 4, scale: 1.1, depth: 8 },
  { frame: 'bucket', x: 884, bottomY: FLOOR_Y + 4, scale: 1.1, depth: 8 },
  { frame: 'clay-pot', x: 846, bottomY: FLOOR_Y + 4, scale: 0.9, depth: 8 },
  {
    frame: 'corridor-torch',
    x: 1190,
    bottomY: FLOOR_Y - 20,
    scale: 1.05,
    depth: 2,
    tint: TINTS.farWall,
  },
];

const BED = { x: 562, width: 235, height: 116 } as const;
// Linha (0–1) da imagem da cama onde terminam os pés, ignorando a margem transparente.
const BED_FEET_ORIGIN_Y = 102 / 113;
// Os pés afundam um pouco na face superior da pedra para assentar a cama.
const BED_FLOOR_SINK = 3;

export function createCellRoom(scene: Phaser.Scene, world: WorldState): Room {
  addBackWall(scene, CELL.leftWallX, CELL.gateX, TINTS.cellWall);
  addBackWall(scene, CELL.gateX, CELL.corridorEndX, TINTS.farWall);
  addStoneLedges(scene, CELL.leftWallX - 40, CELL.corridorEndX, FLOOR_Y - 4, false);
  addStoneLedges(scene, CELL.leftWallX - 40, CELL.gateX + 90, CEILING_Y + 8, true);

  addPillar(scene, CELL.leftWallX);
  addPillar(scene, CELL.gateX + 92);

  const gate = new CellGate(scene, {
    id: CELL_GATE_ID,
    atlasKey: PRISON_ATLAS_KEY,
    x: CELL.gateX,
    floorY: FLOOR_Y + 4,
    scale: 1.25,
    tint: TINTS.iron,
    depth: 9,
    keyItemId: ITEMS.cellKey.id,
    startsOpen: world.hasFlag(CELL_GATE_ID),
  });

  const pickups: ItemPickup[] = [];

  if (!world.inventory.has(ITEMS.cellKey.id)) {
    // A chave fica no chão, no vão entre a cama e a parede.
    pickups.push(new ItemPickup(scene, 640, FLOOR_Y - 7, ITEMS.cellKey, 7.5));
  }

  addBed(scene);

  for (const prop of CELL_PROPS) {
    addProp(scene, prop);
  }

  addMoonlight(scene, 612, 440);
  addTorchGlow(scene, 1178, 468);
  addDarkness(scene);

  return {
    title: 'Cela Esquecida',
    groundMessages: [
      new GroundMessage(scene, { x: 760, floorY: FLOOR_Y, text: 'Ande com {left} e {right}. Segure {run} para correr.' }),
      new GroundMessage(scene, { x: 590, floorY: FLOOR_Y, text: 'Algo brilha atrás da cama. Chegue perto e use {interact}.' }),
    ],
    subtitle: 'Bloco de Celas · Subnível I',
    floorY: FLOOR_Y,
    // Limites justos: a câmera fica praticamente parada enquadrando a cela.
    bounds: { x: 286, y: 183, width: 948, height: 534 },
    zoom: 1.35,
    entries: {
      start: { x: 700, facing: 'right' },
      corridor: { x: 1150, facing: 'left' },
    },
    exits: [
      // Fica além do portão: o colisor dele já impede a saída enquanto estiver fechado.
      { side: 'right', x: 1205, toRoom: 'prison-cell-block', toEntry: 'cell' },
    ],
    colliders: [
      createStaticCollider(scene, 640, FLOOR_Y + 24, 1280, 48),
      createStaticCollider(scene, CELL.leftWallX + 20, 360, 30, 720),
      createStaticCollider(scene, CELL.corridorEndX - 10, 360, 30, 720),
      gate.collider,
    ],
    gates: [gate],
    pickups,
    enemies: [],
    stairs: [],
  };
}

function addBed(scene: Phaser.Scene): void {
  // Sombra de contato: sem ela a cama parece flutuar sobre o piso.
  scene.add
    .ellipse(BED.x, FLOOR_Y + 1, BED.width + 15, 14, 0x000000, 0.6)
    .setDepth(7);

  scene.add
    .image(BED.x, FLOOR_Y + BED_FLOOR_SINK, CELL_BED_KEY)
    .setOrigin(0.5, BED_FEET_ORIGIN_Y)
    .setDisplaySize(BED.width, BED.height)
    .setDepth(8)
    .setTint(0xc9c0d4);
}

// Feixe de luz da lua entrando pela janela gradeada até o chão.
function addMoonlight(scene: Phaser.Scene, windowX: number, windowY: number): void {
  const beam = scene.add
    .polygon(
      0,
      0,
      [
        windowX - 22, windowY - 70,
        windowX + 22, windowY - 70,
        windowX + 170, FLOOR_Y,
        windowX + 40, FLOOR_Y,
      ],
      0x9fa6ff,
      0.13,
    )
    .setOrigin(0, 0)
    .setDepth(12)
    .setBlendMode(Phaser.BlendModes.ADD);

  scene.tweens.add({
    targets: beam,
    alpha: { from: 0.75, to: 1 },
    duration: 2600,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  });

  scene.add
    .ellipse(windowX + 105, FLOOR_Y + 2, 160, 18, 0x9fa6ff, 0.16)
    .setDepth(7)
    .setBlendMode(Phaser.BlendModes.ADD);

  addDust(scene, [
    [windowX + 20, 420, 1.3],
    [windowX + 55, 470, 1],
    [windowX + 80, 508, 1.2],
    [windowX + 110, 452, 1],
    [windowX + 135, 530, 1.4],
  ]);
}

// Tudo fora da cela e do corredor fica quase preto.
function addDarkness(scene: Phaser.Scene): void {
  const shade = 0x020104;
  const left = CELL.leftWallX - 30;
  const ceiling = CEILING_Y - 60;

  scene.add.rectangle(0, 0, left, 720, shade, 0.96).setOrigin(0, 0).setDepth(15);
  scene.add.rectangle(left, 0, 1280 - left, ceiling, shade, 0.96).setOrigin(0, 0).setDepth(15);
  scene.add.rectangle(0, FLOOR_Y + 70, 1280, 720, shade, 0.9).setOrigin(0, 0).setDepth(15);
  // O corredor some na escuridão à direita.
  scene.add.rectangle(1240, 0, 40, 720, shade, 0.7).setOrigin(0, 0).setDepth(15);
}
