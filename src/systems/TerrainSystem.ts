import type Phaser from 'phaser';

import { spawnSplash } from '../components/WaterEffects';
import type { Player } from '../entities/player/Player';
import type { SlowZone } from '../maps/types';

// Tolerância de altura entre os pés e o piso do trecho.
const FLOOR_TOLERANCE = 30;
const SPLASH_INTERVAL_MS = 260;
// Abaixo dessa velocidade ele está parado na água e não espirra.
const SPLASH_MIN_SPEED = 20;

// Terreno sob os pés do jogador: trechos de água rasa (ou lama) atrasam o
// passo e espirram enquanto ele anda.
export class TerrainSystem {
  private splashTimer = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  update(player: Player, zones: readonly SlowZone[] | undefined, delta: number): void {
    const { x, y } = player;
    const zone = zones?.find(
      (slow) => x >= slow.fromX && x <= slow.toX && Math.abs(y - slow.floorY) <= FLOOR_TOLERANCE,
    );
    player.setTerrainSpeedFactor(zone?.speedFactor ?? 1);

    const body = player.body as Phaser.Physics.Arcade.Body;
    this.splashTimer -= delta;

    if (zone && Math.abs(body.velocity.x) > SPLASH_MIN_SPEED && this.splashTimer <= 0) {
      this.splashTimer = SPLASH_INTERVAL_MS;
      spawnSplash(this.scene, x, zone.floorY);
    }
  }
}
