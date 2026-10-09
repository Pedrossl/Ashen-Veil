import type Phaser from 'phaser';

import type { EnemyTarget } from '../entities/enemies/MeleeEnemy';
import type { Attacker, CombatSystem, Damageable, RemoteControl } from '../systems/CombatSystem';
import type { BossSnapshot } from '../entities/bosses/BossSnapshot';
import type { FoeDecision, FoeDecisionListener } from '../components/FoeControl';
import type { MeleeEnemy } from '../entities/enemies/MeleeEnemy';
import type { Bonfire } from '../entities/world/Bonfire';
import type { CellGate } from '../entities/world/CellGate';
import type { Chest } from '../entities/world/Chest';
import type { Ladder } from '../entities/world/Ladder';
import type { LockedDoor } from '../entities/world/LockedDoor';
import type { Staircase } from '../entities/world/Staircase';
import type { ItemPickup } from '../entities/world/ItemPickup';
import type { Player } from '../entities/player/Player';
import type { GroundMessage } from '../entities/world/GroundMessage';
import type { WorldState } from '../systems/WorldState';

export type RoomId =
  | 'prison-service-wing'
  | 'prison-cell'
  | 'prison-cell-block'
  | 'prison-chain-well'
  | 'prison-drowned-galleries'
  | 'prison-sewers'
  | 'prison-root-arena'
  | 'prison-boss-lair'
  | 'prison-surgical-theater';

export type RoomEntry = {
  x: number;
  // Altura dos pés; sem valor, usa o piso principal da sala.
  y?: number;
  facing: 'left' | 'right';
};

// Passagem para outra sala, disparada quando o jogador cruza a linha em x.
export type RoomExit = {
  side: 'left' | 'right';
  x: number;
  toRoom: RoomId;
  toEntry: string;
  isOpen?: () => boolean;
  // Só vale com os pés acima desta altura (saídas em andares superiores).
  maxFeetY?: number;
};

// Passagem que se usa com o botão de interagir (bueiro, alçapão, porta),
// em vez de cruzar uma linha andando.
export type RoomPassage = {
  x: number;
  floorY: number;
  label: string;
  toRoom: RoomId;
  toEntry: string;
  // Fechada enquanto falso (ex.: portão da arena durante a luta).
  isOpen?: () => boolean;
};

// O que a scene precisa de um boss: alvo, combate e atualização por quadro.
// No cooperativo ele mira nos dois (`addTarget`) e é um só para os dois: quem
// comanda a sala anuncia as decisões e o estado, e o outro jogo os segue (ver
// components/FoeControl.ts).
export type RoomBoss = Attacker &
  Damageable & {
    // Acordado e lutando (a porta da arena fica fechada).
    readonly isEngaged: boolean;
    setTarget(target: EnemyTarget): void;
    addTarget(target: EnemyTarget): void;
    removeTarget(target: EnemyTarget): void;
    attachCombat(combat: CombatSystem): void;
    update(delta: number): void;
    setRemoteControl(control?: RemoteControl): void;
    onDecision(listener?: FoeDecisionListener): void;
    applyDecision(decision: FoeDecision): void;
    snapshot(): BossSnapshot;
    applySnapshot(snapshot: BossSnapshot): void;
  };

// Trecho que atrasa quem anda nele (água rasa, lama), no piso `floorY`.
export type SlowZone = {
  fromX: number;
  toX: number;
  floorY: number;
  speedFactor: number;
};

export type Room = {
  // Nome mostrado na primeira visita.
  title: string;
  subtitle: string;
  floorY: number;
  bounds: { x: number; y: number; width: number; height: number };
  // Câmera limitada a uma parte da sala (o resto é revelado por script, como o
  // fosso da arena do esgoto); sem isso, usa `bounds`.
  cameraBounds?: { x: number; y: number; width: number; height: number };
  zoom: number;
  entries: Record<string, RoomEntry>;
  exits: RoomExit[];
  colliders: Phaser.GameObjects.Rectangle[];
  gates: CellGate[];
  pickups: ItemPickup[];
  enemies: MeleeEnemy[];
  stairs: Staircase[];
  ladders?: Ladder[];
  bosses?: RoomBoss[];
  bonfires?: Bonfire[];
  chests?: Chest[];
  lockedDoors?: LockedDoor[];
  passages?: RoomPassage[];
  slowZones?: SlowZone[];
  // Mensagens no chão que ensinam os controles na hora em que fazem falta.
  groundMessages?: GroundMessage[];
  // Chamado quando o jogador já existe, para salas com eventos que mexem nele.
  onPlayerSpawned?: (player: Player) => void;
};

export type RoomBuilder = (scene: Phaser.Scene, world: WorldState) => Room;
