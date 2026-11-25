// Valley Casino — the 3D floor, the player, dealers, walking, and the game screens.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import * as K from './games/_kit.js';
import { HALL, canvasTex, rng, carpetTex, marbleTex, wallTex, ceilingTex, M, buildSemiTable, buildCraps, buildRoulette, buildBaccarat, buildSicBo, buildBigSix, buildSlotBank, neonSign, hangingSign, chandelier, aquarium } from './floor.js';

const $ = s => document.querySelector(s);

// ---------------------------------------------------------------- settings
const PRESETS = {
  low: { scale: .6, shadows: false, shadowMap: 512, bloom: false, aa: false, dealers: false },
  medium: { scale: .8, shadows: true, shadowMap: 1024, bloom: true, aa: false, dealers: true },
  high: { scale: 1, shadows: true, shadowMap: 2048, bloom: true, aa: true, dealers: true },
  ultra: { scale: 1.5, shadows: true, shadowMap: 4096, bloom: true, aa: true, dealers: true }
};
const coarse = matchMedia('(pointer: coarse)').matches;
const settings = Object.assign({ preset: coarse ? 'medium' : 'high', sound: true, ambience: true, music: .35, auto: true }, PRESETS[coarse ? 'medium' : 'high']);
try { Object.assign(settings, JSON.parse(localStorage.getItem('casino.settings') || '{}')); } catch (e) { }
function saveSettings() { try { localStorage.setItem('casino.settings', JSON.stringify(settings)); } catch (e) { } }
let perfScale = 1;

// ---------------------------------------------------------------- renderer
const canvas3d = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07050a);
scene.fog = new THREE.Fog(0x0a0608, 22, 48);
const camera = new THREE.PerspectiveCamera(55, 1, .05, 140);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
scene.environmentIntensity = .45;
const composer = new EffectComposer(renderer);
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .5, .55, .85);
const smaa = new SMAAPass(1, 1);
composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(new OutputPass()); composer.addPass(smaa);
const shadowLights = [];
function updateShadows() {
  if (!settings.shadows) return;
  for (const l of shadowLights) {
    const near = Math.hypot(boy.pos.x - l.position.x, boy.pos.z - l.position.z) < 7;
    if (near || l.userData.wasNear || l.userData.dirty) l.shadow.needsUpdate = true;
    l.userData.wasNear = near; l.userData.dirty = false;
  }
}
function applySettings() {
  applyResolution();
  renderer.shadowMap.enabled = settings.shadows;
  bloom.enabled = settings.bloom; smaa.enabled = settings.aa;
  for (const l of shadowLights) {
    l.castShadow = settings.shadows; l.shadow.autoUpdate = false; l.userData.dirty = true;
    if (l.shadow.mapSize.x !== settings.shadowMap) { l.shadow.mapSize.set(settings.shadowMap, settings.shadowMap); if (l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null; } }
  }
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
  for (const d of dealers) d.root.visible = settings.dealers;
  K.setMuted(!settings.sound);
  music.setVolume(settings.sound ? settings.music : 0);
  hum.setOn(settings.sound && settings.ambience);
}
function applyResolution() {
  const pr = Math.min(window.devicePixelRatio || 1, 2) * settings.scale * (settings.auto ? perfScale : 1);
  renderer.setPixelRatio(Math.max(.4, Math.min(pr, 3))); resize();
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---------------------------------------------------------------- games (ES modules in games/)
const GAME_FILES = ['craps', 'blackjack', 'baccarat', 'roulette', 'bigsix', 'sicbo', 'threecard', 'holdem', 'videopoker', 'keno', 'slots', 'slots-buffalo', 'slots-bonus', 'slots-link', 'slots-modern'];
const GAMES = {}; // id -> def
const SLOT_IDS = [];
async function loadGames(onEach) {
  await Promise.all(GAME_FILES.map(async f => {
    try {
      const mod = await import(`./games/${f}.js`);
      const defs = mod.machines || [mod.default];
      for (const d of defs) if (d && d.id) { GAMES[d.id] = d; if (mod.machines) SLOT_IDS.push(d.id); }
    } catch (e) { console.warn('game failed to load:', f, e); }
    onEach();
  }));
  SLOT_IDS.sort((a, b) => (GAMES[a].order ?? 0) - (GAMES[b].order ?? 0));
}

// ---------------------------------------------------------------- the hall
const colliders = []; // world AABBs {minX,maxX,minZ,maxZ}
const stations = [];   // { id, game, kind, title, blurb, limits, seat:V3, yaw, cam:{pos,look}, pick:Object3D }
const idle = [];       // per-frame idle animations (roulette wheels, the big six)
const pickables = [];
const blinkers = [];   // slot candle/accent materials to pulse
function addLocalColliders(list, x, z, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  for (const b of list) {
    const pts = [[b.minX, b.minZ], [b.maxX, b.minZ], [b.minX, b.maxZ], [b.maxX, b.maxZ]].map(([px, pz]) => [x + px * c + pz * s, z - px * s + pz * c]);
    colliders.push({ minX: Math.min(...pts.map(p => p[0])), maxX: Math.max(...pts.map(p => p[0])), minZ: Math.min(...pts.map(p => p[1])), maxZ: Math.max(...pts.map(p => p[1])) });
  }
}
function local(x, z, ry, lx, lz) { const c = Math.cos(ry), s = Math.sin(ry); return new THREE.Vector3(x + lx * c + lz * s, 0, z - lx * s + lz * c); }

function buildHall() {
  const W = HALL.maxX - HALL.minX, D = HALL.maxZ - HALL.minZ, LOBBY = -8;
  // floors: marble lobby, carpet beyond
  const marble = new THREE.Mesh(new THREE.PlaneGeometry(W, -LOBBY), new THREE.MeshStandardMaterial({ map: marbleTex(), color: 0x9a9088, roughness: .22, metalness: .05, envMapIntensity: .5 }));
  marble.rotation.x = -Math.PI / 2; marble.position.set(0, 0, LOBBY / 2); marble.receiveShadow = true; scene.add(marble);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(W, D + LOBBY), new THREE.MeshStandardMaterial({ map: carpetTex(), roughness: .95 }));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, .001, (HALL.minZ + LOBBY) / 2); carpet.receiveShadow = true; scene.add(carpet);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(W, .012, .08), M.brass || new THREE.MeshStandardMaterial({ color: 0xd4a849, metalness: 1, roughness: .25 })); edge.position.set(0, .006, LOBBY); scene.add(edge);
  // walls
  const wallM = new THREE.MeshStandardMaterial({ map: wallTex(), roughness: .8 });
  const mkWall = (w, x, z, ry, h = HALL.h, y = HALL.h / 2) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallM); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); return m; };
  mkWall(D, HALL.minX, (HALL.minZ + HALL.maxZ) / 2, Math.PI / 2);
  mkWall(D, HALL.maxX, (HALL.minZ + HALL.maxZ) / 2, -Math.PI / 2);
  mkWall(W, 0, HALL.minZ, 0);
  const fw = (W - HALL.door * 2) / 2;
  mkWall(fw, HALL.minX + fw / 2, HALL.maxZ, Math.PI); mkWall(fw, HALL.maxX - fw / 2, HALL.maxZ, Math.PI);
  mkWall(HALL.door * 2, 0, HALL.maxZ, Math.PI, HALL.h - 2.8, 2.8 + (HALL.h - 2.8) / 2);
  // wainscot: dark wood with a brass rail all the way round
  const wain = new THREE.MeshStandardMaterial({ color: 0x2a140a, roughness: .45 });
  for (const [w, x, z, ry] of [[D, HALL.minX + .02, -15, Math.PI / 2], [D, HALL.maxX - .02, -15, -Math.PI / 2], [W, 0, HALL.minZ + .02, 0]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.1), wain); p.position.set(x, .55, z); p.rotation.y = ry; scene.add(p);
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, .04, .04), M.brass); r.position.set(x, 1.12, z); r.rotation.y = ry; scene.add(r);
  }
  // ceiling: coffered with recessed gold glow strips over the pit
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: ceilingTex(), roughness: .9 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, HALL.h, -15); scene.add(ceil);
  const coveM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.6, .7), toneMapped: false });
  for (const [x, z, w, d] of [[0, -19, 15, .06], [0, -8.5, 15, .06], [-7.5, -13.75, .06, 10.5], [7.5, -13.75, .06, 10.5], [-7.5, -24.25, .06, 10.5], [7.5, -24.25, .06, 10.5], [0, -29.5, 15, .06]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, .04, d), coveM); c.position.set(x, HALL.h - .02, z); scene.add(c);
  }
  // columns with gold capitals between the pit and the slot aisles
  const colM = new THREE.MeshStandardMaterial({ color: 0x3a0d12, roughness: .35, metalness: .2 });
  for (const x of [-7.6, 7.6]) for (const z of [-8.6, -19, -29.3]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, HALL.h, 24), colM); c.position.set(x, HALL.h / 2, z); c.castShadow = true; scene.add(c);
    for (const y of [.12, HALL.h - .2]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .24, 24), M.brass); cap.position.set(x, y, z); scene.add(cap); }
    colliders.push({ minX: x - .3, maxX: x + .3, minZ: z - .3, maxZ: z + .3, h: HALL.h });
  }
  // entrance: brass-framed glass doors, outside a night street with a glowing sign
  const frame = M.brass;
  for (const x of [-HALL.door, HALL.door]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.1, 2.8, .3), frame); p.position.set(x, 1.4, HALL.maxZ); scene.add(p); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(HALL.door * 2 + .1, .1, .3), frame); top.position.set(0, 2.8, HALL.maxZ); scene.add(top);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xa8d4ff, transparent: true, opacity: .16, roughness: .05, depthWrite: false });
  for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(HALL.door - .05, 2.7), glassM); d.position.set(s * (HALL.door + .6), 1.35, HALL.maxZ + .75); d.rotation.y = s * -1.3; scene.add(d); }
  const street = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: .35, metalness: .1 }));
  street.rotation.x = -Math.PI / 2; street.position.set(0, -.01, HALL.maxZ + 10); street.receiveShadow = true; scene.add(street);
  const carpetOut = new THREE.Mesh(new THREE.PlaneGeometry(HALL.door * 2, 5), new THREE.MeshStandardMaterial({ color: 0x8a0f1c, roughness: .9 })); carpetOut.rotation.x = -Math.PI / 2; carpetOut.position.set(0, .002, HALL.maxZ + 2.5); scene.add(carpetOut);
  for (const x of [-HALL.door - .3, HALL.door + .3]) for (const z of [1.2, 3.2, 5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, .9, 12), M.brass); p.position.set(x, .45, z); scene.add(p); }
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(120, 40), new THREE.MeshBasicMaterial({ fog: false, map: canvasTex(1024, 360, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#05030c'); gr.addColorStop(.6, '#1a0f2e'); gr.addColorStop(.85, '#4a1c3a'); gr.addColorStop(1, '#0a0608'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(9); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${r() * .7})`; g.fillRect(r() * w, r() * h * .5, 1.2, 1.2); }
    for (let x = 0; x < w; x += 8 + r() * 26) { const bh = 30 + r() * 140, bw = 16 + r() * 36; g.fillStyle = '#0b0712'; g.fillRect(x, h * .84 - bh, bw, bh + 80);
      const lit = ['#ffcf6a', '#ff5ad1', '#38f4ff', '#ffe08a']; for (let k = 0; k < 14; k++) if (r() < .5) { g.fillStyle = lit[r() * 4 | 0]; g.globalAlpha = .8; g.fillRect(x + 2 + r() * (bw - 4), h * .84 - bh + 4 + r() * bh, 2, 2); g.globalAlpha = 1; } }
  }) }));
  sky.position.set(0, 12, HALL.maxZ + 28); sky.rotation.y = Math.PI; scene.add(sky);
  const outside = neonSign('VALLEY CASINO', '#ff3b5c', 6, 1.2, '"Playfair Display", Georgia, serif'); outside.position.set(0, 3.9, HALL.maxZ + .05); outside.rotation.y = Math.PI; scene.add(outside);
  const marquee = new THREE.Mesh(new THREE.BoxGeometry(7, .2, 2.2), M.black); marquee.position.set(0, 3.0, HALL.maxZ + 1.1); scene.add(marquee);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(.04, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.3), toneMapped: false }), 80);
  const mx = new THREE.Matrix4(); for (let i = 0; i < 80; i++) { const t = i / 80; const x = t < .5 ? -3.4 + t * 2 * 6.8 : 3.4 - (t - .5) * 2 * 6.8; mx.makeTranslation(x, 2.88, HALL.maxZ + (t < .5 ? 2.15 : .1)); bulbs.setMatrixAt(i, mx); }
  scene.add(bulbs); blinkers.push({ bulbs });
  // back wall: the big sign over the Big Six wheel
  const back = neonSign('VALLEY CASINO', '#ffb300', 9, 1.6, '"Playfair Display", Georgia, serif'); back.position.set(0, 4.2, HALL.minZ + .05); scene.add(back);

  // lights: warm fill, chandeliers, table spots
  scene.add(new THREE.HemisphereLight(0xffd9a8, 0x2a0a10, .55));
  scene.add(new THREE.AmbientLight(0x3a2018, .4));
  const spots = [[-4.8, -11, true], [4.8, -11, false], [0, -11, false], [-3.5, -16.5, true], [3.5, -16.5, true], [-4.8, -22, false], [4.8, -22, false], [0, -22, false], [0, -27.3, true]];
  for (const [x, z, sh] of spots) {
    const s = new THREE.SpotLight(0xffe6c0, 22, 9, .62, .55, 1.5); s.position.set(x, HALL.h - .1, z + .3); s.target.position.set(x, 0, z); scene.add(s, s.target);
    if (sh) { s.shadow.bias = -.0004; s.shadow.normalBias = .02; shadowLights.push(s); }
  }
  for (const [x, z] of [[0, -4.2], [0, -13.8], [0, -19.3], [-11.8, -14], [11.8, -14], [-11.8, -24], [11.8, -24]]) {
    const c = chandelier(); c.position.set(x, HALL.h - .35, z); if (Math.abs(x) > 1) c.scale.setScalar(.7); scene.add(c);
  }
  const lobbyLight = new THREE.PointLight(0xffd9a0, 10, 12, 1.6); lobbyLight.position.set(0, HALL.h - 1.4, -4.2); scene.add(lobbyLight);
  for (const x of [-12, 12]) { const l = new THREE.PointLight(0xffc890, 14, 14, 1.4); l.position.set(x, HALL.h - .8, -19); scene.add(l); }

  // area signs
  for (const [t, c, x, z] of [['CRAPS', '#ff3b5c', 0, -16.5], ['BLACKJACK', '#38f4ff', -4.8, -9.6], ['ROULETTE', '#ffd34a', 0, -9.6], ['BLACKJACK', '#38f4ff', 4.8, -9.6], ['POKER', '#c58aff', -4.8, -20.6], ['ROULETTE', '#ffd34a', 0, -20.6], ["HOLD'EM", '#c58aff', 4.8, -20.6], ['HIGH LIMIT', '#ffb300', -3.6, -25], ['SIC BO', '#7dff9a', 3.6, -25], ['SLOTS', '#ff5ad1', -12.6, -8.6], ['VIDEO POKER', '#38f4ff', 12.6, -8.6], ['KENO', '#ffd34a', 12.6, -19.8]]) {
    const s = hangingSign(t, c); s.position.set(x, HALL.h - 1.25, z); if (x < -8 || x > 8) s.rotation.y = 0; scene.add(s);
  }
  buildCage(); buildBar();
  // velvet ropes around the high-limit baccarat table
  const ropeM = new THREE.MeshStandardMaterial({ color: 0x8a0f1c, roughness: .7 });
  const posts = [[-6.2, -24.8], [-6.2, -28.8], [-1.2, -24.8]];
  for (const [x, z] of posts) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, .95, 12), M.brass); p.position.set(x, .47, z); scene.add(p); const b = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 8), M.brass); b.position.set(x, .97, z); scene.add(b); }
  const rope = (a, b) => { const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a[0], .9, a[1]), new THREE.Vector3((a[0] + b[0]) / 2, .6, (a[1] + b[1]) / 2), new THREE.Vector3(b[0], .9, b[1])); scene.add(new THREE.Mesh(new THREE.TubeGeometry(c, 20, .02, 6), ropeM)); };
  rope(posts[0], posts[1]); rope(posts[0], [-4.6, -24.8]);
  colliders.push({ minX: -6.3, maxX: -6.1, minZ: -28.9, maxZ: -24.7 });
}
function buildCage() {
  // cashier cage: wood counter, brass bars, lit sign; in the lobby on the left
  const g = new THREE.Group(); g.position.set(HALL.minX, 0, -4.8);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 4.2), M.wood); counter.position.set(1.0, .55, 0); counter.castShadow = true; g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, .06, 4.3), new THREE.MeshStandardMaterial({ color: 0x1d1a16, roughness: .2, metalness: .3 })); top.position.set(1.0, 1.13, 0); g.add(top);
  const bars = new THREE.InstancedMesh(new THREE.CylinderGeometry(.012, .012, 1.4, 6), M.brass, 40); const m = new THREE.Matrix4();
  for (let i = 0; i < 40; i++) { m.makeTranslation(1.62, 1.86, -2.0 + i * .1025); bars.setMatrixAt(i, m); } g.add(bars);
  const header = new THREE.Mesh(new THREE.BoxGeometry(.1, .5, 4.3), M.wood); header.position.set(1.65, 2.8, 0); g.add(header);
  const sign = neonSign('CASHIER', '#7dff9a', 2.6, .5); sign.position.set(1.71, 2.8, 0); sign.rotation.y = Math.PI / 2; g.add(sign);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3), new THREE.MeshStandardMaterial({ color: 0x1a120a, roughness: .7 })); back.position.set(.01, 1.5, 0); back.rotation.y = Math.PI / 2; g.add(back);
  for (const z of [-1.2, 0, 1.2]) for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(.019, .019, .05 + k * .02, 20), M.chip[['25', '100', '500'][k]]); st.position.set(1.0 + k * .05, 1.16 + (.05 + k * .02) / 2, z + k * .06); g.add(st); }
  scene.add(g);
  colliders.push({ minX: HALL.minX, maxX: HALL.minX + 1.75, minZ: -7.0, maxZ: -2.6, h: 3.1 });
  stations.push({ id: 'cage', kind: 'cage', title: 'Cashier cage', blurb: 'Take a marker, pay it back, or start over.', seat: new THREE.Vector3(HALL.minX + 2.4, 0, -4.8), yaw: -Math.PI / 2, pick: g });
  pickables.push({ obj: g, st: stations[stations.length - 1] });
}
function buildBar() {
  const g = new THREE.Group(); g.position.set(HALL.maxX, 0, -4.6);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 4.6), M.wood); counter.position.set(-1.6, .55, 0); counter.castShadow = true; g.add(counter);
  const topM = new THREE.Mesh(new THREE.BoxGeometry(1.35, .06, 4.7), new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: .1, metalness: .4 })); topM.position.set(-1.6, 1.13, 0); g.add(topM);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(.02, .04, 4.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(.6, 1.6, 2.6), toneMapped: false })); glow.position.set(-2.21, .95, 0); g.add(glow);
  // back bar shelves with backlit bottles
  const shelfM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.6, .8), toneMapped: false });
  for (const y of [1.3, 1.75, 2.2]) { const s = new THREE.Mesh(new THREE.BoxGeometry(.3, .03, 4.4), shelfM); s.position.set(-.16, y, 0); g.add(s); }
  const bottleG = new THREE.CylinderGeometry(.035, .04, .26, 10), cols = [0x2e7d32, 0x8d5524, 0xb0bec5, 0x6a1b9a, 0xc62828, 0xf9a825];
  for (const y of [1.3, 1.75, 2.2]) for (let i = 0; i < 26; i++) { const b = new THREE.Mesh(bottleG, new THREE.MeshPhysicalMaterial({ color: cols[(i * 7 + y * 10) % cols.length | 0], roughness: .05, transparent: true, opacity: .8 })); b.position.set(-.16, y + .145, -2.1 + i * .168); g.add(b); }
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.4), new THREE.MeshStandardMaterial({ color: 0x8090a0, metalness: 1, roughness: .08 })); mirror.position.set(-.02, 1.75, 0); mirror.rotation.y = -Math.PI / 2; g.add(mirror);
  const sign = neonSign('LOUNGE', '#38f4ff', 2.4, .55); sign.position.set(-.03, 2.85, 0); sign.rotation.y = -Math.PI / 2; g.add(sign);
  for (let i = 0; i < 4; i++) { const s = new THREE.Group(); const seat = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .08, 20), M.redLeather); seat.position.y = .78; s.add(seat); const p = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .78, 8), M.chrome); p.position.y = .39; s.add(p); s.position.set(-2.55, 0, -1.6 + i * 1.05); g.add(s); }
  scene.add(g);
  colliders.push({ minX: HALL.maxX - 2.3, maxX: HALL.maxX, minZ: -7.0, maxZ: -2.2, h: 1.2 });
  stations.push({ id: 'bar', kind: 'bar', title: 'Lounge bar', blurb: 'Drinks are on the house for players.', seat: new THREE.Vector3(HALL.maxX - 2.9, 0, -4.6), yaw: Math.PI / 2, pick: g });
  pickables.push({ obj: g, st: stations[stations.length - 1] });
}

// ---------------------------------------------------------------- tables and machines
const LIMITS = { blackjack: '$5 – $500', roulette: '$1 – $500', craps: '$5 – $1,000', baccarat: '$25 – $5,000', sicbo: '$1 – $500', bigsix: '$1 – $100', threecard: '$5 – $500', holdem: '$5 – $500', videopoker: '$1 – $25 a credit', keno: '$1 – $100', slot: '$1 – $25 a coin' };
const TABLES = [
  { game: 'blackjack', x: -4.8, z: -11, build: () => buildSemiTable({ felt: '#0f6a3c', dark: '#063019', line1: 'BLACKJACK PAYS 3 TO 2', line2: 'DEALER MUST STAND ON ALL 17s', line3: 'INSURANCE PAYS 2 TO 1', shoe: true }) },
  { game: 'roulette', x: 0, z: -11, build: () => buildRoulette(true, idle), note: 'American wheel · 0 and 00' },
  { game: 'blackjack', x: 4.8, z: -11, build: () => buildSemiTable({ felt: '#1b4f9a', dark: '#0a2248', line1: 'BLACKJACK PAYS 3 TO 2', line2: 'DEALER MUST STAND ON ALL 17s', line3: 'INSURANCE PAYS 2 TO 1', shoe: true }) },
  { game: 'craps', x: -3.5, z: -16.5, build: () => buildCraps() },
  { game: 'craps', x: 3.5, z: -16.5, build: () => buildCraps() },
  { game: 'threecard', x: -4.8, z: -22, build: () => buildSemiTable({ felt: '#5a1f86', dark: '#260a40', line1: 'THREE CARD POKER', line2: 'DEALER PLAYS WITH QUEEN HIGH OR BETTER', line3: 'PAIR PLUS · ANTE BONUS', spot: spotLabels(['PAIR+', 'ANTE', 'PLAY']) }) },
  { game: 'roulette', x: 0, z: -22, build: () => buildRoulette(false, idle), note: 'European wheel · single zero' },
  { game: 'holdem', x: 4.8, z: -22, build: () => buildSemiTable({ felt: '#0d5b5b', dark: '#042a2a', line1: "ULTIMATE TEXAS HOLD'EM", line2: 'DEALER NEEDS A PAIR OR BETTER TO OPEN', line3: 'TRIPS · BLIND PAYS ON STRAIGHT OR BETTER', spot: spotLabels(['TRIPS', 'ANTE', 'PLAY']) }) },
  { game: 'baccarat', x: -3.6, z: -26.6, build: () => buildBaccarat() },
  { game: 'sicbo', x: 3.6, z: -26.6, build: () => buildSicBo() },
  { game: 'bigsix', x: 0, z: -28.2, build: () => buildBigSix(idle) }
];
function spotLabels(labels) {
  return (g, x, y, a) => {
    g.save(); g.translate(x, y); g.rotate(a - Math.PI / 2);
    labels.forEach((l, i) => { const yy = (i - (labels.length - 1) / 2) * -90; g.strokeStyle = 'rgba(255,240,200,.9)'; g.lineWidth = 4; g.beginPath(); g.arc(0, yy, 40, 0, 6.28); g.stroke();
      g.fillStyle = '#fff2cc'; g.font = '600 20px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(l, 0, yy); });
    g.restore();
  };
}
const dealerSpots = [];
function placeTables() {
  for (const t of TABLES) {
    const r = t.build(), ry = 0;
    r.group.position.set(t.x, 0, t.z); r.group.rotation.y = ry; scene.add(r.group);
    r.group.traverse(o => { if (o.isMesh) { o.castShadow = o.castShadow || false; o.receiveShadow = true; } });
    addLocalColliders(r.colliders, t.x, t.z, ry);
    const def = GAMES[t.game];
    const seat = local(t.x, t.z, ry, r.seat[0], r.seat[1]);
    const cp = r.cam.pos, cl = r.cam.look;
    const st = { id: t.game + '@' + t.x + ',' + t.z, game: t.game, kind: 'table', title: def ? def.title : titleCase(t.game), blurb: (t.note ? t.note + '. ' : '') + (def ? def.blurb || '' : ''), limits: LIMITS[t.game],
      seat, yaw: ry + Math.PI, cam: { pos: local(t.x, t.z, ry, cp[0], cp[2]).setY(cp[1]), look: local(t.x, t.z, ry, cl[0], cl[2]).setY(cl[1]) }, pick: r.group, open: !!def };
    stations.push(st); pickables.push({ obj: r.group, st });
    if (r.dealer) dealerSpots.push(local(t.x, t.z, ry, r.dealer[0], r.dealer[1]).setY(ry + r.dealer[2]));
    for (const e of r.extraDealers || []) dealerSpots.push(local(t.x, t.z, ry, e[0], e[1]).setY(ry + e[2]));
  }
}
const titleCase = s => s.charAt(0).toUpperCase() + s.slice(1);
function machineTheme(id) {
  const d = GAMES[id] || {}; const th = d.theme || {};
  const kind = d.kind === 'machine' ? 'videopoker' : id === 'keno' ? 'keno' : 'slot';
  return { key: id, title: d.title || id, cabinet: th.cabinet || (kind === 'videopoker' ? '#1a2a6a' : kind === 'keno' ? '#3a1060' : '#7a1420'), accent: th.accent || (kind === 'keno' ? '#ff5ad1' : '#ffd34a'), glass: th.glass || '#200', kind, reels: th.reels || (/5|video|pharaoh|dragon|mega/i.test(id + (d.title || '')) ? 5 : 3), motif: /goldfish|fish/i.test(id) ? 'fish' : /thunder|rush|bison/i.test(id) ? 'bison' : '' };
}
function placeMachines() {
  const rows = [];
  const step = .8;
  const slotIds = SLOT_IDS.length ? SLOT_IDS : ['slots-missing'];
  // Slot positions in walking order; each game gets a bank of consecutive machines.
  const pos = [];
  for (let z = -9.6; z >= -28.81; z -= step) pos.push({ x: HALL.minX + .45, z, ry: Math.PI / 2 });
  for (const [x, ry] of [[-10.95, -Math.PI / 2], [-10.25, Math.PI / 2], [10.25, -Math.PI / 2], [10.95, Math.PI / 2]])
    for (const [z0, z1] of [[-10.4, -17.6], [-20.4, -27.6]]) for (let z = z0; z >= z1 - .01; z -= step) pos.push({ x, z, ry });
  const bank = Math.max(3, Math.min(6, Math.floor(pos.length / slotIds.length)));
  const banks = {};
  pos.forEach((p, i) => { const id = slotIds[Math.floor(i / bank) % slotIds.length]; rows.push({ id, ...p }); (banks[id] = banks[id] || []).push(p); });
  // a hanging sign over the first bank of each headline game
  for (const [id, label, col] of [['slot-thunder', 'THUNDER PLAINS', '#ffb43a'], ['slot-plunder', 'THUNDERBOLT LINK', '#38f4ff'], ['slot-wheel', 'SPIN-A-FORTUNE', '#c58aff'], ['slot-quake', 'MEGA QUAKE', '#ff5a3b']]) {
    const b = banks[id]; if (!b) continue;
    const zs = b.slice(0, bank).map(p => p.z), x = b[0].x, aisle = x + Math.sin(b[0].ry) * 1.3;
    const sign = hangingSign(label, col); sign.position.set(aisle, HALL.h - 1.25, zs.reduce((a, c) => a + c, 0) / zs.length); scene.add(sign);
  }
  // right wall: video poker bank, then keno lounge
  for (let z = -9.6; z >= -28.81; z -= step) rows.push({ id: z > -19.5 ? (GAMES.videopoker ? 'videopoker' : slotIds[0]) : (GAMES.keno ? 'keno' : slotIds[0]), x: HALL.maxX - .45, z, ry: -Math.PI / 2 });
  // the goldfish corner in the lobby: a bank of Fishbowl Fortune machines facing a real aquarium
  if (GAMES['slot-goldfish']) {
    for (const z of [-3.6, -4.4, -5.2, -6.0]) rows.push({ id: 'slot-goldfish', x: -9.6, z, ry: Math.PI / 2 });
    colliders.push({ minX: -9.95, maxX: -9.25, minZ: -6.45, maxZ: -3.15, h: 2.15 });
    const sign = hangingSign('GOLDFISH', '#ffb030'); sign.position.set(-7.9, HALL.h - 1.25, -4.8); sign.rotation.y = Math.PI / 2; scene.add(sign);
  }
  const tank = aquarium(idle); tank.position.set(-6.4, 0, -4.8); scene.add(tank);
  colliders.push({ minX: -6.8, maxX: -6.0, minZ: -6.1, maxZ: -3.5, h: 1.9 });
  stations.push({ id: 'aquarium', kind: 'tank', title: 'The goldfish tank', blurb: 'Eleven goldfish, one castle and a chest of gold coins.', seat: new THREE.Vector3(-5.6, 0, -4.8), yaw: -Math.PI / 2, pick: tank });
  pickables.push({ obj: tank, st: stations[stations.length - 1] });
  buildSlotBank(scene, rows.map(r => ({ theme: machineTheme(r.id), x: r.x, z: r.z, ry: r.ry })));
  // colliders: one strip per row
  colliders.push({ minX: HALL.minX, maxX: HALL.minX + .8, minZ: -29.3, maxZ: -9.2, h: 2.15 }, { minX: HALL.maxX - .8, maxX: HALL.maxX, minZ: -29.3, maxZ: -9.2, h: 2.15 });
  for (const sx of [-1, 1]) for (const [z0, z1] of [[-10.4, -17.6], [-20.4, -27.6]]) colliders.push({ minX: sx * 10.6 - .7, maxX: sx * 10.6 + .7, minZ: z1 - .4, maxZ: z0 + .4, h: 2.15 });
  // stations + invisible pick boxes
  const pickGeo = new THREE.BoxGeometry(.72, 2.0, .62); pickGeo.translate(0, 1, 0);
  const pickMat = new THREE.MeshBasicMaterial({ visible: false });
  for (const r of rows) {
    const def = GAMES[r.id];
    const front = new THREE.Vector3(r.x + Math.sin(r.ry) * .9, 0, r.z + Math.cos(r.ry) * .9);
    const box = new THREE.Mesh(pickGeo, pickMat); box.position.set(r.x, 0, r.z); box.rotation.y = r.ry; scene.add(box);
    const kind = def && def.kind === 'machine' ? 'videopoker' : r.id === 'keno' ? 'keno' : 'slot';
    const st = { id: r.id + '@' + r.x.toFixed(2) + ',' + r.z.toFixed(2), game: r.id, kind: 'machine', title: def ? def.title : 'Out of order', blurb: def ? def.blurb || '' : '', limits: LIMITS[kind === 'slot' ? 'slot' : kind],
      seat: front, yaw: r.ry + Math.PI,
      cam: { pos: new THREE.Vector3(r.x + Math.sin(r.ry) * 1.25, 1.55, r.z + Math.cos(r.ry) * 1.25), look: new THREE.Vector3(r.x, 1.3, r.z) }, pick: box, open: !!def };
    stations.push(st); pickables.push({ obj: box, st });
  }
}

// ---------------------------------------------------------------- characters
const boy = { root: new THREE.Group(), mixer: null, actions: {}, current: null, ready: false, pos: new THREE.Vector3(0, 0, 5), yaw: Math.PI };
scene.add(boy.root);
function fabricTex(base, seed, weave) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const r = rng(seed);
    for (let i = 0; i < 40000; i++) { const a = r() * .1; g.fillStyle = r() < .5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
    if (weave) { g.strokeStyle = 'rgba(255,255,255,.05)'; for (let k = -h; k < w; k += 3) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); } }
  }, { repeat: [4, 4] });
}
// Skin is re-tinted on the GPU while shading (the published page may not read texture pixels back on the CPU).
function tintSkin(m, rgb) {
  const n = m.name || '', avg = /Skin/.test(n) ? '.4248, .2051, .1777' : '.4851, .2270, .1845';
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
    {
      vec3 avgC = vec3(${avg});
      float avgL = dot(avgC, vec3(.3, .59, .11));
      float L = dot(diffuseColor.rgb, vec3(.3, .59, .11));
      float k = clamp(L / avgL, 0.0, 1.45);
      diffuseColor.rgb = max(vec3(0.0), vec3(${rgb}) * pow(k, 1.15) + (diffuseColor.rgb - avgC * k) * .45);
    }`);
  };
  m.customProgramCacheKey = () => 'skin-' + n + rgb;
  m.needsUpdate = true;
}
const OUTFITS = {
  hero: { top: ['#121216', 11, false], bottom: ['#34343e', 12, true], shoes: '#0a0a0a', skin: '.7605, .491, .305' },
  dealerA: { top: ['#6d0f1a', 31, false], bottom: ['#141414', 32, true], shoes: '#111', skin: '.62, .38, .24' },
  dealerB: { top: ['#f1ede4', 41, false], bottom: ['#1a1a1a', 42, true], shoes: '#111', skin: '.85, .62, .48' },
  dealerC: { top: ['#1b2a4a', 51, false], bottom: ['#141414', 52, true], shoes: '#111', skin: '.42, .25, .15' }
};
const outfitMats = {};
function dress(model, key) {
  const o = OUTFITS[key];
  const mk = (src, fn) => { const k = key + src.name; if (!outfitMats[k]) { const m = src.clone(); fn(m); m.needsUpdate = true; outfitMats[k] = m; } return outfitMats[k]; };
  model.traverse(x => {
    if (!x.isMesh || !x.material) return;
    const src = x.material, n = src.name || '';
    if (/Wolf3D_Skin|Wolf3D_Body/.test(n)) x.material = mk(src, m => tintSkin(m, o.skin));
    else if (/Outfit_Top/.test(n)) x.material = mk(src, m => { m.map = fabricTex(o.top[0], o.top[1], o.top[2]); m.normalMap = null; m.roughnessMap = m.metalnessMap = null; m.roughness = .7; m.metalness = 0; m.color.set('#fff'); });
    else if (/Outfit_Bottom/.test(n)) x.material = mk(src, m => { m.map = fabricTex(o.bottom[0], o.bottom[1], o.bottom[2]); m.roughnessMap = m.metalnessMap = null; m.roughness = .8; m.metalness = 0; m.color.set('#fff'); });
    else if (/Footwear/.test(n)) x.material = mk(src, m => { m.map = null; m.roughnessMap = m.metalnessMap = null; m.color.set(o.shoes); m.roughness = .25; m.metalness = .1; });
  });
}
function curlTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#140d09'; g.fillRect(0, 0, w, h);
    const r = rng(21);
    for (let i = 0; i < 2600; i++) { const x = r() * w, y = r() * h, rr = 3 + r() * 6, l = 25 + r() * 35; g.strokeStyle = `hsl(22, ${25 + r() * 15}%, ${l * .28}%)`; g.lineWidth = 1.5 + r() * 1.5; g.beginPath(); g.arc(x, y, rr, r() * 6, r() * 6 + 4); g.stroke(); }
  }, { repeat: [6, 6] });
}
// The source avatar wears a fedora over curly hair: drop the hat, then grow hair over the scalp.
function fixHair(model) {
  let head = null, hair = null;
  model.traverse(o => { if (o.isSkinnedMesh && /Wolf3D_Head$/.test(o.name)) head = o; if (o.isSkinnedMesh && o.material && /Headwear/.test(o.material.name)) hair = o; });
  if (!hair || !head) return;
  const hg = hair.geometry, hp = hg.attributes.position, hi = hg.index;
  if (hi) { const keep = []; for (let t = 0; t < hi.count; t += 3) { const a = hi.getX(t), b = hi.getX(t + 1), c = hi.getX(t + 2); if (Math.max(hp.getY(a), hp.getY(b), hp.getY(c)) < 1.745) keep.push(a, b, c); } hg.setIndex(keep); }
  const g = head.geometry.clone(), pos = g.attributes.position, nor = g.attributes.normal, idx = g.index;
  const isHair = i => { const y = pos.getY(i), z = pos.getZ(i), x = pos.getX(i); if (z < -0.035) return y > 1.66; if (z < 0.0) return y > 1.70; return y > 1.735 && !(z > 0.045 && y < 1.776) && !(Math.abs(x) > 0.072 && y < 1.758 && z > 0.0); };
  const keep = []; for (let t = 0; t < idx.count; t += 3) { const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2); if (isHair(a) && isHair(b) && isHair(c)) keep.push(a, b, c); }
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + nor.getX(i) * .009, pos.getY(i) + nor.getY(i) * .014, pos.getZ(i) + nor.getZ(i) * .009);
  g.setIndex(keep); for (const k of Object.keys(g.morphAttributes)) delete g.morphAttributes[k];
  const t = curlTex();
  const cap = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 2.5, roughness: .75 })); cap.name = 'HairCap'; cap.castShadow = true; cap.frustumCulled = false;
  head.parent.add(cap); cap.bind(head.skeleton, head.bindMatrix);
  hair.visible = false;
}
// The page may not fetch data: or blob: URLs, so the glTF JSON (buffer embedded as base64) is repacked in memory into a .glb.
function gltfJsonToGlb(text) {
  const json = JSON.parse(text);
  const uri = json.buffers[0].uri || '', b64 = uri.slice(uri.indexOf(',') + 1), raw = atob(b64);
  const bin = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) bin[i] = raw.charCodeAt(i);
  delete json.buffers[0].uri; json.buffers[0].byteLength = bin.length;
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jPad = (4 - jsonBytes.length % 4) % 4, bPad = (4 - bin.length % 4) % 4, jLen = jsonBytes.length + jPad, bLen = bin.length + bPad, total = 28 + jLen + bLen;
  const out = new ArrayBuffer(total), dv = new DataView(out), u8 = new Uint8Array(out);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, jLen, true); dv.setUint32(16, 0x4E4F534A, true); u8.set(jsonBytes, 20); for (let i = 0; i < jPad; i++) u8[20 + jsonBytes.length + i] = 0x20;
  const b0 = 20 + jLen; dv.setUint32(b0, bLen, true); dv.setUint32(b0 + 4, 0x004E4942, true); u8.set(bin, b0 + 8);
  return out;
}
const GL_WRAP = { 33071: THREE.ClampToEdgeWrapping, 33648: THREE.MirroredRepeatWrapping, 10497: THREE.RepeatWrapping };
class EmbeddedTextures {
  constructor(parser) { this.parser = parser; this.name = 'VALLEY_embedded_textures'; }
  loadTexture(index) {
    const parser = this.parser, json = parser.json, def = json.textures[index], src = json.images[def.source];
    if (!src || src.bufferView === undefined) return null;
    return parser.getDependency('bufferView', src.bufferView).then(buf => {
      const blob = new Blob([buf], { type: src.mimeType || 'image/png' });
      return createImageBitmap(blob, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }).catch(() => createImageBitmap(blob));
    }).then(bmp => {
      const t = new THREE.Texture(bmp); t.flipY = false;
      const smp = (json.samplers || [])[def.sampler] || {};
      t.wrapS = GL_WRAP[smp.wrapS] || THREE.RepeatWrapping; t.wrapT = GL_WRAP[smp.wrapT] || THREE.RepeatWrapping;
      t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.userData.mimeType = src.mimeType; t.needsUpdate = true;
      return t;
    });
  }
}
let sourceModel = null, idleClip = null;
const POSTURE = (() => { const q = new URLSearchParams(location.search); return { tilt: +(q.get('tilt') || .12) }; })();
const JACKET_HEM = (() => { const m = /hem=([\d.]+)/.exec(location.search); return m ? +m[1] : .9; })();
async function loadCharacter(onProgress) {
  const loader = new GLTFLoader(); loader.register(p => new EmbeddedTextures(p));
  const once = async (url, i) => { const inline = document.getElementById('model:' + url); let text; if (inline) text = inline.textContent; else { const res = await fetch(url); if (!res.ok) throw new Error(`HTTP ${res.status}`); text = await res.text(); } // the downloadable single-file version carries the models inline
    onProgress(i, 1); return await new Promise((ok, fail) => loader.parse(gltfJsonToGlb(text), '', ok, fail)); };
  const load = async (url, i) => { for (let a = 1; ; a++) { try { return await once(url, i); } catch (e) { if (a >= 3) throw new Error(`${url}: ${e && e.message || e}`); await new Promise(r => setTimeout(r, 600 * a)); } } };
  const [avatar, anims] = await Promise.all([load('models/boy.json', 0), load('models/anims.json', 1)]);
  const model = avatar.scene;
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (/Beard/i.test(o.name)) o.visible = false; if (o.material) o.material.envMapIntensity = .6; } });
  try { fixHair(model); } catch (e) { console.warn('hair', e); }
  // the source outfit is a tailcoat whose tails hang to the knees; cut it to suit-jacket length so the trousers (and seat) show
  try { model.traverse(o => {
    if (!o.isSkinnedMesh || !/Outfit_Top/.test(o.material.name || '')) return;
    const g = o.geometry, p = g.attributes.position, ix = g.index; if (!ix) return;
    const keep = [];
    for (let t = 0; t < ix.count; t += 3) { const a = ix.getX(t), b = ix.getX(t + 1), c = ix.getX(t + 2); if (Math.min(p.getY(a), p.getY(b), p.getY(c)) > JACKET_HEM) keep.push(a, b, c); }
    g.setIndex(keep);
  }); } catch (e) { console.warn('jacket', e); }
  const bones = {}; model.traverse(o => { if (o.isBone) bones[o.name] = o; });
  // retarget the mocap clips onto the avatar (same bone layout); the hips track is moved through world space
  model.updateMatrixWorld(true); anims.scene.updateMatrixWorld(true);
  const srcHips = anims.scene.getObjectByName('mixamorigHips');
  const qS = new THREE.Quaternion(), qA = new THREE.Quaternion();
  if (srcHips) srcHips.parent.getWorldQuaternion(qS);
  if (bones.Hips) bones.Hips.parent.getWorldQuaternion(qA);
  const qFix = qA.clone().invert().multiply(qS);
  const MS = srcHips ? srcHips.parent.matrixWorld.clone() : new THREE.Matrix4();
  const MAinv = bones.Hips ? bones.Hips.parent.matrixWorld.clone().invert() : new THREE.Matrix4();
  const aRest = bones.Hips ? bones.Hips.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1, 0);
  const sRest = srcHips ? srcHips.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1, 0);
  const ratio = aRest.y / sRest.y, tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3();
  const clips = [];
  for (const clip of anims.animations) {
    if (clip.name === 'TPose') continue;
    const tracks = [];
    for (const t of clip.tracks) {
      const name = t.name.replace('mixamorig', ''), [bone, prop] = name.split('.');
      if (!bones[bone]) continue;
      if (prop === 'position') {
        if (bone !== 'Hips') continue;
        const v = t.values.slice(), ys = [];
        for (let i = 0; i < v.length; i += 3) { tmpV.set(v[i], v[i + 1], v[i + 2]).applyMatrix4(MS); ys.push(tmpV.y * ratio); }
        // keep the clip's hips at this avatar's standing height (scaling alone left him squatting when he ran);
        // walking and running sit a little lower than standing, as real gaits do
        const mean = ys.reduce((a, b) => a + b, 0) / ys.length, drop = clip.name === 'Run' ? .05 : clip.name === 'Walk' ? .025 : 0;
        const shift = aRest.y * (1 - drop) - mean;
        for (let i = 0, k = 0; i < v.length; i += 3, k++) { tmpV.set(aRest.x, ys[k] + shift, aRest.z).applyMatrix4(MAinv); v[i] = tmpV.x; v[i + 1] = tmpV.y; v[i + 2] = tmpV.z; }
        tracks.push(new THREE.VectorKeyframeTrack(name, t.times, v)); continue;
      }
      if (prop === 'quaternion') { const v = t.values.slice(); if (bone === 'Hips') for (let i = 0; i < v.length; i += 4) tmpQ.fromArray(v, i).premultiply(qFix).toArray(v, i); tracks.push(new THREE.QuaternionKeyframeTrack(name, t.times, v)); }
    }
    clips.push(new THREE.AnimationClip(clip.name, clip.duration, tracks));
  }
  idleClip = clips.find(c => c.name === 'Idle');
  sourceModel = model;
  // the player: a clone in a black tuxedo
  const hero = SkeletonUtils.clone(model); dress(hero, 'hero');
  hero.scale.setScalar(.95); hero.rotation.y = Math.PI;
  boy.root.add(hero);
  hero.traverse(o => { if (o.isBone && o.name === 'Spine') boy.spine = o; });
  boy.mixer = new THREE.AnimationMixer(hero);
  for (const c of clips) { const a = boy.mixer.clipAction(c); a.enabled = true; a.setEffectiveWeight(0); a.play(); boy.actions[c.name] = a; }
  setAnim('Idle', 0);
  boy.ready = true;
}
function setAnim(name, fade = .3) {
  if (boy.current === name || !boy.actions[name]) return;
  const next = boy.actions[name];
  next.reset(); next.setEffectiveTimeScale(1); next.setEffectiveWeight(1);
  if (boy.current) boy.actions[boy.current].crossFadeTo(next, fade, true); else next.fadeIn(fade);
  next.play(); boy.current = name;
}
const dealers = [];
function placeDealers() {
  if (!sourceModel || !idleClip) return;
  const looks = ['dealerA', 'dealerB', 'dealerC'];
  dealerSpots.forEach((p, i) => {
    const m = SkeletonUtils.clone(sourceModel); dress(m, looks[i % 3]);
    m.scale.setScalar(.95); m.rotation.y = Math.PI;
    const root = new THREE.Group(); root.add(m); root.position.set(p.x, 0, p.z); root.rotation.y = p.y + Math.PI; scene.add(root);
    // the yaw stored in .y faces the dealer toward the player side (+z of the table)
    root.rotation.y = p.y;
    const mixer = new THREE.AnimationMixer(m); const a = mixer.clipAction(idleClip); a.play(); a.time = Math.random() * idleClip.duration; a.timeScale = .85 + Math.random() * .3;
    dealers.push({ root, mixer });
  });
}

// ---------------------------------------------------------------- walking: input, collision, A* paths
const keys = new Set();
let mode = 'title'; // title | intro | walk | auto | enter | play | exit
const orbit = { yaw: 0, pitch: .3, dist: 3.4, dragging: false, lx: 0, ly: 0, moved: 0 };
addEventListener('keydown', e => {
  if (mode === 'play') { if (e.code === 'Escape') leaveGame(); return; }
  keys.add(e.code);
  if ((e.code === 'KeyE' || e.code === 'Enter') && mode === 'walk' && nearSt) { e.preventDefault(); useStation(nearSt); }
  if (e.code === 'Tab') { e.preventDefault(); toggleSheet('#menu'); }
  if (e.code === 'KeyC' && mode !== 'title') toggleSheet('#cage');
  if (e.code === 'KeyG' && mode !== 'title') toggleSheet('#settings');
  if (e.code === 'Escape') closeSheets();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
canvas3d.addEventListener('pointerdown', e => { orbit.dragging = true; orbit.lx = e.clientX; orbit.ly = e.clientY; orbit.moved = 0; canvas3d.setPointerCapture(e.pointerId); });
canvas3d.addEventListener('pointermove', e => {
  if (!orbit.dragging || touchStick.id === e.pointerId) return;
  const dx = e.clientX - orbit.lx, dy = e.clientY - orbit.ly; orbit.lx = e.clientX; orbit.ly = e.clientY; orbit.moved += Math.abs(dx) + Math.abs(dy);
  orbit.yaw -= dx * .006; orbit.pitch = Math.max(-.1, Math.min(1.15, orbit.pitch + dy * .004));
});
canvas3d.addEventListener('pointerup', e => { orbit.dragging = false; if (orbit.moved < 6 && (mode === 'walk' || mode === 'auto')) pick(e); });
canvas3d.addEventListener('wheel', e => { orbit.dist = Math.max(1.6, Math.min(8, orbit.dist + e.deltaY * .003)); }, { passive: true });
const ray = new THREE.Raycaster();
function pick(e) {
  ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hits = ray.intersectObjects(pickables.map(p => p.obj), true);
  if (!hits.length) return;
  let o = hits[0].object; let found = null;
  while (o && !found) { found = pickables.find(p => p.obj === o); o = o.parent; }
  if (found) goTo(found.st, true);
}
const touchStick = { id: null, x: 0, y: 0, dx: 0, dy: 0 };
const stickEl = $('#walkstick');
stickEl.addEventListener('pointerdown', e => { touchStick.id = e.pointerId; const r = stickEl.getBoundingClientRect(); touchStick.x = r.left + r.width / 2; touchStick.y = r.top + r.height / 2; stickEl.setPointerCapture(e.pointerId); moveStick(e); e.stopPropagation(); });
stickEl.addEventListener('pointermove', e => { if (e.pointerId === touchStick.id) moveStick(e); });
const endStick = e => { if (e.pointerId === touchStick.id) { touchStick.id = null; touchStick.dx = touchStick.dy = 0; stickEl.style.setProperty('--kx', '0px'); stickEl.style.setProperty('--ky', '0px'); } };
stickEl.addEventListener('pointerup', endStick); stickEl.addEventListener('pointercancel', endStick);
function moveStick(e) {
  let dx = (e.clientX - touchStick.x) / 50, dy = (e.clientY - touchStick.y) / 50; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
  touchStick.dx = dx; touchStick.dy = dy; stickEl.style.setProperty('--kx', dx * 30 + 'px'); stickEl.style.setProperty('--ky', dy * 30 + 'px');
}
const R = .28;
function collide(p) {
  const inside = p.z < HALL.maxZ - .05;
  if (inside) p.x = Math.max(HALL.minX + R, Math.min(HALL.maxX - R, p.x));
  else { p.x = Math.max(-6, Math.min(6, p.x)); if (p.z < HALL.maxZ + R) p.x = Math.max(-HALL.door + R, Math.min(HALL.door - R, p.x)); }
  if (p.z > HALL.maxZ - R && p.z < HALL.maxZ + R && Math.abs(p.x) > HALL.door - R) p.z = p.z < HALL.maxZ ? HALL.maxZ - R : HALL.maxZ + R;
  p.z = Math.max(HALL.minZ + R, Math.min(HALL.maxZ + 8, p.z));
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(c.maxX, p.x)), cz = Math.max(c.minZ, Math.min(c.maxZ, p.z)), dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d < R) { if (d > 1e-5) { p.x = cx + dx / d * R; p.z = cz + dz / d * R; } else p.x += R; }
  }
}
// Navigation grid over the floor (and the walk outside the door).
const NAV = { cell: .25, x0: HALL.minX, z0: HALL.minZ, w: 0, h: 0, grid: null };
function buildNav() {
  NAV.w = Math.ceil((HALL.maxX - HALL.minX) / NAV.cell); NAV.h = Math.ceil((HALL.maxZ + 6 - HALL.minZ) / NAV.cell);
  NAV.grid = new Uint8Array(NAV.w * NAV.h);
  const pad = R + .08;
  for (let j = 0; j < NAV.h; j++) for (let i = 0; i < NAV.w; i++) {
    const x = NAV.x0 + (i + .5) * NAV.cell, z = NAV.z0 + (j + .5) * NAV.cell;
    let blocked = x < HALL.minX + pad || x > HALL.maxX - pad || z < HALL.minZ + pad;
    if (z > HALL.maxZ - pad && z < HALL.maxZ + pad && Math.abs(x) > HALL.door - pad) blocked = true;
    if (z >= HALL.maxZ + pad && Math.abs(x) > 6) blocked = true;
    if (!blocked) for (const c of colliders) if (x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad) { blocked = true; break; }
    NAV.grid[j * NAV.w + i] = blocked ? 1 : 0;
  }
}
const cellOf = p => [Math.max(0, Math.min(NAV.w - 1, Math.floor((p.x - NAV.x0) / NAV.cell))), Math.max(0, Math.min(NAV.h - 1, Math.floor((p.z - NAV.z0) / NAV.cell)))];
const cellPos = (i, j) => new THREE.Vector3(NAV.x0 + (i + .5) * NAV.cell, 0, NAV.z0 + (j + .5) * NAV.cell);
function nearestFree(i, j) {
  for (let r = 0; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const a = i + di, b = j + dj;
    if (a >= 0 && b >= 0 && a < NAV.w && b < NAV.h && !NAV.grid[b * NAV.w + a]) return [a, b];
  }
  return [i, j];
}
function findPath(from, to) {
  let [si, sj] = nearestFree(...cellOf(from)), [ti, tj] = nearestFree(...cellOf(to));
  const W = NAV.w, N = W * NAV.h, g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const open = [[0, sj * W + si]]; g[sj * W + si] = 0; const goal = tj * W + ti;
  const hf = k => Math.hypot(k % W - ti, (k / W | 0) - tj);
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
    const [, cur] = open.splice(bi, 1)[0]; if (cur === goal) break; if (closed[cur]) continue; closed[cur] = 1;
    const ci = cur % W, cj = cur / W | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= NAV.h) continue;
      const nk = nj * W + ni; if (NAV.grid[nk] || closed[nk]) continue;
      if (di && dj && (NAV.grid[cj * W + ni] || NAV.grid[nj * W + ci])) continue;
      const ng = g[cur] + (di && dj ? 1.414 : 1); if (ng < g[nk]) { g[nk] = ng; came[nk] = cur; open.push([ng + hf(nk), nk]); }
    }
  }
  if (came[goal] < 0 && goal !== sj * W + si) return [to.clone()];
  const cells = []; for (let k = goal; k >= 0; k = came[k]) cells.push(k); cells.reverse();
  // string-pull: keep only the corners we can't see past
  const pts = cells.map(k => cellPos(k % W, k / W | 0)), out = []; let a = 0;
  const clear = (p, q) => { const n = Math.ceil(p.distanceTo(q) / (NAV.cell * .5)); for (let s = 1; s < n; s++) { const t = s / n, [i, j] = cellOf({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t }); if (NAV.grid[j * W + i]) return false; } return true; };
  let start = from.clone();
  while (a < pts.length - 1) { let b = pts.length - 1; while (b > a + 1 && !clear(start, pts[b])) b--; out.push(pts[b]); start = pts[b]; a = b; }
  out.push(to.clone());
  return out;
}
let autoPath = null;
function goTo(st, use) {
  closeSheets();
  if (mode !== 'walk' && mode !== 'auto') return;
  autoPath = { pts: findPath(boy.pos, st.seat), st, use }; mode = 'auto';
}

// ---------------------------------------------------------------- camera
const lookCur = new THREE.Vector3(0, 1.2, 0);
let camTween = null;
function desiredCam() {
  const look = boy.pos.clone().add(new THREE.Vector3(0, 1.45, 0));
  const cp = Math.cos(orbit.pitch);
  const pos = look.clone().add(new THREE.Vector3(Math.sin(orbit.yaw) * cp, Math.sin(orbit.pitch), Math.cos(orbit.yaw) * cp).multiplyScalar(orbit.dist));
  if (boy.pos.z < HALL.maxZ - .2) { pos.x = Math.max(HALL.minX + .2, Math.min(HALL.maxX - .2, pos.x)); pos.z = Math.max(HALL.minZ + .2, Math.min(HALL.maxZ - .2, pos.z)); }
  pos.y = Math.max(.4, Math.min(HALL.h - .3, pos.y));
  // pull the camera in front of anything tall between it and him (slot banks, columns, the cage)
  const dir = pos.clone().sub(look), len = dir.length(); dir.divideScalar(len);
  let hit = len;
  for (const c of colliders) {
    if (!c.h) continue;
    const t = rayBox(look, dir, c.minX - .12, c.maxX + .12, 0, c.h + .12, c.minZ - .12, c.maxZ + .12);
    if (t !== null && t < hit) hit = t;
  }
  if (hit < len) pos.copy(look).addScaledVector(dir, Math.max(.5, hit - .1));
  return { pos, look };
}
function rayBox(o, d, x0, x1, y0, y1, z0, z1) {
  let tmin = 0, tmax = Infinity;
  for (const [oo, dd, a, b] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]]) {
    if (Math.abs(dd) < 1e-8) { if (oo < a || oo > b) return null; continue; }
    let t1 = (a - oo) / dd, t2 = (b - oo) / dd; if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return null;
  }
  return tmin > 0 ? tmin : null;
}
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function tweenCam(toPos, toLook, dur, done) { camTween = { from: camera.position.clone(), fromLook: lookCur.clone(), toPos, toLook, t: 0, dur, done }; }

// ---------------------------------------------------------------- money
const START = 1000;
const wallet = { chips: START, owed: 0, best: 0 };
try { Object.assign(wallet, JSON.parse(localStorage.getItem('casino.wallet') || '{}')); } catch (e) { }
const balSubs = new Set();
function saveWallet() { try { localStorage.setItem('casino.wallet', JSON.stringify(wallet)); } catch (e) { } }
function syncWallet(dir) {
  $('#w-chips').textContent = K.fmt(wallet.chips);
  const net = wallet.chips - wallet.owed - START;
  $('#w-sub').textContent = wallet.owed ? `owe ${K.fmt(wallet.owed)} · net ${net >= 0 ? '+' : '−'}${K.fmt(Math.abs(net))}` : `net ${net >= 0 ? '+' : '−'}${K.fmt(Math.abs(net))}`;
  const w = $('#wallet'); if (dir) { w.classList.remove('up', 'down'); void w.offsetWidth; w.classList.add(dir); }
  $('#cg-chips').textContent = K.fmt(wallet.chips); $('#cg-owed').textContent = K.fmt(wallet.owed);
  $('#cg-net').textContent = (net >= 0 ? '+' : '−') + K.fmt(Math.abs(net)); $('#cg-best').textContent = K.fmt(wallet.best);
  for (const b of document.querySelectorAll('[data-pay]')) b.disabled = !wallet.owed || wallet.chips <= 0;
  saveWallet(); balSubs.forEach(f => { try { f(wallet.chips); } catch (e) { } });
}
// The api each game receives. Amounts are whole dollars; bet() takes chips, win() returns stake + winnings.
function gameApi() {
  return {
    get balance() { return wallet.chips; },
    bet(d) { d = Math.round(d); if (!(d > 0) || d > wallet.chips) return false; wallet.chips -= d; syncWallet('down'); return true; },
    win(d) { d = Math.round(d); if (!(d > 0)) return; wallet.chips += d; if (d > wallet.best) wallet.best = d; syncWallet('up'); },
    toast,
    exit: () => leaveGame(),
    onBalance(fn) { balSubs.add(fn); return () => balSubs.delete(fn); }
  };
}
document.querySelectorAll('[data-mk]').forEach(b => b.addEventListener('click', () => {
  const d = +b.dataset.mk; wallet.chips += d; wallet.owed += d; syncWallet('up'); K.sfx.chips(6);
  $('#cage-msg').textContent = `Marker for ${K.fmt(d)} signed. Good luck.`;
}));
document.querySelectorAll('[data-pay]').forEach(b => b.addEventListener('click', () => {
  const want = b.dataset.pay === 'all' ? wallet.owed : Math.min(+b.dataset.pay, wallet.owed), d = Math.min(want, wallet.chips);
  if (d <= 0) return; wallet.chips -= d; wallet.owed -= d; syncWallet('down'); K.sfx.chips(4);
  $('#cage-msg').textContent = wallet.owed ? `Paid ${K.fmt(d)}. You still owe ${K.fmt(wallet.owed)}.` : `Paid ${K.fmt(d)}. Your markers are cleared.`;
}));
$('#cg-reset').addEventListener('click', () => { wallet.chips = START; wallet.owed = 0; wallet.best = 0; syncWallet(); $('#cage-msg').textContent = 'Fresh start: $1,000 in chips, nothing owed.'; });

// ---------------------------------------------------------------- playing a game
let running = null, current = null;
function useStation(st) {
  if (st.kind === 'cage') { openSheet('#cage'); return; }
  if (st.kind === 'tank') { const n = ['Goldie', 'Lucky', 'Jackpot', 'Nugget', 'Bubbles', 'High Roller', 'Sir Fins', 'Double Down'][Math.random() * 8 | 0]; toast(`You tap the glass. ${n} swims over to say hi. Goldfish are said to bring luck at the tables.`); for (let i = 0; i < 6; i++) K.tone(900 + i * 120, .06, { type: 'sine', vol: .05, delay: i * .08 }); return; }
  if (st.kind === 'bar') { const d = ['an Old Fashioned', 'a Martini, shaken', 'a ginger ale', 'a Negroni', 'a club soda with lime', 'a Manhattan'][Math.random() * 6 | 0]; toast(`The bartender slides over ${d}. On the house.`); K.sfx.chip(); return; }
  if (!st.open) { toast(`${st.title} is closed right now.`); return; }
  current = st; mode = 'enter';
  boy.pos.copy(st.seat); boy.yaw = st.yaw; setAnim('Idle');
  $('#prompt').hidden = true; closeSheets();
  tweenCam(st.cam.pos.clone(), st.cam.look.clone(), 1.0, () => openGame(st));
}
async function openGame(st) {
  const def = GAMES[st.game];
  const play = $('#play'), root = $('#play-root');
  play.hidden = false; requestAnimationFrame(() => play.classList.add('on'));
  $('#hud').hidden = true; stickEl.hidden = true;
  mode = 'play'; hum.duck(.4);
  try { running = def.mount(root, gameApi()); }
  catch (e) { console.error(e); toast(`${st.title} hit a snag and closed.`); leaveGame(); }
}
function leaveGame() {
  if (mode !== 'play') return;
  try { running && running.unmount && running.unmount(); } catch (e) { console.error(e); }
  running = null; $('#play-root').innerHTML = '';
  const play = $('#play'); play.classList.remove('on'); setTimeout(() => { if (mode !== 'play') play.hidden = true; }, 380);
  $('#hud').hidden = false; stickEl.hidden = false;
  mode = 'exit'; hum.duck(1);
  // step back from the table and swing the camera behind him
  if (current) { const back = new THREE.Vector3(Math.sin(current.yaw + Math.PI), 0, Math.cos(current.yaw + Math.PI)).multiplyScalar(.25); boy.pos.add(back); collide(boy.pos); orbit.yaw = current.yaw + Math.PI; }
  const d = desiredCam();
  tweenCam(d.pos, d.look, .8, () => { mode = 'walk'; });
  canvas3d.focus();
}

// ---------------------------------------------------------------- sound: room hum, slot chimes, lounge music
// Casino floor soundscape, all synthesized: room tone, a crowd of murmuring voices (formant-filtered
// oscillators speaking in syllable rhythms), the odd laugh or craps cheer, and a sea of slot machines
// (chimes tuned to one key, reel stops, coin payouts, the occasional jackpot bell).
const hum = (() => {
  let a = null, bus = null, crowd = null, slots = null, on = false, duckV = 1, near = 0;
  const timers = [], voices = [];
  const VOL = .55, VOWELS = [[730, 1090], [530, 1840], [270, 2290], [570, 840], [300, 870], [660, 1720], [440, 1020]];
  const later = (fn, ms) => { const id = setTimeout(() => { const i = timers.indexOf(id); if (i >= 0) timers.splice(i, 1); if (on) fn(); }, ms); timers.push(id); };
  const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
  function build() {
    a = K.audioCtx(); if (!a) return false;
    bus = a.createGain(); bus.gain.value = 0; bus.connect(a.destination);
    // a short slap-back echo gives the room some size
    const dly = a.createDelay(1); dly.delayTime.value = .11; const fb = a.createGain(); fb.gain.value = .3; const wet = a.createGain(); wet.gain.value = .3;
    bus.connect(dly); dly.connect(fb).connect(dly); dly.connect(wet).connect(a.destination);
    // room tone
    const n = a.sampleRate * 4, buf = a.createBuffer(2, n, a.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); let last = 0; for (let i = 0; i < n; i++) { last = last * .985 + (Math.random() * 2 - 1) * .015; d[i] = last * 6; } }
    const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; const rg = a.createGain(); rg.gain.value = .22;
    src.connect(lp).connect(rg).connect(bus); src.start();
    // crowd bus: muffled, as if from across the room
    crowd = a.createGain(); crowd.gain.value = .5;
    const clp = a.createBiquadFilter(); clp.type = 'lowpass'; clp.frequency.value = 1700; clp.Q.value = .4;
    crowd.connect(clp).connect(bus);
    slots = a.createGain(); slots.gain.value = .5; slots.connect(bus);
    for (let i = 0; i < 14; i++) voices.push(makeVoice(i));
    return true;
  }
  function makeVoice(i) {
    const male = i % 3 !== 0, base = male ? rnd(95, 140) : rnd(175, 240);
    const osc = a.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = base;
    const vib = a.createOscillator(), vg = a.createGain(); vib.frequency.value = rnd(4, 6); vg.gain.value = base * .012; vib.connect(vg).connect(osc.frequency); vib.start();
    const f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.Q.value = 7; f2.Q.value = 9;
    const g2 = a.createGain(); g2.gain.value = .5;
    const env = a.createGain(); env.gain.value = 0;
    const pan = a.createStereoPanner(); pan.pan.value = rnd(-.9, .9);
    osc.connect(f1).connect(env); osc.connect(f2).connect(g2).connect(env); env.connect(pan).connect(crowd); osc.start();
    const v = { osc, f1, f2, env, pan, base, amp: rnd(.08, .2) };
    later(() => phrase(v), rnd(0, 4000));
    return v;
  }
  // One spoken phrase: syllables every ~0.2 s with a falling pitch contour, then a pause.
  function phrase(v, laugh = false) {
    const t0 = a.currentTime + .05, n = laugh ? 5 + (Math.random() * 4 | 0) : 4 + (Math.random() * 14 | 0);
    let t = t0; const p0 = v.base * (laugh ? 1.5 : rnd(.95, 1.15));
    for (let k = 0; k < n; k++) {
      const syl = laugh ? rnd(.11, .14) : rnd(.12, .28), [F1, F2] = laugh ? VOWELS[0] : VOWELS[Math.random() * VOWELS.length | 0];
      const pitch = p0 * (1 - k / n * (laugh ? .25 : .18)) * rnd(.96, 1.06);
      v.osc.frequency.setTargetAtTime(pitch, t, .03);
      v.f1.frequency.setTargetAtTime(F1 * rnd(.9, 1.1), t, .025); v.f2.frequency.setTargetAtTime(F2 * rnd(.9, 1.1), t, .025);
      const amp = v.amp * (laugh ? 1.4 : rnd(.6, 1.1));
      v.env.gain.setTargetAtTime(amp, t, .02); v.env.gain.setTargetAtTime(amp * .15, t + syl * .7, .03);
      t += syl;
    }
    v.env.gain.setTargetAtTime(0, t, .06);
    const rest = (t - t0) * 1000 + rnd(400, laugh ? 3000 : 5000);
    later(() => phrase(v, Math.random() < .05), rest);
  }
  // a whoop from the craps tables: the crowd swells, then settles
  function cheer() {
    const t = a.currentTime;
    crowd.gain.setTargetAtTime(1.1, t, .15); crowd.gain.setTargetAtTime(.5, t + 1.6, .6);
    for (const v of voices.slice(0, 6)) { v.osc.frequency.setTargetAtTime(v.base * 1.6, t, .1); v.f1.frequency.setTargetAtTime(700, t, .05); v.f2.frequency.setTargetAtTime(1500, t, .05); v.env.gain.setTargetAtTime(v.amp * 1.6, t, .05); v.env.gain.setTargetAtTime(0, t + rnd(.8, 1.4), .2); }
    later(cheer, rnd(45000, 110000));
  }
  // slot sounds
  function note(f, t, dur, vol, type = 'triangle', panV = 0) {
    const o = a.createOscillator(), g = a.createGain(), pn = a.createStereoPanner(); o.type = type; o.frequency.value = f; pn.pan.value = panV;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    o.connect(g).connect(pn).connect(slots); o.start(t); o.stop(t + dur + .05);
  }
  const KEY = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5]; // C major pentatonic, the casino key
  function slotEvent() {
    const t = a.currentTime + .02, pn = rnd(-1, 1), r = Math.random(), v = rnd(.5, 1);
    if (r < .38) { // a little win chime run
      const n = 3 + (Math.random() * 6 | 0), up = Math.random() < .7;
      for (let i = 0; i < n; i++) { const f = KEY[up ? Math.min(7, i + (Math.random() * 2 | 0)) : 7 - Math.min(7, i)]; note(f, t + i * .075, .35, .035 * v, 'triangle', pn); note(f * 2, t + i * .075, .18, .01 * v, 'sine', pn); }
    } else if (r < .7) { // spin and three reel stops
      for (let i = 0; i < 3; i++) { note(110 + i * 8, t + .45 + i * .28, .07, .05 * v, 'square', pn); note(1800, t + .45 + i * .28, .02, .012 * v, 'square', pn); }
      for (let i = 0; i < 8; i++) note(KEY[i % 4] * .5, t + i * .05, .04, .01 * v, 'square', pn);
    } else if (r < .93) { // credits ticking up
      const n = 10 + (Math.random() * 25 | 0); for (let i = 0; i < n; i++) note(rnd(2100, 2600), t + i * .045, .06, .014 * v, 'sine', pn);
    } else if (r < .985) { // a bigger win tune
      [0, 2, 4, 5, 4, 5, 7].forEach((k, i) => note(KEY[k], t + i * .11, .3, .04 * v, 'square', pn));
    } else { // jackpot bell somewhere on the floor
      for (let i = 0; i < 28; i++) note(i % 2 ? 1318.5 : 1046.5, t + i * .07, .1, .03, 'square', pn);
    }
    later(slotEvent, rnd(120, 520) / (.6 + near));
  }
  return {
    setOn(want) {
      if (want === on) return;
      if (want) {
        if (!bus && !build()) return;
        on = true; for (const v of voices) later(() => phrase(v), rnd(0, 3000));
        later(slotEvent, 300); later(cheer, rnd(20000, 60000));
        bus.gain.cancelScheduledValues(a.currentTime); bus.gain.setTargetAtTime(VOL * duckV, a.currentTime, .8);
      } else {
        on = false; timers.splice(0).forEach(clearTimeout);
        if (bus) { bus.gain.cancelScheduledValues(a.currentTime); bus.gain.setTargetAtTime(0, a.currentTime, .1); for (const v of voices) v.env.gain.setTargetAtTime(0, a.currentTime, .05); }
      }
    },
    // quieter while seated at a game
    duck(v) { duckV = v; if (bus && on) bus.gain.setTargetAtTime(VOL * v, a.currentTime, .4); },
    // 0..1: how close the player is to the slot banks
    setNear(v) { near = v; if (slots) slots.gain.setTargetAtTime(.35 + v * .9, a.currentTime, .5); }
  };
})();
// Lounge music: a slow ii–V–I jazz loop on an electric-piano voice with a walking bass.
const music = (() => {
  let timer = null, out = null, vol = .35, step = 0, next = 0;
  const CH = [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [45, 49, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [48, 52, 55, 59]];
  const BASS = [[38, 41, 45, 43], [43, 47, 45, 41], [36, 40, 43, 45], [33, 37, 40, 41], [38, 41, 45, 43], [31, 35, 38, 40], [36, 40, 43, 40], [36, 38, 40, 42]];
  const hz = m => 440 * Math.pow(2, (m - 69) / 12), BEAT = .62;
  function note(a, f, t, dur, v, type) { const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .015); g.gain.exponentialRampToValueAtTime(.0005, t + dur); o.connect(g).connect(out); o.start(t); o.stop(t + dur + .05); }
  function schedule() {
    const a = K.audioCtx(); if (!a || !out) return;
    while (next < a.currentTime + 1.2) {
      const bar = Math.floor(step / 4) % 8, beat = step % 4;
      note(a, hz(BASS[bar][beat]), next, BEAT * .9, .32, 'triangle');
      if (beat === 0 || (beat === 2 && Math.random() < .5) || (beat === 3 && Math.random() < .25)) {
        const off = beat === 0 ? 0 : BEAT * .5; for (const m of CH[bar]) { note(a, hz(m + 12), next + off, BEAT * 1.6, .045, 'sine'); note(a, hz(m + 24) * 1.003, next + off, BEAT * .9, .012, 'sine'); }
      }
      if (Math.random() < .3) note(a, hz(CH[bar][Math.random() * 4 | 0] + 24), next + BEAT * .5, BEAT * .6, .025, 'triangle'); // light melody
      next += BEAT; step++;
    }
  }
  return {
    start() { const a = K.audioCtx(); if (!a || timer) return; out = a.createGain(); out.gain.value = vol; out.connect(a.destination); next = a.currentTime + .1; timer = setInterval(schedule, 300); },
    setVolume(v) { vol = v; if (out) out.gain.setTargetAtTime(v, K.audioCtx().currentTime, .2); }
  };
})();
let ambT = 0;
let nearT = 0;
function ambience(dt) {
  if ((nearT -= dt) <= 0 && stations.length) {
    nearT = .5; let d = 99;
    for (const st of stations) if (st.kind === 'machine') d = Math.min(d, Math.hypot(st.seat.x - boy.pos.x, st.seat.z - boy.pos.z));
    hum.setNear(Math.max(0, Math.min(1, 1 - (d - 1) / 6)));
  }
  if (!settings.sound || !settings.ambience || mode === 'play') return;
  ambT -= dt; if (ambT > 0) return; ambT = .25 + Math.random() * .8;
  // slot chimes from whatever machines are near, table chips from nearby tables
  let best = null, bd = 9;
  for (let k = 0; k < 6; k++) { const s = stations[Math.random() * stations.length | 0]; const d = s.seat.distanceTo(boy.pos); if (d < bd) { bd = d; best = s; } }
  if (!best) return;
  const v = Math.max(0, .05 - bd * .006); if (v < .004) return;
  if (best.kind === 'machine') { const base = [523, 587, 659, 784, 880][Math.random() * 5 | 0], n = 2 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) K.tone(base * [1, 1.25, 1.5, 2][i % 4], .09, { type: 'triangle', vol: v, delay: i * .07 }); }
  else if (best.kind === 'table') { if (Math.random() < .5) K.sfx.chip(); }
  if (Math.random() < .015) for (let i = 0; i < 18; i++) K.tone([784, 988, 1175, 1568][i % 4], .08, { type: 'square', vol: .012, delay: i * .06 }); // a jackpot somewhere
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let nearSt = null, introT = 0, blinkT = 0;
const perf = { t: 0, n: 0, slow: 0, fast: 0, last: performance.now() };
function watchFrameRate() {
  const now = performance.now(), ft = now - perf.last; perf.last = now;
  if (!settings.auto || mode === 'play' || mode === 'title' || document.hidden || ft > 250) return;
  perf.t += ft; perf.n++; if (perf.t < 1500) return;
  const avg = perf.t / perf.n; perf.t = 0; perf.n = 0;
  if (avg > 21 && perfScale > .5) { if (++perf.slow >= 2) { perfScale = Math.max(.5, perfScale - .15); perf.slow = 0; applyResolution(); } perf.fast = 0; }
  else if (avg < 13 && perfScale < 1) { if (++perf.fast >= 4) { perfScale = Math.min(1, perfScale + .15); perf.fast = 0; applyResolution(); } perf.slow = 0; }
  else { perf.slow = perf.fast = 0; }
}
function tick() {
  watchFrameRate();
  const dt = Math.min(clock.getDelta(), .05);
  if (mode !== 'play') {
    updateFloor(dt);
    for (const f of idle) f(dt);
    if (boy.mixer) boy.mixer.update(dt);
    // the mocap walk leans forward like a soldier on patrol; straighten his back while he walks
    if (boy.spine) { const w = boy.current === 'Walk' || boy.current === 'Run' ? 1 : 0; boy.lean = (boy.lean || 0) + (w - (boy.lean || 0)) * Math.min(1, dt * 6); if (boy.lean > .01) boy.spine.rotateX(-POSTURE.tilt * boy.lean); }
    boy.root.position.copy(boy.pos); boy.root.rotation.y = boy.yaw;
    if (settings.dealers) for (const d of dealers) if (Math.abs(d.root.position.z - boy.pos.z) < 16) d.mixer.update(dt);
    blinkT += dt;
    for (const b of blinkers) if (b.bulbs) b.bulbs.material.color.setScalar(2 + Math.sin(blinkT * 6) * .8);
    updateShadows();
    composer.render();
  }
  ambience(dt);
  requestAnimationFrame(tick);
}
function updateFloor(dt) {
  if (mode === 'title') {
    const t = performance.now() / 1000 * .06;
    camera.position.set(Math.sin(t) * 6, 3.4, -6 + Math.cos(t) * 3); lookCur.set(0, 1.2, -17); camera.lookAt(lookCur); return;
  }
  if (camTween) {
    camTween.t += dt / camTween.dur; const t = ease(Math.min(1, camTween.t));
    camera.position.lerpVectors(camTween.from, camTween.toPos, t); lookCur.lerpVectors(camTween.fromLook, camTween.toLook, t); camera.lookAt(lookCur);
    if (camTween.t >= 1) { const d = camTween.done; camTween = null; d && d(); }
    return;
  }
  if (mode === 'intro') {
    introT += dt; boy.pos.z -= 2.0 * dt; boy.yaw = Math.PI; setAnim('Walk'); if (boy.actions.Walk) boy.actions.Walk.setEffectiveTimeScale(1.5);
    const d = desiredCam(); camera.position.lerp(d.pos, Math.min(1, dt * 1.5)); lookCur.lerp(d.look, Math.min(1, dt * 3)); camera.lookAt(lookCur);
    if (boy.pos.z < HALL.maxZ - 2.5) { mode = 'walk'; setAnim('Idle'); $('#hud').hidden = false; toast('Walk up to any table or machine and press E — or press Tab to pick a game.'); }
    return;
  }
  let mx = 0, mz = 0;
  if (mode === 'walk') {
    const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - touchStick.dy;
    const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touchStick.dx;
    const fx = -Math.sin(orbit.yaw), fz = -Math.cos(orbit.yaw);
    mx = fx * f - fz * s; mz = fz * f + fx * s;
  } else if (mode === 'auto' && autoPath) {
    if (keys.has('KeyW') || keys.has('KeyS') || keys.has('KeyA') || keys.has('KeyD') || touchStick.id !== null) { autoPath = null; mode = 'walk'; return; }
    const target = autoPath.pts[0], dx = target.x - boy.pos.x, dz = target.z - boy.pos.z, d = Math.hypot(dx, dz);
    if (d < .12) {
      autoPath.pts.shift();
      if (!autoPath.pts.length) { const { st, use } = autoPath; autoPath = null; mode = 'walk'; boy.yaw = st.yaw; if (use) useStation(st); return; }
    } else { mx = dx / d; mz = dz / d; }
  }
  const len = Math.hypot(mx, mz);
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(touchStick.dx, touchStick.dy) > .9 || (mode === 'auto' && autoPath && autoPath.pts.length > 1);
  const speed = len > .01 ? (run ? 2.6 : 1.6) : 0;
  if (len > .01) {
    mx /= len; mz /= len;
    let dy = Math.atan2(mx, mz) - boy.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); boy.yaw += dy * Math.min(1, dt * 10);
    boy.pos.x += mx * speed * dt; boy.pos.z += mz * speed * dt;
    if (mode === 'walk') collide(boy.pos);
    setAnim('Walk', .25);
    if (boy.actions.Walk) boy.actions.Walk.setEffectiveTimeScale(speed > 2 ? 1.75 : 1.18);
    if (!orbit.dragging) { let d2 = (boy.yaw + Math.PI) - orbit.yaw; d2 = Math.atan2(Math.sin(d2), Math.cos(d2)); orbit.yaw += d2 * Math.min(1, dt * (mode === 'auto' ? 1.8 : .8)); }
  } else setAnim('Idle', .35);
  const d = desiredCam(); camera.position.lerp(d.pos, Math.min(1, dt * 6)); lookCur.lerp(d.look, Math.min(1, dt * 8)); camera.lookAt(lookCur);
  // nearest station prompt
  nearSt = null; let best = 1.0;
  for (const s of stations) { const dd = Math.hypot(s.seat.x - boy.pos.x, s.seat.z - boy.pos.z); if (dd < best) { best = dd; nearSt = s; } }
  const pr = $('#prompt');
  if (nearSt && mode === 'walk') {
    pr.hidden = false;
    const k = nearSt.kind;
    $('#prompt-p1').textContent = k === 'cage' ? 'PRESS E · CHIPS AND MARKERS' : k === 'bar' ? 'PRESS E FOR A DRINK' : k === 'tank' ? 'PRESS E TO SAY HELLO' : nearSt.open ? `PRESS E TO PLAY · ${nearSt.limits || ''}` : 'CLOSED';
    $('#prompt-title').textContent = nearSt.title; $('#prompt-blurb').textContent = nearSt.blurb || '';
    $('#prompt-play').textContent = k === 'cage' ? 'Open the cage' : k === 'bar' ? 'Order a drink' : k === 'tank' ? 'Tap the glass' : k === 'machine' ? 'Sit down and play' : 'Take a seat';
  } else pr.hidden = true;
}

// ---------------------------------------------------------------- UI
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 3200); }
function openSheet(sel) { closeSheets(); $(sel).hidden = false; }
function toggleSheet(sel) { const s = $(sel), was = s.hidden; closeSheets(); s.hidden = !was; }
function closeSheets() { for (const s of ['#menu', '#cage', '#settings']) $(s).hidden = true; }
$('#prompt-play').addEventListener('click', () => { if (nearSt && mode === 'walk') useStation(nearSt); });
$('#btn-games').addEventListener('click', () => toggleSheet('#menu'));
$('#btn-cage').addEventListener('click', () => toggleSheet('#cage'));
$('#btn-settings').addEventListener('click', () => toggleSheet('#settings'));
$('#menu-close').addEventListener('click', closeSheets); $('#cage-close').addEventListener('click', closeSheets); $('#settings-close').addEventListener('click', closeSheets);
function buildMenu() {
  const body = $('#menu-body'); body.innerHTML = '';
  const nearestOf = game => stations.filter(s => s.game === game).sort((a, b) => a.seat.distanceTo(boy.pos) - b.seat.distanceTo(boy.pos))[0];
  const sec = (label, ids, acc) => {
    const h = document.createElement('div'); h.className = 'menu-sec'; h.textContent = label; body.appendChild(h);
    const list = document.createElement('div'); list.className = 'menu-list'; body.appendChild(list);
    for (const id of ids) {
      const def = GAMES[id]; if (!def) continue;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'game'; b.style.setProperty('--acc', (def.theme && def.theme.accent) || acc);
      b.innerHTML = `<span class="g-title"></span><span class="g-blurb"></span><span class="g-lim"></span>`;
      b.querySelector('.g-title').textContent = def.title; b.querySelector('.g-blurb').textContent = def.blurb || '';
      const st0 = stations.find(s => s.game === id); b.querySelector('.g-lim').textContent = st0 ? (st0.limits || '') : '';
      b.addEventListener('click', () => { const st = nearestOf(id); if (st) goTo(st, true); });
      list.appendChild(b);
    }
  };
  sec('TABLE GAMES', ['craps', 'blackjack', 'roulette', 'baccarat', 'threecard', 'holdem', 'sicbo', 'bigsix'], '#e8c46a');
  sec('SLOTS', SLOT_IDS, '#ff5ad1');
  sec('VIDEO POKER & KENO', ['videopoker', 'keno'], '#38f4ff');
}
function syncSettingsUI() {
  document.querySelectorAll('input[name=preset]').forEach(r => r.checked = r.value === settings.preset);
  $('#opt-shadows').checked = settings.shadows; $('#opt-bloom').checked = settings.bloom; $('#opt-aa').checked = settings.aa;
  $('#opt-dealers').checked = settings.dealers; $('#opt-auto').checked = settings.auto;
  $('#opt-sound').checked = settings.sound; $('#opt-ambience').checked = settings.ambience; $('#opt-music').value = settings.music;
}
document.querySelectorAll('input[name=preset]').forEach(r => r.addEventListener('change', () => { Object.assign(settings, PRESETS[r.value], { preset: r.value }); syncSettingsUI(); applySettings(); saveSettings(); }));
for (const [id, k] of [['#opt-shadows', 'shadows'], ['#opt-bloom', 'bloom'], ['#opt-aa', 'aa'], ['#opt-dealers', 'dealers'], ['#opt-auto', 'auto'], ['#opt-sound', 'sound'], ['#opt-ambience', 'ambience']])
  $(id).addEventListener('change', e => { settings[k] = e.target.checked; applySettings(); saveSettings(); });
$('#opt-music').addEventListener('input', e => { settings.music = +e.target.value; applySettings(); saveSettings(); });

// ---------------------------------------------------------------- boot
async function boot() {
  const bar = $('#load-bar'), label = $('#load-label');
  const prog = [0, 0]; const setP = (i, v) => { prog[i] = v; bar.style.width = (40 + (prog[0] + prog[1]) / 2 * 55) + '%'; };
  try { await Promise.race([Promise.all(['Bungee', 'Press Start 2P', 'Monoton', 'Playfair Display', 'Chakra Petch'].map(f => document.fonts.load(`40px "${f}"`))), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
  label.textContent = 'Shuffling the decks'; bar.style.width = '8%';
  let n = 0; await loadGames(() => { n++; bar.style.width = (8 + n / GAME_FILES.length * 14) + '%'; });
  label.textContent = 'Building the casino floor'; await new Promise(r => setTimeout(r, 20));
  buildHall(); placeTables(); placeMachines(); buildNav(); buildMenu();
  bar.style.width = '40%'; label.textContent = 'Dealers are getting dressed';
  try { await loadCharacter(setP); placeDealers(); } catch (e) {
    console.error(e); toast(`The characters didn't load (${String(e && e.message || e).slice(0, 120)}). Reload to try again.`);
  }
  boy.pos.set(0, 0, HALL.maxZ + 4.5); boy.yaw = Math.PI;
  syncWallet(); syncSettingsUI(); applySettings();
  bar.style.width = '100%'; label.textContent = 'Ready';
  $('#loader').classList.add('ready');
  tick();
}
$('#enter').addEventListener('click', () => {
  K.audioCtx(); music.start(); applySettings();
  $('#title').classList.add('gone'); setTimeout(() => $('#title').hidden = true, 600);
  mode = 'intro'; introT = 0; orbit.yaw = 0; orbit.pitch = .28; orbit.dist = 3.4;
  [523, 659, 784, 1047].forEach((f, i) => K.tone(f, .2, { type: 'triangle', vol: .1, delay: i * .1 }));
});
window.__casino = { stations, boy, wallet, GAMES, orbit, get mode() { return mode; }, goTo, useStation, leaveGame, camera, renderer };
boot();
