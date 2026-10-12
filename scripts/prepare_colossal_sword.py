"""Prepara a Espada Colossal da Brasa Rubra para o jogo.

Recorta a arte original (ponta para cima, cabo para baixo) pelo contorno da
espada, sem o brilho difuso fraco, e reduz para a altura de runtime. O ponto
da mão (`gripOriginY` em src/data/weapons.ts) fica no alto do cabo comprido,
logo abaixo da guarda. Depois rode `optimize_runtime_assets.py`.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "03_itens_e_armas/armas/espada_colossal_brasa_rubra/arma_espada_colossal_brasa_rubra.png"
OUTPUT = ROOT / "public/assets/weapons/arma_espada_colossal_brasa_rubra.png"
# Contorno sólido da espada; o halo semitransparente em volta não entra no recorte.
SOLID_ALPHA = 120
HEIGHT = 320
# Altura da mão na arte original (alto do cabo, abaixo da guarda).
GRIP_Y = 1230


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    left, top, right, bottom = image.getchannel("A").point(lambda v: 255 if v >= SOLID_ALPHA else 0).getbbox()
    sword = image.crop((left, top, right, bottom))
    scale = HEIGHT / sword.height
    sword = sword.resize((round(sword.width * scale), HEIGHT), Image.Resampling.LANCZOS)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sword.save(OUTPUT)
    print(f"{OUTPUT.name}: {sword.size}, gripOriginY = {(GRIP_Y - top) / (bottom - top):.3f}")


if __name__ == "__main__":
    main()
