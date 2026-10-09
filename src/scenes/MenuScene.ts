import Phaser from 'phaser';
import { playSound } from '../systems/SoundEffects';

import { Controls } from '../core/controls';
import { DEMO } from '../data/demo';
import { setDifficulty, type DifficultyId } from '../data/difficulty';
import { hasSave, loadGame, startNewGame } from '../systems/SaveGame';
import { takeCoopEndedNotice } from '../systems/coop/CoopPresence';
import { network } from '../net/network';
import { showCreateRoomModal, showJoinRoomModal } from '../ui/RoomDialog';
import type { Room } from '@colyseus/sdk';

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

  // Estado da tela: 'main', 'difficulty' ou 'multiplayer'.
  private phase: 'main' | 'difficulty' | 'multiplayer' = 'main';

  // Containers para transições entre telas.
  private mainContainer?: Phaser.GameObjects.Container;
  private difficultyContainer?: Phaser.GameObjects.Container;
  private multiplayerContainer?: Phaser.GameObjects.Container;

  // Texto da frase de dificuldade.
  private phraseText?: Phaser.GameObjects.Text;
  // Mensagem de status/erro do multiplayer.
  private statusText?: Phaser.GameObjects.Text;

  // Referências às entradas do menu para poder chamar select().
  private currentEntries: MenuOption[] = [];
  // Modal aberto ou conectando ao servidor: ignora o teclado do menu.
  private busy = false;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { width, height } = this.scale;
    const keyboard = this.input.keyboard;
    // A partida cooperativa acabou (anfitrião saiu, conexão caiu): mostra o motivo.
    const coopEnded = takeCoopEndedNotice(this.game);

    if (!keyboard) {
      throw new Error('Teclado indisponível para o menu.');
    }

    this.controls = new Controls(keyboard);
    // Voltou ao menu (fim da demo, sala desfeita): sai da sala cooperativa.
    network.leaveRoom();
    this.leaving = false;
    this.busy = false;
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

    // ── Tela de multiplayer (começa fora da tela) ──
    this.multiplayerContainer = this.add.container(width, 0).setAlpha(0);
    this.buildMultiplayerMenu(width, height);

    // ── Mensagem de status / erro no rodapé ──
    this.statusText = this.add
      .text(width / 2, height * 0.88, coopEnded ?? '', { ...PHRASE_STYLE, color: '#e8b860', fontSize: '15px' })
      .setOrigin(0.5);

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
      } else if (this.phase === 'difficulty') {
        this.handleDifficultyInput();
      } else if (this.phase === 'multiplayer') {
        this.handleMultiplayerInput();
      }
    });
  }

  // ── Menu principal ──

  private buildMainMenu(width: number, height: number): void {
    const saved = hasSave();
    const entries: MenuOption[] = [
      ...(saved ? [{ label: 'Continuar', select: () => this.continueGame() }] : []),
      { label: saved ? 'Novo jogo' : 'Iniciar', select: () => this.showDifficulty() },
      { label: 'Multiplayer', select: () => this.showMultiplayer() },
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

  // ── Tela de multiplayer: criar ou entrar numa sala cooperativa ──

  private buildMultiplayerMenu(width: number, height: number): void {
    const container = this.multiplayerContainer!;
    container.add(
      this.add
        .text(width / 2, height * 0.52, 'Jornada cooperativa · 2 viajantes', { ...OPTION_STYLE, fontSize: '20px', color: '#c9b8ef' })
        .setOrigin(0.5),
    );

    const entries: MenuOption[] = [
      { label: 'Criar sala', select: () => void this.createRoom() },
      { label: 'Entrar em sala', select: () => void this.joinRoom() },
      { label: 'Voltar', select: () => this.showMain() },
    ];
    const optionTexts = entries.map((entry, index) => {
      const text = this.add
        .text(width / 2, height * 0.62 + index * 48, entry.label, OPTION_STYLE)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      text.on('pointerover', () => this.highlight(index));
      text.on('pointerdown', () => entry.select());
      container.add(text);
      return text;
    });

    container.setData('optionTexts', optionTexts);
    container.setData('labels', entries.map((entry) => entry.label));
    container.setData('entries', entries);
  }

  private handleMultiplayerInput(): void {
    if (!this.controls || this.busy) return;

    if (this.controls.justPressed('up')) {
      this.highlight((this.selected + this.options.length - 1) % this.options.length);
    } else if (this.controls.justPressed('down')) {
      this.highlight((this.selected + 1) % this.options.length);
    } else if (this.controls.justPressed('confirm') || this.controls.justPressed('interact')) {
      this.currentEntries[this.selected].select();
    } else if (this.controls.justPressed('cancel')) {
      this.showMain();
    }
  }

  private async createRoom(): Promise<void> {
    const data = await this.askInModal(showCreateRoomModal);

    if (!data) return;

    await this.connect('Abrindo a sala...', () => network.createRoom(data.password ?? '', data.playerName));
  }

  private async joinRoom(): Promise<void> {
    const data = await this.askInModal(showJoinRoomModal);

    if (!data) return;

    await this.connect('Procurando a sala...', () => network.joinRoom(data.roomId, data.password ?? '', data.playerName));
  }

  // Os campos do modal são HTML: enquanto ele está aberto, o Phaser solta o
  // teclado (senão W/A/S/D/E/Espaço não chegariam aos campos e moveriam o menu).
  private async askInModal<T>(open: () => Promise<T | null>): Promise<T | null> {
    if (this.busy || this.leaving) return null;

    this.busy = true;
    playSound(this, 'uiConfirm');
    this.setKeyboardActive(false);
    const result = await open();
    this.setKeyboardActive(true);
    this.busy = false;
    return result;
  }

  private setKeyboardActive(active: boolean): void {
    const keyboard = this.input.keyboard;

    if (!keyboard) return;

    keyboard.enabled = active;
    if (active) {
      keyboard.enableGlobalCapture();
    } else {
      keyboard.disableGlobalCapture();
      keyboard.resetKeys();
    }
  }

  private async connect(message: string, open: () => Promise<Room>): Promise<void> {
    this.busy = true;
    this.statusText?.setText(message).setColor('#c9b8ef');

    try {
      const room = await open();
      this.leaveToLobby(room);
    } catch (error) {
      this.busy = false;
      playSound(this, 'uiMove');
      this.statusText?.setText(describeRoomError(error)).setColor('#d46b6b');
    }
  }

  private leaveToLobby(room: Room): void {
    playSound(this, 'uiConfirm');
    this.leaving = true;
    this.cameras.main.fadeOut(FADE_MS, 4, 3, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('MultiplayerLobbyScene', { room });
    });
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
    this.showPanel('difficulty');
    this.highlightDifficulty(0);
  }

  private showMultiplayer(): void {
    if (this.leaving) return;
    playSound(this, 'uiConfirm');
    this.statusText?.setText('');
    this.showPanel('multiplayer');
    this.highlight(0);
  }

  private showMain(): void {
    if (this.leaving || this.busy) return;
    playSound(this, 'uiMove');
    this.statusText?.setText('');
    this.showPanel('main');
    this.highlight(0);
  }

  // Troca a tela ativa: a nova entra da direita e as outras saem.
  private showPanel(phase: 'main' | 'difficulty' | 'multiplayer'): void {
    const panels = {
      main: this.mainContainer!,
      difficulty: this.difficultyContainer!,
      multiplayer: this.multiplayerContainer!,
    };
    const container = panels[phase];
    this.phase = phase;
    this.options = container.getData('optionTexts') as Phaser.GameObjects.Text[];
    this.labels = container.getData('labels') as string[];
    this.currentEntries = container.getData('entries') as MenuOption[];
    this.selected = 0;

    const { width } = this.scale;
    for (const [key, panel] of Object.entries(panels)) {
      const active = key === phase;
      this.tweens.add({
        targets: panel,
        x: active ? 0 : key === 'main' ? -width : width,
        alpha: active ? 1 : 0,
        duration: SLIDE_MS,
        ease: 'Power2',
      });
    }
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

  // Novo jogo apaga o save anterior e começa na cela.
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

// Mensagem curta para quem não conseguiu criar ou entrar numa sala.
function describeRoomError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/senha/i.test(message)) return 'Senha incorreta.';
  if (/not found|não encontrad|locked|full/i.test(message)) return 'Sala não encontrada ou já cheia.';
  return 'Não foi possível falar com o servidor. Ele está ligado?';
}
