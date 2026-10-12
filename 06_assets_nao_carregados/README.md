# Assets fora da build

Arquivos que estavam em `public/assets` mas o jogo não carrega: sheets originais
separadas por animação, manifestos, retratos de diálogo, escadas de corda e de
madeira (entrada e saída), dano do jogador e o tileset original da masmorra.

A estrutura de pastas é a mesma de `public/assets`. Para usar um deles no jogo,
prepare a versão de runtime em `public/assets` (WebP, ver
`scripts/optimize_runtime_images.py`) e aponte o código para ela.
