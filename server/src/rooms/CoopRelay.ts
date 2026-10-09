// Mensagens da partida cooperativa que o servidor só repassa ao outro jogador
// (acrescentando `id`, quem mandou). Os nomes batem com COOP_MESSAGES do
// cliente (src/systems/coop/messages.ts).
export const RELAYED_MESSAGES = [
  "player_state",
  "world_event",
  "foe_states",
  "foe_hit",
  "boss_decision",
  "player_hit",
  "enemy_projectile",
  "rest_ready",
  "rest_cancel",
  "rest_revive",
  "arena_summon",
] as const;

// Cada um anda livre pelo mundo do anfitrião. Numa sala da prisão com os dois,
// um só jogo comanda os inimigos: quem chegou primeiro e continua lá. Se ele
// sai, o comando passa para quem ficou.
export class RoomOwnership {
  private readonly playerRooms = new Map<string, string>();
  private readonly owners = new Map<string, string>();

  // Devolve as salas cujo dono pode ter mudado.
  enter(sessionId: string, roomId: string): string[] {
    const previous = this.playerRooms.get(sessionId);
    this.playerRooms.set(sessionId, roomId);
    return [previous, roomId].filter((id): id is string => id !== undefined);
  }

  leave(sessionId: string): string[] {
    const previous = this.playerRooms.get(sessionId);
    this.playerRooms.delete(sessionId);
    return previous ? [previous] : [];
  }

  // Recalcula o dono da sala; `undefined` quando ela ficou vazia.
  ownerOf(roomId: string): string | undefined {
    const occupants = [...this.playerRooms].filter(([, room]) => room === roomId).map(([id]) => id);
    const current = this.owners.get(roomId);
    const owner = current && occupants.includes(current) ? current : occupants[0];

    if (owner) this.owners.set(roomId, owner);
    else this.owners.delete(roomId);
    return owner;
  }
}
