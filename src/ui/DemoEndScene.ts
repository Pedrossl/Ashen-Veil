import Phaser from 'phaser';

import { Controls } from '../core/controls';
import { DEMO } from '../data/demo';

const OPTION_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#8f84a0',
  fontFamily: 'Georgia, serif',
  fontSize: '22px',
  stroke: '#0b0810',
  strokeThickness: 4,
};

const SELECTED_COLOR = '#f0e2c4';
const IDLE_COLOR = '#8f84a0';

// Fim da demo, sobre o jogo pausado: agradece e deixa continuar explorando
// ou voltar ao menu.
export class DemoEndScene extends Phaser.Scene {
  private controls?: Controls;
  private options: Phaser.GameObjects.Text[] = [];
  private labels: string[] = [];
  private actions: Array<() => void> = [];
  private selected = 0;
  private ready = false;

  constructor() {
    super('DemoEndScene');
  }

  create(): void {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      return;
    }

    this.controls = new Controls(keyboard);
    this.ready = false;
    // Por cima do HUD.
    this.scene.bringToTop();
    const { width, height } = this.scale;

    const shade = this.add.rectangle(0, 0, width, height, 0x030205, 0.86).setOrigin(0).setAlpha(0);
    const title = this.add
      .text(width / 2, height * 0.32, 'OBRIGADO POR JOGAR', {
        color: '#e8c97a',
        fontFamily: 'Georgia, serif',
        fontSize: '46px',
        letterSpacing: 8,
        stroke: '#1a0f05',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    const body = this.add
      .text(
        width / 2,
        height * 0.32 + 74,
        'Você chegou ao fim da demo de Ashen Veil.\nA prisão ainda guarda portas trancadas para o que vem depois.',
        { ...OPTION_STYLE, fontSize: '17px', color: '#b9aed0', align: 'center', lineSpacing: 8 },
      )
      .setOrigin(0.5);
    const version = this.add
      .text(width - 24, height - 20, `${DEMO.version} · ${DEMO.label}`, { ...OPTION_STYLE, fontSize: '13px', color: '#5f5670' })
      .setOrigin(1, 1);

    const entries: Array<[string, () => void]> = [
      ['Continuar explorando', () => this.continueExploring()],
      ['Voltar ao menu', () => this.backToMenu()],
    ];
    this.labels = entries.map(([label]) => label);
    this.actions = entries.map(([, action]) => action);
    this.options = entries.map(([label], index) => {
      const text = this.add
        .text(width / 2, height * 0.62 + index * 46, label, OPTION_STYLE)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      text.on('pointerover', () => this.highlight(index));
      text.on('pointerdown', () => this.choose(index));
      return text;
    });
    this.highlight(0);

    const content = [title, body, version, ...this.options];
    content.forEach((object) => object.setAlpha(0));
    this.tweens.add({ targets: shade, alpha: 1, duration: 1400 });
    this.tweens.add({
      targets: content,
      alpha: 1,
      duration: 1400,
      delay: 900,
      onComplete: () => {
        this.ready = true;
      },
    });
  }

  update(): void {
    const controls = this.controls;

    if (!controls || !this.ready) {
      return;
    }

    if (controls.justPressed('up')) {
      this.highlight((this.selected + this.options.length - 1) % this.options.length);
    } else if (controls.justPressed('down')) {
      this.highlight((this.selected + 1) % this.options.length);
    } else if (controls.justPressed('confirm') || controls.justPressed('interact')) {
      this.choose(this.selected);
    }
  }

  private choose(index: number): void {
    if (this.ready) {
      this.actions[index]();
    }
  }

  private highlight(index: number): void {
    this.selected = index;
    this.options.forEach((option, i) => {
      const isSelected = i === index;
      option
        .setText(isSelected ? `— ${this.labels[i]} —` : this.labels[i])
        .setColor(isSelected ? SELECTED_COLOR : IDLE_COLOR);
    });
  }

  private continueExploring(): void {
    this.scene.resume('PrisonScene');
    this.scene.stop();
  }

  private backToMenu(): void {
    this.scene.stop('PrisonScene');
    this.scene.start('MenuScene');
  }
}
