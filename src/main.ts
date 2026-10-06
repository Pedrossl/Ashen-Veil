import Phaser from 'phaser';

import { gameConfig } from './core/gameConfig';
import './styles.css';

const game = new Phaser.Game(gameConfig);

// Só em desenvolvimento: permite inspecionar e testar o jogo pelo console.
if (import.meta.env.DEV) {
  window.ashenVeil = game;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
}
