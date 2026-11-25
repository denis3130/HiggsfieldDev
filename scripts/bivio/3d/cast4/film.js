// Scheda dei personaggi de «Il testimone» con corpo, vestiti e scarpe MODELLATI: prima (a pupazzo) e dopo, figure intere e particolari.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE, tex, mat, luci } from './sets/stile.js';
import { testimone, ispettore, elena } from './sets/adulti.js';
let S = null;
function studio() {
  const scene = new THREE.Scene(), cam = G.camera(30, 0.02, 60);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(30, 24, 12), new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: tex(16, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3d4652'); g.addColorStop(0.55, '#6b7684'); g.addColorStop(1, '#2a3038'); c.fillStyle = g; c.fillRect(0, 0, w, h); }) })));
  const fl = new THREE.Mesh(new THREE.CircleGeometry(6, 48), mat('#59626e')); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
  const L = luci(scene, { amb: 0.56, fronte: 0.4, alto: 0.22, colore: 0xfff6ee });
  const P = { t: testimone(), i: ispettore(), t0: testimone({ modellato: false }), i0: ispettore({ modellato: false }), e: elena(), e0: elena({ modellato: false }) }; for (const p of Object.values(P)) scene.add(p.group);
  return { scene, camera: cam, bloom: 0, update(t, u, o) {
    for (const [k, p] of Object.entries(P)) p.pose({ pos: o[k] ? (o[k].pos || [0, 0, 0]) : [50, 0, 0], breathe: Math.sin(t * 2.2), ...(o[k] || {}) });
    G.lookFrom(cam, o.cam, o.look); cam.fov = o.fov || 30; cam.updateProjectionMatrix(); L.segui(cam, o.look);
  } };
}
const INTERA = { cam: [0.55, 1.1, 4.0], look: [0, 0.92, 0], fov: 30 }, INTERA_I = { cam: [0.55, 1.15, 4.2], look: [0, 0.97, 0], fov: 30 };
const INTERA_E = { cam: [0.5, 1.03, 3.75], look: [0, 0.86, 0], fov: 30 };
const BADGE = { a: [-0.17, 0.4, 0.3], gomito: [-1, -0.8, -0.1], dita: [0, 1, 0.05], dorso: [0, 0, -1], mano: 'tessera' };
const SHOTS = [
  { t0: {}, ...INTERA },                                                                             // 0 prima
  { t: {}, ...INTERA },                                                                              // 1 dopo, davanti
  { t: { yaw: 2.55, headYaw: 0.3 }, ...INTERA },                                                     // 2 dopo, di spalle
  { t: { yaw: -0.35 }, cam: [0.15, 1.3, 1.75], look: [0, 1.2, 0], fov: 30 },                          // 3 maglietta e braccia
  { t: { yaw: -0.5 }, cam: [0.25, 0.42, 1.05], look: [0.02, 0.1, 0.05], fov: 30 },                    // 4 scarpe e jeans
  { t: { yaw: 0.5 }, cam: [-0.62, 0.98, 0.82], look: [-0.19, 0.86, 0.13], fov: 26 },                    // 5 mano e avambraccio
  { i0: {}, ...INTERA_I },                                                                           // 6 prima
  { i: {}, ...INTERA_I },                                                                            // 7 dopo, davanti
  { i: { yaw: 2.55, headYaw: 0.3 }, ...INTERA_I },                                                   // 8 dopo, di spalle
  { i: { yaw: -0.3 }, cam: [0.12, 1.5, 1.35], look: [0, 1.42, 0], fov: 30 },                          // 9 colletto, cravatta, risvolti
  { i: { yaw: -0.5 }, cam: [0.35, 0.62, 1.75], look: [0.02, 0.33, 0.05], fov: 30 },                   // 10 scarpe, pantaloni, fondo del cappotto
  { i: { distintivo: true, armL: BADGE, smile: 0.3 }, cam: [-0.1, 1.64, 2.0], look: [-0.08, 1.6, 0.1], fov: 30 },   // 11 col distintivo
  { t: { pos: [-0.38, 0, 0], yaw: 0.2, fear: 0.5 }, i: { pos: [0.4, 0, 0.05], yaw: -0.25, smile: 0.5 }, cam: [0.05, 1.1, 5.7], look: [0, 0.96, 0], fov: 30 },   // 12 a confronto
  { t: { pos: [-0.5, 0, 0], yaw: 0.9, gambe: { aL: 0.42, gL: 0.2, aR: -0.3, gR: 0.45 }, armL: { a: [-0.2, -0.08, -0.16] }, armR: { a: [0.24, -0.02, 0.2] }, lean: 0.06 },
    i: { pos: [0.5, 0, 0], yaw: -0.9, gambe: { aL: -0.3, gL: 0.45, aR: 0.42, gR: 0.2 }, armL: { a: [-0.24, -0.02, 0.2] }, armR: { a: [0.2, -0.08, -0.16] }, lean: 0.06 }, cam: [0.05, 1.1, 5.7], look: [0, 0.96, 0], fov: 30 },   // 13 mentre camminano
  { e0: {}, ...INTERA_E },                                                                           // 14 Elena prima
  { e: {}, ...INTERA_E },                                                                            // 15 dopo, davanti
  { e: { yaw: 2.55, headYaw: 0.3 }, ...INTERA_E },                                                   // 16 dopo, di spalle
  { e: { yaw: -0.3 }, cam: [0.12, 1.36, 1.3], look: [0, 1.28, 0], fov: 30 },                          // 17 cappotto, maglia, cinghia
  { e: { yaw: 0.0 }, cam: [-1.0, 1.08, -0.8], look: [-0.15, 0.93, -0.04], fov: 28 },                  // 18 la borsa a tracolla
  { e: { yaw: -0.5 }, cam: [0.35, 0.6, 1.7], look: [0.02, 0.31, 0.05], fov: 30 },                     // 19 scarpe e fondo del cappotto
];
M.film({ fonts: [M.font(20, 700, 'Display')], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; S = studio(); },
  draw(ctx, u, t) { G.renderSet(ctx, S, t, u, SHOTS[Math.min(SHOTS.length - 1, Math.floor(t))]); } });
