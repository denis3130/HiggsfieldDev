// La nonna in 3D cartone, costruita col codice. Personaggio con "rig": testa, occhi che guardano e sbattono,
// sopracciglia, bocca che si apre a tempo con la voce, sorriso, braccio che fa cenno di entrare, mano che stringe lo scialle.
// nonna() restituisce { group, pose(p) }: pose imposta TUTTO da p (funzione pura, nessuno stato tra i fotogrammi).
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
const THREE = G.THREE;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UPV = V(0, 1, 0);

function tex(w, h, fn, rep = null) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  fn(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
  return t;
}
const rnd = (seed) => { const r = M.mulberry32(seed); return (a = 0, b = 1) => a + (b - a) * r(); };

// tessuti disegnati col codice
const dressTex = () => tex(256, 256, (c, w, h) => {
  c.fillStyle = '#262c3c'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(220,214,200,0.55)';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.beginPath(); c.arc(x * 32 + (y % 2) * 16 + 8, y * 32 + 8, 2.6, 0, 7); c.fill(); }
}, [6, 6]);
const woolTex = () => tex(256, 256, (c, w, h) => {
  c.fillStyle = '#b99a72'; c.fillRect(0, 0, w, h);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {          // maglia a V
    const cx = x * 16 + 8, cy = y * 16 + 8;
    c.strokeStyle = (x + y) % 2 ? 'rgba(90,64,40,0.45)' : 'rgba(255,240,215,0.35)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(cx - 6, cy - 6); c.lineTo(cx, cy + 6); c.lineTo(cx + 6, cy - 6); c.stroke();
  }
}, [5, 3]);
const apronTex = () => tex(256, 256, (c, w, h) => {
  const r = rnd(5);
  c.fillStyle = '#e9e1cf'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 46; i++) {                                     // fiorellini
    const x = r() * w, y = r() * h, col = ['#b8545c', '#6b8fb3', '#d9a441'][i % 3];
    c.fillStyle = col; for (let p = 0; p < 5; p++) { const a = p / 5 * 6.283; c.beginPath(); c.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 2.6, 0, 7); c.fill(); }
    c.fillStyle = '#f3e2a0'; c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill();
  }
}, [3, 3]);
const hairTex = () => tex(256, 256, (c, w, h) => {
  c.fillStyle = '#dcdad6'; c.fillRect(0, 0, w, h);
  const r = rnd(9);
  for (let i = 0; i < 260; i++) {                                    // ciocche pettinate all'indietro
    c.strokeStyle = r() < 0.5 ? 'rgba(150,148,145,0.45)' : 'rgba(255,255,255,0.55)'; c.lineWidth = r(0.8, 2.2);
    const x = r() * w; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + r(-12, 12), h * 0.33, x + r(-12, 12), h * 0.66, x + r(-8, 8), h); c.stroke();
  }
}, [3, 1]);

export function nonna() {
  const root = new THREE.Group();
  const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
  const skin = std(0xf0c4ab, 0.55, { emissive: 0x2a0c06, emissiveIntensity: 0.12 });
  const skinDk = std(0xd9a68b, 0.6);
  const lipM = std(0xbb6e69, 0.45);
  const hairM = std(0xffffff, 0.75, { map: hairTex() });
  const dressM = std(0xffffff, 0.8, { map: dressTex() });
  const woolM = std(0xffffff, 0.95, { map: woolTex(), side: THREE.DoubleSide });
  const apronM = std(0xffffff, 0.85, { map: apronTex(), side: THREE.DoubleSide });
  const goldM = std(0x9c7f48, 0.45, { metalness: 0.6 });
  const stockM = std(0x8f7766, 0.7), slipM = std(0x6e2228, 0.8);
  const add = (p, geo, mat, pos, scl = null) => { const m = new THREE.Mesh(geo, mat); if (pos) m.position.copy(pos); if (scl) m.scale.set(...scl); p.add(m); return m; };
  const sph = (r, s = 32) => new THREE.SphereGeometry(r, s, Math.round(s * 0.75));
  const limb = (p, a, b, r, mat) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, d.length()), 8, 18), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UPV, d.normalize()); p.add(m); return m; };

  // ---- corpo: vestito a campana (tornio), un po' curva in avanti
  const body = new THREE.Group(); root.add(body);
  const prof = [[0.001, 0.27], [0.245, 0.27], [0.258, 0.4], [0.255, 0.48], [0.245, 0.62], [0.215, 0.8], [0.185, 0.93], [0.17, 1.0], [0.18, 1.08], [0.195, 1.17], [0.19, 1.24], [0.16, 1.3], [0.09, 1.345], [0.045, 1.36], [0.001, 1.365]];
  const dress = add(body, new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 48), dressM); dress.scale.set(1.08, 1, 0.86);
  const upper = new THREE.Group(); upper.position.set(0, 1.0, 0); body.add(upper);      // busto: si piega in avanti e respira
  // grembiule davanti
  const apron = add(body, new THREE.CylinderGeometry(0.236, 0.268, 0.58, 32, 1, true, -0.95, 1.9), apronM, V(0, 0.68, 0.0)); apron.scale.set(1.09, 1, 0.9);
  const tieM = std(0xe9e1cf, 0.8); add(body, new THREE.TorusGeometry(0.182, 0.008, 6, 40), tieM, V(0, 0.98, 0), [1.1, 1, 0.88]).rotation.x = Math.PI / 2;
  // scialle di lana sulle spalle, aperto davanti
  const shawl = add(upper, new THREE.LatheGeometry([[0.07, 0.37], [0.16, 0.335], [0.218, 0.285], [0.238, 0.22], [0.242, 0.15], [0.238, 0.11]].map(([r, y]) => new THREE.Vector2(r, y)), 40, 0.55, Math.PI * 2 - 1.1), woolM, V(0, 0, 0));
  shawl.scale.set(1.12, 1, 0.94);
  // collo e testa (perno al collo)
  add(upper, new THREE.CylinderGeometry(0.05, 0.06, 0.07, 20), skin, V(0, 0.375, 0.01));
  const lace = std(0xf4efe4, 0.85);
  const collar = add(upper, new THREE.TorusGeometry(0.062, 0.016, 10, 36), lace, V(0, 0.352, 0.012)); collar.rotation.x = Math.PI / 2 + 0.12; collar.scale.set(1.15, 1, 0.9);
  for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3; add(upper, new THREE.SphereGeometry(0.011, 10, 8), lace, V(Math.sin(a) * 0.078, 0.345 - Math.abs(Math.cos(a)) * 0.004, Math.cos(a) * 0.066 + 0.012)); }
  const head = new THREE.Group(); head.position.set(0, 0.405, 0.025); head.scale.setScalar(1.15); upper.add(head);
  const face = add(head, sph(1, 64), skin, V(0, 0.1, 0), [0.102, 0.122, 0.11]);
  const blush = std(0xf2b3a0, 0.55, { emissive: 0x3a0f08, emissiveIntensity: 0.12 });
  const cheeks = [-1, 1].map((sd) => add(head, sph(0.028), blush, V(sd * 0.05, 0.076, 0.064), [1, 0.85, 0.75]));     // guance rosee
  const chin = add(head, sph(0.024), skin, V(0, 0.006, 0.06), [1.2, 0.7, 0.75]);
  add(head, sph(0.019), skin, V(0, 0.094, 0.116), [0.95, 1.1, 1.0]);                   // naso
  limb(head, V(0, 0.125, 0.107), V(0, 0.1, 0.116), 0.012, skin);
  for (const s of [-1, 1]) add(head, sph(0.03), skin, V(s * 0.1, 0.1, -0.004), [0.35, 0.95, 0.6]);   // orecchie
  // occhi: bulbo bianco, iride grigio-azzurra, pupilla, riflesso; palpebre superiori che si chiudono
  const eyes = [], lids = [], brows = [], lows = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.037, 0.128, 0.088); head.add(e);
    add(e, sph(0.0205), std(0xf7f3ec, 0.25));
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.0112, 32), std(0x7d93a0, 0.35)); iris.position.z = 0.0203; e.add(iris);
    const pup = new THREE.Mesh(new THREE.CircleGeometry(0.0056, 24), new THREE.MeshBasicMaterial({ color: 0x0a0a0a })); pup.position.z = 0.0205; e.add(pup);
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.0026, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); hl.position.set(0.004, 0.004, 0.0207); e.add(hl);
    eyes.push(e);
    const lid = new THREE.Group(); lid.position.copy(e.position); head.add(lid);
    add(lid, new THREE.SphereGeometry(0.0222, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), skin);
    const lidLine = add(lid, new THREE.TorusGeometry(0.0222, 0.0018, 6, 32, Math.PI), std(0x8a5a4a, 0.6)); lidLine.rotation.x = Math.PI / 2;
    lids.push(lid);
    const low = new THREE.Group(); low.position.copy(e.position); head.add(low);
    add(low, new THREE.SphereGeometry(0.0218, 32, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), skin);
    lows.push(low);
    add(head, new THREE.TorusGeometry(0.02, 0.0028, 6, 24, Math.PI * 0.8), skinDk, V(s * 0.037, 0.112, 0.1)).rotation.z = Math.PI * 1.1;   // borse sotto gli occhi
    const b = new THREE.Group(); b.position.set(s * 0.04, 0.163, 0.1); head.add(b);
    const bm = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.03, 6, 12), std(0xe6e3de, 0.8)); bm.rotation.z = Math.PI / 2 + s * 0.12; b.add(bm);
    brows.push(b);
  }
  // bocca: labbra in tre pezzi (gli angoli si alzano nel sorriso), interno scuro, denti piccoli; si apre col mento
  const mouth = new THREE.Group(); mouth.position.set(0, 0.052, 0.106); head.add(mouth);
  const inner = add(mouth, new THREE.CircleGeometry(0.0155, 32), new THREE.MeshBasicMaterial({ color: 0x2a0c0e }), V(0, -0.004, -0.002));
  const teeth = add(mouth, new THREE.BoxGeometry(0.016, 0.0045, 0.003), std(0xf2eee4, 0.35), V(0, 0.0015, -0.001));
  const lip = (y, r) => {
    const g = new THREE.Group(); g.position.y = y; mouth.add(g);
    const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, 0.012, 6, 12), lipM); c.rotation.z = Math.PI / 2; c.scale.z = 0.7; g.add(c);
    const sides = [-1, 1].map((sd) => {
      const pv = new THREE.Group(); pv.position.x = sd * 0.006; g.add(pv);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.85, 0.011, 6, 12), lipM); m.rotation.z = Math.PI / 2; m.position.x = sd * 0.0065; m.scale.z = 0.7; pv.add(m);
      const corner = new THREE.Mesh(sph(0.0032, 10), lipM); corner.position.x = sd * 0.0135; pv.add(corner);
      return pv;
    });
    return { g, sides };
  };
  const upL = lip(0.004, 0.0036), loL = lip(-0.006, 0.0043);
  [inner, teeth, upL.g, loL.g].forEach((m) => { m.visible = false; });
  const mtex = G.canvasTexture(256, 128);
  const decal = new THREE.Mesh(new THREE.SphereGeometry(1.006, 48, 24, Math.PI / 2 - 0.5, 1.0, 1.66, 0.52),
    new THREE.MeshStandardMaterial({ map: mtex, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  decal.scale.set(0.102, 0.122, 0.11); decal.position.set(0, 0.1, 0); decal.renderOrder = 2; head.add(decal);
  const drawMouth = (op, sm) => mtex.draw((c, w, h) => {
    const cx = w / 2, cy = h * 0.4, half = 44 + 8 * sm, lift = 16 * sm, open = 32 * op;
    // interno scuro e denti quando parla
    if (op > 0.04) {
      c.fillStyle = '#2a0c0e'; c.beginPath();
      c.moveTo(cx - half * 0.86, cy - lift * 0.8);
      c.quadraticCurveTo(cx, cy - 4 + lift * 0.2, cx + half * 0.86, cy - lift * 0.8);
      c.quadraticCurveTo(cx, cy + open * 1.4 + lift * 0.6, cx - half * 0.86, cy - lift * 0.8); c.fill();
      if (op > 0.3) { c.fillStyle = '#f1ece2'; c.fillRect(cx - 14, cy - 3, 28, 6 + op * 2); }
    }
    // labbra: superiore sottile, inferiore più piena, angoli che salgono col sorriso
    c.strokeStyle = '#b4605c'; c.lineCap = 'round';
    c.lineWidth = 9; c.beginPath(); c.moveTo(cx - half, cy - lift); c.quadraticCurveTo(cx, cy - 7 + lift * 0.25, cx + half, cy - lift); c.stroke();
    c.lineWidth = 12; c.beginPath(); c.moveTo(cx - half * 0.86, cy - lift * 0.8 + 2); c.quadraticCurveTo(cx, cy + 9 + open * 1.5 + lift * 0.7, cx + half * 0.86, cy - lift * 0.8 + 2); c.stroke();
    c.strokeStyle = 'rgba(120,60,55,0.5)'; c.lineWidth = 2.5;       // pieghe agli angoli nel sorriso
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(cx + sd * (half + 3), cy - lift - 4); c.quadraticCurveTo(cx + sd * (half + 9), cy - lift + 4, cx + sd * (half + 6), cy - lift + 12); c.stroke(); }
  });
  // rughe gentili ai lati della bocca
  for (const s of [-1, 1]) add(head, new THREE.TorusGeometry(0.03, 0.0009, 6, 20, 0.9), skinDk, V(s * 0.012, 0.06, 0.107)).rotation.set(0, 0, s > 0 ? -0.55 : Math.PI - 0.55);
  // capelli bianchi raccolti, crocchia, forcina
  const hair = add(head, new THREE.SphereGeometry(1, 48, 32, 0, Math.PI * 2, 0, 1.75), hairM, V(0, 0.118, -0.008), [0.108, 0.13, 0.118]);
  hair.rotation.x = -0.62;
  add(head, sph(0.05), hairM, V(0, 0.2, -0.095), [1.15, 0.85, 0.95]);
  add(head, new THREE.TorusGeometry(0.035, 0.009, 8, 24), hairM, V(0, 0.2, -0.1)).rotation.x = 0.9;
  limb(head, V(-0.04, 0.23, -0.1), V(0.04, 0.215, -0.09), 0.0025, goldM);
  // occhiali tondi
  for (const s of [-1, 1]) {
    add(head, new THREE.TorusGeometry(0.027, 0.0022, 8, 40), goldM, V(s * 0.038, 0.128, 0.122));
    const lens = add(head, new THREE.CircleGeometry(0.026, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, roughness: 0.1, metalness: 0, clearcoat: 0.3, envMapIntensity: 0.4 }), V(s * 0.038, 0.128, 0.123));
    lens.material.envMap = G.ENV;
    limb(head, V(s * 0.065, 0.13, 0.118), V(s * 0.1, 0.135, 0.02), 0.0016, goldM);
  }
  limb(head, V(-0.011, 0.131, 0.124), V(0.011, 0.131, 0.124), 0.0018, goldM);
  // braccia: destra fa cenno di entrare, sinistra stringe lo scialle sul petto
  const hand = (p, side) => {
    const h = new THREE.Group(); p.add(h);
    add(h, sph(0.032, 20), skin, V(0, -0.03, 0), [0.85, 1.15, 0.5]);
    const fingers = [];
    for (let f = 0; f < 4; f++) {
      const fg = new THREE.Group(); fg.position.set((f - 1.5) * 0.0145, -0.062, 0); h.add(fg);
      const len = [0.03, 0.036, 0.034, 0.026][f];
      limb(fg, V(0, 0, 0), V(0, -len, 0), 0.0068, skin);
      fingers.push(fg);
    }
    const th = new THREE.Group(); th.position.set(side * -0.026, -0.03, 0.01); h.add(th); limb(th, V(0, 0, 0), V(side * -0.012, -0.03, 0.012), 0.0075, skin);
    return { h, fingers, th };
  };
  const armR = new THREE.Group(); armR.position.set(0.2, 0.25, 0); upper.add(armR);
  limb(armR, V(0, 0, 0), V(0, -0.27, 0), 0.05, dressM);
  const foreR = new THREE.Group(); foreR.position.set(0, -0.27, 0); armR.add(foreR);
  limb(foreR, V(0, 0, 0), V(0, -0.23, 0), 0.042, dressM);
  const wristR = new THREE.Group(); wristR.position.set(0, -0.24, 0); foreR.add(wristR);
  const HR = hand(wristR, 1);
  const armL = new THREE.Group(); armL.position.set(-0.2, 0.25, 0); upper.add(armL);
  limb(armL, V(0, 0, 0), V(0, -0.26, 0), 0.05, dressM);
  const foreL = new THREE.Group(); foreL.position.set(0, -0.26, 0); armL.add(foreL);
  limb(foreL, V(0, 0, 0), V(0, -0.22, 0), 0.042, dressM);
  const wristL = new THREE.Group(); wristL.position.set(0, -0.23, 0); foreL.add(wristL);
  const HL = hand(wristL, -1);
  // gambe con le calze e pantofole
  for (const s of [-1, 1]) {
    limb(body, V(s * 0.08, 0.06, 0.01), V(s * 0.08, 0.3, 0), 0.046, stockM);
    add(body, new THREE.CapsuleGeometry(0.045, 0.1, 6, 16), slipM, V(s * 0.085, 0.04, 0.05), [1, 0.62, 1]).rotation.x = Math.PI / 2;
    add(body, sph(0.018, 12), std(0x9a3a40, 0.9), V(s * 0.085, 0.07, 0.115));
  }

  // ---------------------------------------------------------------- pose: tutto dai parametri
  function pose(p = {}) {
    const br = p.breathe ?? 0;
    upper.rotation.x = 0.16 + (p.lean || 0);                                   // un po' curva
    upper.scale.set(1 + 0.012 * br, 1 + 0.008 * br, 1 + 0.015 * br);
    head.rotation.set(-0.1 + (p.headPitch || 0), p.headYaw || 0, p.headRoll || 0);
    const gx = p.gazeX || 0, gy = p.gazeY || 0;
    eyes.forEach((e) => { e.rotation.set(-gy * 0.5, gx * 0.6, 0); });
    const bl = M.clamp(p.blink || 0);
    lids.forEach((l) => { l.rotation.x = M.lerp(-1.35, 0.05, bl) - gy * 0.25; });
    brows.forEach((b, i) => { b.position.y = 0.163 + 0.008 * (p.browUp || 0); b.rotation.z = (i ? -1 : 1) * 0.15 * (p.browSad || 0); });
    const op = M.clamp(p.mouth || 0), sm = M.clamp(p.smile || 0);
    inner.scale.set(1 + 0.2 * sm, 0.1 + op * 0.9, 1); inner.position.y = -0.004 - op * 0.007;
    teeth.visible = op > 0.3;
    drawMouth(op, sm);
    upL.g.position.y = 0.004 + op * 0.001; loL.g.position.y = -0.006 - op * 0.012;
    upL.sides.forEach((pv, i) => { pv.rotation.z = (i ? 1 : -1) * (0.85 * sm - 0.1 * op); });
    loL.sides.forEach((pv, i) => { pv.rotation.z = (i ? 1 : -1) * (0.7 * sm + 0.15 * op); });
    lows.forEach((l) => { l.rotation.x = -0.45 * sm; });
    cheeks.forEach((c) => { c.position.y = 0.076 + 0.008 * sm; });
    chin.position.y = 0.006 - op * 0.012;
    // braccio destro: cenno «vieni» (palmo verso l'alto, dita che si piegano)
    const bk = p.beckon || 0, curl = p.curl || 0;
    armR.rotation.set(-0.35 - 0.65 * bk, 0, 0.18 - 0.55 * bk);
    foreR.rotation.set(-0.5 - 1.0 * bk, 0, 0);
    wristR.rotation.set(-0.3 * bk, 0.4 * bk, -1.2 * bk);
    HR.fingers.forEach((f, i) => { f.rotation.x = -(0.25 + 1.2 * curl) * (1 - i * 0.05); });
    // braccio sinistro: stringe lo scialle sul petto
    armL.rotation.set(-0.45, 0, -0.32);
    foreL.rotation.set(-1.75, 0, 0.55);
    wristL.rotation.set(0.2, 0, 0.6);
    HL.fingers.forEach((f) => { f.rotation.x = -1.1; });
    root.position.set(...(p.pos || [0, 0, 0])); root.rotation.y = p.yaw || 0;
  }
  pose({});
  return { group: root, pose, head };
}
