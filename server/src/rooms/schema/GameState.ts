import { Schema, type, MapSchema } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("string") skin: string = ""; // "veil" | "forest" | "ember"
  @type("boolean") isReady: boolean = false;
  @type("boolean") isHost: boolean = false;
}

export class GameState extends Schema {
  @type("string") status: string = "lobby"; // "lobby" | "in-game"
  @type("string") hostId: string = "";
  @type("string") difficulty: string = "normal"; // "normal" | "easy"
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
