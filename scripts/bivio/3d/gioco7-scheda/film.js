// Scheda dei sette de «Il gioco dei sette» nell'aspetto del video A: ogni personaggio in uno studio con luce morbida,
// di fronte (secondo pari) e di tre quarti (secondo dispari). Le immagini le impagina scheda.py.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { THREE } from './sets/look.js';
import { busto } from './sets/personaggi.js';
const NOMI = ['leon', 'victor', 'elena', 'marcus', 'nora', 'adrian', 'sophie'];
let S = null;
async function studio() {
  const scene = new THREE.Scene(), cam = G.camera(24, 0.02, 40);
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 256; const c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#2B3340'); g.addColorStop(0.55, '#4A5462'); g.addColorStop(1, '#1E242C'); c.fillStyle = g; c.fillRect(0, 0, 16, 256);
  const bg = new THREE.CanvasTexture(cv); bg.colorSpace = THREE.SRGBColorSpace; scene.background = bg; scene.environment = G.ENV; scene.environmentIntensity = 0.3;
  const key = new THREE.DirectionalLight(0xFFE0C4, 2.3); key.position.set(-1.2, 1.4, 2.2); scene.add(key);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = -0.4; sc.right = 0.4; sc.top = 0.4; sc.bottom = -0.4; sc.near = 0.5; sc.far = 6; key.shadow.bias = -0.0003; key.shadow.normalBias = 0.01;
  const rim = new THREE.DirectionalLight(0x9FB8FF, 1.6); rim.position.set(1.5, 0.8, -1.6); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xC0CCE0, 0x3A2A22, 0.32)); const fill = new THREE.DirectionalLight(0xB8C8FF, 0.5); fill.position.set(1.6, 0.2, 1.4); scene.add(fill);
  const B = {}; for (const n of NOMI) { try { B[n] = await busto(n); } catch (e) { B[n] = new THREE.Group(); } B[n].visible = false; scene.add(B[n]); }
  return { scene, camera: cam, bloom: 0, update(t) {
    const i = Math.min(NOMI.length - 1, Math.floor(t / 2)), tre = Math.floor(t) % 2 === 1;
    for (const n of NOMI) B[n].visible = n === NOMI[i];
    const b = B[NOMI[i]]; b.rotation.y = tre ? 0.6 : 0.0;
    G.R.toneMappingExposure = 0.95; cam.position.set(0, 0.02, 1.16); cam.up.set(0, 1, 0); cam.lookAt(0, -0.02, 0); cam.fov = 24; cam.updateProjectionMatrix();
  } };
}
M.film({ fonts: [M.font(60, 800, 'Sub')], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); S = await studio(); },
  draw(ctx, u, t) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, M.W, M.H); G.renderSet(ctx, S, t, u, {}); },
});
