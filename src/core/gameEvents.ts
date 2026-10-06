// Eventos globais emitidos em game.events. Sistemas de gameplay avisam o que
// mudou e a interface reage, sem um depender da implementação do outro.
export const GAME_EVENTS = {
  playerHealthChanged: 'player:health-changed',
  playerStaminaChanged: 'player:stamina-changed',
  playerWeaponChanged: 'player:weapon-changed',
  // Cargas da ampola de cura (slot de consumível do HUD).
  playerConsumableChanged: 'player:consumable-changed',
  // O jogador morreu; o HUD mostra a mensagem e a scene renasce na fogueira.
  playerDied: 'player:died',
  playerRested: 'player:rested',
  // Barra do boss: aparece ao despertar, acompanha a vida e some na morte.
  bossEngaged: 'boss:engaged',
  bossHealthChanged: 'boss:health-changed',
  bossDefeated: 'boss:defeated',
  // A sala mudou: qualquer barra de boss na tela deve sumir.
  bossDismissed: 'boss:dismissed',
} as const;

export type BossEngaged = {
  name: string;
  current: number;
  max: number;
};

export type StatChange = {
  current: number;
  max: number;
};

export type ConsumableChange = {
  name: string;
  icon: string;
  charges: number;
  maxCharges: number;
};

export type WeaponChange = {
  name: string;
  // Textura da arma; ausente quando desarmado.
  icon?: string;
};
