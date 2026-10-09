import type Phaser from 'phaser';
import type { Room } from '@colyseus/sdk';

import { GAME_EVENTS } from '../../core/gameEvents';
import { network } from '../../net/network';
import { currentWorld } from '../SaveGame';
import { getCoopRole, setCoopSession, setPartnerConnected } from '../Session';
import { COOP_MESSAGES, type PresenceMessage } from './messages';

// Aviso guardado quando a partida acaba fora da PrisonScene (ex.: no meio de
// uma troca de sala); a próxima tela o mostra e volta ao menu.
const ENDED_KEY = 'game:coop-ended';

let stopWatching: (() => void) | undefined;

// Vigia a sala durante a partida inteira (não só uma sala da prisão):
// - o convidado saiu: o anfitrião segue como no solo e ele pode voltar com o
//   código da sala; voltou: os dois jogam juntos de novo;
// - o anfitrião saiu ou a conexão caiu: a partida acaba para os dois;
// - o anfitrião responde com o mundo atual quando o convidado volta.
export function watchCoopRoom(game: Phaser.Game, room: Room): void {
  stopWatching?.();
  let reason: string | undefined;
  const notice = (text: string): void => {
    game.events.emit(GAME_EVENTS.coopNotice, text);
  };

  const onLeave = (): void => {
    // Saída pedida por este jogo (voltar ao menu): não é queda.
    if (network.getRoom() !== room) return;
    endCoop(game, reason ?? 'A conexão com a sala caiu. A partida cooperativa acabou.');
  };
  room.onLeave(onLeave);

  const cleanups = [
    () => room.onLeave.remove(onLeave),
    room.onMessage(COOP_MESSAGES.partnerLeft, ({ name }: PresenceMessage) => {
      setPartnerConnected(game, false);
      notice(`${name} saiu da partida. Ele pode voltar com o código da sala.`);
    }),
    room.onMessage(COOP_MESSAGES.partnerJoined, ({ name }: PresenceMessage) => {
      setPartnerConnected(game, true);
      notice(`${name} voltou à partida.`);
    }),
    room.onMessage(COOP_MESSAGES.roomDisbanded, ({ message }: { message: string }) => {
      reason = message;
    }),
    room.onMessage(COOP_MESSAGES.worldRequest, () => {
      if (getCoopRole(game) === 'host') {
        room.send(COOP_MESSAGES.worldSnapshot, { world: currentWorld(game) });
      }
    }),
  ];
  stopWatching = () => {
    cleanups.forEach((cleanup) => cleanup());
    stopWatching = undefined;
  };
}

// A partida cooperativa acabou: volta ao solo e avisa quem estiver na tela.
function endCoop(game: Phaser.Game, message: string): void {
  stopWatching?.();
  network.leaveRoom();
  setCoopSession(game, undefined);
  game.registry.set(ENDED_KEY, message);
  game.events.emit(GAME_EVENTS.coopEnded, message);
}

// A partida cooperativa acabou e o aviso ainda não foi mostrado.
export function hasCoopEnded(game: Phaser.Game): boolean {
  return game.registry.get(ENDED_KEY) !== undefined;
}

// Lê (e esquece) o aviso de fim da partida, se houver.
export function takeCoopEndedNotice(game: Phaser.Game): string | undefined {
  const message = game.registry.get(ENDED_KEY) as string | undefined;
  game.registry.remove(ENDED_KEY);
  return message;
}
