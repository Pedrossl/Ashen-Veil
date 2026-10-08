# Sumidouro dos Condenados

## Integração em 7 de outubro de 2026

A sala está registrada como `prison-root-arena`. No fim do esgoto, o portão aberto oferece **Entrar no sumidouro**. O portão da esquerda da arena oferece **Voltar aos esgotos**, retornando à nova entrada `root-arena`, próxima ao portão e voltada para a esquerda. Acesso direto em dev: `?sala=prison-root-arena&entrada=sewers`.

Os nomes dos frames foram conferidos nos atlas. A sala foi aberta no navegador pelo servidor Vite: personagem, piso, portão, vegetação, cachoeira, fundo e canal renderizam. A travessia de ida e volta ainda requer teste manual. A checagem TypeScript foi iniciada, mas não retornou resultado durante a validação. A sala não instancia o boss nem bloqueia a saída. Os passos 2 a 5 abaixo foram concluídos; o registro do bloqueio anterior fica como histórico.

Composição salva em `src/maps/prison/rootArena.ts`, função `createRootArena`.
Reservatório de 3000 px, piso contínuo sem penalidade de movimento, canal animado abaixo do piso, fundo com parallax, arcos, raízes, esqueletos, cachoeiras, névoa baixa e portão de retorno aberto. O centro fica livre para os ataques do futuro boss. A arena não instancia o boss.

## Bloqueio em 7 de outubro de 2026

O volume de dados reportou 100% de uso e aproximadamente 334 MiB livres. Arquivos existentes (`rooms.ts`, `types.ts`, `sewers.ts`, `package.json` e o índice do Git) começaram a retornar `Operation timed out` ou `Operation canceled`. O arquivo novo foi salvo e relido, mas não foi possível registrar, executar ou inspecionar visualmente a sala. Não sobrescrever arquivos existentes com cópias antigas da conversa.

## Para concluir após recuperar o acesso aos arquivos

1. Ler novamente os arquivos atuais e conferir alterações de outras frentes.
2. Adicionar `prison-root-arena` a `RoomId` em `src/maps/types.ts`.
3. Importar `createRootArena` e registrar a sala em `src/maps/prison/rooms.ts`.
4. Em `sewers.ts`, substituir o portão examinável por sua imagem aberta e uma passagem por interação para `prison-root-arena`, entrada `sewers`.
5. Adicionar a entrada `root-arena` perto do portão do esgoto e usá-la no retorno da arena (atualmente retorna à entrada existente `bonfire`).
6. Confirmar os nomes dos frames nos atlas, validar TypeScript sem build e abrir `?sala=prison-root-arena&entrada=sewers` no servidor dev para conferir escala, alinhamento do piso, camadas e retorno.
7. Atualizar `AGENTS.md` com o estado real após a integração.

O usuário pediu a arena visual; a IA e o combate da Raiz dos Condenados são uma etapa separada. Não fechar o portão prendendo o jogador enquanto não houver combate e condição de saída implementados.

## Revisão visual em 7 de outubro de 2026

A arena foi refeita para parecer um reservatório monumental, mantendo o piso contínuo e o centro livre:

- teto em abóbada bem mais alto (`CEILING_Y = -560`) e câmera com zoom 0.8;
- três camadas de fundo: panorama do túnel (parallax 0.3), arcos gigantes (parallax 0.65) e parede próxima com canos, válvulas, tanque e quatro cachoeiras animadas;
- reservatório ao fundo com poças, rochas e água rasa;
- ninho da Raiz no fundo do centro: monte de raízes, ninho, ossos e bolhas de lodo com brilho verde pulsando, onde o boss deve emergir;
- paredes de raízes nas duas pontas e raízes maiores descendo do teto perto do centro;
- feixes de luz pelas fendas do teto, esporos verdes subindo do ninho, névoa baixa e raízes escuras em primeiro plano com parallax 1.25.

A luta foi ligada em seguida: o boss emerge do ninho ao passar de x 800, o portão fecha durante o combate e reabre quando ele morre.

## Fosso Afogado (barra de raízes)

- Estacas do Cárcere e a erupção da travessia enchem a barra verde "RAÍZES" do jogador (35 por acerto, máximo 100; esvazia 6/s depois de 5 s sem novo acerto).
- Cheia (uma vez por luta), raízes agarram o jogador, ele afunda (saída da escada de corda tocada ao contrário) e a tela fica verde.
- Ele sai no **Fosso Afogado**, embaixo da arena (piso a `FLOOR_Y + 1150`, x 340–2660): água em todo o piso, cachoeiras, teto de raízes, névoa verde.
- A Raiz emerge curada (420), com o corpo verde e um brilho aditivo pulsando; mais rápida e recebendo 1,6x de dano.
- Balanceamento: a barra só pode encher na fase 2 (≤65%, 273 de vida), e no fosso a vida efetiva é ≈262. Deixar-se arrastar cedo empata; tarde, perde tudo o que já tirou dela, além de lutar na água contra uma Raiz mais rápida, sem recarga de ampolas. Cada acerto que enche a barra também tira 26 de vida (3 acertos = 78 de 100).
- Vencida no fosso, as raízes devolvem o jogador ao centro da arena e o portão abre. Morrendo, a sala recomeça normalmente.

## Recompensas

- Vencida na arena (sem ser arrastado): +1 carga permanente da Ampola da Brasa Velada.
- Vencida no Fosso Afogado: +2 cargas permanentes e o **Anel do Fôlego Velado** (stamina regenera 40% mais rápido; vale enquanto estiver no inventário).
- A recompensa é entregue no momento da morte (sair da sala logo depois não a perde) e aparece na tela depois do "GRANDE INIMIGO ABATIDO".
