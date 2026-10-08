import type Phaser from 'phaser';

import type { MeleeEnemy } from '../entities/enemies/MeleeEnemy';

// Só se considera o mesmo grupo quem pisa na mesma altura.
const FLOOR_TOLERANCE = 30;
// Vão mínimo entre dois inimigos, como fração da soma das larguras.
const GAP_RATIO = 0.4;
// Fração da sobreposição desfeita por quadro (empurrão suave, último recurso).
const PUSH_STRENGTH = 0.08;
// Distância (em múltiplos do vão mínimo) em que um já desvia do outro.
const LOOKAHEAD = 1.4;

// Inimigos não se atravessam: avisa cada um de quem está colado de cada lado
// (para ele desviar ou esperar a vez) e, se ainda assim encostarem, afasta-os.
export function separateEnemies(enemies: readonly MeleeEnemy[]): void {
  const alive = enemies.filter((enemy) => enemy.isAlive);
  const crowding = alive.map(() => ({ left: false, right: false }));

  for (let i = 0; i < alive.length; i += 1) {
    for (let j = i + 1; j < alive.length; j += 1) {
      const a = alive[i];
      const b = alive[j];

      if (Math.abs(a.y - b.y) > FLOOR_TOLERANCE) {
        continue;
      }

      const minGap = (a.bodyWidth + b.bodyWidth) * GAP_RATIO;
      const dx = b.x - a.x;

      if (Math.abs(dx) < minGap * LOOKAHEAD) {
        const aIsLeft = dx >= 0;
        crowding[i][aIsLeft ? 'right' : 'left'] = true;
        crowding[j][aIsLeft ? 'left' : 'right'] = true;
      }

      const overlap = minGap - Math.abs(dx);

      if (overlap <= 0) {
        continue;
      }

      const push = overlap * PUSH_STRENGTH * (dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx));
      (a.body as Phaser.Physics.Arcade.Body).x -= push;
      (b.body as Phaser.Physics.Arcade.Body).x += push;
    }
  }

  alive.forEach((enemy, index) => enemy.setCrowding(crowding[index].left, crowding[index].right));
}
