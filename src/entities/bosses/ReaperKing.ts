import Phaser from 'phaser';
import { playSound } from '../../systems/SoundEffects';

import { FoeControl, type FoeDecision, type FoeDecisionListener } from '../../components/FoeControl';
import { Health } from '../../components/Health';
import { MotionTrail, spawnDust } from '../../components/MotionTrail';
import { GAME_EVENTS, type BossEngaged, type StatChange } from '../../core/gameEvents';
import { REAPER_KING as BOSS, type BossAttackDefinition } from '../../data/bosses';
import {
  REAPER_KING_SPRITE as SPRITE,
  type ReaperKingAnimation,
} from '../../data/bossSprites';
import type {
  ActiveAttack,
  Attacker,
  CombatSystem,
  Damageable,
  Hit,
  RemoteControl,
} from '../../systems/CombatSystem';
import type { EnemyTarget } from '../enemies/MeleeEnemy';
import type { BossSnapshot } from './BossSnapshot';
import { SpectralScythe } from './SpectralScythe';

const PHASE_TWO = BOSS.phaseTwo;
const FLING = PHASE_TWO.fling;

type BossState =
  | 'dormant'
  | 'intro'
  | 'idle'
  | 'run'
  | 'slash'
  | 'throw'
  | 'vanish'
  | 'hidden'
  | 'appear'
  | 'enrage'
  | 'fling'
  | 'glide'
  | 'dead';

type AttackPhase = 'windup' | 'active' | 'recovery';

// Quadros da sheet usados em cada fase dos golpes (ver data/bossSprites.ts).
const SLASH_FRAMES = { windup: [4, 5], active: 6, recovery: 7 } as const;
const THROW_FRAMES = { windup: [8, 8], active: 9, recovery: 10 } as const;

const TELEPORT = { fadeMs: 360, hiddenMs: 320 } as const;
const HIT_FLASH = { tint: 0xffc2c2, ms: 110 } as const;

export type ReaperKingConfig = {
  x: number;
  floorY: number;
  // Limites em que ele pode correr ou reaparecer.
  minX: number;
  maxX: number;
  onDefeated?: () => void;
};

// Primeiro boss. Usa todas as animações da sheet e some/reaparece numa
// nuvem roxa. A dificuldade vem do aviso dos golpes e da escolha de ações.
export class ReaperKing
  extends Phaser.GameObjects.Sprite
  implements Attacker, Damageable
{
  readonly faction = 'enemy' as const;
  readonly health = new Health(BOSS.maxHealth);
  private behavior: BossState = 'dormant';
  private stateTimeLeft = 0;
  private phase: AttackPhase = 'windup';
  private phaseTimeLeft = 0;
  private currentAttack?: BossAttackDefinition;
  private swingId = 0;
  private direction: -1 | 1 = -1;
  // Alvos possíveis (o jogador; no cooperativo, os dois) e em quem ele mira.
  // Cooperativo: comandado pelo outro jogo ou anunciando as decisões.
  private readonly control = new FoeControl<EnemyTarget>();
  private readonly aura: Phaser.GameObjects.Ellipse;
  private readonly baseY: number;
  private isPhaseTwo = false;
  private combat?: CombatSystem;
  private scythe?: SpectralScythe;
  private flingReleased = false;
  private glideTime = 0;
  private phaseTwoMotes?: Phaser.Time.TimerEvent;
  private readonly trail: MotionTrail;
  private dustTimer = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly config: ReaperKingConfig,
  ) {
    super(scene, config.x, config.floorY + 2, SPRITE.key, SPRITE.animations.idle.start);

    scene.add.existing(this);
    this.baseY = config.floorY + 2;
    this.setScale(SPRITE.scale).setDepth(9.8);
    this.setFacing(-1);
    this.createAnimations();
    this.playAnimation('idle');

    this.aura = scene.add
      .ellipse(config.x, config.floorY - 120, 260, 320, 0x8a4fd0, 0.12)
      .setDepth(this.depth - 0.1)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: this.aura,
      scaleX: { from: 0.95, to: 1.06 },
      duration: 1900,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });

    this.trail = new MotionTrail(scene, this, {
      intervalMs: 70,
      lifetimeMs: 360,
      tint: 0x8a4fd0,
      alpha: 0.45,
    });

    this.health.onChange((current, max) => {
      const change: StatChange = { current, max };
      scene.game.events.emit(GAME_EVENTS.bossHealthChanged, change);
    });
  }

  get facing(): 1 | -1 {
    return this.direction;
  }

  get isAlive(): boolean {
    return !this.health.isDepleted;
  }

  // Sumido no meio do teleporte, não pode ser atingido.
  get isInvulnerable(): boolean {
    return this.behavior === 'hidden' || this.behavior === 'dormant';
  }

  get isEngaged(): boolean {
    return this.behavior !== 'dormant' && this.isAlive;
  }

  private get target(): EnemyTarget | undefined {
    return this.control.target;
  }

  setTarget(target: EnemyTarget): void {
    this.control.setTarget(target);
  }

  addTarget(target: EnemyTarget): void {
    this.control.addTarget(target);
  }

  removeTarget(target: EnemyTarget): void {
    this.control.removeTarget(target);
  }

  // ---- cooperativo -------------------------------------------------------

  setRemoteControl(control?: RemoteControl): void {
    this.control.setRemoteControl(control);
  }

  onDecision(listener?: FoeDecisionListener): void {
    this.control.onDecision(listener);
  }

  snapshot(): BossSnapshot {
    return {
      x: Math.round(this.x),
      y: Math.round(this.y),
      facing: this.direction,
      health: this.health.current,
      engaged: this.isEngaged,
      detail: { phaseTwo: this.isPhaseTwo ? 1 : 0 },
    };
  }

  // Estado do jogo que comanda. Chegando no meio da luta, alcança-a.
  applySnapshot(snapshot: BossSnapshot): void {
    if (!this.control.isRemote || this.behavior === 'dead') {
      return;
    }

    this.control.setPosition(this, snapshot.x, snapshot.y);
    this.setFacing(snapshot.facing);
    this.health.syncTo(snapshot.health);

    if (snapshot.engaged && this.behavior === 'dormant') {
      this.announceEngaged();
      this.enterIdle();
    }

    if (snapshot.detail.phaseTwo && !this.isPhaseTwo) {
      this.enterPhaseTwo();
    }
  }

  // Executa a decisão de quem comanda, com as mesmas animações e efeitos.
  applyDecision(action: FoeDecision): void {
    if (!this.control.isRemote || this.behavior === 'dead') {
      return;
    }

    this.setFacing(action.facing);

    switch (action.kind) {
      case 'awaken':
        if (this.behavior === 'dormant') this.awaken();
        return;
      case 'idle':
        this.endTeleport();
        this.enterIdle();
        return;
      case 'run':
        this.endTeleport();
        this.startRun();
        return;
      case 'attack':
        // O reaparecimento daqui já pode ter começado o mesmo golpe.
        if ((action.name === 'slash' || action.name === 'throw') && !(this.behavior === action.name && this.phase === 'windup')) {
          this.endTeleport();
          this.startAttack(action.name);
        }
        return;
      case 'teleport':
        this.startTeleport();
        return;
      case 'appear':
        this.scene.tweens.killTweensOf(this);
        this.appearAt(action.x ?? this.x);
        return;
      case 'enrage':
        if (!this.isPhaseTwo) this.enterPhaseTwo();
        return;
      case 'fling':
        this.startFling();
        return;
      case 'die':
        this.health.syncTo(0);
        this.die();
        return;
    }
  }

  private announce(kind: string, extra: Omit<FoeDecision, 'kind' | 'facing'> = {}): void {
    this.control.announce({ kind, facing: this.direction, ...extra });
  }

  // Uma decisão nova chegou no meio do teleporte daqui: termina de aparecer.
  private endTeleport(): void {
    if (this.behavior === 'vanish' || this.behavior === 'hidden' || this.behavior === 'appear') {
      this.scene.tweens.killTweensOf(this);
      this.setAlpha(1);
    }
  }

  // Necessário para registrar a foice arremessada como atacante própria.
  attachCombat(combat: CombatSystem): void {
    this.combat = combat;
  }

  getHurtbox(): Phaser.Geom.Rectangle {
    const { width, height } = BOSS.hurtbox;
    return new Phaser.Geom.Rectangle(this.x - width / 2, this.y - height, width, height);
  }

  // Comandado pelo outro jogo, os golpes acertam lá.
  getActiveAttack(): ActiveAttack | undefined {
    if (this.control.isRemote || !this.currentAttack || (this.behavior !== 'slash' && this.behavior !== 'throw')) {
      return undefined;
    }

    return {
      swingId: this.swingId,
      damage: this.currentAttack.damage,
      hitbox: this.currentAttack.hitbox,
      isActive: this.phase === 'active',
    };
  }

  // Bosses não são atordoados por cada golpe: só piscam com o impacto.
  receiveHit(hit: Hit): void {
    if (!this.isAlive || this.isInvulnerable) {
      return;
    }

    this.setTint(HIT_FLASH.tint);
    this.scene.time.delayedCall(HIT_FLASH.ms, () => this.clearTint());

    if (this.control.isRemote) {
      this.control.forwardHit(hit);
      return;
    }

    this.control.addThreat(hit.source, hit.damage);
    this.health.damage(hit.damage);

    if (!this.isAlive) {
      this.die();
    } else if (this.behavior === 'dormant') {
      this.awaken();
    } else if (
      !this.isPhaseTwo &&
      this.health.current / this.health.max <= PHASE_TWO.healthRatio
    ) {
      this.enterPhaseTwo();
    }
  }

  update(delta: number): void {
    this.aura.setPosition(this.x, this.y - 120).setAlpha(this.alpha);
    this.scythe?.update(delta);
    this.updateMotionEffects(delta);

    if (this.behavior === 'dead') {
      return;
    }

    const remote = !this.control.update(this, delta);

    if (!remote && !this.control.retarget(this)) {
      return;
    }

    this.stateTimeLeft -= delta;

    // Comandado pelo outro jogo: decisões e deslocamentos chegam de lá; os
    // tempos dos golpes, da fumaça e do arremesso correm aqui também.
    switch (this.behavior) {
      case 'dormant':
        if (!remote && this.target && this.target.x >= BOSS.awakenX) {
          this.awaken();
        }
        break;
      case 'intro':
      case 'idle':
        if (!remote && this.stateTimeLeft <= 0) {
          this.decide();
        }
        break;
      case 'run':
        if (!remote) this.updateRun(delta);
        break;
      case 'slash':
      case 'throw':
        this.updateAttack(delta);
        break;
      case 'vanish':
      case 'hidden':
      case 'appear':
        this.updateTeleport();
        break;
      case 'enrage':
        if (this.stateTimeLeft <= 0) {
          this.enterIdle();
        }
        break;
      case 'fling':
        this.updateFling();
        break;
      case 'glide':
        if (!remote) this.updateGlide(delta);
        break;
    }
  }

  // Rastro roxo em todo deslocamento rápido e no golpe; poeira ao correr.
  private updateMotionEffects(delta: number): void {
    const moving =
      this.behavior === 'run' ||
      this.behavior === 'glide' ||
      this.behavior === 'vanish' ||
      this.behavior === 'appear' ||
      (this.behavior === 'slash' && this.phase === 'active') ||
      (this.isPhaseTwo && this.behavior === 'enrage');

    // Na segunda fase o rastro nunca desliga: o corpo tremeluz em roxo.
    this.trail.setEnabled(moving || (this.isPhaseTwo && this.behavior !== 'hidden'));
    this.trail.setConfig(
      this.isPhaseTwo
        ? { intervalMs: moving ? 40 : 110, lifetimeMs: moving ? 480 : 600, alpha: moving ? 0.6 : 0.35 }
        : {},
    );
    this.trail.update(delta);

    if (this.behavior === 'run') {
      this.dustTimer += delta;

      if (this.dustTimer >= 160) {
        this.dustTimer = 0;
        spawnDust(this.scene, this.x, this.baseY, this.direction, 3);
      }
    }
  }

  // Na segunda fase tudo acontece mais rápido.
  private get speed(): number {
    return this.isPhaseTwo ? PHASE_TWO.speedMultiplier : 1;
  }

  // Metade da vida: urra, explode em fumaça e passa a brilhar mais forte.
  private enterPhaseTwo(): void {
    this.announce('enrage');
    playSound(this.scene, 'reaperPhase', this);
    this.isPhaseTwo = true;

    if (this.behavior === 'hidden' || this.behavior === 'vanish' || this.behavior === 'appear') {
      this.scene.tweens.killTweensOf(this);
      this.setAlpha(1);
    }

    this.behavior = 'enrage';
    this.stateTimeLeft = PHASE_TWO.enrageMs;
    this.currentAttack = undefined;
    this.faceTarget();
    this.stop();
    this.setFrame(SPRITE.animations.summon.start);
    this.anims.timeScale = PHASE_TWO.speedMultiplier;
    this.trail.setConfig({ tint: 0xb46cff });
    this.scene.cameras.main.shake(900, 0.008);

    for (let i = 0; i < 3; i += 1) {
      this.scene.time.delayedCall(i * 280, () => this.spawnSmoke(this.x, this.y));
    }

    // Aura um pouco mais clara pulsando mais rápido; o brilho forte vem do
    // rastro fantasma contínuo (ver updateMotionEffects).
    this.scene.tweens.killTweensOf(this.aura);
    this.aura.setFillStyle(0xa060ff, 0.16);
    this.scene.tweens.add({
      targets: this.aura,
      scaleX: { from: 0.92, to: 1.12 },
      scaleY: { from: 1.04, to: 0.94 },
      duration: 650,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });

    // Fagulhas roxas subindo do corpo enquanto ele estiver vivo.
    this.phaseTwoMotes = this.scene.time.addEvent({
      delay: 90,
      loop: true,
      callback: () => this.spawnMote(),
    });
  }

  private spawnMote(): void {
    if (!this.visible || this.alpha < 0.3) {
      return;
    }

    const mote = this.scene.add
      .circle(this.x + Phaser.Math.Between(-50, 50), this.y - Phaser.Math.Between(20, 200), Phaser.Math.Between(2, 4), 0xd2a6ff, 0.9)
      .setDepth(this.depth + 0.1)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: mote,
      y: mote.y - Phaser.Math.Between(60, 130),
      alpha: 0,
      duration: Phaser.Math.Between(600, 1000),
      onComplete: () => mote.destroy(),
    });
  }

  // Arremesso giratório (só na segunda fase): carrega, solta e flutua sem a foice.
  private startFling(): void {
    this.announce('fling');
    this.endTeleport();
    this.behavior = 'fling';
    this.flingReleased = false;
    this.stateTimeLeft = FLING.windupMs / this.speed;
    this.faceTarget();
    this.stop();
    this.setFrame(SPRITE.animations.summon.start);
  }

  private updateFling(): void {
    if (this.stateTimeLeft > 0) {
      return;
    }

    if (!this.flingReleased) {
      this.flingReleased = true;
      this.stateTimeLeft = FLING.releaseMs / this.speed;
      this.setFrame(SPRITE.animations.throwScythe.start);
      return;
    }

    this.releaseScythe();
  }

  private releaseScythe(): void {
    playSound(this.scene, 'reaperThrow', this);
    const hand = this.handPosition();

    this.scythe = new SpectralScythe(this.scene, {
      x: hand.x,
      y: hand.y,
      direction: this.direction,
      minX: this.config.minX - 200,
      maxX: this.config.maxX + 80,
      speedMultiplier: this.speed,
      returnTo: () => this.handPosition(),
      onCaught: () => this.catchScythe(),
    });

    // Comandado pelo outro jogo, a foice daqui é só visual.
    if (!this.control.isRemote) {
      this.combat?.addAttacker(this.scythe);
    }

    // De mão vazia (último quadro do arremesso), flutua pela arena.
    this.behavior = 'glide';
    this.glideTime = 0;
    this.setFrame(SPRITE.animations.throwScythe.end);
  }

  private updateGlide(delta: number): void {
    this.glideTime += delta;
    this.faceTarget();

    // Mantém distância média do jogador enquanto a foice voa.
    const distance = this.targetX() - this.x;
    const desired = 320;
    const towards = Math.abs(distance) > desired ? Math.sign(distance) : -Math.sign(distance);
    const step = (FLING.glideSpeed * this.speed * delta) / 1000;
    this.x = Phaser.Math.Clamp(this.x + towards * step, this.config.minX, this.config.maxX);
    // Flutua: sobe e desce acima do chão.
    this.y = this.baseY - 18 - Math.sin(this.glideTime / 140) * 8;
  }

  private catchScythe(): void {
    if (this.scythe) {
      this.combat?.remove(this.scythe);
      this.scythe = undefined;
    }

    this.y = this.baseY;

    if (this.behavior === 'glide') {
      this.enterIdle();
    }
  }

  private handPosition(): { x: number; y: number } {
    return { x: this.x + this.direction * 110, y: this.y - FLING.flightHeight };
  }

  // Ergue a foice com a aura (quadro de invocação) e mostra a barra de vida.
  private awaken(): void {
    this.announce('awaken');
    playSound(this.scene, 'reaperWake', this);
    this.behavior = 'intro';
    this.stateTimeLeft = BOSS.introMs;
    this.faceTarget();
    this.stop();
    this.setFrame(SPRITE.animations.summon.start);
    this.scene.cameras.main.shake(500, 0.004);
    this.announceEngaged();
  }

  private announceEngaged(): void {
    const engaged: BossEngaged = {
      name: BOSS.name,
      current: this.health.current,
      max: this.health.max,
    };
    this.scene.game.events.emit(GAME_EVENTS.bossEngaged, engaged);
  }

  private decide(): void {
    const distance = Math.abs(this.targetX() - this.x);

    if (this.isPhaseTwo && !this.scythe && distance >= 200 && Math.random() < PHASE_TWO.flingChance) {
      this.startFling();
      return;
    }

    if (distance <= BOSS.slashRange) {
      this.startAttack('slash');
      return;
    }

    const canThrow = distance >= BOSS.throwRange.min && distance <= BOSS.throwRange.max;

    if (canThrow && Math.random() < BOSS.throwChance) {
      this.startAttack('throw');
    } else if (Math.random() < BOSS.teleportChance) {
      this.startTeleport();
    } else {
      this.startRun();
    }
  }

  private enterIdle(): void {
    this.announce('idle');
    this.behavior = 'idle';
    this.stateTimeLeft = (BOSS.cooldownMs + Math.random() * BOSS.cooldownJitterMs) / this.speed;
    this.currentAttack = undefined;
    this.faceTarget();
    this.playAnimation('idle');
  }

  private startRun(): void {
    this.announce('run');
    this.behavior = 'run';
    this.stateTimeLeft = BOSS.maxRunMs;
    this.faceTarget();
    this.playAnimation('run');
  }

  private updateRun(delta: number): void {
    this.faceTarget();
    const step = (BOSS.runSpeed * this.speed * delta) / 1000;
    this.x = Phaser.Math.Clamp(this.x + step * this.direction, this.config.minX, this.config.maxX);

    if (Math.abs(this.targetX() - this.x) <= BOSS.slashRange * 0.8) {
      this.startAttack('slash');
    } else if (this.stateTimeLeft <= 0) {
      this.enterIdle();
    }
  }

  private startAttack(kind: 'slash' | 'throw'): void {
    this.announce('attack', { name: kind });
    this.behavior = kind;
    this.currentAttack = kind === 'slash' ? BOSS.slash : BOSS.throwScythe;
    this.swingId += 1;
    this.faceTarget();
    this.stop();
    this.setPhase('windup');
  }

  private setPhase(phase: AttackPhase): void {
    const attack = this.currentAttack;

    if (!attack) {
      return;
    }

    const frames = this.behavior === 'slash' ? SLASH_FRAMES : THROW_FRAMES;
    this.phase = phase;
    if (phase === 'active') playSound(this.scene, this.behavior === 'slash' ? 'reaperSlash' : 'reaperThrow', this);
    const duration =
      phase === 'windup' ? attack.windupMs : phase === 'active' ? attack.activeMs : attack.recoveryMs;
    this.phaseTimeLeft = duration / this.speed;
    this.setFrame(phase === 'windup' ? frames.windup[0] : frames[phase]);
  }

  private updateAttack(delta: number): void {
    const attack = this.currentAttack;

    if (!attack) {
      this.enterIdle();
      return;
    }

    this.phaseTimeLeft -= delta;

    // Na segunda metade do aviso, troca para o quadro mais carregado.
    if (this.phase === 'windup' && this.phaseTimeLeft < attack.windupMs / this.speed / 2) {
      const frames = this.behavior === 'slash' ? SLASH_FRAMES : THROW_FRAMES;
      this.setFrame(frames.windup[1]);
    }

    if (this.phaseTimeLeft > 0) {
      return;
    }

    if (this.phase === 'windup') {
      this.setPhase('active');
    } else if (this.phase === 'active') {
      this.setPhase('recovery');
    } else {
      this.enterIdle();
    }
  }

  // Some numa nuvem roxa e reaparece perto do jogador, às vezes às costas.
  private startTeleport(): void {
    this.announce('teleport');
    playSound(this.scene, 'reaperTeleport', this);
    this.behavior = 'vanish';
    this.stop();
    this.setFrame(SPRITE.animations.summon.start);
    this.spawnSmoke(this.x, this.y);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: TELEPORT.fadeMs / this.speed,
      ease: 'Quad.In',
      onComplete: () => {
        this.behavior = 'hidden';
        this.stateTimeLeft = TELEPORT.hiddenMs / this.speed;
      },
    });
  }

  private updateTeleport(): void {
    // Comandado pelo outro jogo, espera o lugar onde ele reaparece lá.
    if (this.control.isRemote || this.behavior !== 'hidden' || this.stateTimeLeft > 0) {
      return;
    }

    const side = Math.random() < 0.5 ? -1 : 1;
    this.appearAt(
      Phaser.Math.Clamp(this.targetX() + side * BOSS.teleportDistance, this.config.minX, this.config.maxX),
    );
  }

  private appearAt(x: number): void {
    this.x = x;
    this.control.setPosition(this, x, this.baseY, true);
    this.announce('appear', { x: Math.round(x) });
    this.behavior = 'appear';
    playSound(this.scene, 'reaperTeleport', this);
    this.faceTarget();
    this.spawnSmoke(this.x, this.y);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: TELEPORT.fadeMs / this.speed,
      ease: 'Quad.Out',
      // Reaparece já atacando: o jogador precisa reagir ao aviso.
      onComplete: () => this.startAttack('slash'),
    });
  }

  private die(): void {
    this.announce('die');
    playSound(this.scene, 'reaperDeath', this);
    this.behavior = 'dead';
    this.currentAttack = undefined;
    this.y = this.baseY;
    this.phaseTwoMotes?.remove();

    if (this.scythe) {
      this.combat?.remove(this.scythe);
      this.scythe.dispose();
      this.scythe = undefined;
    }
    this.stop();
    this.setFrame(SPRITE.animations.summon.start);
    this.scene.game.events.emit(GAME_EVENTS.bossDefeated);
    this.scene.cameras.main.shake(700, 0.006);

    // Desfaz-se em fumaça roxa.
    for (let i = 0; i < 5; i += 1) {
      this.scene.time.delayedCall(i * 260, () =>
        this.spawnSmoke(this.x + Phaser.Math.Between(-60, 60), this.y - Phaser.Math.Between(0, 120)),
      );
    }

    this.scene.tweens.add({
      targets: [this, this.aura],
      alpha: 0,
      duration: 1600,
      ease: 'Quad.In',
      onComplete: () => {
        this.config.onDefeated?.();
        this.setVisible(false);
      },
    });
  }

  // Nuvem de fumaça roxa e escura com um anel de energia, do tamanho do boss.
  private spawnSmoke(x: number, footY: number): void {
    const centerY = footY - 120;
    const ring = this.scene.add
      .circle(x, centerY, 40)
      .setStrokeStyle(6, 0xb07cff, 0.9)
      .setDepth(this.depth + 0.3)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 520,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    });

    for (let i = 0; i < 22; i += 1) {
      const angle = (Math.PI * 2 * i) / 22 + Math.random() * 0.4;
      const dark = i % 3 === 0;
      const puff = this.scene.add
        .circle(
          x + Phaser.Math.Between(-40, 40),
          centerY + Phaser.Math.Between(-110, 110),
          Phaser.Math.Between(34, 62),
          dark ? 0x12081c : 0x7a3fc0,
          dark ? 0.8 : 0.6,
        )
        .setDepth(this.depth + 0.2)
        .setBlendMode(dark ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);

      this.scene.tweens.add({
        targets: puff,
        x: puff.x + Math.cos(angle) * Phaser.Math.Between(70, 150),
        y: puff.y + Math.sin(angle) * Phaser.Math.Between(40, 100) - 40,
        scale: { from: 0.5, to: 1.7 },
        alpha: 0,
        duration: Phaser.Math.Between(650, 1000),
        ease: 'Quad.Out',
        onComplete: () => puff.destroy(),
      });
    }
  }

  private targetX(): number {
    return this.target?.x ?? this.x;
  }

  // Comandado pelo outro jogo, o lado vem de lá.
  private faceTarget(): void {
    if (this.control.isRemote) {
      return;
    }

    this.setFacing(this.targetX() < this.x ? -1 : 1);
  }

  // Os pés não ficam no centro do quadro: ao virar, espelha também a origem.
  setFacing(direction: -1 | 1): this {
    const flipped = direction < 0;
    const feetX = flipped ? SPRITE.frameWidth - SPRITE.feetX : SPRITE.feetX;

    this.direction = direction;
    this.setFlipX(flipped);
    this.setOrigin(feetX / SPRITE.frameWidth, SPRITE.feetY / SPRITE.frameHeight);
    return this;
  }

  playAnimation(name: ReaperKingAnimation): void {
    this.play(`${SPRITE.key}-${name}`, true);
  }

  private createAnimations(): void {
    for (const [name, frames] of Object.entries(SPRITE.animations)) {
      const key = `${SPRITE.key}-${name}`;

      if (this.scene.anims.exists(key)) {
        continue;
      }

      this.scene.anims.create({
        key,
        frames: this.scene.anims.generateFrameNumbers(SPRITE.key, {
          start: frames.start,
          end: frames.end,
        }),
        frameRate: frames.frameRate,
        repeat: name === 'idle' || name === 'run' ? -1 : 0,
      });
    }
  }
}
