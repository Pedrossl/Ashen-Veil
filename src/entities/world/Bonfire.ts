import Phaser from 'phaser';

import { CHECKPOINT_LANTERN_SPRITE as LANTERN } from '../../data/checkpointSprites';
import type { Checkpoint } from '../../systems/WorldState';

const LANTERN_ANIMATION = 'checkpoint-lantern-burn';

type BonfireConfig = {
  // Identificador usado para lembrar se ela já foi acesa.
  id: string;
  x: number;
  floorY: number;
  depth: number;
  // Onde o jogador renasce ao morrer depois de descansar aqui.
  checkpoint: Checkpoint;
  lit: boolean;
};

// Checkpoint de descanso: uma lanterna gótica. Apagada, fica escura e parada;
// acesa, a chama laranja e roxa queima animada, com brasas subindo.
export class Bonfire {
  private readonly fire: Phaser.GameObjects.Sprite;
  private readonly glow: Phaser.GameObjects.Container;
  private lit: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: BonfireConfig,
  ) {
    const { x, floorY, depth } = config;

    // Sombra no chão e um círculo roxo marcando o lugar sagrado.
    scene.add.ellipse(x, floorY + 1, 120, 16, 0x000000, 0.55).setDepth(depth - 0.2);
    scene.add.ellipse(x, floorY, 100, 12, 0x6a3fa0, 0.25).setDepth(depth - 0.1).setBlendMode(Phaser.BlendModes.ADD);

    if (!scene.anims.exists(LANTERN_ANIMATION)) {
      scene.anims.create({
        key: LANTERN_ANIMATION,
        frames: scene.anims.generateFrameNumbers(LANTERN.key, { start: 0, end: LANTERN.frameCount - 1 }),
        frameRate: LANTERN.frameRate,
        repeat: -1,
      });
    }

    this.fire = scene.add
      .sprite(x, floorY + 3, LANTERN.key, 0)
      .setOrigin(0.5, LANTERN.footY / LANTERN.frameHeight)
      .setScale(LANTERN.scale)
      .setDepth(depth);

    // A chama fica no meio do corpo da lanterna.
    const flameY = floorY - LANTERN.footY * LANTERN.scale * 0.45;
    this.glow = scene.add.container(x, flameY).setDepth(depth - 0.3);
    this.glow.add([
      scene.add.circle(0, 0, 150, 0x9a4fe0, 0.06),
      scene.add.circle(0, 0, 95, 0xff7a3a, 0.08),
      scene.add.circle(0, 0, 50, 0xffc070, 0.1),
    ]);
    scene.tweens.add({
      targets: this.glow,
      scaleX: { from: 0.94, to: 1.06 },
      scaleY: { from: 1.05, to: 0.94 },
      duration: 480,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });

    this.lit = config.lit;
    this.applyLitLook();
    this.startEmbers();
  }

  get id(): string {
    return this.config.id;
  }

  get x(): number {
    return this.config.x;
  }

  get floorY(): number {
    return this.config.floorY;
  }

  get checkpoint(): Checkpoint {
    return this.config.checkpoint;
  }

  get isLit(): boolean {
    return this.lit;
  }

  // Descansar acende (ou reaviva) a fogueira com uma labareda.
  kindle(): void {
    this.lit = true;
    this.applyLitLook();

    const flare = this.scene.add
      .circle(this.config.x, this.config.floorY - 60, 40, 0xd28aff, 0.5)
      .setDepth(this.config.depth + 0.2)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: flare,
      scale: 4,
      alpha: 0,
      duration: 900,
      ease: 'Quad.Out',
      onComplete: () => flare.destroy(),
    });
  }

  private applyLitLook(): void {
    if (this.lit) {
      this.fire.clearTint().play(LANTERN_ANIMATION, true);
      this.glow.setAlpha(1);
      return;
    }

    // Apagada: escura e parada, só um brilho roxo fraco indicando que acende.
    this.fire.stop().setFrame(0).setTint(0x4a3c5c);
    this.glow.setAlpha(0.3);
  }

  private startEmbers(): void {
    this.scene.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        if (!this.lit && Math.random() < 0.7) {
          return;
        }

        const ember = this.scene.add
          .circle(this.config.x + Phaser.Math.Between(-20, 20), this.config.floorY - 60, Phaser.Math.Between(1, 3), 0xffa050, 0.9)
          .setDepth(this.config.depth + 0.1)
          .setBlendMode(Phaser.BlendModes.ADD);

        this.scene.tweens.add({
          targets: ember,
          y: ember.y - Phaser.Math.Between(80, 160),
          x: ember.x + Phaser.Math.Between(-24, 24),
          alpha: 0,
          duration: Phaser.Math.Between(900, 1500),
          onComplete: () => ember.destroy(),
        });
      },
    });
  }
}
