import type { WorldSnapshot } from './SaveGame';
import type { DifficultyId } from '../data/difficulty';

export type SaveData = WorldSnapshot & { difficulty: DifficultyId };
export type SaveSlot = { id: string; name: string; updatedAt: number; data: SaveData };
export type SaveChoice = { kind: 'existing'; id: string } | { kind: 'new'; name: string };
const KEY = 'ashen-veil:saves:v2';
const LEGACY_KEY = 'ashen-veil:save:v1';

function validData(value: unknown): value is SaveData {
  if (!value || typeof value !== 'object') return false;
  const d = value as Partial<SaveData>;
  return Array.isArray(d.flags) && d.flags.every(f => typeof f === 'string')
    && Array.isArray(d.items) && d.items.every(i => typeof i === 'string')
    && Array.isArray(d.rings) && d.rings.every(i => typeof i === 'string')
    && typeof d.checkpoint?.roomId === 'string' && typeof d.checkpoint.entryId === 'string'
    && typeof d.weaponId === 'string' && typeof d.bonusAmpoules === 'number'
    && (d.difficulty === 'normal' || d.difficulty === 'easy');
}

// O formato antigo permanece intacto como backup. A migração só ocorre quando
// ainda não existe a coleção v2, evitando duplicação a cada leitura.
export function readSlots(storage: Storage = localStorage): SaveSlot[] {
  try {
    const raw = storage.getItem(KEY);
    if (raw !== null) {
      const values: unknown = JSON.parse(raw);
      if (!Array.isArray(values)) return [];
      return values.filter((s): s is SaveSlot => s && typeof s.id === 'string'
        && typeof s.name === 'string' && typeof s.updatedAt === 'number' && validData(s.data))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    }
    const legacy: unknown = JSON.parse(storage.getItem(LEGACY_KEY) ?? 'null');
    if (!validData(legacy)) return [];
    const slots = [{ id: 'legacy', name: 'Jornada anterior', updatedAt: 0, data: legacy }];
    try { storage.setItem(KEY, JSON.stringify(slots)); } catch { /* Backup continua disponível. */ }
    return slots;
  } catch { return []; }
}

export function writeSlot(slot: SaveSlot, storage: Storage = localStorage): void {
  const slots = readSlots(storage).filter(s => s.id !== slot.id);
  storage.setItem(KEY, JSON.stringify([slot, ...slots]));
}
