import { ENEMY_AGGRO } from '../data/enemies';

// O que o inimigo precisa saber de um alvo (um jogador).
export type AggroTarget = {
  readonly x: number;
  readonly y: number;
  readonly isAlive: boolean;
};

// Quem pode ser alvo agora (vivo, no mesmo andar, no alcance de interesse).
export type AggroFilter<T extends AggroTarget> = (target: T) => boolean;

// Ameaça de um inimigo por alvo: prefere o mais perto, mas quem causa dano
// acumula ameaça e pode puxar o inimigo para si. A troca tem margem e só é
// reavaliada de tempos em tempos, para ele não ficar indo e voltando. Com um
// único alvo (solo), o alvo é sempre esse.
export class Aggro<T extends AggroTarget> {
  private targets: T[] = [];
  private readonly threat = new Map<T, number>();
  private current?: T;
  private sinceRetargetMs = 0;

  get target(): T | undefined {
    return this.current;
  }

  setTargets(targets: readonly T[]): void {
    this.targets = [...targets];
    this.forgetMissing();
  }

  addTarget(target: T): void {
    if (!this.targets.includes(target)) {
      this.targets.push(target);
    }
  }

  removeTarget(target: T): void {
    this.targets = this.targets.filter((candidate) => candidate !== target);
    this.forgetMissing();
  }

  // Dano recebido de `source` (se for um dos alvos) vira ameaça.
  addThreat(source: object | undefined, damage: number): void {
    const target = this.targets.find((candidate) => candidate === source);

    if (target) {
      this.threat.set(target, (this.threat.get(target) ?? 0) + damage * ENEMY_AGGRO.threatPerDamage);
    }
  }

  // Esfria a ameaça; chamado a cada quadro.
  update(delta: number): void {
    const decay = ENEMY_AGGRO.threatDecayPerSecond * (delta / 1000);
    this.threat.forEach((value, target) => this.threat.set(target, Math.max(0, value - decay)));
    this.sinceRetargetMs += delta;
  }

  // Melhor alvo entre os que passam no filtro; troca o atual só com margem.
  // `force` reavalia na hora (ex.: o alvo atual morreu ou acabou de apanhar).
  retarget(from: { x: number }, canTarget: AggroFilter<T>, force = false): T | undefined {
    const currentValid = this.current !== undefined && canTarget(this.current);

    if (!force && currentValid && this.sinceRetargetMs < ENEMY_AGGRO.retargetMs) {
      return this.current;
    }

    this.sinceRetargetMs = 0;
    const scored = this.targets
      .filter(canTarget)
      .map((target) => ({ target, score: this.score(target, from) }))
      .sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (!best) {
      this.current = undefined;
    } else if (!currentValid || !this.current) {
      this.current = best.target;
    } else if (best.target !== this.current) {
      const currentScore = this.score(this.current, from);
      if (best.score >= currentScore + ENEMY_AGGRO.switchMargin) {
        this.current = best.target;
      }
    }

    return this.current;
  }

  private score(target: T, from: { x: number }): number {
    const distance = Math.abs(target.x - from.x);
    const proximity = Math.max(0, ENEMY_AGGRO.proximityRange - distance) * ENEMY_AGGRO.proximityWeight;
    return (this.threat.get(target) ?? 0) + proximity;
  }

  private forgetMissing(): void {
    for (const target of this.threat.keys()) {
      if (!this.targets.includes(target)) this.threat.delete(target);
    }

    if (this.current && !this.targets.includes(this.current)) {
      this.current = undefined;
    }
  }
}
