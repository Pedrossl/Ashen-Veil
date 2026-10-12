import Phaser from 'phaser';
import { playSound } from '../../systems/SoundEffects';

import { FoeControl, type FoeDecision, type FoeDecisionListener } from '../../components/FoeControl';
import { Buildup } from '../../components/Buildup';
import { Health } from '../../components/Health';
import { spawnDust } from '../../components/MotionTrail';
import { GAME_EVENTS, type BossEngaged, type StatChange } from '../../core/gameEvents';
import { ROOT_BOSS_SPRITE as SPRITE, ROOT_SPIT_SPRITE, ROOT_TRAIL_SPRITE as TRAIL } from '../../data/bossSprites';
import { ROOT_OF_CONDEMNED as BOSS } from '../../data/bosses';
import type {
  ActiveAttack,
  Attacker,
  CombatSystem,
  Damageable,
  Hit,
  RemoteControl,
} from '../../systems/CombatSystem';
import type { EnemyTarget } from '../enemies/MeleeEnemy';
import { SludgeBall } from '../enemies/SludgeBall';
import type { BossSnapshot } from './BossSnapshot';
import { HitZone } from './HitZone';

type AnimationName = keyof typeof SPRITE.animations;

// dormant: escondido no ninho até o jogador entrar. emerge: saindo da terra
// (abertura da luta ou fim da travessia). tunnel/lock: escondido, o rastro
// persegue e depois trava o ponto de saída. Golpes: bite, sweep, spit, cage.
// drown: arrastando o jogador para o fosso (a arena cuida do fade).
type RootState =
  | 'dormant'
  | 'emerge'
  | 'idle'
  | 'crawl'
  | 'bite'
  | 'sweep'
  | 'spit'
  | 'cage'
  | 'burrow'
  | 'tunnel'
  | 'lock'
  | 'drown'
  | 'dead';

const ATTACK_STATES = ['bite', 'sweep', 'spit', 'cage'] as const;
type AttackState = (typeof ATTACK_STATES)[number];

const isAttackState = (name: string | undefined): name is AttackState =>
  (ATTACK_STATES as readonly string[]).includes(name ?? '');

const HIT_FLASH = { tint: 0xffc0a0, ms: 110 } as const;
// Corpo esverdeado no fosso; o brilho é uma cópia aditiva por trás.
const DROWNED_BODY_TINT = 0xc8ffd0;
const DEPTH = 9.6;

// Chão onde a luta acontece: piso e limites por onde ele rasteja e por onde o
// rastro pode ir. Muda quando ele arrasta o jogador para o fosso.
export type RootGround = {
  x: number;
  floorY: number;
  minX: number;
  maxX: number;
};

export type RootBossConfig = RootGround & {
  onEngaged?: () => void;
  onDefeated?: () => void;
  // A barra de raízes do jogador encheu: a arena escurece, leva o jogador ao
  // fosso e chama `submerge`. Sem isso, a barra não existe.
  onDrowning?: () => void;
};

// Raiz dos Condenados: boss do esgoto. Pune quem fica na frente (mordida),
// atrás (varredura) ou longe (cuspe); na fase 2 mergulha na terra e ergue
// estacas dos dois lados. Os golpes valem nos quadros ativos do manifesto.
export class RootBoss extends Phaser.GameObjects.Sprite implements Attacker, Damageable {
  readonly faction = 'enemy' as const;
  readonly health = new Health(BOSS.maxHealth);
  private behavior: RootState = 'dormant';
  private direction: 1 | -1 = -1;
  // Alvos possíveis (o jogador; no cooperativo, os dois) e em quem ela mira.
  // Cooperativo: comandada pelo outro jogo ou anunciando as decisões.
  private readonly control = new FoeControl<EnemyTarget>();
  private remoteTrailX?: number;
  private spitTargetX?: number;
  private combat?: CombatSystem;
  private swingId = 0;
  private cooldownMs = 0;
  private stateMs = 0;
  private hasSpat = false;
  private attackSoundPlayed = false;
  private announcedPhase = 1;
  private lockedX = 0;
  private trail?: Phaser.GameObjects.Sprite;
  private cageZones: HitZone[] = [];
  private eruption?: HitZone;
  private ground: RootGround;
  // Raízes no corpo dos jogadores (barra verde, uma só no cooperativo: as
  // estacas em qualquer um dos dois enchem); o afogamento acontece uma vez.
  private readonly roots = new Buildup(BOSS.drowning);
  private hasDrowned = false;
  private isDrowned = false;
  private glow?: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    private readonly config: RootBossConfig,
  ) {
    super(scene, config.x, config.floorY + 2, SPRITE.key, SPRITE.animations.idle.start);
    this.ground = { x: config.x, floorY: config.floorY, minX: config.minX, maxX: config.maxX };
    scene.add.existing(this);
    this.setOrigin(0.5, SPRITE.feetY / SPRITE.frameHeight)
      .setScale(SPRITE.scale)
      .setDepth(DEPTH)
      .setVisible(false);
    this.createAnimations();
    this.setFacing(-1);

    this.health.onChange((current, max) => {
      const change: StatChange = { current, max };
      scene.game.events.emit(GAME_EVENTS.bossHealthChanged, change);
    });
    this.roots.onChange((current, max) => {
      const change: StatChange = { current, max };
      scene.game.events.emit(GAME_EVENTS.playerRootBuildupChanged, change);
    });
  }

  get facing(): 1 | -1 {
    return this.direction;
  }

  get isAlive(): boolean {
    return !this.health.isDepleted;
  }

  // Em luta: o portão da arena fica fechado enquanto isso for verdade.
  get isEngaged(): boolean {
    return this.behavior !== 'dormant' && this.isAlive;
  }

  // Intangível escondido no ninho, embaixo da terra e no fim do mergulho.
  get isInvulnerable(): boolean {
    if (['dormant', 'tunnel', 'lock', 'drown', 'dead'].includes(this.behavior)) {
      return true;
    }

    if (this.behavior === 'burrow') {
      return this.frameIndex >= SPRITE.animations.burrow.intangibleFrom;
    }

    return this.behavior === 'emerge' && this.frameIndex < SPRITE.animations.emerge.active[0];
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

    if (control) {
      this.cageZones.forEach((zone) => zone.deactivate());
      this.eruption?.deactivate();
    }
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
      detail: {
        roots: this.roots.current,
        trailX: Math.round(this.trail?.x ?? this.x),
        drowned: this.hasDrowned ? 1 : 0,
      },
    };
  }

  // Estado do jogo que comanda. Chegando no meio da luta, alcança-a: acorda,
  // e se a Raiz já arrastou os dois para o fosso, este jogador desce também.
  applySnapshot(snapshot: BossSnapshot): void {
    if (!this.control.isRemote || this.behavior === 'dead') {
      return;
    }

    this.control.setPosition(this, snapshot.x, snapshot.y);
    this.setFacing(snapshot.facing);
    this.health.syncTo(snapshot.health);
    this.roots.syncTo(snapshot.detail.roots ?? 0);
    this.remoteTrailX = snapshot.detail.trailX;

    if (snapshot.engaged && this.behavior === 'dormant') {
      this.announceEngaged();
      this.setVisible(true);
      this.enterIdle();
    }

    if (snapshot.detail.drowned && !this.hasDrowned && this.isAlive) {
      this.beginDrowning();
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
      case 'drown':
        if (!this.hasDrowned) this.beginDrowning();
        return;
      case 'die':
        this.health.syncTo(0);
        this.die();
        return;
    }

    // Fins de animação pendentes daqui não valem mais: manda quem comanda.
    this.clearPendingAnimations();

    if (action.kind === 'idle') {
      this.enterIdle();
    } else if (action.kind === 'crawl') {
      this.enterCrawl();
    } else if (action.kind === 'attack' && isAttackState(action.name)) {
      this.spitTargetX = action.x;
      this.startAttack(action.name);
    } else if (action.kind === 'burrow') {
      this.enterBurrow();
    } else if (action.kind === 'lock') {
      this.lockExit(action.x);
    }
  }

  private announce(kind: string, extra: Omit<FoeDecision, 'kind' | 'facing'> = {}): void {
    this.control.announce({ kind, facing: this.direction, ...extra });
  }

  attachCombat(combat: CombatSystem): void {
    this.combat = combat;
    this.createGroundZones(combat);
  }

  // Estacas e erupção saem do chão: são essas que enchem a barra de raízes.
  private createGroundZones(combat: CombatSystem): void {
    const { cage, burrow } = BOSS;
    const onLanded = (): void => this.addRoots();
    const zone = (width: number, height: number, damage: number): HitZone =>
      new HitZone(combat, { x: this.x, floorY: this.ground.floorY, width, height, damage, onLanded });

    const sideWidth = cage.reach - cage.safeHalfWidth;
    this.cageZones = [zone(sideWidth, cage.height, cage.damage), zone(sideWidth, cage.height, cage.damage)];
    this.eruption = zone(burrow.eruptionWidth, burrow.eruptionHeight, burrow.damage);
  }

  getHurtbox(): Phaser.Geom.Rectangle {
    const { width, height } = BOSS.hurtbox;
    return new Phaser.Geom.Rectangle(this.x - width / 2, this.y - height, width, height);
  }

  // Mordida e varredura saem do corpo; o resto usa zonas próprias. Comandada
  // pelo outro jogo, os golpes acertam lá.
  getActiveAttack(): ActiveAttack | undefined {
    if (this.control.isRemote || (this.behavior !== 'bite' && this.behavior !== 'sweep')) {
      return undefined;
    }

    const [from, to] = SPRITE.animations[this.behavior].active;
    const definition = BOSS[this.behavior];
    return {
      swingId: this.swingId,
      damage: definition.damage,
      hitbox: definition.hitbox,
      isActive: this.frameIndex >= from && this.frameIndex <= to,
    };
  }

  receiveHit(hit: Hit): void {
    if (!this.isAlive || this.isInvulnerable) {
      return;
    }

    this.setTint(HIT_FLASH.tint);
    this.scene.time.delayedCall(HIT_FLASH.ms, () => this.restoreTint());

    if (this.control.isRemote) {
      this.control.forwardHit(hit);
      return;
    }

    this.control.addThreat(hit.source, hit.damage);
    this.health.damage(hit.damage * (this.isDrowned ? BOSS.drowning.damageTakenFactor : 1));

    if (!this.isAlive) {
      this.die();
    }
  }

  update(delta: number): void {
    if (this.behavior === 'dead') {
      return;
    }

    const remote = !this.control.update(this, delta);

    if (!remote && !this.control.retarget(this)) {
      return;
    }

    this.syncGlow();
    if (this.isEngaged && this.phase > this.announcedPhase) {
      this.announcedPhase = this.phase;
      playSound(this.scene, 'rootPhase', this);
    }
    const attack = this.behavior;
    if (!this.attackSoundPlayed && (attack === 'bite' || attack === 'sweep' || attack === 'cage')
      && this.frameIndex >= SPRITE.animations[attack].active[0]) {
      this.attackSoundPlayed = true;
      playSound(this.scene, attack === 'bite' ? 'rootBite' : attack === 'sweep' ? 'rootSweep' : 'rootCage', this);
    }

    if (!remote && this.isEngaged && !this.hasDrowned) {
      this.roots.update(delta);
    }

    // Comandada pelo outro jogo: decisões e deslocamentos chegam de lá.
    switch (this.behavior) {
      case 'dormant':
        if (!remote && this.target && this.target.x >= BOSS.awakenX) {
          this.awaken();
        }
        return;
      case 'idle':
        if (!remote) this.updateIdle(delta);
        return;
      case 'crawl':
        if (!remote) this.updateCrawl(delta);
        return;
      case 'tunnel':
        this.updateTunnel(delta);
        return;
      case 'lock':
        this.updateLock(delta);
        return;
      case 'cage':
        this.updateCage();
        return;
      case 'emerge':
        this.updateEmerge();
        return;
      case 'spit':
        this.updateSpit();
        return;
      default:
        return;
    }
  }

  // ---- decisões ----------------------------------------------------------

  // No fosso ela volta com a vida cheia, mas mantém todos os golpes.
  private get phase(): 1 | 2 | 3 {
    const ratio = this.health.current / this.health.max;
    const phase = ratio <= BOSS.phaseThreeRatio ? 3 : ratio <= BOSS.phaseTwoRatio ? 2 : 1;
    return this.isDrowned ? (Math.max(2, phase) as 2 | 3) : phase;
  }

  private get frameIndex(): number {
    return (this.anims.currentFrame?.index ?? 1) - 1;
  }

  // Lê a posição do jogador em relação à frente do corpo e escolhe o golpe.
  private decide(): void {
    if (!this.target?.isAlive) {
      this.enterIdle();
      return;
    }

    const dx = this.target.x - this.x;
    const distance = Math.abs(dx);
    const inFront = Math.sign(dx) === this.direction || distance < 20;

    if (this.phase >= 2 && distance > 220 && Math.random() < BOSS.burrowChance) {
      this.enterBurrow();
    } else if (this.phase >= 2 && distance <= BOSS.cageRange && Math.random() < BOSS.cageChance) {
      this.startAttack('cage');
    } else if (distance <= BOSS.biteRange && inFront) {
      this.startAttack('bite');
    } else if (distance <= BOSS.sweepRange && !inFront) {
      // Varredura sem virar: ela existe justamente para quem fica atrás.
      this.startAttack('sweep');
    } else if (distance >= BOSS.spitMinRange && Math.random() < 0.55) {
      this.faceTarget();
      this.startAttack('spit');
    } else {
      this.faceTarget();
      this.enterCrawl();
    }
  }

  private updateIdle(delta: number): void {
    this.cooldownMs -= delta;

    if (this.cooldownMs <= 0) {
      this.decide();
    }
  }

  private updateCrawl(delta: number): void {
    if (!this.target) {
      return;
    }

    this.stateMs += delta;
    const distance = Math.abs(this.target.x - this.x);
    const speed =
      BOSS.crawlSpeed * (this.phase === 3 ? 1.15 : 1) * (this.isDrowned ? BOSS.drowning.crawlSpeedFactor : 1);
    this.faceTarget();
    this.x = Phaser.Math.Clamp(this.x + this.direction * speed * (delta / 1000), this.ground.minX, this.ground.maxX);

    if (distance <= BOSS.biteRange * 0.85 || this.stateMs >= BOSS.maxCrawlMs) {
      this.cooldownMs = 0;
      this.enterIdle(0);
    }
  }

  // ---- golpes ------------------------------------------------------------

  private startAttack(name: AttackState): void {
    this.announce('attack', { name, x: this.target?.x });
    this.behavior = name;
    this.swingId += 1;
    this.hasSpat = false;
    this.attackSoundPlayed = false;
    this.playOnce(name, () => this.finishAttack());
  }

  private finishAttack(): void {
    const wasSweep = this.behavior === 'sweep';
    this.cageZones.forEach((zone) => zone.deactivate());

    // Depois de varrer as costas ela se vira: quem insiste em ficar atrás
    // leva no máximo uma varredura e depois encara a mordida.
    if (wasSweep) {
      this.faceTarget();
      this.enterIdle(BOSS.turnAfterSweepMs);
      return;
    }

    this.enterIdle();
  }

  // O globo sai da garganta no quadro de disparo e cai perto do jogador.
  // Comandada pelo outro jogo, o globo é só visual e cai onde caiu lá.
  private updateSpit(): void {
    const targetX = this.control.isRemote ? this.spitTargetX : this.target?.x;

    if (this.hasSpat || this.frameIndex < SPRITE.animations.spit.fire || !this.combat || targetX === undefined) {
      return;
    }

    this.hasSpat = true;
    playSound(this.scene, 'rootSpit', this);
    const { mouth, speed, lift, gravity, damage } = BOSS.spit;
    const flightTime = (2 * lift) / gravity;
    const distance = Math.abs(targetX - this.x) - mouth.forward;

    new SludgeBall(this.scene, {
      x: this.x + this.direction * mouth.forward,
      y: this.y - mouth.up,
      velocityX: this.direction * Math.min(speed, Math.max(120, distance / flightTime)),
      velocityY: -lift,
      gravity,
      damage,
      floorY: this.ground.floorY,
      combat: this.control.isRemote ? undefined : this.combat,
      sprite: ROOT_SPIT_SPRITE,
    });
  }

  // Estacas preenchem toda a volta do corpo durante os quadros ativos.
  private updateCage(): void {
    const [from, to] = SPRITE.animations.cage.active;
    const active = this.frameIndex >= from && this.frameIndex <= to;
    const { reach, safeHalfWidth } = BOSS.cage;
    const offset = safeHalfWidth + (reach - safeHalfWidth) / 2;

    if (!active) {
      this.cageZones.forEach((zone) => zone.deactivate());
      return;
    }

    if (this.frameIndex === from) {
      this.scene.cameras.main.shake(160, 0.004);
    }

    if (this.control.isRemote) {
      return;
    }

    this.cageZones[0].activate(this.x - offset);
    this.cageZones[1].activate(this.x + offset);
  }

  // ---- travessia subterrânea --------------------------------------------

  private enterBurrow(): void {
    this.announce('burrow');
    playSound(this.scene, 'rootBurrow', this);
    this.behavior = 'burrow';
    this.playOnce('burrow', () => this.enterTunnel());
  }

  // Escondido: só o rastro de terra e raízes mostra onde ele está.
  private enterTunnel(): void {
    this.behavior = 'tunnel';
    this.stateMs = 0;
    this.setVisible(false);
    this.trail = this.scene.add
      .sprite(this.x, this.ground.floorY + 6, TRAIL.key, 0)
      .setOrigin(0.5, 1)
      .setScale(TRAIL.scale)
      .setDepth(DEPTH - 0.1)
      .play(this.trailAnimationKey);
  }

  private updateTunnel(delta: number): void {
    const chasedX = this.control.isRemote ? this.remoteTrailX : this.target?.x;

    if (!this.trail || chasedX === undefined) {
      return;
    }

    this.stateMs += delta;
    const dx = chasedX - this.trail.x;
    const step = Math.sign(dx) * Math.min(Math.abs(dx), BOSS.burrow.trailSpeed * (delta / 1000));
    this.trail.x = Phaser.Math.Clamp(this.trail.x + step, this.ground.minX, this.ground.maxX);

    if (Math.random() < 0.15) {
      spawnDust(this.scene, this.trail.x, this.ground.floorY, step >= 0 ? 1 : -1, 2);
    }

    if (!this.control.isRemote && this.stateMs >= BOSS.burrow.chaseMs) {
      this.lockExit();
    }
  }

  // O rastro para e o chão racha: dá tempo de sair do lugar antes da erupção.
  private lockExit(x = this.trail?.x ?? this.x): void {
    this.announce('lock', { x: Math.round(x) });
    this.behavior = 'lock';
    this.stateMs = 0;
    this.lockedX = x;
    this.setVisible(false);
    this.trail?.setX(x);
    this.trail?.anims.pause();
    this.spawnCrackWarning(this.lockedX);
  }

  private updateLock(delta: number): void {
    this.stateMs += delta;

    if (this.stateMs >= BOSS.burrow.lockMs) {
      this.trail?.destroy();
      this.trail = undefined;
      this.x = this.lockedX;
      this.emerge();
    }
  }

  private emerge(): void {
    playSound(this.scene, 'rootEmerge', this);
    this.behavior = 'emerge';
    this.setVisible(true);
    this.faceTarget();
    this.scene.cameras.main.shake(260, 0.006);
    this.playOnce('emerge', () => {
      this.eruption?.deactivate();
      const distance = this.target ? Math.abs(this.target.x - this.x) : 0;

      // Fase 3: pode cuspir logo ao sair da terra.
      if (!this.control.isRemote && this.phase === 3 && distance >= BOSS.spitMinRange) {
        this.startAttack('spit');
      } else {
        this.enterIdle();
      }
    });
  }

  private updateEmerge(): void {
    const [from, to] = SPRITE.animations.emerge.active;

    if (this.control.isRemote) {
      return;
    }

    if (this.frameIndex >= from && this.frameIndex <= to) {
      this.eruption?.activate(this.x);
    } else {
      this.eruption?.deactivate();
    }
  }

  // ---- afogamento --------------------------------------------------------

  private addRoots(): void {
    if (this.control.isRemote || this.hasDrowned || !this.config.onDrowning || this.behavior === 'dead') {
      return;
    }

    this.roots.add(BOSS.drowning.perHit);

    if (this.roots.isFull) {
      this.beginDrowning();
    }
  }

  // As raízes agarram o jogador (no cooperativo, os dois descem juntos): ela
  // para tudo e a arena faz a transição.
  private beginDrowning(): void {
    this.announce('drown');
    playSound(this.scene, 'rootBurrow', this);
    this.hasDrowned = true;
    this.behavior = 'drown';
    this.clearPendingAnimations();
    this.cageZones.forEach((zone) => zone.deactivate());
    this.eruption?.deactivate();
    this.trail?.destroy();
    this.trail = undefined;
    this.setVisible(true);
    this.play(this.animationKey('idle'), true);
    this.scene.cameras.main.shake(BOSS.drowning.dragMs, 0.008);
    this.config.onDrowning?.();
  }

  // No fosso: vida cheia, corpo verde e brilhando, mais rápida e mais frágil.
  submerge(ground: RootGround): void {
    if (!this.combat || this.behavior !== 'drown') {
      return;
    }

    this.ground = ground;
    this.isDrowned = true;
    this.cageZones.forEach((zone) => zone.deactivate());
    this.eruption?.deactivate();
    this.createGroundZones(this.combat);
    this.roots.reset();
    this.health.restore();
    this.setPosition(ground.x, ground.floorY + 2);
    this.anims.timeScale = BOSS.drowning.animationSpeed;
    this.restoreTint();
    this.createGlow();
    this.emerge();
  }

  private createGlow(): void {
    this.glow = this.scene.add
      .sprite(this.x, this.y, SPRITE.key, this.frame.name)
      .setOrigin(this.originX, this.originY)
      .setScale(SPRITE.scale * 1.04)
      .setDepth(DEPTH - 0.05)
      .setTint(BOSS.drowning.glowTint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5);
    this.scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.3, to: 0.75 },
      duration: 700,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private syncGlow(): void {
    this.glow
      ?.setPosition(this.x, this.y)
      .setFrame(this.frame.name)
      .setFlipX(this.flipX)
      .setVisible(this.visible);
  }

  private restoreTint(): void {
    if (this.isDrowned) {
      this.setTint(DROWNED_BODY_TINT);
    } else {
      this.clearTint();
    }
  }

  // ---- abertura e morte -------------------------------------------------

  // Sai do ninho no centro da arena: abre a luta (barra no HUD, portão fecha).
  private awaken(): void {
    this.announce('awaken');
    this.announceEngaged();
    this.emerge();
  }

  private announceEngaged(): void {
    const engaged: BossEngaged = { name: BOSS.name, current: this.health.current, max: this.health.max };
    this.scene.game.events.emit(GAME_EVENTS.bossEngaged, engaged);
    this.config.onEngaged?.();
  }

  private die(): void {
    this.announce('die');
    playSound(this.scene, 'rootDeath', this);
    this.behavior = 'dead';
    this.cageZones.forEach((zone) => zone.deactivate());
    this.eruption?.deactivate();
    this.trail?.destroy();
    this.roots.reset();
    this.setVisible(true);
    this.play(this.animationKey('death'));

    if (this.glow) {
      this.scene.tweens.killTweensOf(this.glow);
      this.scene.tweens.add({ targets: this.glow, alpha: 0, duration: 400, onComplete: () => this.glow?.destroy() });
    }
    this.scene.cameras.main.shake(800, 0.007);
    this.scene.game.events.emit(GAME_EVENTS.bossDefeated);
    this.config.onDefeated?.();
  }

  // ---- utilidades -------------------------------------------------------

  private enterIdle(cooldown?: number): void {
    this.announce('idle');
    this.behavior = 'idle';
    const factor =
      (this.phase === 3 ? BOSS.phaseThreeCooldownFactor : 1) * (this.isDrowned ? BOSS.drowning.cooldownFactor : 1);
    this.cooldownMs = cooldown ?? (BOSS.cooldownMs + Phaser.Math.Between(0, BOSS.cooldownJitterMs)) * factor;
    this.play(this.animationKey('idle'), true);
  }

  private enterCrawl(): void {
    this.announce('crawl');
    this.behavior = 'crawl';
    this.stateMs = 0;
    this.play(this.animationKey('crawl'), true);
  }

  // Comandada pelo outro jogo, o lado vem de lá.
  private faceTarget(): void {
    if (!this.control.isRemote && this.target && Math.abs(this.target.x - this.x) > 20) {
      this.setFacing(this.target.x < this.x ? -1 : 1);
    }
  }

  // A sheet olha para a direita; os pés ficam no centro do quadro.
  private setFacing(direction: 1 | -1): void {
    this.direction = direction;
    this.setFlipX(direction < 0);
  }

  private playOnce(name: AnimationName, onComplete: () => void): void {
    const key = this.animationKey(name);
    this.play(key);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + key, () => {
      if (this.behavior !== 'dead' && this.behavior !== 'drown') {
        onComplete();
      }
    });
  }

  // Esquece os fins de animação pendentes (golpe interrompido pelo arrasto).
  private clearPendingAnimations(): void {
    for (const name of Object.keys(SPRITE.animations)) {
      this.off(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + this.animationKey(name as AnimationName));
    }
  }

  // Aviso da erupção: rachadura com brilho verde e lascas pulando.
  private spawnCrackWarning(x: number): void {
    const { floorY } = this.ground;
    const crack = this.scene.add
      .ellipse(x, floorY - 2, BOSS.burrow.eruptionWidth, 14, 0x6adf8a, 0.5)
      .setDepth(DEPTH - 0.2)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: crack,
      scaleX: { from: 0.4, to: 1 },
      alpha: { from: 0.2, to: 0.7 },
      duration: BOSS.burrow.lockMs,
      onComplete: () => crack.destroy(),
    });

    for (let i = 0; i < 4; i += 1) {
      this.scene.time.delayedCall(i * (BOSS.burrow.lockMs / 4), () => spawnDust(this.scene, x, floorY, i % 2 ? 1 : -1, 4));
    }
  }

  private get trailAnimationKey(): string {
    return `${TRAIL.key}-loop`;
  }

  private animationKey(name: AnimationName): string {
    return `${SPRITE.key}-${name}`;
  }

  private createAnimations(): void {
    const anims = this.scene.anims;

    for (const [name, animation] of Object.entries(SPRITE.animations)) {
      const key = this.animationKey(name as AnimationName);

      if (!anims.exists(key)) {
        anims.create({
          key,
          frames: anims.generateFrameNumbers(SPRITE.key, { start: animation.start, end: animation.end }),
          frameRate: animation.frameRate,
          repeat: name === 'idle' || name === 'crawl' ? -1 : 0,
        });
      }
    }

    if (!anims.exists(this.trailAnimationKey)) {
      anims.create({
        key: this.trailAnimationKey,
        frames: anims.generateFrameNumbers(TRAIL.key, { start: 0, end: TRAIL.frames - 1 }),
        frameRate: TRAIL.frameRate,
        repeat: -1,
      });
    }
  }
}
