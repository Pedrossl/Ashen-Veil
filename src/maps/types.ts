import type Phaser from 'phaser';

import type { ReaperKing } from '../entities/bosses/ReaperKing';
import type { ChainedPrisoner } from '../entities/enemies/ChainedPrisoner';
import type { Bonfire } from '../entities/world/Bonfire';
import type { CellGate } from '../entities/world/CellGate';
import type { Chest } from '../entities/world/Chest';
import type { Ladder } from '../entities/world/Ladder';
import type { Staircase } from '../entities/world/Staircase';
import type { ItemPickup } from '../entities/world/ItemPickup';
import type { WorldState } from '../systems/WorldState';

export type RoomId =
  | 'prison-cell'
  | 'prison-cell-block'
  | 'prison-chain-well'
  | 'prison-boss-lair';

export type RoomEntry = {
  x: number;
  // Altura dos pés; sem valor, usa o piso principal da sala.
  y?: number;
  facing: 'left' | 'right';
};

// Passagem para outra sala, disparada quando o jogador cruza a linha em x.
export type RoomExit = {
  side: 'left' | 'right';
  x: number;
  toRoom: RoomId;
  toEntry: string;
  isOpen?: () => boolean;
  // Só vale com os pés acima desta altura (saídas em andares superiores).
  maxFeetY?: number;
};

export type Room = {
  // Nome mostrado na primeira visita.
  title: string;
  subtitle: string;
  floorY: number;
  bounds: { x: number; y: number; width: number; height: number };
  zoom: number;
  entries: Record<string, RoomEntry>;
  exits: RoomExit[];
  colliders: Phaser.GameObjects.Rectangle[];
  gates: CellGate[];
  pickups: ItemPickup[];
  enemies: ChainedPrisoner[];
  stairs: Staircase[];
  ladders?: Ladder[];
  bosses?: ReaperKing[];
  bonfires?: Bonfire[];
  chests?: Chest[];
};

export type RoomBuilder = (scene: Phaser.Scene, world: WorldState) => Room;
