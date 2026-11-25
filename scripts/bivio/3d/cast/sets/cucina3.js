// La cucina della nonna nello stile «vettoriale 3D»: colori piatti, dettagli dipinti (venature, nodi del legno, quadretti),
// luce calda della lampada e della stufa, ombre morbide a terra. Dentro: stufa col fuoco e la pentola che fuma, tavola con la
// tovaglia a quadri e tre piatti, due sedie, lampada, pendolo, finestra chiusa con le assi, mensole, la porta con tre catenacci,
// le foto dei nipoti. update(t, u, o): { cam, look, fov, roll, nonna, tu, piatto:[x,y,z] (il piatto in mano alla nonna), pendolo, ore, lampo }.
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { THREE, V, rnd, tex, mat, piatto as basic, sfera, add, tra, luci, ombre, alone, PI } from './stile.js';
import { nonna3, tu3 } from './cast.js';
import { mix } from './pupazzi.js';

// legno dipinto: assi con toni diversi, venature e qualche nodo
export const assi = (base, n, o = {}) => tex(o.w || 512, o.h || 512, (c, w, h) => {
  const r = rnd(o.seme || 21), vert = o.vert !== false;
  for (let i = 0; i < n; i++) {
    const t = r(-0.07, 0.07); c.globalAlpha = 1; c.fillStyle = mix(base, t > 0 ? '#ffffff' : '#000000', Math.abs(t) * 1.5);
    if (vert) c.fillRect((i * w) / n, 0, w / n + 1, h); else c.fillRect(0, (i * h) / n, w, h / n + 1);
    c.strokeStyle = mix(base, '#000000', 0.25); c.globalAlpha = 0.3; c.lineWidth = 1.6;
    for (let k = 0; k < 3; k++) { const a = r(0.15, 0.85); c.beginPath();
      if (vert) { const x = ((i + a) * w) / n; c.moveTo(x, 0); c.bezierCurveTo(x + r(-7, 7), h * 0.3, x + r(-7, 7), h * 0.7, x + r(-4, 4), h); }
      else { const y = ((i + a) * h) / n; c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + r(-6, 6), w * 0.7, y + r(-6, 6), w, y + r(-3, 3)); }
      c.stroke(); }
    if (r() < (o.nodi ?? 0.45)) { const kx = vert ? ((i + r(0.3, 0.7)) * w) / n : r() * w, ky = vert ? r() * h : ((i + r(0.3, 0.7)) * h) / n;
      c.globalAlpha = 0.45; c.fillStyle = mix(base, '#000000', 0.4); c.beginPath(); c.ellipse(kx, ky, vert ? 5 : 9, vert ? 9 : 5, 0, 0, 7); c.fill();
      c.globalAlpha = 0.3; c.beginPath(); c.ellipse(kx, ky, vert ? 9 : 16, vert ? 16 : 9, 0, 0, 7); c.stroke(); }
    c.globalAlpha = 0.8; c.fillStyle = mix(base, '#000000', 0.45); if (vert) c.fillRect((i * w) / n, 0, 2.5, h); else c.fillRect(0, (i * h) / n, w, 2.5);
  }
  c.globalAlpha = 1;
}, o.rep || null);

export function cucina3Set() {
  const r = rnd(77), scene = new THREE.Scene(); scene.background = new THREE.Color('#1a100b');
  const cam = G.camera(38, 0.03, 60); scene.add(cam);
  const amb = new THREE.Group(); scene.add(amb);                                  // tutto l'ambiente (riceve le ombre)
  const box = (w, h, d, m, pos, p = amb) => add(p, new THREE.BoxGeometry(w, h, d), m, pos);
  const cyl = (rt, rb, h, m, pos, p = amb, seg = 28) => add(p, new THREE.CylinderGeometry(rt, rb, h, seg), m, pos);
  const legno = (base, n, o) => mat(0xffffff, { map: assi(base, n, o) });

  // stanza
  const fl = add(amb, new THREE.PlaneGeometry(4.4, 4.6), legno('#9A6238', 9, { vert: false, rep: [1.5, 1.5], seme: 5 }), V(0, 0, -0.1)); fl.rotation.x = -Math.PI / 2;
  const muro = mat(0xffffff, { map: tex(512, 512, (c, w, h) => { c.fillStyle = '#D9A466'; c.fillRect(0, 0, w, h); const q = rnd(3);
    for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(${q() < 0.5 ? '255,240,215' : '150,100,60'},${q(0.03, 0.07)})`; c.beginPath(); c.arc(q() * w, q() * h, q(6, 40), 0, 7); c.fill(); } }) });
  const zocc = legno('#7A4B2A', 14, { seme: 9, nodi: 0.3 });
  for (const [w, pos, rot] of [[4.4, V(0, 1.3, -2.4), 0], [4.6, V(-2.2, 1.3, -0.1), Math.PI / 2], [4.6, V(2.2, 1.3, -0.1), -Math.PI / 2]]) {
    const wall = add(amb, new THREE.PlaneGeometry(w, 2.6), muro, pos); wall.rotation.y = rot;
    const low = add(amb, new THREE.PlaneGeometry(w, 1.0), zocc, pos.clone().setY(0.5).add(V(Math.sin(rot) * 0.012, 0, Math.cos(rot) * 0.012))); low.rotation.y = rot;
    const bat = add(amb, new THREE.PlaneGeometry(w, 0.06), mat('#5A3519'), pos.clone().setY(1.02).add(V(Math.sin(rot) * 0.02, 0, Math.cos(rot) * 0.02))); bat.rotation.y = rot;
  }
  const trave = mat('#5E3A1E');
  for (let i = 0; i < 5; i++) box(4.4, 0.16, 0.18, trave, V(0, 2.55, -2.2 + i * 1.0));
  const sof = add(amb, new THREE.PlaneGeometry(4.4, 4.6), mat('#7A5230'), V(0, 2.62, -0.1)); sof.rotation.x = Math.PI / 2;

  // stufa a legna: fuoco, pentola del brodo che fuma
  const ferro = mat('#2B2B30'), ferro2 = mat('#3A3A42');
  const stufa = new THREE.Group(); stufa.position.set(-1.6, 0, -1.8); amb.add(stufa);
  box(0.66, 0.64, 0.52, ferro, V(0, 0.42, 0), stufa); box(0.72, 0.045, 0.58, ferro2, V(0, 0.762, 0), stufa);
  for (const s of [-1, 1]) for (const z of [-1, 1]) cyl(0.028, 0.022, 0.12, ferro, V(s * 0.27, 0.05, z * 0.2), stufa, 10);
  cyl(0.065, 0.065, 1.95, ferro, V(0.17, 1.75, -0.1), stufa, 18);
  box(0.36, 0.26, 0.012, basic('#3A0F04'), V(0, 0.42, 0.262), stufa); box(0.4, 0.3, 0.008, ferro2, V(0, 0.42, 0.258), stufa);
  const fiamme = []; for (let i = 0; i < 6; i++) { const f = add(stufa, new THREE.ConeGeometry(0.036 + r(0, 0.02), 0.17, 10), basic(['#FFB43A', '#FF7A1A', '#FFD36B'][i % 3], { transparent: true, opacity: 0.95 }), V(-0.12 + i * 0.048, 0.38, 0.27)); f.userData.ph = r(0, 6); fiamme.push(f); }
  const bagliore = new THREE.Sprite(new THREE.SpriteMaterial({ map: alone(), color: '#FF8A3A', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); bagliore.position.set(-1.6, 0.42, -1.45); bagliore.scale.set(1.3, 1.0, 1); scene.add(bagliore);
  const pent = new THREE.Group(); pent.position.set(-0.05, 0.785, 0.02); stufa.add(pent);
  cyl(0.15, 0.135, 0.2, mat('#B03A2E'), V(0, 0.1, 0), pent); add(pent, new THREE.TorusGeometry(0.15, 0.012, 8, 32), mat('#F3EEE4'), V(0, 0.2, 0)).rotation.x = Math.PI / 2;
  add(pent, new THREE.CircleGeometry(0.14, 28), mat('#D8923A'), V(0, 0.19, 0)).rotation.x = -Math.PI / 2;
  for (const s of [-1, 1]) add(pent, new THREE.TorusGeometry(0.03, 0.009, 8, 16, Math.PI), mat('#2B2B30'), V(s * 0.165, 0.15, 0)).rotation.set(0, 0, s * -Math.PI / 2);
  const vapore = []; for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: alone(), color: '#FFF6EA', transparent: true, opacity: 0, depthWrite: false })); scene.add(s); vapore.push(s); }
  const luceFuoco = new THREE.PointLight('#FF7A2A', 0.9, 5, 1.6); luceFuoco.position.set(-1.6, 0.5, -1.35); scene.add(luceFuoco);

  // tavola: tovaglia a quadri, tre piatti, cucchiai, pane, brocca, bicchieri
  const tav = new THREE.Group(); tav.position.set(0, 0, -0.55); amb.add(tav);
  const noce = legno('#8A5530', 5, { seme: 13, nodi: 0.2 });
  for (const s of [-1, 1]) for (const z of [-1, 1]) box(0.07, 0.74, 0.07, noce, V(s * 0.66, 0.37, z * 0.36), tav);
  const quadri = (rep) => mat(0xffffff, { map: tex(256, 256, (c, w, h) => { c.fillStyle = '#F6EFE3'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(190,36,44,0.62)'; for (let i = 0; i < 8; i++) { c.fillRect(i * 32, 0, 16, h); c.fillRect(0, i * 32, w, 16); } }, rep), side: THREE.DoubleSide });
  box(1.52, 0.03, 0.92, quadri([5, 3]), V(0, 0.762, 0), tav);
  box(1.52, 0.22, 0.012, quadri([5, 0.75]), V(0, 0.655, 0.46), tav); box(1.52, 0.22, 0.012, quadri([5, 0.75]), V(0, 0.655, -0.46), tav);
  for (const s of [-1, 1]) box(0.012, 0.22, 0.92, quadri([3, 0.75]), V(s * 0.76, 0.655, 0), tav);
  const cer = mat('#FAF7F0'), bordo = mat('#3F66A8'), acciaio = mat('#C4C8CE');
  const piattoIn = (p) => { const g = new THREE.Group(); p.add(g); cyl(0.125, 0.085, 0.022, cer, V(0, 0.011, 0), g, 36); add(g, new THREE.TorusGeometry(0.117, 0.006, 8, 44), bordo, V(0, 0.022, 0)).rotation.x = Math.PI / 2; add(g, new THREE.CircleGeometry(0.085, 32), mat('#F0EBE0'), V(0, 0.0225, 0)).rotation.x = -Math.PI / 2; return g; };
  const POSTI = [V(-0.5, 0.777, 0.02), V(0.5, 0.777, 0.02), V(0, 0.777, -0.3)];        // tu, il posto vuoto, la nonna
  const piatti = POSTI.map((p) => { const g = piattoIn(tav); g.position.copy(p); return g; });
  POSTI.forEach((p, i) => { const sp = new THREE.Group(); sp.position.set(p.x + (i === 2 ? 0.17 : 0), 0.781, p.z + (i === 2 ? 0 : 0.17)); sp.rotation.y = i === 2 ? 0 : Math.PI / 2 * (i ? -1 : 1); tav.add(sp);
    box(0.012, 0.004, 0.12, acciaio, V(0, 0, 0.02), sp); add(sp, sfera(1, 12), acciaio, V(0, 0.001, -0.06), [0.02, 0.005, 0.028]); });
  add(tav, sfera(1, 22), mat('#C98A4A'), V(0.3, 0.815, 0.26), [0.14, 0.05, 0.085]); for (let i = -1; i <= 1; i++) tra(tav, V(0.3 + i * 0.07 - 0.02, 0.86, 0.23), V(0.3 + i * 0.07 + 0.02, 0.86, 0.29), 0.006, 0.006, mat('#A86A30'));
  const brocca = new THREE.Group(); brocca.position.set(-0.22, 0.777, -0.22); tav.add(brocca);
  cyl(0.055, 0.07, 0.2, mat('#8FB7C9', { transparent: true, opacity: 0.75 }), V(0, 0.1, 0), brocca, 24); add(brocca, new THREE.TorusGeometry(0.045, 0.008, 8, 18, Math.PI), mat('#8FB7C9'), V(0.075, 0.11, 0)).rotation.z = -Math.PI / 2;
  for (const p of [V(-0.36, 0.777, 0.2), V(0.36, 0.777, -0.14), V(0.2, 0.777, -0.2)]) cyl(0.03, 0.025, 0.09, mat('#CFE3EA', { transparent: true, opacity: 0.6 }), p.clone().setY(0.822), tav, 18);
  // sedie (a sinistra e a destra della tavola; la nonna sta in piedi in fondo)
  const paglia = mat('#D8B56A');
  const sedia = (x, z, rotY) => { const ch = new THREE.Group(); ch.position.set(x, 0, z); ch.rotation.y = rotY; tav.add(ch);
    box(0.44, 0.04, 0.44, paglia, V(0, 0.46, 0), ch); box(0.46, 0.035, 0.46, noce, V(0, 0.435, 0), ch);
    for (const s of [-1, 1]) for (const zz of [-1, 1]) box(0.045, 0.44, 0.045, noce, V(s * 0.19, 0.22, zz * 0.19), ch);
    for (const s of [-1, 1]) box(0.045, 0.54, 0.045, noce, V(s * 0.19, 0.73, -0.2), ch);
    for (const y of [0.72, 0.86, 0.98]) box(0.4, 0.055, 0.03, noce, V(0, y, -0.2), ch); return ch; };
  sedia(-0.95, 0.05, Math.PI / 2); sedia(0.95, 0.05, -Math.PI / 2);
  // tappeto
  const tap = add(amb, new THREE.PlaneGeometry(2.3, 1.7), mat(0xffffff, { map: tex(256, 192, (c, w, h) => { c.fillStyle = '#8C3B36'; c.fillRect(0, 0, w, h); c.strokeStyle = '#D9B26A'; c.lineWidth = 6; c.strokeRect(12, 12, w - 24, h - 24); c.strokeStyle = '#5E2622'; c.lineWidth = 3; c.strokeRect(24, 24, w - 48, h - 48);
    c.fillStyle = '#D9B26A'; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(48 + i * 26, h / 2); c.lineTo(61 + i * 26, h / 2 - 16); c.lineTo(74 + i * 26, h / 2); c.lineTo(61 + i * 26, h / 2 + 16); c.closePath(); c.fill(); } }) }), V(0, 0.006, -0.5)); tap.rotation.x = -Math.PI / 2;

  // lampada sopra la tavola, col suo cono di luce
  const lamp = new THREE.Group(); lamp.position.set(0, 2.02, -0.55); scene.add(lamp);
  tra(lamp, V(0, 0.6, 0), V(0, 0.12, 0), 0.006, 0.006, mat('#222222'));
  add(lamp, new THREE.ConeGeometry(0.24, 0.17, 36, 1, true), mat('#2F5A46', { side: THREE.DoubleSide }), V(0, 0.05, 0));
  add(lamp, sfera(0.045, 16), basic('#FFE9BE'), V(0, -0.015, 0));
  const aloneL = new THREE.Sprite(new THREE.SpriteMaterial({ map: alone(), color: '#FFC27A', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending })); aloneL.position.set(0, 1.98, -0.55); aloneL.scale.set(1.5, 1.5, 1); scene.add(aloneL);
  const cono = add(scene, new THREE.ConeGeometry(0.95, 1.25, 40, 1, true), new THREE.MeshBasicMaterial({ color: '#FFC98A', transparent: true, opacity: 0.085, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    map: tex(8, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }) }), V(0, 1.4, -0.55));
  const luceL = new THREE.PointLight('#FFC48A', 0.55, 6, 1.5); luceL.position.set(0, 1.9, -0.55); scene.add(luceL);

  // pendolo
  const clock = new THREE.Group(); clock.position.set(1.3, 1.25, -2.33); amb.add(clock);
  box(0.38, 1.34, 0.16, legno('#6B3F22', 3, { seme: 31, nodi: 0.2 }), V(0, 0.35, 0), clock); box(0.44, 0.07, 0.2, mat('#4E2C16'), V(0, 1.05, 0), clock); box(0.44, 0.07, 0.2, mat('#4E2C16'), V(0, -0.35, 0), clock);
  add(clock, new THREE.CircleGeometry(0.145, 44), mat(0xffffff, { map: tex(256, 256, (c) => { c.fillStyle = '#F2E9D3'; c.beginPath(); c.arc(128, 128, 122, 0, 7); c.fill(); c.strokeStyle = '#3A2A1A'; c.lineWidth = 7; c.stroke(); c.fillStyle = '#2A1D12'; c.font = '700 30px Display'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; c.fillText(String(i), 128 + Math.sin(a) * 94, 128 - Math.cos(a) * 94); } }) }), V(0, 0.85, 0.085));
  const lanc = basic('#1A1410'), oreG = new THREE.Group(), minG = new THREE.Group(); oreG.position.set(0, 0.85, 0.09); minG.position.set(0, 0.85, 0.093); clock.add(oreG, minG);
  box(0.014, 0.075, 0.004, lanc, V(0, 0.032, 0), oreG); box(0.009, 0.115, 0.004, lanc, V(0, 0.052, 0), minG);
  box(0.24, 0.62, 0.006, mat('#2E1D12'), V(0, 0.15, 0.082), clock);
  const pend = new THREE.Group(); pend.position.set(0, 0.6, 0.092); clock.add(pend);
  tra(pend, V(0, 0, 0), V(0, -0.42, 0), 0.006, 0.006, mat('#C9A457')); const disco = add(pend, new THREE.CylinderGeometry(0.055, 0.055, 0.012, 30), mat('#D9B565'), V(0, -0.44, 0)); disco.rotation.x = Math.PI / 2;

  // finestra chiusa con le assi (fuori: notte, pioggia, lampi)
  const win = new THREE.Group(); win.position.set(-0.5, 1.5, -2.385); amb.add(win);
  const fuori = add(win, new THREE.PlaneGeometry(0.92, 1.02), basic('#16233A'));
  box(1.04, 0.075, 0.08, noce, V(0, 0.545, 0.02), win); box(1.04, 0.075, 0.08, noce, V(0, -0.545, 0.02), win); for (const s of [-1, 1]) box(0.075, 1.16, 0.08, noce, V(s * 0.52, 0, 0.02), win);
  box(0.03, 1.02, 0.03, noce, V(0, 0, 0.012), win); box(0.92, 0.03, 0.03, noce, V(0, 0, 0.012), win);
  const asseM = legno('#A8743F', 1, { vert: false, seme: 41, nodi: 0.9 });
  [[0.34, -0.07], [0.1, 0.06], [-0.14, -0.045], [-0.37, 0.05]].forEach(([y, rot], i) => { const b = box(1.12, 0.17, 0.035, asseM, V(0, y, 0.075), win); b.rotation.z = rot;
    for (const s of [-1, 1]) add(win, sfera(0.011, 10), mat('#3A3A3A'), V(s * 0.48, y + s * rot * 0.48, 0.096)); });

  // mensole coi barattoli (parete di destra, in fondo)
  for (const y of [1.28, 1.68]) { const m = box(0.95, 0.045, 0.25, mat('#6B4426'), V(2.07, y, -1.5)); m.rotation.y = -Math.PI / 2; }
  for (let i = 0; i < 9; i++) { const y = i < 5 ? 1.305 : 1.705, z = -1.86 + (i % 5) * 0.18, hh = r(0.11, 0.17); cyl(0.05, 0.05, hh, mat(['#B5523A', '#8AA05A', '#D9B45A', '#6A85A8'][i % 4]), V(2.04, y + hh / 2, z), amb, 18); cyl(0.052, 0.052, 0.025, mat('#E8DFCB'), V(2.04, y + hh + 0.012, z), amb, 18); }
  // la porta con tre catenacci nuovi (parete di destra, davanti)
  const porta = new THREE.Group(); porta.position.set(2.185, 0, 0.75); porta.rotation.y = -Math.PI / 2; amb.add(porta);
  box(0.92, 2.02, 0.05, legno('#6E4426', 5, { seme: 51 }), V(0, 1.01, 0), porta); box(1.06, 0.09, 0.07, mat('#4E2C16'), V(0, 2.07, 0), porta); for (const s of [-1, 1]) box(0.08, 2.1, 0.07, mat('#4E2C16'), V(s * 0.5, 1.05, 0), porta);
  const lucido = mat('#D5D9DE');
  [1.72, 1.2, 0.68].forEach((y) => { box(0.2, 0.07, 0.02, lucido, V(-0.33, y, 0.04), porta); box(0.09, 0.07, 0.02, lucido, V(-0.5, y, 0.05), porta); tra(porta, V(-0.5, y, 0.058), V(-0.24, y, 0.058), 0.012, 0.012, mat('#AEB4BB')); add(porta, sfera(0.016, 10), lucido, V(-0.28, y + 0.03, 0.062)); });
  add(porta, sfera(0.03, 14), mat('#B8964E'), V(-0.36, 0.98, 0.06));
  // le foto dei nipoti in cornice
  const foto = (x, y, capelli, maglia, w = 0.26) => { box(w + 0.05, w * 1.25 + 0.05, 0.02, mat('#5A3519'), V(x, y, -2.385)); add(amb, new THREE.PlaneGeometry(w, w * 1.25), mat(0xffffff, { map: tex(128, 160, (c, ww, h) => { c.fillStyle = '#D9C9A6'; c.fillRect(0, 0, ww, h); c.fillStyle = maglia; c.beginPath(); c.ellipse(64, 158, 46, 44, 0, 0, 7); c.fill();
      c.fillStyle = '#EFC9AE'; c.beginPath(); c.ellipse(64, 78, 26, 31, 0, 0, 7); c.fill(); c.fillStyle = capelli; c.beginPath(); c.ellipse(64, 60, 28, 22, 0, Math.PI, 0); c.fill(); c.fillStyle = '#3A2A20'; for (const s of [-1, 1]) { c.beginPath(); c.arc(64 + s * 10, 80, 2.6, 0, 7); c.fill(); }
      c.strokeStyle = '#8A4A3A'; c.lineWidth = 2; c.beginPath(); c.arc(64, 88, 8, 0.2, Math.PI - 0.2); c.stroke(); c.fillStyle = 'rgba(255,240,200,0.18)'; c.fillRect(0, 0, ww, h); }) }), V(x, y, -2.372)); };
  foto(0.28, 1.72, '#3A2A20', '#2E6F73'); foto(0.66, 1.62, '#9A4A2A', '#D9A441', 0.22); foto(0.3, 1.34, '#DDDBD7', '#8E7CB6', 0.2);

  ombre(amb, { fa: true, riceve: true });
  // luci dello stile + personaggi
  const L = luci(scene, { amb: 0.47, fronte: 0.33, alto: 0.2, colore: 0xffe9d0, altoPos: [0.35, 4.2, 0.9], altoVerso: [0, 0, -0.7], area: 3.2 });
  const N = nonna3(), T = tu3(); scene.add(N.group, T.group);
  const inMano = piattoIn(scene);                                       // il piatto che la nonna posa (il suo, in fondo alla tavola)
  const casa = tav.localToWorld(POSTI[2].clone());

  return { scene, camera: cam, bloom: 0, N, T, posto: (i) => tav.localToWorld(POSTI[i].clone()),
    update(t, u, o = {}) {
      G.lookFrom(cam, o.cam || [0, 1.5, 1.9], o.look || [0, 1.0, -0.7], o.roll || 0); cam.fov = o.fov || 38; cam.updateProjectionMatrix(); L.segui(cam, o.look || [0, 1.0, -0.7]);
      fiamme.forEach((f, i) => { const k = 0.75 + 0.35 * Math.sin(t * (9 + i) + f.userData.ph) * Math.sin(t * 5.3 + i); f.scale.set(1, k, 1); f.position.y = 0.36 + 0.045 * k; });
      luceFuoco.intensity = 0.9 * (0.85 + 0.2 * Math.sin(t * 11) * Math.sin(t * 6.7 + 1)); bagliore.material.opacity = 0.45 + 0.15 * Math.sin(t * 9);
      luceL.intensity = 0.55 * (0.97 + 0.03 * Math.sin(t * 17));
      pend.rotation.z = 0.22 * (o.pendolo ?? 1) * Math.sin(t * Math.PI);
      const ore = o.ore ?? 8.25; oreG.rotation.z = -(ore / 12) * Math.PI * 2; minG.rotation.z = -(ore % 1) * Math.PI * 2;
      vapore.forEach((s, i) => { const age = (t * 0.5 + i / vapore.length) % 1; s.position.set(-1.65 + Math.sin(i * 2.1 + t) * 0.05, 1.02 + age * 0.6, -1.76 + Math.cos(i * 1.3) * 0.04); s.scale.setScalar(0.1 + age * 0.26); s.material.opacity = 0.4 * Math.sin(age * Math.PI); });
      const fl2 = o.lampo || 0; fuori.material.color.setRGB(0.086 + 0.85 * fl2, 0.137 + 0.82 * fl2, 0.227 + 0.75 * fl2);
      N.pose(o.nonna || { pos: [0, 0, -1.2] }); T.pose(o.tu || { pos: [-0.95, 0, -0.5], yaw: Math.PI / 2, sit: 1 });
      if (o.piatto) { piatti[2].visible = false; inMano.visible = true; inMano.position.set(...o.piatto); } else { piatti[2].visible = true; inMano.visible = false; }
    } };
}
