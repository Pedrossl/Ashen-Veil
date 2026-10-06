import Phaser from 'phaser';

import {
  GAME_EVENTS,
  type BossEngaged,
  type ConsumableChange,
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
  private bossBar?: { root: Phaser.GameObjects.Container; name: Phaser.GameObjects.Text; bar: StatBar };
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
    this.listenForDeath();
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
    const { width, height, bottom } = HUD_LAYOUT.bossBar;
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

    const root = this.add
      .container(this.scale.width / 2, this.scale.height - bottom, [
        this.add.rectangle(0, 0, width + 6, height + 6, 0x0b070e, 0.9).setStrokeStyle(1, 0x6a5a48),
        trail,
        fill,
        name,
      ])
      .setVisible(false);

    const bar: StatBar = { fill, trail, shown: { ratio: 1 }, trailShown: { ratio: 1 } };
    this.bossBar = { root, name, bar };

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
    const onDefeated = (): void => {
      this.tweens.add({ targets: root, alpha: 0, delay: 900, duration: 800, onComplete: () => root.setVisible(false) });
      this.showVictory();
    };
    const onDismissed = (): void => {
      this.tweens.killTweensOf(root);
      root.setVisible(false);
    };

    const handlers: Array<[string, (...args: never[]) => void]> = [
      [GAME_EVENTS.bossEngaged, onEngaged],
      [GAME_EVENTS.bossHealthChanged, onHealth],
      [GAME_EVENTS.bossDefeated, onDefeated],
      [GAME_EVENTS.bossDismissed, onDismissed],
    ];
    handlers.forEach(([event, handler]) => this.game.events.on(event, handler));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      handlers.forEach(([event, handler]) => this.game.events.off(event, handler));
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
        fontSize: '13px',
        fontStyle: 'bold',
        stroke: '#0b0810',
        strokeThickness: 3,
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
