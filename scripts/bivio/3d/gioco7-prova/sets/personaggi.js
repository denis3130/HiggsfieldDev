// I sette de «Il gioco dei sette» nell'aspetto del video A: busto MakeHuman (personaggi/converti_teste.py) con la pelle dipinta,
// occhi veri (bulbo lucido, iride con le fibre, pupilla), capelli scolpiti (guscio sulla testa con le ciocche in rilievo, chignon,
// coda) e il vestito dipinto sul busto. Origine nel giunto della testa, metri, il viso guarda +z.
import { THREE, V, rnd, fbm, noise2 } from './look.js';

const BASE = new URL('../personaggi/dati/', import.meta.url).href;
async function leggi(nome) {
  const [j, b] = await Promise.all([fetch(BASE + nome + '.json').then((r) => r.json()), fetch(BASE + nome + '.bin').then((r) => r.arrayBuffer())]);
  const n = j.vertici; let o = 0; const pos = new Float32Array(b, o, n * 3); o += n * 12; const nor = new Float32Array(b, o, n * 3); o += n * 12;
  const uv = new Float32Array(b, o, n * 2); o += n * 8; const idx = new Uint32Array(b, o, j.indici);
  return { ...j, pos, nor, uv, idx };
}
const carica = (url, colore) => new Promise((ok, no) => new THREE.TextureLoader().load(url, (t) => { t.colorSpace = colore ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; ok(t); }, undefined, no));

// ---- l'occhio: sclera con le venature appena rosa ai bordi, iride a fibre con l'anello scuro, pupilla; riflesso lucido dal materiale
function occhioTex(iride = '#5B7A4A', seed = 1) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const c = cv.getContext('2d'), r = rnd(seed);
  // la tela avvolge la sfera: u = longitudine, v = latitudine; il davanti (verso +z) è al centro della tela
  const g = c.createLinearGradient(0, 0, 512, 0); g.addColorStop(0, '#E8C9C0'); g.addColorStop(0.35, '#F4EEE6'); g.addColorStop(0.65, '#F4EEE6'); g.addColorStop(1, '#E8C9C0'); c.fillStyle = g; c.fillRect(0, 0, 512, 512);
  c.strokeStyle = 'rgba(190,70,70,0.25)'; c.lineWidth = 1.2;
  for (let i = 0; i < 26; i++) { c.beginPath(); let x = r() < 0.5 ? r(0, 120) : r(392, 512), y = r(80, 432); c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (x < 256 ? 1 : -1) * r(4, 16); y += r(-10, 10); c.lineTo(x, y); } c.stroke(); }
  const cx = 256, cy = 256, R = 74, base = new THREE.Color(iride);
  const ir = c.createRadialGradient(cx, cy, 10, cx, cy, R); ir.addColorStop(0, '#' + base.clone().multiplyScalar(0.55).getHexString()); ir.addColorStop(0.55, '#' + base.getHexString()); ir.addColorStop(0.9, '#' + base.clone().multiplyScalar(0.7).getHexString()); ir.addColorStop(1, '#1A1410');
  c.fillStyle = ir; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
  for (let i = 0; i < 140; i++) { const a = r(0, Math.PI * 2), l = r(0.4, 0.95); c.strokeStyle = `rgba(${r() < 0.5 ? '255,240,200' : '20,16,10'},${r(0.08, 0.22)})`; c.lineWidth = r(0.6, 1.6); c.beginPath(); c.moveTo(cx + Math.cos(a) * R * 0.32, cy + Math.sin(a) * R * 0.32); c.lineTo(cx + Math.cos(a) * R * l, cy + Math.sin(a) * R * l); c.stroke(); }
  c.fillStyle = '#060504'; c.beginPath(); c.arc(cx, cy, R * 0.36, 0, Math.PI * 2); c.fill();
  const lu = c.createRadialGradient(cx - R * 0.3, cy - R * 0.32, 0, cx - R * 0.3, cy - R * 0.32, R * 0.2); lu.addColorStop(0, 'rgba(255,255,255,0.95)'); lu.addColorStop(0.5, 'rgba(255,255,255,0.5)'); lu.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = lu; c.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function occhio(raggio, iride, seed) {
  const geo = new THREE.SphereGeometry(raggio, 48, 32); geo.rotateY(-Math.PI / 2);      // il centro della tela guarda +z
  const m = new THREE.MeshPhysicalMaterial({ map: occhioTex(iride, seed), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.9 });
  const o = new THREE.Mesh(geo, m); return o;
}

// ---- capelli scolpiti: un guscio sopra il cuoio capelluto (i vertici del busto dentro l'attaccatura, spinti fuori lungo la normale) con
// le ciocche in rilievo; più chignon o coda per chi li porta. stile = { colore, spessore, fronte (altezza dell'attaccatura sugli occhi),
// lati, nuca, ciocche (quante), verso ('indietro' | 'riga'), chignon, coda, lucido }
function capelli(B, st) {
  const P = B.pos, N = B.nor, n = B.vertici, eY = B.occhi.S[1], H = (B.testa2[1] || 0.15), cap = B.capelli || {};
  const fronte = cap.fronte ?? st.fronte, lati = cap.lati ?? st.lati, nuca = cap.nuca ?? st.nuca;
  const dentro = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    const k = Math.abs(Math.atan2(x, z)) / Math.PI, soglia = eY + (k < 0.35 ? fronte + (lati - fronte) * (k / 0.35) : lati + (nuca - lati) * ((k - 0.35) / 0.65)) + (cap.tempie || 0) * Math.exp(-(((k - 0.2) / 0.07) ** 2));
    const d = Math.max(0, Math.min(1, (y - soglia) / 0.018)); dentro[i] = d * d * (3 - 2 * d); }
  const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), keep = [];
  for (let i = 0; i < n; i++) { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], d = dentro[i];
    const sopra = Math.max(0, Math.min(1, (y - eY - 0.03) / 0.09)), alto = sopra * sopra * (3 - 2 * sopra);
    let sp = 0.0004 + st.spessore * d * (0.28 + 0.72 * alto) * (0.85 + 0.3 * fbm(x * 40, z * 40 + y * 20, 3, 2));
    const a = st.verso === 'riga' ? Math.atan2(x - 0.03, z) * 11 : x * 190;                   // le ciocche: creste parallele (indietro) o a raggiera dalla riga
    const ciuffo = Math.pow(Math.abs(Math.sin(a + 2.6 * noise2(y * 24, z * 24, 5))), 0.6), ondina = 0.5 + 0.5 * Math.sin(a * 0.37 + y * 90);
    sp += st.spessore * 0.55 * d * (0.35 + 0.65 * alto) * ciuffo * (0.7 + 0.3 * ondina);
    if (st.ciuffo) sp += st.ciuffo * d * Math.exp(-((x / 0.05) ** 2) - (((y - eY - 0.075) / 0.03) ** 2)) * Math.max(0, z) * 12;      // il ciuffo davanti
    pos[i * 3] = x + N[i * 3] * sp; pos[i * 3 + 1] = y + N[i * 3 + 1] * sp; pos[i * 3 + 2] = z + N[i * 3 + 2] * sp; }
  for (let t = 0; t < B.idx.length; t += 3) { const a = B.idx[t], b = B.idx[t + 1], c = B.idx[t + 2]; if (dentro[a] > 0 || dentro[b] > 0 || dentro[c] > 0) keep.push(a, b, c); }
  const rgba = new Float32Array(n * 4); for (let i = 0; i < n; i++) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 1; rgba[i * 4 + 3] = Math.min(1, dentro[i] * 1.6); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(rgba, 4)); g.setIndex(keep); g.computeVertexNormals();
  const m = new THREE.MeshPhysicalMaterial({ color: cap.colore || st.colore, vertexColors: true, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 0.66, sheen: 0.45, sheenColor: new THREE.Color(cap.colore || st.colore).multiplyScalar(1.5), sheenRoughness: 0.45, clearcoat: (st.lucido || 0) * 0.4, clearcoatRoughness: 0.4, envMapIntensity: 0.28 });
  const grp = new THREE.Group(); grp.add(new THREE.Mesh(g, m));
  const mp = m.clone(); mp.vertexColors = false; mp.transparent = false; mp.side = THREE.DoubleSide;
  if (st.chignon) { const s = new THREE.Mesh(new THREE.SphereGeometry(st.chignon, 32, 24), mp); const pa = s.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), w = 1 + 0.12 * Math.sin(Math.atan2(y, x) * 7 + z * 80); pa.setXYZ(i, x * w, y * w, z * w); } s.geometry.computeVertexNormals();
    s.position.set(0, H * 0.93, -0.095); s.scale.set(1, 0.85, 0.9); grp.add(s); }
  if (st.coda) { const curva = new THREE.CatmullRomCurve3([V(0, H * 0.75, -0.1), V(0, H * 0.55, -0.135), V(0, H * 0.1, -0.13), V(0, -H * 0.35, -0.1)]);
    const tubo = new THREE.TubeGeometry(curva, 40, st.coda, 20, false); const pa = tubo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const k = Math.floor(i / 21) / 40, s = 1 - 0.55 * k; const c = curva.getPoint(k); pa.setXYZ(i, c.x + (pa.getX(i) - c.x) * s, c.y + (pa.getY(i) - c.y) * s, c.z + (pa.getZ(i) - c.z) * s); }
    tubo.computeVertexNormals(); grp.add(new THREE.Mesh(tubo, mp)); }
  if (st.lunghi) grp.add(new THREE.Mesh(tenda(B, st, eY, lati), mp));
  return grp;
}
function tenda(B, st, eY, lati) {
  const P = B.pos, n = B.vertici, L = st.lunghi, a0 = L.apre || 1.2, NA = 80, NY = 40, yTop = eY + 0.075, yBot = eY + L.giu;
  let cx = 0, cz = 0, c = 0; for (let i = 0; i < n; i++) { const y = P[i * 3 + 1]; if (y > eY - 0.02 && y < eY + 0.08) { cx += P[i * 3]; cz += P[i * 3 + 2]; c++; } } cx /= c; cz /= c;
  const bins = new Float32Array(NA * NY), alt = (j) => yTop + (yBot - yTop) * (j / (NY - 1)), ang = (k) => a0 + (Math.PI * 2 - 2 * a0) * (k / (NA - 1));
  for (let i = 0; i < n; i++) { const x = P[i * 3] - cx, y = P[i * 3 + 1], z = P[i * 3 + 2] - cz; if (y > yTop + 0.02) continue;
    let a = Math.atan2(x, z); if (a < 0) a += Math.PI * 2; const k = Math.round(((a - a0) / (Math.PI * 2 - 2 * a0)) * (NA - 1)); if (k < 0 || k >= NA) continue;
    const j = Math.max(0, Math.min(NY - 1, Math.round(((y - yTop) / (yBot - yTop)) * (NY - 1)))); bins[k * NY + j] = Math.max(bins[k * NY + j], Math.hypot(x, z)); }
  const pos = [], idx = [];
  for (let k = 0; k < NA; k++) { let r = 0; const a = ang(k);
    for (let j = 0; j < NY; j++) { const b = bins[k * NY + j] || r; r = j === 0 ? b : Math.min(r + 0.0025, Math.max(r * 0.995, b));   // cresce piano: niente ali sulle spalle
      const t = j / (NY - 1), y = alt(j) - (j === NY - 1 ? 0.012 * Math.abs(Math.sin(k * 1.7)) + 0.008 * noise2(k * 0.5, 3, 2) : 0);
      const fine = Math.max(0, (t - 0.86) / 0.14), dentroF = 0.012 * fine * fine;                     // le punte rientrano un poco (niente scalino sotto)
      const bordo = Math.min(1, Math.min(k, NA - 1 - k) / 4);                                       // ai due bordi davanti la tenda si stringe sulla testa
      const rr = r + 0.0015 + st.spessore * 0.5 * bordo + L.gonfio * Math.pow(t, 1.3) * bordo + 0.005 * Math.abs(Math.sin(a * 21 + 4 * noise2(a * 3, t * 4, 8))) * (0.3 + t) - dentroF;
      pos.push(cx + Math.sin(a) * rr, y, cz + Math.cos(a) * rr); } }
  for (let k = 0; k < NA - 1; k++) for (let j = 0; j < NY - 1; j++) { const a = k * NY + j, b = a + NY; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

// ---- il vestito dipinto sul busto: una maglia/giacca sotto il collo (colore del tessuto + trama), con lo scollo
function vestitoMat(B, v) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'); c.fillStyle = v.colore; c.fillRect(0, 0, 64, 64);
  return new THREE.MeshPhysicalMaterial({ color: v.colore, roughness: 0.9, sheen: 0.5, sheenColor: new THREE.Color(v.colore).multiplyScalar(1.4), envMapIntensity: 0.3 });
}

export const STILI = {
  leon:   { iride: '#5A4632', capelli: { colore: 0x3A2A1E, spessore: 0.011, ciuffo: 0.0016, fronte: 0.05, lati: 0.035, nuca: -0.06, verso: 'indietro' }, vestito: { colore: 0x2B2E36, collo: -0.108 } },
  victor: { iride: '#6E7C88', capelli: { colore: 0xA8A49C, spessore: 0.007, fronte: 0.075, lati: 0.03, nuca: -0.05, verso: 'riga' }, vestito: { colore: 0x3B3F46, collo: -0.11 }, occhiali: true },
  elena:  { iride: '#4A3424', capelli: { colore: 0x2A1C14, spessore: 0.009, fronte: 0.055, lati: 0.025, nuca: -0.075, verso: 'indietro', chignon: 0.046, lucido: 0.3 }, vestito: { colore: 0x141416, collo: -0.102 } },
  marcus: { iride: '#2E1E14', capelli: { colore: 0x161210, spessore: 0.003, fronte: 0.06, lati: 0.03, nuca: -0.06, verso: 'indietro' }, vestito: { colore: 0x4A3324, collo: -0.11 } },
  nora:   { iride: '#3A2618', capelli: { colore: 0x1A1412, spessore: 0.012, fronte: 0.045, lati: -0.02, nuca: -0.09, verso: 'riga', lunghi: { giu: -0.1, gonfio: 0.01, apre: 1.25 } }, vestito: { colore: 0x2F4A3C, collo: -0.1 } },
  adrian: { iride: '#3E5466', capelli: { colore: 0x241A12, spessore: 0.01, ciuffo: 0.0012, fronte: 0.06, lati: 0.035, nuca: -0.06, verso: 'indietro', lucido: 0.6 }, vestito: { colore: 0x1B2236, collo: -0.11 } },
  sophie: { iride: '#6A5232', capelli: { colore: 0x5A3A22, spessore: 0.011, fronte: 0.05, lati: 0.0, nuca: -0.08, verso: 'riga', lunghi: { giu: -0.2, gonfio: 0.02, apre: 1.18 } }, vestito: { colore: 0x6B1D22, collo: -0.098 } },
};

// il busto pronto: gruppo con pelle, occhi, capelli, vestito (dipinto: i vertici sotto lo scollo prendono il colore del tessuto)
export async function busto(nome) {
  const B = await leggi(nome), st = STILI[nome];
  const [mappa, rilievo] = await Promise.all([carica(BASE + nome + '_pelle.jpg', true), carica(BASE + nome + '_rilievo.png', false)]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(B.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(B.nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(B.uv, 2)); g.setIndex(new THREE.BufferAttribute(B.idx, 1));
  // il vestito: i triangoli sotto lo scollo vanno al materiale del tessuto (gruppo 1), gli altri alla pelle (gruppo 0)
  const scollo = (x, z) => st.vestito.collo - 0.028 * Math.exp(-((x / 0.055) ** 2)) * (z > 0 ? 1 : 0);
  const sotto = (i) => B.pos[i * 3 + 1] < scollo(B.pos[i * 3], B.pos[i * 3 + 2]);
  const pelleI = [], stoffaI = [];
  for (let t = 0; t < B.idx.length; t += 3) { const a = B.idx[t], b = B.idx[t + 1], c = B.idx[t + 2]; ((sotto(a) + sotto(b) + sotto(c)) >= 2 ? stoffaI : pelleI).push(a, b, c); }
  g.setIndex([...pelleI, ...stoffaI]); g.addGroup(0, pelleI.length, 0); g.addGroup(pelleI.length, stoffaI.length, 1);
  const pelle = new THREE.MeshPhysicalMaterial({ map: mappa, normalMap: rilievo, roughness: 0.55, sheen: 0.35, sheenColor: new THREE.Color(0xFFB09A), sheenRoughness: 0.5, envMapIntensity: 0.35 });
  const stoffa = maglia(st.vestito.colore);
  const grp = new THREE.Group(), corpo = new THREE.Mesh(g, [pelle, stoffa]); grp.add(corpo); grp.add(colletto(B, scollo, stoffa.color));
  for (const s of ['S', 'D']) { const o = occhio(B.occhi.raggio * 0.97, st.iride, s === 'S' ? 3 : 4); o.position.set(...B.occhi[s]); grp.add(o); grp.userData['occhio' + s] = o; }
  grp.add(capelli(B, st.capelli));
  if (st.occhiali) grp.add(occhiali(B));
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  grp.userData.B = B; return grp;
}
// la maglia: colore + coste verticali e punto maglia nel rilievo
function maglia(colore) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'), im = c.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const u = (x % 16) / 16, v = ((y + (Math.floor(x / 8) % 2) * 4) % 8) / 8;
    const h = 0.5 + 0.35 * Math.cos(u * Math.PI * 2) * 0.5 + 0.15 * Math.sin(v * Math.PI * 2); const hx = -0.35 * Math.PI * 2 * Math.sin(u * Math.PI * 2) * 0.5 / 16, hy = 0.15 * Math.PI * 2 * Math.cos(v * Math.PI * 2) / 8;
    const k = 1 / Math.hypot(hx * 6, hy * 6, 1), i = (y * 256 + x) * 4; im.data[i] = (-hx * 6 * k * 0.5 + 0.5) * 255; im.data[i + 1] = (hy * 6 * k * 0.5 + 0.5) * 255; im.data[i + 2] = (k * 0.5 + 0.5) * 255; im.data[i + 3] = 255; }
  c.putImageData(im, 0, 0); const n = new THREE.CanvasTexture(cv); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(22, 22);
  return new THREE.MeshPhysicalMaterial({ color: colore, normalMap: n, normalScale: new THREE.Vector2(0.45, 0.45), roughness: 0.92, sheen: 0.6, sheenColor: new THREE.Color(colore).multiplyScalar(1.5), sheenRoughness: 0.6, envMapIntensity: 0.25 });
}
// il colletto arrotolato: un tubo morbido che segue lo scollo tutto attorno al collo
function colletto(B, scollo, colore) {
  const pts = [], P = B.pos, n = B.vertici;
  for (let s = 0; s < 72; s++) { const a = (s / 72) * Math.PI * 2, dx = Math.sin(a), dz = Math.cos(a); let best = -1, bd = -1e9;
    for (let i = 0; i < n; i++) { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; if (Math.abs(y - scollo(x, z)) > 0.006) continue; const r = Math.hypot(x, z); if (r < 1e-4) continue; const c = (x * dx + z * dz) / r; if (c < 0.97) continue; const sc = c * 10 + r; if (sc > bd) { bd = sc; best = i; } }
    if (best >= 0) { const r = Math.hypot(P[best * 3], P[best * 3 + 2]) + 0.003; pts.push([dx * r, dz * r]); } }
  if (pts.length < 8) return new THREE.Group();
  const L = pts.length, lisci = pts.map((p, i) => { let x = 0, z = 0; for (let k = -3; k <= 3; k++) { const q = pts[(i + k + L) % L]; x += q[0]; z += q[1]; } return V(x / 7, scollo(x / 7, z / 7) + 0.002, z / 7); });
  const curva = new THREE.CatmullRomCurve3(lisci, true, 'centripetal');
  return new THREE.Mesh(new THREE.TubeGeometry(curva, 160, 0.0065, 14, true), new THREE.MeshPhysicalMaterial({ color: colore, roughness: 0.9, sheen: 0.6, sheenColor: colore.clone().multiplyScalar(1.5), envMapIntensity: 0.25 }));
}
// occhiali tondi a filo d'oro (fatti col codice): due cerchi davanti agli occhi, il ponte, le aste verso le orecchie
function occhiali(B) {
  const m = new THREE.MeshStandardMaterial({ color: 0xB8964A, roughness: 0.3, metalness: 1 }), g = new THREE.Group(), r = 0.0205;
  const lente = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.12, envMapIntensity: 1.2 });
  for (const s of ['S', 'D']) { const e = B.occhi[s], c = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0011, 8, 48), m); c.position.set(e[0] * 1.08, e[1] - 0.003, e[2] + 0.024); g.add(c);
    const l = new THREE.Mesh(new THREE.CircleGeometry(r, 32), lente); l.position.copy(c.position); g.add(l);
    const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 0.1, 6), m); asta.rotation.x = Math.PI / 2; asta.position.set(e[0] * 1.08 + Math.sign(e[0]) * r, e[1], e[2] - 0.026); g.add(asta); }
  const ponte = new THREE.Mesh(new THREE.TorusGeometry(Math.max(0.004, Math.abs(B.occhi.S[0]) * 1.08 - r), 0.001, 6, 16, Math.PI), m); ponte.position.set(0, B.occhi.S[1] + 0.001, B.occhi.S[2] + 0.026); g.add(ponte);
  return g;
}
