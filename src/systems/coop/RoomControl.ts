import type Phaser from 'phaser';
import type { Room } from '@colyseus/sdk';

import type { Player } from '../../entities/player/Player';
import type { RemotePlayer } from '../../entities/player/RemotePlayer';
import type { CombatSystem } from '../CombatSystem';
import { playSound } from '../SoundEffects';
import {
  COOP_MESSAGES,
  type EnterRoomMessage,
  type PlayerHitMessage,
  type RoomOwnerMessage,
} from './messages';

// Quem comanda esta sala da prisão. Cada jogador anda livre; numa sala com
// os dois, o primeiro a chegar (decidido pelo servidor) comanda inimigos e
// bosses: roda a IA, que mira nos dois, e resolve os golpes deles, inclusive
// no parceiro (repassados ao jogo dele, que confere a esquiva). Sozinho numa
// sala, cada um comanda a sua, como no solo. Os grupos (FoeSync) seguem as
// mudanças por `onChange`.
export class RoomControl {
  // Até o servidor responder, cada um comanda a própria sala.
  private owner = true;
  private remote?: RemotePlayer;
  private readonly listeners: Array<() => void> = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly room: Room,
    private readonly roomId: string,
    private readonly combat: CombatSystem,
    private readonly player: Player,
  ) {}

  get isOwner(): boolean {
    return this.owner;
  }

  // O parceiro, quando está nesta sala.
  get partner(): RemotePlayer | undefined {
    return this.remote;
  }

  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  listen(): Array<() => void> {
    const cleanups = [
      this.room.onMessage(COOP_MESSAGES.roomOwner, ({ roomId, ownerId }: RoomOwnerMessage) => {
        if (roomId === this.roomId) this.update(ownerId === this.room.sessionId, this.remote);
      }),
      this.room.onMessage(COOP_MESSAGES.playerHit, (message: PlayerHitMessage) => this.onPlayerHit(message)),
      () => this.update(this.owner, undefined),
    ];

    const enter: EnterRoomMessage = { roomId: this.roomId };
    this.room.send(COOP_MESSAGES.enterRoom, enter);
    return cleanups;
  }

  // O parceiro chegou ou saiu desta sala.
  setPartner(partner?: RemotePlayer): void {
    this.update(this.owner, partner);
  }

  private update(owner: boolean, partner?: RemotePlayer): void {
    if (owner === this.owner && partner === this.remote) {
      return;
    }

    this.untargetPartner();
    this.owner = owner;
    this.remote = partner;

    // Quem comanda resolve os golpes no parceiro e os repassa a ele.
    if (owner && partner) {
      partner.onHit = (hit) => {
        const message: PlayerHitMessage = { damage: hit.damage, direction: hit.direction };
        this.room.send(COOP_MESSAGES.playerHit, message);
      };
      this.combat.addTarget(partner);
    }

    this.listeners.forEach((listener) => listener());
  }

  private untargetPartner(): void {
    if (this.remote) {
      this.remote.onHit = undefined;
      this.combat.remove(this.remote);
    }
  }

  // Golpe que um inimigo ou boss comandado pelo parceiro deu neste jogador:
  // a esquiva é conferida aqui, onde ele de fato está rolando ou não.
  private onPlayerHit({ damage, direction }: PlayerHitMessage): void {
    if (!this.player.isAlive || this.player.isInvulnerable) {
      return;
    }

    this.player.receiveHit({ damage, direction, attackerFaction: 'enemy' });
    playSound(this.scene, 'impact', this.player);
    this.scene.cameras.main.shake(90, 0.003);
  }
}
