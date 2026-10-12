"""Gera o Anel do Bisturi Rubro a partir do Anel do Fôlego Velado.

Versão provisória até existir arte própria: mesma prata escurecida, com a pedra
verde trocada por vermelho-sangue (só os pixels esverdeados mudam de matiz).
Escreve os originais em 03_itens_e_armas/itens/aneis/anel_bisturi_rubro/ e as
versões de runtime (PNG) em public/assets/items/aneis/; depois rode
`optimize_runtime_assets.py`.
"""
import colorsys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "03_itens_e_armas/itens/aneis/anel_folego_velado/item_anel_folego_velado_original.png"
ORIGINALS = ROOT / "03_itens_e_armas/itens/aneis/anel_bisturi_rubro"
RUNTIME = ROOT / "public/assets/items/aneis"
NAME = "item_anel_bisturi_rubro"
# Matizes (0–1) da pedra verde e o vermelho de destino.
GREEN = (0.2, 0.55)
RED = 0.985


def recolor(image: Image.Image) -> Image.Image:
    pixels = image.convert("RGBA")
    data = []
    for r, g, b, a in pixels.getdata():
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if GREEN[0] <= h <= GREEN[1] and s > 0.18:
            r2, g2, b2 = colorsys.hsv_to_rgb(RED, min(1, s * 1.9 + 0.15), min(1, v * 1.35))
            data.append((round(r2 * 255), round(g2 * 255), round(b2 * 255), a))
        else:
            data.append((r, g, b, a))
    pixels.putdata(data)
    return pixels


def main() -> None:
    ORIGINALS.mkdir(parents=True, exist_ok=True)
    ring = recolor(Image.open(SOURCE))
    ring.save(ORIGINALS / f"{NAME}_original.png")
    for size, label in ((32, "pequeno"), (64, "medio"), (128, "grande")):
        resized = ring.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(ORIGINALS / f"{NAME}_{label}_{size}.png")
        if size in (64, 128):
            resized.save(RUNTIME / f"{NAME}_{label}_{size}.png")
    print("Anel do Bisturi Rubro gerado")


if __name__ == "__main__":
    main()
