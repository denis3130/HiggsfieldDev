// Il Bivio — «La nonna»: prova della scena della cena coi personaggi v2.
// «A cena mette in tavola tre piatti. "Chi deve venire?", le chiedi. Lei sorride: "Nessuno, se rispetti le regole."»
// Funzione pura del tempo; inquadrature e gesti agganciati alle parole (assets/parole.json); bocche dal volume (assets/bocca.json).
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { cucinaSet } from './sets/cucina.js';

const { W, H, E, prog, lerp, clamp, font } = M;
let S = null, WORDS = [], CHUNKS = [], END = 12, ROWS = [], BOCCA = [];
const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z']/g, '');
function at(word, n = 0, which = 0) { const h = WORDS.filter((w) => norm(w[2]) === norm(word)); const w = h[Math.min(n, h.length - 1)]; return w ? w[which] : 0; }
function chunks(words, mx = 6) { const out = []; let cur = []; words.forEach((w, i) => { cur.push(w); if (/[.,:;?!…»]$/.test(w[2]) || cur.length >= mx || i === words.length - 1) { out.push(cur); cur = []; } }); return out; }
const v3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function pose(t, t0, t1, a, b, ease = E.inOutCubic) { const k = ease(clamp((t - t0) / Math.max(0.001, t1 - t0))); return { cam: v3(a.cam, b.cam, k), look: v3(a.look, b.look, k), fov: lerp(a.fov || 38, b.fov || 38, k), roll: lerp(a.roll || 0, b.roll || 0, k) }; }
const blinkAt = (t, times) => times.reduce((m, tb) => Math.max(m, M.bump(t, tb, 0.08)), 0);
function mouth(who, t) { for (const b of BOCCA) { if (b.who !== who) continue; const i = (t - b.t0) * b.fps; if (i >= 0 && i < b.vals.length - 1) { const k = Math.floor(i); return lerp(b.vals[k], b.vals[k + 1], i - k); } } return 0; }

// dove stanno: la nonna in piedi all'angolo in fondo a destra, rivolta al tavolo; tu seduto a sinistra
const NPOS = [0.62, 0, -1.22], NYAW = -0.62, TPOS = [-0.95, 0, -0.5], TYAW = Math.PI / 2;
function shot(t) {
  const r1 = ROWS[0] || [0.3, 2.5], r2 = ROWS[1] || [2.7, 4.5], r3 = ROWS[2] || [4.7, 8];
  const T = { tre: at('tre'), piatti: at('piatti', 0, 1), sorride: at('sorride'), regole: at('regole') };
  const breatheN = Math.sin(t * 2.0), breatheT = Math.sin(t * 2.4 + 1);
  const blinksN = [r1[0] + 1.0, r2[0] + 0.3, r3[1] + 0.5], blinksT = [r1[0] + 0.6, r2[1] + 0.2];
  const nonnaBase = { pos: NPOS, yaw: NYAW, breathe: breatheN, blink: blinkAt(t, blinksN) };
  const tuBase = { pos: TPOS, yaw: TYAW, sit: 1, breathe: breatheT, blink: blinkAt(t, blinksT),
    armL: { fwd: -0.75, out: 0.08, bend: 0.85, wx: 0.9, hand: { curl: 0.35 } }, armR: { fwd: -0.75, out: 0.08, bend: 0.85, wx: 0.9, hand: { curl: 0.35 } } };
  const cut1 = T.tre - 0.05, cut2 = r1[1] + 0.25, cut3 = r2[1] + 0.25;
  // 1a: campo largo: lei porta il terzo piatto e lo posa davanti alla sedia vuota; tu la guardi
  if (t < cut1) {
    const reach = E.inOutSine(prog(t, r1[0], cut1 - 0.2));
    return { ...pose(t, 0, cut1, { cam: [-1.95, 1.6, 0.75], look: [0.35, 1.0, -0.95], fov: 44 }, { cam: [-1.75, 1.56, 0.55], look: [0.35, 1.0, -0.95], fov: 43 }, E.inOutSine),
      piatto: prog(t, cut1 - 0.55, cut1 - 0.1),
      nonna: { ...nonnaBase, lean: 0.12 * reach, armR: { fwd: -0.5 - 0.6 * reach, out: -0.15, bend: 0.9 - 0.3 * reach, wx: -0.3, hand: { curl: 0.45 } }, gazeY: -0.3, headPitch: 0.15 * reach, smile: 0.3 },
      tu: { ...tuBase, headYaw: -0.35, gazeX: -0.2 } };
  }
  // 1b: dall'alto: tre piatti sulla tavola
  if (t < cut2) return { ...pose(t, cut1, cut2, { cam: [1.5, 1.8, -0.3], look: [-0.3, 0.8, -0.62], fov: 40 }, { cam: [1.35, 1.72, -0.34], look: [-0.3, 0.8, -0.62], fov: 39 }, E.inOutSine),
    nonna: nonnaBase, tu: tuBase };
  // 2: «Chi deve venire?» primo piano su di te
  if (t < cut3) return { ...pose(t, cut2, cut3, { cam: [-0.28, 1.24, 0.22], look: [-0.95, 1.14, -0.5], fov: 34 }, { cam: [-0.36, 1.22, 0.12], look: [-0.95, 1.15, -0.5], fov: 33 }, E.inOutSine),
    nonna: nonnaBase, tu: { ...tuBase, mouth: mouth('tu', t), browUp: 0.8, smile: 0.35, headYaw: -0.3, gazeX: -0.25 } };
  // 3: lei sorride: «Nessuno, se rispetti le regole.» primo piano su di lei (gli occhi non sorridono)
  const sm = E.inOutSine(prog(t, T.sorride - 0.2, T.sorride + 0.4));
  return { ...pose(t, cut3, END, { cam: [-0.05, 1.5, -0.42], look: [0.6, 1.43, -1.22], fov: 34 }, { cam: [0.04, 1.5, -0.5], look: [0.6, 1.44, -1.22], fov: 33 }, E.inOutSine),
    nonna: { ...nonnaBase, smile: 0.85 * sm, mouth: mouth('nonna', t), eyesOpen: 0.62 + 0.25 * sm, headRoll: 0.12 * E.inOutSine(prog(t, T.regole - 0.3, T.regole + 0.4)), gazeY: 0.05 },
    tu: tuBase };
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
    CHUNKS = chunks(WORDS); END = Number(M.CFG.duration || 12);
    await G.initGL({ exposure: 1.05 }); S = cucinaSet();
  },
  draw(ctx, u, t) {
    G.renderSet(ctx, S, t, u, shot(t));
    subtitles(ctx, t);
    const a = Math.max(1 - prog(t, 0, 0.5), prog(t, END - 0.6, END));
    if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
  },
  post(ctx) { const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.5, H * 0.8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); },
});
