// laboratorio della mano modellata: ogni secondo una posa, vista da sei punti su fondo neutro.
// 0 = aperta (spazio del modello), 1 = pugno, 2 = presa sulla leva (mondo come nella scena: leva lungo x, porta verso -z, dorso in su)
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE, V, mat, tra, luci } from './sets/stile.js';
import { manoMesh, afferra, POLSO, INFO } from './sets/mano_mesh.js';
const { W, H } = M; let S = null;
// la leva nello spazio del modello: di traverso sotto le prime falangi, parallela alla linea delle nocche
const DL = V(-0.092, 0.28, 1).normalize(), CL = V(0.008, -0.044, 0.0074), LEVA = { a: CL.clone().addScaledVector(DL, -0.1).toArray(), b: CL.clone().addScaledVector(DL, 0.12).toArray(), r: 0.011 };
const APERTA = {}, PUGNO = Object.fromEntries(['indice', 'medio', 'anulare', 'mignolo'].map((f) => [f, { mcp: 78, pip: 100, dip: 62 }]).concat([['pollice', { ab: 30, fl: 22, mcp: 30, ip: 45 }]]));
const P_LEVA = afferra({ pollice: { ab: 38, fl: 0, roll: 0, mcp: 10, ip: 20 } }, LEVA, { pollice: false });
function labSet() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#59606c');
  const cam = G.camera(30, 0.01, 20); scene.add(cam);
  const L = luci(scene, { ombre: false, amb: 0.5, fronte: 0.3, alto: 0.0 });
  const key = new THREE.DirectionalLight(0xfff0dd, 0.55 * Math.PI); scene.add(key, key.target);
  const perno = new THREE.Group(); scene.add(perno); const mano = manoMesh(); perno.add(mano);
  const leva = new THREE.Group(); perno.add(leva); tra(leva, V(...LEVA.a), V(...LEVA.b), LEVA.r, LEVA.r, mat('#C9A24A'));
  const MONDO = new THREE.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, 1), V(1, 0, 0));
  return { scene, camera: cam, bloom: 0, mano, update(t, u, o) { G.lookFrom(cam, o.cam, o.look); cam.fov = o.fov || 30; cam.updateProjectionMatrix(); L.segui(cam, o.look);
    key.position.set(...(o.key || [-1, 2, 1.5])); key.target.position.set(0, 0, 0); leva.visible = !!o.leva; mano.userData.posa(o.posa);
    perno.matrixAutoUpdate = false; if (o.mondo) perno.matrix.copy(MONDO); else perno.matrix.identity(); perno.updateMatrixWorld(true); } };
}
const C0 = [0.02, -0.03, 0.0], CM = [0.0, 0.01, -0.035];            // centro nello spazio del modello e nel mondo della presa
const PROVE = [
  { nome: 'aperta', posa: APERTA, c: C0, viste: [[0.5, 0, 0], [-0.5, 0, 0], [0, 0, -0.5], [0, 0, 0.5], [0.3, -0.4, -0.1], [0.3, 0.15, -0.38]] },
  { nome: 'pugno', posa: PUGNO, c: C0, viste: [[0.5, 0, 0], [-0.5, 0, 0], [0, 0, -0.5], [0, 0, 0.5], [0.3, -0.4, -0.1], [0.3, 0.15, -0.38]] },
  { nome: 'presa sulla leva', posa: P_LEVA, leva: 1, mondo: 1, c: CM, viste: [[-0.26, 0.24, 0.34], [0.0, 0.36, 0.3], [0.28, 0.24, 0.32], [-0.42, 0.06, 0.06], [-0.22, -0.06, 0.4], [0.0, 0.5, 0.04]] },
  { nome: 'presa: dal lato della porta e da sotto', posa: P_LEVA, leva: 1, mondo: 1, c: CM, viste: [[-0.3, 0.1, -0.3], [0.3, 0.1, -0.3], [0, -0.45, 0.1], [0.0, 0.05, -0.5], [0.45, 0.0, 0.0], [-0.3, 0.3, 0.0]] },
];
function scatto(c, set, o, x, y, wd, hg) { c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, wd, hg); c.clip(); set.camera.aspect = wd / hg; c.scale(wd / W, hg / H); G.renderSet(c, set, 0, 0, o); c.restore(); }
M.film({ fonts: [M.font(20, 700, 'Display')], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; S = labSet(); },
  draw(ctx, u, t) { const p = PROVE[Math.min(PROVE.length - 1, Math.floor(t))]; ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
    p.viste.forEach((v, i) => scatto(ctx, S, { cam: [p.c[0] + v[0], p.c[1] + v[1], p.c[2] + v[2]], look: p.c, fov: 26, posa: p.posa, leva: p.leva, mondo: p.mondo }, (i % 2) * 540, Math.floor(i / 2) * 640, 540, 640));
    ctx.fillStyle = '#fff'; ctx.font = '700 28px Display'; ctx.fillText(p.nome, 16, 40);
    if (p.leva) { ctx.font = '500 17px Display'; ['indice', 'medio', 'anulare', 'mignolo', 'pollice'].forEach((f, i) => ctx.fillText(f + ' ' + JSON.stringify(p.posa[f] || {}), 16, 1880 - (4 - i) * 22)); }
    ctx.font = '500 16px Display'; ctx.fillText(JSON.stringify(INFO), 16, 1908); } });
