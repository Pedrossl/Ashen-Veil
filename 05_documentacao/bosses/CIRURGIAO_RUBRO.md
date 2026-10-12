# Cirurgião Rubro

Boss médico da prisão, evolução visual e mecânica do Cirurgião do Cárcere. Último boss da demo, integrado no **Anfiteatro Cirúrgico** (`prison-surgical-theater`).

## Silhueta

- médico alto, magro e agressivo, com máscara cirúrgica de bico e lentes violetas;
- bisturi grande na mão direita, largo o bastante para ser lido durante ataques rápidos;
- suporte portátil de soro na mão esquerda, com frasco vermelho protegido por uma gaiola de latão;
- tubo do frasco conectado ao antebraço;
- base curva do suporte funciona como martelo, gancho e ponto de impacto;
- roupas pretas e cinzas, faixas roxas, avental sujo, latão envelhecido e vermelho concentrado no soro.

## Movimentos desenhados

| Animação | Quadros | Leitura visual |
|---|---:|---|
| Idle | 6 | Respiração e pequenos ajustes das duas armas. |
| Corrida | 6 | Avanço rápido, com pernas e tecidos bem abertos. |
| Estocada | 6 | Recuo curto seguido de extensão completa do bisturi. |
| Giro em arco | 6 | Torção do tronco e corte horizontal amplo. |
| Golpe vertical do soro | 6 | Ergue o suporte e golpeia de cima para baixo com a base curva. |
| Ativar soro | 6 | Abre a válvula; frasco, tubo, lentes e braço passam a brilhar em vermelho. |

## No jogo

- Sheet de runtime `public/assets/bosses/sprite_sheet_cirurgiao_rubro.webp` (quadros de 546x345, uma linha por animação, pés em 278/339), gerada por `scripts/prepare_crimson_surgeon.py`: cada quadro é o componente conectado do sheet inteiro (a arte invade as células vizinhas), todos na mesma escala (0,65) e alinhados pela sola e pela mediana das botas. Dados em `CRIMSON_SURGEON_SPRITE` (`src/data/bossSprites.ts`), com duração por quadro: o aviso de cada golpe é o quadro segurado antes do acerto.
- Comportamento em `src/entities/bosses/CrimsonSurgeon.ts`, números em `CRIMSON_SURGEON` (`src/data/bosses.ts`): 480 de vida; estocada (longe), giro em arco e golpe vertical do soro (perto, com impacto no chão); corrida até o alcance. Abaixo de 50% fica 20% mais rápido. Não tem animação de dano nem de morte: pisca ao apanhar e, vencido, cai com o frasco aceso e se desfaz em sangue.
- **Soro**: a cada ~21 s (o primeiro aos ~7 s), ativa o soro e três bolhas de sangue (`src/entities/bosses/BloodBubble.ts`) caem em arco pela arena, longe dele e umas das outras. Cada bolha ligada ao frasco por um fio de sangue cura 2 de vida/s e enche a barra **SANGUE** (segunda barra do boss no HUD, evento `boss:gauge-changed`) em 2,4/s. Bolhas têm 22 de vida. Sem bolhas, a barra esvazia devagar. No cooperativo são 4 bolhas, com 30 de vida efetiva.
- **Alagamento**: barra cheia, as bolhas restantes estouram e o anfiteatro alaga por 20 s: o sangue cobre os pés, o jogador anda a 80% (`Room.slowZones`) e perde 1,2 de vida/s (`Player.takeHazardDamage`, sem empurrão).
- Vencido: flag `boss-defeated:crimson-surgeon`, **Anel do Bisturi Rubro** (+15% de dano, `RING_EFFECTS`; arte provisória recolorida do Anel do Fôlego Velado por `scripts/prepare_crimson_ring.py`) e a porta do fundo abre um atalho para a entrada das Alas Esquecidas.

## Arena

`src/maps/prison/surgicalTheater.ts`: anfiteatro de 2800 px (zoom 0.82) com galerias em degraus e grades ao fundo, arco central sobre a mesa de operação iluminada por uma lâmpada pendurada, colunas, caldeirão de sangue, bancada, armário de chaves, gaiolas, ralos e manchas, tochas e frascos de soro acesos nas paredes, névoa avermelhada. Usa peças extras do tileset de isolamento (janela gradeada, porta fechada, meio-arcos, lintel, coluna quebrada, piso com faixas) recortadas por `scripts/prepare_service_wing.py`. Entrada pela porta no fim do andar de baixo das Alas Esquecidas, depois da lanterna; a porta de entrada fecha durante a luta.
