import type Phaser from 'phaser';

// Papel na partida cooperativa: o mundo é do anfitrião (o save dele) e o
// convidado entra nele. Sem papel, a partida é solo.
export type CoopRole = 'host' | 'guest';

// Fica no registry para o save, o combate e a sincronização consultarem.
const COOP_ROLE_KEY = 'game:coop-role';
const PARTNER_KEY = 'game:coop-partner-connected';

export function setCoopSession(game: Phaser.Game, role: CoopRole | undefined): void {
  game.registry.set(COOP_ROLE_KEY, role);
  game.registry.set(PARTNER_KEY, role !== undefined);
}

// O convidado saiu (pode voltar com o código da sala): o anfitrião segue como
// no solo até ele voltar.
export function setPartnerConnected(game: Phaser.Game, connected: boolean): void {
  game.registry.set(PARTNER_KEY, connected);
}

// Cooperativo com os dois jogando: vale o balanceamento a dois (vida dos
// inimigos, bolhas do Cirurgião) e o descanso espera o parceiro.
export function isCoopActive(game: Phaser.Game): boolean {
  return isCoopSession(game) && game.registry.get(PARTNER_KEY) === true;
}

export function getCoopRole(game: Phaser.Game): CoopRole | undefined {
  return game.registry.get(COOP_ROLE_KEY) as CoopRole | undefined;
}

export function isCoopSession(game: Phaser.Game): boolean {
  return getCoopRole(game) !== undefined;
}
