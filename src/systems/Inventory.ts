import Phaser from 'phaser';

import type { ItemDefinition } from '../data/items';

// Emitido em game.events para que HUD e outros sistemas reajam sem acoplamento.
export const INVENTORY_ITEM_ADDED = 'inventory:item-added';

export class Inventory {
  private readonly items = new Map<string, ItemDefinition>();

  constructor(private readonly events: Phaser.Events.EventEmitter) {}

  add(item: ItemDefinition): void {
    this.items.set(item.id, item);
    this.events.emit(INVENTORY_ITEM_ADDED, item);
  }

  has(itemId: string): boolean {
    return this.items.has(itemId);
  }

  list(): ItemDefinition[] {
    return [...this.items.values()];
  }
}
