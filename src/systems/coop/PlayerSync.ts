import Phaser from 'phaser';
import type { Room } from '@colyseus/sdk';

import { getSkin, type SkinId } from '../../data/skins';
import type { Player } from '../../entities/player/Player';
import { RemotePlayer } from '../../entities/player/RemotePlayer';
import { PlayerState } from '../PlayerState';
import { COOP_MESSAGES, type FromPartner, type PlayerSnapshot } from './messages';
import { partnerName } from './partnerName';

// Mensagens por segundo com o estado do personagem (~15).
const SEND_INTERVAL_MS = 66;
// Sem notícias do parceiro por este tempo, ele some (caiu ou saiu da sala).
// Folgado porque o jogo dele para de mandar com o inventário aberto.
const STALE_MS = 8000;

// Manda o estado do próprio personagem e desenha o parceiro quando os dois
// estão na mesma sala da prisão. `onRemoteChanged` avisa quando o parceiro
// aparece ou some aqui (os inimigos passam a poder mirar nele, ou não).
export class PlayerSync {
  private remote?: RemotePlayer;
  private sinceSentMs = 0;
  private sinceHeardMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly room: Room,
    private readonly player: Player,
    private readonly roomId: string,
    private readonly onRemoteChanged: (remote?: RemotePlayer) => void,
  ) {
    this.send();
  }

  get partner(): RemotePlayer | undefined {
    return this.remote;
  }

  listen(): Array<() => void> {
    const onLeave = (): void => this.removeRemote();
    this.room.onLeave(onLeave);

    return [
      this.room.onMessage(COOP_MESSAGES.playerState, (snapshot: FromPartner<PlayerSnapshot>) => this.receive(snapshot)),
      () => this.room.onLeave.remove(onLeave),
      () => this.removeRemote(),
    ];
  }

  update(delta: number): void {
    this.sinceSentMs += delta;
    this.sinceHeardMs += delta;

    if (this.sinceSentMs >= SEND_INTERVAL_MS) {
      this.sinceSentMs = 0;
      this.send();
    }

    this.remote?.follow(delta);

    if (this.remote && this.sinceHeardMs > STALE_MS) {
      this.removeRemote();
    }
  }

  private send(): void {
    const { player } = this;
    const snapshot: PlayerSnapshot = {
      roomId: this.roomId,
      x: Math.round(player.x),
      y: Math.round(player.y),
      flipX: player.flipX,
      texture: player.texture.key,
      frame: player.frame.name,
      visible: player.visible,
      skin: getSkin(this.scene.game).id as SkinId,
      weapon: PlayerState.of(this.scene.game).equippedWeaponId,
      alive: player.isAlive && !player.isDead,
      invulnerable: player.isInvulnerable,
    };
    this.room.send(COOP_MESSAGES.playerState, snapshot);
  }

  private receive(snapshot: FromPartner<PlayerSnapshot>): void {
    this.sinceHeardMs = 0;

    // Em outra sala da prisão: não aparece aqui.
    if (snapshot.roomId !== this.roomId) {
      this.removeRemote();
      return;
    }

    if (this.remote) {
      this.remote.applySnapshot(snapshot);
      return;
    }

    this.remote = new RemotePlayer(this.scene, snapshot, partnerName(this.room, snapshot.id, 'Parceiro'));
    this.onRemoteChanged(this.remote);
  }

  private removeRemote(): void {
    if (!this.remote) {
      return;
    }

    const remote = this.remote;
    this.remote = undefined;
    this.onRemoteChanged(undefined);
    remote.remove();
  }
}
