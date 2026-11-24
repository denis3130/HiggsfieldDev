// Il bosco di Valsorda di notte, costruito col codice: faggi dai tronchi lisci, chiome scure, erba bagnata
// che ondeggia, nebbia bassa, luna fredda, pulviscolo, il protagonista sdraiato col cappuccio,
// il tronco con la bocca che soffia vapore e il volantino di Marco scomparso.
// update(t, u, o) imposta TUTTO da t e dalle opzioni o (camera, eventi): nessuno stato tra un fotogramma e l'altro.
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
const THREE = G.THREE;

const rnd = (seed) => { const r = M.mulberry32(seed); return (a = 0, b = 1) => a + (b - a) * r(); };
const C = {
  fog: 0x1c3a44, skyTop: '#07111c', skyLow: '#24505c', moon: 0xf6f3de,
  trunk: 0x646b73, trunkDark: 0x3a4047, leaf: 0x183628, leaf2: 0x11291e, ground: 0x24362a,
  grassA: 0x2b4a2b, grassB: 0x6a9a57, jacket: 0x262b33, hoodIn: 0x020203, jeans: 0x22324a,
  boot: 0x7a4e2a, skin: 0xe2a882, bandage: 0xf2f0e8, paint: 0xc0182a, moonLight: 0xbfd8ea,
};

// ---------------------------------------------------------------- textures disegnate col codice
function texCanvas(w, h, fn, repeat = null) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  fn(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const soft = () => texCanvas(128, 128, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
function cloudTex(seed) {
  const r = rnd(seed);
  return texCanvas(512, 256, (c, w, h) => {
    for (let i = 0; i < 60; i++) {
      const x = r(0.1, 0.9) * w, y = r(0.3, 0.7) * h, rad = r(30, 90);
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    }
  });
}
const barkTex = () => texCanvas(256, 512, (c, w, h) => {
  const r = rnd(7);
  c.fillStyle = '#8a8f96'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {                    // macchie chiare e scure del faggio, lisce
    c.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r(0.04, 0.12)})`;
    c.beginPath(); c.ellipse(r() * w, r() * h, r(6, 30), r(10, 60), 0, 0, 7); c.fill();
  }
  for (let i = 0; i < 26; i++) {                    // qualche segno orizzontale
    c.strokeStyle = `rgba(0,0,0,${r(0.08, 0.2)})`; c.lineWidth = r(1, 2.5);
    const y = r() * h; c.beginPath(); c.moveTo(r() * w, y); c.lineTo(r() * w, y + r(-3, 3)); c.stroke();
  }
}, [1, 2]);
const groundTex = () => texCanvas(512, 512, (c, w, h) => {
  const r = rnd(11);
  c.fillStyle = '#7d8a73'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) {                   // foglie e terra
    c.fillStyle = `rgba(${r() < 0.6 ? '40,30,20' : '120,140,90'},${r(0.08, 0.25)})`;
    c.beginPath(); c.ellipse(r() * w, r() * h, r(3, 14), r(2, 7), r() * 3, 0, 7); c.fill();
  }
}, [14, 14]);

// manifesto «SCOMPARSO»: carta rovinata, foto sbiadita (Marco non si vede mai), data di un anno fa
function posterTex() {
  return texCanvas(600, 840, (c, w, h) => {
    const r = rnd(21);
    c.fillStyle = '#e8e0cc'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {                  // macchie di pioggia e muffa
      const x = r() * w, y = r() * h, rad = r(20, 110);
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(110,90,50,${r(0.05, 0.16)})`); g.addColorStop(1, 'rgba(110,90,50,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    }
    c.fillStyle = '#1b1612'; c.textAlign = 'center';
    c.font = '900 98px Display'; c.fillText('SCOMPARSO', w / 2, 135);
    // foto rovinata dall'acqua: si intuisce una figura, il viso no
    const fx = 110, fy = 190, fw = 380, fh = 380;
    c.fillStyle = '#5e5a52'; c.fillRect(fx, fy, fw, fh);
    const g = c.createLinearGradient(0, fy, 0, fy + fh); g.addColorStop(0, '#7b776c'); g.addColorStop(1, '#3f3c37');
    c.fillStyle = g; c.fillRect(fx, fy, fw, fh);
    c.fillStyle = 'rgba(30,28,25,0.55)'; c.beginPath(); c.ellipse(fx + fw / 2, fy + fh * 0.42, 70, 86, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(fx + fw / 2, fy + fh * 0.98, 150, 120, 0, Math.PI, 0); c.fill();
    for (let i = 0; i < 7; i++) {                   // colature
      const x = fx + r() * fw, y = fy + r(0, 0.3) * fh, gl = c.createLinearGradient(0, y, 0, y + 260);
      gl.addColorStop(0, 'rgba(232,224,204,0.35)'); gl.addColorStop(1, 'rgba(232,224,204,0)');
      c.fillStyle = gl; c.fillRect(x, y, r(3, 9), 260);
    }
    c.fillStyle = '#1b1612';
    c.font = '700 64px Display'; c.fillText('MARCO', w / 2, 650);
    c.font = '400 34px UI'; c.fillText('27 anni · visto l’ultima volta', w / 2, 705);
    c.fillText('nel bosco di Valsorda', w / 2, 745);
    c.font = '700 40px Display'; c.fillText('22 novembre 2025', w / 2, 800);
  });
}

// ---------------------------------------------------------------- erba: istanze con oscillazione nello shader
function grass(scene, uniforms, r) {
  const geo = new THREE.PlaneGeometry(0.07, 0.55, 1, 4); geo.translate(0, 0.275, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.55; p.setX(i, p.getX(i) * (1 - y * 0.9)); }
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0, side: THREE.DoubleSide, vertexColors: false });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime; sh.uniforms.uWind = uniforms.uWind;
    sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float h = clamp(position.y / 0.55, 0.0, 1.0);
      float sway = sin(uTime * 1.7 + wp.x * 0.55 + wp.z * 0.37) + 0.5 * sin(uTime * 3.1 + wp.x * 1.3);
      transformed.x += sway * 0.07 * uWind * h * h;
      transformed.z += cos(uTime * 1.3 + wp.z * 0.6) * 0.04 * uWind * h * h;
    `) + '\n';
  };
  const N = 11000;
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), e = new THREE.Euler();
  const col = new THREE.Color(), a = new THREE.Color(C.grassA), b = new THREE.Color(C.grassB);
  let k = 0;
  while (k < N) {
    const rad = Math.sqrt(r()) * 13, ang = r(0, Math.PI * 2);
    const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
    if (Math.abs(z) < 0.6 && x > -1.25 && x < 1.3) continue;    // dove è sdraiato lui l'erba è schiacciata
    e.set(r(-0.25, 0.25), r(0, Math.PI * 2), r(-0.25, 0.25)); q.setFromEuler(e);
    const hh = r(0.6, 1.5) * (rad < 1.6 ? 0.75 : 1);
    s.set(1, hh, 1); v.set(x, 0, z);
    m.compose(v, q, s); mesh.setMatrixAt(k, m);
    col.copy(a).lerp(b, r(0.1, 0.9)); mesh.setColorAt(k, col);
    k++;
  }
  scene.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------- il protagonista (sdraiato sulla schiena, testa verso +x)
// Forme morbide come un cartone 3D: busto e bacino ellissoidali, braccia e gambe a due segmenti con gomiti e ginocchia,
// cappuccio vero (guscio + bordo, dentro il buio: il volto non si vede mai), jeans arrotolato sulla gamba fasciata.
function hero() {
  const g = new THREE.Group();
  const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
  const jacket = std(C.jacket, 0.68), jacketDk = std(0x15181d, 0.45), jeans = std(C.jeans, 0.8), boot = std(C.boot, 0.55),
    sole = std(0x2a1d12, 0.8), skin = std(C.skin, 0.6), paint = std(C.paint, 0.5), gauze = std(C.bandage, 0.85);
  const V = (x, y, z) => new THREE.Vector3(x, y, z), UP = V(0, 1, 0);
  const blob = (r, [sx, sy, sz], pos, mat, seg = 32) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), mat); m.scale.set(sx, sy, sz); m.position.copy(pos); g.add(m); return m; };
  // segmento tra due punti (capsula orientata), per braccia e gambe
  const limb = (a, b, r, mat, parent = g) => {
    const d = b.clone().sub(a), len = d.length();
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 8, 18), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); parent.add(m); return m;
  };
  // busto con la giacca, spalle, bacino coi jeans
  const chest = new THREE.Group(); g.add(chest);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), jacket); torso.scale.set(0.37, 0.17, 0.27); torso.position.set(0.22, 0.21, 0); chest.add(torso);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 22), jacket); belly.scale.set(0.24, 0.15, 0.24); belly.position.set(-0.05, 0.19, 0); chest.add(belly);
  for (const sd of [-1, 1]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), jacket); sh.position.set(0.44, 0.19, sd * 0.25); chest.add(sh); }
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.008, 0.01), std(0x40444b, 0.5, { metalness: 0.3 })); zip.position.set(0.15, 0.375, 0); chest.add(zip);
  blob(1, [0.2, 0.14, 0.22], V(-0.27, 0.15, 0), jeans);
  // cappuccio: testa dentro, guscio più grande con la punta dietro, bordo e buio
  const head = new THREE.Group(); head.position.set(0.6, 0.22, 0); g.add(head);
  const fabric = std(C.jacket, 0.55);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.22, 40, 28), fabric); hood.scale.set(1.18, 0.92, 1.0); hood.position.set(0.18, -0.01, 0); head.add(hood);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 24), fabric); tip.rotation.z = -Math.PI / 2; tip.position.set(0.44, -0.05, 0); head.add(tip);
  // apertura ovale verso l'alto: una conca buia (la luce entra solo sul bordo), bordo di stoffa morbido e irregolare
  const cav = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x010102, side: THREE.BackSide }));
  cav.rotation.x = Math.PI; cav.scale.set(1.25, 0.9, 0.95); cav.position.set(0.2, 0.18, 0); head.add(cav);
  const rimGeo = new THREE.TorusGeometry(0.155, 0.045, 14, 48);
  { const lp = rimGeo.attributes.position; for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), y = lp.getY(i), a = Math.atan2(y, x); const k = 1 + 0.05 * Math.sin(a * 5 + 0.7); lp.setXY(i, x * k, y * k); } rimGeo.computeVertexNormals(); }
  const rim = new THREE.Mesh(rimGeo, fabric); rim.rotation.x = Math.PI / 2; rim.scale.set(1.22, 0.92, 0.9); rim.position.set(0.2, 0.175, 0); head.add(rim);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 20), jacketDk); neck.rotation.z = Math.PI / 2; neck.position.set(-0.02, -0.02, 0); head.add(neck);
  // mani con le dita e la vernice rossa sotto le unghie
  const handAt = (pos, dir, sd) => {
    const h = new THREE.Group(); h.position.copy(pos); g.add(h);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), skin); palm.scale.set(1.35, 0.55, 1.0); h.add(palm);
    for (let f = 0; f < 4; f++) {
      const z = (f - 1.5) * 0.028;
      limb(V(-0.07, 0, z), V(-0.13, -0.01, z * 1.15), 0.016, skin, h);
      const nail = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), paint); nail.position.set(-0.142, 0.0, z * 1.15); h.add(nail);
    }
    limb(V(0.0, 0, sd * 0.05), V(-0.05, 0.02, sd * 0.09), 0.018, skin, h);
    h.quaternion.setFromUnitVectors(V(-1, 0, 0), dir.clone().normalize());
    return h;
  };
  // braccio sinistro piegato con la mano sulla pancia, destro steso nell'erba
  const shL = V(0.44, 0.2, -0.27), elL = V(0.15, 0.17, -0.39), hdL = V(-0.03, 0.33, -0.13);
  limb(shL, elL, 0.085, jacket); limb(elL, hdL, 0.075, jacket);
  const handL = handAt(V(-0.07, 0.35, -0.07), V(-0.6, 0, 0.8), -1);
  const shR = V(0.44, 0.2, 0.27), elR = V(0.16, 0.12, 0.5), hdR = V(-0.1, 0.08, 0.66);
  limb(shR, elR, 0.085, jacket); limb(elR, hdR, 0.075, jacket);
  const handR = handAt(V(-0.17, 0.07, 0.7), V(-0.9, -0.05, 0.3), 1);
  // gambe: sinistra distesa (jeans arrotolato al ginocchio, polpaccio fasciato), destra col ginocchio alzato
  const hipL = V(-0.3, 0.15, -0.12), knL = V(-0.68, 0.14, -0.15), anL = V(-1.06, 0.12, -0.17);
  limb(hipL, knL, 0.115, jeans);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 10, 28), jeans); cuff.position.copy(knL); cuff.quaternion.setFromUnitVectors(V(0, 0, 1), knL.clone().sub(hipL).normalize()); g.add(cuff);
  limb(knL, anL, 0.085, skin);
  const band = limb(knL.clone().lerp(anL, 0.18), knL.clone().lerp(anL, 0.72), 0.098, gauze);
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 6, 30), std(0xcfccc0, 0.9)); r.position.copy(knL.clone().lerp(anL, 0.24 + i * 0.13)); r.quaternion.setFromUnitVectors(V(0, 0, 1), anL.clone().sub(knL).normalize()); g.add(r); }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), gauze); knot.position.copy(knL.clone().lerp(anL, 0.45)).add(V(0, 0.09, 0)); g.add(knot);
  const hipR = V(-0.3, 0.15, 0.12), knR = V(-0.6, 0.4, 0.17), anR = V(-0.92, 0.12, 0.2);
  limb(hipR, knR, 0.115, jeans); limb(knR, anR, 0.1, jeans);
  // scarponi: tomaia arrotondata, punta, suola scura, punta verso l'alto
  const bootAt = (an, sd) => {
    const b = new THREE.Group(); b.position.copy(an); g.add(b);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.1, 8, 16), boot); up.rotation.z = Math.PI / 2; up.position.set(-0.04, 0.02, 0); b.add(up);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 14), boot); toe.scale.set(0.9, 1.35, 1.05); toe.position.set(-0.11, 0.09, 0); b.add(toe);
    const so = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.27, 0.15), sole); so.position.set(-0.17, 0.08, 0); b.add(so);
    b.rotation.y = sd * 0.15; return b;
  };
  bootAt(anL, -1); bootAt(anR, 1);
  g.userData = { chest, head, handL, handR };
  return g;
}

// ---------------------------------------------------------------- il mondo
export function boscoSet() {
  const r = rnd(1977);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(C.fog, 0.022);
  const cam = G.camera(42, 0.05, 400);
  const uniforms = { uTime: { value: 0 }, uWind: { value: 1 } };

  // cielo a gradiente + luna
  const sky = new THREE.Mesh(new THREE.SphereGeometry(220, 32, 16), new THREE.MeshBasicMaterial({
    side: THREE.BackSide, fog: false, depthWrite: false,
    map: texCanvas(16, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, C.skyTop); g.addColorStop(0.55, C.skyLow); g.addColorStop(1, '#0b1a20'); c.fillStyle = g; c.fillRect(0, 0, w, h); }),
  }));
  scene.add(sky);
  const moonPos = new THREE.Vector3(6, 150, 14);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48), new THREE.MeshBasicMaterial({ color: C.moon, fog: false }));
  moon.position.copy(moonPos); moon.lookAt(0, 0, 0); scene.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: 0x9fc6d8, transparent: true, opacity: 0.55, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.copy(moonPos); halo.scale.set(70, 70, 1); scene.add(halo);

  // luci: luna fredda dall'alto, cielo/terra, una pozza di luce sulla radura
  const ml = new THREE.DirectionalLight(C.moonLight, 3.4); ml.position.set(-20, 40, -30); scene.add(ml);
  const fillL = new THREE.DirectionalLight(0x7fa3bb, 1.1); fillL.position.set(12, 14, 22); scene.add(fillL);
  scene.add(new THREE.HemisphereLight(0x86a9bf, 0x121612, 1.25));
  const pool = new THREE.SpotLight(0xc6e0ee, 16, 30, 0.45, 0.8, 1.1); pool.position.set(-2, 16, -3); pool.target.position.set(0, 0, 0);
  scene.add(pool, pool.target);

  // terreno
  const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 64), new THREE.MeshStandardMaterial({ color: C.ground, map: groundTex(), roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  grass(scene, uniforms, r);

  // faggi: tronchi lisci leggermente rastremati, rami in alto, chiome a blocchi scuri
  const bark = barkTex();
  const trunkMat = new THREE.MeshStandardMaterial({ color: C.trunk, map: bark, roughness: 0.7 });
  const leafMat = new THREE.MeshStandardMaterial({ color: C.leaf, roughness: 0.95, flatShading: true });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: C.leaf2, roughness: 0.95, flatShading: true });
  const trees = [];
  const addTree = (x, z, rad, h, lean = 0) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.z = lean; g.rotation.y = r(0, 6.28);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.62, rad, h, 18, 6), trunkMat); tr.position.y = h / 2; g.add(tr);
    const flare = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.55, 0.7, 18), trunkMat); flare.position.y = 0.35; g.add(flare);
    for (let b = 0; b < 4; b++) {
      const bl = r(2.5, 5), br = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.12, rad * 0.25, bl, 8), trunkMat);
      const a = r(0, 6.28), y0 = h * r(0.62, 0.9);
      br.position.set(Math.cos(a) * bl * 0.35, y0 + bl * 0.35, Math.sin(a) * bl * 0.35);
      br.rotation.set(Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8); g.add(br);
    }
    for (let c = 0; c < 6; c++) {
      const s = r(1.8, 3.4), lf = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), c % 2 ? leafMat : leafMat2);
      const a = r(0, 6.28), d = r(0.5, 3.2);
      lf.position.set(Math.cos(a) * d, h + r(-2.5, 1.5), Math.sin(a) * d); lf.scale.set(1, r(0.55, 0.8), 1); g.add(lf);
    }
    scene.add(g); trees.push(g); return g;
  };
  for (let i = 0; i < 150; i++) {
    const rad = 6.5 + Math.sqrt(r()) * 46, a = r(0, 6.28);
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    if (Math.hypot(x + 3.2, z + 10.5) < 3 || Math.hypot(x - 6.4, z + 15.5) < 2.6) continue;   // posto per i due tronchi speciali
    addTree(x, z, r(0.28, 0.55), r(15, 23), r(-0.04, 0.04));
  }
  // tronco con la bocca (verso la radura) e tronco col manifesto
  const mouthTree = addTree(-3.2, -10.5, 0.95, 21, 0); mouthTree.rotation.y = 0;
  const mouth = new THREE.Group(); mouth.position.set(-3.2, 1.55, -10.5 + 0.86); scene.add(mouth);
  const lipMat = new THREE.MeshStandardMaterial({ color: 0x4d535a, roughness: 0.85 });
  const lipGeo = new THREE.TorusGeometry(0.42, 0.11, 16, 64);
  { const lp = lipGeo.attributes.position; for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), y = lp.getY(i), a = Math.atan2(y, x);
      const k = 1 + 0.12 * Math.sin(a * 3 + 1) + 0.07 * Math.sin(a * 7 + 2); lp.setXY(i, x * k, y * k); } lipGeo.computeVertexNormals(); }
  const lip = new THREE.Mesh(lipGeo, lipMat); lip.scale.set(0.7, 1.22, 0.9); mouth.add(lip);
  const dark = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 20), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  dark.scale.set(0.74, 1.12, 0.32); dark.position.z = -0.06; mouth.add(dark);
  for (const [y, sy] of [[0.44, 1], [-0.47, -1]]) {               // labbro superiore e inferiore più spessi
    const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.42, 8, 16), lipMat); l.rotation.z = Math.PI / 2; l.position.set(0, y, 0.02); l.scale.set(1, 1, 0.9); mouth.add(l);
  }
  const posterTree = addTree(6.4, -15.5, 0.75, 20, 0); posterTree.rotation.y = 0;
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.84, 12, 16), new THREE.MeshStandardMaterial({ map: posterTex(), roughness: 0.92, side: THREE.DoubleSide }));
  poster.position.set(6.4, 1.62, -15.5 + 0.84); scene.add(poster);
  const pl = new THREE.PointLight(0xd8e6f5, 3.2, 5, 1.5); pl.position.set(6.9, 2.3, -13.7); scene.add(pl);
  const pp = poster.geometry.attributes.position, pbase = Float32Array.from(pp.array);
  const nail = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.3 }));
  nail.position.set(6.4, 2.0, -15.5 + 0.86); scene.add(nail);

  // nebbia che scorre: lenzuola trasparenti rivolte alla camera
  const fogs = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 6), new THREE.MeshBasicMaterial({ map: cloudTex(100 + i), color: 0x9cc0c8, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
    m.userData = { x: r(-30, 30), y: r(0.6, 3.2), z: r(-40, 12), v: r(0.25, 0.6) }; scene.add(m); fogs.push(m);
  }
  // pulviscolo
  const NP = 700, pg = new THREE.BufferGeometry(), pbase2 = new Float32Array(NP * 3), ppos = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) { pbase2[i * 3] = r(-14, 14); pbase2[i * 3 + 1] = r(0.2, 7); pbase2[i * 3 + 2] = r(-20, 8); }
  pg.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ map: soft(), color: 0xbfe0e8, size: 0.07, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);
  // vapore dalla bocca + chiarore lontano (la voce)
  const puffs = [];
  for (let i = 0; i < 24; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: 0xb8ccd2, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(s); puffs.push(s);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: 0xd9f0ef, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.position.set(-7, 1.8, -34); glow.scale.set(3, 4.5, 1); scene.add(glow);
  // raggi di luna nella radura
  const rays = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Mesh(new THREE.ConeGeometry(1.2 + i * 0.3, 18, 24, 1, true), new THREE.MeshBasicMaterial({
      map: texCanvas(8, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }),
      color: 0x9cc9e0, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    g.position.set(-1.5 + i * 1.3, 9, -1.5 + i * 0.8); g.rotation.z = 0.2; g.rotation.x = -0.1; scene.add(g); rays.push(g);
  }
  const H = hero(); scene.add(H);
  // ombra di contatto sotto di lui
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.6), new THREE.MeshBasicMaterial({ map: soft(), color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(-0.05, 0.01, 0); scene.add(shadow);

  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  return {
    scene, camera: cam, bloom: 0.38, bloomThreshold: 0.86, bloomRadius: 0.55,
    mouthPos: mouth.position.clone(), posterPos: poster.position.clone(), moonPos,
    update(t, u, o = {}) {
      uniforms.uTime.value = t; uniforms.uWind.value = 0.8 + 0.5 * Math.max(0, Math.sin(t * 0.45));
      scene.fog.density = o.fog ?? 0.022;
      // camera
      G.lookFrom(cam, o.cam || [0, 8, 0.01], o.look || [0, 0, 0], o.roll || 0);
      cam.fov = o.fov || 42; cam.updateProjectionMatrix();
      // respiro e mano che si contrae
      const br = Math.sin(t * 2 * Math.PI / 3.6);
      H.userData.chest.scale.set(1, 1 + 0.035 * br, 1 + 0.03 * br);
      H.userData.head.rotation.x = (o.headTurn || 0) * 0.35;
      const twitch = o.twitch || 0, hd = H.userData.handR;
      hd.scale.set(1, 1 - 0.25 * twitch, 1 - 0.15 * twitch);
      // nebbia, pulviscolo
      fogs.forEach((m) => {
        const d = m.userData; let x = d.x + t * d.v; x = ((x + 40) % 80 + 80) % 80 - 40;
        m.position.set(x, d.y, d.z); m.quaternion.copy(cam.quaternion);
        const dd = m.position.distanceTo(cam.position);
        m.material.opacity = 0.3 * (o.fogSheets ?? 1) * M.clamp((dd - 4) / 6);
      });
      const pa = dust.geometry.attributes.position;
      for (let i = 0; i < NP; i++) {
        const k = i * 3, ph = M.hash01(i, 3) * 6.28;
        pa.array[k] = pbase2[k] + Math.sin(t * 0.3 + ph) * 0.35;
        pa.array[k + 1] = ((pbase2[k + 1] + t * 0.08 * (0.5 + M.hash01(i, 5))) % 7);
        pa.array[k + 2] = pbase2[k + 2] + Math.cos(t * 0.23 + ph) * 0.3;
      }
      pa.needsUpdate = true;
      // vapore: soffi che partono agli istanti o.puffs (secondi)
      const starts = o.puffs || [];
      puffs.forEach((s, i) => {
        const t0 = starts[Math.floor(i / 8)] ?? -99, age = t - (t0 + (i % 8) * 0.09);
        if (age < 0 || age > 2.2) { s.material.opacity = 0; return; }
        const sp = 0.5 + M.hash01(i, 9);
        tmpA.copy(mouth.position); tmpA.z += 0.12 + age * 0.9 * sp; tmpA.y += age * 0.22 + Math.sin(age * 4 + i) * 0.03; tmpA.x += (M.hash01(i, 4) - 0.5) * 0.5 * age;
        s.position.copy(tmpA); const sc = 0.08 + age * 0.34; s.scale.set(sc, sc * 0.8, 1);
        s.material.opacity = 0.32 * M.clamp(age / 0.12) * (1 - age / 2.2);
      });
      glow.material.opacity = (o.glow || 0) * (0.65 + 0.35 * Math.sin(t * 2.3));
      // il manifesto si muove al vento (l'angolo in basso)
      const pa2 = poster.geometry.attributes.position;
      for (let i = 0; i < pa2.count; i++) {
        const x = pbase[i * 3], y = pbase[i * 3 + 1], low = M.clamp((0.42 - y) / 0.84);
        pa2.array[i * 3 + 2] = pbase[i * 3 + 2] + low * low * (0.05 + 0.03 * Math.sin(t * 2.2 + x * 4)) * (0.6 + 0.4 * Math.sin(t * 0.9));
      }
      pa2.needsUpdate = true; poster.geometry.computeVertexNormals();
      rays.forEach((g, i) => { g.material.opacity = (o.rays ?? 1) * (0.035 + 0.02 * Math.sin(t * 0.7 + i)); });
    },
  };
}
