// Scheda dei personaggi adulti de «Il testimone»: tu e l'ispettore Riva.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE, tex, mat, luci } from './sets/stile.js';
import { testimone, ispettore } from './sets/adulti.js';
let S = null;
function studio() {
  const scene = new THREE.Scene(), cam = G.camera(30, 0.02, 60);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(30, 24, 12), new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: tex(16, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3d4652'); g.addColorStop(0.55, '#6b7684'); g.addColorStop(1, '#2a3038'); c.fillStyle = g; c.fillRect(0, 0, w, h); }) })));
  const fl = new THREE.Mesh(new THREE.CircleGeometry(6, 48), mat('#59626e')); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
  const L = luci(scene, { amb: 0.56, fronte: 0.4, alto: 0.22, colore: 0xfff6ee });
  const T = testimone(), I = ispettore(); scene.add(T.group, I.group);
  return { scene, camera: cam, bloom: 0, update(t, u, o) {
    const far = [50, 0, 0];
    T.pose({ pos: o.t ? (o.t.pos || [0, 0, 0]) : far, breathe: Math.sin(t * 2.2), ...(o.t || {}) });
    I.pose({ pos: o.i ? (o.i.pos || [0, 0, 0]) : far, breathe: Math.sin(t * 2), ...(o.i || {}) });
    G.lookFrom(cam, o.cam, o.look); cam.fov = o.fov || 30; cam.updateProjectionMatrix(); L.segui(cam, o.look);
  } };
}
const viso = (h, dx = 0, d = 0.78) => ({ cam: [dx, h + 0.015, d], look: [0, h, 0.04], fov: 26 });
const BADGE = { a: [-0.17, 0.4, 0.3], gomito: [-1, -0.8, -0.1], dita: [0, 1, 0.05], dorso: [0, 0, -1], mano: { dita: [0.14, 0.12, 0.12, 0.14], pollice: 0.35, apri: 0.1 } };
const SHOTS = [
  { t: {}, cam: [0.55, 1.1, 4.0], look: [0, 0.92, 0], fov: 30 },
  { t: {}, ...viso(1.675) },
  { t: { fear: 1, mouth: 0.3, gazeX: -0.3 }, ...viso(1.675, 0.26) },
  { t: { sad: 0.6, browUp: 0.4, mouth: 0.25, round: 0.3 }, ...viso(1.675, -0.24) },
  { i: {}, cam: [0.55, 1.15, 4.2], look: [0, 0.97, 0], fov: 30 },
  { i: {}, ...viso(1.76) },
  { i: { smile: 0.75, open: 0.62 }, ...viso(1.76, 0.24) },
  { i: { angry: 0.9, open: 0.85, gazeY: -0.1 }, ...viso(1.76, -0.24) },
  { i: { distintivo: true, armL: BADGE, smile: 0.3 }, cam: [-0.1, 1.64, 2.0], look: [-0.08, 1.6, 0.1], fov: 30 },
  { t: { pos: [-0.38, 0, 0], yaw: 0.2, fear: 0.5 }, i: { pos: [0.4, 0, 0.05], yaw: -0.25, smile: 0.5 }, cam: [0.05, 1.1, 5.7], look: [0, 0.96, 0], fov: 30 },
  { t: { pos: [-0.26, 0, 0.05], yaw: 0.3, fear: 0.5, headYaw: 0.25 }, i: { pos: [0.27, 0, -0.05], yaw: -0.3, smile: 0.5, headYaw: -0.2 }, cam: [0.02, 1.6, 3.1], look: [0.02, 1.5, 0], fov: 30 },
  { t: { yaw: 1.5 }, cam: [0.035, 1.69, 1.0], look: [0.035, 1.675, 0], fov: 26 },
  { i: { yaw: 1.5 }, cam: [0.035, 1.775, 1.0], look: [0.035, 1.76, 0], fov: 26 },
  { t: { yaw: 2.5 }, cam: [0, 1.7, 1.0], look: [0, 1.675, 0], fov: 26 },
  { t: { yaw: -0.75, headPitch: 0.25 }, cam: [0, 1.82, 0.95], look: [0, 1.69, 0], fov: 26 },
];
M.film({ fonts: [M.font(20, 700, 'Display')], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; S = studio(); },
  draw(ctx, u, t) { G.renderSet(ctx, S, t, u, SHOTS[Math.min(SHOTS.length - 1, Math.floor(t))]); } });
