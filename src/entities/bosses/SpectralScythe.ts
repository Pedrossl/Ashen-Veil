import Phaser from 'phaser';

import { REAPER_KING } from '../../data/bosses';
import { SPECTRAL_SCYTHE_IMAGE } from '../../data/bossSprites';
import type { ActiveAttack, Attacker } from '../../systems/CombatSystem';

const FLING = REAPER_KING.phaseTwo.fling;

type ScytheConfig = {
  x: number;
  y: number;
  direction: 1 | -1;
  // Limites horizontais da arena: a foice bate na parede e volta.
  minX: number;
  maxX: number;
  speedMultiplier: number;
  // Posição da mão do boss a cada quadro, para onde a foice volta.
  returnTo: () => { x: number; y: number };
  onCaught: () => void;
};

// Foice arremessada como bumerangue: vai girando, volta para a mão do boss e
// pode acertar tanto na ida quanto na volta.
export class SpectralScythe extends Phaser.GameObjects.Image implements Attacker {
  readonly faction = 'enemy' as const;
  private returning = false;
  private swingId = 1;
  private readonly startX: number;
  private readonly trail: Phaser.GameObjects.Ellipse;

  constructor(
    scene: Phaser.Scene,
    private readonly config: ScytheConfig,
  ) {
    super(scene, config.x, config.y, SPECTRAL_SCYTHE_IMAGE.key);

    scene.add.existing(this);
    this.startX = config.x;
    this.setScale(0.75).setDepth(10.5).setFlipX(config.direction < 0);

    this.trail = scene.add
      .ellipse(config.x, config.y, 220, 120, 0x9a5cff, 0.25)
      .setDepth(10.4)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  // Para o sistema de combate, `y` é a linha de referência da hitbox.
  get facing(): 1 | -1 {
    return 1;
  }

  getActiveAttack(): ActiveAttack {
    const { width, height } = FLING.hitbox;

    return {
      swingId: this.swingId,
      damage: FLING.damage,
      // Centrada na foice: começa meia largura atrás e meia altura acima.
      hitbox: { forward: -width / 2, up: height / 2, width, height },
      isActive: true,
    };
  }

  update(delta: number): void {
    const seconds = delta / 1000;
    const spin = FLING.spinDegreesPerSecond * this.config.speedMultiplier * seconds;
    this.angle += spin * this.config.direction;

    if (!this.returning) {
      this.x += FLING.outSpeed * this.config.speedMultiplier * seconds * this.config.direction;
      const travelled = Math.abs(this.x - this.startX);
      const hitWall = this.x <= this.config.minX || this.x >= this.config.maxX;

      if (travelled >= FLING.maxDistance || hitWall) {
        this.x = Phaser.Math.Clamp(this.x, this.config.minX, this.config.maxX);
        this.startReturn();
      }
    } else {
      const hand = this.config.returnTo();
      const toHand = new Phaser.Math.Vector2(hand.x - this.x, hand.y - this.y);
      const step = FLING.returnSpeed * this.config.speedMultiplier * seconds;

      if (toHand.length() <= step) {
        this.catch();
        return;
      }

      toHand.normalize().scale(step);
      this.x += toHand.x;
      this.y += toHand.y;
    }

    this.trail.setPosition(this.x, this.y).setAlpha(0.18 + Math.random() * 0.12);
  }

  // Ao voltar, conta como um novo golpe: pode acertar de novo.
  private startReturn(): void {
    this.returning = true;
    this.swingId += 1;
    this.scene.cameras.main.shake(120, 0.002);
  }

  // Remove a foice e o rastro sem avisar o boss (ex.: ele morreu com ela no ar).
  dispose(): void {
    this.trail.destroy();
    this.destroy();
  }

  private catch(): void {
    this.dispose();
    this.config.onCaught();
  }
}
