import Phaser from 'phaser';
import { GAME_EVENTS } from '../core/gameEvents';
import { MUSIC, LOCAL_AMBIENCE, SOUNDSCAPE } from '../data/soundscape';
import type { RoomId } from '../maps/types';
import { playSound } from './SoundEffects';

type LocalKind = keyof typeof LOCAL_AMBIENCE;
type Source = { kind: LocalKind; x: number; y: number; enabled: () => boolean };
const sources = new WeakMap<Phaser.Scene, Source[]>();

// Registro durante a montagem da sala; várias tochas compartilham uma voz.
export function addAmbientSource(scene: Phaser.Scene, kind: LocalKind, x: number, y: number, enabled = (): boolean => true): void {
  const list = sources.get(scene) ?? [];
  list.push({ kind, x, y, enabled });
  sources.set(scene, list);
}

export function startSoundscape(scene: Phaser.Scene, room: RoomId): void {
  const bossTrack = room === 'prison-root-arena' ? 'root' : room === 'prison-boss-lair' ? 'reaper' : undefined;
  let combat = false;
  let dead = false;
  const configs = { ...MUSIC, ...LOCAL_AMBIENCE };
  const voices = Object.entries(configs).filter(([, c]) => scene.cache.audio.exists(c.key)).map(([id, config]) => ({
    id, config, volume: 0, sound: scene.sound.add(config.key, { loop: true, volume: 0 }),
  }));
  const engage = (): void => { combat = true; };
  const defeat = (): void => { combat = false; playSound(scene, 'victory'); };
  const die = (): void => { dead = true; };
  const pause = (): void => { voices.forEach(v => v.sound.pause()); };
  const resume = (): void => { voices.forEach(v => { if (v.sound.isPaused) v.sound.resume(); }); };
  const update = (_time: number, delta: number): void => {
    if (scene.sound.locked) return;
    const selected = combat && bossTrack ? bossTrack : 'exploration';
    const view = scene.cameras.main.worldView;
    for (const voice of voices) {
      let gain = voice.id === selected && !dead ? 1 : 0;
      let pan = 0;
      if (voice.id === 'fire' || voice.id === 'chains') {
        for (const source of sources.get(scene) ?? []) {
          if (source.kind !== voice.id || !source.enabled()) continue;
          const proximity = Math.max(0, 1 - Math.hypot(source.x - view.centerX, source.y - view.centerY) / SOUNDSCAPE.radius);
          if (proximity > gain) {
            gain = proximity;
            pan = Phaser.Math.Clamp((source.x - view.centerX) / Math.max(1, view.width / 2), -0.7, 0.7);
          }
        }
        if (combat) gain *= SOUNDSCAPE.combatAmbienceFactor;
      }
      const target = gain * voice.config.volume;
      voice.volume = Phaser.Math.Linear(voice.volume, target, 1 - Math.exp(-delta / SOUNDSCAPE.fadeMs));
      if (target > 0 && !voice.sound.isPlaying && !voice.sound.isPaused) voice.sound.play();
      voice.sound.setVolume(voice.volume).setPan(pan);
      if (target === 0 && voice.volume < 0.001 && voice.sound.isPlaying) voice.sound.stop();
    }
  };
  scene.game.events.on(GAME_EVENTS.bossEngaged, engage);
  scene.game.events.on(GAME_EVENTS.bossDefeated, defeat);
  scene.game.events.on(GAME_EVENTS.playerDied, die);
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  scene.events.on(Phaser.Scenes.Events.PAUSE, pause);
  scene.events.on(Phaser.Scenes.Events.RESUME, resume);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    voices.forEach(v => v.sound.destroy());
    sources.delete(scene);
    scene.game.events.off(GAME_EVENTS.bossEngaged, engage);
    scene.game.events.off(GAME_EVENTS.bossDefeated, defeat);
    scene.game.events.off(GAME_EVENTS.playerDied, die);
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
    scene.events.off(Phaser.Scenes.Events.PAUSE, pause);
    scene.events.off(Phaser.Scenes.Events.RESUME, resume);
  });
}
