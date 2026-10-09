"""Prepara atlas sem alterar a arte: retângulos individuais e WebP com alfa sem perdas."""
import json
import subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/prison/alas_servico'
OUT.mkdir(parents=True, exist_ok=True)
SOURCES = ROOT / '02_cenarios_e_tilesets'

for name, filename, boxes in [
    ('isolation', 'tilesets/prisao_alas_variadas/tileset_prisao_isolamento_16_pecas.png', {
        'floor': (12, 45, 312, 235), 'wall': (20, 265, 310, 565),
        'wall-worn': (330, 265, 620, 565), 'wall-marked': (950, 265, 1240, 565),
        'door': (325, 570, 610, 880), 'column': (710, 565, 875, 880),
    }),
    ('workshop', 'tilesets/prisao_alas_variadas/tileset_prisao_oficinas_fornalhas_16_pecas.png', {
        'floor': (20, 50, 310, 255), 'wall': (20, 280, 315, 570),
        'wall-worn': (330, 280, 625, 570), 'wall-marked': (640, 280, 930, 570),
        'door': (330, 565, 665, 900), 'column': (730, 570, 875, 900),
    }),
    ('cistern', 'tilesets/prisao_alas_variadas/tileset_prisao_cisterna_antiga_16_pecas.png', {
        'floor': (10, 70, 312, 250), 'wall': (10, 275, 305, 535),
        'wall-worn': (330, 275, 625, 535), 'wall-marked': (635, 275, 930, 535),
        'door': (360, 540, 705, 900), 'column': (760, 540, 885, 900),
    }),
    ('furniture', 'props/prisao_servicos/atlas_prisao_mobiliario_servicos_4_pecas.png', {
        'stretcher': (10, 175, 770, 670), 'keys': (770, 20, 1240, 670),
        'bench': (10, 720, 725, 1150), 'cauldron': (725, 760, 1245, 1160),
    }),
    ('mechanisms', 'props/prisao_servicos/atlas_prisao_mecanismos_4_pecas.png', {
        'winch': (0, 0, 625, 580), 'pump': (655, 0, 1254, 590),
        'lift': (90, 580, 555, 1225), 'cart': (600, 870, 1250, 1225),
    }),
]:
    source = SOURCES / filename
    im = Image.open(source)
    frames = {}
    for key, box in boxes.items():
        # Inspeção do alfa somente: a textura original não é recortada/reamostrada.
        bounds = im.getchannel('A').crop(box).getbbox()
        assert bounds, (name, key)
        left, top, right, bottom = bounds
        x, y = box[0] + left, box[1] + top
        width, height = right - left, bottom - top
        frames[key] = {'frame': {'x': x, 'y': y, 'w': width, 'h': height},
                       'rotated': False, 'trimmed': False,
                       'spriteSourceSize': {'x': 0, 'y': 0, 'w': width, 'h': height},
                       'sourceSize': {'w': width, 'h': height}}
    (OUT / f'{name}.json').write_text(json.dumps({'frames': frames, 'meta': {
        'image': f'{name}.webp', 'size': {'w': im.width, 'h': im.height}}}, indent=2) + '\n')
    subprocess.run(['cwebp', '-quiet', '-q', '90', '-alpha_q', '100', str(source), '-o', str(OUT / f'{name}.webp')], check=True)
    print(name, len(frames), 'frames')
