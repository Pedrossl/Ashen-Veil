import Phaser from 'phaser';

type CellGateConfig = {
  // Identificador usado para lembrar se o portão já foi aberto.
  id: string;
  atlasKey: string;
  x: number;
  floorY: number;
  scale: number;
  tint: number;
  depth: number;
  // Item que destranca o portão.
  keyItemId: string;
  startsOpen?: boolean;
};

const OPEN_DURATION = 1600;

// Portão de grade que sobe para dentro do arco de pedra ao ser destrancado.
export class CellGate {
  readonly collider: Phaser.GameObjects.Rectangle;
  private readonly bars: Phaser.GameObjects.Image;
  private state: 'closed' | 'opening' | 'open' = 'closed';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: CellGateConfig,
  ) {
    const { atlasKey, x, floorY, scale, tint, depth } = config;

    // Vão escuro atrás das grades: o corredor só aparece pela luz da tocha.
    const passage = scene.textures.getFrame(atlasKey, 'cell-gate-bars');
    scene.add
      .rectangle(x, floorY, passage.width * scale * 0.7, passage.height * scale * 0.85, 0x050308, 0.55)
      .setOrigin(0.5, 1)
      .setDepth(depth - 1);

    this.bars = scene.add
      .image(x, floorY, atlasKey, 'cell-gate-bars')
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(depth)
      .setTint(tint);

    scene.add
      .image(x, floorY, atlasKey, 'cell-gate-frame')
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(depth + 0.5)
      .setTint(tint);

    this.collider = scene.add.rectangle(x - 30, 360, 30, 720, 0xffffff, 0);
    scene.physics.add.existing(this.collider, true);

    if (config.startsOpen) {
      this.state = 'open';
      this.bars.setVisible(false);
      (this.collider.body as Phaser.Physics.Arcade.StaticBody).enable = false;
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

  get isClosed(): boolean {
    return this.state === 'closed';
  }

  get keyItemId(): string {
    return this.config.keyItemId;
  }

  open(onOpened?: () => void): void {
    if (this.state !== 'closed') {
      return;
    }

    this.state = 'opening';
    const baseY = this.bars.y;
    const height = this.bars.frame.height;
    const lift = { value: 0 };

    this.scene.cameras.main.shake(OPEN_DURATION, 0.0015);
    this.scene.tweens.add({
      targets: lift,
      value: height * 0.92,
      duration: OPEN_DURATION,
      ease: 'Quad.InOut',
      onUpdate: () => {
        // Sobe e recorta o topo para a grade sumir dentro do arco.
        this.bars.y = baseY - lift.value * this.config.scale;
        this.bars.setCrop(0, lift.value, this.bars.frame.width, height - lift.value);
      },
      onComplete: () => {
        this.state = 'open';
        (this.collider.body as Phaser.Physics.Arcade.StaticBody).enable = false;
        onOpened?.();
      },
    });
  }
}
