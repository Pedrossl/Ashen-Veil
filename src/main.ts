import Phaser from 'phaser';

import { gameConfig } from './core/gameConfig';
import './styles.css';

const game = new Phaser.Game(gameConfig);

// O aviso do index.html cobre o download do código; a partir daqui o
// PreloadScene mostra a barra de carregamento.
game.events.once(Phaser.Core.Events.READY, () => document.getElementById('boot-loading')?.remove());

// Tab abre o inventário: não deixa o navegador tirar o foco do jogo, mesmo em
// scenes sem tecla capturada (o Esc de sair da tela cheia o navegador não deixa
// bloquear).
window.addEventListener('keydown', (event) => {
  // Nos campos dos modais de sala, o Tab continua pulando de campo.
  if (event.key === 'Tab' && !(event.target instanceof HTMLInputElement)) {
    event.preventDefault();
  }
});

// Só em desenvolvimento: permite inspecionar e testar o jogo pelo console.
if (import.meta.env.DEV) {
  window.ashenVeil = game;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
}
