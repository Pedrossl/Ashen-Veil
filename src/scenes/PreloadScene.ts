import Phaser from 'phaser';
import { MUSIC, LOCAL_AMBIENCE } from '../data/soundscape';
import { AMBIENCE } from '../data/ambience';
import { SOUND_EFFECTS, soundKey, soundPath, type SoundEffect } from '../data/audio';

import {
  REAPER_KING_SPRITE,
  ROOT_BOSS_SPRITE,
  ROOT_SPIT_SPRITE,
  ROOT_TRAIL_SPRITE,
  SPECTRAL_SCYTHE_IMAGE,
} from '../data/bossSprites';
import { CHECKPOINT_LANTERN_SPRITE } from '../data/checkpointSprites';
import { ENEMIES } from '../data/enemies';
import { SLUDGE_BALL_SPRITE } from '../data/enemySprites';
import { SEWER_ANIMATIONS, SEWER_ATLASES, SEWER_BACKGROUND, SEWER_BOSS_GATE } from '../data/sewerSprites';
import { ITEM_ICONS, ITEM_IMAGES } from '../data/items';
import { PLAYER_SPRITE } from '../data/player';
import {
  CELL_BED_KEY,
  CELL_BED_PATH,
  EXPANSION_ATLASES,
  PRISON_CHEST_SPRITE,
  PRISON_ATLAS_DATA_PATH,
  PRISON_ATLAS_IMAGE_PATH,
  PRISON_ATLAS_KEY,
} from '../maps/prison/prisonKit';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    for (const track of [...Object.values(MUSIC), ...Object.values(LOCAL_AMBIENCE)]) this.load.audio(track.key, track.path);
    for (const loop of Object.values(AMBIENCE)) this.load.audio(loop.key, loop.path);
    for (const effect of Object.keys(SOUND_EFFECTS) as SoundEffect[]) {
      this.load.audio(soundKey(effect), soundPath(effect));
    }
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
    for (const atlas of [...Object.values(EXPANSION_ATLASES), ...Object.values(SEWER_ATLASES)]) {
      this.load.atlas(atlas.key, atlas.imagePath, atlas.dataPath);
    }
    for (const sheet of [...Object.values(SEWER_ANIMATIONS), SEWER_BOSS_GATE]) {
      this.load.spritesheet(sheet.key, sheet.path, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
    }
    this.load.image(SEWER_BACKGROUND.key, SEWER_BACKGROUND.path);
    for (const sheet of [ROOT_BOSS_SPRITE, ROOT_TRAIL_SPRITE, ROOT_SPIT_SPRITE]) {
      this.load.spritesheet(sheet.key, sheet.path, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
    }
    this.load.spritesheet(PRISON_CHEST_SPRITE.key, PRISON_CHEST_SPRITE.path, {
      frameWidth: PRISON_CHEST_SPRITE.frameWidth,
      frameHeight: PRISON_CHEST_SPRITE.frameHeight,
    });
    this.load.image(CELL_BED_KEY, CELL_BED_PATH);
    this.load.spritesheet(SLUDGE_BALL_SPRITE.key, SLUDGE_BALL_SPRITE.path, {
      frameWidth: SLUDGE_BALL_SPRITE.frameWidth,
      frameHeight: SLUDGE_BALL_SPRITE.frameHeight,
    });
    for (const image of [...Object.values(ITEM_IMAGES), ...Object.values(ITEM_ICONS)]) {
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
    for (const { sprite } of Object.values(ENEMIES)) {
      this.load.spritesheet(sprite.key, sprite.path, {
        frameWidth: sprite.frameWidth,
        frameHeight: sprite.frameHeight,
      });
    }
    for (const sheet of Object.values(PLAYER_SPRITE.sheets)) {
      this.load.spritesheet(sheet.key, sheet.path, {
        frameWidth: PLAYER_SPRITE.frameWidth,
        frameHeight: PLAYER_SPRITE.frameHeight,
      });
    }
  }

  create(): void {
    const devRoom = readDevRoomOverride();

    // Com `?sala=` (desenvolvimento) pula o menu e abre direto na sala.
    if (devRoom.roomId) {
      this.scene.start('PrisonScene', devRoom);
      return;
    }

    this.scene.start('MenuScene');
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
