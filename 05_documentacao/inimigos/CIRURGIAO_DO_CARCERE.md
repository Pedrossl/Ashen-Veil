# Cirurgião do Cárcere

Inimigo de elite das Alas Esquecidas. É um antigo médico da prisão deformado pelo trabalho e pelos preparados que aplicava nos condenados. A máscara de ferro, as lentes violetas, a seringa de latão e a serra curta tornam sua função legível antes do combate.

## Função no combate

Ele ocupa o espaço entre o Prisioneiro Acorrentado e o Carcereiro do Véu: anda mais rápido, resiste razoavelmente a interrupções e pune tanto quem fica colado quanto quem permanece no limite do alcance.

| Ataque | Alcance | Dano | Leitura |
|---|---:|---:|---|
| Corte rápido | 92 | 20 | Preparação curta e recuperação média. |
| Corte de execução | 115 | 34 | Serra erguida, avanço pesado e recuperação longa. |
| Estocada de seringa | 155 | 24 | Recolhe o braço e perfura em linha reta. |
| Injeção profunda | 128 | 42 | Maior preparação e maior dano; principal janela de punição. |

Vida: 115. Velocidade: 82. Atordoamento: 22% normalmente e 6% durante ataques. Não possui projétil. Os quatro ataques compartilham dois movimentos-base com temporizações diferentes; cada variação tem chave própria para manter as fases sincronizadas.

## Arte e runtime

Originais e manifesto: `01_sprites/inimigos/cirurgiao_do_carcere/`. A arte foi gerada com image_gen integrado a partir da referência própria do personagem. Cada ação tem oito quadros em grade 4×2.

`scripts/prepare_prison_surgeon.py` recorta, remove fragmentos isolados que invadiram células vizinhas, normaliza os pés e reúne 40 quadros de 420×360. `scripts/optimize_runtime_assets.py` converte o PNG preparado em `public/assets/enemies/sprite_sheet_cirurgiao_do_carcere.webp`.

Ordem: idle 0–7, caminhada 8–15, seringa 16–23, serra 24–31, dano 32–33 e morte 34–39. O primeiro encontro substitui um rato no chão da oficina das Alas Esquecidas, em x1510.
