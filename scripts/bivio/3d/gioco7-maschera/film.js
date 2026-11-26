// prova della maschera nuova: l'uomo mascherato come si vede nel televisore a tutto schermo (0-2 s) e la maschera da vicino senza filtro (2-4 s)
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { mascheratoSet, crt, scatta } from './sets/extra7.js';
const { W, H } = M;
let MS = null, IMG = [];
M.film({
  fonts: [], samples: () => 1,
  async init() { await G.initGL({ exposure: 1.05 }); MS = await mascheratoSet(); IMG = [[0, 0, 0], [0.05, 0.12, 0.03]].map((r, i) => scatta(MS, { cam: [0.02 * i, 1.56, 1.3 - 0.05 * i], look: [0, 1.55, 0], fov: 44, testa: r }, 4 / 3)); },
  draw(ctx, u, t) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (t < 2) { const hh = H, ww = hh / 0.75; crt(ctx, IMG[t < 1 ? 0 : 1], t, (W - ww) / 2, 0, ww, hh, { neve: 0.04 }); }
    else G.renderSet(ctx, MS, t, u, { cam: [0.25, 1.6, 0.75], look: [0, 1.56, 0], fov: 30, testa: [0, 0.2, 0] });
  },
});
