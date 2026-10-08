import Phaser from 'phaser';
import { playSound } from '../../systems/SoundEffects';

import type { ItemDefinition } from '../../data/items';
import { PRISON_CHEST_SPRITE as CHEST } from '../../data/prisonSprites';

type ChestConfig = {
  // Identificador usado para lembrar se o baú já foi aberto.
  id: string;
  x: number;
  floorY: number;
  scale: number;
  tint: number;
  depth: number;
  item: ItemDefinition;
  // Textura do item que sobe do baú ao abrir.
  itemTextureKey?: string;
  startsOpen?: boolean;
};

const OPEN_ANIMATION = 'prison-chest-open';

export class Chest {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private opened: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: ChestConfig,
  ) {
    const { x, floorY, scale, tint, depth } = config;

    scene.add
      .ellipse(x, floorY + 1, CHEST.frameWidth * scale * 0.95, 10, 0x000000, 0.55)
      .setDepth(depth - 0.2);

    if (!scene.anims.exists(OPEN_ANIMATION)) {
      scene.anims.create({
        key: OPEN_ANIMATION,
        frames: scene.anims.generateFrameNumbers(CHEST.key, { start: 0, end: CHEST.openFrame }),
        frameRate: CHEST.frameRate,
      });
    }

    this.sprite = scene.add
      .sprite(x, floorY + 2, CHEST.key, 0)
      .setOrigin(0.5, CHEST.footY / CHEST.frameHeight)
      .setScale(scale)
      .setDepth(depth)
      .setTint(tint);

    this.opened = config.startsOpen ?? false;

    if (this.opened) {
      this.showOpen(false);
    }
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

  get item(): ItemDefinition {
    return this.config.item;
  }

  get isOpen(): boolean {
    return this.opened;
  }

  open(): void {
    if (this.opened) {
      return;
    }

    this.opened = true;
    playSound(this.scene, 'chest');
    this.showOpen(true);
    this.revealItem();
  }

  // Destrava e ergue a tampa (animação da sheet); sem animação, já aberto.
  private showOpen(animated: boolean): void {
    if (animated) {
      this.sprite.play(OPEN_ANIMATION);
      return;
    }

    this.sprite.setFrame(CHEST.openFrame);
  }

  private revealItem(): void {
    const { x, floorY, depth, itemTextureKey } = this.config;
    const glow = this.scene.add
      .circle(x, floorY - 30, 46, 0xffd28a, 0.35)
      .setDepth(depth + 0.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.2);

    this.scene.tweens.add({
      targets: glow,
      scale: 1.3,
      alpha: 0,
      duration: 900,
      ease: 'Quad.Out',
      onComplete: () => glow.destroy(),
    });

    if (!itemTextureKey) {
      return;
    }

    const item = this.scene.add
      .image(x, floorY - 20, itemTextureKey)
      .setOrigin(0.5, 1)
      .setScale(0.5)
      .setAngle(-12)
      .setDepth(depth + 0.3)
      .setAlpha(0);

    this.scene.tweens.chain({
      targets: item,
      tweens: [
        { alpha: 1, y: floorY - 70, angle: 0, duration: 650, ease: 'Quad.Out' },
        { alpha: 0, y: floorY - 90, duration: 450, delay: 500, ease: 'Quad.In' },
      ],
      onComplete: () => item.destroy(),
    });
  }
}
