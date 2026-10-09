import type Phaser from 'phaser';
import type { Room } from '@colyseus/sdk';

import { GAME_EVENTS, type WorldFlagSet } from '../../core/gameEvents';
import { ITEMS, type ItemDefinition } from '../../data/items';
import { INVENTORY_ITEM_ADDED, type ItemOrigin } from '../Inventory';
import { applyItemEffect } from '../Rewards';
import { WorldState } from '../WorldState';
import { COOP_MESSAGES, type FromPartner, type WorldEvent } from './messages';
import { partnerName } from './partnerName';

// Marcações que continuam de cada um: primeira visita (título da área) e fim
// da demo. Boss derrotado vale para os dois (o boss é um só).
const PERSONAL_FLAG_PREFIXES = ['visited:', 'demo-finished'];

const ALL_ITEMS: readonly ItemDefinition[] = Object.values(ITEMS);

// Progresso compartilhado: item que um pega (a chave da cela, a espada do
// baú, ampolas, anel) vai para o inventário dos dois, e portões, baús e
// lanternas abertos por um ficam abertos para o outro. Recompensa de boss não
// vai: cada um ganha a sua ao vencer. `onShared` roda quando chega algo do
// parceiro: a scene atualiza os objetos da sala e mostra o aviso.
export class WorldSync {
  constructor(
    private readonly game: Phaser.Game,
    private readonly room: Room,
    private readonly onShared: (message?: string, item?: ItemDefinition) => void,
  ) {}

  listen(): Array<() => void> {
    const events = this.game.events;
    const onItem = (item: ItemDefinition, origin: ItemOrigin): void => {
      if (origin === 'found') {
        this.send({ kind: 'item', itemId: item.id });
      }
    };
    const onFlag = ({ flag }: WorldFlagSet): void => {
      if (!PERSONAL_FLAG_PREFIXES.some((prefix) => flag.startsWith(prefix))) {
        this.send({ kind: 'flag', flag });
      }
    };

    events.on(INVENTORY_ITEM_ADDED, onItem);
    events.on(GAME_EVENTS.worldFlagSet, onFlag);
    return [
      () => events.off(INVENTORY_ITEM_ADDED, onItem),
      () => events.off(GAME_EVENTS.worldFlagSet, onFlag),
      this.room.onMessage(COOP_MESSAGES.worldEvent, (event: FromPartner<WorldEvent>) => this.receive(event)),
    ];
  }

  private send(event: WorldEvent): void {
    this.room.send(COOP_MESSAGES.worldEvent, event);
  }

  private receive(event: FromPartner<WorldEvent>): void {
    const world = WorldState.of(this.game);

    if (event.kind === 'flag') {
      if (world.applySharedFlag(event.flag)) {
        this.onShared();
      }
      return;
    }

    const item = ALL_ITEMS.find((candidate) => candidate.id === event.itemId);

    // Ampolas podem vir mais de uma vez (cada baú dá uma carga a mais).
    if (!item || (world.inventory.has(item.id) && item.category !== 'consumable')) {
      return;
    }

    world.inventory.restore([item]);
    applyItemEffect(this.game, item);
    this.onShared(`${partnerName(this.room, event.id)} pegou: ${item.name}`, item);
  }
}
