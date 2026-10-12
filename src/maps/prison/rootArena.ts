import { playSound } from '../../systems/SoundEffects';
import Phaser from 'phaser';

import { GroundMessage } from '../../entities/world/GroundMessage';
import { ROOT_OF_CONDEMNED } from '../../data/bosses';
import { SEWER_BACKGROUND, SEWER_BOSS_GATE } from '../../data/sewerSprites';
import { RootBoss, type RootGround } from '../../entities/bosses/RootBoss';
import type { Player } from '../../entities/player/Player';
import { grantReward } from '../../systems/Rewards';
import type { WorldState } from '../../systems/WorldState';
import { showAreaTitle } from '../../ui/AreaTitle';
import type { Room, SlowZone } from '../types';
import { addTorchGlow, createStaticCollider, FLOOR_Y } from './prisonKit';
import { addHangingPlant, addSewerPiece, addShallowWater, addWaterfall } from './sewerKit';

// Sumidouro dos Condenados: reservatório alto onde a Raiz dos Condenados vive
// (05_documentacao/cenarios/ARENA_RAIZ_DOS_CONDENADOS.md). O piso é contínuo e
// seco, e o centro fica livre para ler o corpo e os ataques do boss; a
// grandiosidade vem das camadas de fundo, do teto em abóbada e do ninho de
// raízes ao fundo, de onde ele emerge.
const WIDTH = 3000;
const CEILING_Y = -560;
const CENTER_X = WIDTH / 2;
const GATE_X = 190;

// Tintas: pedra roxo-carvão; o verde fica no lodo, na água e nas raízes.
const STONE_TINT = 0xb8aec4;
const MID_TINT = 0x857d96;
const FAR_TINT = 0x9a98b4;
const ROOT_TINT = 0x8f9478;
const SILHOUETTE = 0x0c0b10;
// O ninho fica mais escuro que o boss, para o corpo dele se destacar na frente.
const CRADLE_TINT = 0x4f5244;

// Fosso Afogado: embaixo da arena, escondido até a Raiz arrastar o jogador.
// Mais estreito, alagado de ponta a ponta (a água atrasa o passo) e verde.
const ARENA_BOTTOM = FLOOR_Y + 200;
const PIT_FLOOR_Y = FLOOR_Y + 1150;
const PIT_TOP = PIT_FLOOR_Y - 950;
const PIT_LEFT = 340;
const PIT_RIGHT = WIDTH - 340;
const PIT_TINT = 0x6f9480;
const PIT_FAR_TINT = 0x3e6450;
const FADE_GREEN = [8, 34, 20] as const;
// Depois do fade, a Raiz espera o jogador começar a se levantar para emergir.
const PIT_BOSS_DELAY_MS = 650;
const RETURN_DELAY_MS = 3600;
// Comporta do outro lado: abre com a Raiz vencida e sobe às Galerias Alagadas,
// junto do bueiro (atalho de volta para antes dos esgotos).
const SHORTCUT_X = WIDTH - 200;

export function createRootArena(scene: Phaser.Scene, world: WorldState): Room {
  addFarLayer(scene);
  addMidArches(scene);
  addBackReservoir(scene);
  addNearWall(scene);
  addVault(scene);
  addRootCradle(scene);
  addSideRootWalls(scene);
  addFloorAndChannel(scene);
  addLighting(scene);
  addSpores(scene);
  addForegroundRoots(scene);
  addMarginProps(scene);
  addDrownedPit(scene);

  let player: Player | undefined;
  let inPit = false;
  const slowZones: SlowZone[] = [];
  const camera = scene.cameras.main;
  const arenaView = { x: 0, y: CEILING_Y - 40, width: WIDTH, height: ARENA_BOTTOM - CEILING_Y + 40 };
  const pitView = { x: 0, y: PIT_TOP, width: WIDTH, height: PIT_FLOOR_Y + 200 - PIT_TOP };
  const pitGround: RootGround = { x: CENTER_X + 380, floorY: PIT_FLOOR_Y, minX: PIT_LEFT + 160, maxX: PIT_RIGHT - 160 };

  // Raízes agarram o jogador, ele afunda, a tela fica verde e ele sai no
  // fosso; a Raiz emerge lá, curada e brilhando.
  const dragToPit = (): void => {
    if (!player?.isAlive || !boss) {
      return;
    }

    const caught = player;
    spawnGrabbingRoots(scene, caught.x, FLOOR_Y);
    caught.dragUnder(() => {
      camera.fadeOut(ROOT_OF_CONDEMNED.drowning.dragMs, ...FADE_GREEN);
      camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        inPit = true;
        slowZones.push({
          fromX: PIT_LEFT,
          toX: PIT_RIGHT,
          floorY: PIT_FLOOR_Y,
          speedFactor: ROOT_OF_CONDEMNED.drowning.waterSpeedFactor,
        });
        camera.setBounds(pitView.x, pitView.y, pitView.width, pitView.height);
        const riseX = PIT_LEFT + 260;
        camera.centerOn(riseX, PIT_FLOOR_Y - 200);
        caught.riseAt(riseX, PIT_FLOOR_Y);
        spawnGrabbingRoots(scene, riseX, PIT_FLOOR_Y);
        camera.fadeIn(900, ...FADE_GREEN);
        showAreaTitle(scene, 'Fosso Afogado', 'A Raiz bebe o lodo e renasce');
        scene.time.delayedCall(PIT_BOSS_DELAY_MS, () => boss.submerge(pitGround));
      });
    });
  };

  // Vencida no fosso, as raízes devolvem o jogador ao piso da arena.
  const returnFromPit = (): void => {
    if (!inPit || !player?.isAlive) {
      return;
    }

    const freed = player;
    freed.dragUnder(() => {
      camera.fadeOut(500, 4, 3, 8);
      camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        inPit = false;
        slowZones.length = 0;
        camera.setBounds(arenaView.x, arenaView.y, arenaView.width, arenaView.height);
        camera.centerOn(CENTER_X, FLOOR_Y - 200);
        freed.riseAt(CENTER_X, FLOOR_Y);
        camera.fadeIn(800, 4, 3, 8);
      });
    });
  };

  // Portões: o de entrada (fecha durante a luta) e uma comporta do outro lado.
  const gate = scene.add
    .image(GATE_X, FLOOR_Y + 4, SEWER_BOSS_GATE.key, SEWER_BOSS_GATE.openFrame)
    .setOrigin(0.5, 1)
    .setScale(0.55)
    .setDepth(4);
  const isDefeated = (): boolean => world.hasFlag(ROOT_OF_CONDEMNED.defeatedFlag);
  const sluice = addSewerPiece(scene, 'pipes', isDefeated() ? 'sluice-open' : 'sluice-closed', SHORTCUT_X, FLOOR_Y, 0.95, 4, {
    tint: STONE_TINT,
  });

  // A Raiz dorme no ninho até o jogador entrar na arena; derrotada, não volta.
  const boss = isDefeated()
    ? undefined
    : new RootBoss(scene, {
        x: CENTER_X,
        floorY: FLOOR_Y,
        minX: 330,
        maxX: WIDTH - 330,
        onEngaged: () => {
          gate.setFrame(SEWER_BOSS_GATE.closedFrame);
          playSound(scene, 'arenaClose', gate);
          scene.cameras.main.shake(400, 0.004);
        },
        onDefeated: () => {
          world.setFlag(ROOT_OF_CONDEMNED.defeatedFlag);
          // Vencer no fosso, mais difícil, rende mais.
          const { drowned, normal } = ROOT_OF_CONDEMNED.rewards;
          grantReward(scene.game, world, inPit ? drowned : normal);
          scene.time.delayedCall(2500, () => {
            gate.setFrame(SEWER_BOSS_GATE.openFrame);
            sluice.setFrame('sluice-open');
            playSound(scene, 'arenaOpen', gate);
          });
          scene.time.delayedCall(RETURN_DELAY_MS, returnFromPit);
        },
        // No cooperativo a Raiz é uma só: arrastando um, arrasta os dois.
        onDrowning: dragToPit,
      });

  return {
    title: 'Sumidouro dos Condenados',
    groundMessages: [
      new GroundMessage(scene, { x: 620, floorY: FLOOR_Y, text: 'Raízes que brotam do chão agarram. Não deixe que te enraízem.' }),
    ],
    subtitle: 'Esgotos do Grilhão · Reservatório',
    floorY: FLOOR_Y,
    bounds: { x: 0, y: CEILING_Y - 40, width: WIDTH, height: PIT_FLOOR_Y + 200 - CEILING_Y + 40 },
    cameraBounds: arenaView,
    zoom: 0.8,
    entries: { sewers: { x: 390, facing: 'right' } },
    exits: [],
    passages: [
      {
        x: GATE_X,
        floorY: FLOOR_Y,
        label: 'Voltar aos esgotos',
        toRoom: 'prison-sewers',
        toEntry: 'root-arena',
        isOpen: () => !boss?.isEngaged,
      },
      {
        x: SHORTCUT_X,
        floorY: FLOOR_Y,
        label: 'Subir às Galerias Alagadas',
        toRoom: 'prison-drowned-galleries',
        toEntry: 'sewer',
        isOpen: () => isDefeated() && !inPit,
      },
    ],
    bosses: boss ? [boss] : [],
    slowZones,
    onPlayerSpawned: (spawned) => {
      player = spawned;
    },
    colliders: [
      createStaticCollider(scene, WIDTH / 2, FLOOR_Y + 24, WIDTH, 48),
      createStaticCollider(scene, 16, 0, 32, 1600),
      createStaticCollider(scene, WIDTH - 16, 0, 32, 1600),
      createStaticCollider(scene, WIDTH / 2, PIT_FLOOR_Y + 24, WIDTH, 48),
      createStaticCollider(scene, PIT_LEFT - 16, PIT_FLOOR_Y - 400, 32, 900),
      createStaticCollider(scene, PIT_RIGHT + 16, PIT_FLOOR_Y - 400, 32, 900),
    ],
    gates: [],
    pickups: [],
    enemies: [],
    stairs: [],
  };
}

// Panorama do reservatório ao longe, cobrindo toda a altura, bem devagar.
function addFarLayer(scene: Phaser.Scene): void {
  scene.add.rectangle(0, CEILING_Y - 40, WIDTH, FLOOR_Y - CEILING_Y + 260, 0x07090c).setOrigin(0).setDepth(0);

  const frame = scene.textures.getFrame(SEWER_BACKGROUND.key);
  const height = FLOOR_Y - CEILING_Y + 120;
  const scale = height / frame.height;
  const width = frame.width * scale;

  for (let x = -200, index = 0; x < WIDTH * 0.3 + width; x += width, index += 1) {
    scene.add
      .image(x, CEILING_Y - 20, SEWER_BACKGROUND.key)
      .setOrigin(0, 0)
      .setScale(scale)
      .setFlipX(index % 2 === 1)
      .setScrollFactor(0.3, 1)
      .setDepth(0.2)
      .setTint(FAR_TINT);
  }
}

// Arcos gigantes no plano do meio, escuros e com parallax intermediário.
function addMidArches(scene: Phaser.Scene): void {
  for (let x = 0; x < WIDTH * 0.65 + 900; x += 640) {
    addSewerPiece(scene, 'architecture', 'arch-big', x, FLOOR_Y - 60, 2.6, 0.6, { tint: MID_TINT, scrollFactor: 0.65 });
    addSewerPiece(scene, 'architecture', 'column', x + 320, FLOOR_Y - 60, 2.4, 0.65, { tint: MID_TINT, scrollFactor: 0.65 });
  }
}

// Reservatório ao fundo: poças, rochas e água entre os arcos e o ninho.
function addBackReservoir(scene: Phaser.Scene): void {
  const pieces: ReadonlyArray<readonly [string, number, number]> = [
    ['pool-rocks', 700, 0.8],
    ['rocks-in-water', 1100, 0.75],
    ['pool-rocks', 1950, 0.8],
    ['rocks-in-water', 2350, 0.75],
  ];

  for (const [frame, x, scale] of pieces) {
    addSewerPiece(scene, 'channels', frame, x, FLOOR_Y - 40, scale, 1.4, { tint: MID_TINT });
  }

  addShallowWater(scene, 0, WIDTH, FLOOR_Y - 70, 0.6, 1.3, 0.55);
}

// Parede próxima: faixa baixa de pedra com canos e as cachoeiras.
function addNearWall(scene: Phaser.Scene): void {
  for (let x = 120, index = 0; x < WIDTH; x += 300, index += 1) {
    const isBehindCradle = Math.abs(x - CENTER_X) < 380;

    if (!isBehindCradle) {
      addSewerPiece(scene, 'architecture', index % 2 ? 'wall-moss' : 'wall-seep', x, FLOOR_Y, 0.85, 1.8, { tint: MID_TINT });
    }
  }

  for (const x of [520, 980, 2020, 2480]) {
    addSewerPiece(scene, 'architecture', 'column', x, FLOOR_Y + 4, 1.35, 2.6, { tint: STONE_TINT });
  }

  addSewerPiece(scene, 'pipes', 'pipe-h', 760, FLOOR_Y - 330, 0.8, 2.2, { tint: MID_TINT });
  addSewerPiece(scene, 'pipes', 'valve', 1180, FLOOR_Y - 300, 0.7, 2.2, { tint: MID_TINT });
  addSewerPiece(scene, 'pipes', 'pipe-h', 1820, FLOOR_Y - 330, 0.8, 2.2, { tint: MID_TINT, flipX: true });
  addSewerPiece(scene, 'pipes', 'tank', 2260, FLOOR_Y - 260, 0.7, 2.2, { tint: MID_TINT });

  for (const x of [760, 1180, 1820, 2260]) {
    addWaterfall(scene, x, FLOOR_Y + 6, 0.62, 2.8);
  }
}

// Teto em abóbada: lajes molhadas e raízes enormes descendo.
function addVault(scene: Phaser.Scene): void {
  const scale = 0.85;
  const step = 330 * scale;

  for (let x = 0, index = 0; x < WIDTH + step; x += step, index += 1) {
    addSewerPiece(scene, 'architecture', index % 3 === 1 ? 'bridge-arch' : 'floor-wet', x, CEILING_Y + 90, scale, 7, {
      tint: MID_TINT,
      flipX: index % 2 === 1,
    });
  }

  const roots = ['roots-long', 'overgrowth-big', 'roots-a', 'vine-garland', 'roots-b', 'moss-curtain'];
  for (let x = 80, index = 0; x < WIDTH; x += Phaser.Math.Between(150, 230), index += 1) {
    // Perto do centro as raízes descem mais: o teto "aponta" para o ninho.
    const nearCenter = 1 - Math.min(1, Math.abs(x - CENTER_X) / CENTER_X);
    addHangingPlant(scene, roots[index % roots.length], x, CEILING_Y + 60, 0.8 + nearCenter * 0.7, 7.5, { tint: ROOT_TINT });
  }
}

// Ninho da Raiz no fundo do centro: monte de raízes, ossos e lodo com um
// brilho verde pulsando, de onde o boss vai emergir.
function addRootCradle(scene: Phaser.Scene): void {
  const glow = scene.add
    .ellipse(CENTER_X, FLOOR_Y - 120, 760, 420, 0x5fd07a, 0.12)
    .setDepth(2.9)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.06, to: 0.2 },
    scaleX: { from: 0.94, to: 1.06 },
    duration: 2600,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1,
  });

  const mound: ReadonlyArray<readonly [string, string, number, number, number, boolean]> = [
    ['vegetation', 'overgrowth-big', CENTER_X, FLOOR_Y - 10, 1.9, false],
    ['vegetation', 'roots-b', CENTER_X - 300, FLOOR_Y + 4, 1.4, true],
    ['vegetation', 'roots-a', CENTER_X + 300, FLOOR_Y + 4, 1.4, false],
    ['vegetation', 'roots-long', CENTER_X - 120, FLOOR_Y - 140, 1.3, false],
    ['props', 'nest', CENTER_X - 180, FLOOR_Y + 2, 0.8, false],
    ['props', 'skeleton', CENTER_X + 170, FLOOR_Y + 2, 0.6, true],
    ['props', 'sludge-bubbles', CENTER_X, FLOOR_Y + 4, 0.9, false],
    ['props', 'skeleton', CENTER_X - 360, FLOOR_Y + 2, 0.5, false],
  ];

  for (const [atlas, frame, x, y, scale, flipX] of mound) {
    addSewerPiece(scene, atlas as 'vegetation' | 'props', frame, x, y, scale, 3.2, { tint: CRADLE_TINT, flipX });
  }
}

// Paredes de raízes nas duas pontas, emoldurando a arena.
function addSideRootWalls(scene: Phaser.Scene): void {
  for (const [x, flipX] of [[60, false], [WIDTH - 60, true]] as const) {
    for (let y = FLOOR_Y + 10, index = 0; y > CEILING_Y; y -= 260, index += 1) {
      addSewerPiece(scene, 'vegetation', index % 2 ? 'roots-a' : 'overgrowth-big', x, y, 1.2, 4.5, {
        tint: ROOT_TINT,
        flipX,
      });
    }
  }
}

// Piso de pedra molhada contínuo e o canal animado logo abaixo, na frente.
function addFloorAndChannel(scene: Phaser.Scene): void {
  const scale = 0.62;
  const step = 330 * scale;

  for (let x = step / 2, index = 0; x < WIDTH + step; x += step, index += 1) {
    addSewerPiece(scene, 'architecture', 'floor-wet', x, FLOOR_Y - 8, scale, 6, {
      originY: 0,
      tint: STONE_TINT,
      flipX: index % 2 === 0,
    });

    if (index % 3 === 0) {
      addHangingPlant(scene, 'moss-curtain', x, FLOOR_Y + 42, 0.35, 6.2);
    }
  }

  addShallowWater(scene, 0, WIDTH, FLOOR_Y + 85, 0.55, 12, 0.9);

  for (const x of [700, 1500, 2300]) {
    const mist = scene.add
      .ellipse(x, FLOOR_Y + 30, 900, 60, 0x769268, 0.08)
      .setDepth(11)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: mist, x: x + 120, alpha: 0.03, duration: 6000 + x, ease: 'Sine.InOut', yoyo: true, repeat: -1 });
  }
}

// Feixes de luz pálida entrando por fendas do teto e tochas nas laterais.
function addLighting(scene: Phaser.Scene): void {
  for (const [x, width] of [[880, 160], [CENTER_X, 260], [2150, 160]] as const) {
    const shaft = scene.add
      .rectangle(x, CEILING_Y + 80, width, FLOOR_Y - CEILING_Y, 0xb8d8c8, 0.08)
      .setOrigin(0.5, 0)
      .setDepth(5)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: shaft, alpha: { from: 0.05, to: 0.12 }, duration: 3800, yoyo: true, repeat: -1 });
  }

  for (const x of [420, 2580]) {
    addTorchGlow(scene, x, FLOOR_Y - 240);
  }
}

// Esporos verdes subindo devagar do ninho e do lodo.
function addSpores(scene: Phaser.Scene): void {
  scene.time.addEvent({
    delay: 180,
    loop: true,
    callback: () => {
      const fromCradle = Math.random() < 0.6;
      const x = fromCradle ? CENTER_X + Phaser.Math.Between(-380, 380) : Phaser.Math.Between(100, WIDTH - 100);
      const spore = scene.add
        .circle(x, FLOOR_Y - Phaser.Math.Between(0, 40), Phaser.Math.FloatBetween(1, 2.6), 0x9fe08a, 0.7)
        .setDepth(9)
        .setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({
        targets: spore,
        y: spore.y - Phaser.Math.Between(220, 520),
        x: spore.x + Phaser.Math.Between(-60, 60),
        alpha: 0,
        duration: Phaser.Math.Between(4000, 7000),
        ease: 'Sine.Out',
        onComplete: () => spore.destroy(),
      });
    },
  });
}

// Raízes escuras em primeiro plano, passando mais rápido que a cena.
function addForegroundRoots(scene: Phaser.Scene): void {
  for (const x of [240, 1050, 1950, 2780]) {
    addHangingPlant(scene, x % 2 ? 'roots-long' : 'overgrowth-big', x, CEILING_Y + 20, 1.5, 14, {
      tint: SILHOUETTE,
      scrollFactor: 1.25,
    });
  }

  for (const x of [600, 2400]) {
    addSewerPiece(scene, 'vegetation', 'roots-b', x, FLOOR_Y + 190, 1.1, 14, {
      tint: SILHOUETTE,
      alpha: 0.85,
      scrollFactor: 1.25,
    });
  }
}

// Detalhes nas margens (o miolo fica livre para a luta).
function addMarginProps(scene: Phaser.Scene): void {
  const floor: ReadonlyArray<readonly [string, number, number]> = [
    ['skeleton', 520, 0.42],
    ['mushrooms-green', 660, 0.32],
    ['barrel-spilled', 2560, 0.45],
    ['mushrooms-purple', 2420, 0.32],
    ['spike-grate', 2700, 0.4],
  ];

  for (const [frame, x, scale] of floor) {
    addSewerPiece(scene, 'props', frame, x, FLOOR_Y + 4, scale, 7, { tint: STONE_TINT });
  }

  for (const [frame, x] of [['cage', 430], ['hooks', 2650], ['gas-sac', 1150], ['cage', 1880]] as const) {
    addHangingPlant(scene, 'vine-thin', x, CEILING_Y + 80, 0.6, 3.5);
    addSewerPiece(scene, 'props', frame, x, CEILING_Y + 260, 0.6, 3.6, { originY: 0, tint: STONE_TINT });
  }
}

// Raízes verdes brotando em volta dos pés de quem é agarrado.
function spawnGrabbingRoots(scene: Phaser.Scene, x: number, floorY: number): void {
  const frames = ['roots-a', 'roots-b', 'vine-thick', 'roots-long'];

  frames.forEach((frame, index) => {
    const side = index % 2 ? 1 : -1;
    const root = addSewerPiece(scene, 'vegetation', frame, x + side * (16 + index * 10), floorY + 6, 0.42, 10.6, {
      tint: 0x9fe08a,
      flipX: side > 0,
    });
    root.setScale(0.42, 0);
    scene.tweens.chain({
      targets: root,
      tweens: [
        { scaleY: 0.42, duration: 260, delay: index * 70, ease: 'Back.Out' },
        { alpha: 0, duration: 500, delay: 900 },
      ],
      onComplete: () => root.destroy(),
    });
  });

  const glow = scene.add
    .ellipse(x, floorY - 4, 160, 26, 0x6adf8a, 0.6)
    .setDepth(10.4)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: glow, alpha: 0, scaleX: 1.6, duration: 1400, onComplete: () => glow.destroy() });
}

// Fosso Afogado: reservatório inundado embaixo da arena, mais estreito e
// verde, com água até a canela de ponta a ponta e cachoeiras despejando.
function addDrownedPit(scene: Phaser.Scene): void {
  scene.add.rectangle(0, ARENA_BOTTOM, WIDTH, PIT_FLOOR_Y + 220 - ARENA_BOTTOM, 0x030907).setOrigin(0).setDepth(0);

  const frame = scene.textures.getFrame(SEWER_BACKGROUND.key);
  const height = PIT_FLOOR_Y - PIT_TOP + 60;
  const scale = height / frame.height;
  for (let x = -200, index = 0; x < WIDTH * 0.3 + frame.width * scale; x += frame.width * scale, index += 1) {
    scene.add
      .image(x, PIT_TOP, SEWER_BACKGROUND.key)
      .setOrigin(0, 0)
      .setScale(scale)
      .setFlipX(index % 2 === 0)
      .setScrollFactor(0.3, 1)
      .setDepth(0.2)
      .setTint(PIT_FAR_TINT);
  }

  for (let x = 0; x < WIDTH * 0.65 + 900; x += 600) {
    addSewerPiece(scene, 'architecture', 'arch-big', x, PIT_FLOOR_Y - 40, 2.2, 0.6, { tint: PIT_FAR_TINT, scrollFactor: 0.65 });
  }

  // Parede de trás, molhada, com canos despejando cachoeiras no fosso.
  for (let x = PIT_LEFT, index = 0; x < PIT_RIGHT + 200; x += 280, index += 1) {
    addSewerPiece(scene, 'architecture', index % 2 ? 'wall-moss' : 'wall-seep', x, PIT_FLOOR_Y, 0.82, 1.8, { tint: PIT_TINT });
  }
  for (const x of [600, 1050, 1500, 1950, 2400]) {
    addSewerPiece(scene, 'pipes', 'pipe-broken', x, PIT_FLOOR_Y - 300, 0.7, 2.2, { tint: PIT_TINT });
    addWaterfall(scene, x, PIT_FLOOR_Y + 6, 0.7, 2.8);
  }
  for (const x of [820, 1730, 2180]) {
    addSewerPiece(scene, 'architecture', 'column-broken', x, PIT_FLOOR_Y + 4, 1.2, 2.6, { tint: PIT_TINT });
  }

  // Teto baixo de raízes e musgo, e paredes de raízes nas pontas.
  const roots = ['roots-long', 'moss-curtain', 'vine-garland', 'roots-a', 'overgrowth-big', 'vine-thick'];
  for (let x = PIT_LEFT - 100, index = 0; x < PIT_RIGHT + 100; x += Phaser.Math.Between(120, 190), index += 1) {
    addHangingPlant(scene, roots[index % roots.length], x, PIT_TOP + 10, Phaser.Math.FloatBetween(0.8, 1.3), 7.5, { tint: 0x86a873 });
  }
  for (const [x, flipX] of [[PIT_LEFT - 40, false], [PIT_RIGHT + 40, true]] as const) {
    for (let y = PIT_FLOOR_Y + 10, index = 0; y > PIT_TOP; y -= 240, index += 1) {
      addSewerPiece(scene, 'vegetation', index % 2 ? 'roots-a' : 'overgrowth-big', x, y, 1.15, 4.5, { tint: 0x86a873, flipX });
    }
  }

  // Piso afundado e água em duas camadas: atrás e na frente das pernas.
  const floorScale = 0.62;
  const step = 330 * floorScale;
  for (let x = PIT_LEFT, index = 0; x < PIT_RIGHT + step; x += step, index += 1) {
    addSewerPiece(scene, 'architecture', 'floor-wet', x, PIT_FLOOR_Y - 8, floorScale, 6, {
      originY: 0,
      tint: 0x5f7d6a,
      flipX: index % 2 === 0,
    });
  }
  addShallowWater(scene, PIT_LEFT - 200, PIT_RIGHT + 200, PIT_FLOOR_Y - 46, 0.6, 3, 0.75);
  addShallowWater(scene, PIT_LEFT - 200, PIT_RIGHT + 200, PIT_FLOOR_Y - 22, 0.62, 10.8, 0.72);
  addShallowWater(scene, 0, WIDTH, PIT_FLOOR_Y + 70, 0.6, 12, 0.95);

  // Brilho verde de lodo no fundo e névoa sobre a água.
  const glow = scene.add
    .ellipse(WIDTH / 2, PIT_FLOOR_Y - 160, 2200, 520, 0x5fd07a, 0.08)
    .setDepth(2.9)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: glow, alpha: { from: 0.05, to: 0.14 }, duration: 2200, yoyo: true, repeat: -1 });

  for (const x of [700, 1500, 2300]) {
    const mist = scene.add
      .ellipse(x, PIT_FLOOR_Y - 20, 1000, 90, 0x7fb08a, 0.1)
      .setDepth(11)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: mist, x: x + 140, alpha: 0.04, duration: 5000 + x, ease: 'Sine.InOut', yoyo: true, repeat: -1 });
  }

  for (const x of [900, WIDTH / 2, 2100]) {
    const shaft = scene.add
      .rectangle(x, PIT_TOP, 180, PIT_FLOOR_Y - PIT_TOP, 0x9fe0b0, 0.06)
      .setOrigin(0.5, 0)
      .setDepth(5)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: shaft, alpha: { from: 0.03, to: 0.09 }, duration: 3000, yoyo: true, repeat: -1 });
  }
}
