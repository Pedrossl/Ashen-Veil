// Peças do HUD recortadas e reduzidas a partir de 04_hud_interface/
// (moldura ornamentada vazia, preenchimentos de vida e stamina e moldura de slots).
export const HUD_ATLAS = {
  key: 'hud-atlas',
  imagePath: 'assets/hud/atlas_hud.png',
  dataPath: 'assets/hud/atlas_hud.json',
} as const;

export const HUD_LAYOUT = {
  margin: { x: 18, y: 14 },
  // Canais da moldura onde entram os preenchimentos (pixels do quadro 'frame').
  healthChannel: { x: 86, y: 35 },
  staminaChannel: { x: 86, y: 52 },
  // Moldura dos slots de arma (alto) e consumível (quadrado), presa ao canto
  // inferior esquerdo da tela, como nos soulslike.
  slots: { x: 10, bottom: 12, scale: 0.78 },
  // Centro do slot alto (arma) em pixels do quadro 'slots' e tamanho do ícone.
  weaponSlot: { centerX: 66, centerY: 50, iconLength: 96, angle: 38 },
  // Barra do boss, centralizada na parte de baixo da tela.
  bossBar: { width: 620, height: 11, bottom: 54 },
} as const;

export const HUD_ANIMATION = {
  // A barra clara mostra o dano recebido antes de encolher, como nos soulslike.
  damageTrailDelay: 450,
  damageTrailDuration: 520,
  fillDuration: 140,
} as const;

// Scenes de gameplay em que o HUD fica visível.
export const HUD_VISIBLE_IN_SCENES = ['PrisonScene'] as const;
