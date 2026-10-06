import Phaser from 'phaser';

const { KeyCodes } = Phaser.Input.Keyboard;

// Mapeamento único de teclas; outras partes do jogo não devem criar teclas soltas.
export const CONTROL_BINDINGS = {
  left: [KeyCodes.A, KeyCodes.LEFT],
  right: [KeyCodes.D, KeyCodes.RIGHT],
  up: [KeyCodes.W, KeyCodes.UP],
  down: [KeyCodes.S, KeyCodes.DOWN],
  attack: [KeyCodes.J],
  dodge: [KeyCodes.K],
  run: [KeyCodes.SPACE],
  interact: [KeyCodes.E],
  // Bebe a ampola de cura.
  useItem: [KeyCodes.R],
  // Só em desenvolvimento: liga/desliga a vida infinita.
  devInfiniteHealth: [KeyCodes.I],
} as const;

export type ControlAction = keyof typeof CONTROL_BINDINGS;

export class Controls {
  private readonly keys: Record<ControlAction, Phaser.Input.Keyboard.Key[]>;

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    this.keys = {
      left: CONTROL_BINDINGS.left.map((code) => keyboard.addKey(code)),
      right: CONTROL_BINDINGS.right.map((code) => keyboard.addKey(code)),
      up: CONTROL_BINDINGS.up.map((code) => keyboard.addKey(code)),
      down: CONTROL_BINDINGS.down.map((code) => keyboard.addKey(code)),
      attack: CONTROL_BINDINGS.attack.map((code) => keyboard.addKey(code)),
      useItem: CONTROL_BINDINGS.useItem.map((code) => keyboard.addKey(code)),
      dodge: CONTROL_BINDINGS.dodge.map((code) => keyboard.addKey(code)),
      run: CONTROL_BINDINGS.run.map((code) => keyboard.addKey(code)),
      interact: CONTROL_BINDINGS.interact.map((code) => keyboard.addKey(code)),
      devInfiniteHealth: CONTROL_BINDINGS.devInfiniteHealth.map((code) => keyboard.addKey(code)),
    };
  }

  isDown(action: ControlAction): boolean {
    return this.keys[action].some((key) => key.isDown);
  }

  justPressed(action: ControlAction): boolean {
    return this.keys[action].some((key) =>
      Phaser.Input.Keyboard.JustDown(key),
    );
  }

  verticalAxis(): -1 | 0 | 1 {
    const up = this.isDown('up');
    const down = this.isDown('down');

    if (up === down) {
      return 0;
    }

    return up ? -1 : 1;
  }

  horizontalAxis(): -1 | 0 | 1 {
    const left = this.isDown('left');
    const right = this.isDown('right');

    if (left === right) {
      return 0;
    }

    return left ? -1 : 1;
  }
}
