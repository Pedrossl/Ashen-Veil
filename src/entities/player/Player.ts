import Phaser from 'phaser';

import { MotionTrail, spawnDust } from '../../components/MotionTrail';
import type { Controls } from '../../core/controls';
import { COMBAT_FEEDBACK } from '../../data/combat';
import {
  PLAYER_ANIMATION,
  PLAYER_ARMED_IDLE,
  PLAYER_ATTACK_ANIMATIONS,
  PLAYER_CLIMB,
  PLAYER_DODGE,
  PLAYER_RUN,
  PLAYER_MOVEMENT,
  PLAYER_SPRITE,
} from '../../data/player';
import {
  attackDamage,
  rollCritical,
  type AttackDefinition,
  type PlayerAttackAnimationId,
} from '../../data/weapons';
import type {
  ActiveAttack,
  Attacker,
  Damageable,
  Hit,
} from '../../systems/CombatSystem';
import { PlayerState } from '../../systems/PlayerState';
import type { Ladder } from '../world/Ladder';
import { WeaponSocket } from './WeaponSocket';

const PLAYER_WALK_ANIMATION = 'player-walk';
const PLAYER_PICKUP_ANIMATION = 'player-pickup';
const PLAYER_DODGE_ANIMATION = 'player-dodge';
const PLAYER_IDLE_ANIMATION = 'player-idle';
const PLAYER_REST_DOWN_ANIMATION = 'player-rest-down';
const PLAYER_REST_UP_ANIMATION = 'player-rest-up';
const PLAYER_DEATH_ANIMATION = 'player-death';
const HIT_FLASH_TINT = 0xff8a8a;
const HIT_FLASH_MS = 120;
const HIT_KNOCKBACK_SPEED = 140;

const { walk, pickup, dodge } = PLAYER_SPRITE.sheets;

const attackAnimationKey = (id: PlayerAttackAnimationId): string =>
  `player-attack-${id}`;

// Ações que travam o controle até a animação terminar.
type PlayerAction = 'free' | 'attack' | 'pickup' | 'dodge' | 'climb' | 'rest' | 'dead';

export class Player
  extends Phaser.Physics.Arcade.Sprite
  implements Attacker, Damageable
{
  readonly faction = 'player' as const;
  private action: PlayerAction = 'free';
  private readonly state: PlayerState;
  private currentAttack?: AttackDefinition;
  private swingId = 0;
  private isCriticalSwing = false;
  private lastUpdateAt?: number;
  private ladders: Ladder[] = [];
  private ladder?: Ladder;
  private readonly weaponSocket: WeaponSocket;
  private readonly trail: MotionTrail;
  private runDustTimer = 0;
  // Já agachado na fogueira, esperando o jogador se levantar.
  private isSeatedAtFire = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly controls: Controls,
  ) {
    super(scene, x, y, walk.key, PLAYER_ANIMATION.idleFrame);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setScale(PLAYER_SPRITE.scale);
    this.setDepth(10);
    this.setCollideWorldBounds(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const { width, height, offsetX, offsetY } = PLAYER_SPRITE.body;
    body.setSize(width, height);
    body.setOffset(offsetX, offsetY);
    body.setMaxVelocityX(PLAYER_MOVEMENT.maxSpeed);

    this.state = PlayerState.of(scene.game);
    this.state.broadcast();
    this.createAnimations();
    this.weaponSocket = new WeaponSocket(scene, this);
    this.trail = new MotionTrail(scene, this, {
      intervalMs: 45,
      lifetimeMs: 300,
      tint: 0x8f9cff,
      alpha: 0.5,
    });
    this.refreshWeapon();
  }

  get isFree(): boolean {
    return this.action === 'free';
  }

  get isClimbing(): boolean {
    return this.action === 'climb';
  }

  get isDead(): boolean {
    return this.action === 'dead';
  }

  setLadders(ladders: Ladder[]): void {
    this.ladders = ladders;
  }

  // Mostra na mão a arma equipada no PlayerState (chamar após equipar).
  refreshWeapon(): void {
    this.weaponSocket.equip(this.state.weapon.sprite);

    if (this.isFree) {
      this.showIdlePose();
    }
  }

  get isAlive(): boolean {
    return !this.state.health.isDepleted;
  }

  get facing(): 1 | -1 {
    return this.flipX ? -1 : 1;
  }

  get isInvulnerable(): boolean {
    if (this.action !== 'dodge') {
      return false;
    }

    const frame = (this.anims.currentFrame?.index ?? 1) - 1;
    const { from, to } = PLAYER_DODGE.invulnerableFrames;
    return frame >= from && frame <= to;
  }

  update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    const elapsed = this.elapsedSinceLastUpdate();

    if (this.action === 'dead') {
      return;
    }

    if (this.state.health.isDepleted) {
      this.die(body);
      return;
    }

    this.state.stamina.update(elapsed, this.action === 'attack' || this.action === 'dodge');
    this.updateMotionEffects(body, elapsed);

    if (this.action === 'dodge') {
      this.updateDodge(body);
      return;
    }

    if (this.action === 'climb') {
      this.updateClimb(body);
      return;
    }

    if (this.action === 'rest') {
      this.updateRest();
      return;
    }

    if (!this.isFree) {
      return;
    }

    if (this.tryStartClimb(body)) {
      return;
    }

    if (this.controls.justPressed('dodge')) {
      this.dodge(body);
      return;
    }

    if (this.controls.justPressed('attack')) {
      this.attack(body);
      return;
    }

    this.updateMovement(body);
    this.updateMovementAnimation(body.velocity.x);
  }

  // Agacha para pegar algo em targetX; onGrab roda quando a mão alcança o item.
  pickUp(targetX: number, onGrab: () => void): void {
    if (!this.isFree) {
      return;
    }

    this.setFlipX(targetX < this.x);
    this.startAction('pickup', this.body as Phaser.Physics.Arcade.Body);

    const handleFrame = (
      _animation: Phaser.Animations.Animation,
      frame: Phaser.Animations.AnimationFrame,
    ): void => {
      if (frame.index - 1 === PLAYER_ANIMATION.pickupGrabFrame) {
        this.off(Phaser.Animations.Events.ANIMATION_UPDATE, handleFrame);
        onGrab();
      }
    };

    this.on(Phaser.Animations.Events.ANIMATION_UPDATE, handleFrame);
    this.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + PLAYER_PICKUP_ANIMATION,
      () => {
        this.off(Phaser.Animations.Events.ANIMATION_UPDATE, handleFrame);
        this.finishAction();
      },
    );
    this.play(PLAYER_PICKUP_ANIMATION);
  }

  // Rastro forte no rolamento, leve na corrida; poeira nos pés ao correr.
  private updateMotionEffects(body: Phaser.Physics.Arcade.Body, elapsed: number): void {
    const running =
      this.action === 'free' && Math.abs(body.velocity.x) > PLAYER_MOVEMENT.maxSpeed + 60;

    this.trail.setConfig(
      this.action === 'dodge'
        ? { intervalMs: 40, lifetimeMs: 320, alpha: 0.5 }
        : { intervalMs: 75, lifetimeMs: 220, alpha: 0.28 },
    );
    this.trail.setEnabled(this.action === 'dodge' || running);
    this.trail.update(elapsed);

    if (running) {
      this.runDustTimer += elapsed;

      if (this.runDustTimer >= 140) {
        this.runDustTimer = 0;
        spawnDust(this.scene, this.x, this.y, this.facing, 2);
      }
    }
  }

  // Agacha junto à fogueira; onSeated roda quando ele já está acomodado.
  rest(fireX: number, onSeated: () => void): void {
    if (!this.isFree) {
      return;
    }

    this.setFlipX(fireX < this.x);
    this.startAction('rest', this.body as Phaser.Physics.Arcade.Body);
    this.isSeatedAtFire = false;
    this.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + PLAYER_REST_DOWN_ANIMATION,
      () => {
        this.isSeatedAtFire = true;
        onSeated();
      },
    );
    this.play(PLAYER_REST_DOWN_ANIMATION);
  }

  // Qualquer comando levanta o jogador da fogueira.
  private updateRest(): void {
    if (!this.isSeatedAtFire) {
      return;
    }

    const wantsToAct =
      this.controls.horizontalAxis() !== 0 ||
      this.controls.verticalAxis() !== 0 ||
      this.controls.justPressed('attack') ||
      this.controls.justPressed('dodge') ||
      this.controls.justPressed('interact');

    if (!wantsToAct) {
      return;
    }

    this.isSeatedAtFire = false;
    this.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + PLAYER_REST_UP_ANIMATION,
      () => this.finishAction(),
    );
    this.play(PLAYER_REST_UP_ANIMATION);
  }

  // Cai de joelhos e escurece; a scene cuida do renascimento.
  private die(body: Phaser.Physics.Arcade.Body): void {
    this.action = 'dead';
    this.isSeatedAtFire = false;
    this.ladder = undefined;
    this.setScale(PLAYER_SPRITE.scale);
    body.setAcceleration(0, 0);
    body.setVelocityX(0);
    body.setAllowGravity(true);
    body.checkCollision.down = true;
    this.anims.timeScale = 1;
    this.play(PLAYER_DEATH_ANIMATION);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.55,
      duration: 900,
      delay: 300,
    });
    this.setTint(0x9a6a7a);
  }

  // Usa o relógio da scene: respeita pausa e o passo real de cada quadro.
  private elapsedSinceLastUpdate(): number {
    const now = this.scene.time.now;
    const elapsed = this.lastUpdateAt === undefined ? 0 : now - this.lastUpdateAt;
    this.lastUpdateAt = now;
    return elapsed;
  }

  getActiveAttack(): ActiveAttack | undefined {
    if (this.action !== 'attack' || !this.currentAttack) {
      return undefined;
    }

    const frame = (this.anims.currentFrame?.index ?? 1) - 1;
    const { from, to } = this.currentAttack.activeFrames;

    return {
      swingId: this.swingId,
      damage: attackDamage(this.state.weapon, this.currentAttack, this.isCriticalSwing),
      hitbox: this.currentAttack.hitbox,
      isActive: frame >= from && frame <= to,
      critical: this.isCriticalSwing,
    };
  }

  // Hitstop: congela o golpe por um instante para dar peso ao impacto.
  onAttackLanded(_target: Damageable, critical = false): void {
    const hitstop = critical ? COMBAT_FEEDBACK.critical.hitstopMs : COMBAT_FEEDBACK.hitstopMs;
    this.anims.pause();
    this.scene.time.delayedCall(hitstop, () => this.anims.resume());
  }

  getHurtbox(): Phaser.Geom.Rectangle {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
  }

  receiveHit(hit: Hit): void {
    if (this.isDead) {
      return;
    }

    // Com a vida infinita (só em desenvolvimento) o golpe ainda empurra e pisca.
    if (!this.state.infiniteHealth) {
      this.state.health.damage(hit.damage);
    }

    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(HIT_KNOCKBACK_SPEED * hit.direction);
    this.setTint(HIT_FLASH_TINT);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => this.clearTint());
  }

  // O golpe vem da arma equipada: trocar de arma troca dano, custo e alcance.
  private attack(body: Phaser.Physics.Arcade.Body): void {
    if (!this.state.stamina.canAct()) {
      return;
    }

    const attack = this.state.weapon.moveset.light;
    const animation = attackAnimationKey(attack.animation);

    this.state.stamina.spend(attack.staminaCost);
    this.currentAttack = attack;
    this.isCriticalSwing = rollCritical(this.state.weapon);
    this.swingId += 1;
    this.startAction('attack', body);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + animation, () =>
      this.finishAction(),
    );
    this.play(animation);
  }

  // Rola para onde o jogador aponta; sem direção, rola para a frente.
  private dodge(body: Phaser.Physics.Arcade.Body): void {
    if (!this.state.stamina.canAct()) {
      return;
    }

    const input = this.controls.horizontalAxis();
    const direction = input === 0 ? this.facing : input;

    this.state.stamina.spend(PLAYER_DODGE.staminaCost);
    spawnDust(this.scene, this.x, this.y, direction, 7);
    this.setFlipX(direction < 0);
    this.action = 'dodge';
    this.setScale(PLAYER_SPRITE.scale);
    this.anims.timeScale = 1;
    body.setAccelerationX(0);
    body.setDragX(0);
    body.setMaxVelocityX(PLAYER_DODGE.speed);
    body.setVelocityX(PLAYER_DODGE.speed * direction);
    this.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + PLAYER_DODGE_ANIMATION,
      () => {
        body.setMaxVelocityX(PLAYER_MOVEMENT.maxSpeed);
        this.finishAction();
      },
    );
    this.play(PLAYER_DODGE_ANIMATION);
  }

  // Impulso cheio no começo do giro; depois freia até a passada final.
  private updateDodge(body: Phaser.Physics.Arcade.Body): void {
    const frame = (this.anims.currentFrame?.index ?? 1) - 1;

    if (frame >= PLAYER_DODGE.burstFrames) {
      body.setDragX(PLAYER_DODGE.endDeceleration);
    }
  }

  // Cima agarra a escada embaixo dela; baixo agarra estando no topo.
  private tryStartClimb(body: Phaser.Physics.Arcade.Body): boolean {
    const vertical = this.controls.verticalAxis();

    if (vertical === 0) {
      return false;
    }

    const ladder = this.ladders.find((candidate) => {
      if (Math.abs(candidate.x - this.x) > PLAYER_CLIMB.grabRange) {
        return false;
      }

      return vertical < 0
        ? body.bottom > candidate.topY + 4 && body.bottom <= candidate.bottomY + 6
        : Math.abs(body.bottom - candidate.topY) < 8;
    });

    if (!ladder) {
      return false;
    }

    this.action = 'climb';
    this.setScale(PLAYER_SPRITE.scale);
    this.ladder = ladder;
    this.x = ladder.x;
    body.setAcceleration(0, 0);
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
    // Atravessa as plataformas de mão única enquanto desce pela escada.
    body.checkCollision.down = false;
    this.play(PLAYER_WALK_ANIMATION, true);
    return true;
  }

  // Sobe e desce com a caminhada mais lenta; esquerda/direita solta a escada.
  private updateClimb(body: Phaser.Physics.Arcade.Body): void {
    const ladder = this.ladder;

    if (!ladder || this.controls.horizontalAxis() !== 0) {
      this.finishClimb(body);
      return;
    }

    const vertical = this.controls.verticalAxis();
    body.setVelocity(0, vertical * PLAYER_CLIMB.speed);

    if (vertical === 0) {
      this.anims.pause();
    } else {
      this.anims.timeScale = PLAYER_CLIMB.animationTimeScale;
      this.anims.resume();
    }

    if (vertical < 0 && body.bottom <= ladder.topY) {
      body.position.y = ladder.topY - body.height;
      this.finishClimb(body);
    } else if (vertical > 0 && body.bottom >= ladder.bottomY) {
      body.position.y = ladder.bottomY - body.height;
      this.finishClimb(body);
    }
  }

  private finishClimb(body: Phaser.Physics.Arcade.Body): void {
    this.ladder = undefined;
    body.setVelocityY(0);
    body.setAllowGravity(true);
    body.checkCollision.down = true;
    this.anims.resume();
    this.anims.timeScale = 1;
    this.finishAction();
  }

  private updateMovement(body: Phaser.Physics.Arcade.Body): void {
    const direction = this.controls.horizontalAxis();
    const isRunning = direction !== 0 && this.controls.isDown('run');
    const movement = isRunning ? PLAYER_RUN : PLAYER_MOVEMENT;

    body.setMaxVelocityX(movement.maxSpeed);

    if (isRunning && PLAYER_RUN.staminaPerSecond > 0) {
      this.state.stamina.spend((PLAYER_RUN.staminaPerSecond * this.scene.game.loop.delta) / 1000);
    }

    if (direction === 0) {
      body.setAccelerationX(0);
      body.setDragX(PLAYER_MOVEMENT.deceleration);
      return;
    }

    // Ao virar, zera a velocidade para não deslizar de costas.
    if (Math.sign(body.velocity.x) === -direction) {
      body.setVelocityX(0);
    }

    body.setDragX(0);
    body.setAccelerationX(movement.acceleration * direction);
    this.setFlipX(direction < 0);
  }

  private startAction(
    action: Exclude<PlayerAction, 'free'>,
    body: Phaser.Physics.Arcade.Body,
  ): void {
    this.action = action;
    this.setScale(PLAYER_SPRITE.scale);
    this.anims.timeScale = 1;
    body.setAccelerationX(0);
    body.setDragX(PLAYER_MOVEMENT.attackDeceleration);
  }

  private finishAction(): void {
    this.action = 'free';
    this.currentAttack = undefined;
    this.showIdlePose();
  }

  // Armado, fica em guarda segurando a arma; desarmado, respira parado.
  private showIdlePose(): void {
    const category = this.state.weapon.category;
    const armed =
      category in PLAYER_ARMED_IDLE
        ? PLAYER_ARMED_IDLE[category as keyof typeof PLAYER_ARMED_IDLE]
        : undefined;

    if (armed) {
      this.stop();
      this.setTexture(PLAYER_SPRITE.sheets[armed.sheet].key, armed.frame);
      this.breatheInGuard();
      return;
    }

    this.play(PLAYER_IDLE_ANIMATION, true);
  }

  // Respiração da pose de guarda: o quadro é único, então respira por escala.
  private breatheInGuard(): void {
    const { amplitude, periodMs } = PLAYER_ANIMATION.armedBreath;
    const phase = (this.scene.time.now / periodMs) * Math.PI * 2;
    this.setScale(PLAYER_SPRITE.scale, PLAYER_SPRITE.scale * (1 + amplitude * Math.sin(phase)));
  }

  private updateMovementAnimation(velocityX: number): void {
    if (Math.abs(velocityX) < PLAYER_MOVEMENT.idleSpeedThreshold) {
      this.anims.timeScale = 1;
      this.showIdlePose();
      return;
    }

    this.setScale(PLAYER_SPRITE.scale);

    // Correndo, o mesmo ciclo toca mais rápido para os pés não deslizarem.
    this.anims.timeScale = Math.max(1, Math.abs(velocityX) / PLAYER_MOVEMENT.maxSpeed);
    this.play(PLAYER_WALK_ANIMATION, true);
  }

  private createAnimations(): void {
    const anims = this.scene.anims;

    if (!anims.exists(PLAYER_WALK_ANIMATION)) {
      anims.create({
        key: PLAYER_WALK_ANIMATION,
        frames: anims.generateFrameNumbers(walk.key, PLAYER_ANIMATION.walkFrames),
        frameRate: PLAYER_ANIMATION.walkFrameRate,
        repeat: -1,
      });
    }

    for (const [id, definition] of Object.entries(PLAYER_ATTACK_ANIMATIONS)) {
      const key = attackAnimationKey(id as PlayerAttackAnimationId);
      const sheetKey = PLAYER_SPRITE.sheets[definition.sheet].key;

      if (!anims.exists(key)) {
        anims.create({
          key,
          frames: definition.frameDurations.map((duration, frame) => ({
            key: sheetKey,
            frame,
            duration,
          })),
        });
      }
    }

    if (!anims.exists(PLAYER_IDLE_ANIMATION)) {
      anims.create({
        key: PLAYER_IDLE_ANIMATION,
        frames: anims.generateFrameNumbers(PLAYER_SPRITE.sheets.idle.key, { start: 0, end: 5 }),
        frameRate: PLAYER_ANIMATION.idleBreathFrameRate,
        repeat: -1,
      });
    }

    if (!anims.exists(PLAYER_DODGE_ANIMATION)) {
      anims.create({
        key: PLAYER_DODGE_ANIMATION,
        frames: PLAYER_DODGE.frameDurations.map((duration, frame) => ({
          key: dodge.key,
          frame,
          duration,
        })),
      });
    }

    const durations = PLAYER_ANIMATION.pickupFrameDurations;
    const hold = PLAYER_ANIMATION.restHoldFrame;

    if (!anims.exists(PLAYER_REST_DOWN_ANIMATION)) {
      anims.create({
        key: PLAYER_REST_DOWN_ANIMATION,
        frames: durations.slice(0, hold + 1).map((duration, frame) => ({ key: pickup.key, frame, duration })),
      });
      anims.create({
        key: PLAYER_REST_UP_ANIMATION,
        frames: durations.slice(hold + 1).map((duration, index) => ({
          key: pickup.key,
          frame: hold + 1 + index,
          duration,
        })),
      });
      // Morte: o mesmo agachamento, mais rápido, até ficar de joelhos.
      anims.create({
        key: PLAYER_DEATH_ANIMATION,
        frames: durations.slice(0, hold + 1).map((duration, frame) => ({
          key: pickup.key,
          frame,
          duration: duration * 0.6,
        })),
      });
    }

    if (!anims.exists(PLAYER_PICKUP_ANIMATION)) {
      anims.create({
        key: PLAYER_PICKUP_ANIMATION,
        frames: PLAYER_ANIMATION.pickupFrameDurations.map(
          (duration, frame) => ({ key: pickup.key, frame, duration }),
        ),
      });
    }
  }
}
