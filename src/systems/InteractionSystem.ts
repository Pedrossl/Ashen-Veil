import Phaser from 'phaser';

import { keyLabel, type Controls } from '../core/controls';
import type { Player } from '../entities/player/Player';

export type Interactable = {
  x: number;
  // Altura (mundo) onde o aviso aparece.
  promptY: number;
  // Piso em que o objeto está: só interage quem pisa no mesmo nível
  // (evita abrir um baú da plataforma de cima, por exemplo).
  floorY: number;
  // Distância horizontal máxima entre o jogador e o objeto.
  range: number;
  isAvailable(): boolean;
  label(): string;
  interact(): void;
};

// Diferença de altura tolerada entre os pés do jogador e o piso do objeto.
const MAX_FLOOR_DIFFERENCE = 40;

const PROMPT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#e8dcc0',
  fontFamily: 'Georgia, serif',
  fontSize: '11px',
  stroke: '#0b0810',
  strokeThickness: 3,
};

// Mostra o aviso do objeto mais próximo e dispara a interação com a tecla.
export class InteractionSystem {
  private readonly interactables: Interactable[] = [];
  private readonly prompt: Phaser.GameObjects.Text;
  private readonly message: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly controls: Controls,
  ) {
    this.prompt = scene.add
      .text(0, 0, '', PROMPT_STYLE)
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setVisible(false);

    this.message = scene.add
      .text(0, 0, '', { ...PROMPT_STYLE, color: '#c9b8ef' })
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setAlpha(0);
  }

  add(interactable: Interactable): void {
    this.interactables.push(interactable);
  }

  // Mensagem curta sobre a cabeça do jogador (ex.: item obtido).
  showMessage(text: string): void {
    this.scene.tweens.killTweensOf(this.message);
    this.message
      .setText(text)
      .setPosition(this.player.x, this.player.y - 170)
      .setAlpha(1);

    this.scene.tweens.add({
      targets: this.message,
      y: this.message.y - 14,
      alpha: 0,
      delay: 1600,
      duration: 700,
    });
  }

  update(): void {
    const target = this.player.isFree ? this.findTarget() : undefined;

    if (!target) {
      this.prompt.setVisible(false);
      return;
    }

    // Enquanto uma mensagem está na tela, o aviso some para não ficar por baixo dela.
    this.prompt
      .setText(`[${keyLabel('interact')}] ${target.label()}`)
      .setPosition(target.x, target.promptY)
      .setVisible(this.message.alpha <= 0.05);

    if (this.controls.justPressed('interact')) {
      this.prompt.setVisible(false);
      target.interact();
    }
  }

  private findTarget(): Interactable | undefined {
    let nearest: Interactable | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const interactable of this.interactables) {
      const distance = Math.abs(interactable.x - this.player.x);
      const sameFloor = Math.abs(interactable.floorY - this.player.y) <= MAX_FLOOR_DIFFERENCE;

      if (
        sameFloor &&
        interactable.isAvailable() &&
        distance <= interactable.range &&
        distance < nearestDistance
      ) {
        nearest = interactable;
        nearestDistance = distance;
      }
    }

    return nearest;
  }
}
