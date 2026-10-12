import Phaser from 'phaser';

import type { ItemDefinition } from '../../data/items';

const GLINT_COLOR = 0xffe2a0;

// Item escondido no cenário, visível só como um brilho piscando.
export class ItemPickup {
  private readonly glint: Phaser.GameObjects.Container;
  private collected = false;

  constructor(
    scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
    readonly item: ItemDefinition,
    depth: number,
  ) {
    this.glint = scene.add
      .container(x, y, [
        scene.add.circle(0, 0, 9, GLINT_COLOR, 0.18),
        scene.add.rectangle(0, 0, 22, 1.6, GLINT_COLOR, 0.9),
        scene.add.rectangle(0, 0, 1.6, 14, GLINT_COLOR, 0.9),
        scene.add.circle(0, 0, 1.8, 0xffffff, 1),
      ])
      .setDepth(depth)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Pisca em intervalos irregulares para chamar atenção sem ser óbvio.
    scene.tweens.chain({
      targets: this.glint,
      loop: -1,
      tweens: [
        { alpha: 0.15, scale: 0.4, duration: 900, ease: 'Sine.InOut' },
        { alpha: 1, scale: 1.1, angle: 20, duration: 220, ease: 'Quad.Out' },
        { alpha: 0.35, scale: 0.6, angle: 0, duration: 500, ease: 'Sine.InOut' },
        { alpha: 0.9, scale: 0.9, duration: 260, ease: 'Quad.Out', delay: 700 },
      ],
    });
  }

  get isCollected(): boolean {
    return this.collected;
  }

  collect(): void {
    this.collected = true;
    this.glint.scene.tweens.killTweensOf(this.glint);
    this.glint.destroy();
  }
}
