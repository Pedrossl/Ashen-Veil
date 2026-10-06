# Guia de pedidos de sprites — Ashen Veil

Como pedir sprites a um gerador de imagens (ChatGPT ou similar) para que eles encaixem no jogo com pouco retrabalho. Os geradores trabalham com telas fixas (geralmente **1024×1024**, **1536×1024** ou **1024×1536**), então não é preciso acertar o pixel exato: os sprites sempre são recortados, alinhados e escalados antes de entrar em `public/assets`. O que importa é **a altura do personagem dentro do quadro** e **a organização da grade**.

## Tamanhos por tipo

| O que | Tela | Grade | Tamanho do personagem/objeto |
|---|---|---|---|
| **Personagem** (andar, correr, pular, escada, ataques) | 1536×1024 | 4 colunas × 2 linhas (8 quadros de 384×512) | **~380 px de altura**, pés a ~20 px da base de cada célula |
| **Inimigo comum** (humanoide) | 1536×1024 | 4×2 (384×512) | ~360 px de altura |
| **Boss** | 1536×1024 | 3×2 (6 quadros de 512×512) | ~460 px de altura, com espaço para a arma |
| **Objeto animado** (lanterna, tocha, baú abrindo) | 1536×1024 | 4×2 ou 5×2 | objeto inteiro em cada célula, mesmo tamanho em todas |
| **Arma ou item** (mão e slot do HUD) | 1024×1536 | 1 por imagem | em pé, na vertical, centralizado, ~90% da altura |
| **Props de cenário** (estátua, altar, móveis) | 1024×1024 | até 4 por imagem (2×2) | um por célula, sem encostar |
| **Tiles de parede e chão** | 1024×1024 | 4×4 (256×256) | bordas que se encaixam (seamless) |
| **Efeitos** (fumaça, projétil, magia) | 1024×1024 | 4×2 | separados do personagem |

No jogo o personagem aparece com ~146 px de altura (escala 0.48 sobre quadros de 420×340), então ~380 px na arte dá detalhe de sobra.

## Regras essenciais

1. **Fundo transparente de verdade.** Não pode ser fundo xadrez desenhado nem fundo de cor.
2. **Sem brilho pintado no fundo.** Halos de luz grudam no recorte (aconteceu com tochas e fogueira do atlas medieval). A luz é feita por código.
3. **Quadros separados, sem encostar.** Peça explicitamente "espaço vazio entre os quadros": capas e armas encostando no quadro vizinho complicam o recorte.
4. **Mesma escala e mesma linha do chão em todos os quadros.** Quadros deslocados fazem o objeto "dançar" na animação (a lanterna de checkpoint precisou ser realinhada).
5. **Vista lateral, virado para a direita.** O jogo espelha para a esquerda.
6. **Personagem centralizado na célula**, sem "andar para frente" dentro da imagem.
7. **Ataques do jogador sem a arma na mão** (mão fechada segurando o vazio). A arma é um sprite separado desenhado pelo `WeaponSocket`; assim qualquer arma nova reaproveita a mesma animação.
8. **Mesmo personagem da referência.** Anexe `01_sprites/personagem_jogador/personagem_cacador_gotico_referencia.png` e repita: óculos, barba curta, cabelo castanho-escuro puxado para trás, capa roxa, **só o braço esquerdo tatuado**.
9. **Coerência visual** com o resto do jogo: dark fantasy gótico, painterly/anime, alto contraste, preto, cinza e roxo, com luz quente de tocha (ver `AGENTS.md`, seção 9).

## Modelo de pedido (personagem)

> Sprite sheet do personagem da imagem de referência (mesma roupa, capa roxa, óculos, barba, cabelo puxado para trás, só o braço esquerdo tatuado), vista lateral virado para a direita, **[ação: ex. subindo escada de pedra]**. Imagem **1536×1024**, **grade de 4 colunas × 2 linhas = 8 quadros**, **fundo transparente**, **espaço vazio entre os quadros**, personagem com **cerca de 380 px de altura** e **pés na mesma linha** em todos os quadros, centralizado em cada célula, mesma escala e iluminação em todos. **Sem arma na mão** (mão fechada). Sem cenário, sem sombra no chão, sem brilho no fundo.

Para inimigos, bosses e objetos, use o mesmo modelo trocando a grade e o tamanho pela tabela acima.

## Pacote mínimo de um inimigo comum

Antes de gerar os sprites, registre nome, área, função no combate, silhueta, arma, velocidade, alcance, ataques, aviso de cada golpe, janela de acerto, recuperação e fraqueza. Um inimigo novo precisa oferecer uma leitura ou decisão diferente; mudar somente a aparência não é suficiente.

Cada ação deve ficar em um arquivo próprio. Isso evita grades enormes, facilita corrigir apenas uma animação e permite configurar velocidades diferentes no Phaser.

| Ação | Quadros recomendados | Observação |
|---|---:|---|
| Idle/respiração | 6–8 | Ciclo discreto e contínuo, sem deslocar os pés. |
| Caminhada | 6–8 | Passada completa, com contato, compressão, passagem e elevação. |
| Alerta | 3–4 | Opcional; serve para comunicar que o jogador foi percebido. |
| Cada ataque | 10–12 | Deve mostrar preparação, golpe ativo e recuperação. |
| Reação ao dano | 3–4 | Curta e legível; manter a direção do personagem. |
| Morte | 8–12 | A silhueta termina no chão e não volta à pose inicial. |

Para um ataque de 12 quadros, uma boa distribuição inicial é **4 de preparação**, **3 do golpe ativo** e **5 de recuperação**. O acerto não deve começar no primeiro quadro. A preparação precisa revelar a direção e o alcance; a recuperação cria a janela em que o jogador pode punir.

Todas as folhas do mesmo inimigo devem manter a mesma escala visual, linha dos pés, direção e iluminação. Armas longas podem exigir células maiores, mas isso deve ser registrado junto do asset. Não misture caminhada, ataque e morte na mesma folha.

### Nome dos arquivos

Use uma pasta por inimigo e inclua a ação e a quantidade de quadros:

```text
01_sprites/inimigos/<id_do_inimigo>/
  referencia_<id_do_inimigo>.png
  sprite_sheet_<id>_idle_8_frames.png
  sprite_sheet_<id>_caminhada_8_frames.png
  sprite_sheet_<id>_ataque_<nome>_12_frames.png
  sprite_sheet_<id>_dano_4_frames.png
  sprite_sheet_<id>_morte_8_frames.png
```

## Onde salvar

Coloque os arquivos originais em `01_sprites/...` (ou na pasta de origem correspondente), em `snake_case` com prefixo (`sprite_sheet_`, `arma_`, `item_` etc.). Nunca direto em `public/assets`: lá só entram as versões recortadas e alinhadas que o jogo carrega.

## Sprites que ainda faltam

Hoje são gerados por recorte ou código e ficariam melhores com arte própria:

- **Respiração parada do jogador** (idle): hoje gerada pelo recorte da caminhada.
- **Ciclo de caminhada completo** (6–8 quadros): o atual é montado por recorte a partir de um único quadro.
- **Descer escada de corda e subir/descer escada de pedra**: ainda reaproveitam a caminhada. A subida da escada de corda já possui entrada, ciclo e saída próprios em `01_sprites/personagem_jogador/escada_corda/`.
- **Pulo** (impulso, no ar, queda, aterrissagem).
- **Morte do jogador**: hoje reaproveita o agachamento da coleta.
- **Morte do boss**: hoje é só um efeito de fumaça.
