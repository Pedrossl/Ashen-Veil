import Phaser from 'phaser';

import type { Damageable, Hit } from '../../systems/CombatSystem';

const RADIUS = 30;
const DEPTH = 9.4;
const HIT_FLASH_MS = 90;
// Gotas que correm da bolha até o frasco do boss enquanto ela o alimenta.
const DRIP_INTERVAL_MS = 260;

export type BloodBubbleConfig = {
  // De onde sai (frasco do boss) e onde cai.
  from: { x: number; y: number };
  x: number;
  floorY: number;
  health: number;
  flightMs: number;
  // Para onde correm as gotas (o frasco, que acompanha o boss).
  feeds: () => { x: number; y: number };
  // Golpe recebido: o boss decide se aplica aqui ou repassa (cooperativo).
  onHit: (hit: Hit) => void;
  onPopped: () => void;
};

// Bolha de sangue do soro do Cirurgião Rubro. Cai em arco do frasco, pousa
// pulsando no chão e, enquanto existir, alimenta o boss por um fio de sangue.
// Pode ser atingida como um inimigo; estoura ao zerar a vida.
export class BloodBubble implements Damageable {
  readonly faction = 'enemy' as const;
  private health: number;
  private landed = false;
  private popped = false;
  private dripMs = 0;
  private readonly body: Phaser.GameObjects.Arc;
  private readonly shine: Phaser.GameObjects.Arc;
  private readonly glow: Phaser.GameObjects.Ellipse;
  private readonly puddle: Phaser.GameObjects.Ellipse;
  private readonly vein: Phaser.GameObjects.Graphics;
  // Posição do centro (pública para som e dano por distância).
  x: number;
  y: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: BloodBubbleConfig,
  ) {
    this.health = config.health;
    this.x = config.from.x;
    this.y = config.from.y;
    this.puddle = scene.add
      .ellipse(config.x, config.floorY + 2, RADIUS * 3, 16, 0x5a0710, 0)
      .setDepth(DEPTH - 0.3);
    this.glow = scene.add
      .ellipse(this.x, this.y, RADIUS * 3.4, RADIUS * 3.4, 0xff2236, 0.22)
      .setDepth(DEPTH - 0.2)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.body = scene.add.circle(this.x, this.y, RADIUS, 0x8c0c1c, 0.92).setDepth(DEPTH).setStrokeStyle(3, 0x3a0208, 0.9);
    this.shine = scene.add.circle(this.x, this.y, RADIUS * 0.32, 0xff8a8a, 0.55).setDepth(DEPTH + 0.05);
    this.vein = scene.add.graphics().setDepth(DEPTH - 0.25).setBlendMode(Phaser.BlendModes.ADD);
    this.fly();
  }

  get isAlive(): boolean {
    return !this.popped;
  }

  // No ar ainda não pode ser atingida.
  get isInvulnerable(): boolean {
    return !this.landed;
  }

  getHurtbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - RADIUS - 6, this.y - RADIUS - 6, RADIUS * 2 + 12, RADIUS * 2 + 12);
  }

  receiveHit(hit: Hit): void {
    if (!this.isAlive || this.isInvulnerable) {
      return;
    }

    this.body.setFillStyle(0xffd0d0, 1);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => this.body.active && this.body.setFillStyle(0x8c0c1c, 0.92));
    this.config.onHit(hit);
  }

  // Dano aplicado por quem comanda o boss.
  damage(amount: number): void {
    this.health -= amount;

    if (this.health <= 0) {
      this.pop();
    }
  }

  update(delta: number): void {
    if (this.popped || !this.landed) {
      return;
    }

    const target = this.config.feeds();
    const flicker = 0.25 + Math.random() * 0.25;
    this.vein.clear().lineStyle(3, 0xff2a3a, flicker);
    const midX = (this.x + target.x) / 2;
    const midY = Math.min(this.y, target.y) - 120;
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(this.x, this.y - RADIUS),
      new Phaser.Math.Vector2(midX, midY),
      new Phaser.Math.Vector2(target.x, target.y),
    );
    curve.draw(this.vein, 24);

    this.dripMs -= delta;

    if (this.dripMs <= 0) {
      this.dripMs = DRIP_INTERVAL_MS;
      this.spawnDrip(curve);
    }
  }

  // Estoura: espirra sangue e some, sem deixar nada clicável para trás.
  pop(): void {
    if (this.popped) {
      return;
    }

    this.popped = true;
    this.scene.cameras.main.shake(120, 0.003);

    for (let i = 0; i < 14; i += 1) {
      const angle = Phaser.Math.FloatBetween(-Math.PI, 0);
      const drop = this.scene.add
        .circle(this.x, this.y, Phaser.Math.Between(3, 7), 0xb5101f, 0.95)
        .setDepth(DEPTH + 0.1);
      this.scene.tweens.add({
        targets: drop,
        x: drop.x + Math.cos(angle) * Phaser.Math.Between(40, 110),
        y: this.config.floorY - Phaser.Math.Between(0, 8),
        alpha: 0,
        duration: Phaser.Math.Between(380, 620),
        ease: 'Quad.In',
        onComplete: () => drop.destroy(),
      });
    }

    this.scene.tweens.add({
      targets: this.puddle,
      scaleX: 1.6,
      alpha: 0,
      duration: 2600,
      onComplete: () => this.puddle.destroy(),
    });
    this.scene.tweens.killTweensOf([this.body, this.shine, this.glow]);
    [this.body, this.shine, this.glow, this.vein].forEach((part) => part.destroy());
    this.config.onPopped();
  }

  // Sai do frasco em arco e pousa no chão.
  private fly(): void {
    const { from, x, floorY, flightMs } = this.config;
    const restY = floorY - RADIUS;
    const peak = Math.min(from.y, restY) - 260;
    const state = { t: 0 };

    this.scene.tweens.add({
      targets: state,
      t: 1,
      duration: flightMs,
      onUpdate: () => {
        const t = state.t;
        // Parábola de três pontos: frasco, pico e o chão.
        this.x = Phaser.Math.Linear(from.x, x, t);
        this.y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * peak + t * t * restY;
        this.place();
      },
      onComplete: () => this.land(),
    });
  }

  private land(): void {
    if (this.popped) {
      return;
    }

    this.landed = true;
    this.scene.tweens.add({ targets: this.puddle, fillAlpha: 0.7, duration: 300 });
    this.scene.tweens.add({
      targets: [this.body, this.shine],
      scaleX: { from: 1.25, to: 0.94 },
      scaleY: { from: 0.75, to: 1.06 },
      duration: 520,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
    this.scene.tweens.add({ targets: this.glow, alpha: { from: 0.15, to: 0.38 }, duration: 520, yoyo: true, repeat: -1 });
  }

  private place(): void {
    this.body.setPosition(this.x, this.y);
    this.shine.setPosition(this.x - RADIUS * 0.35, this.y - RADIUS * 0.4);
    this.glow.setPosition(this.x, this.y);
  }

  private spawnDrip(curve: Phaser.Curves.QuadraticBezier): void {
    const drip = this.scene.add.circle(this.x, this.y - RADIUS, 3, 0xff4050, 0.9).setDepth(DEPTH + 0.1);
    const state = { t: 0 };
    this.scene.tweens.add({
      targets: state,
      t: 1,
      duration: 700,
      onUpdate: () => {
        const point = curve.getPoint(state.t);
        drip.setPosition(point.x, point.y);
      },
      onComplete: () => drip.destroy(),
    });
  }
}
