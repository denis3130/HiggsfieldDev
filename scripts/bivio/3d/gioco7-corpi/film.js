// prova dei corpi interi a tavola: un secondo per inquadratura
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE } from './sets/look.js';
import { TAVOLO } from './sets/sala.js';
import { sala7Set } from './sets/sala7.js';
import { sette, seduto, siedi, NOMI } from './sets/tavola7.js';
const { W, H } = M; const T = TAVOLO.y;
const VISTE = [
  { cam: [-0.2, 1.3, 1.15], look: [-0.5, 0.78, 0.92], fov: 38 },
  { cam: [0.2, 1.3, -0.75], look: [0.5, 0.78, -0.92], fov: 38 },
  { cam: [0.1, 1.28, 0.95], look: [-0.9, 1.15, 0.95], fov: 30 },
  { cam: [-0.1, 1.18, -0.95], look: [0.9, 1.05, -0.95], fov: 34 },
];
let S = null, P = null;
M.film({
  fonts: [], samples: () => 1,
  async init() { await G.initGL({ exposure: 1.05 }); S = sala7Set(); P = await sette(S.scene); NOMI.forEach((n, i) => siedi(P[n], seduto(i))); },
  draw(ctx, u, t) { const v = VISTE[Math.min(VISTE.length - 1, Math.floor(t))]; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); G.renderSet(ctx, S, t, u, v); },
});
