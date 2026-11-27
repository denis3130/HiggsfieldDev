// laboratorio dell'appartamento vuoto (episodio 2, «Interno 11»): una vista al secondo
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE } from './sets/stile.js';
import { fuoriSet, FY } from './sets/esterno_set.js';
const { W, H } = M; let SF = null;
const lontano = { pos: [60, 0, 60] }, via = { nascosta: true };
const B = { cucina: 0, tenda: 0, elena: via, riva: lontano, tu: lontano, ambiente: 0.25, fronte: 0.13, pioggia3: 0.6 }, BUIO = { ambiente: 0.05, fronte: 0.025 };
const VISTE = [
  { ...B, cam: [7.6, FY + 1.5, 2.6], look: [7.5, FY + 1.2, 0], fov: 50, vuoto: { luce: 1 } },                                        // 0 la portafinestra da fuori
  { ...B, cam: [6.5, FY + 1.6, -0.6], look: [8.0, FY + 0.6, -3.2], fov: 64, ...BUIO, vuoto: { luce: 1 } },                                      // 1 dentro, verso il divano e la porta
  { ...B, cam: [8.9, FY + 1.5, -3.4], look: [7.0, FY + 0.8, -0.4], fov: 64, ...BUIO, vuoto: { luce: 1 } },                                      // 2 dentro, verso la finestra
  { ...B, cam: [7.3, FY + 1.3, -1.6], look: [7.6, FY + 1.1, -0.1], fov: 50, ...BUIO, vuoto: { rotto: 0.12, lampo: 1 } },                        // 3 il vetro che si rompe, col lampo
  { ...B, cam: [7.3, FY + 1.3, -1.6], look: [7.6, FY + 1.1, -0.1], fov: 50, ...BUIO, vuoto: { rotto: 0.3, lampo: 0.2 } },                       // 4 schegge in volo
  { ...B, cam: [6.8, FY + 1.6, -1.4], look: [7.6, FY + 0.1, -0.9], fov: 50, ...BUIO, vuoto: { rotto: 2.0 } },                                   // 5 a terra: schegge, vaso, terra
  { ...B, cam: [7.8, FY + 1.3, -0.9], look: [7.5, FY + 1.1, -0.1], fov: 40, vuoto: { rotto: 2.0, maniglia: 1, anta: 0.35 } },          // 6 il buco, la maniglia girata, l'anta che si apre
  { ...B, cam: [7.6, FY + 1.5, -1.6], look: [9.3, FY + 1.1, -2.6], fov: 50, ...BUIO, vuoto: { rotto: 2, porta: 0.6 } },                          // 7 la porta d'ingresso aperta sull'altra scala
  { ...B, cam: [6.0, FY + 1.42, 0.8], look: [6.0, FY + 1.3, -2.5], fov: 62, sezione: true, casa: { soggiorno: 1, corridoio: 1 }, vuoto: { rotto: 2 } },    // 8 lo spaccato
  { ...B, cam: [6.02, FY + 1.5, -1.5], look: [5.0, FY + 1.35, -2.0], fov: 50, casa: { soggiorno: 1, corridoio: 1 }, vuoto: { rotto: 2 } },    // 9 dentro il muro
  { ...B, cam: [5.6, FY + 1.5, -1.3], look: [4.6, FY + 1.35, -2.2], fov: 50, casa: { soggiorno: 1, corridoio: 1 }, vuoto: { rotto: 2 } },     // 10 di là, il tuo soggiorno
  { ...B, cam: [8.4, FY + 1.3, 2.4], look: [7.6, FY + 0.9, 0.2], fov: 46, vuoto: { rotto: 2 } },                                        // 11 da fuori dopo, col vetro rotto
];
M.film({ fonts: [M.font(20, 700, 'Display')], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; SF = fuoriSet({ balcone: true, vuoto: true }); },
  draw(ctx, u, t) { const i = Math.min(VISTE.length - 1, Math.floor(t)), o = VISTE[i]; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); G.renderSet(ctx, SF, t, u, o);
    ctx.fillStyle = '#ff0'; ctx.font = '700 30px Display'; ctx.fillText(`vista ${i}`, 20, 44); } });
