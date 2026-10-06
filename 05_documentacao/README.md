# Ashen Veil

Projeto de um action RPG 2D soulslike, desenvolvido com Phaser 4, TypeScript e Vite.

As regras de continuidade para Codex, Gemini, Claude e outros assistentes estão no `AGENTS.md` da raiz. Todo assistente deve lê-lo antes de alterar o projeto.

## Estrutura atual

### Assets de produção

- `01_sprites/personagem_jogador`: referências e sprites do personagem jogável.
- `01_sprites/inimigos`: sprites dos inimigos comuns.
- `01_sprites/bosses`: sprites dos bosses.
- `02_cenarios_e_tilesets/cenarios`: conceitos e composições de cenário.
- `02_cenarios_e_tilesets/tilesets`: tilesets e atlas modulares.
- `03_itens_e_armas/armas`: artes das armas.
- `03_itens_e_armas/itens`: artes dos demais itens.
- `04_referencias_visuais/conceitos_gerados`: conceitos, moodboard e referências de estilo.

### Projeto do jogo

- `src/core`: inicialização, eventos e constantes globais.
- `src/scenes`: scenes do Phaser.
- `src/entities`: jogador, inimigos, bosses e armas.
- `src/components`: capacidades reutilizáveis das entidades.
- `src/systems`: regras de gameplay que coordenam entidades e componentes.
- `src/states`: estados e máquinas de estado.
- `src/ui`: HUD e menus.
- `src/data`: definições configuráveis de armas, inimigos, itens e áreas.
- `src/maps`: composição das áreas e salas; a primeira será a prisão.

### Documentação

- `05_documentacao/planejamento/PLANEJAMENTO_SOULSLIKE_2D.md`: planejamento geral e escopo da primeira vertical slice.

## Convenções

Use nomes de arquivos de assets em `snake_case`, com prefixos como `sprite_`, `sprite_sheet_`, `tileset_`, `cenario_`, `arma_` e `conceito_visual_`.

O código TypeScript seguirá os nomes de classes em `PascalCase` e os demais identificadores em `camelCase` quando o bootstrap do projeto for criado.
