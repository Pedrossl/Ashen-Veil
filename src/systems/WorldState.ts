import Phaser from 'phaser';

import type { RoomId } from '../maps/types';
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

  private constructor(events: Phaser.Events.EventEmitter) {
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

  hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }

  setFlag(flag: string): void {
    this.flags.add(flag);
  }

  // Última fogueira em que o jogador descansou: é onde ele renasce.
  get checkpoint(): Checkpoint {
    return this.lastCheckpoint;
  }

  setCheckpoint(checkpoint: Checkpoint): void {
    this.lastCheckpoint = checkpoint;
  }
}
