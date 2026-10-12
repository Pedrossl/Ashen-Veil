import Phaser from 'phaser';

import { SEWER_ANIMATIONS } from '../data/sewerSprites';

const WATER_COLOR = 0xa8e0c8;

const SPLASH_SCALE = 0.13;
// Base do espirro dentro do quadro (fração da altura).
const SPLASH_BASE = 0.87;

// Espirro nos pés de quem anda na água rasa: usa a animação do kit do esgoto
// (some ao terminar) e, sem ela carregada, gotas e anel desenhados por código.
export function spawnSplash(scene: Phaser.Scene, x: number, surfaceY: number): void {
  const sheet = SEWER_ANIMATIONS.splash;

  if (scene.textures.exists(sheet.key)) {
    if (!scene.anims.exists(sheet.key)) {
      scene.anims.create({
        key: sheet.key,
        frames: scene.anims.generateFrameNumbers(sheet.key, { start: 0, end: sheet.frames - 1 }),
        frameRate: sheet.frameRate,
      });
    }

    const splash = scene.add
      .sprite(x, surfaceY + 2, sheet.key, 0)
      .setOrigin(0.5, SPLASH_BASE)
      .setScale(SPLASH_SCALE)
      .setDepth(10.5);
    splash.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => splash.destroy());
    splash.play(sheet.key);
    return;
  }

  spawnDrawnSplash(scene, x, surfaceY);
}

function spawnDrawnSplash(scene: Phaser.Scene, x: number, surfaceY: number): void {
  const ring = scene.add
    .ellipse(x, surfaceY - 2, 30, 6)
    .setStrokeStyle(1.5, WATER_COLOR, 0.6)
    .setDepth(10.5);

  scene.tweens.add({
    targets: ring,
    scaleX: 2.4,
    scaleY: 1.6,
    alpha: 0,
    duration: 480,
    ease: 'Quad.Out',
    onComplete: () => ring.destroy(),
  });

  for (let i = 0; i < 5; i += 1) {
    const drop = scene.add
      .circle(x + Phaser.Math.Between(-10, 10), surfaceY - 4, Phaser.Math.Between(1, 2), WATER_COLOR, 0.8)
      .setDepth(10.5);

    scene.tweens.add({
      targets: drop,
      x: drop.x + Phaser.Math.Between(-22, 22),
      y: { from: drop.y - Phaser.Math.Between(12, 26), to: surfaceY },
      alpha: 0,
      duration: Phaser.Math.Between(300, 460),
      ease: 'Quad.In',
      onComplete: () => drop.destroy(),
    });
  }
}
