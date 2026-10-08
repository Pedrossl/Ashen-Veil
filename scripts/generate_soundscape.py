"""Trilhas e ambiente originais sintetizados; Python padrão, sem samples."""
from generate_sfx import OUT, RATE, render, tone
import math, random, wave, struct
from pathlib import Path

def save(path, values):
    path.parent.mkdir(parents=True,exist_ok=True)
    peak=max(map(abs,values)) or 1
    with wave.open(str(path),'wb') as w:
        w.setparams((1,2,RATE,0,'NONE','not compressed'))
        w.writeframes(struct.pack('<'+'h'*len(values),*(round(v/peak*.68*32767) for v in values)))

def music(name, basses, melody, beat, percussion):
    duration=beat*32; length=round(duration*RATE); data=[0.0]*length
    def note(start,duration,hz,amp,pluck=False):
        for i in range(round(duration*RATE)):
            t=i/RATE
            env=(1-math.exp(-t*(60 if pluck else 4)))*math.exp(-t*(3 if pluck else .7))
            env*=min(1,(duration-t)/.18)
            value=math.sin(2*math.pi*hz*t)+.23*math.sin(2*math.pi*hz*2*t)+.09*math.sin(2*math.pi*hz*3*t)
            data[(round(start*RATE)+i)%length]+=value*env*amp
    for bar,bass in enumerate(basses):
        start=bar*beat*8
        for ratio,gain in [(1,.26),(1.5,.12),(2,.08)]:note(start,beat*10,bass*ratio,gain)
        for j,ratio in enumerate(melody[bar]):note(start+j*beat*2,beat*3,bass*ratio,.15,True)
        if percussion:
            for j in range(8):note(start+j*beat,.45,48 if j%2==0 else 96,.16 if j%2==0 else .06,True)
    save(OUT.parent/'music'/f'{name}.wav',data)

music('exploracao_cinzas',[55,49,58.27,51.91],[[4,3,4.5,3],[4,3.56,3,2.67],[3,4,3.56,3],[4,3,2.67,3]],.9,False)
music('ceifador_lamento',[55,51.91,49,51.91],[[4,4.75,4.5,3],[4,3,4.75,4],[4,4.5,5.33,4.5],[4.75,4.5,3,4]],.6,True)
music('raiz_profundezas',[41.20,43.65,38.89,41.20],[[4,4.24,3,4],[3,4,4.24,3],[4,3,4.75,4],[4.24,3,4,3]],.7,True)
rng=random.Random(807)
for name,fire in [('fogo_proximo',True),('correntes_distantes',False)]:
    vals=[]; low=0
    for i in range(RATE*13):
        t=i/RATE;n=rng.uniform(-1,1);low+=.10*(n-low)
        if fire:
            dt=t%.733;v=low*.45+n*.025+tone(dt,125,80,.08)
        else:
            dt=t%3.71;v=(tone(dt,327,7,.3)+tone(dt,791,10,.15)+low*.10*math.exp(-8*dt))
        vals.append(v)
    n=RATE
    vals=vals[n:-n]+[a*(1-i/n)+b*i/n for i,(a,b) in enumerate(zip(vals[-n:],vals[:n]))]
    save(OUT.parent/'ambience'/f'{name}.wav',vals)
render('arena_portao_fechar',1.1,lambda t,n,h: tone(t,48,7,.6)+tone(t,227,8,.25)+n*.6*math.exp(-4*t))
render('arena_portao_abrir',1.6,lambda t,n,h: n*.5*math.sin(math.pi*t/1.6)**.5+tone(t,157,3,.25)+tone(t,419,4,.1))
render('vitoria_boss',2,lambda t,n,h: tone(t,220,2,.4)+tone(t,330,2.5,.24)+tone(t,440,3,.15))
print('3 trilhas, 2 loops localizados e 3 efeitos criados.')
