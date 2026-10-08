// Ganhos relativos; o volume geral dos efeitos fica separado do Phaser global.
export const SFX_VOLUME = 0.55;
export const SFX_MAX_VOICES = 8;
export const SFX_DISTANCE = { full: 200, silent: 1000 };
export const SOUND_EFFECTS = {
  arenaClose: { file: 'arena_portao_fechar', volume: 0.40, cooldown: 500, variation: 0 },
  arenaOpen: { file: 'arena_portao_abrir', volume: 0.34, cooldown: 500, variation: 0 },
  victory: { file: 'vitoria_boss', volume: 0.28, cooldown: 1000, variation: 0 },
  uiMove: { file: 'interface_navegar', volume: 0.15, cooldown: 60, variation: 0.03 },
  uiConfirm: { file: 'interface_confirmar', volume: 0.22, cooldown: 130, variation: 0.03 },
  inventoryOpen: { file: 'inventario_abrir', volume: 0.22, cooldown: 150, variation: 0.03 },
  inventoryClose: { file: 'inventario_fechar', volume: 0.22, cooldown: 150, variation: 0.03 },
  equip: { file: 'equipar_arma', volume: 0.25, cooldown: 150, variation: 0.03 },
  ladder: { file: 'escada_madeira', volume: 0.2, cooldown: 170, variation: 0.03 },
  land: { file: 'aterrissagem_pedra', volume: 0.32, cooldown: 200, variation: 0.03 },
  waterLand: { file: 'aterrissagem_agua', volume: 0.3, cooldown: 200, variation: 0.03 },
  locked: { file: 'porta_trancada', volume: 0.25, cooldown: 350, variation: 0.03 },

  reaperWake: { file: 'ceifador_despertar', volume: 0.42, cooldown: 180, variation: 0.04 },
  reaperSlash: { file: 'ceifador_foice', volume: 0.42, cooldown: 180, variation: 0.04 },
  reaperThrow: { file: 'ceifador_arremesso', volume: 0.42, cooldown: 180, variation: 0.04 },
  reaperTeleport: { file: 'ceifador_teleporte', volume: 0.42, cooldown: 180, variation: 0.04 },
  reaperPhase: { file: 'ceifador_fase', volume: 0.42, cooldown: 180, variation: 0.04 },
  reaperDeath: { file: 'ceifador_morte', volume: 0.42, cooldown: 180, variation: 0.04 },
  rootBite: { file: 'raiz_mordida', volume: 0.42, cooldown: 180, variation: 0.04 },
  rootSweep: { file: 'raiz_varredura', volume: 0.42, cooldown: 180, variation: 0.04 },
  rootCage: { file: 'raiz_estacas', volume: 0.42, cooldown: 180, variation: 0.04 },
  rootBurrow: { file: 'raiz_enterrar', volume: 0.42, cooldown: 180, variation: 0.04 },
  rootEmerge: { file: 'raiz_emergir', volume: 0.42, cooldown: 180, variation: 0.04 },
  rootSpit: { file: 'raiz_cuspe', volume: 0.42, cooldown: 180, variation: 0.04 },
  rootPhase: { file: 'raiz_fase', volume: 0.42, cooldown: 180, variation: 0.04 },
  rootDeath: { file: 'raiz_morte', volume: 0.42, cooldown: 180, variation: 0.04 },

  step: { file: 'passo_pedra', volume: 0.23, cooldown: 110, variation: 0.10 },
  waterStep: { file: 'passo_agua', volume: 0.22, cooldown: 110, variation: 0.12 },
  punch: { file: 'soco_ar', volume: 0.32, cooldown: 100, variation: 0.08 },
  sword: { file: 'lamina_ar', volume: 0.30, cooldown: 100, variation: 0.07 },
  impact: { file: 'impacto', volume: 0.46, cooldown: 65, variation: 0.08 },
  critical: { file: 'impacto_critico', volume: 0.52, cooldown: 90, variation: 0.04 },
  dodge: { file: 'esquiva', volume: 0.30, cooldown: 140, variation: 0.08 },
  heal: { file: 'cura_ampola', volume: 0.25, cooldown: 250, variation: 0 },
  pickup: { file: 'coleta', volume: 0.22, cooldown: 120, variation: 0 },
  chest: { file: 'bau_abertura', volume: 0.34, cooldown: 200, variation: 0 },
  gate: { file: 'portao_ferro', volume: 0.29, cooldown: 500, variation: 0 },
  death: { file: 'morte', volume: 0.36, cooldown: 1000, variation: 0 },
  rest: { file: 'descanso_lanterna', volume: 0.28, cooldown: 500, variation: 0 },
  prisonerAlert: { file: 'prisioneiro_alerta', volume: 0.30, cooldown: 700, variation: 0.08 },
  chainSweep: { file: 'prisioneiro_corrente', volume: 0.34, cooldown: 180, variation: 0.07 },
  chainSmash: { file: 'prisioneiro_esmagamento', volume: 0.42, cooldown: 220, variation: 0.05 },
  prisonerDeath: { file: 'prisioneiro_morte', volume: 0.32, cooldown: 250, variation: 0.08 },
  jailerAlert: { file: 'carcereiro_alerta', volume: 0.31, cooldown: 850, variation: 0.05 },
  jailerHook: { file: 'carcereiro_gancho', volume: 0.36, cooldown: 200, variation: 0.06 },
  jailerDeath: { file: 'carcereiro_morte', volume: 0.36, cooldown: 300, variation: 0.06 },
  ratAlert: { file: 'rato_alerta', volume: 0.17, cooldown: 850, variation: 0.12 },
  ratBite: { file: 'rato_mordida', volume: 0.24, cooldown: 160, variation: 0.12 },
  ratDeath: { file: 'rato_morte', volume: 0.20, cooldown: 250, variation: 0.10 },
  sludgeAlert: { file: 'suplicante_alerta', volume: 0.26, cooldown: 800, variation: 0.07 },
  sludgeThrow: { file: 'suplicante_arremesso', volume: 0.30, cooldown: 200, variation: 0.09 },
  sludgeDeath: { file: 'suplicante_morte', volume: 0.29, cooldown: 300, variation: 0.07 },
  sludgeSplat: { file: 'lodo_respingo', volume: 0.28, cooldown: 160, variation: 0.10 },
} as const;

export type SoundEffect = keyof typeof SOUND_EFFECTS;
export const soundKey = (effect: SoundEffect): string => `sfx-${effect}`;
export const soundPath = (effect: SoundEffect): string =>
  `assets/audio/sfx/${SOUND_EFFECTS[effect].file}.m4a`;
