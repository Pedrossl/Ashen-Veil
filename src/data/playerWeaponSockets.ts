// Encaixe da arma na mão do jogador, quadro a quadro (coordenadas do quadro
// de 420x340, com a mão na empunhadura e o ângulo da lâmina em graus; 0 = para cima).
// `front` indica se a arma passa na frente do corpo ou atrás (mão de trás).
// Quadros ausentes ou `null` escondem a arma (rolamento, coleta, soco).
export type WeaponSocketFrame = {
  x: number;
  y: number;
  angle: number;
  front: boolean;
};

export const PLAYER_WEAPON_SOCKETS: Record<string, ReadonlyArray<WeaponSocketFrame | null>> = {
  // Caminhada (0–7) e pose parada desarmada (8): espada pendendo da mão da
  // frente. O y acompanha o balanço do tronco de cada quadro do ciclo.
  'player-walk-sheet': [
    { x: 318, y: 152.8, angle: 158, front: true },
    { x: 318, y: 149.4, angle: 158, front: true },
    { x: 318, y: 147.9, angle: 158, front: true },
    { x: 318, y: 152.0, angle: 158, front: true },
    { x: 318, y: 150.8, angle: 158, front: true },
    { x: 318, y: 147.4, angle: 158, front: true },
    { x: 318, y: 145.9, angle: 158, front: true },
    { x: 318, y: 150.0, angle: 158, front: true },
    { x: 318, y: 145.0, angle: 158, front: true },
  ],
  // Golpe de espada: guarda, preparação, estocada e recuperação.
  'player-sword-attack-sheet': [
    { x: 232.1, y: 198.8, angle: 114.0, front: true },
    { x: 289.5, y: 63.2, angle: -65.4, front: true },
    { x: 350.6, y: 135.0, angle: 77.8, front: true },
    { x: 309.5, y: 207.9, angle: 131.7, front: true },
  ],
};

// Ponto da imagem da arma (0–1, de cima para baixo) que fica na mão.
export const WEAPON_GRIP_ORIGIN_Y = 0.78;
// Comprimento da lâmina em pixels do quadro do jogador.
export const WEAPON_BLADE_LENGTH = 140;
