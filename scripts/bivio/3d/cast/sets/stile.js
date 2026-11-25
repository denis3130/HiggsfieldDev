// Stile «vettoriale 3D» del Bivio: forme 3D lisce con colori piatti e sfumature morbide (luce frontale che segue
// la camera + luce ambiente, niente riflessi lucidi), dettagli DIPINTI su texture fatte col codice.
// Qui: materiali, texture, superfici «loft» (sezioni a superellisse), segmenti, luci.
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
export const THREE = G.THREE;
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const DOWN = V(0, -1, 0), UP = V(0, 1, 0);
export const rnd = (seed) => { const r = M.mulberry32(seed); return (a = 0, b = 1) => a + (b - a) * r(); };

export function tex(w, h, fn, rep = null) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  fn(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
  return t;
}
// materiale opaco piatto (Lambert): colore o texture, nessun riflesso
export const mat = (color = 0xffffff, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
export const piatto = (color = 0xffffff, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
export const sfera = (r, s = 28) => new THREE.SphereGeometry(r, s, Math.round(s * 0.7));
export function add(p, geo, m, pos = null, scl = null) { const o = new THREE.Mesh(geo, m); if (pos) o.position.copy(pos); if (scl) o.scale.set(...scl); p.add(o); return o; }

// Superficie da sezioni orizzontali a superellisse: [{ y, rx, rz | rzf/rzb (davanti/dietro), n (2 = ellisse, 4 = squadrata), cx, cz }]
// u = 0.5 è il davanti (+z), la cucitura è dietro; v cresce lungo le sezioni. a0/a1 (radianti da davanti) per una fascia aperta.
export function loft(secs, segU = 48, { a0 = -Math.PI, a1 = Math.PI } = {}) {
  const P = [], UVs = [], I = [], vs = [0]; let len = 0;
  for (let i = 1; i < secs.length; i++) { len += Math.hypot(secs[i].y - secs[i - 1].y, secs[i].rx - secs[i - 1].rx, (secs[i].cz || 0) - (secs[i - 1].cz || 0)); vs.push(len); }
  secs.forEach((s, i) => {
    const e = 2 / (s.n || 2);
    for (let j = 0; j <= segU; j++) {
      const a = a0 + ((a1 - a0) * j) / segU, sn = Math.sin(a), cs = Math.cos(a);
      const fold = s.pieghe ? 1 + s.pieghe * Math.cos(a * (s.nPieghe || 14)) : 1;
      P.push((s.cx || 0) + s.rx * fold * Math.sign(sn) * Math.abs(sn) ** e, s.y, (s.cz || 0) + (cs >= 0 ? (s.rzf ?? s.rz) : (s.rzb ?? s.rz)) * fold * Math.sign(cs) * Math.abs(cs) ** e);
      UVs.push(j / segU, vs[i] / (len || 1));
    }
  });
  const row = segU + 1;
  for (let i = 0; i < secs.length - 1; i++) for (let j = 0; j < segU; j++) { const a = i * row + j, b = a + 1, c = a + row + 1, d = a + row; I.push(a, b, c, a, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UVs, 2));
  g.setIndex(I); g.computeVertexNormals();
  if (a1 - a0 > 6.28) { const N = g.attributes.normal;                      // cucitura dietro: normali uguali sui due bordi
    for (let i = 0; i < secs.length; i++) { const a = i * row, b = a + segU, nx = N.getX(a) + N.getX(b), ny = N.getY(a) + N.getY(b), nz = N.getZ(a) + N.getZ(b), l = Math.hypot(nx, ny, nz) || 1; N.setXYZ(a, nx / l, ny / l, nz / l); N.setXYZ(b, nx / l, ny / l, nz / l); } }
  return g;
}
// segmento rastremato lungo -y (da 0 a -len) con le estremità arrotondate: braccia, gambe, dita
export function segmento(p, len, r0, r1, m, { capA = true, capB = true, seg = 20 } = {}) {
  const g = new THREE.Group(); p.add(g);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, seg, 1, true), m); c.position.y = -len / 2; g.add(c);
  if (capA) add(g, sfera(r0, seg), m);
  if (capB) add(g, sfera(r1, seg), m, V(0, -len, 0));
  return g;
}
// tra due punti
export function tra(p, a, b, r0, r1, m, o = {}) { const d = b.clone().sub(a), g = segmento(p, d.length(), r0, r1 ?? r0, m, o); g.position.copy(a); g.quaternion.setFromUnitVectors(DOWN, d.normalize()); return g; }

// Luci dello stile: ambiente + luce frontale che segue la camera (centro chiaro, bordi più scuri, come un disegno sfumato)
// + una luce dall'alto che fa le ombre a terra. Chiamare segui(cam, look) a ogni fotogramma.
// Le intensità sono «quanto colore si vede» (1 = il colore pieno della tavolozza): three.js divide per pi greco, qui si rimoltiplica.
export const PI = Math.PI;
export function luci(scene, { amb = 0.58, fronte = 0.4, alto = 0.22, colore = 0xfff3e6, ombre = true, altoPos = [1.5, 5, 2.5], altoVerso = [0, 0, 0], area = 3.5 } = {}) {
  const A = new THREE.AmbientLight(colore, amb * PI); scene.add(A);
  const F = new THREE.DirectionalLight(0xffffff, fronte * PI); scene.add(F, F.target);
  const T = new THREE.DirectionalLight(colore, alto * PI); T.position.set(...altoPos); T.target.position.set(...altoVerso); scene.add(T, T.target);
  if (ombre) { T.castShadow = true; T.shadow.mapSize.set(2048, 2048); const c = T.shadow.camera; c.left = -area; c.right = area; c.top = area; c.bottom = -area; c.near = 0.5; c.far = 16; T.shadow.bias = -0.0006; T.shadow.normalBias = 0.02; T.shadow.radius = 5; }
  const tmp = V(0, 0, 0), up = V(0, 0, 0), right = V(0, 0, 0);
  return { A, F, T,
    segui(cam, look) {
      cam.updateMatrixWorld(); right.setFromMatrixColumn(cam.matrixWorld, 0); up.setFromMatrixColumn(cam.matrixWorld, 1);
      const d = cam.position.distanceTo(tmp.set(...look));
      F.position.copy(cam.position).addScaledVector(up, 0.28 * d).addScaledVector(right, -0.22 * d);
      F.target.position.set(...look);
    } };
}
// i personaggi fanno ombra ma non la ricevono (restano puliti); l'ambiente la riceve
export function ombre(group, { fa = true, riceve = false } = {}) { group.traverse((o) => { if (o.isMesh) { if (fa && !o.material.transparent) o.castShadow = true; o.receiveShadow = riceve; } }); return group; }
// alone morbido (luce di lampade, fuoco) e ombra di contatto
export const alone = (() => { let t = null; return () => (t ||= tex(128, 128, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); })); })();
