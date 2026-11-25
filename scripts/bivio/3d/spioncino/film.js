// Il Bivio — «Il testimone»: prova della scena dello spioncino coi personaggi adulti.
// «Aspetti al buio. Senti l'ascensore salire. Si ferma al tuo piano. Bussano. Tre colpi. Guardi dallo spioncino.
//  Un uomo ti mostra un distintivo. "Polizia. Ha chiamato lei?" Ha un cappotto scuro. E sulla guancia, tre graffi freschi.»
// Funzione pura del tempo: tutto è agganciato alle parole della voce (assets/parole.json); la bocca dell'ispettore al volume (assets/bocca.json).
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE } from './sets/stile.js';
import { ingressoSet, pianerottoloSet } from './sets/testimone_set.js';
import { battito } from './sets/pupazzi.js';

const { W, H, E, prog, lerp, clamp, font } = M;
let SI = null, SP = null, WORDS = [], CHUNKS = [], END = 18.7, BOCCA = [];
const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z']/g, '');
function at(word, n = 0, which = 0) { const h = WORDS.filter((w) => norm(w[2]) === norm(word)); const w = h[Math.min(n, h.length - 1)]; return w ? w[which] : 0; }
function chunks(words, mx = 6) { const out = []; let cur = []; words.forEach((w, i) => { cur.push(w); if (/[.,:;?!…»]$/.test(w[2]) || cur.length >= mx || i === words.length - 1) { out.push(cur); cur = []; } }); return out; }
const v3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const VOC = { a: [0.25, 0], e: [0.75, 0], i: [0.9, 0], o: [-0.2, 1], u: [-0.3, 0.9] };
function parla(chi, t) {
  for (const b of BOCCA) { if (b.who !== chi) continue; const i = (t - b.t0) * b.fps; if (i < 0 || i >= b.vals.length - 1) continue;
    const k = Math.floor(i), open = lerp(b.vals[k], b.vals[k + 1], i - k);
    const w = WORDS.find((x) => t >= x[0] - 0.03 && t <= x[1] + 0.05); let wide = 0.2, round = 0;
    if (w) { const vs = [...norm(w[2])].filter((ch) => VOC[ch]); if (vs.length) { const f = clamp((t - w[0]) / Math.max(0.05, w[1] - w[0])); [wide, round] = VOC[vs[Math.min(vs.length - 1, Math.floor(f * vs.length))]]; } }
    return { mouth: open * 0.6, wide: wide * 0.35, round: round * Math.min(1, open * 2) }; }
  return { mouth: 0, wide: 0, round: 0 };
}
const mixA = (A, B, k) => ({ a: v3(A.a, B.a, k), gomito: v3(A.gomito, B.gomito, k), dita: v3(A.dita, B.dita, k), dorso: v3(A.dorso, B.dorso, k), mano: k < 0.5 ? A.mano : B.mano });

export function tempi() {
  const T = { ascensore: at("l'ascensore"), ferma: at('ferma'), bussano: at('bussano'), colpi: at('colpi', 0, 1), guardi: at('guardi'), uomo: at('uomo'), polizia: at('polizia'), lei: at('lei', 0, 1), cappotto: at('cappotto'), scuro: at('scuro', 0, 1), guancia: at('guancia'), freschi: at('freschi', 0, 1) };
  T.K = [T.colpi + 0.22, T.colpi + 0.62, T.colpi + 1.02];              // i tre colpi alla porta
  T.cutA = T.guardi - 0.18; T.cutB = T.uomo - 0.2;
  return T;
}
function shot(t) {
  const T = tempi();
  if (t < T.cutA) {
    // 1: il corridoio buio da dietro di te; la luce sotto la porta, due ombre che arrivano, i tre colpi
    const gira = E.inOutSine(prog(t, T.ascensore - 0.1, T.ascensore + 0.9)), colpo = T.K.reduce((m, k) => Math.max(m, M.bump(t, k + 0.05, 0.1)), 0);
    const salto = E.outCubic(prog(t, T.K[0], T.K[0] + 0.25)), k = E.inOutSine(prog(t, 0, T.cutA));
    return { set: 'in', id: 'corridoio', cam: v3([0.5, 1.64, 1.6], [0.4, 1.56, 0.85], k), look: v3([0.05, 1.05, -2.5], [0.05, 0.9, -2.5], k), fov: 44,
      piedi: E.outCubic(prog(t, T.ferma + 0.55, T.ferma + 1.15)), colpo,
      tu: { pos: [-0.2, 0, -0.85 + 0.09 * salto], yaw: lerp(2.25, Math.PI, gira), breathe: Math.sin(t * 3), headYaw: 0.35 * (1 - gira), lean: -0.05 * M.bump(t, T.K[0] + 0.15, 0.3),
        armR: { a: [0.13, 0.2 + 0.03 * salto, 0.26], gomito: [1, -0.7, -0.2], dita: [0, 0.92, 0.25], dorso: [0, 0, 1], mano: 'presa' } } };
  }
  if (t < T.cutB) {
    // 2: ti avvicini allo spioncino (primo piano; la porta è tolta per vederti in faccia)
    const k = E.inOutSine(prog(t, T.cutA, T.cutB));
    return { set: 'in', id: 'viso', porta: false, cam: v3([0.12, 1.675, -3.1], [0.07, 1.675, -2.96], k), look: [0, 1.668, -2.0], fov: 27, occhio: 0.25 + 0.3 * k, telefono: 1,
      tu: { pos: [0, 0, lerp(-1.93, -2.12, k)], yaw: Math.PI, breathe: Math.sin(t * 3.2), fear: 0.35 + 0.35 * k, browUp: 0.4, mouth: 0.1, blink: M.bump(t, T.cutA + 0.5, 0.09), lean: 0.06 * k, headPitch: 0.05 * k,
        armR: { a: [0.13, 0.03, 0.2], gomito: [1, -0.5, -0.4], dita: [0, 0.6, 0.6], dorso: [0, -0.5, 1], mano: 'presa' } } };
  }
  // 3: dallo spioncino: l'ispettore mostra il distintivo, parla, abbassa la mano; lo zoom va ai graffi sulla guancia
  const giu = E.inOutSine(prog(t, T.cappotto - 0.3, T.scuro + 0.2)), zoom = E.inOutCubic(prog(t, T.guancia - 0.5, T.freschi + 0.15)), fine = E.inOutSine(prog(t, T.freschi + 0.2, T.freschi + 1.2));
  const su = { a: [-0.118, 0.39, 0.33], gomito: [-1, -0.8, -0.1], dita: [0, 1, 0.05], dorso: [0, 0, -1], mano: { dita: [0.14, 0.12, 0.12, 0.14], pollice: 0.35, apri: 0.1 } };
  const riposo = { a: [-0.253, -0.21, 0.035], gomito: [-0.6, -0.3, -0.75], dita: [0, -1, 0.05], dorso: [0, 0, 1], mano: 'rilassata' };
  const arriva = E.outCubic(prog(t, T.cutB, T.cutB + 0.5)), guarda = E.inOutSine(prog(t, T.cutB + 0.3, T.cutB + 0.9));
  return { set: 'out', id: 'pov', cam: [0.01 * M.noise1(t * 0.6, 3), 1.56 + 0.006 * M.noise1(t * 0.5, 4), 0.03],
    look: v3([0, 1.62, 0.8], [-0.052, 1.705, 0.7], zoom), fov: lerp(lerp(76, 62, giu), 22, zoom),
    isp: { pos: [0.02, 0, 0.8], yaw: Math.PI, breathe: Math.sin(t * 1.9), blink: battito(t, 21), distintivo: giu < 0.55, armL: mixA(su, riposo, giu),
      ...parla('isp', t), smile: 0.3 * (1 - prog(t, T.polizia - 0.2, T.polizia)) + 0.55 * fine, open: 0.72 + 0.1 * fine, gazeX: 0.5 * (1 - guarda) + 0.5 * zoom, gazeY: -0.3 + 0.1 * zoom,
      headPitch: 0.1, headYaw: 0.12 * (1 - guarda) - 0.2 * zoom, headRoll: 0.05 * fine, lean: 0.03 * arriva } };
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


function spioncino(ctx) {                                  // il mondo visto da un foro tondo: nero intorno, bordo sfumato, un velo di lente
  const cx = W / 2, cy = H * 0.47, r0 = W * 0.5, r1 = W * 0.57;
  const g = ctx.createRadialGradient(cx, cy, r0 * 0.55, cx, cy, r1);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.72, 'rgba(0,0,0,0.28)'); g.addColorStop(0.9, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(cx, cy, r1, 0, Math.PI * 2, true); ctx.fill('evenodd');
  const v = ctx.createRadialGradient(cx - r0 * 0.35, cy - r0 * 0.4, 0, cx - r0 * 0.35, cy - r0 * 0.4, r0 * 0.9);
  v.addColorStop(0, 'rgba(255,240,200,0.07)'); v.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = v; ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI * 2); ctx.fill();
}
M.film({
  fonts: [font(74, 800, 'Display'), font(74, 500, 'UI')],
  samples: 1,
  async init() {
    try { const p = await fetch('assets/parole.json').then((r) => r.json()); WORDS = p.flat(); } catch { WORDS = []; }
    try { BOCCA = await fetch('assets/bocca.json').then((r) => r.json()); } catch { BOCCA = []; }
    CHUNKS = chunks(WORDS); END = Number(M.CFG.duration || 18.7);
    await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; SI = ingressoSet(); SP = pianerottoloSet();
    window.TEMPI = tempi();
  },
  draw(ctx, u, t) {
    const o = shot(t);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    G.renderSet(ctx, o.set === 'in' ? SI : SP, t, u, o);
    if (o.id === 'pov') spioncino(ctx);
    subtitles(ctx, t);
    const a = Math.max(1 - prog(t, 0, 0.6), prog(t, END - 0.8, END));
    if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
  },
  post(ctx, u, t) { if (shot(t).id === 'pov') return; const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.5, H * 0.8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); },
});
