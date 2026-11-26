// Il Bivio — «Il testimone», episodio 2: «La mano tesa» (ha vinto la B dell'episodio 1: non apri, e scappi dal balcone col telefono).
// Funzione pura del tempo, come l'episodio 1: ogni inquadratura è agganciata alle parole della voce (assets/parole.json; r(n) = inizio della
// riga n del copione, w(n, 'parola') = inizio di quella parola). Tre set: ingresso di casa, pianerottolo dallo spioncino, e fuori
// (fuoriSet con i balconi veri: il tuo, il divisorio di vetro retinato, quello dell'appartamento vuoto; sotto, il parcheggio con l'auto grigia).
// Regia «più creepy» (26/11): buio e controluce, lui lento e gentile, silenzi tenuti prima dei colpi, camera che si avvicina piano.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE } from './sets/stile.js';
import { fuoriSet, WX, FY, AUTO } from './sets/esterno_set.js';
import { BAL } from './sets/balcone.js';
import { ingressoSet, pianerottoloSet } from './sets/testimone_set.js';
import { battito } from './sets/pupazzi.js';

const { W, H, E, prog, lerp, clamp, font, bump } = M;
let SF = null, SI = null, SP = null, RIGHE = [], WORDS = [], CHUNKS = [], END = 130, BOCCA = [], DETTI = [], SEQ = [], IMG = {}, PT = { tasca: [6.95, 12.2, 0.5] };
let T0 = 0;
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z']/g, '');
const r = (n) => RIGHE[n - 1][0][0], rf = (n) => RIGHE[n - 1][RIGHE[n - 1].length - 1][1];
const w = (n, parola, fine = 0, quale = 0) => { const h = RIGHE[n - 1].filter((x) => norm(x[2]) === norm(parola)); const x = h[Math.min(quale, h.length - 1)]; return x ? x[fine] : r(n); };
function chunks(words, mx = 6) { const out = []; let cur = []; words.forEach((x, i) => { cur.push(x); if (/[.,:;?!…»]$/.test(x[2]) || cur.length >= mx || i === words.length - 1) { out.push(cur); cur = []; } }); return out; }
const v3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const su = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];
const io = E.inOutSine, sin = Math.sin;
const mixA = (A, B, k) => ({ a: v3(A.a, B.a, k), gomito: v3(A.gomito, B.gomito, k), dita: v3(A.dita, B.dita, k), dorso: v3(A.dorso, B.dorso, k), mano: k < 0.5 ? A.mano : B.mano });
const VOC = { a: [0.25, 0], e: [0.75, 0], i: [0.9, 0], o: [-0.2, 1], u: [-0.3, 0.9] };
// la bocca di chi parla: dal volume della voce (bocca.json) e dalla vocale della parola; finché la voce non c'è, una bocca che si muove dentro le battute tra «»
function parla(chi, t) {
  const x = WORDS.find((q) => t >= q[0] - 0.03 && t <= q[1] + 0.05); let wide = 0.2, round = 0;
  if (x) { const vs = [...norm(x[2])].filter((ch) => VOC[ch]); if (vs.length) { const f = clamp((t - x[0]) / Math.max(0.05, x[1] - x[0])); [wide, round] = VOC[vs[Math.min(vs.length - 1, Math.floor(f * vs.length))]]; } }
  for (const b of BOCCA) { if (b.who !== chi) continue; const i = (t - b.t0) * b.fps; if (i < 0 || i >= b.vals.length - 1) continue;
    const k = Math.floor(i), open = lerp(b.vals[k], b.vals[k + 1], i - k); return { mouth: open * 0.6, wide: wide * 0.35, round: round * Math.min(1, open * 2) }; }
  if (!BOCCA.length && x && DETTI.some((d) => t >= d[0] && t <= d[1])) { const open = 0.3 + 0.3 * Math.abs(sin(t * 16)); return { mouth: open * 0.6, wide: wide * 0.35, round: round * Math.min(1, open * 2) }; }
  return { mouth: 0, wide: 0, round: 0 };
}

// ------------------------------------------------------------------ misure e pose di base
const { XA, XD, XB, ZR, ZS, HR, RT, PX0, PX1 } = BAL, YR = FY + HR;
// un punto del corrimano davanti (sbarra per la mano): lato = +1 se il pollice sta dalla parte delle x che crescono
const CR = (x, lato, o = {}) => ({ a: [x + lato * 0.06, YR, ZR], b: [x - lato * 0.06, YR, ZR], r: RT, ...o });
const lontano = { pos: [60, 0, 60] }, via = { nascosta: true };
const PAURA = { fear: 1, browUp: 0.7, sad: 0.6, mouth: 0.16, open: 1 };
const FB = { set: 'F', cucina: 0, tenda: 0, elena: via, riva: lontano, ambiente: 0.25, fronte: 0.13, pioggia: 0.3 };      // di base, fuori di notte
const passi = (fase, amp = 0.4) => ({ aL: amp * sin(fase), gL: 0.06 + 0.8 * amp * Math.max(0, -Math.cos(fase)), aR: -amp * sin(fase), gR: 0.06 + 0.8 * amp * Math.max(0, Math.cos(fase)) });
// il telefono in mano (AR): basso lungo il fianco, davanti per guardarlo, stretto al petto con lo schermo contro la maglia
const TEL_BASSO = { a: [0.13, 0.2, 0.26], gomito: [1, -0.7, -0.2], dita: [0, 0.92, 0.25], dorso: [0, 0, 1], mano: 'presa' };
const TEL_GUARDA = { a: [0.1, 0.3, 0.3], gomito: [1, -0.8, -0.1], dita: [-0.1, 0.9, -0.3], dorso: [0, 0.45, 1], mano: 'presa' };
const TEL_PETTO = { a: [0.05, 0.25, 0.2], gomito: [0.8, -1, -0.1], dita: [-0.55, 0.75, 0.1], dorso: [0.15, 0.1, 1], mano: 'presa' };
// il telefono finisce in tasca quando esci (la sinistra lo infila nella tasca della tuta); da rannicchiato una mano resta sopra la tasca, l'altra sul ginocchio
const IN_TASCA = { a: [0.215, -0.1, 0.06], gomito: [1, -0.3, -0.7], dita: [0, -1, 0.15], dorso: [1, 0, 0.1], mano: 'presa' };
// (la mano sta sulla coscia sinistra, verso l'anca: agganciata al ginocchio e tirata indietro lungo la coscia; il delta è nel mondo e vale per la posa da rannicchiato, yaw = Y_ANG)
const SU_TASCA = { proprio: 'ginocchioS', delta: [0.164, -0.073, -0.159], gomito: [1, -0.3, -0.6], dita: [0, 0.6, 0.8], dorso: [0.6, 0.64, -0.48], mano: 'piatta' };
const SUL_GINOCCHIO = { proprio: 'ginocchioD', delta: [0, 0.075, 0], gomito: [-1, -0.5, -0.2], dita: [0, -0.35, 1], dorso: [0, 1, 0.3], mano: 'piatta' };
// la mano sulla bocca (episodio 1): a coppa, il palmo sulle labbra
const MANO_BOCCA = { a: [-0.079, 0.508, 0.147], gomito: [-1, -0.42, 0.3], dita: [0.9, 0.25, -0.25], dorso: [-0.25, 0.1, 1],
  mano: { indice: { mcp: 16, pip: 26, dip: 14, ab: -3 }, medio: { mcp: 20, pip: 30, dip: 16 }, anulare: { mcp: 24, pip: 32, dip: 18, ab: 4 }, mignolo: { mcp: 28, pip: 34, dip: 18, ab: 7 }, pollice: { ab: 34, fl: 12, roll: 30, mcp: 10, ip: 12 } } };
// la mano tesa dell'ispettore: aperta, il palmo in su, le dita appena curve (k: quanto le richiude per il gesto «dammi»)
const manoTesa = (k = 0) => ({ indice: { mcp: 8 + 34 * k, pip: 14 + 40 * k, dip: 8 + 16 * k, ab: -4 }, medio: { mcp: 12 + 34 * k, pip: 18 + 40 * k, dip: 10 + 16 * k }, anulare: { mcp: 16 + 32 * k, pip: 22 + 38 * k, dip: 12 + 16 * k, ab: 5 }, mignolo: { mcp: 20 + 30 * k, pip: 26 + 36 * k, dip: 14 + 14 * k, ab: 9 }, pollice: { ab: 30, fl: 8 + 6 * k, roll: 20, mcp: 6 + 8 * k, ip: 8 } });
// tu rannicchiato nell'angolo del balcone vuoto: seduto a terra, la schiena al muro, le ginocchia su; il telefono è in tasca (lui non lo vede)
const P_ANG = [6.8, FY, 0.3], Y_ANG = -0.55;
const tuAngolo = (t, x = {}) => ({ pos: P_ANG, yaw: Y_ANG, sit: 1, sedile: 0.03, gambe: { aL: 0.8, gL: 0.5, aR: 0.72, gR: 0.3 }, lean: -0.04, headPitch: -0.1, headYaw: -0.25, breathe: sin(t * 4.4), blink: battito(t, 5), ...PAURA, armR: SU_TASCA, armL: SUL_GINOCCHIO, ...x });
// tu fuori dalla ringhiera, faccia al palazzo (yaw = pi: la tua destra, AL, è dalla parte delle x che crescono); x = dove sta il corpo
const fuori = (t, x, o = {}) => ({ pos: [x, FY, 1.19], yaw: Math.PI, lean: 0.18, headPitch: -0.05, breathe: sin(t * 5), ...PAURA, armL: { sbarra: CR(x + 0.24, -1), gomitoM: [0.6, -0.7, 0.6] }, armR: { sbarra: CR(x - 0.24, 1), gomitoM: [-0.6, -0.7, 0.6] }, ...o });
// l'ispettore sul tuo balcone, accanto al divisorio. k = quanto si è sporto oltre il bordo (0 = nascosto dietro il vetro, 1 = la faccia fuori);
// mano: 0 = la sinistra stringe il corrimano dalla tua parte, 1 = tesa verso di te col palmo in su; dammi = le dita che si richiamano
const rivaSporge = (t, k, { mano = 0, dammi = 0, x = {} } = {}) => { const m = io(clamp(mano));
  const presa = { sbarra: CR(lerp(6.12, 6.2, k), -1), gomitoM: [0.3, -1, -0.3] }, tesa = { mondo: [6.28, FY + 1.13 + 0.012 * sin(t * 1.3), 1.22], gomitoM: [0.5, -1, 0.1], ditaM: [0.8, -0.05, -0.55], dorsoM: [0, -1, 0], mano: manoTesa(dammi) };
  return { pos: [lerp(5.6, 5.85, k), FY, lerp(0.8, 0.88, k)], yaw: 0, lean: lerp(0.16, 0.3, k), side: -0.14 * k, twist: 0.1 * k, headYaw: lerp(0.35, 0.9, k), headPitch: 0.1 * k, headRoll: -0.2 * k, breathe: sin(t * 1.8), blink: battito(t, 21), open: 0.72,
    armL: { sbarra: CR(lerp(5.3, 5.45, k), 1), gomitoM: [-1, -0.5, -0.1] }, armR: m < 0.02 ? presa : m > 0.98 ? tesa : { mondo: v3([lerp(6.12, 6.2, k), YR + 0.06, ZR + 0.02], tesa.mondo, m), gomitoM: tesa.gomitoM, ditaM: v3([0.5, -0.5, -0.6], tesa.ditaM, m), dorsoM: v3([0.3, 1, 0.2], tesa.dorsoM, m), mano: manoTesa(0.5 * (1 - m)) }, ...x }; };
const POV = { cam: [7.25, FY + 0.82, 0.45], look: [6.2, FY + 1.42, 1.15], fov: 40 };      // quello che vedi tu, rannicchiato, guardando il bordo del divisorio
const LUCE = { casa: { soggiorno: 1, corridoio: 1 }, porta: 0.6, tendaScosta: 0.9 };       // casa tua con la luce accesa e la portafinestra aperta (lui è uscito)

// ------------------------------------------------------------------ la sequenza delle inquadrature
function sequenza() {
  const S = [], sc = (t0, f) => S.push({ t0, f });
  const trema = (t, a = 1) => [0.012 * a * M.noise1(t * 1.7, 5), 0.01 * a * M.noise1(t * 2.1, 7), 0];

  // --- «Avete scelto la B.»: la carta votata, un attimo
  sc(0, (t) => ({ set: 'I', id: 'scelta', scelta: 1, sfoca: 1, cam: [0.5, 1.5, 0.4], look: [0, 1.0, -2.4], fov: 40, piedi: 1, telefono: 1, tu: { pos: [-0.05, 0, -1.75], yaw: Math.PI, armR: TEL_BASSO } }));

  // --- «Non apri. Non rispondi. Resti immobile, al buio.»: lui bussa ancora, tu fermo nel corridoio; poi il tuo viso
  const K2 = [r(2) + 0.55, r(2) + 0.9, r(2) + 1.25], resti = w(2, 'resti') - 0.15;
  sc(r(2) - 0.3, (t, k) => { const colpo = K2.reduce((m, x) => Math.max(m, bump(t, x + 0.05, 0.1)), 0);
    return { set: 'I', id: 'buio', cam: v3([0.5, 1.64, 1.6], [0.44, 1.6, 1.1], io(k)), look: [0.05, 1.02, -2.5], fov: 44, piedi: 1, colpo, telefono: 1,
      tu: { pos: [-0.05, 0, -1.75], yaw: Math.PI, breathe: sin(t * 3.4), lean: -0.03 * colpo, armR: TEL_BASSO } }; });
  sc(resti, (t, k) => ({ set: 'I', id: 'viso', porta: false, cam: v3([0.1, 1.675, -3.05], [0.06, 1.675, -2.9], io(k)), look: [0, 1.668, -2.0], fov: 27, occhio: 0.3 + 0.2 * k, telefono: 1, piedi: 1,
    tu: { pos: [0, 0, -2.06], yaw: Math.PI, breathe: sin(t * 3.6), fear: 0.75, browUp: 0.5, sad: 0.4, mouth: 0.06, blink: bump(t, resti + 1.4, 0.09), headPitch: 0.03,
      armR: { a: [0.13, 0.03, 0.2], gomito: [1, -0.5, -0.4], dita: [0, 0.6, 0.6], dorso: [0, -0.5, 1], mano: 'presa' } } }));

  // --- lo spioncino: smette di bussare, va alla porta di fronte, suona; la vicina socchiude; lui mostra il distintivo; lei va a prendere le chiavi e lui si volta verso di te
  const giu = { a: [-0.253, -0.21, 0.035], gomito: [-0.6, -0.3, -0.75], dita: [0, -1, 0.05], dorso: [0, 0, 1], mano: 'rilassata' };
  const pugno = { a: [-0.12, 0.42, 0.3], gomito: [-1, -0.6, -0.2], dita: [0, 0.6, 0.8], dorso: [-0.3, 0.3, -1], mano: 'pugno' };
  const DIST_SU = { a: [-0.1, 0.33, 0.33], gomito: [-1, -0.8, -0.1], dita: [0, 1, 0.05], dorso: [0, 0, -1], mano: 'tessera' };
  const tS = r(3) - 0.25, tGira = r(3) + 0.3, tVa = tGira + 0.9, tArr = w(3, 'suona') + 0.5, tSuona = tArr + 0.15, tApre = r(4) - 0.35, tChiude = r(5) + 0.1, tVolta = r(5) + 0.9, buioA = w(5, 'piante') + 0.1;
  const spio = (t) => { const gira = io(prog(t, tGira, tVa + 0.2)), va = io(prog(t, tVa, tArr)), suona = bump(t, tSuona + 0.35, 0.45), apre = io(prog(t, tApre, tApre + 0.5)) * (1 - 0.72 * io(prog(t, tChiude, tChiude + 0.5)));
    const mostra = io(prog(t, tApre + 0.25, tApre + 0.8)) * (1 - io(prog(t, tChiude - 0.5, tChiude))), volta = io(prog(t, tVolta, tVolta + 1.4)), nero = t > buioA && t < buioA + 0.55 ? 1 : 0, dopo = t >= buioA + 0.55 ? 1 : 0;
    const z = lerp(lerp(0.72, 2.72, va), 1.9, dopo), x = lerp(0.02, -0.12, va), cam = prog(t, tVa, tArr + 1);
    return { set: 'P', id: 'spio', spioncino: 1, cam: [0.008 * M.noise1(t * 0.6, 3), 1.56 + 0.005 * M.noise1(t * 0.5, 4), 0.03], look: [lerp(0, -0.1, cam), lerp(1.6, 1.5, cam), 1], fov: lerp(72, lerp(46, 40, prog(t, tArr, tChiude)), io(cam)) + 10 * dopo,
      porta11: apre, buio: 0.25 + 0.6 * dopo, luce: nero ? 0 : 1,
      isp: { pos: [x, 0, z - 0.02 * Math.abs(sin((z - 0.72) * 4.5))], yaw: Math.PI * (1 + gira) - Math.PI * volta, breathe: sin(t * 1.9), blink: battito(t, 21), open: 0.72, gambe: va > 0.01 && va < 0.99 ? passi((z - 0.72) * 4.5, 0.36) : {},
        ...(t < r(5) ? parla('isp', t) : {}), smile: 0.2 * mostra + 0.55 * volta, gazeY: -0.1, headPitch: 0.06, headRoll: 0.06 * volta, distintivo: mostra > 0.5,
        armL: mostra > 0.02 ? mixA(giu, DIST_SU, mostra) : mixA(pugno, giu, io(prog(t, tS + 0.3, tGira + 0.2))),
        armR: suona > 0.02 ? { mondo: v3([x + 0.26, 0.9, z + 0.05], [0.33, 1.25, 3.45], suona), gomito: [1, -0.8, 0], ditaM: [0, 0, 1], dorsoM: [0, 1, 0], mano: 'indice' } : undefined } }; };
  sc(tS, spio);
  // (in mezzo alla battuta: il tuo viso che ascolta dietro la porta)
  const asc0 = w(4, 'vicino') - 0.2, asc1 = w(4, 'lei') - 0.15;
  sc(asc0, (t, k) => ({ set: 'I', id: 'ascolti', porta: false, cam: v3([0.07, 1.675, -3.02], [0.05, 1.675, -2.94], io(k)), look: [0, 1.668, -2.0], fov: 24, occhio: 0.5, telefono: 1, piedi: 0,
    tu: { pos: [0, 0, -2.08], yaw: Math.PI, breathe: sin(t * 3.6), fear: 0.9, browUp: 0.6, sad: 0.5, mouth: 0.08, headPitch: 0.03, gazeX: 0.25 * sin(t * 2.2),
      armR: { a: [0.13, 0.03, 0.2], gomito: [1, -0.5, -0.4], dita: [0, 0.6, 0.6], dorso: [0, -0.5, 1], mano: 'presa' } } }));
  sc(asc1, spio);

  // --- «Richiamare il centododici? Ti hanno appena mandato lui.»: ti stacchi dalla porta, guardi il telefono, lo abbassi
  sc(r(6) - 0.25, (t, k, s) => { const ind = io(prog(t, s.t0, s.t0 + 0.9)), giuT = io(prog(t, w(6, 'mandato') - 0.2, rf(6) + 0.2));
    return { set: 'I', id: 'richiami', ui: 'chiamate', cam: v3([0.55, 1.42, -0.3], [0.5, 1.4, -0.05], io(k)), look: [0, 1.25, -1.7], fov: 40, piedi: 0, telefono: 1, amb: 0.22,
      tu: { pos: [0, 0, lerp(-2.08, -1.55, ind)], yaw: Math.PI - 0.5 * ind, breathe: sin(t * 4), ...PAURA, headPitch: 0.35 * (1 - giuT), gazeY: -0.5 * (1 - giuT), gambe: { aL: -0.3 * bump(ind, 0.3, 0.3), gL: 0.25 * bump(ind, 0.3, 0.3), aR: -0.3 * bump(ind, 0.72, 0.28), gR: 0.25 * bump(ind, 0.72, 0.28) },
        armR: mixA(TEL_GUARDA, TEL_BASSO, giuT) } }; });

  // --- «Prendi il telefono ed esci sul balcone. La portafinestra resta socchiusa.»
  const esce = r(7) - 0.3, soc = w(7, 'portafinestra') - 0.2;
  // (esci, vai verso la ringhiera; l'anta torna indietro da sola ma non si chiude: resta una fessura e il vento ne tira fuori la tenda)
  sc(esce, (t, k) => { const ap = io(prog(t, esce + 0.1, esce + 0.8)), va = io(prog(t, esce + 0.5, esce + 2.3)), ch = io(prog(t, esce + 1.8, soc + 0.3)), av = io(prog(t, soc - 0.2, soc + 1.6)), cm = io(prog(t, soc - 0.3, r(8) - 0.3));
    return { ...FB, id: 'esci', cam: v3(v3([5.75, FY + 1.5, 2.9], [5.6, FY + 1.46, 2.6], io(prog(k, 0, 0.5))), [4.95, FY + 1.32, 1.5], cm), look: v3([4.78, FY + 1.1, 0], [4.52, FY + 1.05, -0.1], cm), fov: lerp(36, 30, cm), porta: lerp(0.55 * ap, 0.12 + 0.035 * sin(t * 1.9) * ch, ch), tendaScosta: ap * (1 - ch), vento: 1, telTu: t < esce + 1.75 ? 1 : 0, telSchermo: 0.5,
      tu: { pos: [lerp(lerp(4.78, 4.95, va), 5.5, av), FY, lerp(lerp(-0.85, 0.42, va), 0.7, av)], yaw: 0.9 * av, ...PAURA, breathe: sin(t * 5), headYaw: -0.6 * bump(t, esce + 2.3, 0.7), gambe: (va > 0.01 && va < 0.99) || (av > 0.01 && av < 0.99) ? passi(va * 9 + av * 5, 0.32) : {}, armR: t < esce + 2.6 ? mixA(TEL_PETTO, IN_TASCA, io(prog(t, esce + 0.9, esce + 1.7))) : undefined } }; });

  // --- «Sotto ci sono quattro piani di vuoto. E l'auto grigia. Lei è ancora lì dentro.»: quello che vedi dalla ringhiera, poi il baule
  const TR = [5.35, FY, 0.72], auto = w(8, "l'auto") - 0.25, bx = AUTO[0] - 1.75;
  const allaRinghiera = (t, x = {}) => ({ pos: TR, yaw: 0, lean: 0.32, breathe: sin(t * 5), senzaTesta: true, armL: { sbarra: CR(TR[0] - 0.17, 1), gomitoM: [-0.5, -0.5, -0.8] }, armR: { sbarra: CR(TR[0] + 0.17, -1), gomitoM: [0.5, -0.5, -0.8] }, ...x });
  sc(r(8) - 0.25, (t, k) => ({ ...FB, id: 'vuoto', pioggia: 0.5, cam: su([TR[0], FY + 1.56, 1.0], trema(t, 1.5), 1), look: v3([TR[0] + 0.1, FY - 3, 3.4], [TR[0] + 0.25, FY - 6, 3.9], io(k)), fov: 62, roll: 0.03 * sin(t * 0.9), tu: allaRinghiera(t) }));
  sc(auto, (t, k) => ({ ...FB, id: 'auto', pioggia: 0.5, cam: su([TR[0], FY + 1.6, 0.95], trema(t), 1), look: su([bx, 0.9, AUTO[2]], trema(t, 4), 1), fov: lerp(17, 9.5, E.inOutCubic(prog(k, 0, 0.75))), tu: lontano }));

  // --- «Di fianco c'è il balcone di un appartamento vuoto da mesi. Lì non verrà a cercarti.»: ti sporgi a guardare oltre il divisorio
  const li = w(9, 'lì') - 0.2;
  sc(r(9) - 0.25, (t, k, s) => { const gira = io(prog(t, s.t0 + 0.2, s.t0 + 1.0)), sp = io(prog(t, s.t0 + 0.9, s.t0 + 2.2));
    return { ...FB, id: 'guardi', cam: v3([7.75, FY + 1.5, 2.6], [7.6, FY + 1.46, 2.4], io(k)), look: [5.85, FY + 1.2, 0.85], fov: 40,
      tu: { pos: [lerp(5.45, 5.72, sp), FY, lerp(0.72, 0.84, sp)], yaw: 0.15 * gira, lean: 0.3 * sp, side: -0.12 * sp, twist: 0.1 * sp, headYaw: 0.75 * gira + 0.1 * sp, headPitch: 0.1 * sp, breathe: sin(t * 5), ...PAURA, mouth: 0.1,
        armL: { sbarra: CR(lerp(5.2, 5.38, sp), 1), gomitoM: [-1, -0.5, -0.1] }, armR: { sbarra: CR(lerp(5.7, 6.14, sp), -1), gomitoM: [0.4, -1, -0.3] } } }; });
  sc(li, (t, k) => ({ ...FB, id: 'vuoto2', cam: su([6.06, FY + 1.5, 1.24], trema(t), 1), look: v3([7.9, FY + 0.7, 0.5], [7.3, FY + 0.35, 0.25], io(k)), fov: 54, tu: lontano }));

  // --- «Scavalchi la ringhiera. È bagnata. Non guardi giù.»
  const bagn = w(10, 'è') - 0.15, nong = w(10, 'non') - 0.15;
  sc(r(10) - 0.25, (t, k) => { const su2 = io(prog(k, 0.1, 0.9));
    return { ...FB, id: 'mani', cam: v3([5.62, FY + 0.84, 2.45], [5.68, FY + 0.88, 2.3], io(k)), look: [5.72, FY + 1.06, 1.0], fov: 30,
      tu: { pos: [5.72, FY + 0.05 * su2, 0.73 + 0.05 * su2], yaw: 0, lean: 0.2 + 0.18 * su2, headPitch: 0.3, breathe: sin(t * 5.5), ...PAURA, armL: { sbarra: CR(5.56, 1), gomitoM: [-0.5, -0.4, -0.8] }, armR: { sbarra: CR(5.88, -1), gomitoM: [0.5, -0.4, -0.8] } } }; });
  sc(bagn, (t, k) => { const scivola = 0.035 * E.outCubic(prog(t, bagn + 0.35, bagn + 0.5)) * (1 - 0.6 * io(prog(t, bagn + 0.7, bagn + 1.0)));
    return { ...FB, id: 'bagnata', cam: v3([5.28, FY + 1.5, 1.62], [5.32, FY + 1.46, 1.55], io(k)), look: [5.56 - scivola * 0.5, FY + 1.02, 1.0], fov: 25, roll: 0.1, fronte: 0.3,
      tu: { pos: [5.72 - scivola * 0.5, FY + 0.05, 0.78], yaw: 0, lean: 0.38, headPitch: 0.3, senzaTesta: true, ...PAURA, armL: { sbarra: CR(5.56 - scivola, 1), gomitoM: [-0.5, -0.4, -0.8] }, armR: { sbarra: CR(5.88, -1), gomitoM: [0.5, -0.4, -0.8] } } }; });
  sc(nong, (t, k) => ({ ...FB, id: 'nongiu', pioggia: 0.5, cam: su(v3([8.4, FY + 2.5, 3.5], [8.25, FY + 2.7, 3.35], io(k)), trema(t, 1.2), 1), look: [5.72, FY + 0.1, 1.2], fov: 46, roll: -0.05,
    tu: fuori(t, 5.72, { headPitch: -0.3, armR: { sbarra: CR(5.72 - 0.26, 1), gomitoM: [-0.25, -1, 0.35] }, armL: { sbarra: CR(5.72 + 0.26, -1), gomitoM: [0.25, -1, 0.35] } }) }));

  // --- «Un piede oltre il divisorio. Poi l'altro. Ci sei.»: la mano avanti, il piede, il corpo; poi l'altro; poi sei dentro
  const poi = w(11, 'poi') - 0.15, cisei = w(11, 'ci') - 0.2;
  // il passo di lato fuori dalla ringhiera: f va da 0 a 2. 0..1: la mano destra avanza oltre il montante, il piede destro la segue, il corpo si sposta; 1..2: lo stesso con la sinistra
  const passoFuori = (t, f) => { const a = clamp(f), b = clamp(f - 1), ma = io(prog(a, 0, 0.35)), pa = io(prog(a, 0.3, 0.75)), ca = io(prog(a, 0.5, 1)), mb = io(prog(b, 0, 0.4)), pb = io(prog(b, 0.3, 0.8)), cb = io(prog(b, 0.45, 1));
    const x = 5.72 + 0.3 * ca + 0.32 * cb, xd = lerp(lerp(5.96, 6.3, ma), 6.6, cb), xs = lerp(lerp(5.48, 5.62, ca), 6.1, mb);
    return fuori(t, x, { headYaw: -0.45 * (1 - cb), headPitch: 0.1, gambe: { oL: 0.36 * pa * (1 - ca) + 0.0, gL: 0.14 * bump(pa, 0.5, 0.5), oR: -0.3 * pb * (1 - cb) + 0.3 * ca * (1 - pb), gR: 0.14 * bump(pb, 0.5, 0.5) },
      armL: { sbarra: CR(xd, -1), gomitoM: [0.5, -0.8, 0.6] }, armR: { sbarra: CR(xs, 1), gomitoM: [-0.5, -0.8, 0.6] } }); };
  sc(r(11) - 0.25, (t, k, s) => ({ ...FB, id: 'piede1', ambiente: 0.4, fronte: 0.5, cam: v3([6.98, FY + 0.52, 0.34], [6.92, FY + 0.5, 0.4], io(k)), look: [6.2, FY + 0.42, 1.1], fov: 56, tu: passoFuori(t, prog(t, s.t0 + 0.1, poi + 0.1)) }));
  sc(poi, (t, k) => ({ ...FB, id: 'piede2', pioggia: 0.5, cam: su(v3([7.9, FY + 1.5, 3.7], [7.75, FY + 1.45, 3.5], io(k)), trema(t), 1), look: [6.2, FY + 0.9, 1.1], fov: 34, tu: passoFuori(t, 1 + prog(t, poi + 0.05, cisei + 0.1)) }));
  const dentro = (t, x = {}) => ({ pos: [6.5, FY, 0.72], yaw: 0, lean: 0.35, breathe: sin(t * 6.5), ...PAURA, mouth: 0.3, headPitch: 0.35, gambe: { aL: 0.35, gL: 0.6, aR: 0.2, gR: 0.45 }, bacino: { sposta: [0, -0.07, 0] }, armL: { sbarra: CR(6.28, 1), gomitoM: [-0.6, -0.4, -0.7] }, armR: { sbarra: CR(6.72, -1), gomitoM: [0.6, -0.4, -0.7] }, ...x });
  sc(cisei, (t, k) => ({ ...FB, id: 'cisei', cam: v3([7.4, FY + 1.3, 3.6], [7.3, FY + 1.25, 3.3], io(k)), look: [6.5, FY + 0.92, 0.8], fov: 34, tu: dentro(t, { headYaw: -0.5 * io(prog(k, 0.4, 0.9)), headPitch: 0.35 - 0.3 * io(prog(k, 0.4, 0.9)) }) }));

  // --- «Ti rannicchi contro il muro, al buio.»: indietro fino al muro, giù a sedere, il telefono contro il petto perché non faccia luce
  sc(r(12) - 0.3, (t, k, s) => { const ind = io(prog(t, s.t0, s.t0 + 0.9)), siede = io(prog(t, s.t0 + 0.6, s.t0 + 1.9)), A = tuAngolo(t);
    return { ...FB, id: 'rannicchi', cam: v3([7.6, FY + 0.85, 2.5], [7.42, FY + 0.74, 2.15], io(k)), look: [6.8, FY + 0.5, 0.35], fov: 36,
      tu: { ...A, pos: v3([6.5, FY, 0.72], P_ANG, ind), yaw: lerp(0, Y_ANG, ind), sit: siede, gambe: { aL: 0.8 * siede, gL: 0.5 * siede, aR: 0.72 * siede, gR: 0.3 * siede }, lean: lerp(0.1, -0.04, siede), headPitch: lerp(0.3, -0.1, siede), headYaw: -0.25 * siede,
        armR: siede > 0.6 ? SU_TASCA : undefined, armL: siede > 0.85 ? SUL_GINOCCHIO : undefined } }; });

  // --- «In casa tua si accende la luce.»: i due balconi da fuori; il tuo si illumina, tu sei lì accanto al buio
  const acc = w(13, 'accende') + 0.15;
  sc(r(13) - 0.3, (t, k) => { const c = t > acc ? 1 : 0;
    return { ...FB, id: 'luce', pioggia: 0.45, cam: v3([5.75, FY + 0.5, 21.5], [5.75, FY + 0.6, 20.3], io(k)), look: [5.75, FY + 0.85, 0], fov: 26, porta: 0.07, casa: { corridoio: c, soggiorno: 0 }, tu: tuAngolo(t) }; });

  // --- «Permesso», dice lui. Come un ospite.: dietro il velo della tenda, in fondo, la porta del corridoio accesa e lui fermo sulla soglia; poi accende
  const sogg = rf(14) + 0.25;
  sc(r(14) - 0.25, (t, k) => { const entra = io(prog(t, r(14) - 0.2, r(14) + 0.9));
    return { ...FB, id: 'permesso', cam: v3([4.95, FY + 1.42, 2.4], [4.85, FY + 1.4, 2.0], io(k)), look: [4.4, FY + 1.2, -0.3], fov: 30, porta: 0.07, casa: { corridoio: 1, soggiorno: t > sogg ? 1 : 0 }, tu: lontano,
      riva: { pos: [4.05, FY, lerp(-3.9, -3.3, entra)], yaw: 0.12, breathe: sin(t * 1.8), open: 0.72, headYaw: 0.25 * sin(t * 0.8), ...parla('isp', t) } }; });

  // --- «Lo senti camminare. Apre le porte, una per una. Senza fretta.»: il tuo viso; poi, da fuori, la luce della cucina e lui alla tua finestra
  const apre = w(15, 'apre') - 0.2;
  sc(r(15) - 0.25, (t, k) => ({ ...FB, id: 'senti', mira: { chi: 'tu', da: v3([-0.3, 0.04, 0.95], [-0.27, 0.03, 0.84], io(k)) }, fov: 24, ...LUCE, porta: 0.07, tendaScosta: 0,
    tu: tuAngolo(t, { headYaw: -0.25 - 0.3 * io(prog(k, 0.2, 0.7)), gazeX: -0.5 * io(prog(k, 0.1, 0.6)), headPitch: -0.05 }) }));
  sc(apre, (t, k) => { const va = io(prog(t, apre + 0.2, apre + 2.2)), guarda = io(prog(t, apre + 2.0, apre + 2.8));
    return { ...FB, id: 'cucina', pioggia: 0.45, cam: v3([3.1, FY + 1.3, 16.5], [3.1, FY + 1.35, 15.6], io(k)), look: [3.1, FY + 1.25, 0], fov: 26, cucina: t > apre + 0.35 ? 1 : 0, tenda: 1, casa: { corridoio: 1, soggiorno: 1 }, porta: 0.07, tu: tuAngolo(t),
      riva: { pos: [lerp(WX + 0.9, WX + 0.05, va), FY, lerp(-3.3, -0.62, va)], yaw: lerp(-0.3, 0, va), breathe: sin(t * 1.8), open: 0.72, gambe: va > 0.01 && va < 0.99 ? passi(va * 9, 0.3) : {}, headPitch: 0.3 * guarda, gazeY: -0.4 * guarda, headYaw: 0.3 * sin(t * 0.9) * (1 - guarda) } }; });

  // --- «Non deve avere paura di me», dice piano. «Sono qui per proteggerla.»: la sua ombra sul velo; poi le dita sul bordo dell'anta socchiusa, che si apre
  const dita = w(16, 'sono') - 0.3;
  sc(r(16) - 0.3, (t, k) => { const va = io(prog(t, r(16) - 0.3, dita - 0.2));
    return { ...FB, id: 'ombra', cam: v3([5.1, FY + 1.4, 2.5], [4.95, FY + 1.36, 2.0], io(k)), look: [4.5, FY + 1.2, -0.25], fov: 30, porta: 0.07, casa: { corridoio: 1, soggiorno: 1 }, luceBalcone: 2, tu: lontano,
      riva: { pos: [lerp(4.2, 4.62, va), FY, lerp(-2.7, -0.85, va)], yaw: lerp(0.25, 0.02, va), breathe: sin(t * 1.8), open: 0.72, gambe: va > 0.01 && va < 0.99 ? passi(va * 6.5, 0.3) : {}, ...parla('isp', t) } }; });
  // l'anta si apre piano verso l'interno (la tira lui, la mano sulla maniglia dietro il vetro) e sposta la tenda: nella fessura, metà del suo viso
  sc(dita, (t, k) => { const tira = io(prog(t, dita + 0.4, rf(16) + 0.9)), ap = lerp(0.07, 0.53, tira), m = SF.BL.montante(ap, 1.03);
    return { ...FB, id: 'apre', pioggia: 0.2, cam: v3([4.66, FY + 1.5, 1.7], [4.62, FY + 1.52, 1.15], io(k)), look: [4.6, FY + 1.5, -0.4], fov: 30, porta: ap, tendaScosta: tira, vento: 0.3, casa: { corridoio: 1, soggiorno: 1 }, luceBalcone: 2, fronte: 0.17, tu: lontano,
      riva: { pos: [4.6, FY, -0.86], yaw: 0, breathe: sin(t * 1.8), blink: battito(t, 21), open: 0.72 + 0.1 * tira, headPitch: 0.04, smile: 0.25 * tira, gazeX: -0.3 * tira, ...parla('isp', t),
        armR: { mondo: [m[0] + 0.03, m[1] - 0.02, m[2] - 0.085], gomitoM: [1, -0.6, -0.3], ditaM: [-0.6, 0.3, 0.75], dorsoM: [0.5, 0.2, -0.85], mano: 'presa' } } }; });

  // --- «Poi i suoi passi escono sul balcone. E si fermano.»: da sotto il divisorio, le sue scarpe nella luce; sopra, la sua ombra sul vetro
  sc(r(17) - 0.3, (t, k, s) => { const va = io(prog(t, s.t0 + 0.2, w(17, 'fermano') + 0.2)), gira = io(prog(t, w(17, 'fermano') + 0.3, rf(17) + 1.0));
    return { ...FB, id: 'passi', pioggia: 0, cam: v3([7.15, FY + 0.2, 0.5], [7.0, FY + 0.17, 0.5], io(k)), look: [6.0, FY + 0.07, 0.54], fov: 40, ...LUCE, luceBassa: 9, luceBalcone: 3, tu: lontano,
      riva: { pos: [lerp(4.72, 5.52, va), FY, lerp(-0.2, 0.56, va)], yaw: lerp(0.6, 1.35, gira), breathe: sin(t * 1.8), gambe: va > 0.01 && va < 0.99 ? passi(va * 7, 0.3) : {} } }; });

  // --- «Trattieni il respiro.»: la mano sulla bocca, gli occhi al vetro
  sc(r(18) - 0.3, (t, k) => ({ ...FB, id: 'respiro', mira: { chi: 'tu', dy: -0.02, da: v3([-0.52, 0.02, 0.62], [-0.45, 0.02, 0.54], io(k)) }, fov: 24, ...LUCE,
    riva: { pos: [5.52, FY, 0.56], yaw: 1.35, breathe: sin(t * 1.8) },
    tu: tuAngolo(t, { breathe: 0, headYaw: -0.5, gazeX: -0.7, headPitch: -0.03, mouth: 0, blink: 0, armL: MANO_BOCCA }) }));

  // --- «La sua faccia spunta da dietro il divisorio. Lentamente.»: prima le dita sul corrimano dalla tua parte, poi lui
  const spunta = w(19, 'spunta') - 0.1;
  sc(r(19) - 0.35, (t, k) => { const kk = io(prog(t, spunta, rf(19) + 0.6));
    return { ...FB, id: 'spunta', pioggia: 0.4, ...POV, cam: su(POV.cam, trema(t, 0.6), 1), fov: lerp(42, 38, io(k)), ...LUCE, tu: lontano,
      riva: rivaSporge(t, kk, { x: { smile: 0.15 + 0.4 * io(prog(t, rf(19), rf(19) + 0.8)), gazeY: -0.15 } }) }; });

  // --- «Eccola», dice, gentile. «Mi ha fatto spaventare. Pensavo si fosse buttato.»: il suo viso
  const butt = w(20, 'buttato') - 0.5;
  sc(r(20) - 0.25, (t, k) => { const giuG = bump(t, butt + 0.5, 0.6);
    return { ...FB, id: 'eccola', pioggia: 0.4, mira: { chi: 'riva', da: su(v3([0.82, -0.44, -0.5], [0.72, -0.38, -0.44], io(k)), trema(t, 0.5), 1) }, fov: 24, ...LUCE, tu: lontano,
      riva: rivaSporge(t, 1, { x: { ...parla('isp', t), smile: 0.55, gazeY: -0.15 - 0.6 * giuG, headPitch: 0.1 + 0.12 * giuG } }) }; });

  // --- «Con questa pioggia si scivola. Basta un attimo.»: da giù, dal parcheggio: lui sporto sul vuoto, tu nell'angolo
  sc(r(21) - 0.25, (t, k) => { const giuG = bump(t, w(21, 'scivola') + 0.2, 0.7);
    return { ...FB, id: 'scivola', pioggia: 0.6, cam: v3([9.6, FY - 1.5, 6.2], [9.4, FY - 1.4, 5.8], io(k)), look: su([6.35, FY + 0.95, 0.8], trema(t, 1), 1), fov: 23, ...LUCE, ambiente: 0.2, fronte: 0.12,
      tu: tuAngolo(t, { headYaw: -0.45, headPitch: -0.3 }), riva: rivaSporge(t, 1, { x: { ...parla('isp', t), smile: 0.5, headPitch: 0.1 + 0.35 * giuG, gazeY: -0.15 - 0.5 * giuG } }) }; });

  // --- «Ti tende la mano, sopra il vuoto. «Venga. L'aiuto io.»»
  sc(r(22) - 0.3, (t, k, s) => ({ ...FB, id: 'mano', pioggia: 0.4, ...POV, cam: su(POV.cam, trema(t, 0.6), 1), fov: lerp(40, 36, io(k)), ...LUCE, tu: lontano,
    riva: rivaSporge(t, 1, { mano: prog(t, s.t0 + 0.25, w(22, 'mano') + 0.5), x: { ...parla('isp', t), smile: 0.55, gazeY: -0.15 } }) }));

  // --- «Prima però mi passi il telefono. Non vorrà che le cada di sotto.»: la tua mano che stringe la tasca (ti tradisce); poi le sue dita che lo chiamano
  const due = w(23, 'non') - 0.2;
  sc(r(23) - 0.3, (t, k) => { const pr = io(prog(t, r(23) + 0.5, r(23) + 1.1)), p = PT.tasca;
    return { ...FB, id: 'tasca', cam: v3([p[0] + 0.5, p[1] + 0.42, p[2] + 0.36], [p[0] + 0.45, p[1] + 0.38, p[2] + 0.33], io(k)), look: [p[0] - 0.03, p[1] + 0.03, p[2]], fov: 32, ...LUCE, fronte: 0.22,
      riva: rivaSporge(t, 1, { mano: 1 }), tu: tuAngolo(t, { headYaw: -0.5, headPitch: -0.25, breathe: sin(t * 6), armR: { ...SU_TASCA, delta: [0.164 - 0.004 * pr, -0.073 - 0.004 * pr, -0.159], mano: pr > 0.5 ? { indice: { mcp: 22, pip: 30, dip: 16 }, medio: { mcp: 24, pip: 32, dip: 18 }, anulare: { mcp: 24, pip: 32, dip: 18, ab: 4 }, mignolo: { mcp: 24, pip: 30, dip: 16, ab: 7 }, pollice: { ab: 20, fl: 14, roll: 10, mcp: 12, ip: 12 } } : 'piatta' } }) }; });
  sc(due, (t, k) => { const d = 0.5 * (bump(t, due + 0.55, 0.3) + bump(t, due + 1.2, 0.3));
    return { ...FB, id: 'dammi', pioggia: 0.4, cam: su(v3([7.0, FY + 0.98, 0.72], [6.95, FY + 1.0, 0.76], io(k)), trema(t, 0.5), 1), look: [6.26, FY + 1.16, 1.2], fov: 26, ...LUCE, tu: lontano,
      riva: rivaSporge(t, 1, { mano: 1, dammi: d, x: { ...parla('isp', t), smile: 0.6, gazeY: -0.15 } }) }; });

  // --- cosa fai?
  sc(r(24) - 0.2, (t) => ({ ...FB, id: 'carte', carte: 1, sfoca: 1, ...POV, ...LUCE, tu: lontano, riva: rivaSporge(t, 1, { mano: 1, x: { smile: 0.55 } }) }));
  S.sort((a, b) => a.t0 - b.t0); S.forEach((s, i) => { s.t1 = i + 1 < S.length ? S[i + 1].t0 : END; });
  return S;
}
function shot(t) { let s = SEQ[0]; for (const x of SEQ) if (t >= x.t0) s = x; return s.f(t, clamp((t - s.t0) / Math.max(0.001, s.t1 - s.t0)), s); }

// ------------------------------------------------------------------ sopra l'immagine: sottotitoli, pioggia, spioncino, schermo del telefono, carte
function subtitles(ctx, t) {
  let ci = -1;
  for (let i = 0; i < CHUNKS.length; i++) if (t >= CHUNKS[i][0][0] - 0.05) ci = i;
  if (ci < 0) return;
  const ch = CHUNKS[ci], next = CHUNKS[ci + 1];
  if (t > ch[ch.length - 1][1] + 0.4 && (!next || t < next[0][0] - 0.05)) return;
  const size = 74, fB = font(size, 800, 'Display'), fR = font(size, 500, 'UI');
  ctx.save(); ctx.textBaseline = 'alphabetic';
  const veil = ctx.createLinearGradient(0, 0, 0, H * 0.3); veil.addColorStop(0, 'rgba(0,0,0,0.5)'); veil.addColorStop(0.6, 'rgba(0,0,0,0.28)'); veil.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = veil; ctx.fillRect(0, 0, W, H * 0.3);
  const items = ch.map((x) => { ctx.font = fB; return { w: x, width: ctx.measureText(x[2]).width }; });
  const space = size * 0.28, maxW = W * 0.82, lines = [[]]; let lw = 0;
  items.forEach((it) => { if (lw + it.width > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(it); lw += it.width + space; });
  const y0 = H * 0.145;
  lines.forEach((line, li) => {
    const tot = line.reduce((a, it) => a + it.width, 0) + space * (line.length - 1);
    let x = (W - tot) / 2; const y = y0 + li * size * 1.12;
    line.forEach((it) => {
      const [s0, s1, txt] = it.w, said = t >= s1, now = t >= s0 && t < s1 + 0.04;
      ctx.font = now ? fB : fR; ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineJoin = 'round';
      ctx.globalAlpha = now || said ? 1 : 0.28; ctx.strokeText(txt, x, y);
      ctx.fillStyle = now ? '#ffffff' : said ? '#c9c9c9' : '#ffffff'; ctx.fillText(txt, x, y);
      x += it.width + space;
    });
  });
  ctx.restore();
}
function pioggia(ctx, t, a) {
  ctx.save(); ctx.strokeStyle = 'rgba(190,205,235,1)'; ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) { const sp = 1500 + 900 * M.hash01(i, 3), x0 = M.hash01(i, 1) * (W + 300) - 100, y = ((M.hash01(i, 2) * (H + 300) + t * sp) % (H + 300)) - 150, len = 46 + 60 * M.hash01(i, 4);
    ctx.globalAlpha = a * (0.06 + 0.1 * M.hash01(i, 5)); ctx.lineWidth = 1.5 + 1.5 * M.hash01(i, 6); ctx.beginPath(); ctx.moveTo(x0 - y * 0.12, y); ctx.lineTo(x0 - (y + len) * 0.12, y + len); ctx.stroke(); }
  ctx.restore();
}
function spioncino(ctx) {
  const cx = W / 2, cy = H * 0.47, r0 = W * 0.5, r1 = W * 0.57;
  const g = ctx.createRadialGradient(cx, cy, r0 * 0.55, cx, cy, r1);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.72, 'rgba(0,0,0,0.28)'); g.addColorStop(0.9, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(cx, cy, r1, 0, Math.PI * 2, true); ctx.fill('evenodd');
  const v = ctx.createRadialGradient(cx - r0 * 0.35, cy - r0 * 0.4, 0, cx - r0 * 0.35, cy - r0 * 0.4, r0 * 0.9);
  v.addColorStop(0, 'rgba(255,240,200,0.07)'); v.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = v; ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI * 2); ctx.fill();
}
// lo schermo del telefono con le chiamate recenti: il 112 in cima, il pollice sopra «Richiama»; poi lo schermo scende via
function schermoChiamate(ctx, t, s) {
  const k = E.outCubic(prog(t, s.t0 + 0.15, s.t0 + 0.6)) * (1 - E.inCubic(prog(t, w(6, 'mandato') - 0.1, rf(6) + 0.1))), pw = 600, ph = 1180, x = (W - pw) / 2 + 5 * M.noise1(t * 3, 11), y = 470 + (1 - k) * 320 + 4 * M.noise1(t * 3.4, 12);
  if (k <= 0.01) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.2);
  ctx.shadowColor = 'rgba(150,190,255,0.35)'; ctx.shadowBlur = 90; M.rrect(ctx, x, y, pw, ph, 64); ctx.fillStyle = '#0B0C0F'; ctx.fill(); ctx.shadowBlur = 0;
  M.rrect(ctx, x + 16, y + 16, pw - 32, ph - 32, 50); ctx.fillStyle = '#12151B'; ctx.fill(); ctx.save(); ctx.clip();
  ctx.fillStyle = '#E8EDF5'; ctx.font = font(34, 700, 'Display'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('03:04', x + 52, y + 64); ctx.textAlign = 'right'; ctx.fillText('29%', x + pw - 52, y + 64);
  ctx.textAlign = 'left'; ctx.font = font(46, 700, 'Display'); ctx.fillText('Recenti', x + 52, y + 156);
  const riga = (yy, nome, sotto, ora, rosso) => { ctx.fillStyle = rosso ? 'rgba(255,69,58,0.12)' : 'rgba(255,255,255,0.04)'; M.rrect(ctx, x + 36, yy, pw - 72, 150, 26); ctx.fill();
    ctx.fillStyle = rosso ? '#FF453A' : '#E8EDF5'; ctx.font = font(52, 800, 'Display'); ctx.textAlign = 'left'; ctx.fillText(nome, x + 66, yy + 56); ctx.fillStyle = '#9AA6B8'; ctx.font = font(28, 500, 'UI'); ctx.fillText(sotto, x + 66, yy + 110); ctx.textAlign = 'right'; ctx.fillText(ora, x + pw - 66, yy + 56); };
  riga(y + 230, '112', 'Emergenze · in uscita · 1 min', '02:52', true); riga(y + 400, 'Mamma', 'in entrata · 4 min', 'ieri', false); riga(y + 570, 'Sig.ra Ada (int. 11)', 'in uscita · 2 min', 'lun', false);
  const on = 0.5 + 0.5 * sin(t * 6); M.rrect(ctx, x + 70, y + 800, pw - 140, 120, 60); ctx.fillStyle = `rgba(48,209,88,${0.75 + 0.25 * on})`; ctx.fill(); ctx.fillStyle = '#06210D'; ctx.font = font(46, 800, 'Display'); ctx.textAlign = 'center'; ctx.fillText('Richiama il 112', x + pw / 2, y + 862);
  ctx.restore(); ctx.restore();
}
// una carta (immagine, bollo, etichetta); acc = illuminata, spenta = l'altra sta parlando
function carta(ctx, t, y, lettera, col, testo, img, acc, k, spenta) { if (k <= 0) return; const x = 70, cw = 860, chh = 480, sc = 1 + 0.035 * acc;
  ctx.save(); ctx.globalAlpha = k * (1 - 0.45 * spenta); ctx.translate(x + cw / 2 + (1 - k) * 220, y + chh / 2); ctx.scale(sc, sc); ctx.translate(-cw / 2, -chh / 2);
  ctx.shadowColor = acc > 0.1 ? col : 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30 + 50 * acc; M.rrect(ctx, 0, 0, cw, chh, 36); ctx.fillStyle = '#0D1016'; ctx.fill(); ctx.shadowBlur = 0;
  M.rrect(ctx, 0, 0, cw, chh, 36); ctx.save(); ctx.clip();
  if (img) { const z = 1.05 + 0.04 * sin(t * 0.5 + y), iw = cw * z, ih = iw * img.height / img.width; ctx.drawImage(img, (cw - iw) / 2, (chh - ih) / 2, iw, ih); }
  const g = ctx.createLinearGradient(0, chh * 0.45, 0, chh); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.88)'); ctx.fillStyle = g; ctx.fillRect(0, 0, cw, chh);
  ctx.restore(); M.rrect(ctx, 0, 0, cw, chh, 36); ctx.lineWidth = 5 + 4 * acc; ctx.strokeStyle = acc > 0.1 ? col : 'rgba(255,255,255,0.28)'; ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(74, 74, 46, 0, 7); ctx.fill(); ctx.fillStyle = '#0D1016'; ctx.font = font(60, 800, 'Display'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lettera, 74, 79);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = font(58, 800, 'Display'); testo.forEach((riga, i) => ctx.fillText(riga, 40, chh - 46 - (testo.length - 1 - i) * 66));
  ctx.restore(); }
function carte(ctx, t) {
  const ent = (d) => E.outCubic(prog(t, r(24) - 0.1 + d, r(24) + 0.45 + d)), a = prog(t, r(25) - 0.1, r(25) + 0.15) * (1 - prog(t, r(26) - 0.15, r(26) + 0.1)), b = prog(t, r(26) - 0.1, r(26) + 0.15) * (1 - prog(t, r(27) - 0.15, r(27) + 0.1));
  const fin = prog(t, r(27) - 0.1, r(27) + 0.3);
  carta(ctx, t, 470, 'A', '#F2B63C', ['GLI PASSI', 'IL TELEFONO'], IMG.cartaA, a, ent(0), b);
  carta(ctx, t, 990, 'B', '#5CB8FF', ['«MI È GIÀ CADUTO', 'DI SOTTO»'], IMG.cartaB, b, ent(0.18), a);
  if (fin > 0) { ctx.save(); ctx.globalAlpha = fin; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(60, 800, 'Display'); ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineJoin = 'round';
    ctx.strokeText('Scrivi A o B nei commenti', W / 2 - 20, 1556); ctx.fillStyle = '#fff'; ctx.fillText('Scrivi A o B nei commenti', W / 2 - 20, 1556); ctx.restore(); }
}
// «Avete scelto la B.»: la carta B dell'episodio 1, da sola, con il segno di chi ha vinto
function scelta(ctx, t) {
  const k = E.outCubic(prog(t, 0.05, 0.5)) * (1 - prog(t, r(2) - 0.5, r(2) - 0.3)), seg = E.outBack ? E.outBack(prog(t, 0.55, 0.95)) : E.outCubic(prog(t, 0.55, 0.95));
  carta(ctx, t, 720, 'B', '#5CB8FF', ['SCAPPI', 'DAL BALCONE'], IMG.sceltaB, 1, k, 0);
  if (k > 0.01) { ctx.save(); ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(64, 800, 'Display'); ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineJoin = 'round';
    ctx.strokeText('AVETE SCELTO', W / 2, 640); ctx.fillStyle = '#fff'; ctx.fillText('AVETE SCELTO', W / 2, 640);
    if (seg > 0) { ctx.translate(840, 800); ctx.scale(seg, seg); ctx.fillStyle = '#30D158'; ctx.beginPath(); ctx.arc(0, 0, 62, 0, 7); ctx.fill(); ctx.strokeStyle = '#06210D'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-28, 2); ctx.lineTo(-8, 24); ctx.lineTo(30, -20); ctx.stroke(); }
    ctx.restore(); }
}
// un fotogramma di un set in una tela piccola (per le carte)
function scatto(set, o, wd = 540, luce = 1, hg = 0) { const cv = document.createElement('canvas'); cv.width = wd; cv.height = hg || Math.round(wd * H / W); const c = cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
  if (hg) set.camera.aspect = wd / hg; c.scale(wd / W, cv.height / H); if (luce !== 1) c.filter = `brightness(${luce})`; G.renderSet(c, set, 0, 0, o);
  if (hg) { set.camera.aspect = W / H; set.camera.updateProjectionMatrix(); } return cv; }

M.film({
  fonts: [font(74, 800, 'Display'), font(74, 500, 'UI')],
  samples: 1,
  async init() {
    RIGHE = await fetch('assets/parole.json').then((x) => x.json()); WORDS = RIGHE.flat();
    try { BOCCA = await fetch('assets/bocca.json').then((x) => (x.ok ? x.json() : [])); } catch { BOCCA = []; }
    { let a = null; for (const q of WORDS) { if (q[2].includes('«')) a = q[0]; if (q[2].includes('»') && a !== null) { DETTI.push([a - 0.05, q[1] + 0.05]); a = null; } } }
    CHUNKS = chunks(WORDS); T0 = Number(M.CFG.inizio_fotogramma || 0) / 30; END = Number(M.CFG.duration || 130) + T0;
    await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; SF = fuoriSet({ balcone: true }); SI = ingressoSet(); SP = pianerottoloSet({ vano11: true });
    { SF.update(0, 0, { ...FB, tu: tuAngolo(0) }); SF.scene.updateMatrixWorld(true); const v = new THREE.Vector3(); SF.T.AR.gH.getWorldPosition(v); PT.tasca = [v.x, v.y - 0.06, v.z]; }      // dove sta la tua mano sulla tasca, nel mondo (per l'inquadratura)
    SEQ = sequenza(); window.TEMPI = SEQ.map((s) => [Math.round(s.t0 * 100) / 100, s.f(s.t0 + 0.01, 0, s).id]);
    // le immagini fisse: la carta votata nell'episodio 1 e le due carte nuove (la stessa soggettiva: col telefono teso verso la sua mano, o con la mano vuota)
    IMG.sceltaB = scatto(SF, { ...FB, cam: [4.5, FY + 1.5, 0.2], look: [4.2, FY - 3.2, 6.5], fov: 30, tu: lontano }, 860, 1.7, 480);
    // (tu mezzo alzato verso la ringhiera, visto da dietro la tua spalla: la tua mano e la sua al centro, sopra il vuoto)
    const cA = { ...FB, cam: [6.78, FY + 1.3, 0.8], look: [6.36, FY + 1.17, 1.16], fov: 36, ...LUCE, ambiente: 0.42, fronte: 0.34, pioggia3: 0.6 };
    const tuCarta = (x) => ({ pos: [6.66, FY, 0.6], yaw: -0.55, sit: 0.45, sedile: 0.25, gambe: { aL: 0.5, gL: 0.9, aR: 0.4, gR: 0.8 }, lean: 0.25, senzaTesta: true, ...x });
    IMG.cartaA = scatto(SF, { ...cA, telTu: 1, telSchermo: 1, riva: rivaSporge(0, 1, { mano: 1, x: { smile: 0.6 } }),
      tu: tuCarta({ armR: { mondo: [6.47, FY + 1.13, 1.07], gomitoM: [0.5, -1, -0.4], ditaM: [-0.15, 1, 0.15], dorsoM: [-0.7, 0, 0.7], mano: 'presa' } }) }, 860, 1.2, 480);
    IMG.cartaB = scatto(SF, { ...cA, telTu: 0, riva: rivaSporge(0, 1, { mano: 1, x: { smile: 0.05, angry: 0.35 } }),
      tu: tuCarta({ armR: { mondo: [6.52, FY + 1.16, 1.0], gomitoM: [0.5, -1, -0.4], ditaM: [-0.7, 0.15, 0.7], dorsoM: [0, -1, 0], mano: { indice: { mcp: 4, pip: 8, dip: 5, ab: -6 }, medio: { mcp: 6, pip: 10, dip: 6 }, anulare: { mcp: 8, pip: 12, dip: 7, ab: 6 }, mignolo: { mcp: 10, pip: 14, dip: 8, ab: 12 }, pollice: { ab: 34, fl: 6, roll: 20, mcp: 4, ip: 6 } } } }) }, 860, 1.2, 480);
  },
  draw(ctx, u, t) {
    t += T0; { const k = t * 30; if (Math.abs(k - Math.round(k)) < 1e-6) t = Math.round(k) / 30; } u = M.U(t);
    const o = shot(t);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (M.CFG.viste && o.set === 'F') {                                                          // controllo delle pose: la stessa scena da più lati, in chiaro
      M.CFG.viste.forEach((v, i) => { const c0 = v.centro || o.look, oo = { ...o, look: c0, cam: [c0[0] + v.dir[0] * v.dist, Math.max(0.25, c0[1] + v.dir[1] * v.dist), c0[2] + v.dir[2] * v.dist], fov: v.fov || 30, ambiente: 0.8, fronte: 0.45, roll: 0 };
        if (oo.tu) oo.tu = { ...oo.tu, senzaTesta: false };
        ctx.save(); ctx.translate((i % 2) * W / 2, Math.floor(i / 2) * H / 2); ctx.beginPath(); ctx.rect(0, 0, W / 2, H / 2); ctx.clip(); ctx.scale(0.5, 0.5); G.renderSet(ctx, SF, t, u, oo); ctx.restore(); });
      ctx.fillStyle = '#ff0'; ctx.font = '700 26px Display'; ctx.fillText(`${o.id}  t=${(t - T0).toFixed(2)}`, 14, 34); return; }
    G.renderSet(ctx, o.set === 'F' ? SF : o.set === 'I' ? SI : SP, t, u, o);
    if (o.sfoca) { ctx.fillStyle = 'rgba(4,6,10,0.72)'; ctx.fillRect(0, 0, W, H); }
    if (o.pioggia) pioggia(ctx, t, o.pioggia);
    if (o.spioncino) spioncino(ctx);
    if (o.ui === 'chiamate') schermoChiamate(ctx, t, SEQ.find((s) => t >= s.t0 && t < s.t1));
    if (o.scelta) scelta(ctx, t);
    if (o.carte) carte(ctx, t);
    subtitles(ctx, t);
    const a = Math.max(1 - prog(t, 0, 0.3), prog(t, END - 0.7, END));
    if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
  },
  post(ctx, u, t) { const o = shot(t + T0); if (o.spioncino || o.carte || o.scelta) return; const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.5, H * 0.8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); },
});
