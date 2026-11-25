// laboratorio della mano: ogni secondo una posa, vista da sei punti (griglia 2 x 3) su fondo neutro e luce piena
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE, V, mat, tra, luci } from './sets/stile.js';
import { testimone } from './sets/adulti.js';
const { W, H } = M; let S = null;
function labSet() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#59606c');
  const cam = G.camera(30, 0.02, 20); scene.add(cam);
  const L = luci(scene, { ombre: false });
  const T = testimone(); scene.add(T.group);
  const leva = new THREE.Group(); scene.add(leva); tra(leva, V(-0.16, 1.02, 0.5), V(-0.34, 1.02, 0.5), 0.0115, 0.0105, mat('#C9A24A'));
  return { scene, camera: cam, bloom: 0, T, update(t, u, o) { G.lookFrom(cam, o.cam, o.look); cam.fov = o.fov || 30; cam.updateProjectionMatrix(); L.segui(cam, o.look); leva.visible = !!o.leva; T.pose(o.tu); } };
}
const su = { ditaM: [0, 1, 0] };
const POSE = [
  { nome: 'presa sulla leva', c: [-0.25, 1.03, 0.47], leva: 1, armL: { mondo: [-0.25, 1.058, 0.4], gomitoM: [-0.5, -0.8, -0.4], ditaM: [0, -0.12, 1], dorsoM: [0, 1, 0.12], mano: 'leva' } },
  { nome: 'aperta, palmo', c: [-0.25, 1.29, 0.4], armL: { mondo: [-0.25, 1.2, 0.4], ...su, dorsoM: [0, 0, -1], mano: 'aperta' } },
  { nome: 'rilassata, dorso', c: [-0.25, 1.29, 0.4], armL: { mondo: [-0.25, 1.2, 0.4], ...su, dorsoM: [0, 0, 1], mano: 'rilassata' } },
  { nome: 'indice', c: [-0.25, 1.29, 0.4], armL: { mondo: [-0.25, 1.2, 0.4], ...su, dorsoM: [0, 0, 1], mano: 'indice' } },
  { nome: 'pugno', c: [-0.25, 1.26, 0.4], armL: { mondo: [-0.25, 1.2, 0.4], ...su, dorsoM: [0, 0, 1], mano: 'pugno' } },
  { nome: 'presa (telefono)', c: [-0.25, 1.27, 0.4], armL: { mondo: [-0.25, 1.2, 0.4], ...su, dorsoM: [0, 0, 1], mano: 'presa' } },
  { nome: 'piatta', c: [-0.25, 1.29, 0.4], armL: { mondo: [-0.25, 1.2, 0.4], ...su, dorsoM: [0, 0, 1], mano: 'piatta' } },
];
const VISTE = [[0, 0.06, 0.5], [-0.42, 0.12, 0.3], [0.42, 0.12, 0.3], [0, 0.5, 0.06], [-0.5, 0.02, 0.02], [0.1, -0.32, 0.4]];
function scatto(c, set, o, x, y, wd, hg) { c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, wd, hg); c.clip(); set.camera.aspect = wd / hg; c.scale(wd / W, hg / H); G.renderSet(c, set, 0, 0, o); c.restore(); }
M.film({ fonts: [M.font(20, 700, 'Display')], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; S = labSet(); },
  draw(ctx, u, t) { const p = POSE[Math.min(POSE.length - 1, Math.floor(t))]; ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
    VISTE.forEach((v, i) => scatto(ctx, S, { cam: [p.c[0] + v[0], p.c[1] + v[1], p.c[2] + v[2]], look: p.c, leva: p.leva, tu: { pos: [0, 0, 0], yaw: 0, armL: p.armL } }, (i % 2) * 540, Math.floor(i / 2) * 640, 540, 640));
    ctx.fillStyle = '#fff'; ctx.font = '700 30px Display'; ctx.fillText(p.nome, 20, 44); } });
