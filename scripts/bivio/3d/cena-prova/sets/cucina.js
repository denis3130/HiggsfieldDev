// La cucina della nonna: stufa a legna col fuoco che si muove, tavola con la tovaglia a quadri e tre piatti,
// pentola che fuma, lampada sopra il tavolo, pendolo che oscilla (e che alle dieci si ferma), finestra chiusa
// con le assi da dentro (fuori la pioggia e i lampi), mensole coi barattoli, telefono a disco.
// update(t, u, o) imposta tutto da t e da o: { cam, look, fov, roll, nonna:{...}, tu:{...}, piatto 0..1, pendolo 0..1, flash }
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { nonna2, ragazzo, tex, std, limb } from './personaggi.js';
const THREE = G.THREE;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (seed) => { const r = M.mulberry32(seed); return (a = 0, b = 1) => a + (b - a) * r(); };
const soft = () => tex(128, 128, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });

const planks = (base, n = 8, vertical = false) => tex(512, 512, (c, w, h) => {
  const r = rnd(base.length * 7 + n);
  for (let i = 0; i < n; i++) {
    const g = r(-16, 16), [R, Gc, B] = base.match(/\w\w/g).map((x) => parseInt(x, 16));
    c.fillStyle = `rgb(${R + g},${Gc + g * 0.8},${B + g * 0.6})`;
    if (vertical) c.fillRect(i * w / n + 2, 0, w / n - 4, h); else c.fillRect(0, i * h / n + 2, w, h / n - 4);
    for (let k = 0; k < 18; k++) { c.strokeStyle = `rgba(40,22,12,${r(0.06, 0.18)})`; c.lineWidth = r(1, 2.2); c.beginPath();
      if (vertical) { const x = i * w / n + r(6, w / n - 6); c.moveTo(x, 0); c.bezierCurveTo(x + r(-5, 5), h / 3, x + r(-5, 5), 2 * h / 3, x, h); }
      else { const y = i * h / n + r(6, h / n - 6); c.moveTo(0, y); c.bezierCurveTo(w / 3, y + r(-5, 5), 2 * w / 3, y + r(-5, 5), w, y); }
      c.stroke(); }
  }
});

export function cucinaSet() {
  const r = rnd(77);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1a0f0a, 6, 14);
  const cam = G.camera(38, 0.03, 60); scene.add(cam);
  const box = (w, h, d, mat, pos, parent = scene) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.copy(pos); parent.add(m); return m; };
  const cyl = (rt, rb, h, mat, pos, seg = 24, parent = scene) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.copy(pos); parent.add(m); return m; };

  // stanza: pavimento di legno, zoccolo di legno, muro a calce caldo, travi
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.6), std(0xffffff, 0.7, { map: (() => { const t = planks('7a4a2c', 10); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t; })() }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -0.1); scene.add(floor);
  const plaster = std(0xffffff, 0.92, { map: tex(512, 512, (c, w, h) => { c.fillStyle = '#c99a6c'; c.fillRect(0, 0, w, h); const q = rnd(3); for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(${q() < 0.5 ? '255,235,210' : '120,80,50'},${q(0.03, 0.08)})`; c.beginPath(); c.arc(q() * w, q() * h, q(4, 30), 0, 7); c.fill(); } }) });
  const wain = std(0xffffff, 0.75, { map: planks('5c3a22', 12, true) });
  for (const [w, pos, rot] of [[4.4, V(0, 1.3, -2.4), 0], [4.6, V(-2.2, 1.3, -0.1), Math.PI / 2], [4.6, V(2.2, 1.3, -0.1), -Math.PI / 2]]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.6), plaster); wall.position.copy(pos); wall.rotation.y = rot; scene.add(wall);
    const low = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.0), wain); low.position.copy(pos).setY(0.5); low.rotation.y = rot;
    low.position.add(V(Math.sin(rot) * 0.01, 0, Math.cos(rot) * 0.01)); scene.add(low);
  }
  const beamM = std(0x3e2616, 0.8);
  for (let i = 0; i < 5; i++) box(4.4, 0.16, 0.18, beamM, V(0, 2.55, -2.2 + i * 1.0));
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.6), std(0x4a2f1d, 0.9)); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 2.62, -0.1); scene.add(ceil);

  // stufa a legna con il fuoco
  const iron = std(0x1c1c1e, 0.5, { metalness: 0.4 });
  const stove = new THREE.Group(); stove.position.set(-1.55, 0, -1.75); scene.add(stove);
  box(0.62, 0.62, 0.5, iron, V(0, 0.41, 0), stove); box(0.68, 0.04, 0.56, iron, V(0, 0.74, 0), stove);
  for (const s of [-1, 1]) for (const z of [-1, 1]) cyl(0.025, 0.02, 0.12, iron, V(s * 0.26, 0.05, z * 0.2), 10, stove);
  cyl(0.06, 0.06, 1.9, iron, V(0.15, 1.7, -0.1), 16, stove);
  const kettle = cyl(0.09, 0.12, 0.14, std(0x2f4f5a, 0.4, { metalness: 0.3 }), V(-0.12, 0.83, 0.05), 20, stove);
  const winF = box(0.3, 0.22, 0.01, new THREE.MeshBasicMaterial({ color: 0x2a0c02 }), V(0, 0.42, 0.252), stove);
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.035 + r(0, 0.02), 0.16, 10), new THREE.MeshBasicMaterial({ color: [0xffb43a, 0xff7a1a, 0xffd36b][i % 3], transparent: true, opacity: 0.9 }));
    f.position.set(-0.1 + i * 0.05, 0.38, 0.248); f.userData.ph = r(0, 6); stove.add(f); flames.push(f);
  }
  const fire = new THREE.PointLight(0xff7a2a, 3, 5, 1.6); fire.position.set(-1.55, 0.5, -1.35); scene.add(fire);
  const fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: 0xff8a3a, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })); fireGlow.position.set(-1.55, 0.42, -1.45); fireGlow.scale.set(0.8, 0.6, 1); scene.add(fireGlow);

  // tavola: tovaglia a quadri rossi e bianchi, tre piatti, pentola che fuma, pane, lampada sopra
  const wood = std(0xffffff, 0.6, { map: planks('6b4128', 6, true) });
  const table = new THREE.Group(); table.position.set(0, 0, -0.55); scene.add(table);
  for (const s of [-1, 1]) for (const z of [-1, 1]) box(0.06, 0.74, 0.06, wood, V(s * 0.65, 0.37, z * 0.35), table);
  const cloth = std(0xffffff, 0.85, { map: tex(256, 256, (c, w, h) => { c.fillStyle = '#f3ece0'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(176,32,40,0.75)'; for (let i = 0; i < 8; i++) { c.fillRect(i * 32, 0, 16, h); c.fillRect(0, i * 32, w, 16); } }, [4, 2.5]), side: THREE.DoubleSide });
  box(1.5, 0.03, 0.9, cloth, V(0, 0.76, 0), table);
  for (const [w, d, pos] of [[1.5, 0.01, V(0, 0.64, 0.45)], [1.5, 0.01, V(0, 0.64, -0.45)]]) box(w, 0.24, d, cloth, pos, table);
  for (const s of [-1, 1]) { const sideC = box(0.01, 0.24, 0.9, cloth, V(s * 0.75, 0.64, 0), table); }
  const plateM = std(0xf7f4ee, 0.25), rimM = std(0x3f66a8, 0.35);
  const plateAt = (pos) => { const g = new THREE.Group(); g.position.copy(pos); table.add(g); cyl(0.12, 0.09, 0.018, plateM, V(0, 0.009, 0), 32, g); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.006, 8, 40), rimM); rim.rotation.x = Math.PI / 2; rim.position.y = 0.018; g.add(rim); return g; };
  const seats = [V(-0.5, 0.775, 0.05), V(0.5, 0.775, 0.05), V(0.0, 0.775, -0.28)];
  const plates = seats.map((p) => plateAt(p));
  stove.remove(kettle);
  const pot = cyl(0.15, 0.13, 0.2, std(0x7a3b2a, 0.35, { metalness: 0.2 }), V(-0.05, 0.86, 0.02), 28, stove);
  const steam = [];
  for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: 0xf4efe6, transparent: true, opacity: 0, depthWrite: false })); scene.add(s); steam.push(s); }
  const bread = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), std(0xc98a4a, 0.7)); bread.scale.set(1.5, 0.6, 0.9); bread.position.set(0.32, 0.81, 0.22); table.add(bread);
  for (const p of seats) { const sp = box(0.012, 0.004, 0.14, std(0xbfc3c8, 0.25, { metalness: 0.8 }), V(p.x + 0.16, 0.782, p.z), table); }
  // sedie
  const chairAt = (x, z, rotY) => { const ch = new THREE.Group(); ch.position.set(x, 0, z); ch.rotation.y = rotY; table.add(ch);
    box(0.42, 0.04, 0.42, wood, V(0, 0.46, 0), ch); for (const s of [-1, 1]) for (const zz of [-1, 1]) box(0.04, 0.46, 0.04, wood, V(s * 0.18, 0.23, zz * 0.18), ch);
    for (const s of [-1, 1]) box(0.04, 0.5, 0.04, wood, V(s * 0.18, 0.72, -0.19), ch); box(0.42, 0.12, 0.03, wood, V(0, 0.9, -0.19), ch); return ch; };
  chairAt(-0.95, 0.05, Math.PI / 2); chairAt(0, -0.75, 0); chairAt(0.95, 0.05, -Math.PI / 2);
  // lampada sopra il tavolo
  const lampG = new THREE.Group(); lampG.position.set(0, 2.0, -0.55); scene.add(lampG);
  limb(lampG, V(0, 0.6, 0), V(0, 0.12, 0), 0.006, std(0x222222, 0.6));
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 32, 1, true), std(0x2d4a3a, 0.5, { side: THREE.DoubleSide })); shade.position.y = 0.05; lampG.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe2b0 })); bulb.position.y = -0.01; lampG.add(bulb);
  const lampL = new THREE.PointLight(0xffc488, 3.6, 6, 1.4); lampL.position.set(0, 1.93, -0.55); scene.add(lampL);
  scene.add(new THREE.HemisphereLight(0xffd7b0, 0x2a1810, 0.55));
  const fillL = new THREE.DirectionalLight(0xffcfa0, 0.55); fillL.position.set(-1.5, 2.0, 3); scene.add(fillL);

  // pendolo
  const clock = new THREE.Group(); clock.position.set(1.25, 1.25, -2.33); scene.add(clock);
  box(0.36, 1.3, 0.16, std(0xffffff, 0.55, { map: planks('5a3520', 3, true) }), V(0, 0.35, 0), clock);
  const faceT = tex(256, 256, (c, w, h) => { c.fillStyle = '#efe6d0'; c.beginPath(); c.arc(128, 128, 120, 0, 7); c.fill(); c.strokeStyle = '#3a2a1a'; c.lineWidth = 6; c.stroke(); c.fillStyle = '#2a1d12'; c.font = '700 30px Display'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; c.fillText(String(i), 128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); } });
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.14, 40), std(0xffffff, 0.5, { map: faceT })); face.position.set(0, 0.85, 0.085); clock.add(face);
  const handM = new THREE.MeshBasicMaterial({ color: 0x1a1410 });
  const hourH = new THREE.Group(); hourH.position.set(0, 0.85, 0.09); clock.add(hourH); box(0.012, 0.07, 0.004, handM, V(0, 0.03, 0), hourH);
  const minH = new THREE.Group(); minH.position.set(0, 0.85, 0.092); clock.add(minH); box(0.008, 0.11, 0.004, handM, V(0, 0.05, 0), minH);
  const glassP = box(0.22, 0.6, 0.005, std(0x2a1c12, 0.3), V(0, 0.15, 0.081), clock);
  const pend = new THREE.Group(); pend.position.set(0, 0.62, 0.09); clock.add(pend);
  limb(pend, V(0, 0, 0), V(0, -0.42, 0), 0.006, std(0xb8964e, 0.35, { metalness: 0.7 }));
  const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 28), std(0xc9a457, 0.3, { metalness: 0.8 })); bob.rotation.x = Math.PI / 2; bob.position.y = -0.44; pend.add(bob);

  // finestra chiusa con le assi da dentro: fuori pioggia e lampi
  const win = new THREE.Group(); win.position.set(-0.35, 1.45, -2.38); scene.add(win);
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.0), new THREE.MeshBasicMaterial({ color: 0x0e1726 })); win.add(outside);
  box(1.0, 0.07, 0.08, wood, V(0, 0.53, 0.02), win); box(1.0, 0.07, 0.08, wood, V(0, -0.53, 0.02), win);
  for (const s of [-1, 1]) box(0.07, 1.13, 0.08, wood, V(s * 0.5, 0, 0.02), win);
  const plankM = std(0xffffff, 0.8, { map: planks('7a5233', 1) });
  [[0.32, -0.06], [0.08, 0.07], [-0.16, -0.04], [-0.38, 0.05]].forEach(([y, rot]) => { const b = box(1.08, 0.16, 0.035, plankM, V(0, y, 0.07), win); b.rotation.z = rot; });
  for (let i = 0; i < 8; i++) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), std(0x333333, 0.4, { metalness: 0.7 })); n.position.set(i % 2 ? 0.46 : -0.46, [0.32, 0.08, -0.16, -0.38][i >> 1] + 0.02, 0.09); win.add(n); }

  // mensole coi barattoli e il telefono a disco sul tavolino
  const shelfW = std(0x5b3923, 0.7);
  for (const y of [1.25, 1.65]) box(0.9, 0.04, 0.24, shelfW, V(2.08, y, -1.4), scene).rotation.y = -Math.PI / 2;
  for (let i = 0; i < 9; i++) { const y = i < 5 ? 1.33 : 1.73, z = -1.75 + (i % 5) * 0.17; const j = cyl(0.045, 0.045, r(0.1, 0.16), std([0xb5523a, 0x8aa05a, 0xd9b45a, 0x6a85a8][i % 4], 0.3, { transparent: true, opacity: 0.85 }), V(2.05, y, z), 16); }
  const phoneT = new THREE.Group(); phoneT.position.set(1.85, 0, 0.7); scene.add(phoneT);
  box(0.4, 0.04, 0.35, wood, V(0, 0.75, 0), phoneT); for (const s of [-1, 1]) for (const z of [-1, 1]) box(0.03, 0.73, 0.03, wood, V(s * 0.17, 0.37, z * 0.14), phoneT);
  const phone = new THREE.Group(); phone.position.set(0, 0.77, 0); phoneT.add(phone);
  const bake = std(0x7a1f1f, 0.35);
  box(0.2, 0.08, 0.16, bake, V(0, 0.04, 0), phone);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.01, 28), std(0xe8e0cc, 0.4)); dial.rotation.x = Math.PI / 2 - 0.5; dial.position.set(0, 0.07, 0.06); phone.add(dial);
  const handset = new THREE.Group(); handset.position.set(0, 0.1, 0); phone.add(handset);
  limb(handset, V(-0.09, 0, 0), V(0.09, 0, 0), 0.018, bake);
  for (const s of [-1, 1]) cyl(0.03, 0.025, 0.03, bake, V(s * 0.095, -0.012, 0), 16, handset);

  // personaggi
  const N = nonna2(), T = ragazzo(); scene.add(N.group, T.group);
  // il piatto che la nonna porta (segue la sua mano destra)
  const carried = plateAt(V(0, 0, 0)); scene.attach(carried);
  const tmp = V(0, 0, 0);

  return {
    scene, camera: cam, bloom: 0.22, bloomThreshold: 0.9, bloomRadius: 0.5, N, T, phoneHandset: handset, clockHands: { hourH, minH }, seats, table,
    update(t, u, o = {}) {
      G.lookFrom(cam, o.cam || [0.6, 1.5, 2.6], o.look || [0, 1.0, -0.6], o.roll || 0);
      cam.fov = o.fov || 38; cam.updateProjectionMatrix();
      // fuoco e luci che tremano
      flames.forEach((f, i) => { const k = 0.75 + 0.35 * Math.sin(t * (9 + i) + f.userData.ph) * Math.sin(t * 5.3 + i); f.scale.set(1, k, 1); f.position.y = 0.36 + 0.04 * k; });
      fire.intensity = 2.6 + 0.8 * Math.sin(t * 11) * Math.sin(t * 6.7 + 1);
      fireGlow.material.opacity = 0.4 + 0.15 * Math.sin(t * 9);
      lampL.intensity = 3.6 * (0.97 + 0.03 * Math.sin(t * 17));
      // pendolo (si ferma con o.pendolo = 0) e lancette
      const pa = o.pendolo ?? 1;
      pend.rotation.z = 0.22 * pa * Math.sin(t * Math.PI);
      hourH.rotation.z = -(o.ore ?? 9.75) / 12 * Math.PI * 2; minH.rotation.z = -((o.ore ?? 9.75) % 1) * Math.PI * 2;
      // vapore dalla pentola
      steam.forEach((s, i) => { const age = ((t * 0.5 + i / steam.length) % 1); s.position.set(-1.6 + Math.sin(i * 2.1 + t) * 0.05, 1.0 + age * 0.6, -1.73 + Math.cos(i * 1.3) * 0.04); s.scale.setScalar(0.08 + age * 0.22); s.material.opacity = 0.35 * Math.sin(age * Math.PI); });
      // lampi visti dalle fessure delle assi
      outside.material.color.setRGB(0.055 + 0.8 * (o.flash || 0), 0.09 + 0.8 * (o.flash || 0), 0.15 + 0.85 * (o.flash || 0));
      // personaggi
      N.pose(o.nonna || { pos: [1.0, 0, -0.2], yaw: -Math.PI / 2 });
      T.pose(o.tu || { pos: [-0.95, 0, -0.5], yaw: Math.PI / 2, sit: 1 });
      // il terzo piatto: in mano alla nonna, poi sul tavolo
      const k = M.clamp(o.piatto ?? 1);
      N.group.updateMatrixWorld(true);
      N.arms.R.hand.getWorldPosition(tmp);
      const home = table.localToWorld(seats[2].clone());
      plates[2].visible = k >= 1; carried.visible = k < 1;
      carried.position.set(M.lerp(tmp.x, home.x, M.E.inOutCubic(k)), M.lerp(tmp.y - 0.02, home.y, M.E.inOutCubic(k)), M.lerp(tmp.z, home.z, M.E.inOutCubic(k)));
    },
  };
}
