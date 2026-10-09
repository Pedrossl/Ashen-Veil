# Cirurgião Rubro

Boss médico da prisão, pensado como uma evolução visual e mecânica do Cirurgião do Cárcere. Esta etapa contém somente o design e as folhas originais; nenhuma lógica foi ligada ao jogo.

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

## Direção futura de combate

A ativação do soro foi desenhada para uma futura recuperação de vida. O quadro ativo deve ser tardio para permitir que o jogador interrompa ou puna a cura. O brilho vermelho é parte do personagem e não contém um halo de fundo, permitindo que luz e partículas sejam controladas pelo Phaser.

Os originais ficam em `01_sprites/bosses/cirurgiao_rubro/`. Antes de integrar, preparar folhas normalizadas em `public/assets/bosses/` e definir os intervalos de preparação, acerto e recuperação conforme os quadros finais recortados.
