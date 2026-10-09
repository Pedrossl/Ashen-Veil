import Phaser from 'phaser';

import type { RoomId } from '../maps/types';
import { GAME_EVENTS, type WorldFlagSet } from '../core/gameEvents';
import { Inventory } from './Inventory';

export type Checkpoint = { roomId: RoomId; entryId: string };

// Antes de descansar em alguma fogueira, o jogador renasce na cela.
const FIRST_CHECKPOINT: Checkpoint = { roomId: 'prison-cell', entryId: 'start' };

const REGISTRY_KEY = 'world-state';

// Estado que sobrevive à troca de salas: inventário e marcações do mundo
// (portões abertos, itens já pegos, salas visitadas).
export class WorldState {
  readonly inventory: Inventory;
  private readonly flags = new Set<string>();
  private lastCheckpoint: Checkpoint = FIRST_CHECKPOINT;

  private constructor(private readonly events: Phaser.Events.EventEmitter) {
    this.inventory = new Inventory(events);
  }

  static of(game: Phaser.Game): WorldState {
    const existing = game.registry.get(REGISTRY_KEY) as WorldState | undefined;

    if (existing) {
      return existing;
    }

    const state = new WorldState(game.events);
    game.registry.set(REGISTRY_KEY, state);
    return state;
  }

  // Novo jogo: o próximo `of` cria um estado limpo.
  static reset(game: Phaser.Game): void {
    game.registry.remove(REGISTRY_KEY);
  }

  hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }

  setFlag(flag: string): void {
    if (this.flags.has(flag)) {
      return;
    }

    this.flags.add(flag);
    const change: WorldFlagSet = { flag };
    this.events.emit(GAME_EVENTS.worldFlagSet, change);
  }

  // Marcação vinda do parceiro no cooperativo: entra sem avisar ninguém
  // (senão voltaria para ele).
  applySharedFlag(flag: string): boolean {
    if (this.flags.has(flag)) {
      return false;
    }

    this.flags.add(flag);
    return true;
  }

  // Última fogueira em que o jogador descansou: é onde ele renasce.
  get checkpoint(): Checkpoint {
    return this.lastCheckpoint;
  }

  setCheckpoint(checkpoint: Checkpoint): void {
    this.lastCheckpoint = checkpoint;
  }

  get flagList(): string[] {
    return [...this.flags];
  }

  // Volta marcações e checkpoint de um save.
  restore(flags: readonly string[], checkpoint: Checkpoint): void {
    flags.forEach((flag) => this.flags.add(flag));
    this.lastCheckpoint = checkpoint;
  }
}
