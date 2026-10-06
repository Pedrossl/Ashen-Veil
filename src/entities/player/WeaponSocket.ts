import Phaser from 'phaser';

import { PLAYER_SPRITE } from '../../data/player';
import {
  PLAYER_WEAPON_SOCKETS,
  WEAPON_BLADE_LENGTH,
  WEAPON_GRIP_ORIGIN_Y,
} from '../../data/playerWeaponSockets';

// Desenha a arma equipada presa à mão do jogador. A arma é um sprite separado:
// trocar de arma troca só a textura, sem refazer as animações do corpo.
export class WeaponSocket {
  private readonly image: Phaser.GameObjects.Image;
  private textureKey?: string;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly owner: Phaser.GameObjects.Sprite,
  ) {
    this.image = scene.add
      .image(owner.x, owner.y, '__DEFAULT')
      .setOrigin(0.5, WEAPON_GRIP_ORIGIN_Y)
      .setVisible(false);

    // Depois da física, quando o sprite do jogador já está na posição final.
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.follow, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  // `undefined` deixa a mão vazia (desarmado).
  equip(textureKey: string | undefined): void {
    this.textureKey = textureKey;

    if (!textureKey) {
      this.image.setVisible(false);
      return;
    }

    const frame = this.scene.textures.getFrame(textureKey);
    const bladeLength = frame.height * (WEAPON_GRIP_ORIGIN_Y - 0.05);
    this.image
      .setTexture(textureKey)
      .setScale((WEAPON_BLADE_LENGTH / bladeLength) * PLAYER_SPRITE.scale);
  }

  private follow(): void {
    const socket = this.textureKey
      ? PLAYER_WEAPON_SOCKETS[this.owner.texture.key]?.[Number(this.owner.frame.name)]
      : undefined;

    if (!socket || !this.owner.visible) {
      this.image.setVisible(false);
      return;
    }

    const flip = this.owner.flipX ? -1 : 1;
    const { scale } = PLAYER_SPRITE;
    // Origem do jogador: centro horizontal e base do quadro.
    const localX = (socket.x - PLAYER_SPRITE.frameWidth / 2) * scale * flip;
    const localY = (socket.y - PLAYER_SPRITE.frameHeight) * scale;

    this.image
      .setVisible(true)
      .setPosition(this.owner.x + localX, this.owner.y + localY)
      .setAngle(socket.angle * flip)
      .setFlipX(this.owner.flipX)
      .setDepth(this.owner.depth + (socket.front ? 0.1 : -0.1))
      .setTint(this.owner.isTinted ? this.owner.tintTopLeft : 0xffffff);
  }

  private destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.follow, this);
    this.image.destroy();
  }
}
