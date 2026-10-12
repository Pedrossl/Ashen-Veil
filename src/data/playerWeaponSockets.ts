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
  // Caminhada e corrida (0–7) e pose parada desarmada (8). A espada fica no
  // punho de trás, fechado na cintura, com a lâmina baixa e para trás, como
  // quem carrega a arma andando ou correndo; o y acompanha o balanço do tronco.
  'player-walk-sheet': [
    { x: 176, y: 190.0, angle: 240, front: true },
    { x: 176, y: 186.6, angle: 240, front: true },
    { x: 176, y: 185.1, angle: 240, front: true },
    { x: 176, y: 189.2, angle: 240, front: true },
    { x: 176, y: 188.0, angle: 240, front: true },
    { x: 176, y: 184.6, angle: 240, front: true },
    { x: 176, y: 183.1, angle: 240, front: true },
    { x: 176, y: 187.2, angle: 240, front: true },
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
