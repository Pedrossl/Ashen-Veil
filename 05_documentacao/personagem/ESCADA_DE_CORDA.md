# Animação da escada de corda

O conjunto cobre a subida completa do jogador numa escada de corda e mantém a escada como elemento separado do personagem.

## Sequência

1. `entrada_8_frames.png`: levanta as mãos, agarra os degraus e coloca o primeiro pé;
2. `subida_8_frames.png`: ciclo contínuo com mãos e pernas alternadas;
3. `saida_8_frames.png`: passa os ombros pelo topo, apoia a mão e o joelho, sobe a segunda perna e termina em pé.

Cada folha usa uma grade 4×2 com oito quadros de 443×443. O personagem deve ser escalado para aproximadamente **150 px de altura visual** no jogo.

## Regras de implementação

- alinhar o centro do personagem ao centro da escada antes da entrada;
- esconder a arma durante toda a escalada;
- bloquear movimento horizontal enquanto a animação de entrada estiver tocando;
- iniciar o deslocamento vertical somente ao entrar no ciclo `subida`;
- pausar o ciclo no quadro atual quando não houver comando vertical;
- ao alcançar o topo, travar a posição vertical e tocar `saidaTopo` uma vez;
- liberar gravidade, colisão e movimento somente depois do último quadro da saída;
- manter a escada renderizada atrás do corpo e à frente da capa somente se a cena usar duas camadas para as cordas.

Os originais ficam em `01_sprites/personagem_jogador/escada_corda/`. As versões de runtime e o manifesto ficam em `public/assets/player/escada_corda/`.
