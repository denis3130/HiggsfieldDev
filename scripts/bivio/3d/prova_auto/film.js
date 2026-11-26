// laboratorio dell'auto modellata: ogni secondo un insieme di sei viste su fondo neutro (0: chiusa da lontano, 1: bagagliaio aperto,
// 2: coda da vicino aperta, 3: coda da vicino chiusa, 4: muso e fianco, 5: dall'alto come dalla finestra del quarto piano)
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE, V, mat, luci } from './sets/stile.js';
import { auto } from './sets/auto_mesh.js';
const { W, H } = M; let S = null;
function labSet() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#59606c');
  const cam = G.camera(30, 0.05, 80); scene.add(cam);
  const L = luci(scene, { ombre: true, amb: 0.5, fronte: 0.3, alto: 0.3, altoPos: [3, 7, -4], area: 5 });
  const terra = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), mat('#6a7079')); terra.rotation.x = -Math.PI / 2; terra.receiveShadow = true; scene.add(terra);
  const A = auto('#787D85'); scene.add(A.group);
  return { scene, camera: cam, bloom: 0, update(t, u, o) { G.lookFrom(cam, o.cam, o.look); cam.fov = o.fov || 30; cam.updateProjectionMatrix(); L.segui(cam, o.look); A.cofano(o.cofano || 0); } };
}
const giro = (c, r, y = 0.25, fov = 26) => [[0, y, -1], [0.7, y, -0.7], [1, y, 0], [0, y, 1], [-0.7, y + 0.3, 0.7], [-0.6, y + 0.9, -0.8]].map(([x, yy, z]) => ({ cam: [c[0] + x * r, c[1] + yy * r, c[2] + z * r], look: c, fov }));
const VISTE = [
  { nome: 'chiusa', viste: giro([0, 0.7, 0], 8.5), cofano: 0 },
  { nome: 'bagagliaio aperto', viste: giro([0, 0.7, 0], 8.5), cofano: 1 },
  { nome: 'coda aperta', viste: giro([0, 0.85, -1.6], 3.6, 0.5), cofano: 1 },
  { nome: 'coda chiusa', viste: giro([0, 0.75, -1.6], 3.6, 0.3), cofano: 0 },
  { nome: 'ruota e fianco', viste: giro([0.6, 0.5, 1.2], 3.0, 0.2), cofano: 0 },
  { nome: 'dalla finestra (aperto a metà e aperto)', viste: [[0.45, 0], [0.45, 0.5], [0.45, 1], [0.7, 1], [0.3, 1], [0.45, 1]].map(([el, k], i) => ({ cam: [-2.2 - (i === 5 ? 2 : 0), 14 * el + (i === 5 ? 1 : 0), -7.5 * (1 - el * 0.4)], look: [0, 0.8, -1.5], fov: i === 5 ? 9 : 14, cofano: k })) },
];
function scatto(c, set, o, x, y, wd, hg) { c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, wd, hg); c.clip(); set.camera.aspect = wd / hg; c.scale(wd / W, hg / H); G.renderSet(c, set, 0, 0, o); c.restore(); }
M.film({ fonts: [M.font(20, 700, 'Display')], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; S = labSet(); },
  draw(ctx, u, t) { const p = VISTE[Math.min(VISTE.length - 1, Math.floor(t))]; ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
    p.viste.forEach((v, i) => scatto(ctx, S, { cofano: p.cofano, ...v }, (i % 2) * 540, Math.floor(i / 2) * 640, 540, 640));
    ctx.fillStyle = '#fff'; ctx.font = '700 28px Display'; ctx.fillText(`auto: ${p.nome}`, 16, 40); } });
