"""Voce narrante di un episodio (Kokoro, gratis) + tempi parola per parola. Uso: python voce.py cartella_episodio
Scrive voce.wav (48 kHz), tempi.json (inizio/fine di ogni riga) e parole.json (tempi di ogni parola con il testo del copione)."""
import json, sys, subprocess
from pathlib import Path
import numpy as np, soundfile as sf
D=Path(sys.argv[1]); G=Path(__file__).resolve().parent.parent/"guida"
sys.path.insert(0,str(G))
from guida import align
from kokoro_onnx import Kokoro
k=Kokoro(str(G/"kokoro.onnx"),str(G/"voices.bin")); SR=24000
def tts(t,speed=0.93):
    a,_=k.create(t,voice="im_nicola",speed=speed,lang="it"); a=np.asarray(a,np.float32)
    nz=np.where(np.abs(a)>0.01)[0]; return a[max(0,nz[0]-600):nz[-1]+1800] if len(nz) else a
def res(x,f):  # cambia insieme altezza e durata (f>1 = più acuto e più veloce)
    n=int(len(x)/f); return np.interp(np.linspace(0,len(x)-1,n),np.arange(len(x)),x).astype(np.float32)
def lowpass(x,fc):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); return np.fft.irfft(X/(1+(f/fc)**4),len(x)).astype(np.float32)
ep=json.loads((D/"episodio.json").read_text()); out=[]; tempi=[]; testi=[]; t=0.5
buf=[np.zeros(int(t*SR),np.float32)]
for r in ep["righe"]:
    st=t; pezzi=[]; testo=r["voce"]
    if r["voce"]: pezzi.append(tts(r["voce"])/1.0)
    if r.get("grido"):   # urlo: più acuto, più forte, saturato, asciutto (nel bosco non c'è eco)
        g=res(tts(r["grido"],1.0),1.07); g=np.tanh(g/np.abs(g).max()*2.6)*0.98
        pezzi+= [np.zeros(int(0.12*SR),np.float32), g]; testo+=" "+r["sottotitolo_grido"]
    if r.get("citazione"): pezzi+=[np.zeros(int(0.25*SR),np.float32), tts(r["citazione"],0.88)]; testo+=" «"+r["citazione"]+"»"
    if r.get("lontana"):   # la voce del bosco la dice il narratore: piano, lontana, ovattata
        q=lowpass(tts(r["lontana"],0.84),2200)*0.55
        pezzi+=[np.zeros(int(0.45*SR),np.float32), q]; testo+=" «"+r["lontana"]+"»"
    a=np.concatenate(pezzi) if pezzi else np.zeros(int(r.get("silenzio",2)*SR),np.float32)
    if pezzi: a=a/np.abs(a).max()*0.9 if not r.get("lontana") else a/np.abs(a[:len(pezzi[0])]).max()*0.9
    pausa=0.0 if r.get("grido") else (0.25 if not pezzi else 0.38)
    buf+=[a,np.zeros(int(pausa*SR),np.float32)]; t+=len(a)/SR+pausa
    tempi.append({"id":r["id"],"inizio":round(st,3),"fine":round(t,3),"voce_fine":round(st+len(a)/SR,3)}); testi.append(testo)
buf.append(np.zeros(int(1.2*SR),np.float32)); voce=np.concatenate(buf)
v48=np.interp(np.arange(0,len(voce),0.5),np.arange(len(voce)),voce).astype(np.float32)
sf.write(D/"voce.wav",v48,48000)
(D/"tempi.json").write_text(json.dumps({"righe":tempi,"totale":round(len(voce)/SR,3)},indent=1))
del k
from faster_whisper import WhisperModel
m=WhisperModel("medium",device="cpu",compute_type="int8"); parole=[]
a16=np.interp(np.arange(0,len(voce),1.5),np.arange(len(voce)),voce).astype(np.float32)
for r,tm,txt in zip(ep["righe"],tempi,testi):
    if not txt.strip(): parole.append([]); continue
    seg=a16[int(tm["inizio"]*16000):int(tm["voce_fine"]*16000)]
    segs,_=m.transcribe(seg,language="it",word_timestamps=True,beam_size=5,initial_prompt=txt)
    heard=[(w.start,w.end,w.word.strip()) for s in segs for w in s.words]
    parole.append([[round(tm["inizio"]+s,3),round(tm["inizio"]+e,3),w] for s,e,w in align(txt,heard)] if heard else [])
(D/"parole.json").write_text(json.dumps(parole,ensure_ascii=False))
print("totale",round(len(voce)/SR,1),"s; righe:",[ (x["id"],round(x["fine"]-x["inizio"],1)) for x in tempi])
