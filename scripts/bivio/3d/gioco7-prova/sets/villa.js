// La villa isolata di notte: facciata a due piani con le persiane, tetto di coppi, cipressi lungo il viale di ghiaia, colline,
// luna con l'alone e nebbia bassa. Una sola finestra accesa al piano terra: dietro la tenda le sagome degli invitati a tavola.
// Unità: metri; la facciata guarda +z ed è a z = 5; il viale arriva da +z.
import * as G from '../lib/gl.js';
import * as M from '../lib/motion.js';
import { THREE, V, pixelTex, fbmP, fbm, mixc, rnd, aloneTex } from './look.js';

const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function intonaco() {
  const B = hex('#B9A27E'), D = hex('#8E7A5C');
  return pixelTex(512, 512, (x, y, w, h) => { const n = fbmP((x / w) * 6, (y / h) * 6, 6, 3, 5), m = fbmP((x / w) * 40, (y / h) * 40, 40, 8, 2); const c = mixc(mixc(B, D, (1 - n) * 0.7), [70, 60, 48], Math.max(0, 0.45 - n) * 0.6);
    return [c[0], c[1], c[2], 0.5 + (m - 0.5) * 0.3]; }, { rep: [3, 2], forza: 2.5 });
}
function coppi() {
  const B = hex('#8A4A32'), D = hex('#4E2618');
  return pixelTex(512, 512, (x, y, w, h) => { const u = (x / w) * 16, v = (y / h) * 10, fu = u % 1, fv = (v + (Math.floor(u) % 2) * 0.5) % 1, onda = Math.sin(fu * Math.PI), n = fbmP((x / w) * 8, (y / h) * 8, 8, 4, 3);
    const c = mixc(mixc(B, D, (1 - onda) * 0.6 + (fv > 0.88 ? 0.5 : 0)), [40, 30, 26], (1 - n) * 0.4); return [c[0], c[1], c[2], 0.35 + onda * 0.4 - (fv > 0.88 ? 0.3 : 0)]; }, { rep: [3, 2], forza: 3 });
}
function prato() {
  const B = hex('#2A3A22'), D = hex('#121A10');
  return pixelTex(512, 512, (x, y, w, h) => { const n = fbmP((x / w) * 10, (y / h) * 10, 10, 6, 4), f = fbmP((x / w) * 120, (y / h) * 120, 120, 2, 2); const c = mixc(B, D, (1 - n) * 0.8 + (f - 0.5) * 0.4); return [c[0], c[1], c[2], 0.5 + (f - 0.5) * 0.5]; }, { rep: [20, 20], forza: 2 });
}
function ghiaia() {
  const B = hex('#8C8476'), D = hex('#4A453C');
  return pixelTex(512, 512, (x, y, w, h) => { const n = fbmP((x / w) * 64, (y / h) * 64, 64, 9, 3), m = fbmP((x / w) * 6, (y / h) * 6, 6, 2, 3); const k = n > 0.55 ? 1 : 0; const c = mixc(mixc(B, D, (1 - n) * 0.9), [180, 172, 160], k * 0.3); return [c[0], c[1], c[2], 0.3 + n * 0.5]; }, { rep: [2, 30], forza: 3 });
}
// la finestra accesa vista da fuori: luce di candele, tenda leggera, le sagome degli invitati seduti
function finestraAccesa() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512; const c = cv.getContext('2d');
  const g = c.createRadialGradient(128, 330, 10, 128, 300, 300); g.addColorStop(0, '#FFC874'); g.addColorStop(0.4, '#E58A3A'); g.addColorStop(1, '#5A2410'); c.fillStyle = g; c.fillRect(0, 0, 256, 512);
  c.fillStyle = '#1A0C06';                                                           // le sagome: teste e spalle di quattro invitati, il tavolo
  for (const [x, y, s] of [[40, 360, 1.0], [100, 350, 0.9], [168, 352, 0.95], [226, 362, 1.05]]) { c.beginPath(); c.ellipse(x, y - 52 * s, 17 * s, 21 * s, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(x - 46 * s, 430); c.quadraticCurveTo(x - 40 * s, y - 22 * s, x, y - 26 * s); c.quadraticCurveTo(x + 40 * s, y - 22 * s, x + 46 * s, 430); c.fill(); }
  c.fillRect(0, 420, 256, 92);
  for (let i = 0; i < 18; i++) { c.globalAlpha = 0.07; c.fillStyle = '#FFE6C0'; c.fillRect(i * 15, 0, 6, 512); }    // le pieghe della tenda
  c.globalAlpha = 1; const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function villaSet() {
  const scene = new THREE.Scene(), cam = G.camera(34, 0.1, 600);
  scene.background = new THREE.Color(0x060A14); scene.fog = new THREE.FogExp2(0x0B1222, 0.012);
  const ito = intonaco(), cop = coppi(), pr = prato(), gh = ghiaia();
  const muro = new THREE.MeshStandardMaterial({ map: ito.map, normalMap: ito.normalMap, roughness: 0.92, metalness: 0 });
  const tetto = new THREE.MeshStandardMaterial({ map: cop.map, normalMap: cop.normalMap, roughness: 0.85, metalness: 0 });
  const cornice = new THREE.MeshStandardMaterial({ color: 0xCFC3AA, roughness: 0.9 });
  const persiana = new THREE.MeshStandardMaterial({ color: 0x2F4632, roughness: 0.8 });
  const scuro = new THREE.MeshStandardMaterial({ color: 0x0B0E14, roughness: 0.4, metalness: 0.2, envMapIntensity: 0.6 });
  const add = (geo, m, x, y, z, p = scene) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };
  // terreno, viale, colline
  const terra = add(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: pr.map, normalMap: pr.normalMap, roughness: 1 }), 0, 0, 0); terra.rotation.x = -Math.PI / 2;
  const viale = add(new THREE.PlaneGeometry(4.2, 60), new THREE.MeshStandardMaterial({ map: gh.map, normalMap: gh.normalMap, roughness: 1 }), 0, 0.01, 34); viale.rotation.x = -Math.PI / 2;
  const coll = new THREE.Shape(); coll.moveTo(-300, 0); for (let i = 0; i <= 60; i++) { const x = -300 + i * 10; coll.lineTo(x, 22 + 18 * fbm(i * 0.18, 3, 4, 3) + 10 * Math.sin(i * 0.11)); } coll.lineTo(300, 0); coll.lineTo(-300, 0);
  const colline = new THREE.Mesh(new THREE.ShapeGeometry(coll), new THREE.MeshBasicMaterial({ color: 0x0D1424, fog: false })); colline.position.set(0, -2, -160); scene.add(colline);
  // il cielo: stelle e luna con l'alone
  const r = rnd(9), sp = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) { const a = r(-1.2, 1.2), e = r(0.08, 0.9); sp[i * 3] = Math.sin(a) * 280; sp[i * 3 + 1] = Math.sin(e) * 260; sp[i * 3 + 2] = -Math.cos(a) * 280; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.9, color: 0xC8D6FF, transparent: true, opacity: 0.8, fog: false, sizeAttenuation: true })));
  const luna = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.MeshBasicMaterial({ color: 0xF2F0E6, fog: false, toneMapped: false })); luna.position.set(-28, 66, -250); scene.add(luna);
  const alone = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshBasicMaterial({ map: aloneTex(), color: 0x7F9CD8, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false })); alone.position.copy(luna.position).add(V(0, 0, 1)); scene.add(alone);
  // la villa
  const villa = new THREE.Group(); villa.position.set(0, 0, 0); scene.add(villa);
  const W = 15, Hh = 8.6, D = 10, fz = D / 2;
  add(new THREE.BoxGeometry(W, Hh, D), muro, 0, Hh / 2, 0, villa);
  add(new THREE.BoxGeometry(W + 0.3, 0.35, D + 0.3), cornice, 0, Hh + 0.15, 0, villa);                // cornicione
  add(new THREE.BoxGeometry(W + 0.12, 0.18, D + 0.12), cornice, 0, 4.25, 0, villa);                   // marcapiano
  add(new THREE.BoxGeometry(W + 0.2, 0.6, D + 0.2), new THREE.MeshStandardMaterial({ color: 0x6E6252, roughness: 1 }), 0, 0.3, 0, villa);   // zoccolo
  const roof = new THREE.ConeGeometry(Math.hypot(W, D) / 2 + 0.6, 3.4, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1, 1, D / W * 1.0 + 0.02);
  const tet = add(roof, tetto, 0, Hh + 0.32 + 1.7, 0, villa); tet.scale.set(1, 1, 1);
  add(new THREE.BoxGeometry(0.9, 2.2, 0.9), muro, -4.5, Hh + 2.3, -1.5, villa);                         // comignolo
  // finestre: 5 per piano; al piano terra al centro la porta; accesa la seconda a destra
  const winMat = new THREE.MeshBasicMaterial({ map: finestraAccesa() }); winMat.color.setScalar(2.4);
  let accesa = null;
  for (const [y, h] of [[1.0, 2.6], [5.2, 2.2]]) for (let i = 0; i < 5; i++) {
    const x = -5.6 + i * 2.8, porta = y < 2 && i === 2, lit = y < 2 && i === 3, ww = porta ? 1.5 : 1.15, hh = porta ? 2.9 : h;
    add(new THREE.BoxGeometry(ww + 0.36, hh + 0.36, 0.12), cornice, x, y + hh / 2, fz + 0.02, villa);
    const vetro = add(new THREE.PlaneGeometry(ww, hh), lit ? winMat : scuro, x, y + hh / 2, fz + 0.09, villa); vetro.castShadow = false;
    if (lit) accesa = vetro;
    if (!lit && !porta) for (const s of [-1, 1]) { const p = add(new THREE.BoxGeometry(ww / 2, hh, 0.05), persiana, x + s * (ww / 2 + ww / 4 + 0.2), y + hh / 2, fz + 0.1, villa);
      for (let k = 0; k < 14; k++) add(new THREE.BoxGeometry(ww / 2 - 0.04, 0.03, 0.03), new THREE.MeshStandardMaterial({ color: 0x23352A, roughness: 0.85 }), x + s * (ww / 2 + ww / 4 + 0.2), y + 0.1 + k * (hh - 0.2) / 13, fz + 0.14, villa); }
    if (porta) { const pp = add(new THREE.BoxGeometry(ww, hh, 0.08), new THREE.MeshStandardMaterial({ color: 0x2A1A10, roughness: 0.7 }), x, y + hh / 2, fz + 0.12, villa);
      for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(ww + 0.8 + k * 0.6, 0.18, 0.5), cornice, x, 0.09 + k * 0.18 - 0.0, fz + 0.4 + (2 - k) * 0.45, villa); }
  }
  // la luce che esce dalla finestra accesa sul prato e sulla ghiaia
  const lw = new THREE.PointLight(0xFFA050, 26, 14, 2); lw.position.set(2.8, 2.4, fz + 1.2); scene.add(lw);
  const bagliore = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 5.5), new THREE.MeshBasicMaterial({ map: aloneTex(), color: 0xFF9A40, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); bagliore.position.set(2.8, 2.3, fz + 0.2); scene.add(bagliore);
  // cipressi lungo il viale
  const fogliaTex = pixelTex(256, 256, (x, y, w, h) => { const n = fbmP((x / w) * 12, (y / h) * 24, 12, 3, 4), f = fbmP((x / w) * 60, (y / h) * 90, 60, 5, 2); const c = mixc([52, 78, 56], [14, 24, 16], (1 - n) * 0.8 + (f - 0.5) * 0.4); return [c[0], c[1], c[2], n * 0.7 + f * 0.3]; }, { rep: [3, 4], forza: 4 });
  const fogliaM = new THREE.MeshStandardMaterial({ map: fogliaTex.map, normalMap: fogliaTex.normalMap, roughness: 0.95 });
  const prof = []; for (let i = 0; i <= 24; i++) { const k = i / 24; prof.push(new THREE.Vector2(0.95 * Math.sin(Math.PI * Math.pow(k, 0.62)) * (1 - 0.15 * k) + 0.05, k * 9)); }
  const cip = new THREE.LatheGeometry(prof, 18); const pa = cip.attributes.position;
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), a = Math.atan2(z, x), b = 1 + 0.12 * fbm(a * 2 + 5, y * 0.8, 7, 3) - 0.06; pa.setX(i, x * b); pa.setZ(i, z * b); } cip.computeVertexNormals();
  const rr = rnd(21);
  for (let i = 0; i < 9; i++) for (const s of [-1, 1]) { const c = add(cip, fogliaM, s * (3.6 + rr(-0.2, 0.3)), 0, 12 + i * 5.2 + rr(-0.5, 0.5)); const k = 0.85 + rr(0, 0.35); c.scale.set(k, k * (0.9 + rr(0, 0.3)), k); }
  // la luna illumina di blu; un po' di cielo dal basso
  const L = new THREE.DirectionalLight(0x8FA8E8, 2.3); L.position.set(-30, 40, 30); L.target.position.set(0, 0, 10); scene.add(L, L.target);
  L.castShadow = true; L.shadow.mapSize.set(2048, 2048); const sc = L.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 40; sc.bottom = -20; sc.near = 1; sc.far = 140; L.shadow.bias = -0.0006;
  scene.add(new THREE.HemisphereLight(0x3A5080, 0x10140C, 0.9));
  // nebbia bassa: veli che scorrono piano a pelo d'erba
  const nv = document.createElement('canvas'); nv.width = 256; nv.height = 128; const nc = nv.getContext('2d'), ni = nc.createImageData(256, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) { const n = fbmP((x / 256) * 4, (y / 128) * 2, 4, 13, 5), v = Math.sin((y / 128) * Math.PI), i = (y * 256 + x) * 4; ni.data[i] = 215; ni.data[i + 1] = 225; ni.data[i + 2] = 245; ni.data[i + 3] = Math.min(255, Math.max(0, n - 0.35) * 1.6 * v * 255); }
  nc.putImageData(ni, 0, 0); const nebTex = new THREE.CanvasTexture(nv); nebTex.colorSpace = THREE.SRGBColorSpace; nebTex.wrapS = THREE.RepeatWrapping;
  const veli = []; for (let i = 0; i < 7; i++) { const m = new THREE.MeshBasicMaterial({ map: nebTex, color: 0x8EA2C8, transparent: true, opacity: 0.22, depthWrite: false });
    const v = new THREE.Mesh(new THREE.PlaneGeometry(60, 3.5), m); v.position.set(0, 0.7 + (i % 3) * 0.35, -6 - i * 9); scene.add(v); veli.push(v); }
  return { scene, camera: cam, bloom: 0.8, bloomThreshold: 1.25, bloomRadius: 0.6,
    update(t, u, o = {}) {
      G.R.toneMappingExposure = 1.3; cam.position.set(...(o.cam || [0, 2, 30])); cam.up.set(...(o.up || [0, 1, 0])).normalize(); cam.lookAt(...(o.look || [0, 3, 0])); if (o.fov) { cam.fov = o.fov; cam.updateProjectionMatrix(); }
      veli.forEach((v, i) => { v.position.x = Math.sin(t * 0.05 + i) * 4 + (i % 2 ? 1 : -1) * t * 0.25; });
      lw.intensity = 26 * (0.92 + 0.08 * M.noise1(t * 5, 3));
      // avvicinandosi alla finestra accesa la sua luce resta arancione (niente lampo bianco quando riempie il quadro)
      const d = cam.position.distanceTo(accesa.getWorldPosition(V(0, 0, 0))), vic = Math.max(0, Math.min(1, (16 - d) / 12));
      winMat.color.setScalar(2.4 - 1.5 * vic); bagliore.material.opacity = 0.5 * (1 - vic); this.bloom = 0.8 * (1 - 0.75 * vic);
    } };
}
