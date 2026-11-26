// La sala da pranzo della villa: tavola lunga apparecchiata per otto, candelabri, finestra con la luna e il pulviscolo.
// Sette posti con le mani degli invitati (le mani modellate approvate dall'utente, con le maniche), l'ottavo vuoto:
// in fondo alla tavola, con il segnaposto listato a lutto e una rosa secca sul piatto.
// Unità: metri, y in su. La tavola va lungo z: il capotavola vicino è +z, l'ottavo posto è in fondo (-z).
import * as G from '../lib/gl.js';
import { THREE, V, MAT, materiali, candela, pulviscolo, fascio, scriviCarta, rnd } from './look.js';
import { manoMesh, posaDaPupazzo, POLSO } from '../../cast/sets/mano_mesh.js';

export const TAVOLO = { y: 0.76, lungo: 3.4, largo: 1.1 };
// [x, z del piatto, angolo (gradi) della direzione dal piatto verso chi siede, nome]. Nel gruppo del posto: +z = verso chi siede,
// -z = verso il centro della tavola (segnaposto e bicchiere), +x = la sua destra.
export const POSTI = [
  [0, 1.48, 0, 'Leon'],
  [-0.33, 0.95, -90, 'Victor'], [0.33, 0.95, 90, 'Elena'],
  [-0.33, 0.0, -90, 'Marcus'], [0.33, 0.0, 90, 'Nora'],
  [-0.33, -0.95, -90, 'Adrian'], [0.33, -0.95, 90, 'Sophie'],
  [0, -1.48, 180, 'Clara'],
];
const R2 = Math.PI / 180;
export const OTTAVO = V(0, TAVOLO.y, -1.48);

function piatto(r, h, m) {                                  // un piatto girato al tornio: profilo (raggio, altezza) -> LatheGeometry
  const p = [[0, 0], [r * 0.62, 0], [r * 0.66, h * 0.25], [r * 0.7, h * 0.35], [r * 0.95, h * 0.85], [r, h], [r * 0.985, h * 1.06], [r * 0.93, h * 0.92], [r * 0.69, h * 0.5], [r * 0.6, h * 0.45], [0, h * 0.45]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.Mesh(new THREE.LatheGeometry(p, 64), m);
}
function filetto(r, h) { const t = new THREE.Mesh(new THREE.TorusGeometry(r * 0.985, 0.0016, 6, 96), MAT.oro); t.rotation.x = Math.PI / 2; t.position.y = h * 1.02; return t; }
function calice() {
  const g = new THREE.Group(), p = [[0, 0], [0.034, 0], [0.034, 0.003], [0.006, 0.006], [0.0035, 0.012], [0.0035, 0.085], [0.012, 0.095], [0.03, 0.115], [0.04, 0.15], [0.038, 0.19], [0.0372, 0.19], [0.0392, 0.15], [0.029, 0.116], [0.0115, 0.098], [0, 0.097]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(p, 40), MAT.vetro));
  const vino = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.099], [0.012, 0.1], [0.027, 0.117], [0.034, 0.135], [0, 0.135]].map(([x, y]) => new THREE.Vector2(x, y)), 32), MAT.vino); g.add(vino);
  return g;
}
function posata(tipo) {                                      // forchetta, coltello, cucchiaio: manico + testa, in argento
  const g = new THREE.Group(), man = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.11), MAT.argento); man.position.z = 0.055; g.add(man);
  if (tipo === 'coltello') { const l = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.0018, 0.1), MAT.argento); l.position.z = -0.05; g.add(l); }
  else if (tipo === 'forchetta') { const c = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.0025, 0.03), MAT.argento); c.position.z = -0.012; g.add(c);
    for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.0032, 0.0022, 0.04), MAT.argento); d.position.set(-0.0085 + i * 0.0057, 0, -0.045); g.add(d); } }
  else { const s = new THREE.Mesh(new THREE.SphereGeometry(0.02, 20, 12), MAT.argento); s.scale.set(1, 0.22, 1.45); s.position.z = -0.03; g.add(s); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
function segnaposto(nome, lutto) {                           // cartoncino piegato a tenda, il nome sul davanti
  const g = new THREE.Group(), tx = scriviCarta(nome, { lutto, seed: nome.length * 7 + 3 });
  const fronte = new THREE.MeshStandardMaterial({ map: tx.map, normalMap: tx.normalMap, roughness: 0.85, metalness: 0, envMapIntensity: 0.2 });
  const retro = new THREE.MeshStandardMaterial({ color: 0xE6DCC6, roughness: 0.9 });
  const W = 0.09, Hh = 0.046, a = 0.38;
  for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), fronte); p.position.set(0, Math.cos(a) * Hh / 2, s * Math.sin(a) * Hh / 2); p.rotation.x = -s * a; if (s < 0) p.rotation.y = Math.PI; p.castShadow = true; p.receiveShadow = true; g.add(p); }
  return g;
}
function rosaSecca(seed = 4) {                               // la rosa secca sul piatto vuoto: gambo, due foglie, bocciolo di petali scuri
  const r = rnd(seed), g = new THREE.Group();
  const petMat = new THREE.MeshStandardMaterial({ color: 0x4A1016, roughness: 0.75, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.3 });
  const foglia = new THREE.MeshStandardMaterial({ color: 0x3B3A22, roughness: 0.85, side: THREE.DoubleSide });
  const curva = new THREE.CatmullRomCurve3([V(0, 0.004, 0.11), V(0.004, 0.006, 0.05), V(-0.003, 0.008, -0.02), V(0, 0.012, -0.07)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 24, 0.0022, 8, false), foglia));
  for (const [z, s] of [[0.03, 1], [-0.01, -1]]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8, 0, Math.PI), foglia); f.scale.set(0.5, 0.12, 1); f.position.set(s * 0.012, 0.008, z); f.rotation.y = s * 0.7; g.add(f); }
  const testa = new THREE.Group(); testa.position.set(0, 0.016, -0.085); testa.rotation.x = -1.35; g.add(testa);
  for (let i = 0; i < 11; i++) { const k = i / 11, raggio = 0.01 + 0.012 * k, p = new THREE.Mesh(new THREE.SphereGeometry(raggio, 14, 10, 0, Math.PI * (0.9 + 0.3 * r()), 0, Math.PI * 0.55), petMat);
    p.rotation.set(0.3 + 0.5 * k + r(-0.15, 0.15), i * 2.39996, r(-0.2, 0.2)); p.scale.set(1, 0.9 + 0.4 * k, 0.55 + 0.4 * k); testa.add(p); }
  for (const [x, z, a] of [[0.05, 0.03, 1.1], [-0.045, -0.04, 2.6]]) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8, 0, Math.PI * 1.1, 0, Math.PI * 0.4), petMat); p.position.set(x, 0.0025, z); p.rotation.set(Math.PI, a, 0); p.scale.set(1, 0.25, 0.8); g.add(p); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function sedia(alta = 1.15) {                                 // sedia col dorso alto, legno scuro e seduta imbottita
  const g = new THREE.Group(), m = MAT.sedia, stoffa = new THREE.MeshStandardMaterial({ color: 0x3A0E12, roughness: 0.92 });
  const box = (w, h, d, x, y, z, mm = m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mm); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  for (const [x, z] of [[-0.21, -0.2], [0.21, -0.2], [-0.21, 0.2], [0.21, 0.2]]) box(0.04, 0.46, 0.04, x, 0.23, z);
  box(0.48, 0.05, 0.46, 0, 0.47, 0); box(0.44, 0.04, 0.42, 0, 0.51, 0, stoffa);
  for (const x of [-0.21, 0.21]) box(0.045, alta - 0.46, 0.04, x, 0.46 + (alta - 0.46) / 2, 0.2);
  box(0.46, 0.09, 0.05, 0, alta - 0.03, 0.2); box(0.34, 0.42, 0.025, 0, 0.82, 0.21, stoffa);
  return g;
}
// le mani di un invitato appoggiate sulla tavola, con le maniche: dita verso il centro della tavola, dorso in su
const PELLI = ['#E2B08E', '#C98F6B', '#EAC1A2', '#B27A55', '#E8B898', '#D9A583', '#F0C9AE'];
function mani(posto, { manica = 0x2B2E36, polsino = null, pelle = '#D9A583', unghia = '#E9C2B0', orologio = false, apri = 0.2, giu = 8 } = {}) {
  const [px, pz, ang] = posto, g = new THREE.Group(); g.position.set(px, 0, pz); g.rotation.y = ang * R2;
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, sheen: 0.4, sheenColor: new THREE.Color(0xFF9A80), sheenRoughness: 0.6, envMapIntensity: 0.35 });
  const fm = new THREE.MeshStandardMaterial({ color: manica, roughness: 0.88, metalness: 0, envMapIntensity: 0.2 });
  const a = giu * R2, dir = V(0, -Math.sin(a), Math.cos(a));            // l'avambraccio va verso chi siede e scende un poco oltre il bordo
  for (const lato of [1, -1]) {                                           // 1 = mano destra, -1 = sinistra (allo specchio)
    const m = manoMesh({ skin: pelle, unghia, livelli: 2, materiale: mat, avambraccio: { lungo: 0.3 / 1.1, gomito: 0.042 / 1.1 } });
    const P = { ...posaDaPupazzo('piatta') }; P.indice = { ...P.indice, mcp: 12 + 8 * apri, pip: 14, dip: 8 }; P.mignolo = { ...P.mignolo, mcp: 16, pip: 18 }; P.avambraccio = [Math.sin(a), -Math.cos(a), 0];
    m.userData.posa(P); m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // modello: dita -y, dorso +x, pollice -z  ->  posto: dita verso -z (il centro), dorso in su, pollice verso l'altra mano
    const X = new THREE.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, 1), V(lato, 0, 0)).scale(V(1.1, 1.1, 1.1)); X.setPosition(POLSO.clone().applyMatrix4(X).negate());
    m.matrixAutoUpdate = false; m.matrix.copy(X);
    const h = new THREE.Group(); h.add(m); h.position.set(lato * 0.215, TAVOLO.y + 0.024, 0.19); h.rotation.y = lato * 0.28; g.add(h);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.057, 0.34, 24, 1, true), fm); s.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().negate()); s.position.copy(dir).multiplyScalar(0.07 + 0.17); s.castShadow = true; s.receiveShadow = true; h.add(s);
    if (polsino) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.045, 0.028, 24, 1, true), new THREE.MeshStandardMaterial({ color: polsino, roughness: 0.7 })); c.quaternion.copy(s.quaternion); c.position.copy(dir).multiplyScalar(0.062); c.castShadow = true; h.add(c); }
    if (orologio && lato < 0) { const o = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 28), MAT.oro); o.position.copy(dir).multiplyScalar(0.035).add(V(0, 0.028, 0)); h.add(o);
      const v = new THREE.Mesh(new THREE.CircleGeometry(0.0135, 28), new THREE.MeshStandardMaterial({ color: 0xF2EEE4, roughness: 0.3 })); v.rotation.x = -Math.PI / 2; v.position.copy(o.position).add(V(0, 0.0045, 0)); h.add(v); }
  }
  return g;
}

export function salaSet({ mani: conMani = true } = {}) {
  materiali();
  const scene = new THREE.Scene(), cam = G.camera(38, 0.02, 60);
  scene.background = new THREE.Color(0x020306); scene.fog = new THREE.FogExp2(0x030408, 0.22); scene.environment = G.ENV; scene.environmentIntensity = 0.12;
  const T = TAVOLO, add = (geo, m, x, y, z, ombra = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = ombra; o.receiveShadow = true; scene.add(o); return o; };
  // pavimento, pareti, soffitto
  const pav = add(new THREE.PlaneGeometry(9, 11), MAT.pavimento, 0, 0, 0, false); pav.rotation.x = -Math.PI / 2; MAT.pavimento.map.repeat.set(4, 5); MAT.pavimento.normalMap.repeat.set(4, 5); MAT.pavimento.roughnessMap.repeat.set(4, 5);
  for (const t of [MAT.pavimento.map, MAT.pavimento.normalMap, MAT.pavimento.roughnessMap]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  for (const [x, z, ry, L] of [[-3, 0, Math.PI / 2, 11], [3, 0, -Math.PI / 2, 11], [0, -4.5, 0, 9], [0, 4.5, Math.PI, 9]]) {
    const w = add(new THREE.PlaneGeometry(L, 2.6), MAT.muro, x, 2.3, z, false); w.rotation.y = ry;
    const b = add(new THREE.BoxGeometry(L, 1.0, 0.04), MAT.boiserie, x, 0.5, z, false); b.rotation.y = ry; b.position.x -= Math.sin(ry) * 0.02; b.position.z -= Math.cos(ry) * 0.02;
  }
  const soff = add(new THREE.PlaneGeometry(9, 11), new THREE.MeshStandardMaterial({ color: 0x1A1612, roughness: 0.95 }), 0, 3.6, 0, false); soff.rotation.x = Math.PI / 2;
  // la finestra a sinistra (x = -3): vetro blu notte, montanti che fanno l'ombra a croce, tende rosse scure
  const fin = new THREE.Group(); fin.position.set(-2.97, 1.75, -0.6); scene.add(fin);
  const vetro = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), new THREE.MeshBasicMaterial({ color: 0x223A66, toneMapped: true })); vetro.rotation.y = Math.PI / 2; fin.add(vetro);
  for (const [w, h, y, z] of [[0.08, 2.3, 0, -0.62], [0.08, 2.3, 0, 0.62], [0.08, 2.3, 0, 0], [1.3, 0.08, 1.12, 0], [1.3, 0.08, -1.12, 0], [1.3, 0.06, 0.38, 0], [1.3, 0.06, -0.38, 0]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, h, w > 1 ? w : 0.07), MAT.boiserie); b.position.set(0.02, y, z); b.castShadow = true; fin.add(b); }
  for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 2.7, 16, 1), MAT.tenda); const p = t.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.04 * Math.sin(p.getX(i) * 40)); t.geometry.computeVertexNormals();
    t.rotation.y = Math.PI / 2; t.position.set(0.08, 0.05, s * 0.9); fin.add(t); }
  // la luna: luce fredda dalla finestra che fa l'ombra dei montanti sulla tavola
  const luna = new THREE.DirectionalLight(0x9DB8FF, 0.75); luna.position.set(-5.4, 4.1, -1.2); luna.target.position.set(0.1, T.y, -0.2); scene.add(luna, luna.target);
  luna.castShadow = true; luna.shadow.mapSize.set(2048, 2048); const sc = luna.shadow.camera; sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3; sc.near = 1; sc.far = 14; luna.shadow.bias = -0.0004; luna.shadow.normalBias = 0.02;
  scene.add(new THREE.HemisphereLight(0x22304A, 0x0A0705, 0.1));
  fascio(scene, { da: V(-2.9, 2.5, -0.65), a: V(0.2, T.y + 0.02, -0.15), largo0: 0.55, largo1: 0.75, colore: 0x8FB0FF, forza: 0.055 });
  const polvere = pulviscolo(scene, { n: 700, centro: V(-1.25, 1.55, -0.45), lungo: V(1.45, -0.75, 0.25), largo: 0.7, alto: 0.55, colore: 0xC8DAFF, dim: 0.01 });
  // la tavola: piano, tovaglia che scende ai lati, gambe
  add(new THREE.BoxGeometry(T.largo, 0.05, T.lungo), MAT.tavolo, 0, T.y - 0.025, 0);
  const tov = add(new THREE.BoxGeometry(T.largo + 0.02, 0.004, T.lungo + 0.02), MAT.tovaglia, 0, T.y + 0.002, 0); tov.castShadow = false;
  for (const [x, z] of [[-0.48, -1.6], [0.48, -1.6], [-0.48, 1.6], [0.48, 1.6]]) add(new THREE.BoxGeometry(0.08, T.y - 0.05, 0.08), MAT.tavolo, x, (T.y - 0.05) / 2, z);
  // gli otto posti
  const segna = [], sedie = [];
  POSTI.forEach(([x, z, yaw, nome], i) => {
    const g = new THREE.Group(); g.position.set(x, T.y + 0.004, z); g.rotation.y = yaw * R2; scene.add(g);
    const sotto = piatto(0.165, 0.012, MAT.porcellana); sotto.castShadow = true; sotto.receiveShadow = true; g.add(sotto); g.add(filetto(0.165, 0.012));
    const sopra = piatto(0.125, 0.018, MAT.porcellana); sopra.position.y = 0.006; sopra.castShadow = true; sopra.receiveShadow = true; g.add(sopra);
    const f = posata('forchetta'); f.position.set(-0.2, 0.002, 0); f.rotation.y = 0; g.add(f);
    const k = posata('coltello'); k.position.set(0.2, 0.002, 0); g.add(k); const cu = posata('cucchiaio'); cu.position.set(0.235, 0.002, 0); g.add(cu);
    const c = calice(); c.position.set(0.17, 0.0, -0.2); g.add(c);
    const sp = segnaposto(nome, i === 7); sp.position.set(0, 0.0, -0.205); sp.rotation.y = Math.PI; g.add(sp); segna.push(sp);
    const se = sedia(); const d = i === 0 || i === 7 ? 0.5 : 0.58; se.position.set(x + Math.sin(yaw * R2) * d, 0, z + Math.cos(yaw * R2) * d); se.rotation.y = yaw * R2; scene.add(se); sedie.push(se);
  });
  const sp = new THREE.SpotLight(0x8FA8E8, 1.6, 5, 0.42, 0.6, 1.5); sp.position.set(-0.9, 2.6, -2.9); sp.target.position.set(0, 0.95, -1.98); scene.add(sp, sp.target);
  const rosa = rosaSecca(); rosa.position.set(OTTAVO.x - 0.01, T.y + 0.025, OTTAVO.z + 0.02); rosa.rotation.y = 0.5; scene.add(rosa);
  // i candelabri: tre al centro della tavola (una luce sola per candelabro, le fiamme sono tutte vere)
  const candele = [];
  for (const [z, s] of [[-0.42, 1], [0.48, 3]]) {
    const base = new THREE.Group(); base.position.set(0, T.y, z); scene.add(base);
    const fusto = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.065, 0.01], [0.03, 0.03], [0.012, 0.06], [0.016, 0.2], [0.01, 0.26], [0.02, 0.28], [0, 0.29]].map(([x, y]) => new THREE.Vector2(x, y)), 32), MAT.ottone); fusto.castShadow = true; base.add(fusto);
    for (const [dx, dz, h] of [[0, 0, 0.3], [-0.12, 0, 0.24], [0.12, 0, 0.24]]) {
      if (dx) { const br = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 8, 24, Math.PI), MAT.ottone); br.position.set(dx / 2, 0.2, dz); br.rotation.z = dx > 0 ? 0 : 0; br.scale.set(1, 0.6, 1); base.add(br);
        const pi = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.025, 16), MAT.ottone); pi.position.set(dx, h - 0.012, dz); base.add(pi); }
      candele.push(candela(base, V(dx, h, dz), { alta: 0.17 + 0.03 * ((s + dx * 10) % 2), r: 0.011, luce: 0.16, seed: s * 10 + (dx > 0 ? 2 : dx < 0 ? 1 : 0), conLuce: dx === 0 }));
    }
  }
  // la candela davanti all'ottavo posto (luce sua, per il primo piano del segnaposto)
  const cOtto = candela(scene, V(0.21, T.y + 0.004, -1.24), { alta: 0.13, r: 0.014, luce: 0.045, seed: 77 }); candele.push(cOtto);
  const ottone = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.01, 24), MAT.ottone); ottone.position.set(0.21, T.y + 0.007, -1.24); scene.add(ottone);
  // le mani dei sette invitati (Leon, che racconta, è il capotavola vicino: le sue mani entrano solo nelle sue inquadrature)
  const ABITI = [{ manica: 0x2A2C31, pelle: PELLI[5] },                                          // Leon (racconta): giacca scura
    { manica: 0x3B3F46, polsino: 0xE8E6E0, pelle: PELLI[0], anello: true },                 // Victor, medico: giacca grigia, camicia bianca
    { manica: 0x121214, polsino: 0xF1EEE8, pelle: PELLI[2], unghia: '#9E1E2A' },             // Elena, avvocata: nero, smalto rosso
    { manica: 0x4A3324, pelle: PELLI[3], unghia: '#C99C86' },                                  // Marcus, ex poliziotto: giubbotto di pelle marrone
    { manica: 0x2F4A3C, pelle: PELLI[4] },                                                    // Nora, giornalista: maglione verde
    { manica: 0x1B2236, polsino: 0xDDE2EA, pelle: PELLI[1], orologio: true },                  // Adrian, imprenditore: blu, orologio d'oro
    { manica: 0x6B1D22, pelle: PELLI[6], unghia: '#E7B9A8' },                                  // Sophie: maglia bordeaux
  ];
  if (conMani) for (let i = 0; i <= 6; i++) scene.add(mani(POSTI[i], ABITI[i]));
  return {
    scene, camera: cam, bloom: 0.7, bloomThreshold: 1.3, bloomRadius: 0.5, segna, candele, polvere, sedie, luna, rosa, fin,
    update(t, u, o = {}) {
      G.R.toneMappingExposure = 1.22; cam.position.set(...(o.cam || [0, 2.2, 2.6])); cam.up.set(...(o.up || [0, 1, 0])).normalize(); cam.lookAt(...(o.look || [0, T.y, 0]));
      if (o.fov) { cam.fov = o.fov; cam.updateProjectionMatrix(); }
      for (const c of candele) c.update(t, cam);
      polvere.update(t);
    },
  };
}
