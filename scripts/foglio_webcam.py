"""Foglio di fotogrammi della sola webcam di uno Short già montato (fascia alta 1080x700), 2 al secondo, con il tempo.
Serve a trovare i momenti da mettere in focus (Blur che fissa la camera o reagisce). Uso: python foglio_webcam.py short.mp4 foglio.png"""
import subprocess, sys, json
from PIL import Image, ImageDraw, ImageFont
mp4, out = sys.argv[1], sys.argv[2]
d = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",mp4],capture_output=True,text=True).stdout)
raw = subprocess.run(["ffmpeg","-v","error","-i",mp4,"-vf","fps=2,crop=1080:700:0:0,scale=240:156","-f","rawvideo","-pix_fmt","rgb24","-"],capture_output=True).stdout
n = len(raw)//(240*156*3); cols=8; rows=(n+cols-1)//cols
F = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",16)
sh = Image.new("RGB",(cols*240,rows*156))
for i in range(n):
    im = Image.frombytes("RGB",(240,156),raw[i*240*156*3:(i+1)*240*156*3])
    ImageDraw.Draw(im).text((4,2),f"{(i+0.5)/2:.1f}",fill=(255,255,0),font=F,stroke_width=2,stroke_fill=(0,0,0))
    sh.paste(im,((i%cols)*240,(i//cols)*156))
sh.save(out); print(out, n, "frame", round(d,1), "s")
