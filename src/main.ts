import Phaser from 'phaser';

import { gameConfig } from './core/gameConfig';
import './styles.css';

const game = new Phaser.Game(gameConfig);

// Tab abre o inventário: não deixa o navegador tirar o foco do jogo, mesmo em
// scenes sem tecla capturada (o Esc de sair da tela cheia o navegador não deixa
// bloquear).
window.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
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
