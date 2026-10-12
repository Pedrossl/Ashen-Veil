import type { ActiveAttack, Attacker, CombatSystem, Damageable } from '../../systems/CombatSystem';

type HitZoneConfig = {
  // Centro horizontal e piso da área.
  x: number;
  floorY: number;
  width: number;
  height: number;
  damage: number;
  // Avisado quando o golpe conecta (ex.: encher a barra de raízes).
  onLanded?: (target: Damageable) => void;
};

// Área de dano solta no chão, para golpes que não saem do corpo do boss
// (estacas do Cárcere, erupção ao sair da terra). Fica registrada no combate
// só enquanto está ativa; cada ativação conta como um golpe novo.
export class HitZone implements Attacker {
  readonly faction = 'enemy' as const;
  readonly facing = 1 as const;
  private active = false;
  private swingId = 0;

  constructor(
    private readonly combat: CombatSystem,
    private config: HitZoneConfig,
  ) {}

  get x(): number {
    return this.config.x;
  }

  get y(): number {
    return this.config.floorY;
  }

  // Pode ser chamada a cada quadro (acompanha `x`); só a passagem de inativa
  // para ativa abre um golpe novo, então o mesmo alvo é atingido uma vez.
  activate(x = this.config.x): void {
    this.config = { ...this.config, x };

    if (!this.active) {
      this.active = true;
      this.swingId += 1;
      this.combat.addAttacker(this);
    }
  }

  onAttackLanded(target: Damageable): void {
    this.config.onLanded?.(target);
  }

  deactivate(): void {
    if (this.active) {
      this.active = false;
      this.combat.remove(this);
    }
  }

  getActiveAttack(): ActiveAttack | undefined {
    if (!this.active) {
      return undefined;
    }

    const { width, height, damage } = this.config;
    return {
      swingId: this.swingId,
      damage,
      hitbox: { forward: -width / 2, up: height, width, height },
      isActive: true,
    };
  }
}
