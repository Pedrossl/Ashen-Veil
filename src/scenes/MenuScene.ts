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

const PHRASE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#6f6680',
  fontFamily: 'Georgia, serif',
  fontSize: '16px',
  fontStyle: 'italic',
  stroke: '#0b0810',
  strokeThickness: 3,
  align: 'center',
};

const SELECTED_COLOR = '#f0e2c4';
const IDLE_COLOR = '#8f84a0';
const FADE_MS = 700;
const SLIDE_MS = 350;

// Frases temáticas para cada dificuldade.
const DIFFICULTY_OPTIONS: { id: DifficultyId; label: string; phrase: string }[] = [
  {
    id: 'normal',
    label: 'Normal',
    phrase: '"O véu não se ergue para os fracos."',
  },
  {
    id: 'easy',
    label: 'Fácil',
    phrase: '"Mesmo na escuridão, há misericórdia."',
  },
];

// Menu inicial: o modo fácil reduz somente a troca de dano. Teclado (W/S ou
// setas, Enter ou E) e mouse.
export class MenuScene extends Phaser.Scene {
  private controls?: Controls;
  private options: Phaser.GameObjects.Text[] = [];
  private labels: string[] = [];
  private selected = 0;
  private leaving = false;

  // Estado da tela: 'main' ou 'difficulty'.
  private phase: 'main' | 'difficulty' = 'main';

  // Container para facilitar transições entre as duas telas.
  private mainContainer?: Phaser.GameObjects.Container;
  private difficultyContainer?: Phaser.GameObjects.Container;

  // Texto da frase de dificuldade.
  private phraseText?: Phaser.GameObjects.Text;

  // Referências às entradas do menu para poder chamar select().
  private currentEntries: MenuOption[] = [];

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
    this.phase = 'main';
    this.cameras.main.setBackgroundColor('#050308');

    this.addAtmosphere(width, height);

    // ── Título (sempre visível) ──
    this.add.text(width / 2, height * 0.34, 'ASHEN VEIL', TITLE_STYLE).setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.34 + 56, 'sob as cinzas, o véu', { ...OPTION_STYLE, fontSize: '16px', color: '#6f6680' })
      .setOrigin(0.5);

    // ── Menu principal ──
    this.mainContainer = this.add.container(0, 0);
    this.buildMainMenu(width, height);

    // ── Tela de dificuldade (começa fora da tela) ──
    this.difficultyContainer = this.add.container(width, 0).setAlpha(0);
    this.buildDifficultyMenu(width, height);

    // ── Rodapé ──
    this.add
      .text(width - 24, height - 20, `${DEMO.version} · ${DEMO.label}`, { ...OPTION_STYLE, fontSize: '14px', color: '#5f5670' })
      .setOrigin(1, 1);
    this.addFocusHint(width, height);
    this.cameras.main.fadeIn(FADE_MS, 5, 3, 8);

    // ── Loop de input ──
    this.events.on(Phaser.Scenes.Events.UPDATE, () => {
      if (this.leaving || !this.controls) {
        return;
      }

      if (this.phase === 'main') {
        this.handleMainInput();
      } else {
        this.handleDifficultyInput();
      }
    });
  }

  // ── Menu principal ──

  private buildMainMenu(width: number, height: number): void {
    const saved = hasSave();
    const entries: MenuOption[] = [
      ...(saved ? [{ label: 'Continuar', select: () => this.continueGame() }] : []),
      { label: saved ? 'Novo jogo' : 'Iniciar', select: () => this.showDifficulty() },
      { label: 'Sair', select: () => this.quitGame() },
    ];

    this.setOptions(entries, width, height, this.mainContainer!);
  }

  private handleMainInput(): void {
    if (!this.controls) return;

    if (this.controls.justPressed('up')) {
      this.highlight((this.selected + this.options.length - 1) % this.options.length);
    } else if (this.controls.justPressed('down')) {
      this.highlight((this.selected + 1) % this.options.length);
    } else if (this.controls.justPressed('confirm') || this.controls.justPressed('interact')) {
      this.currentEntries[this.selected].select();
    }
  }

  // ── Tela de dificuldade ──

  private buildDifficultyMenu(width: number, height: number): void {
    const container = this.difficultyContainer!;

    // Subtítulo.
    const subtitle = this.add
      .text(width / 2, height * 0.52, 'Escolha sua provação', { ...OPTION_STYLE, fontSize: '20px', color: '#c9b8ef' })
      .setOrigin(0.5);
    container.add(subtitle);

    // Opções de dificuldade.
    const entries: MenuOption[] = DIFFICULTY_OPTIONS.map((opt) => ({
      label: opt.label,
      select: () => this.startGame(opt.id),
    }));

    // Voltar.
    entries.push({ label: 'Voltar', select: () => this.showMain() });

    const optionTexts: Phaser.GameObjects.Text[] = [];
    const labels: string[] = [];

    entries.forEach((entry, index) => {
      const text = this.add
        .text(width / 2, height * 0.62 + index * 48, entry.label, OPTION_STYLE)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      text.on('pointerover', () => this.highlightDifficulty(index));
      text.on('pointerdown', () => entry.select());
      container.add(text);
      optionTexts.push(text);
      labels.push(entry.label);
    });

    // Frase (abaixo das opções).
    this.phraseText = this.add
      .text(width / 2, height * 0.62 + entries.length * 48 + 16, '', PHRASE_STYLE)
      .setOrigin(0.5);
    container.add(this.phraseText);

    // Guardar referências separadas para a tela de dificuldade; elas serão
    // colocadas em this.options/labels quando a tela ficar ativa.
    container.setData('optionTexts', optionTexts);
    container.setData('labels', labels);
    container.setData('entries', entries);
  }

  private handleDifficultyInput(): void {
    if (!this.controls) return;

    if (this.controls.justPressed('up')) {
      this.highlightDifficulty((this.selected + this.options.length - 1) % this.options.length);
    } else if (this.controls.justPressed('down')) {
      this.highlightDifficulty((this.selected + 1) % this.options.length);
    } else if (this.controls.justPressed('confirm') || this.controls.justPressed('interact')) {
      this.currentEntries[this.selected].select();
    } else if (this.controls.justPressed('cancel')) {
      this.showMain();
    }
  }

  private highlightDifficulty(index: number): void {
    if (index !== this.selected) playSound(this, 'uiMove');
    this.selected = index;
    this.options.forEach((option, i) => {
      const isSelected = i === index;
      option
        .setText(isSelected ? `— ${this.labels[i]} —` : this.labels[i])
        .setColor(isSelected ? SELECTED_COLOR : IDLE_COLOR)
        .setScale(isSelected ? 1.12 : 1);
    });

    // Atualizar frase; "Voltar" não tem frase.
    if (this.phraseText) {
      const opt = DIFFICULTY_OPTIONS[index];
      this.phraseText.setText(opt ? opt.phrase : '');
    }
  }

  // ── Transições entre telas ──

  private showDifficulty(): void {
    if (this.leaving) return;
    playSound(this, 'uiConfirm');
    this.phase = 'difficulty';

    // Trocar referências de opções para as da tela de dificuldade.
    const container = this.difficultyContainer!;
    this.options = container.getData('optionTexts') as Phaser.GameObjects.Text[];
    this.labels = container.getData('labels') as string[];
    this.currentEntries = container.getData('entries') as MenuOption[];
    this.selected = 0;
    this.highlightDifficulty(0);

    // Slide: menu principal sai para a esquerda, dificuldade entra da direita.
    const { width } = this.scale;
    this.tweens.add({ targets: this.mainContainer, x: -width, alpha: 0, duration: SLIDE_MS, ease: 'Power2' });
    this.tweens.add({ targets: this.difficultyContainer, x: 0, alpha: 1, duration: SLIDE_MS, ease: 'Power2' });
  }

  private showMain(): void {
    if (this.leaving) return;
    playSound(this, 'uiMove');
    this.phase = 'main';

    // Reconstruir referências do menu principal.
    const container = this.mainContainer!;
    this.options = container.getData('optionTexts') as Phaser.GameObjects.Text[];
    this.labels = container.getData('labels') as string[];
    this.currentEntries = container.getData('entries') as MenuOption[];
    this.selected = 0;
    this.highlight(0);

    const { width } = this.scale;
    this.tweens.add({ targets: this.mainContainer, x: 0, alpha: 1, duration: SLIDE_MS, ease: 'Power2' });
    this.tweens.add({ targets: this.difficultyContainer, x: width, alpha: 0, duration: SLIDE_MS, ease: 'Power2' });
  }

  // ── Helpers comuns ──

  // Monta as opções de texto dentro de um container e guarda as referências
  // tanto neste container (via setData) quanto nos campos da scene.
  private setOptions(entries: MenuOption[], width: number, height: number, container: Phaser.GameObjects.Container): void {
    const optionTexts: Phaser.GameObjects.Text[] = [];
    const labels: string[] = [];

    entries.forEach((entry, index) => {
      const text = this.add
        .text(width / 2, height * 0.62 + index * 48, entry.label, OPTION_STYLE)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      text.on('pointerover', () => this.highlight(index));
      text.on('pointerdown', () => entry.select());
      container.add(text);
      optionTexts.push(text);
      labels.push(entry.label);
    });

    container.setData('optionTexts', optionTexts);
    container.setData('labels', labels);
    container.setData('entries', entries);

    // A tela principal começa ativa.
    this.options = optionTexts;
    this.labels = labels;
    this.currentEntries = entries;
    this.highlight(0);
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

  // Novo jogo apaga o save anterior e vai para a seleção de aparência.
  private startGame(difficulty: DifficultyId): void {
    if (this.leaving) return;
    startNewGame(this.game);
    setDifficulty(this.game, difficulty);
    this.leaveToCharacter({});
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

  // Novo jogo: vai para a seleção de aparência antes de iniciar.
  private leaveToCharacter(launchData: object): void {
    playSound(this, 'uiConfirm');
    this.leaving = true;
    this.cameras.main.fadeOut(FADE_MS, 4, 3, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('CharacterScene', { launchData });
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
