import Phaser from 'phaser';
import { playSound } from './SoundEffects';

import {
  COMBAT_DEBUG_REGISTRY_KEY,
  COMBAT_FEEDBACK,
  type Faction,
  type HitboxDefinition,
} from '../data/combat';
import { getDifficulty } from '../data/difficulty';
import { showCriticalHit } from '../ui/CriticalHit';

// Golpe em andamento. `swingId` muda a cada golpe para que um mesmo golpe
// acerte cada alvo uma única vez, mesmo ficando ativo por vários quadros.
export type ActiveAttack = {
  swingId: number;
  damage: number;
  hitbox: HitboxDefinition;
  // Verdadeiro só durante os quadros em que o golpe pode acertar.
  isActive: boolean;
  // Golpe crítico (o dano já vem multiplicado).
  critical?: boolean;
};

export type Hit = {
  damage: number;
  // Direção do empurrão/reação: 1 = para a direita, -1 = para a esquerda.
  direction: 1 | -1;
  attackerFaction: Faction;
  critical?: boolean;
};

// Quem golpeia: jogador, inimigos, bosses.
export interface Attacker {
  readonly faction: Faction;
  readonly x: number;
  readonly y: number; // linha dos pés
  readonly facing: 1 | -1;
  getActiveAttack(): ActiveAttack | undefined;
  // Chamado quando o golpe conecta (hitstop, som, etc.).
  onAttackLanded?(target: Damageable, critical?: boolean): void;
}

// Quem pode ser atingido. A hurtbox é a área do corpo vulnerável.
export interface Damageable {
  readonly faction: Faction;
  readonly isAlive: boolean;
  // Janela de invulnerabilidade (ex.: rolamento). O golpe não conta como
  // acerto e pode pegar o alvo se ainda estiver ativo quando ela acabar.
  readonly isInvulnerable?: boolean;
  getHurtbox(): Phaser.Geom.Rectangle;
  receiveHit(hit: Hit): void;
}

// Resolve hitbox x hurtbox entre facções diferentes e aplica o dano.
export class CombatSystem {
  private readonly attackers = new Set<Attacker>();
  private readonly targets = new Set<Damageable>();
  // Alvos já atingidos por golpe (atacante -> swingId -> alvos).
  private readonly landed = new Map<Attacker, { swingId: number; hit: Set<Damageable> }>();
  private debugGraphics?: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {}

  addAttacker(attacker: Attacker): void {
    this.attackers.add(attacker);
  }

  addTarget(target: Damageable): void {
    this.targets.add(target);
  }

  remove(entity: Attacker | Damageable): void {
    this.attackers.delete(entity as Attacker);
    this.targets.delete(entity as Damageable);
    this.landed.delete(entity as Attacker);
  }

  update(): void {
    for (const attacker of this.attackers) {
      const attack = attacker.getActiveAttack();

      if (attack?.isActive) {
        this.resolve(attacker, attack);
      }
    }

    this.drawDebug();
  }

  // Área do golpe no mundo, espelhada conforme o lado em que o atacante olha.
  static hitboxRect(attacker: Attacker, hitbox: HitboxDefinition): Phaser.Geom.Rectangle {
    const left =
      attacker.facing === 1
        ? attacker.x + hitbox.forward
        : attacker.x - hitbox.forward - hitbox.width;

    return new Phaser.Geom.Rectangle(left, attacker.y - hitbox.up, hitbox.width, hitbox.height);
  }

  private resolve(attacker: Attacker, attack: ActiveAttack): void {
    const record = this.recordFor(attacker, attack.swingId);
    const area = CombatSystem.hitboxRect(attacker, attack.hitbox);

    for (const target of this.targets) {
      if (
        target.faction === attacker.faction ||
        !target.isAlive ||
        target.isInvulnerable ||
        record.hit.has(target) ||
        !Phaser.Geom.Intersects.RectangleToRectangle(area, target.getHurtbox())
      ) {
        continue;
      }

      record.hit.add(target);
      const critical = attack.critical ?? false;
      const difficulty = getDifficulty(this.scene.game);
      const multiplier =
        attacker.faction === 'player' && target.faction === 'enemy'
          ? difficulty.playerDamageMultiplier
          : attacker.faction === 'enemy' && target.faction === 'player'
            ? difficulty.enemyDamageMultiplier
            : 1;
      const damage = attack.damage * multiplier;
      target.receiveHit({
        damage,
        direction: attacker.facing,
        attackerFaction: attacker.faction,
        critical,
      });
      attacker.onAttackLanded?.(target, critical);
      playSound(this.scene, critical ? 'critical' : 'impact', attacker);

      const shake = critical ? COMBAT_FEEDBACK.critical : COMBAT_FEEDBACK;
      this.scene.cameras.main.shake(shake.shakeDurationMs, shake.shakeIntensity);

      if (critical) {
        const hurtbox = target.getHurtbox();
        showCriticalHit(this.scene, hurtbox.centerX, hurtbox.top, damage);
      }
    }
  }

  private recordFor(attacker: Attacker, swingId: number): { swingId: number; hit: Set<Damageable> } {
    const existing = this.landed.get(attacker);

    if (existing?.swingId === swingId) {
      return existing;
    }

    const record = { swingId, hit: new Set<Damageable>() };
    this.landed.set(attacker, record);
    return record;
  }

  private drawDebug(): void {
    if (!this.scene.game.registry.get(COMBAT_DEBUG_REGISTRY_KEY)) {
      this.debugGraphics?.clear();
      return;
    }

    this.debugGraphics ??= this.scene.add.graphics().setDepth(1000);
    const graphics = this.debugGraphics.clear();

    graphics.lineStyle(1, 0x4aa8ff, 0.9);
    this.targets.forEach((target) => graphics.strokeRectShape(target.getHurtbox()));

    for (const attacker of this.attackers) {
      const attack = attacker.getActiveAttack();

      if (attack) {
        graphics.lineStyle(1, 0xff4040, attack.isActive ? 1 : 0.35);
        graphics.strokeRectShape(CombatSystem.hitboxRect(attacker, attack.hitbox));
      }
    }
  }
}
