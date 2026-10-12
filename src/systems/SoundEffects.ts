import Phaser from 'phaser';
import { SOUND_EFFECTS, SFX_DISTANCE, SFX_MAX_VOICES, SFX_VOLUME, soundKey, type SoundEffect } from '../data/audio';

// Uma coleção por scene: não acumula sons ou listeners a cada renascimento.
const collections = new WeakMap<Phaser.Scene, {
  voices: Set<Phaser.Sound.BaseSound>;
  lastPlayed: Map<SoundEffect, number>;
}>();

export function playSound(scene: Phaser.Scene, effect: SoundEffect, source?: { x: number; y: number }): void {
  const key = soundKey(effect);
  // Phaser desbloqueia o áudio na primeira interação. Não enfileirar sons antigos.
  if (scene.sound.locked || !scene.cache.audio.exists(key)) return;
  const view = scene.cameras.main.worldView;
  const distance = source ? Math.hypot(source.x - view.centerX, source.y - view.centerY) : 0;
  const gain = Phaser.Math.Clamp(1 - (distance - SFX_DISTANCE.full) / (SFX_DISTANCE.silent - SFX_DISTANCE.full), 0, 1);
  if (gain === 0) return;
  const pan = source ? Phaser.Math.Clamp((source.x - view.centerX) / Math.max(1, view.width / 2), -0.7, 0.7) : 0;

  let collection = collections.get(scene);
  if (!collection) {
    collection = { voices: new Set(), lastPlayed: new Map() };
    collections.set(scene, collection);
    const voices = collection.voices;
    const stop = (): void => { for (const sound of [...voices]) sound.destroy(); voices.clear(); };
    scene.events.on(Phaser.Scenes.Events.PAUSE, stop);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stop();
      scene.events.off(Phaser.Scenes.Events.PAUSE, stop);
      collections.delete(scene);
    });
  }

  const config = SOUND_EFFECTS[effect];
  const now = scene.time.now;
  if (now - (collection.lastPlayed.get(effect) ?? -Infinity) < config.cooldown) return;
  if (collection.voices.size >= SFX_MAX_VOICES) return;
  collection.lastPlayed.set(effect, now);

  const sound = scene.sound.add(key);
  const voices = collection.voices;
  voices.add(sound);
  sound.once(Phaser.Sound.Events.DESTROY, () => voices.delete(sound));
  sound.once(Phaser.Sound.Events.COMPLETE, () => sound.destroy());
  if (!sound.play({ volume: config.volume * SFX_VOLUME * gain, pan, rate: 1 + (Math.random() * 2 - 1) * config.variation })) {
    sound.destroy();
  }
}
