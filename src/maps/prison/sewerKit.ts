import Phaser from 'phaser';

import { SEWER_ANIMATIONS, SEWER_ATLASES, type SewerAtlas, type SheetAnimation } from '../../data/sewerSprites';

// Medidas dentro dos quadros das animações (pixels do quadro original):
// a água rasa ocupa x 16–711 com a superfície na linha 171; a espuma da
// cachoeira toca o chão em 95% da altura do quadro.
const SHALLOW_WATER = { left: 16, width: 695, surfaceY: 171 } as const;
const WATERFALL_BASE = 0.95;

export type SewerPieceOptions = {
  // Origem vertical: 1 = base (pisos e objetos no chão), 0 = topo (coisas penduradas).
  originY?: number;
  tint?: number;
  alpha?: number;
  flipX?: boolean;
  scrollFactor?: number;
};

// Peça de um tileset do esgoto posicionada pela base (ou pelo topo).
export function addSewerPiece(
  scene: Phaser.Scene,
  atlas: SewerAtlas,
  frame: string,
  x: number,
  y: number,
  scale: number,
  depth: number,
  options: SewerPieceOptions = {},
): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, SEWER_ATLASES[atlas].key, frame)
    .setOrigin(0.5, options.originY ?? 1)
    .setScale(scale)
    .setDepth(depth)
    .setTint(options.tint ?? 0xffffff)
    .setAlpha(options.alpha ?? 1)
    .setFlipX(options.flipX ?? false)
    .setScrollFactor(options.scrollFactor ?? 1, 1);
}

// Vegetação pendurada (trepadeiras, raízes, musgo) balançando devagar.
export function addHangingPlant(
  scene: Phaser.Scene,
  frame: string,
  x: number,
  topY: number,
  scale: number,
  depth: number,
  options: SewerPieceOptions = {},
): void {
  const plant = addSewerPiece(scene, 'vegetation', frame, x, topY, scale, depth, { originY: 0, ...options });
  scene.tweens.add({
    targets: plant,
    angle: { from: -1.8, to: 1.8 },
    duration: Phaser.Math.Between(2400, 3800),
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
    delay: Phaser.Math.Between(0, 1500),
  });
}

export function ensureSheetAnimation(scene: Phaser.Scene, sheet: SheetAnimation): void {
  if (scene.anims.exists(sheet.key)) {
    return;
  }

  scene.anims.create({
    key: sheet.key,
    frames: scene.anims.generateFrameNumbers(sheet.key, { start: 0, end: sheet.frames - 1 }),
    frameRate: sheet.frameRate,
    repeat: sheet.repeat,
  });
}

// Faixa de água rasa animada, repetida de `fromX` a `toX`, com a linha da
// superfície em `surfaceY`.
export function addShallowWater(
  scene: Phaser.Scene,
  fromX: number,
  toX: number,
  surfaceY: number,
  scale: number,
  depth: number,
  alpha = 1,
): void {
  const sheet = SEWER_ANIMATIONS.shallowWater;
  ensureSheetAnimation(scene, sheet);
  const step = SHALLOW_WATER.width * scale;

  for (let x = fromX, index = 0; x < toX; x += step, index += 1) {
    const visibleWidth = Math.min(SHALLOW_WATER.width, (toX - x) / scale);
    const water = scene.add
      .sprite(x, surfaceY, sheet.key, 0)
      .setOrigin(SHALLOW_WATER.left / sheet.frameWidth, SHALLOW_WATER.surfaceY / sheet.frameHeight)
      .setScale(scale)
      .setDepth(depth)
      .setAlpha(alpha)
      .setCrop(SHALLOW_WATER.left, 0, visibleWidth, sheet.frameHeight);
    water.play({ key: sheet.key, startFrame: index % sheet.frames });
  }
}

// Cano na parede despejando água até o chão, em loop.
export function addWaterfall(scene: Phaser.Scene, x: number, bottomY: number, scale: number, depth: number): void {
  const sheet = SEWER_ANIMATIONS.waterfall;
  ensureSheetAnimation(scene, sheet);
  scene.add
    .sprite(x, bottomY, sheet.key, 0)
    .setOrigin(0.5, WATERFALL_BASE)
    .setScale(scale)
    .setDepth(depth)
    .play({ key: sheet.key, startFrame: Phaser.Math.Between(0, sheet.frames - 1) });
}
