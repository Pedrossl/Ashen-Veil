import Phaser from 'phaser';

import { spawnHealBurst } from '../../components/HealEffect';
import { MotionTrail, spawnDust } from '../../components/MotionTrail';
import type { Controls } from '../../core/controls';
import { GAME_EVENTS } from '../../core/gameEvents';
import { COMBAT_FEEDBACK } from '../../data/combat';
import { AMPOULE, ITEM_IMAGES } from '../../data/items';
import {
  PLAYER_ANIMATION,
  PLAYER_ARMED_IDLE,
  PLAYER_ATTACK_ANIMATIONS,
  PLAYER_CLIMB,
  PLAYER_DRAGGED,
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
import { playSound } from '../../systems/SoundEffects';
import type { Ladder } from '../world/Ladder';
import { WeaponSocket } from './WeaponSocket';

const PLAYER_WALK_ANIMATION = 'player-walk';
const PLAYER_CLIMB_ANIMATION = 'player-climb';
const PLAYER_DRAGGED_ANIMATION = 'player-dragged';
const PLAYER_RISE_ANIMATION = 'player-rise';
const PLAYER_ANIMATION_LAST_DRAGGED_FRAME = 7;
const PLAYER_PICKUP_ANIMATION = 'player-pickup';
const PLAYER_DODGE_ANIMATION = 'player-dodge';
const PLAYER_IDLE_ANIMATION = 'player-idle';
const PLAYER_REST_DOWN_ANIMATION = 'player-rest-down';
const PLAYER_REST_UP_ANIMATION = 'player-rest-up';
const PLAYER_DEATH_ANIMATION = 'player-death';
const HIT_FLASH_TINT = 0xff8a8a;
const HIT_FLASH_MS = 120;
const HIT_KNOCKBACK_SPEED = 140;

// Ampola na mão durante o gole: sai da cintura, sobe até a boca, vira e desce.
// Posições relativas aos pés (x para a frente); a imagem é a arte do item.
const AMPOULE_IN_HAND = {
  height: 30,
  hip: { forward: 32, up: 80, angle: 10 },
  mouth: { forward: 32, up: 124, angle: -100 },
  // Frações do gole: subindo até `raiseUntil`, na boca até `lowerFrom`.
  raiseUntil: 0.35,
  lowerFrom: 0.72,
} as const;

// Parado, toca a sheet de cura: posição da mão direita (pixels do quadro de
// 420x340) e ângulo da ampola em cada quadro; `null` = ainda/já guardada.
const DRINK_HAND: ReadonlyArray<{ x: number; y: number; angle: number } | null> = [
  null,
  { x: 240, y: 175, angle: 10 },
  { x: 292, y: 155, angle: 0 },
  { x: 300, y: 104, angle: -60 },
  { x: 286, y: 88, angle: -110 },
  { x: 288, y: 122, angle: -40 },
  { x: 256, y: 160, angle: 10 },
  null,
];

const { walk, pickup, dodge } = PLAYER_SPRITE.sheets;

const attackAnimationKey = (id: PlayerAttackAnimationId): string =>
  `player-attack-${id}`;

// Ações que travam o controle até a animação terminar.
// captured: puxado para baixo da terra por um boss, sem controle nem corpo físico.
type PlayerAction = 'free' | 'attack' | 'pickup' | 'dodge' | 'climb' | 'rest' | 'captured' | 'dead';

export class Player
  extends Phaser.Physics.Arcade.Sprite
  implements Attacker, Damageable
{
  readonly faction = 'player' as const;
  private action: PlayerAction = 'free';
  private readonly stats: PlayerState;
  private currentAttack?: AttackDefinition;
  // O ataque pode ser cancelado por esquiva. Guardamos o listener para que a
  // conclusão da animação interrompida não encerre uma esquiva futura.
  private attackCompletion?: { event: string; handler: () => void };
  private swingId = 0;
  private isCriticalSwing = false;
  private lastUpdateAt?: number;
  private ladders: Ladder[] = [];
  private ladder?: Ladder;
  private readonly weaponSocket: WeaponSocket;
  private readonly trail: MotionTrail;
  private runDustTimer = 0;
  private fallingForSound = false;
  // Terreno que atrasa o passo (ex.: água na canela); 1 = normal.
  private terrainSpeedFactor = 1;
  // Já agachado na fogueira, esperando o jogador se levantar.
  private isSeatedAtFire = false;
  // Bebendo a ampola: tempo desde o início do gole (indefinido fora dele).
  private drinkElapsedMs?: number;
  private hasHealedThisDrink = false;
  private ampouleInHand?: Phaser.GameObjects.Image;

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

    this.stats = PlayerState.of(scene.game);
    this.stats.broadcast();
    this.createAnimations();
    this.weaponSocket = new WeaponSocket(scene, this);
    this.trail = new MotionTrail(scene, this, {
      intervalMs: 45,
      lifetimeMs: 300,
      tint: 0x8f9cff,
      alpha: 0.5,
    });
    this.refreshWeapon();
    this.on(Phaser.Animations.Events.ANIMATION_UPDATE, (
      animation: Phaser.Animations.Animation,
      frame: Phaser.Animations.AnimationFrame,
    ) => {
      const grounded = body.blocked.down || body.touching.down || !body.allowGravity;
      if (animation.key === PLAYER_WALK_ANIMATION && this.action === 'free' && grounded
        && Math.abs(body.velocity.x) > PLAYER_MOVEMENT.idleSpeedThreshold
        && (frame.index === 1 || frame.index === 5)) {
        playSound(this.scene, this.terrainSpeedFactor < 1 ? 'waterStep' : 'step');
      }
      if (animation.key === PLAYER_CLIMB_ANIMATION && this.isClimbing
        && Math.abs(body.velocity.y) > 1 && (frame.index === 1 || frame.index === 5)) {
        playSound(this.scene, 'ladder');
      }
      // Som de deslocamento no começo da fase ativa, sincronizado com a arma.
      if (this.action === 'attack' && this.currentAttack
        && frame.index - 1 === this.currentAttack.activeFrames.from) {
        playSound(this.scene, this.stats.weapon.category === 'unarmed' ? 'punch' : 'sword');
      }
    });
  }

  // Livre para interagir: sem ação em curso e sem estar bebendo.
  get isFree(): boolean {
    return this.action === 'free' && !this.isDrinking;
  }

  get isDrinking(): boolean {
    return this.drinkElapsedMs !== undefined;
  }

  get isClimbing(): boolean {
    return this.action === 'climb';
  }

  get isDead(): boolean {
    return this.action === 'dead';
  }

  // A scene informa o terreno sob os pés a cada quadro.
  setTerrainSpeedFactor(factor: number): void {
    this.terrainSpeedFactor = factor;
  }

  setLadders(ladders: Ladder[]): void {
    this.ladders = ladders;
  }

  // Mostra na mão a arma equipada no PlayerState (chamar após equipar).
  refreshWeapon(): void {
    this.weaponSocket.equip(
      this.stats.weapon.sprite,
      this.stats.weapon.bladeScale,
      this.stats.weapon.gripOriginY,
    );

    if (this.isFree) {
      this.showIdlePose();
    }
  }

  get isAlive(): boolean {
    return !this.stats.health.isDepleted;
  }

  get facing(): 1 | -1 {
    return this.flipX ? -1 : 1;
  }

  get isInvulnerable(): boolean {
    if (this.action === 'captured') {
      return true;
    }

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

    if (this.action === 'dead' || this.action === 'captured') {
      return;
    }

    if (this.stats.health.isDepleted) {
      this.die(body);
      return;
    }

    const onFloor = body.blocked.down || body.touching.down;
    if (this.fallingForSound && onFloor && this.action !== 'climb') {
      playSound(this.scene, this.terrainSpeedFactor < 1 ? 'waterLand' : 'land');
    }
    this.fallingForSound = !onFloor && body.allowGravity && body.velocity.y > 180;

    this.stats.stamina.update(elapsed, this.action === 'attack' || this.action === 'dodge');
    this.updateMotionEffects(body, elapsed);

    // Uma esquiva corta o golpe em curso. Ela ainda precisa de stamina e usa
    // os mesmos i-frames da esquiva iniciada parado.
    if (this.action === 'attack') {
      if (this.controls.justPressed('dodge')) {
        this.dodge(body);
      }
      return;
    }

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

    if (this.action !== 'free') {
      return;
    }

    // Bebendo, continua andando, só que mais devagar e sem outras ações.
    if (this.isDrinking) {
      this.updateMovement(body, AMPOULE.moveSpeedFactor);
      this.updateDrink(elapsed, Math.abs(body.velocity.x) >= PLAYER_MOVEMENT.idleSpeedThreshold);
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

    if (this.controls.justPressed('useItem')) {
      this.startDrink();
    }

    this.updateMovement(body);
    this.updateMovementAnimation(body.velocity.x, this.terrainSpeedFactor);
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
      if (this.action === 'pickup' && frame.index - 1 === PLAYER_ANIMATION.pickupGrabFrame) {
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

  // Agarrado por raízes: abaixa até o tronco e afunda no chão. Sem corpo
  // físico até `riseAt`; `onSunk` roda quando ele some por completo.
  dragUnder(onSunk: () => void): void {
    if (this.isDead) {
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.endDrink();
    this.ladder = undefined;
    this.isSeatedAtFire = false;
    this.startAction('captured', body);
    body.stop();
    body.enable = false;
    this.play(PLAYER_DRAGGED_ANIMATION);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + PLAYER_DRAGGED_ANIMATION, () => {
      this.tweenBuried(0, PLAYER_DRAGGED.sinkDistance, PLAYER_DRAGGED.sinkMs, () => {
        this.setVisible(false);
        onSunk();
      });
    });
  }

  // Sai de baixo da terra em (x, piso): sobe o tronco e se levanta.
  riseAt(x: number, floorY: number): void {
    if (this.action !== 'captured') {
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setPosition(x, floorY + 1).setVisible(true);
    this.stop();
    this.setTexture(PLAYER_SPRITE.sheets.dragged.key, PLAYER_ANIMATION_LAST_DRAGGED_FRAME);
    this.tweenBuried(PLAYER_DRAGGED.sinkDistance, 0, PLAYER_DRAGGED.riseMs, () => {
      this.play(PLAYER_RISE_ANIMATION);
      this.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + PLAYER_RISE_ANIMATION, () => {
        body.enable = true;
        body.reset(this.x, this.y);
        this.finishAction();
      });
    });
  }

  // Afunda o sprite `from`→`to` px do quadro, cortando o que fica sob o chão.
  private tweenBuried(from: number, to: number, duration: number, onComplete: () => void): void {
    const baseY = this.y - from * PLAYER_SPRITE.scale;
    const state = { depth: from };
    const apply = (): void => {
      this.y = baseY + state.depth * PLAYER_SPRITE.scale;
      this.setCrop(0, 0, PLAYER_SPRITE.frameWidth, PLAYER_SPRITE.frameHeight - state.depth);
    };

    apply();
    this.scene.tweens.add({
      targets: state,
      depth: to,
      duration,
      ease: to > from ? 'Quad.In' : 'Quad.Out',
      onUpdate: apply,
      onComplete: () => {
        apply();

        if (to === 0) {
          this.setCrop();
        }
        onComplete();
      },
    });
  }

  // Já sentado junto à fogueira (sala recarregada depois do descanso).
  sitAtFire(fireX: number): void {
    this.setFlipX(fireX < this.x);
    this.startAction('rest', this.body as Phaser.Physics.Arcade.Body);
    this.stop();
    this.setTexture(PLAYER_SPRITE.sheets.rest.key, PLAYER_ANIMATION.restSitFrameDurations.length - 1);
    this.isSeatedAtFire = true;
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

  // Queda completa, sem alterar o corpo físico; a scene cuida do renascimento.
  private die(body: Phaser.Physics.Arcade.Body): void {
    this.endDrink();
    this.action = 'dead';
    playSound(this.scene, 'death');
    this.isSeatedAtFire = false;
    this.ladder = undefined;
    this.currentAttack = undefined;
    this.trail.setEnabled(false);
    this.weaponSocket.equip(undefined);
    this.clearTint();
    this.setScale(PLAYER_SPRITE.scale);
    body.setAcceleration(0, 0);
    body.setVelocityX(0);
    body.setAllowGravity(true);
    body.checkCollision.down = true;
    this.anims.timeScale = 1;
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + PLAYER_DEATH_ANIMATION, () => {
      this.scene.events.emit(GAME_EVENTS.playerDeathAnimationCompleted);
    });
    this.play(PLAYER_DEATH_ANIMATION);
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
      damage: attackDamage(this.stats.weapon, this.currentAttack, this.isCriticalSwing),
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
    if (!this.stats.infiniteHealth) {
      this.stats.health.damage(hit.damage);
    }

    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(HIT_KNOCKBACK_SPEED * hit.direction);
    this.setTint(HIT_FLASH_TINT);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => this.clearTint());
  }

  // O golpe vem da arma equipada: trocar de arma troca dano, custo e alcance.
  private attack(body: Phaser.Physics.Arcade.Body): void {
    if (!this.stats.stamina.canAct()) {
      return;
    }

    const attack = this.stats.weapon.moveset.light;
    const animation = attackAnimationKey(attack.animation);

    this.stats.stamina.spend(attack.staminaCost);
    this.currentAttack = attack;
    this.isCriticalSwing = rollCritical(this.stats.weapon);
    this.swingId += 1;
    this.startAction('attack', body);
    const event = Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + animation;
    const handler = (): void => {
      this.attackCompletion = undefined;
      if (this.action === 'attack') {
        this.finishAction();
      }
    };
    this.attackCompletion = { event, handler };
    this.once(event, handler);
    this.play(animation);
    this.anims.timeScale = this.stats.weapon.attackSpeed ?? 1;
  }

  // Rola para onde o jogador aponta; sem direção, rola para a frente.
  private dodge(body: Phaser.Physics.Arcade.Body): void {
    if (!this.stats.stamina.canAct()) {
      return;
    }

    const cancelsAttack = this.action === 'attack';
    this.cancelAttack();

    const input = this.controls.horizontalAxis();
    const direction = input === 0 ? this.facing : input;

    this.stats.stamina.spend(
      cancelsAttack ? PLAYER_DODGE.attackCancelStaminaCost : PLAYER_DODGE.staminaCost,
    );
    spawnDust(this.scene, this.x, this.y, direction, 7);
    this.setFlipX(direction < 0);
    this.action = 'dodge';
    playSound(this.scene, 'dodge');
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
    this.play(PLAYER_CLIMB_ANIMATION, true);
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

  // `speedFactor` < 1 limita a velocidade e impede a corrida (ex.: bebendo).
  private updateMovement(body: Phaser.Physics.Arcade.Body, speedFactor = 1): void {
    const direction = this.controls.horizontalAxis();
    const isRunning = direction !== 0 && speedFactor === 1 && this.controls.isDown('run');
    const movement = isRunning ? PLAYER_RUN : PLAYER_MOVEMENT;

    body.setMaxVelocityX(movement.maxSpeed * speedFactor * this.terrainSpeedFactor);

    if (isRunning && PLAYER_RUN.staminaPerSecond > 0) {
      this.stats.stamina.spend((PLAYER_RUN.staminaPerSecond * this.scene.game.loop.delta) / 1000);
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
    if (this.isDead) return;
    this.action = 'free';
    this.currentAttack = undefined;
    this.showIdlePose();
  }

  private cancelAttack(): void {
    if (!this.attackCompletion) {
      return;
    }

    this.off(this.attackCompletion.event, this.attackCompletion.handler);
    this.attackCompletion = undefined;
    this.currentAttack = undefined;
  }

  // Armado, fica em guarda segurando a arma; desarmado, respira parado.
  private showIdlePose(): void {
    const category = this.stats.weapon.category;
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

  private updateMovementAnimation(velocityX: number, speedFactor = 1): void {
    if (Math.abs(velocityX) < PLAYER_MOVEMENT.idleSpeedThreshold) {
      this.anims.timeScale = 1;
      this.showIdlePose();
      return;
    }

    this.setScale(PLAYER_SPRITE.scale);

    // Correndo, o mesmo ciclo toca mais rápido para os pés não deslizarem.
    this.anims.timeScale = Math.max(speedFactor, Math.abs(velocityX) / PLAYER_MOVEMENT.maxSpeed);
    this.play(PLAYER_WALK_ANIMATION, true);
  }

  // Gasta uma carga e começa o gole; sem cargas, nada acontece.
  private startDrink(): void {
    if (!this.stats.useAmpoule()) {
      return;
    }

    const image = ITEM_IMAGES[AMPOULE.itemId];
    this.drinkElapsedMs = 0;
    this.hasHealedThisDrink = false;
    this.ampouleInHand = this.scene.add.image(this.x, this.y, image.key).setDepth(this.depth + 0.2);
    this.ampouleInHand.setScale(AMPOULE_IN_HAND.height / this.ampouleInHand.height);
    this.placeAmpoule(0);
  }

  // Andando, a caminhada continua com a ampola subindo à boca; parado, toca o
  // quadro da sheet de cura correspondente ao ponto do gole.
  private updateDrink(elapsed: number, moving: boolean): void {
    if (this.drinkElapsedMs === undefined) {
      return;
    }

    if (moving) {
      this.updateMovementAnimation((this.body as Phaser.Physics.Arcade.Body).velocity.x, AMPOULE.moveSpeedFactor);
    }

    this.drinkElapsedMs += elapsed;

    if (!this.hasHealedThisDrink && this.drinkElapsedMs >= AMPOULE.healAtMs) {
      this.hasHealedThisDrink = true;
      this.stats.health.heal(AMPOULE.healAmount);
      playSound(this.scene, 'heal');
      spawnHealBurst(this.scene, this.x, this.y, this.depth);
    }

    if (this.drinkElapsedMs >= AMPOULE.drinkMs) {
      this.endDrink();
      return;
    }

    const progress = this.drinkElapsedMs / AMPOULE.drinkMs;

    if (moving) {
      this.placeAmpoule(progress);
    } else {
      this.showDrinkFrame(progress);
    }
  }

  private showDrinkFrame(progress: number): void {
    const frame = Math.min(DRINK_HAND.length - 1, Math.floor(progress * DRINK_HAND.length));
    const hand = DRINK_HAND[frame];
    this.stop();
    this.setScale(PLAYER_SPRITE.scale);
    this.setTexture(PLAYER_SPRITE.sheets.drink.key, frame);

    if (!this.ampouleInHand) {
      return;
    }

    this.ampouleInHand.setVisible(hand !== null);

    if (hand) {
      const { scale, frameWidth, frameHeight } = PLAYER_SPRITE;
      this.ampouleInHand
        .setPosition(this.x + (hand.x - frameWidth / 2) * scale * this.facing, this.y + (hand.y - frameHeight) * scale)
        .setAngle(hand.angle * this.facing)
        .setFlipX(this.facing < 0);
    }
  }

  // Leva a ampola da cintura à boca e de volta, acompanhando o jogador.
  private placeAmpoule(progress: number): void {
    if (!this.ampouleInHand) {
      return;
    }

    const { hip, mouth, raiseUntil, lowerFrom } = AMPOULE_IN_HAND;
    const toMouth =
      progress < raiseUntil
        ? Phaser.Math.Easing.Quadratic.Out(progress / raiseUntil)
        : progress < lowerFrom
          ? 1
          : 1 - Phaser.Math.Easing.Quadratic.In((progress - lowerFrom) / (1 - lowerFrom));
    const lerp = (from: number, to: number): number => from + (to - from) * toMouth;

    this.ampouleInHand
      .setVisible(true)
      .setPosition(this.x + this.facing * lerp(hip.forward, mouth.forward), this.y - lerp(hip.up, mouth.up))
      .setAngle(this.facing * lerp(hip.angle, mouth.angle))
      .setFlipX(this.facing < 0);
  }

  private endDrink(): void {
    this.drinkElapsedMs = undefined;
    this.ampouleInHand?.destroy();
    this.ampouleInHand = undefined;
  }

  private createAnimations(): void {
    const anims = this.scene.anims;

    if (!anims.exists(PLAYER_CLIMB_ANIMATION)) {
      anims.create({
        key: PLAYER_CLIMB_ANIMATION,
        frames: anims.generateFrameNumbers(PLAYER_SPRITE.sheets.climb.key, { start: 0, end: 7 }),
        frameRate: PLAYER_CLIMB.frameRate,
        repeat: -1,
      });
    }

    if (!anims.exists(PLAYER_DRAGGED_ANIMATION)) {
      const dragged = PLAYER_SPRITE.sheets.dragged.key;
      anims.create({
        key: PLAYER_DRAGGED_ANIMATION,
        frames: anims.generateFrameNumbers(dragged, { start: 0, end: PLAYER_ANIMATION_LAST_DRAGGED_FRAME }),
        frameRate: PLAYER_DRAGGED.frameRate,
      });
      anims.create({
        key: PLAYER_RISE_ANIMATION,
        frames: anims.generateFrameNumbers(dragged, {
          frames: Array.from({ length: PLAYER_ANIMATION_LAST_DRAGGED_FRAME + 1 }, (_, i) => PLAYER_ANIMATION_LAST_DRAGGED_FRAME - i),
        }),
        frameRate: PLAYER_DRAGGED.frameRate,
      });
    }

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
        frames: anims.generateFrameNumbers(PLAYER_SPRITE.sheets.idle.key, PLAYER_ANIMATION.idleFrames),
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

    if (!anims.exists(PLAYER_REST_DOWN_ANIMATION)) {
      const { restSitFrameDurations, restStandFrameDurations } = PLAYER_ANIMATION;
      const restKey = PLAYER_SPRITE.sheets.rest.key;
      anims.create({
        key: PLAYER_REST_DOWN_ANIMATION,
        frames: restSitFrameDurations.map((duration, frame) => ({ key: restKey, frame, duration })),
      });
      anims.create({
        key: PLAYER_REST_UP_ANIMATION,
        frames: restStandFrameDurations.map((duration, index) => ({
          key: restKey,
          frame: restSitFrameDurations.length + index,
          duration,
        })),
      });
    }

    if (!anims.exists(PLAYER_DEATH_ANIMATION)) {
      anims.create({
        key: PLAYER_DEATH_ANIMATION,
        frames: PLAYER_ANIMATION.deathFrameDurations.map((duration, frame) => ({
          key: PLAYER_SPRITE.sheets.death.key,
          frame,
          duration,
        })),
        // Durações explícitas por quadro; não somar o intervalo padrão de 24 FPS.
        frameRate: 1000,
        repeat: 0,
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
