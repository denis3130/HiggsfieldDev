// Il Bivio — «Il testimone», episodio 2: «Interno 11» (ha vinto la B dell'episodio 1: non apri, e scappi dal balcone col telefono).
// Terza versione, approvata dall'utente il 27/11 dopo «impara dai migliori registi dei film da oscar ecc e prendi la loro arte»: la fuga riesce davvero
// (appartamento vuoto, l'altra scala, fuori), poi la telefonata dal numero della signora Ada. Funzione pura del tempo, come l'episodio 1: ogni inquadratura
// è agganciata alle parole della voce (assets/parole.json; r(n) = inizio della riga n del copione, w(n, 'parola') = inizio di quella parola).
// Set: l'ingresso di casa tua (con la porta che si apre da fuori), il pianerottolo dallo spioncino, fuori (i balconi e l'appartamento vuoto visto da dentro),
// la tromba dell'altra scala, il portico in strada, il soggiorno della signora Ada.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE } from './sets/stile.js';
import { fuoriSet, WX, FY, AUTO } from './sets/esterno_set.js';
import { BAL } from './sets/balcone.js';
import { ingressoSet, pianerottoloSet } from './sets/testimone_set.js';
import { scalaSet } from './sets/scala.js';
import { porticoSet } from './sets/portico.js';
import { adaSet } from './sets/ada_set.js';
import { battito } from './sets/pupazzi.js';
const { W, H, E, prog, lerp, clamp, font, bump } = M;
let SF = null, SI = null, SP = null, SC = null, PO = null, AD = null, VUOTO_LEVA = null, MART = null, RIGHE = [], WORDS = [], CHUNKS = [], END = 130, BOCCA = [], DETTI = [], SEQ = [], IMG = {}, PT = { tasca: [6.95, 12.2, 0.5], T1: 0.43, T2: 0.42, hy: 0.93 };
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
const PAURA = { fear: 1, browUp: 0.7, sad: 0.6, mouth: 0.16, open: 1, smile: -0.35 };      // (smile negativo: gli angoli della bocca in giù; a zero la bocca aperta sembrava un sorriso)
const FB = { set: 'F', cucina: 0, tenda: 0, elena: via, riva: lontano, ambiente: 0.25, fronte: 0.13, pioggia: 0.3 };      // di base, fuori di notte
const passi = (fase, amp = 0.4) => ({ aL: amp * sin(fase), gL: 0.06 + 0.8 * amp * Math.max(0, -Math.cos(fase)), aR: -amp * sin(fase), gR: 0.06 + 0.8 * amp * Math.max(0, Math.cos(fase)) });
// una camminata che parte e si ferma senza scatti (va = 0..1 lungo il tragitto): l'ampiezza del passo cresce all'inizio e si spegne alla fine, così i piedi
// si riuniscono da soli. Con `va > 0.01 && va < 0.99 ? passi(...) : {}` all'ultimo fotogramma le gambe saltavano da metà passo a unite (si vedeva sulle scarpe).
const cammina = (va, fase, amp = 0.3) => { const f = Math.max(0, Math.min(1, va / 0.12, (1 - va) / 0.2)), p = va * fase, a = amp * f; return { aL: a * sin(p), gL: f * (0.06 + 0.8 * amp * Math.max(0, -Math.cos(p))), aR: -a * sin(p), gR: f * (0.06 + 0.8 * amp * Math.max(0, Math.cos(p))) }; };
// il telefono in mano (AR): basso lungo il fianco, davanti per guardarlo, stretto al petto con lo schermo contro la maglia
const TEL_BASSO = { a: [0.13, 0.2, 0.26], gomito: [1, -0.7, -0.2], dita: [0, 0.92, 0.25], dorso: [0, 0, 1], mano: 'presa' };
const TEL_GUARDA = { a: [0.1, 0.3, 0.3], gomito: [1, -0.8, -0.1], dita: [-0.1, 0.9, -0.3], dorso: [0, 0.45, 1], mano: 'presa' };
const TEL_PETTO = { a: [0.05, 0.25, 0.2], gomito: [0.8, -1, -0.1], dita: [-0.55, 0.75, 0.1], dorso: [0.15, 0.1, 1], mano: 'presa' };
// il telefono finisce in tasca quando esci (la sinistra lo infila nella tasca della tuta); da rannicchiato una mano resta sopra la tasca, l'altra sul ginocchio
// (il gomito va INDIETRO, non di lato: di lato sembra un'ala e nella portafinestra, larga 60 cm, finisce dentro lo stipite)
const IN_TASCA = { a: [0.2, -0.06, 0.06], gomito: [0.3, 0, -1], dita: [-0.1, -1, 0.1], dorso: [0.6, 0, 0.8], mano: 'presa' };
// (dal petto alla tasca la mano gira al largo del busto: in linea retta lo attraversava. FUORI è il punto di controllo della curva)
const FUORI_TASCA = { a: [0.275, 0.065, 0.27], gomito: [0.6, -0.2, -0.8], dita: [0, -0.8, 0.6], dorso: [0.8, 0.2, 0.6], mano: 'presa' };
const versoTasca = (k) => mixA(mixA(TEL_PETTO, FUORI_TASCA, k), mixA(FUORI_TASCA, IN_TASCA, k), k);
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
  const presa = { sbarra: CR(lerp(6.12, 6.2, k) - 0.2 * (1 - io(clamp(x.arriva ?? 1))), -1), gomitoM: [0.3, -1, -0.3] }, tesa = { mondo: [6.28, FY + 1.13 + 0.012 * sin(t * 1.3), 1.22], gomitoM: [0.5, -1, 0.1], ditaM: [0.8, -0.05, -0.55], dorsoM: [0, -1, 0], mano: manoTesa(dammi) };
  return { pos: [lerp(5.6, 5.85, k), FY, lerp(0.8, 0.88, k)], yaw: 0, lean: lerp(0.16, 0.3, k), side: -0.14 * k, twist: 0.1 * k, headYaw: lerp(0.35, 0.9, k), headPitch: 0.1 * k, headRoll: -0.2 * k, breathe: sin(t * 1.8), blink: battito(t, 21), open: 0.72,
    armL: { sbarra: CR(lerp(5.3, 5.45, k), 1), gomitoM: [-1, -0.5, -0.1] }, armR: m <= 0 ? presa : m > 0.98 ? tesa : { mondo: v3([lerp(6.12, 6.2, k), YR + 0.06, ZR + 0.02], tesa.mondo, m), gomitoM: tesa.gomitoM, ditaM: v3([0.5, -0.5, -0.6], tesa.ditaM, m), dorsoM: v3([0.3, 1, 0.2], tesa.dorsoM, m), mano: manoTesa(0.5 * (1 - m)), da: presa, k: io(clamp(m / 0.4)) }, ...x }; };      // (da: presa = la mano si stacca dal corrimano a poco a poco: prima saltava in un fotogramma)
const POV = { cam: [7.25, FY + 0.82, 0.45], look: [6.2, FY + 1.42, 1.15], fov: 40, fronte: 0.19 };      // quello che vedi tu, rannicchiato, guardando il bordo del divisorio
const LUCE = { casa: { soggiorno: 1, corridoio: 1 }, porta: 0.6, tendaScosta: 0.9 };       // casa tua con la luce accesa e la portafinestra aperta (lui è uscito)


// ------------------------------------------------------------------ la sequenza delle inquadrature
// Regia (sezione 5 di data/horror/FORMATO_STORIA.md): suspense alla Hitchcock (il pubblico vede la chiave che gira mentre tu scavalchi, e alla fine lui
// dietro la signora Ada), silenzi senza voce né musica (l'ombra sotto la porta, lo scavalco, il muro), il cattivo gentile che alla fine guarda in macchina,
// i dettagli che tornano (lo scricchiolio, le chiavi, la signora Ada tra le chiamate, il dito sulle labbra), la camera che passa attraverso il muro.
const ORECCHIO = { a: [0.12, 0.452, 0.082], gomito: [0.8, -1, -0.1], dita: [-0.1, 0.87, -0.48], dorso: [1, 0, -0.15], mano: 'orecchio' };
const DITO = { a: [-0.03, 0.385, 0.16], gomito: [0.5, -1, -0.2], dita: [0.1, 1, 0.1], dorso: [-0.5, 0, 0.87], mano: 'indice' };
const ADA_TEL = { a: [0.104, 0.393, 0.071], gomito: [0.8, -1, -0.1], dita: [-0.1, 0.87, -0.48], dorso: [1, 0, -0.15], mano: 'orecchio' };
const ADA_GREMBO = { a: [-0.16, -0.08, 0.3], gomito: [-0.8, -0.6, -0.2], dita: [0.2, -0.4, 1], dorso: [0, 1, 0.2], mano: 'rilassata' };
const adaSeduta = (t, x = {}) => ({ pos: [0, 0, -0.38], yaw: 0, sit: 1, sedile: 0.47, lean: 0.06, headYaw: 0.12, headPitch: 0.02, smile: 0.55, breathe: sin(t * 2.2), blink: battito(t, 33), armR: ADA_TEL, armL: ADA_GREMBO, ...x });
const BUIO = { ambiente: 0.05, fronte: 0.025 };                                                    // dentro l'appartamento vuoto
const VU = { rotto: 9, maniglia: 1, anta: 0.35 };                                                  // il vetro già rotto, l'anta socchiusa
const corsa = (f, amp = 0.55) => ({ aL: amp * sin(f), gL: 0.12 + 0.9 * amp * Math.max(0, -Math.cos(f)), aR: -amp * sin(f), gR: 0.12 + 0.9 * amp * Math.max(0, Math.cos(f)) });
const braccia = (f, k = 1) => ({ armL: { a: [-0.24, -0.02 + 0.06 * k * Math.max(0, sin(f)), 0.1 + 0.16 * k * sin(f)], gomito: [-0.5, -0.6, -0.6], mano: 'pugno' }, armR: { a: [0.24, -0.02 + 0.06 * k * Math.max(0, -sin(f)), 0.1 - 0.16 * k * sin(f)], gomito: [0.5, -0.6, -0.6], mano: 'pugno' } });
const corsaScala = (s, t) => { const [x, y, z, h] = SC.percorso(s), f = s * 2.6; return { pos: [x, y, z], yaw: h, lean: 0.2, ...PAURA, breathe: sin(t * 7), mouth: 0.35, gambe: corsa(f, 0.5), ...braccia(f, 0.6) }; };
function sequenza() {
  const S = [], sc = (t0, f) => S.push({ t0, f });
  const trema = (t, a = 1) => [0.012 * a * M.noise1(t * 1.7, 5), 0.01 * a * M.noise1(t * 2.1, 7), 0];

  // --- «Avete scelto la B.»: la carta votata, un attimo
  sc(0, (t) => ({ set: 'I', id: 'scelta', scelta: 1, sfoca: 1, cam: [0.5, 1.5, 0.4], look: [0, 1.0, -2.4], fov: 40, piedi: 1, telefono: 1, tu: { pos: [-0.05, 0, -1.75], yaw: Math.PI, armR: TEL_BASSO } }));

  // --- «Non apri. Non respiri.»: il corridoio buio; poi, da terra, la luce sotto la porta e l'ombra dei suoi piedi, ferma. Silenzio. Poi l'ombra se ne va.
  const tOm = w(2, 'respiri') - 0.25, tVia = rf(2) + 0.75, tS = tVia + 0.55;
  sc(r(2) - 0.3, (t, k) => ({ set: 'I', id: 'buio', cam: v3([0.5, 1.64, 1.6], [0.42, 1.6, 0.95], io(k)), look: [0.05, 1.02, -2.5], fov: 44, piedi: 1, telefono: 1, amb: 0.14, fronte: 0.05,
    tu: { pos: [-0.05, 0, -1.75], yaw: Math.PI, breathe: 0.2 * sin(t * 3.4), armR: TEL_BASSO } }));
  sc(tOm, (t, k) => ({ set: 'I', id: 'ombra', cam: v3([0.16, 0.09, -1.2], [0.12, 0.085, -1.45], io(k)), look: [0.02, 0.03, -2.56], fov: 40, piedi: 1, piediDx: 0.9 * E.inCubic(prog(t, tVia, tVia + 0.7)), telefono: 0, amb: 0.1, fronte: 0.03, tu: { pos: [30, 0, 30] } }));

  // --- lo spioncino: va alla porta di fronte, suona, la vicina socchiude con la catenella, lui mostra il distintivo; lei va a prendere le chiavi e lui si volta verso di te;
  //     la luce delle scale si spegne e quando torna lui è più vicino
  const giu = { a: [-0.253, -0.21, 0.035], gomito: [-0.6, -0.3, -0.75], dita: [0, -1, 0.05], dorso: [0, 0, 1], mano: 'rilassata' };
  const DIST_SU = { a: [-0.1, 0.33, 0.33], gomito: [-1, -0.8, -0.1], dita: [0, 1, 0.05], dorso: [0, 0, -1], mano: 'tessera' };
  const tGira = tS + 0.15, tVa = tGira + 0.45, tArr = tVa + 1.25, tSuona = tArr + 0.1, tApre = r(3) - 0.35, tChiude = r(4) + 0.1, tVolta = r(4) + 0.9, buioA = w(4, 'piante') + 0.1;
  const spio = (t) => { const gira = io(prog(t, tGira, tVa + 0.2)), va = io(prog(t, tVa, tArr)), suona = bump(t, tSuona + 0.35, 0.45), apre = io(prog(t, tApre, tApre + 0.5)) * (1 - 0.72 * io(prog(t, tChiude, tChiude + 0.5)));
    const mostra = io(prog(t, tApre + 0.25, tApre + 0.8)) * (1 - io(prog(t, tChiude - 0.5, tChiude))), volta = io(prog(t, tVolta, tVolta + 1.4)), nero = t > buioA && t < buioA + 0.45 ? 1 : 0, dopo = t >= buioA + 0.45 ? 1 : 0;
    const z = lerp(lerp(0.72, 2.72, va), 1.9, dopo), x = lerp(0.02, -0.12, va), cam = prog(t, tVa, tArr + 1);
    return { set: 'P', id: 'spio', spioncino: 1, cam: [0.008 * M.noise1(t * 0.6, 3), 1.56 + 0.005 * M.noise1(t * 0.5, 4), 0.03], look: [lerp(0, -0.1, cam), lerp(1.6, 1.5, cam), 1], fov: lerp(72, lerp(46, 40, prog(t, tArr, tChiude)), io(cam)) + 10 * dopo,
      porta11: apre, buio: 0.25 + 0.6 * dopo, luce: nero ? 0 : 1,
      isp: { pos: [x, 0, z - 0.02 * Math.abs(sin((z - 0.72) * 4.5))], yaw: Math.PI * (1 + gira) - Math.PI * volta, breathe: sin(t * 1.9), blink: battito(t, 21), open: 0.72, gambe: cammina(va, 9, 0.36),
        ...(t < r(4) ? parla('isp', t) : {}), smile: 0.2 * mostra + 0.55 * volta, gazeY: -0.1, headPitch: 0.06, headRoll: 0.06 * volta, distintivo: mostra > 0.5,
        armL: mostra > 0.02 ? { ...DIST_SU, da: giu, k: mostra } : giu,
        armR: suona > 0.02 ? { mondo: v3([x + 0.26, 0.9, z + 0.05], [0.33, 1.25, 3.45], suona), gomito: [1, -0.8, 0], ditaM: [0, 0, 1], dorsoM: [0, 1, 0], mano: 'indice', k: Math.min(1, suona * 3) } : undefined } }; };
  sc(tS, spio);
  const asc0 = w(3, 'vicino') - 0.2, asc1 = w(3, 'lei') - 0.15;
  sc(asc0, (t, k) => ({ set: 'I', id: 'ascolti', porta: false, cam: v3([0.07, 1.675, -3.02], [0.05, 1.675, -2.94], io(k)), look: [0, 1.668, -2.0], fov: 24, occhio: 0.5, telefono: 1, piedi: 0,
    tu: { pos: [0, 0, -2.08], yaw: Math.PI, breathe: sin(t * 3.6), fear: 0.9, browUp: 0.6, sad: 0.5, mouth: 0.08, headPitch: 0.03, gazeX: 0.25 * sin(t * 2.2),
      armR: { a: [0.13, 0.03, 0.2], gomito: [1, -0.5, -0.4], dita: [0, 0.6, 0.6], dorso: [0, -0.5, 1], mano: 'presa' } } }));
  sc(asc1, spio);

  // --- «Hai il tempo che le serve per trovarle.»: ti stacchi dalla porta e vai via; poi, dal balcone, esci (il telefono in tasca)
  const tVai = r(5) - 0.28, esce = w(5, 'trovarle') + 0.35;
  sc(tVai, (t, k, s) => { const ind = io(prog(t, s.t0, s.t0 + 0.8)), gira = io(prog(t, s.t0 + 0.6, s.t0 + 1.4)), va = io(prog(t, s.t0 + 1.2, esce + 0.2));
    return { set: 'I', id: 'vai', cam: v3([0.45, 1.5, -0.2], [0.4, 1.48, 0.15], io(k)), look: [0, 1.25, -1.9], fov: 42, piedi: 0, telefono: 1, amb: 0.16, fronte: 0.05,
      tu: { pos: [lerp(0, -0.12, va), 0, lerp(lerp(-2.08, -1.6, ind), 0.6, va)], yaw: Math.PI - Math.PI * gira, breathe: sin(t * 4.5), ...PAURA, headYaw: 0.5 * bump(gira, 0.5, 0.5), gambe: cammina(ind * 0.3 + va * 0.7, 8, 0.32), armR: TEL_BASSO } }; });
  const GIU_S = { a: [0.253, -0.21, 0.035], gomito: [0.6, -0.3, -0.75], dita: [0, -1, 0.05], dorso: [0, 0, 1], mano: 'rilassata' };
  const tTel = esce + 0.55, tIn = esce + 1.25;
  sc(esce, (t, k) => { const ap = io(prog(t, esce + 0.05, esce + 0.6)), va = io(prog(t, esce + 0.35, esce + 1.5)), ch = io(prog(t, esce + 1.6, esce + 2.8)), av = io(prog(t, esce + 1.3, esce + 2.9));
    const ts = io(prog(t, esce + 0.1, esce + 0.6)) * (1 - io(prog(t, tIn, tIn + 0.9)));
    return { ...FB, id: 'esci', cam: v3([5.75, FY + 1.5, 2.9], [5.55, FY + 1.46, 2.5], io(k)), look: [4.75, FY + 1.18, 0], fov: 42,
      porta: lerp(0.85 * ap, 0.12, ch), tendaScosta: ts, tendaLarga: ts, vento: 1, telTu: t < tIn - 0.12 ? 1 : 0, telSchermo: 0.5,
      tu: { pos: [lerp(lerp(4.78, 4.86, io(prog(va, 0.7, 1))), 5.6, av), FY, lerp(lerp(-0.85, 0.3, va), 0.72, av)], yaw: 0.9 * av, ...PAURA, breathe: sin(t * 5), gambe: (va > 0.01 && va < 0.99) || (av > 0.01 && av < 0.99) ? passi(va * 9 + av * 6, 0.32) : {},
        armR: t < tIn + 0.15 ? versoTasca(io(prog(t, tTel, tIn - 0.1))) : mixA(IN_TASCA, GIU_S, io(prog(t, tIn + 0.15, tIn + 0.75))) } }; });

  // --- «Il balcone accanto è di un appartamento vuoto da mesi.»: ti sporgi a guardare oltre il divisorio; il balcone vuoto, la portafinestra buia
  const tGu = r(6) - 0.2, tV2 = w(6, 'appartamento') - 0.05;
  sc(tGu, (t, k, s) => { const gira = io(prog(t, s.t0 + 0.1, s.t0 + 0.7)), sp = io(prog(t, s.t0 + 0.5, s.t0 + 1.5));
    return { ...FB, id: 'guardi', cam: v3([7.75, FY + 1.5, 2.6], [7.6, FY + 1.46, 2.4], io(k)), look: [5.85, FY + 1.33, 0.85], fov: 40,
      tu: { pos: [lerp(5.45, 5.62, sp), FY, lerp(0.72, 0.86, sp)], yaw: 0.15 * gira, lean: 0.36 * sp, side: -0.12 * sp, twist: 0.1 * sp, headYaw: 0.75 * gira + 0.1 * sp, headPitch: 0.1 * sp, breathe: sin(t * 5), ...PAURA, mouth: 0.1,
        armL: { sbarra: CR(lerp(5.2, 5.3, sp), 1), gomitoM: [-1, -0.5, -0.1] }, armR: { sbarra: CR(lerp(5.7, 5.86, sp), -1), gomitoM: [-0.2, -0.6, -1] } } }; });
  sc(tV2, (t, k) => ({ ...FB, id: 'vuoto2', cam: su([6.06, FY + 1.5, 1.24], trema(t), 1), look: v3([7.9, FY + 0.9, 0.3], [7.5, FY + 0.8, 0.05], io(k)), fov: 50, tu: lontano, vuoto: { luce: 1 } }));

  // --- lo scavalco, senza voce: le mani sul corrimano bagnato, la mano che scivola; la chiave che gira nella tua porta (tu non lo sai); fuori dalla ringhiera; i piedi; dentro
  const c0 = rf(6) + 0.15, tChiave = c0 + 2.35, tNg = tChiave + 1.45, tPd = tNg + 1.1, tCi = tPd + 1.45, tChiusa = r(7) - 0.1, bagn = c0 + 1.15;
  sc(c0, (t, k) => { const su2 = io(prog(k, 0.1, 0.9));
    return { ...FB, id: 'mani', cam: v3([5.62, FY + 0.84, 2.45], [5.68, FY + 0.88, 2.3], io(k)), look: [5.72, FY + 1.06, 1.0], fov: 30,
      tu: { pos: [5.72, FY + 0.05 * su2, 0.73 + 0.05 * su2], yaw: 0, lean: 0.2 + 0.18 * su2, headPitch: 0.3, breathe: sin(t * 5.5), ...PAURA, armL: { sbarra: CR(5.56, 1), gomitoM: [-0.5, -0.4, -0.8] }, armR: { sbarra: CR(5.88, -1), gomitoM: [0.5, -0.4, -0.8] } } }; });
  sc(bagn, (t, k) => { const scivola = 0.035 * E.outCubic(prog(t, bagn + 0.35, bagn + 0.5)) * (1 - 0.6 * io(prog(t, bagn + 0.7, bagn + 1.0)));
    return { ...FB, id: 'bagnata', cam: v3([5.28, FY + 1.5, 1.62], [5.32, FY + 1.46, 1.55], io(k)), look: [5.56 - scivola * 0.5, FY + 1.02, 1.0], fov: 25, roll: 0.1, fronte: 0.3,
      tu: { pos: [5.72 - scivola * 0.5, FY + 0.05, 0.78], yaw: 0, lean: 0.38, headPitch: 0.3, senzaTesta: true, ...PAURA, armL: { sbarra: CR(5.56 - scivola, 1), gomitoM: [-0.5, -0.4, -0.8] }, armR: { sbarra: CR(5.88, -1), gomitoM: [0.5, -0.4, -0.8] } } }; });
  // (la porta di casa tua si apre: la luce del pianerottolo invade il corridoio buio, lui in controluce sulla soglia, la sua ombra lunga fino a noi)
  sc(tChiave, (t, k) => ({ set: 'I', id: 'chiave', cam: v3([0.3, 0.75, 0.9], [0.26, 0.72, 0.6], io(k)), look: [-0.05, 1.0, -2.6], fov: 46, porta: true, telefono: 0, piedi: 0, amb: 0.035, fronte: 0.015, occhio: 0,
    apre: E.inOutCubic(prog(t, tChiave + 0.15, tChiave + 1.0)), tu: { pos: [30, 0, 30] }, isp: { pos: [0.12, 0, -3.1], yaw: 0, breathe: 0, headPitch: 0.05 } }));
  sc(tNg, (t, k) => ({ ...FB, id: 'nongiu', pioggia: 0.5, cam: su(v3([8.4, FY + 2.5, 3.5], [8.25, FY + 2.7, 3.35], io(k)), trema(t, 1.2), 1), look: [5.72, FY + 0.1, 1.2], fov: 46, roll: -0.05,
    tu: fuori(t, 5.72, { headPitch: -0.3, armR: { sbarra: CR(5.72 - 0.26, 1), gomitoM: [-0.25, -1, 0.35] }, armL: { sbarra: CR(5.72 + 0.26, -1), gomitoM: [0.25, -1, 0.35] } }) }));
  const passoFuori = (t, f) => { const a = clamp(f), b = clamp(f - 1), ma = io(prog(a, 0, 0.35)), pa = io(prog(a, 0.3, 0.75)), ca = io(prog(a, 0.5, 1)), mb = io(prog(b, 0, 0.4)), pb = io(prog(b, 0.3, 0.8)), cb = io(prog(b, 0.45, 1));
    const x = 5.72 + 0.3 * ca + 0.32 * cb, xd = lerp(lerp(5.96, 6.3, ma), 6.6, cb), xs = lerp(lerp(5.48, 5.62, ca), 6.1, mb);
    return fuori(t, x, { headYaw: -0.45 * (1 - cb), headPitch: 0.1, gambe: { oL: 0.36 * pa * (1 - ca), gL: 0.14 * bump(pa, 0.5, 0.5), oR: -0.3 * pb * (1 - cb) + 0.3 * ca * (1 - pb), gR: 0.14 * bump(pb, 0.5, 0.5) },
      armL: { sbarra: CR(xd, -1), gomitoM: [0.5, -0.8, 0.6] }, armR: { sbarra: CR(xs, 1), gomitoM: [-0.5, -0.8, 0.6] } }); };
  sc(tPd, (t, k, s) => ({ ...FB, id: 'piede1', ambiente: 0.4, fronte: 0.5, cam: v3([6.98, FY + 0.52, 0.34], [6.9, FY + 0.5, 0.42], io(k)), look: [6.25, FY + 0.2, 1.1], fov: 56, tu: passoFuori(t, 2 * prog(t, s.t0 + 0.05, tCi - 0.1)) }));
  const dentroB = (t, x = {}) => ({ pos: [6.5, FY, 0.72], yaw: 0, lean: 0.35, breathe: sin(t * 6.5), ...PAURA, mouth: 0.3, headPitch: 0.35, gambe: { aL: 0.35, gL: 0.6, aR: 0.2, gR: 0.45 }, bacino: { sposta: [0, -0.07, 0] }, armL: { sbarra: CR(6.28, 1), gomitoM: [-0.6, -0.4, -0.7] }, armR: { sbarra: CR(6.72, -1), gomitoM: [0.6, -0.4, -0.7] }, ...x });
  sc(tCi, (t, k) => ({ ...FB, id: 'cisei', cam: v3([7.4, FY + 1.3, 3.6], [7.3, FY + 1.25, 3.3], io(k)), look: [6.5, FY + 1.2, 0.8], fov: 34, tu: dentroB(t, { headYaw: -0.5 * io(prog(k, 0.4, 0.9)), headPitch: 0.35 - 0.3 * io(prog(k, 0.4, 0.9)) }) }));

  // --- «La portafinestra è chiusa. Per romperla ti serve un rumore più forte del tuo.»: spingi, non si apre; dentro i mobili sotto le lenzuola. Il vaso della pianta secca.
  const tVaso = w(7, 'per') - 0.1, tAsp = w(8, 'aspetti') - 1.1;
  sc(tChiusa, (t, k, s) => { const sp = bump(t, s.t0 + 0.6, 0.5) + bump(t, s.t0 + 1.35, 0.4);
    return { ...FB, id: 'chiusa', cam: v3([8.35, FY + 1.45, 1.05], [8.2, FY + 1.42, 0.92], io(k)), look: [7.45, FY + 1.25, -0.5], fov: 44, ambiente: 0.12, fronte: 0.08, vuoto: { luce: 1 },
      tu: { pos: [7.56, FY, 0.3 - 0.015 * sp], yaw: Math.PI, lean: 0.08 + 0.05 * sp, breathe: sin(t * 5), ...PAURA, headPitch: 0.05, gazeX: 0.2 * sin(t * 1.3),
        armL: { mondo: [7.78, FY + 1.22, -0.09], ditaM: [0, 1, 0], dorsoM: [0, 0, 1], gomitoM: [0.6, -0.6, 0.5], mano: 'piatta' }, armR: { mondo: [7.38, FY + 1.27, -0.09], ditaM: [0, 1, 0], dorsoM: [0, 0, 1], gomitoM: [-0.6, -0.6, 0.5], mano: 'piatta' } } }; });
  // (le mani prendono il vaso dai lati e lo sollevano; il vaso segue le mani)
  const PV0 = [XB - 0.35, FY, 0.3], vasoIn = (k) => [lerp(PV0[0], 8.42, k), lerp(PV0[1], FY + 0.92, k), lerp(PV0[2], 0.5, k)];
  // (il palmo sulla parete del vaso subito sotto il bordo, le dita in avanti attorno alla pancia, il pollice verso il bordo. I due lati sono quelli di chi
  //  lo tiene (yaw), non della scena: prima erano fissi nel mondo e, girato verso il palazzo, le braccia si incrociavano e le dita entravano nella terracotta)
  const VASO_MANO = { indice: { mcp: 16, pip: 20, dip: 10, ab: -5 }, medio: { mcp: 18, pip: 22, dip: 10 }, anulare: { mcp: 20, pip: 22, dip: 10, ab: 5 }, mignolo: { mcp: 22, pip: 22, dip: 10, ab: 10 }, pollice: { ab: 38, fl: 12, roll: 35, mcp: 8, ip: 6 } };
  const presaVaso = (p, yaw, k = 1) => { const rx = -Math.cos(yaw), rz = Math.sin(yaw), fx = Math.sin(yaw), fz = Math.cos(yaw), R = 0.135, B = -0.05, Hh = 0.14;
    const polso = (s) => [p[0] + s * rx * R + fx * B, p[1] + Hh, p[2] + s * rz * R + fz * B];
    return { armL: { mondo: polso(1), dita: [0.3, -0.22, 0.93], dorso: [-0.95, 0, 0.31], gomito: [-0.7, -0.6, -0.4], mano: VASO_MANO, k },
      armR: { mondo: polso(-1), dita: [-0.3, -0.22, 0.93], dorso: [0.95, 0, 0.31], gomito: [0.7, -0.6, -0.4], mano: VASO_MANO, k } }; };
  sc(tVaso, (t, k, s) => { const pr = io(prog(t, s.t0 + 0.2, s.t0 + 1.1)), su3 = io(prog(t, s.t0 + 1.3, s.t0 + 3.1)), p = vasoIn(su3), ch = io(prog(t, s.t0, s.t0 + 0.6)) * (1 - su3);
    return { ...FB, id: 'vaso', cam: v3([6.9, FY + 1.05, 0.95], [6.95, FY + 1.4, 0.98], su3), look: v3([8.35, FY + 0.45, 0.5], [8.42, FY + 1.12, 0.62], su3), fov: 46, ambiente: 0.14, fronte: 0.1, vuoto: { luce: 1 }, vaso: { pos: p },
      // (accovacciato: sit abbassa il bacino all'altezza di sedile, le ginocchia si piegano di più e i piedi tornano sotto; il busto in avanti per arrivare al vaso)
      tu: { pos: [8.42, FY, lerp(0.72, 0.86, su3)], yaw: Math.PI, sit: ch, sedile: 0.24, lean: lerp(0.12, lerp(0.8, 0.12, su3), io(prog(t, s.t0, s.t0 + 0.6))), headPitch: lerp(0.5, 0.1, su3), breathe: sin(t * 5), ...PAURA,
        gambe: { aL: 0.2 * ch, gL: 0.75 * ch, aR: 0.2 * ch, gR: 0.75 * ch }, ...(pr > 0.001 ? presaVaso(p, Math.PI, pr) : {}) } }; });
  // --- «Aspetti il tuono.»: la schiena al muro accanto alla finestra, il vaso stretto al petto, gli occhi al cielo; un lampo lontano. Poi il tuono: il vetro esplode dentro la stanza
  const tRompe = rf(8) + 2.0, lampoL = tAsp + 2.9;
  const PA = [8.5, FY, 0.2], pAsp = [8.5, FY + 1.02, 0.44];
  sc(tAsp, (t, k) => ({ ...FB, id: 'aspetti', cam: v3([8.1, FY + 0.65, 1.05], [8.15, FY + 0.6, 0.95], io(k)), look: [8.48, FY + 1.45, 0.15], fov: 50, ambiente: 0.12, fronte: 0.08, pioggia: 0.6, vuoto: { luce: 1, lampo: 0.5 * bump(t, lampoL, 0.12) }, flash: 0.25 * bump(t, lampoL, 0.12), vaso: { pos: pAsp },
    tu: { pos: PA, yaw: 0, lean: -0.06, headPitch: lerp(-0.2, -0.5, io(prog(k, 0, 0.5))), breathe: sin(t * 6), ...PAURA, gazeY: 0.4, blink: battito(t, 9), ...presaVaso(pAsp, 0) } }));
  sc(tRompe, (t, k) => { const dt = t - tRompe; return { ...FB, id: 'rompe', pioggia: 0, cam: v3([7.05, FY + 0.62, -1.55], [7.1, FY + 0.6, -1.6], io(k)), look: [7.58, FY + 1.12, -0.12], fov: 52, ...BUIO, vuoto: { rotto: dt, lampo: Math.exp(-dt / 0.18) }, flash: 0.75 * Math.exp(-dt / 0.09),
    tu: { pos: [7.62, FY, 0.42], yaw: Math.PI, lean: 0.25, ...PAURA, armL: { a: [-0.12, 0.28, 0.5], gomito: [-0.4, -0.6, -0.6], mano: 'aperta' }, armR: { a: [0.12, 0.28, 0.5], gomito: [0.4, -0.6, -0.6], mano: 'aperta' } } }; });
  // (la mano passa dal buco e gira la martellina; l'anta si apre)
  const tMano = tRompe + 1.05, tDentro = r(9) + 0.5;
  // (la martellina nel mondo: g = quanto è girata, 0 in giù e 1 di traverso; an = quanto è aperta l'anta, come o.vuoto.anta. a = il perno, dal lato del pollice)
  const martellina = (g, an = 0) => { const [mx, my, mz] = MART, th = (Math.PI / 2) * g, fi = -1.6 * an, hx = BAL.NX1 - 0.05, hz = BAL.ZT;
    const gira = (q) => { const dx = q[0] - hx, dz = q[2] - hz; return [hx + dx * Math.cos(fi) + dz * Math.sin(fi), q[1], hz - dx * Math.sin(fi) + dz * Math.cos(fi)]; };
    return { a: gira([mx, my + 0.05, mz]), b: gira([mx + 0.105 * Math.sin(th), my + 0.05 - 0.105 * Math.cos(th), mz]), r: 0.0075, lungo: 0.55 }; };
  sc(tMano, (t, k, s) => { const dt = t - tRompe, pr = io(prog(t, s.t0, s.t0 + 0.3)), gi = io(prog(t, s.t0 + 0.32, s.t0 + 0.62)), an = 0.12 * io(prog(t, s.t0 + 0.64, tDentro));
    const NEL_BUCO = { mondo: [MART[0] + 0.1, MART[1] + 0.04, MART[2] + 0.1], ditaM: [-0.35, -0.15, -0.92], dorsoM: [0.92, 0, -0.35], gomitoM: [0.5, -0.8, 0.3], mano: 'rilassata' };
    return { ...FB, id: 'mano', pioggia: 0, cam: v3([7.2, FY + 1.12, -0.82], [7.24, FY + 1.11, -0.75], io(k)), look: [7.58, FY + 1.05, -0.15], fov: 40, ...BUIO, vuoto: { rotto: dt, maniglia: gi, anta: an },
      tu: { pos: [7.5, FY, 0.28], yaw: Math.PI, lean: 0.16, ...PAURA, headPitch: 0.1,
        armL: { sbarra: martellina(gi, an), gomitoM: [0.5, -0.8, 0.3], da: NEL_BUCO, k: pr } } }; });
  // --- «Di là dal muro c'è casa tua. E c'è lui.»: entri sui vetri, ti fermi accanto al muro, ascolti. La camera passa attraverso il muro: lui, nel tuo soggiorno.
  const tMuro = w(9, 'e') - 0.05, tLui = r(10) - 0.05;
  const TUD = [6.45, FY, -1.2];
  sc(tDentro, (t, k) => ({ ...FB, id: 'dentro', pioggia: 0, cam: v3([7.25, FY + 1.5, -0.55], [7.1, FY + 1.52, -0.62], io(k)), look: [6.45, FY + 1.56, -1.2], fov: 38, ...BUIO, vuoto: VU, casa: { soggiorno: 1, corridoio: 1 },
    tu: { pos: v3([7.2, FY, -0.45], TUD, io(prog(k, 0, 0.6))), yaw: lerp(Math.PI, -Math.PI / 2 - 0.3, io(prog(k, 0.3, 0.8))), breathe: 0.4 * sin(t * 4), ...PAURA, headYaw: -0.4 * io(prog(k, 0.6, 1)), gazeX: -0.5 * io(prog(k, 0.6, 1)), gambe: cammina(prog(k, 0, 0.6), 6, 0.25) } }));
  const RIVA_S = [4.55, FY, -1.95];
  sc(tMuro, (t, k) => { const kk = E.inOutCubic(k); return { ...FB, id: 'muro', pioggia: 0, cam: v3([6.95, FY + 1.5, -1.45], [4.95, FY + 1.48, -1.55], kk), look: v3([4.0, FY + 1.4, -1.9], [2.2, FY + 1.45, -2.2], kk), fov: 46, ...BUIO, fronte: 0.06, vuoto: VU, casa: { soggiorno: 1, corridoio: 1 },
    casa: { soggiorno: 1, corridoio: 1, riempi: 1 }, tu: { pos: TUD, yaw: -Math.PI / 2 - 0.3, breathe: 0.2 * sin(t * 4), ...PAURA, headYaw: -0.4 }, riva: { pos: RIVA_S, yaw: -Math.PI / 2 - 0.4, breathe: sin(t * 1.8), headYaw: 0.2 * sin(t * 0.7) } }; });
  sc(tLui, (t, k) => ({ ...FB, id: 'lui', pioggia: 0, cam: v3([5.55, FY + 1.6, -1.15], [5.3, FY + 1.62, -1.35], io(k)), look: [4.55, FY + 1.68, -1.95], fov: 34, ambiente: 0.15, fronte: 0.08, vuoto: VU, casa: { soggiorno: 1, corridoio: 1, riempi: 1 },
    riva: { pos: RIVA_S, yaw: lerp(-Math.PI / 2 - 0.4, 0.85, io(prog(k, 0.1, 0.7))), breathe: sin(t * 1.8), blink: battito(t, 21), open: 0.72, smile: 0.3, headPitch: 0.05, ...parla('isp', t) }, tu: lontano }));
  // --- «Fai un passo. Il pavimento scricchiola.»: la scarpa sul parquet; il tuo viso che si gela
  const tPasso = r(11) - 0.15, tScr = w(11, 'scricchiola'), tGelo = tScr + 0.15, tSez = r(12) - 0.1;
  sc(tPasso, (t, k, s) => { const st = io(prog(t, s.t0 + 0.3, tScr - 0.45));      // (il piede arriva giù con lo scricchiolio, un attimo prima della parola)
    return { ...FB, id: 'passo', pioggia: 0, cam: v3([6.3, FY + 0.14, -1.98], [6.33, FY + 0.13, -1.94], io(k)), look: [6.62, FY + 0.08, -1.27], fov: 42, ...BUIO, fronte: 0.07, vuoto: VU, casa: { soggiorno: 1, corridoio: 1 },
      tu: { pos: [lerp(6.45, 6.7, st), FY, lerp(-1.22, -1.32, st)], yaw: 1.95, breathe: 0, ...PAURA, gambe: cammina(st, Math.PI, 0.36) } }; });
  // (la camera davanti alla faccia: prima stava dietro e si vedeva la nuca)
  sc(tGelo, (t, k) => ({ ...FB, id: 'gelo', pioggia: 0, cam: v3([7.36, FY + 1.7, -1.6], [7.3, FY + 1.7, -1.57], io(k)), look: [6.7, FY + 1.68, -1.32], fov: 38, ...BUIO, fronte: 0.06, vuoto: VU, casa: { soggiorno: 1, corridoio: 1 },
    tu: { pos: [6.7, FY, -1.32], yaw: 1.95, breathe: 0, fear: 1, browUp: 0.9, sad: 0.5, smile: -0.5, mouth: 0.22, round: 0.4, open: 1, headYaw: 0.3 * io(prog(k, 0.15, 0.6)), gazeX: 0.7 * io(prog(k, 0.1, 0.4)), blink: 0 } }));
  // --- «Di là, i passi si fermano.» «Poi riprendono. Vanno verso il balcone.»: lo spaccato. Lui si ferma, si gira verso il muro, ci posa la mano; tu dall'altra parte,
  //     la schiena contro lo stesso muro. Poi lui va verso il balcone e tu verso la porta.
  const tRip = r(13) - 0.1;
  sc(tSez, (t, k, s) => { const vm = io(prog(t, s.t0 + 0.2, s.t0 + 1.6)), palmo = io(prog(t, s.t0 + 1.5, s.t0 + 2.3)) * (1 - io(prog(t, tRip, tRip + 0.4))), via2 = io(prog(t, tRip + 0.1, tRip + 3.2)), tuVa = io(prog(t, tRip + 0.8, tRip + 3.4));
    const rp = [lerp(lerp(4.95, 5.6, vm), 4.95, via2), FY, lerp(lerp(-1.7, -1.5, vm), -0.15, via2)];
    return { ...FB, id: 'sezione', sezione: true, cam: [6.1, FY + 1.42, 1.25], look: [6.1, FY + 1.22, -2.5], fov: 60, ambiente: 0.08, fronte: 0.04, vuoto: VU, casa: { soggiorno: 1, corridoio: 1 },
      casa: { soggiorno: 1, corridoio: 1, riempi: 0.6 }, riva: { pos: rp, yaw: lerp(lerp(0.6, Math.PI / 2, vm), Math.PI * 0.9, via2), breathe: sin(t * 1.8), blink: battito(t, 21), headYaw: 0.25 * palmo, headPitch: 0.08, smile: 0.1,
        gambe: cammina(vm * (1 - via2) + via2, 6, 0.3), armL: palmo > 0.01 ? { mondo: [5.885, FY + 1.42, -1.28], ditaM: [0, 1, 0.2], dorsoM: [-1, 0, 0], gomitoM: [-0.3, -0.8, 0.5], mano: 'piatta', k: palmo } : undefined },
      tu: { pos: [lerp(6.7, 8.6, tuVa), FY, lerp(-1.32, -2.3, tuVa)], yaw: lerp(1.95, Math.PI / 2 + 0.4, io(prog(tuVa, 0, 0.3))), breathe: 0, ...PAURA, mouth: 0.08, headYaw: -0.85 * io(prog(t, s.t0 + 0.3, s.t0 + 1.2)) * (1 - io(prog(tuVa, 0, 0.25))), gazeX: -0.4 * (1 - tuVa), headPitch: -0.12, gambe: cammina(tuVa, 7, 0.28) } }; });
  // --- «La porta d'ingresso si apre da dentro. Dà sull'altra scala.»: la mano sulla maniglia, la porta che si apre sul buio dell'altra scala
  const tPorta = r(14) - 0.05, tScopre = w(14, 'dà') - 0.1, tScala = tScopre + 1.65, tFuori = r(15) - 0.1;
  const LP = VUOTO_LEVA;
  sc(tPorta, (t, k, s) => { const pr = io(prog(t, s.t0 + 0.2, s.t0 + 0.9)), ap = io(prog(t, s.t0 + 1.1, tScopre + 0.1));
    return { ...FB, id: 'porta', pioggia: 0, cam: v3([8.82, FY + 1.32, -1.65], [8.86, FY + 1.3, -1.72], io(k)), look: [9.33, FY + 1.06, -2.45], fov: 44, ...BUIO, vuoto: { ...VU, porta: 0.55 * ap }, casa: { soggiorno: 1, corridoio: 1 },
      tu: { pos: [8.98, FY, -2.42], yaw: Math.PI / 2, breathe: sin(t * 6), ...PAURA, headPitch: 0.1, armL: pr > 0.02 ? { sbarra: { a: LP.a, b: LP.b, r: LP.r }, gomitoM: [-0.3, -0.8, 0.6], k: pr } : undefined } }; });
  // (lui, sul tuo balcone, si sporge oltre il divisorio e vede il vetro rotto. Sorride appena.)
  sc(tScopre, (t, k) => ({ ...FB, id: 'scopre', cam: su(v3([7.35, FY + 1.32, 0.62], [7.25, FY + 1.33, 0.6], io(k)), trema(t, 0.4), 1), look: [6.25, FY + 1.5, 0.92], fov: 32, pioggia: 0.45, ambiente: 0.12, fronte: 0.1, vuoto: VU, casa: { soggiorno: 1, corridoio: 1 }, porta: 0.6, tendaScosta: 0.9,
    riva: rivaSporge(t, io(prog(k, 0, 0.6)), { x: { headYaw: lerp(0.35, 1.15, io(prog(k, 0, 0.6))), headPitch: 0.25, gazeY: -0.3, smile: 0.35 * io(prog(k, 0.5, 1)), open: 0.7 } }) }));
  // --- la scala, vista dall'alto dentro la tromba (con il carrello all'indietro e lo zoom in avanti di «La donna che visse due volte»): tu scendi di corsa al buio
  sc(tScala, (t, k) => { const s = lerp(0.6, 9.5, k), dz = E.inOutSine(k);
    return { set: 'S', id: 'scala', cam: [0.03, lerp(13.6, 15.2, dz), 0.04], look: [0, 0, 0], fov: lerp(74, 52, dz), roll: 0.25 * k, tu: corsaScala(s, t) }; });
  // --- «Fuori piove. Corri, finché il palazzo non sparisce.»: corri verso di noi nel parcheggio, il palazzo dietro di te si perde nella pioggia
  const tRespiri = r(16) - 0.25;
  // (la corsa vera: il ginocchio si piega quando la gamba torna avanti, le braccia piegate vanno al contrario delle gambe, il corpo si alza a metà falcata)
  const corsaVera = (f) => ({ aL: 0.6 * sin(f), gL: 0.3 + 1.25 * Math.max(0, Math.cos(f + 0.3)), aR: -0.6 * sin(f), gR: 0.3 + 1.25 * Math.max(0, -Math.cos(f + 0.3)) });
  const bracciaCorsa = (f) => ({ armL: { a: [-0.2, 0.04 - 0.07 * sin(f), 0.08 - 0.2 * sin(f)], gomito: [-0.45, -0.55, -0.7], mano: 'pugno' }, armR: { a: [0.2, 0.04 + 0.07 * sin(f), 0.08 + 0.2 * sin(f)], gomito: [0.45, -0.55, -0.7], mano: 'pugno' } });
  sc(tFuori, (t, k) => { const kk = prog(t, tFuori, tRespiri), z = lerp(2.0, 11.0, kk), f = (t - tFuori) * 12;
    return { ...FB, id: 'fuori', cam: su([7.95, 1.15, z + lerp(3.0, 2.3, kk)], trema(t, 2.2), 1), look: [7.6, lerp(1.45, 1.3, kk), z - 5], fov: 44, pioggia: 0.9, nebbia: lerp(0.45, 1.6, io(prog(kk, 0, 0.8))), ambiente: 0.2, fronte: 0.12, vuoto: VU, casa: { soggiorno: 1, corridoio: 1 },
      tu: { pos: [7.6 + 0.05 * sin(f * 0.5), 0.035 * Math.abs(sin(f)), z], yaw: 0.03, lean: 0.28, breathe: sin(t * 7), ...PAURA, mouth: 0.38, round: 0.35, smile: -0.45, gambe: corsaVera(f), ...bracciaCorsa(f) } }; });
  // --- «Per la prima volta stanotte, respiri.»: sotto il portico, la schiena al pilastro, gli occhi chiusi; il fiato si condensa
  const tVibra = r(17) - 0.1, tSchermo = w(17, 'è') - 0.05, tChiama = r(18) - 0.05, tAda = r(19) - 0.2, tChina = r(20) - 0.1, tDito = w(20, 'notte') + 0.45, tCarte = r(21) - 0.2;
  const APPOGGIATO = (t, x = {}) => ({ pos: [0, 0.165, -0.2], yaw: Math.PI, lean: -0.08, headPitch: -0.22, blink: 1, breathe: sin(t * 3.2), mouth: 0.25, open: 0.6, sad: 0.4, armL: { a: [-0.22, -0.2, -0.05] }, armR: { a: [0.22, -0.2, -0.05] }, ...x });
  // (il respiro che rallenta: la fase è l'integrale della frequenza. Scritto sin(t * lerp(...)), col tempo assoluto a 85 s, il petto vibrava)
  sc(tRespiri, (t, k, s) => ({ set: 'O', id: 'respiri', cam: v3([0.55, 1.8, -1.75], [0.38, 1.8, -1.2], io(k)), look: [0.0, 1.78, -0.12], fov: 40, fiato: 1, tu: APPOGGIATO(t, { breathe: lerp(1, 0.5, k) * sin(4.5 * (t - s.t0) - 0.95 * (t - s.t0) * k) }) }));
  // --- «Il telefono vibra. È la signora Ada.»: lo tiri fuori, lo schermo ti illumina la faccia; poi lo schermo: chiamata in arrivo
  sc(tVibra, (t, k, s) => { const fu = io(prog(t, s.t0 + 0.15, s.t0 + 1.0));
    return { set: 'O', id: 'vibra', cam: v3([0.42, 1.3, -0.95], [0.3, 1.62, -0.98], fu), look: v3([0.12, 0.95, -0.3], [0.03, 1.74, -0.3], fu), fov: lerp(38, 48, fu), telTu: 1, telSchermo: 0.28, tremaTel: 1,
      tu: APPOGGIATO(t, { blink: 0, headPitch: lerp(-0.22, 0.4, fu), fear: 0.5, browUp: 0.4, armR: { ...TEL_GUARDA, da: IN_TASCA, k: fu } }) }; });
  sc(tSchermo, (t, k) => ({ set: 'O', id: 'schermo', ui: 'arrivo', sfoca: 0.5, cam: [0.25, 1.62, -0.75], look: [0.02, 1.4, -0.15], fov: 34, telTu: 1, telSchermo: 1, tu: APPOGGIATO(t, { blink: 0, headPitch: 0.4, armR: TEL_GUARDA }) }));
  // --- «Pronto, caro? C'è qui da me un signore della polizia...»: al telefono, il sollievo che diventa paura
  const tPol = w(18, 'polizia') - 0.1;
  sc(tChiama, (t, k) => { const pa = io(prog(t, tPol, tPol + 0.9));
    return { set: 'O', id: 'chiamata', cam: v3([0.3, 1.86, -0.95], [0.25, 1.85, -0.82], io(k)), look: [0.02, 1.84, -0.18], fov: 36, telTu: 1, telSchermo: 0.4,
      tu: APPOGGIATO(t, { blink: battito(t, 7) * (1 - pa), headPitch: lerp(0.0, 0.08, pa), breathe: sin(2.6 * t + 2.9 * Math.max(0, t - tPol - 0.45)), smile: 0.25 * (1 - pa), sad: 0.4 * (1 - pa) + 0.6 * pa, fear: pa, browUp: 0.75 * pa, mouth: 0.1 + 0.12 * pa, open: 1, wide: 0.3 * pa, armR: ORECCHIO }) }; });
  // --- la signora Ada nel suo soggiorno, che sorride al telefono; dietro di lei, nel buio, qualcuno in piedi
  sc(tAda, (t, k) => ({ set: 'A', id: 'ada', cam: v3([0.3, 1.18, 1.45], [0.22, 1.16, 1.2], io(k)), look: [0.08, 1.12, -0.45], fov: 38, lampada: 1,
    ada: adaSeduta(t, parla('ada', t)), riva: { pos: [0.5, 0, -1.12], yaw: -0.2, breathe: sin(t * 1.8), blink: battito(t, 21) } }));
  // --- «Poi la voce di lui, vicinissima: «Faccia con calma. Abbiamo tutta la notte.»»: lui entra nella luce, si china sul telefono accanto a lei
  sc(tChina, (t, k, s) => { const ch = io(prog(t, s.t0 + 0.2, s.t0 + 2.4));
    return { set: 'A', id: 'china', cam: v3([0.35, 1.25, 1.25], [0.32, 1.22, 1.05], io(k)), look: v3([0.2, 1.35, -0.6], [0.2, 1.18, -0.5], ch), fov: 36, lampada: 1,
      ada: adaSeduta(t, { smile: 0.6, gazeX: 0.3 * ch }), riva: { pos: v3([0.5, 0, -1.12], [0.36, 0, -0.98], ch), yaw: lerp(-0.2, -0.32, ch), lean: 0.95 * ch, side: -0.18 * ch, twist: 0.1 * ch, headYaw: -0.25 * ch, headPitch: -0.35 * ch, smile: 0.3, open: 0.72, blink: battito(t, 21),
        gambe: { aL: -0.25 * ch, gL: 0.35 * ch, aR: -0.25 * ch, gR: 0.35 * ch }, ...parla('isp', t) } }; });
  // --- si raddrizza, guarda in macchina e si porta l'indice alle labbra. Tic tac.
  sc(tDito, (t, k, s) => { const su4 = io(prog(t, s.t0, s.t0 + 0.9)), di = io(prog(t, s.t0 + 0.7, s.t0 + 1.5));
    return { set: 'A', id: 'dito', cam: v3([0.32, 1.48, 0.95], [0.32, 1.5, 0.72], io(k)), look: [0.33, 1.58, -0.85], fov: 32, lampada: 1,
      ada: adaSeduta(t, { smile: 0.6 }), riva: { pos: v3([0.36, 0, -0.98], [0.42, 0, -1.05], su4), yaw: lerp(-0.32, -0.05, su4), lean: 0.95 * (1 - su4), side: -0.18 * (1 - su4), headPitch: -0.35 * (1 - su4) - 0.04 * su4, smile: 0.25, open: 0.72, blink: 0,
        gambe: { aL: -0.25 * (1 - su4), gL: 0.35 * (1 - su4), aR: -0.25 * (1 - su4), gR: 0.35 * (1 - su4) }, armR: di > 0.01 ? { ...DITO, k: di } : undefined } }; });
  // --- cosa fai?
  sc(tCarte, (t) => ({ set: 'A', id: 'carte', carte: 1, sfoca: 1, cam: [0.32, 1.5, 0.72], look: [0.33, 1.58, -0.85], fov: 32, lampada: 1, ada: adaSeduta(t, { smile: 0.6 }), riva: { pos: [0.42, 0, -1.05], yaw: -0.05, headPitch: -0.04, smile: 0.25, open: 0.72, armR: DITO } }));
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
// la chiamata in arrivo: il nome della signora Ada, i due tasti; lo schermo vibra; il pollice preme il verde poco prima dello stacco
function chiamataArrivo(ctx, t, s) {
  const k = E.outCubic(prog(t, s.t0, s.t0 + 0.35)), prem = prog(t, s.t1 - 0.55, s.t1 - 0.35), vib = (1 - prem) * (Math.floor(t * 6) % 2 ? 1 : 0), pw = 600, ph = 1180;
  const x = (W - pw) / 2 + 6 * vib * M.noise1(t * 60, 3), y = 430 + (1 - k) * 260 + 4 * vib * M.noise1(t * 55, 4);
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.3);
  ctx.shadowColor = 'rgba(170,200,255,0.4)'; ctx.shadowBlur = 90; M.rrect(ctx, x, y, pw, ph, 64); ctx.fillStyle = '#0B0C0F'; ctx.fill(); ctx.shadowBlur = 0;
  M.rrect(ctx, x + 16, y + 16, pw - 32, ph - 32, 50); const g = ctx.createLinearGradient(0, y, 0, y + ph); g.addColorStop(0, '#2A3140'); g.addColorStop(1, '#0F1218'); ctx.fillStyle = g; ctx.fill(); ctx.save(); ctx.clip();
  ctx.fillStyle = '#E8EDF5'; ctx.font = font(34, 700, 'Display'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('03:21', x + 52, y + 64); ctx.textAlign = 'right'; ctx.fillText('27%', x + pw - 52, y + 64);
  ctx.textAlign = 'center'; ctx.fillStyle = '#9AA6B8'; ctx.font = font(30, 500, 'UI'); ctx.fillText(prem > 0.5 ? 'connessione…' : 'chiamata in arrivo…', x + pw / 2, y + 190);
  ctx.fillStyle = '#5A6272'; ctx.beginPath(); ctx.arc(x + pw / 2, y + 380, 92, 0, 7); ctx.fill(); ctx.fillStyle = '#E8EDF5'; ctx.font = font(96, 800, 'Display'); ctx.fillText('A', x + pw / 2, y + 384);
  ctx.font = font(52, 800, 'Display'); ctx.fillText('Sig.ra Ada', x + pw / 2, y + 560); ctx.font = font(36, 600, 'UI'); ctx.fillStyle = '#C9D2E0'; ctx.fillText('(int. 11) · casa', x + pw / 2, y + 616);
  const tasto = (cx, col, giu) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, y + 930, 78 - 6 * giu, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.save(); ctx.translate(cx, y + 930); if (col === '#FF453A') ctx.rotate(2.36);
    ctx.beginPath(); ctx.arc(0, 0, 30, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ctx.restore(); };
  tasto(x + 150, '#FF453A', 0); tasto(x + pw - 150, '#30D158', prem);
  ctx.fillStyle = '#9AA6B8'; ctx.font = font(26, 600, 'UI'); ctx.fillText('Rifiuta', x + 150, y + 1040); ctx.fillText('Rispondi', x + pw - 150, y + 1040);
  ctx.restore();
  // il pollice che arriva sul tasto verde
  const pk = E.inOutCubic(prog(t, s.t1 - 1.05, s.t1 - 0.45)); if (pk > 0) { ctx.globalAlpha = 1; ctx.fillStyle = '#C98E6E'; ctx.beginPath(); ctx.ellipse(x + pw - 150 + 60 * (1 - pk) + 10, y + 960 + 380 * (1 - pk), 66, 130, -0.45, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,215,0.35)'; ctx.beginPath(); ctx.ellipse(x + pw - 150 + 60 * (1 - pk) - 6, y + 900 + 380 * (1 - pk), 34, 26, -0.45, 0, 7); ctx.fill(); }
  ctx.restore();
}
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
  const ent = (d) => E.outCubic(prog(t, r(21) - 0.1 + d, r(21) + 0.45 + d)), a = prog(t, r(22) - 0.1, r(22) + 0.15) * (1 - prog(t, r(23) - 0.15, r(23) + 0.1)), b = prog(t, r(23) - 0.1, r(23) + 0.15) * (1 - prog(t, r(24) - 0.15, r(24) + 0.1));
  const fin = prog(t, r(24) - 0.1, r(24) + 0.3);
  carta(ctx, t, 470, 'A', '#F2B63C', ['TORNI', 'DA LEI'], IMG.cartaA, a, ent(0), b);
  carta(ctx, t, 990, 'B', '#5CB8FF', ['VAI DAI', 'CARABINIERI'], IMG.cartaB, b, ent(0.18), a);
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
    await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping;
    SF = fuoriSet({ balcone: true, vuoto: true }); SI = ingressoSet({ entra: true }); SP = pianerottoloSet({ vano11: true }); SC = scalaSet(); PO = porticoSet(); AD = adaSet();
    VUOTO_LEVA = SF.BL.EV.LEVA_PORTA; MART = SF.BL.EV.MANIGLIA;
    SEQ = sequenza(); window.TEMPI = SEQ.map((s) => [Math.round(s.t0 * 100) / 100, s.f(s.t0 + 0.01, 0, s).id]);
    // le immagini fisse: la carta votata nell'episodio 1 e le due carte nuove (la signora Ada al telefono con lui dietro; tu che te ne vai sotto la pioggia)
    IMG.sceltaB = scatto(SF, { ...FB, cam: [4.5, FY + 1.5, 0.2], look: [4.2, FY - 3.2, 6.5], fov: 30, tu: lontano }, 860, 1.7, 480);
    IMG.cartaA = scatto(AD, { cam: [0.25, 1.28, 1.25], look: [0.15, 1.3, -0.6], fov: 34, lampada: 1.2, ada: { pos: [0, 0, -0.38], yaw: 0, sit: 1, sedile: 0.47, lean: 0.06, headYaw: 0.12, smile: 0.55, armR: { a: [0.104, 0.393, 0.071], gomito: [0.8, -1, -0.1], dita: [-0.1, 0.87, -0.48], dorso: [1, 0, -0.15], mano: 'orecchio' }, armL: { a: [-0.16, -0.08, 0.3], gomito: [-0.8, -0.6, -0.2], dita: [0.2, -0.4, 1], dorso: [0, 1, 0.2], mano: 'rilassata' } }, riva: { pos: [0.45, 0, -1.08], yaw: -0.1, smile: 0.3, open: 0.72 } }, 860, 1.25, 480);
    IMG.cartaB = scatto(PO, { cam: [0.9, 1.6, -1.6], look: [3.5, 1.2, 6], fov: 40, pioggia: 1, tu: { pos: [2.3, 0, 4.2], yaw: 0.35, lean: 0.24, gambe: { aL: 0.5, gL: 0.3, aR: -0.45, gR: 0.6 }, armL: { a: [-0.24, 0.02, 0.24] }, armR: { a: [0.24, 0.02, -0.12] } } }, 860, 1.6, 480);
  },
  draw(ctx, u, t) {
    t += T0; { const k = t * 30; if (Math.abs(k - Math.round(k)) < 1e-6) t = Math.round(k) / 30; } u = M.U(t);
    const o = shot(t);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const set = { F: SF, I: SI, P: SP, S: SC, O: PO, A: AD }[o.set] || SF;
    if (M.CFG.viste && o.set === 'F') {                                                          // controllo delle pose: la stessa scena da più lati, in chiaro
      M.CFG.viste.forEach((v, i) => { const c0 = v.centro || o.look, oo = { ...o, look: c0, cam: [c0[0] + v.dir[0] * v.dist, Math.max(0.25, c0[1] + v.dir[1] * v.dist), c0[2] + v.dir[2] * v.dist], fov: v.fov || 30, ambiente: 0.8, fronte: 0.45, roll: 0 };
        if (oo.tu) oo.tu = { ...oo.tu, senzaTesta: false };
        ctx.save(); ctx.translate((i % 2) * W / 2, Math.floor(i / 2) * H / 2); ctx.beginPath(); ctx.rect(0, 0, W / 2, H / 2); ctx.clip(); ctx.scale(0.5, 0.5); G.renderSet(ctx, SF, t, u, oo); ctx.restore(); });
      ctx.fillStyle = '#ff0'; ctx.font = '700 26px Display'; ctx.fillText(`${o.id}  t=${(t - T0).toFixed(2)}`, 14, 34); return; }
    G.renderSet(ctx, set, t, u, o);
    if (o.flash > 0) { ctx.fillStyle = `rgba(225,232,255,${Math.min(1, o.flash)})`; ctx.fillRect(0, 0, W, H); }
    if (o.sfoca) { ctx.fillStyle = `rgba(4,6,10,${0.72 * o.sfoca})`; ctx.fillRect(0, 0, W, H); }
    if (o.pioggia) pioggia(ctx, t, o.pioggia);
    if (o.spioncino) spioncino(ctx);
    if (o.ui === 'arrivo') chiamataArrivo(ctx, t, SEQ.find((s) => t >= s.t0 && t < s.t1));
    if (o.scelta) scelta(ctx, t);
    if (o.carte) carte(ctx, t);
    subtitles(ctx, t);
    const a = Math.max(1 - prog(t, 0, 0.3), prog(t, END - 0.7, END));
    if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
  },
  post(ctx, u, t) { const o = shot(t + T0); if (o.spioncino || o.carte || o.scelta || o.ui) return; const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.5, H * 0.8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); },
});
