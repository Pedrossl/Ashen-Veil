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
  // Confirmar e voltar nos menus.
  confirm: [KeyCodes.ENTER],
  cancel: [KeyCodes.ESC],
  // Troca para a próxima arma que o jogador tem.
  switchWeapon: [KeyCodes.Q],
  // Abre e fecha o inventário.
  inventory: [KeyCodes.TAB],
  // Bebe a ampola de cura.
  useItem: [KeyCodes.R],
} as const;

// Código secreto: segurar todas estas teclas juntas liga/desliga o modo VIDA
// (vida infinita e dano x10, ver CHEAT_MODE em data/player.ts).
export const CHEAT_CODE = [KeyCodes.V, KeyCodes.I, KeyCodes.D, KeyCodes.A] as const;

export type ControlAction = keyof typeof CONTROL_BINDINGS;

// Nomes das teclas para textos na tela (mensagens no chão, menus).
const KEY_NAMES: Partial<Record<number, string>> = {
  [KeyCodes.LEFT]: '←',
  [KeyCodes.RIGHT]: '→',
  [KeyCodes.UP]: '↑',
  [KeyCodes.DOWN]: '↓',
  [KeyCodes.SPACE]: 'Espaço',
  [KeyCodes.ENTER]: 'Enter',
  [KeyCodes.ESC]: 'Esc',
  [KeyCodes.TAB]: 'Tab',
};

function keyName(code: number): string {
  return KEY_NAMES[code] ?? String.fromCharCode(code);
}

// Teclas de uma ação para mostrar ao jogador, como "W/↑".
export function keyLabel(action: ControlAction): string {
  return CONTROL_BINDINGS[action].map(keyName).join('/');
}

// Troca `{acao}` pelas teclas da ação: "{attack} ataca" vira "[J] ataca".
export function withKeyLabels(text: string): string {
  return text.replace(/\{(\w+)\}/g, (match, action: string) =>
    action in CONTROL_BINDINGS ? `[${keyLabel(action as ControlAction)}]` : match,
  );
}

export class Controls {
  private readonly keys: Record<ControlAction, Phaser.Input.Keyboard.Key[]>;
  private readonly cheatKeys: Phaser.Input.Keyboard.Key[];
  private cheatHeld = false;
  private enabled = true;

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    this.keys = {
      left: CONTROL_BINDINGS.left.map((code) => keyboard.addKey(code)),
      right: CONTROL_BINDINGS.right.map((code) => keyboard.addKey(code)),
      up: CONTROL_BINDINGS.up.map((code) => keyboard.addKey(code)),
      down: CONTROL_BINDINGS.down.map((code) => keyboard.addKey(code)),
      attack: CONTROL_BINDINGS.attack.map((code) => keyboard.addKey(code)),
      useItem: CONTROL_BINDINGS.useItem.map((code) => keyboard.addKey(code)),
      confirm: CONTROL_BINDINGS.confirm.map((code) => keyboard.addKey(code)),
      cancel: CONTROL_BINDINGS.cancel.map((code) => keyboard.addKey(code)),
      switchWeapon: CONTROL_BINDINGS.switchWeapon.map((code) => keyboard.addKey(code)),
      inventory: CONTROL_BINDINGS.inventory.map((code) => keyboard.addKey(code)),
      dodge: CONTROL_BINDINGS.dodge.map((code) => keyboard.addKey(code)),
      run: CONTROL_BINDINGS.run.map((code) => keyboard.addKey(code)),
      interact: CONTROL_BINDINGS.interact.map((code) => keyboard.addKey(code)),
    };
    this.cheatKeys = CHEAT_CODE.map((code) => keyboard.addKey(code));
  }

  // Verdadeiro só no quadro em que a última tecla do código é apertada;
  // continuar segurando não liga e desliga de novo.
  cheatCodeEntered(): boolean {
    const held = this.cheatKeys.every((key) => key.isDown);
    const entered = held && !this.cheatHeld;
    this.cheatHeld = held;
    return entered;
  }

  // Desligado (ex.: inventário aberto por cima do jogo, que não pausa), o
  // personagem não recebe comandos. Ao religar, apertos feitos enquanto
  // estava desligado são esquecidos (o Tab que fechou o inventário não o
  // reabre, o Enter que equipou não interage).
  setEnabled(enabled: boolean): void {
    if (enabled && !this.enabled) {
      Object.values(this.keys).flat().forEach((key) => Phaser.Input.Keyboard.JustDown(key));
    }
    this.enabled = enabled;
  }

  isDown(action: ControlAction): boolean {
    return this.enabled && this.keys[action].some((key) => key.isDown);
  }

  justPressed(action: ControlAction): boolean {
    const pressed = this.keys[action].map((key) => Phaser.Input.Keyboard.JustDown(key)).some(Boolean);
    return this.enabled && pressed;
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
