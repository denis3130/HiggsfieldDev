// Il Bivio — prova 3D dell'inizio dell'episodio 1 («La voce nel bosco»), in cartone 3D come il reel.
// Funzione pura del tempo: window.seek(t) disegna il fotogramma t. Le inquadrature seguono le parole
// della voce (assets/parole.json, scritto da scripts/bivio/voce.py): ogni frase si vede quando viene detta.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { boscoSet } from './sets/bosco.js';

const { W, H, E, prog, lerp, clamp, font } = M;
let S = null, WORDS = [], CHUNKS = [], END = 15;

// ------------------------------------------------------------------ parole e tempi
const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z']/g, '');
function at(word, n = 0, which = 0) {               // inizio (which=0) o fine (1) dell'n-esima occorrenza di una parola
  const hits = WORDS.filter((w) => norm(w[2]) === norm(word));
  const w = hits[Math.min(n, hits.length - 1)];
  return w ? w[which] : 0;
}
function chunks(words, mx = 6) {                    // pezzi di frase come nel reel: si chiudono a punto o virgola, max 6 parole
  const out = []; let cur = [];
  words.forEach((w, i) => {
    cur.push(w);
    if (/[.,:;?!…]$/.test(w[2]) || cur.length >= mx || i === words.length - 1) { out.push(cur); cur = []; }
  });
  return out;
}

// ------------------------------------------------------------------ camera: interpolazione tra pose
const v3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function pose(t, t0, t1, a, b, ease = E.inOutCubic) {
  const k = ease(clamp((t - t0) / Math.max(0.001, t1 - t0)));
  return { cam: v3(a.cam, b.cam, k), look: v3(a.look, b.look, k), fov: lerp(a.fov || 42, b.fov || 42, k), roll: lerp(a.roll || 0, b.roll || 0, k) };
}

function shot(t) {
  const T = {
    notte: at('notte', 0, 1), conosci: at('conosci', 0, 1), chiama: at('chiama'), voce: at('voce'),
    fratello1: at('fratello', 0, 1), ma: at('ma'), anno: at('anno'), fa: at('fa', 0, 1), proprio: at('proprio'),
    bosco2: at('bosco', 1, 1), sei: at('sei'), niente: at('niente'), perche: at('perche', 0, 1),
  };
  const cut1 = T.notte + 0.15, cut2 = T.conosci + 0.1, cut3 = T.fratello1 + 0.25, cut4 = T.fa + 0.05, cut5 = T.bosco2 + 0.25;
  // 1a: apri gli occhi, soggettiva da terra verso le chiome e la luna
  if (t < cut1) return { id: '1a', ...pose(t, 0, cut1, { cam: [1.0, 0.9, 0], look: [4.5, 150, 16], fov: 64, roll: 0.35 }, { cam: [1.0, 0.9, 0], look: [6, 150, 14], fov: 56, roll: -0.05 }, E.outCubic), fog: 0.012, eyes: true };
  // 1b: gru che scende dall'alto sulla radura: lui piccolo, il bosco enorme
  if (t < cut2) return { id: '1b', ...pose(t, cut1, cut2 + 0.6, { cam: [1.2, 10.5, 4.2], look: [0.05, 0, 0], fov: 38, roll: 0 }, { cam: [0.35, 3.4, 1.1], look: [0.05, 0.2, 0], fov: 38, roll: 0.3 }, E.outQuad), fog: 0.02 };
  // 2: dal punto di vista di lui, nel buio tra i tronchi: un tronco con una bocca che soffia vapore
  if (t < cut3) return { id: '2', ...pose(t, cut2, cut3, { cam: [-1.4, 0.8, -2.2], look: [-3.0, 1.5, -10.5], fov: 40 }, { cam: [-2.6, 1.3, -7.0], look: [-3.2, 1.6, -10.5], fov: 36 }, E.inOutSine), fog: 0.028, puffs: [T.chiama - 0.05, T.voce + 0.1, T.fratello1 - 0.3], glow: clamp((t - T.voce) / 0.8) };
  // 3a: il manifesto sul faggio, dalla foto alla data
  if (t < cut4) return { id: '3a', ...pose(t, cut3, cut4, { cam: [6.44, 1.74, -12.55], look: [6.4, 1.74, -14.66], fov: 36 }, { cam: [6.4, 1.44, -13.62], look: [6.4, 1.42, -14.66], fov: 32 }, E.inOutSine), fog: 0.02, fogSheets: 0.3 };
  // 3b: «proprio in questo bosco»: la camera si allontana, il manifesto si perde tra i tronchi
  if (t < cut5) return { id: '3b', ...pose(t, cut4, cut5 + 0.4, { cam: [6.4, 1.44, -13.62], look: [6.4, 1.42, -14.66], fov: 32 }, { cam: [3.4, 3.4, -4.0], look: [6.1, 1.8, -15.5], fov: 46 }, E.inOutQuad), fog: 0.026 };
  // 4a: dall'alto su di lui, la camera gira piano
  const cut6 = at('ricordi') - 0.45, cut7 = at('niente', 0, 1) + 0.3;
  if (t < cut6) {
    const k = clamp((t - cut5) / Math.max(0.1, cut6 - cut5));
    const ang = lerp(0.3, 0.9, E.inOutSine(k)), rad = lerp(1.0, 0.75, k);
    return { id: '4a', cam: [0.05 + Math.cos(ang) * rad, lerp(3.4, 2.6, E.inOutSine(k)), Math.sin(ang) * rad], look: [0.0, 0.15, 0.05], fov: 42, roll: lerp(0.1, 0.35, k), fog: 0.022 };
  }
  // 4b: la mano nell'erba bagnata, la vernice rossa sotto le unghie; le dita si contraggono su «niente»
  if (t < cut7) return { id: '4b', ...pose(t, cut6, cut7, { cam: [0.95, 0.6, 1.75], look: [-0.05, 0.18, 0.4], fov: 40 }, { cam: [0.78, 0.52, 1.55], look: [-0.08, 0.16, 0.42], fov: 38 }, E.inOutSine), fog: 0.02,
    twitch: M.bump(t, T.niente + 0.1, 0.4) };
  // 4c: la camera sale e lo lascia solo nella radura, mentre la testa si gira appena su «né perché»
  return { id: '4c', ...pose(t, cut7, END, { cam: [0.7, 2.1, 0.9], look: [0.1, 0.1, 0.0], fov: 40, roll: 0.15 }, { cam: [0.35, 9.5, 1.3], look: [0.05, 0.0, 0.0], fov: 40, roll: 0.65 }, E.inOutQuad),
    fog: 0.02, headTurn: E.inOutSine(prog(t, T.perche - 0.9, T.perche + 0.3)) * 0.5 };
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

// palpebre che si aprono (solo nella prima inquadratura)
function eyelids(ctx, t) {
  const open = E.outCubic(prog(t, 0.15, 1.3)) * (1 - 0.85 * M.bump(t, 1.75, 0.18));
  if (open >= 1) return;
  const gap = open * H * 0.62;
  ctx.save();
  for (const [y, dir] of [[H / 2 - gap, -1], [H / 2 + gap, 1]]) {
    const g = ctx.createLinearGradient(0, y - dir * 120, 0, y + dir * 40);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.75, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g;
    if (dir < 0) ctx.fillRect(0, 0, W, y + 40); else ctx.fillRect(0, y - 40, W, H - y + 40);
  }
  ctx.restore();
}

M.film({
  fonts: [font(74, 800, 'Display'), font(74, 500, 'UI')],
  samples: 1,
  async init() {
    try {
      const p = await fetch('assets/parole.json').then((r) => r.json());
      WORDS = p.flat();
    } catch { WORDS = []; }
    CHUNKS = chunks(WORDS);
    END = Number(M.CFG.duration || 15);
    await G.initGL({ exposure: 1.3 });
    S = boscoSet();
  },
  draw(ctx, u, t) {
    const o = shot(t);
    G.renderSet(ctx, S, t, u, o);
    if (o.eyes) eyelids(ctx, t);
    subtitles(ctx, t);
    const fadeOut = prog(t, END - 0.7, END);
    if (fadeOut > 0) { ctx.fillStyle = `rgba(0,0,0,${fadeOut})`; ctx.fillRect(0, 0, W, H); }
  },
  post(ctx, u, t) {
    // vignettatura + grana leggera (dopo il motion blur)
    const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.25, W / 2, H * 0.5, H * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },
});
