// L'aspetto del video A (26/11): 3D da film d'animazione con materiali veri (legno, stoffa, porcellana, argento, cera, carta)
// e luci forti e motivate (luna blu con il pulviscolo, candele calde). Tutto fatto col codice: le texture sono disegnate su tele
// all'avvio (colore + rilievo -> mappa delle normali), niente immagini prese da fuori.
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
export const THREE = G.THREE;
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const rnd = (seed) => { const r = M.mulberry32(seed); return (a = 0, b = 1) => a + (b - a) * r(); };

// ---- rumore liscio 2D (valore interpolato, a ottave), deterministico
function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16); return (h >>> 0) / 4294967295; }
export function noise2(x, y, s = 1) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, y, s = 1, o = 4) => { let t = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { t += a * noise2(x * f, y * f, s + i * 17); n += a; a *= 0.5; f *= 2; } return t / n; };
// rumore che si ripete ogni p celle (per le texture ripetute)
export function noiseP(x, y, p, s = 1) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), m = (q) => ((q % p) + p) % p;
  const a = hash2(m(xi), m(yi), s), b = hash2(m(xi + 1), m(yi), s), c = hash2(m(xi), m(yi + 1), s), d = hash2(m(xi + 1), m(yi + 1), s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbmP = (x, y, p, s = 1, o = 4) => { let t = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { t += a * noiseP(x * f, y * f, p * f, s + i * 17); n += a; a *= 0.5; f *= 2; } return t / n; };

const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// Una texture disegnata pixel per pixel: fn(x, y, w, h) -> [r, g, b, alto] (alto 0..1 = rilievo per la mappa delle normali).
// Torna { map (colore, sRGB), normalMap, rough? }.
export function pixelTex(w, h, fn, { rep = null, forza = 2.0, rough = null } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'), img = c.createImageData(w, h), A = new Float32Array(w * h);
  const R = rough ? new Uint8ClampedArray(w * h * 4) : null;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = fn(x, y, w, h), i = (y * w + x) * 4; img.data[i] = p[0]; img.data[i + 1] = p[1]; img.data[i + 2] = p[2]; img.data[i + 3] = 255; A[y * w + x] = p[3] ?? 0.5;
    if (R) { const r = rough(x, y, w, h, p) * 255; R[i] = r; R[i + 1] = r; R[i + 2] = r; R[i + 3] = 255; } }
  c.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const nv = document.createElement('canvas'); nv.width = w; nv.height = h; const nc = nv.getContext('2d'), ni = nc.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const l = A[y * w + ((x - 1 + w) % w)], r = A[y * w + ((x + 1) % w)], u = A[((y - 1 + h) % h) * w + x], d = A[((y + 1) % h) * w + x];
    let nx = (l - r) * forza, ny = (d - u) * forza, nz = 1; const k = 1 / Math.hypot(nx, ny, nz); nx *= k; ny *= k; nz *= k;
    const i = (y * w + x) * 4; ni.data[i] = (nx * 0.5 + 0.5) * 255; ni.data[i + 1] = (ny * 0.5 + 0.5) * 255; ni.data[i + 2] = (nz * 0.5 + 0.5) * 255; ni.data[i + 3] = 255; }
  nc.putImageData(ni, 0, 0);
  const normalMap = new THREE.CanvasTexture(nv); normalMap.colorSpace = THREE.NoColorSpace; normalMap.anisotropy = 8;
  let roughnessMap = null;
  if (R) { const rv = document.createElement('canvas'); rv.width = w; rv.height = h; rv.getContext('2d').putImageData(new ImageData(R, w, h), 0, 0); roughnessMap = new THREE.CanvasTexture(rv); roughnessMap.colorSpace = THREE.NoColorSpace; }
  for (const t of [map, normalMap, roughnessMap]) if (t && rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
  return { map, normalMap, roughnessMap, canvas: cv };
}

// ---- legno: venature lungo x (noce scuro); seed e colori per i diversi mobili
export function legno({ w = 512, h = 512, base = '#5A3620', scuro = '#2E1A0E', chiaro = '#7A4D2E', seed = 3, venature = 26, rep = null, assi = 0 } = {}) {
  const B = hex(base), D = hex(scuro), L = hex(chiaro);
  return pixelTex(w, h, (x, y) => {
    const X = x / w, Y = y / h, asse = assi ? Math.floor(Y * assi) : 0, sY = assi ? (Y * assi) % 1 : Y;
    const n = fbmP(X * 4, Y * 10, 4, seed + asse * 5, 4), q = fbmP(X * 24, Y * 3, 24, seed + 9, 3);
    const g = 0.5 + 0.5 * Math.sin((Y * venature + n * 6 + q * 0.8 + asse * 1.7) * Math.PI * 2);
    const fibra = fbmP(X * 160, Y * 6, 160, seed + 3, 2);
    let c = mixc(B, D, Math.pow(g, 3) * 0.75); c = mixc(c, L, Math.max(0, n - 0.55) * 1.2); c = mixc(c, D, (fibra - 0.5) * 0.35 + 0.08);
    let a = 0.5 - Math.pow(g, 3) * 0.12 - (fibra - 0.5) * 0.08;
    if (assi) { const bordo = Math.min(sY, 1 - sY); if (bordo < 0.012) { c = mixc(c, D, 0.8); a -= 0.25 * (1 - bordo / 0.012); } }
    return [c[0], c[1], c[2], a];
  }, { rep, forza: 2.2, rough: (x, y, w2, h2, p) => 0.42 + 0.25 * (1 - p[3]) });
}
// ---- tovaglia di damasco bianco: motivo a fiori appena lucido sul fondo opaco, trama del tessuto
export function damasco({ w = 512, h = 512, base = '#E9E4DA', motivo = '#F4F1EA', seed = 5, rep = null, tile = 4 } = {}) {
  const B = hex(base), Mo = hex(motivo);
  const fiore = (u, v) => { const x = u - 0.5, y = v - 0.5, r = Math.hypot(x, y), a = Math.atan2(y, x); const petali = 0.23 + 0.07 * Math.cos(a * 6); const d = Math.abs(r - 0.0) < petali ? 1 : 0;
    const anello = Math.abs(r - 0.36) < 0.025 ? 1 : 0; const foglie = Math.abs(Math.abs(x) - Math.abs(y)) < 0.03 && r > 0.3 && r < 0.48 ? 1 : 0; return Math.max(d * (r > 0.06 ? 1 : 0.6), anello, foglie); };
  return pixelTex(w, h, (x, y) => {
    const U = (x / w) * tile, Vv = (y / h) * tile, fu = U % 1, fv = Vv % 1, sh = (Math.floor(U) + Math.floor(Vv)) % 2 ? 0.5 : 0;
    const m = fiore(fu, (fv + sh) % 1), trama = (Math.sin(x * 1.9) * 0.5 + 0.5) * (Math.sin(y * 1.9) * 0.5 + 0.5), n = fbmP((x / w) * 8, (y / h) * 8, 8, seed, 3);
    let c = mixc(B, Mo, m * 0.75); c = mixc(c, [210, 203, 190], (1 - n) * 0.25 + trama * 0.05);
    return [c[0], c[1], c[2], 0.5 + m * 0.05 + trama * 0.06];
  }, { rep, forza: 1.4, rough: (x, y, w2, h2, p) => (p[3] > 0.53 ? 0.55 : 0.85) });
}
// ---- carta da parati scura (verde bosco con un motivo a giglio più scuro e un filo d'oro spento)
export function tappezzeria({ w = 512, h = 512, base = '#1F3A30', scuro = '#16291F', oro = '#8C7440', seed = 7, rep = null } = {}) {
  const B = hex(base), D = hex(scuro), O = hex(oro);
  const giglio = (u, v) => { const x = (u - 0.5) * 2, y = (v - 0.5) * 2; const corpo = (x * x) / 0.06 + ((y + 0.1) ** 2) / 0.5 < 1; const lati = ((Math.abs(x) - 0.32) ** 2) / 0.03 + ((y - 0.05) ** 2) / 0.12 < 1 && Math.abs(x) > 0.12;
    const base2 = Math.abs(y - 0.5) < 0.05 && Math.abs(x) < 0.35; const bordo = Math.abs(Math.hypot(x, y) - 0.86) < 0.025; return { pieno: corpo || lati || base2 ? 1 : 0, oro: bordo ? 1 : 0 }; };
  return pixelTex(w, h, (x, y) => {
    const U = (x / w) * 3, Vv = (y / h) * 2, sh = Math.floor(Vv) % 2 ? 0.5 : 0, g = giglio((U + sh) % 1, Vv % 1), n = fbmP((x / w) * 6, (y / h) * 6, 6, seed, 4);
    let c = mixc(B, D, g.pieno * 0.8); c = mixc(c, O, g.oro * 0.6); c = mixc(c, [10, 16, 12], (1 - n) * 0.35);
    return [c[0], c[1], c[2], 0.5 + g.pieno * 0.04 + g.oro * 0.06];
  }, { rep, forza: 1.5, rough: (x, y, w2, h2, p) => 0.8 });
}
// ---- carta del segnaposto (avorio con fibre); il testo si scrive sopra con scriviCarta
export function cartaTex({ w = 512, h = 256, base = '#EFE6D2', seed = 11, lutto = false } = {}) {
  const B = hex(base);
  const t = pixelTex(w, h, (x, y) => { const n = fbm((x / w) * 30, (y / h) * 15, seed, 3), f = fbm((x / w) * 140, (y / h) * 70, seed + 4, 2); const c = mixc(B, [200, 188, 160], (1 - n) * 0.25 + (1 - f) * 0.12);
    return [c[0], c[1], c[2], 0.5 + (f - 0.5) * 0.15]; }, { forza: 1.0 });
  return t;
}

// ---- materiali
export const MAT = {};
export function materiali() {
  const l1 = legno({ seed: 3 }), l2 = legno({ seed: 21, base: '#3E2414', scuro: '#1E1008', chiaro: '#5C3A22', venature: 34 }), parquet = legno({ seed: 31, base: '#4A2C18', scuro: '#24140A', chiaro: '#6A4428', venature: 18, assi: 8 });
  const tov = damasco({ rep: [3, 1] }), tap = tappezzeria({ rep: [6, 3] });
  Object.assign(MAT, {
    tavolo: new THREE.MeshStandardMaterial({ map: l1.map, normalMap: l1.normalMap, roughnessMap: l1.roughnessMap, roughness: 1, metalness: 0, envMapIntensity: 0.35 }),
    sedia: new THREE.MeshStandardMaterial({ map: l2.map, normalMap: l2.normalMap, roughnessMap: l2.roughnessMap, roughness: 1, metalness: 0, envMapIntensity: 0.35 }),
    pavimento: new THREE.MeshStandardMaterial({ map: parquet.map, normalMap: parquet.normalMap, roughnessMap: parquet.roughnessMap, roughness: 1, metalness: 0, envMapIntensity: 0.3 }),
    boiserie: new THREE.MeshStandardMaterial({ map: l2.map, normalMap: l2.normalMap, roughness: 0.55, metalness: 0, envMapIntensity: 0.3 }),
    tovaglia: new THREE.MeshStandardMaterial({ color: 0xD6CFC0, map: tov.map, normalMap: tov.normalMap, roughnessMap: tov.roughnessMap, roughness: 1, metalness: 0, envMapIntensity: 0.25 }),
    muro: new THREE.MeshStandardMaterial({ map: tap.map, normalMap: tap.normalMap, roughness: 0.85, metalness: 0, envMapIntensity: 0.2 }),
    porcellana: new THREE.MeshPhysicalMaterial({ color: 0xE2DCCF, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.6 }),
    oro: new THREE.MeshStandardMaterial({ color: 0xC9A04A, roughness: 0.28, metalness: 1, envMapIntensity: 0.9 }),
    argento: new THREE.MeshStandardMaterial({ color: 0xD8DADF, roughness: 0.22, metalness: 1, envMapIntensity: 1.0 }),
    ottone: new THREE.MeshStandardMaterial({ color: 0xB8893A, roughness: 0.35, metalness: 1, envMapIntensity: 0.8 }),
    vetro: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide, specularIntensity: 1 }),
    vino: new THREE.MeshPhysicalMaterial({ color: 0x4A0810, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.9, envMapIntensity: 0.8 }),
    cera: new THREE.MeshStandardMaterial({ color: 0xEDE3CC, roughness: 0.6, metalness: 0, emissive: 0x3A2208, emissiveIntensity: 0.25, envMapIntensity: 0.2 }),
    tenda: new THREE.MeshStandardMaterial({ color: 0x4A0F14, roughness: 0.9, metalness: 0, envMapIntensity: 0.15, side: THREE.DoubleSide }),
    nero: new THREE.MeshStandardMaterial({ color: 0x08080A, roughness: 0.9, metalness: 0 }),
  });
  return MAT;
}

// ---- scrittura a mano su una tela (segnaposti): nome in corsivo, bordo nero se a lutto
export function scriviCarta(nome, { lutto = false, w = 640, h = 320, inchiostro = '#2A1A10', seed = 11 } = {}) {
  const base = cartaTex({ w, h, seed }), cv = base.canvas, c = cv.getContext('2d');
  if (lutto) { c.strokeStyle = '#0B0B0C'; c.lineWidth = 16; c.strokeRect(14, 14, w - 28, h - 28); c.lineWidth = 3; c.strokeRect(36, 36, w - 72, h - 72); }
  c.fillStyle = inchiostro; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${Math.round(h * 0.42)}px Corsivo`;
  c.save(); c.translate(w / 2, h * 0.55); c.rotate(-0.025); c.globalAlpha = 0.92; c.fillText(nome, 0, 0); c.restore();
  base.map.needsUpdate = true;
  return base;
}

// ---- fiamma di candela: una tela con la goccia di fuoco (bianco -> giallo -> arancio -> trasparente), su un piano che guarda la camera
let FIAMMA = null;
export function fiammaTex() {
  if (FIAMMA) return FIAMMA;
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const c = cv.getContext('2d');
  const goccia = (sc, col, a) => { c.save(); c.translate(64, 170); c.scale(sc, sc); c.beginPath(); c.moveTo(0, -150); c.bezierCurveTo(30, -90, 42, -10, 0, 40); c.bezierCurveTo(-42, -10, -30, -90, 0, -150); c.closePath(); c.globalAlpha = a; c.fillStyle = col; c.filter = 'blur(6px)'; c.fill(); c.restore(); };
  goccia(1.0, '#FF6A10', 0.55); goccia(0.82, '#FFA030', 0.8); goccia(0.62, '#FFD27A', 0.95); goccia(0.38, '#FFF6E0', 1);
  c.save(); c.translate(64, 200); c.globalAlpha = 0.55; c.fillStyle = '#4060FF'; c.filter = 'blur(4px)'; c.beginPath(); c.ellipse(0, 0, 13, 9, 0, 0, Math.PI * 2); c.fill(); c.restore();
  FIAMMA = new THREE.CanvasTexture(cv); FIAMMA.colorSpace = THREE.SRGBColorSpace; return FIAMMA;
}
let ALONE = null;
export function aloneTex() {
  if (ALONE) return ALONE;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.5)'); g.addColorStop(0.6, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  ALONE = new THREE.CanvasTexture(cv); ALONE.colorSpace = THREE.SRGBColorSpace; return ALONE;
}
// una candela accesa: cera, stoppino, fiamma (piano additivo che guarda la camera), alone, luce puntiforme calda che tremola
export function candela(parent, pos, { alta = 0.2, r = 0.012, luce = 0.1, seed = 1, conLuce = true } = {}) {
  const g = new THREE.Group(); g.position.copy(pos); parent.add(g);
  const cera = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r, alta, 20), MAT.cera); cera.position.y = alta / 2; g.add(cera);
  const colata = new THREE.Mesh(new THREE.SphereGeometry(r * 0.45, 10, 8), MAT.cera); colata.position.set(r * 0.8, alta * 0.88, 0); colata.scale.set(0.6, 1.8, 0.6); g.add(colata);
  const stoppino = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0011, 0.012, 6), MAT.nero); stoppino.position.y = alta + 0.005; g.add(stoppino);
  const fm = new THREE.MeshBasicMaterial({ map: fiammaTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); fm.color.setScalar(4.5);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.044), fm); f.position.y = alta + 0.019; g.add(f);
  const am = new THREE.MeshBasicMaterial({ map: aloneTex(), color: 0xFF9A40, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.22 });
  const a = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), am); a.position.y = alta + 0.02; g.add(a);
  let L = null; if (conLuce) { L = new THREE.PointLight(0xFF9F4A, luce, 2.6, 2); L.position.y = alta + 0.04; g.add(L); }
  return { g, f, a, L, seed, luce, alta,
    update(t, cam) {
      const n1 = M.noise1(t * 6.5, seed), n2 = M.noise1(t * 11 + 3, seed + 7), tr = 1 + 0.18 * n1 + 0.08 * n2;
      f.scale.set(1 + 0.08 * n2, tr, 1); f.position.x = 0.0018 * n1; f.quaternion.copy(cam.quaternion); f.parent.updateMatrixWorld(); const pq = f.parent.getWorldQuaternion(new THREE.Quaternion()).invert(); f.quaternion.premultiply(pq);
      a.quaternion.copy(f.quaternion); am.opacity = 0.18 + 0.04 * n1;
      if (L) L.intensity = luce * (0.88 + 0.12 * n1 + 0.05 * n2);
    } };
}
// ---- pulviscolo nel fascio di luna: punti morbidi che galleggiano piano (posizione = funzione del tempo)
export function pulviscolo(parent, { n = 600, centro = V(0, 1, 0), lungo = V(1, 0, 0), largo = 0.4, alto = 1.2, seed = 5, colore = 0xBFD4FF, dim = 0.012 } = {}) {
  const r = rnd(seed), base = [], geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) base.push([r(-1, 1), r(-1, 1), r(-1, 1), r(0, 100), r(0.4, 1)]);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
  const tx = new THREE.CanvasTexture(cv);
  const m = new THREE.PointsMaterial({ size: dim, map: tx, color: colore, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false });
  const P = new THREE.Points(geo, m); P.frustumCulled = false; parent.add(P);
  const perp = V(0, 1, 0).cross(lungo).normalize();
  return { P, update(t) {
    for (let i = 0; i < n; i++) { const b = base[i], s = b[3] + t * 0.05 * b[4];
      const a = b[0] + 0.06 * Math.sin(s * 1.3), q = b[1] + 0.04 * Math.sin(s * 0.7 + 2) - ((t * 0.01 * b[4]) % 2), w = b[2] + 0.05 * Math.cos(s * 0.9);
      const qq = ((q + 1) % 2 + 2) % 2 - 1;
      pos[i * 3] = centro.x + lungo.x * a + perp.x * w * largo; pos[i * 3 + 1] = centro.y + qq * alto + lungo.y * a; pos[i * 3 + 2] = centro.z + lungo.z * a + perp.z * w * largo; }
    geo.attributes.position.needsUpdate = true; } };
}
// ---- fascio di luce «volumetrico» finto: un cono/prisma additivo con una sfumatura lungo l'asse
export function fascio(parent, { da = V(0, 2, 0), a = V(0, 0, 0), largo0 = 0.5, largo1 = 0.9, colore = 0x9DB8FF, forza = 0.08 } = {}) {
  const d = a.clone().sub(da), L = d.length();
  const geo = new THREE.CylinderGeometry(largo0, largo1, L, 4, 1, true); geo.rotateY(Math.PI / 4);
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 128; const c = cv.getContext('2d'), gr = c.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.15, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0.15)'); c.fillStyle = gr; c.fillRect(0, 0, 4, 128);
  const tx = new THREE.CanvasTexture(cv);
  const m = new THREE.MeshBasicMaterial({ map: tx, color: colore, transparent: true, opacity: forza, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const mesh = new THREE.Mesh(geo, m); mesh.position.copy(da).addScaledVector(d, 0.5); mesh.quaternion.setFromUnitVectors(V(0, -1, 0), d.clone().normalize()); parent.add(mesh);
  return mesh;
}
