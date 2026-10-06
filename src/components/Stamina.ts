type StaminaListener = (current: number, max: number) => void;

export type StaminaConfig = {
  max: number;
  regenPerSecond: number;
  // Espera após gastar antes de começar a regenerar.
  regenDelayMs: number;
};

// Recurso de ações: ataques e esquivas gastam, e ela volta depois de um intervalo.
export class Stamina {
  private value: number;
  private regenCooldownMs = 0;
  private readonly listeners: StaminaListener[] = [];

  constructor(private readonly config: StaminaConfig) {
    this.value = config.max;
  }

  get current(): number {
    return this.value;
  }

  get max(): number {
    return this.config.max;
  }

  onChange(listener: StaminaListener): void {
    this.listeners.push(listener);
  }

  // Como nos soulslike, basta ter algum vigor para agir; o custo pode
  // deixar a barra zerada, mas não negativa.
  canAct(): boolean {
    return this.value > 0;
  }

  spend(cost: number): void {
    this.regenCooldownMs = this.config.regenDelayMs;
    this.set(Math.max(0, this.value - cost));
  }

  // `paused` congela a regeneração durante ações (golpe, esquiva).
  update(deltaMs: number, paused: boolean): void {
    if (paused) {
      this.regenCooldownMs = Math.max(this.regenCooldownMs, this.config.regenDelayMs * 0.5);
      return;
    }

    if (this.regenCooldownMs > 0) {
      this.regenCooldownMs -= deltaMs;
      return;
    }

    if (this.value < this.config.max) {
      const gain = (this.config.regenPerSecond * deltaMs) / 1000;
      this.set(Math.min(this.config.max, this.value + gain));
    }
  }

  restore(): void {
    this.regenCooldownMs = 0;
    this.set(this.config.max);
  }

  private set(value: number): void {
    if (value === this.value) {
      return;
    }

    this.value = value;
    this.listeners.forEach((listener) => listener(this.value, this.config.max));
  }
}
