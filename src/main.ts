import Phaser from 'phaser';

import { gameConfig } from './core/gameConfig';
import './styles.css';

const game = new Phaser.Game(gameConfig);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
}
