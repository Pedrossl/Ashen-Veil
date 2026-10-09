import type { RoomBuilder, RoomId } from '../types';
import { createServiceWing } from './serviceWing';
import { createBossLair } from './bossLair';
import { createCellBlockCorridor } from './cellBlockCorridor';
import { createChainWell } from './chainWell';
import { createDrownedGalleries } from './drownedGalleries';
import { createSewers } from './sewers';
import { createRootArena } from './rootArena';
import { createCellRoom } from './cellRoom';

export const PRISON_ROOMS: Record<RoomId, RoomBuilder> = {
  'prison-service-wing': createServiceWing,
  'prison-cell': createCellRoom,
  'prison-cell-block': createCellBlockCorridor,
  'prison-chain-well': createChainWell,
  'prison-drowned-galleries': createDrownedGalleries,
  'prison-sewers': createSewers,
  'prison-root-arena': createRootArena,
  'prison-boss-lair': createBossLair,
};

export const PRISON_START_ROOM: RoomId = 'prison-cell';
