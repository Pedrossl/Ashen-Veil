import type Phaser from 'phaser';
import type { Room } from '@colyseus/sdk';

import type { Player } from '../../entities/player/Player';
import { isCoopActive } from '../Session';
import { COOP_MESSAGES, type FromPartner, type RestReadyMessage, type RestReviveMessage } from './messages';
import type { PartnerStatus } from './PlayerSync';

// Lanterna onde se descansa: a sala e a entrada do renascimento.
export type RestPoint = { bonfireId: string; roomId: string; entryId: string };

// Descanso é dos dois: quem senta na lanterna avisa e espera o parceiro sentar
// na mesma. Com os dois sentados, cada jogo descansa (recupera tudo, a
// lanterna vira o checkpoint e a sala é recriada, então os inimigos voltam
// para os dois). Levantar antes cancela. Exceções: com o parceiro fora da
// partida, descansa sozinho; com o parceiro caído assistindo (espectador),
// descansa e o traz de volta nesta lanterna (`onRevived` no jogo dele).
export class RestSync {
  private localBonfire?: string;
  private partnerBonfire?: string;
  private onBothSeated?: () => void;

  constructor(
    private readonly game: Phaser.Game,
    private readonly room: Room,
    private readonly roomId: string,
    private readonly player: Player,
    private readonly partnerStatus: () => PartnerStatus | undefined,
    private readonly notify: (message: string) => void,
    private readonly onRevived: (revive: RestReviveMessage) => void,
  ) {}

  listen(): Array<() => void> {
    return [
      this.room.onMessage(COOP_MESSAGES.restReady, (message: FromPartner<RestReadyMessage>) => {
        this.partnerBonfire = message.roomId === this.roomId ? message.bonfireId : undefined;
        this.tryRest();
      }),
      this.room.onMessage(COOP_MESSAGES.restCancel, () => {
        this.partnerBonfire = undefined;
      }),
      this.room.onMessage(COOP_MESSAGES.restRevive, (message: RestReviveMessage) => this.onRevived(message)),
    ];
  }

  // Sentou na lanterna: descansa quando o parceiro também estiver sentado nela.
  requestRest(point: RestPoint, onRested: () => void): void {
    if (!isCoopActive(this.game)) {
      onRested();
      return;
    }

    if (this.partnerStatus()?.spectating) {
      const revive: RestReviveMessage = { roomId: point.roomId, entryId: point.entryId };
      this.room.send(COOP_MESSAGES.restRevive, revive);
      onRested();
      return;
    }

    this.localBonfire = point.bonfireId;
    this.onBothSeated = onRested;
    const message: RestReadyMessage = { roomId: this.roomId, bonfireId: point.bonfireId };
    this.room.send(COOP_MESSAGES.restReady, message);

    if (!this.tryRest()) {
      this.notify('Esperando o parceiro sentar na lanterna...');
    }
  }

  // Levantou antes do parceiro sentar: desiste do descanso. O parceiro saiu
  // da partida enquanto esperava: descansa sozinho.
  update(): void {
    if (this.localBonfire && !isCoopActive(this.game)) {
      this.partnerBonfire = this.localBonfire;
      this.tryRest();
      return;
    }

    if (this.localBonfire && !this.player.isSeated) {
      this.localBonfire = undefined;
      this.onBothSeated = undefined;
      this.room.send(COOP_MESSAGES.restCancel, {});
    }
  }

  private tryRest(): boolean {
    if (!this.localBonfire || this.localBonfire !== this.partnerBonfire) {
      return false;
    }

    const rest = this.onBothSeated;
    this.localBonfire = undefined;
    this.partnerBonfire = undefined;
    this.onBothSeated = undefined;
    rest?.();
    return true;
  }
}
