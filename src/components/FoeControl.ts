import Phaser from 'phaser';

import type { Hit, RemoteControl } from '../systems/CombatSystem';
import { Aggro, type AggroFilter, type AggroTarget } from './Aggro';

// Decisão de um inimigo ou boss anunciada por quem o comanda (cooperativo):
// o outro jogo a executa com as mesmas animações, efeitos e sons.
export type FoeDecision = {
  kind: string;
  facing: 1 | -1;
  // Golpe escolhido, posição de saída etc., conforme o tipo.
  name?: string;
  x?: number;
  // Várias posições (ex.: onde caem as bolhas de sangue).
  points?: number[];
};

export type FoeDecisionListener = (decision: FoeDecision) => void;

// Quanto da distância até a posição recebida ele anda por quadro de 60 FPS.
const FOLLOW_RATE = 0.35;

// Quem decide por um inimigo ou boss e contra quem. Na IA deste jogo, mira
// por ameaça entre os alvos (o jogador; no cooperativo, os dois). No
// cooperativo pode ser comandado pelo outro jogo: aí não decide nada, desliza
// até a posição recebida e repassa os golpes que leva. Quem comanda anuncia
// as decisões (`announce`), que o outro jogo executa.
export class FoeControl<T extends AggroTarget = AggroTarget> {
  private readonly aggro = new Aggro<T>();
  private control?: RemoteControl;
  private listener?: FoeDecisionListener;
  private position?: { x: number; y: number };

  get target(): T | undefined {
    return this.aggro.target;
  }

  get isRemote(): boolean {
    return this.control !== undefined;
  }

  // ---- alvos --------------------------------------------------------------

  setTarget(target: T): void {
    this.aggro.setTargets([target]);
  }

  addTarget(target: T): void {
    this.aggro.addTarget(target);
  }

  removeTarget(target: T): void {
    this.aggro.removeTarget(target);
  }

  addThreat(source: object | undefined, damage: number): void {
    this.aggro.addThreat(source, damage);
  }

  retarget(from: { x: number }, canTarget: AggroFilter<T> = (target) => target.isAlive, force = false): T | undefined {
    return this.aggro.retarget(from, canTarget, force);
  }

  // A cada quadro: com IA aqui, esfria a ameaça; comandado de fora, desliza.
  // Devolve se é este jogo que decide.
  update(sprite: Phaser.GameObjects.Components.Transform, delta: number): boolean {
    if (this.isRemote) {
      this.follow(sprite, delta);
      return false;
    }

    this.aggro.update(delta);
    return true;
  }

  // ---- cooperativo ----------------------------------------------------------

  setRemoteControl(control?: RemoteControl): void {
    this.control = control;
    this.position = undefined;
  }

  forwardHit(hit: Hit): void {
    this.control?.forwardHit(hit);
  }

  onDecision(listener?: FoeDecisionListener): void {
    this.listener = listener;
  }

  // Só quem comanda anuncia; quem segue executa sem repetir.
  announce(decision: FoeDecision): void {
    if (!this.control) {
      this.listener?.(decision);
    }
  }

  // Posição recebida de quem comanda. A primeira (ou com `instant`) coloca na
  // hora; as seguintes deslizam.
  setPosition(sprite: Phaser.GameObjects.Components.Transform, x: number, y: number, instant = !this.position): void {
    if (instant) {
      sprite.setPosition(x, y);
    }
    this.position = { x, y };
  }

  private follow(sprite: Phaser.GameObjects.Components.Transform, delta: number): void {
    if (!this.position) {
      return;
    }

    const t = 1 - Math.pow(1 - FOLLOW_RATE, delta / (1000 / 60));
    sprite.setPosition(
      Phaser.Math.Linear(sprite.x, this.position.x, t),
      Phaser.Math.Linear(sprite.y, this.position.y, t),
    );
  }
}
