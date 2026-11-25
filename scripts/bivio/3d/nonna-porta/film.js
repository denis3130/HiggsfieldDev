// Il Bivio — «La nonna», episodio 1: prova della prima scena (arrivo sotto la tempesta, la porta che si apre, «Entra, presto»).
// Funzione pura del tempo. Inquadrature, lampi, porta, mano e battute della nonna seguono le parole della voce (assets/parole.json);
// la bocca segue il volume della voce (assets/bocca.json).
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { casaSet } from './sets/casa.js';

const { W, H, E, prog, lerp, clamp, font } = M;
let S = null, WORDS = [], CHUNKS = [], END = 14, ROWS = [], MOUTH = null;

const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z']/g, '');
function at(word, n = 0, which = 0) {
  const hits = WORDS.filter((w) => norm(w[2]) === norm(word));
  const w = hits[Math.min(n, hits.length - 1)];
  return w ? w[which] : 0;
}
function chunks(words, mx = 6) {
  const out = []; let cur = [];
  words.forEach((w, i) => { cur.push(w); if (/[.,:;?!…»]$/.test(w[2]) || cur.length >= mx || i === words.length - 1) { out.push(cur); cur = []; } });
  return out;
}
const v3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function pose(t, t0, t1, a, b, ease = E.inOutCubic) {
  const k = ease(clamp((t - t0) / Math.max(0.001, t1 - t0)));
  return { cam: v3(a.cam, b.cam, k), look: v3(a.look, b.look, k), fov: lerp(a.fov || 40, b.fov || 40, k), roll: lerp(a.roll || 0, b.roll || 0, k) };
}
const blinkAt = (t, times) => times.reduce((m, tb) => Math.max(m, M.bump(t, tb, 0.08)), 0);
function mouthAt(t) {                                    // apertura della bocca dal volume della voce (solo nelle battute della nonna)
  if (!MOUTH) return 0;
  const [t0, fps, vals] = MOUTH, i = (t - t0) * fps;
  if (i < 0 || i >= vals.length - 1) return 0;
  const k = Math.floor(i); return lerp(vals[k], vals[k + 1], i - k);
}

function shot(t) {
  const r1 = ROWS[0] || [0, 4.5], r2 = ROWS[1] || [4.6, 9], r3 = ROWS[2] || [9.2, 12];
  const T = { tempesta: at('tempesta'), apre: at('apre'), bussi: at('bussi', 0, 1), aspettando: at('aspettando'), presto: at('presto'), prima: at('prima', 1), buio: at('buio') };
  const cut1 = r1[1] + 0.2, cut2 = r2[1] + 0.2;
  const flash = M.bump(t, T.tempesta + 0.12, 0.22) + 0.55 * M.bump(t, T.tempesta + 0.5, 0.12) + 0.4 * M.bump(t, END - 1.6, 0.15);
  const base = { breathe: Math.sin(t * 2.1), pos: [0, 0, -0.5], blink: blinkAt(t, [r2[0] + 1.6, r3[0] - 0.25, r3[1] + 0.4]) };
  // 1: arrivi sotto la tempesta, camminando verso la porta (la camera ondeggia coi passi)
  if (t < cut1) {
    const p = pose(t, 0, cut1, { cam: [0.75, 1.66, 9.0], look: [0.05, 1.45, 0], fov: 42 }, { cam: [0.2, 1.62, 2.5], look: [0, 1.4, 0], fov: 40 }, E.inOutSine);
    p.cam[1] += 0.03 * Math.sin(t * 8.6); p.cam[0] += 0.02 * Math.sin(t * 4.3);
    return { ...p, flash, door: 0, nonna: base };
  }
  // 2: la porta si apre prima che tu bussi; lei è lì, ferma, che ti guarda e sorride
  if (t < cut2) {
    const p = pose(t, cut1, cut2, { cam: [0.12, 1.6, 1.45], look: [0, 1.42, -0.3], fov: 40 }, { cam: [0.06, 1.58, 0.95], look: [0, 1.45, -0.4], fov: 37 }, E.inOutSine);
    const door = E.outBack(prog(t, T.apre, T.apre + 1.1), 1.2);
    return { ...p, flash, door, nonna: { ...base, smile: E.inOutSine(prog(t, T.aspettando - 0.3, T.aspettando + 0.5)), gazeY: 0.12 } };
  }
  // 3: «Entra, presto. Prima che faccia buio.» primo piano: parla, fa cenno di entrare, guarda il buio dietro di te
  const p = pose(t, cut2, END, { cam: [0.1, 1.55, 0.72], look: [0.02, 1.36, -0.45], fov: 34 }, { cam: [0.07, 1.54, 0.58], look: [0.02, 1.38, -0.45], fov: 33 }, E.inOutSine);
  const look = M.bump(t, (T.prima + T.buio) / 2, 0.55);
  return { ...p, flash, door: 1, nonna: { ...base, mouth: mouthAt(t), smile: 0.45 * (1 - look) * (1 - prog(t, T.presto - 0.2, T.presto)), gazeX: 0.55 * look, gazeY: 0.15 + 0.1 * look, browUp: look, headYaw: 0.18 * look } };
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
    try { MOUTH = await fetch('assets/bocca.json').then((r) => r.json()); } catch { MOUTH = null; }
    CHUNKS = chunks(WORDS);
    END = Number(M.CFG.duration || 14);
    await G.initGL({ exposure: 1.15 });
    S = casaSet();
  },
  draw(ctx, u, t) {
    const o = shot(t);
    G.renderSet(ctx, S, t, u, o);
    subtitles(ctx, t);
    const fadeIn = 1 - prog(t, 0, 0.6), fadeOut = prog(t, END - 0.6, END);
    const a = Math.max(fadeIn, fadeOut);
    if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
  },
  post(ctx) {
    const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.28, W / 2, H * 0.5, H * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },
});
