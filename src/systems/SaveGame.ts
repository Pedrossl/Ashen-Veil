import type Phaser from 'phaser';

import { getDifficulty, setDifficulty } from '../data/difficulty';
import { ITEMS, type ItemDefinition } from '../data/items';
import { DEFAULT_SKIN, setSkin } from '../data/skins';
import type { WeaponId } from '../data/weapons';
import { PlayerState } from './PlayerState';
import { getCoopRole, setCoopSession } from './Session';
import { WorldState, type Checkpoint } from './WorldState';

import { readSlots, writeSlot, type SaveSlot, type SaveChoice, type SaveData } from './SaveSlots';
export type { SaveChoice } from './SaveSlots';

const ACTIVE_SLOT = 'active-save-slot';

// Mundo e progresso do personagem: o que o save guarda e o que o anfitrião
// manda ao convidado no início da partida cooperativa.
export type WorldSnapshot = {
  flags: string[];
  items: string[];
  checkpoint: Checkpoint;
  weaponId: WeaponId;
  bonusAmpoules: number;
  rings: string[];
};


const ALL_ITEMS: readonly ItemDefinition[] = Object.values(ITEMS);

// Em desenvolvimento, abrir uma sala direto (`?sala=`) não mexe no save.
function isDisabled(): boolean {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).has('sala');
}

function captureWorld(game: Phaser.Game): WorldSnapshot {
  const world = WorldState.of(game);
  const player = PlayerState.of(game);
  return {
    flags: world.flagList,
    items: world.inventory.list().map((item) => item.id),
    checkpoint: world.checkpoint,
    weaponId: player.equippedWeaponId,
    bonusAmpoules: player.bonusAmpouleCount,
    rings: player.ringIds,
  };
}

// Troca o mundo e o personagem atuais pelos do snapshot (vida e ampolas cheias).
function applyWorld(game: Phaser.Game, snapshot: WorldSnapshot): void {
  WorldState.reset(game);
  PlayerState.reset(game);
  const world = WorldState.of(game);
  world.restore(snapshot.flags, snapshot.checkpoint);
  world.inventory.restore(ALL_ITEMS.filter((item) => snapshot.items.includes(item.id)));
  PlayerState.of(game).restore(snapshot.weaponId, snapshot.bonusAmpoules, snapshot.rings);
}

// Salva o progresso: mundo (flags, itens, checkpoint) e equipamento. Vida e
// ampolas gastas não entram; ao continuar, ele volta inteiro na lanterna. No
// cooperativo o mundo é do anfitrião: só ele grava (o save do convidado fica
// como estava).
export function saveGame(game: Phaser.Game): void {
  if (isDisabled() || getCoopRole(game) === 'guest') {
    return;
  }

  const data: SaveData = {
    ...captureWorld(game),
    difficulty: getDifficulty(game).id,
  };

  try {
    let slot = game.registry.get(ACTIVE_SLOT) as SaveSlot | undefined;
    slot ??= { id: crypto.randomUUID(), name: 'Jornada', updatedAt: 0, data };
    slot = { ...slot, data, updatedAt: Date.now() };
    game.registry.set(ACTIVE_SLOT, slot);
    writeSlot(slot);
  } catch {
    // Sem armazenamento (aba anônima, bloqueado): o jogo segue sem salvar.
  }
}

export function hasSave(): boolean {
  return !isDisabled() && readSlots().length > 0;
}

// Carrega o save no registry; devolve o checkpoint onde continuar.
export function loadGame(game: Phaser.Game, id?: string): Checkpoint | undefined {
  const slot = id ? readSlots().find(s => s.id === id) : readSlots()[0];
  const data = slot?.data;

  if (!data) {
    return undefined;
  }

  game.registry.set(ACTIVE_SLOT, slot);
  applyWorld(game, data);
  setCoopSession(game, undefined);
  setDifficulty(game, data.difficulty);
  // No solo o personagem usa a aparência original; o cooperativo escolhe a
  // sua no lobby, depois de carregar.
  setSkin(game, DEFAULT_SKIN);
  return data.checkpoint;
}

// Uma nova jornada ganha um slot próprio; os anteriores permanecem disponíveis.
export function startNewGame(game: Phaser.Game, name = 'Nova jornada'): void {
  WorldState.reset(game);
  PlayerState.reset(game);
  setCoopSession(game, undefined);
  setSkin(game, DEFAULT_SKIN);
  game.registry.set(ACTIVE_SLOT, {
    id: crypto.randomUUID(), name: name.trim().slice(0, 40) || 'Nova jornada', updatedAt: 0,
  });
}

// Cooperativo, anfitrião: o mundo como está agora (para o convidado que volta
// a uma partida em andamento).
export function currentWorld(game: Phaser.Game): WorldSnapshot {
  return captureWorld(game);
}

// O anfitrião escolhe explicitamente o mundo antes de abrir a sala.
export function startCoopAsHost(game: Phaser.Game, choice: SaveChoice): WorldSnapshot {
  if (choice.kind === 'existing') {
    if (!loadGame(game, choice.id)) throw new Error('O save escolhido não está disponível.');
  } else {
    startNewGame(game, choice.name);
  }
  setCoopSession(game, 'host');
  return captureWorld(game);
}

// Cooperativo, convidado: entra no mundo do anfitrião (sem tocar no próprio save).
export function startCoopAsGuest(game: Phaser.Game, world: WorldSnapshot): void {
  applyWorld(game, world);
  setCoopSession(game, 'guest');
}
