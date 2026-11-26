// laboratorio del balcone (episodio 2 de «Il testimone»): un'inquadratura al secondo
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE } from './sets/stile.js';
import { fuoriSet, WX, FY, AUTO } from './sets/esterno_set.js';
import { BAL } from './sets/balcone.js';
let S = null;
const via = { pos: [60, 0, 60] }, B = { tu: via, riva: via, elena: { nascosta: true }, cucina: 0, tenda: 0 };
const SHOTS = [
  { ...B, cam: [6.0, FY + 1.5, 9.5], look: [6.0, FY + 1.0, 0], fov: 40 },                                      // 0 di fronte, da fuori
  { ...B, cam: [10.2, FY + 2.3, 5.2], look: [5.6, FY + 0.9, 0.5], fov: 34 },                                   // 1 di tre quarti
  { ...B, cam: [3.75, FY + 1.5, 0.55], look: [6.0, FY + 1.0, 0.62], fov: 50 },                                 // 2 dal tuo balcone verso il divisorio
  { ...B, cam: [7.7, FY + 0.8, 0.3], look: [6.0, FY + 1.35, 0.95], fov: 50 },                                  // 3 dal balcone vuoto (rannicchiato) verso il divisorio
  { ...B, cam: [5.3, FY + 1.55, 0.85], look: [6.6, 0, 13], fov: 50 },                                          // 4 giù dalla ringhiera
  { ...B, cam: [5.0, FY + 1.3, 1.9], look: [5.5, FY + 0.85, 1.03], fov: 30 },                                  // 5 la ringhiera da vicino
  { ...B, cam: [4.6, FY + 1.35, 1.6], look: [4.5, FY + 1.1, -0.14], fov: 40, porta: 0.05 },                    // 6 portafinestra socchiusa, tenda
  { ...B, cam: [4.9, FY + 1.3, 17], look: [4.9, FY + 0.6, 0], fov: 30, casa: { soggiorno: 1, corridoio: 1 }, porta: 0.1, cucina: 1 },       // 7 luce accesa, da fuori
  { ...B, cam: [7.7, FY + 0.8, 0.3], look: [6.0, FY + 1.35, 0.95], fov: 50, casa: { soggiorno: 1 }, porta: 0.05 },                              // 8 luce accesa, dal balcone vuoto
  { ...B, cam: [3.75, FY + 1.5, 0.55], look: [6.0, FY + 1.0, 0.62], fov: 50, casa: { soggiorno: 1 }, porta: 0.05 },                             // 9 luce accesa, dal tuo balcone
  { ...B, cam: [5.5, FY + 1.6, 4.5], look: [4.6, FY + 1.1, 0], fov: 34, casa: { soggiorno: 1 }, porta: 0.6, tendaScosta: 1 },                   // 10 anta aperta
  { ...B, cam: [8.4, FY + 1.6, 0.5], look: [7.2, FY + 0.7, 0.4], fov: 55 },                                    // 11 il balcone vuoto da dentro
  { ...B, cam: [5.2, FY - 4.5, 7.5], look: [6.0, FY + 0.8, 0.5], fov: 40, casa: { soggiorno: 1 }, porta: 0.05 },     // 12 da sotto
  { ...B, cam: [3.4, 1.7, 17], look: [4.5, 9.5, 0], fov: 52 },
  { ...B, cam: [4.9, FY + 1.4, 2.2], look: [4.4, FY + 1.25, -0.3], fov: 30, casa: { corridoio: 1 }, porta: 0.07, riva: { pos: [4.05, FY, -3.3] }, ambiente: 0.5, fronte: 0.4 },      // 14 lui sulla soglia, dietro il velo
  { ...B, cam: [4.9, FY + 1.4, 2.2], look: [4.4, FY + 1.25, -0.3], fov: 30, casa: { corridoio: 1 }, porta: 0.07, riva: { pos: [4.05, FY, -2.2] }, ambiente: 0.5, fronte: 0.4 },      // 15 più vicino
  { ...B, cam: [4.9, FY + 1.4, 2.2], look: [4.4, FY + 1.25, -0.3], fov: 30, casa: { corridoio: 0 }, porta: 0.07, riva: { pos: [4.05, FY, -3.3] }, ambiente: 0.5, fronte: 0.4 },      // 16 sulla soglia, corridoio spento                                                 // 13 la facciata dal parcheggio
];
const { XA, XD, XB, ZR, HR, RT } = BAL, YR = FY + HR;
// tu alla ringhiera, le due mani sul corrimano
const CR = (x, lato, o = {}) => ({ a: [x + lato * 0.06, YR, ZR], b: [x - lato * 0.06, YR, ZR], r: RT, ...o });      // un punto del corrimano davanti: lato = +1 se il pollice sta dalla parte delle x che crescono
const MANO_TESA = { indice: { mcp: 8, pip: 14, dip: 8, ab: -4 }, medio: { mcp: 12, pip: 18, dip: 10 }, anulare: { mcp: 16, pip: 22, dip: 12, ab: 5 }, mignolo: { mcp: 20, pip: 26, dip: 14, ab: 9 }, pollice: { ab: 30, fl: 8, roll: 20, mcp: 6, ip: 8 } };
const TU_ANGOLO = (x = {}) => ({ pos: [6.78, FY, 0.3], yaw: -0.55, sit: 1, sedile: 0.03, gambe: { aL: 0.8, gL: 0.5, aR: 0.72, gR: 0.3 }, lean: -0.04, headPitch: -0.12, headYaw: -0.25, fear: 1, browUp: 0.7, sad: 0.6, mouth: 0.2, open: 1,
  armR: { a: [0.06, 0.26, 0.2], gomito: [0.8, -1, -0.1], dita: [-0.6, 0.6, 0.1], dorso: [0.2, 0.1, 1], mano: 'presa' }, armL: { a: [-0.02, 0.24, 0.23], gomito: [-0.8, -1, -0.1], dita: [0.7, 0.5, 0.1], dorso: [-0.1, 0.2, 1], mano: 'presa' }, ...x });
// l'ispettore che si sporge oltre il divisorio: quattro varianti
const RIVA = [
  { pos: [5.84, FY, 0.84], yaw: 0.15, lean: 0.42, side: -0.1, twist: 0.15, headYaw: 0.85, headRoll: -0.2, armL: { sbarra: CR(5.5, 1), gomitoM: [-0.8, -0.6, -0.2] }, armR: { mondo: [6.32, FY + 1.17, 1.24], gomitoM: [0.3, -1, 0.2], ditaM: [0.8, -0.05, -0.55], dorsoM: [0, -1, 0], mano: MANO_TESA } },
  { pos: [5.86, FY, 0.86], yaw: -0.5, lean: 0.36, side: 0, twist: 0.3, headYaw: 0.95, headRoll: -0.15, armL: { sbarra: CR(5.42, 1), gomitoM: [-0.6, -0.7, -0.4] }, armR: { mondo: [6.34, FY + 1.17, 1.22], gomitoM: [0.2, -1, 0.5], ditaM: [0.8, -0.05, -0.55], dorsoM: [0, -1, 0], mano: MANO_TESA } },
  { pos: [5.84, FY, 0.86], yaw: -0.25, lean: 0.4, side: -0.06, twist: 0.22, headYaw: 0.9, headRoll: -0.18, armL: { sbarra: CR(5.36, 1), gomitoM: [-1, -0.4, 0] }, armR: { mondo: [6.3, FY + 1.15, 1.25], gomitoM: [0.6, -1, 0.3], ditaM: [0.8, -0.05, -0.55], dorsoM: [0, -1, 0], mano: MANO_TESA } },
  { pos: [5.85, FY, 0.88], yaw: 0, lean: 0.3, side: -0.14, twist: 0.1, headYaw: 0.9, headPitch: 0.1, headRoll: -0.2, armL: { sbarra: CR(5.45, 1), gomitoM: [-1, -0.5, -0.1] }, armR: { mondo: [6.28, FY + 1.13, 1.22], gomitoM: [0.5, -1, 0.1], ditaM: [0.8, -0.05, -0.55], dorsoM: [0, -1, 0], mano: MANO_TESA } },
].map((q) => ({ smile: 0.5, open: 0.7, ...q }));
// tu fuori dalla ringhiera, faccia al palazzo (yaw = pi: la tua destra, AL, è dalla parte delle x che crescono): fermo, la mano che avanza, il piede che avanza, arrivato
const FUORI = (x, o = {}) => ({ pos: [x, FY, 1.19], yaw: Math.PI, lean: 0.18, headPitch: -0.05, fear: 1, browUp: 0.7, sad: 0.6, mouth: 0.15, armL: { sbarra: CR(x + 0.24, -1), gomitoM: [0.6, -0.7, 0.6] }, armR: { sbarra: CR(x - 0.24, 1), gomitoM: [-0.6, -0.7, 0.6] }, ...o });
const TU = [FUORI(5.72), FUORI(5.72, { headYaw: -0.5, armL: { sbarra: CR(6.28, -1), gomitoM: [0.3, -1, 0.5] } }), FUORI(5.9, { headYaw: -0.4, gambe: { oL: 0.42, gL: 0.1 }, armL: { sbarra: CR(6.3, -1), gomitoM: [0.5, -0.8, 0.6] }, armR: { sbarra: CR(5.6, 1), gomitoM: [-0.4, -1, 0.5] } }), FUORI(6.3, { headPitch: 0.3 })];
const POSE = RIVA.map((q) => () => ({ c: [6.1, FY + 1.25, 1.0], casa: { soggiorno: 1 }, porta: 0.5, tendaScosta: 0.8, riva: q, tu: TU_ANGOLO() })).concat(TU.map((q) => () => ({ c: [6.0, FY + 1.0, 1.1], tu: q })));
const VISTE = (c, i) => i < 4 ? [{ cam: [c[0] + 1.5, c[1] + 0.35, c[2] + 2.3], look: c, fov: 30 }, { cam: [4.2, 1.6, 17.5], look: [6.2, FY + 1.1, 0.8], fov: 6.5 }, { cam: [7.25, FY + 0.82, 0.45], look: [6.2, FY + 1.42, 1.15], fov: 40 }]
  : [{ cam: [c[0] - 1.6, c[1] + 0.7, c[2] + 1.9], look: c, fov: 30 }, { cam: [7.05, FY + 1.3, 0.22], look: [6.0, FY + 1.12, 1.15], fov: 40 }, { cam: [6.75, FY + 0.16, 0.5], look: [6.0, FY + 0.35, 1.12], fov: 40 }];
M.film({ fonts: [M.font(20, 700, 'Display')], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; S = fuoriSet({ balcone: true }); },
  draw(ctx, u, t) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, M.W, M.H); let o; if (t >= 20) { const i = Math.floor((t - 20) / 3) % POSE.length, v = Math.floor(t - 20) % 3, q = POSE[i](); o = { ...B, ...q, ...VISTE(q.c, i)[v], ambiente: 0.6, fronte: 0.45, pioggia3: 0.3 }; } else { const n = Math.min(SHOTS.length - 1, Math.floor(t)); o = { ...SHOTS[n] }; } if (M.CFG.chiaro) { o.ambiente = 0.75; o.fronte = 0.5; } G.renderSet(ctx, S, t, u, o); } });
