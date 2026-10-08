# Suplicante do Lodo

Prisioneiro curvado e encharcado que estende a mão como se pedisse socorro. A outra mão esconde um detrito de pedra, osso e lodo. Quando o jogador aceita a aproximação, ele abandona a encenação e arremessa o detrito.

## Função no combate

- inimigo frágil de média distância;
- cria pressão enquanto ratos ou outros inimigos ocupam o chão;
- engana pela silhueta passiva, mas sempre entrega o ataque com um aviso legível;
- fica vulnerável se o jogador atravessar a distância do arremesso.

## Comportamento sugerido

1. permanece suplicando até perceber o jogador;
2. manca para manter uma distância confortável;
3. fecha a mão estendida, busca um detrito na sacola e prepara o arremesso;
4. dispara no quadro 6 da animação de ataque;
5. demora para recuperar a postura e volta a suplicar;
6. tenta recuar quando o jogador chega muito perto.

O aviso do arremesso deve ser longo o bastante para uma esquiva consciente. Um acerto pode causar dano leve e pequeno recuo. Contaminação ou lentidão podem ser adicionadas depois, quando esses sistemas existirem; o primeiro uso precisa funcionar somente com dano e impacto.

## Leitura e balanceamento

- vida baixa e pouca resistência a interrupção;
- arremesso em arco moderado, evitando tiros instantâneos;
- recuperação longa depois do disparo;
- usar um ou dois por encontro;
- colocar atrás de inimigos de contato ou em uma passarela visível;
- evitar grupos grandes, pois a falsa súplica perde o efeito quando repetida.

## Pacote visual

| Animação | Quadros | Uso |
|---|---:|---|
| Suplicando | 8 | idle enganoso em loop |
| Caminhada manca | 8 | reposicionamento |
| Ataque de arremesso | 12 | preparação, disparo e recuperação |
| Dano | 4 | reação curta |
| Morte | 8 | queda com a sacola de detritos |
| Projétil | 6 | rotação de pedra, osso e lodo |

Os originais ficam em `01_sprites/inimigos/suplicante_do_lodo/`. As folhas preparadas para carregamento ficam em `public/assets/enemies/suplicante_do_lodo/`, acompanhadas por `manifesto.json`.
