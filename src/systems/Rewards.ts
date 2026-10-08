import Phaser from 'phaser';

import { GAME_EVENTS, type RewardReceived } from '../core/gameEvents';
import { AMPOULE, ITEM_ICONS, ITEMS, RING_EFFECTS, type ItemDefinition } from '../data/items';
import { PlayerState } from './PlayerState';
import type { WorldState } from './WorldState';

export type ItemKey = keyof typeof ITEMS;

// Recompensa fixa (ex.: boss): cargas extras de ampola e itens.
export type Reward = {
  ampoules: number;
  items: readonly ItemKey[];
};

// Efeito imediato de um item recém-obtido (vale para baús e recompensas):
// ampolas aumentam as cargas e anéis passam a valer na hora. Armas ficam a
// cargo de quem as entrega, porque também mexem no sprite do jogador.
export function applyItemEffect(game: Phaser.Game, item: ItemDefinition): void {
  const state = PlayerState.of(game);

  if (item.id === AMPOULE.itemId) {
    state.addAmpoule();
  } else if (item.category === 'ring') {
    state.addRing(item.id);
  }
}

export function itemIcon(itemId: string): string | undefined {
  return (ITEM_ICONS as Record<string, { key: string }>)[itemId]?.key;
}

// Entrega a recompensa e avisa o HUD com o que foi recebido.
export function grantReward(game: Phaser.Game, world: WorldState, reward: Reward): void {
  const lines: RewardReceived['lines'] = [];

  if (reward.ampoules > 0) {
    world.inventory.add(ITEMS.veiledEmberAmpoule);

    for (let i = 0; i < reward.ampoules; i += 1) {
      applyItemEffect(game, ITEMS.veiledEmberAmpoule);
    }
    lines.push({ text: `${AMPOULE.name} +${reward.ampoules} (carga permanente)`, icon: itemIcon(AMPOULE.itemId) });
  }

  for (const key of reward.items) {
    const item: ItemDefinition = ITEMS[key];
    world.inventory.add(item);
    applyItemEffect(game, item);
    const effect = (RING_EFFECTS as Record<string, { description: string }>)[item.id];
    lines.push({ text: effect ? `${item.name} — ${effect.description}` : item.name, icon: itemIcon(item.id) });
  }

  const received: RewardReceived = { lines };
  game.events.emit(GAME_EVENTS.rewardReceived, received);
}
