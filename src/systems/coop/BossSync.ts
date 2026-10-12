import type { Room } from '@colyseus/sdk';

import type { BossSnapshot } from '../../entities/bosses/BossSnapshot';
import type { RoomBoss } from '../../maps/types';
import { FoeSync } from './FoeSync';
import { COOP_MESSAGES, type BossDecisionMessage } from './messages';
import type { RoomControl } from './RoomControl';

// Bosses da sala: um só para os dois. Além do estado (FoeSync), quem comanda
// anuncia cada decisão (golpe, teleporte, mergulho...) e o outro jogo a
// executa com as mesmas animações e efeitos. Os golpes do boss acertam no
// jogo que comanda; vida, fases e a barra de raízes chegam pelo estado.
export class BossSync {
  private readonly foes: FoeSync<BossSnapshot>;

  constructor(
    private readonly room: Room,
    private readonly roomId: string,
    private readonly bosses: readonly RoomBoss[],
    control: RoomControl,
  ) {
    this.foes = new FoeSync(room, roomId, 'bosses', bosses, control);
  }

  listen(): Array<() => void> {
    this.bosses.forEach((boss, index) =>
      boss.onDecision((decision) => {
        const message: BossDecisionMessage = { roomId: this.roomId, index, decision };
        this.room.send(COOP_MESSAGES.bossDecision, message);
      }),
    );

    return [
      ...this.foes.listen(),
      this.room.onMessage(COOP_MESSAGES.bossDecision, ({ roomId, index, decision }: BossDecisionMessage) => {
        if (roomId === this.roomId) this.bosses[index]?.applyDecision(decision);
      }),
      () => this.bosses.forEach((boss) => boss.onDecision(undefined)),
    ];
  }

  update(delta: number): void {
    this.foes.update(delta);
  }
}
