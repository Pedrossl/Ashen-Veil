import Phaser from 'phaser';

import type { Health } from '../components/Health';

type EnemyWithHealth = {
  readonly x: number;
  readonly y: number;
  readonly health: Health;
  readonly isAlive: boolean;
};

// Barra provisória sobre a cabeça do inimigo, até existir arte própria.
const BAR = {
  width: 54,
  height: 5,
  // Espaço entre o topo da hurtbox e a barra.
  margin: 12,
  backgroundColor: 0x120a0e,
  borderColor: 0x4a3a44,
  fillColor: 0xa3262a,
  // Faixa clara que acompanha o dano com atraso, para o golpe ficar legível.
  lagColor: 0xe0c48a,
  lagDelayMs: 350,
  lagDurationMs: 380,
} as const;

export class EnemyHealthBar {
  private readonly container: Phaser.GameObjects.Container;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly lag: Phaser.GameObjects.Rectangle;

  private readonly offsetY: number;

  // `heightAboveFeet`: altura do inimigo a partir dos pés (origem do sprite).
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemy: EnemyWithHealth,
    heightAboveFeet: number,
  ) {
    const left = -BAR.width / 2;
    this.offsetY = heightAboveFeet + BAR.margin;

    this.lag = scene.add
      .rectangle(left, 0, BAR.width, BAR.height, BAR.lagColor)
      .setOrigin(0, 0.5);
    this.fill = scene.add
      .rectangle(left, 0, BAR.width, BAR.height, BAR.fillColor)
      .setOrigin(0, 0.5);

    this.container = scene.add
      .container(enemy.x, enemy.y - this.offsetY, [
        scene.add
          .rectangle(0, 0, BAR.width + 2, BAR.height + 2, BAR.backgroundColor)
          .setStrokeStyle(1, BAR.borderColor),
        this.lag,
        this.fill,
      ])
      .setDepth(13);

    // onChange só dispara em mudanças; começa já com a vida atual.
    this.fill.width = BAR.width * (enemy.health.current / enemy.health.max);
    this.lag.width = this.fill.width;
    enemy.health.onChange((current, max) => this.show(current / max));
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.follow, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  private show(ratio: number): void {
    const width = BAR.width * Math.max(0, ratio);

    this.fill.width = width;
    this.scene.tweens.killTweensOf(this.lag);
    this.scene.tweens.add({
      targets: this.lag,
      width,
      delay: BAR.lagDelayMs,
      duration: BAR.lagDurationMs,
      ease: 'Quad.Out',
    });

    if (!this.enemy.isAlive) {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        delay: BAR.lagDelayMs + BAR.lagDurationMs,
        duration: 400,
        onComplete: () => this.destroy(),
      });
    }
  }

  private follow(): void {
    this.container.setPosition(
      Math.round(this.enemy.x),
      Math.round(this.enemy.y - this.offsetY),
    );
  }

  private destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.follow, this);

    if (this.container.active) {
      this.container.destroy();
    }
  }
}
