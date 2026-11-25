// prova dell'immagine della carta A (la mano sulla maniglia) con la mano MODELLATA: tre inquadrature per fotogramma, in formato largo come nella carta
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE, V } from './sets/stile.js';
import { ingressoSet } from './sets/testimone_set.js';
import { attacca, presaSu, nelModello, afferra, avvolgiPollice } from './sets/mano_mesh.js';
const { W, H } = M; let SI = null, MM = null, INFO = '', FARO = null;
function scatto(c, set, o, x, y, wd, hg) { c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, wd, hg); c.clip(); set.camera.aspect = wd / hg; c.scale(wd / W, hg / H); G.renderSet(c, set, 0, 0, o); c.restore(); }
// la leva della porta nel mondo: a = punta libera (lato del pollice), b = perno (lato del mignolo)
const LA = [0.225, 1.02, -2.475], LB = [0.365, 1.02, -2.475], LR = 0.011, C = [0.295, 1.03, -2.475];
// la presa: dove passa l'asse della leva rispetto alle nocche (u = verso le punte, v = verso il palmo, metri del modello) per indice e mignolo
const NI = [0.0318, -0.0328, -0.0144], NM = [0.0254, -0.0181, 0.0442];
function presa(u, v, k = 0.8) { const a = V(NI[0] - v, NI[1] - u, NI[2]), b = V(NM[0] - v * k, NM[1] - u * k, NM[2]); return { c: a.clone().lerp(b, 0.5).toArray(), d: b.sub(a).normalize().toArray() }; }
const PRESE = { piatta: presa(0.017, 0.0205), media: presa(0.0157, 0.0328), pugno: presa(0.01, 0.035), fonda: presa(0.0036, 0.0362) };
const POLLICE = { fuori: { ab: 20, fl: 0, mcp: 5, ip: 10 }, sotto: { ab: 55, fl: 30, roll: 0, mcp: 25, ip: 35 }, lungo: { ab: 10, fl: 25, mcp: 10, ip: 15 } };
function conf(o) { return { presa: 'media', rollio: -25, lungo: 0.5, pollice: 'sotto', tu: [0.08, -2.03], gomito: [0.5, -0.8, 0.4], amb: 0.26, fronte: 0.2, luce: { pos: [-0.05, 1.5, -2.15], k: 0.8 }, faro: null, fov: 32, s: [0, 0, 0], ...o }; }
const K0 = { presa: 'pugno', rollio: -32, tu: [0.08, -1.94] };
const SENZA = { amb: 0.26, fronte: 0.2, luce: { pos: [-0.05, 1.5, -2.15], k: 0.8 } };
// come nelle foto dell'utente: dall'alto e da dietro, lungo il braccio (il braccio entra dall'angolo in basso a destra), l'ombra della mano sulla porta
const M0 = [0.295, 1.05, -2.44];                                   // più o meno il centro della mano
const POV = (d, luce, o = {}) => conf({ ...K0, nuda: 1, cam: [M0[0] + d[0], M0[1] + d[1], M0[2] + d[2]], amb: 0.16, fronte: 0.05, luce: null, faro: { pos: [M0[0] + luce[0], M0[1] + luce[1], M0[2] + luce[2]], k: 2.6, colore: '#FFE2BC', cono: 0.36 }, fov: 30, soloBraccio: 1, ...o });
// come nella foto: il braccio quasi orizzontale (tu più vicino alla porta, gomito basso), il dorso della mano verso chi guarda, il polso dritto
// (nella foto la leva scende a sinistra e il braccio a destra, a «V» col pugno in cima: la camera sta in diagonale, a sinistra, dietro e sopra la mano, e stringe molto)
const LUCE = [0.35, 0.5, 0.3], F0 = { tu: [0.08, -2.06], gomito: [0.3, -1, 0.5], rollio: 3, rollio2: 0, fov: 19, look: [M0[0] + 0.0, M0[1] - 0.01, M0[2] + 0.05] };
const VISTE = [
  POV([-0.12, 0.45, 0.42], LUCE, { ...F0, rollio2: 12, fov: 16 }), POV([-0.1, 0.38, 0.5], LUCE, { ...F0, rollio2: 12, fov: 16 }), POV([-0.16, 0.42, 0.4], LUCE, { ...F0, rollio2: 14, fov: 16 }),
  POV([-0.3, 0.02, 0.2], LUCE, { ...F0, fov: 18 }), POV([-0.1, -0.3, 0.2], LUCE, { ...F0, fov: 18 }), POV([0.0, 0.3, 0.3], LUCE, { ...F0, fov: 12, look: [M0[0], M0[1] + 0.03, M0[2] + 0.12] }),
];
// la carta sopra l'immagine (sfumatura, bollo e scritte come nel film), per giudicare la composizione
function sopra(ctx, y) { const k = 1080 / 860; ctx.save(); ctx.translate(0, y); ctx.scale(k, k); const g = ctx.createLinearGradient(0, 480 * 0.45, 0, 480); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.88)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 860, 480);
  ctx.fillStyle = '#F2B63C'; ctx.beginPath(); ctx.arc(74, 74, 46, 0, 7); ctx.fill(); ctx.fillStyle = '#0D1016'; ctx.font = '800 60px Display'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('A', 74, 79);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = '800 58px Display'; ['APRI', 'E FAI FINTA DI NIENTE'].forEach((r, i) => ctx.fillText(r, 40, 480 - 46 - (1 - i) * 66)); ctx.restore(); }
function metti(o) {                                            // dopo la posa del personaggio: la mano modellata si chiude sulla leva vera
  SI.T.group.traverse((x) => { if (x.isMesh && !MM.userData.pezzi.includes(x)) { if (x.userData.vis0 === undefined) x.userData.vis0 = x.visible; x.visible = o.soloBraccio ? false : x.userData.vis0; } });
  FARO.intensity = o.faro ? o.faro.k : 0; if (o.faro) { FARO.position.set(...o.faro.pos); FARO.color.set(o.faro.colore); FARO.angle = o.faro.cono || 0.42; }
  SI.scene.updateMatrixWorld(true); const m = nelModello(MM, LA, LB, LR); let P = afferra({ avambraccio: m.avambraccio }, m.leva, { pollice: false });
  if (o.pollice === 'sotto') P = avvolgiPollice(P, m.leva, { rollio: o.rollioPollice ?? 75, zona: [-0.06, -0.012] }); else P.pollice = { ...POLLICE[o.pollice] };
  const av = m.avambraccio, pg = Math.round(Math.acos(Math.max(-1, Math.min(1, -av[1]))) * 180 / Math.PI), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(); SI.T.AL.gF.getWorldPosition(e1); SI.T.AL.gH.getWorldPosition(e2);
  const pend = Math.round(Math.asin((e2.y - e1.y) / e1.distanceTo(e2)) * 180 / Math.PI);
  MM.userData.posa(P); INFO = `bordo ${MM.userData.bordo}  polso ${pg}° ${av[0] < 0 ? 'indietro' : 'in giù'}, avambraccio ${pend}° sull'orizzonte  ` + ['indice', 'medio', 'anulare', 'mignolo'].map((f) => f[0] + ':' + [P[f].mcp || 0, P[f].pip || 0, P[f].dip || 0].map((x) => Math.round(x)).join('/')).join(' ') + '  p:' + JSON.stringify(P.pollice) + JSON.stringify(P.infoPollice || '');
}
M.film({ fonts: [M.font(20, 700, 'Display')], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); G.R.toneMapping = THREE.NoToneMapping; SI = ingressoSet(); MM = attacca(SI.T.AL);
    // un faro con le ombre per la carta: la mano, la leva e la porta le fanno e le ricevono
    FARO = new THREE.SpotLight('#FFE2BC', 0, 3, 0.42, 0.7, 1.2); FARO.target.position.set(0.295, 1.02, -2.48); FARO.castShadow = true; FARO.shadow.mapSize.set(2048, 2048); FARO.shadow.camera.near = 0.15; FARO.shadow.camera.far = 2; FARO.shadow.bias = -0.0004; FARO.shadow.normalBias = 0.004; FARO.shadow.radius = 5;
    SI.scene.add(FARO, FARO.target); for (const x of MM.userData.pezzi) { x.castShadow = true; x.receiveShadow = true; }
    SI.scene.traverse((o) => { if (o.isMesh && o.geometry && !MM.userData.pezzi.includes(o)) { const b = new THREE.Box3().setFromObject(o); if (b.min.z < -2.3 && b.max.z > -2.62 && b.max.y > 0.5) { o.receiveShadow = true; if (b.max.x - b.min.x < 0.3) o.castShadow = true; } } });
    const agg = SI.update; SI.update = (t, u, o) => { agg(t, u, o); metti(o.carta); }; },
  draw(ctx, u, t) { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); const n = Math.floor(t) * 3;
    for (let i = 0; i < 3; i++) { const v = VISTE[n + i]; if (!v) continue; const g = presaSu(LA, LB, { ...PRESE[v.presa], rollio: v.rollio, lungo: v.lungo });
      scatto(ctx, SI, { cam: v.cam || [C[0] + v.d[0], C[1] + v.d[1], C[2] + v.d[2]], look: v.cam ? (v.look || [M0[0] + 0.02, M0[1] - 0.02, M0[2]]) : [C[0] + v.s[0], C[1] + v.s[1], C[2] + v.s[2]], roll: (v.rollio2 || 0) * Math.PI / 180, fov: v.fov, piedi: 1, telefono: 0, occhio: 0.9, amb: v.amb, fronte: v.fronte, luce: v.luce, carta: v,
        tu: { pos: [v.tu[0], 0, v.tu[1]], yaw: Math.PI, lean: 0.14, headPitch: 0.3, armL: { mondo: g.polso, gomitoM: v.gomito, ditaM: g.dita, dorsoM: g.dorso, mano: 'rilassata' } } }, 0, 20 + i * 630, 1080, 603);
      if (!v.senzaCarta && !v.nuda) sopra(ctx, 20 + i * 630); ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff'; ctx.font = '700 20px Display'; ctx.fillText(`${n + i + 1}`, 1040, 44 + i * 630); ctx.font = '500 13px Display'; ctx.fillText(INFO.slice(0, 150), 200, 38 + i * 630); } } });
