"""Sons originais sintetizados, sem samples externos. Python padrão; geração reproduzível."""
from pathlib import Path
import math
import random
import struct
import wave

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/audio/sfx'
RATE = 44100
rng = random.Random(706)


def tone(t, hz, decay, strength=1):
    return strength * math.sin(2 * math.pi * hz * t) * math.exp(-decay * t)


def render(name, seconds, shape):
    low = 0
    samples = []
    for i in range(round(seconds * RATE)):
        t = i / RATE
        noise = rng.uniform(-1, 1)
        low += .12 * (noise - low)
        value = shape(t, low, noise)
        # Ataque e término suaves, sem salto DC ou clique de corte.
        envelope = min(1, t / .004, (seconds - t) / .025)
        samples.append(value * max(0, envelope))
    peak = max(abs(v) for v in samples) or 1
    gain = .72 / peak
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as wav:
        wav.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        wav.writeframes(b''.join(struct.pack('<h', round(v * gain * 32767)) for v in samples))


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    render('passo_pedra', .19, lambda t,n,h: tone(t,85,35,.65)+n*math.exp(-22*t)+h*.09*math.exp(-45*t))
    render('passo_agua', .29, lambda t,n,h: n*math.exp(-10*t)*(.65+.35*math.sin(t*95))+tone(t,480-450*t,18,.12))
    render('soco_ar', .18, lambda t,n,h: n*math.sin(math.pi*t/.18)**2 + tone(t,100,24,.14))
    render('lamina_ar', .30, lambda t,n,h: (n+.12*h)*math.sin(math.pi*t/.30)**2 + tone(t,1700,19,.06))
    render('impacto', .25, lambda t,n,h: tone(t,64,22,.8)+tone(t,140,35,.2)+n*math.exp(-24*t))
    render('impacto_critico', .43, lambda t,n,h: tone(t,47,13,.8)+tone(t,116,22,.28)+n*math.exp(-15*t)+tone(t,790,20,.07))
    render('esquiva', .40, lambda t,n,h: n*math.sin(math.pi*t/.40)**2 + tone(t,75,18,.1))
    render('cura_ampola', .85, lambda t,n,h: tone(t,660,6,.45)+tone(t,990,5,.25)+tone(max(0,t-.15),1320,7,.16)+n*.16*math.exp(-6*t))
    render('coleta', .55, lambda t,n,h: tone(t,780,10,.4)+tone(max(0,t-.08),1170,10,.25))
    render('bau_abertura', .65, lambda t,n,h: tone(t,120,18,.5)+n*.4*math.exp(-3*t)+tone(t,280+40*math.sin(t*11),5,.15))
    render('portao_ferro', 1.6, lambda t,n,h: n*.5*math.sin(math.pi*t/1.6)**.5+tone(t,170,1.8,.15)+tone(t,473,2.5,.10)+tone(t,79,16,.5))
    render('morte', 1.5, lambda t,n,h: tone(t,65,3,.55)+tone(t,97,3.5,.22)+n*.23*math.exp(-3*t))
    render('descanso_lanterna', 1.2, lambda t,n,h: tone(t,220,3,.4)+tone(t,330,3.2,.23)+tone(t,554,4,.1)+n*.18*math.exp(-4*t))
    print('13 sons WAV mono, 44.1 kHz / 16 bits:', OUT)
