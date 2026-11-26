// Il gioco dei sette — Episodio 1: «L'ottavo invitato». Il formato del video A (data/horror/VIDEO_A.md): sottotitoli in alto parola per
// parola con una parola chiave per frase nel riquadro coi pallini, firma «@STACAPPELLA», camera quasi ferma che fa uno scatto veloce (con la
// scia) sulla parola che nomina la cosa, un oggetto da vedere per ogni scoperta, carte A/B alla fine. Funzione pura del tempo.
// La lista delle inquadrature è data/horror/il_gioco_dei_sette/ep1/scaletta.md; i tempi vengono dalla voce di Luc (assets/parole.json).
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE, V } from './sets/look.js';
import { TAVOLO, POSTI } from './sets/sala.js';
import { sala7Set } from './sets/sala7.js';
import { villaSet } from './sets/villa.js';
import { casaSet, manoLeon, carta } from './sets/casa.js';
import { sette, seduto, siedi, posto, NOMI } from './sets/tavola7.js';
import { mascheratoSet, fotoSet, stampa, corridoioSet, crt, scatta } from './sets/extra7.js';
import { candela } from './sets/look.js';

const { W, H, E, lerp, clamp, font } = M;
const T = TAVOLO.y, D2R = Math.PI / 180;
const sm = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const WORDS = await fetch('assets/parole.json').then((r) => r.json());
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z']/g, '');
// il tempo di una parola (della riga r, se data): inizio (fine = 0) o fine (fine = 1)
const w = (parola, r = null, fine = 0) => { const x = WORDS.find((q) => norm(q[2]) === norm(parola) && (r === null || q[3] === r)); if (!x) throw new Error('parola ' + parola); return x[fine]; };
const riga = (n) => WORDS.find((x) => x[3] === n)[0], rigaFine = (n) => { const q = WORDS.filter((x) => x[3] === n); return q[q.length - 1][1]; };
// una parola chiave per frase (riga:parola)
const CHIAVI = new Set(['0:sconosciuti,', '1:otto', '2:sorella.', '3:dieci', '4:mittente.', '5:indirizzo', '6:ucciso', '7:incidente.', '8:verità.', '9:persone.',
  '10:Victor,', '11:Elena,', '12:Marcus,', '13:Nora,', '14:Adrian,', '15:fissarmi.', '16:altri.', '17:bloccarono.', '18:mascherato.', '19:morte', '20:vivo.»',
  '21:fotografia.', '22:abbandonato.', '23:noi.', '24:Dieci', '25:gelarmi.', '26:luogo.', '27:improvvisamente.', '28:organizzato', '29:spensero.', '30:sordo.', '31:urlo.',
  '32:morto.', '33:biglietto.', '34:vedere.', '35:scritto:', '36:morta.»', '37:sussurrò:', '38:dimostrartelo.»', '39:mani.', '42:episodio.']);

// ------------------------------------------------------------------ i tempi degli avvenimenti
const EV = {};
function eventi() {
  Object.assign(EV, {
    eppure: w('Eppure'), ottavo: w("Sull'ottavo"), nome: w('nome', 2), morta: w('Morta', 3),
    casa: riga(4) - 0.2, busta: w('busta', 4), mittente: w('mittente', 4), interno: riga(5), indirizzo: w('indirizzo', 5), so: riga(6), ucciso: w('ucciso', 6),
    dieciAnni: riga(7), incidente: w('incidente', 7), dovevo: riga(8), verita: w('verità', 8),
    arrivo: riga(9), persone: w('persone', 9), victor: riga(10), elena: riga(11), marcus: riga(12), nora: riga(13), adrian: riga(14), sophie: riga(15), fissarmi: w('fissarmi', 15),
    nessuno: riga(16), improvv: riga(17), bloccarono: w('bloccarono', 17), tv: riga(18), accese: w('accese', 18), mascherato: w('mascherato', 18),
    ognuno: riga(19), qui: w('qui', 19), morte: w('morte', 19), avete: riga(20), dieciMil: w('Dieci', 20), vivo: w('vivo', 20),
    dal: riga(21), fotografia: w('fotografia', 21), mostrava: riga(22), abbandonato: w('abbandonato', 22), eravamo: riga(23), noi: w('noi', 23), dieci2: riga(24),
    sentii: riga(25), gelarmi: w('gelarmi', 25), avevo: riga(26), luogo: w('luogo', 26), victorAlza: riga(27), alzo: w('alzò', 27), soChi: riga(28), organizzato: w('organizzato', 28),
    luci: riga(29), spensero: w('spensero', 29), rumore: riga(30), urlo: riga(31), quando: riga(32), tornarono: w('tornarono', 32), morto: w('morto', 32),
    nella: riga(33), biglietto: w('biglietto', 33), raccolsi: riga(34), vedere: w('vedere', 34), sul: riga(35), leon: riga(36), mortaN: w('morta', 36),
    sophieV: riga(37), sussurro: w('sussurrò', 37), non: riga(38), vieni: w('Vieni', 38), destino: riga(39), mani: w('mani', 39), cartaA: riga(40), cartaB: riga(41), commento: riga(42),
  });
}

// ------------------------------------------------------------------ le inquadrature: [da, a, set, {cam, look, fov, up}, {…}, easing, opzioni]
const io = E.inOutSine, scatto = (k) => (k < 0.5 ? 16 * k ** 5 : 1 - (-2 * k + 2) ** 5 / 2), esce = (k) => 1 - (1 - k) ** 3;
const SH = [];
const sh = (a, b, set, A, B, e = io, o = {}) => SH.push({ a, b, set, A, B: B || A, e, ...o });
const GIU = [0, 0, -1], SU = [0, 1, 0];
// i punti della sala
const TV = [0, 1.13, -3.87], PORTA = [0, 1.55, 4.5];
let P = null;                                                           // i personaggi
const testaDi = (n) => P[n].occhi().toArray();
function inquadrature() {
  const e = EV, fine = M.CFG.duration || 146.6;
  // 1 — il gancio (la prova di stile approvata): la villa, la finestra, la tavola dall'alto, la picchiata sull'ottavo posto
  sh(0, e.eppure - 0.42, 'villa', { cam: [0, 1.7, 52], look: [0, 5.0, 0], fov: 30 }, { cam: [0.15, 1.75, 40.5], look: [0.6, 4.4, 0], fov: 30 });
  sh(e.eppure - 0.42, e.eppure + 0.04, 'villa', { cam: [0.15, 1.75, 40.5], look: [0.6, 4.4, 0], fov: 30 }, { cam: [2.8, 2.3, 5.75], look: [2.8, 2.3, 0], fov: 30 }, scatto);
  sh(e.eppure + 0.04, e.eppure + 0.45, 'sala', { cam: [0, 6.6, 0.25], look: [0, T, 0], fov: 40, up: GIU }, { cam: [0, 5.55, 0.05], look: [0, T, 0], fov: 40, up: GIU }, esce);
  sh(e.eppure + 0.45, e.ottavo - 0.05, 'sala', { cam: [0, 5.55, 0.05], look: [0, T, 0], fov: 40, up: GIU }, { cam: [0, 5.05, 0.0], look: [0, T, -0.05], fov: 40, up: [0.06, 0, -1] });
  sh(e.ottavo - 0.05, e.ottavo + 0.55, 'sala', { cam: [0, 5.05, 0.0], look: [0, T, -0.05], fov: 40, up: [0.06, 0, -1] }, { cam: [-0.16, 1.08, -0.66], look: [0.0, T + 0.04, -1.42], fov: 38 }, scatto);
  sh(e.ottavo + 0.55, e.nome - 0.1, 'sala', { cam: [-0.16, 1.08, -0.66], look: [0.0, T + 0.04, -1.42], fov: 38 }, { cam: [-0.13, 1.03, -0.76], look: [0.0, T + 0.04, -1.42], fov: 38 });
  sh(e.nome - 0.1, e.nome + 0.3, 'sala', { cam: [-0.13, 1.03, -0.76], look: [0.0, T + 0.04, -1.42], fov: 38 }, { cam: [0.0, 0.862, -1.02], look: [0, T + 0.028, -1.275], fov: 36 }, scatto);
  sh(e.nome + 0.3, e.morta - 0.05, 'sala', { cam: [0.0, 0.862, -1.02], look: [0, T + 0.028, -1.275], fov: 36 }, { cam: [0.0, 0.858, -1.04], look: [0, T + 0.028, -1.275], fov: 36 });
  sh(e.morta - 0.05, e.casa, 'sala', { cam: [0.0, 0.858, -1.04], look: [0, T + 0.028, -1.275], fov: 36 }, { cam: [-0.12, 1.02, -0.8], look: [0.02, T + 0.09, -1.5], fov: 38 });
  // 2 — la busta sotto la porta (mattina), la mano che la gira, il cartoncino, la mensola, le chiavi
  sh(e.casa, e.busta - 0.15, 'casa', { cam: [0.42, 0.13, 1.45], look: [0.0, 0.03, 0.0], fov: 38 }, { cam: [0.36, 0.12, 1.2], look: [0.0, 0.03, 0.05], fov: 38 });
  sh(e.busta - 0.15, e.busta + 0.25, 'casa', { cam: [0.36, 0.12, 1.2], look: [0.0, 0.03, 0.05], fov: 38 }, { cam: [0.16, 0.2, 0.62], look: [0.05, 0.0, 0.3], fov: 36 }, scatto);
  sh(e.busta + 0.25, e.mittente - 0.25, 'casa', { cam: [0.16, 0.2, 0.62], look: [0.05, 0.0, 0.3], fov: 36 }, { cam: [0.14, 0.2, 0.6], look: [0.05, 0.0, 0.31], fov: 36 });
  sh(e.mittente - 0.25, e.interno - 0.25, 'casa', { cam: [0.07, 0.42, 0.38], look: [0.05, 0.0, 0.31], fov: 36, up: GIU }, { cam: [0.06, 0.38, 0.37], look: [0.05, 0.0, 0.31], fov: 36, up: GIU });
  const CK = [-0.92, 0.878, 1.28];                                     // il cartoncino sulla consolle
  sh(e.interno - 0.25, e.indirizzo - 0.2, 'casa', { cam: [CK[0] + 0.02, CK[1] + 0.42, CK[2] + 0.06], look: CK, fov: 40, up: [-1, 0, 0] }, { cam: [CK[0] + 0.02, CK[1] + 0.36, CK[2] + 0.05], look: CK, fov: 40, up: [-1, 0, 0] });
  sh(e.indirizzo - 0.2, e.indirizzo + 0.25, 'casa', { cam: [CK[0] + 0.02, CK[1] + 0.36, CK[2] + 0.05], look: CK, fov: 40, up: [-1, 0, 0] }, { cam: [CK[0] - 0.015, CK[1] + 0.17, CK[2] + 0.03], look: [CK[0] - 0.015, CK[1], CK[2] + 0.02], fov: 36, up: [-1, 0, 0] }, scatto);
  sh(e.indirizzo + 0.25, e.so - 0.12, 'casa', { cam: [CK[0] - 0.015, CK[1] + 0.17, CK[2] + 0.03], look: [CK[0] - 0.015, CK[1], CK[2] + 0.02], fov: 36, up: [-1, 0, 0] }, { cam: [CK[0] - 0.015, CK[1] + 0.16, CK[2] + 0.03], look: [CK[0] - 0.015, CK[1], CK[2] + 0.02], fov: 36, up: [-1, 0, 0] });
  sh(e.so - 0.12, e.so + 0.3, 'casa', { cam: [CK[0] - 0.015, CK[1] + 0.16, CK[2] + 0.03], look: [CK[0] - 0.015, CK[1], CK[2] + 0.02], fov: 36, up: [-1, 0, 0] }, { cam: [CK[0] + 0.024, CK[1] + 0.12, CK[2] + 0.004], look: [CK[0] + 0.024, CK[1], CK[2] + 0.004], fov: 34, up: [-1, 0, 0] }, scatto);
  sh(e.so + 0.3, e.dieciAnni - 0.2, 'casa', { cam: [CK[0] + 0.024, CK[1] + 0.12, CK[2] + 0.004], look: [CK[0] + 0.024, CK[1], CK[2] + 0.004], fov: 34, up: [-1, 0, 0] }, { cam: [CK[0] + 0.024, CK[1] + 0.1, CK[2] + 0.004], look: [CK[0] + 0.024, CK[1], CK[2] + 0.004], fov: 34, up: [-1, 0, 0] });
  sh(e.dieciAnni - 0.2, e.incidente - 0.25, 'casa', { cam: [-0.62, 1.52, 1.62], look: [-1.08, 1.5, 1.52], fov: 34 }, { cam: [-0.68, 1.52, 1.58], look: [-1.08, 1.5, 1.5], fov: 34 });
  sh(e.incidente - 0.25, e.incidente + 0.25, 'casa', { cam: [-0.68, 1.52, 1.58], look: [-1.08, 1.5, 1.5], fov: 34 }, { cam: [-0.86, 1.56, 1.27], look: [-1.11, 1.55, 1.265], fov: 34 }, scatto);
  sh(e.incidente + 0.25, e.dovevo - 0.1, 'casa', { cam: [-0.86, 1.56, 1.27], look: [-1.11, 1.55, 1.265], fov: 34 }, { cam: [-0.88, 1.56, 1.27], look: [-1.11, 1.55, 1.265], fov: 34 });
  sh(e.dovevo - 0.1, e.verita - 0.35, 'casa', { cam: [-0.62, 1.38, 1.42], look: [-0.98, 0.88, 1.18], fov: 36 }, { cam: [-0.64, 1.36, 1.4], look: [-0.97, 0.93, 1.18], fov: 36 });
  sh(e.verita - 0.35, e.verita + 0.05, 'villa', { cam: [0.6, 1.2, 66], look: [0.4, 1.4, 30], fov: 40 }, { cam: [0.3, 1.2, 46], look: [0.2, 1.6, 10], fov: 40 }, scatto, { fari: true });
  sh(e.verita + 0.05, e.arrivo, 'villa', { cam: [0.3, 1.2, 46], look: [0.2, 1.6, 10], fov: 40 }, { cam: [0.2, 1.25, 38], look: [0.1, 2.0, 0], fov: 40 }, io, { fari: true });
  // 3 — il portone si apre: sei persone si girano. Poi gli invitati, uno per uno (dall'oggetto al viso)
  sh(e.arrivo, e.persone + 0.5, 'sala', { cam: [0, 1.62, 5.6], look: [0, 1.35, 0], fov: 40 }, { cam: [0, 1.6, 3.7], look: [0, 1.15, 0.2], fov: 40 }, io, { senza: ['leon'] });
  const intro = (t0, t1, nome, oggetto, viso, o = {}) => {
    sh(t0 - 0.35, t0 + 0.05, 'sala', { cam: [0, 1.6, 3.7], look: [0, 1.15, 0.2], fov: 40, ...(o.da || {}) }, { ...oggetto }, scatto, o);
    sh(t0 + 0.05, t0 + 0.55, 'sala', oggetto, { ...oggetto, cam: oggetto.cam.map((x, i) => x + (oggetto.look[i] - x) * 0.06) }, io, o);
    sh(t0 + 0.55, t1, 'sala', { ...oggetto, cam: oggetto.cam.map((x, i) => x + (oggetto.look[i] - x) * 0.06) }, viso, (k) => 1 - (1 - k) ** 2.2, o);
  };
  const vv = (n) => ({ ...SITI[n] });
  intro(e.victor, e.elena - 0.35, 'victor', SITI.victor.og, SITI.victor.vi, { senza: ['leon'] });
  intro(e.elena, e.marcus - 0.35, 'elena', SITI.elena.og, SITI.elena.vi, { senza: ['leon'], da: SITI.victor.vi });
  intro(e.marcus, e.nora - 0.35, 'marcus', SITI.marcus.og, SITI.marcus.vi, { senza: ['leon'], da: SITI.elena.vi });
  intro(e.nora, e.adrian - 0.35, 'nora', SITI.nora.og, SITI.nora.vi, { senza: ['leon'], da: SITI.marcus.vi });
  intro(e.adrian, e.sophie - 0.3, 'adrian', SITI.adrian.og, SITI.adrian.vi, { senza: ['leon'], da: SITI.nora.vi });
  sh(e.sophie - 0.3, e.sophie + 0.12, 'sala', SITI.adrian.vi, SITI.sophie.a, scatto, { senza: ['leon'] });
  sh(e.sophie + 0.12, e.nessuno - 0.2, 'sala', SITI.sophie.a, SITI.sophie.b, (k) => k, { senza: ['leon'] });
  sh(e.nessuno - 0.2, e.nessuno + 0.3, 'sala', SITI.sophie.b, { cam: [0, 6.4, 0.05], look: [0, T, 0.05], fov: 40, up: GIU }, scatto);
  sh(e.nessuno + 0.3, e.improvv - 0.3, 'sala', { cam: [0, 6.4, 0.05], look: [0, T, 0.05], fov: 40, up: GIU }, { cam: [0, 6.0, 0.05], look: [0, T, 0.05], fov: 40, up: [0.05, 0, -1] });
  // 4 — le porte si bloccano (la serratura, la grata), il televisore, l'uomo mascherato
  const SERR = [0.12, 0.86, 4.505];
  sh(e.improvv - 0.3, e.improvv + 0.1, 'sala', { cam: [0, 6.0, 0.05], look: [0, T, 0.05], fov: 40, up: [0.05, 0, -1] }, { cam: [0.2, 0.92, 4.2], look: SERR, fov: 36 }, scatto, { senza: ['leon'] });
  sh(e.improvv + 0.1, e.bloccarono - 0.05, 'sala', { cam: [0.2, 0.92, 4.2], look: SERR, fov: 36 }, { cam: [0.16, 0.9, 4.32], look: SERR, fov: 36 }, io, { senza: ['leon'] });
  sh(e.bloccarono - 0.05, e.bloccarono + 0.2, 'sala', { cam: [0.16, 0.9, 4.32], look: SERR, fov: 36 }, { cam: [0.14, 0.88, 4.4], look: SERR, fov: 32 }, esce, { senza: ['leon'] });
  sh(e.bloccarono + 0.2, e.tv - 0.25, 'sala', { cam: [-1.9, 1.9, -0.2], look: [-2.9, 1.75, -0.6], fov: 44 }, { cam: [-1.95, 1.85, -0.25], look: [-2.9, 1.7, -0.6], fov: 44 }, io, { senza: ['leon'] });
  sh(e.tv - 0.25, e.accese - 0.2, 'sala', { cam: [0.22, 1.5, 2.3], look: [0, 1.1, -3.9], fov: 34 }, { cam: [0.2, 1.48, 2.0], look: [0, 1.12, -3.9], fov: 34 }, io, { senza: ['leon'] });
  sh(e.accese - 0.2, e.mascherato - 0.3, 'sala', { cam: [0.2, 1.48, 2.0], look: [0, 1.12, -3.9], fov: 34 }, { cam: [0, 1.42, 0.2], look: [0, 1.13, -3.9], fov: 34 }, io, { senza: ['leon'] });
  sh(e.mascherato - 0.3, e.mascherato + 0.15, 'sala', { cam: [0, 1.42, 0.2], look: [0, 1.13, -3.9], fov: 34 }, { cam: [0, 1.135, -3.3], look: [0, 1.13, -3.9], fov: 34 }, scatto, { senza: ['leon'] });
  sh(e.mascherato + 0.15, e.dal + 0.6, '2d', null, null, io, { tv: 'mascherato' });
  // le reazioni durante il discorso: gli occhi di Elena, la mascella di Marcus, Adrian ai «dieci milioni»
  const vicino = (r, k = 0.06) => ({ ...r, cam: r.cam.map((x, i) => x + (r.look[i] - x) * k) });
  sh(e.qui + 0.1, e.qui + 1.15, 'sala', REAZ.elena, vicino(REAZ.elena), io, { senza: ['leon'] });
  sh(e.qui + 1.15, e.morte - 0.25, 'sala', REAZ.marcus, vicino(REAZ.marcus), io, { senza: ['leon'] });
  sh(e.morte - 0.25, e.dieciMil, '2d', null, null, io, { tv: 'mascherato' });
  sh(e.dieciMil, e.dieciMil + 1.2, 'sala', REAZ.adrian, vicino(REAZ.adrian, 0.12), io, { senza: ['leon'] });
  sh(e.dieciMil + 1.2, e.dal + 0.6, '2d', null, null, io, { tv: 'mascherato' });
  // 5 — la foto: i sette davanti alla fornace, i volti, la data; le mani di Leon; il verbale
  sh(e.dal + 0.6, e.sentii - 0.2, '2d', null, null, io, { foto: true });
  sh(e.sentii - 0.2, e.avevo - 0.3, 'sala', { cam: [0, 1.32, 1.98], look: [0, T, 1.25], fov: 40 }, { cam: [0, 1.28, 1.92], look: [0, T, 1.3], fov: 38 }, io, { senza: ['leon'], maniLeon: 'gelo' });
  sh(e.avevo - 0.3, e.luogo - 0.3, 'casa', { cam: [20.0, 1.14, 0.0], look: [20.0, 0.781, 0.0], fov: 40, up: [0, 0, -1] }, { cam: [20.0, 1.0, 0.062], look: [20.0, 0.781, 0.062], fov: 38, up: [0, 0, -1] }, io, { questura: true });
  sh(e.luogo - 0.3, e.victorAlza - 0.1, 'casa', { cam: [20.0, 1.0, 0.062], look: [20.0, 0.781, 0.062], fov: 38, up: [0, 0, -1] }, { cam: [20.02, 0.93, 0.14], look: [20.02, 0.781, 0.14], fov: 34, up: [0, 0, -1] }, scatto, { questura: true });
  // 6 — Victor si alza, accusa; il buio; le luci tornano: Victor è morto, il biglietto
  const vs = VIC.seduto, vp = VIC.inPiedi, va = VIC.punta;
  const basso = { cam: [vs[0] + 0.62, 0.92, vs[2] + 0.3], look: [vs[0], vs[1] - 0.02, vs[2]], fov: 40 }, alto = { cam: [vs[0] + 0.66, 1.05, vs[2] + 0.28], look: vp, fov: 40 };
  sh(e.victorAlza - 0.1, e.alzo - 0.05, 'sala', basso, { ...basso, cam: [basso.cam[0] - 0.02, 0.9, basso.cam[2] - 0.02] }, io, { senza: ['leon'] });
  sh(e.alzo - 0.05, e.alzo + 0.45, 'sala', { ...basso, cam: [basso.cam[0] - 0.02, 0.9, basso.cam[2] - 0.02] }, alto, scatto, { senza: ['leon'] });
  sh(e.alzo + 0.45, e.soChi, 'sala', alto, { ...alto, cam: [alto.cam[0] - 0.02, alto.cam[1], alto.cam[2] - 0.02] }, io, { senza: ['leon'] });
  const accusa = { cam: [va[0] + 0.55, va[1] - 0.3, va[2] - 0.25], look: va, fov: 32 }, accusa2 = { cam: [va[0] + 0.36, va[1] - 0.12, va[2] - 0.18], look: va, fov: 30 };
  sh(e.soChi, e.organizzato - 0.15, 'sala', accusa, { ...accusa, cam: accusa.cam.map((x, i) => x + (va[i] - x) * 0.05) }, io, { senza: ['leon'] });
  sh(e.organizzato - 0.15, e.organizzato + 0.25, 'sala', { ...accusa, cam: accusa.cam.map((x, i) => x + (va[i] - x) * 0.05) }, accusa2, scatto, { senza: ['leon'] });
  sh(e.organizzato + 0.25, e.luci, 'sala', accusa2, { ...accusa2, cam: accusa2.cam.map((x, i) => x + (va[i] - x) * 0.04) }, io, { senza: ['leon'] });
  sh(e.luci, e.rumore, 'sala', { cam: [1.6, 2.2, 2.9], look: [-0.2, 0.9, 0.2], fov: 40 }, { cam: [1.5, 2.15, 2.75], look: [-0.2, 0.9, 0.2], fov: 40 });
  sh(e.rumore, e.tornarono - 0.05, 'nero', null, null);
  sh(e.tornarono - 0.05, e.morto - 0.3, 'sala', { cam: [1.5, 2.1, 2.7], look: [-0.3, 0.85, 0.5], fov: 40 }, { cam: [1.45, 2.05, 2.6], look: [-0.3, 0.85, 0.5], fov: 40 });
  const vm = VIC.morto, pg = VIC.pugno, morto = { cam: [vm[0] + 0.55, vm[1] + 0.32, vm[2] + 0.38], look: vm, fov: 36 };
  sh(e.morto - 0.3, e.morto + 0.15, 'sala', { cam: [1.45, 2.05, 2.6], look: [-0.3, 0.85, 0.5], fov: 40 }, morto, scatto, { senza: ['leon'] });
  sh(e.morto + 0.15, e.nella, 'sala', morto, { ...morto, cam: morto.cam.map((x, i) => x + (vm[i] - x) * 0.05) }, io, { senza: ['leon'] });
  const p1 = { cam: [pg[0] + 0.26, pg[1] + 0.2, pg[2] + 0.3], look: pg, fov: 36 }, p2 = { cam: [pg[0] + 0.13, pg[1] + 0.1, pg[2] + 0.15], look: pg, fov: 34 };
  sh(e.nella, e.biglietto - 0.2, 'sala', p1, { ...p1, cam: p1.cam.map((x, i) => x + (pg[i] - x) * 0.12) }, io, { senza: ['leon'] });
  sh(e.biglietto - 0.2, e.biglietto + 0.2, 'sala', { ...p1, cam: p1.cam.map((x, i) => x + (pg[i] - x) * 0.12) }, p2, scatto, { senza: ['leon'] });
  const p3 = { cam: [pg[0] + 0.42, pg[1] + 0.2, pg[2] - 0.12], look: [pg[0] + 0.12, pg[1], pg[2] + 0.1], fov: 38 };
  sh(e.biglietto + 0.2, e.raccolsi - 0.25, 'sala', p2, { ...p2, cam: p2.cam.map((x, i) => x + (pg[i] - x) * 0.05) }, io, { senza: ['leon'] });
  const p4 = { ...p2, cam: [pg[0] + 0.34, pg[1] + 0.26, pg[2] + 0.3], fov: 38 };
  sh(e.raccolsi - 0.25, e.vedere - 0.15, 'sala', { ...p2, cam: p2.cam.map((x, i) => x + (pg[i] - x) * 0.05) }, p4, io, { senza: ['leon'] });
  sh(e.vedere - 0.15, e.vedere + 0.25, 'sala', p4, { cam: [0.05, 1.24, 1.9], look: [0.6, 1.15, -0.4], fov: 40 }, scatto, { senza: ['leon'] });
  sh(e.vedere + 0.25, e.sul - 0.2, 'sala', { cam: [0.05, 1.24, 1.9], look: [0.6, 1.15, -0.4], fov: 40 }, { cam: [0.04, 1.23, 1.88], look: [0.55, 1.15, -0.4], fov: 40 }, io, { senza: ['leon'] });
  // 7 — il biglietto sotto il tavolo, Sophie che si avvicina e sussurra
  const NB = [0.0, 0.7, 1.75];
  sh(e.sul - 0.2, e.leon - 0.15, 'sala', { cam: [0.0, 1.2, 1.97], look: NB, fov: 60 }, { cam: [0.0, 1.19, 1.965], look: NB, fov: 58 }, io, { senza: ['leon'], biglietto: true });
  sh(e.leon - 0.15, e.leon + 0.25, 'sala', { cam: [0.0, 1.19, 1.965], look: NB, fov: 58 }, { cam: [0.0, 1.14, 1.94], look: NB, fov: 44 }, scatto, { senza: ['leon'], biglietto: true });
  sh(e.leon + 0.25, e.sophieV - 0.2, 'sala', { cam: [0.0, 1.14, 1.94], look: NB, fov: 44 }, { cam: [0.0, 1.13, 1.935], look: NB, fov: 40 }, io, { senza: ['leon'], biglietto: true });
  sh(e.sophieV - 0.2, e.sophieV + 0.3, 'sala', { cam: [0.0, 1.2, 1.98], look: [0.3, 1.0, 0.5], fov: 40 }, { cam: [0.0, 1.2, 1.98], look: [0.4, 1.35, 1.95], fov: 40 }, scatto, { senza: ['leon'] });
  sh(e.sophieV + 0.3, e.non, 'sala', { cam: [0.0, 1.2, 1.98], look: [0.4, 1.35, 1.95], fov: 40 }, { cam: [0.0, 1.2, 1.98], look: [0.4, 1.35, 1.95], fov: 34 }, io, { senza: ['leon'], segui: 'sophie' });
  sh(e.non, e.vieni, 'sala', { cam: [0.0, 1.2, 1.98], look: [0.4, 1.35, 1.95], fov: 30 }, { cam: [0.02, 1.21, 1.98], look: [0.4, 1.35, 1.95], fov: 24 }, io, { senza: ['leon'], segui: 'sophie', occhi: true });
  sh(e.vieni, e.destino, 'sala', { cam: [0.02, 1.21, 1.98], look: [0.4, 1.35, 1.95], fov: 24 }, { cam: [0.0, 1.22, 1.98], look: [2.9, 1.3, -3.4], fov: 34 }, (k) => scatto(clamp(k * 2.2 - 0.6)), { senza: ['leon'], segui: 'sophie', seguiFino: 0.55 });
  // 8 — la scelta (le carte sopra la tavola scurita), poi di nuovo l'ottavo piatto
  sh(e.destino, e.commento - 0.3, 'sala', { cam: [1.3, 1.7, 2.6], look: [-0.2, 0.95, 0.3], fov: 42 }, { cam: [1.15, 1.62, 2.35], look: [-0.2, 0.95, 0.3], fov: 42 }, io, { carte: true });
  sh(e.commento - 0.3, e.commento + 0.15, 'sala', { cam: [1.15, 1.62, 2.35], look: [-0.2, 0.95, 0.3], fov: 42 }, { cam: [-0.13, 1.03, -0.76], look: [0.0, T + 0.04, -1.42], fov: 38 }, scatto, { carte: true });
  sh(e.commento + 0.15, fine, 'sala', { cam: [-0.13, 1.03, -0.76], look: [0.0, T + 0.04, -1.42], fov: 38 }, { cam: [0.0, 0.87, -1.0], look: [0, T + 0.028, -1.275], fov: 36 }, io);
}
// dove stanno gli oggetti e i visi degli invitati: calcolati all'avvio dai personaggi in posa (camera sull'oggetto, poi sul viso)
const SITI = {}, REAZ = {}, VIC = {}, POS = {}, LUCE = {};
const posM = (ob) => { ob.updateMatrixWorld(true); return V().setFromMatrixPosition(ob.matrixWorld).toArray(); };
function calcolaSiti() {
  const davanti = (n, dist, su = 0.02, lato = 0) => { const f = testaDi(n), s_ = posto(NOMI.indexOf(n)); return { cam: [f[0] + s_.avanti.x * dist + s_.sx.x * lato, f[1] + su, f[2] + s_.avanti.z * dist + s_.sx.z * lato], look: f }; };
  const og = (n, p, fov = 36, su = 0.2, av = 0.3, lato = 0.06) => { const s_ = posto(NOMI.indexOf(n)); return { cam: [p[0] + s_.avanti.x * av + s_.sx.x * lato, p[1] + su, p[2] + s_.avanti.z * av + s_.sx.z * lato], look: p, fov }; };
  let t0 = EV.victor + 0.6; metti(t0, { cam: [0, 1.25, 1.95], senza: ['leon'] }); oggettiAlTempo(t0, {});
  const mani = (n) => { const a = posM(P[n].MANI.S.m), b = posM(P[n].MANI.D.m); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.02, (a[2] + b[2]) / 2]; };
  const viso = (n, lato = 0) => { const d = davanti(n, 0.82, 0.0, lato); d.look = [d.look[0], d.look[1] - 0.1, d.look[2]]; return { ...d, fov: 36 }; };
  SITI.victor = { og: og('victor', posM(OGG.steto), 34, 0.1, 0.34, -0.08), vi: viso('victor') };
  SITI.elena = { og: og('elena', [0.5, T + 0.03, 0.95], 40, 0.52, 0.12, 0.0), vi: viso('elena', -0.06) };
  SITI.marcus = { og: og('marcus', mani('marcus'), 38, 0.28, 0.3, 0.1), vi: viso('marcus', 0.14) };
  SITI.nora = { og: og('nora', [0.47, T + 0.01, -0.06], 38, 0.3, 0.26, -0.05), vi: viso('nora') };
  SITI.adrian = { og: og('adrian', posM(OGG.orologio), 34, 0.3, 0.16, 0.05), vi: viso('adrian') };
  SITI.sophie = { a: { ...viso('sophie') }, b: { ...davanti('sophie', 0.42, 0.01), fov: 24 } };
  for (const n of NOMI) LUCE[n] = davanti(n, 0.5, 0.12).cam;
  // le reazioni al televisore: davanti al viso, dalla parte dello schermo
  t0 = EV.qui + 0.5; metti(t0, { senza: ['leon'] });
  for (const n of ['elena', 'marcus', 'adrian']) { const f = V(...testaDi(n)), g = V(...TV).sub(f).normalize(), lato = V(-g.z, 0, g.x).multiplyScalar(n === 'elena' ? 0.1 : -0.1);
    REAZ[n] = { cam: f.clone().add(g.clone().multiplyScalar(0.42)).add(lato).add(V(0, n === 'marcus' ? -0.06 : 0.0, 0)).toArray(), look: [f.x, f.y - (n === 'marcus' ? 0.07 : 0), f.z], fov: 24 }; }
  // Victor seduto, in piedi, che accusa, morto; il pugno col biglietto
  VIC.seduto = testaDi('victor');
  metti(EV.alzo + 0.6, { senza: ['leon'] }); VIC.inPiedi = testaDi('victor');
  metti(EV.organizzato + 0.3, { senza: ['leon'] }); VIC.punta = testaDi('victor');
  metti(EV.tornarono + 0.5, { senza: ['leon'] }); VIC.morto = testaDi('victor'); VIC.pugno = posM(P.victor.MANI.D.m); POS.victorMorto = VIC.morto;
  for (const n of NOMI) fatte[n] = null;
}
const v3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function inquadratura(t) {
  let s = SH[0]; for (const x of SH) if (t >= x.a) s = x;
  if (!s.A) return { ...s, k: clamp((t - s.a) / (s.b - s.a)) };
  const k = s.e(clamp((t - s.a) / (s.b - s.a)));
  return { ...s, k, cam: v3(s.A.cam, s.B.cam, k), look: v3(s.A.look, s.B.look, k), fov: lerp(s.A.fov, s.B.fov, k), up: v3(s.A.up || SU, s.B.up || SU, k) };
}
const veloce = (t) => SH.some((s) => s.e === scatto && t > s.a + 0.03 && t < s.b - 0.03);

// ------------------------------------------------------------------ lo stato della sala e le pose (funzioni del tempo)
function statoSala(t) {
  const e = EV;
  return {
    porte: t >= e.arrivo && t < e.victor ? sm(e.arrivo + 0.2, e.arrivo + 1.3, t) : 0,
    chiave: sm(e.bloccarono - 0.08, e.bloccarono + 0.18, t), luceSerr: t > e.improvv - 0.5 && t < e.tv ? 0.35 : 0,
    grata: t < e.bloccarono + 0.32 ? 0 : sm(e.bloccarono + 0.32, e.bloccarono + 0.52, t),
    tv: t >= e.accese && t < e.spensero ? 1 : 0, spente: t >= e.spensero ? e.spensero : -1,
    applique: t < e.tornarono ? 0 : (t < e.tornarono + 0.35 ? (Math.floor((t - e.tornarono) * 24) % 3 === 0 ? 0.2 : 1) : 1),
  };
}
const ORDINE = NOMI.map((n, i) => [n, i]);
// le pose di tutti a ogni tempo; ognuna con una chiave (se non cambia, non si rifà lo skinning)
function guardaDa(i, p) {                                       // collo (gradi) per guardare il punto p dal posto i (seduto)
  const s = posto(i), h = V(...s.L(0, 1.25, 0.12)), d = V(...p).sub(h), yaw = Math.atan2(d.dot(s.sx), d.dot(s.avanti)) / D2R, pitch = -Math.atan2(d.y, Math.hypot(d.dot(s.sx), d.dot(s.avanti))) / D2R;
  return [clamp(pitch, -25, 35), Math.max(-75, Math.min(75, yaw)), 0];
}
const mix = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
function posaDi(n, i, t, q) {
  const e = EV, s = posto(i);
  let collo = [8, 0, 0], sguardo = s.L(0, T, 0.5), chiave = 'base', o = {};
  const verso = (p, k = 1) => { collo = mix(collo, guardaDa(i, p), k); sguardo = p; };
  // chi guarda cosa
  if (t >= e.arrivo + 0.9 && t < e.victor) { const k = sm(e.arrivo + 0.9, e.arrivo + 1.6, t); verso([0, 1.6, 4.0], k); chiave = 'porta' + Math.round(k * 20); }
  else if (t >= e.victor && t < e.nessuno - 0.2) {
    const cam = q.cam || [0, 1.25, 1.95];
    if (n === 'marcus') { verso([0, 1.5, 4.4]); chiave = 'porta'; }
    else if (n === 'nora') { collo = [30, 12, 0]; sguardo = s.L(-0.12, T, 0.42); chiave = 'scrive'; }
    else if (n === 'adrian' && t < e.sophie) { collo = [26, 24, 0]; sguardo = s.L(0.2, T + 0.05, 0.42); chiave = 'orologio'; }
    else if (n === 'elena') { verso(cam, 0.8); collo[0] += 3; chiave = 'camera' + cam.map((x) => x.toFixed(2)).join(); }
    else if (n === 'victor') { verso(cam, 0.75); chiave = 'camera' + cam.map((x) => x.toFixed(2)).join(); }
    else if (n === 'sophie') { verso(cam); chiave = 'fissa' + cam.map((x) => x.toFixed(2)).join(); }
  } else if (t >= e.nessuno - 0.2 && t < e.tv) {                 // si guardano di sfuggita
    const altri = NOMI.filter((m) => m !== n), mod = (a, b) => ((a % b) + b) % b, j = mod(Math.floor((t - e.nessuno + 0.3) * 0.9 + i * 0.37), altri.length), chi = altri[mod(j * 3 + i, altri.length)];
    verso(testaDi(chi), 0.8); chiave = 'sguardo' + chi;
  } else if (t >= e.tv && t < e.victorAlza + 0.8) { const k = sm(e.accese, e.accese + 0.6, t); verso(TV, k); chiave = 'tv' + Math.round(k * 12); }
  else if (t >= e.victorAlza + 0.8 && t < e.spensero) { if (n !== 'victor') { verso(testaDi('victor'), sm(e.alzo, e.alzo + 0.5, t)); chiave = 'victor' + Math.round(sm(e.alzo, e.alzo + 0.5, t) * 10); } }
  else if (t >= e.tornarono) { if (n !== 'victor') { verso(POS.victorMorto || [-0.5, 0.85, 0.9], 1); o.schiena = [-4, 0, 0]; chiave = 'morto'; } }
  if (false) { const pl = seduto(i, { collo: [35, 0, 0], sguardo: [0, 0.67, 1.79], avanti: 0.03 }); pl.braccio = { S: { polso: s.L(0.12, 0.665, 0.16), dita: s.dir(-0.45, 0.05, 1), palmo: [0, 1, 0.3] }, D: { polso: s.L(-0.12, 0.665, 0.16), dita: s.dir(0.45, 0.05, 1), palmo: [0, 1, 0.3] } }; pl.mani = { S: 'rilassata', D: 'rilassata' }; return { o: pl, k: 'biglietto' }; }
  let p = seduto(i, { collo, sguardo, schiena: o.schiena });
  if (n === 'elena') { p.braccio.S.polso = s.L(0.1, T + 0.058, 0.36); p.braccio.D.polso = s.L(-0.1, T + 0.058, 0.36); p.braccio.S.dita = s.dir(-0.35, -0.08, 1); p.braccio.D.dita = s.dir(0.35, -0.08, 1); }
  if (n === 'marcus') { p.braccio.S.polso = s.L(0.085, T + 0.05, 0.33); p.braccio.D.polso = s.L(-0.085, T + 0.045, 0.31); p.braccio.S.dita = s.dir(-0.85, -0.15, 0.5); p.braccio.D.dita = s.dir(0.85, -0.1, 0.5); p.braccio.S.palmo = [0, -0.4, 0]; p.mani = { S: 'rilassata', D: 'pugno' }; }
  if (n === 'nora') { p.braccio.D.polso[1] += 0.012; p.mani = { D: 'presa' }; }
  // Victor: si alza, accusa, poi riverso sul tavolo col biglietto nel pugno
  if (n === 'victor' && t >= e.alzo - 0.02) {
    const C = P.victor.C, st = C.giunti.bacino[1] - C.suolo, k = sm(e.alzo, e.alzo + 0.42, t);
    if (t < e.rumore) {
      const piedi = { S: { caviglia: s.L(0.11, 0.09, 0.2), polo: [0, 0.3, 1], punta: [0.05, -0.2, 1] }, D: { caviglia: s.L(-0.11, 0.09, 0.2), polo: [0, 0.3, 1], punta: [-0.05, -0.2, 1] } };
      const dove = mix(s.L(0, 0.64, 0.1), s.L(0, st - 0.02, 0.06), k), schiena = [7 + 22 * Math.sin(Math.PI * k) - 2 * k, 0, 0];
      const punta = sm(e.soChi - 0.1, e.soChi + 0.35, t), mira = V(0.9, 1.5, -1.3), spalla = V(...s.L(-0.18, st + 0.45, 0.1)), dir = mira.clone().sub(spalla).normalize();
      p = { ...p, dove, schiena, gamba: piedi, collo: mix(guardaDa(i, TV), [-6, -38, 0], k), sguardo: punta > 0 ? mira.toArray() : TV };
      if (punta > 0) p.braccio = { ...p.braccio, D: { polso: spalla.clone().add(dir.clone().multiplyScalar(0.52 * punta + 0.2 * (1 - punta))).add(V(0, -0.25 * (1 - punta), 0)).toArray(), dita: dir.toArray(), palmo: [0, -0.6, 0.4], polo: [-1, -0.6, -0.4] } };
      p.mani = { D: punta > 0.3 ? 'indice' : 'piatta' };
      chiave = 'alza' + Math.round(k * 30) + ':' + Math.round(punta * 15);
    } else {                                                       // morto: riverso in avanti sul tavolo, la testa di lato
      p = { ...p, dove: s.L(0, 0.64, 0.14), schiena: [62, -6, 4], collo: [34, -62, -8], sguardo: null,
        braccio: { S: { polso: s.L(0.34, T + 0.035, 0.56), dita: s.dir(-0.4, -0.1, 1), palmo: [0, -1, 0] }, D: { polso: s.L(-0.12, T + 0.04, 0.52), dita: s.dir(0.5, -0.1, 1), palmo: [0, -1, 0], polo: [-1, -0.2, -0.2] } },
        mani: { D: 'pugno', S: 'rilassata' } };
      chiave = 'morto';
    }
  }
  // Sophie: in piedi accanto a Leon, si china a sussurrargli
  if (n === 'sophie' && t >= e.sophieV - 0.2 && t < e.commento - 0.3) {
    const C = P.sophie.C, st = C.giunti.bacino[1] - C.suolo, giro = -88, k = sm(e.sophieV, e.sussurro + 0.3, t);
    const base = V(0.66 - 0.08 * k, 0, 1.97), av = V(Math.sin(giro * D2R), 0, Math.cos(giro * D2R)), sx = V(Math.cos(giro * D2R), 0, -Math.sin(giro * D2R));
    const L = (x, y, z) => base.clone().add(sx.clone().multiplyScalar(x)).add(av.clone().multiplyScalar(z)).setY(y).toArray();
    const occhi = t < e.vieni + 0.15 ? [0, 1.22, 1.95] : [2.9, 1.3, -3.4], gira = sm(e.vieni, e.vieni + 0.45, t);
    p = { dove: L(0, st - 0.04, -0.06), giro, schiena: [10 + 22 * k, 0, 0], collo: [8 + 6 * k - 10 * gira, 8 + 62 * gira, 0], sguardo: occhi,
      gamba: { S: { caviglia: L(0.1, 0.09, -0.02), polo: [0, 0.3, 1], punta: [0.1, -0.2, 1] }, D: { caviglia: L(-0.12, 0.09, -0.1), polo: [0, 0.3, 1], punta: [-0.1, -0.2, 1] } },
      braccio: { S: { polso: L(0.22, 0.86, 0.1), dita: [0, -1, 0.1], palmo: [0, 0, -1] }, D: { polso: [0.47, T + 0.03, 1.6], dita: [-0.6, -0.15, -1], palmo: [0, -1, 0] } } };
    chiave = 'sophie' + Math.round(k * 40) + ':' + Math.round(gira * 20);
  }
  return { o: p, k: chiave };
}
const fatte = {};
function metti(t, q) {
  for (const [n, i] of ORDINE) {
    const pc = P[n]; pc.g.visible = !(q.senza || []).includes(n); if (n === 'leon') pc.busto.visible = !q.biglietto;
    if (!pc.g.visible) continue;
    const { o, k } = posaDi(n, i, t, q);
    if (fatte[n] !== k) { const inPiedi = (n === 'victor' && t >= EV.alzo - 0.02 && t < EV.rumore) || (n === 'sophie' && t >= EV.sophieV - 0.2 && t < EV.commento - 0.3) || o.inPiedi; if (inPiedi) pc.posa(o); else siedi(pc, o); fatte[n] = k; }
    if (n === 'victor') { const morto = t >= EV.rumore; pc.busto.userData.occhiali.visible = !morto; OCCH.visible = morto && !!SALA; }
  }
}

// ------------------------------------------------------------------ i sottotitoli del video A
function pezzi(words, mx = 4) { const out = []; let cur = []; words.forEach((x, i) => { cur.push(x); const n = words[i + 1]; if (/[.,:;?!…»]$/.test(x[2]) || cur.length >= mx || !n || n[3] !== x[3]) { out.push(cur); cur = []; } }); return out; }
const CHUNKS = pezzi(WORDS);
function sottotitoli(ctx, t) {
  let ci = -1; for (let i = 0; i < CHUNKS.length; i++) if (t >= CHUNKS[i][0][0] - 0.02) ci = i;
  if (ci < 0) return; const ch = CHUNKS[ci], next = CHUNKS[ci + 1]; if (t > ch[ch.length - 1][1] + 0.6 && (!next || t < next[0][0] - 0.02)) return;
  const size = 70, fB = font(size, 800, 'Sub'), fR = font(size, 500, 'Sub'), space = size * 0.27, maxW = W * 0.8;
  ctx.save(); ctx.textBaseline = 'alphabetic';
  const vis = ch.filter((x) => t >= x[0] - 0.02);
  const items = vis.map((x) => { const now = t < x[1] + 0.03 && (x === vis[vis.length - 1]); ctx.font = now ? fB : fR; return { x, now, width: ctx.measureText(x[2]).width }; });
  const lines = [[]]; let lw = 0;
  items.forEach((it) => { if (lw + it.width > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(it); lw += it.width + space; });
  const y0 = H * 0.17;
  lines.forEach((line, li) => {
    const tot = line.reduce((a, it) => a + it.width, 0) + space * (line.length - 1); let x = (W - tot) / 2; const y = y0 + li * size * 1.18;
    line.forEach((it) => {
      const a = clamp((t - it.x[0] + 0.02) / 0.09), dy = (1 - E.outCubic(a)) * 10, chiave = CHIAVI.has(it.x[3] + ':' + it.x[2]);
      if (chiave) {
        const px = 12, top = y - size * 0.8, h = size * 1.02, ww = it.width + px * 2;
        ctx.globalAlpha = a; ctx.fillStyle = 'rgba(8,8,10,0.62)'; M.rrect(ctx, x - px, top + dy, ww, h, 8); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.fillStyle = 'rgba(20,20,24,0.9)';
        for (const [cx, cy] of [[x - px, top + dy], [x - px + ww, top + h + dy]]) { ctx.beginPath(); ctx.arc(cx, cy, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      }
      ctx.globalAlpha = a; ctx.font = it.now || chiave ? fB : fR;
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 2;
      ctx.fillStyle = it.now || chiave ? '#FFFFFF' : 'rgba(214,216,222,0.86)'; ctx.fillText(it.x[2], x, y + dy);
      ctx.shadowColor = 'transparent';
      x += it.width + space;
    });
  });
  ctx.restore();
}
function firma(ctx) {
  ctx.save(); ctx.font = font(46, 800, 'Sub'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.5;
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.fillStyle = '#FFFFFF'; ctx.fillText('@STACAPPELLA', W / 2, H * 0.665); ctx.restore();
}
// ------------------------------------------------------------------ le carte A/B (come il video A)
function carte(ctx, t) {
  const e = EV, cw = W * 0.88, ch = H * 0.118, x0 = (W - cw) / 2, ys = [H * 0.385, H * 0.52];
  const dati = [{ l: 'A', c: [90, 180, 255], r1: 'Mostrare il biglietto a tutti', r2: 'e pretendere spiegazioni', img: IMG.cartaA, entra: e.mani + 0.05, accesa: [e.cartaA, e.cartaB - 0.1] },
    { l: 'B', c: [255, 70, 70], r1: 'Nascondere il biglietto', r2: 'e seguire Sophie in segreto', img: IMG.cartaB, entra: e.mani + 0.3, accesa: [e.cartaB, e.commento - 0.1] }];
  const via = sm(e.commento - 0.4, e.commento, t);
  ctx.save(); ctx.globalAlpha = 0.55 * sm(e.mani - 0.2, e.mani + 0.2, t) * (1 - via); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
  dati.forEach((d, i) => {
    const k = E.outCubic(sm(d.entra, d.entra + 0.28, t)), dx = (1 - k) * (i === 0 ? -1 : 1) * W * 1.05, y = ys[i], acc = t >= d.accesa[0] && t < d.accesa[1] ? sm(d.accesa[0], d.accesa[0] + 0.25, t) : 0;
    if (k <= 0) return; ctx.save(); ctx.globalAlpha = 1 - via; ctx.translate(dx, 0);
    if (acc > 0) { ctx.shadowColor = `rgba(${d.c},${0.9 * acc})`; ctx.shadowBlur = 50 * acc; }
    ctx.fillStyle = 'rgba(12,12,16,0.78)'; M.rrect(ctx, x0, y, cw, ch, 28); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 5 + 3 * acc; ctx.strokeStyle = `rgba(${d.c},${0.75 + 0.25 * acc})`; M.rrect(ctx, x0, y, cw, ch, 28); ctx.stroke();
    const iw = ch * 1.25, pad = ch * 0.12; ctx.save(); M.rrect(ctx, x0 + pad, y + pad, iw, ch - 2 * pad, 16); ctx.clip();
    if (d.img) { const s = Math.max(iw / d.img.width, (ch - 2 * pad) / d.img.height); ctx.drawImage(d.img, x0 + pad + (iw - d.img.width * s) / 2, y + pad + (ch - 2 * pad - d.img.height * s) / 2, d.img.width * s, d.img.height * s); }
    ctx.restore();
    const cx = x0 + pad * 2 + iw + ch * 0.26, cy = y + ch / 2; ctx.beginPath(); ctx.arc(cx, cy, ch * 0.2, 0, Math.PI * 2); ctx.fillStyle = `rgba(${d.c},0.95)`; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = font(Math.round(ch * 0.24), 800, 'Sub'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.l, cx, cy + 2);
    ctx.textAlign = 'left'; ctx.font = font(Math.round(ch * 0.162), 800, 'Sub'); const tx = cx + ch * 0.3;
    ctx.fillText(d.r1, tx, cy - ch * 0.14); ctx.fillText(d.r2, tx, cy + ch * 0.16);
    ctx.restore();
  });
}

// ------------------------------------------------------------------ il televisore e la foto a tutto schermo (2D)
const IMG = {};
function schermoTv(c, t, x, y, w, h) {
  const e = EV;
  if (t < e.accese + 0.35) { crt(c, null, t, x, y, w, h, { neve: 1 }); return; }
  if (t < e.dal) {                                                  // l'uomo mascherato: quattro inquadrature che si alternano, la neve sui cambi
    const seg = [e.accese + 0.35, e.ognuno, e.qui + 0.5, e.avete, e.dieciMil + 0.3], j = seg.filter((s) => t >= s).length - 1, f = IMG.mas[Math.max(0, j) % IMG.mas.length];
    const glitch = seg.some((s) => t >= s && t < s + 0.08) ? 0.7 : 0.04, sette = t >= e.vivo - 0.05 && t < e.vivo + 0.5;
    crt(c, f, t, x, y, w, h, { neve: sette ? 0.9 : glitch });
    if (sette) { c.save(); c.fillStyle = 'rgba(240,240,255,0.92)'; c.font = font(Math.round(h * 0.7), 800, 'Sub'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('7', x + w / 2, y + h / 2); c.restore(); }
    return;
  }
  if (t < e.dal + 0.5) { crt(c, null, t, x, y, w, h, { neve: 1 }); return; }
  if (t < e.victorAlza) { crt(c, IMG.foto, t, x, y, w, h, { neve: 0.05 }); return; }
  crt(c, null, t, x, y, w, h, { neve: 0.35, luce: 0.5 });
}
function tvPieno(ctx, t, q) {                                       // l'immagine del televisore a tutto schermo (dopo lo zoom dentro lo schermo)
  const e = EV, k = clamp((t - q.a) / 6), z = 1.08 + 0.05 * k, w0 = W * z, h0 = w0 * 0.75;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const hh = H * (1.0 + 0.07 * io(k)), ww = hh / 0.75; schermoTv(ctx, t, (W - ww) / 2, (H - hh) / 2 - H * 0.02 * k, ww, hh);
}
// la foto a tutto schermo: si scorre sui volti, scatti da un volto all'altro, poi la data
function fotoPiena(ctx, t) {
  const e = EV, F = IMG.foto, fw = F.width, fh = F.height;
  const VOLTI = IMG.volti;                                          // [x, y] in proporzione della foto
  const pts = [
    [e.dal + 0.6, [0.5, 0.5], 1.5], [e.fotografia - 0.05, [0.5, 0.5], 1.55], [e.fotografia + 0.35, [0.5, 0.5], 1.85], [e.mostrava, [0.35, 0.5], 2.0], [e.abbandonato - 0.15, [0.62, 0.48], 1.95],
    [e.abbandonato + 0.3, [0.8, 0.3], 2.0], [e.eravamo - 0.05, [0.8, 0.32], 2.0], [e.eravamo + 0.25, VOLTI.victor, 3.4], [e.eravamo + 0.55, VOLTI.victor, 3.5], [e.eravamo + 0.75, VOLTI.nora, 3.4],
    [e.noi - 0.1, VOLTI.nora, 3.5], [e.noi + 0.15, VOLTI.leon, 3.6], [e.dieci2 - 0.15, VOLTI.leon, 3.7], [e.dieci2 + 0.2, [0.82, 0.9], 3.0], [e.sentii, [0.82, 0.9], 3.2],
  ];
  let a = pts[0], b = pts[0]; for (let i = 0; i < pts.length; i++) if (t >= pts[i][0]) { a = pts[i]; b = pts[Math.min(i + 1, pts.length - 1)]; }
  const k0 = b[0] > a[0] ? clamp((t - a[0]) / (b[0] - a[0])) : 0, veloceK = b[0] - a[0] < 0.45, k = veloceK ? scatto(k0) : io(k0);
  const c = [lerp(a[1][0], b[1][0], k), lerp(a[1][1], b[1][1], k)], z = lerp(a[2], b[2], k);
  const s = (W / fw) * z * 1.0; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const dx = W / 2 - c[0] * fw * s, dy = H / 2 - c[1] * fh * s;
  // dentro il televisore: righe e grana sopra la foto (più leggere quando siamo vicini)
  ctx.save(); ctx.drawImage(F, dx, dy, fw * s, fh * s); ctx.restore();
  const tmp = { width: W, height: H }; crt(ctx, null, t, 0, 0, W, H, { neve: 0.02 });
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.drawImage(F, dx, dy, fw * s, fh * s); ctx.restore();
}

// la prova a vuoto (rr/render.mjs --secco a:b): tutta la logica di un fotogramma senza disegnare la scena 3D
let PROVA = null;
window.__prova = (t) => {
  try {
    if (!PROVA) { PROVA = document.createElement('canvas'); PROVA.width = W; PROVA.height = H; }
    const c = PROVA.getContext('2d'), q = inquadratura(t);
    if (!q.set) throw new Error('nessuna inquadratura');
    if (q.A && [...q.cam, ...q.look, q.fov].some((x) => !Number.isFinite(x))) throw new Error('camera non valida');
    if (q.set === 'sala') { metti(t, q); oggettiAlTempo(t, q); if (q.segui) testaDi(q.segui); statoSala(t); if (statoSala(t).tv > 0) schermoTv(SALA.tela.getContext('2d'), t, 0, 0, SALA.tela.width, SALA.tela.height); }
    else if (q.set === 'casa') statoCasa(t, q);
    else if (q.set === '2d') { if (q.foto) fotoPiena(c, t); else tvPieno(c, t, q); }
    if (q.carte || (t >= EV.mani && t < EV.commento + 0.2)) carte(c, t);
    sottotitoli(c, t); firma(c);
    return null;
  } catch (err) { return String((err && err.stack) || err).slice(0, 400); }
};
// ------------------------------------------------------------------ il film
let SALA = null, VILLA = null, CASA = null, OCCH = null, FARI = null, MANI_L = null, NOTA = null, BIGL = null, PUGNO_NOTA = null, OGG = {};
M.film({
  fonts: [font(70, 800, 'Sub'), font(70, 500, 'Sub'), font(80, 400, 'Corsivo'), '40px Macchina', '40px Mano', '700 40px Mano'],
  samples: (t) => (veloce(t) ? 5 : 1), shutter: 0.6,
  async init() {
    await G.initGL({ exposure: 1.05 }); eventi();
    SALA = sala7Set(); VILLA = villaSet(); CASA = casaSet();
    P = await sette(SALA.scene);
    // gli oggetti degli invitati, poi dove stanno visi e oggetti, poi le inquadrature
    oggetti(); calcolaSiti(); inquadrature();
    // le immagini fatte una volta: l'uomo mascherato, la foto, le carte
    const MS = mascheratoSet(); IMG.mas = [[0, 0, 0], [0.05, 0.12, 0.04], [-0.04, -0.1, -0.05], [0.1, 0.02, 0]].map((r, i) => scatta(MS, { cam: [0.02 * i, 1.55, 1.3 - 0.06 * i], look: [0, 1.53, 0], fov: 30, testa: r }, 4 / 3));
    IMG.foto = await fotoFornace(); IMG.cartaA = await cartaA(); IMG.cartaB = await cartaB();
    for (const [n, i] of ORDINE) { fatte[n] = null; }
    // i fari della macchina nella notte (solo nella scena della strada)
    FARI = [-0.7, 0.7].map((x) => { const L = new THREE.SpotLight(0xFFF2D8, 0, 60, 0.42, 0.5, 1.2); VILLA.scene.add(L, L.target); return { L, x }; });
  },
  draw(ctx, u, t) {
    const q = inquadratura(t);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (q.set === 'nero') return;
    if (q.set === '2d') { if (q.foto) fotoPiena(ctx, t); else tvPieno(ctx, t, q); return; }
    if (q.set === 'villa') {
      for (const f of FARI) { f.L.intensity = q.fari ? 260 : 0; if (q.fari) { const c = V(...q.cam), l = V(...q.look), d = l.clone().sub(c).normalize(), sx = V(-d.z, 0, d.x).normalize(); f.L.position.copy(c).add(sx.clone().multiplyScalar(f.x)).add(V(0, -0.5, 0.3)); f.L.target.position.copy(c).add(d.multiplyScalar(30)).add(sx.clone().multiplyScalar(f.x)).setY(0.2); } }
      G.renderSet(ctx, VILLA, t, u, q); return;
    }
    if (q.set === 'casa') { G.renderSet(ctx, CASA, t, u, { ...q, casa: statoCasa(t, q) }); return; }
    // la sala
    metti(t, q); oggettiAlTempo(t, q);
    { const n = q.riempi || (q.senza && q.cam ? piuVicino(q) : null); RIEMPI.intensity = n && LUCE[n] && t < EV.spensero ? 0.22 : 0; if (n && LUCE[n]) RIEMPI.position.set(...LUCE[n]); }
    if (q.segui) { const h = testaDi(q.segui), kk = q.seguiFino ? 1 - sm(q.seguiFino, q.seguiFino + 0.25, q.k) : 1; q.look = mix(q.look, [h[0], h[1] - (q.occhi ? 0.0 : 0.03), h[2]], kk); }
    if (SALA.stato && statoSala(t).tv > 0) { const c = SALA.tela.getContext('2d'); schermoTv(c, t, 0, 0, SALA.tela.width, SALA.tela.height); }
    G.renderSet(ctx, SALA, t, u, { ...q, sala: statoSala(t) });
  },
  post(ctx, u, t) {
    const q = inquadratura(t);
    const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.28, W / 2, H * 0.52, H * 0.78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const f = Math.floor(t * 30); ctx.save(); ctx.globalAlpha = 0.05;
    for (let i = 0; i < 900; i++) { ctx.fillStyle = M.hash01(i + f * 31, 5) > 0.5 ? '#fff' : '#000'; ctx.fillRect(M.hash01(i + f * 17, 8) * W, M.hash01(i + f * 19, 9) * H, 2, 2); }
    ctx.restore();
    if (q.carte || (t >= EV.mani && t < EV.commento + 0.2)) carte(ctx, t);
    sottotitoli(ctx, t); firma(ctx);
  },
});

// ------------------------------------------------------------------ gli oggetti: stetoscopio, cartella, taccuino e penna, orologio, occhiali caduti, biglietto
let RIEMPI = null;
function piuVicino(q) { let b = null, d = 0.95; for (const n of NOMI) { if (n === 'leon') continue; const h = testaDi(n), x = Math.hypot(h[0] - q.look[0], h[1] - q.look[1], h[2] - q.look[2]); if (x < d) { d = x; b = n; } } return b; }
function oggetti() {
  const S = SALA.scene;
  RIEMPI = new THREE.PointLight(0xFFB070, 0, 1.6, 2); S.add(RIEMPI);
  const gomma = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.45 }), acciaio = new THREE.MeshStandardMaterial({ color: 0xC8CCD2, roughness: 0.2, metalness: 1, envMapIntensity: 1 });
  // lo stetoscopio che esce dal taschino di Victor: il tubo che fa una curva e la campana d'acciaio
  { const g = new THREE.Group(); const c = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.01, 0.05, 0.01), V(0.03, 0.07, 0.02), V(0.055, 0.045, 0.025), V(0.05, -0.02, 0.03)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.0045, 10, false), gomma));
    const camp = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.018, 0], [0.02, 0.004], [0.016, 0.012], [0.005, 0.016], [0.004, 0.03], [0, 0.03]].map(([x, y]) => new THREE.Vector2(x, y)), 32), acciaio);
    camp.position.set(0.05, -0.05, 0.03); g.add(camp); g.traverse((o) => { o.castShadow = true; }); OGG.steto = g; S.add(g);
    const J1 = P.victor.J.spina1, sup = P.victor.davantiA(J1.x + 0.085, J1.y + 0.01) || [J1.x + 0.085, J1.y + 0.01, J1.z + 0.15]; OGG.tasca = [sup[0] - J1.x, sup[1] - J1.y, sup[2] + 0.004 - J1.z]; }
  // la cartella di pelle di Elena (sul tavolo, sotto le sue mani)
  { const pelle = new THREE.MeshPhysicalMaterial({ color: 0x3A2214, roughness: 0.5, clearcoat: 0.3, sheen: 0.3, envMapIntensity: 0.5 });
    const sh_ = new THREE.Shape(); const rr = 0.015, w_ = 0.36, d_ = 0.26; sh_.moveTo(-w_ / 2 + rr, -d_ / 2); sh_.lineTo(w_ / 2 - rr, -d_ / 2); sh_.quadraticCurveTo(w_ / 2, -d_ / 2, w_ / 2, -d_ / 2 + rr); sh_.lineTo(w_ / 2, d_ / 2 - rr); sh_.quadraticCurveTo(w_ / 2, d_ / 2, w_ / 2 - rr, d_ / 2); sh_.lineTo(-w_ / 2 + rr, d_ / 2); sh_.quadraticCurveTo(-w_ / 2, d_ / 2, -w_ / 2, d_ / 2 - rr); sh_.lineTo(-w_ / 2, -d_ / 2 + rr); sh_.quadraticCurveTo(-w_ / 2, -d_ / 2, -w_ / 2 + rr, -d_ / 2);
    const g = new THREE.Mesh(new THREE.ExtrudeGeometry(sh_, { depth: 0.022, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 3 }), pelle); g.rotation.x = -Math.PI / 2; g.position.set(0.47, T + 0.006, 0.95); g.rotation.z = Math.PI / 2 + 0.05; g.castShadow = true; g.receiveShadow = true; S.add(g);
    const fibbia = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.02), new THREE.MeshStandardMaterial({ color: 0xC9A24A, metalness: 1, roughness: 0.3 })); fibbia.position.set(0.33, T + 0.034, 0.95); S.add(fibbia); OGG.cartella = g; }
  // il taccuino aperto di Nora con la penna
  { const p = carta(600, 420, { seed: 91 }); p.c.strokeStyle = 'rgba(80,110,160,0.35)'; p.c.lineWidth = 2; for (let y = 60; y < 420; y += 34) { p.c.beginPath(); p.c.moveTo(20, y); p.c.lineTo(580, y); p.c.stroke(); }
    p.c.fillStyle = 'rgba(20,24,60,0.85)'; p.c.font = '34px Mano'; ['Villa Cassani - 21:00', 'sette invitati, OTTO piatti', 'Clara?'].forEach((s, i) => p.c.fillText(s, 340 + 10, 52 + 34 * (i + 1)));
    p.c.fillStyle = 'rgba(0,0,0,0.25)'; p.c.fillRect(298, 0, 4, 420);
    const tx = new THREE.CanvasTexture(p.cv); tx.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.008, 0.148), [0, 0, 0, 0, 0, 0].map((_, i) => i === 2 ? new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8 }) : new THREE.MeshStandardMaterial({ color: 0x2A2A30, roughness: 0.6 })));
    g.position.set(0.47, T + 0.006, -0.06); g.rotation.y = -Math.PI / 2 + 0.12; g.castShadow = true; g.receiveShadow = true; S.add(g); OGG.taccuino = g;
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.135, 12), new THREE.MeshStandardMaterial({ color: 0x101830, roughness: 0.3, metalness: 0.4 })); pen.castShadow = true; S.add(pen); OGG.penna = pen; }
  // l'orologio d'oro di Adrian (al polso sinistro)
  { const g = new THREE.Group(), Y = 0.024; const cassa = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.008, 32), MAT_ORO()); cassa.position.y = Y; g.add(cassa);
    const qu = new THREE.Mesh(new THREE.CircleGeometry(0.0145, 32), new THREE.MeshStandardMaterial({ color: 0xF4EEDC, roughness: 0.3 })); qu.rotation.x = -Math.PI / 2; qu.position.y = Y + 0.0042; g.add(qu);
    for (const a of [0.3, 2.1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.0011, 0.0006, 0.01), new THREE.MeshStandardMaterial({ color: 0x111111 })); l.position.set(Math.sin(a) * 0.0036, Y + 0.0047, -Math.cos(a) * 0.0036); l.rotation.y = -a; g.add(l); }
    const cint = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0042, 8, 40), MAT_ORO()); cint.scale.set(1, 0.8, 1); cint.rotation.y = Math.PI / 2; g.add(cint);
    g.traverse((o) => { o.castShadow = true; }); S.add(g); OGG.orologio = g; }
  // gli occhiali di Victor caduti accanto al piatto (una copia di quelli che porta)
  OCCH = P.victor.busto.userData.occhiali.clone(); OCCH.visible = false; S.add(OCCH);
  // il biglietto piegato (nel pugno di Victor, poi nella mano di Leon) e aperto (sotto il tavolo)
  const bc = carta(900, 600, { base: [236, 232, 220], seed: 77 }); bc.c.fillStyle = 'rgba(20,20,40,0.9)'; bc.c.font = '700 96px Mano'; bc.c.save(); bc.c.translate(70, 170); bc.c.rotate(-0.03); bc.c.fillText('Leon,', 0, 0); bc.c.fillText('tua sorella', 20, 150); bc.c.fillText('non è morta.', 40, 300); bc.c.restore();
  bc.c.strokeStyle = 'rgba(120,110,90,0.25)'; bc.c.lineWidth = 3; bc.c.beginPath(); bc.c.moveTo(450, 0); bc.c.lineTo(450, 600); bc.c.stroke();
  const btx = new THREE.CanvasTexture(bc.cv); btx.colorSpace = THREE.SRGBColorSpace; btx.anisotropy = 8;
  PUGNO_NOTA = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.004, 0.1), new THREE.MeshStandardMaterial({ color: 0xEDE7D8, roughness: 0.85 })); PUGNO_NOTA.castShadow = true; S.add(PUGNO_NOTA);
  BIGL = new THREE.Group(); S.add(BIGL);
  const m1 = new THREE.MeshStandardMaterial({ map: btx, roughness: 0.85, side: THREE.DoubleSide });
  const meta = (u0) => { const g = new THREE.PlaneGeometry(0.11, 0.147); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * 0.5); return new THREE.Mesh(g, m1); };
  const sx = meta(0); sx.position.x = -0.055; const dxg = new THREE.Group(); const dx = meta(0.5); dx.position.x = 0.055; dxg.add(dx); BIGL.add(sx, dxg); BIGL.userData.ala = dxg;
  // le mani di Leon (quelle modellate, con le maniche) per le sue inquadrature: il gelo, il biglietto
  MANI_L = [1, -1].map((l) => { const m = manoLeon({ posa: 'piatta', lato: l }); m.visible = false; S.add(m); return m; });
}
const MAT_ORO = () => new THREE.MeshStandardMaterial({ color: 0xD4A94A, roughness: 0.25, metalness: 1, envMapIntensity: 1.1 });
function oggettiAlTempo(t, q) {
  const e = EV, vic = P.victor, ad = P.adrian, no = P.nora;
  // lo stetoscopio nel taschino (sul petto, a sinistra) e l'orologio di Adrian: seguono le ossa
  attacca(OGG.steto, vic, 'spina1', OGG.tasca, [0.25, 0, 0]);
  attaccaPolso(OGG.orologio, ad, 'S');
  // la penna nella mano destra di Nora
  OGG.penna.visible = t >= e.victor - 0.4 && t < e.tv; const md = no.MANI.D.m; md.updateMatrixWorld(true); OGG.penna.position.set(-0.02, -0.15, -0.03).applyMatrix4(md.matrixWorld);
  const dirP = V(0.35, -0.55, -0.6).normalize().transformDirection(md.matrixWorld); OGG.penna.quaternion.setFromUnitVectors(V(0, 1, 0), dirP.negate());
  // gli occhiali caduti
  if (OCCH.visible) { OCCH.position.set(-0.5, T + 0.012, 0.72); OCCH.rotation.set(-Math.PI / 2 + 0.15, 0, 0.6); }
  // il biglietto: nel pugno di Victor finché Leon non lo prende, poi aperto sotto il tavolo
  const preso = e.raccolsi + 0.75;
  const pugno = vic.MANI.D.m; pugno.updateMatrixWorld(true);
  const inPugno = V(-0.018, -0.078, -0.012).applyMatrix4(pugno.matrixWorld);
  PUGNO_NOTA.visible = t >= e.tornarono && t < e.sul - 0.25;
  const mL = MANI_L[0]; mL.visible = false; MANI_L[1].visible = false; BIGL.visible = false;
  if (PUGNO_NOTA.visible) {
    if (t < preso) { PUGNO_NOTA.position.copy(inPugno); PUGNO_NOTA.quaternion.setFromRotationMatrix(pugno.matrixWorld); }
    // la mano di Leon entra da destra in basso, prende il biglietto e lo porta via
    if (t >= e.raccolsi - 0.2 && t < e.sul - 0.25) {
      mL.visible = true; const k = sm(e.raccolsi, preso, t), via = sm(preso + 0.1, preso + 0.7, t);
      const presa = inPugno.clone().add(V(0.03, 0.025, 0.06)), da = presa.clone().add(V(0.13, 0.08, 0.13));
      const p = da.clone().lerp(presa, k).lerp(da.clone().add(V(0.06, 0.04, 0.12)), via); mL.position.copy(p).add(V(0.11, 0.0, 0.11)); mL.rotation.set(0.25, 0.78, 0);
      mL.userData.posa(k > 0.85 ? 'pugno' : 'rilassata');
      if (t >= preso) { PUGNO_NOTA.position.copy(p).add(V(-0.01, -0.01, -0.03)); PUGNO_NOTA.rotation.set(0, 0.35, 0); }
    }
  }
  // il biglietto aperto, tenuto sotto il bordo del tavolo
  if (q.biglietto) {
    BIGL.visible = true; const k = sm(e.sul + 0.1, e.sul + 0.6, t); BIGL.position.set(0, 0.7, 1.75); BIGL.rotation.set(-1.17, 0, 0.03); BIGL.userData.ala.rotation.y = -Math.PI * (1 - k) * 0.97;
    BIGL.updateMatrixWorld(true); const R = V(1, 0, 0).transformDirection(BIGL.matrixWorld), U = V(0, 1, 0).transformDirection(BIGL.matrixWorld), Nn = V(0, 0, 1).transformDirection(BIGL.matrixWorld);
    const base = new THREE.Matrix4().makeBasis(R, Nn, U.clone().negate());
    for (const [i, s_] of [[0, 1], [1, -1]]) { const m = MANI_L[i]; m.visible = true; m.quaternion.setFromRotationMatrix(base); m.position.copy(BIGL.position).addScaledVector(R, s_ * (s_ > 0 ? 0.125 : 0.125 * (0.45 + 0.55 * k))).addScaledVector(U, -0.17).addScaledVector(Nn, 0.012); m.userData.posa('tessera'); }
  }
  // le mani di Leon che stringono la tovaglia («il sangue gelarmi»)
  if (q.maniLeon === 'gelo') {
    const k = sm(e.gelarmi - 0.3, e.gelarmi + 0.2, t);
    for (const [i, s] of [[0, 1], [1, -1]]) { const m = MANI_L[i]; m.visible = true; m.position.set(s * 0.13, T + 0.03, 1.42); m.rotation.set(0, s * 0.25, 0); m.userData.posa(k > 0.5 ? 'pugno' : 'piatta'); }
  }
}
// un oggetto attaccato a un osso: p = posizione nel riposo (rispetto al giunto dell'osso), r = rotazione
function attacca(ob, pc, osso, p, r) { const j = pc.J[osso], Wb = pc.W[pc.K[osso]]; ob.matrixAutoUpdate = false; ob.matrix.copy(Wb).multiply(new THREE.Matrix4().makeTranslation(j.x + p[0], j.y + p[1], j.z + p[2])).multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...r))); ob.matrixWorldNeedsUpdate = true; }
function attaccaPolso(ob, pc, s) {
  const j = pc.J['mano' + s], av = pc.J['ava2' + s], Wb = pc.W[pc.K['ava2' + s]], dir = j.clone().sub(av).normalize(), pos = j.clone().addScaledVector(dir, 0.012);
  // il quadrante in su: x lungo l'avambraccio, y verso il dorso (nel riposo il dorso del polso guarda fuori, lontano dal corpo)
  const fuori = V(Math.sign(j.x) || 1, 0, 0), y = fuori.clone().sub(dir.clone().multiplyScalar(fuori.dot(dir))).normalize(), z = dir.clone().cross(y);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, y, z)); ob.matrixAutoUpdate = false; ob.matrix.copy(Wb).multiply(new THREE.Matrix4().compose(pos, q, V(1, 1, 1))); ob.matrixWorldNeedsUpdate = true;
}

// ------------------------------------------------------------------ casa di Leon: la busta, la mano, il cartoncino, le chiavi
function statoCasa(t, q) {
  const e = EV, c = {};
  const ent = sm(e.busta - 0.35, e.busta + 0.35, t);
  if (t < e.mittente - 0.25) c.busta = [0.05, 0.002, lerp(-0.2, 0.31, ent), 0, 0.22 * ent, 0];
  else { const k = sm(e.mittente - 0.1, e.mittente + 0.35, t); c.busta = [0.05, 0.002 + 0.03 * Math.sin(Math.PI * k), 0.31, 0, 0.22, Math.PI * k]; c.mano = [0.05 + 0.13 - 0.06 * k, 0.03 + 0.04 * Math.sin(Math.PI * k), 0.44, 0.2, 0.5, 0.4 * k]; c.manoPosa = 'presa'; }
  if (t >= e.interno - 0.3) { c.busta = [-0.86, 0.879, 1.36, 0, Math.PI / 2 + 0.3, Math.PI]; c.cartoncino = [-0.92, 0.882, 1.28, 0, Math.PI / 2 + 0.06, 0]; c.mano = null; }
  if (t >= e.dovevo - 0.1 && t < e.verita) { const k = sm(e.dovevo + 0.1, e.dovevo + 0.6, t), su = sm(e.dovevo + 0.7, e.verita - 0.3, t);
    c.mano = [-0.84 + 0.2 * (1 - k), 0.93 + 0.14 * su, 1.2, -0.35, Math.PI / 2 + 0.15, 0]; c.manoPosa = k > 0.9 ? 'pugno' : 'rilassata'; c.chiaviInMano = k > 0.9; }
  return c;
}
// ------------------------------------------------------------------ le immagini fatte all'avvio
async function fotoFornace() {
  const F = fotoSet(), pos = [-1.95, -1.3, -0.65, 0, 0.65, 1.3, 1.95], chi = ['adrian', 'victor', 'nora', 'leon', 'elena', 'sophie', 'marcus'];
  // in piedi in fila davanti alla fornace: li si sposta nella scena della foto, poi si rimettono a tavola
  const volti = {};
  chi.forEach((n, i) => { const pc = P[n], C = pc.C, st = C.giunti.bacino[1] - C.suolo, x = pos[i], gi = (i - 3) * -4;
    const L = (a, b, c) => [x + a * Math.cos(gi * D2R) + c * Math.sin(gi * D2R), b, c * Math.cos(gi * D2R) - a * Math.sin(gi * D2R)];
    pc.posa({ dove: L(0, st - 0.01, 0), giro: gi, schiena: [-2, 0, 0], collo: [-2, (i % 2 ? 6 : -6), (i % 3) - 1], sguardo: [0, 1.5, 6.5],
      gamba: { S: { caviglia: L(0.12, 0.09, 0.02), polo: [0, 0, 1], punta: [0.15, -0.2, 1] }, D: { caviglia: L(-0.12, 0.09, 0.02), polo: [0, 0, 1], punta: [-0.15, -0.2, 1] } },
      braccio: { S: { polso: L(0.24, st - 0.08, 0.06), dita: [0.05, -1, 0.1], palmo: [-1, 0, 0], polo: [0.3, 0, -1] }, D: { polso: L(-0.24, st - 0.08, 0.06), dita: [-0.05, -1, 0.1], palmo: [1, 0, 0], polo: [-0.3, 0, -1] } } });
    F.scene.add(pc.g); pc.g.visible = true; });
  const img = scatta(F, { cam: [0, 1.45, 6.5], look: [0, 1.35, 0], fov: 66 }, 4 / 3);
  // dove stanno i volti nella foto (proiezione delle teste)
  F.camera.updateMatrixWorld(true);
  for (const n of chi) { const p = V(...testaDi(n)).project(F.camera), b = Math.round(img.width * 0.035), yC = p.y * (M.H / 2) / (img.height / 2);
    volti[n] = [(b + (p.x * 0.5 + 0.5) * img.width) / (img.width + 2 * b), (b + (0.5 - yC * 0.5) * img.height) / (img.height + 2 * b)]; }
  IMG.volti = volti;
  for (const n of NOMI) { SALA.scene.add(P[n].g); fatte[n] = null; }
  return stampa(img);
}
async function cartaA() {                                            // la carta A: il biglietto alzato sopra la tavola, gli altri che lo guardano
  for (const [n, i] of ORDINE) { if (n === 'leon') { P[n].g.visible = false; continue; } const o = seduto(i, { collo: guardaDa(i, [0.05, 1.45, 1.5]), sguardo: [0.05, 1.45, 1.5] }); siedi(P[n], o); fatte[n] = null; }
  const m = MANI_L[0]; m.visible = true; m.position.set(0.08, 1.32, 1.62); m.rotation.set(1.2, 0.2, 0); m.userData.posa('tessera');
  BIGL.visible = true; BIGL.position.set(0.05, 1.42, 1.52); BIGL.rotation.set(0.25, 0, 0.05); BIGL.userData.ala.rotation.y = 0;
  const img = scatta(SALA, { cam: [0.0, 1.3, 2.05], look: [0.04, 1.38, 1.1], fov: 46, sala: { spente: -1, applique: 0.6 } }, 1.25);
  m.visible = false; BIGL.visible = false; P.leon.g.visible = true; return img;
}
async function cartaB() {                                            // la carta B: Sophie nel corridoio buio con la candela
  const CO = corridoioSet(), so = P.sophie, C = so.C, st = C.giunti.bacino[1] - C.suolo, z = -2.2;
  so.posa({ dove: [0, st - 0.02, z], giro: 180 + 160, schiena: [3, 0, 0], collo: [4, -30, 0], sguardo: [0, 1.5, 1.6],
    gamba: { S: { caviglia: [0.1, 0.09, z], polo: [0, 0, 1] }, D: { caviglia: [-0.12, 0.09, z + 0.1], polo: [0, 0, 1] } },
    braccio: { D: { polso: [-0.05, 1.12, z + 0.25], dita: [0.3, 0, 1], palmo: [0, 1, 0] }, S: { polso: [0.22, st - 0.1, z], dita: [0, -1, 0], palmo: [-1, 0, 0] } } });
  CO.scene.add(so.g);
  const cand = candela(CO.scene, V(-0.02, 1.15, z + 0.33), { alta: 0.11, r: 0.012, luce: 0.35, seed: 5 });
  const piattino = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.01, 24), new THREE.MeshStandardMaterial({ color: 0xB8893A, metalness: 1, roughness: 0.35 })); piattino.position.set(-0.02, 1.145, z + 0.33); CO.scene.add(piattino);
  const img = scatta({ ...CO, update(t, u, o) { CO.update(t, u, o); cand.update(t, CO.camera); } }, { cam: [0.05, 1.45, -0.2], look: [0, 1.3, z], fov: 34 }, 1.25);
  SALA.scene.add(so.g); fatte.sophie = null; return img;
}
