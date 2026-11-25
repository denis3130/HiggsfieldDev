// Il Bivio — «Il testimone», episodio 1: «La finestra accesa».
// Funzione pura del tempo: ogni inquadratura è agganciata alle parole della voce (assets/parole.json, una lista di righe del copione;
// r(n) = inizio della riga n, w(n, 'parola') = inizio di quella parola nella riga n). Le bocche seguono il volume della voce (assets/bocca.json).
// Tre set: fuori (palazzo, cucina, parcheggio), ingresso di casa, pianerottolo visto dallo spioncino.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE } from './sets/stile.js';
import { fuoriSet, WX, FY, AUTO } from './sets/esterno_set.js';
import { ingressoSet, pianerottoloSet } from './sets/testimone_set.js';
import { battito } from './sets/pupazzi.js';

const { W, H, E, prog, lerp, clamp, font, bump } = M;
let SF = null, SI = null, SP = null, RIGHE = [], WORDS = [], CHUNKS = [], END = 130, BOCCA = [], SEQ = [], IMG = {};
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z']/g, '');
const r = (n) => RIGHE[n - 1][0][0], rf = (n) => RIGHE[n - 1][RIGHE[n - 1].length - 1][1];
const w = (n, parola, fine = 0, quale = 0) => { const h = RIGHE[n - 1].filter((x) => norm(x[2]) === norm(parola)); const x = h[Math.min(quale, h.length - 1)]; return x ? x[fine] : r(n); };
function chunks(words, mx = 6) { const out = []; let cur = []; words.forEach((x, i) => { cur.push(x); if (/[.,:;?!…»]$/.test(x[2]) || cur.length >= mx || i === words.length - 1) { out.push(cur); cur = []; } }); return out; }
const v3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const su = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];
const loc = (p, yaw, v) => [p[0] + v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw), p[1] + v[1], p[2] - v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw)];   // punto locale di un personaggio → mondo
const verso = (da, a) => Math.atan2(a[0] - da[0], a[2] - da[2]);
const io = E.inOutSine, mixA = (A, B, k) => ({ a: v3(A.a, B.a, k), gomito: v3(A.gomito, B.gomito, k), dita: v3(A.dita, B.dita, k), dorso: v3(A.dorso, B.dorso, k), mano: k < 0.5 ? A.mano : B.mano });
const VOC = { a: [0.25, 0], e: [0.75, 0], i: [0.9, 0], o: [-0.2, 1], u: [-0.3, 0.9] };
function parla(chi, t) {
  for (const b of BOCCA) { if (b.who !== chi) continue; const i = (t - b.t0) * b.fps; if (i < 0 || i >= b.vals.length - 1) continue;
    const k = Math.floor(i), open = lerp(b.vals[k], b.vals[k + 1], i - k);
    const x = WORDS.find((q) => t >= q[0] - 0.03 && t <= q[1] + 0.05); let wide = 0.2, round = 0;
    if (x) { const vs = [...norm(x[2])].filter((ch) => VOC[ch]); if (vs.length) { const f = clamp((t - x[0]) / Math.max(0.05, x[1] - x[0])); [wide, round] = VOC[vs[Math.min(vs.length - 1, Math.floor(f * vs.length))]]; } }
    return { mouth: open * 0.6, wide: wide * 0.35, round: round * Math.min(1, open * 2) }; }
  return { mouth: 0, wide: 0, round: 0 };
}

// ------------------------------------------------------------------ il parcheggio: posizioni e coreografie
const CW = [WX, FY + 1.72, 0.42];                                                 // la camera alla tua finestra
const R0 = [3.05, 0, 14.0], E0 = [3.55, 0, 13.35], yR = verso(R0, E0), yE = yR + Math.PI, fV = [Math.sin(yR), 0, Math.cos(yR)];   // lui guarda verso il palazzo, lei gli dà le spalle
const pEf = su(E0, fV, 0.26), pRf = su(R0, fV, 0.27);                              // dove restano dopo
const BAULE = [AUTO[0] - 2.15, 0, AUTO[2]];                                        // il paraurti dietro dell'auto grigia
const FIN = [WX, FY + 1.55, 0.2];                                                  // la tua finestra, vista da giù
const sottoLampione = [3.7, 0, 13.9], yFin = (p) => verso(p, FIN);
const TU_FIN = { pos: [WX + 0.04, FY, -0.52], yaw: 0 };
const lontano = { pos: [60, 0, 60] }, TIENE = { dita: [0.14, 0.12, 0.12, 0.16], pollice: 0.45, apri: 0 };

// la colluttazione: A = { tG: il graffio, tL: il luccichio, tC: lei comincia a cadere }
function zuffa(t, A) {
  const tira = 0.5 * Math.sin(t * 7.3) + 0.5 * Math.sin(t * 11.1 + 1);
  const tiene = 1 - prog(t, A.tG - 0.05, A.tG + 0.12), graffio = bump(t, A.tG, 0.3), dopoG = E.outCubic(prog(t, A.tG, A.tG + 0.45));
  const colpo = E.inOutCubic(prog(t, A.tL - 0.28, A.tL)) * (1 - 0.6 * prog(t, A.tL + 0.15, A.tL + 0.7)), dopoL = prog(t, A.tL, A.tL + 0.3);
  const cede = io(prog(t, A.tL + 0.08, A.tC + 0.1)), cade = E.inCubic(prog(t, A.tC, A.tC + 0.7));
  const pE = su(E0, fV, 0.1 * tiene + 0.05 * tira * tiene - 0.3 * graffio + 0.26 * dopoG), pR = su(R0, fV, -0.14 * dopoG * (1 - dopoL) + 0.42 * colpo + 0.1 * dopoL);
  const yEl = yE + 0.22 * tira * tiene, braccioE = loc(pE, yEl, [-0.15, 1.16, 0.03]), guancia = loc(pR, yR, [0.05, 1.75, 0.1]);
  const riva = { pos: pR, yaw: yR, breathe: Math.sin(t * 2.4), lean: 0.06 + 0.12 * colpo, headPitch: 0.22 + 0.2 * dopoL, headYaw: -0.6 * bump(t, A.tG + 0.14, 0.34), angry: 0.6, lama: bump(t, A.tL, 0.16),
    armR: tiene > 0.02 ? { mondo: braccioE, gomito: [0.4, -0.8, -0.3], mano: 'presa' }
      : (colpo > 0.02 || dopoL > 0) ? { mondo: su(loc(pR, yR, [0.16, 1.12, 0.2]), fV, 0.3 * colpo), gomito: [0.6, -0.6, -0.4], mano: 'pugno' }
      : { a: [0.075, 0.625, 0.17], gomito: [1, -0.5, 0.2], dita: [0, 1, 0.1], dorso: [0.3, 0, 1], mano: 'piatta' } };
  const mani = { dita: [0.4, 0.45, 0.45, 0.5], pollice: 0.3, apri: 1 };
  const elena = { pos: [pE[0], pE[1] - 0.1 * cede * (1 - cade), pE[2]], yaw: yEl, breathe: Math.sin(t * 3.4), lean: -0.1 * tiene + 0.22 * graffio + 0.3 * cede, twist: 0.25 * tira * tiene, headPitch: 0.25 * cede, fear: 1,
    armL: tiene > 0.02 ? { a: [-0.2, 0.2, 0.22], mano: 'pugno' } : cede > 0.05 ? { a: [-0.06, 0.06, 0.17], mano: 'piatta' } : { a: [-0.16, 0.3, 0.3], dita: [0, 1, 0.3], dorso: [0, 0, -1], mano: 'aperta' },
    armR: graffio > 0.02 ? { mondo: guancia, gomito: [0.5, -0.7, -0.2], dita: [0, 0.4, 1], mano: mani }
      : tiene > 0.02 ? { mondo: loc(pR, yR, [0.0, 1.38, 0.14]), gomito: [0.6, -0.6, -0.2], dita: [0, 0.5, 1], dorso: [0, 1, 0], mano: 'aperta' }
      : cede > 0.05 ? { a: [0.06, 0.05, 0.17], mano: 'piatta' } : { a: [0.16, 0.3, 0.3], dita: [0, 1, 0.3], dorso: [0, 0, -1], mano: 'aperta' },
    gambe: { aL: 0.5 * cede, gL: 1.0 * cede, aR: 0.4 * cede, gR: 0.85 * cede }, cade };
  return { riva, elena };
}
const aTerra = () => ({ pos: pEf, yaw: yE, cade: 1, lean: 0.3, headPitch: 0.25, gambe: { aL: 0.5, gL: 1.0, aR: 0.4, gR: 0.85 }, armL: { a: [-0.06, 0.06, 0.17], mano: 'piatta' }, armR: { a: [0.06, 0.05, 0.17], mano: 'piatta' }, blink: 1 });
// Riva col dito alzato che conta i piani (piano = 1..4, anche con la virgola mentre sale)
// il braccio che filma dalla finestra: il telefono all'altezza del petto, di traverso dietro le dita e inclinato verso il parcheggio (lui guarda lo schermo dall'alto)
const FILMA = { a: [0.206, 0.329, 0.268], gomito: [1, -0.8, 0], dita: [-1, 0.06, 0], dorso: [0, -0.5, 0.87], mano: 'filma' };
// il braccio che mostra il distintivo allo spioncino: palmo verso la porta, il portafoglio davanti alle dita
const DIST_SU = { a: [-0.1, 0.33, 0.33], gomito: [-1, -0.8, -0.1], dita: [0, 1, 0.05], dorso: [0, 0, -1], mano: 'tessera' };
function conta(pos, yaw, piano, colpetto) {
  // il braccio sale a scatti verso il palazzo, un piano alla volta: dall'alto si deve vedere il dito che sale (se puntasse dritto alla finestra,
  // cioè alla camera, sparirebbe di scorcio), quindi l'alzata va da 52 a 85 gradi
  const sp = loc(pos, yaw, [0.2, 1.5, 0.02]), az = verso(sp, FIN), el = (52 + 11 * (piano - 1)) * Math.PI / 180;
  const dir = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
  return { mondo: su(sp, dir, 0.5 + 0.02 * colpetto), gomito: [0.5, -0.8, -0.3], ditaM: dir, dorsoM: [-Math.sin(az), 0.3, -Math.cos(az)], mano: 'indice' };
}

// ------------------------------------------------------------------ la sequenza delle inquadrature
function sequenza() {
  const S = [], sc = (t0, f) => S.push({ t0, f });
  const scuote = (t, a = 1) => [0.05 * a * M.noise1(t * 2.3, 5) + 0.02 * a * M.noise1(t * 7.1, 6), 0.04 * a * M.noise1(t * 2.9, 7) + 0.02 * a * M.noise1(t * 6.3, 8), 0];
  const C0 = [3.35, 0.9, 13.7];
  const tuFin = (t, x = {}) => ({ ...TU_FIN, breathe: Math.sin(t * 2.6), headPitch: 0.34, gazeY: -0.55, blink: battito(t, 5), ...x });

  // --- l'aggancio: quello che vedrai tra poco
  sc(0, (t, k) => ({ set: 'F', id: 'gancio1', pov: 1, pioggia: 1, cam: CW, look: v3([3.2, 0.7, 13.6], C0, k), fov: lerp(21, 13, io(k)), tenda: 1, tu: lontano,
    ...zuffa(t, { tG: w(1, 'finestra'), tL: w(1, 'uccidere') + 0.1, tC: w(1, 'uccidere', 1) }) }));
  const g2 = r(2) - 0.12;
  sc(g2, (t) => { const bussa = [0.75, 1.0, 1.25].reduce((m, x) => Math.max(m, bump(t, g2 + x, 0.11)), 0), al = E.outCubic(prog(t, w(2, 'ha') - 0.1, w(2, 'distintivo')));
    const giu = { a: [-0.253, -0.21, 0.035], gomito: [-0.6, -0.3, -0.75], dita: [0, -1, 0.05], dorso: [0, 0, 1], mano: 'rilassata' }, suD = DIST_SU;
    return { set: 'P', id: 'pov', spioncino: 1, cam: [0, 1.56, 0.03], look: [0, 1.62, 0.8], fov: 74, isp: { pos: [0.02, 0, 0.8], yaw: Math.PI, breathe: Math.sin(t * 1.9), blink: battito(t, 21), headPitch: 0.1, open: 0.72, gazeY: -0.3, smile: 0.25 * al,
      distintivo: al > 0.05, armL: mixA(giu, suD, al), armR: prog(t, g2 + 0.5, g2 + 0.7) * (1 - prog(t, g2 + 1.4, g2 + 1.7)) > 0.01 ? { a: [0.12, 0.42, 0.4 + 0.07 * bussa], gomito: [1, -0.8, 0], dita: [0, 0.3, 1], dorso: [0, 1, 0], mano: 'pugno' } : undefined } }; });

  // --- la cucina, alle 02:47
  const cK1 = [WX + 1.42, FY + 1.56, -3.5], grida = rf(3) + 0.12, pK = [WX - 0.78, FY, -1.15];
  sc(r(3) - 0.15, (t, k) => { const beve = bump(t, r(3) + 1.5, 1.1);
    return { set: 'F', id: 'cucina', interno: 1, cucina: 1, bicchiere: 1, cam: v3(cK1, [WX + 1.2, FY + 1.5, -3.2], io(k)), look: [WX - 0.5, FY + 1.12, -1.2], fov: 50,
      tu: { pos: pK, yaw: 2.2, breathe: Math.sin(t * 2.2), blink: battito(t, 5), sad: 0.3, headPitch: -0.16 * beve, armL: { a: v3([-0.1, 0.2, 0.27], [-0.05, 0.47, 0.17], io(beve)), gomito: [-0.5, -0.8, -0.3], dita: [0.2, 1, 0.15 - 0.5 * beve], dorso: [-1, 0, 0.3], mano: 'presa' } } }; });
  sc(w(3, 'quando') - 0.1, (t, k, s) => { const gira = E.outCubic(prog(t, grida, grida + 0.3)), va = io(prog(t, grida + 0.45, s.t1));
    return { set: 'F', id: 'cucina2', interno: 1, cucina: 1, bicchiere: 1, cam: v3([WX + 0.3, FY + 1.6, -0.42], [WX + 0.42, FY + 1.62, -0.4], io(k)), look: v3([pK[0], FY + 1.64, pK[2]], [pK[0] + 0.12, FY + 1.64, pK[2] + 0.1], va), fov: 34,
      tu: { pos: su(pK, [0.12, 0, 0.1], va), yaw: lerp(2.2, 1.75, va), twist: -0.2 * gira, breathe: Math.sin(t * 2.6), blink: battito(t, 5), fear: 0.75 * gira, browUp: 0.5 * gira, mouth: 0.14 * gira, headYaw: -1.0 * gira, sad: 0.3 * (1 - gira),
        armL: { a: [-0.1, 0.2 - 0.1 * gira, 0.27], gomito: [-0.5, -0.8, -0.3], dita: [0.2, 1, 0.15], dorso: [-1, 0, 0.3], mano: 'presa' }, gambe: { aL: 0.25 * bump(va, 0.5, 0.5) } } }; });
  // «Scosti la tenda.»: da fuori, la tenda che si apre e tu che guardi giù
  const cF1 = [WX + 0.8, FY + 1.76, 3.3];
  sc(r(4) - 0.1, (t, k) => { const apre = io(prog(t, r(4) + 0.15, rf(4) + 0.1)), wT = 1.0 - 0.74 * apre;
    return { set: 'F', id: 'finestra', pioggia: 0.7, cucina: 1, tenda: apre, cam: v3(cF1, [WX + 0.55, FY + 1.74, 2.9], io(k)), look: [WX, FY + 1.6, -0.3], fov: 28,
      tu: tuFin(t, { headPitch: 0.1 + 0.26 * prog(t, rf(4), rf(4) + 0.35), gazeY: -0.55 * prog(t, rf(4), rf(4) + 0.35), fear: 0.35, armR: { mondo: [WX + 0.66 - wT, FY + 1.56, -0.25], gomito: [1, -0.6, 0.1], dita: [0, 1, 0.2], dorso: [0.4, 0, 1], mano: 'presa' } }) }; });

  // --- sotto il lampione
  const AZ = { tG: w(6, 'graffia') + 0.12, tL: w(7, 'luccica') + 0.1, tC: w(7, 'cade') };
  sc(r(5) - 0.15, (t, k) => ({ set: 'F', id: 'alto', pov: 1, pioggia: 1, tenda: 1, tu: lontano, cam: CW, look: v3([3.6, 0.5, 13.9], C0, io(k)), fov: lerp(25, 17.5, io(k)), ...zuffa(t, AZ) }));
  sc(r(6) - 0.1, (t, k) => ({ set: 'F', id: 'zuffa', pov: 1, pioggia: 1, tenda: 1, tu: lontano, cam: CW, look: su([3.3, 1.15, 13.72], scuote(t), 0.5), fov: lerp(9.2, 8.2, k), ...zuffa(t, AZ) }));
  sc(r(7) - 0.1, (t, k) => ({ set: 'F', id: 'cade', pov: 1, pioggia: 1, tenda: 1, tu: lontano, cam: CW, look: su(v3([3.35, 1.0, 13.7], [3.75, 0.45, 13.75], io(prog(t, AZ.tC, AZ.tC + 0.9))), scuote(t), 0.5), fov: lerp(9.5, 10.5, k), ...zuffa(t, AZ) }));
  // «Non si muove più.»: tu alla finestra, la mano sulla bocca
  sc(r(8) - 0.1, (t, k) => { const m = E.outCubic(prog(t, r(8) - 0.05, r(8) + 0.4));
    return { set: 'F', id: 'tu1', pioggia: 0.7, cucina: 1, tenda: 1, cam: v3([WX - 0.4, FY + 1.74, 2.3], [WX - 0.3, FY + 1.73, 2.05], io(k)), look: [WX + 0.03, FY + 1.66, -0.5], fov: 22,
      tu: tuFin(t, { fear: 1, browUp: 0.6, mouth: 0.25 * (1 - m), armL: m > 0.02 ? { a: v3([-0.2, 0.0, 0.1], [-0.085, 0.458, 0.146], m), gomito: [-0.8, -0.8, 0.1], dita: [1, 0.2, 0.05], dorso: [0, 0.1, 1], mano: { dita: [0.1, 0.1, 0.12, 0.16], pollice: 0.3, apri: 0 } } : undefined }) }; });
  sc(r(9) - 0.1, (t, k) => ({ set: 'F', id: 'intorno', pov: 1, pioggia: 1, tenda: 1, tu: lontano, cam: CW, look: su([3.3, 1.2, 13.8], scuote(t), 0.4), fov: lerp(8.2, 7.2, io(k)), elena: aTerra(),
    riva: { pos: pRf, yaw: yR + 0.15, breathe: Math.sin(t * 1.7), headPitch: 0.42 - 0.34 * prog(t, r(9) + 0.2, r(9) + 0.7), headYaw: M.kf(t, [[r(9) + 0.3, 0], [w(9, 'intorno') + 0.25, -1.0], [w(9, 'calmo') + 0.2, 0.95], [rf(9), 0.15]], io), open: 0.7,
      armR: { a: v3([0.16, 0.08, 0.2], [0.253, -0.21, 0.035], io(prog(t, r(9), r(9) + 0.8))), mano: 'pugno' } } }));

  // --- il telefono: dodici secondi di video
  const tRec = w(10, 'dodici') - 0.12, fineRec = r(14) - 0.12, sec = (t) => 12 * clamp((t - tRec) / (rf(13) + 0.15 - tRec));
  sc(r(10) - 0.1, (t, k) => { const al = io(prog(t, r(10) + 0.1, w(10, 'filmi')));
    return { set: 'F', id: 'tu2', pioggia: 0.7, cucina: 1, tenda: 1, telTu: 1, telFuori: 1, cam: v3([WX - 0.3, FY + 1.73, 2.05], [WX + 0.35, FY + 1.72, 2.2], io(k)), look: [WX + 0.05, FY + 1.6, -0.5], fov: 24,
      tu: tuFin(t, { fear: 0.9, browUp: 0.4, headPitch: 0.34 - 0.1 * al, armR: { ...FILMA, a: v3([0.2, 0.0, 0.12], FILMA.a, al) } }) }; });
  // lui la trascina verso il baule
  const testaE = loc(pEf, yE, [1.5, 0.14, 0]), dTr = [0.12, 0, 0.62];
  sc(tRec, (t, k) => { const tr = io(prog(k, 0.35, 1)), pE = su(pEf, dTr, tr), giuK = io(prog(k, 0, 0.3)), pR = su(su(testaE, [-0.02, 0, 0.42], 1), dTr, tr); pR[1] = 0;
    return { set: 'F', id: 'rec1', rec: { sec: sec(t), zoom: '2,0x' }, pioggia: 0.6, tenda: 1, tu: lontano, cam: CW, look: su([4.1, 0.6, 14.1], scuote(t, 1.6), 1), fov: 13.5,
      elena: { ...aTerra(), pos: pE }, riva: { pos: pR, yaw: Math.PI + 0.1, lean: 0.95 * giuK, headPitch: 0.3, breathe: Math.sin(t * 3),
        armL: { mondo: su(loc(pE, yE, [1.28, 0.2, -0.17]), [0, 0, 0], 0), gomito: [-0.5, -0.4, -0.8], mano: 'presa' }, armR: { mondo: loc(pE, yE, [1.28, 0.2, 0.17]), gomito: [0.5, -0.4, -0.8], mano: 'presa' },
        gambe: { aL: 0.35 * giuK + 0.3 * Math.sin(tr * 9) * tr, gL: 0.5 * giuK, aR: 0.35 * giuK - 0.3 * Math.sin(tr * 9) * tr, gR: 0.5 * giuK } } }; });
  // la carica nel baule (le gambe che entrano)
  const zB = BAULE[2], chiude = w(11, 'chiude') - 0.25;
  sc(r(11) - 0.1, (t, k) => { const dn = io(prog(k, 0.15, 0.9));
    return { set: 'F', id: 'rec2', rec: { sec: sec(t), zoom: '4,0x' }, pioggia: 0.6, tenda: 1, tu: lontano, cofano: 1, cam: CW, look: su([BAULE[0] + 0.25, 0.95, zB], scuote(t, 1.3), 1), fov: 8.2,
      elena: { pos: [BAULE[0] - 0.62 + 0.78 * dn, 0.82, zB], yaw: -Math.PI / 2, sdraiata: 1, blink: 1, gambe: { gL: 1.25 * (1 - dn), gR: 1.12 * (1 - dn) } },
      riva: { pos: [BAULE[0] - 0.52, 0, zB + 0.04], yaw: Math.PI / 2, lean: 0.5 - 0.15 * dn, headPitch: 0.3, breathe: Math.sin(t * 3),
        armL: { mondo: [BAULE[0] - 0.22 + 0.55 * dn, 0.78, zB - 0.11], gomito: [-0.6, -0.6, -0.3], mano: 'presa' }, armR: { mondo: [BAULE[0] - 0.22 + 0.55 * dn, 0.78, zB + 0.11], gomito: [0.6, -0.6, -0.3], mano: 'presa' } } }; });
  // e chiude piano
  sc(chiude, (t, k, s) => { const c = 1 - io(prog(t, chiude + 0.25, rf(11) + 0.3)), th = 1.2 * c, bx = AUTO[0] - 1.3 - 0.8 * Math.cos(th), by = 0.915 + 0.8 * Math.sin(th);
    return { set: 'F', id: 'rec3', rec: { sec: sec(t), zoom: '4,0x' }, pioggia: 0.6, tenda: 1, tu: lontano, cofano: c, cam: CW, look: su([BAULE[0] + 0.3, 1.05, zB], scuote(t, 1.3), 1), fov: 8.6, elena: { nascosta: true },
      riva: { pos: [BAULE[0] - 0.2, 0, zB + 0.02], yaw: Math.PI / 2, lean: 0.12 + 0.2 * (1 - c), headPitch: 0.2, breathe: Math.sin(t * 2.4),
        armL: { mondo: [bx - 0.03, by + 0.03, zB - 0.26], gomito: [-0.8, -0.6, -0.2], ditaM: [0.8, 0.5, 0], dorsoM: [-0.5, 0.8, 0], mano: 'piatta' }, armR: { mondo: [bx - 0.03, by + 0.03, zB + 0.26], gomito: [0.8, -0.6, -0.2], ditaM: [0.8, 0.5, 0], dorsoM: [-0.5, 0.8, 0], mano: 'piatta' } } }; });
  // il fazzoletto sulla guancia; poi alza la testa
  const pFz = [BAULE[0] - 0.55, 0, zB - 0.2], su13 = r(13) + 0.05;
  const fazz = (t, x = {}) => ({ pos: pFz, yaw: yFin(pFz) - 0.2, breathe: Math.sin(t * 1.9), blink: battito(t, 21), fazzoletto: true, open: 0.7, ...x });
  sc(r(12) - 0.1, (t, k) => { const al = E.outCubic(prog(t, r(12), r(12) + 0.6));
    return { set: 'F', id: 'rec4', rec: { sec: sec(t), zoom: '6,0x' }, pioggia: 0.5, tenda: 1, tu: lontano, cam: CW, look: su([pFz[0] - 0.02, 1.52, pFz[2]], scuote(t, 1.1), 1), fov: 5.4, elena: { nascosta: true },
      riva: fazz(t, { headPitch: 0.1, headYaw: -0.35 * al, armR: { a: v3([0.253, -0.21, 0.035], [0.125 + 0.008 * Math.sin(t * 9), 0.565 + 0.014 * Math.sin(t * 9), 0.15], al), gomito: [1, -0.7, 0.1], dita: [-0.35, 1, 0], dorso: [1, 0, 0.6], mano: 'pugno' } }) }; });
  sc(su13 - 0.15, (t, k) => { const al = io(prog(t, su13, su13 + 0.55)), zm = E.outCubic(prog(t, rf(13) + 0.25, rf(13) + 0.5));
    return { set: 'F', id: 'rec5', rec: { sec: sec(t), zoom: zm > 0.5 ? '8,0x' : '6,0x' }, pioggia: 0.5, tenda: 1, tu: lontano, cam: CW, look: su([pFz[0] - 0.02, 1.56, pFz[2]], scuote(t, 1.1 + 1.5 * bump(t, rf(13) + 0.3, 0.3)), 1), fov: lerp(5.4, 3.9, zm), elena: { nascosta: true },
      riva: fazz(t, { headPitch: lerp(0.1, -0.66, al), headYaw: -0.35 * (1 - al) + 0.2 * al, gazeY: 0.4 * al, lean: -0.06 * al, armR: { a: v3([0.125, 0.565, 0.15], [0.253, -0.19, 0.06], al), gomito: [1, -0.7, 0.1], dita: v3([-0.35, 1, 0], [0, -1, 0.1], al), dorso: v3([1, 0, 0.6], [0.3, 0, 1], al), mano: 'pugno' } }) }; });

  // --- una sola finestra accesa
  const camGiu = [pFz[0] + 0.5, 1.72, pFz[2] + 1.5];
  const rivaSu = (t, x = {}) => fazz(t, { fazzoletto: false, headPitch: -0.66, headYaw: 0.2, gazeY: 0.4, lean: -0.06, ...x });
  const tuTel = (t, x = {}) => tuFin(t, { fear: 1, browUp: 0.5, headPitch: 0.3, armR: FILMA, ...x });
  sc(fineRec, (t, k) => ({ set: 'F', id: 'palazzo', pioggia: 1, cucina: 1, tenda: 1, telTu: 1, telFuori: 1, cam: camGiu, look: v3([WX + 0.6, FY - 2.2, 0], [WX, FY + 1.55, 0], io(prog(k, 0.05, 0.8))), fov: lerp(46, 12.5, E.inOutCubic(prog(k, 0.15, 0.92))), fronte: 0.1,
    riva: rivaSu(t), elena: { nascosta: true }, tu: tuTel(t) }));
  const pC = sottoLampione, yC = yFin(pC), uno = w(15, 'uno'), due = w(15, 'due'), tre = w(15, 'tre'), quattro = w(15, 'quattro');
  sc(r(15) - 0.1, (t, k) => { const al = io(prog(t, w(15, 'conta') - 0.15, uno - 0.05)), piano = 1 + E.outCubic(prog(t, due - 0.08, due + 0.12)) + E.outCubic(prog(t, tre - 0.08, tre + 0.12)) + E.outCubic(prog(t, quattro - 0.08, quattro + 0.12));
    const colp = [uno, due, tre, quattro].reduce((m, x) => Math.max(m, bump(t, x + 0.12, 0.12)), 0), cn = conta(pC, yC, piano, colp);
    return { set: 'F', id: 'conta', pov: 1, pioggia: 1, tenda: 1, tu: lontano, cam: CW, look: su([pC[0], 1.42, pC[2]], scuote(t, 0.7), 0.5), fov: lerp(7.4, 6.4, io(k)), elena: { nascosta: true },
      riva: { pos: pC, yaw: yC, breathe: Math.sin(t * 1.7), blink: battito(t, 21), headPitch: -0.66, gazeY: 0.4, lean: -0.06, open: 0.72,
        armR: al < 1 ? (al > 0.02 ? { ...cn, mondo: v3(loc(pC, yC, [0.26, 0.86, 0.06]), cn.mondo, al) } : undefined) : cn } }; });
  sc(r(16) - 0.1, (t, k) => { const al = io(prog(t, r(16) + 0.1, w(16, 'labbra') + 0.1)), cn = conta(pC, yC, 4, 0), bocca = loc(pC, yC, [-0.014, 1.1025 + 0.492, 0.118]);
    return { set: 'F', id: 'zitto', pov: 1, pioggia: 1, tenda: 1, tu: lontano, cam: CW, look: su([pC[0], 1.55, pC[2]], scuote(t, 0.6), 0.5), fov: lerp(6.0, 4.6, io(k)), elena: { nascosta: true },
      riva: { pos: pC, yaw: yC, breathe: Math.sin(t * 1.7), headPitch: -0.66, gazeY: 0.4, lean: -0.06, open: 0.72, smile: 0.35 * prog(t, rf(16), rf(16) + 0.5),
        armR: al < 0.5 ? { ...cn, mondo: v3(cn.mondo, bocca, al) } : { mondo: v3(cn.mondo, bocca, al), gomito: [0.6, -0.8, 0.1], dita: [0, 1, -0.12], dorso: [0, 0.1, 1], mano: 'indice' } } }; });

  // --- spegni la luce, chiami il 112
  const buio = w(17, 'luce') + 0.12;
  sc(r(17) - 0.15, (t, k) => { const c = t < buio ? 1 : 0, via = io(prog(t, r(17), buio));
    return { set: 'F', id: 'spegni', pioggia: 1, cucina: c, tenda: 1, telTu: 1, telFuori: 1, cam: camGiu, look: [WX, FY + 1.55, 0], fov: lerp(12.5, 11.5, k), fronte: 0.1, riva: lontano, elena: { nascosta: true },
      tu: tuTel(t, { pos: [WX + 0.04 + 0.5 * via, FY, -0.52 - 0.5 * via], headPitch: 0.1, armR: undefined }) }; });
  const tuTerra = (t, x = {}) => ({ pos: [WX + 0.12, FY, -0.5], yaw: Math.PI - 0.35, sit: 1, sedile: 0.03, gambe: { aL: 0.62, gL: 0.85, aR: 0.5, gR: 0.72 }, lean: 0.14, breathe: Math.sin(t * 4.2), blink: battito(t, 5), fear: 0.8, browUp: 0.4,
    armR: { a: [0.118, 0.555, 0.045], gomito: [1, -0.7, 0.3], dita: [0, 1, -0.15], dorso: [1, 0, 0], mano: 'presa' }, armL: { a: [-0.1, 0.06, 0.3], gomito: [-1, -0.4, 0], mano: 'presa' }, ...x });
  sc(r(18) - 0.2, (t, k) => ({ set: 'F', id: 'terra', interno: 1, cucina: 0, telTu: 1, fronte: 0.2, cam: v3([WX - 0.75, FY + 0.78, -2.5], [WX - 0.6, FY + 0.78, -2.25], io(k)), look: [WX + 0.1, FY + 0.6, -0.6], fov: 38,
    tu: tuTerra(t, { mouth: 0.18 + 0.16 * Math.sin(t * 13) * Math.sin(t * 5.1), headYaw: 0.25 * Math.sin(t * 1.3) }) }));
  const agente = w(20, 'agente') - 0.15;
  sc(r(19) - 0.1, (t, k) => { const sol = io(prog(t, w(20, 'fortunato'), w(20, 'fortunato', 1) + 0.3));
    return { set: 'F', id: 'ascolta', interno: 1, cucina: 0, telTu: 1, fronte: 0.26, cam: v3([WX + 0.58, FY + 0.92, -1.8], [WX + 0.5, FY + 0.92, -1.62], io(k)), look: [WX + 0.14, FY + 0.84, -0.6], fov: 30,
      tu: tuTerra(t, { fear: 0.8 - 0.5 * sol, browUp: 0.4, mouth: 0.1 * (1 - sol), smile: 0.2 * sol, headPitch: 0.06 * Math.sin(t * 2.2) + 0.1 * bump(t, w(19, 'casa'), 0.3), breathe: Math.sin(t * (4.2 - 1.6 * sol)) }) }; });
  // «…un agente proprio lì sotto.»: giù, sotto il lampione, lui con la radio guarda la tua finestra
  sc(agente, (t, k) => ({ set: 'F', id: 'radio', pov: 1, pioggia: 1, cucina: 0, tenda: 1, tu: lontano, cam: CW, look: su([pC[0], 1.5, pC[2]], scuote(t, 0.6), 0.5), fov: lerp(7.0, 5.4, io(k)), elena: { nascosta: true },
    riva: { pos: pC, yaw: yC, breathe: Math.sin(t * 1.7), blink: battito(t, 21), headPitch: -0.6, gazeY: 0.4, lean: -0.05, open: 0.72, radio: true, mouth: 0.14 * Math.abs(Math.sin(t * 9)) * prog(t, agente + 0.5, agente + 0.7),
      armR: { a: [0.085, 0.4, 0.16], gomito: [1, -0.8, 0.1], dita: [-0.12, 1, -0.05], dorso: [0.3, 0.1, 1], mano: TIENE } } }));

  // --- l'ingresso: l'ascensore, i tre colpi, lo spioncino
  const K3 = [rf(22) + 0.22, rf(22) + 0.62, rf(22) + 1.02], cutA = w(23, 'guardi') - 0.18, cutB = w(23, 'uomo') - 0.2;
  sc(r(21) - 0.25, (t, k, s) => { const gira = io(prog(t, w(21, "l'ascensore") - 0.1, w(21, "l'ascensore") + 0.9)), colpo = K3.reduce((m, x) => Math.max(m, bump(t, x + 0.05, 0.1)), 0), salto = E.outCubic(prog(t, K3[0], K3[0] + 0.25)), kk = io(prog(t, s.t0, cutA));
    return { set: 'I', id: 'corridoio', cam: v3([0.5, 1.64, 1.6], [0.4, 1.56, 0.85], kk), look: v3([0.05, 1.05, -2.5], [0.05, 0.9, -2.5], kk), fov: 44, piedi: E.outCubic(prog(t, w(21, 'ferma') + 0.75, w(21, 'ferma') + 1.35)), colpo,
      tu: { pos: [-0.2, 0, -0.85 + 0.09 * salto], yaw: lerp(2.25, Math.PI, gira), breathe: Math.sin(t * 3), headYaw: 0.35 * (1 - gira), lean: -0.05 * bump(t, K3[0] + 0.15, 0.3),
        armR: { a: [0.13, 0.2 + 0.03 * salto, 0.26], gomito: [1, -0.7, -0.2], dita: [0, 0.92, 0.25], dorso: [0, 0, 1], mano: 'presa' } } }; });
  sc(cutA, (t) => { const kk = io(prog(t, cutA, cutB));
    return { set: 'I', id: 'viso', porta: false, cam: v3([0.12, 1.675, -3.1], [0.07, 1.675, -2.96], kk), look: [0, 1.668, -2.0], fov: 27, occhio: 0.25 + 0.3 * kk, telefono: 1, piedi: 1,
      tu: { pos: [0, 0, lerp(-1.93, -2.12, kk)], yaw: Math.PI, breathe: Math.sin(t * 3.2), fear: 0.35 + 0.35 * kk, browUp: 0.4, mouth: 0.1, blink: bump(t, cutA + 0.5, 0.09), lean: 0.06 * kk, headPitch: 0.05 * kk,
        armR: { a: [0.13, 0.03, 0.2], gomito: [1, -0.5, -0.4], dita: [0, 0.6, 0.6], dorso: [0, -0.5, 1], mano: 'presa' } } }; });
  const distSu = DIST_SU;
  const riposoL = { a: [-0.253, -0.21, 0.035], gomito: [-0.6, -0.3, -0.75], dita: [0, -1, 0.05], dorso: [0, 0, 1], mano: 'rilassata' };
  sc(cutB, (t) => { const giu = io(prog(t, w(25, 'cappotto') - 0.3, w(25, 'scuro', 1) + 0.2)), zoom = E.inOutCubic(prog(t, w(25, 'guancia') - 0.5, w(25, 'freschi', 1) + 0.15)), fine = io(prog(t, rf(25) + 0.2, rf(25) + 1.2));
    const arriva = E.outCubic(prog(t, cutB, cutB + 0.5)), guarda = io(prog(t, cutB + 0.3, cutB + 0.9));
    return { set: 'P', id: 'pov', spioncino: 1, cam: [0.01 * M.noise1(t * 0.6, 3), 1.56 + 0.006 * M.noise1(t * 0.5, 4), 0.03], look: v3([0, 1.62, 0.8], [-0.052, 1.705, 0.7], zoom), fov: lerp(lerp(76, 62, giu), 22, zoom),
      isp: { pos: [0.02, 0, 0.8], yaw: Math.PI, breathe: Math.sin(t * 1.9), blink: battito(t, 21), distintivo: giu < 0.55, armL: mixA(distSu, riposoL, giu), ...parla('isp', t),
        smile: 0.3 * (1 - prog(t, w(24, 'polizia') - 0.2, w(24, 'polizia'))) + 0.55 * fine, open: 0.72 + 0.1 * fine, gazeX: 0.5 * (1 - guarda) + 0.5 * zoom, gazeY: -0.3 + 0.1 * zoom, headPitch: 0.1, headYaw: 0.12 * (1 - guarda) - 0.2 * zoom, headRoll: 0.05 * fine, lean: 0.03 * arriva } }; });

  // --- un passo indietro; il pavimento scricchiola
  const scr = w(26, 'scricchiola');
  sc(r(26) - 0.15, (t, k) => { const passo = io(prog(t, r(26) + 0.1, w(26, 'indietro', 1) + 0.15));
    return { set: 'I', id: 'passo', cam: v3([0.62, 1.3, 0.5], [0.6, 1.26, 0.8], io(k)), look: [0, 0.95, -2.4], fov: 50, piedi: 1, telefono: 1,
      tu: { pos: [0, 0, lerp(-2.12, -1.7, passo)], yaw: Math.PI, breathe: Math.sin(t * 4), fear: 0.9, lean: -0.05 * bump(passo, 0.5, 0.5), gambe: { aL: -0.4 * bump(passo, 0.3, 0.3), gL: 0.3 * bump(passo, 0.3, 0.3), aR: -0.4 * bump(passo, 0.72, 0.28), gR: 0.3 * bump(passo, 0.72, 0.28) },
        armR: { a: [0.13, 0.2, 0.26], gomito: [1, -0.7, -0.2], dita: [0, 0.92, 0.25], dorso: [0, 0, 1], mano: 'presa' } } }; });
  sc(scr - 0.12, (t, k) => { const giu = io(prog(t, scr - 0.1, scr + 0.25));
    return { set: 'I', id: 'piede', cam: v3([0.66, 0.24, -0.55], [0.63, 0.22, -0.62], io(k)), look: [-0.05, 0.1, -2.0], fov: 38, piedi: 1, telefono: 1, piediDx: -0.07 * io(prog(t, scr + 0.35, scr + 0.9)),
      tu: { pos: [0, 0, -1.7 + 0.16 * giu], yaw: Math.PI, breathe: Math.sin(t * 4), gambe: { aL: -0.42 * (1 - giu), gL: 0.5 * (1 - giu) } } }; });
  // «Nel tuo telefono c'è ancora il video.»
  sc(r(27) - 0.12, (t, k) => ({ set: 'I', id: 'video', ui: 'video', sfoca: 1, cam: [0.5, 1.5, 0.4], look: [0, 1.0, -2.4], fov: 40, piedi: 1, tu: { pos: [0, 0, -1.54], yaw: Math.PI } }));
  // «So che è lì dentro»… «Sono qui per proteggerla.»
  const sorr = w(29, 'sorride');
  sc(r(28) - 0.12, (t, k, s) => { const vic = io(prog(t, s.t0, s.t0 + 0.8)), sm = io(prog(t, sorr - 0.1, sorr + 0.5)), fine = io(prog(t, rf(29) + 0.1, rf(29) + 0.8));
    return { set: 'P', id: 'pov2', spioncino: 1, cam: [0.008 * M.noise1(t * 0.6, 3), 1.56 + 0.005 * M.noise1(t * 0.5, 4), 0.03], look: [0.0, lerp(1.62, 1.735, vic), 0.7], fov: lerp(70, 58, vic) - 5 * fine,
      isp: { pos: [0.02, 0, lerp(0.8, 0.6, vic)], yaw: Math.PI, breathe: Math.sin(t * 1.9), blink: battito(t, 21), ...parla('isp', t), lean: 0.1 * vic, headPitch: 0.08, headRoll: 0.07 * sm, open: 0.66 + 0.1 * sm, smile: 0.12 + 0.75 * sm, gazeY: -0.15,
        armR: prog(t, w(28, 'visto') - 0.3, w(28, 'luce', 1)) * (1 - prog(t, sorr - 0.4, sorr)) > 0.02 ? { a: [0.1, 0.34, 0.42], gomito: [1, -0.8, 0], dita: [0, 1, 0.3], dorso: [0, 0, -1], mano: 'indice' } : undefined } }; });

  // --- cosa fai?
  sc(r(30) - 0.2, (t, k) => ({ set: 'I', id: 'carte', carte: 1, sfoca: 1, cam: [0.5, 1.5, 0.4], look: [0, 1.0, -2.4], fov: 40, piedi: 1, telefono: 1, tu: { pos: [0, 0, -1.54], yaw: Math.PI, breathe: Math.sin(t * 4), armR: { a: [0.13, 0.2, 0.26], gomito: [1, -0.7, -0.2], dita: [0, 0.92, 0.25], dorso: [0, 0, 1], mano: 'presa' } } }));
  S.sort((a, b) => a.t0 - b.t0); S.forEach((s, i) => { s.t1 = i + 1 < S.length ? S[i + 1].t0 : END; });
  return S;
}
function shot(t) { let s = SEQ[0]; for (const x of SEQ) if (t >= x.t0) s = x; return s.f(t, clamp((t - s.t0) / Math.max(0.001, s.t1 - s.t0)), s); }

// ------------------------------------------------------------------ sopra l'immagine: sottotitoli, pioggia, finestra, telefono, spioncino, carte
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
function finestra(ctx) {                                         // i bordi scuri della tua finestra: la tenda scostata e il davanzale
  for (const s of [0, 1]) { const g = ctx.createLinearGradient(s ? W : 0, 0, s ? W - 120 : 120, 0); g.addColorStop(0, 'rgba(8,9,13,0.98)'); g.addColorStop(0.45, 'rgba(8,9,13,0.75)'); g.addColorStop(1, 'rgba(8,9,13,0)'); ctx.fillStyle = g; ctx.fillRect(s ? W - 120 : 0, 0, 120, H); }
  const g = ctx.createLinearGradient(0, H, 0, H - 150); g.addColorStop(0, 'rgba(8,9,13,1)'); g.addColorStop(0.6, 'rgba(8,9,13,0.85)'); g.addColorStop(1, 'rgba(8,9,13,0)'); ctx.fillStyle = g; ctx.fillRect(0, H - 150, W, 150);
}
function rec(ctx, t, o) {                                        // lo schermo del telefono che filma
  ctx.save();
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 520; i++) { const f = Math.floor(t * 30); ctx.fillStyle = `rgba(255,255,255,${0.03 + 0.05 * M.hash01(i + f * 13, 7)})`; ctx.fillRect(M.hash01(i + f * 17, 8) * W, M.hash01(i + f * 19, 9) * H, 3, 3); }
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5; const m = 64, L = 70, y0 = 520, y1 = H - 330;
  for (const [x, y, sx, sy] of [[m, y0, 1, 1], [W - m, y0, -1, 1], [m, y1, 1, -1], [W - m, y1, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x + sx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * L); ctx.stroke(); }
  const s = Math.min(12, Math.floor(o.sec)), on = Math.floor(t * 2) % 2 === 0;
  ctx.font = font(46, 700, 'Display'); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  M.rrect(ctx, W / 2 - 150, y1 + 44, 300, 76, 38); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
  if (on) { ctx.fillStyle = '#FF3B30'; ctx.beginPath(); ctx.arc(W / 2 - 104, y1 + 82, 15, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#fff'; ctx.fillText(`00:${String(s).padStart(2, '0')}`, W / 2 - 70, y1 + 85);
  ctx.font = font(36, 700, 'Display'); M.rrect(ctx, W - m - 150, y0 + 28, 122, 60, 30); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill(); ctx.fillStyle = '#FFD60A'; ctx.textAlign = 'center'; ctx.fillText(o.zoom, W - m - 89, y0 + 60);
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
// lo schermo del telefono con il video ancora lì (galleria)
function schermoVideo(ctx, t, s) {
  const k = E.outCubic(prog(t, s.t0, s.t0 + 0.45)), pw = 600, ph = 1180, x = (W - pw) / 2 + 5 * M.noise1(t * 3, 11), y = 470 + (1 - k) * 260 + 4 * M.noise1(t * 3.4, 12);
  ctx.save(); ctx.globalAlpha = k;
  ctx.shadowColor = 'rgba(150,190,255,0.35)'; ctx.shadowBlur = 90; M.rrect(ctx, x, y, pw, ph, 64); ctx.fillStyle = '#0B0C0F'; ctx.fill(); ctx.shadowBlur = 0;
  M.rrect(ctx, x + 16, y + 16, pw - 32, ph - 32, 50); ctx.fillStyle = '#12151B'; ctx.fill(); ctx.save(); ctx.clip();
  ctx.fillStyle = '#E8EDF5'; ctx.font = font(34, 700, 'Display'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('02:58', x + 52, y + 64); ctx.textAlign = 'right'; ctx.fillText('31%', x + pw - 52, y + 64);
  ctx.textAlign = 'left'; ctx.font = font(44, 700, 'Display'); ctx.fillText('Video', x + 52, y + 150); ctx.font = font(30, 500, 'UI'); ctx.fillStyle = '#9AA6B8'; ctx.fillText('Oggi, 02:49', x + 52, y + 204);
  const ix = x + 44, iy = y + 256, iw = pw - 88, ih = 660;
  if (IMG.video) { M.rrect(ctx, ix, iy, iw, ih, 26); ctx.save(); ctx.clip(); ctx.drawImage(IMG.video, 0, 150, 540, 660 * 540 / iw, ix, iy, iw, ih); ctx.restore(); }
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.arc(ix + iw / 2, iy + ih / 2, 62, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(ix + iw / 2 - 20, iy + ih / 2 - 30); ctx.lineTo(ix + iw / 2 + 32, iy + ih / 2); ctx.lineTo(ix + iw / 2 - 20, iy + ih / 2 + 30); ctx.closePath(); ctx.fill();
  M.rrect(ctx, ix + iw - 132, iy + ih - 66, 112, 46, 23); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = font(30, 700, 'Display'); ctx.textAlign = 'center'; ctx.fillText('00:12', ix + iw - 76, iy + ih - 41);
  ctx.textAlign = 'left'; ctx.font = font(30, 500, 'UI'); ctx.fillStyle = '#9AA6B8'; ctx.fillText('1 elemento · 12 secondi', x + 52, iy + ih + 60);
  ctx.restore(); ctx.restore();
}
// le due carte A/B come nel reel: immagine, bollo, etichetta; si illumina quella che il narratore sta leggendo
function carte(ctx, t) {
  const ent = (d) => E.outCubic(prog(t, r(30) - 0.1 + d, r(30) + 0.45 + d)), a = prog(t, r(31) - 0.1, r(31) + 0.15) * (1 - prog(t, r(32) - 0.15, r(32) + 0.1)), b = prog(t, r(32) - 0.1, r(32) + 0.15) * (1 - prog(t, r(33) - 0.15, r(33) + 0.1));
  const fin = prog(t, r(33) - 0.1, r(33) + 0.3);
  const una = (y, lettera, col, testo, img, acc, k, spenta) => { if (k <= 0) return; const x = 70, cw = 860, chh = 480, sc = 1 + 0.035 * acc;
    ctx.save(); ctx.globalAlpha = k * (1 - 0.45 * spenta); ctx.translate(x + cw / 2 + (1 - k) * 220, y + chh / 2); ctx.scale(sc, sc); ctx.translate(-cw / 2, -chh / 2);
    ctx.shadowColor = acc > 0.1 ? col : 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30 + 50 * acc; M.rrect(ctx, 0, 0, cw, chh, 36); ctx.fillStyle = '#0D1016'; ctx.fill(); ctx.shadowBlur = 0;
    M.rrect(ctx, 0, 0, cw, chh, 36); ctx.save(); ctx.clip();
    if (img) { const z = 1.05 + 0.04 * Math.sin(t * 0.5 + y), iw = cw * z, ih = iw * img.height / img.width; ctx.drawImage(img, (cw - iw) / 2, (chh - ih) / 2, iw, ih); }
    const g = ctx.createLinearGradient(0, chh * 0.45, 0, chh); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.88)'); ctx.fillStyle = g; ctx.fillRect(0, 0, cw, chh);
    ctx.restore(); M.rrect(ctx, 0, 0, cw, chh, 36); ctx.lineWidth = 5 + 4 * acc; ctx.strokeStyle = acc > 0.1 ? col : 'rgba(255,255,255,0.28)'; ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(74, 74, 46, 0, 7); ctx.fill(); ctx.fillStyle = '#0D1016'; ctx.font = font(60, 800, 'Display'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lettera, 74, 79);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = font(58, 800, 'Display'); testo.forEach((riga, i) => ctx.fillText(riga, 40, chh - 46 - (testo.length - 1 - i) * 66));
    ctx.restore(); };
  una(470, 'A', '#F2B63C', ['APRI', 'E FAI FINTA DI NIENTE'], IMG.cartaA, a, ent(0), b);
  una(990, 'B', '#5CB8FF', ['SCAPPI', 'DAL BALCONE'], IMG.cartaB, b, ent(0.18), a);
  if (fin > 0) { ctx.save(); ctx.globalAlpha = fin; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(60, 800, 'Display'); ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineJoin = 'round';
    ctx.strokeText('Scrivi A o B nei commenti', W / 2 - 20, 1556); ctx.fillStyle = '#fff'; ctx.fillText('Scrivi A o B nei commenti', W / 2 - 20, 1556); ctx.restore(); }
}
// un fotogramma di un set in una tela piccola (per le carte e la miniatura del video)
// (con hg l'immagine è larga: la camera prende quelle proporzioni e il fotogramma viene schiacciato nella tela, senza usare un grandangolo)
function scatto(set, o, wd = 540, luce = 1, hg = 0) { const cv = document.createElement('canvas'); cv.width = wd; cv.height = hg || Math.round(wd * H / W); const c = cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
  if (hg) set.camera.aspect = wd / hg; c.scale(wd / W, cv.height / H); if (luce !== 1) c.filter = `brightness(${luce})`; G.renderSet(c, set, 0, 0, o);
  if (hg) { set.camera.aspect = W / H; set.camera.updateProjectionMatrix(); } return cv; }

M.film({
  fonts: [font(74, 800, 'Display'), font(74, 500, 'UI')],
  samples: 1,
  async init() {
    RIGHE = await fetch('assets/parole.json').then((x) => x.json()); WORDS = RIGHE.flat();
    try { BOCCA = await fetch('assets/bocca.json').then((x) => x.json()); } catch { BOCCA = []; }
    CHUNKS = chunks(WORDS); END = Number(M.CFG.duration || 130);
    await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; SF = fuoriSet(); SI = ingressoSet(); SP = pianerottoloSet();
    SEQ = sequenza(); window.TEMPI = SEQ.map((s) => [Math.round(s.t0 * 100) / 100, s.f(s.t0 + 0.01, 0, s).id]);
    // le immagini fisse: la miniatura del video e le due carte
    const zB = AUTO[2], bx = AUTO[0] - 2.15;
    IMG.video = scatto(SF, { cam: CW, look: [bx + 0.2, 0.9, zB], fov: 9.5, tenda: 1, tu: lontano, cofano: 1, elena: { pos: [bx - 0.62, 0.82, zB], yaw: -Math.PI / 2, sdraiata: 1, blink: 1, gambe: { gL: 1.25, gR: 1.12 } },
      riva: { pos: [bx - 0.52, 0, zB + 0.04], yaw: Math.PI / 2, lean: 0.5, headPitch: 0.3, armL: { mondo: [bx - 0.22, 0.78, zB - 0.11], mano: 'presa' }, armR: { mondo: [bx - 0.22, 0.78, zB + 0.11], mano: 'presa' } } });
    // carta A: la tua mano che impugna la maniglia, vista da sopra la spalla (direzioni della mano nel verso della scena: sei girato verso la porta)
    IMG.cartaA = scatto(SI, { cam: [0.075, 1.23, -2.16], look: [0.255, 1.0, -2.46], fov: 34, piedi: 1, telefono: 0, occhio: 0.9, amb: 0.2, fronte: 0.14, luce: { pos: [-0.1, 1.45, -2.2], k: 1.1, colore: '#FFD9A8' },
      tu: { pos: [0.08, 0, -1.96], yaw: Math.PI, lean: 0.14, headPitch: 0.3, armL: { mondo: [0.3, 1.058, -2.375], gomitoM: [0.5, -0.8, 0.4], ditaM: [0, -0.12, -1], dorsoM: [0, 1, -0.12], mano: 'leva' } } }, 860, 1, 480);
    IMG.cartaB = scatto(SF, { cam: [4.5, FY + 1.5, 0.2], look: [4.2, FY - 3.2, 6.5], fov: 30, cucina: 0, riva: lontano, elena: { nascosta: true }, tu: lontano }, 860, 1.7, 480);
  },
  draw(ctx, u, t) {
    const o = shot(t);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    G.renderSet(ctx, o.set === 'F' ? SF : o.set === 'I' ? SI : SP, t, u, o);
    if (o.sfoca) { ctx.fillStyle = 'rgba(4,6,10,0.72)'; ctx.fillRect(0, 0, W, H); }
    if (o.pioggia) pioggia(ctx, t, o.pioggia);
    if (o.pov) finestra(ctx);
    if (o.rec) rec(ctx, t, o.rec);
    if (o.spioncino) spioncino(ctx);
    if (o.ui === 'video') schermoVideo(ctx, t, SEQ.find((s) => t >= s.t0 && t < s.t1));
    if (o.carte) carte(ctx, t);
    subtitles(ctx, t);
    const a = Math.max(1 - prog(t, 0, 0.3), prog(t, END - 0.7, END));
    if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
  },
  post(ctx, u, t) { const o = shot(t); if (o.spioncino || o.carte || o.rec) return; const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.5, H * 0.8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.4)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); },
});
