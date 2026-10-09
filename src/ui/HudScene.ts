import Phaser from 'phaser';

import {
  GAME_EVENTS,
  type BossEngaged,
  type BossGaugeChanged,
  type ConsumableChange,
  type GroundMessageShown,
  type RewardReceived,
  type StatChange,
  type WeaponChange,
} from '../core/gameEvents';
import {
  HUD_ANIMATION,
  HUD_ATLAS,
  HUD_LAYOUT,
  HUD_VISIBLE_IN_SCENES,
} from './hudConfig';

type StatBar = {
  fill: Phaser.GameObjects.Image;
  // Rastro claro que mostra quanto acabou de ser perdido.
  trail?: Phaser.GameObjects.Image;
  shown: { ratio: number };
  trailShown: { ratio: number };
};

// Scene própria sobre o jogo: não sofre zoom nem movimento da câmera do mundo.
export class HudScene extends Phaser.Scene {
  private root?: Phaser.GameObjects.Container;
  private equipment?: Phaser.GameObjects.Image;
  private weaponIcon?: Phaser.GameObjects.Image;
  private consumable?: { icon: Phaser.GameObjects.Image; count: Phaser.GameObjects.Text };
  private health?: StatBar;
  private stamina?: StatBar;

  public constructor() {
    super({ key: 'HudScene', active: true });
  }

  public preload(): void {
    this.load.atlas(HUD_ATLAS.key, HUD_ATLAS.imagePath, HUD_ATLAS.dataPath);
  }

  public create(): void {
    const { margin, healthChannel, staminaChannel, slots } = HUD_LAYOUT;

    this.root = this.add.container(margin.x, margin.y).setVisible(false);
    this.equipment = this.add
      .image(slots.x, this.scale.height - slots.bottom, HUD_ATLAS.key, 'slots')
      .setOrigin(0, 1)
      .setScale(slots.scale)
      .setVisible(false);

    const frame = this.add.image(0, 0, HUD_ATLAS.key, 'frame').setOrigin(0);

    this.health = this.createBar('health-fill', healthChannel, true);
    this.stamina = this.createBar('stamina-fill', staminaChannel, false);

    const ornaments = this.add
      .image(0, 0, HUD_ATLAS.key, 'frame-overlay')
      .setOrigin(0);

    this.root.add([
      frame,
      ...this.barObjects(this.health),
      ...this.barObjects(this.stamina),
      ornaments,
    ]);

    this.listen(GAME_EVENTS.playerHealthChanged, this.health);
    this.listen(GAME_EVENTS.playerStaminaChanged, this.stamina);
    this.createWeaponIcon();
    this.createConsumableSlot();
    this.createBossBar();
    this.createRootBar();
    this.listenForDeath();
    this.listenForRewards();
    this.createGroundMessageBox();
  }

  public update(): void {
    const visible = HUD_VISIBLE_IN_SCENES.some((key) => this.scene.isActive(key));

    if (this.root && this.root.visible !== visible) {
      this.root.setVisible(visible);
      this.equipment?.setVisible(visible);
      this.weaponIcon?.setVisible(visible && this.weaponIcon.texture.key !== '__DEFAULT');
      this.consumable?.icon.setVisible(visible && this.consumable.icon.texture.key !== '__DEFAULT');
      this.consumable?.count.setVisible(visible && this.consumable.icon.texture.key !== '__DEFAULT');

      if (visible) {
        this.scene.bringToTop();
      }
    }
  }

  // Barra do boss: nome em cima e a barra longa de vida, no centro de baixo.
  private createBossBar(): void {
    const { width, height, bottom, gauge } = HUD_LAYOUT.bossBar;
    const left = -width / 2;
    const fillFrame = this.textures.getFrame(HUD_ATLAS.key, 'health-fill');
    const scaleX = width / fillFrame.width;
    const scaleY = height / fillFrame.height;

    const fill = this.add.image(left, 0, HUD_ATLAS.key, 'health-fill').setOrigin(0, 0.5).setScale(scaleX, scaleY);
    const trail = this.add
      .image(left, 0, HUD_ATLAS.key, 'health-fill')
      .setOrigin(0, 0.5)
      .setScale(scaleX, scaleY)
      .setTint(0xffc9a8)
      .setAlpha(0.55);
    const name = this.add
      .text(left, -14, '', {
        color: '#e6dcf5',
        fontFamily: 'Georgia, serif',
        fontSize: '17px',
        letterSpacing: 2,
        stroke: '#07050b',
        strokeThickness: 4,
      })
      .setOrigin(0, 1);

    // Segunda barra (só para bosses que a usam), com o nome à direita.
    const gaugeY = height / 2 + gauge.gap + gauge.height / 2;
    const gaugeFill = this.add.rectangle(left, gaugeY, width, gauge.height, 0xc8202e).setOrigin(0, 0.5).setScale(0, 1);
    const gaugeLabel = this.add
      .text(-left, gaugeY + gauge.height / 2 + 2, '', {
        color: '#f0a0a8',
        fontFamily: 'Georgia, serif',
        fontSize: '11px',
        letterSpacing: 2,
        stroke: '#07050b',
        strokeThickness: 3,
      })
      .setOrigin(1, 0);
    const gaugeRoot = this.add
      .container(0, 0, [
        this.add.rectangle(0, gaugeY, width + 4, gauge.height + 4, 0x0b070e, 0.85).setStrokeStyle(1, 0x5a2a30),
        gaugeFill,
        gaugeLabel,
      ])
      .setVisible(false);

    const root = this.add
      .container(this.scale.width / 2, this.scale.height - bottom, [
        this.add.rectangle(0, 0, width + 6, height + 6, 0x0b070e, 0.9).setStrokeStyle(1, 0x6a5a48),
        trail,
        fill,
        name,
        gaugeRoot,
      ])
      .setVisible(false);

    const bar: StatBar = { fill, trail, shown: { ratio: 1 }, trailShown: { ratio: 1 } };

    const onEngaged = (boss: BossEngaged): void => {
      name.setText(boss.name);
      bar.shown.ratio = boss.current / boss.max;
      bar.trailShown.ratio = bar.shown.ratio;
      this.applyCrop(fill, bar.shown.ratio);
      this.applyCrop(trail, bar.trailShown.ratio);
      root.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: root, alpha: 1, duration: 600 });
    };
    const onHealth = (change: StatChange): void => this.setRatio(bar, change);
    // Cheia, a barra pulsa: está para acontecer (ex.: o sangue vai alagar).
    const onGauge = (change: BossGaugeChanged): void => {
      const ratio = change.max > 0 ? Phaser.Math.Clamp(change.current / change.max, 0, 1) : 0;
      gaugeRoot.setVisible(true);
      gaugeLabel.setText(change.label);
      gaugeFill.setScale(ratio, 1).setFillStyle(ratio >= 0.8 ? 0xff4a58 : 0xc8202e);
    };
    const onDefeated = (): void => {
      this.tweens.add({ targets: root, alpha: 0, delay: 900, duration: 800, onComplete: () => root.setVisible(false) });
      this.showVictory();
    };
    const onDismissed = (): void => {
      this.tweens.killTweensOf(root);
      root.setVisible(false);
      gaugeRoot.setVisible(false);
    };

    const handlers: Array<[string, (...args: never[]) => void]> = [
      [GAME_EVENTS.bossEngaged, onEngaged],
      [GAME_EVENTS.bossHealthChanged, onHealth],
      [GAME_EVENTS.bossGaugeChanged, onGauge],
      [GAME_EVENTS.bossDefeated, onDefeated],
      [GAME_EVENTS.bossDismissed, onDismissed],
    ];
    handlers.forEach(([event, handler]) => this.game.events.on(event, handler));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      handlers.forEach(([event, handler]) => this.game.events.off(event, handler));
    });
  }

  // Barra verde de raízes: só aparece enquanto tem algo acumulado; perto de
  // encher, pulsa para avisar que a Raiz vai arrastar o jogador.
  private createRootBar(): void {
    const { margin, rootBar } = HUD_LAYOUT;
    const frameHeight = this.textures.getFrame(HUD_ATLAS.key, 'frame').height;
    const x = margin.x + rootBar.x;
    const y = margin.y + frameHeight + rootBar.gap;

    const back = this.add
      .rectangle(x - 2, y - 2, rootBar.width + 4, rootBar.height + 4, 0x070b08, 0.85)
      .setOrigin(0)
      .setStrokeStyle(1, 0x4f6b48);
    const fill = this.add.rectangle(x, y, rootBar.width, rootBar.height, 0x6adf6a).setOrigin(0);
    const label = this.add
      .text(x - 6, y + rootBar.height / 2, 'RAÍZES', {
        color: '#a8e09a',
        fontFamily: 'Georgia, serif',
        fontSize: '11px',
        letterSpacing: 2,
        stroke: '#050805',
        strokeThickness: 3,
      })
      .setOrigin(1, 0.5);
    const root = this.add.container(0, 0, [back, fill, label]).setVisible(false);
    const shown = { ratio: 0 };
    fill.setScale(0, 1);

    const handler = (change: StatChange): void => {
      const ratio = change.max > 0 ? Phaser.Math.Clamp(change.current / change.max, 0, 1) : 0;
      const visible = ratio > 0;

      if (visible && !root.visible) {
        root.setVisible(true).setAlpha(1);
      }

      this.tweens.killTweensOf(shown);
      this.tweens.add({
        targets: shown,
        ratio,
        duration: 160,
        ease: 'Quad.Out',
        onUpdate: () => fill.setScale(shown.ratio, 1),
        onComplete: () => {
          fill.setScale(shown.ratio, 1);
          root.setVisible(shown.ratio > 0);
        },
      });

      // Cada acúmulo pisca a barra; quase cheia, ela fica pulsando.
      if (ratio > shown.ratio) {
        this.tweens.add({ targets: fill, alpha: { from: 0.4, to: 1 }, duration: 220 });
      }
      fill.setFillStyle(ratio >= 0.65 ? 0xb4ff7a : 0x6adf6a);
    };

    const dismiss = (): void => {
      this.tweens.killTweensOf(shown);
      shown.ratio = 0;
      fill.setScale(0, 1);
      root.setVisible(false);
    };

    this.game.events.on(GAME_EVENTS.playerRootBuildupChanged, handler);
    this.game.events.on(GAME_EVENTS.bossDismissed, dismiss);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GAME_EVENTS.playerRootBuildupChanged, handler);
      this.game.events.off(GAME_EVENTS.bossDismissed, dismiss);
    });
  }

  // Mensagem do chão: caixa escura com o texto, como nos soulslike. Aparece
  // enquanto o jogador está sobre ela.
  private createGroundMessageBox(): void {
    const { bottom, width, padding } = HUD_LAYOUT.groundMessage;
    const text = this.add
      .text(0, 0, '', {
        color: '#d9cbb0',
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        fontStyle: 'italic',
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: width - padding * 2 },
        stroke: '#0b0810',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    const box = this.add.rectangle(0, 0, width, 40, 0x07050a, 0.45);
    const root = this.add.container(this.scale.width / 2, this.scale.height - bottom, [box, text]).setAlpha(0);

    const onShown = (message: GroundMessageShown): void => {
      text.setText(message.text);
      box.setSize(Math.min(width, text.width + padding * 4), text.height + padding * 2);
      this.tweens.killTweensOf(root);
      this.tweens.add({ targets: root, alpha: 0.9, duration: 400, ease: 'Sine.Out' });
    };
    const onHidden = (): void => {
      this.tweens.killTweensOf(root);
      this.tweens.add({ targets: root, alpha: 0, duration: 320, ease: 'Sine.In' });
    };

    this.game.events.on(GAME_EVENTS.groundMessageShown, onShown);
    this.game.events.on(GAME_EVENTS.groundMessageHidden, onHidden);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GAME_EVENTS.groundMessageShown, onShown);
      this.game.events.off(GAME_EVENTS.groundMessageHidden, onHidden);
    });
  }

  private listenForRewards(): void {
    const handler = (reward: RewardReceived): void => this.showReward(reward);
    this.game.events.on(GAME_EVENTS.rewardReceived, handler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GAME_EVENTS.rewardReceived, handler);
    });
  }

  // Lista do que foi recebido, depois do "GRANDE INIMIGO ABATIDO".
  private showReward(reward: RewardReceived): void {
    if (reward.lines.length === 0) {
      return;
    }

    const { width, height } = this.scale;
    const title = this.add
      .text(width / 2, height * 0.36, 'RECOMPENSA', {
        color: '#b9a7e0',
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        letterSpacing: 6,
        stroke: '#07050b',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    const objects: Array<Phaser.GameObjects.Text | Phaser.GameObjects.Image> = [title];
    reward.lines.forEach((line, index) => {
      const y = height * 0.36 + 44 + index * 40;
      const text = this.add
        .text(width / 2 + 20, y, line.text, {
          color: '#f0e2c4',
          fontFamily: 'Georgia, serif',
          fontSize: '20px',
          stroke: '#0b0810',
          strokeThickness: 4,
        })
        .setOrigin(0.5);
      objects.push(text);

      if (line.icon && this.textures.exists(line.icon)) {
        objects.push(this.add.image(text.x - text.width / 2 - 22, y, line.icon).setDisplaySize(34, 34));
      }
    });
    objects.forEach((object) => object.setAlpha(0));

    this.tweens.chain({
      targets: objects,
      tweens: [
        { alpha: 1, duration: 700, delay: HUD_ANIMATION.rewardDelay, ease: 'Sine.Out' },
        { alpha: 0, duration: 900, delay: HUD_ANIMATION.rewardHold, ease: 'Sine.In' },
      ],
      onComplete: () => objects.forEach((object) => object.destroy()),
    });
  }

  private listenForDeath(): void {
    const handler = (): void => this.showDeath();
    this.game.events.on(GAME_EVENTS.playerDied, handler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GAME_EVENTS.playerDied, handler);
    });
  }

  // Faixa escura com a mensagem de morte, como nos soulslike.
  private showDeath(): void {
    const { width, height } = this.scale;
    const band = this.add.rectangle(width / 2, height * 0.45, width, 120, 0x000000, 0.65).setAlpha(0);
    const text = this.add
      .text(width / 2, height * 0.45, 'VOCÊ MORREU', {
        color: '#9e1f22',
        fontFamily: 'Georgia, serif',
        fontSize: '56px',
        letterSpacing: 10,
        stroke: '#0a0204',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.94);

    this.tweens.add({ targets: [band, text], alpha: 1, scale: 1, duration: 1100, delay: 350, ease: 'Sine.Out' });
    this.tweens.add({
      targets: [band, text],
      alpha: 0,
      duration: 900,
      delay: 3200,
      onComplete: () => {
        band.destroy();
        text.destroy();
      },
    });
  }

  // Mensagem de vitória no centro da tela, como nos soulslike.
  private showVictory(): void {
    const text = this.add
      .text(this.scale.width / 2, this.scale.height * 0.42, 'GRANDE INIMIGO ABATIDO', {
        color: '#e8c97a',
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
        letterSpacing: 6,
        stroke: '#1a0f05',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.92);

    this.tweens.chain({
      targets: text,
      tweens: [
        { alpha: 1, scale: 1, duration: 900, delay: 1200, ease: 'Sine.Out' },
        { alpha: 0, duration: 1200, delay: 2600, ease: 'Sine.In' },
      ],
      onComplete: () => text.destroy(),
    });
  }

  // Ícone da arma equipada, inclinado dentro do slot alto.
  private createWeaponIcon(): void {
    const { slots, weaponSlot } = HUD_LAYOUT;
    const slotsHeight = this.textures.getFrame(HUD_ATLAS.key, 'slots').height;

    this.weaponIcon = this.add
      .image(
        slots.x + weaponSlot.centerX * slots.scale,
        this.scale.height - slots.bottom - (slotsHeight - weaponSlot.centerY) * slots.scale,
        '__DEFAULT',
      )
      .setAngle(weaponSlot.angle)
      .setVisible(false);

    const handler = (change: WeaponChange): void => this.showWeapon(change);
    this.game.events.on(GAME_EVENTS.playerWeaponChanged, handler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GAME_EVENTS.playerWeaponChanged, handler);
    });
  }

  // Ampola no slot quadrado, com as cargas restantes; vazia, fica apagada.
  private createConsumableSlot(): void {
    const { slots, consumableSlot } = HUD_LAYOUT;
    const slotsHeight = this.textures.getFrame(HUD_ATLAS.key, 'slots').height;
    const x = slots.x + consumableSlot.centerX * slots.scale;
    const y = this.scale.height - slots.bottom - (slotsHeight - consumableSlot.centerY) * slots.scale;

    const icon = this.add.image(x, y, '__DEFAULT').setVisible(false);
    const count = this.add
      .text(x + consumableSlot.countOffset.x * slots.scale, y + consumableSlot.countOffset.y * slots.scale, '', {
        color: '#f0e2c4',
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        fontStyle: 'bold',
        stroke: '#0b0810',
        strokeThickness: 4,
      })
      .setOrigin(1, 1)
      .setVisible(false);
    this.consumable = { icon, count };

    const handler = (change: ConsumableChange): void => this.showConsumable(change);
    this.game.events.on(GAME_EVENTS.playerConsumableChanged, handler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GAME_EVENTS.playerConsumableChanged, handler);
    });
  }

  private showConsumable(change: ConsumableChange): void {
    if (!this.consumable || !this.textures.exists(change.icon)) {
      return;
    }

    const { icon, count } = this.consumable;
    const { slots, consumableSlot } = HUD_LAYOUT;
    const visible = this.root?.visible ?? false;
    const previous = Number(count.text || change.charges);
    const empty = change.charges === 0;

    icon
      .setTexture(change.icon)
      .setScale((consumableSlot.iconLength * slots.scale) / this.textures.getFrame(change.icon).height)
      .setAlpha(empty ? 0.35 : 1)
      .setTint(empty ? 0x6a6070 : 0xffffff)
      .setVisible(visible);
    count.setText(String(change.charges)).setColor(empty ? '#8a7f8c' : '#f0e2c4').setVisible(visible);

    // Gastou uma carga: o ícone pulsa.
    if (change.charges < previous) {
      this.tweens.add({
        targets: icon,
        scale: { from: icon.scale * 1.3, to: icon.scale },
        duration: 260,
        ease: 'Back.Out',
      });
    }
  }

  private showWeapon(change: WeaponChange): void {
    if (!this.weaponIcon) {
      return;
    }

    if (!change.icon || !this.textures.exists(change.icon)) {
      this.weaponIcon.setTexture('__DEFAULT').setVisible(false);
      return;
    }

    const { slots, weaponSlot } = HUD_LAYOUT;
    const frame = this.textures.getFrame(change.icon);
    this.weaponIcon
      .setTexture(change.icon)
      .setScale((weaponSlot.iconLength * slots.scale) / frame.height)
      .setVisible(this.root?.visible ?? false);

    // Pequeno destaque ao equipar.
    this.tweens.add({
      targets: this.weaponIcon,
      scale: { from: this.weaponIcon.scale * 1.35, to: this.weaponIcon.scale },
      duration: 320,
      ease: 'Back.Out',
    });
  }

  private createBar(
    frameName: string,
    channel: { x: number; y: number },
    withTrail: boolean,
  ): StatBar {
    const fill = this.add.image(channel.x, channel.y, HUD_ATLAS.key, frameName).setOrigin(0);
    const trail = withTrail
      ? this.add
          .image(channel.x, channel.y, HUD_ATLAS.key, frameName)
          .setOrigin(0)
          .setTint(0xffc9a8)
          .setAlpha(0.55)
      : undefined;

    return { fill, trail, shown: { ratio: 1 }, trailShown: { ratio: 1 } };
  }

  private barObjects(bar: StatBar): Phaser.GameObjects.Image[] {
    return bar.trail ? [bar.trail, bar.fill] : [bar.fill];
  }

  private listen(eventName: string, bar: StatBar): void {
    const handler = (change: StatChange): void => this.setRatio(bar, change);

    this.game.events.on(eventName, handler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(eventName, handler);
    });
  }

  private setRatio(bar: StatBar, change: StatChange): void {
    const ratio = change.max > 0 ? Phaser.Math.Clamp(change.current / change.max, 0, 1) : 0;
    const isLoss = ratio < bar.shown.ratio;

    this.tweenRatio(bar.fill, bar.shown, ratio, HUD_ANIMATION.fillDuration, 0);

    if (!bar.trail) {
      return;
    }

    // Na perda, o rastro espera e depois alcança; no ganho, acompanha junto.
    this.tweenRatio(
      bar.trail,
      bar.trailShown,
      ratio,
      isLoss ? HUD_ANIMATION.damageTrailDuration : HUD_ANIMATION.fillDuration,
      isLoss ? HUD_ANIMATION.damageTrailDelay : 0,
    );
  }

  private tweenRatio(
    image: Phaser.GameObjects.Image,
    state: { ratio: number },
    target: number,
    duration: number,
    delay: number,
  ): void {
    this.tweens.killTweensOf(state);
    this.tweens.add({
      targets: state,
      ratio: target,
      duration,
      delay,
      ease: 'Quad.Out',
      onUpdate: () => this.applyCrop(image, state.ratio),
      onComplete: () => this.applyCrop(image, state.ratio),
    });
  }

  private applyCrop(image: Phaser.GameObjects.Image, ratio: number): void {
    const { width, height } = image.frame;
    image.setCrop(0, 0, Math.round(width * ratio), height);
    image.setVisible(ratio > 0);
  }
}
