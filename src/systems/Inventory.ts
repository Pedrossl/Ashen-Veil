import Phaser from 'phaser';

import type { ItemDefinition } from '../data/items';

// Emitido em game.events para que HUD e outros sistemas reajam sem acoplamento.
export const INVENTORY_ITEM_ADDED = 'inventory:item-added';

// De onde veio o item: achado no mundo (chão, baú) ou recompensa de boss.
// No cooperativo só o achado vai para o parceiro; cada um ganha a própria
// recompensa ao vencer o boss.
export type ItemOrigin = 'found' | 'reward';

export class Inventory {
  private readonly items = new Map<string, ItemDefinition>();

  constructor(private readonly events: Phaser.Events.EventEmitter) {}

  add(item: ItemDefinition, origin: ItemOrigin = 'found'): void {
    this.items.set(item.id, item);
    this.events.emit(INVENTORY_ITEM_ADDED, item, origin);
  }

  has(itemId: string): boolean {
    return this.items.has(itemId);
  }

  // Volta os itens de um save, sem avisar ninguém (não é uma coleta nova).
  restore(items: readonly ItemDefinition[]): void {
    items.forEach((item) => this.items.set(item.id, item));
  }

  list(): ItemDefinition[] {
    return [...this.items.values()];
  }
}
