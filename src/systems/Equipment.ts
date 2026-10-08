import { WEAPONS, type WeaponId } from '../data/weapons';
import type { Inventory } from './Inventory';

// Armas que o jogador tem: os punhos sempre, mais as achadas pelo mapa.
export function ownedWeaponIds(inventory: Inventory): WeaponId[] {
  return (Object.keys(WEAPONS) as WeaponId[]).filter(
    (id) => WEAPONS[id].category === 'unarmed' || inventory.has(WEAPONS[id].id),
  );
}

// Próxima arma da lista, voltando ao começo depois da última.
export function nextWeaponId(current: WeaponId, owned: WeaponId[]): WeaponId {
  const index = owned.indexOf(current);
  return owned[(index + 1) % owned.length];
}

// Arma correspondente a um item do inventário (o id é o mesmo).
export function weaponIdForItem(itemId: string): WeaponId | undefined {
  return (Object.keys(WEAPONS) as WeaponId[]).find((id) => WEAPONS[id].id === itemId);
}
