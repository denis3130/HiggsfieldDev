// laboratorio: la scala vista dall'alto, il portico, la porta che si apre (episodio 2, «Interno 11»)
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE } from './sets/stile.js';
import { scalaSet } from './sets/scala.js';
import { porticoSet } from './sets/portico.js';
import { ingressoSet } from './sets/testimone_set.js';
const { W, H } = M; let SC = null, PO = null, IN = null;
const corre = (s, t) => { const [x, y, z, h] = SC.percorso(s), f = s * 2.4; return { pos: [x, y, z], yaw: h, lean: 0.18, breathe: Math.sin(t * 6), fear: 1, browUp: 0.7, sad: 0.6, mouth: 0.16, open: 1, gambe: { aL: 0.5 * Math.sin(f), gL: 0.1 + 0.5 * Math.max(0, -Math.cos(f)), aR: -0.5 * Math.sin(f), gR: 0.1 + 0.5 * Math.max(0, Math.cos(f)) }, armL: { a: [-0.25, -0.05, 0.15] }, armR: { a: [0.25, -0.02, 0.05] } }; };
const APPOGGIATO = { pos: [0, 0.165, -0.2], yaw: Math.PI, lean: -0.08, headPitch: -0.25, blink: 1, breathe: 1, mouth: 0.25, open: 0.6, sad: 0.4, armL: { a: [-0.22, -0.2, -0.05] }, armR: { a: [0.22, -0.2, -0.05] } };
const ORECCHIO = { a: [0.12, 0.452, 0.082], gomito: [0.8, -1, -0.1], dita: [-0.1, 0.87, -0.48], dorso: [1, 0, -0.15], mano: 'orecchio' };
const VISTE = [
  ['S', (t) => ({ cam: [0.02, 13.8, 0.05], look: [0, 0, 0], fov: 50, tu: corre(3, t) })],
  ['S', (t) => ({ cam: [0.02, 13.8, 0.05], look: [0, 0, 0], fov: 50, tu: corre(13, t) })],
  ['S', (t) => ({ cam: [1.1, 10.9, -2.3], look: [0, 9.6, 0.4], fov: 60, tu: corre(8, t) })],
  ['P', (t) => ({ cam: [0.55, 1.55, -1.7], look: [0.0, 1.45, -0.1], fov: 40, tu: APPOGGIATO, fiato: 1 })],
  ['P', (t) => ({ cam: [0.25, 1.62, -0.75], look: [0.02, 1.58, -0.15], fov: 34, telTu: 1, telSchermo: 1, tu: { ...APPOGGIATO, headPitch: 0.05, blink: 0, fear: 0.8, browUp: 0.6, sad: 0.5, armR: ORECCHIO } })],
  ['P', (t) => ({ cam: [2.5, 1.7, 7.5], look: [0, 1.4, 0], fov: 40, tu: APPOGGIATO })],
  ['I', (t) => ({ cam: [0.25, 0.9, 0.4], look: [0, 1.1, -2.6], fov: 50, apre: 0.7, porta: true, telefono: 0, tu: { pos: [30, 0, 30] }, isp: { pos: [0.0, 0, -3.15], yaw: 0, breathe: 0 }, amb: 0.08, fronte: 0.03 })],
  ['I', (t) => ({ cam: [0.2, 1.3, 0.9], look: [0, 0.0, -1.0], fov: 56, apre: 1, porta: true, telefono: 0, tu: { pos: [30, 0, 30] }, isp: { pos: [0.0, 0, -3.15], yaw: 0, breathe: 0 }, amb: 0.08, fronte: 0.03 })],
];
M.film({ fonts: [M.font(20, 700, 'Display')], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; SC = scalaSet(); PO = porticoSet(); IN = ingressoSet({ entra: true }); },
  draw(ctx, u, t) { const i = Math.min(VISTE.length - 1, Math.floor(t)), [k, f] = VISTE[i]; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); G.renderSet(ctx, k === 'S' ? SC : k === 'P' ? PO : IN, t, u, f(t));
    ctx.fillStyle = '#ff0'; ctx.font = '700 30px Display'; ctx.fillText(`vista ${i}`, 20, 44); } });
