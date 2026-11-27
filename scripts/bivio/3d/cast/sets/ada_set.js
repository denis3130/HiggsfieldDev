// «Il testimone», episodio 2 («Interno 11») — il soggiorno della signora Ada, di notte: lei nella sua poltrona di velluto col telefono all'orecchio,
// la lampada col paralume accanto (l'unica luce), dietro il buio della stanza con l'orologio a pendolo, la credenza con le foto, la finestra con le tendine
// di pizzo. In piedi dietro di lei, nell'ombra, l'ispettore: si china sul telefono, poi si raddrizza e guarda in macchina col dito sulle labbra.
// adaSet() → { scene, camera, A (Ada), R (l'ispettore), update(t, u, o) }.  o: { cam, look, fov, roll, ada: posa, riva: posa, lampada (1 di base), telAda 0..1 }
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { THREE, V, rnd, tex, mat, piatto as basic, sfera, add, loft, tra, luci, ombre, alone, PI } from './stile.js';
import { ada, ispettore, telefono } from './adulti.js';
import { assi } from './cucina3.js';

const RX0 = -2.1, RX1 = 2.1, RZ0 = -2.2, RZ1 = 2.4, RH = 2.75;
export function adaSet() {
  const r = rnd(808), scene = new THREE.Scene(); scene.background = new THREE.Color('#050506');
  const cam = G.camera(40, 0.03, 30); scene.add(cam);
  const amb = new THREE.Group(); scene.add(amb);
  const piano = (w, h, m, x, y, z, ry = 0, rx = 0) => { const o = add(amb, new THREE.PlaneGeometry(w, h), m, V(x, y, z)); o.rotation.set(rx, ry, 0); return o; };
  // ---------------------------------------------------------------- pavimento a spina di pesce, tappeto, carta da parati a fiori sbiaditi con lo zoccolo di legno, soffitto
  piano(RX1 - RX0, RZ1 - RZ0, mat(0xffffff, { map: assi('#6A4A30', 10, { rep: [2, 2], seme: 5, nodi: 0.15 }) }), 0, 0, (RZ0 + RZ1) / 2, 0, -Math.PI / 2);
  piano(2.2, 1.6, mat(0xffffff, { map: tex(256, 192, (c, w, h) => { c.fillStyle = '#6B2C2A'; c.fillRect(0, 0, w, h); c.strokeStyle = '#C9A46A'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20); c.lineWidth = 2; c.strokeRect(24, 24, w - 48, h - 48);
    for (let i = 0; i < 14; i++) { c.fillStyle = i % 2 ? '#8A3A34' : '#3E1E22'; c.beginPath(); c.arc(w / 2 + Math.cos(i) * 40, h / 2 + Math.sin(i) * 28, 9, 0, 7); c.fill(); } }) }), 0.05, 0.004, -0.1, 0, -Math.PI / 2);
  const carta = (w) => mat(0xffffff, { map: tex(Math.round(w * 200), 550, (c, ww, h) => { const q = rnd(Math.round(w * 13));
    c.fillStyle = '#9C8A6E'; c.fillRect(0, 0, ww, h);
    for (let x = 0; x < ww; x += 46) { c.fillStyle = 'rgba(120,104,80,0.35)'; c.fillRect(x, 0, 20, h); }
    for (let y = 30; y < h * 0.7; y += 64) for (let x = (y / 64) % 2 ? 23 : 0; x < ww; x += 46) { c.fillStyle = 'rgba(150,80,72,0.55)'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.26) * 6, y + Math.sin(k * 1.26) * 6, 4.5, 0, 7); c.fill(); }
      c.fillStyle = 'rgba(92,110,70,0.5)'; c.beginPath(); c.ellipse(x + 9, y + 12, 7, 3, 0.6, 0, 7); c.fill(); }
    for (let i = 0; i < 26; i++) { const x = q() * ww, y = q() * h, rr = q(40, 140), g = c.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, 'rgba(60,46,30,0.18)'); g.addColorStop(1, 'rgba(60,46,30,0)'); c.fillStyle = g; c.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
    c.fillStyle = '#4E3624'; c.fillRect(0, h * 0.7, ww, h * 0.3); c.fillStyle = '#3A2718'; c.fillRect(0, h * 0.7, ww, 8); c.fillRect(0, h - 16, ww, 16);
    c.strokeStyle = 'rgba(30,20,12,0.5)'; c.lineWidth = 2; for (let x = 0; x < ww; x += 90) { c.beginPath(); c.moveTo(x, h * 0.72); c.lineTo(x, h - 18); c.stroke(); } }) });
  piano(RX1 - RX0, RH, carta(RX1 - RX0), 0, RH / 2, RZ0);
  piano(RZ1 - RZ0, RH, carta(RZ1 - RZ0), RX0, RH / 2, (RZ0 + RZ1) / 2, Math.PI / 2); piano(RZ1 - RZ0, RH, carta(RZ1 - RZ0), RX1, RH / 2, (RZ0 + RZ1) / 2, -Math.PI / 2);
  piano(RX1 - RX0, RZ1 - RZ0, mat('#5E5648'), 0, RH, (RZ0 + RZ1) / 2, 0, Math.PI / 2);
  // ---------------------------------------------------------------- la poltrona di velluto bordeaux col centrino sullo schienale (lei ci sta seduta, girata verso di noi)
  const vel = mat('#5E2228'), P = new THREE.Group(); P.position.set(0, 0, -0.42); amb.add(P);
  add(P, loft([{ y: 0.1, rx: 0.4, rz: 0.4, n: 5 }, { y: 0.36, rx: 0.42, rz: 0.42, n: 5 }, { y: 0.46, rx: 0.4, rz: 0.4, n: 4 }, { y: 0.47, rx: 0.36, rz: 0.36, n: 4 }, { y: 0.47, rx: 0.01, rz: 0.01, n: 4 }], 40), vel);
  add(P, loft([{ y: 0.4, rx: 0.4, rz: 0.13, n: 5, cz: -0.34 }, { y: 1.02, rx: 0.36, rz: 0.12, n: 4, cz: -0.4 }, { y: 1.12, rx: 0.3, rz: 0.1, n: 3, cz: -0.42 }, { y: 1.13, rx: 0.01, rz: 0.01, cz: -0.42 }], 40), vel);
  for (const s of [-1, 1]) add(P, loft([{ y: 0.36, rx: 0.08, rz: 0.4, n: 5, cx: s * 0.4 }, { y: 0.62, rx: 0.085, rz: 0.4, n: 4, cx: s * 0.4 }, { y: 0.66, rx: 0.06, rz: 0.36, n: 4, cx: s * 0.4 }, { y: 0.66, rx: 0.01, rz: 0.01, cx: s * 0.4 }], 28), vel);
  for (const [x, z] of [[-0.34, -0.34], [0.34, -0.34], [-0.34, 0.34], [0.34, 0.34]]) add(P, new THREE.CylinderGeometry(0.022, 0.016, 0.1, 10), mat('#2E1C12'), V(x, 0.05, z));
  const pizzo = tex(256, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#EFE8DA'; c.fillStyle = '#EFE8DA'; c.lineWidth = 3; c.beginPath(); c.arc(w / 2, h / 2, w * 0.46, 0, 7); c.stroke();
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; c.beginPath(); c.arc(w / 2 + Math.cos(a) * w * 0.4, h / 2 + Math.sin(a) * w * 0.4, 12, 0, 7); c.stroke(); c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + Math.cos(a) * w * 0.38, h / 2 + Math.sin(a) * w * 0.38); c.stroke(); }
    for (const rr of [0.12, 0.22, 0.31]) { c.beginPath(); c.arc(w / 2, h / 2, w * rr, 0, 7); c.stroke(); } c.beginPath(); c.arc(w / 2, h / 2, 14, 0, 7); c.fill(); });
  const cent = add(P, new THREE.PlaneGeometry(0.46, 0.34), mat(0xffffff, { map: pizzo, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), V(0, 1.0, -0.288)); cent.rotation.x = -0.08;
  // ---------------------------------------------------------------- il tavolino con la lampada (paralume di stoffa: luce in basso e un cerchio sul soffitto)
  const tav = new THREE.Group(); tav.position.set(-0.72, 0, -0.32); amb.add(tav);
  add(tav, new THREE.CylinderGeometry(0.27, 0.27, 0.03, 32), mat('#3E2616'), V(0, 0.64, 0)); add(tav, new THREE.CylinderGeometry(0.03, 0.04, 0.62, 12), mat('#3E2616'), V(0, 0.32, 0)); add(tav, new THREE.CylinderGeometry(0.17, 0.2, 0.03, 24), mat('#3E2616'), V(0, 0.015, 0));
  const cent2 = add(tav, new THREE.CircleGeometry(0.22, 32), mat(0xffffff, { map: pizzo, transparent: true, alphaTest: 0.3 }), V(0, 0.657, 0)); cent2.rotation.x = -Math.PI / 2;
  const base = new THREE.LatheGeometry([[0.0, 0], [0.075, 0], [0.08, 0.02], [0.055, 0.06], [0.07, 0.16], [0.05, 0.25], [0.018, 0.3], [0.012, 0.42]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
  add(tav, base, new THREE.MeshPhongMaterial({ color: '#B8A27A', specular: '#5A4A30', shininess: 30 }), V(0, 0.655, 0));
  const pm = new THREE.MeshLambertMaterial({ color: '#E8D2A8', side: THREE.DoubleSide, emissive: '#7A5020', emissiveIntensity: 0.6 });
  const paral = add(tav, new THREE.CylinderGeometry(0.11, 0.19, 0.22, 36, 1, true), pm, V(0, 1.14, 0));
  const lampL = new THREE.PointLight('#FFB66E', 0, 5.5, 1.35); lampL.position.set(-0.72, 1.07, -0.32); scene.add(lampL);
  lampL.castShadow = true; lampL.shadow.mapSize.set(1024, 1024); lampL.shadow.camera.near = 0.05; lampL.shadow.camera.far = 6; lampL.shadow.bias = -0.002; lampL.shadow.radius = 4;
  const alL = new THREE.Sprite(new THREE.SpriteMaterial({ map: alone(), color: '#FFC98A', transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending })); alL.position.set(-0.72, 1.12, -0.32); alL.scale.set(0.9, 0.9, 1); scene.add(alL);
  const cerchio = add(scene, new THREE.CircleGeometry(0.75, 32), new THREE.MeshBasicMaterial({ map: alone(), color: '#C9935A', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }), V(-0.72, RH - 0.01, -0.32)); cerchio.rotation.x = Math.PI / 2;
  // ---------------------------------------------------------------- dietro: l'orologio a pendolo sulla parete, la credenza con le foto, la finestra con le tendine di pizzo
  const OR = new THREE.Group(); OR.position.set(0.62, 1.62, RZ0 + 0.06); amb.add(OR);
  add(OR, new THREE.BoxGeometry(0.34, 0.78, 0.12), mat('#3A2414'), V(0, 0, 0)); add(OR, new THREE.CylinderGeometry(0.15, 0.15, 0.03, 36).rotateX(Math.PI / 2), mat('#2C1A0E'), V(0, 0.42, 0.04));
  const quad = add(OR, new THREE.CircleGeometry(0.125, 36), mat(0xffffff, { map: tex(256, 256, (c, w, h) => { c.fillStyle = '#E6DCC4'; c.fillRect(0, 0, w, h); c.fillStyle = '#2A1E12'; c.font = '700 28px Display'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let k = 1; k <= 12; k++) { const a = (k / 12) * Math.PI * 2 - Math.PI / 2; c.fillText(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][k - 1], w / 2 + Math.cos(a) * 96, h / 2 + Math.sin(a) * 96); }
    c.strokeStyle = '#1A120A'; c.lineCap = 'round'; c.lineWidth = 6; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + 52, h / 2 - 4); c.stroke(); c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 - 8, h / 2 - 84); c.stroke(); }) }), V(0, 0.42, 0.057));
  const vetroOr = add(OR, new THREE.PlaneGeometry(0.26, 0.5), new THREE.MeshPhongMaterial({ color: '#141A20', specular: '#C8C0B0', shininess: 90, transparent: true, opacity: 0.45 }), V(0, -0.05, 0.062));
  const pend = new THREE.Group(); pend.position.set(0, 0.22, 0.04); OR.add(pend); tra(pend, V(0, 0, 0), V(0, -0.42, 0), 0.004, 0.004, mat('#B89A5A')); add(pend, new THREE.CylinderGeometry(0.05, 0.05, 0.012, 28).rotateX(Math.PI / 2), new THREE.MeshPhongMaterial({ color: '#C9A458', specular: '#FFF0C0', shininess: 60 }), V(0, -0.44, 0));
  const cred = new THREE.Group(); cred.position.set(-1.25, 0, RZ0 + 0.26); amb.add(cred);
  add(cred, new THREE.BoxGeometry(1.1, 0.86, 0.46), mat(0xffffff, { map: tex(256, 200, (c, w, h) => { c.fillStyle = '#4A2E1A'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2E1C10'; c.lineWidth = 4; for (const x of [6, w / 2 + 3]) c.strokeRect(x, 50, w / 2 - 12, h - 60); c.strokeRect(6, 8, w - 12, 36); c.fillStyle = '#C9A458'; for (const x of [w / 4, (3 * w) / 4]) { c.beginPath(); c.arc(x, 26, 5, 0, 7); c.fill(); } }) }), V(0, 0.43, 0));
  const foto = (x, h, seme) => { const g = new THREE.Group(); g.position.set(x, 0.86, 0.02); g.rotation.x = -0.12; cred.add(g); add(g, new THREE.BoxGeometry(h * 0.75, h, 0.015), mat('#B89A5A'), V(0, h / 2, 0));
    add(g, new THREE.PlaneGeometry(h * 0.6, h * 0.84), mat(0xffffff, { map: tex(96, 128, (c, w, hh) => { const q = rnd(seme); c.fillStyle = '#B9A27C'; c.fillRect(0, 0, w, hh); c.fillStyle = '#5E4A32'; for (let i = 0; i < 1 + (seme % 3); i++) { const px = w * (0.3 + 0.4 * (i / 2)) + q(-6, 6); c.beginPath(); c.arc(px, hh * 0.38, 11, 0, 7); c.fill(); c.fillRect(px - 15, hh * 0.48, 30, hh * 0.5); } }) }), V(0, h / 2, 0.009)); };
  foto(-0.32, 0.2, 4); foto(-0.05, 0.16, 7); foto(0.22, 0.24, 2);
  const fin = new THREE.Group(); fin.position.set(RX0 + 0.02, 0, 0.6); fin.rotation.y = Math.PI / 2; amb.add(fin);
  add(fin, new THREE.PlaneGeometry(1.0, 1.3), basic('#0A1220'), V(0, 1.55, 0.005)); for (const [w, h, x, y] of [[1.08, 0.05, 0, 0.88], [1.08, 0.05, 0, 2.22], [0.05, 1.36, -0.52, 1.55], [0.05, 1.36, 0.52, 1.55], [0.04, 1.3, 0, 1.55]]) add(fin, new THREE.BoxGeometry(w, h, 0.05), mat('#B9B2A2'), V(x, y, 0.02));
  const tend = add(fin, new THREE.PlaneGeometry(1.2, 1.5, 24, 1), new THREE.MeshLambertMaterial({ map: pizzo, color: '#E8E0D0', transparent: true, opacity: 0.55, side: THREE.DoubleSide, alphaTest: 0.05 }), V(0, 1.5, 0.08));
  { const p = tend.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.025 * Math.sin(p.getX(i) * 22)); tend.geometry.computeVertexNormals(); }
  ombre(amb, { fa: true, riceve: true });
  // ---------------------------------------------------------------- luci: la lampada e poco altro (un filo freddo dalla finestra, a sinistra)
  const L = luci(scene, { amb: 0.06, fronte: 0.04, alto: 0, colore: 0xffe2c0, ombre: false });
  const fr = new THREE.PointLight('#5C78B0', 0.5, 4, 1.4); fr.position.set(RX0 + 0.4, 1.6, 0.6); scene.add(fr);
  const A = ada(); scene.add(A.group); ombre(A.group, { fa: true, riceve: false });
  const R = ispettore(); scene.add(R.group); ombre(R.group, { fa: true, riceve: false });
  const telA = telefono(A, 'AR', '#0A0C10');
  return { scene, camera: cam, bloom: 0, A, R,
    update(t, u, o = {}) {
      G.lookFrom(cam, o.cam || [0.15, 1.3, 1.6], o.look || [0.1, 1.2, -0.4], o.roll || 0); cam.fov = o.fov || 40; cam.updateProjectionMatrix(); L.segui(cam, o.look || [0.1, 1.2, -0.4]);
      const kl = o.lampada ?? 1, fl = 1 + 0.015 * Math.sin(t * 31) * Math.sin(t * 7.3);
      lampL.intensity = 3.2 * kl * fl; alL.material.opacity = 0.4 * kl; cerchio.material.opacity = 0.35 * kl; pm.emissiveIntensity = 0.6 * kl;
      L.A.intensity = (o.ambiente ?? 0.06) * PI; L.F.intensity = (o.fronte ?? 0.04) * PI;
      pend.rotation.z = 0.16 * Math.sin((t / 1.0) * Math.PI);                      // un'oscillazione al secondo: il tic-tac
      telA.g.visible = (o.telAda ?? 1) > 0;
      A.pose(o.ada || { pos: [0, 0, -0.38], sit: 1, sedile: 0.47 });
      R.pose(o.riva || { pos: [0.42, 0, -1.05] });
    } };
}
