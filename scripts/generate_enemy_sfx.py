"""Efeitos dos quatro inimigos comuns. Síntese original, sem samples externos."""
from generate_sfx import render, tone, OUT
import math
OUT.mkdir(parents=True, exist_ok=True)

def metal(t, decay=9):
    return tone(t,327,decay,.35)+tone(t,791,decay*1.3,.22)+tone(t,1327,decay*1.7,.1)

def rasp(t,n,base=85,decay=6):
    return (n*.65*(.6+.4*math.sin(t*base*2*math.pi))+tone(t,base,decay,.23))*math.exp(-decay*t)

render('prisioneiro_alerta',.65,lambda t,n,h: rasp(t,n)+metal(t,12)*.35)
render('prisioneiro_corrente',.48,lambda t,n,h: n*.5*math.sin(math.pi*t/.48)**2+metal(t,7)*(.7+.3*math.sin(t*65)))
render('prisioneiro_esmagamento',.56,lambda t,n,h: tone(t,53,13,.7)+metal(t,8)+n*math.exp(-15*t))
render('prisioneiro_morte',.85,lambda t,n,h: rasp(t,n,63,5)+metal(max(0,t-.22),12)*.45)
render('carcereiro_alerta',.75,lambda t,n,h: rasp(t,n,53,4)+tone(t,107,5,.16))
render('carcereiro_gancho',.57,lambda t,n,h: metal(t,5)*.7+n*math.sin(math.pi*t/.57)**2+tone(t,120,10,.2))
render('carcereiro_morte',.95,lambda t,n,h: tone(t,44,7,.6)+rasp(t,n,49,4)+metal(max(0,t-.18),9)*.4)
render('rato_alerta',.28,lambda t,n,h: tone(t,1600-1200*t,15,.45)+tone(t,2350-900*t,20,.15)+n*.08)
render('rato_mordida',.16,lambda t,n,h: tone(t,980,28,.25)+n*math.exp(-27*t)+tone(t,190,24,.3))
render('rato_morte',.38,lambda t,n,h: tone(t,1450-2000*t,10,.4)+tone(t,95,17,.2)+n*.16*math.exp(-10*t))
render('suplicante_alerta',.78,lambda t,n,h: rasp(t,n,110,4)*(.7+.3*math.sin(t*32)))
render('suplicante_arremesso',.42,lambda t,n,h: n*math.sin(math.pi*t/.42)**2+tone(t,240-250*t,9,.3))
render('suplicante_morte',.8,lambda t,n,h: rasp(t,n,71,6)+tone(t,115,8,.3)+n*.3*math.exp(-5*t))
render('lodo_respingo',.37,lambda t,n,h: n*math.exp(-10*t)*(.65+.35*math.sin(t*100))+tone(t,320-490*t,15,.3))
print('14 sons de inimigos criados.')
