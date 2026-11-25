// La casa della nonna di notte sotto la tempesta: muro di pietra, porta di legno che si apre verso dentro,
// lampada sopra la porta, finestra chiusa con le assi (filtra luce calda), selciato bagnato, pioggia, lampi.
// Dentro: un corridoio caldo che si vede quando la porta si apre. La nonna sta lì dietro.
// update(t, u, o) imposta tutto da t e dalle opzioni o: { cam, look, fov, roll, door 0..1, flash 0..1, nonna: {...}, hand: 0..1 }.
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { nonna } from './nonna.js';
const THREE = G.THREE;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (seed) => { const r = M.mulberry32(seed); return (a = 0, b = 1) => a + (b - a) * r(); };

function tex(w, h, fn, rep = null) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  fn(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
  return t;
}
const soft = () => tex(128, 128, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
// pietre irregolari con la malta
const stoneTex = () => tex(512, 512, (c, w, h) => {
  const r = rnd(31);
  c.fillStyle = '#4b4741'; c.fillRect(0, 0, w, h);
  let y = 0;
  while (y < h) {
    const rh = r(34, 60); let x = -r(0, 40);
    while (x < w) {
      const rw = r(50, 110), g = Math.round(r(105, 150));
      c.fillStyle = `rgb(${g},${g - 6},${g - 14})`;
      c.beginPath(); c.roundRect(x + 3, y + 3, rw - 6, rh - 6, 10); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.beginPath(); c.roundRect(x + 3, y + rh * 0.55, rw - 6, rh * 0.45 - 3, 8); c.fill();
      x += rw;
    }
    y += rh;
  }
}, [2.5, 2]);
const woodTex = (planks = 5, dark = '#4a2e1c') => tex(512, 1024, (c, w, h) => {
  const r = rnd(47);
  c.fillStyle = dark; c.fillRect(0, 0, w, h);
  const pw = w / planks;
  for (let i = 0; i < planks; i++) {
    const g = r(-14, 14);
    c.fillStyle = `rgb(${90 + g},${58 + g * 0.7},${36 + g * 0.5})`; c.fillRect(i * pw + 4, 0, pw - 8, h);
    for (let k = 0; k < 30; k++) { c.strokeStyle = `rgba(30,18,10,${r(0.08, 0.22)})`; c.lineWidth = r(1, 2.5); const x = i * pw + r(8, pw - 8); c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + r(-6, 6), h / 3, x + r(-6, 6), 2 * h / 3, x, h); c.stroke(); }
  }
});
const floorTex = () => tex(512, 512, (c, w, h) => {
  const r = rnd(53);
  for (let i = 0; i < 6; i++) { const g = r(-12, 12); c.fillStyle = `rgb(${130 + g},${86 + g},${52 + g})`; c.fillRect(0, i * h / 6, w, h / 6 - 3); }
}, [2, 3]);
const wallpaperTex = () => tex(256, 256, (c, w, h) => {
  c.fillStyle = '#b98f61'; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(110,70,40,0.35)'; c.lineWidth = 3;
  for (let x = 0; x < w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  c.fillStyle = 'rgba(120,60,40,0.3)';
  for (let y = 16; y < h; y += 48) for (let x = 16; x < w; x += 32) { c.beginPath(); c.ellipse(x, y, 5, 8, 0, 0, 7); c.fill(); }
}, [4, 3]);

export function casaSet() {
  const r = rnd(2024);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b1522, 0.06);
  const cam = G.camera(40, 0.03, 200); scene.add(cam);
  const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
  const box = (w, h, d, mat, pos) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.copy(pos); scene.add(m); return m; };

  // cielo e alberi lontani
  const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false,
    map: tex(16, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#05080f'); g.addColorStop(0.5, '#122236'); g.addColorStop(1, '#0a1019'); c.fillStyle = g; c.fillRect(0, 0, w, h); }) }));
  scene.add(sky);
  const treeM = new THREE.MeshBasicMaterial({ color: 0x070b11, fog: false });
  for (let i = 0; i < 26; i++) {
    const tr = new THREE.Mesh(new THREE.ConeGeometry(r(1.5, 3), r(7, 12), 7), treeM);
    const a = r(-1.4, 1.4); tr.position.set(Math.sin(a) * 30 + r(-4, 4), r(2, 4), -18 - r(0, 15)); scene.add(tr);
  }

  // luci: chiaro di luna freddo, lampo, lampada sopra la porta, luce calda di casa
  const moon = new THREE.DirectionalLight(0x6f8fb8, 0.8); moon.position.set(-6, 10, 8); scene.add(moon);
  const hemi = new THREE.HemisphereLight(0x324a6a, 0x0b0d10, 0.5); scene.add(hemi);
  const flashL = new THREE.DirectionalLight(0xdfe8ff, 0); flashL.position.set(4, 12, 10); scene.add(flashL);
  const porch = new THREE.PointLight(0xffb36b, 4.5, 7, 1.6); porch.position.set(0.72, 2.3, 0.45); scene.add(porch);
  const inside = new THREE.PointLight(0xffb47a, 0, 7, 1.4); inside.position.set(0, 1.9, -1.2); scene.add(inside);
  const spill = new THREE.SpotLight(0xffa860, 0, 6, 0.6, 0.6, 1.3); spill.position.set(0, 1.8, -1.0); spill.target.position.set(0, 0, 2.2); scene.add(spill, spill.target);

  // muro di pietra con l'apertura della porta e la finestra
  const stone = std(0xffffff, 0.92, { map: stoneTex() });
  box(2.2, 3.3, 0.4, stone, V(-1.6, 1.65, -0.2));
  box(0.9, 3.3, 0.4, stone, V(0.95, 1.65, -0.2));
  box(1.0, 1.2, 0.4, stone, V(0, 2.7, -0.2));
  box(1.3, 0.9, 0.4, stone, V(2.05, 0.45, -0.2)); box(1.3, 1.05, 0.4, stone, V(2.05, 2.775, -0.2));
  box(0.5, 3.3, 0.4, stone, V(2.95, 1.65, -0.2));
  // finestra con le assi e la luce calda che filtra
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.35), new THREE.MeshBasicMaterial({ color: 0xc8742e, fog: false })); glow.position.set(2.05, 1.575, -0.35); scene.add(glow);
  const plank = std(0xffffff, 0.85, { map: woodTex(1, '#3a2416') });
  [[1.32, -0.12, 1.25], [1.36, 0.1, 1.6], [1.3, -0.05, 1.95], [1.4, 0.6, 1.55]].forEach(([w, rot, y]) => { const b = box(w, 0.2, 0.05, plank, V(2.05, y, -0.02)); b.rotation.z = rot; });
  // architrave e stipiti di legno, gradino di pietra
  const beam = std(0x3b2617, 0.8, { map: woodTex(1, '#2e1d12') });
  box(1.25, 0.16, 0.45, beam, V(0, 2.12, -0.15)); box(0.14, 2.05, 0.45, beam, V(-0.53, 1.02, -0.15)); box(0.14, 2.05, 0.45, beam, V(0.53, 1.02, -0.15));
  box(1.5, 0.14, 0.6, std(0x5c5852, 0.6), V(0, 0.07, 0.25));
  // tetto
  box(6.5, 0.25, 0.9, std(0x241a14, 0.8), V(0.4, 3.35, 0.15));
  // porta a doghe con borchie, anello e cardini: si apre verso l'interno (cardine a sinistra)
  const doorPivot = new THREE.Group(); doorPivot.position.set(-0.46, 0, -0.06); scene.add(doorPivot);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.02, 0.06), std(0xffffff, 0.75, { map: woodTex(5) }));
  door.position.set(0.46, 1.01, 0); doorPivot.add(door);
  const iron = std(0x2a2a2a, 0.45, { metalness: 0.6 });
  for (const y of [0.35, 1.7]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.015), iron); h.position.set(0.3, y, 0.04); doorPivot.add(h); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 24), iron); ring.position.set(0.72, 1.12, 0.06); doorPivot.add(ring);
  for (let i = 0; i < 10; i++) { const st = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), iron); st.position.set(0.12 + (i % 5) * 0.17, i < 5 ? 0.25 : 1.8, 0.035); doorPivot.add(st); }
  // lampada sopra la porta
  const lampM = std(0x1d1d1d, 0.5, { metalness: 0.5 });
  box(0.16, 0.24, 0.16, lampM, V(0.72, 2.33, 0.12)).material = lampM;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); bulb.position.set(0.72, 2.3, 0.21); scene.add(bulb);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: 0xffb060, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); halo.position.copy(bulb.position); halo.scale.set(0.9, 0.9, 1); scene.add(halo);

  // terra bagnata (lucida) e prato ai lati
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), std(0x1b1f24, 0.22, { metalness: 0.1 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 12), std(0x3a3835, 0.18, { map: stoneTex() })); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.005, 6.4); scene.add(path);
  const grassM = std(0x1e2c1c, 0.9);
  for (const sx of [-1, 1]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(8, 14), grassM); g.rotation.x = -Math.PI / 2; g.position.set(sx * 4.8, 0.004, 6); scene.add(g); }

  // dentro: corridoio caldo con carta da parati, pavimento di legno, un quadro, un attaccapanni
  const floorI = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.4), std(0xffffff, 0.6, { map: floorTex() })); floorI.rotation.x = -Math.PI / 2; floorI.position.set(0, 0.01, -1.9); scene.add(floorI);
  const wp = std(0xffffff, 0.85, { map: wallpaperTex() });
  box(0.05, 2.4, 3.4, wp, V(-0.8, 1.2, -1.9)); box(0.05, 2.4, 3.4, wp, V(0.8, 1.2, -1.9)); box(1.6, 2.4, 0.05, wp, V(0, 1.2, -3.6));
  box(1.6, 0.05, 3.4, std(0x6b4a30, 0.8), V(0, 2.4, -1.9));
  const frame = box(0.42, 0.52, 0.03, std(0x6a4a22, 0.5), V(0.1, 1.5, -3.55));
  box(0.34, 0.44, 0.01, std(0x3d4b45, 0.9), V(0.1, 1.5, -3.53));
  box(0.04, 1.7, 0.04, std(0x3a2416, 0.7), V(-0.6, 0.85, -2.6));
  const coat = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.6, 6, 12), std(0x2a3b2a, 0.9)); coat.position.set(-0.6, 1.25, -2.5); scene.add(coat);

  // pioggia: segmenti che cadono, posizioni calcolate dal tempo (nessuno stato)
  const NR = 2600, rg = new THREE.BufferGeometry(), rp = new Float32Array(NR * 6), rbase = new Float32Array(NR * 4);
  for (let i = 0; i < NR; i++) { rbase[i * 4] = r(-5, 5); rbase[i * 4 + 1] = r(-1.5, 10); rbase[i * 4 + 2] = r(0, 1); rbase[i * 4 + 3] = r(0.8, 1.2); }
  rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaec4dc, transparent: true, opacity: 0.42, depthWrite: false })); rain.frustumCulled = false; scene.add(rain);
  // gocce dal tetto
  const N = nonna(); scene.add(N.group);

  // mano in soggettiva (manica della giacca nera + pugno) attaccata alla camera
  const pov = new THREE.Group(); cam.add(pov);
  const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.32, 8, 16), std(0x1d2127, 0.55)); sleeve.rotation.x = Math.PI / 2 - 0.4; sleeve.position.set(0.16, -0.24, -0.38); pov.add(sleeve);
  const fist = new THREE.Group(); fist.position.set(0.12, -0.1, -0.58); pov.add(fist);
  const skinP = std(0xd9a07c, 0.6);
  const fb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 18, 14), skinP); fb.scale.set(1.05, 0.9, 1.1); fist.add(fb);
  for (let f = 0; f < 4; f++) { const k = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.03, 6, 10), skinP); k.rotation.z = Math.PI / 2; k.position.set(-0.002, 0.024 - f * 0.016, -0.04); fist.add(k); }

  const flashT = [];
  return {
    scene, camera: cam, bloom: 0.28, bloomThreshold: 0.92, bloomRadius: 0.45, nonna: N,
    update(t, u, o = {}) {
      G.lookFrom(cam, o.cam || [0, 1.6, 4], o.look || [0, 1.4, 0], o.roll || 0);
      cam.fov = o.fov || 40; cam.updateProjectionMatrix();
      // porta, luce che esce, lampada che trema un po'
      const d = M.clamp(o.door || 0);
      doorPivot.rotation.y = -1.75 * d;
      inside.intensity = 3.2 * M.clamp(d * 3); spill.intensity = 4.5 * M.clamp(d * 2.5);
      porch.intensity = 4.5 * (0.92 + 0.08 * Math.sin(t * 13) * Math.sin(t * 7.3));
      // lampi
      const f = M.clamp(o.flash || 0);
      flashL.intensity = 6 * f; hemi.intensity = 0.5 + 1.6 * f;
      sky.material.color.setScalar(1 + 2.5 * f);
      // pioggia (vento leggero verso destra)
      const pa = rain.geometry.attributes.position;
      const cp = cam.position;
      for (let i = 0; i < NR; i++) {
        const k = i * 6, sp = 9 * rbase[i * 4 + 3];
        let y = rbase[i * 4 + 1] - ((t * sp + rbase[i * 4 + 2] * 11.5) % 11.5);
        if (y < -1.5) y += 11.5;
        const x = cp.x + rbase[i * 4] + y * 0.06, z = cp.z - 4 + ((rbase[i * 4 + 2] * 9.7 + i * 0.37) % 9);
        pa.array[k] = x; pa.array[k + 1] = y + 0.28; pa.array[k + 2] = z;
        pa.array[k + 3] = x - 0.02; pa.array[k + 4] = y; pa.array[k + 5] = z;
      }
      pa.needsUpdate = true;
      // la nonna
      N.pose(o.nonna || {});
      // mano in soggettiva
      const h = o.hand || 0;
      pov.visible = h > 0.001;
      fist.position.set(0.12 - 0.03 * h, -0.32 + 0.24 * h, -0.62 + 0.04 * h); sleeve.position.set(0.17, -0.46 + 0.2 * h, -0.45);
    },
  };
}
