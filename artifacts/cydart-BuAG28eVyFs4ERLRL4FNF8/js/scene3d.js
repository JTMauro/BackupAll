/* CydArt 3D scene: Cydni intro (twist, camera, flash, snapshot), then the Home backdrop. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const CP = window.CP;
window.__cpSceneReady = true;
const canvas = document.getElementById('gl');
const flashEl = document.getElementById('flash');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const skipped = () => CP.prefs.skipIntro || reduceMotion;

/* ---------- renderer ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 600);

scene.add(new THREE.HemisphereLight(0xdff3ff, 0x2a3644, 0.6));
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(-6, 30, 14); key.target.position.set(0, 6, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -22, right: 22, top: 24, bottom: -14, near: 2, far: 80 });
key.shadow.radius = 10; key.shadow.blurSamples = 14; key.shadow.bias = -0.0006; key.shadow.normalBias = 0.06;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0x9fdcff, 1.6); rim.position.set(10, 12, -16); scene.add(rim);
const fillL = new THREE.DirectionalLight(0xffffff, 0.55); fillL.position.set(14, 6, 10); scene.add(fillL);
const flashLight = new THREE.PointLight(0xffffff, 0, 80, 1.4); scene.add(flashLight);

/* ---------- painted art backdrop ---------- */
function artTexture() {
  const W = 4096, H = 2048, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1220'); bg.addColorStop(0.55, '#131d2c'); bg.addColorStop(1, '#0d131b'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pal = ['#12bde6', '#10e0c0', '#cddb28', '#38bdf8', '#0096dc', '#7c5cff', '#ff5a7a', '#ffb347', '#ffffff'];
  // big soft color clouds
  for (let i = 0; i < 26; i++) { const x = rnd() * W, y = H * (0.15 + rnd() * 0.6), r = 200 + rnd() * 500, col = pal[(rnd() * pal.length) | 0]; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col + '33'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  // sweeping brush strokes (bristle texture)
  g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const col = pal[(rnd() * pal.length) | 0], x0 = rnd() * W, y0 = H * (0.12 + rnd() * 0.66), len = 300 + rnd() * 900, ang = (rnd() - 0.5) * 1.2, wdt = 10 + rnd() * 70;
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len, cx = (x0 + x1) / 2 + (rnd() - 0.5) * 300, cy = (y0 + y1) / 2 + (rnd() - 0.5) * 300;
    for (let b = 0; b < 9; b++) { const o = (b / 8 - 0.5) * wdt; g.strokeStyle = col; g.globalAlpha = 0.05 + rnd() * 0.12; g.lineWidth = wdt / 6 + rnd() * 4; g.beginPath(); g.moveTo(x0, y0 + o); g.quadraticCurveTo(cx, cy + o, x1, y1 + o); g.stroke(); }
  }
  // splatters
  for (let i = 0; i < 380; i++) { g.globalAlpha = 0.15 + rnd() * 0.5; g.fillStyle = pal[(rnd() * pal.length) | 0]; const x = rnd() * W, y = H * (0.1 + rnd() * 0.75), r = rnd() < 0.85 ? 1 + rnd() * 5 : 8 + rnd() * 22; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  // faint photo frames + doodles
  g.globalAlpha = 0.18; g.strokeStyle = '#cfe9ff';
  for (let i = 0; i < 24; i++) { const x = rnd() * W, y = H * (0.15 + rnd() * 0.6), s = 70 + rnd() * 120; g.save(); g.translate(x, y); g.rotate((rnd() - 0.5) * 0.6); g.lineWidth = 3; g.strokeRect(-s / 2, -s * 0.6, s, s * 1.2); g.strokeRect(-s * 0.4, -s * 0.5, s * 0.8, s * 0.8); g.restore(); }
  g.globalAlpha = 1;
  // stars at the top
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.7})`; g.fillRect(rnd() * W, rnd() * H * 0.45, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const backdrop = new THREE.Mesh(new THREE.SphereGeometry(220, 64, 32), new THREE.MeshBasicMaterial({ map: artTexture(), side: THREE.BackSide, toneMapped: false, depthWrite: false }));
backdrop.rotation.y = Math.PI * 0.5; scene.add(backdrop);

/* ground: shadow catcher + glowing platter */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.ShadowMaterial({ opacity: 0.4 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
{
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d'), R = 512;
  const gr = g.createRadialGradient(R, R, 60, R, R, R); gr.addColorStop(0, 'rgba(120,170,210,0.35)'); gr.addColorStop(0.7, 'rgba(60,110,150,0.2)'); gr.addColorStop(1, 'rgba(40,60,80,0)'); g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, 7); g.fill();
  const ring = g.createLinearGradient(0, 0, 1024, 0); ring.addColorStop(0, '#12bde6'); ring.addColorStop(0.5, '#10e0c0'); ring.addColorStop(1, '#cddb28');
  g.strokeStyle = ring; g.lineWidth = 5; g.beginPath(); g.arc(R, R, 494, 0, 7); g.stroke();
  for (let r = 100; r < 490; r += 14) { g.strokeStyle = `rgba(160,210,240,${r % 70 === 0 ? 0.12 : 0.05})`; g.lineWidth = 1.5; g.beginPath(); g.arc(R, R, r, 0, 7); g.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const pl = new THREE.Mesh(new THREE.CircleGeometry(11, 96), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); pl.rotation.x = -Math.PI / 2; pl.position.y = 0.005; scene.add(pl);
}
const blobC = document.createElement('canvas'); blobC.width = blobC.height = 256;
{ const g = blobC.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(0,0,0,0.6)'); r.addColorStop(0.5, 'rgba(0,0,0,0.25)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); }
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blobC), transparent: true, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; scene.add(blob);

/* ---------- Cydni (same model as the CYDNI 3D character) ---------- */
const M = {
  shell: new THREE.MeshPhysicalMaterial({ color: 0xf1f2f3, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18 }),
  ring: new THREE.MeshPhysicalMaterial({ color: 0xc9cbcd, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.25 }),
  visor: new THREE.MeshPhysicalMaterial({ color: 0x1b1c1e, roughness: 0.12, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 }),
  dark: new THREE.MeshPhysicalMaterial({ color: 0x2a2b2d, roughness: 0.35, metalness: 0.2, clearcoat: 0.6 }),
  stick: new THREE.MeshStandardMaterial({ color: 0xe6e8ea, roughness: 0.3, metalness: 0.4 }),
  cyan: new THREE.MeshPhysicalMaterial({ color: 0x0096dc, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 }),
  eye: new THREE.MeshStandardMaterial({ color: 0x00e1ff, emissive: 0x00e1ff, emissiveIntensity: 1.5, toneMapped: false }),
  logo: new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: 0.35, clearcoat: 0.7 }),
};
function stadiumShape(w, h) {
  const s = new THREE.Shape(), hw = w / 2, hh = h / 2;
  if (w >= h) { const r = hh; s.moveTo(0, -hh); s.lineTo(hw - r, -hh); s.absarc(hw - r, 0, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-hw + r, hh); s.absarc(-hw + r, 0, r, Math.PI / 2, Math.PI * 1.5, false); s.closePath(); }
  else { const r = hw; s.moveTo(hw, 0); s.lineTo(hw, hh - r); s.absarc(0, hh - r, r, 0, Math.PI, false); s.lineTo(-hw, -hh + r); s.absarc(0, -hh + r, r, Math.PI, Math.PI * 2, false); s.closePath(); }
  return s;
}
function slab(w, h, depth, b, segs = 10) {
  const g = new THREE.ExtrudeGeometry(stadiumShape(w - 2 * b, h - 2 * b), { depth: Math.max(0.001, depth - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: segs, curveSegments: 64 });
  g.center(); g.computeVertexNormals(); return g;
}
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }

const robot = new THREE.Group(); scene.add(robot);
const BODY_ZS = 0.72, bodyR = (y) => 1.39 + (y - 0.95) / 5.7 * 1.16;
{
  const prof = [];
  for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI / 2; prof.push(new THREE.Vector2(Math.max(0.001, 1.39 * Math.sin(a)), 0.95 - 0.95 * Math.cos(a))); }
  for (let i = 1; i <= 12; i++) { const y = 0.95 + i / 12 * 5.7; prof.push(new THREE.Vector2(bodyR(y), y)); }
  for (let i = 1; i <= 18; i++) { const a = i / 18 * Math.PI / 2; prof.push(new THREE.Vector2(1.45 + 1.1 * Math.cos(a), 6.65 + 1.15 * Math.sin(a))); }
  prof.push(new THREE.Vector2(0.001, 7.8));
  const body = mesh(new THREE.LatheGeometry(prof, 128), M.shell, robot); body.scale.z = BODY_ZS;
  const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100.06 103"><path d="M51.14,17.19s3.1.02,3.1,2.52c0,2.72-3.1,2.72-3.1,2.72-16.17-.37-30.34,14.89-28.63,30.97.75,16.11,17.65,29.27,32.89,26.3,13.5-2.62,26.63-13.09,27.48-28.43,1.12,15.75-11.53,31.54-28.28,33.76-18.62,2.45-36.92-13.25-37.38-32.03-1.57-18.75,15.11-36.26,33.92-35.81Z"/><path d="M77.23,53.75s-.21,2.43-2.49,2.43-2.61-2.43-2.61-2.43c.25-11.2-10.31-21.02-21.45-19.83-11.16.52-19.22,11.89-18.23,22.79.87,9.5,8.66,18.97,19.7,19.84-11.3,1.02-23.01-7.93-24.83-20.25-1.8-13.7,9.75-27.16,23.56-27.5,13.8-1.15,26.68,11.12,26.34,24.96Z"/><path d="M63.75,45.63s1.97,2.35.33,3.76c-1.63,1.42-3.42-.67-3.42-.67-4.43-4.63-12.67-4.33-16.7.65-4.3,4.72-3.22,13.83,1.19,17.97,4.02,3.77,7.03,4.52,10.29,4.77-4.14,1.17-8.94-.38-12.8-3.11-6.91-5.3-7.76-16.45-1.75-22.76,5.63-6.66,16.85-6.93,22.86-.61Z"/></svg>`;
  const LOGO_Y = 5.9, S = 0.0276, data = new SVGLoader().parse(LOGO_SVG);
  data.paths.forEach((p) => SVGLoader.createShapes(p).forEach((shape) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: true, bevelThickness: 1, bevelSize: 0.6, bevelSegments: 3, curveSegments: 24 });
    g.translate(-50, -52, 0); g.scale(S, -S, S);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i += 3) for (let c = 0; c < 3; c++) { const a = pos.array[(i + 1) * 3 + c]; pos.array[(i + 1) * 3 + c] = pos.array[(i + 2) * 3 + c]; pos.array[(i + 2) * 3 + c] = a; }
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), R = bodyR(LOGO_Y + y); pos.setZ(i, pos.getZ(i) + BODY_ZS * Math.sqrt(Math.max(0, R * R - x * x)) - 0.05); }
    g.deleteAttribute('normal'); g.deleteAttribute('uv'); g.computeVertexNormals();
    mesh(g, M.logo, robot, 0, LOGO_Y, 0);
  }));
}
function finShape(side) { const s = new THREE.Shape(), k = side; s.moveTo(0, 0); s.bezierCurveTo(0.62 * k, -0.08, 0.52 * k, -0.86, 0.42 * k, -1.6); s.bezierCurveTo(0.22 * k, -2.85, -0.28 * k, -3.95, -0.82 * k, -4.56); s.lineTo(0, 0); return s; }
function makeArm(side) {
  const pivot = new THREE.Group(); pivot.position.set(2.4 * side, 7.0, -0.05); robot.add(pivot);
  const g = new THREE.ExtrudeGeometry(finShape(side), { depth: 0.75, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.16, bevelSegments: 8, curveSegments: 48 });
  g.translate(0, 0, -0.375); g.computeVertexNormals(); mesh(g, M.cyan, pivot); return pivot;
}
const armL = makeArm(-1), armR = makeArm(1);
mesh(new THREE.CylinderGeometry(0.52, 0.56, 1.0, 48), M.dark, robot, 0, 7.98, 0);
const head = new THREE.Group(); head.position.set(0, 10.43, 0); robot.add(head);
mesh(slab(7.32, 4.5, 4.2, 0.7), M.ring, head);
mesh(slab(6.66, 3.84, 2.4, 0.22), M.shell, head, 0, 0, 1.11);
mesh(slab(5.04, 2.22, 0.5, 0.16), M.visor, head, 0, 0, 2.32);
for (const s of [-1, 1]) { const e = mesh(slab(2.0, 1.62, 0.8, 0.2), M.cyan, head, 3.72 * s, 0, 0); e.rotation.y = Math.PI / 2; }
mesh(new RoundedBoxGeometry(2.36, 0.62, 1.8, 6, 0.22), M.dark, head, 0, 2.38, 0);
mesh(new THREE.SphereGeometry(0.38, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.dark, head, 0, 2.62, 0);
mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.95, 24), M.stick, head, 0, 3.3, 0);
mesh(new THREE.SphereGeometry(0.37, 48, 32), M.cyan, head, 0, 3.94, 0);
function domeGeo() {
  const s = new THREE.Shape(); s.moveTo(0.39, 0); s.absarc(0, 0, 0.39, 0, Math.PI, false); s.lineTo(-0.39, -0.14); s.quadraticCurveTo(-0.39, -0.26, -0.27, -0.26); s.lineTo(0.27, -0.26); s.quadraticCurveTo(0.39, -0.26, 0.39, -0.14); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3, curveSegments: 32 }); g.translate(0, -0.06, 0); return g;
}
const arcGeo = () => new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.36, -0.16, 0), new THREE.Vector3(0, 0.42, 0), new THREE.Vector3(0.36, -0.16, 0)), 32, 0.085, 12, false);
const eyesRoot = new THREE.Group(); eyesRoot.position.set(0, 0, 2.6); head.add(eyesRoot);
const faces = {};
function face(name, mk) { const g = new THREE.Group(); const l = new THREE.Mesh(mk(), M.eye); l.position.x = -1.1; const r = new THREE.Mesh(mk(), M.eye); r.position.x = 1.1; g.add(l, r); g.visible = false; eyesRoot.add(g); faces[name] = g; }
face('normal', domeGeo); face('happy', arcGeo);
face('wink', () => new THREE.CylinderGeometry(0.31, 0.31, 0.08, 48).rotateX(Math.PI / 2));
faces.wink.children[0].geometry = arcGeo(); // left eye happy, right open
const setFace = (n) => { for (const k in faces) faces[k].visible = k === n; };
setFace('normal');

/* ---------- camera prop (held in front of Cydni) ---------- */
const camProp = new THREE.Group();
{
  const body = new THREE.MeshPhysicalMaterial({ color: 0x23272d, roughness: 0.45, clearcoat: 0.6 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xd5dbe2, metalness: 0.9, roughness: 0.25 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a1a2a, roughness: 0.05, metalness: 0.2, clearcoat: 1, transmission: 0, envMapIntensity: 2 });
  mesh(new RoundedBoxGeometry(3.4, 2.1, 1.3, 6, 0.28), body, camProp);
  mesh(new RoundedBoxGeometry(3.42, 0.55, 1.32, 4, 0.2), silver, camProp, 0, 0.82, 0);
  mesh(new RoundedBoxGeometry(1.1, 0.5, 0.9, 4, 0.15), body, camProp, -0.6, 1.25, 0);
  const lensBarrel = mesh(new THREE.CylinderGeometry(0.78, 0.86, 0.9, 48), body, camProp, 0, -0.1, 0.9); lensBarrel.rotation.x = Math.PI / 2;
  const lensRing = mesh(new THREE.TorusGeometry(0.72, 0.09, 16, 48), silver, camProp, 0, -0.1, 1.36);
  const lensGlass = mesh(new THREE.SphereGeometry(0.62, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2.6), glass, camProp, 0, -0.1, 1.2); lensGlass.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.18, 24), new THREE.MeshPhysicalMaterial({ color: 0xff4d4d, roughness: 0.3, clearcoat: 1 }), camProp, 1.1, 1.13, 0);
  camProp.userData.flashMat = new THREE.MeshStandardMaterial({ color: 0xf6fbff, emissive: 0xffffff, emissiveIntensity: 0.15, toneMapped: false });
  mesh(new RoundedBoxGeometry(0.8, 0.36, 0.1, 3, 0.06), camProp.userData.flashMat, camProp, 1.05, 0.78, 0.7);
  mesh(new RoundedBoxGeometry(0.5, 0.36, 0.1, 3, 0.06), glass, camProp, -1.15, 0.78, 0.7);
}
camProp.position.set(0, 7.2, 3.3); camProp.scale.setScalar(0.001); robot.add(camProp);

/* paintbrush prop (Draw tab): tapered lacquered handle, crimped ferrule, full bristles loaded with paint */
const brushProp = new THREE.Group();
{
  const lathe = (pts, mat, y = 0) => mesh(new THREE.LatheGeometry(pts.map(([r, yy]) => new THREE.Vector2(r, yy)), 40), mat, brushProp, 0, y, 0);
  const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x0096dc, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const ferrule = new THREE.MeshStandardMaterial({ color: 0xdfe5ec, metalness: 0.95, roughness: 0.2 });
  const bristle = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.85 });
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xcddb28, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
  // handle: rounded butt, slim waist, swelling toward the ferrule (bristles point +y)
  lathe([[0.001, -3.0], [0.16, -2.95], [0.2, -2.8], [0.17, -2.2], [0.15, -1.2], [0.2, -0.2], [0.26, 0.35], [0.27, 0.45]], lacquer);
  lathe([[0.27, 0.42], [0.3, 0.5], [0.3, 0.62], [0.28, 0.66], [0.3, 0.72], [0.3, 0.86], [0.28, 0.9], [0.3, 0.96], [0.31, 1.25], [0.3, 1.3]], ferrule);
  lathe([[0.3, 1.28], [0.36, 1.55], [0.37, 1.8], [0.3, 2.05]], bristle);
  lathe([[0.3, 2.0], [0.33, 2.15], [0.27, 2.45], [0.14, 2.75], [0.001, 2.95]], paint);
  const drip = mesh(new THREE.SphereGeometry(0.09, 16, 12), paint, brushProp, 0.18, 2.05, 0.22); drip.scale.set(1, 1.5, 1);
  brushProp.scale.setScalar(1.25);
}
// held at the fin tip, handle running along the fin, bristles out past the tip
const brushHold = new THREE.Group(); brushHold.position.set(-0.7, -4.2, 0.45); brushHold.rotation.set(0.35, 0, Math.PI + 0.35); armR.add(brushHold);
brushHold.add(brushProp); brushProp.scale.setScalar(0.001);

/* film clapperboard (Video tab): slate with a hinged, striped clapstick that snaps shut */
const clapProp = new THREE.Group();
const clapStick = new THREE.Group();
{
  const slateMat = new THREE.MeshPhysicalMaterial({ color: 0x1b1f24, roughness: 0.4, clearcoat: 0.8 });
  const stripeTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 32; const g = c.getContext('2d'); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#111418' : '#ffffff'; g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32 + 16, 32); g.lineTo(i * 32 - 16, 32); g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const stripeMat = new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.5 });
  const chalk = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 192; const g = c.getContext('2d'); g.fillStyle = '#1b1f24'; g.fillRect(0, 0, 256, 192); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; for (const y of [64, 128]) { g.beginPath(); g.moveTo(10, y); g.lineTo(246, y); g.stroke(); } g.beginPath(); g.moveTo(128, 64); g.lineTo(128, 192); g.stroke(); g.fillStyle = '#e8eef6'; g.font = '700 34px Chakra Petch, sans-serif'; g.fillText('CYDART', 20, 48); g.font = '600 24px sans-serif'; g.fillText('SCENE 1', 16, 104); g.fillText('TAKE 1', 140, 104); g.fillStyle = '#38bdf8'; g.fillText('ACTION!', 16, 168); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const board = mesh(new RoundedBoxGeometry(2.6, 1.95, 0.14, 2, 0.05), [slateMat, slateMat, slateMat, slateMat, new THREE.MeshStandardMaterial({ map: chalk, roughness: 0.6 }), slateMat], clapProp, 0, 0, 0);
  mesh(new THREE.BoxGeometry(2.6, 0.32, 0.16), [stripeMat, stripeMat, stripeMat, stripeMat, stripeMat, stripeMat], clapProp, 0, 1.13, 0);
  clapStick.position.set(-1.3, 1.3, 0); clapProp.add(clapStick);
  mesh(new THREE.BoxGeometry(2.6, 0.32, 0.16), [stripeMat, stripeMat, stripeMat, stripeMat, stripeMat, stripeMat], clapStick, 1.3, 0.17, 0);
  mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0xd5dbe2, metalness: 0.9, roughness: 0.25 }), clapProp, -1.3, 1.3, 0).rotation.x = Math.PI / 2;
}
const clapHold = new THREE.Group(); clapHold.position.set(-0.75, -4.35, 0.55); clapHold.rotation.set(Math.PI / 2, 0, -0.18); armR.add(clapHold);
clapHold.add(clapProp); clapProp.scale.setScalar(0.001);

/* polaroid "photo of you" */
function youTexture() {
  const W = 512, H = 600, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, W, H);
  const gr = g.createLinearGradient(0, 30, 0, 470); gr.addColorStop(0, '#12bde6'); gr.addColorStop(0.55, '#10e0c0'); gr.addColorStop(1, '#cddb28');
  g.fillStyle = gr; g.fillRect(30, 30, W - 60, 440);
  // sparkle burst
  g.save(); g.translate(W / 2, 230); g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); g.beginPath(); g.moveTo(0, 0); g.lineTo(-14, -260); g.lineTo(14, -260); g.fill(); } g.restore();
  // you: head and shoulders silhouette with a smile
  g.fillStyle = '#0f1d2e'; g.beginPath(); g.arc(W / 2, 205, 72, 0, 7); g.fill();
  g.beginPath(); g.moveTo(W / 2 - 150, 470); g.quadraticCurveTo(W / 2 - 140, 300, W / 2, 300); g.quadraticCurveTo(W / 2 + 140, 300, W / 2 + 150, 470); g.fill();
  g.strokeStyle = '#7fe3ff'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.arc(W / 2, 212, 34, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  g.fillStyle = '#7fe3ff'; g.beginPath(); g.arc(W / 2 - 26, 188, 8, 0, 7); g.arc(W / 2 + 26, 188, 8, 0, 7); g.fill();
  g.fillStyle = '#1b2a3a'; g.font = '700 64px "Permanent Marker", "Comic Sans MS", cursive'; g.textAlign = 'center'; g.fillText('you!', W / 2, 555);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const polaroid = new THREE.Mesh(new THREE.PlaneGeometry(2.56, 3.0), new THREE.MeshStandardMaterial({ map: youTexture(), roughness: 0.6, side: THREE.DoubleSide, transparent: true }));
polaroid.castShadow = true; polaroid.visible = false; scene.add(polaroid);

/* floating art props around Cydni on Home */
const floaters = new THREE.Group(); scene.add(floaters);
function miniArt(seed) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 300; const g = c.getContext('2d'); let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 256, 300);
  const pal = [['#12bde6', '#cddb28'], ['#ff5a7a', '#ffb347'], ['#7c5cff', '#10e0c0'], ['#0096dc', '#ffffff'], ['#ffb347', '#12bde6']][seed % 5];
  const gr = g.createLinearGradient(0, 16, 0, 236); gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]); g.fillStyle = gr; g.fillRect(16, 16, 224, 220);
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(60 + r() * 140, 60 + r() * 50, 18 + r() * 14, 0, 7); g.fill();
  g.fillStyle = 'rgba(10,25,40,0.55)'; g.beginPath(); g.moveTo(16, 236); g.lineTo(80 + r() * 40, 120 + r() * 40); g.lineTo(150, 236); g.fill(); g.beginPath(); g.moveTo(100, 236); g.lineTo(170 + r() * 40, 100 + r() * 40); g.lineTo(240, 236); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const FLOAT_DEF = [[-12, 13, -4, 0.3], [12.5, 11, -5, -0.35], [-9.5, 4.5, 3, 0.2], [10, 3.8, 2.5, -0.25], [-15, 7.5, -9, 0.15], [15.5, 16, -10, -0.2]];
FLOAT_DEF.forEach(([x, y, z, rz], i) => {
  const edge = new THREE.MeshStandardMaterial({ color: 0xf1eee4, roughness: 0.8 });
  const m = new THREE.Mesh(new RoundedBoxGeometry(2.56, 3.0, 0.06, 2, 0.03), [edge, edge, edge, edge, new THREE.MeshStandardMaterial({ map: miniArt(i * 977 + 13), roughness: 0.55 }), edge]);
  m.castShadow = true; m.position.set(x, y, z); m.rotation.set(0, -x * 0.03, rz); m.userData = { base: m.position.clone(), rz, ph: i * 1.7 };
  floaters.add(m);
});
// colour swatch chips
['#12bde6', '#10e0c0', '#cddb28', '#ff5a7a', '#7c5cff', '#ffb347'].forEach((col, i) => {
  const m = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.9, 0.18, 3, 0.08), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.3, clearcoat: 1 }));
  const a = i / 6 * Math.PI * 2; m.position.set(Math.cos(a) * 8.5, 9 + Math.sin(a * 2) * 2.5, Math.sin(a) * 4 - 1); m.castShadow = true; m.userData = { base: m.position.clone(), rz: 0, ph: i * 0.9, chip: true };
  floaters.add(m);
});
floaters.visible = false;

/* ---------- layout / framing ---------- */
let introProgress = 0; // 0 = intro framing, 1 = home framing
const CYDNI_H = 14.5, TARGET = new THREE.Vector3(0, 8.6, 0);
const vR = new THREE.Vector3(), vU = new THREE.Vector3();
function frame() {
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight, p = introProgress;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  // intro: Cydni big and centred; home: Cydni shrinks into the upper-left beside the title
  const dist0 = Math.max(11.5 / tv, 10 / (tv * camera.aspect)) + 4;
  const cornerPx = THREE.MathUtils.clamp(h * 0.22, 110, 190);
  const dist1 = CYDNI_H * h / (2 * tv * cornerPx);
  const e = p * p * (3 - 2 * p), dist = lerp(dist0, dist1, e);
  const sx = lerp(w / 2, 14 + cornerPx * 0.36, e), sy = lerp(h * 0.4, 54 + cornerPx * 0.5 + 4, e);
  const az = THREE.MathUtils.degToRad(lerp(6, 18, e)), po = THREE.MathUtils.degToRad(80);
  camera.position.setFromSpherical(new THREE.Spherical(dist, po, az)).add(TARGET);
  camera.lookAt(TARGET); camera.updateMatrixWorld();
  camera.setViewOffset(w, h, w / 2 - sx, h / 2 - sy, w, h);
  camera.updateProjectionMatrix();
  // floating photos stay spread across the screen behind the panels, at their intro size
  const k = 2 * dist * tv / h, sc = dist / dist0;
  vR.setFromMatrixColumn(camera.matrixWorld, 0); vU.setFromMatrixColumn(camera.matrixWorld, 1);
  floaters.scale.setScalar(sc);
  floaters.position.copy(TARGET).multiplyScalar(1 - sc).addScaledVector(vR, (w / 2 - sx) * k).addScaledVector(vU, -(h * 0.4 - sy) * k);
}
new ResizeObserver(frame).observe(canvas); addEventListener('resize', frame);

/* ---------- timeline ---------- */
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const ease3 = (x) => 1 - Math.pow(1 - x, 3);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = THREE.MathUtils.lerp;
const T = { dropA: 0, dropB: 0.6, spinA: 0.35, spinB: 2.1, camIn: 2.15, camUp: 2.45, camUpB: 3.0, snap: 3.4, camDownA: 3.95, camDownB: 4.65, ejectA: 3.6, ejectB: 5.0, title: 4.5, shrink: 6.0, done: 7.1, settleB: 7.9 };
let tl = skipped() ? 99 : 0, playing = !skipped(), fired = {}, mode = 'home', tab = 'photo';
let floatY = 0, blinkT = 2.5, armLz = -0.05, armRz = 0.05, armX = 0, userYaw = 0, snapT = -10;
const once = (k, fn) => { if (!fired[k]) { fired[k] = true; fn(); } };

let audio = null;
function shutterSound() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const now = audio.currentTime, len = 0.18, buf = audio.createBuffer(1, audio.sampleRate * len, audio.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) { const t = i / audio.sampleRate; d[i] = (Math.random() * 2 - 1) * (t < 0.02 ? 1 : t < 0.06 ? 0.15 : t < 0.09 ? 0.8 : Math.exp(-(t - 0.09) * 60) * 0.6); }
    const src = audio.createBufferSource(); src.buffer = buf; const f = audio.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.7;
    const g = audio.createGain(); g.gain.value = 0.35; src.connect(f).connect(g).connect(audio.destination); src.start(now);
  } catch (e) { /* sound is optional */ }
}
function doFlash() {
  snapT = clock.elapsedTime; shutterSound();
  flashEl.style.transition = 'none'; flashEl.style.opacity = '1';
  requestAnimationFrame(() => { flashEl.style.transition = 'opacity .9s ease-out'; flashEl.style.opacity = '0'; });
  setFace('wink'); setTimeout(() => setFace('happy'), 700);
}

CP.on('skip-intro', () => { tl = 99; playing = false; fired = { title: 1, shrink: 1, done: 1 }; polaroid.visible = false; flashEl.style.opacity = '0'; introProgress = 1; frame(); setFace('happy'); });
CP.on('scene-replay', () => { tl = 0; playing = true; fired = {}; introProgress = 0; frame(); setFace('normal'); userYaw = 0; });
CP.on('scene', (m) => { mode = m; });
CP.on('scene-tab', (t) => { tab = t; });

// click Cydni on Home: take another photo
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
document.getElementById('home').addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, a, input, .home-panel, .home-tabs')) return;
  const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (ray.intersectObject(robot, true).length) { if (tab === 'photo') { tl = T.camUp; playing = true; fired = { title: 1, shrink: 1, done: 1 }; } else { snapT = clock.elapsedTime; setFace('happy'); } }
});

const clock = new THREE.Clock();
const vA = new THREE.Vector3();
function tick() {
  requestAnimationFrame(tick);
  if (document.hidden || (mode !== 'home' && !playing)) return;
  const raw = clock.getDelta(), dt = Math.min(raw, 0.05), now = clock.elapsedTime;
  if (playing) tl += Math.min(raw, 0.25); // real time, so slow devices don't drag the intro
  const intro = tl < T.settleB;

  // float + drop in
  floatY = lerp(floatY, 0.35 + Math.sin(now * 1.6) * 0.28, 1 - Math.pow(0.001, dt));
  const drop = 1 - easeOutBack(seg(tl, T.dropA, T.dropB));
  const sp = easeIO(seg(tl, T.spinA, T.spinB));
  const hop = Math.sin(sp * Math.PI) * 1.1;
  robot.position.y = 0.85 + floatY + hop + drop * 6;
  robot.rotation.y = sp * Math.PI * 2 + userYaw + (intro ? 0 : Math.sin(now * 0.5) * 0.18);
  head.rotation.z = Math.sin(sp * Math.PI * 2) * 0.07;

  // camera prop: appears after the twist, rises to eye level, snaps
  const holdingCam = intro ? tl >= T.camIn : tab === 'photo';
  const camScale = intro ? easeOutBack(seg(tl, T.camIn, T.camIn + 0.4)) : lerp(camProp.scale.x, holdingCam ? 1 : 0.001, 1 - Math.pow(0.001, dt));
  camProp.scale.setScalar(Math.max(0.001, camScale)); camProp.visible = camScale > 0.01;
  // raise the camera to Cydni's eyes, flash, then lower it back down
  const up = intro ? easeIO(seg(tl, T.camUp, T.camUpB)) * (1 - easeIO(seg(tl, T.camDownA, T.camDownB))) : 0;
  const homeBob = intro ? 0 : Math.sin(now * 1.6) * 0.08;
  camProp.position.set(0, lerp(6.6, 10.35, up) + homeBob, lerp(3.0, 4.35, up));
  head.rotation.x = -0.08 * up;
  camProp.rotation.set(lerp(0.12, 0, up), 0, Math.sin(now * 1.2) * 0.03);
  const snapAge = now - snapT;
  camProp.userData.flashMat.emissiveIntensity = snapAge >= 0 && snapAge < 0.35 ? 6 : 0.15;
  flashLight.intensity = snapAge >= 0 && snapAge < 0.3 ? 900 * (1 - snapAge / 0.3) : 0;
  camProp.getWorldPosition(vA); flashLight.position.set(vA.x + 1, vA.y + 1, vA.z + 2);
  if (snapAge >= 0 && snapAge < 0.18) camProp.position.z -= 0.15 * Math.sin(snapAge / 0.18 * Math.PI); // shutter recoil

  // brush prop on Draw tab
  const bs = lerp(brushProp.scale.x / 1.25, !intro && tab === 'draw' ? 1 : 0.001, 1 - Math.pow(0.001, dt));
  brushProp.scale.setScalar(Math.max(0.001, bs * 1.25)); brushProp.visible = bs > 0.01;
  const cs = lerp(clapProp.scale.x / 1.55, !intro && tab === 'video' ? 1 : 0.001, 1 - Math.pow(0.001, dt));
  clapProp.scale.setScalar(Math.max(0.001, cs * 1.55)); clapProp.visible = cs > 0.01;
  { const ph = (now % 2.6) / 2.6; clapStick.rotation.z = ph < 0.55 ? 0.55 * ease3(ph / 0.55) : ph < 0.62 ? 0.55 * (1 - (ph - 0.55) / 0.07) : 0; } // open slowly, snap shut

  // arms: tucked for the twist, forward to hold the camera; Draw tab: right fin paints in the air
  let tL, tR, tX, tXR;
  if (intro && tl < T.camIn) { tL = -0.06 - Math.sin(now * 1.6) * 0.04 - Math.sin(sp * Math.PI) * 0.4; tR = -tL; tX = 0; tXR = 0; }
  else if (holdingCam) { tL = -0.32 - up * 0.1; tR = 0.32 + up * 0.1; tX = -1.25 - up * 0.45; tXR = tX; }
  else if (!intro && tab === 'video') { tL = -0.08 - Math.sin(now * 1.6) * 0.04; tX = 0; tR = 0.55; tXR = -1.35 + Math.sin(now * 1.2) * 0.05; }
  else if (!intro && tab === 'draw') { tL = -0.08 - Math.sin(now * 1.6) * 0.04; tX = 0; tR = 0.9 + Math.sin(now * 2.2) * 0.25; tXR = -1.2 + Math.cos(now * 2.2) * 0.3; }
  else { tL = -0.08 - Math.sin(now * 1.6) * 0.04; tR = -tL; tX = 0; tXR = 0; }
  const k = 1 - Math.pow(0.0004, dt);
  armLz = lerp(armLz, tL, k); armRz = lerp(armRz, tR, k); armX = lerp(armX, tX, k); armR.userData.x = lerp(armR.userData.x || 0, tXR, k);
  armL.rotation.set(armX, 0, armLz); armR.rotation.set(armR.userData.x, 0, armRz);

  // intro beats
  if (playing) {
    if (tl >= T.camIn) once('face1', () => setFace('happy'));
    if (tl >= T.snap) once('snap', doFlash);
    if (tl >= T.title) once('title', () => CP.emit('intro-title'));
    if (tl >= T.shrink) once('shrink', () => CP.emit('intro-title-shrink'));
    if (tl >= T.done) once('done', () => CP.emit('intro-done'));
    if (tl >= T.settleB) { playing = false; }
  }
  // polaroid ejects from the camera top and flies toward you
  const ej = seg(tl, T.ejectA, T.ejectB);
  if (ej > 0 && ej < 1) {
    polaroid.visible = true; camProp.getWorldPosition(vA);
    const out = easeIO(seg(ej, 0, 0.35)), fly = easeIO(seg(ej, 0.35, 1));
    const start = vA.clone().add(new THREE.Vector3(0, 1.2 + out * 1.6, 0.2));
    const dest = camera.position.clone().lerp(new THREE.Vector3(0, 9, 0), 0.55);
    polaroid.position.copy(start).lerp(dest, fly);
    polaroid.quaternion.slerpQuaternions(new THREE.Quaternion(), camera.quaternion, fly);
    polaroid.rotateZ((1 - fly) * 0.25 + Math.sin(fly * Math.PI) * 0.35);
    polaroid.scale.setScalar(lerp(0.6, 1.25, fly));
    polaroid.material.opacity = 1 - seg(ej, 0.82, 1);
  } else polaroid.visible = false;

  // framing moves from intro to home
  const target = tl >= T.shrink ? 1 : 0;
  if (Math.abs(introProgress - target) > 0.001) { introProgress = lerp(introProgress, target, 1 - Math.pow(0.02, dt)); frame(); }

  // floating props on Home
  floaters.visible = tl >= T.title;
  const fIn = easeOutBack(seg(tl, T.title, T.title + 1.2));
  floaters.children.forEach((m) => { const u = m.userData; m.position.set(u.base.x, u.base.y + Math.sin(now * 0.9 + u.ph) * 0.5, u.base.z); m.rotation.z = u.rz + Math.sin(now * 0.6 + u.ph) * 0.06; if (u.chip) m.rotation.y = now * 0.8 + u.ph; m.scale.setScalar(Math.max(0.001, fIn)); });
  backdrop.rotation.y = Math.PI * 0.5 + now * 0.01;

  // contact shadow, blink
  const hgt = robot.position.y; const sc = 7.2 + hgt * 0.9; blob.scale.set(sc, sc * 0.55, 1); blob.material.opacity = THREE.MathUtils.clamp(0.95 - hgt * 0.28, 0.3, 0.95);
  blinkT -= dt; let ey = 1;
  if (blinkT < 0.14 && faces.normal.visible) ey = Math.abs(blinkT - 0.07) / 0.07;
  if (blinkT <= 0) { blinkT = 2.5 + Math.random() * 3; if (!intro && !faces.normal.visible && Math.random() < 0.5) setFace('normal'); }
  eyesRoot.scale.y = Math.max(0.08, ey);

  renderer.render(scene, camera);
}

// drag on the empty Home background to turn Cydni
let dragX = null;
const homeEl = document.getElementById('home');
homeEl.addEventListener('pointerdown', (e) => { if (!e.target.closest('button, .home-panel, .home-tabs')) dragX = e.clientX; });
addEventListener('pointermove', (e) => { if (dragX !== null) { userYaw += (e.clientX - dragX) * 0.01; dragX = e.clientX; } });
addEventListener('pointerup', () => { dragX = null; });

const fontReady = Promise.race([document.fonts ? document.fonts.load('700 64px "Permanent Marker"') : Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);
fontReady.finally(() => {
  polaroid.material.map = youTexture(); polaroid.material.needsUpdate = true;
  if (skipped()) { introProgress = 1; setFace('happy'); }
  frame(); clock.start(); tick();
});
window.__cpScene = { get tl() { return tl; }, seek(t) { tl = t; playing = false; } };
