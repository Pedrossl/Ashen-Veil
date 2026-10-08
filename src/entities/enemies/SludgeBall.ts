import Phaser from 'phaser';
import { playSound } from '../../systems/SoundEffects';

import { SLUDGE_BALL_SPRITE } from '../../data/enemySprites';
import type { ActiveAttack, Attacker, CombatSystem, Damageable } from '../../systems/CombatSystem';


const BALL_SIZE = 30;

// Sprite animado de um projétil (gira em loop enquanto voa).
export type ProjectileSprite = {
  key: string;
  frameWidth: number;
  frameCount: number;
  frameRate: number;
  displayWidth: number;
};
// Some se não acertar nada nesse tempo (ex.: caiu num vão).
const MAX_LIFETIME_MS = 4000;

type SludgeBallConfig = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  gravity: number;
  damage: number;
  // Piso onde a bola se espatifa se não acertar ninguém.
  floorY: number;
  combat: CombatSystem;
  // Sem valor, usa o detrito do Suplicante.
  sprite?: ProjectileSprite;
};

// Detrito de lodo arremessado em arco: atacante próprio no CombatSystem, que se
// espatifa ao acertar o jogador ou ao tocar o chão.
export class SludgeBall extends Phaser.GameObjects.Sprite implements Attacker {
  readonly faction = 'enemy' as const;
  private velocityX: number;
  private velocityY: number;
  private lifetime = 0;
  private done = false;

  constructor(
    scene: Phaser.Scene,
    private readonly config: SludgeBallConfig,
  ) {
    const sprite = config.sprite ?? SLUDGE_BALL_SPRITE;
    super(scene, config.x, config.y, sprite.key, 0);
    scene.add.existing(this);
    this.setScale(sprite.displayWidth / sprite.frameWidth).setDepth(10.6);

    const spin = `${sprite.key}-spin`;
    if (!scene.anims.exists(spin)) {
      scene.anims.create({
        key: spin,
        frames: scene.anims.generateFrameNumbers(sprite.key, { start: 0, end: sprite.frameCount - 1 }),
        frameRate: sprite.frameRate,
        repeat: -1,
      });
    }
    this.play(spin);
    this.setFlipX(config.velocityX < 0);
    this.velocityX = config.velocityX;
    this.velocityY = config.velocityY;
    config.combat.addAttacker(this);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.step, this);
  }

  get facing(): 1 | -1 {
    return this.velocityX < 0 ? -1 : 1;
  }

  getActiveAttack(): ActiveAttack | undefined {
    if (this.done) {
      return undefined;
    }

    return {
      swingId: 1,
      damage: this.config.damage,
      // `y` é o centro da bola: a caixa vai de meia bola acima a meia abaixo.
      hitbox: { forward: -BALL_SIZE / 2, up: BALL_SIZE / 2, width: BALL_SIZE, height: BALL_SIZE },
      isActive: true,
    };
  }

  onAttackLanded(_target: Damageable): void {
    this.splat();
  }

  private step(_time: number, delta: number): void {
    if (this.done) {
      return;
    }

    const seconds = delta / 1000;
    this.velocityY += this.config.gravity * seconds;
    this.x += this.velocityX * seconds;
    this.y += this.velocityY * seconds;
    this.lifetime += delta;

    if (this.y + BALL_SIZE / 2 >= this.config.floorY || this.lifetime > MAX_LIFETIME_MS) {
      this.splat();
    }
  }

  // Respingo verde e uma poça que some aos poucos.
  private splat(): void {
    if (this.done) {
      return;
    }

    this.done = true;
    // A expiração fora da área não deve produzir um impacto fantasma.
    if (this.lifetime <= MAX_LIFETIME_MS) playSound(this.scene, 'sludgeSplat', this);
    const { scene } = this;
    const puddle = scene.add.ellipse(this.x, this.config.floorY - 2, 46, 8, 0x4f7f3c, 0.8).setDepth(6.7);
    scene.tweens.add({ targets: puddle, alpha: 0, scaleX: 1.4, delay: 900, duration: 900, onComplete: () => puddle.destroy() });

    for (let i = 0; i < 8; i += 1) {
      const drop = scene.add
        .circle(this.x, this.y, Phaser.Math.Between(2, 4), 0x6aa04a, 0.95)
        .setDepth(10.6);
      scene.tweens.add({
        targets: drop,
        x: drop.x + Phaser.Math.Between(-36, 36),
        y: { from: drop.y - Phaser.Math.Between(10, 30), to: this.config.floorY },
        alpha: 0,
        duration: Phaser.Math.Between(320, 520),
        ease: 'Quad.In',
        onComplete: () => drop.destroy(),
      });
    }

    this.config.combat.remove(this);
    scene.events.off(Phaser.Scenes.Events.UPDATE, this.step, this);
    this.destroy();
  }
}
