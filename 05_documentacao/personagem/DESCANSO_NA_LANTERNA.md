# Descanso na lanterna

Animação de oito quadros em que o jogador se senta no chão ao lado da lanterna de checkpoint. A postura final mostra um caçador cansado, com um joelho elevado, a outra perna dobrada e as mãos próximas do calor.

A lanterna e o fogo permanecem como sprites separados.

## Sequência

1. observa a lanterna em pé;
2. dobra os joelhos;
3. apoia um joelho;
4. equilibra o corpo com a mão;
5. baixa o quadril;
6. acomoda as pernas e a capa;
7. aproxima as mãos do calor;
8. fica sentado em repouso.

## Integração

- esconder a arma antes de iniciar o descanso;
- alinhar a lanterna à direita do jogador;
- tocar os quadros `0–7` uma vez;
- congelar no quadro de índice `7` enquanto o jogador estiver descansando;
- ao receber um comando para levantar, tocar `levantar_lanterna_8_frames.png` do quadro `0` ao `7`;
- devolver controle, colisão normal e arma somente ao terminar o quadro `7` da animação de levantar;
- manter aproximadamente 150 px de altura visual na pose em pé.

## Levantar

`levantar_lanterna_8_frames.png` começa na pose sentada, afasta as mãos do calor, apoia uma mão no chão, firma a bota, ergue o quadril e termina na pose da idle natural. Essa folha substitui a reprodução inversa da animação de sentar.

O original está em `01_sprites/personagem_jogador/descanso_lanterna/`. As versões de runtime e o manifesto ficam em `public/assets/player/descanso_lanterna/`.
