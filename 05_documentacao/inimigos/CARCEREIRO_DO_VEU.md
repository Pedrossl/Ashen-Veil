# Carcereiro do Véu

## Função

Inimigo comum pesado da prisão. Obriga o jogador a observar o aviso do golpe, esquivar para atravessar seu alcance e atacar durante a recuperação. É mais lento e resistente a interrupções que o Prisioneiro Acorrentado, mas não deve ter vida de miniboss.

## Identidade visual

- elmo estreito em forma de gaiola, com dois pontos violetas no interior;
- couro preto, placas de ferro corroídas e tecido roxo rasgado;
- molho de chaves na cintura;
- arma de carcereiro curta, com martelo de um lado e gancho do outro;
- silhueta alta, larga e encurvada, aproximadamente 10% maior que o jogador;
- vista lateral e direção padrão para a direita.

A referência oficial está em `01_sprites/inimigos/carcereiro_do_veu/referencia_carcereiro_do_veu.png`.

## Comportamento inicial

```text
idle
↓
patrulha lenta
↓
alerta ao perceber o jogador
↓
perseguição curta
↓
golpe do gancho
↓
recuperação longa
```

Ele não deve correr. Ao errar o ataque, permanece vulnerável tempo suficiente para um ou dois golpes rápidos do jogador.

## Ataque inicial — puxão do gancho

- preparação: recua a arma e baixa o centro do corpo;
- golpe ativo: avança o gancho horizontalmente;
- recuperação: puxa a arma de volta e recompõe a guarda;
- alcance: médio;
- dano: alto o bastante para ser respeitado, sem matar o jogador com um golpe;
- fraqueza: recuperação longa e ataque comprometido na direção escolhida.

Um segundo golpe vertical com o lado do martelo pode ser acrescentado depois que o primeiro estiver funcionando no jogo.

## Pacote de animações

| Arquivo | Grade | Célula | Quadros | Velocidade inicial sugerida |
|---|---:|---:|---:|---:|
| `sprite_sheet_carcereiro_do_veu_idle_8_frames.png` | 4×2 | 384×512 | 8 | 6 FPS |
| `sprite_sheet_carcereiro_do_veu_caminhada_8_frames.png` | 4×2 | 384×512 | 8 | 8 FPS |
| `sprite_sheet_carcereiro_do_veu_ataque_gancho_12_frames.png` | 4×3 | 384×341 | 12 | controlada pelas fases do golpe |
| `sprite_sheet_carcereiro_do_veu_dano_4_frames.png` | 2×2 | 768×512 | 4 | 10 FPS |
| `sprite_sheet_carcereiro_do_veu_morte_8_frames.png` | 4×2 | 443×443 | 8 | 8 FPS |

No ataque de 12 quadros, usar inicialmente os quadros 0–3 para preparação, 4–6 para a janela ativa e 7–11 para recuperação. Esses intervalos devem ser revistos depois do primeiro teste de combate.

As células têm tamanhos diferentes porque ataques, recuos e quedas precisam de larguras distintas. Ao trocar de animação, o código deve manter o ponto dos pés como origem e aplicar a escala visual definida para cada folha.
