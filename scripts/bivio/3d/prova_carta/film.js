// prova dell'immagine della carta A (la mano sulla maniglia): tre inquadrature per fotogramma, in formato largo come nella carta
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE } from './sets/stile.js';
import { ingressoSet } from './sets/testimone_set.js';
const { W, H } = M; let SI = null;
function scatto(c, set, o, x, y, wd, hg) { c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, wd, hg); c.clip(); set.camera.aspect = wd / hg; c.scale(wd / W, hg / H); G.renderSet(c, set, 0, 0, o); c.restore(); }
const C = [0.295, 1.03, -2.46];
const TU = (x = 0.08, z = -1.96) => ({ pos: [x, 0, z], yaw: Math.PI, lean: 0.14, headPitch: 0.3,
  armL: { mondo: [0.3, 1.058, -2.375], gomitoM: [0.5, -0.8, 0.4], ditaM: [0, -0.12, -1], dorsoM: [0, 1, -0.12], mano: 'leva' } });
const L1 = { amb: 0.26, fronte: 0.2, luce: { pos: [-0.05, 1.5, -2.15], k: 0.8 } }, L2 = { amb: 0.2, fronte: 0.14, luce: { pos: [-0.1, 1.45, -2.2], k: 1.1, colore: '#FFD9A8' } };
const VISTE = [
  { d: [-0.25, 0.25, 0.38], s: [-0.05, -0.04, 0], fov: 32, ...L1 }, { d: [-0.2, 0.36, 0.3], s: [-0.05, -0.04, 0], fov: 36, ...L1 }, { d: [-0.3, 0.3, 0.32], s: [-0.05, -0.04, 0], fov: 32, ...L1 },
  { d: [-0.25, 0.25, 0.38], s: [-0.05, -0.04, 0], fov: 32, ...L2 }, { d: [-0.22, 0.2, 0.3], s: [-0.04, -0.03, 0], fov: 34, ...L2 }, { d: [-0.3, 0.3, 0.32], s: [-0.05, -0.04, 0], fov: 28, ...L2 },
];
M.film({ fonts: [M.font(20, 700, 'Display')], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; SI = ingressoSet(); },
  draw(ctx, u, t) { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); const n = Math.floor(t) * 3;
    for (let i = 0; i < 3; i++) { const v = VISTE[n + i]; if (!v) continue;
      scatto(ctx, SI, { cam: [C[0] + v.d[0], C[1] + v.d[1], C[2] + v.d[2]], look: [C[0] + v.s[0], C[1] + v.s[1], C[2] + v.s[2]], fov: v.fov, piedi: 1, telefono: 0, occhio: 0.9, amb: v.amb, fronte: v.fronte, luce: v.luce, tu: TU() }, 0, 20 + i * 630, 1080, 603);
      ctx.fillStyle = '#fff'; ctx.font = '700 28px Display'; ctx.fillText(String(n + i + 1), 16, 56 + i * 630); } } });
