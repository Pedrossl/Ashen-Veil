import { Room, Client } from "@colyseus/core";
import { GameState, PlayerState } from "./schema/GameState";
import { RELAYED_MESSAGES, RoomOwnership } from "./CoopRelay";

interface GameRoomOptions {
  state: GameState;
  metadata: { password?: string };
}

export class GameRoom extends Room<GameRoomOptions> {
  maxClients = 2; // Máximo de 2 jogadores (Host + Convidado)
  private roomPassword?: string;
  private readonly ownership = new RoomOwnership();
  // Aparência do convidado que saiu no meio da partida: volta com ela.
  private lastGuestSkin = "";
  // Convidados voltando à partida, esperando o mundo atual do anfitrião.
  private readonly rejoining = new Set<string>();

  onCreate(options: any) {
    this.setState(new GameState());

    if (options.password && typeof options.password === "string" && options.password.trim() !== "") {
      this.roomPassword = options.password.trim();
      // Fora da listagem pública; a senha fica só no servidor (metadados
      // da sala chegam a qualquer cliente).
      this.setPrivate(true);
    }

    console.log(`[Sala ${this.roomId}] Criada! Senha: ${this.roomPassword ? "SIM" : "NÃO"}`);

    // Mensagem de seleção de skin (sem repetição!)
    this.onMessage("select_skin", (client: Client, data: { skinId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const requestedSkin = data.skinId;

      // Verifica se o outro jogador já pegou essa skin
      let alreadyTaken = false;
      this.state.players.forEach((other: PlayerState) => {
        if (other.id !== client.sessionId && other.skin === requestedSkin) {
          alreadyTaken = true;
        }
      });

      if (alreadyTaken) {
        client.send("error", { message: "Esta aparência já foi escolhida pelo outro jogador." });
        return;
      }

      player.skin = requestedSkin;
      // Ao trocar de skin, reseta o ready se estiver pronto
      player.isReady = false;
    });

    // Mensagem para alternar status de pronto
    this.onMessage("toggle_ready", (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (!player.skin) {
        client.send("error", { message: "Escolha uma aparência antes de ficar pronto." });
        return;
      }

      player.isReady = !player.isReady;
    });

    // Host altera a dificuldade
    this.onMessage("set_difficulty", (client: Client, data: { difficulty: string }) => {
      if (client.sessionId !== this.state.hostId) return;
      if (data.difficulty === "normal" || data.difficulty === "easy") {
        this.state.difficulty = data.difficulty;
      }
    });

    // Durante a partida: personagens, progresso e inimigos são decididos
    // pelos jogos; o servidor só repassa ao outro jogador.
    for (const type of RELAYED_MESSAGES) {
      this.onMessage(type, (client: Client, payload: Record<string, unknown>) => {
        if (this.state.status !== "in-game" || typeof payload !== "object" || payload === null) return;
        this.broadcast(type, { ...payload, id: client.sessionId }, { except: client });
      });
    }

    // Em que sala da prisão cada um está: define quem comanda os inimigos dela.
    this.onMessage("enter_room", (client: Client, payload: { roomId?: unknown }) => {
      if (this.state.status !== "in-game" || typeof payload?.roomId !== "string") return;
      this.announceOwners(this.ownership.enter(client.sessionId, payload.roomId));
    });

    // Convidado voltando a uma partida em andamento: pede o mundo atual ao
    // anfitrião (ele está jogando; o save pode estar atrasado).
    this.onMessage("rejoin", (client: Client) => {
      if (this.state.status !== "in-game" || client.sessionId === this.state.hostId) return;
      this.rejoining.add(client.sessionId);
      this.clients.find((other) => other.sessionId === this.state.hostId)?.send("world_request", {});
    });

    this.onMessage("world_snapshot", (client: Client, payload: { world?: unknown }) => {
      if (client.sessionId !== this.state.hostId || typeof payload?.world !== "object" || payload.world === null) return;

      for (const guest of this.clients.filter((other) => this.rejoining.has(other.sessionId))) {
        this.rejoining.delete(guest.sessionId);
        guest.send("game_started", { difficulty: this.state.difficulty, world: payload.world });
        const name = this.state.players.get(guest.sessionId)?.name ?? "Seu parceiro";
        client.send("partner_joined", { name });
      }
      this.lock();
    });

    // Host inicia a partida
    // O anfitrião manda o mundo dele (o save) para o convidado entrar nele.
    this.onMessage("start_game", (client: Client, payload: { world?: unknown }) => {
      if (client.sessionId !== this.state.hostId) return;

      if (typeof payload?.world !== "object" || payload.world === null) {
        client.send("error", { message: "Não foi possível preparar o mundo do anfitrião." });
        return;
      }

      if (this.state.players.size < 2) {
        client.send("error", { message: "Aguarde o segundo jogador entrar." });
        return;
      }

      let canStart = true;
      this.state.players.forEach((p: PlayerState) => {
        if (!p.isReady || !p.skin) {
          canStart = false;
        }
      });

      if (!canStart) {
        client.send("error", { message: "Ambos os jogadores devem escolher skin e estar prontos." });
        return;
      }

      this.state.status = "in-game";
      this.lock();
      console.log(`[Sala ${this.roomId}] Partida iniciada na dificuldade: ${this.state.difficulty}`);
      this.broadcast("game_started", {
        difficulty: this.state.difficulty,
        world: payload.world,
      });
    });
  }

  // Validação de senha ao entrar
  async onAuth(_client: Client, options: any) {
    if (this.roomPassword) {
      const providedPass = options?.password ? String(options.password).trim() : "";
      if (providedPass !== this.roomPassword) {
        throw new Error("Senha incorreta.");
      }
    }
    return true;
  }

  onJoin(client: Client, options: any) {
    console.log(`[Sala ${this.roomId}] Cliente ${client.sessionId} entrou.`);

    const newPlayer = new PlayerState();
    newPlayer.id = client.sessionId;
    newPlayer.name = options.name ? String(options.name).slice(0, 16) : `Viajante ${this.state.players.size + 1}`;

    // Primeiro jogador a entrar é o Host
    if (this.state.players.size === 0) {
      newPlayer.isHost = true;
      this.state.hostId = client.sessionId;
    } else {
      newPlayer.isHost = false;
    }

    // Voltando a uma partida em andamento: mesma aparência de antes (ou a
    // primeira livre) e já pronto; o jogo dele pede para entrar (`rejoin`).
    if (this.state.status === "in-game") {
      const hostSkin = this.state.players.get(this.state.hostId)?.skin;
      const skins = [this.lastGuestSkin, "veil", "forest", "ember"].filter((skin) => skin && skin !== hostSkin);
      newPlayer.skin = skins[0] ?? "";
      newPlayer.isReady = true;
    }

    this.state.players.set(client.sessionId, newPlayer);
  }

  onLeave(client: Client, _code?: number) {
    console.log(`[Sala ${this.roomId}] Cliente ${client.sessionId} saiu.`);
    const player = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.rejoining.delete(client.sessionId);
    this.announceOwners(this.ownership.leave(client.sessionId));

    // O anfitrião saiu (ou caiu): o mundo é dele, a partida acaba para os dois.
    if (client.sessionId === this.state.hostId) {
      this.broadcast("room_disbanded", { message: "O anfitrião saiu. A partida cooperativa acabou." });
      this.disconnect();
      return;
    }

    // O convidado saiu no meio da partida: o anfitrião segue, e a sala volta
    // a aceitar entrada para ele poder voltar com o mesmo código.
    if (this.state.status === "in-game") {
      this.lastGuestSkin = player?.skin ?? "";
      this.broadcast("partner_left", { name: player?.name ?? "Seu parceiro" });
      this.unlock();
    }
  }

  // Avisa os dois de quem comanda os inimigos de cada sala afetada.
  private announceOwners(roomIds: string[]): void {
    for (const roomId of roomIds) {
      this.broadcast("room_owner", { roomId, ownerId: this.ownership.ownerOf(roomId) ?? "" });
    }
  }

  onDispose() {
    console.log(`[Sala ${this.roomId}] Desfeita.`);
  }
}
