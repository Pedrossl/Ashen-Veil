// Lanterna de checkpoint: 10 quadros de chama (5 colunas x 2 linhas de 320x400),
// realinhados pela base a partir de
// 01_sprites/objetos/checkpoints/sprite_sheet_lanterna_checkpoint_10_frames.png.
export const CHECKPOINT_LANTERN_SPRITE = {
  key: 'checkpoint-lantern',
  path: 'assets/checkpoints/sprite_sheet_lanterna_checkpoint.png',
  frameWidth: 320,
  frameHeight: 400,
  // Linha do pé da lanterna dentro do quadro.
  footY: 392,
  frameCount: 10,
  frameRate: 10,
  // Pouco mais baixa que o jogador.
  scale: 0.34,
} as const;
