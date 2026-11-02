import math, json
W="#f4f5f1"; A="url(#acc)"; C=512
def polar(r,deg): a=math.radians(deg); return (C+r*math.cos(a), C+r*math.sin(a))
def f(p): return f"{p[0]:.1f} {p[1]:.1f}"

# A. Slice: a disk with one wedge pulled out (the space you reclaim).
def slice_():
    r=230; a0,a1=-90,-30      # wedge from 12 o'clock to 2 o'clock
    off=40; mid=math.radians((a0+a1)/2); dx,dy=off*math.cos(mid),off*math.sin(mid)
    body=f'<path d="M{C} {C} L{f(polar(r,a1))} A{r} {r} 0 1 1 {f(polar(r,a0))} Z" fill="{W}"/>'
    w0=polar(r,a0); w1=polar(r,a1)
    wedge=f'<path d="M{C+dx:.1f} {C+dy:.1f} L{w0[0]+dx:.1f} {w0[1]+dy:.1f} A{r} {r} 0 0 1 {w1[0]+dx:.1f} {w1[1]+dy:.1f} Z" fill="{A}"/>'
    return body+wedge, body.replace(W,"#000")+wedge.replace(A,"#000")

# B. Lift-out: a 2x2 grid of blocks with one lifted out of place.
def liftout():
    s=196; g=44; o=C-(2*s+g)/2; rr=52
    out=[]; mono=[]
    for (cx,cy) in [(0,0),(0,1),(1,1)]:
        x=o+cx*(s+g); y=o+cy*(s+g)
        out.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{s}" height="{s}" rx="{rr}" fill="{W}"/>')
    x=o+(s+g)+34; y=o-34
    lift=f'<rect x="{x:.1f}" y="{y:.1f}" width="{s}" height="{s}" rx="{rr}" fill="{A}"/>'
    body="".join(out)
    return body+lift, body.replace(W,"#000")+lift.replace(A,"#000")

# C. Freed slot: three storage bars, the middle one empty.
def freed():
    w=430; h=96; g=40; x=C-w/2; y0=C-(3*h+2*g)/2
    bars=[f'<rect x="{x}" y="{y0}" width="{w}" height="{h}" rx="{h/2}" fill="{W}"/>',
          f'<rect x="{x+11}" y="{y0+h+g+11}" width="{w-22}" height="{h-22}" rx="{(h-22)/2}" fill="none" stroke="{A}" stroke-width="22"/>',
          f'<rect x="{x}" y="{y0+2*(h+g)}" width="{w}" height="{h}" rx="{h/2}" fill="{W}"/>']
    mono=[bars[0].replace(W,"#000"), f'<rect x="{x}" y="{y0+h+g+28}" width="{w*0.42}" height="{h-56}" rx="{(h-56)/2}" fill="#000"/>', bars[2].replace(W,"#000")]
    return "".join(bars), "".join(mono)

# D. Whirl: one stroke that turns inward and ends in a point.
def whirl():
    sw=88
    p0=polar(236,-150); p1=polar(236,60); p2=polar(118,200); 
    d=f'M{f(p0)} A236 236 0 1 1 {f(p1)} A177 177 0 0 1 {f(p2)}'
    body=f'<path d="{d}" fill="none" stroke="{W}" stroke-width="{sw}" stroke-linecap="round"/>'
    dot=f'<circle cx="{C+18}" cy="{C-18}" r="50" fill="{A}"/>'
    return body+dot, body.replace(W,"#000")+dot.replace(A,"#000")

# E. Folder, minus: a project folder with a bar taken out of it.
def folder():
    x0,x1=262,762; y0,y1=300,724; tab=(262,250,470,300)
    d=(f"M{x0} {y0+20} Q{x0} {y0-50} {x0+60} {y0-50} L{tab[2]-40} {y0-50} Q{tab[2]-10} {y0-50} {tab[2]+10} {y0-20} "
       f"L{tab[2]+30} {y0} L{x1-50} {y0} Q{x1} {y0} {x1} {y0+50} L{x1} {y1-50} Q{x1} {y1} {x1-50} {y1} L{x0+50} {y1} Q{x0} {y1} {x0} {y1-50} Z")
    body=f'<path d="{d}" fill="{W}"/>'
    bar=f'<rect x="{C-150}" y="{(y0+y1)/2-36+10}" width="300" height="72" rx="36" fill="{A}"/>'
    hole=f'<rect x="{C-150}" y="{(y0+y1)/2-36+10}" width="300" height="72" rx="36" fill="#000" />'
    mono=f'<mask id="m"><rect width="1024" height="1024" fill="white"/><rect x="{C-150}" y="{(y0+y1)/2-36+10}" width="300" height="72" rx="36" fill="black"/></mask><path d="{d}" fill="#000" mask="url(#m)"/>'
    return body+bar, mono

# F. Drop: a droplet with a clean highlight; flush, rendered as water.
def drop():
    d=f"M{C} 236 C{C+40} 330 {C+214} 470 {C+214} 600 A214 214 0 0 1 {C-214} 600 C{C-214} 470 {C-40} 330 {C} 236 Z"
    body=f'<path d="{d}" fill="{A}"/>'
    hi=f'<path d="M{C-120} 600 A122 122 0 0 0 {C-10} 716" fill="none" stroke="{W}" stroke-width="42" stroke-linecap="round"/>'
    mono=f'<mask id="md"><rect width="1024" height="1024" fill="white"/><path d="M{C-120} 600 A122 122 0 0 0 {C-10} 716" fill="none" stroke="black" stroke-width="56" stroke-linecap="round"/></mask><path d="{d}" fill="#000" mask="url(#md)"/>'
    return body+hi, mono

CONCEPTS=[("A","Slice",slice_,"A disk with its wedge pulled out: the space you get back."),
          ("B","Lift-out",liftout,"Blocks on a grid, one lifted clean away: remove what isn't yours."),
          ("C","Freed slot",freed,"Storage bars with the middle one emptied: room made."),
          ("D","Whirl",whirl,"One stroke turning inward to a point: flush, kept calm."),
          ("E","Folder minus",folder,"A folder with a bar taken out: literal and instant."),
          ("F","Drop",drop,"A water drop with a single highlight: clean, ownable colour.")]
defs='''<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2c2e"/><stop offset="1" stop-color="#121314"/></linearGradient>
<linearGradient id="acc" gradientUnits="userSpaceOnUse" x1="250" y1="800" x2="800" y2="220"><stop offset="0" stop-color="#2f80ff"/><stop offset="1" stop-color="#6cb8ff"/></linearGradient>
</defs>'''
tile='<rect x="100" y="100" width="824" height="824" rx="186" fill="url(#bg)"/><rect x="100.5" y="100.5" width="823" height="823" rx="185.5" fill="none" stroke="#fff" stroke-opacity=".09"/>'
data={}
for key,name,fn,desc in CONCEPTS:
    art,mono=fn()
    data[key]=(name,desc,art,mono)
    open(f"{key}-{name.lower().replace(' ','-')}.svg","w").write(f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">{defs}{tile}{art}</svg>')
    open(f"{key}-tray.svg","w").write(f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="150 150 724 724">{mono}</svg>')

# Board: per concept, a light and a dark column showing every real use.
cw=430; H=560
parts=[]
for row,(key,(name,desc,art,mono)) in enumerate(data.items()):
    col=row%3; r=row//3
    x0=40+col*cw; y0=40+r*H
    parts.append(f'<rect x="{x0}" y="{y0}" width="{cw-20}" height="{H-30}" rx="22" fill="#faf9f6" stroke="#e2e1db"/>')
    parts.append(f'<rect x="{x0}" y="{y0+330}" width="{cw-20}" height="{H-360}" fill="#191b19"/>')
    parts.append(f'<rect x="{x0}" y="{y0+H-60}" width="{cw-20}" height="30" fill="#191b19"/>')
    parts.append(f'<svg x="{x0+105}" y="{y0+40}" width="200" height="200" viewBox="0 0 1024 1024">{tile}{art}</svg>')
    parts.append(f'<text x="{x0+24}" y="{y0+278}" font-family="Helvetica" font-weight="700" font-size="22" fill="#1d1e1c">{key}. {name}</text>')
    words=desc.split(); lines=[""]
    for w in words:
        if len(lines[-1])+len(w)>44: lines.append(w)
        else: lines[-1]=(lines[-1]+" "+w).strip()
    for j,l in enumerate(lines): parts.append(f'<text x="{x0+24}" y="{y0+302+j*18}" font-family="Helvetica" font-size="14" fill="#62655e">{l}</text>')
    # dark strip: tile sizes, tray in a menu bar, nav lockup
    by=y0+370
    parts.append(f'<svg x="{x0+24}" y="{by}" width="64" height="64" viewBox="0 0 1024 1024">{tile}{art}</svg>')
    parts.append(f'<svg x="{x0+100}" y="{by+16}" width="32" height="32" viewBox="0 0 1024 1024">{tile}{art}</svg>')
    parts.append(f'<svg x="{x0+144}" y="{by+24}" width="16" height="16" viewBox="0 0 1024 1024">{tile}{art}</svg>')
    parts.append(f'<rect x="{x0+180}" y="{by+18}" width="206" height="28" rx="6" fill="#2b2e2b"/>')
    parts.append(f'<svg x="{x0+192}" y="{by+23}" width="18" height="18" viewBox="150 150 724 724">{mono.replace("#000","#f0efeb")}</svg>')
    parts.append(f'<text x="{x0+222}" y="{by+37}" font-family="Helvetica" font-size="12" fill="#a8ada4">menu bar · 18 px</text>')
    # nav lockups: light and dark
    parts.append(f'<svg x="{x0+24}" y="{by+84}" width="26" height="26" viewBox="0 0 1024 1024">{tile}{art}</svg>')
    parts.append(f'<text x="{x0+58}" y="{by+104}" font-family="Helvetica" font-weight="700" font-size="19" fill="#f0efeb">Gigaflush</text>')
    parts.append(f'<svg x="{x0+204}" y="{by+87}" width="20" height="20" viewBox="150 150 724 724">{mono.replace("#000","#f0efeb")}</svg>')
    parts.append(f'<text x="{x0+232}" y="{by+104}" font-family="Helvetica" font-weight="700" font-size="19" fill="#f0efeb">Gigaflush</text>')
    parts.append(f'<svg x="{x0+24}" y="{y0+H-56}" width="0" height="0"/>')
open("board.svg","w").write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{40+3*cw}" height="{40+2*H}" viewBox="0 0 {40+3*cw} {40+2*H}">{defs}<rect width="100%" height="100%" fill="#efeee9"/>{"".join(parts)}</svg>')
