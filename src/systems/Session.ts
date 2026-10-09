import type Phaser from 'phaser';

// Papel na partida cooperativa: o mundo é do anfitrião (o save dele) e o
// convidado entra nele. Sem papel, a partida é solo.
export type CoopRole = 'host' | 'guest';

// Fica no registry para o save, o combate e a sincronização consultarem.
const COOP_ROLE_KEY = 'game:coop-role';

export function setCoopSession(game: Phaser.Game, role: CoopRole | undefined): void {
  game.registry.set(COOP_ROLE_KEY, role);
}

export function getCoopRole(game: Phaser.Game): CoopRole | undefined {
  return game.registry.get(COOP_ROLE_KEY) as CoopRole | undefined;
}

export function isCoopSession(game: Phaser.Game): boolean {
  return getCoopRole(game) !== undefined;
}
