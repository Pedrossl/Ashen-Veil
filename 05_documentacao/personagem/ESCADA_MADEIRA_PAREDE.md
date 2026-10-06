# Animação da escada de madeira na parede

Conjunto específico para escadas rígidas de madeira presas à parede. O jogador aparece de costas e com o corpo inteiro visível em todos os quadros.

Este conjunto é separado da animação lateral de escada de corda registrada em `ESCADA_DE_CORDA.md`.

## Sequência

1. `entrada_8_frames.png`: vira de costas, ergue as mãos, agarra os degraus e coloca as botas;
2. `subida_8_frames.png`: ciclo contínuo com mão esquerda e pé direito alternando com mão direita e pé esquerdo;
3. `saida_8_frames.png`: alcança o topo, passa uma perna, transfere o peso e termina em pé de costas.

Todas as folhas usam grade 4×2, com oito quadros de 443×443 e fundo transparente. A escada não faz parte do sprite do jogador.

## Camadas sugeridas

```text
parede
↓
escada de madeira
↓
personagem visto de costas
```

Durante a subida, alinhar as mãos com o centro dos degraus e manter o centro do jogador travado no centro da escada. A escala inicial deve produzir aproximadamente **150 px de altura visual**.

Os originais ficam em `01_sprites/personagem_jogador/escada_madeira_parede/`. As versões de runtime e o manifesto ficam em `public/assets/player/escada_madeira_parede/`.
