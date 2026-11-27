# togli_firma.py <entrata.mp4> <uscita.mp4> [t1,t2,... per la prova]
# Toglie la firma «@STACAPPELLA» da un video già fatto, senza rifare il rendering. La firma era una scritta bianca semitrasparente con
# l'ombra, sempre uguale e nello stesso punto: dalla stessa scritta disegnata su nero e su bianco (gioco7-firma) si ricavano la sua
# trasparenza e il suo colore, e in ogni fotogramma si toglie esattamente (nella luminosità e nel colore del video, senza conversioni);
# poi un filtro che leviga solo le differenze piccolissime (l'ombra delle lettere lasciata dalla compressione) e lascia i bordi veri.
import sys, subprocess, numpy as np, cv2
IN, OUT = sys.argv[1], sys.argv[2]; PROVA = [float(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 else None
W, H = 1080, 1920
m = np.load('/home/user/lavoro3d/out/gioco7-firma/matte.npz'); bx = m['box']
A = np.zeros((H, W)); CC = np.zeros((H, W, 3)); A[bx[2]:bx[3], bx[0]:bx[1]] = m['a']; CC[bx[2]:bx[3], bx[0]:bx[1]] = m['C']
x0, x1, y0, y1 = bx[0] - 8, bx[1] + 8, bx[2] - 8, bx[3] + 8; x0 -= x0 % 2; y0 -= y0 % 2; x1 += x1 % 2; y1 += y1 % 2
k = 219 / 255; Ay = A[y0:y1, x0:x1]; Cy = k * (0.2126 * CC[..., 0] + 0.7152 * CC[..., 1] + 0.0722 * CC[..., 2])[y0:y1, x0:x1]
Ac = Ay.reshape((y1 - y0) // 2, 2, (x1 - x0) // 2, 2).mean((1, 3))
zona = cv2.GaussianBlur(cv2.dilate((Ay > 0.015).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(np.float32), (7, 7), 2)
zc = cv2.resize(zona, (zona.shape[1] // 2, zona.shape[0] // 2), interpolation=cv2.INTER_AREA)
MC = cv2.dilate((Ac > 0.02).astype(np.uint8), np.ones((3, 3), np.uint8))
def pulisci(b):
    Y = b[:W * H].reshape(H, W); U = b[W * H:W * H * 5 // 4].reshape(H // 2, W // 2); V = b[W * H * 5 // 4:].reshape(H // 2, W // 2)
    Yr = Y[y0:y1, x0:x1].astype(np.float32); Yb = 16 + (Yr - 16 - Cy) / np.maximum(1 - Ay, 0.35)
    med = cv2.medianBlur(np.clip(Yb, 0, 255).astype(np.uint8), 3).astype(np.float32); g = np.clip((Ay - 0.3) / 0.2, 0, 1); Yb = Yb * (1 - g) + med * g
    lis = cv2.bilateralFilter(np.clip(Yb, 0, 255).astype(np.float32), 9, 9.0, 3.5); Yb = Yb * (1 - zona) + lis * zona
    Y[y0:y1, x0:x1] = np.clip(np.rint(Yb), 16, 235).astype(np.uint8)
    sl = (slice(y0 // 2, y1 // 2), slice(x0 // 2, x1 // 2))
    for P in (U, V):                         # il colore (a metà risoluzione): la scritta era bianca e nera, il colore sotto si ricostruisce dai bordi
        c = np.clip(128 + (P[sl].astype(np.float32) - 128) / np.maximum(1 - Ac, 0.35), 16, 240).astype(np.uint8)
        ci = cv2.inpaint(c, MC, 3, cv2.INPAINT_TELEA).astype(np.float32); c = c.astype(np.float32) * (1 - zc) + ci * zc
        P[sl] = np.clip(np.rint(c), 16, 240).astype(np.uint8)
    return b
if PROVA:
    import PIL.Image as Im
    crops = []
    for t in PROVA:
        b = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', IN, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], capture_output=True).stdout, np.uint8).copy()
        prima = b.copy(); dopo = pulisci(b)
        def rgb(bb):
            p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', f'{W}x{H}', '-i', '-', '-vf', 'scale=in_color_matrix=bt709:in_range=tv,format=rgb24', '-f', 'rawvideo', '-'], input=bb.tobytes(), capture_output=True).stdout
            return np.frombuffer(p, np.uint8).reshape(H, W, 3)
        pad = 40; crops.append(np.vstack([rgb(prima)[y0 - pad:y1 + pad, x0 - pad:x1 + pad], rgb(dopo)[y0 - pad:y1 + pad, x0 - pad:x1 + pad]]))
    n = len(crops); r = (n + 3) // 4
    Im.fromarray(np.vstack([np.hstack([np.pad(c, ((0, 6), (0, 6), (0, 0))) for c in (crops[i * 4:i * 4 + 4] + [np.zeros_like(crops[0])] * 4)[:4]]) for i in range(r)])).save(OUT)
    sys.exit()
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', IN, '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', f'{W}x{H}', '-r', '30', '-i', '-', '-i', IN, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17',
                        '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-c:a', 'copy', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
n = W * H * 3 // 2; f = 0
while True:
    b = dec.stdout.read(n)
    if len(b) < n: break
    enc.stdin.write(pulisci(np.frombuffer(b, np.uint8).copy()).tobytes()); f += 1
enc.stdin.close(); enc.wait(); print('fotogrammi', f)
