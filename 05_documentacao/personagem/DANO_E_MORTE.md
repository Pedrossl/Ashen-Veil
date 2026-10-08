# Dano e morte do jogador

Pacote corporal sem arma para comunicar impacto e morte com animações próprias.

## Dano

Quatro quadros: contração no impacto, recuo do tronco, recuperação do apoio e retorno quase completo à idle. Não há sangue nem efeito desenhado, pois flash, impacto e empurrão continuam sob controle do código.

Velocidade inicial sugerida: **12 FPS**.

## Morte

Oito quadros: impacto fatal, perda de equilíbrio, queda de joelhos, apoio da mão, desabamento lateral e corpo imóvel no chão.

- tocar uma única vez, com duração própria por quadro para dar peso à queda;
- esconder a arma antes do primeiro quadro;
- travar ataques, esquiva e interação;
- manter o quadro de índice `7` durante a mensagem de morte;
- iniciar o escurecimento e renascimento somente depois de alcançar o último quadro.

Os originais ficam em `01_sprites/personagem_jogador/dano_e_morte/`. As versões de runtime e o manifesto ficam em `public/assets/player/dano_e_morte/`.

## Integração no jogo — 7 de outubro de 2026

A morte está ligada ao `Player`. A folha usada pelo jogo é `public/assets/player/sprite_sheet_jogador_morte.png`: oito quadros horizontais de 420×340, com escala uniforme e apoio alinhado à base. O script `scripts/prepare_player_death.py` prepara essa folha sem alterar os originais; usa limites de linha ajustados porque o desenho original ultrapassa a grade do manifesto.

Os tempos por quadro ficam em `PLAYER_ANIMATION.deathFrameDurations`. A animação cancela a ação atual, esconde a arma e mantém o último quadro. O evento local `player:death-animation-completed` libera a espera de 1500 ms, seguida do fade e do renascimento no checkpoint. A hitbox permanece igual à das outras animações.

A animação própria de dano ainda está pendente de integração.
