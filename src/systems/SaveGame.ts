import type Phaser from 'phaser';

import { getDifficulty, setDifficulty, type DifficultyId } from '../data/difficulty';
import { ITEMS, type ItemDefinition } from '../data/items';
import type { WeaponId } from '../data/weapons';
import { PlayerState } from './PlayerState';
import { WorldState, type Checkpoint } from './WorldState';

// No itch.io todos os jogos HTML dividem o mesmo localStorage: a chave tem o
// nome do jogo. Mudou o formato, troque o `v1`; o save antigo é ignorado.
const SAVE_KEY = 'ashen-veil:save:v1';

type SaveData = {
  flags: string[];
  items: string[];
  checkpoint: Checkpoint;
  weaponId: WeaponId;
  bonusAmpoules: number;
  rings: string[];
  difficulty: DifficultyId;
};

const ALL_ITEMS: readonly ItemDefinition[] = Object.values(ITEMS);

// Em desenvolvimento, abrir uma sala direto (`?sala=`) não mexe no save.
function isDisabled(): boolean {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).has('sala');
}

// Salva o progresso: mundo (flags, itens, checkpoint) e equipamento. Vida e
// ampolas gastas não entram; ao continuar, ele volta inteiro na lanterna.
export function saveGame(game: Phaser.Game): void {
  if (isDisabled()) {
    return;
  }

  const world = WorldState.of(game);
  const player = PlayerState.of(game);
  const data: SaveData = {
    flags: world.flagList,
    items: world.inventory.list().map((item) => item.id),
    checkpoint: world.checkpoint,
    weaponId: player.equippedWeaponId,
    bonusAmpoules: player.bonusAmpouleCount,
    rings: player.ringIds,
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

  WorldState.reset(game);
  PlayerState.reset(game);
  const world = WorldState.of(game);
  world.restore(data.flags, data.checkpoint);
  world.inventory.restore(ALL_ITEMS.filter((item) => data.items.includes(item.id)));
  PlayerState.of(game).restore(data.weaponId, data.bonusAmpoules, data.rings);
  setDifficulty(game, data.difficulty);
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
}
