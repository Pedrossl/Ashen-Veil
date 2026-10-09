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

// Distância vertical em que os pés "grudam" na diagonal ao entrar na escada.
const SNAP_DISTANCE = 26;
// Já na escada, os pés continuam presos mesmo bem longe da diagonal: correndo
// ou rolando escada abaixo num quadro longo, o corpo sai da linha e, sem isso,
// cairia por dentro dela até o chão.
const ATTACHED_SNAP_DISTANCE = 140;
// Saindo pelas pontas, os pés ficam presos na altura delas por mais este
// trecho: correndo, um quadro pula da diagonal (ainda abaixo da galeria) para
// além do topo, e a plataforma de mão única deixaria o corpo atravessar.
const EXIT_MARGIN = 60;
const TILE_SCALE = 0.5;

// Escada de pedra. O Arcade Physics não tem rampas, então a escada guia os
// pés pela diagonal enquanto o corpo está dentro do vão dela.
export class Staircase {
  // Corpos que estavam na diagonal no quadro anterior.
  private readonly attached = new WeakSet<Phaser.Physics.Arcade.Body>();

  constructor(
    scene: Phaser.Scene,
    private readonly config: StaircaseConfig,
  ) {
    this.draw(scene);
  }

  // Chamado depois da física: encaixa o corpo na diagonal se estiver nela.
  // Retorna se encaixou; quem chama decide a gravidade.
  constrain(body: Phaser.Physics.Arcade.Body): boolean {
    const isAttached = this.attached.has(body);
    const lineY = this.lineYAt(body.center.x, isAttached ? EXIT_MARGIN : 0);
    const reach = isAttached ? ATTACHED_SNAP_DISTANCE : SNAP_DISTANCE;

    if (lineY === undefined || Math.abs(body.bottom - lineY) > reach) {
      this.attached.delete(body);
      return false;
    }

    this.attached.add(body);
    body.position.y = lineY - body.height;
    body.velocity.y = Math.min(0, body.velocity.y);
    body.blocked.down = true;
    return true;
  }

  // Altura da diagonal em x; até `margin` além das pontas, a altura delas.
  private lineYAt(x: number, margin: number): number | undefined {
    const { bottom, top } = this.config;
    const minX = Math.min(bottom.x, top.x);
    const maxX = Math.max(bottom.x, top.x);

    if (x < minX - margin || x > maxX + margin) {
      return undefined;
    }

    const progress = Phaser.Math.Clamp((x - bottom.x) / (top.x - bottom.x), 0, 1);
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
