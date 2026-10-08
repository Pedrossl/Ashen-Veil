import Phaser from 'phaser';

import { Health } from '../components/Health';
import { Stamina } from '../components/Stamina';
import {
  GAME_EVENTS,
  type ConsumableChange,
  type StatChange,
  type WeaponChange,
} from '../core/gameEvents';
import { AMPOULE, ITEM_ICONS, RING_EFFECTS, type RingEffect } from '../data/items';
import { PLAYER_STATS } from '../data/player';
import { WEAPONS, type WeaponDefinition, type WeaponId } from '../data/weapons';

const REGISTRY_KEY = 'player-state';

// Vida, stamina e equipamento do jogador. Fica no registry do jogo porque a
// entidade Player é recriada a cada troca de sala (mesmo padrão do WorldState).
export class PlayerState {
  readonly health = new Health(PLAYER_STATS.maxHealth);
  readonly stamina = new Stamina(PLAYER_STATS.stamina);
  private weaponId: WeaponId = PLAYER_STATS.startingWeapon;
  private ampouleCharges: number = AMPOULE.maxCharges;
  // Ampolas extras achadas pelo mapa aumentam o máximo de cargas.
  private bonusAmpoules = 0;
  private readonly rings = new Set<string>();
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

  get equippedWeaponId(): WeaponId {
    return this.weaponId;
  }

  get weapon(): WeaponDefinition {
    return WEAPONS[this.weaponId];
  }

  equip(weaponId: WeaponId): void {
    this.weaponId = weaponId;
    this.emitWeapon();
  }

  get ampoules(): number {
    return this.ampouleCharges;
  }

  // Gasta uma carga da ampola; falso quando não sobrou nenhuma.
  useAmpoule(): boolean {
    if (this.ampouleCharges <= 0) {
      return false;
    }

    this.ampouleCharges -= 1;
    this.emitConsumable();
    return true;
  }

  // Descanso e renascimento devolvem todas as cargas.
  refillAmpoules(): void {
    this.ampouleCharges = this.maxAmpoules;
    this.emitConsumable();
  }

  // Uma ampola nova: +1 carga máxima, já cheia.
  addAmpoule(): void {
    this.bonusAmpoules += 1;
    this.ampouleCharges += 1;
    this.emitConsumable();
  }

  // Anéis passivos: o efeito vale enquanto o jogador tiver o anel.
  addRing(itemId: string): void {
    this.rings.add(itemId);
    const effects: readonly RingEffect[] = [...this.rings]
      .map((id) => (RING_EFFECTS as Record<string, RingEffect>)[id])
      .filter((effect): effect is RingEffect => effect !== undefined);
    const staminaFactor = effects.reduce((factor, effect) => factor * (effect.staminaRegenFactor ?? 1), 1);
    this.stamina.setRegenFactor(staminaFactor);
  }

  private get maxAmpoules(): number {
    return AMPOULE.maxCharges + this.bonusAmpoules;
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
    this.emitConsumable();
  }

  private emitConsumable(): void {
    const change: ConsumableChange = {
      name: AMPOULE.name,
      icon: ITEM_ICONS[AMPOULE.itemId].key,
      charges: this.ampouleCharges,
      maxCharges: this.maxAmpoules,
    };
    this.events.emit(GAME_EVENTS.playerConsumableChanged, change);
  }

  private emitWeapon(): void {
    const change: WeaponChange = { name: this.weapon.name, icon: this.weapon.sprite };
    this.events.emit(GAME_EVENTS.playerWeaponChanged, change);
  }

  private emit(eventName: string, change: StatChange): void {
    this.events.emit(eventName, change);
  }
}
