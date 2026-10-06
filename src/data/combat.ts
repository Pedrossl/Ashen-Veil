// Tipos e ajustes de combate compartilhados por armas, jogador e inimigos.

export type Faction = 'player' | 'enemy';

// Retângulo do golpe em pixels do mundo, relativo aos pés do atacante.
// `forward` é a distância do centro até a borda mais próxima, na direção em
// que o atacante olha; `up` é a altura do topo acima dos pés.
export type HitboxDefinition = {
  forward: number;
  up: number;
  width: number;
  height: number;
};

// Sensação de impacto; os valores por golpe ficam nas definições de ataque.
export const COMBAT_FEEDBACK = {
  // Pausa curta da animação do atacante quando o golpe conecta.
  hitstopMs: 70,
  shakeDurationMs: 90,
  shakeIntensity: 0.0025,
  // Golpe crítico: impacto mais pesado e mais longo.
  critical: {
    hitstopMs: 170,
    shakeDurationMs: 200,
    shakeIntensity: 0.006,
  },
} as const;

// Ative pelo console (ashenVeil.registry.set('debug:combat', true)) para
// desenhar hitboxes (vermelho) e hurtboxes (azul).
export const COMBAT_DEBUG_REGISTRY_KEY = 'debug:combat';
