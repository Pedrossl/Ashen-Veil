import type Phaser from 'phaser';

import { withKeyLabels } from '../core/controls';
import { GAME_EVENTS, type GroundMessageShown } from '../core/gameEvents';
import type { GroundMessage } from '../entities/world/GroundMessage';

// Distância horizontal para ler e tolerância entre os pés e o piso da mensagem.
const READ_RANGE = 70;
const FLOOR_TOLERANCE = 40;

// Lê a mensagem do chão quando o jogador pisa perto e avisa o HUD, que mostra
// o texto na tela; ao se afastar, a leitura some.
export class GroundMessageSystem {
  private current?: GroundMessage;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly messages: readonly GroundMessage[],
  ) {
    scene.game.events.emit(GAME_EVENTS.groundMessageHidden);
  }

  update(player: { x: number; y: number; isAlive: boolean }): void {
    const nearest = player.isAlive
      ? this.messages.find(
          (message) =>
            Math.abs(message.x - player.x) <= READ_RANGE && Math.abs(message.floorY - player.y) <= FLOOR_TOLERANCE,
        )
      : undefined;

    if (nearest === this.current) {
      return;
    }

    this.current?.setRead(false);
    this.current = nearest;

    if (nearest) {
      nearest.setRead(true);
      const shown: GroundMessageShown = { text: withKeyLabels(nearest.text) };
      this.scene.game.events.emit(GAME_EVENTS.groundMessageShown, shown);
    } else {
      this.scene.game.events.emit(GAME_EVENTS.groundMessageHidden);
    }
  }
}
