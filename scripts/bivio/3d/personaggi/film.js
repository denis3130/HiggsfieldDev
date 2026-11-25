// Prova dei personaggi v2 in studio: la nonna e il ragazzo, corpo intero, primi piani ed espressioni.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { nonna2, ragazzo, tex } from './sets/personaggi.js';
const THREE = G.THREE;
let S = null;
function studio() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x3a2a20);
  const cam = G.camera(30, 0.02, 60);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshStandardMaterial({ roughness: 0.9, map: tex(512, 256, (c, w, h) => { for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#6b3f24' : '#7a4a2b'; c.fillRect(i * w / 12, 0, w / 12, h); } }) }));
  back.position.set(0, 2, -1.2); scene.add(back);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshStandardMaterial({ color: 0x5b3a24, roughness: 0.8 })); fl.rotation.x = -Math.PI / 2; scene.add(fl);
  const key = new THREE.DirectionalLight(0xffd9b0, 1.5); key.position.set(1.6, 2.6, 2.4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xbcd0ff, 0.45); fill.position.set(-2, 1.6, 1.5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffb070, 1.0); rim.position.set(-1.5, 2.2, -2); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffeedd, 0x2a1a12, 0.65));
  const N = nonna2(), R = ragazzo(); scene.add(N.group, R.group);
  return { scene, camera: cam, bloom: 0, update(t, u, o) {
    N.group.visible = o.who !== 'r'; R.group.visible = o.who !== 'n';
    N.pose({ pos: o.who === 'both' ? [-0.38, 0, 0] : [0, 0, 0], yaw: o.who === 'both' ? 0.35 : 0, breathe: Math.sin(t * 2), ...(o.n || {}) });
    R.pose({ pos: o.who === 'both' ? [0.42, 0, 0.1] : [0, 0, 0], yaw: o.who === 'both' ? -0.45 : 0, breathe: Math.sin(t * 2.3), ...(o.r || {}) });
    G.lookFrom(cam, o.cam, o.look); cam.fov = o.fov; cam.updateProjectionMatrix();
  } };
}
M.film({ fonts: [], samples: 1,
  async init() { await G.initGL({ exposure: 1.0 }); S = studio(); },
  draw(ctx, u, t) {
    const shots = [
      { who: 'n', cam: [0.8, 1.05, 3.1], look: [0, 0.8, 0], fov: 32 },
      { who: 'n', cam: [0, 1.55, 1.0], look: [0, 1.52, 0.08], fov: 26 },
      { who: 'n', cam: [0.35, 1.56, 0.95], look: [0, 1.52, 0.08], fov: 26, n: { smile: 1, gazeX: 0.2 } },
      { who: 'n', cam: [-0.25, 1.55, 0.95], look: [0, 1.52, 0.08], fov: 26, n: { mouth: 0.8, browUp: 1, eyesOpen: 0.9, armR: { fwd: -1.1, out: -0.35, bend: 1.7, wz: 0.4, hand: { curl: 0, point: true } } } },
      { who: 'r', cam: [0.8, 1.15, 3.6], look: [0, 0.95, 0], fov: 32 },
      { who: 'r', cam: [0, 1.75, 1.05], look: [0, 1.72, 0.08], fov: 26, r: { fear: 1, mouth: 0.35, gazeX: -0.3 } },
      { who: 'r', cam: [0.35, 1.76, 1.0], look: [0, 1.72, 0.08], fov: 26, r: { smile: 1, mouth: 0.6, squint: 0.6 } },
      { who: 'both', cam: [0.05, 1.45, 2.6], look: [0, 1.3, 0], fov: 34, n: { smile: 0.8, headYaw: 0.25 }, r: { mouth: 0.4, browUp: 0.5, headYaw: -0.3 } },
    ];
    G.renderSet(ctx, S, t, u, shots[Math.min(7, Math.floor(t))]);
  } });
