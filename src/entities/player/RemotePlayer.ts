import Phaser from 'phaser';

import { PLAYER_SPRITE } from '../../data/player';
import { SKINS, type SkinId } from '../../data/skins';
import { WEAPONS, type WeaponDefinition, type WeaponId } from '../../data/weapons';
import type { Damageable, Hit } from '../../systems/CombatSystem';
import { WeaponSocket } from './WeaponSocket';

// Estado do personagem que cada jogo manda ao parceiro no cooperativo.
export type PlayerSnapshot = {
  roomId: string;
  x: number;
  y: number;
  flipX: boolean;
  texture: string;
  frame: string | number;
  visible: boolean;
  skin: SkinId;
  weapon: WeaponId;
  alive: boolean;
  // Rolando (ou agarrado): golpes passam por ele.
  invulnerable: boolean;
};

// Quanto da distância até a última posição recebida ele anda por quadro de 60 FPS.
const FOLLOW_RATE = 0.35;
// Longe demais (troca de sala, renascimento): pula direto.
const SNAP_DISTANCE = 400;
const NAME_OFFSET_Y = 168;

// O parceiro no cooperativo: sem física. Copia o quadro de animação que o jogo
// dele manda e desliza até a posição recebida. Inimigos comandados por este
// jogo podem mirar e acertá-lo; o golpe é repassado (`onHit`) ao jogo dele,
// que confere a esquiva e aplica o dano.
export class RemotePlayer extends Phaser.GameObjects.Sprite implements Damageable {
  readonly faction = 'player' as const;
  onHit?: (hit: Hit) => void;
  private alive = true;
  private invulnerable = false;
  private readonly weaponSocket: WeaponSocket;
  private readonly nameTag: Phaser.GameObjects.Text;
  private targetX: number;
  private targetY: number;
  private skinId?: SkinId;
  private weaponId?: WeaponId;

  constructor(scene: Phaser.Scene, snapshot: PlayerSnapshot, name: string) {
    super(scene, snapshot.x, snapshot.y, snapshot.texture, snapshot.frame);
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setScale(PLAYER_SPRITE.scale).setDepth(9.9);
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.weaponSocket = new WeaponSocket(scene, this, () => (this.skinId ? SKINS[this.skinId].tint : 0xffffff));
    this.nameTag = scene.add
      .text(snapshot.x, snapshot.y - NAME_OFFSET_Y, name, {
        color: '#d9c8f2',
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        stroke: '#07050b',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setAlpha(0.85);
    this.applySnapshot(snapshot);
  }

  applySnapshot(snapshot: PlayerSnapshot): void {
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;

    if (Phaser.Math.Distance.Between(this.x, this.y, snapshot.x, snapshot.y) > SNAP_DISTANCE) {
      this.setPosition(snapshot.x, snapshot.y);
    }

    if (this.scene.textures.exists(snapshot.texture)) {
      this.setTexture(snapshot.texture, snapshot.frame);
    }

    this.setFlipX(snapshot.flipX).setVisible(snapshot.visible);
    this.alive = snapshot.alive;
    this.invulnerable = snapshot.invulnerable;
    this.nameTag.setVisible(snapshot.visible);

    if (snapshot.skin !== this.skinId) {
      this.skinId = snapshot.skin;
      const tint = SKINS[snapshot.skin]?.tint ?? 0xffffff;
      if (tint === 0xffffff) this.clearTint();
      else this.setTint(tint);
    }

    if (snapshot.weapon !== this.weaponId && snapshot.weapon in WEAPONS) {
      this.weaponId = snapshot.weapon;
      const weapon: WeaponDefinition = WEAPONS[snapshot.weapon];
      this.weaponSocket.equip(weapon.sprite, weapon.bladeScale, weapon.gripOriginY);
    }
  }

  get isAlive(): boolean {
    return this.alive;
  }

  get isInvulnerable(): boolean {
    return this.invulnerable;
  }

  // Mesmo corpo do jogador (PLAYER_SPRITE.body), a partir dos pés.
  getHurtbox(): Phaser.Geom.Rectangle {
    const { width, height, offsetY } = PLAYER_SPRITE.body;
    const { scale, frameHeight } = PLAYER_SPRITE;
    return new Phaser.Geom.Rectangle(
      this.x - (width * scale) / 2,
      this.y - (frameHeight - offsetY) * scale,
      width * scale,
      height * scale,
    );
  }

  receiveHit(hit: Hit): void {
    this.onHit?.(hit);
  }

  // Desliza até a última posição recebida (as mensagens chegam ~15 vezes por segundo).
  follow(delta: number): void {
    const t = 1 - Math.pow(1 - FOLLOW_RATE, delta / (1000 / 60));
    this.x = Phaser.Math.Linear(this.x, this.targetX, t);
    this.y = Phaser.Math.Linear(this.y, this.targetY, t);
    this.nameTag.setPosition(this.x, this.y - NAME_OFFSET_Y);
  }

  remove(): void {
    this.weaponSocket.dispose();
    this.nameTag.destroy();
    this.destroy();
  }
}
