# Ashen Veil — Servidor Multiplayer

Servidor Node.js com **Colyseus 0.18** para as salas cooperativas (máx. 2 jogadores).
O cliente fica em `src/net/network.ts` (`@colyseus/sdk`), e as telas em
`src/scenes/MenuScene.ts` (criar/entrar) e `src/scenes/MultiplayerLobbyScene.ts`.

## Estrutura

```
server/
├── src/
│   ├── index.ts                 # Servidor Colyseus + rota /health
│   └── rooms/
│       ├── GameRoom.ts          # Regras da sala (skins, pronto, dificuldade, início)
│       └── schema/GameState.ts  # Estado sincronizado (jogadores, host, dificuldade)
├── package.json
└── tsconfig.json
```

## Comandos

```bash
cd server
npm install
npm run dev        # desenvolvimento (reinicia ao salvar)
npm run build      # compila para dist/
npm start          # roda a build
npm run typecheck
```

O jogo fala com o servidor em `/colyseus`, no mesmo endereço em que está aberto;
o `vite.config.ts` (dev e preview) repassa esse caminho para a porta 3001,
inclusive o WebSocket. Para o servidor em outro endereço, defina `VITE_SERVER_URL`
ao gerar a build.

### Jogar com um amigo pelo ngrok

```bash
cd server && npm run dev     # terminal 1: servidor das salas
npm run dev                  # terminal 2: o jogo (porta 5173)
ngrok http 5173              # terminal 3: um único túnel para os dois
```

Mande ao amigo o endereço `https://...ngrok...` que o ngrok mostrar. Você pode
jogar em `http://localhost:5173` ou pelo mesmo endereço do ngrok.

| Variável | Padrão | Descrição |
| -------- | ------ | --------- |
| `PORT`   | `3001` | Porta do servidor |

## Fluxo da sala

1. O anfitrião cria a sala (nome e senha opcional) e recebe o **código** — sensível a
   maiúsculas e minúsculas; clique nele no lobby para copiar.
2. O convidado entra com o código (e a senha, se houver). Senha errada: `onAuth` recusa.
3. **Aparências:** cada um escolhe a sua; o servidor recusa a que o outro já pegou.
   Confirmar a aparência marca o jogador como pronto (trocar de aparência desfaz).
4. **Dificuldade:** com os dois prontos, só o anfitrião escolhe (Normal/Fácil).
5. O anfitrião inicia mandando o **mundo dele** (o save: portões, baús, lanternas,
   bosses, itens, última lanterna). Todos recebem `game_started` com a dificuldade e
   esse mundo; o convidado entra nele, e os dois começam na lanterna do anfitrião.
6. **Saídas:** se o anfitrião sai (ou cai), a sala acaba para os dois (`room_disbanded`)
   e cada jogo volta ao menu com o aviso. Se o convidado sai, o anfitrião recebe
   `partner_left`, segue como no solo e a sala volta a aceitar entrada: o convidado
   entra de novo com o mesmo código, recebe a mesma aparência, manda `rejoin`, o
   servidor pede o mundo atual ao anfitrião (`world_request`/`world_snapshot`) e o
   entrega ao convidado com `game_started`; o anfitrião recebe `partner_joined`.

## Mensagens (cliente → servidor)

| Mensagem         | Payload                   | Quem      |
| ---------------- | ------------------------- | --------- |
| `player_state`   | estado do personagem (sala, x, y, quadro, aparência, arma) | qualquer, durante a partida; repassada ao outro |
| `world_event`    | `{ kind: 'item', itemId }` ou `{ kind: 'flag', flag }` | qualquer, durante a partida; repassada ao outro |
| `enter_room`     | `{ roomId }` (sala da prisão onde o jogo está) | qualquer; o servidor responde `room_owner` |
| `foe_states`, `foe_hit` | `{ roomId, group, ... }` estados dos inimigos ou bosses (`group`: `enemies`/`bosses`) de quem comanda a sala; golpe dado por quem segue | repassadas ao outro |
| `boss_decision` | `{ roomId, index, decision }` decisão do boss (golpe, teleporte, mergulho...) que o outro jogo executa | repassada ao outro |
| `player_hit`, `enemy_projectile` | golpe de inimigo ou boss no parceiro, arremesso | repassadas ao outro |
| `rest_ready`, `rest_cancel` | `{ roomId, bonfireId }` / — (sentou ou levantou da lanterna) | repassadas ao outro |
| `rest_revive` | `{ roomId, entryId }` (descansou com o parceiro de espectador: ele volta nessa lanterna) | repassada ao outro |
| `rejoin` | — (convidado voltando a uma partida em andamento) | convidado |
| `world_snapshot` | `{ world }` (mundo atual, em resposta a `world_request`) | anfitrião |
| `arena_summon` | `{ roomId, entryId }` (entrou numa arena de boss vivo) | repassada; o outro é levado para a mesma entrada |
| `select_skin`    | `{ skinId }`              | qualquer  |
| `toggle_ready`   | —                         | qualquer  |
| `set_difficulty` | `{ difficulty }`          | anfitrião |
| `start_game`     | `{ world }` (mundo do anfitrião) | anfitrião |

## Mensagens (servidor → cliente)

| Mensagem         | Payload                   |
| ---------------- | ------------------------- |
| `error`          | `{ message }`             |
| `game_started`   | `{ difficulty, world }`   |
| `room_disbanded` | `{ message }` (anfitrião saiu: a partida acaba) |
| `partner_left`, `partner_joined` | `{ name }` (convidado saiu / voltou) |
| `world_request` | — (ao anfitrião: o convidado está voltando) |
| `player_state`   | estado do parceiro + `id` |
| `world_event`    | item ou marcação do parceiro + `id` |
| `room_owner`     | `{ roomId, ownerId }` — quem comanda os inimigos e bosses da sala |

## Ainda não existe

Cooperativo no estilo do Lords of the Fallen: o mundo é do anfitrião e cada um
anda livre por ele. Compartilhados: os personagens, os itens, o mundo (portões,
baús, lanternas), os inimigos comuns (numa sala com os dois, o primeiro a chegar
comanda; ver `CoopRelay.ts`) e o descanso (só com os dois sentados na mesma
lanterna). Bosses também: um só para os dois (`foe_states`/`boss_decision`).

## Deploy na VPS

```bash
cd server
npm install --omit=dev && npm run build
npm install -g pm2
pm2 start dist/index.js --name ashen-veil-server
pm2 save && pm2 startup
```
