import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT || 3001);

// O Colyseus cria o servidor HTTP e cuida das rotas de matchmaking; rotas
// próprias entram pela opção `express` (responder antes dele quebra as dele).
const gameServer = new Server({
  transport: new WebSocketTransport(),
  express: (app) => {
    app.get("/health", (_req: unknown, res: { json(body: unknown): void }) => {
      res.json({ ok: true, timestamp: new Date().toISOString() });
    });
  },
});

// Entra-se sempre pelo código da sala (joinById); a senha é conferida no onAuth.
gameServer.define("game_room", GameRoom);

gameServer.listen(port).then(() => {
  console.log(`\nAshen Veil — servidor Colyseus na porta ${port}\n`);
});
