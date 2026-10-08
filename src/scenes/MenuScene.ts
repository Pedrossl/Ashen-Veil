import Phaser from 'phaser';
import { playSound } from '../systems/SoundEffects';

import { Controls } from '../core/controls';
import { DEMO } from '../data/demo';
import { setDifficulty, type DifficultyId } from '../data/difficulty';
import { hasSave, loadGame, startNewGame } from '../systems/SaveGame';

type MenuOption = {
  label: string;
  select: () => void;
};

const TITLE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#d9c8f2',
  fontFamily: 'Georgia, serif',
  fontSize: '64px',
  stroke: '#120a1c',
  strokeThickness: 6,
};

const OPTION_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#8f84a0',
  fontFamily: 'Georgia, serif',
  fontSize: '24px',
  stroke: '#0b0810',
  strokeThickness: 4,
};

const SELECTED_COLOR = '#f0e2c4';
const IDLE_COLOR = '#8f84a0';
const FADE_MS = 700;

// Menu inicial: o modo fácil reduz somente a troca de dano. Teclado (W/S ou
// setas, Enter ou E) e mouse.
export class MenuScene extends Phaser.Scene {
  private controls?: Controls;
  private options: Phaser.GameObjects.Text[] = [];
  private labels: string[] = [];
  private selected = 0;
  private leaving = false;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { width, height } = this.scale;
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      throw new Error('Teclado indisponível para o menu.');
    }

    this.controls = new Controls(keyboard);
    this.leaving = false;
    this.selected = 0;
    this.cameras.main.setBackgroundColor('#050308');

    this.addAtmosphere(width, height);

    this.add.text(width / 2, height * 0.34, 'ASHEN VEIL', TITLE_STYLE).setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.34 + 56, 'sob as cinzas, o véu', { ...OPTION_STYLE, fontSize: '16px', color: '#6f6680' })
      .setOrigin(0.5);

    const saved = hasSave();
    const newGame = saved ? 'Novo jogo' : 'Iniciar';
    const entries: MenuOption[] = [
      ...(saved ? [{ label: 'Continuar', select: () => this.continueGame() }] : []),
      { label: `${newGame} — Normal`, select: () => this.startGame('normal') },
      { label: `${newGame} — Fácil`, select: () => this.startGame('easy') },
      { label: 'Sair', select: () => this.quitGame() },
    ];

    this.labels = entries.map((entry) => entry.label);
    this.options = entries.map((entry, index) => {
      const text = this.add
        .text(width / 2, height * 0.62 + index * 48, entry.label, OPTION_STYLE)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      text.on('pointerover', () => this.highlight(index));
      text.on('pointerdown', () => entry.select());
      return text;
    });

    this.highlight(0);
    this.add
      .text(width / 2, height * 0.62 + entries.length * 48, 'Fácil: inimigos recebem 2× dano e causam 45%.', {
        ...OPTION_STYLE,
        fontSize: '14px',
        color: '#6f6680',
      })
      .setOrigin(0.5);
    this.add
      .text(width - 24, height - 20, `${DEMO.version} · ${DEMO.label}`, { ...OPTION_STYLE, fontSize: '14px', color: '#5f5670' })
      .setOrigin(1, 1);
    this.addFocusHint(width, height);
    this.cameras.main.fadeIn(FADE_MS, 5, 3, 8);

    this.events.on(Phaser.Scenes.Events.UPDATE, () => {
      if (this.leaving || !this.controls) {
        return;
      }

      if (this.controls.justPressed('up')) {
        this.highlight((this.selected + this.options.length - 1) % this.options.length);
      } else if (this.controls.justPressed('down')) {
        this.highlight((this.selected + 1) % this.options.length);
      } else if (this.controls.justPressed('confirm') || this.controls.justPressed('interact')) {
        entries[this.selected].select();
      }
    });
  }

  private highlight(index: number): void {
    if (index !== this.selected) playSound(this, 'uiMove');
    this.selected = index;
    this.options.forEach((option, i) => {
      const isSelected = i === index;
      option
        .setText(isSelected ? `— ${this.labels[i]} —` : this.labels[i])
        .setColor(isSelected ? SELECTED_COLOR : IDLE_COLOR)
        .setScale(isSelected ? 1.12 : 1);
    });
  }

  // Novo jogo apaga o save anterior.
  private startGame(difficulty: DifficultyId): void {
    if (this.leaving) return;
    startNewGame(this.game);
    setDifficulty(this.game, difficulty);
    this.leaveTo({});
  }

  // Continua na última lanterna em que descansou, já sentado nela.
  private continueGame(): void {
    if (this.leaving) return;
    const checkpoint = loadGame(this.game);
    // Sem descanso ainda, o checkpoint é a cela (não há lanterna para sentar).
    const resting = checkpoint !== undefined && checkpoint.roomId !== 'prison-cell';
    this.leaveTo(checkpoint ? { roomId: checkpoint.roomId, entryId: checkpoint.entryId, resting } : {});
  }

  private leaveTo(data: object): void {
    playSound(this, 'uiConfirm');
    this.leaving = true;
    this.cameras.main.fadeOut(FADE_MS, 4, 3, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('PrisonScene', data);
    });
  }

  // O navegador só deixa fechar abas abertas por script; se não fechar,
  // escurece a tela e avisa.
  private quitGame(): void {
    if (this.leaving) return;
    playSound(this, 'uiConfirm');
    this.leaving = true;
    this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      window.close();
      this.children.removeAll(true);
      this.cameras.main.resetFX();
      this.cameras.main.setBackgroundColor('#000000');
      this.add
        .text(this.scale.width / 2, this.scale.height / 2, 'Obrigado por jogar.\nJá pode fechar esta aba.', {
          ...OPTION_STYLE,
          align: 'center',
          color: '#8f84a0',
        })
        .setOrigin(0.5);
    });
  }

  // Num iframe (itch.io) ou com a página sem foco, as teclas não chegam ao
  // jogo até o jogador clicar nele.
  private addFocusHint(width: number, height: number): void {
    const hint = this.add
      .text(width / 2, height * 0.86, 'Clique na tela para jogar', { ...OPTION_STYLE, fontSize: '18px', color: '#c9b8ef' })
      .setOrigin(0.5)
      .setVisible(!document.hasFocus());
    this.tweens.add({ targets: hint, alpha: { from: 0.45, to: 1 }, duration: 900, yoyo: true, repeat: -1 });

    const hide = (): void => {
      if (hint.active) {
        hint.setVisible(false);
      }
    };
    this.input.once(Phaser.Input.Events.POINTER_DOWN, hide);
    window.addEventListener('focus', hide, { once: true });
  }

  // Brilho roxo ao fundo e brasas subindo devagar.
  private addAtmosphere(width: number, height: number): void {
    const glow = this.add
      .ellipse(width / 2, height * 0.38, width * 0.8, height * 0.6, 0x6a3fa0, 0.12)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: { from: 0.08, to: 0.18 }, duration: 2600, yoyo: true, repeat: -1 });

    this.time.addEvent({
      delay: 140,
      loop: true,
      callback: () => {
        const ember = this.add
          .circle(Phaser.Math.Between(0, width), height + 6, Phaser.Math.Between(1, 3), 0xffa050, 0.8)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: ember,
          y: height * Phaser.Math.FloatBetween(0.2, 0.7),
          x: ember.x + Phaser.Math.Between(-60, 60),
          alpha: 0,
          duration: Phaser.Math.Between(3000, 5500),
          onComplete: () => ember.destroy(),
        });
      },
    });
  }
}
