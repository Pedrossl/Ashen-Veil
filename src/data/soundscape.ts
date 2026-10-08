export const MUSIC = {
  exploration: { key: 'music-exploration', path: 'assets/audio/music/exploracao_cinzas.wav', volume: 0.09 },
  reaper: { key: 'music-reaper', path: 'assets/audio/music/ceifador_lamento.wav', volume: 0.13 },
  root: { key: 'music-root', path: 'assets/audio/music/raiz_profundezas.wav', volume: 0.13 },
} as const;
export const LOCAL_AMBIENCE = {
  fire: { key: 'local-fire', path: 'assets/audio/ambience/fogo_proximo.wav', volume: 0.10 },
  chains: { key: 'local-chains', path: 'assets/audio/ambience/correntes_distantes.wav', volume: 0.08 },
} as const;
export const SOUNDSCAPE = { radius: 650, fadeMs: 900, combatAmbienceFactor: 0.45 };
