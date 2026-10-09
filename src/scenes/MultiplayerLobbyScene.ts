import Phaser from 'phaser';
import type { Room } from '@colyseus/sdk';
import { playSound } from '../systems/SoundEffects';
import { Controls } from '../core/controls';
import { PLAYER_SPRITE, PLAYER_ANIMATION } from '../data/player';
import { SKINS, SKIN_ORDER, setSkin, type SkinId } from '../data/skins';
import { setDifficulty, type DifficultyId } from '../data/difficulty';
import { startCoopAsGuest, startCoopAsHost, type WorldSnapshot } from '../systems/SaveGame';
import { watchCoopRoom } from '../systems/coop/CoopPresence';
import { COOP_MESSAGES } from '../systems/coop/messages';

const TITLE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#d9c8f2',
  fontFamily: 'Georgia, serif',
  fontSize: '32px',
  stroke: '#120a1c',
  strokeThickness: 5,
};

const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#f0e2c4',
  fontFamily: 'Georgia, serif',
  fontSize: '20px',
  stroke: '#0b0810',
  strokeThickness: 4,
};

const SUB_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#8f84a0',
  fontFamily: 'Georgia, serif',
  fontSize: '15px',
  stroke: '#08060e',
  strokeThickness: 3,
};

const FADE_MS = 600;

type GameStartedMessage = {
  difficulty: DifficultyId;
  world: WorldSnapshot;
};

type LobbyData = {
  room: Room;
};

export class MultiplayerLobbyScene extends Phaser.Scene {
  private room?: Room;
  private controls?: Controls;
  private leaving = false;
  // Já pediu para voltar a uma partida em andamento.
  private rejoinRequested = false;

  // UI - Topo
  private roomCodeText?: Phaser.GameObjects.Text;
  private statusBanner?: Phaser.GameObjects.Text;

  // UI - Slots de Jogador
  private hostNameText?: Phaser.GameObjects.Text;
  private hostStatusText?: Phaser.GameObjects.Text;
  private hostSprite?: Phaser.GameObjects.Sprite;
  private hostSkinText?: Phaser.GameObjects.Text;

  private guestNameText?: Phaser.GameObjects.Text;
  private guestStatusText?: Phaser.GameObjects.Text;
  private guestSprite?: Phaser.GameObjects.Sprite;
  private guestSkinText?: Phaser.GameObjects.Text;

  // UI - Seleção de Skins
  private skinButtons: { container: Phaser.GameObjects.Container; skinId: SkinId }[] = [];

  // UI - Dificuldade
  private difficultyButton?: Phaser.GameObjects.Text;
  private difficultyPhrase?: Phaser.GameObjects.Text;

  // UI - Ações
  private readyButton?: Phaser.GameObjects.Text;
  private startButton?: Phaser.GameObjects.Text;

  // Estado local cacheado
  private localPlayerId = '';
  private isHost = false;
  private myCurrentSkin: SkinId | '' = '';
  private otherPlayerSkin: SkinId | '' = '';
  private currentDifficulty: DifficultyId = 'normal';
  // Etapa: os dois confirmaram a aparência (aí vem a dificuldade).
  private bothReady = false;
  private myReady = false;

  constructor() {
    super('MultiplayerLobbyScene');
  }

  init(data: LobbyData): void {
    this.room = data?.room;
    this.leaving = false;
    this.myCurrentSkin = '';
    this.otherPlayerSkin = '';
    this.currentDifficulty = 'normal';
    this.skinButtons = [];
    this.rejoinRequested = false;
  }

  create(): void {
    const { width, height } = this.scale;
    const keyboard = this.input.keyboard;
    if (!keyboard || !this.room) {
      this.scene.start('MenuScene');
      return;
    }

    this.controls = new Controls(keyboard);
    this.localPlayerId = this.room.sessionId;
    this.cameras.main.setBackgroundColor('#050308');

    this.addAtmosphere(width, height);

    // ── Título ──
    this.add
      .text(width / 2, height * 0.08, 'SALA COOPERATIVA', TITLE_STYLE)
      .setOrigin(0.5);

    // ── Código da Sala (clicável para copiar) ──
    const codeStr = `CÓDIGO DA SALA: ${this.room.roomId}`;
    this.roomCodeText = this.add
      .text(width / 2, height * 0.14, codeStr, {
        ...LABEL_STYLE,
        fontSize: '18px',
        color: '#e8b860',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.roomCodeText.on('pointerover', () => this.roomCodeText?.setColor('#ffe8b0'));
    this.roomCodeText.on('pointerout', () => this.roomCodeText?.setColor('#e8b860'));
    this.roomCodeText.on('pointerdown', () => {
      if (this.room?.roomId) {
        navigator.clipboard?.writeText(this.room.roomId);
        this.statusBanner?.setText('Código copiado para a área de transferência!').setColor('#7abf8a');
        playSound(this, 'uiConfirm');
      }
    });

    // ── Banner de Notificação / Mensagem ──
    this.statusBanner = this.add
      .text(width / 2, height * 0.19, 'Escolha sua aparência (← →) e confirme (Enter).', SUB_STYLE)
      .setOrigin(0.5);

    // ── Painel de Jogadores (Lado a Lado) ──
    this.buildPlayerSlots(width, height);

    // ── Seletor de Aparência (Skin) ──
    this.buildSkinSelector(width, height);

    // ── Seletor de Dificuldade ──
    this.buildDifficultySelector(width, height);

    // ── Botões de Ação no Rodapé ──
    this.buildActionButtons(width, height);

    // ── Dica de Sair ──
    const leaveBtn = this.add
      .text(48, height - 28, '‹ Sair da Sala (Esc)', SUB_STYLE)
      .setOrigin(0, 1)
      .setInteractive({ useHandCursor: true });
    leaveBtn.on('pointerover', () => leaveBtn.setColor('#e9e1f5'));
    leaveBtn.on('pointerout', () => leaveBtn.setColor('#8f84a0'));
    leaveBtn.on('pointerdown', () => this.leaveRoom());

    // ── Registrar Listeners do Colyseus ──
    this.setupRoomListeners();

    this.cameras.main.fadeIn(FADE_MS, 5, 3, 8);

    // ── Input loop ──
    this.events.on(Phaser.Scenes.Events.UPDATE, () => this.handleKeyboard());
  }

  // Teclado: na etapa das aparências, ←/→ escolhem e Enter/E confirma (pronto);
  // na da dificuldade, o anfitrião troca com ←/→ e inicia com Enter/E.
  private handleKeyboard(): void {
    const controls = this.controls;

    if (this.leaving || !controls) return;

    if (controls.justPressed('cancel')) {
      this.leaveRoom();
      return;
    }

    const step = controls.justPressed('left') ? -1 : controls.justPressed('right') ? 1 : 0;
    const confirm = controls.justPressed('confirm') || controls.justPressed('interact');

    if (this.bothReady) {
      if (step !== 0) this.toggleDifficulty();
      if (confirm) {
        if (this.isHost) this.startGameHost();
        else this.toggleReady();
      }
      return;
    }

    if (step !== 0 && !this.myReady) {
      this.trySelectSkin(this.nextFreeSkin(step));
    } else if (confirm) {
      this.toggleReady();
    }
  }

  // Próxima aparência livre (pula a do outro jogador).
  private nextFreeSkin(step: -1 | 1): SkinId {
    const current = this.myCurrentSkin ? SKIN_ORDER.indexOf(this.myCurrentSkin) : step > 0 ? -1 : 0;
    for (let offset = 1; offset <= SKIN_ORDER.length; offset += 1) {
      const candidate = SKIN_ORDER[Phaser.Math.Wrap(current + step * offset, 0, SKIN_ORDER.length)];
      if (candidate !== this.otherPlayerSkin) return candidate;
    }
    return SKIN_ORDER[0];
  }

  // ── Painel de Jogadores ──

  private buildPlayerSlots(width: number, height: number): void {
    const leftX = width * 0.28;
    const rightX = width * 0.72;
    const centerY = height * 0.42;

    // Slot 1: Anfitrião
    this.add.ellipse(leftX, centerY + 60, 200, 40, 0x000000, 0.4);
    this.hostSprite = this.add
      .sprite(leftX, centerY, PLAYER_SPRITE.sheets.idle.key, PLAYER_ANIMATION.idleFrame)
      .setScale(PLAYER_SPRITE.scale * 1.3)
      .setOrigin(0.5, 0.5)
      .setAlpha(0.3);

    this.hostNameText = this.add
      .text(leftX, centerY - 90, 'Anfitrião', LABEL_STYLE)
      .setOrigin(0.5);

    this.hostSkinText = this.add
      .text(leftX, centerY + 80, 'Sem aparência', SUB_STYLE)
      .setOrigin(0.5);

    this.hostStatusText = this.add
      .text(leftX, centerY + 104, 'Aguardando...', { ...SUB_STYLE, color: '#e8b860' })
      .setOrigin(0.5);

    // Slot 2: Convidado
    this.add.ellipse(rightX, centerY + 60, 200, 40, 0x000000, 0.4);
    this.guestSprite = this.add
      .sprite(rightX, centerY, PLAYER_SPRITE.sheets.idle.key, PLAYER_ANIMATION.idleFrame)
      .setScale(PLAYER_SPRITE.scale * 1.3)
      .setOrigin(0.5, 0.5)
      .setAlpha(0.2);

    this.guestNameText = this.add
      .text(rightX, centerY - 90, 'Aguardando 2º Jogador...', { ...LABEL_STYLE, color: '#6f6680' })
      .setOrigin(0.5);

    this.guestSkinText = this.add
      .text(rightX, centerY + 80, '', SUB_STYLE)
      .setOrigin(0.5);

    this.guestStatusText = this.add
      .text(rightX, centerY + 104, '', SUB_STYLE)
      .setOrigin(0.5);
  }

  // ── Seletor de Skins ──

  private buildSkinSelector(width: number, height: number): void {
    const startY = height * 0.68;
    this.add
      .text(width / 2, startY - 26, 'SELECIONE SUA APARÊNCIA (NÃO PODE REPETIR)', {
        ...SUB_STYLE,
        fontSize: '13px',
        color: '#9a8db0',
      })
      .setOrigin(0.5);

    const total = SKIN_ORDER.length;
    const spacing = 220;
    const startX = width / 2 - ((total - 1) * spacing) / 2;

    this.skinButtons = [];

    SKIN_ORDER.forEach((skinId, idx) => {
      const skin = SKINS[skinId];
      const btnX = startX + idx * spacing;
      const container = this.add.container(btnX, startY + 16);

      const bg = this.add
        .rectangle(0, 0, 190, 52, 0x120d1c, 0.85)
        .setStrokeStyle(1, 0x3d3050)
        .setInteractive({ useHandCursor: true });

      const name = this.add
        .text(0, -6, skin.name, {
          ...LABEL_STYLE,
          fontSize: '15px',
          color: skin.accentColor,
        })
        .setOrigin(0.5);

      const status = this.add
        .text(0, 14, 'Disponível', {
          ...SUB_STYLE,
          fontSize: '12px',
          color: '#6f6680',
        })
        .setOrigin(0.5);

      container.add([bg, name, status]);

      bg.on('pointerdown', () => this.trySelectSkin(skinId));
      bg.on('pointerover', () => {
        if (skinId !== this.otherPlayerSkin && skinId !== this.myCurrentSkin) {
          bg.setStrokeStyle(1, skin.accentHex);
        }
      });
      bg.on('pointerout', () => {
        this.updateSkinButtonsVisual();
      });

      this.skinButtons.push({ container, skinId });
    });
  }

  // ── Seletor de Dificuldade ──

  private buildDifficultySelector(width: number, height: number): void {
    const diffY = height * 0.81;

    this.difficultyButton = this.add
      .text(width / 2, diffY, 'Dificuldade: Normal', {
        ...LABEL_STYLE,
        fontSize: '18px',
        color: '#d9c8f2',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.difficultyPhrase = this.add
      .text(width / 2, diffY + 24, '"O véu não se ergue para os fracos."', {
        ...SUB_STYLE,
        fontSize: '14px',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    // A dificuldade vem depois das aparências: só aparece com os dois prontos.
    this.difficultyButton.setVisible(false);
    this.difficultyPhrase.setVisible(false);

    this.difficultyButton.on('pointerdown', () => this.toggleDifficulty());
  }

  private toggleDifficulty(): void {
    if (!this.isHost) {
      this.statusBanner?.setText('Apenas o anfitrião pode alterar a dificuldade.').setColor('#e8b860');
      return;
    }
    const nextDiff = this.currentDifficulty === 'normal' ? 'easy' : 'normal';
    playSound(this, 'uiMove');
    this.room?.send('set_difficulty', { difficulty: nextDiff });
  }

  // ── Botões de Ação ──

  private buildActionButtons(width: number, height: number): void {
    const actionY = height * 0.92;

    // Botão Pronto
    this.readyButton = this.add
      .text(width / 2, actionY, '— CONFIRMAR APARÊNCIA —', {
        ...LABEL_STYLE,
        fontSize: '22px',
        color: '#f0e2c4',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.readyButton.on('pointerover', () => this.readyButton?.setColor('#ffe8b0'));
    this.readyButton.on('pointerout', () => this.readyButton?.setColor('#f0e2c4'));
    this.readyButton.on('pointerdown', () => this.toggleReady());

    // Botão Iniciar (visível apenas para o Host quando todos estiverem prontos)
    this.startButton = this.add
      .text(width / 2, actionY, '— INICIAR A JORNADA —', {
        ...LABEL_STYLE,
        fontSize: '24px',
        color: '#ffe8b0',
        stroke: '#4a2574',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.startButton.on('pointerdown', () => this.startGameHost());
    this.tweens.add({ targets: this.startButton, scaleX: 1.05, scaleY: 1.05, duration: 800, yoyo: true, repeat: -1 });
  }

  // ── Comunicação com o Servidor ──

  private setupRoomListeners(): void {
    const room = this.room;
    if (!room) return;

    const onState = (state: any): void => this.syncState(state);
    const onLeave = (): void => {
      if (!this.leaving) {
        this.leaveRoom();
      }
    };
    room.onStateChange(onState);
    room.onLeave(onLeave);

    // Ao sair do lobby (inclusive para a partida), as mensagens da sala param
    // de chegar aqui: a partida tem os próprios listeners (CoopSync).
    const cleanups = [
      () => room.onStateChange.remove(onState),
      () => room.onLeave.remove(onLeave),
      room.onMessage('error', (data: { message: string }) => {
        playSound(this, 'uiMove');
        this.statusBanner?.setText(data.message).setColor('#d46b6b');
      }),
      room.onMessage('game_started', (data: GameStartedMessage) => this.onGameStarted(data)),
      room.onMessage('room_disbanded', (data: { message: string }) => {
        this.statusBanner?.setText(data.message).setColor('#d46b6b');
        this.time.delayedCall(1800, () => this.leaveRoom());
      }),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => cleanups.forEach((cleanup) => cleanup()));

    // O estado inicial pode ter chegado antes desta tela abrir (ao entrar
    // na sala, ainda no menu): desenha o que já existe.
    this.syncState(room.state);
  }

  private syncState(state: any): void {
    if (!state || !state.players) return;

    this.isHost = state.hostId === this.localPlayerId;

    // Entrou numa partida em andamento (voltando depois de sair): pede para
    // entrar; o mundo atual do anfitrião chega com `game_started`.
    if (state.status === 'in-game' && !this.isHost && !this.rejoinRequested) {
      this.rejoinRequested = true;
      this.statusBanner?.setText('Voltando à partida...').setColor('#ffe8b0');
      this.room?.send(COOP_MESSAGES.rejoin, {});
    }
    this.currentDifficulty = (state.difficulty as DifficultyId) || 'normal';

    // Atualiza frase de dificuldade
    if (this.difficultyButton && this.difficultyPhrase) {
      const isNorm = this.currentDifficulty === 'normal';
      this.difficultyButton.setText(
        `Dificuldade: ${isNorm ? 'Normal' : 'Fácil'}${this.isHost ? '   ‹ › para trocar' : '   (o anfitrião escolhe)'}`,
      );
      this.difficultyPhrase.setText(isNorm ? '"O véu não se ergue para os fracos."' : '"Mesmo na escuridão, há misericórdia."');
    }

    let hostPlayer: any = null;
    let guestPlayer: any = null;

    state.players.forEach((p: any) => {
      if (p.id === state.hostId) {
        hostPlayer = p;
      } else {
        guestPlayer = p;
      }

      if (p.id === this.localPlayerId) {
        this.myCurrentSkin = (p.skin as SkinId) || '';
      } else {
        this.otherPlayerSkin = (p.skin as SkinId) || '';
      }
    });

    // Atualizar Slot do Host
    if (hostPlayer) {
      this.hostNameText?.setText(`${hostPlayer.name} [ANFITRIÃO]`);
      this.updateSlotVisual(this.hostSprite, this.hostSkinText, this.hostStatusText, hostPlayer);
    }

    // Atualizar Slot do Convidado
    if (guestPlayer) {
      this.guestNameText?.setText(`${guestPlayer.name} [CONVIDADO]`).setColor('#f0e2c4');
      this.updateSlotVisual(this.guestSprite, this.guestSkinText, this.guestStatusText, guestPlayer);
    } else {
      this.guestNameText?.setText('Aguardando 2º Jogador...').setColor('#6f6680');
      this.guestSkinText?.setText('');
      this.guestStatusText?.setText('Compartilhe o código da sala').setColor('#5a5070');
      this.guestSprite?.setAlpha(0.2).clearTint();
    }

    // Atualizar botões de Skin
    this.updateSkinButtonsVisual();

    // Atualizar botões de Ação
    const myPlayer = state.players.get(this.localPlayerId);
    const bothReady = Boolean(hostPlayer?.isReady && guestPlayer?.isReady);
    this.bothReady = bothReady;
    this.myReady = Boolean(myPlayer?.isReady);

    // Etapa 2: com as duas aparências confirmadas, vem a dificuldade.
    this.difficultyButton?.setVisible(bothReady);
    this.difficultyPhrase?.setVisible(bothReady);

    if (this.isHost && bothReady) {
      this.readyButton?.setVisible(false);
      this.startButton?.setVisible(true);
      this.statusBanner?.setText('Aparências escolhidas! Defina a dificuldade e inicie a jornada.').setColor('#ffe8b0');
    } else {
      this.startButton?.setVisible(false);
      this.readyButton?.setVisible(true);

      if (myPlayer?.isReady) {
        this.readyButton?.setText('— TROCAR APARÊNCIA —').setColor('#7abf8a');
      } else {
        this.readyButton?.setText('— CONFIRMAR APARÊNCIA —').setColor('#f0e2c4');
      }

      if (bothReady) {
        this.statusBanner?.setText('O anfitrião está escolhendo a dificuldade...').setColor('#c9b8ef');
      }
    }
  }

  private updateSlotVisual(
    sprite?: Phaser.GameObjects.Sprite,
    skinLabel?: Phaser.GameObjects.Text,
    statusLabel?: Phaser.GameObjects.Text,
    player?: any,
  ): void {
    if (!sprite || !skinLabel || !statusLabel || !player) return;

    if (player.skin && SKINS[player.skin as SkinId]) {
      const skin = SKINS[player.skin as SkinId];
      sprite.setAlpha(1);
      if (skin.tint !== 0xffffff) {
        sprite.setTint(skin.tint);
      } else {
        sprite.clearTint();
      }
      skinLabel.setText(skin.name).setColor(skin.accentColor);
    } else {
      sprite.setAlpha(0.35).clearTint();
      skinLabel.setText('Escolhendo aparência...').setColor('#8f84a0');
    }

    if (player.isReady) {
      statusLabel.setText('✓ PRONTO').setColor('#7abf8a');
    } else {
      statusLabel.setText('Aguardando...').setColor('#e8b860');
    }
  }

  private updateSkinButtonsVisual(): void {
    this.skinButtons.forEach(({ container, skinId }) => {
      const skin = SKINS[skinId];
      const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;
      const status = container.getAt(2) as Phaser.GameObjects.Text;

      if (skinId === this.otherPlayerSkin) {
        // Bloqueada pelo outro jogador
        bg.setFillStyle(0x0c0912, 0.8).setStrokeStyle(1, 0x442222);
        status.setText('[OCUPADA]').setColor('#d46b6b');
      } else if (skinId === this.myCurrentSkin) {
        // Selecionada por mim
        bg.setFillStyle(0x281a38, 0.95).setStrokeStyle(2, skin.accentHex);
        status.setText('✓ SUA ESCOLHA').setColor('#ffe8b0');
      } else {
        // Disponível
        bg.setFillStyle(0x120d1c, 0.85).setStrokeStyle(1, 0x3d3050);
        status.setText('Disponível').setColor('#6f6680');
      }
    });
  }

  private trySelectSkin(skinId: SkinId): void {
    if (skinId === this.otherPlayerSkin) {
      playSound(this, 'uiMove');
      this.statusBanner?.setText('Esta aparência já pertence ao outro viajante.').setColor('#d46b6b');
      return;
    }
    playSound(this, 'uiMove');
    this.room?.send('select_skin', { skinId });
  }

  private toggleReady(): void {
    if (!this.myCurrentSkin) {
      playSound(this, 'uiMove');
      this.statusBanner?.setText('Selecione uma aparência antes de ficar pronto.').setColor('#d46b6b');
      return;
    }
    playSound(this, 'uiConfirm');
    this.room?.send('toggle_ready');
  }

  // O mundo é do anfitrião: ele carrega o próprio save (ou começa um novo)
  // e o manda junto com o início, para o convidado entrar no mesmo mundo.
  private startGameHost(): void {
    if (!this.isHost) return;
    playSound(this, 'uiConfirm');
    this.room?.send('start_game', { world: startCoopAsHost(this.game) });
  }

  private onGameStarted({ difficulty, world }: GameStartedMessage): void {
    if (this.leaving) return;
    this.leaving = true;

    // O anfitrião já está no próprio mundo; o convidado entra nele.
    if (!this.isHost) {
      startCoopAsGuest(this.game, world);
    }

    if (this.myCurrentSkin) {
      setSkin(this.game, this.myCurrentSkin as SkinId);
    }
    setDifficulty(this.game, difficulty);
    // Daqui em diante a sala é vigiada pela partida inteira (quedas, volta
    // do convidado).
    if (this.room) watchCoopRoom(this.game, this.room);

    // Os dois começam onde o anfitrião parou (a última lanterna dele).
    const { roomId, entryId } = world.checkpoint;
    playSound(this, 'uiConfirm');
    this.cameras.main.fadeOut(FADE_MS, 4, 3, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('PrisonScene', { roomId, entryId });
    });
  }

  private leaveRoom(): void {
    if (this.leaving) return;
    this.leaving = true;
    playSound(this, 'uiMove');
    this.room?.leave();
    this.cameras.main.fadeOut(FADE_MS, 4, 3, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('MenuScene');
    });
  }

  private addAtmosphere(width: number, height: number): void {
    this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        const ember = this.add
          .circle(Phaser.Math.Between(0, width), height + 6, Phaser.Math.Between(1, 3), 0x9a7ad8, 0.5)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: ember,
          y: height * Phaser.Math.FloatBetween(0.2, 0.7),
          x: ember.x + Phaser.Math.Between(-40, 40),
          alpha: 0,
          duration: Phaser.Math.Between(3000, 5000),
          onComplete: () => ember.destroy(),
        });
      },
    });
  }
}
