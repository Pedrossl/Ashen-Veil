import type { Room } from '@colyseus/sdk';

import type { Player } from '../../entities/player/Player';
import { COOP_MESSAGES, type FromPartner, type RestReadyMessage } from './messages';

// Descanso é dos dois: quem senta na lanterna avisa e espera o parceiro sentar
// na mesma. Com os dois sentados, cada jogo descansa (recupera tudo, a
// lanterna vira o checkpoint e a sala é recriada, então os inimigos voltam
// para os dois). Levantar antes cancela.
export class RestSync {
  private localBonfire?: string;
  private partnerBonfire?: string;
  private onBothSeated?: () => void;

  constructor(
    private readonly room: Room,
    private readonly roomId: string,
    private readonly player: Player,
    private readonly notify: (message: string) => void,
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
    ];
  }

  // Sentou na lanterna: descansa quando o parceiro também estiver sentado nela.
  requestRest(bonfireId: string, onBothSeated: () => void): void {
    this.localBonfire = bonfireId;
    this.onBothSeated = onBothSeated;
    const message: RestReadyMessage = { roomId: this.roomId, bonfireId };
    this.room.send(COOP_MESSAGES.restReady, message);

    if (!this.tryRest()) {
      this.notify('Esperando o parceiro sentar na lanterna...');
    }
  }

  // Levantou antes do parceiro sentar: desiste do descanso.
  update(): void {
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
