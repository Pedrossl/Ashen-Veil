import type Phaser from 'phaser';
import type { Room } from '@colyseus/sdk';

import { ENEMY_PROJECTILE_THROWN, type EnemySnapshot, type MeleeEnemy } from '../../entities/enemies/MeleeEnemy';
import { SludgeBall, type SludgeBallLaunch } from '../../entities/enemies/SludgeBall';
import { FoeSync } from './FoeSync';
import { COOP_MESSAGES, type EnemyProjectileMessage } from './messages';
import type { RoomControl } from './RoomControl';

// Inimigos comuns da sala compartilhados (FoeSync), mais os arremessos: quem
// comanda manda cada lançamento, e o outro jogo mostra uma cópia visual.
export class EnemySync {
  private readonly foes: FoeSync<EnemySnapshot>;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly room: Room,
    private readonly roomId: string,
    enemies: readonly MeleeEnemy[],
    private readonly control: RoomControl,
  ) {
    this.foes = new FoeSync(room, roomId, 'enemies', enemies, control);
  }

  listen(): Array<() => void> {
    const onProjectile = (_enemy: MeleeEnemy, launch: SludgeBallLaunch): void => {
      if (this.control.isOwner) {
        const message: EnemyProjectileMessage = { roomId: this.roomId, launch };
        this.room.send(COOP_MESSAGES.enemyProjectile, message);
      }
    };
    this.scene.events.on(ENEMY_PROJECTILE_THROWN, onProjectile);

    return [
      ...this.foes.listen(),
      () => this.scene.events.off(ENEMY_PROJECTILE_THROWN, onProjectile),
      this.room.onMessage(COOP_MESSAGES.enemyProjectile, (message: EnemyProjectileMessage) => {
        if (!this.control.isOwner && message.roomId === this.roomId) new SludgeBall(this.scene, message.launch);
      }),
    ];
  }

  update(delta: number): void {
    this.foes.update(delta);
  }
}
