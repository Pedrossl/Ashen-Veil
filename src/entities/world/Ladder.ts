import Phaser from 'phaser';

type LadderConfig = {
  atlasKey: string;
  x: number;
  // Pés de quem está no chão de baixo e no piso de cima.
  bottomY: number;
  topY: number;
  scale: number;
  tint: number;
  depth: number;
};

// Escada de mão: peças de madeira empilhadas do piso de baixo até acima do de cima.
export class Ladder {
  constructor(
    scene: Phaser.Scene,
    private readonly config: LadderConfig,
  ) {
    const { atlasKey, x, bottomY, topY, scale, tint, depth } = config;
    const frame = scene.textures.getFrame(atlasKey, 'ladder');
    const pieceHeight = (frame.height - 6) * scale;
    // Passa um pouco do piso de cima, como um corrimão para agarrar ao subir.
    const top = topY - 40;

    for (let y = bottomY; y > top; y -= pieceHeight) {
      const visible = Math.min(pieceHeight, y - top);

      scene.add
        .image(x, y, atlasKey, 'ladder')
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setCrop(0, frame.height - visible / scale, frame.width, visible / scale)
        .setDepth(depth)
        .setTint(tint);
    }
  }

  get x(): number {
    return this.config.x;
  }

  get topY(): number {
    return this.config.topY;
  }

  get bottomY(): number {
    return this.config.bottomY;
  }
}
