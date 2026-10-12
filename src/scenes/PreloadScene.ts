import Phaser from 'phaser';
import { SERVICE_ATLASES } from '../data/serviceWingSprites';
import { MUSIC, LOCAL_AMBIENCE } from '../data/soundscape';
import { SOUND_EFFECTS, soundKey, soundPath, type SoundEffect } from '../data/audio';

import {
  CRIMSON_SURGEON_SPRITE,
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

const LOADING_BAR = { width: 420, height: 6 } as const;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    for (const track of [...Object.values(MUSIC), ...Object.values(LOCAL_AMBIENCE)]) this.load.audio(track.key, track.path);
    for (const effect of Object.keys(SOUND_EFFECTS) as SoundEffect[]) {
      this.load.audio(soundKey(effect), soundPath(effect));
    }
    this.showLoadingScreen();

    this.load.atlas(
      PRISON_ATLAS_KEY,
      PRISON_ATLAS_IMAGE_PATH,
      PRISON_ATLAS_DATA_PATH,
    );
    for (const atlas of [...Object.values(EXPANSION_ATLASES), ...Object.values(SEWER_ATLASES), ...Object.values(SERVICE_ATLASES)]) {
      this.load.atlas(atlas.key, atlas.imagePath, atlas.dataPath);
    }
    for (const sheet of [...Object.values(SEWER_ANIMATIONS), SEWER_BOSS_GATE]) {
      this.load.spritesheet(sheet.key, sheet.path, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
    }
    this.load.image(SEWER_BACKGROUND.key, SEWER_BACKGROUND.path);
    for (const sheet of [ROOT_BOSS_SPRITE, ROOT_TRAIL_SPRITE, ROOT_SPIT_SPRITE, CRIMSON_SURGEON_SPRITE]) {
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

  // Tela de carregamento: barra com porcentagem e contagem de arquivos, e um
  // brilho pulsando para não parecer travado enquanto um arquivo grande baixa.
  private showLoadingScreen(): void {
    const { centerX, centerY } = this.cameras.main;
    const width = LOADING_BAR.width;
    const left = centerX - width / 2;
    const barY = centerY + 40;

    const title = this.add
      .text(centerX, centerY - 60, 'ASHEN VEIL', {
        color: '#d9c8f2',
        fontFamily: 'Georgia, serif',
        fontSize: '44px',
        stroke: '#120a1c',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    const subtitle = this.add
      .text(centerX, centerY, 'Despertando sob as cinzas...', {
        color: '#9d90b4',
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);
    const track = this.add
      .rectangle(centerX, barY, width + 4, LOADING_BAR.height + 4, 0x0d0a12)
      .setStrokeStyle(1, 0x5a4a70);
    const fill = this.add
      .rectangle(left, barY, 0, LOADING_BAR.height, 0x9a79c6)
      .setOrigin(0, 0.5);
    const glow = this.add
      .rectangle(left, barY, 18, LOADING_BAR.height + 6, 0xe0c8ff, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD);
    const percent = this.add
      .text(centerX, barY + 26, '0%', { color: '#cfc3e0', fontFamily: 'Georgia, serif', fontSize: '16px' })
      .setOrigin(0.5);
    const files = this.add
      .text(centerX, barY + 50, '', { color: '#6f6680', fontFamily: 'Georgia, serif', fontSize: '13px' })
      .setOrigin(0.5);

    this.tweens.add({ targets: [subtitle, glow], alpha: { from: 0.35, to: 1 }, duration: 900, yoyo: true, repeat: -1 });

    const update = (progress: number): void => {
      fill.width = width * progress;
      glow.x = left + width * progress;
      percent.setText(`${Math.floor(progress * 100)}%`);
      files.setText(`${this.load.totalComplete} de ${this.load.totalToLoad} arquivos`);
    };
    this.load.on(Phaser.Loader.Events.PROGRESS, update);
    this.load.on(Phaser.Loader.Events.FILE_COMPLETE, () => update(this.load.progress));
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      [title, subtitle, track, fill, glow, percent, files].forEach((object) => object.destroy());
    });
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
