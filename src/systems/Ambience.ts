import Phaser from 'phaser';
import { GAME_EVENTS } from '../core/gameEvents';
import { AMBIENCE, AMBIENCE_BOSS_FACTOR, AMBIENCE_FADE_MS, ROOM_AMBIENCE } from '../data/ambience';
import type { RoomId } from '../maps/types';

// Um loop por sala, separado do limite dos efeitos curtos de combate.
export function startAmbience(scene: Phaser.Scene, room: RoomId): void {
  const config = AMBIENCE[ROOM_AMBIENCE[room]];
  if (!scene.cache.audio.exists(config.key)) return;
  const sound = scene.sound.add(config.key, { loop: true, volume: 0 });
  let inCombat = false;
  let volume = 0;
  const engage = (): void => { inCombat = true; };
  const disengage = (): void => { inCombat = false; };
  const pause = (): void => { sound.pause(); };
  const resume = (): void => { sound.resume(); };
  const update = (_time: number, delta: number): void => {
    if (scene.sound.locked) return;
    if (!sound.isPlaying && !sound.isPaused) sound.play();
    const target = config.volume * (inCombat ? AMBIENCE_BOSS_FACTOR : 1);
    volume = Phaser.Math.Linear(volume, target, 1 - Math.exp(-delta / AMBIENCE_FADE_MS));
    sound.setVolume(volume);
  };
  scene.game.events.on(GAME_EVENTS.bossEngaged, engage);
  scene.game.events.on(GAME_EVENTS.bossDefeated, disengage);
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  scene.events.on(Phaser.Scenes.Events.PAUSE, pause);
  scene.events.on(Phaser.Scenes.Events.RESUME, resume);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
    scene.events.off(Phaser.Scenes.Events.PAUSE, pause);
    scene.events.off(Phaser.Scenes.Events.RESUME, resume);
    scene.game.events.off(GAME_EVENTS.bossEngaged, engage);
    scene.game.events.off(GAME_EVENTS.bossDefeated, disengage);
    sound.destroy();
  });
}
