// laboratorio della signora Ada e del suo soggiorno (episodio 2, «Interno 11»)
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE } from './sets/stile.js';
import { adaSet } from './sets/ada_set.js';
const { W, H } = M; let S = null;
const TELE = { a: [0.104, 0.393, 0.071], gomito: [0.8, -1, -0.1], dita: [-0.1, 0.87, -0.48], dorso: [1, 0, -0.15], mano: 'orecchio' };
const GREMBO = { a: [-0.16, -0.08, 0.3], gomito: [-0.8, -0.6, -0.2], dita: [0.2, -0.4, 1], dorso: [0, 1, 0.2], mano: 'rilassata' };
const SEDUTA = { pos: [0, 0, -0.38], yaw: 0, sit: 1, sedile: 0.47, lean: 0.06, headYaw: 0.12, headPitch: 0.02, smile: 0.55, armR: TELE, armL: GREMBO };
const DITO = { a: [-0.035, 0.39, 0.15], gomito: [0.5, -1, -0.2], dita: [0.05, 1, 0.05], dorso: [0.35, 0, 0.94], mano: 'indice' };
const DITO2 = { a: [-0.03, 0.4, 0.16], gomito: [0.5, -1, -0.2], dita: [0.1, 1, 0.1], dorso: [-0.5, 0, 0.87], mano: 'indice' };
const VISTE = [
  { cam: [0.1, 1.05, 2.6], look: [0, 0.75, -0.4], fov: 36, ambiente: 0.5, fronte: 0.4, ada: { pos: [0, 0, -0.2], yaw: 0 }, riva: { pos: [30, 0, 30] }, telAda: 0 },            // 0 in piedi, in chiaro
  { cam: [0.25, 1.15, 1.45], look: [0.05, 1.0, -0.4], fov: 38, ada: SEDUTA, riva: { pos: [0.45, 0, -1.08], yaw: -0.15 } },                                                    // 1 seduta al telefono, lui dietro nell'ombra
  { cam: [0.12, 1.1, 0.35], look: [0.02, 1.07, -0.38], fov: 30, ambiente: 0.2, fronte: 0.15, ada: SEDUTA, riva: { pos: [30, 0, 30] } },                                        // 2 primo piano: occhiali, rughe, crocchia
  { cam: [0.75, 1.15, 0.1], look: [0.0, 1.07, -0.42], fov: 30, ambiente: 0.2, fronte: 0.15, ada: SEDUTA, riva: { pos: [30, 0, 30] } },                                         // 3 di tre quarti
  { cam: [0.3, 1.2, 1.2], look: [0.15, 1.15, -0.5], fov: 38, ada: SEDUTA, riva: { pos: [0.34, 0, -0.98], yaw: -0.3, lean: 0.95, side: -0.18, twist: 0.1, headYaw: -0.25, headPitch: -0.35, smile: 0.3, open: 0.72, gambe: { aL: -0.25, gL: 0.35, aR: -0.25, gR: 0.35 } } },   // 4 si china sul telefono
  { cam: [0.3, 1.45, 1.3], look: [0.3, 1.45, -0.6], fov: 34, ada: SEDUTA, riva: { pos: [0.42, 0, -1.05], yaw: -0.05, smile: 0.25, open: 0.72, armR: DITO } },                 // 5 dritto, il dito sulle labbra, guarda in macchina
  { cam: [1.6, 1.6, 2.2], look: [-0.1, 1.0, -0.8], fov: 46, ada: SEDUTA, riva: { pos: [0.45, 0, -1.08], yaw: -0.15 } },                                                        // 6 la stanza
  { cam: [0.3, 1.5, 0.75], look: [0.32, 1.6, -0.9], fov: 30, ada: SEDUTA, riva: { pos: [0.42, 0, -1.05], yaw: -0.05, smile: 0.25, open: 0.72, armR: DITO2 } },                  // 7 primo piano di lui col dito
  { cam: [0.35, 0.92, 3.3], look: [0.3, 0.82, 0.7], fov: 40, ambiente: 0.45, fronte: 0.35, lampada: 1, ada: { pos: [0.3, 0, 0.75], yaw: 0, smile: 0.45, headYaw: 0.08, blink: 0 }, riva: { pos: [30, 0, 30] }, telAda: 0 },   // 8 per la scheda: in piedi, lontana dai mobili
  { cam: [0.41, 1.62, -0.42], look: [0.42, 1.6, -1.05], fov: 30, ambiente: 0.35, fronte: 0.3, lampada: 1, ada: { pos: [30, 0, 30] }, riva: { pos: [0.42, 0, -1.05], yaw: -0.05, headPitch: -0.04, smile: 0.25, open: 0.72, blink: 0, armR: { a: [-0.03, 0.385, 0.16], gomito: [0.5, -1, -0.2], dita: [0.1, 1, 0.1], dorso: [-0.5, 0, 0.87], mano: 'indice' } } },   // dito a 0.385: di fronte
  { cam: [1.05, 1.6, -0.98], look: [0.42, 1.6, -0.98], fov: 22, ambiente: 0.35, fronte: 0.3, lampada: 1, ada: { pos: [30, 0, 30] }, riva: { pos: [0.42, 0, -1.05], yaw: -0.05, headPitch: -0.04, smile: 0.25, open: 0.72, blink: 0, armR: { a: [-0.03, 0.385, 0.16], gomito: [0.5, -1, -0.2], dita: [0.1, 1, 0.1], dorso: [-0.5, 0, 0.87], mano: 'indice' } } },   // dito a 0.385: di lato
  { cam: [0.41, 1.62, -0.42], look: [0.42, 1.6, -1.05], fov: 30, ambiente: 0.35, fronte: 0.3, lampada: 1, ada: { pos: [30, 0, 30] }, riva: { pos: [0.42, 0, -1.05], yaw: -0.05, headPitch: -0.04, smile: 0.25, open: 0.72, blink: 0, armR: { a: [-0.03, 0.355, 0.158], gomito: [0.5, -1, -0.2], dita: [0.1, 1, 0.1], dorso: [-0.5, 0, 0.87], mano: 'indice' } } },   // dito a 0.355: di fronte
  { cam: [1.05, 1.6, -0.98], look: [0.42, 1.6, -0.98], fov: 22, ambiente: 0.35, fronte: 0.3, lampada: 1, ada: { pos: [30, 0, 30] }, riva: { pos: [0.42, 0, -1.05], yaw: -0.05, headPitch: -0.04, smile: 0.25, open: 0.72, blink: 0, armR: { a: [-0.03, 0.355, 0.158], gomito: [0.5, -1, -0.2], dita: [0.1, 1, 0.1], dorso: [-0.5, 0, 0.87], mano: 'indice' } } },   // dito a 0.355: di lato
  { cam: [0.41, 1.62, -0.42], look: [0.42, 1.6, -1.05], fov: 30, ambiente: 0.35, fronte: 0.3, lampada: 1, ada: { pos: [30, 0, 30] }, riva: { pos: [0.42, 0, -1.05], yaw: -0.05, headPitch: -0.04, smile: 0.25, open: 0.72, blink: 0, armR: { a: [-0.03, 0.335, 0.155], gomito: [0.5, -1, -0.2], dita: [0.1, 1, 0.1], dorso: [-0.5, 0, 0.87], mano: 'indice' } } },   // dito a 0.335: di fronte
  { cam: [1.05, 1.6, -0.98], look: [0.42, 1.6, -0.98], fov: 22, ambiente: 0.35, fronte: 0.3, lampada: 1, ada: { pos: [30, 0, 30] }, riva: { pos: [0.42, 0, -1.05], yaw: -0.05, headPitch: -0.04, smile: 0.25, open: 0.72, blink: 0, armR: { a: [-0.03, 0.335, 0.155], gomito: [0.5, -1, -0.2], dita: [0.1, 1, 0.1], dorso: [-0.5, 0, 0.87], mano: 'indice' } } },   // dito a 0.335: di lato
  { cam: [0.41, 1.62, -0.42], look: [0.42, 1.6, -1.05], fov: 30, ambiente: 0.35, fronte: 0.3, lampada: 1, ada: { pos: [30, 0, 30] }, riva: { pos: [0.42, 0, -1.05], yaw: -0.05, headPitch: -0.04, smile: 0.25, open: 0.72, blink: 0, armR: { a: [-0.03, 0.315, 0.152], gomito: [0.5, -1, -0.2], dita: [0.1, 1, 0.1], dorso: [-0.5, 0, 0.87], mano: 'indice' } } },   // dito a 0.315: di fronte
  { cam: [1.05, 1.6, -0.98], look: [0.42, 1.6, -0.98], fov: 22, ambiente: 0.35, fronte: 0.3, lampada: 1, ada: { pos: [30, 0, 30] }, riva: { pos: [0.42, 0, -1.05], yaw: -0.05, headPitch: -0.04, smile: 0.25, open: 0.72, blink: 0, armR: { a: [-0.03, 0.315, 0.152], gomito: [0.5, -1, -0.2], dita: [0.1, 1, 0.1], dorso: [-0.5, 0, 0.87], mano: 'indice' } } },   // dito a 0.315: di lato
];
M.film({ fonts: [M.font(20, 700, 'Display')], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; S = adaSet(); },
  draw(ctx, u, t) { const i = Math.min(VISTE.length - 1, Math.floor(t)), o = VISTE[i]; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); G.renderSet(ctx, S, t, u, o);
    ctx.fillStyle = '#ff0'; ctx.font = '700 30px Display'; ctx.fillText(`vista ${i}`, 20, 44); } });
