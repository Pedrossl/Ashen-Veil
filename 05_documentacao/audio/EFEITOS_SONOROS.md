# Efeitos sonoros — primeiro pacote

13 sons originais de síntese procedural, secos e curtos para a prisão. Não usam samples externos, vozes ou música. Geração reproduzível: `python3 scripts/generate_sfx.py` (somente biblioteca padrão). Arquivos em `public/assets/audio/sfx/`, WAV PCM mono, 44,1 kHz, 16 bits, com manifesto. O gerador sobrescreve apenas seus 13 arquivos conhecidos.

## Integração

- Pedra/água: dois contatos por ciclo de caminhada; não tocam parado, em queda ou escalando. A água usa a zona de lentidão já existente.
- Soco/lâmina: começo dos quadros ativos do ataque do jogador.
- Impacto/crítico: acerto confirmado pelo `CombatSystem`, inclusive golpes inimigos.
- Esquiva: início do rolamento.
- Cura: instante em que a ampola recupera vida.
- Coleta: entrada de um item no inventário.
- Baú/portão: abertura real; não tocam em objetos já abertos.
- Morte: início da animação fatal.
- Descanso: chegada à sala recriada com o jogador sentado.

`src/data/audio.ts` centraliza caminhos, volumes, intervalos mínimos e variação de tom. Volume mestre dos efeitos: `SFX_VOLUME` (0,55); no máximo oito vozes. `SoundEffects.ts` libera cada voz ao terminar e encerra as restantes ao pausar ou sair da scene. O Phaser libera áudio na primeira interação; sons anteriores não são enfileirados. Não altera regras de combate.

Prévia: `previa_efeitos_sonoros.wav`, nesta pasta. Ordem: baú, coleta, cura, descanso, esquiva, impacto, crítico, lâmina, morte, água, pedra, portão e soco. Volume da prévia é uniforme; a mixagem no jogo usa volumes individuais menores. É uma primeira proposta para avaliar no gameplay e depois refinar o timbre.

Na primeira etapa ainda não havia ambiência ou sons próprios dos bosses; ambos foram adicionados abaixo. Música, vozes gravadas e menu de áudio continuam pendentes.

## Inimigos comuns — 14 efeitos adicionais

Gerador: `python3 scripts/generate_enemy_sfx.py`. O projeto soma 27 WAVs. Mapeamento por família em `src/data/enemyAudio.ts`.

- Prisioneiro: alerta áspero com metal, varredura da corrente, esmagamento grave e queda com elos.
- Carcereiro: alerta grave, gancho metálico e queda pesada.
- Rato: chiado breve, mordida seca e morte curta, com volume menor e intervalo entre alertas para grupos.
- Suplicante: alerta borbulhante, arremesso úmido e morte; o projétil tem respingo próprio ao acertar o chão ou jogador, sem som ao expirar por tempo.

Alertas tocam ao entrar em `alert`; ataques, na transição para a fase ativa; mortes, ao entrar em `dead`. Dano continua usando o impacto comum, evitando empilhar duas reações por acerto. Nenhum loop de idle ou passos de enxame foi adicionado.

Sons com posição usam o centro da câmera como ouvinte: volume cheio até 200 unidades e silêncio a partir de 1000, com panorama estéreo limitado a ±0,7. Valores em `SFX_DISTANCE`. Isso também se aplica ao impacto comum do combate. Intervalos são compartilhados por efeito na scene, limitando grupos simultâneos.

Prévia: `previa_inimigos.wav`. Ordem alfabética dos arquivos: carcereiro (alerta, gancho, morte), respingo de lodo, prisioneiro (alerta, corrente, esmagamento, morte), rato (alerta, mordida, morte), suplicante (alerta, arremesso, morte).

Validação adicional: 14 novos sons carregados e reproduzidos no Phaser; alerta de uma instância de inimigo confirmado; fonte a 5000 unidades silenciosa e nenhuma voz restante após reiniciar a sala. TypeScript aprovado. Mixagem subjetiva ainda deve ser avaliada no gameplay.

Validação: TypeScript e `git diff --check` aprovados. Os 13 arquivos foram conferidos quanto a formato e ausência de clipping; no navegador, todos carregaram e iniciaram reprodução pelo Phaser, sem vozes restantes depois do término ou reinício da sala. Ajuste subjetivo de timbre e volume deve continuar com o teste do usuário no gameplay. Nenhum build foi executado.

## Bosses e ambiente — 7 de outubro

Mais 14 efeitos, totalizando 41 efeitos curtos, e dois loops de ambiente (43 WAVs). Gerador: `python3 scripts/generate_boss_ambience.py`. Manifesto completo em `public/assets/audio/manifesto.json`.

- Ceifador: despertar, foice, arremesso normal/giratório, desaparecimento/reaparição, segunda fase e morte. Ataques normais soam na fase ativa; a foice giratória, ao ser lançada.
- Raiz: mordida, varredura, estacas, enterrar/arrastar, emergir/despertar, cuspe, progressão de fase e morte. Mordida, varredura e estacas soam uma vez por ataque ao alcançar os quadros ativos; cuspe, quando dispara. Projétil mantém o respingo comum de lodo.
- Prisão e ossuário: vento grave e discreto.
- Galerias, esgoto e arena da Raiz: água corrente, vento e gotas esparsas.

Loops de 12 segundos com sobreposição nas extremidades. `src/data/ambience.ts` mapeia cada sala e centraliza os volumes. `src/systems/Ambience.ts` mantém uma única voz ambiental por sala, espera o desbloqueio de áudio, entra gradualmente, pausa/retoma junto da scene e destrói som e listeners na saída. Durante o boss, o volume ambiental cai suavemente a 45%; volta após a vitória. Ambiência não usa as oito vozes reservadas aos efeitos. Não há música, fogo localizado nem correntes ambientais nesta etapa.

Prévia dos bosses: `previa_bosses.wav`, ordem alfabética dos arquivos (`ceifador_*`, depois `raiz_*`). A mixagem final ainda depende da escuta no gameplay. Validação no navegador: 14 efeitos reproduzidos, loops de prisão e água, redução no combate, pausa/retomada e troca de sala sem duplicar vozes. TypeScript e verificação de WAV sem clipping aprovados, sem build. Sincronismo de cada golpe deve ser refinado após jogar as duas lutas completas.

## Interface, movimento e portas — 9 efeitos adicionais

Total: 50 efeitos curtos e dois loops (52 WAVs). Gerador `scripts/generate_interface_movement_sfx.py`; prévia `previa_interface_movimento.wav` nesta pasta, em ordem alfabética dos arquivos.

- Navegação e confirmação no menu inicial; navegação no inventário só quando a seleção muda.
- Abrir/fechar inventário; fechamento toca na scene retomada para não ser cortado pelo encerramento da janela.
- Equipar uma arma diferente pelo inventário ou por Q.
- Contatos na escada de madeira, sincronizados aos quadros 1/5 do ciclo; parado na escada fica silencioso.
- Aterrissagem em pedra ou água: transição de queda com velocidade vertical superior a 180 para contato com o chão. Água usa a zona de lentidão existente. Não simula pulo novo nem muda a física.
- Tentativa de abrir porta trancada ou o portão da cela sem chave.

Não foram adicionados sons de passagem genéricos: atravessar um arco aberto não deve soar como abrir uma porta. Fogo/correntes localizados, mecanismo do portão de arena e música continuam pendentes.

Validação: nove arquivos reproduzidos no Phaser; abertura/fechamento do inventário com sons, pausa/retomada do ambiente e limpeza dos efeitos confirmados no navegador. TypeScript aprovado; WAVs conferidos sem clipping; sem build. Aterrissagens e escadas ainda precisam de avaliação de sincronismo durante gameplay.

## Trilhas e finalização do ambiente — 8 de outubro

O pacote soma **60 WAVs: 53 efeitos curtos, quatro loops ambientais e três trilhas**. Arquivos listados em `public/assets/audio/manifesto.json`. Gerador adicional: `python3 scripts/generate_soundscape.py`, sem dependências externas. As músicas são composições instrumentais simples de síntese, sem samples, gravações ou melodias de referência.

- Exploração: notas espaçadas e camadas graves (28,8 s).
- Ceifador: pulsação e timbres ressonantes (19,2 s).
- Raiz: registro mais grave e intervalos tensos (22,4 s).
- Fogo localizado: tochas que usam `addTorchGlow`, fogo do ossuário e lanternas de checkpoint acesas.
- Correntes localizadas: gaiolas do corredor e do Poço das Correntes.
- Portão da Raiz: fechamento no início do encontro e abertura após a vitória, nos mesmos callbacks do estado visual. Respeitam distância; podem não ser audíveis se o jogador estiver longe, inclusive no fosso.
- Vitória de boss: breve resolução sonora ao receber `boss:defeated`.

Configuração em `src/data/soundscape.ts`; execução em `src/systems/Soundscape.ts`. Fontes locais são registradas durante a construção da sala com `addAmbientSource`. Cada tipo usa uma única voz compartilhada, escolhendo a fonte habilitada mais próxima do centro da câmera, com atenuação até 650 unidades e panorama estéreo. Lanternas apagadas não emitem fogo. Música de exploração e boss fazem transição de volume; a música esvanece na morte. Todos os sons contínuos pausam com a scene e são destruídos ao sair. Não há música no menu inicial nesta versão.

Em 8 de outubro, os loops amplos de vento e água foram retirados da reprodução porque o ruído sintetizado soava como chiado/chuva constante. Os arquivos continuam preservados em `public/assets/audio/ambience/`, mas não são iniciados pelas salas. Fogo e correntes localizados continuam ativos.

Prévia `previa_trilhas.wav`: oito segundos de exploração, Ceifador e Raiz, nessa ordem. As versões completas estão em `public/assets/audio/music/`. O volume da prévia é maior que a mixagem de fundo usada no jogo.

Validação no navegador: carregamento das três músicas e dos dois novos ambientes; reprodução/transição exploração→Raiz; Ceifador e retorno à exploração após vitória; fogo/correntes; efeitos do portão/vitória; pausa/retomada; substituição das vozes ao trocar de sala. TypeScript e `git diff --check` aprovados, arquivos PCM sem clipping. Sem build ou commit. A avaliação musical e o equilíbrio final em combates completos continuam dependendo da escuta do usuário.
