// «Il testimone», episodio 2 («Interno 11») — l'altra scala del palazzo, al buio, vista dall'alto dentro la tromba (come la torre di «La donna che
// visse due volte»): quattro piani di rampe che girano attorno a un pozzo stretto, il corrimano di legno sopra le bacchette di ferro, i pianerottoli con le
// porte, le finestre dei mezzanini da cui entra la luce fredda della strada. Tu scendi di corsa senza accendere la luce.
// scalaSet() → { scene, camera, T, update(t, u, o), percorso(s) }   o: { cam, look, fov, roll, up, tu: posa }; percorso(s) = [x, y, z, direzione] a s metri
// dall'inizio della discesa (dal pianerottolo del quarto piano), per mettere il personaggio sulle rampe.
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { THREE, V, rnd, tex, mat, piatto as basic, sfera, add, tra, luci, ombre, alone, PI } from './stile.js';
import { testimone } from './adulti.js';
import { porta } from './testimone_set.js';

// pozzo: |x| < WX, |z| < WZ; rampe larghe RW fuori dal pozzo; piani alti FH; mezzanino (pianerottolo intermedio) a z > WZ, piano a z < -WZ
const WX = 0.3, WZ = 1.26, RW = 1.2, FH = 3.0, NS = 9, LZ = 1.3;
export function scalaSet() {
  const r = rnd(303), scene = new THREE.Scene(); scene.background = new THREE.Color('#030406'); scene.fog = new THREE.Fog('#030406', 3, 17);
  const cam = G.camera(50, 0.05, 60); scene.add(cam);
  const amb = new THREE.Group(); scene.add(amb);
  const pietra = mat('#8C8577'), alzata = mat('#6E685D'), muro = mat(0xffffff, { map: tex(64, 256, (c, w, h) => { c.fillStyle = '#B8B096'; c.fillRect(0, 0, w, h); c.fillStyle = '#5C6B56'; c.fillRect(0, h * 0.55, w, h * 0.45); c.fillStyle = '#3E4A3A'; c.fillRect(0, h * 0.545, w, 4); }) });
  const legno = mat('#4A2E1C'), ferro = mat('#24262A');
  const X0 = WX + RW, Z0 = WZ + LZ;                             // muri esterni a |x| = X0, |z| = Z0
  const rampa = (y0, xa, xb, za, zb, su) => {                 // gradini da (za, y0) a (zb, y0 + su·FH/2): pedate e alzate
    const g = new THREE.Group(); amb.add(g); const n = NS, dz = (zb - za) / n, dy = (FH / 2) / n * su;
    for (let i = 0; i < n; i++) { const z = za + dz * (i + 0.5), y = y0 + dy * (i + (su > 0 ? 1 : 0));
      add(g, new THREE.BoxGeometry(xb - xa, 0.03, Math.abs(dz) + 0.02), pietra, V((xa + xb) / 2, y - 0.015, z));
      add(g, new THREE.BoxGeometry(xb - xa, Math.abs(dy), 0.02), alzata, V((xa + xb) / 2, y - Math.abs(dy) / 2, za + dz * (i + (su > 0 ? 0 : 1)))); }
    // la soletta inclinata sotto la rampa (si vede dal pozzo)
    const lz = Math.abs(zb - za), sl = add(g, new THREE.BoxGeometry(xb - xa, 0.14, Math.hypot(lz, FH / 2)), mat('#5A554C'), V((xa + xb) / 2, y0 + (su * FH) / 4 - 0.14, (za + zb) / 2)); sl.rotation.x = Math.atan2(FH / 2, lz) * Math.sign(zb - za) * -su;
    return g; };
  const ringhiera = (pts) => {                                 // corrimano su una spezzata (punti all'altezza del corrimano) e bacchette fino al bordo dei gradini
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; tra(amb, a, b, 0.024, 0.024, legno); const L = a.distanceTo(b), n = Math.max(1, Math.round(L / 0.13));
      for (let k = 0; k < n; k++) { const p = a.clone().lerp(b, (k + 0.5) / n); tra(amb, V(p.x, p.y - 0.93, p.z), V(p.x, p.y - 0.02, p.z), 0.007, 0.007, ferro); } } };
  for (let f = 0; f <= 4; f++) { const y = f * FH;
    add(amb, new THREE.BoxGeometry(2 * X0, 0.16, LZ), pietra, V(0, y - 0.08, -(WZ + LZ / 2)));                     // il pianerottolo del piano
    add(amb, new THREE.BoxGeometry(2 * X0, 0.16, LZ), pietra, V(0, y + FH / 2 - 0.08, WZ + LZ / 2)).visible = f < 4;  // il mezzanino
    if (f < 4) { rampa(y, WX, X0, -WZ, WZ, 1); rampa(y + FH / 2, -X0, -WX, WZ, -WZ, 1);
      const h = 0.95; ringhiera([V(WX, y + h, -WZ), V(WX, y + FH / 2 + h, WZ), V(-WX, y + FH / 2 + h, WZ), V(-WX, y + FH + h, -WZ)]); }
    if (f > 0) ringhiera([V(-WX, y + 0.95, -WZ), V(WX, y + 0.95, -WZ)]);
    // due porte per piano sul muro di fondo del pianerottolo, il numero, lo zerbino
    for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * 0.95, y, -Z0 + 0.03); amb.add(p); porta(p, { numero: String(20 + f * 2 + (s > 0 ? 1 : 0)), colore: s > 0 ? '#4E3426' : '#3C2A20' });
      const zr = add(amb, new THREE.PlaneGeometry(0.6, 0.38), mat('#5A3A2A'), V(s * 0.95, y + 0.005, -Z0 + 0.35)); zr.rotation.x = -Math.PI / 2; }
    // la finestra del mezzanino sul cortile: la luce fredda della strada
    if (f < 4) { const fy = y + FH / 2 + 1.0; add(amb, new THREE.PlaneGeometry(1.1, 1.3), basic('#2E3F5E'), V(0, fy + 0.65, Z0 - 0.02)).rotation.y = Math.PI;
      for (const [w, h, x, yy] of [[1.18, 0.05, 0, fy], [1.18, 0.05, 0, fy + 1.3], [0.05, 1.3, -0.57, fy + 0.65], [0.05, 1.3, 0.57, fy + 0.65], [0.04, 1.3, 0, fy + 0.65]]) add(amb, new THREE.BoxGeometry(w, h, 0.06), mat('#9A968C'), V(x, yy, Z0 - 0.04));
      const lf = new THREE.PointLight('#6E88C0', 1.6, 5.5, 1.3); lf.position.set(0, fy + 0.7, Z0 - 0.4); scene.add(lf); } }
  // i muri della tromba (dal pianterreno al quarto piano e mezzo)
  const HT = 4 * FH + 2.5;
  for (const [w, x, z, ry] of [[2 * X0, 0, -Z0, 0], [2 * X0, 0, Z0, Math.PI], [2 * Z0, -X0, 0, Math.PI / 2], [2 * Z0, X0, 0, -Math.PI / 2]]) { const m = add(amb, new THREE.PlaneGeometry(w, HT), muro, V(x, HT / 2 - 0.2, z)); m.rotation.y = ry; m.material = m.material.clone(); m.material.map = m.material.map.clone(); m.material.map.wrapT = THREE.RepeatWrapping; m.material.map.repeat.set(1, HT / FH); m.material.map.offset.y = -0.15; m.material.map.needsUpdate = true; }
  add(amb, new THREE.PlaneGeometry(2 * X0, 2 * Z0), pietra, V(0, -0.16, 0)).rotation.x = -Math.PI / 2;
  ombre(amb, { fa: true, riceve: true });
  const L = luci(scene, { amb: 0.07, fronte: 0.05, alto: 0, colore: 0x9fb4e0, ombre: false });
  const T = testimone(); scene.add(T.group); ombre(T.group, { fa: true, riceve: false });
  // il percorso di chi scende dal pianerottolo del quarto piano: lungo la rampa che sale dal mezzanino (lato -x), il mezzanino, la rampa sotto (lato +x), il piano, e così via
  const xs = WX + RW / 2, segs = [];
  for (let f = 4; f >= 1; f--) { const y = f * FH;
    if (f < 4) segs.push([V(xs, y, -WZ - 0.35), V(-xs, y, -WZ - 0.35)]);                          // attraversa il pianerottolo
    segs.push([V(-xs, y, -WZ - 0.35), V(-xs, y, -WZ)], [V(-xs, y, -WZ), V(-xs, y - FH / 2, WZ)], [V(-xs, y - FH / 2, WZ), V(-xs, y - FH / 2, WZ + 0.5)], [V(-xs, y - FH / 2, WZ + 0.5), V(xs, y - FH / 2, WZ + 0.5)],
      [V(xs, y - FH / 2, WZ + 0.5), V(xs, y - FH / 2, WZ)], [V(xs, y - FH / 2, WZ), V(xs, y - FH, -WZ)], [V(xs, y - FH, -WZ), V(xs, y - FH, -WZ - 0.35)]); }
  const lun = segs.map(([a, b]) => a.distanceTo(b)), tot = lun.reduce((a, b) => a + b, 0);
  function percorso(s) { s = M.clamp(s, 0, tot); for (let i = 0; i < segs.length; i++) { if (s <= lun[i] || i === segs.length - 1) { const [a, b] = segs[i], k = M.clamp(s / lun[i]), p = a.clone().lerp(b, k), d = b.clone().sub(a); return [p.x, p.y, p.z, Math.atan2(d.x, d.z)]; } s -= lun[i]; } }
  return { scene, camera: cam, bloom: 0, T, percorso, lunghezza: tot,
    update(t, u, o = {}) {
      G.lookFrom(cam, o.cam || [0.02, 4 * FH + 1.8, 0.05], o.look || [0, 0, 0], o.roll || 0); if (o.up) { cam.up.set(...o.up); cam.lookAt(...(o.look || [0, 0, 0])); }
      cam.fov = o.fov || 50; cam.updateProjectionMatrix(); L.segui(cam, o.look || [0, 0, 0]);
      T.pose(o.tu || { pos: [30, 0, 30] });
    } };
}
