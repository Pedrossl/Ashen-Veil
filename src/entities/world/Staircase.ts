import Phaser from 'phaser';

type StaircaseConfig = {
  atlasKey: string;
  // Pé da escada (no chão de baixo) e topo (na plataforma de cima).
  bottom: { x: number; y: number };
  top: { x: number; y: number };
  stepCount: number;
  tint: number;
  depth: number;
};

// Distância vertical em que os pés "grudam" na diagonal ao subir ou descer.
const SNAP_DISTANCE = 26;
const TILE_SCALE = 0.5;

// Escada de pedra. O Arcade Physics não tem rampas, então a escada guia os
// pés pela diagonal enquanto o corpo está dentro do vão dela.
export class Staircase {
  constructor(
    scene: Phaser.Scene,
    private readonly config: StaircaseConfig,
  ) {
    this.draw(scene);
  }

  // Chamado depois da física: encaixa o corpo na diagonal se estiver nela.
  // Retorna se encaixou; quem chama decide a gravidade.
  constrain(body: Phaser.Physics.Arcade.Body): boolean {
    const lineY = this.lineYAt(body.center.x);

    if (lineY === undefined || Math.abs(body.bottom - lineY) > SNAP_DISTANCE) {
      return false;
    }

    body.position.y = lineY - body.height;
    body.velocity.y = Math.min(0, body.velocity.y);
    body.blocked.down = true;
    return true;
  }

  private lineYAt(x: number): number | undefined {
    const { bottom, top } = this.config;
    const minX = Math.min(bottom.x, top.x);
    const maxX = Math.max(bottom.x, top.x);

    if (x < minX || x > maxX) {
      return undefined;
    }

    const progress = (x - bottom.x) / (top.x - bottom.x);
    return bottom.y + (top.y - bottom.y) * progress;
  }

  // Cada degrau é uma coluna de blocos de pedra do chão até o seu topo.
  private draw(scene: Phaser.Scene): void {
    const { atlasKey, bottom, top, stepCount, tint, depth } = this.config;
    const tile = scene.textures.getFrame(atlasKey, 'stone-tile');
    const tileHeight = tile.height * TILE_SCALE;
    const stepWidth = (top.x - bottom.x) / stepCount;
    const stepRise = (bottom.y - top.y) / stepCount;

    for (let step = 0; step < stepCount; step += 1) {
      const left = bottom.x + step * stepWidth;
      const stepTop = bottom.y - (step + 1) * stepRise;
      const width = Math.abs(stepWidth);

      for (let y = stepTop; y < bottom.y; y += tileHeight - 3) {
        const visibleHeight = Math.min(tileHeight, bottom.y - y + 2);

        scene.add
          .image(Math.min(left, left + stepWidth), y, atlasKey, 'stone-tile')
          .setOrigin(0, 0)
          .setScale(width / tile.width + 0.02, TILE_SCALE)
          .setCrop(0, 0, tile.width, visibleHeight / TILE_SCALE)
          .setFlipX(step % 2 === 1)
          .setDepth(depth)
          // Degraus mais altos ficam um pouco mais claros, como a luz de cima.
          .setTint(Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.ValueToColor(tint),
            Phaser.Display.Color.ValueToColor(0xd8cce4),
            stepCount * 3,
            step,
          ).color);
      }

      // Aresta iluminada no topo de cada degrau para a leitura da escada.
      scene.add
        .rectangle(Math.min(left, left + stepWidth), stepTop, width, 3, 0xc9a77a, 0.35)
        .setOrigin(0, 0)
        .setDepth(depth + 0.1);
    }
  }
}
