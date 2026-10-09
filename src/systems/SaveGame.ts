import type Phaser from 'phaser';

import { getDifficulty, setDifficulty, type DifficultyId } from '../data/difficulty';
import { ITEMS, type ItemDefinition } from '../data/items';
import { DEFAULT_SKIN, setSkin } from '../data/skins';
import type { WeaponId } from '../data/weapons';
import { PlayerState } from './PlayerState';
import { getCoopRole, setCoopSession } from './Session';
import { WorldState, type Checkpoint } from './WorldState';

// No itch.io todos os jogos HTML dividem o mesmo localStorage: a chave tem o
// nome do jogo. Mudou o formato, troque o `v1`; o save antigo é ignorado.
const SAVE_KEY = 'ashen-veil:save:v1';

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

type SaveData = WorldSnapshot & {
  difficulty: DifficultyId;
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
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Sem armazenamento (aba anônima, bloqueado): o jogo segue sem salvar.
  }
}

function readSave(): SaveData | undefined {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as SaveData) : undefined;
  } catch {
    return undefined;
  }
}

export function hasSave(): boolean {
  return !isDisabled() && readSave() !== undefined;
}

// Carrega o save no registry; devolve o checkpoint onde continuar.
export function loadGame(game: Phaser.Game): Checkpoint | undefined {
  const data = readSave();

  if (!data) {
    return undefined;
  }

  applyWorld(game, data);
  setCoopSession(game, undefined);
  setDifficulty(game, data.difficulty);
  // No solo o personagem usa a aparência original; o cooperativo escolhe a
  // sua no lobby, depois de carregar.
  setSkin(game, DEFAULT_SKIN);
  return data.checkpoint;
}

// Novo jogo: apaga o save e o estado da partida atual.
export function startNewGame(game: Phaser.Game): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nada a apagar.
  }

  WorldState.reset(game);
  PlayerState.reset(game);
  setCoopSession(game, undefined);
  setSkin(game, DEFAULT_SKIN);
}

// Cooperativo, anfitrião: o mundo como está agora (para o convidado que volta
// a uma partida em andamento).
export function currentWorld(game: Phaser.Game): WorldSnapshot {
  return captureWorld(game);
}

// Cooperativo, anfitrião: joga o próprio mundo (o save dele ou, sem save, um
// novo). Devolve o mundo para mandar ao convidado.
export function startCoopAsHost(game: Phaser.Game): WorldSnapshot {
  const data = isDisabled() ? undefined : readSave();

  if (data) {
    applyWorld(game, data);
  } else {
    WorldState.reset(game);
    PlayerState.reset(game);
  }

  setCoopSession(game, 'host');
  return captureWorld(game);
}

// Cooperativo, convidado: entra no mundo do anfitrião (sem tocar no próprio save).
export function startCoopAsGuest(game: Phaser.Game, world: WorldSnapshot): void {
  applyWorld(game, world);
  setCoopSession(game, 'guest');
}
