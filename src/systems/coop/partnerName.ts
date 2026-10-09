import type { Room } from '@colyseus/sdk';

// Nome que o parceiro escolheu no lobby (estado da sala do Colyseus).
export function partnerName(room: Room, sessionId: string, fallback = 'Seu parceiro'): string {
  const players = (room.state as { players?: Map<string, { name: string }> })?.players;
  return players?.get(sessionId)?.name ?? fallback;
}
