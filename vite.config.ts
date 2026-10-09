import { defineConfig, type ProxyOptions } from 'vite';

// Servidor multiplayer (server/, porta 3001) atrás do mesmo endereço do jogo:
// `/colyseus/...` vai para ele, inclusive o WebSocket. Assim um único túnel
// (ngrok) ou domínio serve o jogo e as salas.
const colyseusProxy: Record<string, ProxyOptions> = {
  '/colyseus': {
    target: 'http://localhost:3001',
    ws: true,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/colyseus/, ''),
  },
};

export default defineConfig({
  server: {
    // Endereços do ngrok (e qualquer outro túnel) podem abrir o servidor de dev.
    allowedHosts: true,
    proxy: colyseusProxy,
  },
  preview: {
    allowedHosts: true,
    proxy: colyseusProxy,
  },
});
