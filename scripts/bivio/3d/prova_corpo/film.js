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
    if (tel) { tel.g.visible = !!(o.posa && o.posa.telefono); tel.g.rotation.z = o.posa && o.posa.filma ? -Math.PI / 2 : 0; }
    P.head.visible = !(o.posa && o.posa.senzaTesta); for (const q of P.abito.corpo.parti) q.mesh.visible = !(o.posa && o.posa.solo) || q.tipo === o.posa.solo;
    P.pose({ ...o.posa, pos: [vecchio ? -0.45 : 0, 0, 0] }); if (vecchio) vecchio.pose({ ...o.posa, pos: [0.45, 0, 0] }); } };
}
const giro = (c, r, fov = 26) => [[0, 0.1, 1], [0.7, 0.1, 0.7], [1, 0.1, 0], [0, 0.1, -1], [-1, 0.1, 0], [-0.7, 0.5, 0.7]].map(([x, y, z]) => ({ cam: [c[0] + x * r, c[1] + y * r, c[2] + z * r], look: c, fov }));
const C0 = [0, 0.95, 0], R = 4.3;
// seduto a terra con la schiena al muro e le ginocchia su, il telefono all'orecchio (lungo la mano e la guancia), l'altra mano sul ginocchio
const TERRA = { telefono: 1, sit: 1, sedile: 0.03, gambe: { aL: 0.86, gL: 0.46, aR: 0.7, gR: 0.22 }, lean: -0.06, headPitch: 0.08,
  armR: { a: [0.12, 0.452, 0.082], gomito: [0.8, -1, -0.1], dita: [-0.1, 0.87, -0.48], dorso: [1, 0, -0.15], mano: 'orecchio' }, armL: { proprio: 'ginocchioD', delta: [0, 0.075, 0.0], gomito: [-1, -0.5, -0.2], dita: [0, -0.35, 1], dorso: [0, 1, 0.3], mano: 'piatta' } };
// la mano sulla bocca: a coppa, il palmo sulle labbra, le dita piegate sulla guancia sinistra, il pollice dall'altra parte; il gomito alzato di lato (polso dritto)
const BOCCA = { a: [-0.079, 0.508, 0.147], gomito: [-1, -0.42, 0.3], dita: [0.9, 0.25, -0.25], dorso: [-0.25, 0.1, 1],
  mano: { indice: { mcp: 16, pip: 26, dip: 14, ab: -3 }, medio: { mcp: 20, pip: 30, dip: 16 }, anulare: { mcp: 24, pip: 32, dip: 18, ab: 4 }, mignolo: { mcp: 28, pip: 34, dip: 18, ab: 7 }, pollice: { ab: 34, fl: 12, roll: 30, mcp: 10, ip: 12 } } };
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
  { nome: 'telefonata a terra (testa e mano)', centro: [0.08, 0.72, 0.05], raggio: 1.0, posa: TERRA },
  { nome: 'telefonata a terra', centro: [0.05, 0.5, 0.05], raggio: 2.3, posa: TERRA },
  { nome: 'telefonata in piedi (spalla)', centro: [0.2, 1.42, 0.02], raggio: 1.5, posa: { telefono: 1, armR: TERRA.armR } },
  ...[[1, -0.6, 0.0], [1, -0.3, -0.2], [0.8, -1, -0.1], [1, -0.8, 0.2]].map((g) => ({ nome: 'telefonata, gomito ' + g.join(' '), centro: [0.2, 1.42, 0.02], raggio: 1.5, posa: { telefono: 1, armR: { ...TERRA.armR, gomito: g } } })),
  { nome: 'fianco destro (la borsa di Elena)', centro: [-0.16, 1.0, -0.04], raggio: 1.3, posa: {} },
  { nome: 'mano sulla bocca (a coppa)', centro: [-0.02, 1.58, 0.1], raggio: 1.05, posa: { fear: 1, browUp: 0.6, armL: BOCCA } },
  { nome: 'mano sulla bocca (da lontano)', centro: [-0.05, 1.4, 0.05], raggio: 2.2, posa: { fear: 1, browUp: 0.6, armL: BOCCA } },
  // il collo e il colletto da vicino (26/11: «migliorare il collo del protagonista»), fermo e con la testa girata e piegata
  { nome: 'collo e colletto', centro: [0, 1.5, 0.03], raggio: 0.62, posa: {} },
  { nome: 'collo, testa girata e in giù', centro: [0, 1.5, 0.03], raggio: 0.62, posa: { headYaw: 0.7, headPitch: 0.25 } },
  { nome: 'collo, testa in su e inclinata', centro: [0, 1.5, 0.03], raggio: 0.62, posa: { headPitch: -0.45, headRoll: 0.2 } },
  // il telefono che filma dalla finestra (di traverso nella mano: dita dietro con le punte agganciate al bordo, pollice sullo schermo)
  { nome: 'telefono che filma', centro: [0.13, 1.4, 0.3], raggio: 0.8, posa: { telefono: 1, filma: 1, armR: { a: [0.206, 0.329, 0.268], gomito: [1, -0.8, 0], dita: [-1, 0.06, 0], dorso: [0, -0.5, 0.87], mano: 'filma' } } },
  // il telefono infilato in tasca (episodio 2, dal secondo 54): la posa com'era e le varianti col gomito indietro
  { nome: 'in tasca (com era)', centro: [0.2, 1.12, 0.03], raggio: 1.3, posa: { armR: { a: [0.215, -0.1, 0.06], gomito: [1, -0.3, -0.7], dita: [0, -1, 0.15], dorso: [1, 0, 0.1], mano: 'presa' } } },
  { nome: 'in tasca (com era, solo pelle)', centro: [0.2, 1.12, 0.03], raggio: 1.3, posa: { solo: 'pelle', armR: { a: [0.215, -0.1, 0.06], gomito: [1, -0.3, -0.7], dita: [0, -1, 0.15], dorso: [1, 0, 0.1], mano: 'presa' } } },
  { nome: 'in tasca B gomito 0.45 0 -1', centro: [0.2, 1.12, 0.03], raggio: 1.3, posa: { armR: { a: [0.19, 0.0, 0.07], gomito: [0.45, 0, -1], dita: [-0.1, -1, 0.1], dorso: [0.6, 0, 0.8], mano: 'presa' } } },
  { nome: 'in tasca C gomito 0.2 0 -1', centro: [0.2, 1.12, 0.03], raggio: 1.3, posa: { armR: { a: [0.19, 0.0, 0.07], gomito: [0.2, 0, -1], dita: [-0.1, -1, 0.1], dorso: [0.6, 0, 0.8], mano: 'presa' } } },
  { nome: 'in tasca D piu giu', centro: [0.2, 1.12, 0.03], raggio: 1.3, posa: { armR: { a: [0.2, -0.06, 0.06], gomito: [0.45, 0, -1], dita: [-0.1, -1, 0.1], dorso: [0.6, 0, 0.8], mano: 'presa' } } },
  { nome: 'in tasca E dorso fuori', centro: [0.2, 1.12, 0.03], raggio: 1.3, posa: { armR: { a: [0.19, 0.0, 0.07], gomito: [0.45, 0, -1], dita: [-0.1, -1, 0.1], dorso: [1, 0, 0.2], mano: 'presa' } } },
];
function scatto(c, set, o, x, y, wd, hg) { c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, wd, hg); c.clip(); set.camera.aspect = wd / hg; c.scale(wd / W, hg / H); G.renderSet(c, set, 0, 0, o); c.restore(); }
M.film({ fonts: [M.font(20, 700, 'Display')], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; S = labSet(); },
  draw(ctx, u, t) { const p = POSE[Math.min(POSE.length - 1, t >= 40 ? 10 + Math.floor(t - 40) : Math.floor(t % 10))]; ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
    const viste = t >= 40 ? giro(p.centro, p.raggio, 26) : t >= 30 ? giro(p.centro || [0, 0.8, 0], p.raggio || 1.7, 26) : t < 10 ? giro(C0, R) : t < 20 ? [...giro([0, 1.5, 0.02], 0.95, 24).slice(0, 4), ...giro([-0.25, 0.85, 0.05], 0.8, 24).slice(0, 2)] : [...giro([0.25, 0.85, 0.05], 0.7, 22).slice(0, 3), ...giro([-0.22, 1.35, 0], 0.9, 24).slice(3, 6)];
    viste.forEach((v, i) => scatto(ctx, S, { ...v, posa: p.posa, chiaro: t >= 30 && t < 40 }, (i % 2) * 540, Math.floor(i / 2) * 640, 540, 640));
    ctx.fillStyle = '#fff'; ctx.font = '700 28px Display'; ctx.fillText(`${CHI}: ${p.nome}`, 16, 40); } });
