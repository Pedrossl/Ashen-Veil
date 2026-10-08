"""Converte os assets de runtime (public/assets) para formatos leves.

Os scripts de preparo de sprites escrevem PNG e os geradores de som escrevem
WAV em public/assets; rode este script depois deles. O código carrega só:

- imagens .webp (qualidade 90, alfa sem perdas): de 3 a 5 vezes menores;
- áudio .m4a (AAC 96 kbps): ~8 vezes menor, mantendo o mesmo número de
  amostras, então os loops continuam sem emenda.

Requer o `cwebp` (brew install webp) e o `afconvert` (já vem no macOS).
"""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public' / 'assets'


def convert(source: Path, suffix: str, command: list[str]) -> None:
    target = source.with_suffix(suffix)
    subprocess.run(command_for(command, source, target), check=True)
    source.unlink()
    print(f'{source.relative_to(ROOT)} -> {target.name}')


def command_for(template: list[str], source: Path, target: Path) -> list[str]:
    return [str(source) if part == '{in}' else str(target) if part == '{out}' else part for part in template]


WEBP = ['cwebp', '-quiet', '-q', '90', '-alpha_q', '100', '-m', '6', '{in}', '-o', '{out}']
AAC = ['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '96000', '{in}', '{out}']


def main() -> None:
    for png in sorted(PUBLIC.rglob('*.png')):
        convert(png, '.webp', WEBP)
    for wav in sorted(PUBLIC.rglob('*.wav')):
        convert(wav, '.m4a', AAC)


if __name__ == '__main__':
    main()
