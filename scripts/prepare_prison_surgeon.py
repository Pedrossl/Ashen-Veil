"""Normaliza as cinco folhas do Cirurgião do Cárcere para uma sheet de runtime."""
from pathlib import Path
from collections import deque

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "01_sprites/inimigos/cirurgiao_do_carcere"
OUTPUT = ROOT / "public/assets/enemies/sprite_sheet_cirurgiao_do_carcere.png"

FRAME_W = 420
FRAME_H = 360
FEET_Y = 350
ALPHA_THRESHOLD = 18

SHEETS = [
    "sprite_sheet_cirurgiao_idle_8_frames.png",
    "sprite_sheet_cirurgiao_caminhada_8_frames.png",
    "sprite_sheet_cirurgiao_ataque_seringa_8_frames.png",
    "sprite_sheet_cirurgiao_ataque_serra_8_frames.png",
    "sprite_sheet_cirurgiao_dano_morte_8_frames.png",
]


def extract_frames(path: Path) -> list[Image.Image]:
    sheet = Image.open(path).convert("RGBA")
    cell_w, cell_h = sheet.width // 4, sheet.height // 2
    frames: list[Image.Image] = []

    for row in range(2):
        for col in range(4):
            cell = sheet.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
            alpha = cell.getchannel("A").point(lambda value: 255 if value >= ALPHA_THRESHOLD else 0)
            bounds = alpha.getbbox()
            if bounds is None:
                raise RuntimeError(f"Quadro vazio em {path.name}: {row}, {col}")
            cropped = cell.crop(bounds)
            # O gerador ocasionalmente deixa a ponta da arma do quadro vizinho
            # dentro da célula. Mantemos o maior componente conectado (corpo +
            # arma empunhada) e apagamos esses fragmentos isolados.
            binary = cropped.getchannel("A").point(lambda value: 1 if value >= ALPHA_THRESHOLD else 0)
            pixels = binary.load()
            visited: set[tuple[int, int]] = set()
            largest: list[tuple[int, int]] = []
            for y in range(cropped.height):
                for x in range(cropped.width):
                    if not pixels[x, y] or (x, y) in visited:
                        continue
                    component: list[tuple[int, int]] = []
                    queue = deque([(x, y)])
                    visited.add((x, y))
                    while queue:
                        px, py = queue.popleft()
                        component.append((px, py))
                        for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                            if 0 <= nx < cropped.width and 0 <= ny < cropped.height and pixels[nx, ny] and (nx, ny) not in visited:
                                visited.add((nx, ny))
                                queue.append((nx, ny))
                    if len(component) > len(largest):
                        largest = component
            keep = Image.new("L", cropped.size)
            keep_pixels = keep.load()
            for x, y in largest:
                keep_pixels[x, y] = cropped.getpixel((x, y))[3]
            cropped.putalpha(keep)
            clean_bounds = keep.getbbox()
            if clean_bounds is None:
                raise RuntimeError(f"Quadro sem corpo em {path.name}: {row}, {col}")
            frames.append(cropped.crop(clean_bounds))
    return frames


def normalize(frame: Image.Image) -> Image.Image:
    scale = min(400 / frame.width, 334 / frame.height)
    size = (max(1, round(frame.width * scale)), max(1, round(frame.height * scale)))
    resized = frame.resize(size, Image.Resampling.LANCZOS)
    target = Image.new("RGBA", (FRAME_W, FRAME_H))
    target.alpha_composite(resized, ((FRAME_W - resized.width) // 2, FEET_Y - resized.height))
    return target


rows = [[normalize(frame) for frame in extract_frames(SOURCE / filename)] for filename in SHEETS]
output = Image.new("RGBA", (FRAME_W * 8, FRAME_H * len(rows)))
for row, frames in enumerate(rows):
    for column, frame in enumerate(frames):
        output.alpha_composite(frame, (column * FRAME_W, row * FRAME_H))

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
output.save(OUTPUT)
print(f"{OUTPUT}: {output.size}, {len(rows) * 8} quadros")
