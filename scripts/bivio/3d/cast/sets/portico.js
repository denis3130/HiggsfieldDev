// «Il testimone», episodio 2 («Interno 11») — il portico dall'altra parte della strada, dove ti fermi a respirare: pilastri, il soffitto basso, una
// lampada da muro gialla e debole, le saracinesche abbassate; fuori la strada bagnata sotto la pioggia forte, i riflessi dei lampioni, le auto ferme,
// i palazzi di fronte con quasi tutte le finestre spente.
// porticoSet() → { scene, camera, T, tel, update(t, u, o) }   o: { cam, look, fov, roll, tu: posa, telTu 0..1, telSchermo 0..1 (lo schermo che si accende),
//   chiamata 0..1 (lo schermo bianco della chiamata in arrivo che illumina la faccia), pioggia 0..1, fiato 0..1 (il fiato che si condensa) }
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { THREE, V, rnd, tex, mat, piatto as basic, sfera, add, tra, luci, ombre, alone, PI } from './stile.js';
import { testimone, telefono } from './adulti.js';
import { auto } from './auto_mesh.js';

export function porticoSet() {
  const r = rnd(707), scene = new THREE.Scene(); scene.background = new THREE.Color('#05080E'); scene.fog = new THREE.Fog('#05080E', 8, 38);
  const cam = G.camera(40, 0.03, 80); scene.add(cam);
  const amb = new THREE.Group(); scene.add(amb);
  const box = (w, h, d, m, pos) => add(amb, new THREE.BoxGeometry(w, h, d), m, pos);
  // ---------------------------------------------------------------- la strada: asfalto bagnato coi riflessi, il marciapiede e il gradino del portico
  const asf = tex(1024, 1024, (c, w, h) => { c.fillStyle = '#151A22'; c.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '110,120,140' : '0,0,0'},${r(0.03, 0.12)})`; c.fillRect(r() * w, r() * h, r(1, 3), r(1, 3)); }
    for (let i = 0; i < 30; i++) { const x = r() * w, y = r() * h, rr = r(30, 120), g = c.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, 'rgba(60,80,110,0.25)'); g.addColorStop(1, 'rgba(60,80,110,0)'); c.fillStyle = g; c.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); } }, [4, 4]);
  const strada = add(amb, new THREE.PlaneGeometry(60, 30), new THREE.MeshPhongMaterial({ color: '#FFFFFF', map: asf, specular: '#7A8AA8', shininess: 60 }), V(0, 0, 13)); strada.rotation.x = -Math.PI / 2;
  // i riflessi lunghi dei lampioni sull'asfalto (strisce sfumate, tremano con la pioggia)
  const rifl = []; for (const x of [-9, 0, 9]) { const m = add(scene, new THREE.PlaneGeometry(0.6, 9), new THREE.MeshBasicMaterial({ map: alone(), color: '#FFB060', transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }), V(x + 0.4, 0.01, 9.5)); m.rotation.x = -Math.PI / 2; rifl.push(m); }
  box(60, 0.16, 3.2, mat('#5A5A58'), V(0, 0.08, 1.6)); box(60, 0.18, 0.18, mat('#77777A'), V(0, 0.09, 3.2));
  // ---------------------------------------------------------------- il portico: pilastri ogni 3,2 m, travi, soffitto a 3,4 m, muro di fondo con le saracinesche
  const intonaco = mat('#9A9080'), scuro = mat('#6E665A'), PZ0 = -3.0;
  for (let x = -9.6; x <= 9.6; x += 3.2) { box(0.55, 3.4, 0.55, intonaco, V(x, 1.7 + 0.16, 0.3)); box(0.68, 0.12, 0.68, scuro, V(x, 0.22, 0.3)); box(0.66, 0.16, 0.66, scuro, V(x, 3.4 + 0.08, 0.3)); }
  box(22, 0.5, 0.6, intonaco, V(0, 3.4 + 0.41, 0.3)); box(22, 0.2, 3.6, mat('#7E766A'), V(0, 3.76, -1.2));
  add(amb, new THREE.PlaneGeometry(22, 3.4), mat('#8A8172'), V(0, 1.86, PZ0));
  const pav = add(amb, new THREE.PlaneGeometry(22, 3.3), mat(0xffffff, { map: tex(256, 64, (c, w, h) => { c.fillStyle = '#7A746A'; c.fillRect(0, 0, w, h); c.strokeStyle = '#5E584F'; c.lineWidth = 2; for (let x = 0; x < w; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } }, [6, 2]) }), V(0, 0.165, -1.35)); pav.rotation.x = -Math.PI / 2;
  const serr = mat(0xffffff, { map: tex(128, 256, (c, w, h) => { c.fillStyle = '#5E6266'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, y, w, 2); c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, y + 3, w, 2); } c.fillStyle = 'rgba(40,30,20,0.25)'; c.fillRect(0, h - 40, w, 40); }) });
  for (const x of [-4.8, -1.6, 4.8]) { add(amb, new THREE.PlaneGeometry(2.4, 2.6), serr, V(x, 1.47, PZ0 + 0.02)); }
  add(amb, new THREE.PlaneGeometry(1.0, 2.3), mat('#3A2A1E'), V(1.6, 1.32, PZ0 + 0.02));
  // la lampada da muro (applique a globo) gialla e debole
  add(amb, sfera(0.1, 16), basic('#FFD9A0'), V(0.0, 2.75, PZ0 + 0.14)); const alA = new THREE.Sprite(new THREE.SpriteMaterial({ map: alone(), color: '#FFC27A', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending })); alA.position.set(0, 2.75, PZ0 + 0.2); alA.scale.set(1.2, 1.2, 1); scene.add(alA);
  const LA = new THREE.PointLight('#FFC487', 2.4, 7, 1.4); LA.position.set(0, 2.6, PZ0 + 0.5); scene.add(LA); LA.castShadow = true; LA.shadow.mapSize.set(1024, 1024); LA.shadow.bias = -0.002; LA.shadow.radius = 4;
  // ---------------------------------------------------------------- fuori: le auto ferme lungo il marciapiede, i lampioni, i palazzi di fronte
  for (const [col, x] of [['#2A2F38', -6.5], ['#3B2222', -1.8], ['#1E2A33', 3.6], ['#2C2E31', 8.4]]) { const a = auto(col); a.group.position.set(x, 0, 4.4); a.group.rotation.y = Math.PI / 2; amb.add(a.group); }
  const ferro = mat('#23272E');
  for (const x of [-9, 0, 9]) { add(amb, new THREE.CylinderGeometry(0.06, 0.09, 6, 10), ferro, V(x, 3, 3.5)); tra(amb, V(x, 6, 3.5), V(x + 0.9, 6.1, 3.5), 0.04, 0.04, ferro);
    add(scene, new THREE.PlaneGeometry(0.4, 0.16), basic('#FFE2B0'), V(x + 0.9, 6.02, 3.5)).rotation.x = Math.PI / 2;
    const al = new THREE.Sprite(new THREE.SpriteMaterial({ map: alone(), color: '#FFB872', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })); al.position.set(x + 0.9, 6.0, 3.5); al.scale.set(2.4, 2.4, 1); scene.add(al);
    const sp = new THREE.SpotLight('#FFBE80', 9, 16, 0.8, 0.85, 1.1); sp.position.set(x + 0.9, 6.0, 3.5); sp.target.position.set(x + 0.9, 0, 3.8); scene.add(sp, sp.target); }
  const facc = tex(1024, 512, (c, w, h) => { c.fillStyle = '#0D1018'; c.fillRect(0, 0, w, h); for (let x = 20; x < w; x += 64) for (let y = 30; y < h - 60; y += 80) { const acc = r() < 0.08; c.fillStyle = acc ? (r() < 0.6 ? '#C99A5A' : '#6E86B0') : '#151A24'; c.fillRect(x, y, 34, 46); }
    c.fillStyle = '#0A0C12'; c.fillRect(0, h - 70, w, 70); });
  add(amb, new THREE.PlaneGeometry(64, 24), basic(0xffffff, { map: facc, fog: true }), V(0, 11, 27));
  ombre(amb, { fa: false, riceve: true });
  // ---------------------------------------------------------------- la pioggia: gocce fuori dal portico (in luce dei lampioni), schizzi sull'asfalto
  const NG = 1800, gp = new Float32Array(NG * 6), gc = new Float32Array(NG * 6), semi = []; for (let i = 0; i < NG; i++) semi.push([r(-12, 12), r(0.9, 16), r(), r(8, 10.5), r(0.5, 1)]);
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(gp, 3)); gg.setAttribute('color', new THREE.BufferAttribute(gc, 3));
  const gocce = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); gocce.frustumCulled = false; scene.add(gocce);
  const NSP = 160, spl = new THREE.InstancedMesh(new THREE.RingGeometry(0.6, 1, 16), new THREE.MeshBasicMaterial({ color: '#8A9CC0', transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }), NSP); spl.frustumCulled = false; scene.add(spl);
  const SPL = []; for (let i = 0; i < NSP; i++) SPL.push([r(-10, 10), r(1.0, 14), r(), r(0.35, 0.6)]);
  const mm = new THREE.Matrix4(), qq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), pp = V(0, 0, 0), ss = V(1, 1, 1);
  // ---------------------------------------------------------------- tu, il telefono, il fiato che si condensa
  const L = luci(scene, { amb: 0.1, fronte: 0.07, alto: 0, colore: 0x9cb2dc, ombre: false });
  const T = testimone(); scene.add(T.group); ombre(T.group, { fa: true, riceve: false });
  const tel = telefono(T, 'AR');
  const lTel = new THREE.PointLight('#D8E6FF', 0, 1.2, 1.6); scene.add(lTel);
  const fiato = new THREE.Sprite(new THREE.SpriteMaterial({ map: alone(), color: '#C9D4E6', transparent: true, opacity: 0, depthWrite: false })); scene.add(fiato);
  const tmp = V(0, 0, 0), cS = new THREE.Color();
  return { scene, camera: cam, bloom: 0, T, tel,
    update(t, u, o = {}) {
      G.lookFrom(cam, o.cam || [0.6, 1.5, 2.2], o.look || [0, 1.4, 0], o.roll || 0); cam.fov = o.fov || 40; cam.updateProjectionMatrix(); L.segui(cam, o.look || [0, 1.4, 0]);
      L.A.intensity = (o.ambiente ?? 0.1) * PI; L.F.intensity = (o.fronte ?? 0.07) * PI;
      const kp = o.pioggia ?? 1; gocce.visible = kp > 0.01;
      for (let i = 0; i < NG; i++) { const [x, z, f, v, lum] = semi[i], H = 12, d = (f * H + t * v) % H, y = H - d, Lg = v * 0.03, o6 = i * 6; gp[o6] = x; gp[o6 + 1] = y; gp[o6 + 2] = z; gp[o6 + 3] = x + 0.02; gp[o6 + 4] = y - Lg; gp[o6 + 5] = z;
        const q = Math.max(...[-9, 0, 9].map((lx) => Math.exp(-(((x - lx - 0.9) / 2.2) ** 2) - (((z - 3.6) / 2.6) ** 2)))), b = 0.12 * lum * kp;
        for (let e = 0; e < 2; e++) { const a = e ? 0.3 : 1; gc[o6 + e * 3] = a * (b * 0.55 + 0.8 * q * lum * kp); gc[o6 + e * 3 + 1] = a * (b * 0.62 + 0.6 * q * lum * kp); gc[o6 + e * 3 + 2] = a * (b * 0.8 + 0.35 * q * lum * kp); } }
      gg.attributes.position.needsUpdate = true; gg.attributes.color.needsUpdate = true;
      SPL.forEach(([x, z, f, per], i) => { const k = ((t / per + f) % 1); pp.set(x, 0.012, z); ss.setScalar(0.01 + 0.07 * k); spl.setMatrixAt(i, mm.compose(pp, qq, ss)); }); spl.instanceMatrix.needsUpdate = true; spl.material.opacity = 0.25 * kp;
      rifl.forEach((m, i) => { m.material.opacity = 0.28 + 0.06 * Math.sin(t * 9 + i * 2.1) * Math.sin(t * 3.3 + i); });
      const tk = M.clamp(o.telTu ?? 0); tel.g.visible = tk > 0;
      tel.schermo.material.color.set('#0A0C10').lerp(cS.set('#E6EEFF'), M.clamp(o.telSchermo ?? 0));
      T.pose(o.tu || { pos: [0.3, 0.165, -0.1], yaw: 0.4 });
      T.AR.gH.getWorldPosition(tmp); lTel.position.set(tmp.x, tmp.y + 0.16, tmp.z + 0.02);      // (più su, verso la faccia: appena sopra la mano bruciava la maglia) lTel.intensity = 1.4 * tk * M.clamp(o.telSchermo ?? 0);
      // il fiato: una nuvoletta davanti alla bocca a ogni espirazione
      const kf = M.clamp(o.fiato ?? 0); T.head.getWorldPosition(tmp); const ciclo = (t * 0.55) % 1, esp = M.bump(ciclo, 0.35, 0.3);
      const fw = V(0, 0, 1).applyQuaternion(T.head.getWorldQuaternion(new THREE.Quaternion()));
      fiato.position.set(tmp.x + fw.x * (0.12 + 0.18 * ciclo), tmp.y - 0.07 + 0.05 * ciclo, tmp.z + fw.z * (0.12 + 0.18 * ciclo)); fiato.scale.setScalar(0.08 + 0.22 * ciclo); fiato.material.opacity = 0.22 * kf * esp;
    } };
}
