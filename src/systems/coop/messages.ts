import type { SludgeBallLaunch } from '../../entities/enemies/SludgeBall';
import type { FoeDecision } from '../../components/FoeControl';
import type { PlayerSnapshot } from '../../entities/player/RemotePlayer';

// Mensagens da partida cooperativa trocadas pela sala do Colyseus. O servidor
// (server/src/rooms/GameRoom.ts) repassa ao outro jogador as marcadas como
// repassadas, acrescentando `id` (quem mandou).
export const COOP_MESSAGES = {
  // Repassadas.
  playerState: 'player_state',
  worldEvent: 'world_event',
  // Inimigos e bosses de uma sala (grupo `enemies` ou `bosses`): estados de
  // quem comanda e golpes dados por quem segue.
  foeStates: 'foe_states',
  foeHit: 'foe_hit',
  // Decisão de um boss (golpe, teleporte...), executada pelo outro jogo.
  bossDecision: 'boss_decision',
  playerHit: 'player_hit',
  enemyProjectile: 'enemy_projectile',
  // Descanso é dos dois: quem senta na lanterna avisa e espera o parceiro
  // sentar na mesma; levantar antes cancela.
  restReady: 'rest_ready',
  restCancel: 'rest_cancel',
  // Entrou numa arena de boss vivo: o parceiro é levado para a mesma entrada.
  arenaSummon: 'arena_summon',
  // Cliente avisa em que sala da prisão está; servidor responde quem comanda
  // os inimigos de cada sala (quem chegou primeiro e continua lá).
  enterRoom: 'enter_room',
  roomOwner: 'room_owner',
} as const;

export type FromPartner<T> = T & { id: string };

export type WorldEvent = { kind: 'item'; itemId: string } | { kind: 'flag'; flag: string };

export type FoeGroup = 'enemies' | 'bosses';
export type FoeStatesMessage<S> = { roomId: string; group: FoeGroup; states: S[] };
export type FoeHitMessage = {
  roomId: string;
  group: FoeGroup;
  index: number;
  damage: number;
  direction: 1 | -1;
  critical: boolean;
};
export type BossDecisionMessage = { roomId: string; index: number; decision: FoeDecision };
export type PlayerHitMessage = { damage: number; direction: 1 | -1 };
export type EnemyProjectileMessage = { roomId: string; launch: SludgeBallLaunch };
export type RestReadyMessage = { roomId: string; bonfireId: string };
export type ArenaSummonMessage = { roomId: string; entryId: string };
export type EnterRoomMessage = { roomId: string };
export type RoomOwnerMessage = { roomId: string; ownerId: string };

export type { PlayerSnapshot };
