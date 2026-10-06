import Phaser from 'phaser';

import { REAPER_KING_SPRITE, SPECTRAL_SCYTHE_IMAGE } from '../data/bossSprites';
import { CHECKPOINT_LANTERN_SPRITE } from '../data/checkpointSprites';
import { CHAINED_PRISONER_SPRITE } from '../data/enemySprites';
import { ITEM_IMAGES } from '../data/items';
import { PLAYER_SPRITE } from '../data/player';
import {
  CELL_BED_KEY,
  CELL_BED_PATH,
  PRISON_ATLAS_DATA_PATH,
  PRISON_ATLAS_IMAGE_PATH,
  PRISON_ATLAS_KEY,
} from '../maps/prison/prisonKit';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    const { centerX, centerY } = this.cameras.main;

    const progressTrack = this.add
      .rectangle(centerX, centerY + 44, 280, 3, 0x2f2939)
      .setOrigin(0.5);
    const progressFill = this.add
      .rectangle(centerX - 140, centerY + 44, 0, 3, 0x9a79c6)
      .setOrigin(0, 0.5);
    const loadingText = this.add
      .text(centerX, centerY, 'Despertando sob as cinzas...', {
        color: '#d8c9ff',
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
      })
      .setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      progressFill.width = 280 * progress;
    });

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      loadingText.destroy();
      progressTrack.destroy();
      progressFill.destroy();
    });

    this.load.atlas(
      PRISON_ATLAS_KEY,
      PRISON_ATLAS_IMAGE_PATH,
      PRISON_ATLAS_DATA_PATH,
    );
    this.load.image(CELL_BED_KEY, CELL_BED_PATH);
    for (const image of Object.values(ITEM_IMAGES)) {
      this.load.image(image.key, image.path);
    }
    this.load.image(SPECTRAL_SCYTHE_IMAGE.key, SPECTRAL_SCYTHE_IMAGE.path);
    this.load.spritesheet(CHECKPOINT_LANTERN_SPRITE.key, CHECKPOINT_LANTERN_SPRITE.path, {
      frameWidth: CHECKPOINT_LANTERN_SPRITE.frameWidth,
      frameHeight: CHECKPOINT_LANTERN_SPRITE.frameHeight,
    });
    this.load.spritesheet(REAPER_KING_SPRITE.key, REAPER_KING_SPRITE.path, {
      frameWidth: REAPER_KING_SPRITE.frameWidth,
      frameHeight: REAPER_KING_SPRITE.frameHeight,
    });
    this.load.spritesheet(CHAINED_PRISONER_SPRITE.key, CHAINED_PRISONER_SPRITE.path, {
      frameWidth: CHAINED_PRISONER_SPRITE.frameWidth,
      frameHeight: CHAINED_PRISONER_SPRITE.frameHeight,
    });
    for (const sheet of Object.values(PLAYER_SPRITE.sheets)) {
      this.load.spritesheet(sheet.key, sheet.path, {
        frameWidth: PLAYER_SPRITE.frameWidth,
        frameHeight: PLAYER_SPRITE.frameHeight,
      });
    }
  }

  create(): void {
    this.scene.start('PrisonScene', readDevRoomOverride());
  }
}

// Em desenvolvimento, `?sala=<id>&entrada=<id>` abre direto numa sala.
function readDevRoomOverride(): { roomId?: string; entryId?: string } {
  if (!import.meta.env.DEV) {
    return {};
  }

  const params = new URLSearchParams(window.location.search);
  return {
    roomId: params.get('sala') ?? undefined,
    entryId: params.get('entrada') ?? undefined,
  };
}
