import Phaser from 'phaser';
import type { Room } from '@colyseus/sdk';

import type { MeleeEnemy } from '../../entities/enemies/MeleeEnemy';
import type { Player } from '../../entities/player/Player';
import type { RoomBoss } from '../../maps/types';
import type { ItemDefinition } from '../../data/items';
import type { CombatSystem } from '../CombatSystem';
import { ArenaSync } from './ArenaSync';
import { BossSync } from './BossSync';
import { EnemySync } from './EnemySync';
import type { ArenaSummonMessage } from './messages';
import { PlayerSync } from './PlayerSync';
import { RestSync } from './RestSync';
import { RoomControl } from './RoomControl';
import { WorldSync } from './WorldSync';

export type CoopSessionConfig = {
  room: Room;
  player: Player;
  // Sala da prisão em que este jogo está.
  roomId: string;
  enemies: readonly MeleeEnemy[];
  bosses: readonly RoomBoss[];
  combat: CombatSystem;
  // Arena de boss vivo em que este jogo acabou de entrar (chama o parceiro).
  arena?: ArenaSummonMessage;
  // O parceiro pegou ou abriu algo: a scene atualiza a sala e mostra o aviso.
  onSharedProgress: (message?: string, item?: ItemDefinition) => void;
  // O parceiro entrou numa arena de boss: este jogo vai para lá.
  onSummoned: (summon: ArenaSummonMessage, partner: string) => void;
  // Aviso curto na tela (ex.: esperando o parceiro na lanterna).
  notify: (message: string) => void;
};

// Partida cooperativa numa sala da prisão: junta a sincronização dos
// personagens, do progresso, dos inimigos e bosses, do descanso e das arenas.
// Dura o mesmo que a scene (cada troca de sala cria outra). No solo, não existe.
export class CoopSession {
  private readonly players: PlayerSync;
  private readonly enemies: EnemySync;
  private readonly bosses: BossSync;
  private readonly rest: RestSync;
  private readonly cleanups: Array<() => void> = [];

  constructor(scene: Phaser.Scene, config: CoopSessionConfig) {
    const { room, player, roomId } = config;
    const control = new RoomControl(scene, room, roomId, config.combat, player);
    this.enemies = new EnemySync(scene, room, roomId, config.enemies, control);
    this.bosses = new BossSync(room, roomId, config.bosses, control);
    this.players = new PlayerSync(scene, room, player, roomId, (partner) => control.setPartner(partner));
    const world = new WorldSync(scene.game, room, config.onSharedProgress);
    this.rest = new RestSync(room, roomId, player, config.notify);
    const arena = new ArenaSync(room, roomId, config.arena, config.onSummoned);

    this.cleanups.push(
      ...this.enemies.listen(),
      ...this.bosses.listen(),
      ...this.players.listen(),
      ...world.listen(),
      ...this.rest.listen(),
      ...arena.listen(),
      // Por último: avisa quem comanda a sala depois de todos escutarem.
      ...control.listen(),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.end());
  }

  update(delta: number): void {
    this.players.update(delta);
    this.enemies.update(delta);
    this.bosses.update(delta);
    this.rest.update();
  }

  // Sentou numa lanterna: o descanso só acontece com os dois sentados nela.
  requestRest(bonfireId: string, onBothSeated: () => void): void {
    this.rest.requestRest(bonfireId, onBothSeated);
  }

  private end(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups.length = 0;
  }
}
