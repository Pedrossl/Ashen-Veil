import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    const { centerX, centerY } = this.cameras.main;

    const loadingText = this.add
      .text(centerX, centerY, 'Despertando...', {
        color: '#d8c9ff',
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
      })
      .setOrigin(0.5);

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      loadingText.destroy();
    });
  }

  create(): void {
    this.scene.start('PrisonScene');
  }
}
