import Phaser from 'phaser';

import { Health } from '../components/Health';
import { Stamina } from '../components/Stamina';
import { GAME_EVENTS, type StatChange, type WeaponChange } from '../core/gameEvents';
import { PLAYER_STATS } from '../data/player';
import { WEAPONS, type WeaponDefinition, type WeaponId } from '../data/weapons';

const REGISTRY_KEY = 'player-state';

// Vida, stamina e equipamento do jogador. Fica no registry do jogo porque a
// entidade Player é recriada a cada troca de sala (mesmo padrão do WorldState).
export class PlayerState {
  readonly health = new Health(PLAYER_STATS.maxHealth);
  readonly stamina = new Stamina(PLAYER_STATS.stamina);
  private weaponId: WeaponId = PLAYER_STATS.startingWeapon;
  // Atalho de teste: golpes não tiram vida. Começa ligado em desenvolvimento
  // e nunca existe no build de produção.
  infiniteHealth = import.meta.env.DEV;

  private constructor(private readonly events: Phaser.Events.EventEmitter) {
    this.health.onChange((current, max) =>
      this.emit(GAME_EVENTS.playerHealthChanged, { current, max }),
    );
    this.stamina.onChange((current, max) =>
      this.emit(GAME_EVENTS.playerStaminaChanged, { current, max }),
    );
  }

  static of(game: Phaser.Game): PlayerState {
    const existing = game.registry.get(REGISTRY_KEY) as PlayerState | undefined;

    if (existing) {
      return existing;
    }

    const state = new PlayerState(game.events);
    game.registry.set(REGISTRY_KEY, state);
    return state;
  }

  get weapon(): WeaponDefinition {
    return WEAPONS[this.weaponId];
  }

  equip(weaponId: WeaponId): void {
    this.weaponId = weaponId;
    this.emitWeapon();
  }

  // Reenvia os valores atuais (ex.: HUD recém-criado ou sala recarregada).
  broadcast(): void {
    this.emit(GAME_EVENTS.playerHealthChanged, {
      current: this.health.current,
      max: this.health.max,
    });
    this.emit(GAME_EVENTS.playerStaminaChanged, {
      current: this.stamina.current,
      max: this.stamina.max,
    });
    this.emitWeapon();
  }

  private emitWeapon(): void {
    const change: WeaponChange = { name: this.weapon.name, icon: this.weapon.sprite };
    this.events.emit(GAME_EVENTS.playerWeaponChanged, change);
  }

  private emit(eventName: string, change: StatChange): void {
    this.events.emit(eventName, change);
  }
}
