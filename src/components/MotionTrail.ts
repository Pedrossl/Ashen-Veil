import Phaser from 'phaser';

export type MotionTrailConfig = {
  // Intervalo entre cópias enquanto o rastro está ligado.
  intervalMs: number;
  lifetimeMs: number;
  tint: number;
  alpha: number;
};

// Rastro de imagens fantasmas: cópias do quadro atual que vão sumindo atrás de
// quem se move (rolamento, corrida, teleporte). Puramente visual.
export class MotionTrail {
  private enabled = false;
  private sinceLast = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly target: Phaser.GameObjects.Sprite,
    private config: MotionTrailConfig,
  ) {}

  setEnabled(enabled: boolean): void {
    if (enabled && !this.enabled) {
      // Solta uma cópia logo no início do movimento.
      this.sinceLast = this.config.intervalMs;
    }

    this.enabled = enabled;
  }

  setConfig(config: Partial<MotionTrailConfig>): void {
    this.config = { ...this.config, ...config };
  }

  update(delta: number): void {
    if (!this.enabled || !this.target.visible || this.target.alpha < 0.1) {
      return;
    }

    this.sinceLast += delta;

    if (this.sinceLast >= this.config.intervalMs) {
      this.sinceLast = 0;
      this.spawnGhost();
    }
  }

  private spawnGhost(): void {
    const { target } = this;
    const ghost = this.scene.add
      .image(target.x, target.y, target.texture.key, target.frame.name)
      .setOrigin(target.originX, target.originY)
      .setScale(target.scaleX, target.scaleY)
      .setFlipX(target.flipX)
      .setAngle(target.angle)
      .setDepth(target.depth - 0.05)
      .setTint(this.config.tint)
      .setAlpha(this.config.alpha * target.alpha)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: this.config.lifetimeMs,
      ease: 'Quad.Out',
      onComplete: () => ghost.destroy(),
    });
  }
}

// Nuvenzinha de poeira nos pés (arranque, rolamento, frenagem).
export function spawnDust(
  scene: Phaser.Scene,
  x: number,
  footY: number,
  direction: 1 | -1,
  amount = 5,
): void {
  for (let i = 0; i < amount; i += 1) {
    const puff = scene.add
      .circle(x + Phaser.Math.Between(-10, 10), footY - Phaser.Math.Between(2, 10), Phaser.Math.Between(5, 10), 0x8a8090, 0.35)
      .setDepth(10.2);

    scene.tweens.add({
      targets: puff,
      x: puff.x - direction * Phaser.Math.Between(18, 46),
      y: puff.y - Phaser.Math.Between(6, 22),
      scale: { from: 0.6, to: 1.6 },
      alpha: 0,
      duration: Phaser.Math.Between(380, 620),
      ease: 'Quad.Out',
      onComplete: () => puff.destroy(),
    });
  }
}
