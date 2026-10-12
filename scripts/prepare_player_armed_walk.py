"""Normaliza a caminhada armada do jogador para a grade de runtime.

A arte original usa células de 384×512. O jogo usa 420×340, com os pés na
linha 330; este script mantém o centro da célula e alinha cada passo pelo
último pixel opaco, removendo só o halo quase transparente do gerador.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '01_sprites/personagem_jogador/caminhada_armada/sprite_sheet_jogador_caminhada_armada_8_frames.png'
TARGET = ROOT / '06_assets_nao_carregados/player/sprite_sheet_jogador_caminhada_armada.png'

SOURCE_CELL = (384, 512)
RUNTIME_CELL = (420, 340)
FRAME_COUNT = 8
SCALE = 0.72
FEET_Y = 330
ALPHA_CUTOFF = 64


def clean_alpha(image: Image.Image) -> Image.Image:
    alpha = image.getchannel('A').point(lambda value: 0 if value < ALPHA_CUTOFF else value)
    image.putalpha(alpha)
    return keep_body(image)


# Alguns quadros da arte original invadem a célula vizinha (um pedaço de bota
# aparecia perto do pé): fica só o corpo, a maior mancha opaca, e o que encosta nele.
def keep_body(image: Image.Image) -> Image.Image:
    import numpy as np
    from scipy import ndimage

    pixels = np.array(image)
    labels, count = ndimage.label(pixels[:, :, 3] > 0)
    if count <= 1:
        return image

    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, count + 1))
    body = 1 + int(np.argmax(sizes))
    near_body = ndimage.binary_dilation(labels == body, iterations=6)
    keep = np.isin(labels, [label for label in range(1, count + 1) if (near_body & (labels == label)).any()])
    pixels[~keep] = 0
    return Image.fromarray(pixels)


def main() -> None:
    source = Image.open(SOURCE).convert('RGBA')
    frame_width, frame_height = SOURCE_CELL
    output = Image.new('RGBA', (RUNTIME_CELL[0] * FRAME_COUNT, RUNTIME_CELL[1]))
    scaled_size = (round(frame_width * SCALE), round(frame_height * SCALE))
    paste_x = (RUNTIME_CELL[0] - scaled_size[0]) // 2

    for index in range(FRAME_COUNT):
        left = (index % 4) * frame_width
        top = (index // 4) * frame_height
        frame = clean_alpha(source.crop((left, top, left + frame_width, top + frame_height)))
        bbox = frame.getchannel('A').getbbox()
        if bbox is None:
            raise ValueError(f'Quadro {index} está vazio.')

        scaled = frame.resize(scaled_size, Image.Resampling.LANCZOS)
        feet = round(bbox[3] * SCALE)
        paste_y = FEET_Y - feet
        output.alpha_composite(scaled, (index * RUNTIME_CELL[0] + paste_x, paste_y))

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    output.save(TARGET)
    print(TARGET.relative_to(ROOT))


if __name__ == '__main__':
    main()
