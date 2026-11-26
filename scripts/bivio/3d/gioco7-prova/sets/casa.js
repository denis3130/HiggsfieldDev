// Casa di Leon, tre giorni prima (episodio 1): l'ingresso la mattina. La porta con la lama di luce del pianerottolo sotto, la busta che
// scivola dentro, la mano di Leon (la mano modellata) che la gira, il cartoncino battuto a macchina, la mensola con la foto di Clara e il
// ritaglio di giornale, le chiavi della macchina. Più in là (x = 20) la scrivania della questura col verbale firmato dieci anni fa.
// Unità: metri. La porta è nel piano z = 0, la casa sta dalla parte +z; la mensola è sulla parete di sinistra (x = -1.2).
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { THREE, V, MAT, materiali, legno, pixelTex, fbm, aloneTex, pulviscolo, fascio, rnd } from './look.js';
import { manoMesh, posaDaPupazzo, POLSO } from '../../cast/sets/mano_mesh.js';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// ---- una tela di carta (avorio o bianca) con le fibre, su cui si scrive
export function carta(w, h, { base = [236, 228, 210], seed = 3, vecchia = 0 } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'), im = c.createImageData(w, h), r = rnd(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm(x / 40, y / 40, seed, 3), f = fbm(x / 3, y / 3, seed + 5, 2), bordo = Math.min(x, y, w - 1 - x, h - 1 - y) / Math.min(w, h);
    const g = vecchia * (0.25 * (1 - sm(0, 0.18, bordo)) + 0.18 * n); const i = (y * w + x) * 4;
    im.data[i] = base[0] * (0.94 + 0.06 * f) - 40 * g; im.data[i + 1] = base[1] * (0.94 + 0.06 * f) - 55 * g; im.data[i + 2] = base[2] * (0.93 + 0.07 * f) - 85 * g; im.data[i + 3] = 255; }
  c.putImageData(im, 0, 0); return { cv, c };
}
const tex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
// scrive a macchina: ogni lettera un po' storta e con l'inchiostro non uniforme
function macchina(c, testo, x, y, size, { col = '20,16,14', seed = 1, centro = false } = {}) {
  const r = rnd(seed); c.font = `${size}px Macchina`; c.textBaseline = 'alphabetic'; let X = centro ? x - c.measureText(testo).width / 2 : x;
  for (const ch of testo) { c.fillStyle = `rgba(${col},${0.72 + r() * 0.26})`; c.save(); c.translate(X, y + r(-0.6, 0.6) * size * 0.03); c.rotate(r(-0.02, 0.02)); c.fillText(ch, 0, 0); c.restore(); X += c.measureText(ch).width; }
}

// ---- la busta: davanti «LEON» a macchina, dietro la patta (e nessun mittente)
function busta() {
  const f = carta(640, 320, { seed: 21 }), b = carta(640, 320, { seed: 22 });
  macchina(f.c, 'LEON', 320, 190, 64, { centro: true, seed: 4 });
  b.c.strokeStyle = 'rgba(120,100,70,0.45)'; b.c.lineWidth = 3; b.c.beginPath(); b.c.moveTo(0, 0); b.c.lineTo(320, 190); b.c.lineTo(640, 0); b.c.stroke();
  b.c.fillStyle = 'rgba(150,120,80,0.12)'; b.c.beginPath(); b.c.moveTo(0, 0); b.c.lineTo(320, 190); b.c.lineTo(640, 0); b.c.fill();
  const m = (t) => new THREE.MeshStandardMaterial({ map: tex(t.cv), roughness: 0.85, metalness: 0, envMapIntensity: 0.2 }), lato = new THREE.MeshStandardMaterial({ color: 0xE8DFC8, roughness: 0.9 });
  const g = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.003, 0.11), [lato, lato, m(f), m(b), lato, lato]); g.castShadow = true; g.receiveShadow = true;
  g.material[3].map.flipY = true; return g;
}
// ---- il cartoncino: l'indirizzo, la data e la frase
function cartoncino() {
  const p = carta(1200, 800, { base: [242, 238, 228], seed: 31 }), c = p.c;
  macchina(c, 'VILLA CASSANI', 110, 170, 76, { seed: 7 });
  macchina(c, 'Strada delle Fornaci, 7', 110, 260, 60, { seed: 8 });
  macchina(c, '14 luglio, ore 21:00', 110, 340, 56, { seed: 9 });
  macchina(c, 'So chi ha ucciso tua sorella.', 110, 600, 66, { seed: 10, col: '70,10,12' });
  const g = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.0015, 0.1), [0, 0, 0, 0, 0, 0].map((_, i) => i === 2 ? new THREE.MeshStandardMaterial({ map: tex(p.cv), roughness: 0.8, envMapIntensity: 0.2 }) : new THREE.MeshStandardMaterial({ color: 0xEDE7DA, roughness: 0.85 })));
  g.castShadow = true; g.receiveShadow = true; return g;
}
// ---- il ritaglio di giornale: testata, titolo, sottotitolo, colonne di testo, la foto dell'auto fuori strada
function ritaglio() {
  const p = carta(900, 1100, { base: [226, 216, 190], seed: 41, vecchia: 1 }), c = p.c;
  c.fillStyle = 'rgba(30,26,22,0.9)'; c.font = 'bold 30px "DejaVu Serif"'; c.fillText('CRONACA', 50, 70); c.font = '24px "DejaVu Serif"'; c.fillText('Venerdì 15 luglio 2016', 600, 70);
  c.fillRect(50, 84, 800, 3);
  c.font = 'bold 74px "DejaVu Serif"'; c.fillText('Muore a vent\'anni', 50, 180); c.fillText('sulla provinciale', 50, 262);
  c.font = 'italic 30px "DejaVu Serif"'; c.fillText('L\'auto finisce fuori strada di notte, vicino alle vecchie', 50, 316); c.fillText('fornaci. Inutili i soccorsi: la ragazza era sola.', 50, 354);
  // la foto: l'auto ribaltata nel fosso, in bianco e nero sgranato
  const fx = 50, fy = 390, fw = 800, fh = 360, gr = c.createLinearGradient(0, fy, 0, fy + fh); gr.addColorStop(0, '#6A6660'); gr.addColorStop(0.55, '#3A3834'); gr.addColorStop(1, '#22211E'); c.fillStyle = gr; c.fillRect(fx, fy, fw, fh);
  c.fillStyle = '#18171499'; c.beginPath(); c.moveTo(fx, fy + 250); c.quadraticCurveTo(fx + 400, fy + 180, fx + fw, fy + 230); c.lineTo(fx + fw, fy + fh); c.lineTo(fx, fy + fh); c.fill();
  c.fillStyle = '#0E0D0C'; c.save(); c.translate(fx + 420, fy + 250); c.rotate(-0.35); c.beginPath(); c.roundRect(-150, -55, 300, 90, 28); c.fill(); c.beginPath(); c.roundRect(-90, -100, 170, 60, 20); c.fill();
  c.fillStyle = '#2A2826'; for (const x of [-95, 95]) { c.beginPath(); c.arc(x, 40, 34, 0, Math.PI * 2); c.fill(); } c.restore();
  for (let i = 0; i < 9000; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'; c.fillRect(fx + Math.random() * fw, fy + Math.random() * fh, 2, 2); }
  c.fillStyle = 'rgba(30,26,22,0.85)'; c.font = '19px "DejaVu Serif"';
  const righe = ['Tragedia nella notte tra giovedì e venerdì sulla', 'strada provinciale che costeggia le vecchie fornaci', 'abbandonate. La vittima, Clara, vent\'anni, era al', 'volante della propria utilitaria quando, per cause', 'ancora da chiarire, ha perso il controllo del mezzo', 'finendo nel fosso. L\'allarme è stato dato soltanto', 'all\'alba da un automobilista di passaggio.',
    'Gli inquirenti non escludono alcuna ipotesi.', 'La ragazza era uscita in serata senza dire', 'dove andava. Nessun testimone.'];
  righe.forEach((t, i) => c.fillText(t, i < 7 ? 50 : 470, 800 + (i < 7 ? i : i - 7) * 32 - (i < 7 ? 0 : 0)));
  const m = new THREE.MeshStandardMaterial({ map: tex(p.cv), roughness: 0.9, side: THREE.DoubleSide, envMapIntensity: 0.15 });
  const geo = new THREE.PlaneGeometry(0.16, 0.195, 12, 12); { const q = geo.attributes.position; for (let i = 0; i < q.count; i++) q.setZ(i, 0.004 * Math.sin(q.getX(i) * 30) * Math.cos(q.getY(i) * 20)); geo.computeVertexNormals(); }
  const g = new THREE.Mesh(geo, m); g.castShadow = true; return g;
}
// ---- la foto di Clara nella cornice: controluce al tramonto sul mare, il vento nei capelli (non si vede il viso)
function fotoClara() {
  const cv = document.createElement('canvas'); cv.width = 600; cv.height = 800; const c = cv.getContext('2d');
  const cielo = c.createLinearGradient(0, 0, 0, 800); cielo.addColorStop(0, '#3A3A6A'); cielo.addColorStop(0.35, '#C8645A'); cielo.addColorStop(0.55, '#F2A65A'); cielo.addColorStop(0.62, '#FFD9A0'); cielo.addColorStop(0.63, '#5A4A5A'); cielo.addColorStop(1, '#2A2230');
  c.fillStyle = cielo; c.fillRect(0, 0, 600, 800); const sole = c.createRadialGradient(380, 480, 0, 380, 480, 140); sole.addColorStop(0, 'rgba(255,245,220,1)'); sole.addColorStop(0.3, 'rgba(255,220,160,0.7)'); sole.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = sole; c.fillRect(0, 300, 600, 400);
  for (let i = 0; i < 40; i++) { c.strokeStyle = `rgba(255,220,170,${0.15 + Math.random() * 0.2})`; c.lineWidth = 1.5; const y = 510 + i * 7; c.beginPath(); c.moveTo(200 + Math.random() * 100, y); c.lineTo(380 + Math.random() * 120, y); c.stroke(); }
  // la sagoma: ragazza di spalle (tre quarti) che guarda il mare; collo, spalle, capelli lunghi sciolti sulla schiena, qualche ciocca nel vento
  c.fillStyle = '#140E12';
  c.beginPath(); c.moveTo(70, 800); c.bezierCurveTo(90, 690, 150, 640, 235, 622); c.lineTo(265, 560); c.lineTo(315, 560); c.bezierCurveTo(330, 600, 350, 625, 420, 640); c.bezierCurveTo(500, 660, 540, 720, 560, 800); c.closePath(); c.fill();
  c.beginPath(); c.ellipse(285, 470, 66, 82, 0.12, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(352, 455); c.quadraticCurveTo(366, 478, 352, 492); c.fill();
  c.beginPath(); c.moveTo(220, 420); c.bezierCurveTo(215, 380, 260, 372, 300, 382); c.bezierCurveTo(345, 392, 356, 430, 348, 470); c.bezierCurveTo(340, 520, 330, 560, 318, 600);
  c.bezierCurveTo(300, 660, 250, 700, 200, 690); c.bezierCurveTo(170, 640, 190, 560, 205, 500); c.closePath(); c.fill();
  c.strokeStyle = '#140E12'; c.lineCap = 'round';
  for (let i = 0; i < 18; i++) { const y0 = 400 + i * 14, a = 0.4 + (i % 5) * 0.12; c.lineWidth = 3 - (i % 3) * 0.6; c.beginPath(); c.moveTo(250, y0); c.bezierCurveTo(200, y0 + 30, 150 - i * 3, y0 + 40 + a * 40, 110 - i * 4, y0 + 20 + Math.sin(i * 1.7) * 25); c.stroke(); }
  const g = c.createRadialGradient(300, 400, 200, 300, 400, 520); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,20,10,0.45)'); c.fillStyle = g; c.fillRect(0, 0, 600, 800);
  return cv;
}
// ---- il verbale della questura (dieci anni fa): la dichiarazione battuta a macchina e la firma di Leon
function verbale() {
  const p = carta(1240, 1754, { base: [240, 238, 232], seed: 51, vecchia: 0.4 }), c = p.c;
  macchina(c, 'QUESTURA - SQUADRA MOBILE', 620, 150, 46, { centro: true, seed: 2 });
  macchina(c, 'VERBALE DI SOMMARIE INFORMAZIONI', 620, 220, 46, { centro: true, seed: 3 });
  const testo = ['L\'anno 2016, il giorno 16 del mese di luglio,', 'alle ore 10:40, negli uffici di questa Questura,', 'e\' presente LEON, fratello della vittima,', 'il quale, in merito ai fatti della notte', 'del 14 luglio, spontaneamente dichiara:', '', '"Quella sera non ho visto mia sorella.', 'Dichiaro di non essere mai stato', 'alla fornace."', '', 'Letto, confermato e sottoscritto.'];
  testo.forEach((t, i) => macchina(c, t, 130, 380 + i * 82, 44, { seed: 20 + i }));
  c.fillStyle = 'rgba(24,30,70,0.9)'; c.font = '700 96px Mano'; c.save(); c.translate(700, 1420); c.rotate(-0.06); c.fillText('Leon', 0, 0); c.restore();
  c.strokeStyle = 'rgba(24,30,70,0.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(690, 1440); c.bezierCurveTo(800, 1430, 900, 1460, 980, 1420); c.stroke();
  macchina(c, 'Il dichiarante', 700, 1520, 36, { seed: 40 });
  c.strokeStyle = 'rgba(140,30,30,0.55)'; c.lineWidth = 6; c.beginPath(); c.arc(300, 1450, 110, 0, Math.PI * 2); c.stroke(); c.lineWidth = 2; c.beginPath(); c.arc(300, 1450, 90, 0, Math.PI * 2); c.stroke();
  c.fillStyle = 'rgba(140,30,30,0.5)'; c.font = '26px "DejaVu Serif"'; c.textAlign = 'center'; c.fillText('QUESTURA', 300, 1440); c.fillText('UFF. DENUNCE', 300, 1475); c.textAlign = 'left';
  const m = new THREE.MeshStandardMaterial({ map: tex(p.cv), roughness: 0.85, envMapIntensity: 0.15 });
  const g = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), m); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; return g;
}
// ---- la mano di Leon (quella modellata) con la manica della giacca: gruppo con il polso nell'origine, dita verso -z, dorso in su
export function manoLeon({ pelle = '#D9A07E', manica = 0x2A2C31, posa = 'rilassata', lato = 1 } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, sheen: 0.4, sheenColor: new THREE.Color(0xFF9A80), sheenRoughness: 0.6, envMapIntensity: 0.35 });
  const m = manoMesh({ skin: pelle, unghia: '#E3BBA8', livelli: 2, materiale: mat, avambraccio: { lungo: 0.24, gomito: 0.04 } });
  m.userData.posa(posaDaPupazzo(posa)); m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const X = new THREE.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, 1), V(lato, 0, 0)).scale(V(1.1, 1.1, 1.1)); X.setPosition(POLSO.clone().applyMatrix4(X).negate()); m.matrixAutoUpdate = false; m.matrix.copy(X);
  const g = new THREE.Group(); g.add(m);
  const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.058, 0.36, 28, 1, true), new THREE.MeshStandardMaterial({ color: manica, roughness: 0.88, side: THREE.DoubleSide, envMapIntensity: 0.2 }));
  sl.rotation.x = Math.PI / 2; sl.position.z = 0.06 + 0.18; sl.castShadow = true; g.add(sl);
  const polsino = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.044, 0.026, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x4A4E57, roughness: 0.7, side: THREE.DoubleSide })); polsino.rotation.x = Math.PI / 2; polsino.position.z = 0.055; g.add(polsino);
  g.userData.mano = m; g.userData.posa = (p) => m.userData.posa(posaDaPupazzo(p)); return g;
}

export function casaSet() {
  materiali();
  const scene = new THREE.Scene(), cam = G.camera(40, 0.01, 60);
  scene.background = new THREE.Color(0x0A0A0C); scene.environment = G.ENV; scene.environmentIntensity = 0.25;
  const add = (geo, m, x, y, z, ombra = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = ombra; o.receiveShadow = true; scene.add(o); return o; };
  // pavimento a listoni chiari (rovere), pareti chiare, battiscopa
  const par = legno({ seed: 61, base: '#8A6A48', scuro: '#5A4028', chiaro: '#A88560', venature: 30, assi: 6, rep: [7, 7] });
  const pav = add(new THREE.PlaneGeometry(5, 5), new THREE.MeshStandardMaterial({ map: par.map, normalMap: par.normalMap, roughnessMap: par.roughnessMap, roughness: 1, envMapIntensity: 0.4 }), 0, 0, 1.5, false); pav.rotation.x = -Math.PI / 2;
  const intM = new THREE.MeshStandardMaterial({ color: 0xCFC6B8, roughness: 0.92 });
  for (const s of [-1, 1]) { add(new THREE.BoxGeometry(1.6, 2.8, 0.12), intM, s * (0.48 + 0.8), 1.4, -0.06); }
  add(new THREE.BoxGeometry(0.96, 0.42, 0.12), intM, 0, 2.59, -0.06);
  const lato = add(new THREE.BoxGeometry(0.12, 2.8, 4), intM, -1.26, 1.4, 1.9);
  // la porta di casa (chiusa), con la fessura sotto da cui entra la luce del pianerottolo
  const portaL = legno({ seed: 71, base: '#5A3C26', scuro: '#2E1C10', chiaro: '#7A5434', venature: 30 });
  portaL.map.wrapS = portaL.map.wrapT = portaL.normalMap.wrapS = portaL.normalMap.wrapT = THREE.RepeatWrapping; portaL.map.repeat.set(1, 3); portaL.normalMap.repeat.set(1, 3);
  const porta = add(new THREE.BoxGeometry(0.9, 2.12, 0.05), new THREE.MeshStandardMaterial({ map: portaL.map, normalMap: portaL.normalMap, roughness: 0.55, envMapIntensity: 0.4 }), 0, 0.018 + 1.06, -0.02);
  const maniglia = add(new THREE.CylinderGeometry(0.01, 0.01, 0.13, 12), MAT.ottone, 0.34, 1.02, 0.03); maniglia.rotation.z = Math.PI / 2;
  // la lama di luce sotto la porta (finta: un ventaglio luminoso sul pavimento) e il pianerottolo illuminato dietro
  const cvL = document.createElement('canvas'); cvL.width = 256; cvL.height = 256; { const c = cvL.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,236,200,0.95)'); g.addColorStop(0.08, 'rgba(255,226,180,0.55)'); g.addColorStop(0.5, 'rgba(255,210,160,0.12)'); g.addColorStop(1, 'rgba(255,200,150,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256);
    const h = c.createLinearGradient(0, 0, 256, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.15, 'rgba(0,0,0,0)'); h.addColorStop(0.85, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); c.globalCompositeOperation = 'destination-out'; c.fillStyle = h; c.fillRect(0, 0, 256, 256); }
  const lama = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshBasicMaterial({ map: tex(cvL), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); lama.rotation.x = -Math.PI / 2; lama.position.set(0, 0.0015, 0.25); scene.add(lama);
  const fuori = new THREE.PointLight(0xFFE2B8, 0.02, 0.6, 2); fuori.position.set(0, 0.006, 0.01); scene.add(fuori);
  const pianer = add(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ color: 0xFFF0D8 }), 0, 0.001, -0.35, false); pianer.rotation.x = -Math.PI / 2;
  // la luce del mattino dalla finestra (a destra, fuori campo): sole basso, caldo, col pulviscolo
  const sole = new THREE.DirectionalLight(0xFFE0B0, 2.2); sole.position.set(3, 2.4, 2.2); sole.target.position.set(-0.6, 0.6, 0.6); scene.add(sole, sole.target);
  sole.castShadow = true; sole.shadow.mapSize.set(2048, 2048); const sc = sole.shadow.camera; sc.left = -2; sc.right = 2; sc.top = 2; sc.bottom = -2; sc.near = 0.5; sc.far = 9; sole.shadow.bias = -0.0003; sole.shadow.normalBias = 0.01;
  scene.add(new THREE.HemisphereLight(0xB8C8E0, 0x4A3828, 0.35));
  const polvere = pulviscolo(scene, { n: 400, centro: V(0.2, 1.0, 0.9), lungo: V(-1.0, -0.6, -0.4), largo: 0.5, alto: 0.7, colore: 0xFFE8C8, dim: 0.008 });
  // la busta, il cartoncino
  const B = busta(); scene.add(B);
  const K = cartoncino(); scene.add(K);
  // la consolle sotto la mensola: piano di legno, la ciotola con le chiavi; sopra, la mensola con la foto e il ritaglio
  const cons = new THREE.Group(); cons.position.set(-1.0, 0, 1.4); cons.rotation.y = Math.PI / 2; scene.add(cons);
  const legnoC = legno({ seed: 81, base: '#4A2E1A', scuro: '#24140A', chiaro: '#6A4428', venature: 20 }), legnoM = new THREE.MeshStandardMaterial({ map: legnoC.map, normalMap: legnoC.normalMap, roughness: 0.5, envMapIntensity: 0.4 });
  const box = (w, h, d, x, y, z, m, p) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; p.add(b); return b; };
  box(0.9, 0.03, 0.32, 0, 0.86, 0, legnoM, cons); for (const x of [-0.42, 0.42]) for (const z of [-0.13, 0.13]) box(0.03, 0.86, 0.03, x, 0.43, z, legnoM, cons);
  box(0.8, 0.025, 0.2, 0, 1.38, -0.06, legnoM, cons);
  const ciotola = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.075, 0.02], [0.085, 0.04], [0.082, 0.042], [0.07, 0.022], [0, 0.008]].map(([x, y]) => new THREE.Vector2(x, y)), 32), new THREE.MeshPhysicalMaterial({ color: 0x2A3A4A, roughness: 0.2, clearcoat: 1, envMapIntensity: 0.6 }));
  ciotola.position.set(0.22, 0.875, 0.02); ciotola.castShadow = true; cons.add(ciotola);
  // le chiavi: anello, due chiavi e il telecomando dell'auto
  const chiavi = new THREE.Group(); chiavi.position.set(0.22, 0.89, 0.02); cons.add(chiavi);
  { const anello = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0016, 8, 28), MAT.argento); anello.rotation.x = Math.PI / 2; chiavi.add(anello);
    for (const [a, l] of [[0.4, 0.06], [1.2, 0.05]]) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, l), MAT.argento); k.position.set(Math.sin(a) * (0.014 + l / 2), 0.002, Math.cos(a) * (0.014 + l / 2)); k.rotation.y = a; chiavi.add(k); }
    const fob = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.06), new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.35, metalness: 0.2 })); fob.position.set(-0.03, 0.004, -0.03); fob.rotation.y = -0.6; chiavi.add(fob); }
  cons.updateMatrixWorld(true); scene.attach(chiavi);                  // le chiavi nel mondo: la mano le porta via
  // la cornice con la foto di Clara e il ritaglio appoggiato accanto
  const cornice = new THREE.Group(); cornice.position.set(-0.12, 1.4, -0.08); cornice.rotation.x = -0.12; cons.add(cornice);
  box(0.17, 0.22, 0.012, 0, 0.11, 0, MAT.ottone, cornice);
  const foto = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.187), new THREE.MeshStandardMaterial({ map: tex(fotoClara()), roughness: 0.3, envMapIntensity: 0.5 })); foto.position.set(0, 0.11, 0.0065); cornice.add(foto);
  const vetro = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.187), MAT.vetro); vetro.position.set(0, 0.11, 0.008); cornice.add(vetro);
  const R = ritaglio(); R.position.set(0.14, 1.4 + 0.1, -0.11); R.rotation.set(-0.1, 0, 0.05); cons.add(R);
  // la mano di Leon
  const mano = manoLeon({ posa: 'tessera' }); scene.add(mano);
  const CH0 = { p: chiavi.position.clone(), q: chiavi.quaternion.clone() };
  // ---- la questura (x = 20): scrivania di metallo, la lampada, il verbale e la penna
  const Q = new THREE.Group(); Q.position.set(20, 0, 0); scene.add(Q);
  box(1.4, 0.04, 0.8, 0, 0.76, 0, new THREE.MeshStandardMaterial({ color: 0x5A6066, roughness: 0.6, metalness: 0.6, envMapIntensity: 0.4 }), Q);
  const vb = verbale(); vb.position.set(0, 0.781, 0.05); vb.rotation.z = 0.08; Q.add(vb);
  const penna = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.14, 12), new THREE.MeshStandardMaterial({ color: 0x14204A, roughness: 0.3, metalness: 0.3 })); penna.rotation.set(Math.PI / 2, 0, 0.9); penna.position.set(0.17, 0.787, 0.1); Q.add(penna);
  const lamp = new THREE.SpotLight(0xDCE8FF, 0.9, 3, 0.6, 0.7, 2); lamp.position.set(-0.35, 1.3, -0.2); lamp.target.position.set(0, 0.78, 0.05); Q.add(lamp, lamp.target); lamp.castShadow = true;
  const fondoQ = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshStandardMaterial({ color: 0x2A2E30, roughness: 0.9 })); fondoQ.position.set(0, 1.5, -1.2); Q.add(fondoQ);
  return {
    scene, camera: cam, bloom: 0.5, bloomThreshold: 1.2, bloomRadius: 0.5, busta: B, cartoncino: K, chiavi, cons, mano, polvere,
    // o.casa = { busta: [x,y,z,rx,ry,rz] o null, cartoncino: [...] o null, mano: { pos, rot, posa } o null, chiavi: matrice o null }
    update(t, u, o = {}) {
      G.R.toneMappingExposure = 1.0; cam.position.set(...(o.cam || [0, 1, 2])); cam.up.set(...(o.up || [0, 1, 0])).normalize(); cam.lookAt(...(o.look || [0, 0, 0])); if (o.fov) { cam.fov = o.fov; cam.updateProjectionMatrix(); }
      const c = o.casa || {}, metti = (ob, q) => { ob.visible = !!q; if (q) { ob.position.set(q[0], q[1], q[2]); ob.rotation.set(q[3] || 0, q[4] || 0, q[5] || 0); } };
      metti(B, c.busta); metti(K, c.cartoncino); metti(mano, c.mano);
      if (c.manoPosa && c.manoPosa !== mano.userData.ora) { mano.userData.posa(c.manoPosa); mano.userData.ora = c.manoPosa; }
      if (c.chiaviInMano) { chiavi.position.copy(mano.position).add(V(0, -0.07, -0.02)); chiavi.rotation.set(1.3, 0.4, 0.2); } else { chiavi.position.copy(CH0.p); chiavi.quaternion.copy(CH0.q); }
      polvere.update(t);
    },
  };
}
