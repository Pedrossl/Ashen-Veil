type StaminaListener = (current: number, max: number) => void;

export type StaminaConfig = {
  max: number;
  // Regeneração contínua, mesmo logo após gastar.
  trickleRegenPerSecond: number;
  // Regeneração cheia, depois de um tempo sem ações.
  regenPerSecond: number;
  // Tempo sem gastar (nem agir) até a regeneração cheia.
  regenDelayMs: number;
};

// Recurso de ações: ataques e esquivas gastam. Volta sempre devagar e, depois
// de um respiro sem ações, rápido.
export class Stamina {
  private value: number;
  private regenCooldownMs = 0;
  // Bônus de equipamento (ex.: anel) sobre as duas regenerações.
  private regenFactor = 1;
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

  // `acting` (golpe, esquiva) adia a regeneração cheia, mas não a contínua.
  update(deltaMs: number, acting: boolean): void {
    if (acting) {
      this.regenCooldownMs = Math.max(this.regenCooldownMs, this.config.regenDelayMs);
    } else {
      this.regenCooldownMs = Math.max(0, this.regenCooldownMs - deltaMs);
    }

    if (this.value >= this.config.max) {
      return;
    }

    const rate = this.regenCooldownMs > 0
      ? this.config.trickleRegenPerSecond
      : this.config.regenPerSecond;
    this.set(Math.min(this.config.max, this.value + (rate * this.regenFactor * deltaMs) / 1000));
  }

  setRegenFactor(factor: number): void {
    this.regenFactor = factor;
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
