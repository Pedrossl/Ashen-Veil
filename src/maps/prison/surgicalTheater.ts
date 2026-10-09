import Phaser from 'phaser';

import { CRIMSON_SURGEON } from '../../data/bosses';
import { SERVICE_ATLASES } from '../../data/serviceWingSprites';
import { CrimsonSurgeon } from '../../entities/bosses/CrimsonSurgeon';
import type { Player } from '../../entities/player/Player';
import { grantReward } from '../../systems/Rewards';
import { addAmbientSource } from '../../systems/Soundscape';
import { playSound } from '../../systems/SoundEffects';
import type { WorldState } from '../../systems/WorldState';
import type { Room, SlowZone } from '../types';
import { addBackWall, addProp, createStaticCollider, expansionPiece, FLOOR_Y, PRISON_ATLAS_KEY } from './prisonKit';

// Anfiteatro Cirúrgico: sala de operações da prisão, vista de baixo como um
// palco. Ao fundo, galerias em degraus com grades (de onde se assistia às
// cirurgias); no centro, um arco enorme sobre a mesa de operação iluminada; o
// piso tem ralos e manchas, e o sangue do soro sobe por eles quando a barra
// do Cirurgião Rubro enche (`flood`).
const WIDTH = 2800;
const CEILING_Y = -420;
const CENTER_X = 1400;
const DOOR_X = 150;
// Porta do fundo: abre com o boss vencido e leva de volta à entrada das Alas
// Esquecidas (atalho para não refazer a ala inteira).
const SHORTCUT_X = WIDTH - 150;
const STONE_TINT = 0x7a7086;
const DARK_TINT = 0x4b4456;
const FAR_TINT = 0x3a3444;
const SILHOUETTE = 0x0b080e;
const BLOOD = 0x6e0a14;
// Galerias dos espectadores: altura do parapeito e tinta (mais escuras no alto).
const TIERS = [
  { y: FLOOR_Y - 190, tint: 0x5b5367, inset: 260 },
  { y: FLOOR_Y - 360, tint: 0x4a4355, inset: 420 },
  { y: FLOOR_Y - 520, tint: 0x3a3444, inset: 560 },
] as const;
// Altura que o sangue cobre no alagamento e quanto tempo leva para subir.
const FLOOD_DEPTH = 34;
const FLOOD_RISE_MS = 1400;
const FLOOD_TICK_MS = 250;

const piece = expansionPiece(STONE_TINT);

export function createSurgicalTheater(scene: Phaser.Scene, world: WorldState): Room {
  scene.add.rectangle(WIDTH / 2, CEILING_Y - 60, WIDTH + 400, FLOOR_Y - CEILING_Y + 300, 0x07050a).setOrigin(0.5, 0).setDepth(0);
  addBackWall(scene, 0, WIDTH, FAR_TINT, CEILING_Y, FLOOR_Y + 40);
  addGalleries(scene);
  addOperatingArch(scene);
  addSideWalls(scene);
  addColumns(scene);
  addFloor(scene);
  addFurniture(scene);
  addLights(scene);
  addForeground(scene);

  let player: Player | undefined;
  const slowZones: SlowZone[] = [];
  const flood = createBloodFlood(scene, slowZones, () => player);

  // Porta de entrada: fecha durante a luta e abre de novo na vitória.
  const door = isolation(scene, 'door', DOOR_X, FLOOR_Y, 250, 8.6).setTint(STONE_TINT);
  const isDefeated = (): boolean => world.hasFlag(CRIMSON_SURGEON.defeatedFlag);
  const shortcut = isolation(scene, isDefeated() ? 'door' : 'door-closed', SHORTCUT_X, FLOOR_Y, 250, 8.6)
    .setTint(STONE_TINT)
    .setFlipX(true);

  // O Cirurgião espera ao lado da mesa e desperta quando o jogador avança.
  const boss = isDefeated()
    ? undefined
    : new CrimsonSurgeon(scene, {
        x: CENTER_X + 230,
        floorY: FLOOR_Y,
        minX: 280,
        maxX: WIDTH - 200,
        onEngaged: () => {
          door.setFrame('door-closed');
          playSound(scene, 'arenaClose', door);
          scene.cameras.main.shake(400, 0.004);
        },
        onFlood: (durationMs) => flood.start(durationMs),
        onDefeated: () => {
          world.setFlag(CRIMSON_SURGEON.defeatedFlag);
          grantReward(scene.game, world, CRIMSON_SURGEON.reward);
          flood.stop();
          scene.time.delayedCall(2200, () => {
            door.setFrame('door');
            shortcut.setFrame('door');
            playSound(scene, 'arenaOpen', shortcut);
          });
        },
      });

  return {
    title: 'Anfiteatro Cirúrgico',
    subtitle: 'Alas Esquecidas · Sala de Operações',
    floorY: FLOOR_Y,
    bounds: { x: 0, y: CEILING_Y - 40, width: WIDTH, height: FLOOR_Y + 160 - CEILING_Y + 40 },
    cameraBounds: { x: 0, y: FLOOR_Y - 820, width: WIDTH, height: 980 },
    zoom: 0.82,
    entries: { wing: { x: 300, facing: 'right' } },
    exits: [],
    passages: [
      {
        x: DOOR_X,
        floorY: FLOOR_Y,
        label: 'Voltar às Alas Esquecidas',
        toRoom: 'prison-service-wing',
        toEntry: 'theater',
        isOpen: () => !boss?.isEngaged,
      },
      {
        x: SHORTCUT_X,
        floorY: FLOOR_Y,
        label: 'Voltar à entrada das Alas',
        toRoom: 'prison-service-wing',
        toEntry: 'galleries',
        isOpen: isDefeated,
      },
    ],
    bosses: boss ? [boss] : [],
    slowZones,
    onPlayerSpawned: (spawned) => {
      player = spawned;
    },
    colliders: [
      createStaticCollider(scene, WIDTH / 2, FLOOR_Y + 30, WIDTH, 60),
      createStaticCollider(scene, 20, 0, 40, 1600),
      createStaticCollider(scene, WIDTH - 20, 0, 40, 1600),
    ],
    gates: [],
    pickups: [],
    enemies: [],
    stairs: [],
  };
}

// Sangue que sobe pelos ralos: cobre os pés, atrasa o passo e tira um pouco
// de vida por segundo, até escoar no fim do tempo (ou com o boss vencido).
function createBloodFlood(
  scene: Phaser.Scene,
  slowZones: SlowZone[],
  player: () => Player | undefined,
): { start: (durationMs: number) => void; stop: () => void } {
  const { floodDamagePerSecond, floodSpeedFactor } = CRIMSON_SURGEON.blood;
  const pool = scene.add.rectangle(0, FLOOR_Y + 6, WIDTH, FLOOD_DEPTH, BLOOD, 0.82).setOrigin(0, 1).setDepth(10.6);
  const surface = scene.add.rectangle(0, FLOOR_Y + 6, WIDTH, 4, 0xd03040, 0.55).setOrigin(0, 0.5).setDepth(10.7);
  // Reflexo vermelho subindo do sangue, em degradê (mais forte embaixo).
  const glow = scene.add.container(0, FLOOR_Y).setDepth(10.5);
  [26, 54, 90].forEach((height) =>
    glow.add(scene.add.rectangle(0, 0, WIDTH, height, 0xff1f30, 0.04).setOrigin(0, 1).setBlendMode(Phaser.BlendModes.ADD)),
  );
  [pool, surface, glow].forEach((part) => part.setVisible(false).setScale(1, 0));
  let ticker: Phaser.Time.TimerEvent | undefined;
  let ending: Phaser.Time.TimerEvent | undefined;
  let bubbles: Phaser.Time.TimerEvent | undefined;

  const stop = (): void => {
    ticker?.remove();
    ending?.remove();
    bubbles?.remove();
    ticker = ending = bubbles = undefined;
    slowZones.length = 0;
    scene.tweens.add({ targets: surface, y: FLOOR_Y + 6, duration: FLOOD_RISE_MS, ease: 'Quad.In' });
    scene.tweens.add({
      targets: [pool, surface, glow],
      scaleY: 0,
      duration: FLOOD_RISE_MS,
      ease: 'Quad.In',
      onComplete: () => [pool, surface, glow].forEach((part) => part.setVisible(false)),
    });
  };

  const start = (durationMs: number): void => {
    stop();
    scene.tweens.killTweensOf([pool, surface, glow]);
    [pool, surface, glow].forEach((part) => part.setVisible(true));
    scene.tweens.add({ targets: [pool, glow], scaleY: 1, duration: FLOOD_RISE_MS, ease: 'Quad.Out' });
    scene.tweens.add({
      targets: surface,
      scaleY: 1,
      y: FLOOR_Y + 6 - FLOOD_DEPTH,
      duration: FLOOD_RISE_MS,
      ease: 'Quad.Out',
    });
    scene.cameras.main.shake(FLOOD_RISE_MS, 0.003);
    slowZones.push({ fromX: 0, toX: WIDTH, floorY: FLOOR_Y, speedFactor: floodSpeedFactor });

    ticker = scene.time.addEvent({
      delay: FLOOD_TICK_MS,
      loop: true,
      callback: () => player()?.takeHazardDamage((floodDamagePerSecond * FLOOD_TICK_MS) / 1000),
    });
    bubbles = scene.time.addEvent({ delay: 140, loop: true, callback: () => spawnBloodBubble(scene) });
    ending = scene.time.delayedCall(durationMs, stop);
  };

  return { start, stop };
}

// Bolhinhas estourando na superfície do sangue alagado.
function spawnBloodBubble(scene: Phaser.Scene): void {
  const x = Phaser.Math.Between(40, WIDTH - 40);
  const bubble = scene.add
    .circle(x, FLOOR_Y + 6 - FLOOD_DEPTH, Phaser.Math.Between(3, 6), 0xc02234, 0.8)
    .setDepth(10.8);
  scene.tweens.add({
    targets: bubble,
    scale: 1.8,
    alpha: 0,
    duration: Phaser.Math.Between(400, 700),
    onComplete: () => bubble.destroy(),
  });
}

// ---- cenário -------------------------------------------------------------

// Brilho suave: círculos concêntricos somando luz, mais forte no centro.
function addSoftGlow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  color: number,
  alpha: number,
  depth: number,
): Phaser.GameObjects.Container {
  const glow = scene.add.container(x, y).setDepth(depth);
  for (let size = 1; size > 0.1; size -= 0.12) {
    glow.add(scene.add.circle(0, 0, radius * size, color, alpha).setBlendMode(Phaser.BlendModes.ADD));
  }
  return glow;
}

function isolation(
  scene: Phaser.Scene,
  frame: string,
  x: number,
  bottomY: number,
  height: number,
  depth: number,
): Phaser.GameObjects.Image {
  const image = scene.add.image(x, bottomY, SERVICE_ATLASES.isolation.key, frame).setOrigin(0.5, 1).setDepth(depth);
  return image.setScale(height / image.height);
}

function furniture(scene: Phaser.Scene, frame: string, x: number, height: number, depth = 8, flipX = false) {
  const image = scene.add.image(x, FLOOR_Y + 4, SERVICE_ATLASES.furniture.key, frame).setOrigin(0.5, 1).setDepth(depth);
  return image.setScale(height / image.height).setFlipX(flipX);
}

// Galerias em degraus: parapeito de pedra, grade e um vão escuro atrás, cada
// andar mais recuado e mais escuro, como num teatro de anatomia.
function addGalleries(scene: Phaser.Scene): void {
  TIERS.forEach((tier, index) => {
    const from = tier.inset;
    const to = WIDTH - tier.inset;
    scene.add.rectangle(WIDTH / 2, tier.y, to - from, 150, 0x050307, 0.9).setOrigin(0.5, 1).setDepth(1.2 + index * 0.01);

    for (let x = from; x < to; x += 300) {
      const wall = isolation(scene, index === 0 ? 'wall-window' : 'wall-marked', x + 150, tier.y - 40, 170, 1.25);
      wall.setDisplaySize(300, 170).setTint(tier.tint);
    }

    for (let x = from; x < to; x += 230) {
      addProp(scene, piece('corridors', 'platform-long', x + 115, tier.y + 30, 0.42, 1.4, { tint: tier.tint }));
      addProp(scene, piece('cells', 'fence', x + 115, tier.y - 18, 0.36, 1.45, { tint: tier.tint }));
    }
  });
}

// Arco central sobre a mesa de operação, com a lâmpada pendurada e o brilho
// vermelho do soro vindo do fundo.
function addOperatingArch(scene: Phaser.Scene): void {
  scene.add.rectangle(CENTER_X, FLOOR_Y, 640, 520, 0x040205, 0.96).setOrigin(0.5, 1).setDepth(1.6);
  const back = addSoftGlow(scene, CENTER_X, FLOOR_Y - 150, 240, 0xb0121e, 0.022, 1.65);
  scene.tweens.add({ targets: back, alpha: { from: 0.6, to: 1 }, duration: 2400, ease: 'Sine.InOut', yoyo: true, repeat: -1 });

  isolation(scene, 'arch-left', CENTER_X - 230, FLOOR_Y + 8, 560, 1.7).setTint(DARK_TINT);
  isolation(scene, 'arch-right', CENTER_X + 230, FLOOR_Y + 8, 560, 1.7).setTint(DARK_TINT);
  isolation(scene, 'lintel', CENTER_X, FLOOR_Y - 480, 120, 1.75).setTint(DARK_TINT).setDisplaySize(470, 120);

  // Degraus do estrado e a mesa de operação.
  addProp(scene, piece('corridors', 'stone-steps', CENTER_X, FLOOR_Y + 6, 0.55, 7.6, { tint: STONE_TINT }));
  furniture(scene, 'stretcher', CENTER_X - 20, 150, 7.8).setTint(0xc8b8c0);
  scene.add.ellipse(CENTER_X - 10, FLOOR_Y + 2, 300, 22, BLOOD, 0.55).setDepth(6.5);

  // Lâmpada cirúrgica: correntes do alto e um cone de luz pálida na mesa.
  addProp(scene, { frame: 'hanging-chains', x: CENTER_X - 20, bottomY: FLOOR_Y - 330, scale: 1.4, depth: 2, tint: DARK_TINT });
  const lamp = addSoftGlow(scene, CENTER_X - 20, FLOOR_Y - 320, 40, 0xffe9c8, 0.07, 2.1);
  const cone = scene.add
    .triangle(CENTER_X - 20, FLOOR_Y - 320, 0, 0, -170, 300, 170, 300, 0xfff0d6, 0.035)
    .setOrigin(0.5, 0)
    .setDepth(11.5)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: [lamp, cone], alpha: { from: 0.75, to: 1 }, duration: 160, yoyo: true, repeat: -1, repeatDelay: 2600 });
}

// Paredes de isolamento nas pontas, com a porta de entrada à esquerda.
function addSideWalls(scene: Phaser.Scene): void {
  for (const [from, to] of [[0, 520], [WIDTH - 480, WIDTH]] as const) {
    for (let x = from; x < to; x += 240) {
      const frame = x % 480 === 0 ? 'wall-worn' : 'wall';
      isolation(scene, frame, x + 120, FLOOR_Y + 4, 330, 2).setDisplaySize(244, 330).setTint(STONE_TINT);
    }
  }
}

function addColumns(scene: Phaser.Scene): void {
  for (const x of [520, 900, 1900, 2300]) {
    isolation(scene, 'column', x, FLOOR_Y + 8, 430, 5).setTint(STONE_TINT);
  }
  isolation(scene, 'column-broken', 2600, FLOOR_Y + 8, 300, 5).setTint(STONE_TINT);
}

// Piso de lajes com faixas de ferro, ralos no meio e manchas de sangue.
function addFloor(scene: Phaser.Scene): void {
  for (let x = 0, index = 0; x < WIDTH; x += 160, index += 1) {
    const frame = index % 5 === 2 ? 'floor-banded' : 'floor';
    const image = scene.add.image(x, FLOOR_Y, SERVICE_ATLASES.isolation.key, frame).setOrigin(0, 0).setDepth(6);
    const top = Math.round(image.height * 0.43);
    image.setCrop(0, top, image.width, image.height - top);
    image.setDisplaySize(162, 100);
    image.y -= top * image.scaleY;
  }

  for (const x of [700, 1150, 1700, 2150]) {
    addProp(scene, piece('damp', 'floor-grate', x, FLOOR_Y + 22, 0.32, 6.3, { tint: DARK_TINT }));
  }

  for (const [x, width] of [[640, 180], [980, 120], [1650, 220], [2080, 150], [2420, 110]] as const) {
    scene.add.ellipse(x, FLOOR_Y + 3, width, 14, BLOOD, 0.45).setDepth(6.4);
  }
}

// Móveis da enfermaria: caldeirão de sangue, bancada de ferramentas, armário
// de chaves, macas e gaiolas penduradas.
function addFurniture(scene: Phaser.Scene): void {
  furniture(scene, 'cauldron', 640, 130).setTint(0xb8a8b0);
  const boil = scene.add
    .ellipse(632, FLOOR_Y - 104, 130, 34, 0xff2a3a, 0.25)
    .setDepth(8.1)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: boil, alpha: { from: 0.4, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
  furniture(scene, 'bench', 2120, 120).setTint(0xb8a8b0);
  furniture(scene, 'keys', 2470, 200, 4).setTint(0x9a8e98);
  furniture(scene, 'stretcher', 1000, 105, 7.5, true).setTint(0x9a8e98);

  for (const x of [760, 2040]) {
    addProp(scene, { frame: 'hanging-cage', x, bottomY: FLOOR_Y - 300, scale: 1, depth: 3, tint: DARK_TINT });
  }
  for (const x of [380, 1150, 1700, 2420]) {
    addProp(scene, { frame: 'hanging-chains', x, bottomY: FLOOR_Y - 360, scale: 1.1, depth: 2.5, tint: DARK_TINT });
  }
}

// Tochas de pé dos dois lados e frascos de soro acesos nas paredes.
function addLights(scene: Phaser.Scene): void {
  for (const x of [330, 1080, 1720, 2480]) {
    addProp(scene, { frame: 'standing-torch-tall', x, bottomY: FLOOR_Y + 4, scale: 1.35, depth: 7, tint: 0xffffff });
    addAmbientSource(scene, 'fire', x, FLOOR_Y - 160);
    const glow = addSoftGlow(scene, x, FLOOR_Y - 165, 130, 0xff7938, 0.018, 6.8);
    scene.tweens.add({ targets: glow, alpha: { from: 0.5, to: 1 }, scale: { from: 0.95, to: 1.06 }, duration: 480 + (x % 300), yoyo: true, repeat: -1 });
  }

  for (const [x, y] of [[700, FLOOR_Y - 250], [1200, FLOOR_Y - 270], [1600, FLOOR_Y - 270], [2100, FLOOR_Y - 250]] as const) {
    const vial = scene.add.ellipse(x, y, 10, 22, 0xd8202e, 0.85).setDepth(2.2);
    const halo = addSoftGlow(scene, x, y, 34, 0xff1f30, 0.025, 2.15);
    scene.tweens.add({ targets: [vial, halo], alpha: { from: 0.55, to: 1 }, duration: 1300 + (x % 500), yoyo: true, repeat: -1 });
  }

  addFog(scene);
}

// Névoa avermelhada rasteira passando devagar.
function addFog(scene: Phaser.Scene): void {
  for (const x of [500, 1300, 2100]) {
    const mist = scene.add
      .ellipse(x, FLOOR_Y - 20, 900, 70, 0x9a4050, 0.07)
      .setDepth(11)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: mist, x: x + 140, alpha: 0.03, duration: 7000 + x, ease: 'Sine.InOut', yoyo: true, repeat: -1 });
  }
}

// Silhuetas escuras na frente, só nas bordas (o centro fica livre para a luta).
function addForeground(scene: Phaser.Scene): void {
  // Só à esquerda: à direita ficaria na frente da porta do atalho.
  isolation(scene, 'column', -30, FLOOR_Y + 120, 560, 14).setTint(SILHOUETTE).setScrollFactor(1.1, 1);
  for (const x of [120, WIDTH - 120]) {
    scene.add
      .image(x, CEILING_Y + 200, PRISON_ATLAS_KEY, 'hanging-chains')
      .setOrigin(0.5, 0)
      .setScale(1.2)
      .setDepth(14)
      .setTint(SILHOUETTE)
      .setScrollFactor(1.1, 1);
  }
}
