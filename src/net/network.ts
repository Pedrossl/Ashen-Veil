import { Client, Room } from '@colyseus/sdk';

// Servidor das salas: por padrão no mesmo endereço do jogo, em `/colyseus`
// (o Vite repassa para a porta 3001; ver vite.config.ts). Assim funciona em
// localhost e por um túnel do ngrok sem configurar nada. Com o servidor em
// outro lugar, defina VITE_SERVER_URL na build.
const DEFAULT_SERVER_URL =
  import.meta.env.VITE_SERVER_URL || `${window.location.origin}/colyseus`;

class NetworkManager {
  private client: Client;
  private currentRoom?: Room;

  constructor() {
    this.client = new Client(DEFAULT_SERVER_URL);
  }

  setServerUrl(url: string): void {
    this.client = new Client(url);
  }

  getServerUrl(): string {
    return DEFAULT_SERVER_URL;
  }

  async createRoom(password: string, name: string): Promise<Room> {
    if (this.currentRoom) {
      this.leaveRoom();
    }
    const room = await this.client.create('game_room', {
      password,
      name,
    });
    this.currentRoom = room;
    return room;
  }

  async joinRoom(roomId: string, password: string, name: string): Promise<Room> {
    if (this.currentRoom) {
      this.leaveRoom();
    }
    const room = await this.client.joinById(roomId, {
      password,
      name,
    });
    this.currentRoom = room;
    return room;
  }

  getRoom(): Room | undefined {
    return this.currentRoom;
  }

  // Saída pedida por este jogo: a sala deixa de ser a atual antes de fechar,
  // então quem vigia a conexão não trata como queda.
  leaveRoom(): void {
    const room = this.currentRoom;
    this.currentRoom = undefined;

    try {
      room?.leave();
    } catch {
      // A conexão já tinha caído.
    }
  }
}

export const network = new NetworkManager();
