type HealthListener = (current: number, max: number) => void;

// Vida de qualquer entidade que pode sofrer dano.
export class Health {
  private value: number;
  private readonly listeners: HealthListener[] = [];

  constructor(readonly max: number) {
    this.value = max;
  }

  get current(): number {
    return this.value;
  }

  get isDepleted(): boolean {
    return this.value <= 0;
  }

  onChange(listener: HealthListener): void {
    this.listeners.push(listener);
  }

  // Retorna o dano efetivamente aplicado.
  damage(amount: number): number {
    const applied = Math.min(this.value, Math.max(0, amount));
    this.set(this.value - applied);
    return applied;
  }

  heal(amount: number): void {
    this.set(Math.min(this.max, this.value + Math.max(0, amount)));
  }

  restore(): void {
    this.set(this.max);
  }

  // Valor vindo de outra fonte (ex.: o jogo que comanda o inimigo no cooperativo).
  syncTo(value: number): void {
    this.set(Math.max(0, Math.min(this.max, value)));
  }

  private set(value: number): void {
    if (value === this.value) {
      return;
    }

    this.value = value;
    this.listeners.forEach((listener) => listener(this.value, this.max));
  }
}
