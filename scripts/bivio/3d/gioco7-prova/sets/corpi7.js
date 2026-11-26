// I sette a corpo intero (episodio 1): il busto approvato (testa, occhi, capelli: personaggi.js) e il corpo con vestiti e scarpe veri
// (personaggi/corpi_sette.py), tutti e due mossi dalle STESSE ossa (personaggi/ossa7.py) con lo skinning a quattro pesi, fatto qui sulla CPU
// a ogni cambio di posa. Le pose: dove sta il bacino, quanto si piega la schiena, dove va la testa, e per le braccia e le gambe il punto
// d'arrivo (polso, caviglia) con un IK a due ossa, più il palmo della mano (in giù sul tavolo, ecc.).
// Unità: metri; il personaggio guarda +z, la sua sinistra è +x (lato «S»).
import { THREE, V } from './look.js';
import { busto, STILI } from './personaggi.js';
import { manoMesh, posaDaPupazzo, POLSO } from '../../cast/sets/mano_mesh.js';

const BASE = new URL('../personaggi/dati/', import.meta.url).href;
const carica = (url, colore) => new Promise((ok) => new THREE.TextureLoader().load(url, (t) => { t.colorSpace = colore ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; ok(t); }, undefined, () => ok(null)));
async function leggi(nome) {
  const [j, b] = await Promise.all([fetch(BASE + nome + '_corpo.json').then((r) => r.json()), fetch(BASE + nome + '_corpo.bin').then((r) => r.arrayBuffer())]);
  let o = 0; const pezzo = (T, n) => { const a = new T(b, o, n); o += n * T.BYTES_PER_ELEMENT; return a; };
  return { ...j, pos: pezzo(Float32Array, j.punti * 3), uv: pezzo(Float32Array, j.vertici * 2), rv: pezzo(Uint32Array, j.vertici), idx: pezzo(Uint32Array, j.indici), ji: pezzo(Uint8Array, j.punti * 4), jw: pezzo(Uint8Array, j.punti * 4) };
}

// ---- lo skinning: posizioni e normali di riposo -> in posa, con le matrici delle ossa (Float32Array nb*16)
function pelle(pos, nor, ji, jw, E, outP, outN) {
  const n = pos.length / 3;
  for (let v = 0; v < n; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2], nx = nor[v * 3], ny = nor[v * 3 + 1], nz = nor[v * 3 + 2]; let X = 0, Y = 0, Z = 0, NX = 0, NY = 0, NZ = 0;
    for (let j = 0; j < 4; j++) { const w = jw[v * 4 + j] / 255; if (!w) continue; const e = ji[v * 4 + j] * 16;
      X += w * (E[e] * x + E[e + 4] * y + E[e + 8] * z + E[e + 12]); Y += w * (E[e + 1] * x + E[e + 5] * y + E[e + 9] * z + E[e + 13]); Z += w * (E[e + 2] * x + E[e + 6] * y + E[e + 10] * z + E[e + 14]);
      NX += w * (E[e] * nx + E[e + 4] * ny + E[e + 8] * nz); NY += w * (E[e + 1] * nx + E[e + 5] * ny + E[e + 9] * nz); NZ += w * (E[e + 2] * nx + E[e + 6] * ny + E[e + 10] * nz); }
    outP[v * 3] = X; outP[v * 3 + 1] = Y; outP[v * 3 + 2] = Z; const k = 1 / (Math.hypot(NX, NY, NZ) || 1); outN[v * 3] = NX * k; outN[v * 3 + 1] = NY * k; outN[v * 3 + 2] = NZ * k;
  }
}
function normaliPunti(P, idx, rv, np) {                     // normali lisce sui punti (una per posizione: niente cuciture degli uv)
  const N = new Float32Array(np * 3);
  for (let i = 0; i < idx.length; i += 3) { const a = rv[idx[i]] * 3, b = rv[idx[i + 1]] * 3, c = rv[idx[i + 2]] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; for (const q of [a, b, c]) { N[q] += nx; N[q + 1] += ny; N[q + 2] += nz; } }
  for (let i = 0; i < np; i++) { const k = 1 / (Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1); N[i * 3] *= k; N[i * 3 + 1] *= k; N[i * 3 + 2] *= k; }
  return N;
}

const Q = () => new THREE.Quaternion(), M4 = () => new THREE.Matrix4();
const daA = (a, b) => Q().setFromUnitVectors(a.clone().normalize(), b.clone().normalize());
const eul = (x = 0, y = 0, z = 0) => Q().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));
const D2R = Math.PI / 180;

// ---- il personaggio
export async function personaggio(nome, { tessuto = 1 } = {}) {
  const [C, T] = await Promise.all([leggi(nome), busto(nome, { intero: true })]);
  const nb = C.ossa.length, K = Object.fromEntries(C.ossa.map((n, i) => [n, i])), J = Object.fromEntries(Object.entries(C.giunti).map(([k, v]) => [k, V(...v)]));
  const g = new THREE.Group(); g.add(T);
  // il corpo: una maglia per parte, con la sua texture
  const PN = normaliPunti(C.pos, C.idx, C.rv, C.punti), outP = new Float32Array(C.punti * 3), outN = new Float32Array(C.punti * 3), parti = [];
  for (const p of C.parti) {
    const geo = new THREE.BufferGeometry(), pos = new THREE.BufferAttribute(new Float32Array(p.nr * 3), 3), nrm = new THREE.BufferAttribute(new Float32Array(p.nr * 3), 3);
    geo.setAttribute('position', pos); geo.setAttribute('normal', nrm); geo.setAttribute('uv', new THREE.BufferAttribute(C.uv.slice(p.r0 * 2, (p.r0 + p.nr) * 2), 2));
    const idx = new Uint32Array(p.ni); for (let i = 0; i < p.ni; i++) idx[i] = C.idx[p.i0 + i] - p.r0; geo.setIndex(new THREE.BufferAttribute(idx, 1));
    let m;
    if (p.tipo === 'pelle') m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(C.pelle).multiplyScalar(0.92), roughness: 0.55, sheen: 0.35, sheenColor: new THREE.Color(0xFFB09A), sheenRoughness: 0.5, envMapIntensity: 0.35 });
    else { const [map, nm] = await Promise.all([carica(BASE + p.texture, true), p.pieghe ? carica(BASE + p.pieghe, false) : null]);
      m = new THREE.MeshPhysicalMaterial({ map, normalMap: nm, normalScale: new THREE.Vector2(0.8 * tessuto, 0.8 * tessuto), roughness: p.tipo === 'scarpa' ? 0.45 : 0.88, sheen: p.tipo === 'scarpa' ? 0 : 0.45,
        sheenColor: new THREE.Color(0x8890A0), sheenRoughness: 0.6, envMapIntensity: 0.3, side: THREE.DoubleSide }); }
    const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);            // (la sfera di ingombro si rifà a ogni posa: fuori campo non si disegna)
    parti.push({ ...p, mesh, pos, nrm });
  }
  // il busto: posizioni e normali di riposo, i suoi pesi
  const bm = T.userData.corpo, bg = bm.geometry, bP0 = Float32Array.from(bg.attributes.position.array), bN0 = Float32Array.from(bg.attributes.normal.array);
  T.userData.rigida.traverse((o) => { if (o.isMesh && o.geometry.attributes.color) o.castShadow = false; });     // i capelli (pesanti) non fanno ombra alla luna
  const rigida = T.userData.rigida; rigida.matrixAutoUpdate = false;
  { const collo = STILI[nome].vestito.collo + 0.004, sm_ = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    for (let i = 0; i < bP0.length / 3; i++) { const k = 0.02 * sm_(collo, collo - 0.035, bP0[i * 3 + 1]); if (k > 0) for (let j = 0; j < 3; j++) bP0[i * 3 + j] -= bN0[i * 3 + j] * k; } }
  // le mani: la mano MODELLATA (quella approvata) su tutti e due i polsi, orientata come la mano del corpo (che si chiude dentro la manica)
  const pelleM = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, sheen: 0.4, sheenColor: new THREE.Color(0xFF9A80), sheenRoughness: 0.6, envMapIntensity: 0.35 });
  const MANI = {};
  for (const s of ['S', 'D']) { const m = manoMesh({ skin: new THREE.Color(C.pelle).multiplyScalar(0.95).getStyle(), unghia: '#E9C2B0', livelli: 2, materiale: pelleM });
    m.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; x.frustumCulled = false; } }); m.matrixAutoUpdate = false; g.add(m);
    m.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(m); MANI[s] = { m, L: POLSO.y - bb.min.y, posa: null }; m.userData.posa(posaDaPupazzo('piatta')); }

  // ---- lo scheletro: rotazioni locali (quaternioni) attorno ai giunti di riposo; mondo_b = mondo_padre · T(j) · R · T(-j)
  const R = C.ossa.map(() => Q()), W = C.ossa.map(() => M4()), E = new Float32Array(nb * 16), radice = M4();
  const giunto = (b) => J[b.replace(/^spalla(25|75)?/, 'brac1')] || J[b];
  function mondi() {
    const t1 = M4(), t2 = M4(), r = M4();
    C.ossa.forEach((b, i) => { const p = C.padri[i], j = giunto(b);
      t1.makeTranslation(j.x, j.y, j.z); t2.makeTranslation(-j.x, -j.y, -j.z); r.makeRotationFromQuaternion(R[i]);
      W[i].copy(p == null ? radice : W[K[p]]).multiply(t1).multiply(r).multiply(t2); });
  }
  const rotMondo = (b) => Q().setFromRotationMatrix(W[K[b]]);
  const qui = (b) => giunto(b).clone().applyMatrix4(W[K[b]]);                 // dov'è ora il giunto (con la posa attuale)
  const puntoOra = (nomeG, b) => J[nomeG].clone().applyMatrix4(W[K[b]]);
  // gira l'osso b in modo che la direzione di riposo «da» (nel riposo) vada verso «verso» (nel mondo), con la rotazione più corta
  function punta(b, da, verso) {
    const p = C.padri[K[b]], qp = p == null ? Q().setFromRotationMatrix(radice) : rotMondo(p);
    const locale = verso.clone().normalize().applyQuaternion(qp.clone().invert());
    R[K[b]].copy(daA(da, locale)); mondi();
  }
  // ruota l'osso b (in più) attorno all'asse «asse» del mondo
  function gira(b, asse, ang) {
    const p = C.padri[K[b]], qp = p == null ? Q().setFromRotationMatrix(radice) : rotMondo(p);
    const a = asse.clone().normalize().applyQuaternion(qp.clone().invert());
    R[K[b]].premultiply(Q().setFromAxisAngle(a, ang)); mondi();
  }
  // il palmo: la normale del palmo nel riposo (verso il corpo) e la direzione della mano (dal polso al medio)
  const palmoRiposo = (s) => { const lat = J['nocca2' + s].clone().sub(J['nocca5' + s]), av = J['nocca3' + s].clone().sub(J['mano' + s]); const n = lat.clone().cross(av).normalize(); return (s === 'S' ? -n.x : n.x) > 0 ? n : n.negate(); };
  // IK a due ossa: dalla spalla (o anca) al punto, il gomito (ginocchio) verso «polo»
  function ik(a, b, c, bersaglio, polo) {
    const S = qui(a), A = giunto(a), Bj = giunto(b), Cj = giunto(c);
    const l1 = A.distanceTo(Bj), l2 = Bj.distanceTo(Cj), d0 = bersaglio.clone().sub(S), d = THREE.MathUtils.clamp(d0.length(), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3), u = d0.clone().normalize();
    const ca = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    const n = polo.clone().sub(u.clone().multiplyScalar(polo.dot(u))).normalize(), gom = S.clone().add(u.clone().multiplyScalar(l1 * ca)).add(n.multiplyScalar(l1 * sa));
    punta(a, Bj.clone().sub(A), gom.clone().sub(S)); punta(b, Cj.clone().sub(Bj), S.clone().add(u.multiplyScalar(d)).sub(gom));
  }

  // ---- la posa
  // o = { dove: [x,y,z] del bacino nel mondo, giro: gradi (attorno a y), bacino: [x,y,z] gradi, schiena: [x,y,z] gradi (divisi sulle 5 vertebre),
  //       collo: [x,y,z] gradi (divisi su collo e testa), braccio: { S/D: { polso: [x,y,z] mondo, polo: [x,y,z], palmo: [x,y,z], dita: [x,y,z] } },
  //       gamba: { S/D: { caviglia: [x,y,z], polo: [x,y,z], punta: [x,y,z] } }, sguardo: [x,y,z] (dove guardano gli occhi), manoVia: 'S'|'D' }
  function posa(o = {}) {
    R.forEach((q) => q.identity());
    const j0 = J.bacino; radice.compose(V(...(o.dove || [j0.x, j0.y, j0.z])).sub(j0.clone().applyQuaternion(eul(0, (o.giro || 0) * D2R, 0))), eul(0, (o.giro || 0) * D2R, 0), V(1, 1, 1));
    mondi();
    if (o.bacino) { R[K.bacino].copy(eul(...o.bacino.map((x) => x * D2R))); mondi(); }
    if (o.schiena) { const s = o.schiena.map((x) => (x * D2R) / 5); for (const b of ['spina5', 'spina4', 'spina3', 'spina2', 'spina1']) R[K[b]].copy(eul(...s)); mondi(); }
    if (o.collo) { const parti_ = [['collo1', 0.2], ['collo2', 0.25], ['collo3', 0.2], ['testa', 0.35]]; for (const [b, f] of parti_) R[K[b]].copy(eul(...o.collo.map((x) => x * D2R * f))); mondi(); }
    for (const s of ['S', 'D']) {
      const gm = o.gamba && o.gamba[s];
      if (gm) { ik('coscia1' + s, 'gamba1' + s, 'piede' + s, V(...gm.caviglia), V(...(gm.polo || [0, 0.3, 1])).applyQuaternion(eul(0, (o.giro || 0) * D2R, 0)));
        if (gm.punta) punta('piede' + s, J['punta' + s].clone().sub(J['piede' + s]), V(...gm.punta).applyQuaternion(eul(0, (o.giro || 0) * D2R, 0))); }
      const br = o.braccio && o.braccio[s];
      if (br) {
        if (br.spalla) { R[K['clav' + s]].copy(eul(...br.spalla.map((x) => x * D2R))); mondi(); }
        ik('brac1' + s, 'ava1' + s, 'mano' + s, V(...br.polso), V(...(br.polo || [s === 'S' ? 1 : -1, -0.4, -0.6])).applyQuaternion(eul(0, (o.giro || 0) * D2R, 0)));
        for (const [t, k] of [['spalla25', 0.25], ['spalla', 0.5], ['spalla75', 0.75]]) R[K[t + s]].copy(Q().slerp(R[K['brac1' + s]], k));      // le tappe della spalla
        mondi();
        // la mano: verso «dita» col palmo verso «palmo»; il giro dell'avambraccio va metà nell'avambraccio (ava1, ava2) e il resto nel polso
        const dita = V(...(br.dita || [0, -0.25, 1])).normalize(), palmo = V(...(br.palmo || [0, -1, 0])).normalize();
        const av = puntoOra('mano' + s, 'ava2' + s).sub(qui('ava1' + s)).normalize();
        const pr = palmoRiposo(s).applyQuaternion(rotMondo('ava2' + s)), proj = (v) => v.clone().sub(av.clone().multiplyScalar(v.dot(av))).normalize();
        const a1 = proj(pr), a2 = proj(palmo); let th = Math.acos(THREE.MathUtils.clamp(a1.dot(a2), -1, 1)); if (a1.clone().cross(a2).dot(av) < 0) th = -th;
        gira('ava1' + s, av, th * 0.35); gira('ava2' + s, av, th * 0.45);
        // poi il polso: prima la direzione delle dita, poi il palmo attorno alle dita
        const qm = rotMondo('ava2' + s), d0 = J['nocca3' + s].clone().sub(J['mano' + s]).normalize().applyQuaternion(qm), qa = daA(d0, dita);
        const p1 = palmoRiposo(s).applyQuaternion(qm).applyQuaternion(qa), pj = (v) => v.clone().sub(dita.clone().multiplyScalar(v.dot(dita))).normalize();
        const b1 = pj(p1), b2 = pj(palmo); let th2 = Math.acos(THREE.MathUtils.clamp(b1.dot(b2), -1, 1)); if (b1.clone().cross(b2).dot(dita) < 0) th2 = -th2;
        const qtot = Q().setFromAxisAngle(dita, th2).multiply(qa), loc = qm.clone().invert().multiply(qtot).multiply(qm);
        R[K['mano' + s]].copy(loc); mondi();
      }
    }
    for (const s of ['S', 'D']) {                                     // la mano del corpo si chiude nel polso; quella modellata prende il suo posto
      const i = K['mano' + s], j = J['mano' + s], Wm = W[i].clone(), mh = MANI[s];
      const dita = J['nocca3' + s].clone().sub(j).transformDirection(Wm), lato = J['nocca2' + s].clone().sub(J['nocca5' + s]).transformDirection(Wm);
      const palmo = palmoRiposo(s).transformDirection(Wm), lungo = J['punta3' + s].distanceTo(j), sc = Math.min(1.25, Math.max(0.9, 1.1 * lungo / 0.19)) * (o.manoScala || 1.0);
      const pollice = lato.clone().sub(dita.clone().multiplyScalar(lato.dot(dita))).normalize(), dorso = palmo.clone().negate();
      const X = new THREE.Matrix4().makeBasis(dorso, dita.clone().negate(), pollice.clone().negate()).scale(V(sc, sc, sc)), polso = j.clone().applyMatrix4(Wm);
      X.setPosition(polso.sub(POLSO.clone().applyMatrix4(new THREE.Matrix4().makeBasis(dorso, dita.clone().negate(), pollice.clone().negate()).scale(V(sc, sc, sc)))));
      mh.m.matrix.copy(X); mh.m.matrixWorldNeedsUpdate = true; mh.m.visible = !(o.manoVia && [].concat(o.manoVia).includes(s));
      const pz = (o.mani && o.mani[s]) || 'piatta'; if (pz !== mh.posa) { mh.m.userData.posa(typeof pz === 'string' ? posaDaPupazzo(pz) : pz); mh.posa = pz; }
      W[i].multiply(M4().makeTranslation(j.x, j.y, j.z)).multiply(M4().makeScale(0.001, 0.001, 0.001)).multiply(M4().makeTranslation(-j.x, -j.y, -j.z));
    }
    for (let i = 0; i < nb; i++) E.set(W[i].elements, i * 16);
    // il corpo
    pelle(C.pos, PN, C.ji, C.jw, E, outP, outN);
    for (const p of parti) { const P = p.pos.array, N = p.nrm.array; for (let i = 0; i < p.nr; i++) { const q = C.rv[p.r0 + i] * 3; P[i * 3] = outP[q]; P[i * 3 + 1] = outP[q + 1]; P[i * 3 + 2] = outP[q + 2]; N[i * 3] = outN[q]; N[i * 3 + 1] = outN[q + 1]; N[i * 3 + 2] = outN[q + 2]; }
      p.pos.needsUpdate = true; p.nrm.needsUpdate = true; p.mesh.geometry.computeBoundingSphere(); }
    // il busto e la testa
    pelle(bP0, bN0, T.userData.ji, T.userData.jw, E, bg.attributes.position.array, bg.attributes.normal.array); bg.attributes.position.needsUpdate = true; bg.attributes.normal.needsUpdate = true; bg.computeBoundingSphere();
    rigida.matrix.copy(W[K.testa]); rigida.matrixWorldNeedsUpdate = true;
    if (o.sguardo) guarda(V(...o.sguardo));
  }
  // gli occhi guardano un punto del mondo (si girano nel loro alloggio; al massimo 35 gradi)
  function guarda(p) {
    g.updateMatrixWorld(true);
    for (const s of ['S', 'D']) { const e = T.userData['occhio' + s], loc = rigida.worldToLocal(p.clone()), c = e.position, d = loc.sub(c).normalize();
      // al massimo 28 gradi di lato e 14 in su/giù (oltre, l'iride sparisce sotto la palpebra)
      const yaw = THREE.MathUtils.clamp(Math.atan2(d.x, d.z), -28 * D2R, 28 * D2R), pit = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)), -14 * D2R, 12 * D2R);
      e.quaternion.setFromEuler(new THREE.Euler(-pit, yaw, 0, 'YXZ')); }
  }
  // il punto più basso del corpo in posa vicino a (cx, cz) (entro r in orizzontale): per sedersi sul cuscino
  function basso(cx, cz, r = 0.16) { let m = 1e9; for (let i = 0; i < C.punti; i++) { const x = outP[i * 3], z = outP[i * 3 + 2]; if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) m = Math.min(m, outP[i * 3 + 1]); } return m; }
  // il punto più avanti della superficie (vestiti compresi) vicino a (x, y), nella posa di riposo: per attaccare oggetti sul petto
  function davantiA(x, y, r = 0.012) { let b = null; for (let i = 0; i < C.punti; i++) { const px = C.pos[i * 3], py = C.pos[i * 3 + 1], pz = C.pos[i * 3 + 2]; if (Math.abs(px - x) < r && Math.abs(py - y) < r && (!b || pz > b[2])) b = [px, py, pz]; } return b; }
  const occhi = () => { const B = T.userData.B; return V((B.occhi.S[0] + B.occhi.D[0]) / 2, (B.occhi.S[1] + B.occhi.D[1]) / 2, (B.occhi.S[2] + B.occhi.D[2]) / 2 + 0.01).applyMatrix4(W[K.testa]); };
  posa({});
  return { g, posa, guarda, basso, MANI, davantiA, occhi, W, K, J, giunto: (b) => qui(b), punto: (nomeG, b) => puntoOra(nomeG, b), testa: () => W[K.testa], busto: T, C };
}
