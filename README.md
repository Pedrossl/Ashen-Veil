# Ashen Veil

Action RPG 2D side-scroller de fantasia sombria, com exploração, combate baseado em stamina, progressão por equipamentos, checkpoints e bosses.

O projeto é desenvolvido de forma code-first com Phaser 4, TypeScript e Vite. A primeira vertical slice acompanha o despertar do jogador em uma prisão antiga e sua progressão até o primeiro boss.

## Requisitos

- Node.js 22.12 ou superior
- npm

## Desenvolvimento

```bash
npm install
npm run dev
```

## Validação

```bash
npm run typecheck
npm run build
```

## Documentação

- [Planejamento geral](05_documentacao/planejamento/PLANEJAMENTO_SOULSLIKE_2D.md)
- [Estrutura do projeto](05_documentacao/README.md)
- [Guia para assistentes](AGENTS.md)

## Estado atual

O bootstrap usa Phaser 4.2.1, TypeScript 7.0.2 e Vite 8.3.2. O fluxo inicial contém `BootScene`, `PreloadScene` e `PrisonScene`. A primeira cela já é composta com peças do atlas medieval, e o personagem pode andar horizontalmente com animação e colisão. O próximo marco é preparar a saída da cela e o primeiro corredor.
