// Le scene «di passaggio» dell'episodio 1, fatte una volta sola all'avvio e poi usate come immagini:
//   - l'uomo mascherato nella stanza di cemento (quello che si vede nel televisore): cappuccio nero, maschera bianca liscia, una lampadina;
//   - la vecchia foto: i sette da giovani davanti alla fornace abbandonata (gli stessi personaggi, in piedi), stampata con la data arancione;
//   - il corridoio buio dove Sophie aspetta con la candela (la carta B).
// E il televisore a tubo: righe, grana, bagliore, la neve fra un'immagine e l'altra (crt()).
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { THREE, V, MAT, materiali, pixelTex, fbm, tappezzeria, legno, candela, rnd } from './look.js';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const W = () => M.W, H = () => M.H;
// fotografa una scena: la disegna sulla tela del film e ne ritaglia il rettangolo centrale largo quanto il quadro (aspetto a = larghezza/altezza)
export function scatta(set, opts, a = 4 / 3, t = 0) {
  const cv = document.createElement('canvas'); cv.width = M.W; cv.height = M.H; const c = cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
  G.renderSet(c, set, t, 0, opts);
  const w = M.W, h = Math.round(w / a), out = document.createElement('canvas'); out.width = w; out.height = h;
  out.getContext('2d').drawImage(cv, 0, (M.H - h) / 2, w, h, 0, 0, w, h); return out;
}

// ---- l'uomo mascherato: la maschera è UNA superficie (una sfera modellata a viso: ovale, schiacciata dietro, la cresta del naso,
// le arcate, il mento) con due fori per gli occhi; il cappuccio è un'altra superficie sola, aperta davanti; il mantello scende sulle spalle.
function mascheraGeo() {
  const g = new THREE.SphereGeometry(0.1, 96, 72), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    x *= 0.78; y *= 1.08; z = z > 0 ? z * 0.7 : z * 0.25;
    const naso = 0.007 * Math.exp(-((x / 0.012) ** 2)) * sm(0.035, 0.0, y) * sm(-0.04, -0.005, y);
    const arcate = 0.006 * Math.exp(-(((Math.abs(x) - 0.032) / 0.02) ** 2) - (((y - 0.03) / 0.012) ** 2));
    const guance = -0.006 * Math.exp(-(((Math.abs(x) - 0.04) / 0.02) ** 2) - (((y + 0.03) / 0.02) ** 2));
    const mento = 0.008 * Math.exp(-((x / 0.025) ** 2) - (((y + 0.085) / 0.015) ** 2));
    if (z > 0) z += (naso + arcate + guance + mento) * sm(0.0, 0.03, z);
    p.setXYZ(i, x, y, z); }
  g.computeVertexNormals(); return g;
}
function mascheraTex() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const c = cv.getContext('2d');
  c.fillStyle = '#EEEAE2'; c.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(120,110,100,${Math.random() * 0.05})`; c.fillRect(Math.random() * 1024, Math.random() * 512, 3, 3); }
  // gli occhi: a u = 0.25 ± 0.045 (il davanti della sfera), v ≈ 0.42 dall'alto
  for (const u of [0.25 - 0.05, 0.25 + 0.05]) { c.save(); c.translate(u * 1024, 0.425 * 512); const g = c.createRadialGradient(0, 0, 4, 0, 0, 46); g.addColorStop(0, 'rgba(60,50,45,0.0)'); g.addColorStop(0.55, 'rgba(60,50,45,0.0)'); g.addColorStop(1, 'rgba(60,50,45,0.35)');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 50, 30, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#030202'; c.beginPath(); c.ellipse(0, 0, 36, 17, u < 0.25 ? 0.12 : -0.12, 0, Math.PI * 2); c.fill(); c.restore(); }
  c.strokeStyle = 'rgba(40,34,30,0.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0.25 * 1024 - 22, 0.61 * 512); c.quadraticCurveTo(0.25 * 1024, 0.615 * 512, 0.25 * 1024 + 22, 0.61 * 512); c.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// la maschera vera (personaggi/maschera.py): viso neutro intero, fori a mandorla, spessa 3 mm; origine nel giunto della testa
async function mascheraVera() {
  const base = new URL('../personaggi/maschera/', import.meta.url).href;
  const [j, b] = await Promise.all([fetch(base + 'maschera.json').then((r) => r.json()), fetch(base + 'maschera.bin').then((r) => r.arrayBuffer())]);
  const n = j.vertici, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(b, 0, n * 3), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(b, n * 12, n * 2), 2));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(b, n * 20, j.indici), 1)); g.computeVertexNormals();
  // il contorno: ovale e fori a mandorla (le stesse forme di maschera.py, in decimetri), con il bordo sfumato di un pixel;
  // nel colore, intorno ai fori, un'ombra sottile (lo spessore della maschera)
  const S = 1024, [X0, X1, Y0, Y1] = j.griglia, [ax, ay, yc] = j.ovale, [fa, fb, rot, giu] = j.foro, occ = ['S', 'D'].map((k) => j.occhi[k].map((x) => x * 10));
  const fOv = (x, y) => Math.hypot(x / ax, (y - yc) / ay) - 1;
  const fOc = (x, y, e, s) => { const a = rot * s, c = Math.cos(a), sn = Math.sin(a), dx = x - e[0], dy = y - (e[1] - giu), u = c * dx + sn * dy, v = -sn * dx + c * dy; return Math.hypot(u / fa, v / fb) - 1; };
  const cvA = document.createElement('canvas'), cvC = document.createElement('canvas'); cvA.width = cvA.height = cvC.width = cvC.height = S;
  const ia = cvA.getContext('2d').createImageData(S, S), ic = cvC.getContext('2d').createImageData(S, S), px = (X1 - X0) / S;
  for (let r = 0; r < S; r++) for (let q = 0; q < S; q++) {
    const x = X0 + (q + 0.5) * px, y = Y0 + (1 - (r + 0.5) / S) * (Y1 - Y0), fo = fOv(x, y), fe = Math.min(fOc(x, y, occ[0], 1), fOc(x, y, occ[1], -1));
    const k = (r * S + q) * 4, aOv = Math.min(1, Math.max(0, 0.5 - fo / (px / ax))), aOc = Math.min(1, Math.max(0, 0.5 + fe / (px / fb))), a = aOv * aOc;
    ia.data[k] = ia.data[k + 1] = ia.data[k + 2] = a * 255; ia.data[k + 3] = 255;
    const om = 1 - 0.55 * Math.exp(-Math.max(0, fe) / 0.09) - 0.25 * Math.exp(-Math.max(0, -fo) / 0.03);
    ic.data[k] = 239 * om; ic.data[k + 1] = 235 * om; ic.data[k + 2] = 227 * om; ic.data[k + 3] = 255; }
  cvA.getContext('2d').putImageData(ia, 0, 0); cvC.getContext('2d').putImageData(ic, 0, 0);
  const tA = new THREE.CanvasTexture(cvA), tC = new THREE.CanvasTexture(cvC); tC.colorSpace = THREE.SRGBColorSpace; tA.anisotropy = tC.anisotropy = 8;
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ map: tC, alphaMap: tA, transparent: true, side: THREE.DoubleSide, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.2, sheenColor: new THREE.Color(0xFFF4E8), envMapIntensity: 0.6 }));
  m.castShadow = false; m.receiveShadow = true; m.userData.occhi = j.occhi; return m;
}
export async function mascheratoSet() {
  materiali();
  const scene = new THREE.Scene(), cam = G.camera(30, 0.05, 30); scene.background = new THREE.Color(0x050505);
  const cem = pixelTex(512, 512, (x, y) => { const n = fbm(x / 60, y / 60, 3, 5), f = fbm(x / 5, y / 5, 9, 2), m = fbm(x / 20, y / 200, 4, 3); const c = 70 + n * 50 + f * 18 - m * 25; return [c, c * 0.98, c * 0.95, 0.5 + f * 0.25]; }, { rep: [3, 2], forza: 2 });
  const muro = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshStandardMaterial({ map: cem.map, normalMap: cem.normalMap, roughness: 0.95 })); muro.position.set(0, 1.5, -1.2); muro.receiveShadow = true; scene.add(muro);
  const nero = new THREE.MeshPhysicalMaterial({ color: 0x0B0B0D, roughness: 0.85, sheen: 0.6, sheenColor: new THREE.Color(0x3A3A44), sheenRoughness: 0.5, side: THREE.DoubleSide });
  const fig = new THREE.Group(); scene.add(fig);
  const mantello = new THREE.Mesh(new THREE.LatheGeometry([[0.0, 1.47], [0.075, 1.46], [0.09, 1.42], [0.2, 1.37], [0.25, 1.3], [0.27, 1.1], [0.29, 0.6]].map(([x, y]) => new THREE.Vector2(x, y)), 64), nero);
  mantello.scale.set(1, 1, 0.62); mantello.castShadow = true; mantello.receiveShadow = true; fig.add(mantello);
  const testa = new THREE.Group(); testa.position.set(0, 1.6, 0); fig.add(testa);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 64, 48, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.8), nero); cap.scale.set(1, 1.15, 1.12); cap.position.set(0, 0.02, -0.01); cap.castShadow = true; testa.add(cap);
  const viso = new THREE.Group(); viso.position.set(0, -0.045, -0.012); testa.add(viso);
  const mas = await mascheraVera(); viso.add(mas);
  // chi la porta: la testa scura sotto (si vede solo dai fori) e gli occhi, lucidi, con un riflesso
  const sotto = new THREE.Mesh(new THREE.SphereGeometry(0.095, 32, 24), new THREE.MeshStandardMaterial({ color: 0x0A0807, roughness: 0.9 })); sotto.scale.set(0.9, 1.1, 1.0); sotto.position.set(0, 0.03, 0.02); viso.add(sotto);
  for (const k of ['S', 'D']) { const e = mas.userData.occhi[k], o = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0x2A1A12, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.2 }));
    o.position.set(e[0] * 0.95, e[1] - 0.001, e[2] + 0.002); viso.add(o); }
  // la lampadina nuda che pende sopra, fuori dal quadro in alto
  const L = new THREE.PointLight(0xFFE8C8, 1.6, 5, 2); L.position.set(0.15, 2.25, 0.5); L.castShadow = true; L.shadow.mapSize.set(2048, 2048); L.shadow.radius = 4; L.shadow.bias = -0.0005; scene.add(L);
  const fill = new THREE.PointLight(0xB8C4E0, 0.12, 4, 2); fill.position.set(-0.3, 1.45, 1.2); scene.add(fill);           // un filo di luce fredda da davanti-sotto: si leggono naso e labbra
  scene.add(new THREE.HemisphereLight(0x405060, 0x101010, 0.15));
  return { scene, camera: cam, bloom: 0.4, bloomThreshold: 1.2, testa,
    update(t, u, o = {}) { G.R.toneMappingExposure = 1.1; cam.position.set(...(o.cam || [0, 1.55, 1.3])); cam.lookAt(...(o.look || [0, 1.52, 0])); if (o.fov) { cam.fov = o.fov; cam.updateProjectionMatrix(); }
      testa.rotation.set(...(o.testa || [0, 0, 0])); } };
}

// ---- la vecchia foto: la fornace di mattoni abbandonata (capannone con gli archi, ciminiera), erba alta, sole del pomeriggio
function mattoni() {
  return pixelTex(512, 512, (x, y) => { const r = Math.floor(y / 21), off = (r % 2) * 32, c0 = Math.floor((x + off) / 64), mx = (x + off) % 64, my = y % 21;
    const malta = mx < 4 || my < 3; const n = fbm(x / 30, y / 30, 5, 3), v = M.hash01(c0 * 31 + r * 17, 3), sporco = fbm(x / 120, y / 90, 8, 3);
    const b = [150 + v * 50 - sporco * 50, 72 + v * 24 - sporco * 30, 48 + v * 16 - sporco * 20].map((q) => q * (0.85 + 0.3 * n)); const m = [140 - sporco * 40, 130 - sporco * 40, 118 - sporco * 40];
    return malta ? [...m, 0.35] : [...b, 0.6 + n * 0.1]; }, { rep: [4, 2], forza: 3 });
}
export function fotoSet() {
  materiali();
  const scene = new THREE.Scene(), cam = G.camera(66, 0.1, 200);
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; { const c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#6A8AB0'); g.addColorStop(0.6, '#C8D4D8'); g.addColorStop(1, '#E8DCC0'); c.fillStyle = g; c.fillRect(0, 0, 4, 256); }
  const cielo = new THREE.CanvasTexture(cv); cielo.colorSpace = THREE.SRGBColorSpace; scene.background = cielo;
  const erba = pixelTex(512, 512, (x, y) => { const n = fbm(x / 40, y / 40, 2, 4), f = fbm(x / 4, y / 4, 7, 2); return [90 + n * 60 + f * 30, 96 + n * 50 + f * 20, 50 + n * 20, 0.5 + f * 0.3]; }, { rep: [12, 12], forza: 2 });
  const suolo = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: erba.map, normalMap: erba.normalMap, roughness: 1 })); suolo.rotation.x = -Math.PI / 2; suolo.receiveShadow = true; scene.add(suolo);
  const mt = mattoni(), mm = new THREE.MeshStandardMaterial({ map: mt.map, normalMap: mt.normalMap, roughness: 0.95 }), buio = new THREE.MeshStandardMaterial({ color: 0x0E0B09, roughness: 1 });
  // il capannone: un muro lungo con tre archi neri, il tetto crollato a metà, la ciminiera a destra
  const cap = new THREE.Group(); cap.position.set(0, 0, -7); scene.add(cap);
  const muro = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 0.6), mm); muro.position.y = 2.5; muro.castShadow = true; muro.receiveShadow = true; cap.add(muro);
  for (const x of [-4, 0, 4]) { const sh = new THREE.Shape(); sh.moveTo(-1, 0); sh.lineTo(-1, 2); sh.absarc(0, 2, 1, Math.PI, 0, true); sh.lineTo(1, 0); sh.closePath();
    const a = new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), buio); a.position.set(x, 0, 0.31); cap.add(a); }
  const tetto = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.3, 7), new THREE.MeshStandardMaterial({ color: 0x5A4A40, roughness: 1 })); tetto.position.set(-2, 5.2, -3.2); tetto.rotation.z = 0.04; cap.add(tetto);
  const cim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 20, 32), mm); cim.position.set(6.5, 10, -2); cim.castShadow = true; cap.add(cim);
  const sole = new THREE.DirectionalLight(0xFFE6C0, 2.6); sole.position.set(-8, 10, 8); sole.target.position.set(0, 1, 0); scene.add(sole, sole.target);
  sole.castShadow = true; sole.shadow.mapSize.set(2048, 2048); const sc = sole.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 40; sole.shadow.bias = -0.0004;
  scene.add(new THREE.HemisphereLight(0xB0C4E0, 0x5A5030, 0.7));
  return { scene, camera: cam, bloom: 0, update(t, u, o = {}) { G.R.toneMappingExposure = 1.0; cam.position.set(...(o.cam || [0, 1.45, 6.5])); cam.lookAt(...(o.look || [0, 1.35, 0])); cam.fov = o.fov || 66; cam.updateProjectionMatrix(); } };
}
// la foto stampata: colori sbiaditi e caldi, neri alzati, vignetta, grana, polvere e graffi, il bordo bianco e la data arancione
export function stampa(src, { data = '14 07 2016' } = {}) {
  const b = Math.round(src.width * 0.035), w = src.width + 2 * b, h = src.height + 2 * b, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
  c.fillStyle = '#EDE6D6'; c.fillRect(0, 0, w, h); c.drawImage(src, b, b);
  const im = c.getImageData(b, b, src.width, src.height), d = im.data, r = rnd(9);
  for (let i = 0; i < d.length; i += 4) { const L = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    let R = L * 0.55 + d[i] * 0.45, Gg = L * 0.55 + d[i + 1] * 0.45, B = L * 0.6 + d[i + 2] * 0.4; R = 28 + R * 0.86 + 10; Gg = 24 + Gg * 0.8 + 4; B = 20 + B * 0.66;
    const n = (r() - 0.5) * 22; d[i] = R + n; d[i + 1] = Gg + n; d[i + 2] = B + n; }
  c.putImageData(im, b, b);
  const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7); v.addColorStop(0, 'rgba(60,30,10,0)'); v.addColorStop(1, 'rgba(60,30,10,0.45)'); c.fillStyle = v; c.fillRect(b, b, src.width, src.height);
  for (let i = 0; i < 26; i++) { c.strokeStyle = `rgba(255,250,240,${0.1 + r() * 0.2})`; c.lineWidth = r(0.5, 1.5); const x = b + r() * src.width, y = b + r() * src.height; c.beginPath(); c.moveTo(x, y); c.lineTo(x + r(-40, 40), y + r(20, 160)); c.stroke(); }
  // la data stampata dalla macchina fotografica, in basso a destra
  c.save(); c.font = `bold ${Math.round(src.height * 0.055)}px "DejaVu Sans Mono", monospace`; c.textAlign = 'right'; c.fillStyle = 'rgba(255,140,40,0.92)'; c.shadowColor = 'rgba(255,110,20,0.8)'; c.shadowBlur = 8;
  c.fillText(data.replace(/ /g, '  '), b + src.width - src.width * 0.04, b + src.height - src.height * 0.05); c.restore();
  return cv;
}

// ---- il corridoio buio (la carta B): tappezzeria scura, porte chiuse, la passatoia, in fondo niente
export function corridoioSet() {
  materiali();
  const scene = new THREE.Scene(), cam = G.camera(40, 0.05, 40); scene.background = new THREE.Color(0x010102); scene.fog = new THREE.FogExp2(0x020203, 0.28);
  const tap = tappezzeria({ rep: [4, 2], base: '#2A1E24', scuro: '#1A1218', oro: '#6A5430' }), muroM = new THREE.MeshStandardMaterial({ map: tap.map, normalMap: tap.normalMap, roughness: 0.85 });
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), muroM); m.rotation.y = -s * Math.PI / 2; m.position.set(s * 0.85, 1.5, -4); m.receiveShadow = true; scene.add(m); }
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 12), MAT.pavimento); pav.rotation.x = -Math.PI / 2; pav.position.z = -4; pav.receiveShadow = true; scene.add(pav);
  const pass = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 12), new THREE.MeshStandardMaterial({ color: 0x4A1418, roughness: 0.95 })); pass.rotation.x = -Math.PI / 2; pass.position.set(0, 0.003, -4); pass.receiveShadow = true; scene.add(pass);
  for (const [s, z] of [[-1, -2.5], [1, -4.2], [-1, -6]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.95), MAT.sedia); p.position.set(s * 0.82, 1.1, z); p.castShadow = true; scene.add(p); }
  const soff = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 12), new THREE.MeshStandardMaterial({ color: 0x141012, roughness: 1 })); soff.rotation.x = Math.PI / 2; soff.position.set(0, 3, -4); scene.add(soff);
  return { scene, camera: cam, bloom: 0.8, bloomThreshold: 1.25, bloomRadius: 0.5,
    update(t, u, o = {}) { G.R.toneMappingExposure = 1.15; cam.position.set(...(o.cam || [0, 1.5, 1.6])); cam.lookAt(...(o.look || [0, 1.3, -2])); if (o.fov) { cam.fov = o.fov; cam.updateProjectionMatrix(); } } };
}

// ---- il televisore a tubo: disegna l'immagine src nel rettangolo (x, y, w, h) del contesto c con le righe, la grana, il bagliore,
// la riga chiara che scorre e, se neve > 0, la neve sopra. Funzione pura del tempo t.
export function crt(c, src, t, x, y, w, h, { neve = 0, luce = 1 } = {}) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = '#000'; c.fillRect(x, y, w, h);
  if (src) { const tr = 1 + 0.04 * M.noise1(t * 9, 3); c.globalAlpha = luce * (0.9 + 0.1 * tr); c.drawImage(src, x, y, w, h);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.18 * luce; c.drawImage(src, x + w * 0.004, y, w, h); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
  if (neve > 0) { const n = Math.ceil((w * h) / 900), f = Math.floor(t * 30);
    for (let i = 0; i < n; i++) { const v = M.hash01(i + f * 7919, 11); c.fillStyle = `rgba(${v > 0.5 ? '235,240,255' : '10,10,14'},${neve * (0.5 + 0.5 * M.hash01(i + f, 5))})`;
      c.fillRect(x + M.hash01(i * 3 + f * 13, 2) * w, y + M.hash01(i * 7 + f * 17, 4) * h, w / 160 + 1, h / 220 + 1); } }
  const passo = Math.max(2, Math.round(h / 240)); c.fillStyle = 'rgba(0,0,0,0.28)'; for (let yy = y; yy < y + h; yy += passo * 2) c.fillRect(x, yy, w, passo);
  const by = y + ((t * 0.18) % 1) * h * 1.3 - h * 0.15, g = c.createLinearGradient(0, by - h * 0.08, 0, by + h * 0.08); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(220,230,255,0.07)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x, by - h * 0.08, w, h * 0.16);
  const v = c.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, x + w / 2, y + h / 2, Math.max(w, h) * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.75)'); c.fillStyle = v; c.fillRect(x, y, w, h);
  c.restore();
}
