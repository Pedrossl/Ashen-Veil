import Phaser from 'phaser';

const CRITICAL_COLOR = 0xffd27a;

// Feedback de golpe crítico: faíscas douradas no ponto do impacto e o texto
// "CRÍTICO" com o dano subindo acima do alvo.
export function showCriticalHit(scene: Phaser.Scene, x: number, topY: number, damage: number): void {
  const impactY = topY + 40;

  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.3;
    const length = Phaser.Math.Between(18, 34);
    const spark = scene.add
      .rectangle(x, impactY, length, 2.5, CRITICAL_COLOR, 1)
      .setRotation(angle)
      .setDepth(13)
      .setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: spark,
      x: x + Math.cos(angle) * Phaser.Math.Between(40, 70),
      y: impactY + Math.sin(angle) * Phaser.Math.Between(40, 70),
      scaleX: 0.2,
      alpha: 0,
      duration: Phaser.Math.Between(260, 420),
      ease: 'Quad.Out',
      onComplete: () => spark.destroy(),
    });
  }

  const flash = scene.add
    .circle(x, impactY, 26, CRITICAL_COLOR, 0.6)
    .setDepth(13)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: flash,
    scale: 2.6,
    alpha: 0,
    duration: 260,
    ease: 'Quad.Out',
    onComplete: () => flash.destroy(),
  });

  const label = scene.add
    .text(x, topY - 8, `CRÍTICO ${damage}`, {
      color: '#ffd27a',
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      fontStyle: 'bold',
      stroke: '#2a1404',
      strokeThickness: 4,
    })
    .setOrigin(0.5, 1)
    .setDepth(30)
    .setScale(1.6);

  scene.tweens.chain({
    targets: label,
    tweens: [
      { scale: 1, duration: 160, ease: 'Back.Out' },
      { y: topY - 40, alpha: 0, duration: 650, delay: 350, ease: 'Quad.In' },
    ],
    onComplete: () => label.destroy(),
  });
}
