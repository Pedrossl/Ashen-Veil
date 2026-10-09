"""Prepara a sheet de runtime do Cirurgião Rubro (boss).

As seis folhas originais (3x2 quadros de 512px) têm partes do corpo e das
armas invadindo as células vizinhas, então cada quadro é o componente
conectado grande do sheet inteiro, e não a célula. Todos usam a mesma escala
e ficam alinhados pelos pés: a sola mais baixa vira `FEET_Y` e a mediana dos
pixels das botas vira `FEET_X`. Saída: grade de 6 colunas, uma linha por
animação, na ordem de `SHEETS`. Depois rode `optimize_runtime_assets.py`.
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "01_sprites/bosses/cirurgiao_rubro"
OUTPUT = ROOT / "public/assets/bosses/sprite_sheet_cirurgiao_rubro.png"

SHEETS = ["idle", "corrida", "estocada", "giro_arco", "golpe_vertical_soro", "ativar_soro"]
ALPHA_THRESHOLD = 40
MIN_COMPONENT = 2000
# Corpo de ~470px nos originais vira ~305px (quase duas vezes o jogador).
SCALE = 0.65
BOOTS_BAND = 40
MARGIN = 6


def frames_of(name: str) -> list[tuple[Image.Image, float, int]]:
    """Quadros (imagem recortada, x dos pés, y dos pés) na ordem da grade."""
    image = Image.open(SOURCE / f"sprite_sheet_cirurgiao_rubro_{name}_6_frames.png").convert("RGBA")
    pixels = np.array(image)
    mask = pixels[:, :, 3] >= ALPHA_THRESHOLD
    labels, count = ndimage.label(mask)
    sizes = ndimage.sum(mask, labels, range(1, count + 1))
    found = []

    for label, size in enumerate(sizes, start=1):
        if size < MIN_COMPONENT:
            continue
        ys, xs = np.where(labels == label)
        cell = int(xs.mean()) // 512 + 3 * (int(ys.mean()) // 512)
        bottom = ys.max()
        boots = xs[ys >= bottom - BOOTS_BAND]
        left, top, right = xs.min(), ys.min(), xs.max()
        crop = pixels[top : bottom + 1, left : right + 1].copy()
        crop[:, :, 3] = np.where(labels[top : bottom + 1, left : right + 1] == label, crop[:, :, 3], 0)
        found.append((cell, Image.fromarray(crop), float(np.median(boots)) - left, bottom - top))

    found.sort(key=lambda item: item[0])
    if [item[0] for item in found] != list(range(6)):
        raise RuntimeError(f"{name}: esperava 6 quadros, achei {[item[0] for item in found]}")
    return [(frame, feet_x, feet_y) for _, frame, feet_x, feet_y in found]


def main() -> None:
    rows = []
    for name in SHEETS:
        row = []
        for frame, feet_x, feet_y in frames_of(name):
            size = (round(frame.width * SCALE), round(frame.height * SCALE))
            row.append((frame.resize(size, Image.Resampling.LANCZOS), feet_x * SCALE, feet_y * SCALE))
        rows.append(row)

    frames = [frame for row in rows for frame in row]
    left = max(feet_x for _, feet_x, _ in frames)
    right = max(image.width - feet_x for image, feet_x, _ in frames)
    up = max(feet_y for _, _, feet_y in frames)
    frame_w = int(np.ceil(left + right)) + 2 * MARGIN
    frame_h = int(np.ceil(up)) + 2 * MARGIN
    feet_x = int(np.ceil(left)) + MARGIN
    feet_y = int(np.ceil(up)) + MARGIN

    sheet = Image.new("RGBA", (frame_w * 6, frame_h * len(rows)))
    for row_index, row in enumerate(rows):
        for column, (image, fx, fy) in enumerate(row):
            x = column * frame_w + round(feet_x - fx)
            y = row_index * frame_h + round(feet_y - fy)
            sheet.alpha_composite(image, (x, y))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT)
    print(f"{OUTPUT.name}: quadros {frame_w}x{frame_h}, pés em ({feet_x}, {feet_y}), {len(frames)} quadros")


if __name__ == "__main__":
    main()
