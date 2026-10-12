import type { Room } from '@colyseus/sdk';

import type { RemotePlayer } from '../../entities/player/RemotePlayer';
import type { Hit, RemoteControl } from '../CombatSystem';
import { COOP_MESSAGES, type FoeGroup, type FoeHitMessage, type FoeStatesMessage } from './messages';
import type { RoomControl } from './RoomControl';

// O que um inimigo ou boss precisa para ser compartilhado.
export type SyncedFoe<S> = {
  setRemoteControl(control?: RemoteControl): void;
  addTarget(target: RemotePlayer): void;
  removeTarget(target: RemotePlayer): void;
  receiveHit(hit: Hit): void;
  snapshot(): S;
  applySnapshot(snapshot: S, instant: boolean): void;
};

// Estados por segundo (~10); quem segue desliza entre eles.
const SEND_INTERVAL_MS = 100;

// Um grupo de inimigos ou bosses de uma sala compartilhado entre os dois
// jogos. Quem comanda a sala (RoomControl) roda a IA, mira também no parceiro
// e manda os estados; o outro os segue, sem IA, e repassa os golpes que dá.
export class FoeSync<S> {
  private wasOwner = true;
  private targeted?: RemotePlayer;
  private hasState = false;
  private sinceSentMs = 0;

  constructor(
    private readonly room: Room,
    private readonly roomId: string,
    private readonly group: FoeGroup,
    private readonly foes: ReadonlyArray<SyncedFoe<S>>,
    private readonly control: RoomControl,
  ) {
    control.onChange(() => this.applyControl());
  }

  listen(): Array<() => void> {
    return [
      this.room.onMessage(COOP_MESSAGES.foeStates, (message: FoeStatesMessage<S>) => this.onStates(message)),
      this.room.onMessage(COOP_MESSAGES.foeHit, (message: FoeHitMessage) => this.onHit(message)),
      () => this.untarget(),
    ];
  }

  update(delta: number): void {
    if (!this.control.isOwner || this.foes.length === 0) {
      return;
    }

    this.sinceSentMs += delta;

    if (this.sinceSentMs >= SEND_INTERVAL_MS) {
      this.sinceSentMs = 0;
      const message: FoeStatesMessage<S> = {
        roomId: this.roomId,
        group: this.group,
        states: this.foes.map((foe) => foe.snapshot()),
      };
      this.room.send(COOP_MESSAGES.foeStates, message);
    }
  }

  private applyControl(): void {
    const { isOwner, partner } = this.control;

    if (isOwner !== this.wasOwner) {
      this.wasOwner = isOwner;
      this.hasState = false;
      // Passando a comandar, cada um volta à própria IA a partir de onde está.
      this.foes.forEach((foe, index) =>
        foe.setRemoteControl(isOwner ? undefined : { forwardHit: (hit) => this.forwardHit(index, hit) }),
      );
    }

    const wanted = isOwner ? partner : undefined;

    if (wanted !== this.targeted) {
      this.untarget();
      this.targeted = wanted;
      if (wanted) this.foes.forEach((foe) => foe.addTarget(wanted));
    }
  }

  private untarget(): void {
    const targeted = this.targeted;
    this.targeted = undefined;
    if (targeted) this.foes.forEach((foe) => foe.removeTarget(targeted));
  }

  private onStates({ roomId, group, states }: FoeStatesMessage<S>): void {
    if (this.control.isOwner || roomId !== this.roomId || group !== this.group) {
      return;
    }

    // O primeiro estado chega de uma vez (ex.: inimigos já mortos pelo parceiro).
    const instant = !this.hasState;
    this.hasState = true;
    states.forEach((state, index) => this.foes[index]?.applySnapshot(state, instant));
  }

  // Golpe que o parceiro deu num inimigo ou boss que este jogo comanda.
  private onHit({ roomId, group, index, damage, direction, critical, part }: FoeHitMessage): void {
    if (!this.control.isOwner || roomId !== this.roomId || group !== this.group) {
      return;
    }

    this.foes[index]?.receiveHit({ damage, direction, critical, part, attackerFaction: 'player', source: this.control.partner });
  }

  private forwardHit(index: number, hit: Hit): void {
    const message: FoeHitMessage = {
      roomId: this.roomId,
      group: this.group,
      index,
      damage: hit.damage,
      direction: hit.direction,
      critical: hit.critical ?? false,
      part: hit.part,
    };
    this.room.send(COOP_MESSAGES.foeHit, message);
  }
}
