// «Il testimone» — fuori: il palazzo di notte, la tua cucina al quarto piano (dietro l'unica finestra accesa) e il parcheggio sotto,
// con il lampione, l'auto grigia, l'ispettore Riva ed Elena. Un solo set: la camera può stare alla tua finestra (vista dall'alto),
// giù nel parcheggio (il palazzo visto da sotto), fuori dalla finestra (tu dietro il vetro) o dentro la cucina.
// update(t, u, o): { cam, look, fov, roll, cucina 0..1 (luce accesa), interno (camera dentro casa), tenda 0..1 (scostata),
//   tu, riva, elena: pose (elena anche { cade 0..1, sdraiata 0..1, nascosta }), cofano 0..1, telTu 0..1, fronte (luce frontale) }
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { THREE, V, rnd, tex, mat, piatto as basic, sfera, add, loft, tra, luci, ombre, alone, PI } from './stile.js';
import { testimone, ispettore, elena, telefono } from './adulti.js';
import { assi } from './cucina3.js';
import { mix } from './pupazzi.js';

export const WX = 1.5, FY = 12;                      // la tua finestra: colonna x = 1,5, pavimento del quarto piano a 12 m
export const LAMP = [3.5, 6.2, 13.3], ZUFFA = [3.3, 0, 13.7], AUTO = [7.3, 0, 15.1];   // il baule dell'auto grigia è a x = AUTO.x - 1,7
const macchia = (col, op = 1) => new THREE.MeshBasicMaterial({ map: alone(), color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending });

// auto stilizzata: lunga lungo z (muso a +z), cofano del bagagliaio che si apre verso l'alto
export function auto(colore = '#8C9096') {
  const g = new THREE.Group(), c1 = mat(colore), nero = mat('#0D0E11');
  const S = (y, rx, rz, cz = 0, n = 4.5) => ({ y, rx, rz, cz, n });
  add(g, loft([S(0.2, 0.74, 2.0), S(0.36, 0.86, 2.13), S(0.7, 0.88, 2.15), S(0.86, 0.85, 2.1), S(0.9, 0.8, 2.04), S(0.905, 0.01, 0.01)], 56), c1);
  const vetri = mat(0xffffff, { map: tex(512, 128, (c, w, h) => { c.fillStyle = colore; c.fillRect(0, 0, w, h); c.fillStyle = '#10151D'; c.fillRect(0, h * 0.55, w, h * 0.38);
    c.fillStyle = colore; for (const u of [0.07, 0.25, 0.43, 0.57, 0.75, 0.93]) c.fillRect(u * w - 7, 0, 14, h); }) });
  add(g, loft([S(0.86, 0.79, 1.2, -0.15), S(1.16, 0.71, 1.0, -0.17), S(1.39, 0.61, 0.74, -0.2), S(1.425, 0.5, 0.6, -0.2), S(1.43, 0.01, 0.01, -0.2)], 56), vetri);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = add(g, new THREE.CylinderGeometry(0.33, 0.33, 0.24, 22), nero, V(sx * 0.8, 0.33, sz * 1.32)); w.rotation.z = Math.PI / 2;
    const cp = add(g, new THREE.CylinderGeometry(0.19, 0.19, 0.25, 16), mat('#6E7278'), V(sx * 0.8, 0.33, sz * 1.32)); cp.rotation.z = Math.PI / 2; }
  for (const sx of [-1, 1]) { add(g, new THREE.BoxGeometry(0.34, 0.12, 0.05), basic('#6A0F0A'), V(sx * 0.58, 0.72, -2.13)); add(g, new THREE.BoxGeometry(0.32, 0.12, 0.05), basic('#3A3D42'), V(sx * 0.58, 0.68, 2.13)); }
  add(g, new THREE.BoxGeometry(0.46, 0.11, 0.02), mat('#E8E8E2'), V(0, 0.5, -2.14));
  const vano = add(g, new THREE.PlaneGeometry(1.42, 0.78), basic('#040506'), V(0, 0.912, -1.68)); vano.rotation.x = -Math.PI / 2; vano.visible = false;
  const perno = new THREE.Group(); perno.position.set(0, 0.915, -1.3); g.add(perno);
  add(perno, new THREE.BoxGeometry(1.5, 0.035, 0.8), c1, V(0, 0, -0.4)); add(perno, new THREE.BoxGeometry(1.5, 0.1, 0.035), c1, V(0, -0.045, -0.8));
  ombre(g, { fa: true, riceve: false });
  return { group: g, cofano(k) { perno.rotation.x = 1.2 * M.clamp(k); vano.visible = k > 0.02; } };
}

export function fuoriSet() {
  const r = rnd(131), scene = new THREE.Scene(); scene.background = new THREE.Color('#060A13'); scene.fog = new THREE.Fog('#060A13', 45, 120);
  const cam = G.camera(30, 0.05, 240); scene.add(cam);
  const amb = new THREE.Group(); scene.add(amb);                                   // riceve le ombre
  const fuori = new THREE.Group(); scene.add(fuori);                               // non le riceve
  const box = (w, h, d, m, pos, p = amb) => add(p, new THREE.BoxGeometry(w, h, d), m, pos);

  // ---------------------------------------------------------------- parcheggio: asfalto bagnato, strisce, marciapiede
  const GX = 2, GZ = 18, GL = 44, px = 2048 / GL, X = (x) => (x - (GX - GL / 2)) * px, Z = (z) => (z - (GZ - GL / 2)) * px;
  const asfalto = tex(2048, 2048, (c, w, h) => {
    c.fillStyle = '#242A35'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '120,130,150' : '0,0,0'},${r(0.03, 0.1)})`; c.fillRect(r() * w, r() * h, r(1, 3), r(1, 3)); }
    for (let i = 0; i < 46; i++) { const x = r() * w, y = r() * h, g = c.createRadialGradient(x, y, 0, x, y, r(40, 150)); g.addColorStop(0, 'rgba(70,90,125,0.22)'); g.addColorStop(1, 'rgba(70,90,125,0)'); c.fillStyle = g; c.save(); c.translate(x, y); c.scale(1, r(0.35, 0.8)); c.translate(-x, -y); c.beginPath(); c.arc(x, y, 150, 0, 7); c.fill(); c.restore(); }
    c.strokeStyle = 'rgba(205,205,195,0.55)'; c.lineWidth = 0.12 * px; c.lineCap = 'butt';
    for (const [z0, z1] of [[9.2, 14.2], [17.2, 22.2]]) { for (let x = -11.6; x <= 15.5; x += 2.6) { c.beginPath(); c.moveTo(X(x), Z(z0)); c.lineTo(X(x), Z(z1)); c.stroke(); }
      c.beginPath(); c.moveTo(X(-11.6), Z(z0 < 12 ? z0 : z1)); c.lineTo(X(14.4), Z(z0 < 12 ? z0 : z1)); c.stroke(); }
    for (let i = 0; i < 70; i++) { c.strokeStyle = `rgba(0,0,0,${r(0.15, 0.4)})`; c.lineWidth = r(1, 3); c.beginPath(); const x = r() * w, y = r() * h; c.moveTo(x, y); c.bezierCurveTo(x + r(-60, 60), y + r(-60, 60), x + r(-90, 90), y + r(-90, 90), x + r(-140, 140), y + r(-140, 140)); c.stroke(); }
  });
  const terra = add(amb, new THREE.PlaneGeometry(GL, GL), mat(0xffffff, { map: asfalto }), V(GX, 0, GZ)); terra.rotation.x = -Math.PI / 2;
  const lontano = add(fuori, new THREE.PlaneGeometry(260, 200), mat('#12151B'), V(0, -0.02, 60)); lontano.rotation.x = -Math.PI / 2;
  box(22, 0.16, 2.3, mat('#4C4F55'), V(0, 0.08, 1.15)); box(22, 0.2, 0.16, mat('#6A6D72'), V(0, 0.1, 2.38));
  // siepe e muretto in fondo, qualche auto ferma
  box(40, 0.5, 0.3, mat('#3B3D42'), V(2, 0.25, 27)); for (let i = 0; i < 14; i++) add(amb, sfera(1, 12), mat(mix('#16261C', '#0E1A14', r())), V(-16 + i * 2.9 + r(-0.4, 0.4), 1.0, 27.6), [1.7, r(0.8, 1.2), 0.8]);
  const ferme = [['#20242C', -3.2, 11.6, Math.PI], ['#3A1F1F', 9.9, 11.7, Math.PI], ['#1C2A3A', -8.4, 19.7, 0], ['#2A2C2F', 1.9, 19.8, 0], ['#14161A', 12.4, 19.6, 0]].map(([col, x, z, ry]) => { const a = auto(col); a.group.position.set(x, 0, z); a.group.rotation.y = ry; amb.add(a.group); return a; });
  const grigia = auto('#787D85'); grigia.group.position.set(...AUTO); grigia.group.rotation.y = Math.PI / 2; scene.add(grigia.group);   // muso a +x, coda verso il lampione

  // ---------------------------------------------------------------- lampione con il cono di luce
  const ferro = mat('#2A2E35');
  add(amb, new THREE.CylinderGeometry(0.06, 0.09, LAMP[1], 12), ferro, V(LAMP[0] - 1.5, LAMP[1] / 2, LAMP[2] - 0.5)); tra(amb, V(LAMP[0] - 1.5, LAMP[1], LAMP[2] - 0.5), V(LAMP[0], LAMP[1] + 0.12, LAMP[2]), 0.045, 0.04, ferro);
  box(0.5, 0.1, 0.24, ferro, V(LAMP[0], LAMP[1] + 0.1, LAMP[2])); add(fuori, new THREE.PlaneGeometry(0.42, 0.18), basic('#FFE7B8'), V(LAMP[0], LAMP[1] + 0.045, LAMP[2])).rotation.x = Math.PI / 2;
  const alLamp = new THREE.Sprite(macchia('#FFC27A', 0.9)); alLamp.position.set(LAMP[0], LAMP[1], LAMP[2]); alLamp.scale.set(2.6, 2.6, 1); scene.add(alLamp);
  const cono = add(fuori, new THREE.ConeGeometry(4.3, LAMP[1], 40, 1, true), new THREE.MeshBasicMaterial({ color: '#FFC98A', transparent: true, opacity: 0.055, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    map: tex(8, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0.15)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }) }), V(LAMP[0], LAMP[1] / 2, LAMP[2] + 0.25));
  const pozza = add(fuori, new THREE.PlaneGeometry(11, 11), macchia('#FFAE5C', 0.32), V(LAMP[0], 0.02, LAMP[2] + 0.4)); pozza.rotation.x = -Math.PI / 2;
  const SP = new THREE.SpotLight('#FFC68A', 15, 34, 0.74, 0.8, 1.0); SP.position.set(...LAMP); SP.target.position.set(LAMP[0], 0, LAMP[2] + 0.5); scene.add(SP, SP.target);
  SP.castShadow = true; SP.shadow.mapSize.set(2048, 2048); SP.shadow.camera.near = 1.5; SP.shadow.camera.far = 14; SP.shadow.bias = -0.0008; SP.shadow.normalBias = 0.03; SP.shadow.radius = 4;

  // ---------------------------------------------------------------- il palazzo: facciata, finestre spente, balconi
  const muro = mat('#9C9284'), muro2 = mat('#857C6F'), telaio = mat('#C9C6BD');
  const wy0 = FY + 0.9, wy1 = FY + 2.3, wx0 = WX - 0.6, wx1 = WX + 0.6, HT = 18.7;
  const rect = (x0, x1, y0, y1, m = muro, z = 0, p = amb) => add(p, new THREE.PlaneGeometry(x1 - x0, y1 - y0), m, V((x0 + x1) / 2, (y0 + y1) / 2, z));
  rect(-9, wx0, 0, HT); rect(wx1, 9, 0, HT); rect(wx0, wx1, 0, wy0); rect(wx0, wx1, wy1, HT);
  for (let f = 1; f <= 6; f++) box(18.1, 0.12, 0.09, muro2, V(0, 3 * f, 0.04)); box(18.4, 0.55, 0.36, muro2, V(0, HT + 0.25, 0.05)); box(18.1, 0.5, 0.07, muro2, V(0, 0.25, 0.03));
  const vetro = (tipo) => basic(0xffffff, { map: tex(128, 160, (c, w, h) => {
    if (tipo === 0) { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0B111D'); g.addColorStop(0.5, '#182236'); g.addColorStop(0.56, '#0E1524'); g.addColorStop(1, '#0A0F1A'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
    else if (tipo === 1) { c.fillStyle = '#474B55'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2E313A'; c.lineWidth = 2; for (let y = 4; y < h; y += 9) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } }
    else { c.fillStyle = '#0B111D'; c.fillRect(0, 0, w, h); c.fillStyle = '#2A3448'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w * 0.42, 0); c.quadraticCurveTo(w * 0.3, h * 0.6, w * 0.08, h); c.lineTo(0, h); c.fill(); c.beginPath(); c.moveTo(w, 0); c.lineTo(w * 0.62, 0); c.quadraticCurveTo(w * 0.7, h * 0.6, w * 0.94, h); c.lineTo(w, h); c.fill(); }
    c.strokeStyle = '#B9B6AD'; c.lineWidth = 5; c.strokeRect(2, 2, w - 4, h - 4); if (tipo !== 1) { c.lineWidth = 3; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke(); } }) });
  const V3 = [vetro(0), vetro(1), vetro(2)];
  const ringhiera = new THREE.MeshLambertMaterial({ color: '#2B2F36', transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, map: tex(256, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(0, 0, w, 9); c.fillRect(0, h - 8, w, 8); for (let x = 3; x < w; x += 15) c.fillRect(x, 0, 4, h); }) });
  for (const x of [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]) for (let f = 1; f <= 5; f++) {
    const y = 3 * f, balc = Math.abs(x) === 4.5;
    if (x === WX && f === 4) continue;
    if (balc) { rect(x - 0.5, x + 0.5, y + 0.05, y + 2.25, V3[r() < 0.5 ? 1 : 0], 0.012, fuori); box(2.5, 0.14, 1.1, muro2, V(x, y - 0.02, 0.55));
      const fr = add(fuori, new THREE.PlaneGeometry(2.5, 1.0), ringhiera, V(x, y + 0.55, 1.08)); for (const s of [-1, 1]) { const sd = add(fuori, new THREE.PlaneGeometry(1.06, 1.0), ringhiera, V(x + s * 1.24, y + 0.55, 0.55)); sd.rotation.y = Math.PI / 2; } }
    else { rect(x - 0.6, x + 0.6, y + 0.9, y + 2.3, V3[Math.floor(r(0, 3))], 0.012, fuori); box(1.36, 0.05, 0.16, telaio, V(x, y + 0.88, 0.07)); }
  }
  // piano terra: portone con la pensilina e una luce debole, finestre con le grate
  box(1.5, 2.4, 0.08, mat('#3A2A20'), V(-1.5, 1.2, 0.03)); box(2.2, 0.1, 1.0, muro2, V(-1.5, 2.65, 0.5)); add(fuori, sfera(0.07, 10), basic('#FFE2A8'), V(-1.5, 2.52, 0.6));
  const alPort = new THREE.Sprite(macchia('#FFD08A', 0.5)); alPort.position.set(-1.5, 2.4, 0.7); alPort.scale.set(1.8, 1.8, 1); scene.add(alPort);
  for (const x of [-7.5, -4.5, 1.5, 4.5, 7.5]) rect(x - 0.6, x + 0.6, 1.1, 2.3, V3[1], 0.012, fuori);
  // città lontana (si vede dalla cucina guardando fuori)
  const citta = add(fuori, new THREE.PlaneGeometry(240, 60), basic(0xffffff, { fog: false, map: tex(1024, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#070B14'); g.addColorStop(1, '#101829'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 44; i++) { const x = r() * w, bw = r(16, 60), bh = r(40, 150); c.fillStyle = mix('#0A0F1A', '#141C2C', r()); c.fillRect(x, h - bh, bw, bh); for (let k = 0; k < bh * bw / 420; k++) if (r() < 0.16) { c.fillStyle = r() < 0.7 ? 'rgba(255,214,140,0.8)' : 'rgba(170,200,255,0.7)'; c.fillRect(x + 3 + Math.floor(r() * (bw - 8) / 6) * 6, h - bh + 5 + Math.floor(r() * (bh - 10) / 8) * 8, 3, 4); } } }) }), V(0, 22, 95)); citta.rotation.y = Math.PI;

  // ---------------------------------------------------------------- la tua cucina (origine: sotto la finestra, sul pavimento)
  const K = new THREE.Group(); K.position.set(WX, FY, 0); scene.add(K);
  const kb = (w, h, d, m, pos) => add(K, new THREE.BoxGeometry(w, h, d), m, pos);
  const KX = 1.7, KZ = -3.75, KH = 2.7, pm = mat('#E7DDC6'), pm2 = mat('#D8CDB4');
  const kfl = add(K, new THREE.PlaneGeometry(2 * KX, -KZ), mat(0xffffff, { map: tex(256, 256, (c, w, h) => { c.fillStyle = '#B7A68C'; c.fillRect(0, 0, w, h); c.fillStyle = '#A8977E'; c.fillRect(0, 0, w / 2, h / 2); c.fillRect(w / 2, h / 2, w / 2, h / 2); c.strokeStyle = '#8E7F69'; c.lineWidth = 3; c.strokeRect(0, 0, w / 2, h / 2); c.strokeRect(w / 2, h / 2, w / 2, h / 2); c.strokeRect(0, 0, w, h); }, [4, 4]) }), V(0, 0.005, KZ / 2)); kfl.rotation.x = -Math.PI / 2;
  const ksf = add(K, new THREE.PlaneGeometry(2 * KX, -KZ), mat('#EDE6D4'), V(0, KH, KZ / 2)); ksf.rotation.x = Math.PI / 2;
  add(K, new THREE.PlaneGeometry(2 * KX, KH), pm, V(0, KH / 2, KZ));
  const kl = add(K, new THREE.PlaneGeometry(-KZ, KH), pm, V(-KX, KH / 2, KZ / 2)); kl.rotation.y = Math.PI / 2; const kr = add(K, new THREE.PlaneGeometry(-KZ, KH), pm, V(KX, KH / 2, KZ / 2)); kr.rotation.y = -Math.PI / 2;
  // parete della finestra vista da dentro (a pezzi intorno al vano), telaio bianco, davanzale
  const dentro = (x0, x1, y0, y1) => { const p = add(K, new THREE.PlaneGeometry(x1 - x0, y1 - y0), pm2, V((x0 + x1) / 2, (y0 + y1) / 2, -0.16)); p.rotation.y = Math.PI; };
  dentro(-KX, -0.6, 0, KH); dentro(0.6, KX, 0, KH); dentro(-0.6, 0.6, 0, 0.9); dentro(-0.6, 0.6, 2.3, KH);
  for (const s of [-1, 1]) kb(0.06, 1.46, 0.2, telaio, V(s * 0.63, 1.6, -0.08)); kb(1.32, 0.06, 0.2, telaio, V(0, 2.33, -0.08)); kb(1.32, 0.06, 0.2, telaio, V(0, 0.87, -0.08)); kb(1.46, 0.045, 0.34, telaio, V(0, 0.862, 0.02));
  // tende: quella di sinistra raccolta, quella di destra si scosta (tenda 0..1)
  const cOff = new THREE.Color('#39414F'), cOn = new THREE.Color('#F0D29C');
  const tendaT = tex(128, 256, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) { const x = (i + 0.5) * w / 9, g = c.createLinearGradient(x - 8, 0, x + 8, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - 8, 0, 16, h); } });
  const tm = () => new THREE.MeshBasicMaterial({ map: tendaT, side: THREE.DoubleSide });
  const tS = add(K, new THREE.PlaneGeometry(0.34, 1.5), tm(), V(-0.47, 1.6, -0.2)), tD = add(K, new THREE.PlaneGeometry(1.0, 1.5), tm(), V(0.14, 1.6, -0.21));
  kb(1.5, 0.03, 0.03, mat('#6B5A45'), V(0, 2.4, -0.2));
  // mobili: piano di lavoro con lavello e ceppo dei coltelli, pensili, frigorifero con le calamite, tavolo e sedia, forno con l'orologio
  const bianco = mat('#DAD6CC'), legno = mat(0xffffff, { map: assi('#8A6442', 5, { vert: false, seme: 141, nodi: 0.2 }) }), acciaio = mat('#8D949B');
  kb(0.62, 0.86, 2.7, bianco, V(-1.38, 0.43, -1.8)); kb(0.66, 0.045, 2.74, legno, V(-1.37, 0.885, -1.8)); for (let i = 0; i < 4; i++) kb(0.012, 0.6, 0.02, acciaio, V(-1.065, 0.5, -0.75 - i * 0.68));
  kb(0.4, 0.02, 0.5, acciaio, V(-1.38, 0.9, -2.1)); tra(K, V(-1.6, 0.9, -2.1), V(-1.6, 1.12, -2.1), 0.014, 0.014, acciaio); tra(K, V(-1.6, 1.12, -2.1), V(-1.46, 1.1, -2.1), 0.012, 0.012, acciaio);
  const ceppo = kb(0.11, 0.2, 0.15, mat('#5B3E28'), V(-1.42, 1.0, -0.72)); ceppo.rotation.z = -0.25; for (let i = 0; i < 5; i++) kb(0.022, 0.1, 0.016, mat('#17181B'), V(-1.47 + 0.012 * (i % 2), 1.14, -0.78 + i * 0.03)).rotation.z = -0.25;
  kb(0.36, 0.7, 2.3, bianco, V(-1.51, 1.95, -1.95)); for (let i = 0; i < 3; i++) kb(0.012, 0.66, 0.012, pm2, V(-1.325, 1.95, -1.25 - i * 0.74));
  kb(0.64, 1.86, 0.64, mat('#E4E2DC'), V(-1.36, 0.93, -3.4)); kb(0.02, 0.5, 0.03, acciaio, V(-1.03, 1.3, -3.14));
  for (const [x, y, col] of [[-1.5, 1.5, '#D9483B'], [-1.3, 1.62, '#3B7AD9'], [-1.42, 1.36, '#E2B93B'], [-1.24, 1.44, '#4FA65B']]) kb(0.07, 0.07, 0.012, mat(col), V(x, y, -3.075));
  kb(0.82, 0.04, 0.82, legno, V(0.8, 0.74, -2.35)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) kb(0.05, 0.74, 0.05, mat('#6E4E34'), V(0.8 + sx * 0.36, 0.37, -2.35 + sz * 0.36));
  kb(0.42, 0.04, 0.42, mat('#6E4E34'), V(0.85, 0.45, -1.6)); kb(0.42, 0.5, 0.04, mat('#6E4E34'), V(0.85, 0.72, -1.41)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) kb(0.035, 0.45, 0.035, mat('#5E412B'), V(0.85 + sx * 0.18, 0.225, -1.6 + sz * 0.18));
  add(K, new THREE.CylinderGeometry(0.035, 0.03, 0.1, 14), mat('#E9E6DE'), V(0.7, 0.81, -2.3));
  // forno a incasso sulla parete di fondo con l'orologio verde
  kb(0.62, 0.86, 0.6, bianco, V(-0.6, 0.43, -3.44)); kb(0.5, 0.36, 0.02, mat('#16181C'), V(-0.6, 0.5, -3.135));
  const ora = add(K, new THREE.PlaneGeometry(0.2, 0.075), basic(0xffffff, { map: tex(160, 60, (c, w, h) => { c.fillStyle = '#050807'; c.fillRect(0, 0, w, h); c.fillStyle = '#5CFFB0'; c.font = '700 44px Display'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('02:47', w / 2, h / 2 + 3); }) }), V(-0.6, 0.76, -3.132));
  // la radiosveglia sul piano (02:47) e il vetro scuro quando la luce è spenta
  kb(0.11, 0.1, 0.24, mat('#16181C'), V(-1.28, 0.957, -1.32)); const ora2 = add(K, new THREE.PlaneGeometry(0.2, 0.075), ora.material, V(-1.223, 0.96, -1.32)); ora2.rotation.y = Math.PI / 2;
  const vetroB = add(K, new THREE.PlaneGeometry(1.2, 1.4), new THREE.MeshBasicMaterial({ color: '#070B14', transparent: true, opacity: 0, depthWrite: false }), V(0, 1.6, -0.05)); vetroB.renderOrder = 3;
  // porta verso il corridoio (buia)
  add(K, new THREE.PlaneGeometry(0.85, 2.05), basic('#0A0D14'), V(0.95, 1.025, KZ + 0.012)); for (const s of [-1, 1]) kb(0.06, 2.1, 0.05, mat('#C9BFA8'), V(0.95 + s * 0.455, 1.05, KZ + 0.03)); kb(0.97, 0.06, 0.05, mat('#C9BFA8'), V(0.95, 2.1, KZ + 0.03));
  // lampada a sospensione
  tra(K, V(0.1, KH, -1.85), V(0.1, 2.12, -1.85), 0.006, 0.006, mat('#222')); add(K, new THREE.ConeGeometry(0.2, 0.17, 28, 1, true), mat('#C9B48A', { side: THREE.DoubleSide }), V(0.1, 2.08, -1.85));
  const bulbo = add(K, sfera(0.045, 12), basic('#FFF2CC'), V(0.1, 2.0, -1.85));
  const alK = new THREE.Sprite(macchia('#FFD08A', 0.6)); alK.position.set(0.1, 2.0, -1.85); alK.scale.set(1.5, 1.5, 1); K.add(alK);
  const LK = new THREE.PointLight('#FFD9A6', 0, 9, 1.1); LK.position.set(0.1, 1.95, -1.85); K.add(LK);
  const LV = new THREE.PointLight('#FFD9A6', 0, 3, 1.4); LV.position.set(0, 1.75, 0.05); K.add(LV);       // riempimento sul viso quando sei alla finestra
  ombre(amb, { fa: false, riceve: true }); ombre(K, { fa: false, riceve: false });

  // ---------------------------------------------------------------- luci e personaggi
  const L = luci(scene, { amb: 0.3, fronte: 0.15, alto: 0, colore: 0x8fa6d8, ombre: false });
  const T = testimone(), R = ispettore(), E = elena(); scene.add(T.group, R.group, E.group);
  const tel = telefono(T, 'AR'); const LT = new THREE.PointLight('#CFE0FF', 0, 1.8, 1.3); scene.add(LT);
  const bic = add(T.AL.gH, new THREE.CylinderGeometry(0.034, 0.028, 0.115, 16), mat('#D5E6EC'), V(0, -0.075, -0.045)); bic.visible = false;      // il bicchiere d'acqua
  const LM = new THREE.PointLight('#8FB0F0', 0, 5, 1.2); LM.position.set(WX + 0.2, FY + 1.7, -1.5); scene.add(LM);                              // la luce della notte che entra dalla finestra
  const tmp = V(0, 0, 0), dir = V(0, 0, 0), cA = new THREE.Color();
  return { scene, camera: cam, bloom: 0, T, R, E, grigia,
    update(t, u, o = {}) {
      G.lookFrom(cam, o.cam || [WX, FY + 1.6, 0.5], o.look || ZUFFA, o.roll || 0); cam.fov = o.fov || 30; cam.updateProjectionMatrix(); L.segui(cam, o.look || ZUFFA);
      const k = M.clamp(o.cucina ?? 1), dn = o.interno ? 1 : 0;
      LK.intensity = 5.2 * k; LV.intensity = 1.1 * k; bulbo.material.color.set(k > 0.5 ? '#FFF2CC' : '#30343C'); alK.material.opacity = 0.6 * k;
      tS.material.color.copy(cOff).lerp(cOn, k); tD.material.color.copy(cOff).lerp(cOn, k);
      const td = M.clamp(o.tenda ?? 0), wT = 1.0 - 0.74 * td; tD.scale.x = wT; tD.position.x = 0.64 - 0.5 * wT;
      // luce d'ambiente: blu fuori; calda dentro con la luce accesa; quasi buio dentro a luce spenta
      L.A.color.copy(cA.set(dn && k > 0.5 ? 0xffe6c4 : 0x8fa6d8)); L.A.intensity = PI * (o.ambiente ?? (dn ? (k > 0.5 ? 0.42 : 0.2) : 0.3));
      L.F.intensity = PI * (o.fronte ?? (dn ? (k > 0.5 ? 0.3 : 0.12) : 0.15));
      SP.intensity = 15 * (o.lampione ?? 1); cono.material.opacity = 0.055 * (o.lampione ?? 1);
      grigia.cofano(o.cofano || 0);
      T.pose(o.tu || { pos: [WX, FY, -0.55] });
      R.pose(o.riva || { pos: [ZUFFA[0] - 0.35, 0, ZUFFA[2]], yaw: Math.PI / 2 });
      const e = o.elena || { pos: [ZUFFA[0] + 0.35, 0, ZUFFA[2]], yaw: -Math.PI / 2 };
      const f = E.parti.fianchi, cade = M.clamp(e.cade || 0), sd = M.clamp(e.sdraiata || 0);      // prima della posa: le braccia «mondo» usano già il corpo ruotato
      f.rotation.set(-Math.PI / 2 * sd + 0.25 * cade, 0, -Math.PI / 2 * cade); f.position.y = 0.14 * cade;
      E.group.visible = !e.nascosta; E.pose(e);
      bic.visible = !!o.bicchiere; LM.intensity = dn ? 0.75 * (1 - k) : 0;
      vetroB.material.opacity = dn ? 0 : 0.9 * (1 - k); vetroB.visible = vetroB.material.opacity > 0.01;
      // telFuori: il telefono sta dal lato del dorso della mano (visto da fuori si vede il retro, con le dita dietro) e sporge sopra le dita
      const tk = M.clamp(o.telTu ?? 0); tel.g.visible = tk > 0; tel.g.position.set(0, o.telFuori ? -0.05 : 0, o.telFuori ? 0.062 : 0); T.group.updateMatrixWorld(true);
      tel.schermo.getWorldPosition(tmp); tel.schermo.getWorldDirection(dir); LT.position.copy(tmp).addScaledVector(dir, 0.24); LT.intensity = (o.telFuori ? 0.5 : 0.8) * tk;
    } };
}
