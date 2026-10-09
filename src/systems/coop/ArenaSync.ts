import type { Room } from '@colyseus/sdk';

import { COOP_MESSAGES, type ArenaSummonMessage, type FromPartner } from './messages';
import { partnerName } from './partnerName';

// Arena de boss é dos dois: quem entra numa sala com boss vivo leva o
// parceiro junto, pela mesma entrada. Quem já está nessa sala não se mexe, e
// por isso a chegada do parceiro não chama de volta.
export class ArenaSync {
  constructor(
    private readonly room: Room,
    private readonly roomId: string,
    private readonly arena: ArenaSummonMessage | undefined,
    private readonly onSummoned: (summon: ArenaSummonMessage, partner: string) => void,
  ) {}

  listen(): Array<() => void> {
    if (this.arena) {
      this.room.send(COOP_MESSAGES.arenaSummon, this.arena);
    }

    return [
      this.room.onMessage(COOP_MESSAGES.arenaSummon, (summon: FromPartner<ArenaSummonMessage>) => {
        if (summon.roomId !== this.roomId) {
          this.onSummoned({ roomId: summon.roomId, entryId: summon.entryId }, partnerName(this.room, summon.id));
        }
      }),
    ];
  }
}
