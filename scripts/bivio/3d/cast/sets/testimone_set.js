// «Il testimone»: i due ambienti della scena dello spioncino, nello stile vettoriale 3D.
//  - ingressoSet(): il corridoio d'ingresso di casa tua, di notte: porta blindata in fondo con la striscia di luce sotto
//    (e l'ombra di due piedi che arriva), luce fredda dalla cucina, attaccapanni, mobiletto. Dentro ci sei tu col telefono in mano.
//  - pianerottoloSet(): il pianerottolo visto dallo spioncino: luce gialla delle scale, muri a due colori, la porta dell'interno 11,
//    l'ascensore, la ringhiera. Dentro c'è l'ispettore.
// update(t, u, o): { cam, look, fov, roll, tu | isp: {...posa}, piedi 0..1, colpo 0..1 (la porta che vibra), ... }
// ingressoSet, per le immagini delle carte: amb e fronte (luce di base, 0.2 e 0.1), luce: { pos, k, colore } (una luce in più vicino al soggetto)
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { THREE, V, rnd, tex, mat, piatto as basic, sfera, add, tra, luci, ombre, alone, PI } from './stile.js';
import { testimone, ispettore , telefono } from './adulti.js';
import { assi } from './cucina3.js';
import { mix } from './pupazzi.js';

const sfum = (a, b) => tex(8, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, w, h); });
const macchia = (col) => new THREE.MeshBasicMaterial({ map: alone(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

// porta blindata con spioncino, maniglia e serratura; z = faccia verso chi guarda
function porta(p, { numero = null, colore = '#4A3226' } = {}) {
  const g = new THREE.Group(); p.add(g);
  const m = mat(0xffffff, { map: tex(256, 512, (c, w, h) => { c.fillStyle = colore; c.fillRect(0, 0, w, h); c.strokeStyle = mix(colore, '#000000', 0.35); c.lineWidth = 5;
    for (const [x, y, ww, hh] of [[28, 30, 200, 190], [28, 250, 200, 232]]) c.strokeRect(x, y, ww, hh);
    c.strokeStyle = mix(colore, '#ffffff', 0.12); c.lineWidth = 2; for (const [x, y, ww, hh] of [[34, 36, 188, 178], [34, 256, 188, 220]]) c.strokeRect(x, y, ww, hh); }) });
  add(g, new THREE.BoxGeometry(0.9, 2.08, 0.06), m, V(0, 1.04, 0));
  const tel = mat(mix(colore, '#000000', 0.45));
  add(g, new THREE.BoxGeometry(1.06, 0.1, 0.1), tel, V(0, 2.13, 0)); for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.09, 2.18, 0.1), tel, V(s * 0.495, 1.09, 0));
  const ott = mat('#C9A24A');
  add(g, new THREE.TorusGeometry(0.018, 0.006, 8, 20), ott, V(0, 1.52, 0.034)); add(g, new THREE.BoxGeometry(0.05, 0.16, 0.012), ott, V(0.36, 1.0, 0.034));
  tra(g, V(0.36, 1.02, 0.034), V(0.36, 1.02, 0.087), 0.014, 0.012, ott); tra(g, V(0.365, 1.02, 0.085), V(0.225, 1.02, 0.085), 0.0115, 0.0105, ott);          // maniglia a leva (verso il centro della porta)
  if (numero) add(g, new THREE.PlaneGeometry(0.16, 0.09), mat(0xffffff, { map: tex(128, 72, (c, w, h) => { c.fillStyle = '#C9A24A'; c.fillRect(0, 0, w, h); c.fillStyle = '#3A2A12'; c.font = '700 44px Display'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(numero, w / 2, h / 2 + 3); }) }), V(0, 1.72, 0.034));
  return g;
}

// la leva della porta d'ingresso nel mondo (la porta sta a z = -2.56): a = punta libera, b = perno, r = raggio. Serve a chi la impugna.
export const LEVA_INGRESSO = { a: [0.225, 1.02, -2.475], b: [0.365, 1.02, -2.475], r: 0.011 };
// ------------------------------------------------------------------ l'ingresso di casa, di notte
export function ingressoSet() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#05070c');
  const cam = G.camera(44, 0.03, 40); scene.add(cam);
  const amb = new THREE.Group(); scene.add(amb);
  const box = (w, h, d, m, pos) => add(amb, new THREE.BoxGeometry(w, h, d), m, pos);
  // corridoio: z da -2.6 (porta) a +2.2; muri a x = ±0.78
  const fl = add(amb, new THREE.PlaneGeometry(1.56, 5), mat(0xffffff, { map: assi('#8A6442', 7, { vert: true, rep: [1, 3], seme: 61, nodi: 0.25 }) }), V(0, 0, -0.1)); fl.rotation.x = -Math.PI / 2;
  const muro = mat('#CFC8B8');
  const wr = add(amb, new THREE.PlaneGeometry(5, 2.6), muro, V(0.78, 1.3, -0.1)); wr.rotation.y = -Math.PI / 2;
  // muro di sinistra con l'apertura della cucina (z da -0.35 a 0.75)
  for (const [z0, z1] of [[-2.6, -0.35], [0.75, 2.4]]) { const w = add(amb, new THREE.PlaneGeometry(z1 - z0, 2.6), muro, V(-0.78, 1.3, (z0 + z1) / 2)); w.rotation.y = Math.PI / 2; }
  const sopra = add(amb, new THREE.PlaneGeometry(1.1, 0.5), muro, V(-0.78, 2.35, 0.2)); sopra.rotation.y = Math.PI / 2;
  const fondo = add(amb, new THREE.PlaneGeometry(1.56, 2.6), muro, V(0, 1.3, -2.6));
  const sof = add(amb, new THREE.PlaneGeometry(1.56, 5), mat('#DAD4C6'), V(0, 2.6, -0.1)); sof.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) box(0.02, 0.1, 5, mat('#6E5038'), V(s * 0.77, 0.05, -0.1));
  // la cucina dietro l'apertura: buio azzurro, la finestra accesa dalla luna
  const cuc = add(scene, new THREE.PlaneGeometry(1.1, 2.1), basic('#101B2E'), V(-1.9, 1.05, 0.2)); cuc.rotation.y = Math.PI / 2;
  const fin = add(scene, new THREE.PlaneGeometry(0.55, 0.8), basic('#5C7FB8'), V(-1.88, 1.5, 0.2)); fin.rotation.y = Math.PI / 2;
  for (const dz of [0]) { const tl = add(scene, new THREE.PlaneGeometry(0.03, 0.8), basic('#16233A'), V(-1.87, 1.5, 0.2 + dz)); tl.rotation.y = Math.PI / 2; }
  const luna = add(scene, new THREE.PlaneGeometry(1.5, 1.2), macchia('#6C8FD0'), V(-0.1, 0.012, 0.2)); luna.rotation.x = -Math.PI / 2; luna.material.opacity = 0.55;
  // porta d'ingresso in fondo, vista da dentro
  const P = new THREE.Group(); P.position.set(0, 0, -2.56); amb.add(P);
  const pg = porta(P, { colore: '#3E2C23' });
  const occhio = add(P, sfera(0.008, 10), basic('#FFE2A8'), V(0, 1.52, 0.042));
  const alOcchio = new THREE.Sprite(macchia('#FFC56E')); alOcchio.position.set(0, 1.52, -2.5); alOcchio.scale.set(0.16, 0.16, 1); scene.add(alOcchio);
  // striscia di luce sotto la porta, la luce che entra sul pavimento, l'ombra dei piedi
  const striscia = add(scene, new THREE.PlaneGeometry(0.84, 0.022), basic('#FFDFA6'), V(0, 0.013, -2.522));
  const pozza = add(scene, new THREE.PlaneGeometry(1.3, 1.5), macchia('#FFB864'), V(0, 0.014, -2.2)); pozza.rotation.x = -Math.PI / 2; pozza.material.opacity = 0.55;
  const piedi = [-1, 1].map((s) => { const g = new THREE.Group(); scene.add(g); add(g, new THREE.PlaneGeometry(0.115, 0.03), basic('#07080B'), V(0, 0.013, -2.52));
    const om = add(g, new THREE.PlaneGeometry(0.13, 0.9), new THREE.MeshBasicMaterial({ map: sfum('rgba(0,0,0,0)', 'rgba(0,0,0,0.85)'), transparent: true, depthWrite: false }), V(0, 0.016, -2.06)); om.rotation.x = -Math.PI / 2; g.userData.s = s; return g; });
  // attaccapanni con giacca e sciarpa, portaombrelli, mobiletto con svuotatasche e chiavi, quadro
  box(0.5, 0.05, 0.03, mat('#5B4130'), V(0.76, 1.72, -1.5)).rotation.y = -Math.PI / 2;
  for (let i = -1; i <= 1; i++) add(amb, sfera(0.014, 8), mat('#C9A24A'), V(0.74, 1.7, -1.5 + i * 0.17));
  add(amb, sfera(1, 20), mat('#2A3530'), V(0.69, 1.22, -1.6), [0.085, 0.5, 0.19]); add(amb, sfera(1, 16), mat('#39464F'), V(0.71, 1.3, -1.33), [0.05, 0.4, 0.1]);
  add(amb, new THREE.CylinderGeometry(0.1, 0.085, 0.45, 20, 1, true), mat('#3D4654', { side: THREE.DoubleSide }), V(0.62, 0.225, -2.25)); tra(amb, V(0.6, 0.2, -2.25), V(0.66, 0.92, -2.3), 0.012, 0.012, mat('#16181C'));
  box(0.26, 0.74, 0.7, mat(0xffffff, { map: assi('#6B4A32', 3, { seme: 71, nodi: 0.2 }) }), V(-0.64, 0.37, -1.55));
  add(amb, new THREE.CylinderGeometry(0.09, 0.06, 0.04, 20), mat('#B9C2CC'), V(-0.64, 0.76, -1.4)); add(amb, new THREE.TorusGeometry(0.018, 0.004, 6, 14), mat('#C9A24A'), V(-0.63, 0.785, -1.4)).rotation.x = Math.PI / 2;
  box(0.02, 0.4, 0.3, mat('#4E3626'), V(-0.765, 1.55, -1.55)); const qd = add(amb, new THREE.PlaneGeometry(0.24, 0.34), mat('#8FA2B4'), V(-0.752, 1.55, -1.55)); qd.rotation.y = Math.PI / 2;
  ombre(amb, { fa: false, riceve: false });
  // luci: buio azzurro, più la luce calda da sotto la porta e il telefono
  const L = luci(scene, { amb: 0.2, fronte: 0.1, alto: 0, colore: 0x93aee6, ombre: false });
  const lCuc = new THREE.PointLight('#7FA2E6', 0.9, 5, 1.4); lCuc.position.set(-1.2, 1.4, 0.2); scene.add(lCuc);
  const lPorta = new THREE.PointLight('#FFB25E', 0.45, 3.2, 1.6); lPorta.position.set(0, 0.25, -2.3); scene.add(lPorta);
  const lTel = new THREE.PointLight('#CFE0FF', 0.3, 1.6, 1.5); scene.add(lTel);
  const lOcchio = new THREE.PointLight('#FFC27A', 0, 1.4, 1.5); lOcchio.position.set(0.02, 1.68, -2.5); scene.add(lOcchio);
  const lExtra = new THREE.PointLight('#FFE6C4', 0, 2.4, 1.2); scene.add(lExtra);          // una luce in più da mettere dove serve (le immagini delle carte)
  const T = testimone(); scene.add(T.group);
  // il telefono nella sua mano (schermo acceso verso di lui)
  const tel = telefono(T, 'AR').g;
  const tmp = V(0, 0, 0);
  return { scene, camera: cam, bloom: 0, T,
    update(t, u, o = {}) {
      G.lookFrom(cam, o.cam || [0.4, 1.55, 1.3], o.look || [0, 1.0, -2.4], o.roll || 0); cam.fov = o.fov || 44; cam.updateProjectionMatrix(); L.segui(cam, o.look || [0, 1.0, -2.4]);
      const k = M.clamp(o.piedi || 0);
      piedi.forEach((g) => { g.position.x = g.userData.s * 0.1 + (1 - k) * 0.75 + (o.piediDx || 0); g.visible = k > 0.01; g.children[1].material.opacity = k; });
      pg.position.z = 0.012 * (o.colpo || 0); pg.rotation.x = 0.004 * (o.colpo || 0);
      P.visible = o.porta !== false; alOcchio.visible = P.visible; lOcchio.intensity = o.occhio || 0;
      L.A.intensity = (o.amb ?? 0.2) * PI; L.F.intensity = (o.fronte ?? 0.1) * PI;
      if (o.luce) { lExtra.position.set(...o.luce.pos); lExtra.intensity = o.luce.k ?? 1; lExtra.color.set(o.luce.colore || '#FFE6C4'); } else lExtra.intensity = 0;
      tel.visible = (o.telefono ?? 1) > 0;                    // prima della posa: la mano modellata prende la presa del telefono se si vede
      T.pose(o.tu || { pos: [0, 0, -0.9], yaw: Math.PI });
      T.AR.gH.getWorldPosition(tmp); lTel.position.set(tmp.x, tmp.y + 0.08, tmp.z - 0.05); lTel.intensity = 0.3 * (o.telefono ?? 1);
      tel.visible = (o.telefono ?? 1) > 0;
    } };
}

// ------------------------------------------------------------------ il pianerottolo (visto dallo spioncino)
export function pianerottoloSet() {
  const r = rnd(91), scene = new THREE.Scene(); scene.background = new THREE.Color('#0b0c0a');
  const cam = G.camera(75, 0.03, 40); scene.add(cam);
  const amb = new THREE.Group(); scene.add(amb);
  const box = (w, h, d, m, pos) => add(amb, new THREE.BoxGeometry(w, h, d), m, pos);
  // pavimento a graniglia, muri a due colori (la porta di casa tua è a z = 0, si guarda verso +z)
  const fl = add(amb, new THREE.PlaneGeometry(3.4, 3.6), mat(0xffffff, { map: tex(256, 256, (c, w, h) => { c.fillStyle = '#B9B2A2'; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { c.fillStyle = ['#8F8778', '#D9D3C4', '#6E675B', '#A08F6E'][i % 4]; c.globalAlpha = r(0.4, 0.9); c.beginPath(); c.arc(r() * w, r() * h, r(0.8, 2.6), 0, 7); c.fill(); }
    c.globalAlpha = 1; c.strokeStyle = '#7A7366'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); }, [6, 6]) }), V(0, 0, 1.75)); fl.rotation.x = -Math.PI / 2;
  const muroT = (w) => mat(0xffffff, { map: tex(64, 256, (c, ww, h) => { c.fillStyle = '#DDD3A9'; c.fillRect(0, 0, ww, h); c.fillStyle = '#78885E'; c.fillRect(0, h * 0.54, ww, h * 0.46); c.fillStyle = '#4E5A3C'; c.fillRect(0, h * 0.53, ww, 5); }) });
  const back = add(amb, new THREE.PlaneGeometry(3.4, 2.7), muroT(), V(0, 1.35, 3.5)); back.rotation.y = Math.PI;
  const right = add(amb, new THREE.PlaneGeometry(3.6, 2.7), muroT(), V(1.7, 1.35, 1.75)); right.rotation.y = -Math.PI / 2;
  const leftFar = add(amb, new THREE.PlaneGeometry(1.2, 2.7), muroT(), V(-1.7, 1.35, 0.6)); leftFar.rotation.y = Math.PI / 2;
  const sof = add(amb, new THREE.PlaneGeometry(3.4, 3.6), mat('#E6DEBF'), V(0, 2.7, 1.75)); sof.rotation.x = Math.PI / 2;
  // la tromba delle scale a sinistra: buio, ringhiera
  const buio = add(scene, new THREE.PlaneGeometry(2.4, 2.7), basic('#14150F'), V(-1.72, 1.35, 2.35)); buio.rotation.y = Math.PI / 2;
  const ferro = mat('#2B2D2A');
  tra(amb, V(-1.62, 0.98, 1.25), V(-1.62, 0.98, 3.45), 0.022, 0.022, mat('#5A3B26')); for (let i = 0; i < 9; i++) tra(amb, V(-1.62, 0.0, 1.3 + i * 0.26), V(-1.62, 0.97, 1.3 + i * 0.26), 0.01, 0.01, ferro);
  // la porta dell'interno 11 di fronte, con lo zerbino; l'ascensore a destra
  const p11 = new THREE.Group(); p11.position.set(-0.35, 0, 3.47); p11.rotation.y = Math.PI; amb.add(p11); porta(p11, { numero: '11', colore: '#5A3B26' });
  const zer = add(amb, new THREE.PlaneGeometry(0.7, 0.42), mat('#7C4A32'), V(-0.35, 0.006, 3.12)); zer.rotation.x = -Math.PI / 2;
  const asc = new THREE.Group(); asc.position.set(1.685, 0, 2.2); asc.rotation.y = -Math.PI / 2; amb.add(asc);
  add(asc, new THREE.BoxGeometry(1.0, 2.1, 0.03), mat('#9CA2A8'), V(0, 1.05, 0)); add(asc, new THREE.BoxGeometry(0.012, 2.1, 0.04), mat('#5E646B'), V(0, 1.05, 0.005));
  add(asc, new THREE.BoxGeometry(1.14, 0.12, 0.06), mat('#6E747B'), V(0, 2.16, 0)); for (const s of [-1, 1]) add(asc, new THREE.BoxGeometry(0.08, 2.2, 0.06), mat('#6E747B'), V(s * 0.54, 1.1, 0));
  add(asc, new THREE.PlaneGeometry(0.2, 0.1), mat(0xffffff, { map: tex(128, 64, (c, w, h) => { c.fillStyle = '#16181A'; c.fillRect(0, 0, w, h); c.fillStyle = '#FF8A2A'; c.font = '700 46px Display'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('4', w / 2, h / 2 + 3); }) }), V(0, 2.16, 0.035));
  add(asc, sfera(0.016, 10), basic('#FFA23A'), V(0.66, 1.1, 0.02));
  // plafoniera con la luce gialla, un po' tremolante
  add(amb, new THREE.CylinderGeometry(0.17, 0.17, 0.05, 28), mat('#E9E2C8'), V(0, 2.67, 1.6)); add(scene, new THREE.CircleGeometry(0.15, 28), basic('#FFF1BE'), V(0, 2.642, 1.6)).rotation.x = Math.PI / 2;
  const al = new THREE.Sprite(macchia('#FFE08A')); al.position.set(0, 2.55, 1.6); al.scale.set(1.6, 1.2, 1); al.material.opacity = 0.5; scene.add(al);
  ombre(amb, { fa: true, riceve: true });
  const L = luci(scene, { amb: 0.5, fronte: 0.3, alto: 0.26, colore: 0xfff0c2, altoPos: [0.1, 2.6, 1.5], altoVerso: [0, 0, 1.1], area: 2.4 });
  const I = ispettore(); scene.add(I.group);
  return { scene, camera: cam, bloom: 0, I,
    update(t, u, o = {}) {
      G.lookFrom(cam, o.cam || [0, 1.52, 0.03], o.look || [0, 1.5, 1], o.roll || 0); cam.fov = o.fov || 75; cam.updateProjectionMatrix(); L.segui(cam, o.look || [0, 1.5, 1]);
      const fk = 0.94 + 0.06 * Math.sin(t * 23) * Math.sin(t * 7.1) - 0.25 * M.bump(t % 5.3, 4.1, 0.06);
      L.T.intensity = 0.26 * PI * fk; L.A.intensity = 0.5 * PI * (0.9 + 0.1 * fk); al.material.opacity = 0.5 * fk;
      I.pose(o.isp || { pos: [0.03, 0, 0.82], yaw: Math.PI });
    } };
}
