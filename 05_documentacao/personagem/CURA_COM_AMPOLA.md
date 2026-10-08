# Cura com a Ampola da Brasa Velada

Animação corporal de oito quadros para consumir a Ampola da Brasa Velada. O frasco não está desenhado na folha: ele continua como sprite separado e deve acompanhar a mão direita.

## Sequência

1. mão direita vai à cintura;
2. pega a ampola;
3. ergue a ampola diante do peito;
4. leva a ampola à boca;
5. bebe e aplica a cura;
6. recupera o fôlego;
7. baixa a ampola;
8. guarda e volta à pose neutra.

## Integração

- esconder a arma equipada durante a ação;
- encaixar `assets/items/consumiveis/ampola_brasa_velada.png` na mão direita;
- aplicar a recuperação de vida ao entrar no quadro de índice `4`;
- manter o frasco na boca durante os quadros de índice `3`, `4` e `5`;
- restaurar a arma e o controle completo após o quadro final;
- usar aproximadamente 150 px de altura visual para casar com o jogador atual.

A folha foi desenhada com os pés plantados. Ao conectá-la ao comportamento atual, deve-se travar o deslocamento durante o gole ou produzir depois uma variante específica caminhando enquanto bebe.

O original fica em `01_sprites/personagem_jogador/cura_ampola/`. A versão pronta para runtime e seu manifesto ficam em `public/assets/player/cura_ampola/`.
