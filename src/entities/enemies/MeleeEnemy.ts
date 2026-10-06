import Phaser from 'phaser';

import { spawnGroundImpact, spawnSwingArc } from '../../components/AttackEffects';
import { Health } from '../../components/Health';
import { MotionTrail, spawnDust } from '../../components/MotionTrail';
import {
  ENEMIES,
  type EnemyAttackDefinition,
  type EnemyDefinition,
} from '../../data/enemies';
import type { EnemyAnimation, EnemySpriteDefinition } from '../../data/enemySprites';
import type {
  ActiveAttack,
  Attacker,
  Damageable,
  Hit,
} from '../../systems/CombatSystem';

// Comportamento fora de combate: arrasta-se devagar entre dois pontos.
const PATROL = {
  speedFactor: 0.45,
  pauseMinMs: 1400,
  pauseMaxMs: 3200,
} as const;

// Reação ao golpe: empurrão inicial e quanto dele sobra a cada quadro.
const HIT_REACTION = {
  knockbackSpeed: 110,
  knockbackDamping: 0.82,
  flashTint: 0xffb0b0,
  flashMs: 110,
} as const;

// Efeitos visuais dos golpes: rastro fantasma no acerto, arco da corrente na
// varredura e tremor curto no esmagamento.
const ATTACK_FEEL = {
  trail: { intervalMs: 45, lifetimeMs: 260, tint: 0x9fb2d8, alpha: 0.4 },
  chainColor: 0xc8d4ee,
  arcDurationMs: 240,
  smashShake: { durationMs: 120, intensity: 0.004 },
} as const;

// Fora de combate: idle/walk (patrulha). Em combate: alert -> chase -> attack.
// hit interrompe qualquer estado; dead é final.
type EnemyState = 'idle' | 'walk' | 'alert' | 'chase' | 'attack' | 'hit' | 'dead';

// Fases do golpe, cronometradas pela definição do ataque.
type AttackPhase = 'windup' | 'active' | 'recovery';

// O que o inimigo precisa saber do alvo (o jogador).
export type EnemyTarget = {
  readonly x: number;
  readonly y: number;
  readonly isAlive: boolean;
};

type AttackDefinition = EnemyAttackDefinition;

export type EnemyKind = keyof typeof ENEMIES;

const attackAnimationKey = (sprite: EnemySpriteDefinition, attack: AttackDefinition): string =>
  `${sprite.key}-${attack.animation}-timed`;
// Diferença de altura acima da qual o alvo está em outro andar e é ignorado.
const SAME_FLOOR_TOLERANCE = 90;

export type MeleeEnemyConfig = {
  kind: EnemyKind;
  x: number;
  floorY: number;
  patrolMinX: number;
  patrolMaxX: number;
  facing: 'left' | 'right';
};

// Inimigo comum corpo a corpo, montado pelos dados (`ENEMIES[kind]`): patrulha,
// nota o jogador, persegue e golpeia. Apanhar pode interromper o golpe (hit
// stun, por chance); com vida zerada, morre. Prisioneiro acorrentado e
// Carcereiro do Véu usam esta mesma classe com números e sprites próprios.
export class MeleeEnemy
  extends Phaser.Physics.Arcade.Sprite
  implements Damageable, Attacker
{
  readonly faction = 'enemy' as const;
  readonly definition: EnemyDefinition;
  readonly health: Health;
  private readonly sprite: EnemySpriteDefinition;
  // Alcance do golpe mais longo: a partir daí ele já para e ataca.
  private readonly maxAttackRange: number;
  private state: EnemyState = 'idle';
  private stateTimeLeft = 0;
  private direction: -1 | 1;
  private target?: EnemyTarget;
  private attackPhase: AttackPhase = 'windup';
  private currentAttack: AttackDefinition;
  private attackElapsedMs = 0;
  private attackCooldownMs = 0;
  private swingId = 0;
  private readonly trail: MotionTrail;

  constructor(
    scene: Phaser.Scene,
    private readonly config: MeleeEnemyConfig,
  ) {
    const definition: EnemyDefinition = ENEMIES[config.kind];
    super(scene, config.x, config.floorY + 1, definition.sprite.key, definition.sprite.animations.idle.start);

    this.definition = definition;
    this.sprite = definition.sprite;
    this.health = new Health(definition.maxHealth);
    const attacks = Object.values(definition.attacks);
    this.currentAttack = attacks[0];
    this.maxAttackRange = Math.max(...attacks.map((attack) => attack.range));

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(this.sprite.scale);
    this.setDepth(9.8);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(
      this.definition.hurtbox.width / this.sprite.scale,
      this.definition.hurtbox.height / this.sprite.scale,
    );

    this.direction = config.facing === 'left' ? -1 : 1;
    this.setFacing(this.direction);
    this.createAnimations();
    this.trail = new MotionTrail(scene, this, ATTACK_FEEL.trail);
    this.enterIdle();
  }

  get isAlive(): boolean {
    return !this.health.isDepleted;
  }

  get facing(): 1 | -1 {
    return this.direction;
  }

  setTarget(target: EnemyTarget): void {
    this.target = target;
  }

  getActiveAttack(): ActiveAttack | undefined {
    if (this.state !== 'attack') {
      return undefined;
    }

    return {
      swingId: this.swingId,
      damage: this.currentAttack.damage,
      hitbox: this.currentAttack.hitbox,
      isActive: this.attackPhase === 'active',
    };
  }

  getHurtbox(): Phaser.Geom.Rectangle {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
  }

  receiveHit(hit: Hit): void {
    if (!this.isAlive) {
      return;
    }

    this.health.damage(hit.damage);
    this.setTint(HIT_REACTION.flashTint);
    this.scene.time.delayedCall(HIT_REACTION.flashMs, () => this.clearTint());

    if (!this.isAlive) {
      this.enterDeath();
      return;
    }

    const isAttacking = this.state === 'attack';
    const chance = isAttacking
      ? this.definition.staggerChanceWhileAttacking
      : this.definition.staggerChance;

    if (Math.random() < chance) {
      this.enterHit(hit.direction);
      return;
    }

    // Aguentou o golpe: só pisca. Se estava distraído, vira e parte para cima.
    if (this.state === 'idle' || this.state === 'walk' || this.state === 'alert') {
      this.direction = hit.direction === 1 ? -1 : 1;
      this.setFacing(this.direction);
      this.enterChase();
    }
  }

  update(delta: number): void {
    this.stateTimeLeft -= delta;
    this.attackCooldownMs = Math.max(0, this.attackCooldownMs - delta);
    this.trail.setEnabled(this.state === 'attack' && this.attackPhase === 'active');
    this.trail.update(delta);

    switch (this.state) {
      case 'dead':
        return;
      case 'hit':
        this.updateHit();
        return;
      case 'alert':
        this.updateAlert();
        return;
      case 'chase':
        this.updateChase();
        return;
      case 'attack':
        this.updateAttack(delta);
        return;
      case 'idle':
      case 'walk':
        this.updatePatrol();
        return;
    }
  }

  private updatePatrol(): void {
    if (this.canSeeTarget()) {
      this.enterAlert();
      return;
    }

    if (this.state === 'idle') {
      if (this.stateTimeLeft <= 0) {
        this.enterWalk();
      }
      return;
    }

    const reachedEnd =
      (this.direction < 0 && this.x <= this.config.patrolMinX) ||
      (this.direction > 0 && this.x >= this.config.patrolMaxX);

    if (reachedEnd) {
      this.direction = this.direction < 0 ? 1 : -1;
      this.enterIdle();
    }
  }

  // Os pés não ficam no centro do quadro, então ao virar é preciso
  // espelhar a origem e o corpo físico junto com a textura.
  setFacing(direction: -1 | 1): this {
    const flipped = direction < 0;
    const feetX = flipped ? this.sprite.frameWidth - this.sprite.feetX : this.sprite.feetX;
    const body = this.body as Phaser.Physics.Arcade.Body;

    this.setFlipX(flipped);
    this.setOrigin(feetX / this.sprite.frameWidth, this.sprite.feetY / this.sprite.frameHeight);
    body.setOffset(feetX - body.sourceWidth / 2, this.sprite.feetY - body.sourceHeight);
    return this;
  }

  private updateHit(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setVelocityX(body.velocity.x * HIT_REACTION.knockbackDamping);

    // Depois de apanhar ele já sabe onde o jogador está: volta direto à caça.
    if (this.stateTimeLeft <= 0) {
      this.enterChase();
    }
  }

  // Pausa curta virado para o jogador: avisa que ele foi notado.
  private updateAlert(): void {
    if (this.stateTimeLeft <= 0) {
      this.enterChase();
    }
  }

  private updateChase(): void {
    if (!this.hasLiveTarget() || this.distanceToTarget() > this.definition.loseInterestRange) {
      this.enterIdle();
      return;
    }

    this.faceTarget();

    if (this.distanceToTarget() <= this.maxAttackRange) {
      this.setVelocityX(0);

      if (this.attackCooldownMs <= 0) {
        this.enterAttack(this.chooseAttack());
      } else {
        this.playAnimation('idle');
      }
      return;
    }

    this.setVelocityX(this.definition.moveSpeed * this.direction);
    this.playAnimation('walk');
  }

  // O lado do golpe é decidido no início: rolar para trás dele funciona.
  private updateAttack(delta: number): void {
    const { windupMs, activeMs, recoveryMs, cooldownMs, cooldownJitterMs } = this.currentAttack;
    this.attackElapsedMs += delta;
    const elapsed = this.attackElapsedMs;
    const previousPhase = this.attackPhase;

    if (elapsed < windupMs) {
      this.attackPhase = 'windup';
    } else if (elapsed < windupMs + activeMs) {
      this.attackPhase = 'active';
    } else if (elapsed < windupMs + activeMs + recoveryMs) {
      this.attackPhase = 'recovery';
    } else {
      this.attackCooldownMs = cooldownMs + Phaser.Math.Between(0, cooldownJitterMs);
      this.setVelocityX(0);
      this.enterChase();
      return;
    }

    if (this.attackPhase === 'active' && previousPhase === 'windup') {
      this.releaseAttack();
    }

    this.applyAttackMotion(elapsed);
  }

  // Antecipação e peso: recua devagar no aviso e avança no acerto, freando até
  // parar; na recuperação fica plantado.
  private applyAttackMotion(elapsed: number): void {
    const { windupMs, activeMs, motion } = this.currentAttack;

    if (this.attackPhase === 'windup') {
      const progress = elapsed / windupMs;
      this.setVelocityX(-this.direction * motion.windupDrawBackSpeed * (1 - progress));
    } else if (this.attackPhase === 'active') {
      const progress = (elapsed - windupMs) / activeMs;
      this.setVelocityX(this.direction * motion.lungeSpeed * (1 - progress) ** 2);
    } else {
      this.setVelocityX(0);
    }
  }

  // Início do acerto: poeira do arranque e o rastro próprio de cada golpe.
  private releaseAttack(): void {
    const { hitbox, motion } = this.currentAttack;
    const reachX = this.x + this.direction * (hitbox.forward + hitbox.width / 2);
    spawnDust(this.scene, this.x, this.y, this.direction, 4);

    if (motion.effect === 'sweep-arc') {
      spawnSwingArc(this.scene, {
        x: this.x + this.direction * hitbox.forward,
        y: this.y - hitbox.up + hitbox.height / 2,
        radius: hitbox.width * 0.75,
        direction: this.direction,
        squash: 0.4,
        fromAngle: -150,
        toAngle: 40,
        color: ATTACK_FEEL.chainColor,
        depth: this.depth + 0.1,
        durationMs: ATTACK_FEEL.arcDurationMs,
      });
      return;
    }

    spawnSwingArc(this.scene, {
      x: this.x + this.direction * hitbox.forward,
      y: this.y - hitbox.height * 0.45,
      radius: hitbox.height * 0.6,
      direction: this.direction,
      squash: 1,
      fromAngle: -100,
      toAngle: 70,
      color: ATTACK_FEEL.chainColor,
      depth: this.depth + 0.1,
      durationMs: ATTACK_FEEL.arcDurationMs,
    });
    spawnGroundImpact(this.scene, reachX, this.y, this.depth + 0.1);
    this.scene.cameras.main.shake(ATTACK_FEEL.smashShake.durationMs, ATTACK_FEEL.smashShake.intensity);
  }

  private enterAlert(): void {
    this.state = 'alert';
    this.stateTimeLeft = this.definition.alertMs;
    this.setVelocityX(0);
    this.faceTarget();
    this.playAnimation('idle');
  }

  private enterChase(): void {
    this.state = 'chase';
  }

  // Entre os golpes que alcançam, `closeAttackChance` decide se prefere o de
  // menor alcance (ex.: o prisioneiro costuma esmagar quando está colado).
  private chooseAttack(): AttackDefinition {
    const distance = this.distanceToTarget();
    const attacks = Object.values(this.definition.attacks).sort((a, b) => a.range - b.range);
    const reachable = attacks.filter((attack) => attack.range >= distance);

    if (reachable.length === 0) {
      return attacks[attacks.length - 1];
    }

    return Math.random() < this.definition.closeAttackChance
      ? reachable[0]
      : reachable[reachable.length - 1];
  }

  private enterAttack(attack: AttackDefinition): void {
    this.currentAttack = attack;
    this.state = 'attack';
    this.attackPhase = 'windup';
    this.attackElapsedMs = 0;
    this.swingId += 1;
    this.setVelocityX(0);
    this.faceTarget();
    this.play(attackAnimationKey(this.sprite, attack));
  }

  // Só nota o jogador à frente, no mesmo andar; muito perto, nota mesmo de costas.
  private canSeeTarget(): boolean {
    if (!this.hasLiveTarget() || !this.target) {
      return false;
    }

    const dx = this.target.x - this.x;
    const sameFloor = Math.abs(this.target.y - this.y) < SAME_FLOOR_TOLERANCE;
    const inFront = Math.sign(dx) === this.direction;
    const distance = Math.abs(dx);

    return (
      sameFloor &&
      distance <= this.definition.detectionRange &&
      (inFront || distance <= this.maxAttackRange)
    );
  }

  private hasLiveTarget(): boolean {
    return this.target?.isAlive ?? false;
  }

  private distanceToTarget(): number {
    return this.target ? Math.abs(this.target.x - this.x) : Number.POSITIVE_INFINITY;
  }

  private faceTarget(): void {
    if (!this.target) {
      return;
    }

    const direction = this.target.x < this.x ? -1 : 1;

    if (direction !== this.direction) {
      this.direction = direction;
      this.setFacing(direction);
    }
  }

  // Vira para quem bateu e recua com o impacto, preso no atordoamento.
  private enterHit(direction: 1 | -1): void {
    this.state = 'hit';
    this.stateTimeLeft = this.definition.hitStunMs;
    // Apanhar também reinicia a pausa entre golpes, para não revidar no ato.
    this.attackCooldownMs = this.currentAttack.cooldownMs;
    this.direction = direction === 1 ? -1 : 1;
    this.setFacing(this.direction);
    this.setVelocityX(HIT_REACTION.knockbackSpeed * direction);
    this.playAnimation('hit');
  }

  private enterDeath(): void {
    this.state = 'dead';
    this.setVelocityX(0);
    this.playAnimation('death');
  }

  private enterIdle(): void {
    this.state = 'idle';
    this.stateTimeLeft = Phaser.Math.Between(PATROL.pauseMinMs, PATROL.pauseMaxMs);
    this.setVelocityX(0);
    this.playAnimation('idle');
  }

  private enterWalk(): void {
    this.state = 'walk';
    this.setFacing(this.direction);
    this.setVelocityX(this.definition.moveSpeed * PATROL.speedFactor * this.direction);
    this.playAnimation('walk');
  }

  private playAnimation(name: EnemyAnimation): void {
    this.play(`${this.sprite.key}-${name}`, true);
  }

  private createAnimations(): void {
    for (const [name, frames] of Object.entries(this.sprite.animations)) {
      const key = `${this.sprite.key}-${name}`;

      if (this.scene.anims.exists(key)) {
        continue;
      }

      this.scene.anims.create({
        key,
        frames: this.scene.anims.generateFrameNumbers(this.sprite.key, {
          start: frames.start,
          end: frames.end,
        }),
        frameRate: frames.frameRate,
        repeat: name === 'idle' || name === 'walk' ? -1 : 0,
      });
    }

    this.createTimedAttackAnimation();
  }

  // Quadros de cada golpe sincronizados com as fases da definição: os quadros
  // de cada fase dividem igualmente o tempo dela.
  private createTimedAttackAnimation(): void {
    for (const attack of Object.values(this.definition.attacks)) {
      const key = attackAnimationKey(this.sprite, attack);

      if (this.scene.anims.exists(key)) {
        continue;
      }

      const phases = this.sprite.attacks[attack.animation];
      const frames = (
        [
          [phases.windup, attack.windupMs],
          [phases.active, attack.activeMs],
          [phases.recovery, attack.recoveryMs],
        ] as const
      ).flatMap(([[first, last], phaseMs]) => {
        const count = last - first + 1;
        return Array.from({ length: count }, (_, index) => ({
          key: this.sprite.key,
          frame: first + index,
          duration: phaseMs / count,
        }));
      });

      this.scene.anims.create({ key, frames });
    }
  }
}
