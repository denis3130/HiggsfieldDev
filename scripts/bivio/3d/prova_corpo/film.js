// laboratorio del corpo modellato sul pupazzo: ogni secondo una posa, vista da sei punti su fondo neutro.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE, V, mat, luci } from './sets/stile.js';
import { testimone, ispettore, elena, telefono } from './sets/adulti.js';
const { W, H } = M; let S = null;
const Q = new URLSearchParams(location.search); let CHI = 'testimone';
function labSet() {
  CHI = M.CFG.chi || Q.get('chi') || 'testimone';
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#59606c');
  const cam = G.camera(30, 0.01, 30); scene.add(cam);
  const L = luci(scene, { ombre: false, amb: 0.5, fronte: 0.3, alto: 0.0 });
  const key = new THREE.DirectionalLight(0xfff0dd, 0.55 * Math.PI); scene.add(key, key.target);
  const P = CHI === 'ispettore' ? ispettore() : CHI === 'elena' ? elena() : testimone(); scene.add(P.group); const tel = CHI === 'testimone' ? telefono(P, 'AR') : null;
  const vecchio = Q.get('vecchio') ? (CHI === 'ispettore' ? ispettore({ modellato: false }) : testimone({ modellato: false })) : null; if (vecchio) scene.add(vecchio.group);
  return { scene, camera: cam, bloom: 0, P, update(t, u, o) { G.lookFrom(cam, o.cam, o.look); cam.fov = o.fov || 30; cam.updateProjectionMatrix(); L.segui(cam, o.look); key.position.set(...(o.key || [-1, 2, 1.5])); key.target.position.set(0, 1, 0);
    for (const q of P.abito.corpo.parti) if (q.tipo === 'vestito') q.mesh.material.color.setScalar(o.chiaro ? 2.6 : 1);
    if (tel) tel.g.visible = !!(o.posa && o.posa.telefono);
    P.head.visible = !(o.posa && o.posa.senzaTesta); for (const q of P.abito.corpo.parti) q.mesh.visible = !(o.posa && o.posa.solo) || q.tipo === o.posa.solo;
    P.pose({ ...o.posa, pos: [vecchio ? -0.45 : 0, 0, 0] }); if (vecchio) vecchio.pose({ ...o.posa, pos: [0.45, 0, 0] }); } };
}
const giro = (c, r, fov = 26) => [[0, 0.1, 1], [0.7, 0.1, 0.7], [1, 0.1, 0], [0, 0.1, -1], [-1, 0.1, 0], [-0.7, 0.5, 0.7]].map(([x, y, z]) => ({ cam: [c[0] + x * r, c[1] + y * r, c[2] + z * r], look: c, fov }));
const C0 = [0, 0.95, 0], R = 4.3;
const TERRA = { telefono: 1, sit: 1, sedile: 0.03, gambe: { aL: 0.62, gL: 0.85, aR: 0.5, gR: 0.72 }, lean: 0.14, armR: { a: [0.112, 0.56, 0.14], gomito: [0.55, -1, 0.35], dita: [0, 0.33, -0.94], dorso: [1, 0, 0], mano: 'orecchio' }, armL: { a: [-0.1, 0.06, 0.3], gomito: [-1, -0.4, 0], mano: 'presa' } };
const POSE = [
  { nome: 'in piedi', posa: {} },
  { nome: 'mano alla bocca e telefono', posa: { armL: { a: [-0.02, 0.5, 0.12], gomito: [-0.7, -0.5, 0.2], dita: [0.3, 1, -0.2], dorso: [0, 0, 1] }, armR: { a: [0.2, 0.2, 0.28], gomito: [0.6, -0.7, -0.3], dita: [0, 0.6, 0.8], dorso: [1, 0, 0] } } },
  { nome: 'passo e busto girato', posa: { gambe: { aL: 0.5, gL: 0.25, aR: -0.35, gR: 0.5 }, twist: 0.35, lean: 0.12, headYaw: -0.5, armL: { a: [-0.2, -0.05, -0.2] }, armR: { a: [0.25, 0.0, 0.25] } } },
  { nome: 'seduto', posa: { sit: 1, lean: 0.1, armL: { a: [-0.16, -0.1, 0.33] }, armR: { a: [0.16, -0.1, 0.33] } } },
  { nome: 'braccia in alto e testa in su', posa: { headPitch: -0.5, armL: { a: [-0.35, 0.75, 0.1] }, armR: { a: [0.5, 0.36, 0.0] } } },
  { nome: 'senza testa', posa: { senzaTesta: 1 } },
  { nome: 'solo pelle', posa: { senzaTesta: 1, solo: 'pelle' } },
  { nome: 'distintivo', centro: [-0.17, 1.62, 0.31], raggio: 0.42, posa: { distintivo: true, armL: { a: [-0.17, 0.4, 0.3], gomito: [-1, -0.8, -0.1], dita: [0, 1, 0.05], dorso: [0, 0, -1], mano: 'tessera' } } },
  { nome: 'telefono', centro: [0.2, 1.36, 0.32], raggio: 0.42, posa: { telefono: 1, armR: { a: [0.2, 0.2, 0.3], gomito: [0.6, -0.7, -0.3], dita: [0, 1, 0.1], dorso: [0, 0, 1], mano: 'filma' } } },
  { nome: 'chinato e testa girata', posa: { lean: 0.5, side: 0.15, headYaw: 0.8, headPitch: 0.2, armL: { a: [-0.1, -0.1, 0.45] } } },
  // dal secondo 40: pose prese dalle scene, viste da vicino attorno a «centro» (una al secondo)
  { nome: 'telefonata a terra (spalla)', centro: [0.2, 0.62, 0.02], raggio: 0.8, posa: TERRA },
  { nome: 'telefonata a terra', centro: [0.05, 0.5, 0.05], raggio: 2.3, posa: TERRA },
  { nome: 'telefonata in piedi (spalla)', centro: [0.2, 1.42, 0.02], raggio: 1.5, posa: { telefono: 1, armR: TERRA.armR } },
  ...[[1, -0.6, 0.0], [1, -0.3, -0.2], [0.8, -1, -0.1], [1, -0.8, 0.2]].map((g) => ({ nome: 'telefonata, gomito ' + g.join(' '), centro: [0.2, 1.42, 0.02], raggio: 1.5, posa: { telefono: 1, armR: { ...TERRA.armR, gomito: g } } })),
  { nome: 'fianco destro (la borsa di Elena)', centro: [-0.16, 1.0, -0.04], raggio: 1.3, posa: {} },
];
function scatto(c, set, o, x, y, wd, hg) { c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, wd, hg); c.clip(); set.camera.aspect = wd / hg; c.scale(wd / W, hg / H); G.renderSet(c, set, 0, 0, o); c.restore(); }
M.film({ fonts: [M.font(20, 700, 'Display')], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; S = labSet(); },
  draw(ctx, u, t) { const p = POSE[Math.min(POSE.length - 1, t >= 40 ? 10 + Math.floor(t - 40) : Math.floor(t % 10))]; ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
    const viste = t >= 40 ? giro(p.centro, p.raggio, 26) : t >= 30 ? giro(p.centro || [0, 0.8, 0], p.raggio || 1.7, 26) : t < 10 ? giro(C0, R) : t < 20 ? [...giro([0, 1.5, 0.02], 0.95, 24).slice(0, 4), ...giro([-0.25, 0.85, 0.05], 0.8, 24).slice(0, 2)] : [...giro([0.25, 0.85, 0.05], 0.7, 22).slice(0, 3), ...giro([-0.22, 1.35, 0], 0.9, 24).slice(3, 6)];
    viste.forEach((v, i) => scatto(ctx, S, { ...v, posa: p.posa, chiaro: t >= 30 && t < 40 }, (i % 2) * 540, Math.floor(i / 2) * 640, 540, 640));
    ctx.fillStyle = '#fff'; ctx.font = '700 28px Display'; ctx.fillText(`${CHI}: ${p.nome}`, 16, 40); } });
