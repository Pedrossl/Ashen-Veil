# Novas alas da prisão — pacote visual

## Integração jogável — 9 de outubro

`prison-service-wing` (Alas Esquecidas), em `src/maps/prison/serviceWing.ts`, conecta duas portas do andar intermediário das Galerias Alagadas: x1380 → entrada `galleries`; x3360 → entrada `cistern`. Ambas permitem ida e volta com E. A ala tem 4200 px, três setores visuais, três passarelas a y180 e cinco escadas até o piso y562. O bloqueio central exige atravessar a passarela das oficinas; há retorno por escada em todos os patamares. Sem mensagens indicando rota.

Há seis inimigos, um baú na enfermaria (extremo esquerdo inferior, +1 carga de ampola) e uma lanterna na cisterna. Baú e checkpoint usam a persistência existente. O elevador, guincho e bomba são decoração estática. Atlas selecionados em `public/assets/prison/alas_servico`, gerados por `python3 scripts/prepare_service_wing.py`; esse script preserva os PNG originais, define recortes individuais no JSON e converte a textura para WebP. Teste direto: `/?sala=prison-service-wing&entrada=galleries`.

Validação: TypeScript sem erros; cinco WebPs decodificados e 26 recortes dentro dos limites das texturas; isolamento e cisterna inspecionados no navegador, sem erros de console; saída da cisterna para as Galerias acionada com E. Travessia completa, combate e descanso ainda precisam de teste de gameplay. Não foi gerada build.

Arte de origem gerada em 9 de outubro de 2026 com a ferramenta integrada image_gen. São 56 peças em cinco folhas PNG RGBA 1254×1254, com transparência confirmada. Ainda não estão carregadas no jogo. Prompts completos em `02_cenarios_e_tilesets/tilesets/prisao_alas_variadas/prompts.json`.

## Arquitetura: 48 peças

Pasta: `02_cenarios_e_tilesets/tilesets/prisao_alas_variadas/`. Ordem visual da esquerda para a direita, de cima para baixo, organização aproximada 4×4. Não usar divisão automática em células: alguns objetos ultrapassam o quadrante nominal. Preparar atlas por limites individuais do conteúdo.

| Folha | Linha 1 | Linha 2 | Linha 3 | Linha 4 |
|---|---|---|---|---|
| `tileset_prisao_isolamento_16_pecas.png` | Piso íntegro, rachado, reforçado e quebrado | Reboco, reboco descascado, janela gradeada e marcas de contagem | Porta fechada, aberta, pilar íntegro e quebrado | Ombreiras esquerda/direita, lintel e parede de transição |
| `tileset_prisao_oficinas_fornalhas_16_pecas.png` | Piso íntegro, queimado, gradeado e quebrado | Tijolo com fuligem, rachado, duto e transição | Fornalha fechada/aberta, coluna de ferro íntegra/quebrada | Ombreiras esquerda/direita, viga e ventilação gradeada |
| `tileset_prisao_cisterna_antiga_16_pecas.png` | Piso íntegro, mineralizado, drenado e quebrado | Parede íntegra, mineralizada, conduto fechado e transição | Comporta fechada/aberta, coluna íntegra/danificada | Ombreiras esquerda/direita, arco central e saída de cano |

## Objetos: oito peças

Pasta: `02_cenarios_e_tilesets/props/prisao_servicos/`. Organização visual 2×2, recorte individual necessário.

- `atlas_prisao_mobiliario_servicos_4_pecas.png`: maca de enfermaria, armário de chaves, bancada de oficina e caldeirão de cozinha.
- `atlas_prisao_mecanismos_4_pecas.png`: guincho de corrente, tanque com bomba, elevador de gaiola e carrinho de carvão. O guincho tem margem superior muito apertada; revisar antes de recortar/animar.

## Como as áreas podem se ligar

Proposta de expansão, não mudança já aplicada ao mapa:

- Corredor de celas → posto dos guardas → isolamento. O armário de chaves identifica o posto; reboco e portas individuais diferenciam o isolamento.
- Isolamento → enfermaria → corredor de serviço → cozinha. Usar a maca e o caldeirão como marcos visuais, mantendo o mesmo reboco gasto.
- Cozinha → depósito de carvão → oficinas/fornalhas. Introduzir fuligem aos poucos; o carrinho explica o transporte de combustível.
- Oficinas → elevador de carga → cisterna antiga → esgoto existente. O ferro enferrujado passa a bronze oxidado e depósitos minerais; só perto do esgoto entra o lodo verde.
- Uma passagem de manutenção da cisterna pode voltar ao Poço das Correntes e formar um atalho. Sem texto indicando a rota.

Variar largura dos corredores, altura das abóbadas e distribuição das colunas junto dos materiais. Alternar peças íntegras/danificadas; reservar as rachaduras maiores para pontos específicos. Evitar repetir o mesmo objeto grande em toda sala.

## Preparação futura para runtime

As folhas não constituem atlas pronto nem tiles com repetição perfeita validada. É necessário recortar cada peça, alinhar a superfície pisável, ajustar escala ao jogador e verificar juntas em uma sala de teste. A pequena face superior das plataformas deve seguir a perspectiva das plataformas existentes. Portas abertas/fechadas precisam do mesmo enquadramento antes de alternar estados. Não há animações nem interações implementadas para estes objetos.

Depois de selecionar as peças usadas, preparar atlas WebP em `public/assets` e registrar as chaves de carregamento. Os originais permanecem nestas pastas; não adicionar todas as folhas ao preload. Nenhuma build foi executada: esta entrega altera apenas arte de origem e documentação.
