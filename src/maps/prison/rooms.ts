import type { RoomBuilder, RoomId } from '../types';
import { createBossLair } from './bossLair';
import { createCellBlockCorridor } from './cellBlockCorridor';
import { createChainWell } from './chainWell';
import { createCellRoom } from './cellRoom';

export const PRISON_ROOMS: Record<RoomId, RoomBuilder> = {
  'prison-cell': createCellRoom,
  'prison-cell-block': createCellBlockCorridor,
  'prison-chain-well': createChainWell,
  'prison-boss-lair': createBossLair,
};

export const PRISON_START_ROOM: RoomId = 'prison-cell';
