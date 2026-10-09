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
  // Evento local da scene: a queda terminou; pode começar a espera do renascimento.
  playerDeathAnimationCompleted: 'player:death-animation-completed',
  playerRested: 'player:rested',
  // Barra do boss: aparece ao despertar, acompanha a vida e some na morte.
  bossEngaged: 'boss:engaged',
  bossHealthChanged: 'boss:health-changed',
  // Segunda barra do boss, embaixo da vida (ex.: sangue do Cirurgião Rubro);
  // payload BossGaugeChanged. Some com o boss.
  bossGaugeChanged: 'boss:gauge-changed',
  bossDefeated: 'boss:defeated',
  // A sala mudou: qualquer barra de boss na tela deve sumir.
  bossDismissed: 'boss:dismissed',
  // Barra verde de raízes no jogador (payload StatChange; 0 esconde a barra).
  playerRootBuildupChanged: 'player:root-buildup-changed',
  // Recompensa recebida (ex.: boss derrotado); payload RewardReceived.
  rewardReceived: 'player:reward-received',
  // Marcação nova no mundo (portão aberto, baú aberto...); payload WorldFlagSet.
  worldFlagSet: 'world:flag-set',
  // Mensagem no chão sendo lida (payload GroundMessageShown) e fim da leitura.
  groundMessageShown: 'ground-message:shown',
  groundMessageHidden: 'ground-message:hidden',
  // Cooperativo: aviso curto na tela (payload string), ex.: o parceiro saiu.
  coopNotice: 'coop:notice',
  // Cooperativo: a partida acabou (o anfitrião saiu ou a conexão caiu).
  coopEnded: 'coop:ended',
} as const;

export type GroundMessageShown = {
  text: string;
};

export type WorldFlagSet = {
  flag: string;
};

export type RewardReceived = {
  // Uma linha por item, já com o texto e o ícone (textura) para mostrar.
  lines: Array<{ text: string; icon?: string }>;
};

export type BossGaugeChanged = {
  label: string;
  current: number;
  max: number;
};

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
