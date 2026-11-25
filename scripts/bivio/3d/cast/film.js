// Scheda dei personaggi (versione 3): corpo intero, primi piani, espressioni, mani.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE, V, tex, mat, luci, ombre } from './sets/stile.js';
import { nonna3, tu3, sara3 } from './sets/cast.js';
let S = null;
function studio() {
  const scene = new THREE.Scene();
  const cam = G.camera(30, 0.02, 60);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(30, 24, 12), new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: tex(16, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5a4638'); g.addColorStop(0.55, '#8a6a52'); g.addColorStop(1, '#3a2c24'); c.fillStyle = g; c.fillRect(0, 0, w, h); }) }));
  scene.add(sky);
  const fl = new THREE.Mesh(new THREE.CircleGeometry(6, 48), mat('#7a5c48')); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
  const L = luci(scene, { amb: 0.62, fronte: 0.42, alto: 0.28 });
  const N = nonna3(), T = tu3(), A = sara3(); scene.add(N.group, T.group, A.group);
  return { scene, camera: cam, bloom: 0, update(t, u, o) {
    const far = [50, 0, 0];
    N.pose({ pos: o.n ? (o.n.pos || [0, 0, 0]) : far, breathe: Math.sin(t * 2), ...(o.n || {}) });
    T.pose({ pos: o.t ? (o.t.pos || [0, 0, 0]) : far, breathe: Math.sin(t * 2.2), ...(o.t || {}) });
    A.pose({ pos: o.s ? (o.s.pos || [0, 0, 0]) : far, breathe: Math.sin(t * 2.4), ...(o.s || {}) });
    G.lookFrom(cam, o.cam, o.look); cam.fov = o.fov || 30; cam.updateProjectionMatrix(); L.segui(cam, o.look);
  } };
}
const viso = (h, dx = 0, d = 0.95) => ({ cam: [dx, h + 0.02, d], look: [0, h, 0.05], fov: 26 });
const SHOTS = [
  { n: {}, cam: [0.5, 0.95, 3.3], look: [0, 0.78, 0], fov: 30 },
  { n: {}, ...viso(1.37) },
  { n: { smile: 1, gazeX: 0.2 }, ...viso(1.37, 0.32) },
  { n: { angry: 0.9, open: 0.8, gazeY: 0.1 }, ...viso(1.37, -0.3) },
  { n: { grin: 1, smile: 0.9, open: 1.1, browUp: 0.6 }, ...viso(1.37) },
  { n: { mani: 'lungo', armR: { a: [0.02, 0.4, 0.2], gomito: [1, -0.6, 0.1], dita: [0, 1, 0.05], dorso: [0, 0, 1], mano: 'indice' }, smile: 0.5, headRoll: 0.08 }, cam: [0.25, 1.3, 1.5], look: [0, 1.22, 0.05], fov: 30 },
  { t: {}, cam: [0.55, 1.1, 3.9], look: [0, 0.92, 0], fov: 30 },
  { t: {}, ...viso(1.6) },
  { t: { fear: 1, mouth: 0.4, gazeX: -0.4 }, ...viso(1.6, 0.3) },
  { t: { smile: 0.9, mouth: 0.5, wide: 0.5 }, ...viso(1.6, -0.3) },
  { s: {}, cam: [0.5, 1.02, 3.6], look: [0, 0.86, 0], fov: 30 },
  { s: {}, ...viso(1.49) },
  { s: { fear: 0.9, mouth: 0.55, round: 0.6, sad: 0.4 }, ...viso(1.49, 0.3) },
  { s: { smile: 1 }, ...viso(1.49, -0.28) },
  { n: { pos: [-0.55, 0, 0], yaw: 0.25, smile: 0.7 }, t: { pos: [0.1, 0, -0.1], yaw: -0.1 }, s: { pos: [0.72, 0, 0], yaw: -0.3, smile: 0.4 }, cam: [0.1, 1.15, 4.6], look: [0.08, 0.9, 0], fov: 30 },
  { t: { armR: { a: [0.14, 0.2, 0.36], gomito: [1, -0.6, -0.2], dorso: [0, 1, 0.2], mano: 'aperta' }, armL: { a: [-0.14, 0.2, 0.36], gomito: [-1, -0.6, -0.2], dorso: [0, 0.2, 1], mano: 'pugno' } }, cam: [0.25, 1.3, 1.0], look: [0, 1.22, 0.3], fov: 34 },
];
M.film({ fonts: [], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; S = studio(); },
  draw(ctx, u, t) { G.renderSet(ctx, S, t, u, SHOTS[Math.min(SHOTS.length - 1, Math.floor(t))]); } });
