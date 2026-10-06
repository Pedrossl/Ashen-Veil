import Phaser from 'phaser';

import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { PrisonScene } from '../scenes/PrisonScene';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#08070d',
  scene: [BootScene, PreloadScene, PrisonScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1400 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
};
