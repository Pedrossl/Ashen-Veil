import Phaser from 'phaser';

// Peças da prisão recortadas do tileset medieval com fundo transparente.
export const PRISON_ATLAS_KEY = 'prison-cell-atlas';
export const PRISON_ATLAS_IMAGE_PATH = 'assets/prison/atlas_cela_prisao.png';
export const PRISON_ATLAS_DATA_PATH = 'assets/prison/atlas_cela_prisao.json';
export const CELL_BED_KEY = 'cell-bed';
export const CELL_BED_PATH = 'assets/prison/cama_cela_original.png';

// Toda a prisão usa a mesma altura de piso e teto baixo.
export const FLOOR_Y = 562;
export const CEILING_Y = 304;

export const TINTS = {
  cellWall: 0xa49bb0,
  corridorWall: 0x7d7588,
  farWall: 0x6f6879,
  pillar: 0x948ba0,
  floor: 0xb5a9c2,
  ceiling: 0x8a8296,
  iron: 0xb8afc4,
} as const;

// Ordem de profundidade: parede 1, peças de parede 2–3, pilares 5, piso 6,
// teto 7, móveis 8, portões 9, jogador 10, luz 12, primeiro plano 14, sombra 15.
export type PropPlacement = {
  frame: string;
  x: number;
  // Base da peça; pisos e móveis usam a linha do chão.
  bottomY: number;
  scale: number;
  depth: number;
  tint?: number;
  flipX?: boolean;
  // Primeiro plano com parallax (> 1 passa mais rápido que o cenário).
  scrollFactor?: number;
};

export function addProp(scene: Phaser.Scene, prop: PropPlacement): Phaser.GameObjects.Image {
  return scene.add
    .image(prop.x, prop.bottomY, PRISON_ATLAS_KEY, prop.frame)
    .setOrigin(0.5, 1)
    .setScale(prop.scale)
    .setDepth(prop.depth)
    .setFlipX(prop.flipX ?? false)
    .setScrollFactor(prop.scrollFactor ?? 1, 1)
    .setTint(prop.tint ?? TINTS.cellWall);
}

// Parede de fundo em blocos; espelhamentos alternados quebram a repetição.
export function addBackWall(
  scene: Phaser.Scene,
  fromX: number,
  toX: number,
  tint: number,
  topY: number = CEILING_Y,
  bottomY: number = FLOOR_Y,
): void {
  const frame = scene.textures.getFrame(PRISON_ATLAS_KEY, 'stone-tile');
  // Sobreposição esconde o contorno escuro de cada bloco.
  const stepX = frame.width - 8;
  const stepY = frame.height - 8;

  for (let y = topY; y < bottomY + stepY; y += stepY) {
    for (let x = fromX; x < toX; x += stepX) {
      const column = Math.round((x - fromX) / stepX);
      const row = Math.round((y - topY) / stepY);

      scene.add
        .image(x, y, PRISON_ATLAS_KEY, 'stone-tile')
        .setOrigin(0, 0)
        .setCrop(0, 0, Math.min(frame.width, toX - x + 2), frame.height)
        .setFlip((column + row) % 2 === 1, (column * 3 + row) % 4 === 0)
        .setDepth(1)
        .setTint(tint);
    }
  }
}

export function addStoneLedges(
  scene: Phaser.Scene,
  fromX: number,
  toX: number,
  edgeY: number,
  isCeiling: boolean,
): void {
  const segmentWidth = 300;
  const height = 100;

  for (let x = fromX; x < toX; x += segmentWidth) {
    scene.add
      .image(x, edgeY, PRISON_ATLAS_KEY, 'stone-ledge')
      .setOrigin(0, isCeiling ? 1 : 0)
      .setDisplaySize(segmentWidth + 4, height)
      .setFlipY(isCeiling)
      .setDepth(isCeiling ? 7 : 6)
      .setTint(isCeiling ? TINTS.ceiling : TINTS.floor);
  }
}

export function addPillar(
  scene: Phaser.Scene,
  x: number,
  floorY: number = FLOOR_Y,
  scale = 1.35,
): void {
  scene.add
    .image(x, floorY + 6, PRISON_ATLAS_KEY, 'pillar')
    .setOrigin(0.5, 1)
    .setScale(scale)
    .setDepth(5)
    .setTint(TINTS.pillar);
}

export function addTorchGlow(scene: Phaser.Scene, x: number, y: number): void {
  const glow = scene.add.container(x, y).setDepth(4);

  glow.add([
    scene.add.circle(0, 0, 130, 0xff5a1f, 0.05),
    scene.add.circle(0, 0, 80, 0xff7938, 0.07),
    scene.add.circle(0, 0, 40, 0xffb15a, 0.08),
  ]);

  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.7, to: 1 },
    scaleX: { from: 0.96, to: 1.04 },
    scaleY: { from: 1.02, to: 0.96 },
    duration: 1150 + (x % 300),
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  });
}

// Partículas de poeira flutuando em torno de um ponto de luz.
export function addDust(
  scene: Phaser.Scene,
  motes: ReadonlyArray<readonly [number, number, number]>,
  color = 0xd8d4ff,
): void {
  for (const [x, y, radius] of motes) {
    const mote = scene.add.circle(x, y, radius, color, 0.4).setDepth(12);

    scene.tweens.add({
      targets: mote,
      y: y - 26,
      x: x + 8,
      alpha: { from: 0.1, to: 0.55 },
      duration: 3000 + (x % 1000),
      delay: x % 1500,
      yoyo: true,
      repeat: -1,
    });
  }
}

export function createStaticCollider(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Rectangle {
  const collider = scene.add.rectangle(x, y, width, height, 0xffffff, 0);
  scene.physics.add.existing(collider, true);
  return collider;
}
