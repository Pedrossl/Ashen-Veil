"""Reduz a sheet de runtime da Raiz dos Condenados para 75%.

A sheet (quadros de 478x412, 10 colunas) tinha mais resolução do que aparece
na tela (escala 1.1 com câmera em 0.8) e era o asset mais pesado do jogo. Cada
quadro é reduzido sozinho (sem misturar com o vizinho) para 358x309; no jogo,
ROOT_BOSS_SPRITE compensa com uma escala maior, então o tamanho na tela não
muda. Roda uma vez sobre o arquivo de runtime; depois, `optimize_runtime_assets.py`.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHEET = ROOT / "public/assets/bosses/sprite_sheet_raiz_dos_condenados.webp"
OUTPUT = SHEET.with_suffix(".png")
FRAME = (478, 412)
NEW_FRAME = (358, 309)
COLUMNS = 10


def main() -> None:
    sheet = Image.open(SHEET).convert("RGBA")
    rows = sheet.height // FRAME[1]
    out = Image.new("RGBA", (NEW_FRAME[0] * COLUMNS, NEW_FRAME[1] * rows))

    for row in range(rows):
        for column in range(COLUMNS):
            box = (column * FRAME[0], row * FRAME[1], (column + 1) * FRAME[0], (row + 1) * FRAME[1])
            frame = sheet.crop(box).resize(NEW_FRAME, Image.Resampling.LANCZOS)
            out.paste(frame, (column * NEW_FRAME[0], row * NEW_FRAME[1]))

    out.save(OUTPUT)
    SHEET.unlink()
    print(f"{OUTPUT.name}: {sheet.size} -> {out.size}")


if __name__ == "__main__":
    main()
