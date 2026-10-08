"""Sons originais dos bosses e dois loops de ambiente, sem samples externos."""
from generate_sfx import render, tone, OUT, RATE
import math, random, wave, struct

OUT.mkdir(parents=True, exist_ok=True)
render('ceifador_despertar',1.6,lambda t,n,h: tone(t,73,2,.5)+tone(t,111,2,.25)+n*.3*math.exp(-2*t))
render('ceifador_foice',.65,lambda t,n,h: n*math.sin(math.pi*t/.65)**2+tone(t,470,7,.18)+tone(t,1173,10,.08))
render('ceifador_arremesso',.85,lambda t,n,h: n*math.sin(math.pi*t/.85)**2*(.7+.3*math.sin(t*40))+tone(t,310,6,.2))
render('ceifador_teleporte',.65,lambda t,n,h: n*math.sin(math.pi*t/.65)**2+tone(t,180+210*t,5,.25))
render('ceifador_fase',1.5,lambda t,n,h: tone(t,61,2.6,.5)+tone(t,92,3,.3)+n*.5*math.exp(-2*t))
render('ceifador_morte',2,lambda t,n,h: tone(t,55,2,.5)+tone(t,82,2.5,.3)+n*.35*math.exp(-2.5*t))
render('raiz_mordida',.46,lambda t,n,h: tone(t,72,16,.6)+n*math.exp(-10*t)+h*.1*math.exp(-22*t))
render('raiz_varredura',.65,lambda t,n,h: n*math.sin(math.pi*t/.65)**2+tone(t,83,8,.3))
render('raiz_estacas',.8,lambda t,n,h: n*math.exp(-5*t)*(.6+.4*math.sin(t*80))+tone(t,54,8,.5))
render('raiz_enterrar',1.1,lambda t,n,h: n*math.sin(math.pi*t/1.1)**2+tone(t,48,3,.4))
render('raiz_emergir',1.2,lambda t,n,h: tone(t,42,5,.6)+n*.8*math.exp(-3*t)+h*.15*math.exp(-7*t))
render('raiz_cuspe',.6,lambda t,n,h: n*math.sin(math.pi*t/.6)**2+tone(t,210-100*t,8,.25))
render('raiz_fase',1.1,lambda t,n,h: tone(t,57,4,.4)+n*.7*math.exp(-3*t)*(.6+.4*math.sin(t*110)))
render('raiz_morte',2,lambda t,n,h: tone(t,39,2.5,.6)+n*.6*math.exp(-2*t)*(.7+.3*math.sin(t*39)))

# Costura por sobreposição: a saída acaba no ponto anterior ao início,
# sem silêncio periódico nem salto de amplitude no loop.
def ambience(name, wet):
    rng=random.Random(113 if wet else 112);samples=[];low=0;slow=0
    for i in range(RATE*13):
        t=i/RATE;noise=rng.uniform(-1,1)
        low+=.025*(noise-low);slow+=.001*(noise-slow)
        wind=(slow*4+low*.35)*(.8+.2*math.sin(t*.9))
        water=low*.9*(.8+.2*math.sin(t*2.1)) if wet else 0
        # Gotas esparsas, com ressonância curta; sem apito contínuo.
        dt=t%2.73
        drip=tone(dt,810,24,.025) if wet else 0
        samples.append(wind+water+drip)
    overlap=RATE;tail=samples[-overlap:];head=samples[:overlap]
    mixed=samples[overlap:-overlap]+[a*(1-i/overlap)+b*i/overlap for i,(a,b) in enumerate(zip(tail,head))]
    peak=max(map(abs,mixed));pcm=[round(v/peak*.65*32767) for v in mixed]
    path=OUT.parent/'ambience';path.mkdir(exist_ok=True)
    with wave.open(str(path/f'{name}.wav'),'wb') as w:
        w.setparams((1,2,RATE,0,'NONE','not compressed'));w.writeframes(struct.pack('<'+'h'*len(pcm),*pcm))
ambience('prisao_vento',False)
ambience('esgoto_agua',True)
print('14 efeitos de bosses + 2 ambientes criados.')
