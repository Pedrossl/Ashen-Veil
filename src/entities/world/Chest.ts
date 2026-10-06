import Phaser from 'phaser';

import type { ItemDefinition } from '../../data/items';

type ChestConfig = {
  // Identificador usado para lembrar se o baú já foi aberto.
  id: string;
  atlasKey: string;
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

// O baú é visto de frente e um pouco de cima: a dobradiça é a borda de cima
// da tampa. Ao abrir, a tampa vira para cima por ela (escala vertical invertida).
const OPEN_LID_SCALE_Y = -0.75;

export class Chest {
  private readonly lid: Phaser.GameObjects.Image;
  private readonly interior: Phaser.GameObjects.Rectangle;
  private opened: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: ChestConfig,
  ) {
    const { atlasKey, x, floorY, scale, tint, depth } = config;
    const base = scene.textures.getFrame(atlasKey, 'chest-base');
    const lid = scene.textures.getFrame(atlasKey, 'chest-lid');
    const baseTop = floorY - base.height * scale;
    const lidTop = baseTop - lid.height * scale + 2;

    scene.add
      .ellipse(x, floorY + 1, base.width * scale * 1.05, 10, 0x000000, 0.55)
      .setDepth(depth - 0.2);

    scene.add
      .image(x, floorY, atlasKey, 'chest-base')
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(depth)
      .setTint(tint);

    // Interior escuro que aparece no lugar da tampa.
    this.interior = scene.add
      .rectangle(x, baseTop + 1, base.width * scale * 0.86, lid.height * scale * 0.9, 0x0b0608)
      .setOrigin(0.5, 1)
      .setDepth(depth + 0.05)
      .setVisible(false);

    this.lid = scene.add
      .image(x, lidTop, atlasKey, 'chest-lid')
      .setOrigin(0.5, 0)
      .setScale(scale)
      .setDepth(depth + 0.1)
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
    this.showOpen(true);
    this.revealItem();
  }

  private showOpen(animated: boolean): void {
    const scaleY = this.config.scale * OPEN_LID_SCALE_Y;
    this.interior.setVisible(true);

    if (!animated) {
      this.lid.setScale(this.config.scale, scaleY);
      return;
    }

    this.scene.tweens.add({
      targets: this.lid,
      scaleY,
      duration: 360,
      ease: 'Back.Out',
    });
  }

  // Brilho dourado e o item subindo antes de ir para o inventário.
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
