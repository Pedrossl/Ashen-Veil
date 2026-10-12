import Phaser from 'phaser';

// Nome da área exibido na primeira visita, fixo na tela.
export function showAreaTitle(
  scene: Phaser.Scene,
  title: string,
  subtitle: string,
): void {
  const camera = scene.cameras.main;
  const zoom = camera.zoom;
  // Objetos com scrollFactor 0 ainda sofrem o zoom em torno do centro da
  // câmera; converte a posição desejada na tela e desfaz a escala.
  const toWorld = (screenX: number, screenY: number): [number, number] => [
    camera.width / 2 + (screenX - camera.width / 2) / zoom,
    camera.height / 2 + (screenY - camera.height / 2) / zoom,
  ];

  const [x, y] = toWorld(camera.width / 2, camera.height * 0.72);
  const container = scene.add
    .container(x, y, [
      scene.add.rectangle(0, 6, 520, 1, 0xb9a7e0, 0.45),
      scene.add
        .text(0, 0, title.toUpperCase(), {
          color: '#e6dcf5',
          fontFamily: 'Georgia, serif',
          fontSize: '30px',
          letterSpacing: 6,
          stroke: '#07050b',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 1),
      scene.add
        .text(0, 16, subtitle.toUpperCase(), {
          color: '#9a8db0',
          fontFamily: 'Georgia, serif',
          fontSize: '13px',
          letterSpacing: 4,
        })
        .setOrigin(0.5, 0),
    ])
    .setScrollFactor(0)
    .setScale(1 / zoom)
    .setDepth(40)
    .setAlpha(0);

  scene.tweens.chain({
    targets: container,
    tweens: [
      { alpha: 1, duration: 900, delay: 600, ease: 'Sine.Out' },
      { alpha: 0, duration: 1200, delay: 2200, ease: 'Sine.In' },
    ],
    onComplete: () => container.destroy(),
  });
}
