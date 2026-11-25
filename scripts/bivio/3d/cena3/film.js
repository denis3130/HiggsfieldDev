// Il Bivio — «La nonna»: la scena della cena coi personaggi della versione 3 (stile vettoriale 3D).
// «A cena mette in tavola tre piatti. "Chi deve venire?", le chiedi. Lei sorride: "Nessuno, se rispetti le regole."»
// Funzione pura del tempo: inquadrature e gesti agganciati alle parole (assets/parole.json), bocche dal volume della voce
// (assets/bocca.json) con la forma della vocale che si sta dicendo, battiti di ciglia a tempi fissi.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE } from './sets/stile.js';
import { cucina3Set } from './sets/cucina3.js';
import { GIUNTE } from './sets/cast.js';
import { battito } from './sets/pupazzi.js';

const { W, H, E, prog, lerp, clamp, font } = M;
let S = null, WORDS = [], CHUNKS = [], END = 8.4, ROWS = [], BOCCA = [];
const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z']/g, '');
function at(word, n = 0, which = 0) { const h = WORDS.filter((w) => norm(w[2]) === norm(word)); const w = h[Math.min(n, h.length - 1)]; return w ? w[which] : 0; }
function chunks(words, mx = 6) { const out = []; let cur = []; words.forEach((w, i) => { cur.push(w); if (/[.,:;?!…»]$/.test(w[2]) || cur.length >= mx || i === words.length - 1) { out.push(cur); cur = []; } }); return out; }
const v3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function pose(t, t0, t1, a, b, ease = E.inOutSine) { const k = ease(clamp((t - t0) / Math.max(0.001, t1 - t0))); return { cam: v3(a.cam, b.cam, k), look: v3(a.look, b.look, k), fov: lerp(a.fov || 38, b.fov || 38, k), roll: lerp(a.roll || 0, b.roll || 0, k) }; }
// bocca: quanto è aperta (volume della voce) e che forma ha (la vocale della parola in corso)
const VOC = { a: [0.25, 0], e: [0.75, 0], i: [0.9, 0], o: [-0.2, 1], u: [-0.3, 0.9] };
function parla(chi, t) {
  for (const b of BOCCA) { if (b.who !== chi) continue; const i = (t - b.t0) * b.fps; if (i < 0 || i >= b.vals.length - 1) continue;
    const k = Math.floor(i), open = lerp(b.vals[k], b.vals[k + 1], i - k);
    const w = WORDS.find((x) => t >= x[0] - 0.03 && t <= x[1] + 0.05); let wide = 0.2, round = 0;
    if (w) { const vs = [...norm(w[2])].filter((ch) => VOC[ch]); if (vs.length) { const f = clamp((t - w[0]) / Math.max(0.05, w[1] - w[0])); [wide, round] = VOC[vs[Math.min(vs.length - 1, Math.floor(f * vs.length))]]; } }
    return { mouth: open, wide, round: round * Math.min(1, open * 2) }; }
  return { mouth: 0, wide: 0, round: 0 };
}
const mixSpec = (A, B, k) => { const o = { mano: k < 0.5 ? A.mano : B.mano }; for (const n of ['mondo', 'gomito', 'dita', 'dorso']) o[n] = v3(A[n], B[n], k); return o; };

const NP = [0, 0, -1.2], TP = [-0.95, 0, -0.5];
function shot(t) {
  const r1 = ROWS[0] || [0.5, 2.3], r2 = ROWS[1] || [2.5, 4.3], r3 = ROWS[2] || [4.5, 7];
  const T = { tre: at('tre'), chiedi: at('chiedi'), sorride: at('sorride'), regole: at('regole', 0, 1) };
  const cut1 = T.tre - 0.08, cut2 = r1[1] + 0.3, cut3 = r2[1] + 0.3;
  const idleN = { breathe: Math.sin(t * 2.0), blink: battito(t, 3), headYaw: 0.03 * M.noise1(t * 0.4, 5), headRoll: 0.02 * M.noise1(t * 0.3, 6) };
  const idleT = { breathe: Math.sin(t * 2.4 + 1), blink: battito(t + 0.8, 8), headRoll: 0.02 * M.noise1(t * 0.35, 9) };
  // tu: seduto, mani appoggiate sulla tavola
  const tu = { pos: TP, yaw: Math.PI / 2, sit: 1, ...idleT,
    armL: { a: [-0.15, 0.165, 0.4], gomito: [-1, -0.7, -0.2], dorso: [0, 1, 0.1], dita: [0.25, -0.1, 1], mano: 'rilassata' }, armR: { a: [0.15, 0.165, 0.4], gomito: [1, -0.7, -0.2], dorso: [0, 1, 0.1], dita: [-0.25, -0.1, 1], mano: 'rilassata' } };
  // la nonna posa il suo piatto: lo tiene ai lati con due mani, poi le ritira e le giunge
  const casa = [0, 0.777, -0.85], k = E.inOutCubic(prog(t, 0.3, cut1 - 0.25)), pp = v3([0, 1.0, -0.98], casa, k);
  const presa = (s) => ({ mondo: [pp[0] + s * 0.133, pp[1] + 0.014, pp[2] - 0.02], gomito: [s, -0.5, -0.4], dita: [-s * 0.1, -0.06, 1], dorso: [s, 0.2, 0], mano: { dita: [0.2, 0.24, 0.28, 0.32], pollice: 0.4, apri: 0.1 } });
  const riposo = (s) => ({ mondo: [s * 0.03, 0.925 + (s < 0 ? 0.016 : 0), -1.0 + (s < 0 ? 0.014 : 0)], gomito: [s, -0.5, -0.2], dita: [-s * 0.92, -0.35, 0.12], dorso: [s * 0.1, 0.25, 1], mano: 'presa' });
  const kr = E.inOutSine(prog(t, cut1 - 0.1, cut1 + 0.55));
  const mani = t < cut1 + 0.6 ? { armR: mixSpec(presa(1), riposo(1), kr), armL: mixSpec(presa(-1), riposo(-1), kr) } : { armR: GIUNTE.R, armL: GIUNTE.L };
  const nonna = { pos: NP, ...idleN, ...mani, lean: 0.17 * k * (1 - kr) };
  // 1a: le mani posano il piatto (dettaglio)
  if (t < cut1) return { ...pose(t, 0, cut1, { cam: [0.34, 1.34, -0.2], look: [0, 0.86, -0.9], fov: 40 }, { cam: [0.26, 1.27, -0.27], look: [0, 0.82, -0.88], fov: 38 }),
    piatto: pp, nonna: { ...nonna, smile: 0.5, gazeY: -0.6, headPitch: 0.25 }, tu: { ...tu, headYaw: 0.5, gazeX: 0.4 } };
  // 1b: tutta la tavola: tre piatti, due persone, una sedia vuota in primo piano
  if (t < cut2) return { ...pose(t, cut1, cut2 + 0.4, { cam: [2.05, 1.78, 1.0], look: [-0.2, 1.0, -0.85], fov: 60 }, { cam: [1.9, 1.72, 0.86], look: [-0.2, 1.0, -0.85], fov: 58 }),
    nonna: { ...nonna, smile: 0.6, headYaw: -0.3 + idleN.headYaw, gazeX: -0.4 }, tu: { ...tu, headYaw: 0.05, gazeX: 0.1, browUp: 0.5 } };
  // 2: «Chi deve venire?» (primo piano su di te: guardi la sedia vuota, poi lei)
  if (t < cut3) { const g = E.inOutSine(prog(t, T.chiedi - 0.35, T.chiedi + 0.1));
    return { ...pose(t, cut2, cut3, { cam: [-0.14, 1.27, 0.26], look: [-0.95, 1.225, -0.5], fov: 30 }, { cam: [-0.22, 1.26, 0.17], look: [-0.95, 1.225, -0.5], fov: 29 }),
      nonna: { ...nonna, smile: 0.6 }, tu: { ...tu, ...parla('tu', t), browUp: 0.7, smile: 0.3 * (1 - g), headYaw: -0.3 + 0.25 * g, gazeX: 0.1 + 0.6 * g } }; }
  // 3: lei sorride: «Nessuno, se rispetti le regole.» (la bocca sorride, gli occhi no; alla fine ti fissa)
  const sm = E.inOutSine(prog(t, T.sorride - 0.25, T.sorride + 0.45)), fine = E.inOutSine(prog(t, T.regole + 0.1, T.regole + 0.9));
  return { ...pose(t, cut3, END, { cam: [0.16, 1.43, -0.12], look: [0, 1.385, -1.2], fov: 31 }, { cam: [0.1, 1.42, -0.3], look: [0, 1.39, -1.2], fov: 30 }),
    nonna: { ...nonna, ...parla('nonna', t), smile: 0.95 * sm, open: 0.74 + 0.22 * fine, headYaw: -0.28 * (1 - 0.6 * fine) + idleN.headYaw, gazeX: -0.45 * (1 - fine), headRoll: 0.09 * fine, grin: 0 },
    tu };
}

// ------------------------------------------------------------------ sottotitoli come il reel (in alto, parola per parola)
function subtitles(ctx, t) {
  let ci = -1;
  for (let i = 0; i < CHUNKS.length; i++) if (t >= CHUNKS[i][0][0] - 0.05) ci = i;
  if (ci < 0) return;
  const ch = CHUNKS[ci], next = CHUNKS[ci + 1];
  if (t > ch[ch.length - 1][1] + 0.6 && (!next || t < next[0][0] - 0.05)) return;
  const size = 74, fB = font(size, 800, 'Display'), fR = font(size, 500, 'UI');
  ctx.save(); ctx.textBaseline = 'alphabetic';
  const veil = ctx.createLinearGradient(0, 0, 0, H * 0.3); veil.addColorStop(0, 'rgba(0,0,0,0.5)'); veil.addColorStop(0.6, 'rgba(0,0,0,0.28)'); veil.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = veil; ctx.fillRect(0, 0, W, H * 0.3);
  // misura e va a capo (max 82% della larghezza)
  const items = ch.map((w) => { ctx.font = fB; return { w, width: ctx.measureText(w[2]).width }; });
  const space = size * 0.28, maxW = W * 0.82, lines = [[]]; let lw = 0;
  items.forEach((it) => { if (lw + it.width > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(it); lw += it.width + space; });
  const y0 = H * 0.145;
  lines.forEach((line, li) => {
    const tot = line.reduce((a, it) => a + it.width, 0) + space * (line.length - 1);
    let x = (W - tot) / 2; const y = y0 + li * size * 1.12;
    line.forEach((it) => {
      const [s0, s1, txt] = it.w, said = t >= s1, now = t >= s0 && t < s1 + 0.04;
      ctx.font = now ? fB : fR;
      ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineJoin = 'round';
      ctx.globalAlpha = now || said ? 1 : 0.28;
      ctx.strokeText(txt, x, y);
      ctx.fillStyle = now ? '#ffffff' : said ? '#c9c9c9' : '#ffffff';
      ctx.fillText(txt, x, y);
      x += it.width + space;
    });
  });
  ctx.restore();
}


M.film({
  fonts: [font(74, 800, 'Display'), font(74, 500, 'UI')],
  samples: 1,
  async init() {
    try { const p = await fetch('assets/parole.json').then((r) => r.json()); WORDS = p.flat(); ROWS = p.map((row) => [row[0][0], row[row.length - 1][1]]); } catch { WORDS = []; }
    try { BOCCA = await fetch('assets/bocca.json').then((r) => r.json()); } catch { BOCCA = []; }
    CHUNKS = chunks(WORDS); END = Number(M.CFG.duration || 8.4);
    await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; S = cucina3Set();
  },
  draw(ctx, u, t) {
    G.renderSet(ctx, S, t, u, shot(t));
    subtitles(ctx, t);
    const a = Math.max(1 - prog(t, 0, 0.45), prog(t, END - 0.6, END));
    if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
  },
  post(ctx) { const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.32, W / 2, H * 0.5, H * 0.82); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.38)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); },
});
