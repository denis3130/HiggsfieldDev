// Personaggi del Bivio in 3D cartone, costruiti col codice (versione 2).
// Testa liscia con la pelle DIPINTA su una texture (guance rosee, rughe, pieghe, ombre), occhi veri con palpebre
// (a riposo socchiuse, non sbarrate), sopracciglia a curva che si muovono, bocca disegnata che parla e sorride,
// mani con dita a due falangi che prendono pose (rilassata, presa, dito alzato, dito sulle labbra).
// Ogni personaggio: { group, pose(p) } e pose imposta tutto da p (funzione pura del tempo nel film).
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
const THREE = G.THREE;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UPV = V(0, 1, 0);
const rnd = (seed) => { const r = M.mulberry32(seed); return (a = 0, b = 1) => a + (b - a) * r(); };

export function tex(w, h, fn, rep = null) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  fn(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
  return t;
}
export const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const sph = (r, s = 32) => new THREE.SphereGeometry(r, s, Math.round(s * 0.75));
function add(p, geo, mat, pos, scl) { const m = new THREE.Mesh(geo, mat); if (pos) m.position.copy(pos); if (scl) m.scale.set(...scl); p.add(m); return m; }
export function limb(p, a, b, r, mat, r2 = null) {
  const d = b.clone().sub(a), len = Math.max(0.001, d.length());
  const geo = r2 == null ? new THREE.CapsuleGeometry(r, len, 8, 18) : new THREE.CylinderGeometry(r2, r, len, 18, 1);
  const m = new THREE.Mesh(geo, mat); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UPV, d.normalize()); p.add(m);
  if (r2 != null) { add(p, sph(r, 18), mat, a); add(p, sph(r2, 18), mat, b); }
  return m;
}

// ---------------------------------------------------------------- testa
// S = semiassi della testa (x, y, z); la faccia guarda +z; centro della testa in (0, 0.1, 0) nel gruppo head.
function faceTexture(o) {
  const W = 2048, Hh = 1024, S = o.S;
  // da un punto della faccia (coordinate della testa) alle coordinate della texture della sfera
  const uv = (x, y) => {
    const uy = M.clamp((y - 0.1) / S[1], -0.999, 0.999), th = Math.acos(uy);
    const d = Math.asin(M.clamp((x / S[0]) / Math.sin(th), -0.999, 0.999));
    return [(0.25 + d / (2 * Math.PI)) * W, (th / Math.PI) * Hh];
  };
  return tex(W, Hh, (c) => {
    c.fillStyle = o.skin; c.fillRect(0, 0, W, Hh);
    // leggera ombra sotto il mento e sul collo, luce sulla fronte
    const sh = c.createLinearGradient(0, Hh * 0.55, 0, Hh); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(90,40,30,0.25)');
    c.fillStyle = sh; c.fillRect(0, 0, W, Hh);
    const blob = (x, y, r, col) => { const [px, py] = uv(x, y), g = c.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(px - r, py - r, 2 * r, 2 * r); };
    // guance rosee, punta del naso, labbra appena colorate
    for (const s of [-1, 1]) blob(s * 0.052, 0.075, 95, o.blush);
    blob(0, 0.09, 40, o.noseTint);
    const line = (pts, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = uv(x, y); i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke(); };
    const arc = (x0, x1, y, bend, n = 12) => Array.from({ length: n + 1 }, (_, i) => { const k = i / n; return [M.lerp(x0, x1, k), y + bend * Math.sin(Math.PI * k)]; });
    const wr = o.wrinkles || 0;
    if (wr > 0) {
      const col = `rgba(120,70,55,${0.32 * wr})`;
      for (let i = 0; i < 3; i++) line(arc(-0.045 + i * 0.004, 0.045 - i * 0.004, 0.19 + i * 0.016, 0.004), 3, col);   // fronte
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) line([[s * 0.062, 0.128 + (i - 1) * 0.006], [s * 0.074, 0.13 + (i - 1) * 0.012]], 2.5, col);   // zampe di gallina
        line(arc(s * 0.022, s * 0.052, 0.108, -0.006, 8), 2.5, col);                                                          // borse sotto gli occhi
        line([[s * 0.021, 0.088], [s * 0.028, 0.072], [s * 0.032, 0.055], [s * 0.031, 0.04]], 3, col);                        // pieghe naso-bocca
      }
      line(arc(-0.014, 0.014, 0.024, -0.003, 6), 2.5, col);                                                                      // mento
    }
    if (o.stubble) { const r = rnd(4); c.fillStyle = 'rgba(60,40,30,0.16)'; for (let i = 0; i < 2600; i++) { const x = r(-0.07, 0.07), y = r(0.0, 0.07); if (Math.abs(x) < 0.025 && y > 0.04 && y < 0.07) continue; const [px, py] = uv(x, y); c.fillRect(px, py, 2, 2); } }
    if (o.plaster) { const [px, py] = uv(0.03, 0.2); c.save(); c.translate(px, py); c.rotate(-0.3); c.fillStyle = '#e9c9a6'; c.fillRect(-60, -18, 120, 36); c.fillStyle = '#d7b28d'; c.fillRect(-18, -12, 36, 24); c.restore(); }
  });
}

// faccia a uovo: sotto gli zigomi si stringe (x) e rientra un po' (z)
function uovo(geo, r = 1) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / r, y = p.getY(i) / r, z = p.getZ(i) / r;
    if (y < 0.15) { const k = Math.pow((0.15 - y) / 1.15, 1.3); p.setX(i, x * (1 - 0.3 * k) * r); p.setZ(i, z * (1 - 0.12 * k) * r); }
  }
  geo.computeVertexNormals(); return geo;
}
const stretta = (y) => { const uy = y; if (uy >= 0.15) return 1; return 1 - 0.3 * Math.pow((0.15 - uy) / 1.15, 1.3); };

export function testa(o) {
  const head = new THREE.Group();
  const S = o.S || [0.102, 0.122, 0.11];
  const skinM = std(0xffffff, 0.62, { map: faceTexture({ ...o, S }) });
  const skinFlat = std(new THREE.Color(o.skin).getHex(), 0.62);
  const face = add(head, uovo(new THREE.SphereGeometry(1, 96, 64)), skinM, V(0, 0.1, 0), S);
  // naso morbido (ponte + punta + ali), orecchie
  add(head, sph(o.nose || 0.0145, 24), skinFlat, V(0, 0.093, S[2] * 0.955), [1, 1.05, 0.95]);
  limb(head, V(0, 0.124, S[2] * 0.9), V(0, 0.099, S[2] * 0.965), 0.0085, skinFlat);
  for (const s of [-1, 1]) add(head, sph(0.0065, 12), skinFlat, V(s * 0.0115, 0.0885, S[2] * 0.915));
  for (const s of [-1, 1]) add(head, sph(0.024, 20), skinFlat, V(s * S[0] * 0.95, 0.1, -0.006), [0.3, 0.9, 0.6]);
  // occhi con palpebre (superiore che scende, inferiore che sale nel sorriso)
  const eyes = [], lidsU = [], lidsL = [], brows = [];
  const ex = o.eyeX || 0.037, ey = o.eyeY || 0.128, ez = S[2] * 0.8, er = o.eyeR || 0.019;
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * ex, ey, ez); head.add(e);
    add(e, sph(er, 28), std(0xf6f2ea, 0.3));
    const iris = new THREE.Mesh(new THREE.CircleGeometry(er * 0.56, 32), std(o.iris || 0x6e8796, 0.35)); iris.position.z = er * 0.985; e.add(iris);
    const pup = new THREE.Mesh(new THREE.CircleGeometry(er * 0.27, 24), new THREE.MeshBasicMaterial({ color: 0x0a0a0a })); pup.position.z = er * 0.995; e.add(pup);
    const hl = new THREE.Mesh(new THREE.CircleGeometry(er * 0.12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); hl.position.set(er * 0.22, er * 0.22, er * 1.0); e.add(hl);
    eyes.push(e);
    const lu = new THREE.Group(); lu.position.copy(e.position); head.add(lu);
    add(lu, new THREE.SphereGeometry(er * 1.08, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), skinFlat);
    const lash = add(lu, new THREE.TorusGeometry(er * 1.08, er * 0.07, 6, 32, Math.PI), std(o.lash || 0x5a3a30, 0.7)); lash.rotation.x = Math.PI / 2;
    lidsU.push(lu);
    const ll = new THREE.Group(); ll.position.copy(e.position); head.add(ll);
    add(ll, new THREE.SphereGeometry(er * 1.06, 32, 12, 0, Math.PI * 2, Math.PI * 0.66, Math.PI * 0.34), skinFlat);
    lidsL.push(ll);
    // sopracciglio: tubo curvo
    const b = new THREE.Group(); b.position.set(s * ex, ey + er * 1.9, S[2] * 0.88); head.add(b);
    const curve = new THREE.QuadraticBezierCurve3(V(-s * 0.017, -0.003, 0), V(s * 0.002, 0.004, 0.004), V(s * 0.02, -0.004, -0.006));
    add(b, new THREE.TubeGeometry(curve, 16, o.browW || 0.0038, 8, false), std(o.brow || 0x8a8580, 0.8));
    brows.push(b);
  }
  // bocca disegnata su una pellicola che segue la faccia
  const mtex = G.canvasTexture(256, 128);
  const decal = new THREE.Mesh(uovo(new THREE.SphereGeometry(1.006, 48, 24, Math.PI / 2 - 0.5, 1.0, 1.66, 0.52), 1.006),
    new THREE.MeshStandardMaterial({ map: mtex, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  decal.scale.set(...S); decal.position.set(0, 0.1, 0); decal.renderOrder = 2; head.add(decal);
  let lastM = '';
  const drawMouth = (op, sm, wide) => {
    const key = `${op.toFixed(2)}|${sm.toFixed(2)}|${wide.toFixed(2)}`; if (key === lastM) return; lastM = key;
    mtex.draw((c, w, h) => {
      const cx = w / 2, cy = h * 0.4, half = (o.mouthW || 40) * (1 + 0.15 * sm + 0.2 * wide), lift = 15 * sm - 6 * Math.max(0, -sm), open = 34 * op;
      if (op > 0.03) {
        c.fillStyle = '#2b0d10'; c.beginPath();
        c.moveTo(cx - half * 0.85, cy - lift * 0.8); c.quadraticCurveTo(cx, cy - 5 + lift * 0.2, cx + half * 0.85, cy - lift * 0.8);
        c.quadraticCurveTo(cx, cy + open * 1.45 + lift * 0.6, cx - half * 0.85, cy - lift * 0.8); c.fill();
        if (op > 0.25) { c.fillStyle = '#f3eee4'; c.beginPath(); c.ellipse(cx, cy - 1, half * 0.5, 4 + op * 2, 0, 0, Math.PI); c.fill(); }
        if (op > 0.5) { c.fillStyle = '#b5555b'; c.beginPath(); c.ellipse(cx, cy + open * 1.1, half * 0.4, open * 0.3, 0, Math.PI, 0); c.fill(); }
      }
      c.strokeStyle = o.lip || '#b25f5b'; c.lineCap = 'round';
      c.lineWidth = o.lipU || 7; c.beginPath(); c.moveTo(cx - half, cy - lift); c.quadraticCurveTo(cx, cy - 7 + lift * 0.25, cx + half, cy - lift); c.stroke();
      c.lineWidth = o.lipL || 11; c.beginPath(); c.moveTo(cx - half * 0.84, cy - lift * 0.8 + 2); c.quadraticCurveTo(cx, cy + 8 + open * 1.5 + lift * 0.7, cx + half * 0.84, cy - lift * 0.8 + 2); c.stroke();
      if (sm > 0.2) { c.strokeStyle = `rgba(120,60,55,${0.45 * sm})`; c.lineWidth = 2.5;
        for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(cx + sd * (half + 3), cy - lift - 4); c.quadraticCurveTo(cx + sd * (half + 9), cy - lift + 4, cx + sd * (half + 6), cy - lift + 12); c.stroke(); } }
    });
  };
  const chin = new THREE.Group();
  // pose del viso
  function face_(p) {
    const gx = p.gazeX || 0, gy = p.gazeY || 0;
    eyes.forEach((e) => e.rotation.set(-gy * 0.5, gx * 0.6, 0));
    const open = M.clamp(p.eyesOpen ?? 0.62);                     // 1 = sbarrati, 0.62 = riposo, 0 = chiusi
    const bl = M.clamp(p.blink || 0), sm = M.clamp(p.smile || 0, -1, 1), fear = M.clamp(p.fear || 0);
    const up = M.lerp(0.05, -1.45, M.clamp(open + 0.35 * fear) * (1 - bl)) - gy * 0.25;
    lidsU.forEach((l) => { l.rotation.x = up; });
    lidsL.forEach((l) => { l.rotation.x = -0.42 * Math.max(0, sm) * (1 - fear) - 0.15 * (p.squint || 0); });
    brows.forEach((b, i) => {
      const s = i ? 1 : -1;
      b.position.y = ey + er * 1.9 + 0.006 * (p.browUp || 0) + 0.008 * fear - 0.004 * (p.frown || 0);
      b.rotation.z = s * (0.18 * (p.browSad || 0) + 0.12 * fear - 0.2 * (p.frown || 0));
    });
    drawMouth(M.clamp(p.mouth || 0), sm, M.clamp(p.wide || 0));
  }
  return { head, face: face_, S, skinFlat };
}

// ---------------------------------------------------------------- mano con le dita: pose
// curl: 0 aperta ... 1 pugno; spread: dita aperte; point: indice teso; thumb: pollice piegato
export function mano(mat, side, size = 1) {
  const h = new THREE.Group(); h.scale.setScalar(size);
  add(h, sph(0.032, 22), mat, V(0, -0.03, 0), [0.92, 1.12, 0.5]);
  const fingers = [];
  const lens = [0.026, 0.031, 0.029, 0.022];
  for (let f = 0; f < 4; f++) {
    const base = new THREE.Group(); base.position.set((f - 1.5) * 0.0148, -0.06, 0); h.add(base);
    limb(base, V(0, 0, 0), V(0, -lens[f] * 0.55, 0), 0.0072, mat);
    const mid = new THREE.Group(); mid.position.set(0, -lens[f] * 0.55, 0); base.add(mid);
    limb(mid, V(0, 0, 0), V(0, -lens[f] * 0.5, 0), 0.0066, mat);
    fingers.push([base, mid]);
  }
  const th = new THREE.Group(); th.position.set(side * -0.028, -0.032, 0.008); h.add(th);
  limb(th, V(0, 0, 0), V(side * -0.012, -0.024, 0.01), 0.0082, mat);
  const thTip = new THREE.Group(); thTip.position.set(side * -0.012, -0.024, 0.01); th.add(thTip);
  limb(thTip, V(0, 0, 0), V(side * -0.004, -0.018, 0.008), 0.0075, mat);
  h.userData.pose = (p = {}) => {
    const curl = p.curl ?? 0.25, spread = p.spread || 0;
    fingers.forEach(([b, m], i) => {
      const c = i === 1 && p.point ? 0 : curl;
      b.rotation.set(-c * 1.3, 0, (i - 1.5) * 0.08 * spread * side);
      m.rotation.x = -c * 1.4;
    });
    th.rotation.set(-(p.thumb ?? curl) * 0.6, 0, side * (p.thumb ?? curl) * 0.4);
    thTip.rotation.x = -(p.thumb ?? curl) * 0.7;
  };
  h.userData.pose({});
  return h;
}

// braccio a due segmenti con la manica e la mano; pose con angoli (spalla x/z, gomito, polso)
function braccio(parent, side, o) {
  const sh = new THREE.Group(); sh.position.set(side * o.shoulderX, o.shoulderY, 0); parent.add(sh);
  limb(sh, V(0, 0, 0), V(0, -o.upper, 0), o.rArm, o.sleeve, o.rArm * 0.9);
  const el = new THREE.Group(); el.position.set(0, -o.upper, 0); sh.add(el);
  limb(el, V(0, 0, 0), V(0, -o.fore, 0), o.rArm * 0.88, o.sleeve, o.rArm * 0.75);
  if (o.cuff) add(el, new THREE.TorusGeometry(o.rArm * 0.78, 0.008, 8, 20), o.cuff, V(0, -o.fore + 0.005, 0)).rotation.x = Math.PI / 2;
  const wr = new THREE.Group(); wr.position.set(0, -o.fore - 0.008, 0); el.add(wr);
  const hand = mano(o.skin, side, o.handSize || 1); wr.add(hand);
  return {
    sh, el, wr, hand,
    set(a = {}) {
      sh.rotation.set(a.fwd ?? 0, a.twist ?? 0, side * (a.out ?? 0.1));
      el.rotation.set(-(a.bend ?? 0.15), 0, 0);
      wr.rotation.set(a.wx ?? 0, a.wy ?? 0, side * (a.wz ?? 0));
      hand.userData.pose(a.hand || {});
    },
  };
}

// ---------------------------------------------------------------- la nonna (v2)
export function nonna2() {
  const root = new THREE.Group();
  const skinHex = '#efc1a6';
  const skin = std(skinHex, 0.6);
  const r = rnd(5);
  const dressM = std(0xffffff, 0.82, { map: tex(256, 256, (c, w, h) => { c.fillStyle = '#272d3d'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(225,218,205,0.55)'; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.beginPath(); c.arc(x * 32 + (y % 2) * 16 + 8, y * 32 + 8, 2.6, 0, 7); c.fill(); } }, [6, 6]) });
  const woolM = std(0xffffff, 0.95, { side: THREE.DoubleSide, map: tex(256, 256, (c, w, h) => { c.fillStyle = '#bc9d74'; c.fillRect(0, 0, w, h); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const cx = x * 16 + 8, cy = y * 16 + 8; c.strokeStyle = (x + y) % 2 ? 'rgba(90,64,40,0.45)' : 'rgba(255,240,215,0.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 6, cy - 6); c.lineTo(cx, cy + 6); c.lineTo(cx + 6, cy - 6); c.stroke(); } }, [5, 3]) });
  const apronM = std(0xffffff, 0.85, { side: THREE.DoubleSide, map: tex(256, 256, (c, w, h) => { c.fillStyle = '#ebe3d1'; c.fillRect(0, 0, w, h); for (let i = 0; i < 46; i++) { const x = r() * w, y = r() * h, col = ['#b8545c', '#6b8fb3', '#d9a441'][i % 3]; c.fillStyle = col; for (let p = 0; p < 5; p++) { const a = p / 5 * 6.283; c.beginPath(); c.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 2.6, 0, 7); c.fill(); } c.fillStyle = '#f3e2a0'; c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); } }, [3, 3]) });
  const hairM = std(0xffffff, 0.75, { map: tex(512, 256, (c, w, h) => { c.fillStyle = '#d9d7d3'; c.fillRect(0, 0, w, h); const q = rnd(9); for (let i = 0; i < 420; i++) { c.strokeStyle = q() < 0.5 ? 'rgba(150,148,145,0.45)' : 'rgba(255,255,255,0.55)'; c.lineWidth = q(0.8, 2); const x = q() * w; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + q(-10, 10), h * 0.33, x + q(-10, 10), h * 0.66, x + q(-6, 6), h); c.stroke(); } c.strokeStyle = 'rgba(110,105,100,0.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(w * 0.25, 0); c.lineTo(w * 0.25, h); c.stroke(); }) });
  const goldM = std(0xa58a52, 0.42, { metalness: 0.55 });

  // corpo: vestito a campana, busto curvo, grembiule, scialle
  const body = new THREE.Group(); root.add(body);
  const prof = [[0.001, 0.27], [0.245, 0.27], [0.258, 0.4], [0.252, 0.5], [0.232, 0.65], [0.206, 0.82], [0.182, 0.95], [0.172, 1.0]];
  add(body, new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 48), dressM, null, [1.08, 1, 0.86]);
  const apron = add(body, new THREE.CylinderGeometry(0.236, 0.268, 0.58, 32, 1, true, -0.95, 1.9), apronM, V(0, 0.68, 0.0)); apron.scale.set(1.09, 1, 0.9);
  add(body, new THREE.TorusGeometry(0.182, 0.008, 6, 40), std(0xebe3d1, 0.8), V(0, 0.98, 0), [1.1, 1, 0.88]).rotation.x = Math.PI / 2;
  const upper = new THREE.Group(); upper.position.set(0, 0.98, 0); body.add(upper);
  add(upper, new THREE.LatheGeometry([[0.175, 0.0], [0.185, 0.08], [0.198, 0.18], [0.19, 0.26], [0.16, 0.32], [0.09, 0.36], [0.045, 0.375], [0.001, 0.38]].map(([a, b]) => new THREE.Vector2(a, b)), 48), dressM, null, [1.1, 1, 0.86]);
  for (const s of [-1, 1]) add(upper, sph(0.075, 24), dressM, V(s * 0.17, 0.27, 0), [1, 0.9, 1]);
  add(upper, new THREE.LatheGeometry([[0.07, 0.37], [0.16, 0.335], [0.218, 0.285], [0.24, 0.22], [0.245, 0.15], [0.24, 0.11]].map(([a, b]) => new THREE.Vector2(a, b)), 40, 0.55, Math.PI * 2 - 1.1), woolM, null, [1.14, 1, 0.95]);
  const lace = std(0xf4efe4, 0.85);
  const collar = add(upper, new THREE.TorusGeometry(0.062, 0.016, 10, 36), lace, V(0, 0.36, 0.012)); collar.rotation.x = Math.PI / 2 + 0.12; collar.scale.set(1.15, 1, 0.9);
  add(upper, new THREE.CylinderGeometry(0.05, 0.06, 0.07, 20), skin, V(0, 0.385, 0.01));
  // testa
  const T = testa({ skin: skinHex, blush: 'rgba(232,120,112,0.42)', noseTint: 'rgba(225,120,110,0.25)', wrinkles: 1, iris: 0x6d8494, brow: 0xcfcac4, lash: 0x8a6a60, lip: '#b0605d' });
  const head = T.head; head.position.set(0, 0.392, 0.025); head.scale.setScalar(1.12); upper.add(head);
  // capelli: calotta con la riga in mezzo, raccolti dietro, crocchia
  const hair = add(head, new THREE.SphereGeometry(1, 64, 40, 0, Math.PI * 2, 0, 1.7), hairM, V(0, 0.118, -0.006), [0.109, 0.131, 0.119]);
  hair.rotation.x = -0.82;
  add(head, sph(0.052, 28), hairM, V(0, 0.17, -0.115), [1.15, 0.9, 0.95]);
  add(head, new THREE.TorusGeometry(0.036, 0.009, 8, 24), hairM, V(0, 0.17, -0.12)).rotation.x = 0.9;
  // occhiali tondi sottili
  for (const s of [-1, 1]) {
    add(head, new THREE.TorusGeometry(0.026, 0.0018, 8, 40), goldM, V(s * 0.037, 0.127, 0.121));
    limb(head, V(s * 0.063, 0.13, 0.117), V(s * 0.1, 0.134, 0.02), 0.0014, goldM);
  }
  limb(head, V(-0.011, 0.13, 0.123), V(0.011, 0.13, 0.123), 0.0016, goldM);
  // braccia e mani
  const armO = { shoulderX: 0.185, shoulderY: 0.25, upper: 0.27, fore: 0.24, rArm: 0.047, sleeve: dressM, skin, handSize: 1.05, cuff: lace };
  const A = { L: braccio(upper, -1, armO), R: braccio(upper, 1, armO) };
  // gambe, calze, pantofole
  const stockM = std(0x8f7766, 0.7), slipM = std(0x6e2228, 0.8);
  for (const s of [-1, 1]) {
    limb(body, V(s * 0.08, 0.06, 0.01), V(s * 0.08, 0.3, 0), 0.046, stockM);
    add(body, new THREE.CapsuleGeometry(0.045, 0.1, 6, 16), slipM, V(s * 0.085, 0.04, 0.05), [1, 0.62, 1]).rotation.x = Math.PI / 2;
  }
  function pose(p = {}) {
    const br = p.breathe ?? 0;
    upper.rotation.set(0.14 + (p.lean || 0), p.twist || 0, 0);
    upper.scale.set(1 + 0.01 * br, 1 + 0.006 * br, 1 + 0.012 * br);
    head.rotation.set(-0.08 + (p.headPitch || 0), p.headYaw || 0, p.headRoll || 0);
    T.face(p);
    A.L.set(p.armL || { fwd: -0.15, out: 0.12, bend: 0.25, hand: { curl: 0.3 } });
    A.R.set(p.armR || { fwd: -0.15, out: 0.12, bend: 0.25, hand: { curl: 0.3 } });
    root.position.set(...(p.pos || [0, 0, 0])); root.rotation.y = p.yaw || 0;
  }
  pose({});
  return { group: root, pose, head, arms: A };
}

// ---------------------------------------------------------------- tu: il ragazzo arrivato sotto la pioggia
export function ragazzo() {
  const root = new THREE.Group();
  const skinHex = '#d9a07e';
  const skin = std(skinHex, 0.6);
  const jacket = std(0x262b33, 0.72), jeans = std(0x2c3c58, 0.8), shoe = std(0x3b2a20, 0.6), tee = std(0x8a8f96, 0.85);
  const hairM = std(0xffffff, 0.7, { map: tex(512, 256, (c, w, h) => { c.fillStyle = '#2c211b'; c.fillRect(0, 0, w, h); const q = rnd(13); for (let i = 0; i < 500; i++) { c.strokeStyle = q() < 0.5 ? 'rgba(15,10,8,0.5)' : 'rgba(90,70,55,0.45)'; c.lineWidth = q(1, 2.5); const x = q() * w, y = q() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + q(-8, 8), y + q(10, 30)); c.stroke(); } }) });
  const body = new THREE.Group(); root.add(body);
  // gambe e scarpe
  const legs = [-1, 1].map((s) => {
    const hip = new THREE.Group(); hip.position.set(s * 0.1, 0.92, 0); body.add(hip);
    limb(hip, V(0, 0, 0), V(-s * 0.005, -0.42, 0), 0.085, jeans, 0.07);
    const knee = new THREE.Group(); knee.position.set(-s * 0.005, -0.42, 0); hip.add(knee);
    limb(knee, V(0, 0, 0), V(0, -0.41, 0), 0.068, jeans, 0.058);
    const foot = add(knee, new THREE.CapsuleGeometry(0.055, 0.13, 6, 16), shoe, V(0, -0.45, 0.05), [1, 0.62, 1]); foot.rotation.x = Math.PI / 2;
    return { hip, knee };
  });
  const upper = new THREE.Group(); upper.position.set(0, 0.95, 0); body.add(upper);
  add(upper, new THREE.LatheGeometry([[0.17, -0.02], [0.2, 0.1], [0.215, 0.28], [0.21, 0.42], [0.17, 0.5], [0.08, 0.54], [0.001, 0.55]].map(([a, b]) => new THREE.Vector2(a, b)), 48), jacket, null, [1.15, 1, 0.8]);
  add(upper, new THREE.CylinderGeometry(0.07, 0.085, 0.1, 20, 1, true), tee, V(0, 0.52, 0.005));
  for (const s of [-1, 1]) add(upper, sph(0.07, 24), jacket, V(s * 0.2, 0.44, 0), [1, 0.75, 0.95]);
  add(upper, new THREE.CylinderGeometry(0.085, 0.1, 0.07, 24, 1, true), jacket, V(0, 0.53, 0.0));
  add(upper, new THREE.TorusGeometry(0.1, 0.035, 10, 36), jacket, V(0, 0.5, -0.04), [1.2, 1, 0.7]).rotation.x = Math.PI / 2 - 0.3;   // cappuccio abbassato
  limb(upper, V(0, 0.08, 0.162), V(0, 0.48, 0.15), 0.004, std(0x777b82, 0.3, { metalness: 0.5 }));                                     // cerniera
  add(upper, new THREE.CylinderGeometry(0.052, 0.058, 0.08, 20), skin, V(0, 0.56, 0.01));
  const T = testa({ skin: skinHex, blush: 'rgba(205,110,95,0.25)', noseTint: 'rgba(200,110,95,0.2)', wrinkles: 0, stubble: true, iris: 0x5a3e2c, brow: 0x2a1d16, browW: 0.0052, lash: 0x2a1d16, lip: '#a8645a', mouthW: 42, eyeR: 0.0185, S: [0.1, 0.124, 0.108], nose: 0.015 });
  const head = T.head; head.position.set(0, 0.568, 0.02); head.scale.setScalar(1.08); upper.add(head);
  const hair = add(head, new THREE.SphereGeometry(1, 64, 40, 0, Math.PI * 2, 0, 1.6), hairM, V(0, 0.122, -0.01), [0.106, 0.13, 0.116]); hair.rotation.x = -0.45;
  // ciuffo: ciocche allungate che partono dalla riga e cadono di lato sulla fronte
  for (let i = 0; i < 6; i++) { const a = -0.5 + i * 0.2; const lock = add(head, sph(0.026, 16), hairM, V(-0.02 + i * 0.013, 0.205 - Math.abs(a) * 0.012, 0.075 - Math.abs(a) * 0.01), [1.9, 0.5, 0.95]); lock.rotation.set(0.3, 0.15, -0.35 + a * 0.2); }
  for (const s of [-1, 1]) { const side = add(head, sph(0.03, 16), hairM, V(s * 0.093, 0.15, 0.0), [0.45, 1.1, 1.3]); side.rotation.x = 0.2; }
  const armO = { shoulderX: 0.225, shoulderY: 0.43, upper: 0.29, fore: 0.27, rArm: 0.058, sleeve: jacket, skin, handSize: 1.18 };
  const A = { L: braccio(upper, -1, armO), R: braccio(upper, 1, armO) };
  function pose(p = {}) {
    const br = p.breathe ?? 0;
    upper.rotation.set(p.lean || 0, p.twist || 0, 0);
    upper.scale.set(1 + 0.01 * br, 1, 1 + 0.012 * br);
    head.rotation.set(p.headPitch || 0, p.headYaw || 0, p.headRoll || 0);
    T.face(p);
    A.L.set(p.armL || { fwd: -0.05, out: 0.1, bend: 0.2, hand: { curl: 0.35 } });
    A.R.set(p.armR || { fwd: -0.05, out: 0.1, bend: 0.2, hand: { curl: 0.35 } });
    const sit = M.clamp(p.sit || 0);
    legs.forEach((l) => { l.hip.rotation.x = -1.57 * sit; l.knee.rotation.x = 1.57 * sit; });
    const pos = p.pos || [0, 0, 0];
    root.position.set(pos[0], pos[1] - 0.47 * sit, pos[2]); root.rotation.y = p.yaw || 0;
  }
  pose({});
  return { group: root, pose, head, arms: A };
}
