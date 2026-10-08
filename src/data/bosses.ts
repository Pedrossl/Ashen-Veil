import type { HitboxDefinition } from './combat';

// Golpe do boss em fases: aviso legível, janela de acerto e brecha para punir.
export type BossAttackDefinition = {
  damage: number;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  hitbox: HitboxDefinition;
};

// Valores provisórios; a dificuldade deve vir de leitura e timing.
export const REAPER_KING = {
  id: 'reaper-king',
  name: 'Rei Ceifador',
  defeatedFlag: 'boss-defeated:reaper-king',
  maxHealth: 320,
  runSpeed: 290,
  // O boss desperta quando o jogador passa desta linha da arena.
  awakenX: 900,
  // Corpo vulnerável, a partir dos pés.
  hurtbox: { width: 170, height: 260 },
  // Distâncias horizontais entre o boss e o jogador.
  slashRange: 270,
  throwRange: { min: 260, max: 620 },
  // Corre no máximo por este tempo antes de reavaliar (evita perseguição eterna).
  maxRunMs: 1600,
  // Pausa entre ações; o jitter quebra o ritmo previsível.
  cooldownMs: 480,
  cooldownJitterMs: 380,
  // Chances (0–1) de escolher cada ação quando várias são possíveis.
  throwChance: 0.5,
  teleportChance: 0.32,
  // Ao teleportar, aparece a esta distância do jogador.
  teleportDistance: 250,
  introMs: 1300,
  slash: {
    damage: 32,
    windupMs: 440,
    activeMs: 170,
    recoveryMs: 440,
    // Estocada horizontal: a lâmina avança à frente do tronco, na altura do
    // peito. É comprida, mas não acerta atrás nem cobre o chão inteiro.
    hitbox: { forward: 20, up: 180, width: 330, height: 120 },
  },
  throwScythe: {
    damage: 26,
    windupMs: 560,
    activeMs: 260,
    recoveryMs: 500,
    // A foice espectral voa longe, na altura do peito.
    hitbox: { forward: 40, up: 200, width: 560, height: 110 },
  },
  // Segunda fase: com metade da vida ele brilha mais forte, acelera tudo e
  // passa a arremessar a foice girando enquanto flutua sem ela.
  phaseTwo: {
    healthRatio: 0.5,
    // Divide avisos, pausas e recuperações; multiplica corrida e flutuação.
    speedMultiplier: 1.35,
    enrageMs: 1500,
    flingChance: 0.45,
    fling: {
      damage: 24,
      windupMs: 360,
      releaseMs: 120,
      // A foice vai até esta distância (ou até a parede) e volta para a mão.
      maxDistance: 900,
      outSpeed: 980,
      returnSpeed: 1150,
      spinDegreesPerSecond: 1080,
      // Área da foice girando, centrada nela.
      hitbox: { width: 130, height: 100 },
      // Enquanto a foice voa, ele flutua de mão vazia pela arena.
      glideSpeed: 230,
      // Altura (acima dos pés) por onde a foice voa.
      flightHeight: 120,
    },
  },
} as const satisfies {
  slash: BossAttackDefinition;
  throwScythe: BossAttackDefinition;
} & Record<string, unknown>;

// Raiz dos Condenados (05_documentacao/bosses/RAIZ_DOS_CONDENADOS.md). Golpes
// em quadros da animação (o manifesto define os ativos); números provisórios.
export const ROOT_OF_CONDEMNED = {
  id: 'root-of-condemned',
  name: 'Raiz dos Condenados',
  defeatedFlag: 'boss-defeated:root-of-condemned',
  // Vencida na arena: +1 carga de ampola. Vencida no Fosso Afogado (luta mais
  // difícil): +2 cargas e o Anel do Fôlego Velado.
  rewards: {
    normal: { ampoules: 1, items: [] },
    drowned: { ampoules: 2, items: ['veiledBreathRing'] },
  },
  maxHealth: 420,
  crawlSpeed: 110,
  // Desperta (emerge do ninho) quando o jogador passa desta linha.
  awakenX: 800,
  hurtbox: { width: 320, height: 220 },
  // Alcances horizontais (centro a centro).
  biteRange: 290,
  sweepRange: 380,
  cageRange: 420,
  spitMinRange: 460,
  // Pausa entre decisões; a fase 3 encurta só esta pausa, nunca os avisos.
  cooldownMs: 700,
  cooldownJitterMs: 500,
  maxCrawlMs: 1800,
  // Pausa depois de se virar no fim da varredura (janela para bater de novo).
  turnAfterSweepMs: 550,
  // Fase 2 abaixo de 65% (travessia e cárcere), fase 3 abaixo de 30%.
  phaseTwoRatio: 0.65,
  phaseThreeRatio: 0.3,
  phaseThreeCooldownFactor: 0.7,
  burrowChance: 0.3,
  cageChance: 0.6,
  // Mordida à frente; varredura atrás (pega quem fica nas costas).
  bite: { damage: 30, hitbox: { forward: 50, up: 220, width: 240, height: 200 } },
  sweep: { damage: 24, hitbox: { forward: -410, up: 190, width: 460, height: 170 } },
  // Cárcere: raízes irrompem por toda a área ao redor do corpo. Ficar
  // encostado nela também é perigoso; a saída segura é deixar o alcance.
  cage: { damage: 26, safeHalfWidth: 0, reach: 420, height: 280 },
  spit: {
    damage: 22,
    mouth: { forward: 190, up: 150 },
    speed: 520,
    lift: 420,
    gravity: 900,
  },
  // Travessia: o rastro persegue o jogador, para e trava o destino antes da erupção.
  burrow: {
    chaseMs: 1700,
    trailSpeed: 260,
    lockMs: 800,
    damage: 26,
    eruptionWidth: 300,
    eruptionHeight: 250,
  },
  // Raízes no corpo: cada golpe do chão que conecta (estacas do Cárcere e
  // erupção) enche a barra verde do jogador; cheia, a Raiz o arrasta para o
  // fosso alagado. Só existe da fase 2 em diante (é quando esses golpes
  // aparecem), então ela nunca começa a luta afogada, e acontece uma vez.
  drowning: {
    max: 100,
    perHit: 35,
    decayDelayMs: 5000,
    decayPerSecond: 6,
    // Fade verde antes de chegar ao fosso.
    dragMs: 700,
    // No fosso ela volta com a vida cheia, mas fica frágil: 420 / 1,6 ≈ 262
    // de vida efetiva, o mesmo que restava no começo da fase 2; quanto mais
    // tarde o jogador se deixar arrastar, mais ele perde.
    damageTakenFactor: 1.6,
    // Mais rápida em tudo: rastejo, pausas e animações (os avisos encurtam
    // pouco, para continuar legível); o jogador anda devagar na água, mas o
    // rolamento não perde velocidade.
    crawlSpeedFactor: 1.5,
    cooldownFactor: 0.55,
    animationSpeed: 1.15,
    waterSpeedFactor: 0.55,
    glowTint: 0x9dffb0,
  },
} as const;
