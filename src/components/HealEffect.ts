import Phaser from 'phaser';

const EMBER_COLORS = [0xffa050, 0xffc070, 0xb46cff] as const;

// Cura da ampola: clarão quente no peito e brasas laranja e violeta subindo
// em volta do corpo. Puramente visual.
export function spawnHealBurst(scene: Phaser.Scene, x: number, footY: number, depth: number): void {
  const chestY = footY - 80;

  const glow = scene.add
    .ellipse(x, chestY, 50, 90, 0xff9a4a, 0.22)
    .setDepth(depth - 0.1)
    .setBlendMode(Phaser.BlendModes.ADD);

  scene.tweens.add({
    targets: glow,
    scaleX: 1.5,
    scaleY: 1.25,
    alpha: 0,
    duration: 380,
    ease: 'Quad.Out',
    onComplete: () => glow.destroy(),
  });

  for (let i = 0; i < 16; i += 1) {
    const ember = scene.add
      .circle(
        x + Phaser.Math.Between(-28, 28),
        footY - Phaser.Math.Between(10, 120),
        Phaser.Math.Between(1, 3),
        Phaser.Utils.Array.GetRandom([...EMBER_COLORS]),
        0.95,
      )
      .setDepth(depth + 0.1)
      .setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: ember,
      y: ember.y - Phaser.Math.Between(40, 90),
      x: ember.x + Phaser.Math.Between(-14, 14),
      alpha: 0,
      delay: Phaser.Math.Between(0, 180),
      duration: Phaser.Math.Between(500, 900),
      ease: 'Sine.Out',
      onComplete: () => ember.destroy(),
    });
  }
}
