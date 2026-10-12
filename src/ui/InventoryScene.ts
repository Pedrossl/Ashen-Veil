import Phaser from 'phaser';
import { playSound } from '../systems/SoundEffects';

import { Controls } from '../core/controls';
import { AMPOULE, ITEM_ICONS } from '../data/items';
import { itemIcon } from '../systems/Rewards';
import { WEAPONS, type WeaponDefinition, type WeaponId } from '../data/weapons';
import { ownedWeaponIds } from '../systems/Equipment';
import { PlayerState } from '../systems/PlayerState';
import { WorldState } from '../systems/WorldState';

const PANEL = { width: 540, height: 470, rowHeight: 44 } as const;

const TEXT: Phaser.Types.GameObjects.Text.TextStyle = {
  color: '#cfc3e0',
  fontFamily: 'Georgia, serif',
  fontSize: '18px',
  stroke: '#0b0810',
  strokeThickness: 3,
};

const HEADER: Phaser.Types.GameObjects.Text.TextStyle = {
  ...TEXT,
  color: '#8f84a0',
  fontSize: '13px',
};

const SELECTED_COLOR = '#f0e2c4';
const EQUIPPED_MARK = '  (equipada)';

// Inventário simples sobre o jogo pausado: armas (escolher e equipar),
// ampolas e itens-chave. Tab ou Esc fecha.
// Logo depois de abrir, Tab/Esc não fecham (é o mesmo aperto que abriu).
const OPEN_GRACE_MS = 150;

export class InventoryScene extends Phaser.Scene {
  private controls?: Controls;
  private openedAt = 0;
  private weaponRows: { id: WeaponId; text: Phaser.GameObjects.Text }[] = [];
  private selected = 0;

  constructor() {
    super('InventoryScene');
  }

  create(): void {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      return;
    }

    playSound(this, 'inventoryOpen');
    this.controls = new Controls(keyboard);
    const { width, height } = this.scale;
    const left = (width - PANEL.width) / 2;
    const top = (height - PANEL.height) / 2;
    const state = PlayerState.of(this.game);
    const world = WorldState.of(this.game);

    this.add.rectangle(0, 0, width, height, 0x050308, 0.72).setOrigin(0);
    this.add
      .rectangle(width / 2, height / 2, PANEL.width, PANEL.height, 0x120c1a, 0.95)
      .setStrokeStyle(2, 0x5a3f80, 0.9);
    this.add.text(width / 2, top + 22, 'INVENTÁRIO', { ...TEXT, fontSize: '22px', color: '#d9c8f2' }).setOrigin(0.5, 0);

    // Armas: a lista que se navega.
    this.add.text(left + 30, top + 70, 'ARMAS', HEADER);
    const owned = ownedWeaponIds(world.inventory);
    this.weaponRows = owned.map((id, index) => {
      const y = top + 96 + index * PANEL.rowHeight;
      const weapon: WeaponDefinition = WEAPONS[id];
      const icon = weapon.sprite;

      if (icon) {
        const image = this.add.image(left + 48, y + 12, icon).setAngle(40);
        image.setScale(34 / image.height);
      }

      const text = this.add.text(left + 76, y, WEAPONS[id].name, TEXT).setInteractive({ useHandCursor: true });
      text.on('pointerover', () => this.highlight(index));
      text.on('pointerdown', () => this.equip(index));
      return { id, text };
    });

    // Consumíveis e itens-chave: só informação.
    const infoTop = top + 96 + owned.length * PANEL.rowHeight + 24;
    this.add.text(left + 30, infoTop, 'CONSUMÍVEIS', HEADER);
    this.add.image(left + 48, infoTop + 40, ITEM_ICONS[AMPOULE.itemId].key).setDisplaySize(30, 30);
    this.add.text(left + 76, infoTop + 28, `${AMPOULE.name}  ×${state.ampoules}`, TEXT);

    const keyItems = world.inventory.list().filter((item) => item.category === 'key' || item.category === 'ring');
    if (keyItems.length > 0) {
      this.add.text(left + 30, infoTop + 74, 'ITENS', HEADER);
      keyItems.forEach((item, index) => {
        const y = infoTop + 100 + index * 34;
        const icon = itemIcon(item.id);

        if (icon) {
          this.add.image(left + 48, y + 10, icon).setDisplaySize(30, 30);
        }
        this.add.text(left + 76, y, item.name, { ...TEXT, fontSize: '16px' });
      });
    }

    this.add
      .text(width / 2, top + PANEL.height - 30, 'W/S escolher · Enter/E equipar · Q trocar · Tab/Esc fechar', HEADER)
      .setOrigin(0.5, 0);

    this.selected = Math.max(0, owned.indexOf(state.equippedWeaponId));
    this.highlight(this.selected);
    // O Tab que abriu a janela ainda chega aqui no primeiro quadro (o jogo
    // não pausa): ignora o fechar por um instante. Relógio do jogo, porque o
    // desta scene guarda o tempo de quando ela foi fechada da última vez.
    this.openedAt = this.game.loop.time;
  }

  update(): void {
    const controls = this.controls;

    if (!controls) {
      return;
    }

    const closing = controls.justPressed('inventory') || controls.justPressed('cancel');

    if (closing && this.game.loop.time - this.openedAt >= OPEN_GRACE_MS) {
      this.close();
    } else if (closing) {
      return;
    } else if (controls.justPressed('up')) {
      this.highlight((this.selected + this.weaponRows.length - 1) % this.weaponRows.length);
    } else if (controls.justPressed('down') || controls.justPressed('switchWeapon')) {
      this.highlight((this.selected + 1) % this.weaponRows.length);
    } else if (controls.justPressed('confirm') || controls.justPressed('interact')) {
      this.equip(this.selected);
    }
  }

  private highlight(index: number): void {
    if (index !== this.selected) playSound(this, 'uiMove');
    this.selected = index;
    const equipped = PlayerState.of(this.game).equippedWeaponId;

    this.weaponRows.forEach(({ id, text }, i) => {
      const name = WEAPONS[id].name + (id === equipped ? EQUIPPED_MARK : '');
      text.setText(i === index ? `› ${name}` : name).setColor(i === index ? SELECTED_COLOR : '#cfc3e0');
    });
  }

  private equip(index: number): void {
    const state = PlayerState.of(this.game);
    if (state.equippedWeaponId !== this.weaponRows[index].id) {
      state.equip(this.weaponRows[index].id);
      playSound(this, 'equip');
    }
    this.highlight(index);
  }

  private close(): void {
    // O jogo não pausa com o inventário aberto: a PrisonScene percebe o
    // fechamento (SHUTDOWN desta scene) e devolve o controle ao jogador.
    this.scene.stop();
    // O fechamento continua tocando na scene retomada.
    playSound(this.scene.get('PrisonScene'), 'inventoryClose');
  }
}
