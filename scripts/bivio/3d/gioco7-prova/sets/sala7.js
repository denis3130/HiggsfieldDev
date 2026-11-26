// La sala dell'episodio 1: la sala della prova di stile (sala.js, senza le mani: ora ci sono i corpi interi) più quello che serve alla
// storia: il portone a due ante nella parete in fondo (+z) con la serratura d'ottone che scatta da sola, la grata di ferro che scende
// davanti alla finestra (e poi fa l'ombra delle sbarre sulla tavola), il televisore a tubo su una credenza in fondo alla sala (-z),
// le applique elettriche (spente finché le luci «tornano»), le candele che si spengono tutte insieme e il fumo dagli stoppini.
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { THREE, V, MAT, legno, pixelTex, aloneTex, rnd, fbm } from './look.js';
import { salaSet, TAVOLO } from './sala.js';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// ---- legno scuro a pannelli (le ante del portone): riquadri in rilievo con la cornice
function pannelli() {
  const l = legno({ seed: 41, base: '#3A2212', scuro: '#1C0E06', chiaro: '#5A3820', venature: 22 });
  const src = l.map.image.getContext('2d').getImageData(0, 0, 512, 512).data;
  return pixelTex(256, 512, (x, y) => {
    const u = x / 256, v = y / 512, i = ((Math.floor(v * 511) * 512) + Math.floor(u * 511)) * 4;
    const cell = (a, lo, hi) => a > lo && a < hi; let h = 0.5;
    for (const [v0, v1] of [[0.06, 0.42], [0.5, 0.94]]) if (cell(u, 0.12, 0.88) && cell(v, v0, v1)) { const d = Math.min(u - 0.12, 0.88 - u, (v - v0) * 0.5, (v1 - v) * 0.5); h = d < 0.02 ? 0.5 - d * 8 : d < 0.06 ? 0.34 + (d - 0.02) * 6 : 0.58; }
    return [src[i], src[i + 1], src[i + 2], h];
  }, { forza: 3.0 });
}
function intonaco() {
  return pixelTex(256, 256, (x, y) => { const n = fbm(x / 40, y / 40, 9, 4), f = fbm(x / 6, y / 6, 3, 2); const c = 52 + n * 30 + f * 10; return [c * 0.92, c * 0.86, c * 0.8, 0.5 + f * 0.2]; }, { rep: [3, 2], forza: 1.2 });
}
// il fumo di uno stoppino spento: una tela con un filo che si arriccia, su un piano che guarda la camera
let FUMO = null;
function fumoTex() {
  if (FUMO) return FUMO; const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const c = cv.getContext('2d');
  for (let k = 0; k < 3; k++) { c.beginPath(); for (let y = 256; y > 0; y -= 4) { const t = 1 - y / 256, x = 32 + Math.sin(y * 0.06 + k * 2) * 10 * t + Math.sin(y * 0.17 + k) * 4 * t; y === 256 ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.strokeStyle = `rgba(220,220,230,${0.35 - k * 0.08})`; c.lineWidth = 2 + k * 2.5; c.filter = `blur(${1 + k * 1.5}px)`; c.stroke(); }
  FUMO = new THREE.CanvasTexture(cv); FUMO.colorSpace = THREE.SRGBColorSpace; return FUMO;
}

export function sala7Set() {
  const S = salaSet({ mani: false }), scene = S.scene, T = TAVOLO;
  // via la parete +z (e la sua boiserie): al suo posto un muro spesso con il vano del portone
  for (const o of [...scene.children]) if (o.isMesh && Math.abs(o.position.z - 4.5) < 0.05 && Math.abs(o.position.x) < 0.1) scene.remove(o);
  const muroM = MAT.muro, est = intonaco(), esterno = new THREE.MeshStandardMaterial({ map: est.map, normalMap: est.normalMap, roughness: 0.95 });
  const box = (w, h, d, x, y, z, m = muroM, p = scene) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; p.add(b); return b; };
  const ZP = 4.5, VANO = 0.72, ALTO = 2.55;
  for (const s of [-1, 1]) { box(3 - VANO, 3.6, 0.3, s * (VANO + (3 - VANO) / 2), 1.8, ZP + 0.15, [MAT.muro, MAT.muro, MAT.muro, MAT.muro, esterno, MAT.muro]);
    box(3 - VANO, 1.0, 0.04, s * (VANO + (3 - VANO) / 2), 0.5, ZP - 0.02, MAT.boiserie); }
  box(VANO * 2, 3.6 - ALTO, 0.3, 0, ALTO + (3.6 - ALTO) / 2, ZP + 0.15, [MAT.muro, MAT.muro, MAT.muro, MAT.muro, esterno, MAT.muro]);
  for (const s of [-1, 1]) box(0.12, ALTO + 0.12, 0.36, s * (VANO + 0.06), ALTO / 2, ZP + 0.15, MAT.boiserie);        // stipiti
  box(VANO * 2 + 0.24, 0.12, 0.36, 0, ALTO + 0.06, ZP + 0.15, MAT.boiserie);
  // le ante: legno a riquadri, imperniate ai lati del vano; si aprono verso la sala
  const pan = pannelli(), anteM = new THREE.MeshStandardMaterial({ map: pan.map, normalMap: pan.normalMap, roughness: 0.6, metalness: 0, envMapIntensity: 0.35 });
  const ante = [];
  for (const s of [-1, 1]) {
    const cardine = new THREE.Group(); cardine.position.set(s * VANO, 0, ZP + 0.05); scene.add(cardine);
    const a = box(VANO, ALTO, 0.06, -s * VANO / 2, ALTO / 2, 0, anteM, cardine);
    const pomo = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.012, 0], [0.012, 0.03], [0.026, 0.05], [0.028, 0.065], [0.018, 0.075], [0, 0.077]].map(([x, y]) => new THREE.Vector2(x, y)), 24), MAT.ottone);
    pomo.rotation.x = -Math.PI / 2; pomo.position.set(-s * (VANO - 0.09), 1.05, -0.03); cardine.add(pomo); const p2 = pomo.clone(); p2.rotation.x = Math.PI / 2; p2.position.z = 0.03; cardine.add(p2);
    ante.push(cardine);
  }
  // la serratura sull'anta destra (dentro): piastra d'ottone, buco della chiave, la chiave che gira e il catenaccio che scatta
  const serr = new THREE.Group(); serr.position.set(-0.6, 0.86, -0.036); ante[1].add(serr);
  box(0.09, 0.16, 0.012, 0, 0, 0, MAT.ottone, serr);
  const buco = new THREE.Mesh(new THREE.CircleGeometry(0.008, 20), new THREE.MeshBasicMaterial({ color: 0x050302 })); buco.position.set(0, 0.015, -0.0065); buco.rotation.y = Math.PI; serr.add(buco);
  const fessura = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 0.02), buco.material); fessura.position.set(0, 0.0, -0.0066); fessura.rotation.y = Math.PI; serr.add(fessura);
  const chiave = new THREE.Group(); chiave.position.set(0, 0.008, -0.007); serr.add(chiave);
  { const fusto = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.05, 12), MAT.ottone); fusto.rotation.x = Math.PI / 2; fusto.position.z = -0.025; chiave.add(fusto);
    const anello = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 10, 28), MAT.ottone); anello.position.z = -0.05; anello.rotation.y = Math.PI / 2; chiave.add(anello); }
  const catenaccio = box(0.07, 0.02, 0.016, -0.06, -0.045, -0.006, MAT.ottone, serr);
  const luceSerr = new THREE.PointLight(0xFF8A30, 0.0, 0.6, 2); luceSerr.position.set(0.25, 0.98, ZP - 0.32); scene.add(luceSerr);
  // ---- la grata di ferro davanti alla finestra (x = -3): scende dall'alto; da giù fa l'ombra delle sbarre col chiaro di luna
  const ferro = new THREE.MeshStandardMaterial({ color: 0x1A1A1C, roughness: 0.55, metalness: 0.85, envMapIntensity: 0.5 });
  const grata = new THREE.Group(); grata.position.set(-2.86, 1.75, -0.6); scene.add(grata);
  for (let i = 0; i <= 10; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 2.3, 10), ferro); b.position.set(0, 0, -0.6 + i * 0.12); b.castShadow = true; grata.add(b); }
  for (const y of [-1.1, -0.38, 0.38, 1.1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 1.26), ferro); p.position.y = y; p.castShadow = true; grata.add(p); }
  grata.visible = false;
  // ---- il televisore a tubo su una credenza, in fondo alla sala (-z), che guarda la tavola
  const cred = new THREE.Group(); cred.position.set(0, 0, -4.05); scene.add(cred);
  box(1.7, 0.82, 0.5, 0, 0.41, 0, MAT.sedia, cred); box(1.76, 0.04, 0.54, 0, 0.84, 0, MAT.tavolo, cred);
  const tv = new THREE.Group(); tv.position.set(0, 0.86, 0.02); cred.add(tv);
  const scocca = new THREE.MeshStandardMaterial({ color: 0x2A2622, roughness: 0.5, metalness: 0.1, envMapIntensity: 0.4 });
  { const sh = new THREE.Shape(), w = 0.66, h = 0.52, r = 0.05; sh.moveTo(-w / 2 + r, 0); sh.lineTo(w / 2 - r, 0); sh.quadraticCurveTo(w / 2, 0, w / 2, r); sh.lineTo(w / 2, h - r); sh.quadraticCurveTo(w / 2, h, w / 2 - r, h); sh.lineTo(-w / 2 + r, h); sh.quadraticCurveTo(-w / 2, h, -w / 2, h - r); sh.lineTo(-w / 2, r); sh.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
    const corpo = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3 }), scocca); corpo.position.z = -0.2; corpo.castShadow = true; tv.add(corpo);
    const retro = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.36, 0.22), scocca); retro.position.set(0, 0.25, -0.3); tv.add(retro);
    // la cornice davanti, in legno, col vano dello schermo (una forma sola: rettangolo con un buco)
    const rr = (s_, w_, h_, r_, cy) => { s_.moveTo(-w_ / 2 + r_, cy - h_ / 2); s_.lineTo(w_ / 2 - r_, cy - h_ / 2); s_.quadraticCurveTo(w_ / 2, cy - h_ / 2, w_ / 2, cy - h_ / 2 + r_); s_.lineTo(w_ / 2, cy + h_ / 2 - r_); s_.quadraticCurveTo(w_ / 2, cy + h_ / 2, w_ / 2 - r_, cy + h_ / 2); s_.lineTo(-w_ / 2 + r_, cy + h_ / 2); s_.quadraticCurveTo(-w_ / 2, cy + h_ / 2, -w_ / 2, cy + h_ / 2 - r_); s_.lineTo(-w_ / 2, cy - h_ / 2 + r_); s_.quadraticCurveTo(-w_ / 2, cy - h_ / 2, -w_ / 2 + r_, cy - h_ / 2); return s_; };
    const fr = rr(new THREE.Shape(), 0.672, 0.532, 0.05, 0.26); fr.holes.push(rr(new THREE.Path(), 0.5, 0.375, 0.035, 0.27));
    const bez = new THREE.Mesh(new THREE.ExtrudeGeometry(fr, { depth: 0.02, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 }), MAT.sedia); bez.position.z = 0.17; tv.add(bez); }
  // lo schermo: vetro bombato; spento è grigio scuro lucido, acceso mostra la tela (aggiornata dal film)
  const tela = document.createElement('canvas'); tela.width = 512; tela.height = 384; const telaTx = new THREE.CanvasTexture(tela); telaTx.colorSpace = THREE.SRGBColorSpace;
  const sg = new THREE.PlaneGeometry(0.5, 0.375, 24, 18); { const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 0.25, y = p.getY(i) / 0.1875; p.setZ(i, 0.022 * (1 - 0.5 * x * x - 0.5 * y * y)); } sg.computeVertexNormals(); }
  const spento = new THREE.MeshPhysicalMaterial({ color: 0x1A1D1F, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.0 });
  const acceso = new THREE.MeshBasicMaterial({ map: telaTx, toneMapped: false }); acceso.color.setScalar(1.6);
  const schermo = new THREE.Mesh(sg, spento); schermo.position.set(0, 0.27, 0.163); tv.add(schermo);
  const luceTv = new THREE.PointLight(0xA8C4FF, 0, 5, 2); luceTv.position.set(0, 1.25, -3.5); scene.add(luceTv);
  const bagliore = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1), new THREE.MeshBasicMaterial({ map: aloneTex(), color: 0x8FB0FF, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  bagliore.position.set(0, 1.13, -3.8); scene.add(bagliore);
  // ---- le applique: due per lato, ottone e paralume di stoffa; la luce elettrica che torna dopo il buio
  const applique = [], paralumeM = new THREE.MeshStandardMaterial({ color: 0xE8D2A8, roughness: 0.9, emissive: 0xFFB060, emissiveIntensity: 0, side: THREE.DoubleSide });
  for (const [x, z] of [[-2.97, -2.4], [-2.97, 1.6], [2.97, -2.4], [2.97, 1.6]]) {
    const g = new THREE.Group(); g.position.set(x, 1.95, z); g.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(g);
    box(0.08, 0.14, 0.02, 0, 0, 0, MAT.ottone, g); const br = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8), MAT.ottone); br.rotation.x = Math.PI / 2; br.position.set(0, 0.02, 0.08); g.add(br);
    const p = new THREE.Mesh(new THREE.LatheGeometry([[0.05, 0], [0.075, 0.0], [0.045, 0.12], [0.04, 0.12]].map(([a, b]) => new THREE.Vector2(a, b)), 28, 0, Math.PI * 2), paralumeM); p.position.set(0, 0.02, 0.16); g.add(p);
    const L = new THREE.PointLight(0xFFB872, 0, 7, 2); L.position.set(0, 0.06, 0.2); g.add(L); applique.push(L);
  }
  // ---- il fumo dagli stoppini quando le candele si spengono
  const fumi = S.candele.map((c) => { const m = new THREE.MeshBasicMaterial({ map: fumoTex(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }); m.color.setScalar(0.35);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.2), m); f.position.y = c.alta + 0.11; c.g.add(f); return f; });
  const st = { porte: 0, chiave: 0, grata: 0, tv: 0, spente: -1, applique: 0, luceSerr: 0 };
  const base = S.update;
  return { ...S, ante, grata, tv, tela, telaTx, schermo, applique, stato: st,
    // lo stato della sala a ogni tempo lo decide il film: o = { porte (0 chiuse .. 1 aperte), chiave (0..1 il giro), grata (0 su .. 1 giù), tv (0 spento .. 1),
    // spente (tempo in cui le candele si spengono, o -1), applique (0..1), luceSerr }
    update(t, u, o = {}) {
      base(t, u, o); Object.assign(st, o.sala || {});
      ante[0].rotation.y = st.porte * 1.25; ante[1].rotation.y = -st.porte * 1.25;
      chiave.rotation.z = st.chiave * Math.PI; catenaccio.position.x = -0.06 - 0.035 * sm(0.55, 0.75, st.chiave); luceSerr.intensity = st.luceSerr;
      grata.visible = st.grata > 0; grata.position.y = 1.75 + (1 - st.grata) * 2.3;
      schermo.material = st.tv > 0 ? acceso : spento; if (st.tv > 0) telaTx.needsUpdate = true; luceTv.intensity = 0.9 * st.tv * (0.85 + 0.15 * M.noise1(t * 30, 4)); bagliore.material.opacity = 0.16 * st.tv;
      for (const L of applique) L.intensity = 0.55 * st.applique * (0.94 + 0.06 * M.noise1(t * 40, 2)); paralumeM.emissiveIntensity = 1.4 * st.applique;
      for (const L of applique) L.visible = st.applique > 0; luceTv.visible = st.tv > 0; luceSerr.visible = st.luceSerr > 0;
      // le candele: se spente, la fiamma si piega e si spegne in 0,25 s; poi il fumo sale per qualche secondo
      S.candele.forEach((c, i) => { const dt = st.spente >= 0 ? t - st.spente - 0.012 * (i % 5) : -1, k = dt < 0 ? 1 : 1 - sm(0, 0.25, dt);
        c.f.visible = k > 0.01; c.a.visible = k > 0.01; c.f.scale.y *= k; c.f.scale.x *= 0.6 + 0.4 * k; c.f.position.x += (1 - k) * 0.006; if (c.L) c.L.intensity *= k;
        const fm = fumi[i]; fm.material.opacity = dt > 0.1 ? 0.5 * sm(0.1, 0.5, dt) * (1 - sm(3, 7, dt)) : 0; fm.scale.y = 1 + dt * 0.3; fm.quaternion.copy(c.f.quaternion); });
    } };
}
