import Phaser from 'phaser';
import { startSoundscape } from '../systems/Soundscape';

import { Controls } from '../core/controls';
import { GAME_EVENTS } from '../core/gameEvents';
import { Player } from '../entities/player/Player';
import type { ItemDefinition } from '../data/items';
import type { Bonfire } from '../entities/world/Bonfire';
import type { LockedDoor } from '../entities/world/LockedDoor';
import type { CellGate } from '../entities/world/CellGate';
import type { Chest } from '../entities/world/Chest';
import type { ItemPickup } from '../entities/world/ItemPickup';
import { DEMO } from '../data/demo';
import { PLAYER_ANIMATION } from '../data/player';
import { PRISON_ROOMS, PRISON_START_ROOM } from '../maps/prison/rooms';
import type { Room, RoomExit, RoomId, RoomPassage } from '../maps/types';
import { CombatSystem } from '../systems/CombatSystem';
import { separateEnemies } from '../systems/EnemyCrowding';
import { GroundMessageSystem } from '../systems/GroundMessageSystem';
import { CoopSession } from '../systems/coop/CoopSession';
import type { ArenaSummonMessage, RestReviveMessage } from '../systems/coop/messages';
import { hasCoopEnded } from '../systems/coop/CoopPresence';
import { isCoopActive, isCoopSession } from '../systems/Session';
import { network } from '../net/network';
import { InteractionSystem } from '../systems/InteractionSystem';
import { nextWeaponId, ownedWeaponIds, weaponIdForItem } from '../systems/Equipment';
import { PlayerState } from '../systems/PlayerState';
import { saveGame } from '../systems/SaveGame';
import { applyItemEffect } from '../systems/Rewards';
import { TerrainSystem } from '../systems/TerrainSystem';
import { WorldState } from '../systems/WorldState';
import { playSound } from '../systems/SoundEffects';
import { INVENTORY_ITEM_ADDED } from '../systems/Inventory';
import { showAreaTitle } from '../ui/AreaTitle';
import { EnemyHealthBar } from '../ui/EnemyHealthBar';

const REST_FADE_MS = 650;
const PICKUP_RANGE = 46;
const GATE_RANGE = 70;
const TRANSITION_FADE_MS = 320;

type PrisonSceneData = {
  roomId?: RoomId;
  entryId?: string;
  // Recarregada por um descanso: o jogador já começa sentado na lanterna.
  resting?: boolean;
  // Aviso mostrado ao chegar (ex.: levado à arena pelo parceiro).
  notice?: string;
};

// Carrega uma sala da prisão por vez; trocar de sala reinicia a scene.
export class PrisonScene extends Phaser.Scene {
  // Criado antes da sala para que inimigos possam se registrar ao serem montados.
  combat?: CombatSystem;
  private player?: Player;
  private interactions?: InteractionSystem;
  private world?: WorldState;
  private room?: Room;
  private terrain?: TerrainSystem;
  private groundMessages?: GroundMessageSystem;
  private coop?: CoopSession;
  // Chamado pelo parceiro para uma arena de boss (cooperativo).
  private summon?: ArenaSummonMessage;
  private summonNotice?: string;
  private roomId: RoomId = PRISON_START_ROOM;
  private isTransitioning = false;
  // Cooperativo: caiu numa luta de boss e está assistindo o parceiro.
  private spectating = false;
  private spectateNotice?: 'watching' | 'victory';
  private spectateCamera?: Phaser.GameObjects.GameObject;
  private controls?: Controls;

  constructor() {
    super('PrisonScene');
  }

  create(data: PrisonSceneData): void {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      throw new Error('Teclado indisponível para controlar o jogador.');
    }

    const roomId =
      data.roomId && data.roomId in PRISON_ROOMS ? data.roomId : PRISON_START_ROOM;
    this.roomId = roomId;
    const controls = new Controls(keyboard);
    this.controls = controls;

    // Salva um instante depois: o item entra no inventário antes de a arma ser
    // equipada (ou o anel aplicado), e a flag do boss é gravada após o evento.
    const onPickup = (): void => {
      playSound(this, 'pickup');
      this.time.delayedCall(100, () => saveGame(this.game));
    };
    const onBossDefeated = (): void => {
      this.time.delayedCall(100, () => saveGame(this.game));
    };
    this.game.events.on(INVENTORY_ITEM_ADDED, onPickup);
    this.game.events.on(GAME_EVENTS.bossDefeated, onBossDefeated);
    // Cooperativo: avisos de presença (o parceiro saiu/voltou) e fim da
    // partida (o anfitrião saiu ou a conexão caiu: volta ao menu).
    const onCoopNotice = (text: string): void => this.interactions?.showMessage(text);
    const onCoopEnded = (): void => this.leaveToMenu();
    this.game.events.on(INVENTORY_ITEM_ADDED, onPickup);
    this.game.events.on(GAME_EVENTS.bossDefeated, onBossDefeated);
    this.game.events.on(GAME_EVENTS.coopNotice, onCoopNotice);
    this.game.events.on(GAME_EVENTS.coopEnded, onCoopEnded);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(INVENTORY_ITEM_ADDED, onPickup);
      this.game.events.off(GAME_EVENTS.bossDefeated, onBossDefeated);
      this.game.events.off(GAME_EVENTS.coopNotice, onCoopNotice);
      this.game.events.off(GAME_EVENTS.coopEnded, onCoopEnded);
      // Inventário aberto por cima não sobrevive à troca de sala.
      this.scene.stop('InventoryScene');
    });
    if (data.resting) playSound(this, 'rest');
    this.isTransitioning = false;
    this.spectating = false;
    this.spectateNotice = undefined;
    this.spectateCamera = undefined;
    this.game.events.emit(GAME_EVENTS.bossDismissed);
    this.world = WorldState.of(this.game);
    this.cameras.main.setBackgroundColor('#040307');
    this.combat = new CombatSystem(this);
    this.terrain = new TerrainSystem(this);
    this.room = PRISON_ROOMS[roomId](this, this.world);

    const entry = this.room.entries[data.entryId ?? 'start'] ??
      Object.values(this.room.entries)[0];

    this.player = new Player(this, entry.x, (entry.y ?? this.room.floorY) + 1, controls);
    this.combat.addAttacker(this.player);
    this.combat.addTarget(this.player);
    this.player.setFlipX(entry.facing === 'left');
    this.interactions = new InteractionSystem(this, this.player, controls);

    for (const collider of this.room.colliders) {
      this.physics.add.collider(this.player, collider);
      this.room.enemies.forEach((enemy) => this.physics.add.collider(enemy, collider));
    }

    for (const enemy of this.room.enemies) {
      enemy.setTarget(this.player);
      this.combat.addTarget(enemy);
      this.combat.addAttacker(enemy);
      enemy.attachCombat(this.combat);
      new EnemyHealthBar(this, enemy, enemy.definition.hurtbox.height);
    }
    for (const boss of this.room.bosses ?? []) {
      boss.setTarget(this.player);
      boss.attachCombat(this.combat);
      this.combat.addTarget(boss);
      this.combat.addAttacker(boss);
    }

    this.room.pickups.forEach((pickup) => this.registerPickup(pickup));
    this.room.gates.forEach((gate) => this.registerGate(gate));
    this.room.chests?.forEach((chest) => this.registerChest(chest));
    this.room.bonfires?.forEach((bonfire) => this.registerBonfire(bonfire));

    if (data.resting) {
      this.resumeRest(data.entryId);
    }
    if (data.notice) {
      this.interactions.showMessage(data.notice);
    }
    this.room.lockedDoors?.forEach((door) => this.registerLockedDoor(door));
    this.room.passages?.forEach((passage) => this.registerPassage(passage));
    this.player.setLadders(this.room.ladders ?? []);
    this.room.onPlayerSpawned?.(this.player);
    this.groundMessages = new GroundMessageSystem(this, this.room.groundMessages ?? []);
    this.startCoop(roomId, data);

    this.setUpCamera(this.room, this.player);
    startSoundscape(this, roomId);
    this.announceFirstVisit(roomId, this.room);
    this.watchForDemoEnd();
    // Toda chegada numa sala (troca de sala, descanso, renascimento) salva.
    saveGame(this.game);

    // A partida cooperativa acabou no meio da troca de sala.
    if (hasCoopEnded(this.game)) {
      this.leaveToMenu();
    }
  }

  // Fim da partida cooperativa: o menu mostra o motivo.
  private leaveToMenu(): void {
    this.isTransitioning = true;
    this.scene.stop('InventoryScene');
    this.scene.start('MenuScene');
  }

  private isDemoOver(): boolean {
    const world = this.world;
    return !!world && !world.hasFlag(DEMO.finishedFlag) && DEMO.endFlags.every((flag) => world.hasFlag(flag));
  }

  // Derrotados todos os bosses da demo, mostra o fim uma vez, depois da
  // vitória e da recompensa saírem da tela. Se o jogador trocar de sala antes
  // disso, aparece logo ao chegar na próxima.
  private watchForDemoEnd(): void {
    const schedule = (delay: number): void => {
      this.time.delayedCall(delay, () => {
        if (this.isDemoOver() && !this.isTransitioning && this.player?.isAlive) {
          this.world?.setFlag(DEMO.finishedFlag);
          // No cooperativo o mundo não pode parar: o parceiro segue jogando.
          if (isCoopSession(this.game)) {
            this.openOverlay('DemoEndScene');
          } else {
            this.scene.pause();
            this.scene.launch('DemoEndScene');
          }
        }
      });
    };
    const handler = (): void => schedule(DEMO.endDelayMs);

    if (this.isDemoOver()) {
      schedule(DEMO.arrivalDelayMs);
    }
    this.game.events.on(GAME_EVENTS.bossDefeated, handler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(GAME_EVENTS.bossDefeated, handler));
  }

  update(_time: number, delta: number): void {
    this.coop?.update(delta);

    if (!this.player || !this.room || this.isTransitioning) {
      return;
    }

    this.player.update();
    this.toggleCheatMode();
    this.handleEquipmentKeys();

    if (this.player.isDead && !this.spectating && !this.startSpectating()) {
      this.handleDeath();
      return;
    }

    if (this.spectating) {
      this.updateSpectating();
      if (this.isTransitioning) return;
    }

    if (this.summon) {
      this.followSummon(this.summon);
      return;
    }
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    if (!this.player.isClimbing) {
      const onStairs = this.room.stairs.some((stairs) => stairs.constrain(playerBody));
      playerBody.setAllowGravity(!onStairs);
    }
    this.terrain?.update(this.player, this.room.slowZones, delta);
    this.groundMessages?.update(this.player);
    this.room.enemies.forEach((enemy) => enemy.update(delta));
    // Inimigos comandados pelo parceiro (cooperativo) já chegam na posição certa.
    separateEnemies(this.room.enemies.filter((enemy) => !enemy.isRemoteControlled));
    this.room.bosses?.forEach((boss) => boss.update(delta));
    this.combat?.update();
    this.interactions?.update();

    const exit = this.room.exits.find((candidate) =>
      this.hasCrossed(candidate),
    );

    if (exit) {
      this.goTo(exit);
    }
  }

  // Q troca de arma na hora; Tab abre o inventário por cima, sem pausar o
  // jogo (inimigos e parceiro seguem; o personagem fica parado).
  private handleEquipmentKeys(): void {
    if (!this.player?.isFree || !this.controls || !this.world) {
      return;
    }

    if (this.controls.justPressed('inventory')) {
      this.openOverlay('InventoryScene');
      return;
    }

    if (this.controls.justPressed('switchWeapon')) {
      const state = PlayerState.of(this.game);
      const owned = ownedWeaponIds(this.world.inventory);
      const next = nextWeaponId(state.equippedWeaponId, owned);

      if (next !== state.equippedWeaponId) {
        state.equip(next);
        this.player.refreshWeapon();
        playSound(this, 'equip');
        this.interactions?.showMessage(state.weapon.name);
      }
    }
  }

  // Tela por cima do jogo (inventário, fim da demo no cooperativo) sem
  // pausá-lo: o personagem fica sem comandos até ela fechar.
  private openOverlay(key: 'InventoryScene' | 'DemoEndScene'): void {
    const controls = this.controls;
    controls?.setEnabled(false);
    this.scene.launch(key);
    this.scene.get(key).events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      controls?.setEnabled(true);
      if (this.controls === controls) this.player?.refreshWeapon();
    });
  }

  // Código secreto (V, I, D e A juntas): liga/desliga o modo VIDA.
  private toggleCheatMode(): void {
    if (!this.controls?.cheatCodeEntered()) {
      return;
    }

    const state = PlayerState.of(this.game);
    state.cheatMode = !state.cheatMode;
    this.interactions?.showMessage(`Modo VIDA ${state.cheatMode ? 'ligado: vida infinita e dano x10' : 'desligado'}`);
  }

  private setUpCamera(room: Room, player: Player): void {
    const { x, y, width, height } = room.bounds;
    const view = room.cameraBounds ?? room.bounds;
    const camera = this.cameras.main;

    // O limite físico padrão é o tamanho da tela; salas largas ou altas
    // precisam do seu, igual ao da câmera.
    this.physics.world.setBounds(x, y, width, height);

    camera
      .setZoom(room.zoom)
      .setBounds(view.x, view.y, view.width, view.height)
      .startFollow(player, true, 0.12, 0.12, 0, 60)
      .setDeadzone(80, 40);
    camera.fadeIn(600, 4, 3, 8);
  }

  private announceFirstVisit(roomId: RoomId, room: Room): void {
    const flag = `visited:${roomId}`;

    if (this.world?.hasFlag(flag)) {
      return;
    }

    this.world?.setFlag(flag);
    showAreaTitle(this, room.title, room.subtitle);
  }

  private hasCrossed(exit: RoomExit): boolean {
    if (!this.player || !(exit.isOpen?.() ?? true)) {
      return false;
    }

    if (exit.maxFeetY !== undefined && this.player.y > exit.maxFeetY) {
      return false;
    }

    return exit.side === 'right'
      ? this.player.x >= exit.x
      : this.player.x <= exit.x;
  }

  private goTo(exit: RoomExit): void {
    this.travel({ roomId: exit.toRoom, entryId: exit.toEntry });
  }

  private travel(data: PrisonSceneData): void {
    this.isTransitioning = true;
    (this.player?.body as Phaser.Physics.Arcade.Body | undefined)?.setVelocityX(0);

    this.cameras.main.fadeOut(TRANSITION_FADE_MS, 4, 3, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart(data);
    });
  }

  // O parceiro entrou numa arena de boss: este jogo vai junto, na próxima
  // atualização em que estiver livre (com o inventário aberto, espera fechar).
  private followSummon({ roomId, entryId }: ArenaSummonMessage): void {
    this.summon = undefined;

    if (roomId in PRISON_ROOMS) {
      this.travel({ roomId: roomId as RoomId, entryId, notice: this.summonNotice });
    }
  }

  private registerPickup(pickup: ItemPickup): void {
    this.interactions?.add({
      x: pickup.x,
      promptY: pickup.y - 26,
      floorY: this.room?.floorY ?? pickup.y,
      range: PICKUP_RANGE,
      isAvailable: () => !pickup.isCollected,
      label: () => 'Examinar',
      interact: () => {
        this.player?.pickUp(pickup.x, () => {
          pickup.collect();
          this.world?.inventory.add(pickup.item);
          this.interactions?.showMessage(pickup.item.name);
        });
      },
    });
  }

  // Cooperativo: parceiro visível nesta sala, progresso e inimigos
  // compartilhados. No solo não há sessão e nada disso roda.
  private startCoop(roomId: RoomId, data: PrisonSceneData): void {
    const room = isCoopSession(this.game) ? network.getRoom() : undefined;
    this.summon = undefined;

    if (!room || !this.player || !this.room || !this.combat) {
      this.coop = undefined;
      return;
    }

    // Chegou andando numa arena com boss vivo: chama o parceiro.
    const hasLivingBoss = (this.room.bosses?.length ?? 0) > 0;
    const arena = hasLivingBoss && !data.resting && data.entryId ? { roomId, entryId: data.entryId } : undefined;

    this.coop = new CoopSession(this, {
      room,
      player: this.player,
      roomId,
      arena,
      enemies: this.room.enemies,
      bosses: this.room.bosses ?? [],
      combat: this.combat,
      onSharedProgress: (message, item) => this.applySharedProgress(message, item),
      onSummoned: (summon, partner) => {
        this.summon = summon;
        this.summonNotice = `${partner} entrou na arena. Você foi levado junto.`;
      },
      notify: (message) => this.interactions?.showMessage(message),
      isSpectating: () => this.spectating,
      onRevived: (revive) => this.reviveFromSpectating(revive),
    });
  }

  // Cooperativo: o parceiro pegou um item ou abriu algo. Os objetos desta sala
  // passam a refletir o mundo compartilhado (a chave some do chão, o portão
  // sobe, o baú abre, a lanterna acende).
  private applySharedProgress(message?: string, item?: ItemDefinition): void {
    const world = this.world;
    const room = this.room;

    if (!world || !room) return;

    room.pickups
      .filter((pickup) => !pickup.isCollected && world.inventory.has(pickup.item.id))
      .forEach((pickup) => pickup.collect());
    room.gates.filter((gate) => gate.isClosed && world.hasFlag(gate.id)).forEach((gate) => gate.open());
    room.chests?.filter((chest) => !chest.isOpen && world.hasFlag(chest.id)).forEach((chest) => chest.open());
    room.bonfires?.filter((bonfire) => !bonfire.isLit && world.hasFlag(bonfire.id)).forEach((bonfire) => bonfire.kindle());

    // Arma achada pelo parceiro: entra na mão de quem ainda está de punhos.
    const weaponId = item && weaponIdForItem(item.id);
    const state = PlayerState.of(this.game);

    if (weaponId && state.weapon.category === 'unarmed') {
      state.equip(weaponId);
    }

    if (message) {
      this.interactions?.showMessage(message);
    }
    this.player?.refreshWeapon();
    // O anfitrião guarda no save o que o parceiro pegou.
    saveGame(this.game);
  }

  // Descansar recupera tudo e faz desta fogueira o ponto de renascimento.
  private registerBonfire(bonfire: Bonfire): void {
    this.interactions?.add({
      x: bonfire.x - 70,
      promptY: bonfire.floorY - 150,
      floorY: bonfire.floorY,
      range: 60,
      isAvailable: () => true,
      label: () => (bonfire.isLit ? 'Descansar' : 'Acender a lanterna'),
      interact: () => {
        this.player?.rest(bonfire.x, () => {
          // Cooperativo: descansa quando o parceiro também sentar nesta lanterna.
          if (this.coop) {
            this.coop.requestRest({ bonfireId: bonfire.id, ...bonfire.checkpoint }, () => this.completeRest(bonfire));
          } else {
            this.completeRest(bonfire);
          }
        });
      },
    });
  }

  private completeRest(bonfire: Bonfire): void {
    const state = PlayerState.of(this.game);
    bonfire.kindle();
    state.health.restore();
    state.stamina.restore();
    state.refillAmpoules();
    this.world?.setFlag(bonfire.id);
    this.world?.setCheckpoint(bonfire.checkpoint);
    this.game.events.emit(GAME_EVENTS.playerRested);
    this.reviveRoom(bonfire);
  }

  // Morte: mensagem, tela escurece e renasce na última fogueira com tudo cheio.
  private handleDeath(): void {
    if (this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    this.game.events.emit(GAME_EVENTS.playerDied);

    this.events.once(GAME_EVENTS.playerDeathAnimationCompleted, () => {
      this.time.delayedCall(PLAYER_ANIMATION.deathMs, () => this.respawn());
    });
  }

  // Volta inteiro na última lanterna (ou na indicada, já sentado nela).
  private respawn(at?: { roomId: string; entryId: string }, resting = false): void {
    this.isTransitioning = true;
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const state = PlayerState.of(this.game);
      state.health.restore();
      state.stamina.restore();
      state.refillAmpoules();

      const checkpoint = at ?? this.world?.checkpoint;
      this.scene.restart({ roomId: checkpoint?.roomId, entryId: checkpoint?.entryId, resting });
    });
  }

  // Cooperativo: caiu na luta de um boss com o parceiro ainda de pé na
  // arena. Em vez de renascer, assiste: se o parceiro também cair, os dois
  // voltam à lanterna; se ele vencer, este jogo vence junto (itens inclusos)
  // e volta à vida quando o parceiro descansar numa lanterna.
  private startSpectating(): boolean {
    const partner = this.coop?.partner;
    const inBossFight = this.room?.bosses?.some((boss) => boss.isEngaged) ?? false;

    if (!isCoopActive(this.game) || !inBossFight || !partner?.isAlive) {
      return false;
    }

    this.spectating = true;
    this.spectateNotice = 'watching';
    this.game.events.emit(GAME_EVENTS.playerDied);
    // O fosso da Raiz fica fora da câmera normal: o espectador vê a sala toda.
    const { x, y, width, height } = this.room?.bounds ?? { x: 0, y: 0, width: 0, height: 0 };
    this.cameras.main.setBounds(x, y, width, height);
    this.events.once(GAME_EVENTS.playerDeathAnimationCompleted, () => {
      if (this.spectating) this.interactions?.showMessage(`Você caiu. Assistindo ${partner.name}...`);
    });
    return true;
  }

  private updateSpectating(): void {
    const partner = this.coop?.partner;
    const status = this.coop?.partnerStatus;
    const bossAlive = this.room?.bosses?.some((boss) => boss.isAlive) ?? false;

    if (partner && this.spectateCamera !== partner) {
      this.spectateCamera = partner;
      this.cameras.main.startFollow(partner, true, 0.12, 0.12);
    }

    // O parceiro caiu também (ou saiu): os dois voltam à lanterna.
    const partnerDown = !status?.alive || status.spectating || status.roomId !== this.roomId;
    if (!isCoopActive(this.game) || (bossAlive && partnerDown)) {
      this.spectating = false;
      this.respawn();
      return;
    }

    if (!bossAlive && this.spectateNotice !== 'victory') {
      this.spectateNotice = 'victory';
      this.interactions?.showMessage(`${partner?.name ?? 'Seu parceiro'} venceu! Espere ele descansar numa lanterna para voltar.`);
    }
  }

  // Assistindo, o parceiro descansou numa lanterna: volta à vida nela.
  private reviveFromSpectating({ roomId, entryId }: RestReviveMessage): void {
    if (!this.spectating || !(roomId in PRISON_ROOMS)) {
      return;
    }

    this.spectating = false;
    this.world?.setCheckpoint({ roomId: roomId as RoomId, entryId });
    this.respawn({ roomId, entryId }, true);
  }

  // Abrir o baú usa a animação de coleta; a arma já sai equipada.
  private registerChest(chest: Chest): void {
    this.interactions?.add({
      x: chest.x - 30,
      promptY: chest.floorY - 60,
      floorY: chest.floorY,
      range: PICKUP_RANGE,
      isAvailable: () => !chest.isOpen,
      label: () => 'Abrir',
      interact: () => {
        this.player?.pickUp(chest.x, () => {
          chest.open();
          this.world?.setFlag(chest.id);
          this.world?.inventory.add(chest.item);
          this.onItemObtained(chest.item);
          this.interactions?.showMessage(chest.item.name);
        });
      },
    });
  }

  // Armas saem do baú já equipadas: trocam o golpe e aparecem na mão.
  private onItemObtained(item: ItemDefinition): void {
    applyItemEffect(this.game, item);
    const weaponId = weaponIdForItem(item.id);

    if (weaponId) {
      PlayerState.of(this.game).equip(weaponId);
      this.player?.refreshWeapon();
    }
  }


  // Portas para depois: só dá para examinar e ler a pista.
  // Descansar faz o mundo voltar: a sala é recriada (todos os inimigos de
  // volta, exceto os marcados por flag, como bosses derrotados) com o jogador
  // ainda sentado na lanterna.
  private reviveRoom(bonfire: Bonfire): void {
    this.isTransitioning = true;
    this.cameras.main.fadeOut(REST_FADE_MS, 4, 3, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ roomId: this.roomId, entryId: bonfire.checkpoint.entryId, resting: true });
    });
  }

  private resumeRest(entryId?: string): void {
    const bonfire = this.room?.bonfires?.find((candidate) => candidate.checkpoint.entryId === entryId);

    if (!bonfire) {
      return;
    }

    this.player?.sitAtFire(bonfire.x);
    this.cameras.main.fadeIn(REST_FADE_MS, 4, 3, 8);
    this.interactions?.showMessage('Você descansou. A chama da lanterna guardará seu retorno.');
  }

  private registerPassage(passage: RoomPassage): void {
    this.interactions?.add({
      x: passage.x,
      promptY: passage.floorY - 150,
      floorY: passage.floorY,
      range: 70,
      isAvailable: () => !this.isTransitioning && (passage.isOpen?.() ?? true),
      label: () => passage.label,
      interact: () =>
        this.goTo({ side: 'left', x: passage.x, toRoom: passage.toRoom, toEntry: passage.toEntry }),
    });
  }

  private registerLockedDoor(door: LockedDoor): void {
    this.interactions?.add({
      x: door.x,
      promptY: door.floorY - 170,
      floorY: door.floorY,
      range: 70,
      isAvailable: () => true,
      label: () => 'Examinar',
      interact: () => {
        playSound(this, 'locked');
        this.interactions?.showMessage(door.message);
      },
    });
  }

  private registerGate(gate: CellGate): void {
    const hasKey = (): boolean =>
      this.world?.inventory.has(gate.keyItemId) ?? false;

    this.interactions?.add({
      // O jogador só alcança o lado de dentro do portão.
      x: gate.x - 50,
      promptY: 400,
      floorY: gate.floorY,
      range: GATE_RANGE,
      isAvailable: () => gate.isClosed,
      label: () => (hasKey() ? 'Destrancar' : 'Examinar'),
      interact: () => {
        if (hasKey()) {
          gate.open(() => this.world?.setFlag(gate.id));
          return;
        }

        playSound(this, 'locked');
        this.interactions?.showMessage('Trancado. A chave deve estar por perto.');
      },
    });
  }
}
