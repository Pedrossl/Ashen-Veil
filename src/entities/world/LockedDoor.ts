import Phaser from 'phaser';

type LockedDoorConfig = {
  // Textura (atlas ou sheet) e quadro do desenho da porta.
  texture: string;
  frame: string | number;
  x: number;
  floorY: number;
  scale: number;
  depth: number;
  tint: number;
  // Texto ao examinar: dá pistas do que existe do outro lado.
  message: string;
};

// Porta trancada por enquanto: só pode ser examinada. Marca caminhos que
// serão abertos mais tarde (outra chave, alavanca ou atalho pelo outro lado).
export class LockedDoor {
  constructor(
    scene: Phaser.Scene,
    private readonly config: LockedDoorConfig,
  ) {
    const { texture, frame, x, floorY, scale, depth, tint } = config;

    scene.add
      .image(x, floorY + 4, texture, frame)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(depth)
      .setTint(tint);
  }

  get x(): number {
    return this.config.x;
  }

  get floorY(): number {
    return this.config.floorY;
  }

  get message(): string {
    return this.config.message;
  }
}
