// Il gioco dei sette — prova di stile (il gancio dell'episodio 1), nel formato del video A (data/horror/VIDEO_A.md):
// sottotitoli in alto parola per parola (Figtree: la parola in corso in grassetto bianco, le altre sottili e grigie, una parola chiave
// per frase nel riquadro scuro con i due pallini), firma semitrasparente, camera quasi ferma che fa uno scatto veloce (con la scia)
// esattamente sulla parola che nomina la cosa. Funzione pura del tempo.
// La voce non c'è ancora (Luc costa crediti): i tempi delle parole sono calcolati dal testo al ritmo di Luc; quando c'è la voce vera
// si leggono da assets/parole.json.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE } from './sets/look.js';
import { salaSet, TAVOLO } from './sets/sala.js';
import { villaSet } from './sets/villa.js';

const { W, H, E, prog, lerp, clamp, font } = M;
const RIGHE = [
  'Eravamo sette sconosciuti, invitati a cena in una villa isolata.',
  "Eppure, sul tavolo c'erano otto piatti.",
  "Sull'ottavo era scritto il nome di mia sorella.",
  'Morta dieci anni prima.',
];
const CHIAVI = new Set(['sconosciuti,', 'otto', 'sorella.', 'dieci']);     // una parola chiave per frase: riquadro scuro coi pallini
const lettere = (p) => p.replace(/[^\p{L}']/gu, '').length;
function tempi(righe, { wps = 2.85, inizio = 0.35, virgola = 0.22, punto = 0.5 } = {}) {
  const out = []; let t = inizio;
  righe.forEach((r, ri) => {
    const parole = r.split(' '), tot = parole.reduce((a, p) => a + lettere(p) + 2, 0), dur = parole.length / wps;
    parole.forEach((p) => { const d = (dur * (lettere(p) + 2)) / tot; out.push([t, t + d * 0.92, p, ri]); t += d; if (/,$/.test(p)) t += virgola; });
    t += punto;
  });
  return out;
}
const WORDS = tempi(RIGHE);
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z']/g, '');
const w = (parola, fine = 0, quale = 0) => { const h = WORDS.filter((x) => norm(x[2]) === norm(parola)); const x = h[Math.min(quale, h.length - 1)]; return x ? x[fine] : 0; };
const riga = (n) => WORDS.find((x) => x[3] === n - 1)[0];

// ------------------------------------------------------------------ le inquadrature
// Ogni tratto: [da, a, {cam, look, fov}, {cam, look, fov}, easing, set]. Gli scatti sono tratti corti con un'accelerazione forte.
const S = {};
const io = E.inOutSine, scatto = (k) => (k < 0.5 ? 16 * k ** 5 : 1 - (-2 * k + 2) ** 5 / 2);    // inOutQuint: parte e arriva quasi fermo, in mezzo vola
const T = TAVOLO.y;
const TRATTI = [];
function tratti() {
  const e1 = w('Eppure'), e2 = w('otto'), o1 = w("Sull'ottavo"), nome = w('nome'), mo = w('Morta'), fine = M.CFG.duration || 13.2;
  const SU = [0, 1, 0], GIU = [0, 0, -1];
  TRATTI.push(
    // 1 — la villa isolata di notte tra i cipressi, camera che avanza lentissima
    [0, e1 - 0.42, { cam: [0, 1.7, 52], look: [0, 5.0, 0], fov: 30 }, { cam: [0.15, 1.75, 40.5], look: [0.6, 4.4, 0], fov: 30 }, io, 'villa'],
    // scatto dentro la finestra accesa (la luce calda riempie il quadro e si stacca dentro)
    [e1 - 0.42, e1 + 0.04, { cam: [0.15, 1.75, 40.5], look: [0.6, 4.4, 0], fov: 30 }, { cam: [2.8, 2.3, 5.75], look: [2.8, 2.3, 0], fov: 30 }, scatto, 'villa'],
    // 2 — la tavola vista da sopra: gli otto piatti, le mani dei sette, il posto vuoto in cima
    [e1 + 0.04, e1 + 0.45, { cam: [0, 6.6, 0.25], look: [0, T, 0], fov: 40, up: GIU }, { cam: [0, 5.55, 0.05], look: [0, T, 0], fov: 40, up: GIU }, (k) => 1 - (1 - k) ** 3, 'sala'],
    [e1 + 0.45, o1 - 0.05, { cam: [0, 5.55, 0.05], look: [0, T, 0], fov: 40, up: GIU }, { cam: [0, 5.05, 0.0], look: [0, T, -0.05], fov: 40, up: [0.06, 0, -1] }, io, 'sala'],
    // 3 — picchiata lungo la tavola fino all'ottavo posto
    [o1 - 0.05, o1 + 0.55, { cam: [0, 5.05, 0.0], look: [0, T, -0.05], fov: 40, up: [0.06, 0, -1] }, { cam: [-0.16, 1.08, -0.66], look: [0.0, T + 0.04, -1.42], fov: 38, up: SU }, scatto, 'sala'],
    [o1 + 0.55, nome - 0.1, { cam: [-0.16, 1.08, -0.66], look: [0.0, T + 0.04, -1.42], fov: 38 }, { cam: [-0.13, 1.03, -0.76], look: [0.0, T + 0.04, -1.42], fov: 38 }, io, 'sala'],
    // scatto sul segnaposto mentre dice «il nome»
    [nome - 0.1, nome + 0.3, { cam: [-0.13, 1.03, -0.76], look: [0.0, T + 0.04, -1.42], fov: 38 }, { cam: [0.0, 0.862, -1.02], look: [0, T + 0.028, -1.275], fov: 36 }, scatto, 'sala'],
    [nome + 0.3, mo - 0.05, { cam: [0.0, 0.862, -1.02], look: [0, T + 0.028, -1.275], fov: 36 }, { cam: [0.0, 0.858, -1.04], look: [0, T + 0.028, -1.275], fov: 36 }, io, 'sala'],
    // 4 — «Morta dieci anni prima»: indietro piano, entrano la rosa secca, la candela e la sedia vuota
    [mo - 0.05, fine, { cam: [0.0, 0.858, -1.04], look: [0, T + 0.028, -1.275], fov: 36 }, { cam: [-0.12, 1.02, -0.8], look: [0.02, T + 0.09, -1.5], fov: 38 }, io, 'sala'],
  );
}
const v3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function inquadratura(t) {
  let s = TRATTI[0]; for (const x of TRATTI) if (t >= x[0]) s = x;
  const k = s[4](clamp((t - s[0]) / (s[1] - s[0])));
  return { set: s[5], cam: v3(s[2].cam, s[3].cam, k), look: v3(s[2].look, s[3].look, k), fov: lerp(s[2].fov, s[3].fov, k), up: v3(s[2].up || [0, 1, 0], s[3].up || [0, 1, 0], k) };
}
// dove la camera vola (scatti) la scia del movimento: più campioni per fotogramma solo lì
const veloce = (t) => TRATTI.some((s) => s[4] === scatto && t > s[0] + 0.03 && t < s[1] - 0.03);

// ------------------------------------------------------------------ i sottotitoli del video A
function pezzi(words, mx = 4) { const out = []; let cur = []; words.forEach((x, i) => { cur.push(x); const n = words[i + 1]; if (/[.,:;?!…»]$/.test(x[2]) || cur.length >= mx || !n || n[3] !== x[3]) { out.push(cur); cur = []; } }); return out; }
const CHUNKS = pezzi(WORDS);
function sottotitoli(ctx, t) {
  let ci = -1; for (let i = 0; i < CHUNKS.length; i++) if (t >= CHUNKS[i][0][0] - 0.02) ci = i;
  if (ci < 0) return; const ch = CHUNKS[ci], next = CHUNKS[ci + 1]; if (t > ch[ch.length - 1][1] + 0.6 && (!next || t < next[0][0] - 0.02)) return;
  const size = 70, fB = font(size, 800, 'Sub'), fR = font(size, 500, 'Sub'), space = size * 0.27, maxW = W * 0.8;
  ctx.save(); ctx.textBaseline = 'alphabetic';
  const vis = ch.filter((x) => t >= x[0] - 0.02);                           // solo le parole già dette
  const items = vis.map((x) => { const now = t < x[1] + 0.03 && (x === vis[vis.length - 1]); ctx.font = now ? fB : fR; return { x, now, width: ctx.measureText(x[2]).width }; });
  const lines = [[]]; let lw = 0;
  items.forEach((it) => { if (lw + it.width > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(it); lw += it.width + space; });
  const y0 = H * 0.17;
  lines.forEach((line, li) => {
    const tot = line.reduce((a, it) => a + it.width, 0) + space * (line.length - 1); let x = (W - tot) / 2; const y = y0 + li * size * 1.18;
    line.forEach((it) => {
      const a = clamp((t - it.x[0] + 0.02) / 0.09), dy = (1 - E.outCubic(a)) * 10, chiave = CHIAVI.has(it.x[2]);
      if (chiave) {                                                           // il riquadro scuro con i pallini agli angoli, come un testo selezionato
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
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.fillStyle = '#FFFFFF'; ctx.fillText('@DOPE696', W / 2, H * 0.665); ctx.restore();
}

// ------------------------------------------------------------------ il film
let SALA = null, VILLA = null;
M.film({
  fonts: [font(70, 800, 'Sub'), font(70, 500, 'Sub'), font(80, 400, 'Corsivo')],
  samples: (t) => (veloce(t) ? 8 : 1), shutter: 0.6,
  async init() { await G.initGL({ exposure: 1.05 }); SALA = salaSet(); VILLA = villaSet(); tratti(); },
  draw(ctx, u, t) {
    const q = inquadratura(t), set = q.set === 'villa' ? VILLA : SALA;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    G.renderSet(ctx, set, t, u, q);
  },
  post(ctx, u, t) {
    const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.28, W / 2, H * 0.52, H * 0.78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const f = Math.floor(t * 30); ctx.save(); ctx.globalAlpha = 0.05;
    for (let i = 0; i < 900; i++) { ctx.fillStyle = M.hash01(i + f * 31, 5) > 0.5 ? '#fff' : '#000'; ctx.fillRect(M.hash01(i + f * 17, 8) * W, M.hash01(i + f * 19, 9) * H, 2, 2); }
    ctx.restore();
    sottotitoli(ctx, t); firma(ctx);
  },
});
