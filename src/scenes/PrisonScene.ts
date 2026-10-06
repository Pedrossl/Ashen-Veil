import Phaser from 'phaser';

import { GAME_TITLE } from '../core/constants';

export class PrisonScene extends Phaser.Scene {
  constructor() {
    super('PrisonScene');
  }

  create(): void {
    const { centerX, centerY, width, height } = this.cameras.main;

    this.add.rectangle(centerX, centerY, width, height, 0x08070d);
    this.add.rectangle(centerX, height - 92, width, 184, 0x12101a);
    this.add.rectangle(centerX, height - 181, width, 4, 0x392b4d, 0.8);

    this.add
      .text(centerX, centerY - 36, GAME_TITLE.toUpperCase(), {
        color: '#d8c9ff',
        fontFamily: 'Georgia, serif',
        fontSize: '38px',
        fontStyle: 'bold',
        letterSpacing: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 24, 'A prisão aguarda.', {
        color: '#9387a8',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
      })
      .setOrigin(0.5);
  }
}
