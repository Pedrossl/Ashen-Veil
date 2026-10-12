# Idle natural do jogador

Ciclo de oito quadros para o jogador parado e desarmado. O movimento é discreto para não deixar o personagem inquieto durante exploração e diálogos.

## Movimento

- respiração suave no peito e nos ombros;
- pequena transferência de peso;
- ajuste discreto da mão junto ao cinto;
- reação leve do cabelo e das pontas da capa;
- os dois pés permanecem plantados.

## Integração

- tocar em loop a 6 FPS quando o jogador estiver parado e livre;
- manter a origem nos pés;
- espelhar horizontalmente quando estiver voltado para a esquerda;
- usar aproximadamente 150 px de altura visual;
- manter a arma como sprite separado quando for criada uma variante armada.

O original está em `01_sprites/personagem_jogador/idle_natural/`. A versão de runtime e o manifesto ficam em `public/assets/player/idle_natural/`.
