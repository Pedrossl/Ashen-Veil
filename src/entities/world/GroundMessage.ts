import Phaser from 'phaser';

export type GroundMessageConfig = {
  x: number;
  floorY: number;
  // Texto lido ao pisar perto; `{acao}` vira a tecla (ver core/controls.ts).
  text: string;
};

const GLOW_COLOR = 0xff9a3c;
const INK_COLOR = 0xffc070;
const WIDTH = 64;
const DEPTH = 8.5;

// Mensagem riscada no chão, como nos soulslike: rabisco alaranjado brilhando
// sobre o piso. Acende mais forte enquanto está sendo lida.
export class GroundMessage {
  readonly x: number;
  readonly floorY: number;
  readonly text: string;
  private readonly glow: Phaser.GameObjects.Ellipse;
  private readonly ink: Phaser.GameObjects.Graphics;
  private isRead = false;

  constructor(
    private readonly scene: Phaser.Scene,
    config: GroundMessageConfig,
  ) {
    this.x = config.x;
    this.floorY = config.floorY;
    this.text = config.text;

    this.glow = scene.add
      .ellipse(config.x, config.floorY - 2, WIDTH + 16, 10, GLOW_COLOR, 0.1)
      .setDepth(DEPTH)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.ink = scene.add.graphics().setDepth(DEPTH + 0.01).setBlendMode(Phaser.BlendModes.ADD);
    this.drawScrawl(config.x, config.floorY - 2);

    scene.tweens.add({
      targets: [this.glow, this.ink],
      alpha: { from: 0.25, to: 0.55 },
      duration: 1800,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }

  setRead(read: boolean): void {
    if (read === this.isRead) {
      return;
    }

    this.isRead = read;
    this.glow.setFillStyle(GLOW_COLOR, read ? 0.22 : 0.1);
    this.scene.tweens.add({ targets: this.glow, scaleX: read ? 1.1 : 1, duration: 260, ease: 'Sine.Out' });
  }

  // Letras tortas em perspectiva: traços curtos achatados, como escrita no chão.
  private drawScrawl(centerX: number, y: number): void {
    const random = new Phaser.Math.RandomDataGenerator([`${centerX}:${y}`]);
    const ink = this.ink.lineStyle(1.1, INK_COLOR, 0.7);

    for (let row = 0; row < 2; row += 1) {
      const rowY = y - 3 + row * 5;
      let x = centerX - WIDTH / 2 + row * 8;

      while (x < centerX + WIDTH / 2 - row * 8) {
        const glyph = random.between(6, 11);
        ink.beginPath();
        ink.moveTo(x, rowY + random.realInRange(-1.5, 1.5));

        for (let step = 1; step <= 3; step += 1) {
          ink.lineTo(x + (glyph * step) / 3, rowY + random.realInRange(-2, 2));
        }
        ink.strokePath();
        x += glyph + random.between(3, 7);
      }
    }
  }
}
