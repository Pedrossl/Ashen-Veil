type BuildupListener = (current: number, max: number) => void;

export type BuildupConfig = {
  max: number;
  // Depois de `decayDelayMs` sem acúmulo novo, esvazia `decayPerSecond`.
  decayDelayMs: number;
  decayPerSecond: number;
};

// Barra de acúmulo de status (ex.: raízes do boss do esgoto): enche a cada
// golpe que conecta e esvazia sozinha se o jogador parar de apanhar.
export class Buildup {
  private value = 0;
  private sinceLastAddMs = 0;
  private readonly listeners: BuildupListener[] = [];

  constructor(private readonly config: BuildupConfig) {}

  get current(): number {
    return this.value;
  }

  get max(): number {
    return this.config.max;
  }

  get isFull(): boolean {
    return this.value >= this.config.max;
  }

  onChange(listener: BuildupListener): void {
    this.listeners.push(listener);
  }

  add(amount: number): void {
    this.sinceLastAddMs = 0;
    this.set(Math.min(this.config.max, this.value + amount));
  }

  update(delta: number): void {
    this.sinceLastAddMs += delta;

    if (this.value > 0 && this.sinceLastAddMs >= this.config.decayDelayMs) {
      this.set(Math.max(0, this.value - this.config.decayPerSecond * (delta / 1000)));
    }
  }

  // Valor vindo de outro jogo (cooperativo), sem contar como acúmulo novo.
  syncTo(value: number): void {
    this.set(Math.max(0, Math.min(this.config.max, value)));
  }

  reset(): void {
    this.sinceLastAddMs = 0;
    this.set(0);
  }

  private set(value: number): void {
    if (value === this.value) {
      return;
    }

    this.value = value;
    this.listeners.forEach((listener) => listener(this.value, this.config.max));
  }
}
