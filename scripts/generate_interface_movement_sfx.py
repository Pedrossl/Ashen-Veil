"""Interface, movimentação e mecanismos: síntese original sem samples."""
from generate_sfx import render, tone, OUT
import math
OUT.mkdir(parents=True, exist_ok=True)
render('interface_navegar',.10,lambda t,n,h: tone(t,420,45,.4)+n*.08*math.exp(-40*t))
render('interface_confirmar',.24,lambda t,n,h: tone(t,480,17,.4)+tone(t,720,19,.2))
render('inventario_abrir',.24,lambda t,n,h: n*math.sin(math.pi*t/.24)**2*.35+tone(t,240,16,.25))
render('inventario_fechar',.18,lambda t,n,h: n*.3*math.exp(-18*t)+tone(t,160,23,.35))
render('equipar_arma',.28,lambda t,n,h: tone(t,360,18,.3)+tone(t,890,23,.12)+n*.5*math.exp(-19*t))
render('escada_madeira',.18,lambda t,n,h: tone(t,175,28,.5)+tone(t,293,35,.15)+n*.3*math.exp(-26*t))
render('aterrissagem_pedra',.30,lambda t,n,h: tone(t,70,18,.6)+n*.8*math.exp(-16*t))
render('aterrissagem_agua',.48,lambda t,n,h: n*math.exp(-8*t)*(.7+.3*math.sin(t*67))+tone(t,230-170*t,12,.2))
render('porta_trancada',.35,lambda t,n,h: tone(t,230,20,.35)+tone(t,613,18,.2)+n*math.exp(-16*t))
print('9 efeitos criados.')
