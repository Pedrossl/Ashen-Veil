import Phaser from 'phaser';

import { spawnDust } from './MotionTrail';

// Rastro de golpe em arco: meia-lua de traços claros que some rápido, dando a
// leitura do caminho da arma (corrente, foice etc.). Puramente visual.
export type SwingArcConfig = {
  // Centro do arco no mundo.
  x: number;
  y: number;
  radius: number;
  direction: 1 | -1;
  // Achatamento vertical (1 = círculo, menor = varredura horizontal).
  squash: number;
  // Ângulos (graus, olhando para a direita) do início e do fim do arco.
  fromAngle: number;
  toAngle: number;
  color: number;
  depth: number;
  durationMs: number;
};

const ARC_STROKES = [
  { width: 10, alpha: 0.18, inset: 0 },
  { width: 5, alpha: 0.45, inset: 4 },
  { width: 2, alpha: 0.9, inset: 7 },
] as const;

export function spawnSwingArc(scene: Phaser.Scene, config: SwingArcConfig): void {
  const graphics = scene.add
    .graphics({ x: config.x, y: config.y })
    .setDepth(config.depth)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(config.direction, config.squash);

  const from = Phaser.Math.DegToRad(config.fromAngle);
  const to = Phaser.Math.DegToRad(config.toAngle);

  for (const stroke of ARC_STROKES) {
    graphics.lineStyle(stroke.width, config.color, stroke.alpha);
    graphics.beginPath();
    graphics.arc(0, 0, config.radius - stroke.inset, from, to, to < from);
    graphics.strokePath();
  }

  scene.tweens.add({
    targets: graphics,
    alpha: 0,
    scaleX: config.direction * 1.12,
    scaleY: config.squash * 1.12,
    duration: config.durationMs,
    ease: 'Quad.Out',
    onComplete: () => graphics.destroy(),
  });
}

// Golpe pesado no chão: onda de choque achatada, poeira para os dois lados e
// lascas de pedra saltando.
export function spawnGroundImpact(
  scene: Phaser.Scene,
  x: number,
  floorY: number,
  depth: number,
): void {
  const ring = scene.add
    .ellipse(x, floorY, 60, 14)
    .setStrokeStyle(3, 0xd8d0c0, 0.8)
    .setDepth(depth)
    .setBlendMode(Phaser.BlendModes.ADD);

  scene.tweens.add({
    targets: ring,
    scaleX: 3.2,
    scaleY: 2,
    alpha: 0,
    duration: 380,
    ease: 'Quad.Out',
    onComplete: () => ring.destroy(),
  });

  spawnDust(scene, x, floorY, 1, 5);
  spawnDust(scene, x, floorY, -1, 5);

  for (let i = 0; i < 7; i += 1) {
    const chip = scene.add
      .rectangle(x + Phaser.Math.Between(-20, 20), floorY - 4, 4, 3, 0x6e6672)
      .setDepth(depth);

    scene.tweens.add({
      targets: chip,
      x: chip.x + Phaser.Math.Between(-70, 70),
      y: { from: chip.y - Phaser.Math.Between(30, 60), to: floorY },
      angle: Phaser.Math.Between(-360, 360),
      alpha: { from: 1, to: 0 },
      duration: Phaser.Math.Between(320, 520),
      ease: 'Quad.In',
      onComplete: () => chip.destroy(),
    });
  }
}
