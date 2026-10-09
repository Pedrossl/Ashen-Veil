import Phaser from 'phaser';
import { playSound } from '../systems/SoundEffects';
import { Controls } from '../core/controls';
import { PLAYER_SPRITE, PLAYER_ANIMATION } from '../data/player';
import { SKINS, SKIN_ORDER, setSkin, type SkinId } from '../data/skins';

const TITLE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#d9c8f2',
  fontFamily: 'Georgia, serif',
  fontSize: '36px',
  stroke: '#120a1c',
  strokeThickness: 5,
};

const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#f0e2c4',
  fontFamily: 'Georgia, serif',
  fontSize: '22px',
  stroke: '#0b0810',
  strokeThickness: 4,
};

const LORE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#9a8db0',
  fontFamily: 'Georgia, serif',
  fontSize: '15px',
  fontStyle: 'italic',
  stroke: '#08060e',
  strokeThickness: 3,
  align: 'center',
  lineSpacing: 6,
};

const HINT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#5a5070',
  fontFamily: 'Georgia, serif',
  fontSize: '14px',
  align: 'center',
};

const FADE_MS = 600;
const SLIDE_MS = 280;

type CharacterSceneData = {
  // Dados passados pela MenuScene para a PrisonScene ao confirmar.
  launchData: object;
};

export class CharacterScene extends Phaser.Scene {
  private controls?: Controls;
  private leaving = false;
  private selectedIndex = 0;

  // Sprites de preview (um por skin, lado a lado fora da tela).
  private previewSprites: Phaser.GameObjects.Sprite[] = [];
  // Container que desliza horizontalmente.
  private carousel?: Phaser.GameObjects.Container;

  // Textos dinâmicos.
  private skinNameText?: Phaser.GameObjects.Text;
  private loreText?: Phaser.GameObjects.Text;
  private dotIndicators: Phaser.GameObjects.Arc[] = [];

  // Brilho de acento que muda de cor com a skin.
  private accentGlow?: Phaser.GameObjects.Ellipse;

  // Dados vindos do MenuScene.
  private launchData: object = {};

  constructor() {
    super('CharacterScene');
  }

  init(data: CharacterSceneData): void {
    this.launchData = data?.launchData ?? {};
    this.leaving = false;
    this.selectedIndex = 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const keyboard = this.input.keyboard;

    if (!keyboard) throw new Error('Teclado indisponível na CharacterScene.');
    this.controls = new Controls(keyboard);

    this.cameras.main.setBackgroundColor('#050308');
    this.addAtmosphere(width, height);

    // ── Título ──
    this.add
      .text(width / 2, height * 0.1, 'ESCOLHA SUA APARÊNCIA', TITLE_STYLE)
      .setOrigin(0.5);

    // ── Carrossel de previews ──
    this.buildCarousel(width, height);

    // ── Textos dinâmicos ──
    this.skinNameText = this.add
      .text(width / 2, height * 0.76, '', LABEL_STYLE)
      .setOrigin(0.5);

    this.loreText = this.add
      .text(width / 2, height * 0.83, '', LORE_STYLE)
      .setOrigin(0.5);

    // ── Indicadores de ponto ──
    this.buildDots(width, height);

    // ── Setas de navegação ──
    this.buildArrows(width, height);

    // ── Botão confirmar ──
    const confirmBtn = this.add
      .text(width / 2, height * 0.93, '— Confirmar —', {
        ...LABEL_STYLE,
        color: '#f0e2c4',
        fontSize: '20px',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    confirmBtn.on('pointerover', () => confirmBtn.setColor('#ffe8b0'));
    confirmBtn.on('pointerout', () => confirmBtn.setColor('#f0e2c4'));
    confirmBtn.on('pointerdown', () => this.confirm());
    this.tweens.add({ targets: confirmBtn, alpha: { from: 0.7, to: 1 }, duration: 1100, yoyo: true, repeat: -1 });

    // ── Dica de teclado ──
    this.add
      .text(width / 2, height * 0.97, '← → para navegar  ·  Enter ou E para confirmar  ·  Esc para voltar', HINT_STYLE)
      .setOrigin(0.5);

    // ── Seleção inicial ──
    this.applySelection(0, false);

    this.cameras.main.fadeIn(FADE_MS, 5, 3, 8);

    // ── Input loop ──
    this.events.on(Phaser.Scenes.Events.UPDATE, () => this.handleInput());
  }

  // ── Carrossel ──

  private buildCarousel(width: number, height: number): void {
    // Brilho de acento centralizado atrás do personagem.
    this.accentGlow = this.add
      .ellipse(width / 2, height * 0.5, 260, 340, 0xa070d8, 0.13)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Um container que se desloca para revelar o sprite correto.
    this.carousel = this.add.container(width / 2, height * 0.5);
    const SPACING = width * 0.55; // distância entre os previews no carrossel.

    SKIN_ORDER.forEach((skinId, i) => {
      const skin = SKINS[skinId];
      const offsetX = (i - 0) * SPACING; // Índice 0 começa centralizado.

      const sprite = this.add
        .sprite(offsetX, 0, PLAYER_SPRITE.sheets.idle.key, PLAYER_ANIMATION.idleFrame)
        .setOrigin(0.5, 0.5)
        .setScale(PLAYER_SPRITE.scale * 1.4);

      // Aplicar tint da skin.
      if (skin.tint !== 0xffffff) {
        sprite.setTint(skin.tint);
      }

      // Animação idle no carrossel.
      const animKey = `char-idle-${skinId}`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(PLAYER_SPRITE.sheets.idle.key, {
            start: PLAYER_ANIMATION.idleFrames.start,
            end: PLAYER_ANIMATION.idleFrames.end,
          }),
          frameRate: PLAYER_ANIMATION.idleBreathFrameRate,
          repeat: -1,
        });
      }
      sprite.play(animKey);

      this.carousel!.add(sprite);
      this.previewSprites.push(sprite);
    });

    // Ajustar posições agora que o index 0 está centralizado.
    this.previewSprites.forEach((sprite, i) => {
      sprite.setX((i - 0) * SPACING);
    });
  }

  private buildDots(width: number, height: number): void {
    const total = SKIN_ORDER.length;
    const dotSpacing = 22;
    const startX = width / 2 - ((total - 1) * dotSpacing) / 2;

    this.dotIndicators = SKIN_ORDER.map((_, i) => {
      const dot = this.add
        .circle(startX + i * dotSpacing, height * 0.72, 5, 0x5a4870, 1)
        .setInteractive({ useHandCursor: true });
      dot.on('pointerdown', () => this.navigateTo(i));
      return dot;
    });
  }

  private buildArrows(width: number, height: number): void {
    const arrowStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: '#7a6898',
      fontFamily: 'Georgia, serif',
      fontSize: '32px',
    };

    const leftArrow = this.add
      .text(width * 0.18, height * 0.5, '‹', arrowStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    leftArrow.on('pointerover', () => leftArrow.setColor('#c9b8ef'));
    leftArrow.on('pointerout', () => leftArrow.setColor('#7a6898'));
    leftArrow.on('pointerdown', () => this.navigate(-1));

    const rightArrow = this.add
      .text(width * 0.82, height * 0.5, '›', arrowStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    rightArrow.on('pointerover', () => rightArrow.setColor('#c9b8ef'));
    rightArrow.on('pointerout', () => rightArrow.setColor('#7a6898'));
    rightArrow.on('pointerdown', () => this.navigate(1));
  }

  // ── Navegação ──

  private handleInput(): void {
    if (this.leaving || !this.controls) return;

    if (this.controls.justPressed('left')) {
      this.navigate(-1);
    } else if (this.controls.justPressed('right')) {
      this.navigate(1);
    } else if (this.controls.justPressed('confirm') || this.controls.justPressed('interact')) {
      this.confirm();
    } else if (this.controls.justPressed('cancel')) {
      this.goBack();
    }
  }

  private navigate(dir: -1 | 1): void {
    const next = Phaser.Math.Wrap(this.selectedIndex + dir, 0, SKIN_ORDER.length);
    this.navigateTo(next);
  }

  private navigateTo(index: number): void {
    if (index === this.selectedIndex) return;
    playSound(this, 'uiMove');
    this.applySelection(index, true);
  }

  private applySelection(index: number, animate: boolean): void {
    this.selectedIndex = index;
    const skin = SKINS[SKIN_ORDER[index]];

    // Deslizar o carrossel para revelar o sprite correto.
    const { width } = this.scale;
    const SPACING = width * 0.55;
    const targetX = width / 2 - index * SPACING;

    if (animate && this.carousel) {
      this.tweens.killTweensOf(this.carousel);
      this.tweens.add({ targets: this.carousel, x: targetX, duration: SLIDE_MS, ease: 'Power2' });
    } else if (this.carousel) {
      this.carousel.setX(targetX);
    }

    // Atualizar textos.
    this.skinNameText?.setText(skin.name);
    this.loreText?.setText(skin.lore);

    // Atualizar brilho de acento.
    if (this.accentGlow) {
      this.tweens.killTweensOf(this.accentGlow);
      this.accentGlow.setFillStyle(skin.accentHex, 0.13);
      if (animate) {
        this.accentGlow.setAlpha(0.3);
        this.tweens.add({ targets: this.accentGlow, alpha: 1, duration: 400 });
      }
    }
    // Pulsar brilho continuamente.
    this.tweens.add({
      targets: this.accentGlow,
      alpha: { from: 0.08, to: 0.2 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      delay: animate ? 400 : 0,
    });

    // Atualizar pontos indicadores.
    this.dotIndicators.forEach((dot, i) => {
      if (i === index) {
        dot.setFillStyle(skin.accentHex, 1).setRadius(7);
      } else {
        dot.setFillStyle(0x5a4870, 1).setRadius(5);
      }
    });

    // Escurecer sprites não selecionados.
    this.previewSprites.forEach((sprite, i) => {
      const isSelected = i === index;
      this.tweens.add({
        targets: sprite,
        alpha: isSelected ? 1 : 0.25,
        scaleX: isSelected ? PLAYER_SPRITE.scale * 1.4 : PLAYER_SPRITE.scale * 1.1,
        scaleY: isSelected ? PLAYER_SPRITE.scale * 1.4 : PLAYER_SPRITE.scale * 1.1,
        duration: animate ? SLIDE_MS : 0,
      });
    });
  }

  // ── Confirmar / Voltar ──

  private confirm(): void {
    if (this.leaving) return;
    const skinId: SkinId = SKIN_ORDER[this.selectedIndex];
    setSkin(this.game, skinId);
    playSound(this, 'uiConfirm');
    this.leaving = true;
    this.cameras.main.fadeOut(FADE_MS, 4, 3, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('PrisonScene', this.launchData);
    });
  }

  private goBack(): void {
    if (this.leaving) return;
    playSound(this, 'uiMove');
    this.leaving = true;
    this.cameras.main.fadeOut(FADE_MS, 5, 3, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('MenuScene');
    });
  }

  // ── Atmosfera ──

  private addAtmosphere(width: number, height: number): void {
    this.time.addEvent({
      delay: 180,
      loop: true,
      callback: () => {
        const ember = this.add
          .circle(Phaser.Math.Between(0, width), height + 6, Phaser.Math.Between(1, 3), 0xffa050, 0.7)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: ember,
          y: height * Phaser.Math.FloatBetween(0.15, 0.65),
          x: ember.x + Phaser.Math.Between(-50, 50),
          alpha: 0,
          duration: Phaser.Math.Between(3200, 5800),
          onComplete: () => ember.destroy(),
        });
      },
    });
  }
}
