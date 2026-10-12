import Phaser from 'phaser';

import { spawnGroundImpact, spawnSwingArc } from '../../components/AttackEffects';
import { FoeControl, type FoeDecision, type FoeDecisionListener } from '../../components/FoeControl';
import { Health } from '../../components/Health';
import { MotionTrail, spawnDust } from '../../components/MotionTrail';
import { GAME_EVENTS, type BossEngaged, type BossGaugeChanged, type StatChange } from '../../core/gameEvents';
import { CRIMSON_SURGEON_SPRITE as SPRITE, type CrimsonSurgeonAnimation } from '../../data/bossSprites';
import { CRIMSON_SURGEON as BOSS } from '../../data/bosses';
import type {
  ActiveAttack,
  Attacker,
  CombatSystem,
  Damageable,
  Hit,
  RemoteControl,
} from '../../systems/CombatSystem';
import { isCoopActive } from '../../systems/Session';
import { playSound } from '../../systems/SoundEffects';
import type { EnemyTarget } from '../enemies/MeleeEnemy';
import { BloodBubble } from './BloodBubble';
import type { BossSnapshot } from './BossSnapshot';

// dormant: parado junto à mesa até o jogador entrar. intro: ergue o soro e
// abre a luta. Golpes: stab, arc, slam; serum espalha as bolhas de sangue.
type SurgeonState = 'dormant' | 'intro' | 'idle' | 'run' | 'stab' | 'arc' | 'slam' | 'serum' | 'dead';

const ATTACKS = ['stab', 'arc', 'slam', 'serum'] as const;
type SurgeonAttack = (typeof ATTACKS)[number];
const isAttack = (name: string | undefined): name is SurgeonAttack =>
  (ATTACKS as readonly string[]).includes(name ?? '');

const HIT_FLASH = { tint: 0xffc2c2, ms: 110 } as const;
const DEPTH = 9.7;
const BLOOD_LABEL = 'SANGUE';

export type CrimsonSurgeonConfig = {
  x: number;
  floorY: number;
  // Limites da arena para correr e para as bolhas caírem.
  minX: number;
  maxX: number;
  onEngaged?: () => void;
  onDefeated?: () => void;
  // A barra de sangue encheu: a arena alaga por `durationMs`.
  onFlood?: (durationMs: number) => void;
};

// Cirurgião Rubro: último boss da prisão. Bisturi à frente (estocada e giro),
// suporte de soro como martelo e, de tempos em tempos, o soro: três bolhas de
// sangue caem pela arena e, enquanto alguma existir, ele se cura e enche a
// barra de sangue; cheia, a arena alaga. Os golpes valem nos quadros ativos.
export class CrimsonSurgeon extends Phaser.GameObjects.Sprite implements Attacker, Damageable {
  readonly faction = 'enemy' as const;
  readonly health = new Health(BOSS.maxHealth);
  private behavior: SurgeonState = 'dormant';
  private direction: 1 | -1 = -1;
  // Cooperativo: comandado pelo outro jogo ou anunciando as decisões.
  private readonly control = new FoeControl<EnemyTarget>();
  private combat?: CombatSystem;
  private swingId = 0;
  private stateMs = 0;
  private cooldownMs = 0;
  private serumCooldownMs: number = BOSS.serum.firstMs;
  private struck = false;
  private released = false;
  private bubbleXs: number[] = [];
  private bubbles: Array<BloodBubble | undefined> = [];
  private blood = 0;
  private shownBlood = -1;
  private floodLeftMs = 0;
  private isPhaseTwo = false;
  private readonly aura: Phaser.GameObjects.Container;
  private readonly trail: MotionTrail;

  constructor(
    scene: Phaser.Scene,
    private readonly config: CrimsonSurgeonConfig,
  ) {
    super(scene, config.x, config.floorY + 2, SPRITE.key, SPRITE.animations.idle.start);
    scene.add.existing(this);
    this.setScale(SPRITE.scale).setDepth(DEPTH);
    this.createAnimations();
    this.setFacing(-1);
    this.play(this.animationKey('idle'));

    // Brilho do soro: acende quando ele se cura pelas bolhas.
    this.aura = scene.add.container(config.x, config.floorY - 200).setDepth(DEPTH - 0.1).setAlpha(0);
    [1, 0.65, 0.35].forEach((size) =>
      this.aura.add(scene.add.ellipse(0, 0, 220 * size, 300 * size, 0xff2236, 0.12).setBlendMode(Phaser.BlendModes.ADD)),
    );
    this.trail = new MotionTrail(scene, this, { intervalMs: 60, lifetimeMs: 320, tint: 0xb01828, alpha: 0.4 });

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

  get isEngaged(): boolean {
    return this.behavior !== 'dormant' && this.isAlive;
  }

  get isInvulnerable(): boolean {
    return this.behavior === 'dormant';
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

  attachCombat(combat: CombatSystem): void {
    this.combat = combat;
  }

  getHurtbox(): Phaser.Geom.Rectangle {
    const { width, height } = BOSS.hurtbox;
    return new Phaser.Geom.Rectangle(this.x - width / 2, this.y - height, width, height);
  }

  // Comandado pelo outro jogo, os golpes acertam lá.
  getActiveAttack(): ActiveAttack | undefined {
    const attack = this.behavior;

    if (this.control.isRemote || (attack !== 'stab' && attack !== 'arc' && attack !== 'slam')) {
      return undefined;
    }

    const [from, to] = SPRITE.animations[attack].active;
    return {
      swingId: this.swingId,
      damage: BOSS[attack].damage,
      hitbox: BOSS[attack].hitbox,
      isActive: this.frameIndex >= from && this.frameIndex <= to,
    };
  }

  // Bosses não são atordoados: só piscam. `part` é uma bolha de sangue.
  receiveHit(hit: Hit): void {
    if (hit.part !== undefined) {
      this.hitBubble(hit.part, hit);
      return;
    }

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
    }
  }

  update(delta: number): void {
    this.aura.setPosition(this.x + this.direction * 70, this.y - 210);
    this.bubbles.forEach((bubble) => bubble?.update(delta));
    this.trail.setEnabled(this.behavior === 'run' || (this.isStriking && this.frameIndex >= 2));
    this.trail.update(delta);

    if (this.behavior === 'dead') {
      return;
    }

    const remote = !this.control.update(this, delta);

    if (!remote && !this.control.retarget(this)) {
      return;
    }

    this.updatePhase();
    this.updateStrike();
    this.updateAura();

    if (this.floodLeftMs > 0) {
      this.floodLeftMs -= delta;
    }

    if (!remote) {
      this.updateBlood(delta);
    }

    this.stateMs += delta;

    // Comandado pelo outro jogo: decisões e deslocamentos chegam de lá.
    switch (this.behavior) {
      case 'dormant':
        if (!remote && this.target && this.target.x >= BOSS.awakenX) this.awaken();
        return;
      case 'intro':
        if (!remote && this.stateMs >= BOSS.introMs) this.enterIdle();
        return;
      case 'idle':
        this.cooldownMs -= delta;
        if (!remote && this.cooldownMs <= 0) this.decide();
        return;
      case 'run':
        if (!remote) this.updateRun(delta);
        return;
      case 'serum':
        this.updateSerum();
        return;
      default:
        return;
    }
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
      detail: {
        blood: Math.round(this.blood * 10) / 10,
        // Uma marca por bolha ainda inteira.
        bubbles: this.bubbles.reduce((mask, bubble, index) => (bubble?.isAlive ? mask | (1 << index) : mask), 0),
      },
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
    this.setBlood(snapshot.detail.blood ?? 0);

    // Bolhas que estouraram lá estouram aqui.
    const mask = snapshot.detail.bubbles ?? 0;
    this.bubbles.forEach((bubble, index) => {
      if (bubble?.isAlive && !(mask & (1 << index))) bubble.pop();
    });

    if (snapshot.engaged && this.behavior === 'dormant') {
      this.announceEngaged();
      this.enterIdle();
    }
  }

  // Executa a decisão de quem comanda, com as mesmas animações e efeitos.
  applyDecision(decision: FoeDecision): void {
    if (!this.control.isRemote || this.behavior === 'dead') {
      return;
    }

    this.setFacing(decision.facing);

    switch (decision.kind) {
      case 'awaken':
        if (this.behavior === 'dormant') this.awaken();
        return;
      case 'flood':
        this.startFlood();
        return;
      case 'die':
        this.health.syncTo(0);
        this.die();
        return;
    }

    // Fins de animação pendentes daqui não valem mais: manda quem comanda.
    this.clearPendingAnimations();

    if (decision.kind === 'idle') {
      this.enterIdle();
    } else if (decision.kind === 'run') {
      this.startRun();
    } else if (decision.kind === 'attack' && isAttack(decision.name)) {
      this.startAttack(decision.name, decision.points);
    }
  }

  private announce(kind: string, extra: Omit<FoeDecision, 'kind' | 'facing'> = {}): void {
    this.control.announce({ kind, facing: this.direction, ...extra });
  }

  // ---- decisões ----------------------------------------------------------

  private decide(): void {
    const target = this.target;

    if (!target?.isAlive) {
      this.enterIdle();
      return;
    }

    this.faceTarget();
    const distance = Math.abs(target.x - this.x);
    const roll = Math.random();

    if (this.isSerumReady && Math.random() < BOSS.serum.chance) {
      this.startAttack('serum', this.chooseBubblePoints());
    } else if (distance <= BOSS.slam.range) {
      this.startAttack(roll < 0.4 ? 'arc' : roll < 0.75 ? 'slam' : 'stab');
    } else if (distance <= BOSS.stab.range) {
      this.startAttack('stab');
    } else {
      this.startRun();
    }
  }

  private get isSerumReady(): boolean {
    return this.serumCooldownMs <= 0 && this.floodLeftMs <= 0 && !this.bubbles.some((bubble) => bubble?.isAlive);
  }

  private enterIdle(): void {
    this.announce('idle');
    this.behavior = 'idle';
    this.stateMs = 0;
    const speed = this.isPhaseTwo ? BOSS.phaseTwo.speedMultiplier : 1;
    this.cooldownMs = (BOSS.cooldownMs + Math.random() * BOSS.cooldownJitterMs) / speed;
    this.play(this.animationKey('idle'), true);
  }

  private startRun(): void {
    this.announce('run');
    this.behavior = 'run';
    this.stateMs = 0;
    this.play(this.animationKey('run'), true);
  }

  private updateRun(delta: number): void {
    const target = this.target;

    if (!target) {
      return;
    }

    this.faceTarget();
    const speed = BOSS.runSpeed * (this.isPhaseTwo ? BOSS.phaseTwo.speedMultiplier : 1);
    this.x = Phaser.Math.Clamp(this.x + this.direction * speed * (delta / 1000), this.config.minX, this.config.maxX);

    if (Math.random() < 0.08) {
      spawnDust(this.scene, this.x, this.config.floorY, this.direction === 1 ? -1 : 1, 2);
    }

    const distance = Math.abs(target.x - this.x);

    if (distance <= BOSS.stab.range * 0.85) {
      this.startAttack(distance <= BOSS.slam.range ? (Math.random() < 0.5 ? 'arc' : 'slam') : 'stab');
    } else if (this.stateMs >= BOSS.maxRunMs) {
      this.enterIdle();
    }
  }

  // ---- golpes ------------------------------------------------------------

  private startAttack(name: SurgeonAttack, points?: number[]): void {
    this.announce('attack', { name, points });
    this.behavior = name;
    this.swingId += 1;
    this.stateMs = 0;
    this.struck = false;
    this.released = false;
    this.bubbleXs = points ?? [];
    this.playOnce(name, () => this.enterIdle());
  }

  private get isStriking(): boolean {
    return this.behavior === 'stab' || this.behavior === 'arc' || this.behavior === 'slam';
  }

  // Som, rastro e impacto no primeiro quadro ativo de cada golpe.
  private updateStrike(): void {
    const attack = this.behavior;

    if (this.struck || (attack !== 'stab' && attack !== 'arc' && attack !== 'slam')) {
      return;
    }

    if (this.frameIndex < SPRITE.animations[attack].active[0]) {
      return;
    }

    this.struck = true;
    playSound(this.scene, BOSS.sounds[attack], this);

    if (attack === 'slam') {
      const impactX = this.x + this.direction * BOSS.slam.impactForward;
      spawnGroundImpact(this.scene, impactX, this.config.floorY, DEPTH + 0.2);
      this.scene.cameras.main.shake(220, 0.006);
    } else if (attack === 'arc') {
      spawnSwingArc(this.scene, {
        x: this.x + this.direction * 40,
        y: this.y - 170,
        radius: 170,
        direction: this.direction,
        squash: 0.45,
        fromAngle: 150,
        toAngle: 10,
        color: 0xff5a64,
        depth: DEPTH + 0.2,
        durationMs: 220,
      });
    }
  }

  // O soro abre no quadro de liberação: as bolhas saem do frasco.
  private updateSerum(): void {
    if (this.released || this.frameIndex < SPRITE.animations.serum.release) {
      return;
    }

    this.released = true;
    this.serumCooldownMs = BOSS.serum.cooldownMs;
    playSound(this.scene, BOSS.sounds.serum, this);
    this.scene.cameras.main.shake(260, 0.004);
    this.bubbles = this.bubbleXs.map((x, index) => this.spawnBubble(x, index));
  }

  // Bolhas e vida delas: no cooperativo, mais e um pouco mais resistentes.
  private get serumSettings(): { bubbles: number; bubbleHealth: number } {
    return isCoopActive(this.scene.game) ? BOSS.serum.coop : BOSS.serum;
  }

  // Longe dele e umas das outras, dentro da arena.
  private chooseBubblePoints(): number[] {
    const { bubbleMinGap, bubbleMinDistanceFromBoss } = BOSS.serum;
    const { bubbles } = this.serumSettings;
    const minX = this.config.minX + 60;
    const maxX = this.config.maxX - 60;
    const points: number[] = [];

    for (let attempt = 0; attempt < 200 && points.length < bubbles; attempt += 1) {
      const x = Math.round(Phaser.Math.Between(minX, maxX));
      const clear =
        Math.abs(x - this.x) >= bubbleMinDistanceFromBoss && points.every((other) => Math.abs(other - x) >= bubbleMinGap);
      if (clear) points.push(x);
    }

    // Arena apertada: completa espalhando por igual.
    for (let i = points.length; i < bubbles; i += 1) {
      points.push(Math.round(minX + ((maxX - minX) * (i + 0.5)) / bubbles));
    }
    return points;
  }

  private spawnBubble(x: number, index: number): BloodBubble {
    const bubble = new BloodBubble(this.scene, {
      from: this.flaskPosition(),
      x,
      floorY: this.config.floorY,
      health: this.serumSettings.bubbleHealth,
      flightMs: BOSS.serum.flightMs,
      feeds: () => this.flaskPosition(),
      onHit: (hit) => this.receiveHit({ ...hit, part: index }),
      onPopped: () => {
        playSound(this.scene, BOSS.sounds.bubblePop, bubble);
        this.combat?.remove(bubble);
        this.bubbles[index] = undefined;
      },
    });
    this.combat?.addTarget(bubble);
    return bubble;
  }

  // Golpe numa bolha: vale no jogo que comanda o boss.
  private hitBubble(index: number, hit: Hit): void {
    const bubble = this.bubbles[index];

    if (!bubble?.isAlive) {
      return;
    }

    if (this.control.isRemote) {
      this.control.forwardHit({ ...hit, part: index });
      return;
    }

    bubble.damage(hit.damage);
  }

  private flaskPosition(): { x: number; y: number } {
    return { x: this.x + this.direction * 95, y: this.y - 290 };
  }

  // ---- sangue e alagamento ---------------------------------------------

  // Cada bolha viva cura e enche a barra; sem bolhas, a barra esvazia devagar.
  private updateBlood(delta: number): void {
    const seconds = delta / 1000;
    const alive = this.bubbles.filter((bubble) => bubble?.isAlive).length;

    if (this.isEngaged && this.floodLeftMs <= 0) {
      this.serumCooldownMs -= delta;
    }

    if (alive > 0) {
      this.health.heal(BOSS.serum.healPerSecond * alive * seconds);
      this.setBlood(this.blood + BOSS.serum.bloodPerSecond * alive * seconds);
    } else if (this.floodLeftMs <= 0) {
      this.setBlood(this.blood - BOSS.blood.drainPerSecond * seconds);
    }

    if (this.blood >= BOSS.blood.max && this.floodLeftMs <= 0) {
      this.startFlood();
    }
  }

  // Barra cheia: as bolhas restantes estouram e a arena alaga.
  private startFlood(): void {
    this.announce('flood');
    this.bubbles.forEach((bubble) => bubble?.pop());
    this.setBlood(0);
    this.floodLeftMs = BOSS.blood.floodMs;
    playSound(this.scene, BOSS.sounds.flood, this);
    this.config.onFlood?.(BOSS.blood.floodMs);
  }

  // O frasco pulsa em vermelho enquanto alguma bolha o alimenta.
  private updateAura(): void {
    const feeding = this.bubbles.some((bubble) => bubble?.isAlive);
    this.aura.setAlpha(feeding ? 0.7 + Math.sin(this.scene.time.now / 160) * 0.3 : 0);
  }

  private setBlood(value: number): void {
    this.blood = Phaser.Math.Clamp(value, 0, BOSS.blood.max);
    const shown = Math.round(this.blood);

    if (shown !== this.shownBlood) {
      this.shownBlood = shown;
      const gauge: BossGaugeChanged = { label: BLOOD_LABEL, current: this.blood, max: BOSS.blood.max };
      this.scene.game.events.emit(GAME_EVENTS.bossGaugeChanged, gauge);
    }
  }

  // ---- fases, abertura e morte -----------------------------------------

  // Metade da vida: tudo mais rápido (a cura não desfaz).
  private updatePhase(): void {
    if (this.isPhaseTwo || this.health.current / this.health.max > BOSS.phaseTwo.healthRatio) {
      return;
    }

    this.isPhaseTwo = true;
    this.anims.timeScale = BOSS.phaseTwo.speedMultiplier;
    playSound(this.scene, BOSS.sounds.phase, this);
    this.scene.cameras.main.shake(500, 0.005);
    this.trail.setConfig({ tint: 0xff3040, alpha: 0.5 });
  }

  // Ergue o frasco e abre a luta (barra no HUD, porta fecha).
  private awaken(): void {
    this.announce('awaken');
    playSound(this.scene, BOSS.sounds.wake, this);
    this.behavior = 'intro';
    this.stateMs = 0;
    this.faceTarget();
    this.clearPendingAnimations();
    this.stop();
    this.setFrame(SPRITE.animations.serum.start + 3);
    this.scene.cameras.main.shake(500, 0.004);
    this.announceEngaged();
  }

  private announceEngaged(): void {
    const engaged: BossEngaged = { name: BOSS.name, current: this.health.current, max: this.health.max };
    this.scene.game.events.emit(GAME_EVENTS.bossEngaged, engaged);
    this.setBlood(this.blood);
    this.config.onEngaged?.();
  }

  // Cai de joelhos com o frasco aceso, o sangue escorre e ele se desfaz.
  private die(): void {
    this.announce('die');
    playSound(this.scene, BOSS.sounds.death, this);
    this.behavior = 'dead';
    this.clearPendingAnimations();
    this.bubbles.forEach((bubble) => bubble?.pop());
    this.floodLeftMs = 0;
    this.trail.setEnabled(false);
    this.stop();
    this.setFrame(SPRITE.animations.serum.start + 5);
    this.scene.game.events.emit(GAME_EVENTS.bossDefeated);
    this.scene.cameras.main.shake(800, 0.006);

    for (let i = 0; i < 6; i += 1) {
      this.scene.time.delayedCall(i * 220, () => this.spawnBloodBurst());
    }

    this.setTint(0x8a3038);
    this.scene.tweens.add({
      targets: this,
      y: this.y + 24,
      angle: this.direction * -6,
      alpha: 0,
      delay: 600,
      duration: 1600,
      ease: 'Quad.In',
      onComplete: () => {
        this.setVisible(false);
        this.aura.destroy();
        this.config.onDefeated?.();
      },
    });
  }

  private spawnBloodBurst(): void {
    const flask = this.flaskPosition();

    for (let i = 0; i < 8; i += 1) {
      const drop = this.scene.add
        .circle(flask.x + Phaser.Math.Between(-30, 30), flask.y + Phaser.Math.Between(-20, 120), Phaser.Math.Between(3, 7), 0xb5101f, 0.9)
        .setDepth(DEPTH + 0.2);
      this.scene.tweens.add({
        targets: drop,
        x: drop.x + Phaser.Math.Between(-90, 90),
        y: this.config.floorY,
        alpha: 0,
        duration: Phaser.Math.Between(500, 900),
        ease: 'Quad.In',
        onComplete: () => drop.destroy(),
      });
    }
  }

  // ---- utilidades -------------------------------------------------------

  private get frameIndex(): number {
    return (this.anims.currentFrame?.index ?? 1) - 1;
  }

  // Comandado pelo outro jogo, o lado vem de lá.
  private faceTarget(): void {
    if (!this.control.isRemote && this.target && Math.abs(this.target.x - this.x) > 20) {
      this.setFacing(this.target.x < this.x ? -1 : 1);
    }
  }

  // Os pés quase no centro do quadro: ao virar, espelha também a origem.
  private setFacing(direction: 1 | -1): void {
    const flipped = direction < 0;
    const feetX = flipped ? SPRITE.frameWidth - SPRITE.feetX : SPRITE.feetX;
    this.direction = direction;
    this.setFlipX(flipped);
    this.setOrigin(feetX / SPRITE.frameWidth, SPRITE.feetY / SPRITE.frameHeight);
  }

  private playOnce(name: CrimsonSurgeonAnimation, onComplete: () => void): void {
    const key = this.animationKey(name);
    this.play(key);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + key, () => {
      if (this.behavior !== 'dead') onComplete();
    });
  }

  private clearPendingAnimations(): void {
    for (const name of Object.keys(SPRITE.animations)) {
      this.off(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + this.animationKey(name as CrimsonSurgeonAnimation));
    }
  }

  private animationKey(name: CrimsonSurgeonAnimation): string {
    return `${SPRITE.key}-${name}`;
  }

  private createAnimations(): void {
    const anims = this.scene.anims;

    for (const [name, animation] of Object.entries(SPRITE.animations)) {
      const key = this.animationKey(name as CrimsonSurgeonAnimation);

      if (!anims.exists(key)) {
        anims.create({
          key,
          frames: animation.frameMs.map((duration, index) => ({
            key: SPRITE.key,
            frame: animation.start + index,
            duration,
          })),
          frameRate: 1000,
          repeat: name === 'idle' || name === 'run' ? -1 : 0,
        });
      }
    }
  }
}
