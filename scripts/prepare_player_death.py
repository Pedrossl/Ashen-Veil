"""Empacota a morte existente sem redesenhar ou esticar poses da queda.

Executar da raiz com Python + Pillow. A folha original invade a divisão
horizontal nominal de 443 px; o intervalo vazio real fica perto de y=515.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/assets/player/dano_e_morte/morte_8_frames.png'
OUTPUT = ROOT / 'public/assets/player/sprite_sheet_jogador_morte.png'
FRAME = (420, 340)
GROUND = 332  # mesma linha da idle; oito pixels até a origem física
SCALE = 0.75  # escala única: não ampliar o corpo conforme ele se deita

source = Image.open(SOURCE).convert('RGBA')
sheet = Image.new('RGBA', (FRAME[0] * 8, FRAME[1]))
for index in range(8):
    row, column = divmod(index, 4)
    top, bottom = (0, 515) if row == 0 else (515, source.height)
    pose = source.crop((column * 443, top, (column + 1) * 443, bottom))
    bounds = pose.getchannel('A').point(lambda a: 255 if a > 32 else 0).getbbox()
    if bounds is None:
        raise ValueError(f'Quadro vazio: {index}')
    pose = pose.crop(bounds)
    pose = pose.resize((round(pose.width * SCALE), round(pose.height * SCALE)), Image.Resampling.LANCZOS)
    assert pose.width <= FRAME[0] and pose.height <= GROUND
    sheet.alpha_composite(pose, (index * FRAME[0] + (FRAME[0] - pose.width) // 2, GROUND - pose.height))
sheet.save(OUTPUT)
print(OUTPUT)
