# Rato do Grilhão

## Função

Inimigo pequeno de enxame das celas e corredores baixos da prisão. É frágil e simples de interromper, mas força o jogador a controlar o chão quando aparece em grupo.

Use inicialmente grupos de **2 a 4 ratos**. Acima disso, reduza a frequência dos ataques para manter a leitura do combate.

## Identidade visual

- rato preto-acinzentado, magro e com partes da pele arroxeada expostas;
- coleira larga de ferro oxidado;
- corrente curta quebrada arrastando no chão;
- olhos violetas discretos;
- silhueta baixa, próxima do chão e bem menor que o jogador.

A referência oficial está em `01_sprites/inimigos/rato_do_grilhao/referencia_rato_do_grilhao.png`.

## Comportamento inicial

```text
fareja parado
↓
percebe o jogador a curta distância
↓
corre rente ao chão
↓
prepara o salto
↓
morde
↓
recua por alguns instantes
```

- vida baixa: deve morrer com um ou dois golpes comuns;
- velocidade alta em trajetos curtos;
- alcance curto;
- pouco dano por unidade;
- reação ao dano forte, permitindo separar o grupo;
- fraqueza sugerida: ataques largos e fogo.

## Ataque — salto de mordida

- quadros 0–3: preparação; o corpo baixa e revela o ataque;
- quadros 4–6: salto e janela ativa da mordida;
- quadros 7–11: aterrissagem e recuperação;
- não corrigir a direção depois que o salto começar;
- aplicar um pequeno intervalo individual após o ataque.

Para grupos, sorteie um atraso de **100 a 350 ms** antes da perseguição e deixe no máximo **dois ratos atacarem ao mesmo tempo**. Isso evita que todas as animações e colisões ocorram sincronizadas.

## Pacote de animações

| Ação | Grade | Célula | Quadros | Velocidade sugerida |
|---|---:|---:|---:|---:|
| Idle/farejar | 4×2 | 443×443 | 8 | 6 FPS |
| Corrida | 4×2 | 443×443 | 8 | 12 FPS |
| Salto de mordida | 4×3 | 362×362 | 12 | 14 FPS |
| Dano | 2×2 | 886×443 | 4 | 12 FPS |
| Morte | 4×2 | 443×443 | 8 | 10 FPS |

As versões prontas para o Phaser e o manifesto estão em `public/assets/enemies/rato_do_grilhao/`.
