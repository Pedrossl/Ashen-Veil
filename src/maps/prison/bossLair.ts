import Phaser from 'phaser';

import { ReaperKing } from '../../entities/bosses/ReaperKing';
import type { WorldState } from '../../systems/WorldState';
import type { Room } from '../types';
import {
  addBackWall,
  addProp,
  addStoneLedges,
  createStaticCollider,
  FLOOR_Y,
  PRISON_ATLAS_KEY,
  type PropPlacement,
} from './prisonKit';

// Arena larga e alta; a câmera afasta para mostrar o covil inteiro.
const WIDTH = 2600;
const CEILING_Y = -110;
const THRONE_X = 2080;
const WALL_TINT = 0x564c63;
const ARCH_TINT = 0x483f55;
const BONE_TINT = 0xb7aa9a;
const BOSS_DEFEATED_FLAG = 'boss-defeated:reaper-king';

// Colunata de arcos gigantes ao fundo; cada nicho guarda ossos.
const ARCHES_X = [470, 950, 1430] as const;
// Fogueira ritual no meio da arena, longe do trono e dos montes de caveiras.
const BONFIRE_X = 1190;

// Tochas nos pilares entre os arcos; nenhuma cobre arco, monte ou fogueira.
const FLOOR_TORCHES = [
  { frame: 'standing-torch-tall', x: 230 },
  { frame: 'standing-torch', x: 710 },
  { frame: 'standing-torch-tall', x: 1650 },
  { frame: 'standing-torch-tall', x: 2530 },
] as const;

// Ossos e caveiras espalhados pelo chão (x, frame, escala, espelhado).
const FLOOR_BONES: ReadonlyArray<readonly [number, string, number, boolean]> = [
  [200, 'bones', 0.7, false],
  [455, 'skull', 0.9, false],
  [610, 'bones', 0.55, true],
  [905, 'skull-small', 0.9, true],
  [1010, 'bones', 0.8, false],
  [1330, 'skull', 0.8, true],
  [1420, 'bones', 0.6, true],
  [1640, 'skull-small', 1, false],
  [1720, 'bones', 0.9, true],
  [2250, 'bones', 0.75, false],
  [2470, 'skull', 1, true],
];

// Silhuetas escuras em primeiro plano (passam mais rápido que o cenário).
const FOREGROUND: PropPlacement[] = [
  { frame: 'bones', x: 420, bottomY: 720, scale: 1.8, depth: 14, tint: 0x0a070d, scrollFactor: 1.15 },
  { frame: 'pillar', x: 1200, bottomY: 760, scale: 3, depth: 14, tint: 0x06040a, scrollFactor: 1.2 },
  { frame: 'bones', x: 2150, bottomY: 725, scale: 2, depth: 14, tint: 0x0a070d, scrollFactor: 1.15, flipX: true },
];

export function createBossLair(scene: Phaser.Scene, world: WorldState): Room {
  addBackWall(scene, 0, WIDTH, WALL_TINT, CEILING_Y, FLOOR_Y + 40);
  addStoneLedges(scene, -20, WIDTH, FLOOR_Y - 4, false);
  addStoneLedges(scene, -20, WIDTH, CEILING_Y + 8, true);

  addEntrance(scene, 110);
  addOssuaryWall(scene);
  ARCHES_X.forEach((x, index) => addOssuaryArch(scene, x, index));
  addThrone(scene);
  addProp(scene, { frame: 'bonfire', x: BONFIRE_X, bottomY: FLOOR_Y + 6, scale: 1.3, depth: 8.5, tint: 0xffffff });
  addFlicker(scene, BONFIRE_X, FLOOR_Y - 70, 1.4);

  for (const torch of FLOOR_TORCHES) {
    addStandingTorch(scene, torch.frame, torch.x);
  }

  for (const [x, frame, scale, flipX] of FLOOR_BONES) {
    addProp(scene, { frame, x, bottomY: FLOOR_Y + 4, scale, depth: 8, tint: BONE_TINT, flipX });
  }

  for (const x of [700, 1450, 2300]) {
    addHangingCage(scene, x);
  }

  FOREGROUND.forEach((prop) => addProp(scene, prop));
  addEmbers(scene);
  addPurpleMist(scene);
  addShading(scene);

  // O boss espera diante do trono e desperta quando o jogador avança.
  const bosses = world.hasFlag(BOSS_DEFEATED_FLAG)
    ? []
    : [
        new ReaperKing(scene, {
          x: THRONE_X - 40,
          floorY: FLOOR_Y,
          minX: 320,
          maxX: WIDTH - 120,
          onDefeated: () => world.setFlag(BOSS_DEFEATED_FLAG),
        }),
      ];

  return {
    title: 'Ossuário do Rei Ceifador',
    subtitle: 'Bloco de Celas · Profundezas',
    floorY: FLOOR_Y,
    bounds: { x: 0, y: CEILING_Y - 120, width: WIDTH, height: FLOOR_Y + 150 - CEILING_Y + 120 },
    zoom: 0.9,
    entries: {
      well: { x: 220, facing: 'right' },
    },
    exits: [{ side: 'left', x: 60, toRoom: 'prison-chain-well', toEntry: 'ledge' }],
    colliders: [
      createStaticCollider(scene, WIDTH / 2, FLOOR_Y + 24, WIDTH, 48),
      createStaticCollider(scene, 20, 200, 30, 900),
      createStaticCollider(scene, WIDTH - 20, 200, 30, 900),
    ],
    gates: [],
    pickups: [],
    enemies: [],
    stairs: [],
    bosses,
  };
}

function addEntrance(scene: Phaser.Scene, x: number): void {
  scene.add.rectangle(x, FLOOR_Y, 230, 230, 0x030205, 0.95).setOrigin(0.5, 1).setDepth(8);
  addProp(scene, { frame: 'arch-passage', x, bottomY: FLOOR_Y + 8, scale: 1.3, depth: 9.5, tint: ARCH_TINT });
}

// Arco gigante com um nicho escuro cheio de ossos, cercado por lanças.
function addOssuaryArch(scene: Phaser.Scene, x: number, index: number): void {
  scene.add.rectangle(x, FLOOR_Y, 420, 330, 0x07050b, 0.75).setOrigin(0.5, 1).setDepth(1.2);
  addProp(scene, { frame: 'arch-passage', x, bottomY: FLOOR_Y + 10, scale: 2, depth: 1.5, tint: ARCH_TINT });
  addSkullHeap(scene, x, FLOOR_Y - 2, 5 - (index % 2), 1.4);
  addProp(scene, { frame: 'spike-fence', x: x - 120, bottomY: FLOOR_Y + 4, scale: 1.4, depth: 7, tint: 0x9a8e8a });
  addProp(scene, { frame: 'spike-fence', x: x + 120, bottomY: FLOOR_Y + 4, scale: 1.4, depth: 7, tint: 0x9a8e8a, flipX: true });
}

// Arco escuro enorme atrás do boss, ladeado por montes de caveiras e bandeiras.
function addThrone(scene: Phaser.Scene): void {
  scene.add.rectangle(THRONE_X, FLOOR_Y, 560, 470, 0x050308, 0.95).setOrigin(0.5, 1).setDepth(1.3);

  const glow = scene.add
    .ellipse(THRONE_X, FLOOR_Y - 190, 420, 380, 0x6b2fb0, 0.18)
    .setDepth(1.4)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.5, to: 1 },
    duration: 2600,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  });

  addProp(scene, { frame: 'arch-passage', x: THRONE_X, bottomY: FLOOR_Y + 12, scale: 2.6, depth: 1.5, tint: ARCH_TINT });

  for (const side of [-1, 1] as const) {
    addProp(scene, { frame: 'wall-banner', x: THRONE_X + side * 420, bottomY: FLOOR_Y - 250, scale: 1.6, depth: 1.6, tint: 0x8a7c96 });
    // Montes atrás do boss, ladeando o arco do trono.
    addSkullHeap(scene, THRONE_X + side * 250, FLOOR_Y + 2, 6, 1.3);
  }
}

// Parede de ossuário: fileiras de caveiras incrustadas acima da colunata.
function addOssuaryWall(scene: Phaser.Scene): void {
  const rows = [
    { y: 70, step: 46, scale: 0.75, tint: 0x4e4552 },
    { y: 104, step: 40, scale: 0.85, tint: 0x5e5460 },
    { y: 140, step: 46, scale: 0.75, tint: 0x4e4552 },
  ];

  rows.forEach((row, rowIndex) => {
    for (let x = 30 + rowIndex * 20; x < WIDTH; x += row.step) {
      // Falhas na fileira, como se algumas caveiras tivessem caído.
      if ((x * 7 + rowIndex * 13) % 11 === 0) {
        continue;
      }

      addProp(scene, {
        frame: (x + rowIndex) % 3 === 0 ? 'skull-small' : 'skull',
        x,
        bottomY: row.y,
        scale: row.scale,
        depth: 1.1,
        tint: row.tint,
        flipX: (x + rowIndex) % 2 === 0,
      });
    }
  });

  // Faixa de pedra embaixo das fileiras, atrás dos arcos da colunata.
  for (let x = -20; x < WIDTH; x += 300) {
    scene.add
      .image(x, 150, PRISON_ATLAS_KEY, 'stone-ledge')
      .setOrigin(0, 0)
      .setDisplaySize(304, 80)
      .setDepth(1.15)
      .setTint(0x6a6076);
  }
}

// Pirâmide de caveiras empilhadas: cada fileira tem uma a menos que a de baixo.
function addSkullHeap(scene: Phaser.Scene, centerX: number, baseY: number, rows: number, scale: number): void {
  const frames = ['skull', 'skull-small'] as const;
  const spacing = 34 * scale;
  const rise = 22 * scale;

  for (let row = 0; row < rows; row += 1) {
    const count = rows - row;

    for (let column = 0; column < count; column += 1) {
      const x = centerX + (column - (count - 1) / 2) * spacing + ((row * 7 + column * 13) % 9) - 4;
      const frame = frames[(row + column) % 2];

      addProp(scene, {
        frame,
        x,
        bottomY: baseY - row * rise,
        scale: scale * (0.9 + ((column * 7 + row) % 3) * 0.08),
        depth: 2 + row * 0.01,
        // Fileiras de baixo mais escuras, como se a luz viesse de cima.
        tint: Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(0x6a6070),
          Phaser.Display.Color.ValueToColor(BONE_TINT),
          rows,
          row,
        ).color,
        flipX: (row + column) % 3 === 0,
      });
    }
  }
}

function addStandingTorch(scene: Phaser.Scene, frame: string, x: number): void {
  addProp(scene, { frame, x, bottomY: FLOOR_Y + 4, scale: 1.4, depth: 7, tint: 0xffffff });
  addFlicker(scene, x, FLOOR_Y - 165, 1);
}

// Luz quente que tremula em volta de uma chama.
function addFlicker(scene: Phaser.Scene, x: number, y: number, size: number): void {
  const glow = scene.add.container(x, y).setDepth(6);

  glow.add([
    scene.add.circle(0, 0, 150 * size, 0xff5a1f, 0.05),
    scene.add.circle(0, 0, 90 * size, 0xff7938, 0.07),
    scene.add.circle(0, 0, 45 * size, 0xffb15a, 0.09),
  ]);

  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.65, to: 1 },
    scaleX: { from: 0.94, to: 1.06 },
    scaleY: { from: 1.04, to: 0.95 },
    duration: 520 + (x % 400),
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  });
}

function addHangingCage(scene: Phaser.Scene, x: number): void {
  const anchorY = CEILING_Y + 10;
  const length = 140 + (x % 120);
  const swing = scene.add
    .container(x, anchorY, [
      scene.add.rectangle(0, 0, 3, length, 0x3a2a24).setOrigin(0.5, 0),
      scene.add.image(0, length, PRISON_ATLAS_KEY, 'hanging-cage').setOrigin(0.5, 0).setScale(1.3).setTint(0x9a8ea8),
      scene.add.image(0, length + 70, PRISON_ATLAS_KEY, 'skull-small').setScale(0.7).setTint(BONE_TINT),
    ])
    .setDepth(3);

  scene.tweens.add({
    targets: swing,
    angle: { from: -1.4, to: 1.4 },
    duration: 3400 + (x % 900),
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  });
}

// Brasas subindo das tochas e da fogueira.
function addEmbers(scene: Phaser.Scene): void {
  const sources = [...FLOOR_TORCHES.map((torch) => torch.x), BONFIRE_X];

  sources.forEach((x, index) => {
    for (let i = 0; i < 4; i += 1) {
      const ember = scene.add
        .circle(x + ((i * 17) % 30) - 15, FLOOR_Y - 150, 1.6, 0xffa050, 0.9)
        .setDepth(12)
        .setBlendMode(Phaser.BlendModes.ADD);

      scene.tweens.add({
        targets: ember,
        y: FLOOR_Y - 420 - i * 30,
        x: ember.x + (i % 2 === 0 ? 30 : -24),
        alpha: { from: 0.9, to: 0 },
        duration: 2400 + i * 500,
        delay: index * 300 + i * 650,
        repeat: -1,
      });
    }
  });
}

function addPurpleMist(scene: Phaser.Scene): void {
  for (let x = 0; x < WIDTH; x += 360) {
    const mist = scene.add
      .ellipse(x, FLOOR_Y - 10, 520, 50, 0x8a5fc0, 0.09)
      .setDepth(11)
      .setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: mist,
      x: x + 90,
      alpha: { from: 0.05, to: 0.12 },
      duration: 5200 + (x % 1300),
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }
}

function addShading(scene: Phaser.Scene): void {
  const shade = 0x020104;

  scene.add.rectangle(0, CEILING_Y - 200, WIDTH, 200, shade, 0.96).setOrigin(0, 0).setDepth(15);
  scene.add.rectangle(0, CEILING_Y, WIDTH, 140, shade, 0.4).setOrigin(0, 0).setDepth(11);
  scene.add.rectangle(0, FLOOR_Y + 70, WIDTH, 400, shade, 0.9).setOrigin(0, 0).setDepth(15);
}
