# Kit modular — Esgoto da prisão

Conjunto modular para montar túneis, canais, salas de bombeamento e setores contaminados abaixo da prisão. O verde aparece no lodo, limo, fungos e reflexos da água, mantendo a pedra carvão, o violeta e a iluminação laranja do restante do jogo.

## Folhas

- `tileset_esgoto_arquitetura_16_tiles.png`: estrutura principal;
- `tileset_esgoto_canais_lodo_16_tiles.png`: água contaminada e travessias;
- `tileset_esgoto_tubulacoes_comportas_16_tiles.png`: mecanismos e rotas bloqueadas;
- `tileset_esgoto_props_perigos_16_tiles.png`: decoração, perigos e narrativa ambiental.
- `tileset_esgoto_vegetacao_16_tiles.png`: trepadeiras, raízes, musgo, samambaias e fungos para substituir a vegetação provisória desenhada por código.

Cada folha usa grade 4×4, com células de 361×271 e fundo transparente.

## Água e profundidade

- `animacoes/sprite_sheet_cachoeira_6_frames.png`: loop de queda d'água, 8 FPS;
- `animacoes/sprite_sheet_agua_rasa_6_frames.png`: superfície horizontal repetível, 6 FPS;
- `animacoes/sprite_sheet_espirro_6_frames.png`: efeito único de entrada ou passo forte, 12 FPS;
- `portao_boss_esgoto_fechado_aberto.png`: portão monumental em dois estados de 887×887;
- `fundos/fundo_tunel_distante.png`: fundo panorâmico para parallax de baixa velocidade.

As grades completas estão em `manifesto_animacoes_esgoto.json`. Na composição, o fundo distante deve ter contraste e velocidade menores que a camada jogável. A superfície rasa pode ser repetida horizontalmente; o espirro deve ser destruído ao terminar o sexto quadro.

## Ideias de salas

### Galeria de drenagem

Corredor longo com canal central, passarelas estreitas nas laterais, tubos rompidos e uma comporta fechada ao fundo.

### Câmara da comporta

Sala vertical com corrente e contrapeso. O jogador gira a manivela para baixar o nível do lodo e revelar uma passagem inferior.

### Reservatório contaminado

Grande poça verde, pedras emergentes e ponte quebrada. Fungos e bolsas de gás marcam as áreas perigosas.

### Oficina abandonada

Bomba manual, reservatório corroído, bancada, carrinho quebrado e caixotes. Pode esconder uma chave, ferramenta ou atalho.

### Ninho dos ratos

Palha, ossos, barris vazando e buracos baixos. Área adequada para grupos do Rato do Grilhão.

## Composição visual

Use arquitetura e canais como camada jogável, tubulações atrás do personagem, props distribuídos perto das paredes e correntes, jaulas ou barricadas no primeiro plano. O verde deve se concentrar próximo da água; áreas secas continuam roxas e quase pretas.

Os originais ficam em `02_cenarios_e_tilesets/tilesets/esgoto_prisao/`. As cópias para runtime ficam em `public/assets/prison/esgoto/`.
