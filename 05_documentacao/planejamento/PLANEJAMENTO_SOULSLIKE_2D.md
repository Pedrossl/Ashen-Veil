# Ashen Veil — Documento de Planejamento Inicial

## 1. Visão Geral

Quero desenvolver um jogo 2D de ação e exploração inspirado na sensação de progressão, atmosfera, descoberta e combate dos jogos da FromSoftware, principalmente:

- Dark Souls
- Dark Souls II
- Dark Souls III
- Bloodborne
- Elden Ring

A referência estrutural para o formato 2D é algo na linha de **Salt and Sanctuary**, mas a intenção não é copiar nenhum desses jogos. A ideia é criar uma identidade própria, usando essas obras apenas como referência de ritmo, atmosfera, estrutura de mundo, dificuldade, exploração e sensação de combate.

O jogo deve passar por diferentes regiões que, ao longo da campanha, evoquem épocas, ambientes e sensações que lembrem vários jogos Soulsborne.

O projeto será desenvolvido de forma **100% code-first**, usando principalmente IA como apoio de programação, planejamento, geração de assets e organização.

---

# 2. Tecnologia

## Engine / Framework

A intenção atual é usar:

- **Phaser 4**
- **TypeScript**
- **Vite**
- Git/GitHub para versionamento

O projeto será todo construído por código, sem depender de editor visual.

Isso é importante porque quero que todo o projeto seja facilmente compreendido, alterado e expandido usando assistência de IA.

## Princípios técnicos

O projeto deve nascer preparado para crescer.

Evitar:

- Scenes gigantes
- Player com centenas de responsabilidades
- Valores hardcoded espalhados pelo código
- Sistemas fortemente acoplados
- Armas e inimigos implementados individualmente de forma manual

Preferir:

- Sistemas independentes
- Componentes reutilizáveis
- Máquinas de estado
- Dados configuráveis
- Eventos
- Entidades desacopladas
- Configurações centralizadas
- Assets separados da lógica

---

# 3. Estrutura Inicial Sugerida

```txt
src/
  core/
    Game.ts
    EventBus.ts
    constants.ts

  scenes/
    BootScene.ts
    PreloadScene.ts
    PrisonScene.ts
    BossScene.ts

  entities/
    player/
      Player.ts
      PlayerStateMachine.ts
    enemies/
      Enemy.ts
      EnemyFactory.ts
    bosses/
      Boss.ts
    weapons/
      Weapon.ts
      WeaponFactory.ts

  components/
    Health.ts
    Stamina.ts
    Hitbox.ts
    Hurtbox.ts
    Movement.ts

  systems/
    CombatSystem.ts
    DamageSystem.ts
    StaminaSystem.ts
    InventorySystem.ts
    EquipmentSystem.ts
    CheckpointSystem.ts
    SaveSystem.ts
    LootSystem.ts

  states/
    player/
    enemies/
    bosses/

  ui/
    HUD.ts
    InventoryUI.ts
    PauseMenu.ts

  data/
    weapons.ts
    enemies.ts
    bosses.ts
    items.ts
    areas.ts

  maps/
    prison/
    ruins/
    cathedral/

  assets/
    player/
    enemies/
    bosses/
    weapons/
    items/
    tiles/
    backgrounds/
    ui/
    effects/
```

---

# 4. Direção do Jogo

## Gênero

- Action RPG
- Soulslike
- 2D side-scroller
- Exploração
- Combate baseado em stamina
- Progressão por equipamentos
- Bosses
- Áreas conectadas
- Checkpoints

O jogo deve ser difícil, mas legível.

A dificuldade deve vir de:

- padrões de inimigos;
- posicionamento;
- gerenciamento de stamina;
- timing;
- esquiva;
- conhecimento adquirido pelo jogador.

Evitar dificuldade artificial baseada apenas em inimigos com muita vida.

---

# 5. Estrutura do Mundo

Quero que a campanha atravesse várias regiões diferentes.

Cada área poderá lembrar visualmente ou conceitualmente algum momento dos jogos Soulsborne, sem reproduzir mapas existentes.

Exemplo de progressão:

```txt
Prisão
↓
Fortaleza em ruínas
↓
Cidade medieval decadente
↓
Floresta amaldiçoada
↓
Catedral
↓
Catacumbas
↓
Cidade subterrânea
↓
Castelo
↓
Região marítima
↓
Cidade gótica
↓
Distrito tomado por criaturas
↓
Pântano
↓
Montanha
↓
Região congelada
↓
Capital monumental
↓
Terras destruídas
↓
Área cósmica / final
```

O objetivo é criar a sensação de que o jogador está atravessando um mundo enorme e antigo, com civilizações sobrepostas e diferentes períodos de decadência.

---

# 6. Primeira Área — A Prisão

O jogo começa dentro de uma cela.

A inspiração de sensação é o início de Dark Souls 1, mas a prisão terá arquitetura e identidade próprias.

## Atmosfera

A prisão deve ser:

- fechada;
- úmida;
- escura;
- silenciosa;
- claustrofóbica;
- feita de pedra antiga;
- com musgo;
- lama;
- água;
- correntes;
- grades;
- iluminação mínima.

No começo, evitar ambientes muito abertos.

O jogador deve sentir que está preso profundamente dentro de uma estrutura antiga.

## Progressão inicial

```txt
Cela inicial
↓
Corredor da prisão
↓
Primeiro item
↓
Primeiro inimigo
↓
Primeira arma
↓
Mais corredores e celas
↓
Atalho
↓
Checkpoint
↓
Área maior
↓
Primeiro miniboss ou boss
```

---

# 7. Personagem Principal

Já existe uma referência visual definida e os assets estão salvos localmente.

O personagem deve manter consistentemente:

- cabelo castanho-escuro;
- cabelo relativamente comprido e puxado para trás;
- óculos;
- barba curta;
- roupa dark fantasy em tons escuros/roxos;
- capa;
- somente o braço esquerdo tatuado;
- braço direito sem tatuagens.

Esse design deve ser tratado como o padrão oficial do personagem.

Não alterar drasticamente o rosto, cabelo, proporções ou roupa entre sprites.

---

# 8. Estilo Gráfico

O estilo visual já foi definido através dos assets produzidos.

## Características

- 2D
- ilustração detalhada
- anime/painterly
- dark fantasy
- gótico
- alto contraste
- iluminação dramática
- sombras fortes
- predominância de preto, cinza e roxo
- luz quente de tochas e fogo
- lua roxa e efeitos sobrenaturais em momentos específicos

A intenção NÃO é pixel art tradicional.

O visual pode parecer uma ilustração animada.

Os personagens possuem detalhes e proporções estilizadas, mas devem continuar legíveis durante o gameplay.

---

# 9. Cenários

Os cenários devem ser construídos de forma modular.

Não utilizar uma única imagem gigante para cada fase.

Separar em:

```txt
background distante
background intermediário
arquitetura principal
tiles jogáveis
props
foreground
névoa
partículas
iluminação
```

Isso permitirá:

- parallax;
- reutilização;
- mapas maiores;
- variação;
- melhor desempenho;
- composição procedural/manual via código.

---

# 10. Tiles

Já existem tiles iniciais da prisão salvos localmente.

Eles incluem conceitos como:

- tijolos de pedra;
- paredes;
- pisos;
- plataformas;
- arcos;
- grades;
- musgo;
- lama;
- pedra úmida;
- variações degradadas.

Precisaremos transformar isso em um sistema de tiles consistente.

Possível escala inicial:

- 64x64
- 96x96
- ou 128x128

Definir depois de testar o personagem no cenário.

---

# 11. Animações do Personagem

Já existem referências/sprite sheets para algumas ações.

O personagem deverá possuir eventualmente:

## Movimento

- idle
- walk
- run
- jump
- fall
- landing

## Combate

- attack light 1
- attack light 2
- heavy attack
- charged attack
- aerial attack
- hit
- stagger
- death

## Defesa

- roll / dodge
- backstep
- eventualmente block/parry dependendo da arma

## Interação

- pegar item
- abrir porta
- puxar alavanca
- ativar checkpoint

---

# 12. Sistema de Armas

As armas NÃO devem fazer parte fixa do sprite do personagem.

Arquitetura desejada:

```txt
Player
└── WeaponSocket
      └── EquippedWeapon
```

A arma deve ser um sprite/objeto separado.

Isso permitirá trocar equipamentos sem refazer todas as animações.

Cada arma deve possuir configuração.

Exemplo:

```ts
type WeaponDefinition = {
  id: string
  name: string
  damage: number
  staminaCost: number
  attackSpeed: number
  range: number
  weight: number
  sprite: string
  animationSet: string
}
```

As armas poderão compartilhar categorias de animação:

- light
- sword
- greatsword
- spear
- axe
- scythe
- blunt
- special

---

# 13. Primeira Arma

A primeira arma será extremamente simples.

Conceito atual:

**espada improvisada de bambu escuro/esverdeado**

Ela deve parecer:

- fraca;
- improvisada;
- velha;
- básica;
- encontrada dentro da prisão.

Não deve parecer uma arma lendária.

Ela serve apenas para ensinar o sistema de combate.

---

# 14. Combate

A base do combate será:

```txt
Ataque
+
Stamina
+
Esquiva
+
Posicionamento
+
Hitbox/Hurtbox
+
Timing
```

O jogador não deve conseguir atacar ou esquivar infinitamente.

Exemplo inicial:

```txt
Vida: 100

Stamina: 100

Ataque leve:
- custo 18 stamina

Esquiva:
- custo 25 stamina

Corrida:
- consumo contínuo
```

Esses números são provisórios.

---

# 15. Stamina

Stamina será um dos sistemas principais.

Ela deverá ser usada por:

- ataques;
- esquivas;
- corrida;
- algumas habilidades;
- possivelmente bloqueio.

A stamina regenera após pequeno intervalo.

Arquitetura sugerida:

```ts
class StaminaComponent {
  current: number
  max: number
  regenRate: number
  regenDelay: number
}
```

---

# 16. HUD

Já existem artes da HUD salvas localmente.

HUD inicial:

```txt
Vida
Stamina

[ Arma equipada ]
[ Consumível equipado ]
```

Somente dois slots principais no momento.

Os slots devem começar vazios.

## Barras

A moldura deve ser um asset independente.

Vida e stamina devem ser renderizadas separadamente por código.

```txt
hud_frame.png
health_fill.png
stamina_fill.png
```

O preenchimento será controlado usando os valores atuais/máximos.

Exemplo:

```ts
healthWidth = maxWidth * (health / maxHealth)
```

Isso permitirá futuramente:

- mudança da vida máxima;
- stamina máxima;
- buffs;
- debuffs;
- animação de dano;
- regen;
- upgrades.

---

# 17. Consumíveis

Inicialmente haverá um slot de consumível.

Pode eventualmente funcionar como o equivalente conceitual de uma cura limitada.

Ainda precisamos criar uma identidade própria para isso.

Evitar simplesmente copiar o Estus.

Podemos criar algo relacionado a:

- essência;
- sangue;
- fogo;
- lua;
- resina;
- fragmentos;
- energia antiga.

---

# 18. Inimigos

Já existe um inimigo terrestre básico inspirado na ideia de um morto-vivo decadente.

Ele possui visual próprio e não deve ser uma cópia de Hollow.

Características iniciais:

- humanoide;
- magro;
- decadente;
- roupas rasgadas;
- correntes;
- arma simples;
- comportamento agressivo.

Animações existentes ou previstas:

- idle
- walk
- attack
- hit
- death

No começo, idle/walk podem ser relativamente simples.

É mais importante ter um bom ataque e feedback de dano.

---

# 19. IA Inicial de Inimigos

Começar simples.

Estados:

```txt
IDLE
PATROL
CHASE
ATTACK
HIT
DEAD
```

Exemplo:

```ts
switch (state) {
  case "IDLE":
    detectPlayer()
    break

  case "CHASE":
    moveTowardsPlayer()
    break

  case "ATTACK":
    performAttack()
    break
}
```

Depois expandir para:

- guard;
- flee;
- ranged;
- ambush;
- support;
- boss AI.

---

# 20. Primeiro Boss

Já existe um conceito de boss com sprite sheet.

Ele foi inspirado apenas em sensação/arquetipo de um guerreiro gótico com foice, lembrando Martyr Logarius, porém com design diferente.

O boss utiliza:

- foice;
- ataques corpo a corpo;
- corrida;
- arremesso da foice;
- ataques com energia sobrenatural.

Sprite sheet atual possui sequências para:

- atacar;
- jogar a foice;
- correr.

Precisaremos futuramente adicionar:

- idle;
- hit;
- stagger;
- death;
- transformação/fase 2;
- efeitos.

---

# 21. Bosses

Cada boss deve ser tratado como uma pequena state machine própria.

Exemplo:

```txt
INTRO

PHASE_1
├── Slash
├── Combo
├── Dash
└── ThrowScythe

PHASE_2
├── EnhancedSlash
├── Teleport
├── Projectile
└── AreaAttack

DEATH
```

O jogo pode ter bosses com múltiplas fases, mas isso não deve ser obrigatório para todos.

---

# 22. Checkpoints

Precisamos criar um equivalente próprio à bonfire.

Funções:

- checkpoint;
- recuperar vida;
- recuperar consumíveis;
- salvar progresso;
- respawn;
- respawnar inimigos comuns;
- permitir upgrades futuramente.

O visual pode ter inspiração conceitual em fogueira/altar, mas deve possuir identidade própria.

Pode usar:

- chama roxa;
- estrutura antiga;
- espada quebrada;
- altar;
- pedra;
- símbolo do jogo.

---

# 23. Progressão

O jogador irá encontrar:

- armas;
- consumíveis;
- armaduras;
- acessórios;
- materiais;
- chaves;
- itens de história.

A ideia é recompensar exploração.

Podemos futuramente ter:

- atributos;
- níveis;
- builds;
- scaling de armas;
- upgrade de equipamento;
- magia;
- habilidades.

Mas inicialmente não implementar tudo.

---

# 24. Level Design

O mundo deve incentivar exploração.

Características:

- atalhos;
- portas que só abrem por um lado;
- elevadores;
- escadas;
- caminhos opcionais;
- salas secretas;
- verticalidade;
- armadilhas;
- itens visíveis mas inicialmente inacessíveis.

Uma boa fase deverá permitir momentos como:

> “Eu estava aqui há meia hora e essa porta voltou exatamente para o início.”

Esse tipo de conexão é importante.

---

# 25. Estrutura das Áreas

Não carregar o mundo inteiro simultaneamente.

Utilizar:

```txt
Area
  ├── Room
  ├── Room
  ├── Room
  └── Transition
```

Cada região poderá possuir várias salas.

Exemplo:

```txt
Prison
├── CellBlockA
├── LowerHall
├── TortureRoom
├── Drainage
├── GuardHall
└── BossArena
```

Isso permitirá um jogo extenso sem transformar uma Scene em um mapa gigantesco.

---

# 26. Assets Existentes

Já foram produzidos e estão salvos localmente diversos assets/conceitos, incluindo:

- personagem principal;
- sprite de caminhada;
- idle;
- ataques;
- esquiva;
- interação para pegar item;
- arma inicial;
- inimigo básico;
- ataque do inimigo;
- movimentação/morte do inimigo;
- primeiro boss;
- animações do boss;
- tiles da prisão;
- variações com musgo e lama;
- HUD;
- moldura de vida/stamina;
- preenchimento de vida;
- preenchimento de stamina.

Esses assets devem ser tratados como base visual do projeto.

Antes de gerar novos assets, tentar manter consistência com os já existentes.

---

# 27. Uso de IA

O projeto será desenvolvido com forte apoio de IA.

IA será utilizada para:

## Código

- arquitetura;
- geração de classes;
- refatoração;
- testes;
- debugging;
- implementação de sistemas;
- documentação.

## Arte

- concept art;
- personagens;
- inimigos;
- bosses;
- tiles;
- backgrounds;
- props;
- armas;
- UI.

## Planejamento

- lore;
- level design;
- balanceamento;
- bosses;
- progressão;
- itens;
- nomes;
- quests.

Mesmo usando IA, manter consistência será prioridade.

---

# 28. Regra de Consistência Visual

Antes de criar qualquer novo personagem ou cenário, verificar:

1. Ele pertence visualmente ao mesmo jogo?
2. A paleta combina?
3. O nível de detalhe é equivalente?
4. A escala é consistente?
5. A iluminação combina?
6. A silhueta funciona em gameplay?
7. O asset consegue ser animado?

Não gerar arte apenas porque parece bonita isoladamente.

Ela precisa funcionar como asset de jogo.

---

# 29. Primeira Vertical Slice

O primeiro objetivo NÃO é criar o jogo inteiro.

Criar uma pequena versão funcional.

Fluxo:

```txt
Player acorda na cela
↓
Pode andar
↓
Pode pular
↓
Pode esquivar
↓
Sai da cela
↓
Encontra a arma inicial
↓
Animação de pegar item
↓
Equipa espada
↓
Encontra primeiro inimigo
↓
Combate
↓
Perde vida
↓
Gasta stamina
↓
Mata inimigo
↓
Encontra checkpoint
↓
Descansa
↓
Inimigos respawnam
↓
Continua exploração
↓
Boss
```

Se isso estiver divertido, temos o núcleo do jogo.

---

# 30. Ordem Recomendada de Implementação

## Fase 1 — Base

1. Criar projeto Phaser + TypeScript.
2. Carregar assets.
3. Player.
4. Movimento.
5. Colisão.
6. Câmera.
7. Animação.

## Fase 2 — Gameplay

8. Vida.
9. Stamina.
10. Dodge.
11. Weapon socket.
12. Equipamento.
13. Ataque.
14. Hitbox.
15. Dano.

## Fase 3 — Primeiro inimigo

16. Enemy base.
17. State machine.
18. Detecção.
19. Chase.
20. Attack.
21. Damage.
22. Death.

## Fase 4 — Mundo

23. Tiles.
24. Prisão.
25. Celas.
26. Portas.
27. Pickups.
28. Checkpoint.

## Fase 5 — Interface

29. HUD.
30. Vida dinâmica.
31. Stamina dinâmica.
32. Slot de arma.
33. Slot de item.

## Fase 6 — Boss

34. Arena.
35. Boss state machine.
36. Ataques.
37. Fase 2.
38. Morte.
39. Reward.

---

# 31. Escopo Futuro

O jogo poderá futuramente ter:

- dezenas de armas;
- classes de armas;
- magias;
- armas de fogo;
- builds;
- status effects;
- poison;
- bleed;
- curse;
- elemental damage;
- NPCs;
- quests;
- lojas;
- ferreiro;
- upgrades;
- múltiplos finais;
- New Game+;
- achievements;
- multiplayer/co-op eventualmente.

Nada disso precisa estar na primeira versão.

---

# 32. Objetivo de Longo Prazo

Criar um jogo 2D extenso que transmita a sensação de uma jornada por um mundo dark fantasy enorme.

O jogador deve começar fraco e perdido em uma cela e terminar atravessando locais monumentais e sobrenaturais.

A campanha deve gradualmente evoluir de:

```txt
claustrofobia
↓
exploração
↓
grandiosidade
↓
horror
↓
decadência
↓
mistério
↓
fantasia épica
↓
cosmicidade
```

A ideia é prestar homenagem às sensações proporcionadas por Dark Souls, Bloodborne e Elden Ring sem copiar personagens, mapas, bosses ou lore.

O jogo deve ter sua própria identidade.

---

# 33. Orientação Para o Chat/IA que Continuar o Projeto

Ao trabalhar neste projeto:

- não simplifique o projeto para algo pequeno apenas por ser 2D;
- considere que ele será extenso;
- preserve arquitetura escalável;
- trate Phaser como framework principal;
- utilize TypeScript;
- seja code-first;
- evite dependência de editores visuais;
- mantenha sistemas desacoplados;
- mantenha os assets visuais consistentes;
- respeite o design oficial do personagem;
- considere os assets já existentes salvos localmente;
- antes de implementar sistemas enormes, priorize uma vertical slice jogável;
- sempre pense se determinada decisão ainda funcionaria com 30 áreas, 100 armas e dezenas de inimigos.

## Próxima tarefa sugerida

Começar o planejamento técnico do projeto Phaser:

1. definir dependências;
2. definir estrutura de pastas definitiva;
3. criar bootstrap do projeto;
4. implementar primeira Scene;
5. implementar Player;
6. montar a primeira cela.
