// Valley Arcade — 3D arcade hall, the boy, cabinets and the play overlay.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { createRaid } from './raid.js';
import { createMusic } from './music.js';
import { CATALOG, buildPrize, renderThumbs } from './prizes.js';
import { createClaw } from './claw.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const $ = s => document.querySelector(s);
const Reg = window.ArcadeRegistry;

// ---------------------------------------------------------------- games
const LINEUP = [
  'pacman', 'spaceinvaders', 'donkeykong', 'galaga', 'mspacman', 'asteroids', 'frogger', 'defender',
  'centipede', 'pong', 'digdug', 'tempest', 'breakout', 'qbert', 'joust', 'poleposition',
  'donkeykongjr', 'tron', 'missilecommand', 'triplehunt', 'duckhunt', 'raidonbungelingbay', 'deerhunter', 'heavybarrel', 'nuclearwar', 'taipan', 'nuclearwaramiga'
];
const FALLBACK = {
  pacman: ['Pac-Man', 1980, 'Namco'], spaceinvaders: ['Space Invaders', 1978, 'Taito'], donkeykong: ['Donkey Kong', 1981, 'Nintendo'],
  galaga: ['Galaga', 1981, 'Namco'], mspacman: ['Ms. Pac-Man', 1981, 'Midway'], asteroids: ['Asteroids', 1979, 'Atari'],
  frogger: ['Frogger', 1981, 'Konami'], defender: ['Defender', 1980, 'Williams'], centipede: ['Centipede', 1980, 'Atari'],
  pong: ['Pong', 1972, 'Atari'], digdug: ['Dig Dug', 1982, 'Namco'], tempest: ['Tempest', 1980, 'Atari'],
  breakout: ['Breakout', 1976, 'Atari'], qbert: ['Q*bert', 1982, 'Gottlieb'], joust: ['Joust', 1982, 'Williams'],
  poleposition: ['Pole Position', 1982, 'Namco'], donkeykongjr: ['Donkey Kong Jr.', 1982, 'Nintendo'], tron: ['Tron', 1982, 'Bally Midway'],
  missilecommand: ['Missile Command', 1980, 'Atari'], triplehunt: ['Triple Hunt', 1977, 'Atari'], duckhunt: ['Duck Hunt', 1984, 'Nintendo'],
  raidonbungelingbay: ['Raid on Bungeling Bay', 1984, 'Hudson Soft'], deerhunter: ['Deer Hunter', 1997, 'Sunstorm'],
  heavybarrel: ['Heavy Barrel', 1987, 'Data East'], nuclearwar: ['Nuclear War', 1989, 'New World Computing'], taipan: ['Taipan!', 1982, 'Mega-Micro Computers'], nuclearwaramiga: ['Nuclear War v3', 1989, 'New World Computing']
};
// Cabinet body colours and the control-panel hardware each original shipped with.
const CAB = {
  pacman: { body: '#e9c21a', ctl: 'stick1' }, mspacman: { body: '#1d4fbf', ctl: 'stick1' },
  spaceinvaders: { body: '#202020', ctl: 'lr' }, donkeykong: { body: '#c8202a', ctl: 'stick1' },
  donkeykongjr: { body: '#f2f0e6', ctl: 'stick1' }, galaga: { body: '#111111', ctl: 'stick1' },
  asteroids: { body: '#1a1a1a', ctl: 'buttons5' }, frogger: { body: '#16803a', ctl: 'stick0' },
  defender: { body: '#222222', ctl: 'defender' }, centipede: { body: '#d9d2bf', ctl: 'ball' },
  pong: { body: '#c9a26b', ctl: 'knobs', wood: true }, digdug: { body: '#e8e4d8', ctl: 'stick1' },
  tempest: { body: '#1b1b1b', ctl: 'spinner' }, breakout: { body: '#e6e2d4', ctl: 'knob1' },
  qbert: { body: '#e86a12', ctl: 'diag' }, joust: { body: '#d8c79a', ctl: 'stick1' },
  poleposition: { body: '#f0f0f0', ctl: 'wheel' }, tron: { body: '#101418', ctl: 'tron' },
  missilecommand: { body: '#2c2c34', ctl: 'ball3' }, triplehunt: { body: '#6b4a2b', ctl: 'gun', wood: true },
  duckhunt: { body: '#d62c2c', ctl: 'gun' }, raidonbungelingbay: { body: '#2b4f8f', ctl: 'stick2' },
  deerhunter: { body: '#3d4a2c', ctl: 'gun' },
  heavybarrel: { body: '#2a2d22', ctl: 'stick2' },
  nuclearwar: { body: '#1c2a4a', ctl: 'stick1' },
  taipan: { body: '#5a1a14', ctl: 'stick2', wood: true },
  nuclearwaramiga: { body: '#e8e2d4', ctl: 'ball' }
};
function gameDef(id) { return Reg.get(id); }
function gameMeta(id) {
  const d = gameDef(id), f = FALLBACK[id];
  return { id, title: d ? d.title : f[0], year: d ? d.year : f[1], maker: (d && d.maker) || f[2], def: d,
    marquee: (d && d.marquee) || { bg: '#111', fg: '#fff', accent: '#f0c' } };
}

// ---------------------------------------------------------------- settings
const PRESETS = {
  low: { scale: 0.6, shadows: false, shadowMap: 512, bloom: false, aa: false, live: 2, ambience: true },
  medium: { scale: 0.8, shadows: true, shadowMap: 1024, bloom: true, aa: false, live: 4, ambience: true },
  high: { scale: 1, shadows: true, shadowMap: 2048, bloom: true, aa: true, live: 8, ambience: true },
  ultra: { scale: 1.5, shadows: true, shadowMap: 4096, bloom: true, aa: true, live: 23, ambience: true }
};
const settings = Object.assign({ preset: 'high', crt: true, sound: true, auto: true, music: .5, character: 'makehuman' }, PRESETS.high);
const music = createMusic();
let perfScale = 1; // lowered by auto resolution when the frame rate stays low
try { Object.assign(settings, JSON.parse(localStorage.getItem('arcade.settings') || '{}')); } catch (e) { }
function saveSettings() { try { localStorage.setItem('arcade.settings', JSON.stringify(settings)); } catch (e) { } }

// ---------------------------------------------------------------- renderer
const canvas3d = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);
scene.fog = new THREE.Fog(0x07050f, 14, 34);
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 120);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.82);
const outputPass = new OutputPass();
const smaa = new SMAAPass(1, 1);
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(outputPass); composer.addPass(smaa);

// Shadow maps for the static hall are drawn once; a light re-renders its map only while the boy
// (or a raider) is inside its reach, plus one last refresh after they leave so no stale shadow remains.
function updateShadows() {
  if (!settings.shadows) return;
  const movers = [boy.pos];
  if (raid && raid.active) for (const f of raid.foes) if (!f.gone) movers.push(f.pos);
  for (const l of shadowLights) {
    const reach = l.isDirectionalLight ? null : (l.distance || 9) * .9;
    const near = l.isDirectionalLight ? boy.pos.z > HALL.maxZ - 2.5 : movers.some(p => Math.hypot(p.x - l.position.x, p.z - l.position.z) < reach);
    if (near || l.userData.wasNear || l.userData.dirty) l.shadow.needsUpdate = true;
    l.userData.wasNear = near; l.userData.dirty = false;
  }
}
function applySettings() {
  const pr = Math.min(window.devicePixelRatio || 1, 2) * settings.scale * (settings.auto ? perfScale : 1);
  renderer.setPixelRatio(Math.max(0.4, Math.min(pr, 3)));
  renderer.shadowMap.enabled = settings.shadows;
  bloom.enabled = settings.bloom; smaa.enabled = settings.aa;
  for (const l of shadowLights) {
    l.castShadow = settings.shadows; l.shadow.autoUpdate = false; l.userData.dirty = true;
    if (l.shadow.mapSize.x !== settings.shadowMap) {
      l.shadow.mapSize.set(settings.shadowMap, settings.shadowMap);
      if (l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null; }
    }
  }
  scene.traverse(o => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach(x => x.needsUpdate = true); } });
  document.body.classList.toggle('crt-off', !settings.crt);
  Reg.audio.setMuted(!settings.sound);
  music.setMuted(!settings.sound); music.setVolume(settings.music);
  resize();
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ---------------------------------------------------------------- textures (procedural)
function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
  return t;
}
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Classic black-light arcade carpet.
function carpetTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = '#0a0716'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60000; i++) { g.fillStyle = `rgba(${40 + r() * 40},${30 + r() * 30},${70 + r() * 60},${0.25})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    const cols = ['#ff2bd6', '#28f0ff', '#ffe02b', '#55ff4a', '#ff7a1a', '#8a5bff'];
    g.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const c = cols[i % cols.length], x = r() * w, y = r() * h, s = 18 + r() * 40, t = r();
      g.strokeStyle = c; g.fillStyle = c; g.lineWidth = 3 + r() * 3; g.globalAlpha = .78;
      for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) {
        g.save(); g.translate(x + ox, y + oy); g.rotate(r() * 6.28);
        if (t < 0.3) { g.beginPath(); g.moveTo(-s, 0); g.bezierCurveTo(-s / 2, -s, s / 2, s, s, 0); g.stroke(); }
        else if (t < 0.5) { g.beginPath(); g.arc(0, 0, s * 0.5, 0, 6.28); g.stroke(); }
        else if (t < 0.7) { g.beginPath(); g.moveTo(0, -s * .6); g.lineTo(s * .55, s * .4); g.lineTo(-s * .55, s * .4); g.closePath(); g.stroke(); }
        else if (t < 0.85) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, rr = k % 2 ? s * .2 : s * .5; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); }
        else { g.beginPath(); g.arc(0, 0, s * .45, 0, 6.28); g.fill(); g.strokeStyle = '#0a0716'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, s * .8, s * .18, .4, 0, 6.28); g.stroke(); g.strokeStyle = c; g.lineWidth = 2; g.stroke(); }
        g.restore();
      }
    }
  }, { repeat: [6, 7] });
}
function wallTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#120c26'); grd.addColorStop(1, '#1b1236');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const r = rng(3);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.025})`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 2, h);
  }, { repeat: [8, 1] });
}
function ceilingTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#16141c'; g.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 20000; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.04})`; g.fillRect(r() * w, r() * h, 1, 1); }
    g.strokeStyle = '#0a090d'; g.lineWidth = 6;
    for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); }
  }, { repeat: [12, 14] });
}
function shade(hex, k) {
  const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l * k))); return '#' + c.getHexString();
}
function isLight(hex) { const c = new THREE.Color(hex); return (c.r * .3 + c.g * .59 + c.b * .11) > 0.55; }

function fitText(g, text, maxW, size, font) {
  let s = size; g.font = `${s}px ${font}`;
  while (g.measureText(text).width > maxW && s > 10) { s -= 2; g.font = `${s}px ${font}`; }
  return s;
}
// Backlit marquee: translucent plexi artwork.
function marqueeTex(meta) {
  const m = meta.marquee;
  return canvasTex(1024, 360, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, shade(m.bg, 1.6)); grd.addColorStop(.5, m.bg); grd.addColorStop(1, shade(m.bg, 0.6));
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    // sunburst
    g.save(); g.translate(w / 2, h * 1.1); g.globalAlpha = 0.18; g.fillStyle = m.accent;
    for (let i = 0; i < 24; i++) { g.rotate(Math.PI / 12); g.beginPath(); g.moveTo(0, 0); g.lineTo(-40, -900); g.lineTo(40, -900); g.fill(); }
    g.restore();
    g.fillStyle = m.accent; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
    const title = meta.title.toUpperCase();
    const s = fitText(g, title, w - 90, 150, '"Bungee", "Arial Black", Impact, sans-serif');
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = s * 0.22; g.strokeStyle = '#000'; g.strokeText(title, w / 2, h * 0.47 + 6);
    g.lineWidth = s * 0.12; g.strokeStyle = m.accent; g.strokeText(title, w / 2, h * 0.47);
    g.fillStyle = m.fg; g.fillText(title, w / 2, h * 0.47);
    g.font = '28px "Press Start 2P", monospace'; g.fillStyle = '#fff';
    g.globalAlpha = .85; g.fillText(`${meta.maker.toUpperCase()}  ·  ${meta.year}`, w / 2, h - 52);
  });
}
// Side art: big diagonal colour field with the title.
function sideTex(meta, body) {
  const m = meta.marquee;
  return canvasTex(512, 1024, (g, w, h) => {
    g.fillStyle = body; g.fillRect(0, 0, w, h);
    g.save(); g.globalAlpha = 0.95;
    g.fillStyle = m.bg === body ? shade(m.bg, 1.5) : m.bg;
    g.beginPath(); g.moveTo(0, h * .25); g.lineTo(w, h * .05); g.lineTo(w, h * .7); g.lineTo(0, h * .92); g.fill();
    g.fillStyle = m.accent; g.globalAlpha = .9;
    g.beginPath(); g.moveTo(0, h * .92); g.lineTo(w, h * .7); g.lineTo(w, h * .73); g.lineTo(0, h * .95); g.fill();
    g.restore();
    g.save(); g.translate(w * .55, h * .5); g.rotate(-Math.PI / 2 + 0.2);
    const title = meta.title.toUpperCase();
    const s = fitText(g, title, h * .62, 96, '"Bungee", "Arial Black", Impact, sans-serif');
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = s * .18; g.strokeStyle = '#000'; g.lineJoin = 'round'; g.strokeText(title, 0, 0);
    g.fillStyle = m.fg; g.fillText(title, 0, 0);
    g.restore();
    // wear
    const r = rng(meta.title.length * 31);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${r() * .06})`; g.fillRect(r() * w, r() * h, 2, 2); }
  });
}
function panelTex(meta, body) {
  const m = meta.marquee;
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#0d0d10'; g.fillRect(0, 0, w, h);
    g.fillStyle = m.bg; g.globalAlpha = .9; g.fillRect(8, 8, w - 16, h - 16); g.globalAlpha = 1;
    g.strokeStyle = m.accent; g.lineWidth = 6; g.strokeRect(18, 18, w - 36, h - 36);
    g.fillStyle = m.fg; g.font = '18px "Press Start 2P", monospace'; g.textAlign = 'center';
    g.fillText('1 PLAYER', w * .72, h - 34);
    g.fillStyle = '#fff'; g.globalAlpha = .7; g.font = '12px "Press Start 2P", monospace';
    g.fillText(meta.title.toUpperCase(), w * .3, h - 34);
  });
}
function coinDoorTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#5a5a60'); grd.addColorStop(.5, '#2c2c30'); grd.addColorStop(1, '#4a4a50');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#18181a'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    for (const x of [70, 186]) {
      g.fillStyle = '#ff5a00'; g.fillRect(x - 26, 40, 52, 70);
      g.fillStyle = '#ffb070'; g.fillRect(x - 3, 52, 6, 46);
      g.fillStyle = '#1a1a1a'; g.fillRect(x - 22, 128, 44, 30);
      g.fillStyle = '#ffd24a'; g.font = 'bold 22px Arial'; g.textAlign = 'center'; g.fillText('25¢', x, 82 + 64);
    }
    g.fillStyle = '#111'; g.fillRect(100, 200, 56, 26); g.fillStyle = '#888'; g.beginPath(); g.arc(128, 213, 7, 0, 6.28); g.fill();
  });
}
function neonSignTex(lines, colors, w = 2048, h = 512) {
  return canvasTex(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((t, i) => {
      const y = h * (lines.length === 1 ? .5 : (i ? .72 : .3));
      const s = fitText(g, t, w - 120, i ? 150 : 210, '"Monoton", "Bungee", Impact, sans-serif');
      g.font = `${s}px "Monoton", "Bungee", Impact, sans-serif`;
      for (const [blur, a] of [[40, .6], [18, .9], [6, 1]]) {
        g.shadowColor = colors[i]; g.shadowBlur = blur; g.globalAlpha = a;
        g.strokeStyle = colors[i]; g.lineWidth = 6; g.strokeText(t, w / 2, y);
      }
      g.shadowBlur = 0; g.globalAlpha = 1; g.fillStyle = '#ffffff'; g.lineWidth = 2; g.strokeStyle = '#fff'; g.strokeText(t, w / 2, y);
    });
  });
}

// ---------------------------------------------------------------- the hall
const HALL = { minX: -7, maxX: 7, minZ: -16, maxZ: 0, h: 3.6 };
const shadowLights = [];
const colliders = []; // {minX,maxX,minZ,maxZ}
const cabinets = [];
const solids = []; // what bullets stop on

function buildHall() {
  const W = HALL.maxX - HALL.minX, D = HALL.maxZ - HALL.minZ;
  const fibre = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rng(13); for (let i = 0; i < 26000; i++) { const v = r() * 255 | 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(r() * w, r() * h, 1, 1 + r() * 2); } }, { repeat: [60, 70], linear: true });
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: carpetTex(), bumpMap: fibre, bumpScale: 1.2, roughness: 0.97, metalness: 0 }));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0, (HALL.minZ + HALL.maxZ) / 2); carpet.receiveShadow = true; scene.add(carpet); solids.push(carpet);

  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex(), roughness: 0.85 });
  const mkWall = (w, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, HALL.h), wallMat); m.position.set(x, HALL.h / 2, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); solids.push(m); return m;
  };
  mkWall(D, HALL.minX, (HALL.minZ + HALL.maxZ) / 2, Math.PI / 2);
  mkWall(D, HALL.maxX, (HALL.minZ + HALL.maxZ) / 2, -Math.PI / 2);
  mkWall(W, 0, HALL.minZ, 0);
  // front wall with door opening (x -1.1..1.1, height 2.5)
  const fw = (W - 2.2) / 2;
  const fl = mkWall(fw, HALL.minX + fw / 2, HALL.maxZ, Math.PI); const fr = mkWall(fw, HALL.maxX - fw / 2, HALL.maxZ, Math.PI);
  const lintel = new THREE.Mesh(new THREE.PlaneGeometry(2.2, HALL.h - 2.5), wallMat); lintel.position.set(0, 2.5 + (HALL.h - 2.5) / 2, HALL.maxZ); lintel.rotation.y = Math.PI; scene.add(lintel);
  // baseboard + chair rail neon
  const base = new THREE.MeshStandardMaterial({ color: 0x070709, roughness: .4, metalness: .3 });
  for (const [w, x, z, ry] of [[D, HALL.minX + .02, -8, Math.PI / 2], [D, HALL.maxX - .02, -8, -Math.PI / 2], [W, 0, HALL.minZ + .02, 0]]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w, .14), base); b.position.set(x, .07, z); b.rotation.y = ry; scene.add(b);
  }
  // exterior facade
  const facade = new THREE.Mesh(new THREE.BoxGeometry(W + 2, HALL.h + .6, .3), new THREE.MeshStandardMaterial({ color: 0x1c1430, roughness: .7 }));
  facade.position.set(0, (HALL.h + .6) / 2, HALL.maxZ + .16);
  const hole = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.5, .34), new THREE.MeshBasicMaterial({ color: 0 }));
  // fake the opening by splitting the facade into three boxes
  const fMat = facade.material;
  const fL = new THREE.Mesh(new THREE.BoxGeometry((W + 2 - 2.2) / 2, HALL.h + .6, .3), fMat); fL.position.set(-(2.2 + (W + 2 - 2.2) / 2) / 2, (HALL.h + .6) / 2, HALL.maxZ + .16);
  const fR = fL.clone(); fR.position.x *= -1;
  const fT = new THREE.Mesh(new THREE.BoxGeometry(2.2, HALL.h + .6 - 2.5, .3), fMat); fT.position.set(0, 2.5 + (HALL.h + .6 - 2.5) / 2, HALL.maxZ + .16);
  scene.add(fL, fR, fT); solids.push(fL, fR, fT);
  // door frame + glass doors (open)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 1, roughness: .25 });
  for (const x of [-1.1, 1.1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.08, 2.5, .34), frameMat); p.position.set(x, 1.25, HALL.maxZ + .16); scene.add(p); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.3, .08, .34), frameMat); top.position.set(0, 2.5, HALL.maxZ + .16); scene.add(top);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fd8ff, transparent: true, opacity: .18, roughness: .05, metalness: 0, transmission: 0, depthWrite: false });
  for (const s of [-1, 1]) {
    const door = new THREE.Group();
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 2.4), glass); pane.position.set(s * -.52, 1.22, 0); door.add(pane);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.06, .1, .05), frameMat); rail.position.set(s * -.52, .05, 0); door.add(rail);
    const rail2 = rail.clone(); rail2.position.y = 2.42; door.add(rail2);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .5), frameMat); handle.position.set(s * -.9, 1.1, .05); door.add(handle);
    door.position.set(s * 1.08, 0, HALL.maxZ + .3); door.rotation.y = s * -1.25; scene.add(door);
  }
  // outside: sidewalk, street, sky
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8d8a86'; g.fillRect(0, 0, w, h); const r = rng(5);
    for (let i = 0; i < 30000; i++) { const v = 110 + r() * 50 | 0; g.fillStyle = `rgba(${v},${v},${v - 5},.35)`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.strokeStyle = '#6d6a66'; g.lineWidth = 4; for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); }
  }, { repeat: [12, 4] }), roughness: .9 }));
  walk.rotation.x = -Math.PI / 2; walk.position.set(0, -.005, HALL.maxZ + 7); walk.receiveShadow = true; scene.add(walk);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.MeshBasicMaterial({ fog: false, map: canvasTex(512, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#1d2a6b'); grd.addColorStop(.55, '#e2607a'); grd.addColorStop(.75, '#ffb46a'); grd.addColorStop(1, '#2a1a2a');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const r = rng(4); g.fillStyle = '#140d1c';
    for (let x = 0; x < w; x += 6 + r() * 18) { const bh = 20 + r() * 70, bw = 14 + r() * 30; g.fillRect(x, h * .78 - bh, bw, bh + 60);
      g.fillStyle = 'rgba(255,220,140,.7)'; for (let k = 0; k < 6; k++) if (r() < .4) g.fillRect(x + 3 + r() * (bw - 6), h * .78 - bh + 4 + r() * bh, 2, 2); g.fillStyle = '#140d1c'; }
  }) }));
  sky.position.set(0, 12, HALL.maxZ + 22); sky.rotation.y = Math.PI; scene.add(sky);
  const sun = new THREE.DirectionalLight(0xffc49a, 1.4); sun.position.set(-6, 9, 14); sun.target.position.set(0, 0, 2);
  sun.castShadow = true; sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6; sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target); shadowLights.push(sun);

  // ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: ceilingTex(), roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, HALL.h, -8); scene.add(ceil); solids.push(ceil);

  // lighting: dim blue fill, warm ceiling cans, neon tubes along the walls
  scene.add(new THREE.HemisphereLight(0x5a5cff, 0x1a0820, 0.45));
  const canMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.7, 2.2), toneMapped: false });
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, metalness: .6, roughness: .4, side: THREE.DoubleSide });
  const cans = [[-3.6, -4], [3.6, -4], [-3.6, -9.5], [3.6, -9.5], [0, -13.5], [0, -6.8]];
  cans.forEach(([x, z], i) => {
    const s = new THREE.SpotLight(0xffe2c0, 18, 9, 0.75, 0.6, 1.6);
    s.position.set(x, HALL.h - .05, z); s.target.position.set(x * 1.35, 0, z - .2);
    if (i < 4 || i === 5) { s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02; shadowLights.push(s); }
    scene.add(s, s.target);
    // track-light can: black housing on a yoke, glowing lens facing the floor
    const can = new THREE.Group(); can.position.set(x, HALL.h - .06, z);
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(.07, .08, .2, 24, 1, true), fixtureMat); housing.position.y = -.1; can.add(housing);
    const capTop = new THREE.Mesh(new THREE.CircleGeometry(.07, 24), fixtureMat); capTop.rotation.x = -Math.PI / 2; capTop.position.y = 0; can.add(capTop);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(.065, 24), canMat); lens.rotation.x = Math.PI / 2; lens.position.y = -.17; can.add(lens);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .06, 8), fixtureMat); stem.position.y = .03; can.add(stem);
    scene.add(can);
  });
  for (const x of [-3.6, 3.6]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(.05, .03, 11), fixtureMat); rail.position.set(x, HALL.h - .02, -7); scene.add(rail); }
  // soft shadow where the walls meet the carpet
  const wallAO = canvasTex(8, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const aoM = new THREE.MeshBasicMaterial({ map: wallAO, transparent: true, depthWrite: false });
  for (const [len, x, z, ry] of [[D, HALL.minX, -8, Math.PI / 2], [D, HALL.maxX, -8, -Math.PI / 2], [W, 0, HALL.minZ, 0]]) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(len, .45), aoM); a.rotation.set(-Math.PI / 2, 0, ry); a.position.set(x + (ry ? Math.sign(-x) * .225 : 0), .002, z + (ry ? 0 : .225)); scene.add(a);
  }
  const tube = (color, x, y, z, len, ry) => {
    const c = new THREE.Color(color);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, len, 10), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(4), toneMapped: false }));
    m.rotation.z = Math.PI / 2; m.rotation.y = ry; m.position.set(x, y, z); scene.add(m);
    const ra = new THREE.RectAreaLight(c, 3.2, len, .3); ra.position.set(x, y, z);
    ra.lookAt(x + Math.sin(ry + Math.PI / 2) * -1 * (ry ? 1 : 0) + (ry ? 0 : 0), y - .6, z + (ry ? 0 : 1));
    if (ry) ra.lookAt(x > 0 ? x - 1 : x + 1, y - .5, z); else ra.lookAt(x, y - .5, z + 1);
    scene.add(ra);
  };
  tube(0xff2bd6, HALL.minX + .05, 2.75, -8, 15.5, Math.PI / 2);
  tube(0x28e8ff, HALL.maxX - .05, 2.75, -8, 15.5, Math.PI / 2);
  tube(0xffd02b, 0, 3.25, HALL.minZ + .05, 13.6, 0);

  // big neon sign on the back wall + over the door outside
  const signMat = new THREE.MeshBasicMaterial({ map: neonSignTex(['VALLEY', 'ARCADE'], ['#ff3be0', '#38f4ff']), transparent: true, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6), depthWrite: false });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), signMat); sign.position.set(0, 2.55, HALL.minZ + .03); scene.add(sign);
  const sign2 = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), signMat); sign2.position.set(0, 3.25, HALL.maxZ + .33); sign2.rotation.y = Math.PI; sign2.scale.x = -1; scene.add(sign2);

  // change machine + posters near the entrance
  const chg = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x8e949c, metalness: .9, roughness: .32, roughnessMap: roughTex() });
  const blk = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: .5, metalness: .3 });
  const cm = new THREE.Mesh(new THREE.BoxGeometry(.6, 1.62, .45), steel); cm.position.y = .81; cm.castShadow = true; chg.add(cm);
  const lit = (w, h, draw) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3), map: canvasTex(Math.round(w * 600), Math.round(h * 600), draw) }));
  const header = lit(.56, .22, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2f7d32'); gr.addColorStop(1, '#0f3d14'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.font = `bold ${h * .48}px "Bungee", Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CHANGE', w / 2, h * .45);
    g.font = `${h * .14}px "Press Start 2P", monospace`; g.fillStyle = '#c8ffc8'; g.fillText('QUARTERS FOR BILLS', w / 2, h * .82);
  });
  header.position.set(0, 1.47, .226); chg.add(header);
  const plate = lit(.42, .3, (g, w, h) => {
    g.fillStyle = '#101418'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8e8e8'; g.font = `${h * .075}px "Press Start 2P", monospace`; g.textAlign = 'center';
    ['ACCEPTS $1  $5  $10  $20', 'FACE UP  ·  GEORGE FIRST', '', '4 QUARTERS PER DOLLAR'].forEach((t, i) => g.fillText(t, w / 2, h * (.22 + i * .2)));
  });
  plate.material.color.setScalar(.7); plate.position.set(0, 1.14, .226); chg.add(plate);
  // bill validator with a lit green mouth
  const val = new THREE.Mesh(new THREE.BoxGeometry(.24, .12, .07), blk); val.position.set(0, .88, .255); chg.add(val);
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(.18, .02), new THREE.MeshBasicMaterial({ color: new THREE.Color(.3, 2.6, .5), toneMapped: false })); mouth.position.set(0, .89, .291); chg.add(mouth);
  for (const x of [-.07, 0, .07]) { const arr = new THREE.Mesh(new THREE.CircleGeometry(.012, 3), mouth.material); arr.position.set(x, .855, .291); arr.rotation.z = -Math.PI / 2; chg.add(arr); }
  // coin cup
  const cup = new THREE.Mesh(new THREE.BoxGeometry(.24, .14, .1), blk); cup.position.set(0, .42, .27); chg.add(cup);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(.26, .02, .12), steel); lip.position.set(0, .35, .28); chg.add(lip);
  const coinsIn = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .003, 16), new THREE.MeshStandardMaterial({ color: 0xd6d9de, metalness: 1, roughness: .25 }));
  for (let i = 0; i < 5; i++) { const c = coinsIn.clone(); c.position.set(-.06 + i * .03, .37, .29 + (i % 2) * .01); chg.add(c); }
  const lockC = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .02, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd8dbe0, metalness: 1, roughness: .2 })); lockC.position.set(.22, 1.0, .232); chg.add(lockC);
  chg.position.set(HALL.minX + .35, 0, -2.2); chg.rotation.y = Math.PI / 2; scene.add(chg); solids.push(chg);
  changeSpot.set(HALL.minX + 1.05, 0, -2.2);
  buildAtm(steel, blk);
  colliders.push({ minX: HALL.minX, maxX: HALL.minX + .62, minZ: -2.55, maxZ: -1.85 });
  buildProps(steel, blk);
  const posters = [['HIGH SCORE', 'CHALLENGE', '#ffe02b', '#d81b60'], ['NEW!', '23 GAMES', '#28f0ff', '#283593'], ['25¢', 'PER PLAY', '#55ff4a', '#4a148c']];
  posters.forEach((p, i) => {
    const t = canvasTex(256, 384, (g, w, h) => {
      g.fillStyle = p[3]; g.fillRect(0, 0, w, h); g.fillStyle = p[2];
      for (let k = 0; k < 12; k++) { g.globalAlpha = .15; g.beginPath(); g.arc(w / 2, h * .45, 20 + k * 22, 0, 6.28); g.lineWidth = 8; g.strokeStyle = p[2]; g.stroke(); }
      g.globalAlpha = 1; g.font = '30px "Bungee", Impact'; g.textAlign = 'center'; g.fillText(p[0], w / 2, h * .4); g.font = '24px "Bungee", Impact'; g.fillStyle = '#fff'; g.fillText(p[1], w / 2, h * .55);
      g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.7, 1.05), new THREE.MeshStandardMaterial({ map: t, roughness: .5 }));
    m.position.set(HALL.maxX - .01, 1.75, -1.6 - i * 1.0); m.rotation.y = -Math.PI / 2; scene.add(m);
  });
}



// Bank ATM next to the change machine
function buildAtm(steel, blk) {
  const g = new THREE.Group();
  const navy = new THREE.MeshStandardMaterial({ color: 0x14306b, metalness: .5, roughness: .35, roughnessMap: roughTex() });
  const body = new THREE.Mesh(new THREE.BoxGeometry(.62, 1.7, .5), navy); body.position.y = .85; body.castShadow = true; g.add(body);
  const lit = (w, h, draw, k = 1.3) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ toneMapped: false, color: new THREE.Color(k, k, k), map: canvasTex(Math.round(w * 600), Math.round(h * 600), draw) }));
  const head = lit(.58, .2, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2f7dff'); gr.addColorStop(1, '#0b3aa8'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.font = `bold ${h * .62}px "Bungee", Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ATM', w * .38, h * .52);
    c.font = `${h * .16}px "Press Start 2P", monospace`; c.fillText('VALLEY', w * .78, h * .4); c.fillText('BANK', w * .78, h * .66); });
  head.position.set(0, 1.58, .251); g.add(head);
  // recessed fascia with screen, keypad, card slot and cash dispenser
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(.54, .62, .06), blk); fascia.position.set(0, 1.12, .25); g.add(fascia);
  const screen = lit(.3, .22, (c, w, h) => { c.fillStyle = '#0a2a6e'; c.fillRect(0, 0, w, h); c.fillStyle = '#9fd0ff'; c.font = `${h * .1}px "Press Start 2P", monospace`; c.textAlign = 'center';
    c.fillText('WELCOME', w / 2, h * .3); c.fillText('DEPOSIT', w / 2, h * .55); c.fillText('WITHDRAW', w / 2, h * .75); }, 1.1);
  screen.position.set(-.07, 1.26, .283); screen.rotation.x = -.12; g.add(screen);
  const keyMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: .8, roughness: .3 });
  for (let r = 0; r < 4; r++) for (let col = 0; col < 3; col++) { const k = new THREE.Mesh(new THREE.BoxGeometry(.03, .022, .01), keyMat); k.position.set(-.13 + col * .042, .99 - r * .032, .285); g.add(k); }
  for (const [y, c] of [[.99, 0xd32f2f], [.958, 0xf9a825], [.926, 0x2e7d32]]) { const k = new THREE.Mesh(new THREE.BoxGeometry(.05, .022, .01), new THREE.MeshStandardMaterial({ color: c, roughness: .4 })); k.position.set(.04, y, .285); g.add(k); }
  const card = new THREE.Mesh(new THREE.BoxGeometry(.08, .012, .02), new THREE.MeshBasicMaterial({ color: new THREE.Color(.3, 2, .5), toneMapped: false })); card.position.set(.17, 1.22, .285); g.add(card);
  const disp = new THREE.Mesh(new THREE.BoxGeometry(.22, .03, .03), steel); disp.position.set(.05, .86, .27); g.add(disp);
  const dslot = new THREE.Mesh(new THREE.PlaneGeometry(.18, .008), new THREE.MeshBasicMaterial({ color: 0x000000 })); dslot.position.set(.05, .86, .286); g.add(dslot);
  g.position.set(HALL.minX + .32, 0, -1.25); g.rotation.y = Math.PI / 2; scene.add(g); solids.push(g);
  colliders.push({ minX: HALL.minX, maxX: HALL.minX + .6, minZ: -1.58, maxZ: -.92 });
}

// Soda machine and trash can by the door, prize counter in the back corner.
const SHELF_Y = [1.15, 1.56, 1.97, 2.38];
function buildProps(steel, blk) {
  const soda = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(.95, 1.85, .78), new THREE.MeshStandardMaterial({ color: 0xb3121b, roughness: .35, metalness: .3, roughnessMap: roughTex() }));
  shell.position.y = .925; shell.castShadow = true; soda.add(shell);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(.62, 1.5), new THREE.MeshBasicMaterial({ toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.25), map: canvasTex(372, 900, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#7a0008'); gr.addColorStop(.5, '#e8202c'); gr.addColorStop(1, '#7a0008'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff'; g.lineWidth = 16; g.beginPath(); g.moveTo(-20, h * .62); g.bezierCurveTo(w * .3, h * .52, w * .7, h * .72, w + 20, h * .6); g.stroke();
    g.save(); g.translate(w / 2, h * .36); g.rotate(-Math.PI / 2); g.fillStyle = '#fff'; g.font = 'italic bold 120px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Valley Cola', 0, 0); g.restore();
    g.fillStyle = '#fff'; g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.fillText('ICE COLD', w / 2, h * .82); g.font = '26px Arial'; g.fillText('50¢', w / 2, h * .88);
  }) }));
  front.position.set(-.1, 1.05, .391); soda.add(front);
  const btnCol = new THREE.Mesh(new THREE.PlaneGeometry(.2, 1.0), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: .4 })); btnCol.position.set(.33, 1.2, .391); soda.add(btnCol);
  const sel = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2), toneMapped: false });
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(.12, .1), sel); b.position.set(.33, 1.6 - i * .14, .393); soda.add(b); }
  const slot = new THREE.Mesh(new THREE.BoxGeometry(.5, .16, .1), blk); slot.position.set(-.1, .2, .37); soda.add(slot);
  soda.position.set(4.4, 0, HALL.maxZ - .42); soda.rotation.y = Math.PI; scene.add(soda); solids.push(soda);
  colliders.push({ minX: 3.9, maxX: 4.9, minZ: HALL.maxZ - .85, maxZ: HALL.maxZ });
  // recycling bin: blue drum with the chasing-arrows symbol and a can-shaped hole in the lid
  const bin = new THREE.Group();
  const binLabel = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#1259b8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .04})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    // label panel facing the room (the front of the cylinder maps to the middle of the texture)
    const cx = w * .75, cy = h * .45;
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(cx - 78, 22, 156, 200, 14); g.fill();
    g.strokeStyle = '#1e9e4a'; g.fillStyle = '#1e9e4a'; g.lineWidth = 9; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const a0 = -Math.PI / 2 + k * 2 * Math.PI / 3 + .25, a1 = a0 + 1.55, r = 38;
      g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
      const tx = cx + Math.cos(a1) * r, ty = cy + Math.sin(a1) * r, dir = a1 + Math.PI / 2;
      g.beginPath(); g.moveTo(tx + Math.cos(dir) * 14, ty + Math.sin(dir) * 14); g.lineTo(tx + Math.cos(dir + 2.3) * 12, ty + Math.sin(dir + 2.3) * 12); g.lineTo(tx + Math.cos(dir - 2.3) * 12, ty + Math.sin(dir - 2.3) * 12); g.fill();
    }
    g.fillStyle = '#1259b8'; g.font = 'bold 26px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('RECYCLE', cx, 180); g.font = 'bold 20px Arial'; g.fillStyle = '#1e9e4a'; g.fillText('CANS 25¢', cx, 206);
  });
  binLabel.offset.x = .25;
  binLabel.wrapS = THREE.RepeatWrapping;
  const can = new THREE.Mesh(new THREE.CylinderGeometry(.24, .21, .78, 36, 1, true), new THREE.MeshStandardMaterial({ map: binLabel, roughness: .45, metalness: .05, side: THREE.DoubleSide }));
  can.position.y = .39; can.castShadow = true; bin.add(can);
  const blueLid = new THREE.MeshStandardMaterial({ color: 0x0f4a9a, roughness: .4 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.245, .018, 10, 36), blueLid); rim.rotation.x = Math.PI / 2; rim.position.y = .79; bin.add(rim);
  const lidShape = new THREE.Shape(); lidShape.absarc(0, 0, .25, 0, Math.PI * 2);
  const hole = new THREE.Path(); hole.absarc(0, 0, .055, 0, Math.PI * 2); lidShape.holes.push(hole);
  const lid = new THREE.Mesh(new THREE.ExtrudeGeometry(lidShape, { depth: .03, bevelEnabled: false, curveSegments: 32 }), blueLid);
  lid.rotation.x = -Math.PI / 2; lid.position.y = .78; bin.add(lid);
  const inside = new THREE.Mesh(new THREE.CircleGeometry(.055, 24), blk); inside.rotation.x = -Math.PI / 2; inside.position.y = .79; bin.add(inside);
  const sym = new THREE.Mesh(new THREE.CircleGeometry(.04, 3), new THREE.MeshStandardMaterial({ color: 0x1e9e4a, roughness: .5 }));
  sym.rotation.x = -Math.PI / 2; sym.position.set(0, .811, .15); bin.add(sym);
  bin.position.set(5.5, 0, HALL.maxZ - .45); scene.add(bin); solids.push(bin);
  colliders.push({ minX: 5.2, maxX: 5.8, minZ: HALL.maxZ - .75, maxZ: HALL.maxZ });
  // prize counter: glass case with boxed prizes, neon sign over it
  const pc = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, .55, .6), new THREE.MeshStandardMaterial({ color: 0x23143a, roughness: .5 })); base.position.y = .275; base.castShadow = true; pc.add(base);
  const caseGlass = new THREE.Mesh(new THREE.BoxGeometry(2.4, .5, .6), new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, transparent: true, opacity: .12, roughness: .02, clearcoat: 1, depthWrite: false }));
  caseGlass.position.y = .8; pc.add(caseGlass);
  const trim = new THREE.MeshStandardMaterial({ color: 0xd8dbe0, metalness: 1, roughness: .2 });
  for (const y of [.55, 1.05]) { const t = new THREE.Mesh(new THREE.BoxGeometry(2.42, .02, .62), trim); t.position.y = y; pc.add(t); }
  const r = rng(31), cols = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa', '#fb8c00'];
  for (let i = 0; i < 14; i++) {
    const w = .12 + r() * .12, h = .1 + r() * .22, d = .08 + r() * .08;
    const col = cols[i % cols.length];
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: col, roughness: .45, map: canvasTex(64, 64, (g, W, H) => { g.fillStyle = col; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(6, H * .35, W - 12, H * .3); g.fillStyle = '#222'; g.fillRect(10, H * .45, W - 20, 4); }) }));
    box.position.set(-1.05 + (i % 7) * .33 + r() * .05, .56 + h / 2, -.12 + Math.floor(i / 7) * .22); box.rotation.y = (r() - .5) * .4; pc.add(box);
  }
  pc.position.set(-5.4, 0, HALL.minZ + 1.2); scene.add(pc); solids.push(pc);
  colliders.push({ minX: -6.65, maxX: -4.15, minZ: HALL.minZ + .85, maxZ: HALL.minZ + 1.55 });
  const pSign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .55), new THREE.MeshBasicMaterial({ map: neonSignTex(['PRIZES'], ['#ffd02b'], 1024, 256), transparent: true, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5), depthWrite: false }));
  pSign.position.set(-5.4, 3.2, HALL.minZ + .04); pSign.scale.setScalar(.8); scene.add(pSign);
  // "My Prizes" shelves on the wall behind the counter
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: .55, roughnessMap: roughTex() });
  for (const y of SHELF_Y) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.3, .03, .24), shelfMat); b.position.set(-5.4, y - .015, HALL.minZ + .12); b.castShadow = b.receiveShadow = true; scene.add(b);
    for (const x of [-6.45, -4.35]) { const br = new THREE.Mesh(new THREE.BoxGeometry(.02, .08, .18), shelfMat); br.position.set(x, y - .06, HALL.minZ + .1); scene.add(br); }
  }
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(.8, .16), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(400, 80, (g, w, h) => {
    g.fillStyle = '#1b1030'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffd02b'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#ffd02b'; g.font = '26px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MY PRIZES', w / 2, h / 2 + 2);
  }) }));
  plaque.position.set(-5.4, 2.86, HALL.minZ + .03); scene.add(plaque);
}

// ---------------------------------------------------------------- preview "attract mode" runners
// Each cabinet runs its own copy of the game with a tiny demo bot as player so screens look alive.
function makePreview(def) {
  const c = document.createElement('canvas'); c.width = def.width; c.height = def.height;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const noop = () => { };
  const r = rng(def.id.length * 977 + def.width);
  const held = new Set(); let pressed = new Set();
  const mouse = { x: def.width / 2, y: def.height / 2, down: false, clicked: false };
  const api = {
    width: def.width, height: def.height, time: 0, frame: 0,
    key: k => held.has(k), pressed: k => pressed.has(k), anyPressed: (...k) => k.some(x => pressed.has(x)), mouse,
    audio: { tone: noop, noise: noop, melody: () => 0, unlock: noop, setMuted: noop, muted: true },
    credits: 9, useCredit: () => true, continuing: false, offerContinue: (c, end) => { try { end && end(); } catch (e) { } },
    getHiScore: d => { try { return +localStorage.getItem('arcade.hi.' + def.id) || d || 0; } catch (e) { return d || 0; } }, setHiScore: noop, exit: noop
  };
  let game = null, broken = false;
  try { game = def.create(api); } catch (e) { broken = true; console.warn('preview', def.id, e); }
  const dirs = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  let next = 0, tx = mouse.x, ty = mouse.y;
  function bot() {
    pressed = new Set();
    const f = api.frame;
    if (f % 600 === 120) pressed.add('Enter');
    if (f >= next) {
      held.clear(); next = f + 15 + r() * 45 | 0;
      if (r() < .85) held.add(dirs[r() * 4 | 0]);
      if (r() < .5) held.add('Space');
      tx = r() * def.width; ty = r() * def.height * .8;
    }
    if (r() < .06) pressed.add('Space');
    mouse.x += (tx - mouse.x) * .06; mouse.y += (ty - mouse.y) * .06;
    mouse.clicked = r() < .03; mouse.down = mouse.clicked;
  }
  const out = {
    canvas: c, texture: null, broken,
    step() {
      if (broken) return;
      bot();
      try { game.update(1 / 60); } catch (e) { broken = true; }
      api.time += 1 / 60; api.frame++;
    },
    draw() {
      if (broken) return;
      try { ctx.save(); game.render(ctx); ctx.restore(); } catch (e) { broken = true; }
      if (out.texture) out.texture.needsUpdate = true;
    }
  };
  return out;
}
function outOfOrderCanvas(meta) {
  const c = document.createElement('canvas'); c.width = 240; c.height = 180;
  const g = c.getContext('2d'); g.fillStyle = '#05050a'; g.fillRect(0, 0, 240, 180);
  g.fillStyle = '#ffd24a'; g.font = '12px "Press Start 2P", monospace'; g.textAlign = 'center';
  g.fillText('OUT OF ORDER', 120, 80); g.fillStyle = '#888'; g.font = '8px "Press Start 2P", monospace'; g.fillText(meta.title.toUpperCase(), 120, 105);
  return c;
}

// ---------------------------------------------------------------- cabinets
// Shared surface detail: fine noise for roughness so lacquer and laminate catch light unevenly.
const _shared = {};
const shared = (k, make) => _shared[k] || (_shared[k] = make());
let _rough = null;
function roughTex() {
  if (_rough) return _rough;
  _rough = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h); const r = rng(77);
    for (let i = 0; i < 9000; i++) { const v = 90 + r() * 90 | 0; g.fillStyle = `rgba(${v},${v},${v},.35)`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(200,200,200,${r() * .3})`; g.lineWidth = r() * 2; g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + (r() - .5) * 60, y + (r() - .5) * 20); g.stroke(); }
  }, { repeat: [3, 3], linear: true });
  return _rough;
}
// Printed monitor bezel with a rounded opening for the tube.
function bezelTex(meta, sw, sh, bw, bh) {
  const m = meta.marquee, S = 900;
  return canvasTex(Math.round(S * bw / bh), S, (g, w, h) => {
    g.fillStyle = '#060608'; g.fillRect(0, 0, w, h);
    const ow = w * (sw + .024) / bw, oh = h * (sh + .024) / bh, ox = (w - ow) / 2, oy = (h - oh) / 2;
    g.strokeStyle = m.accent; g.lineWidth = 6; g.globalAlpha = .9;
    g.beginPath(); g.roundRect(ox - 26, oy - 26, ow + 52, oh + 52, 34); g.stroke();
    g.strokeStyle = m.fg; g.lineWidth = 2; g.globalAlpha = .6;
    g.beginPath(); g.roundRect(ox - 40, oy - 40, ow + 80, oh + 80, 44); g.stroke();
    g.globalAlpha = .85; g.fillStyle = m.fg; g.font = '22px "Press Start 2P", monospace'; g.textAlign = 'center';
    if (oy > 90) { g.fillText(meta.title.toUpperCase(), w / 2, oy - 56); g.fillStyle = '#bbb'; g.font = '15px "Press Start 2P", monospace'; g.fillText('1 OR 2 PLAYERS', w / 2, oy + oh + 78); }
    else { g.save(); g.translate(ox - 70, h / 2); g.rotate(-Math.PI / 2); g.fillText(meta.title.toUpperCase(), 0, 0); g.restore(); g.save(); g.translate(ox + ow + 70, h / 2); g.rotate(Math.PI / 2); g.fillStyle = '#bbb'; g.font = '15px "Press Start 2P", monospace'; g.fillText('INSERT COIN', 0, 0); g.restore(); }
    g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 1;
    g.beginPath(); g.roundRect(ox, oy, ow, oh, Math.min(ow, oh) * .07); g.fill();
  });
}
let sharedCoin = null;
function coinMechTex() {
  return canvasTex(128, 192, (g, w, h) => {
    g.fillStyle = '#1a1208'; g.fillRect(0, 0, w, h);
    const r = g.createRadialGradient(w / 2, h * .4, 4, w / 2, h * .4, w * .7); r.addColorStop(0, '#ffd27a'); r.addColorStop(.4, '#ff6a00'); r.addColorStop(1, '#7a1e00');
    g.fillStyle = r; g.beginPath(); g.roundRect(8, 8, w - 16, h * .72, 10); g.fill();
    g.fillStyle = '#2a0f00'; g.fillRect(w / 2 - 5, 28, 10, 76);
    g.fillStyle = '#fff6d0'; g.font = 'bold 30px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('25¢', w / 2, h * .66);
    g.fillStyle = '#111'; g.fillRect(14, h * .8, w - 28, h * .14);
  });
}
function grilleTex() {
  return canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#0c0c0e'; g.fillRect(0, 0, w, h); g.fillStyle = '#000'; for (let y = 6; y < h; y += 8) for (let x = 6 + (y % 16 ? 4 : 0); x < w; x += 8) { g.beginPath(); g.arc(x, y, 2.4, 0, 6.28); g.fill(); } }, { repeat: [4, 1] });
}
function buildCabinet(meta, style) {
  const g = new THREE.Group(); g.name = meta.id;
  const W = 0.68, T = 0.019, IW = W - 2 * T;
  const P = [[0, 0], [.62, 0], [.62, .86], [.8, .92], [.8, .98], [.56, 1.05], [.44, 1.55], [.62, 1.6], [.62, 1.86], [0, 1.86]];
  const body = style.body, rough = roughTex();
  // the cabinet box, set back a few millimetres between the two side panels
  const inner = P.map(([x, y]) => [x > 0 ? x - .008 : x, y]);
  const bgeo = new THREE.ExtrudeGeometry(new THREE.Shape(inner.map(p => new THREE.Vector2(p[0], p[1]))), { depth: IW, bevelEnabled: false });
  bgeo.rotateY(-Math.PI / 2); bgeo.translate(IW / 2, 0, 0);
  const woodMap = style.wood ? canvasTex(256, 512, (gg, w, h) => { gg.fillStyle = body; gg.fillRect(0, 0, w, h); const r = rng(2); for (let i = 0; i < 400; i++) { gg.strokeStyle = `rgba(60,30,10,${r() * .25})`; gg.beginPath(); const x = r() * w; gg.moveTo(x, 0); gg.bezierCurveTo(x + 8, h / 3, x - 8, h * 2 / 3, x + 3, h); gg.stroke(); } }) : null;
  const bodyMat = new THREE.MeshStandardMaterial({ color: woodMap ? 0xffffff : body, map: woodMap, roughness: woodMap ? .6 : .42, roughnessMap: rough, metalness: .02 });
  const bodyMesh = new THREE.Mesh(bgeo, bodyMat); bodyMesh.castShadow = bodyMesh.receiveShadow = true; g.add(bodyMesh);
  // side panels carrying the side art, edged in T-molding
  const sMap = sideTex(meta, body); sMap.repeat.set(1 / .82, 1 / 1.9); sMap.offset.set(0.02, 0);
  const sideMat = new THREE.MeshStandardMaterial({ map: sMap, roughness: .38, roughnessMap: rough });
  const edgeMat = shared('edge', () => new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: .8 }));
  const sgeo = new THREE.ExtrudeGeometry(new THREE.Shape(P.map(p => new THREE.Vector2(p[0], p[1]))), { depth: T, bevelEnabled: false });
  sgeo.rotateY(-Math.PI / 2);
  const tmColor = style.tm || (isLight(body) ? '#1c1c1c' : '#0d0d0d');
  const tmMat = shared('tm' + tmColor, () => new THREE.MeshStandardMaterial({ color: tmColor, roughness: .28, metalness: .1 }));
  const tmPath = new THREE.CurvePath();
  for (let i = 1; i < P.length - 1; i++) tmPath.add(new THREE.LineCurve3(new THREE.Vector3(0, P[i][1], P[i][0] + .004), new THREE.Vector3(0, P[i + 1][1], P[i + 1][0] + .004)));
  const tmGeo = new THREE.TubeGeometry(tmPath, 120, .0075, 6, false);
  for (const sgn of [-1, 1]) {
    const side = new THREE.Mesh(sgeo, [sideMat, edgeMat]); side.position.x = sgn > 0 ? W / 2 : -W / 2 + T;
    side.castShadow = side.receiveShadow = true; g.add(side);
    const tm = new THREE.Mesh(tmGeo, tmMat); tm.position.x = sgn * (W / 2 - T / 2); tm.scale.x = 1.4; g.add(tm);
  }
  // monitor: curved tube behind a printed bezel and a sheet of glass
  const tilt = Math.atan2(.12, .5);
  const def = meta.def;
  const aspect = def ? def.width / def.height : 4 / 3;
  let sw = .5, sh = sw / aspect; if (sh > .42) { sh = .42; sw = sh * aspect; }
  const mon = new THREE.Group(); mon.position.set(0, 1.3, .492); mon.rotation.x = -tilt; g.add(mon);
  const cavity = new THREE.Mesh(new THREE.PlaneGeometry(IW, .52), shared('cavity', () => new THREE.MeshStandardMaterial({ color: 0x020203, roughness: .9 })));
  cavity.position.z = -.004; mon.add(cavity);
  const tube = new THREE.PlaneGeometry(sw + .024, sh + .024, 24, 24); const tp = tube.attributes.position;
  for (let i = 0; i < tp.count; i++) { const u = tp.getX(i) / ((sw + .024) / 2), v = tp.getY(i) / ((sh + .024) / 2); tp.setZ(i, .014 * (1 - .5 * (u * u + v * v))); }
  tube.computeVertexNormals();
  const screenMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.3, 1.3), toneMapped: false });
  const screen = new THREE.Mesh(tube, screenMat); mon.add(screen);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(IW - .004, .515), new THREE.MeshStandardMaterial({ map: bezelTex(meta, sw, sh, IW - .004, .515), transparent: true, roughness: .5, alphaTest: .5 }));
  bezel.position.z = .02; mon.add(bezel);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(IW - .004, .515), new THREE.MeshPhysicalMaterial({ color: 0x111111, transparent: true, opacity: .16, roughness: .03, metalness: 0, clearcoat: 1, clearcoatRoughness: .02, depthWrite: false, envMapIntensity: 1.4 }));
  glass.position.z = .03; mon.add(glass);
  // speaker grille between the screen and the marquee
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(IW, .185), shared('grille', () => new THREE.MeshStandardMaterial({ map: grilleTex(), roughness: .8 })));
  const ga = Math.atan2(.05, .18); grille.position.set(0, 1.575, .53); grille.rotation.x = Math.PI / 2 + ga; g.add(grille);
  // backlit marquee in aluminium retainers
  const mq = new THREE.Mesh(new THREE.PlaneGeometry(IW, .24), new THREE.MeshBasicMaterial({ map: marqueeTex(meta), color: new THREE.Color(1.2, 1.2, 1.2), toneMapped: false }));
  mq.position.set(0, 1.73, .614); g.add(mq);
  const alu = shared('alu', () => new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 1, roughness: .3 }));
  for (const y of [1.606, 1.854]) { const r = new THREE.Mesh(new THREE.BoxGeometry(IW, .014, .012), alu); r.position.set(0, y, .618); g.add(r); }
  const mqLight = new THREE.Mesh(new THREE.PlaneGeometry(IW, .3), new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(meta.marquee.bg).lerp(new THREE.Color('#ffffff'), .5).multiplyScalar(.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  mqLight.position.set(0, 1.87, .5); mqLight.rotation.x = -Math.PI / 2; mqLight.material.opacity = .25; g.add(mqLight);
  // control panel: overlay, hardware, lit start buttons, front edge molding
  const ang = Math.atan2(.07, .24);
  const panel = new THREE.Group(); panel.position.set(0, .985 + .002, .68); panel.rotation.x = -Math.PI / 2 + ang; g.add(panel);
  const pTop = new THREE.Mesh(new THREE.PlaneGeometry(IW, .25), new THREE.MeshPhysicalMaterial({ map: panelTex(meta, body), roughness: .3, clearcoat: .6, clearcoatRoughness: .25 }));
  panel.add(pTop);
  addControls(panel, style.ctl, meta);
  const pEdge = new THREE.Mesh(new THREE.BoxGeometry(IW + .002, .062, .016), tmMat); pEdge.position.set(0, .95, .8); g.add(pEdge);
  // coin door: steel frame, two lit coin mechs, return buttons and a lock
  if (!sharedCoin) sharedCoin = {
    steel: new THREE.MeshStandardMaterial({ color: 0x3a3b40, metalness: .85, roughness: .38, roughnessMap: rough }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0b0b0c, metalness: .5, roughness: .5 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd8dbe0, metalness: 1, roughness: .18 }),
    mech: new THREE.MeshStandardMaterial({ map: coinMechTex(), emissiveMap: null, emissive: 0xffffff, roughness: .4 })
  };
  sharedCoin.mech.emissiveMap = sharedCoin.mech.map; sharedCoin.mech.emissiveIntensity = .32;
  const C = sharedCoin, door = new THREE.Group(); door.position.set(0, .5, .612); g.add(door);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(.32, .36, .01), C.dark); door.add(frame);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(.29, .33, .008), C.steel); plate.position.z = .008; door.add(plate);
  for (const x of [-.07, .07]) {
    const mech = new THREE.Mesh(new THREE.BoxGeometry(.075, .11, .022), [C.steel, C.steel, C.steel, C.steel, C.mech, C.steel]); mech.position.set(x, .06, .02); door.add(mech);
    const ret = new THREE.Mesh(new THREE.BoxGeometry(.05, .03, .02), C.dark); ret.position.set(x, -.11, .02); door.add(ret);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(.044, .022, .004), C.chrome); flap.position.set(x, -.11, .031); door.add(flap);
  }
  const lock = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, .014, 16).rotateX(Math.PI / 2), C.chrome); lock.position.set(0, -.04, .018); door.add(lock);
  // kick plate and levelling feet
  const kick = new THREE.Mesh(new THREE.BoxGeometry(IW, .1, .006), C.steel); kick.position.set(0, .06, .613); g.add(kick);
  for (const [x, z] of [[-W / 2 + .03, .05], [W / 2 - .03, .05], [-W / 2 + .03, .57], [W / 2 - .03, .57]]) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(.018, .022, .012, 12), C.dark); f.position.set(x, .006, z); g.add(f);
  }
  return { group: g, screen, screenMat, sw, sh, tilt };
}
function addControls(panel, kind, meta) {
  const M = addControls.mats || (addControls.mats = {
    red: new THREE.MeshPhysicalMaterial({ color: 0xc8101a, roughness: .18, clearcoat: 1 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: .45, metalness: .2 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xcfd2d6, metalness: 1, roughness: .18 }),
    bezel: new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: .35 }),
    start: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 1.6, roughness: .3 })
  });
  // a concave push button: white bezel ring and a dished coloured plunger
  const G = addControls.geo || (addControls.geo = {
    ring: new THREE.CylinderGeometry(.021, .022, .006, 28).rotateX(Math.PI / 2),
    cap: new THREE.LatheGeometry([new THREE.Vector2(0, .009), new THREE.Vector2(.008, .0105), new THREE.Vector2(.0155, .013), new THREE.Vector2(.0162, .006), new THREE.Vector2(.0162, 0)], 24).rotateX(Math.PI / 2),
    ball: new THREE.SphereGeometry(.0185, 24, 16), shaft: new THREE.CylinderGeometry(.0055, .0055, .065, 12).rotateX(Math.PI / 2),
    dust: new THREE.CylinderGeometry(.03, .03, .003, 24).rotateX(Math.PI / 2)
  });
  const up = (m, x, y, z) => { m.position.set(x, y, z); panel.add(m); return m; };
  const capMat = col => shared('cap' + col, () => new THREE.MeshPhysicalMaterial({ color: col, roughness: .22, clearcoat: .8 }));
  const stick = (x, y = 0) => { up(new THREE.Mesh(G.dust, M.black), x, y, .002); up(new THREE.Mesh(G.shaft, M.black), x, y, .034); up(new THREE.Mesh(G.ball, M.red), x, y, .072); };
  const button = (x, y, col) => { up(new THREE.Mesh(G.ring, M.bezel), x, y, .003); up(new THREE.Mesh(G.cap, capMat(col)), x, y, .001); };
  const ball = (x, col = 0xf2f2f2) => {
    up(new THREE.Mesh(new THREE.TorusGeometry(.043, .007, 10, 32), M.chrome), x, 0, .004);
    up(new THREE.Mesh(new THREE.SphereGeometry(.038, 28, 18), new THREE.MeshPhysicalMaterial({ color: col, roughness: .08, clearcoat: 1, transmission: 0 })), x, 0, -.014);
  };
  const knob = (x) => {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(.024, .027, .03, 28).rotateX(Math.PI / 2), M.black); up(k, x, 0, .015);
    for (let i = 0; i < 12; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(.003, .004, .028), M.black); const a = i / 12 * 6.28; up(r, x + Math.cos(a) * .026, Math.sin(a) * .026, .015); }
    up(new THREE.Mesh(new THREE.CylinderGeometry(.019, .019, .002, 28).rotateX(Math.PI / 2), M.chrome), x, 0, .031);
  };
  // lit 1P / 2P start buttons along the back of the panel
  for (const x of [-.06, .06]) { up(new THREE.Mesh(G.ring, M.bezel), x, .085, .003); const b = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, .008, 20).rotateX(Math.PI / 2), M.start); up(b, x, .085, .004); }
  switch (kind) {
    case 'stick0': stick(-.12); break;
    case 'stick1': stick(-.12); button(.08, 0, 0xd8141c); break;
    case 'stick2': stick(-.12); button(.06, 0, 0xd8141c); button(.12, 0, 0xffd200); break;
    case 'lr': button(-.16, 0, 0xffd200); button(-.1, 0, 0xffd200); button(.1, 0, 0xd8141c); break;
    case 'buttons5': for (const x of [-.18, -.12, .05, .11, .17]) button(x, 0, 0xf0f0f0); break;
    case 'defender': stick(-.2); for (let i = 0; i < 5; i++) button(-.08 + i * .055, (i % 2) * .028 - .01, 0xf0f0f0); break;
    case 'ball': ball(-.08); button(.12, 0, 0xd8141c); break;
    case 'ball3': ball(0); button(-.16, 0, 0xff3030); button(.16, 0, 0xff3030); button(0, -.07, 0xff3030); break;
    case 'knobs': knob(-.18); knob(.18); break;
    case 'knob1': knob(-.1); button(.12, 0, 0xf0f0f0); break;
    case 'spinner': knob(-.1); button(.08, 0, 0xd8141c); button(.14, 0, 0x1e7bff); break;
    case 'diag': { const s = new THREE.Group(); s.position.x = -.05; s.rotation.z = Math.PI / 4; panel.add(s); const pp = panel; panel = s; stick(0); panel = pp; } break;
    case 'tron': { stick(-.12); const tr = new THREE.Mesh(new THREE.CylinderGeometry(.028, .03, .05, 24).rotateX(Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x8fdcff, transparent: true, opacity: .55, roughness: .05, clearcoat: 1 })); up(tr, .12, 0, .025); button(.12, -.06, 0x1e7bff); } break;
    case 'wheel': {
      const w = new THREE.Mesh(new THREE.TorusGeometry(.13, .014, 14, 48), M.black); up(w, 0, -.02, .1); w.rotation.x = -0.5;
      for (const a of [0, 2.09, 4.19]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.012, .13, .008), M.chrome); sp.position.set(0, -.02, .1); sp.rotation.set(-0.5, 0, a); sp.translateY(.065); panel.add(sp); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .1).rotateX(Math.PI / 2 - 0.5), M.black); up(hub, 0, -.02, .05);
      const lever = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .09).rotateX(Math.PI / 2), M.chrome); up(lever, .22, 0, .045);
      up(new THREE.Mesh(new THREE.SphereGeometry(.013, 16, 10), M.black), .22, 0, .09);
    } break;
    case 'gun': {
      const gun = new THREE.Group();
      const gmat = new THREE.MeshPhysicalMaterial({ color: meta.id === 'duckhunt' ? 0xff7a1a : 0x1e1e20, roughness: .35, clearcoat: .5 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(.034, .2, .045), gmat); body.position.set(0, .05, .005); gun.add(body);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .1, 16), gmat); barrel.position.set(0, .18, .012); gun.add(barrel);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(.032, .045, .1), gmat); grip.position.set(0, -.065, -.045); grip.rotation.x = .3; gun.add(grip);
      const trig = new THREE.Mesh(new THREE.TorusGeometry(.014, .003, 6, 12, Math.PI), M.black); trig.position.set(0, -.03, -.005); trig.rotation.y = Math.PI / 2; gun.add(trig);
      const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, -.1, -.08), new THREE.Vector3(.04, -.14, -.04), new THREE.Vector3(.12, -.1, .0), new THREE.Vector3(.2, -.05, -.02)]), 20, .004, 6), M.black); gun.add(cable);
      gun.position.set(-.04, 0, .03); gun.rotation.z = -1.2; panel.add(gun); gun.traverse(o => o.castShadow = true);
      const holster = new THREE.Mesh(new THREE.BoxGeometry(.06, .07, .025), M.black); up(holster, .17, -.02, .012);
    } break;
    default: stick(-.12); button(.08, 0, 0xd8141c);
  }
}

function placeCabinets() {
  const slots = [];
  for (let i = 0; i < 8; i++) slots.push({ x: HALL.minX + .44, z: -4.2 - i * 1.02, ry: Math.PI / 2 });
  for (let i = 0; i < 8; i++) slots.push({ x: HALL.maxX - .44, z: -4.2 - i * 1.02, ry: -Math.PI / 2 });
  for (let i = 0; i < 7; i++) slots.push({ x: -3.06 + i * 1.02, z: HALL.minZ + .44, ry: 0 });
  // interleave so the user's order runs left wall → back wall → right wall
  const order = [...slots.slice(0, 8), ...slots.slice(16, 23), ...slots.slice(8, 16).reverse()];
  order.push({ x: HALL.maxX - .44, z: -4.2 - 8 * 1.02, ry: -Math.PI / 2 }); // 24th: end of the right wall
  order.push({ x: HALL.minX + .44, z: -4.2 - 8 * 1.02, ry: Math.PI / 2 });  // 25th: end of the left wall
  order.push({ x: HALL.maxX - .44, z: -4.2 - 9 * 1.02, ry: -Math.PI / 2 }); // 26th: right wall, back corner
  order.push({ x: HALL.minX + .44, z: -3.18, ry: Math.PI / 2 });            // 27th: left wall, next to the ATM
  LINEUP.forEach((id, i) => {
    const meta = gameMeta(id), style = CAB[id] || { body: '#222', ctl: 'stick1' };
    const c = buildCabinet(meta, style);
    const s = order[i];
    c.group.position.set(s.x, 0, s.z - .31 * 0); c.group.rotation.y = s.ry;
    // shift so the back of the cabinet (local z 0) touches the wall
    const fwd = new THREE.Vector3(Math.sin(s.ry), 0, Math.cos(s.ry));
    c.group.position.addScaledVector(fwd, -.44);
    scene.add(c.group); solids.push(c.group);
    const preview = meta.def ? makePreview(meta.def) : null;
    const src = preview && !preview.broken ? preview.canvas : outOfOrderCanvas(meta);
    const tex = new THREE.CanvasTexture(src); tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter; tex.magFilter = meta.def && meta.def.vector ? THREE.LinearFilter : THREE.NearestFilter; tex.generateMipmaps = false;
    c.screenMat.map = tex; c.screenMat.needsUpdate = true;
    if (preview) preview.texture = tex;
    // warm up the attract mode a little so every screen shows something
    if (preview) { for (let k = 0; k < 200; k++) preview.step(); preview.draw(); }
    // screen spill light on the carpet
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(meta.marquee.accent).multiplyScalar(.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.set(0, .004, 1.0); c.group.add(glow);
    const ao = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.2), aoMat()); ao.rotation.x = -Math.PI / 2; ao.position.set(0, .003, .36); c.group.add(ao);
    const wp = c.group.position.clone();
    const front = wp.clone().addScaledVector(fwd, 1.25);
    const cosA = Math.abs(Math.cos(s.ry)), sinA = Math.abs(Math.sin(s.ry));
    const hx = (.34 * cosA + .45 * sinA) + .02, hz = (.34 * sinA + .45 * cosA) + .02;
    const center = wp.clone().addScaledVector(fwd, .42);
    colliders.push({ minX: center.x - hx, maxX: center.x + hx, minZ: center.z - hz, maxZ: center.z + hz, cab: id });
    cabinets.push({ id, meta, group: c.group, screen: c.screen, preview, tex, front, fwd, ry: s.ry, sw: c.sw, sh: c.sh, tilt: c.tilt });
  });
}
let _ao = null;
// soft contact shadow: dark in the middle, fading out at the edges
function aoMat() {
  if (_ao) return _ao;
  const t = canvasTex(128, 128, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = Math.max(0, Math.abs(x - w / 2) - w * .26) / (w * .24), dy = Math.max(0, Math.abs(y - h / 2) - h * .26) / (h * .24);
      const a = Math.max(0, 1 - Math.hypot(dx, dy)); img.data.set([0, 0, 0, Math.round(a * a * 200)], (y * w + x) * 4);
    }
    g.putImageData(img, 0, 0);
  });
  _ao = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, color: 0x000000 });
  return _ao;
}


// Bullets and aiming test against one invisible box per cabinet or prop, not every triangle.
function proxySolids() {
  scene.updateMatrixWorld(true);
  const mat = new THREE.MeshBasicMaterial();
  for (let i = 0; i < solids.length; i++) {
    const o = solids[i]; if (!o.isGroup) continue;
    const b = new THREE.Box3().setFromObject(o), size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const box = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat);
    box.position.copy(c); box.visible = false; box.updateMatrixWorld(true); scene.add(box);
    solids[i] = box;
  }
}

// Cabinets are built from ~60 small parts each. Parts that share a material are merged into one
// mesh across the whole hall, cutting ~1,400 draw calls (and the same again per shadow pass) to a few dozen.
function batchCabinets() {
  const groups = new Map();
  scene.updateMatrixWorld(true);
  for (const c of cabinets) {
    c.group.traverse(o => {
      if (!o.isMesh || o === c.screen || Array.isArray(o.material) || (o.material.transparent && o.material !== _ao)) return;
      if (!groups.has(o.material)) groups.set(o.material, []);
      groups.get(o.material).push(o);
    });
  }
  for (const [mat, meshes] of groups) {
    if (meshes.length < 2) continue;
    const geos = meshes.map(m => {
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.morphAttributes = {};
      return g.applyMatrix4(m.matrixWorld);
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const big = new THREE.Mesh(merged, mat);
    big.castShadow = meshes.some(m => m.castShadow); big.receiveShadow = !mat.transparent; big.renderOrder = mat.transparent ? -1 : 0;
    scene.add(big);
    for (const m of meshes) m.parent.remove(m);
    geos.forEach(g => g.dispose());
  }
}
let _glow = null;
function glowTex() {
  if (_glow) return _glow;
  _glow = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  return _glow;
}

// ---------------------------------------------------------------- the boy
const boy = { root: new THREE.Group(), mixer: null, actions: {}, current: null, ready: false, pos: new THREE.Vector3(0, 0, 5), yaw: Math.PI, speed: 0 };
scene.add(boy.root);
// The boy is a MakeHuman character (CC0 assets, generated with MPFB in Blender) on a Mixamo-named rig.
// Hair, brows and lashes are alpha-cut cards; everything else is opaque.
function dressBoy(o) {
  const m = o.material, n = m.name || '';
  m.envMapIntensity = .6;
  if (/Hair|Brows|Lashes/.test(n)) {
    m.transparent = false; m.depthWrite = true; m.alphaTest = /Hair/.test(n) ? .22 : .2; m.side = THREE.DoubleSide;
    o.castShadow = /Hair/.test(n);
  } else m.side = THREE.FrontSide;
  if (/Eye/.test(n)) { m.roughness = .12; m.envMapIntensity = 1; o.castShadow = false; }
  if (/Brows|Lashes/.test(n)) {
    // lift the cards a hair off the skin so they never sink into it
    const g = o.geometry, p = g.attributes.position, nr = g.attributes.normal;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + nr.getX(i) * .0012, p.getY(i) + nr.getY(i) * .0012, p.getZ(i) + nr.getZ(i) * .0012);
    p.needsUpdate = true;
  }
  m.needsUpdate = true;
}
// Retarget the Mixamo mocap (Soldier rig) onto the boy's rig. The two rigs have different bone
// rolls and rest poses (T-pose vs A-pose), so local rotations cannot be copied. Instead the boy is
// first bent into the soldier's T-pose (bone by bone, matching directions), and every frame applies
// each source bone's world-space change from its T-pose to the matching boy bone.
const CHILD = { Hips: 'Spine', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head', LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', LeftHand: 'LeftHandMiddle1', RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand', RightHand: 'RightHandMiddle1', LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase' };
for (const s of ['Left', 'Right']) for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) { CHILD[`${s}Hand${f}1`] = `${s}Hand${f}2`; CHILD[`${s}Hand${f}2`] = `${s}Hand${f}3`; }
function retarget(model, bones, anims) {
  const src = {}; anims.scene.traverse(o => { if (o.isBone) src[o.name.replace('mixamorig', '')] = o; });
  const names = []; model.traverse(o => { if (o.isBone) { const k = o.name.replace('mixamorig', ''); if (src[k]) names.push(k); } });  // parents first
  const wq = o => o.getWorldQuaternion(new THREE.Quaternion()), wp = o => o.getWorldPosition(new THREE.Vector3());
  const tpose = anims.animations.find(c => c.name === 'TPose');
  const saved = []; anims.scene.traverse(o => saved.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]));
  const smix = new THREE.AnimationMixer(anims.scene);
  const pose = (clip, time) => { smix.stopAllAction(); if (clip) { const a = smix.clipAction(clip); a.play(); smix.setTime(time); } anims.scene.updateMatrixWorld(true); };
  // source reference pose
  pose(tpose, 0);
  const sRef = {}, sDir = {};
  for (const k of names) { sRef[k] = wq(src[k]); if (CHILD[k] && src[CHILD[k]]) sDir[k] = wp(src[CHILD[k]]).sub(wp(src[k])).normalize(); }
  const sHipsY = wp(src.Hips).y;
  // the two rigs face different ways: F turns source world space into the boy's
  const up = new THREE.Vector3(0, 1, 0);
  const fwd = (L, R) => wp(L).sub(wp(R)).cross(up).setY(0).normalize();
  model.updateMatrixWorld(true);
  const F = new THREE.Quaternion().setFromUnitVectors(fwd(src.LeftUpLeg, src.RightUpLeg), fwd(bones.LeftUpLeg, bones.RightUpLeg));
  const Fi = F.clone().invert();
  for (const k in sDir) sDir[k].applyQuaternion(F);
  // bend the boy into the same pose
  model.updateMatrixWorld(true);
  const rest = {}; for (const k of names) rest[k] = bones[k].quaternion.clone();
  for (const k of names) {
    const b = bones[k], c = bones[CHILD[k]];
    if (!sDir[k] || !c || k === 'Hips') continue;
    b.updateMatrixWorld(true);
    const d = wp(c).sub(wp(b)).normalize();
    const turn = new THREE.Quaternion().setFromUnitVectors(d, sDir[k]);
    const w = turn.multiply(wq(b));
    b.quaternion.copy(wq(b.parent).invert().multiply(w));
    b.updateMatrixWorld(true);
  }
  model.updateMatrixWorld(true);
  const tRef = {}; for (const k of names) tRef[k] = wq(bones[k]);
  const hipsParentQ = wq(bones.Hips.parent), hipsParentInv = bones.Hips.parent.matrixWorld.clone().invert();
  const tHips = wp(bones.Hips), ratio = tHips.y / sHipsY;
  for (const k of names) bones[k].quaternion.copy(rest[k]);   // back to the bind pose
  // bake each clip at 30 fps
  const out = [];
  const dq = new THREE.Quaternion(), tw = {}, v = new THREE.Vector3();
  for (const clip of anims.animations) {
    if (clip.name === 'TPose') continue;
    const n = Math.max(2, Math.round(clip.duration * 30) + 1), times = new Float32Array(n);
    const qv = {}; for (const k of names) qv[k] = new Float32Array(n * 4);
    const pv = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const time = Math.min(clip.duration, i / 30); times[i] = time;
      pose(clip, time);
      for (const k of names) {
        // world rotation of the boy's bone = (source change since its T-pose) applied to the boy's T-pose
        dq.copy(F).multiply(wq(src[k])).multiply(sRef[k].clone().invert()).multiply(Fi);
        tw[k] = dq.clone().multiply(tRef[k]);
        const parent = bones[k].parent, pk = parent && parent.name.replace('mixamorig', '');
        const pq = tw[pk] ? tw[pk] : hipsParentQ;
        const local = pq.clone().invert().multiply(tw[k]);
        local.toArray(qv[k], i * 4);
      }
      // hips height follows the mocap (scaled to the boy's size); horizontal root motion is dropped
      const h = wp(src.Hips);
      v.set(tHips.x, h.y * ratio, tHips.z).applyMatrix4(hipsParentInv).toArray(pv, i * 3);
    }
    const tracks = names.map(k => new THREE.QuaternionKeyframeTrack(bones[k].name + '.quaternion', times, qv[k]));
    tracks.push(new THREE.VectorKeyframeTrack(bones.Hips.name + '.position', times, pv));
    out.push(new THREE.AnimationClip(clip.name, clip.duration, tracks));
  }
  smix.stopAllAction(); smix.uncacheRoot(anims.scene);
  for (const [o, p, q, s] of saved) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(s); }   // the raid clones this rig
  anims.scene.updateMatrixWorld(true);
  return out;
}

// The published page may not fetch data: or blob: URLs, so models are never loaded through them:
// the glTF JSON (with its buffer embedded as base64) is repacked in memory into a binary .glb,
// and embedded textures are decoded straight from memory with createImageBitmap.
function gltfJsonToGlb(text) {
  const json = JSON.parse(text);
  const uri = json.buffers[0].uri || '';
  const b64 = uri.slice(uri.indexOf(',') + 1), raw = atob(b64);
  const bin = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) bin[i] = raw.charCodeAt(i);
  delete json.buffers[0].uri; json.buffers[0].byteLength = bin.length;
  let jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jPad = (4 - jsonBytes.length % 4) % 4, bPad = (4 - bin.length % 4) % 4;
  const jLen = jsonBytes.length + jPad, bLen = bin.length + bPad, total = 12 + 8 + jLen + 8 + bLen;
  const out = new ArrayBuffer(total), dv = new DataView(out), u8 = new Uint8Array(out);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, jLen, true); dv.setUint32(16, 0x4E4F534A, true);
  u8.set(jsonBytes, 20); for (let i = 0; i < jPad; i++) u8[20 + jsonBytes.length + i] = 0x20;
  const b0 = 20 + jLen; dv.setUint32(b0, bLen, true); dv.setUint32(b0 + 4, 0x004E4942, true);
  u8.set(bin, b0 + 8);
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
      const t = new THREE.Texture(bmp); t.flipY = false; t.name = def.name || src.name || '';
      const smp = (json.samplers || [])[def.sampler] || {};
      t.wrapS = GL_WRAP[smp.wrapS] || THREE.RepeatWrapping; t.wrapT = GL_WRAP[smp.wrapT] || THREE.RepeatWrapping;
      t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
      t.userData.mimeType = src.mimeType; t.needsUpdate = true;
      return t;
    });
  }
}
// Two boys to choose from (Graphics panel): the MakeHuman one and the one made in the Builder chat.
const CHARACTERS = { makehuman: 'models/boy.json', builder: 'models/boy-builder.json' };
const gltfLoader = new GLTFLoader();
gltfLoader.register(parser => new EmbeddedTextures(parser));
async function loadModel(url, onProgress) {
  const once = async () => {
    // the downloadable single-file version carries the models inline
    const inline = document.getElementById('model:' + url);
    let text;
    if (inline) text = inline.textContent;
    else { const res = await fetch(url); if (!res.ok) throw new Error(`HTTP ${res.status}`); text = await res.text(); }
    const glb = gltfJsonToGlb(text); if (onProgress) onProgress(1);
    return await new Promise((ok, fail) => gltfLoader.parse(glb, '', ok, fail));
  };
  for (let a = 1; ; a++) {
    try { return await once(); }
    catch (e) { if (a >= 3) throw new Error(`${url}: ${e && e.message || e}`); await new Promise(r => setTimeout(r, 600 * a)); }
  }
}
let boyModel = null, boyLoading = null;
async function loadBoy(onProgress) {
  const key = CHARACTERS[settings.character] ? settings.character : 'makehuman';
  const [avatar, anims] = await Promise.all([loadModel(CHARACTERS[key], () => onProgress(0, 1)), loadModel('models/anims.json', () => onProgress(1, 1))]);
  boy.soldier = anims;
  dressAvatar(avatar.scene, anims);
}
// put a loaded avatar on the boy: dress it, retarget the mocap, size it, swap out the previous one
function dressAvatar(model, anims) {
  const safe = (label, fn) => { try { fn(); } catch (e) { console.warn('character step skipped:', label, e); } };
  model.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.material) safe('dress ' + o.name, () => dressBoy(o)); }
  });
  const bones = {}; model.traverse(o => { if (o.isBone) bones[o.name.replace('mixamorig', '')] = o; });
  const clips = retarget(model, bones, anims);
  if (boy.mixer) { boy.mixer.stopAllAction(); if (boyModel) boy.mixer.uncacheRoot(boyModel); }
  if (boyModel) boy.root.remove(boyModel);
  boy.mixer = new THREE.AnimationMixer(model); boy.actions = {}; boy.current = null;
  for (const c of clips) {
    const a = boy.mixer.clipAction(c); a.enabled = true; a.setEffectiveWeight(0); a.play();
    boy.actions[c.name] = a;
  }
  // about 1.47 m tall, a typical 12-year-old
  model.updateMatrixWorld(true);
  const top = new THREE.Box3().setFromObject(model).max.y;
  model.scale.setScalar(top > .5 ? 1.47 / top : 1);
  model.rotation.y = Math.PI;
  boy.root.add(model); boyModel = model;
  // the raid keeps a reference to this object, so refill it rather than replace it
  boy.bones = boy.bones || {};
  for (const k of Object.keys(boy.bones)) delete boy.bones[k];
  Object.assign(boy.bones, bones);
  setAnim('Idle', 0);
  boy.ready = true;
}
async function switchCharacter(key) {
  if (!CHARACTERS[key] || !boy.soldier) return;
  settings.character = key; saveSettings(); syncSettingsUI();
  const job = boyLoading = loadModel(CHARACTERS[key]);
  try {
    const avatar = await job;
    if (job !== boyLoading) return;   // a newer pick won
    dressAvatar(avatar.scene, boy.soldier);
  } catch (e) { console.error(e); toast('That character didn’t load. Try again.'); }
}
function setAnim(name, fade = .3) {
  if (boy.current === name || !boy.actions[name]) return;
  const next = boy.actions[name];
  next.reset(); next.setEffectiveTimeScale(1); next.setEffectiveWeight(1);
  if (boy.current) boy.actions[boy.current].crossFadeTo(next, fade, true);
  else next.fadeIn(fade);
  next.play();
  boy.current = name;
}

// ---------------------------------------------------------------- input (hall)
const keys = new Set();
let mode = 'title'; // title | intro | walk | auto | enter | play | exit
window.addEventListener('keydown', e => {
  if (mode === 'play') {
    if (e.code === 'Escape') leaveCabinet();
    if (e.code === 'Digit5' && !e.repeat) insertCoin();
    return;
  }
  keys.add(e.code);
  if (mode === 'claw') {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape') exitClaw();
    else if (e.code === 'Digit5' && !e.repeat) claw.pay();
    else if (e.code === 'Space' || e.code === 'Enter') claw.drop();
    return;
  }
  if ((e.code === 'KeyE' || e.code === 'Enter') && mode === 'walk') interact();
  if (raid && raid.active) {
    const n = { Digit1: 'pistol', Digit2: 'mg', Digit3: 'crossbow', Digit4: 'bfg', Digit5: 'heavy' }[e.code];
    if (n) raid.select(n);
    if (e.code === 'KeyQ') raid.cycle(1);
  }
  if (e.code === 'Tab') { e.preventDefault(); toggleMenu(); }
  if (e.code === 'Escape') { closeMenu(); $('#settings').hidden = true; }
  if (e.code === 'KeyG') $('#settings').hidden = !$('#settings').hidden;
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

const orbit = { yaw: Math.PI, pitch: 0.28, dist: 3.1, dragging: false, lx: 0, ly: 0, moved: 0 };
canvas3d.addEventListener('pointerdown', e => {
  if (raid && raid.armed() && e.pointerType === 'mouse' && e.button === 0) {
    if (document.pointerLockElement !== canvas3d) { try { const p = canvas3d.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (err) { } }
    raid.trigger(true);
  }
});
window.addEventListener('pointerup', e => { if (raid && e.button === 0) raid.trigger(false); });
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas3d) return;
  orbit.yaw -= e.movementX * 0.0025; orbit.pitch = Math.max(-0.45, Math.min(1.0, orbit.pitch + e.movementY * 0.002));
});
canvas3d.addEventListener('pointerdown', e => { orbit.dragging = true; orbit.lx = e.clientX; orbit.ly = e.clientY; orbit.moved = 0; canvas3d.setPointerCapture(e.pointerId); });
canvas3d.addEventListener('pointermove', e => {
  if (!orbit.dragging || touchStick.id === e.pointerId) return;
  const dx = e.clientX - orbit.lx, dy = e.clientY - orbit.ly; orbit.lx = e.clientX; orbit.ly = e.clientY; orbit.moved += Math.abs(dx) + Math.abs(dy);
  orbit.yaw -= dx * 0.006; orbit.pitch = Math.max(-0.15, Math.min(1.1, orbit.pitch + dy * 0.004));
});
canvas3d.addEventListener('pointerup', e => {
  orbit.dragging = false;
  if (orbit.moved < 6 && (mode === 'walk' || mode === 'auto') && !(raid && raid.active)) pickCabinet(e);
});
canvas3d.addEventListener('wheel', e => { orbit.dist = Math.max(1.4, Math.min(6, orbit.dist + e.deltaY * 0.002)); }, { passive: true });

const ray = new THREE.Raycaster();
function pickCabinet(e) {
  const v = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(v, camera);
  const hits = ray.intersectObjects(cabinets.map(c => c.group), true);
  if (hits.length) {
    let o = hits[0].object; while (o && !cabinets.find(c => c.group === o)) o = o.parent;
    const c = cabinets.find(c => c.group === o); if (c) walkTo(c, true);
  }
}

// touch joystick for walking
const touchStick = { id: null, x: 0, y: 0, dx: 0, dy: 0 };
const stickEl = $('#walkstick');
if (stickEl) {
  stickEl.addEventListener('pointerdown', e => { touchStick.id = e.pointerId; const r = stickEl.getBoundingClientRect(); touchStick.x = r.left + r.width / 2; touchStick.y = r.top + r.height / 2; stickEl.setPointerCapture(e.pointerId); moveStick(e); e.stopPropagation(); });
  stickEl.addEventListener('pointermove', e => { if (e.pointerId === touchStick.id) moveStick(e); });
  const end = e => { if (e.pointerId === touchStick.id) { touchStick.id = null; touchStick.dx = touchStick.dy = 0; stickEl.style.setProperty('--kx', '0px'); stickEl.style.setProperty('--ky', '0px'); } };
  stickEl.addEventListener('pointerup', end); stickEl.addEventListener('pointercancel', end);
}
function moveStick(e) {
  let dx = (e.clientX - touchStick.x) / 50, dy = (e.clientY - touchStick.y) / 50;
  const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
  touchStick.dx = dx; touchStick.dy = dy;
  stickEl.style.setProperty('--kx', dx * 30 + 'px'); stickEl.style.setProperty('--ky', dy * 30 + 'px');
}

// ---------------------------------------------------------------- movement
let nearCab = null, autoPath = null, autoPlay = false;
function collide(p, r = .28) {
  p.x = Math.max(HALL.minX + r, Math.min(HALL.maxX - r, p.x));
  const outside = p.z > HALL.maxZ - .05;
  if (outside) { p.x = Math.max(-1.0 + r * .5, Math.min(1.0 - r * .5, p.x)); if (p.z < HALL.maxZ + .3) p.x = Math.max(-0.95, Math.min(0.95, p.x)); }
  else if (p.z > HALL.maxZ - r && Math.abs(p.x) > 1.0) p.z = HALL.maxZ - r;
  p.z = Math.max(HALL.minZ + r, Math.min(HALL.maxZ + 6, p.z));
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(c.maxX, p.x)), cz = Math.max(c.minZ, Math.min(c.maxZ, p.z));
    const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d < r) {
      if (d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
      else { p.x += r; }
    }
  }
}
function walkTo(cab, play) {
  closeMenu();
  if (raid && raid.active) { toast('Not now. The arcade is under attack!'); return; }
  const p = boy.pos, f = cab.front;
  const pts = [];
  if (p.z > HALL.maxZ - .3) pts.push(new THREE.Vector3(0, 0, HALL.maxZ - 1.2));
  // walk down a side lane so the claw machine in the middle is never in the way
  const lane = (f.x < 0 ? -1 : 1) * 1.7;
  const z0 = Math.min(p.z, HALL.maxZ - 1.2);
  if (Math.sign(p.x || lane) !== Math.sign(lane) && z0 < -6.7 && z0 > -9.5) pts.push(new THREE.Vector3(p.x, 0, -6.6));
  pts.push(new THREE.Vector3(lane, 0, pts.length ? -6.6 : z0));
  pts.push(new THREE.Vector3(lane, 0, cab.ry === 0 ? -12.9 : f.z));
  pts.push(f.clone());
  autoPath = { pts, cab }; autoPlay = play; mode = 'auto';
}

// ---------------------------------------------------------------- play
let running = null, camTween = null;
const playOverlay = $('#play'), gameCanvas = $('#game');
function startPlay(cab) {
  if (!cab.meta.def) { toast(`${cab.meta.title} is out of order right now.`); return; }
  if (raid && raid.active) { toast('Not now. The arcade is under attack!'); mode = 'walk'; return; }
  mode = 'enter'; nearCab = null; $('#prompt').hidden = true; closeMenu();
  boy.pos.copy(cab.front); boy.yaw = Math.atan2(-cab.fwd.x, -cab.fwd.z); setAnim('Idle');
  // camera: over the shoulder, then into the screen
  const screenW = cab.screen.getWorldPosition(new THREE.Vector3());
  const normal = new THREE.Vector3(0, Math.sin(cab.tilt), Math.cos(cab.tilt)).applyAxisAngle(new THREE.Vector3(0, 1, 0), cab.ry);
  const over = cab.front.clone().addScaledVector(cab.fwd, .55).add(new THREE.Vector3(0, 1.55, 0)).add(new THREE.Vector3(cab.fwd.z, 0, -cab.fwd.x).multiplyScalar(.28));
  const fill = Math.max(cab.sw, cab.sh) * 0.62 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const close = screenW.clone().addScaledVector(normal, Math.max(.3, fill * 1.15));
  camTween = { t: 0, pts: [camera.position.clone(), over, close], look: [lookCur.clone(), screenW.clone(), screenW.clone()], dur: 1.9, done: () => openGame(cab) };
  Reg.audio.unlock();
  Reg.audio.tone(988, .06, { type: 'square', vol: .15 }); Reg.audio.tone(1319, .12, { type: 'square', vol: .15, delay: .07 });
}
function openGame(cab) {
  mode = 'play';
  const def = cab.meta.def;
  $('#play-title').textContent = cab.meta.title;
  $('#play-meta').textContent = `${cab.meta.maker} · ${cab.meta.year}`;
  $('#play-controls').textContent = def.controls || '';
  playOverlay.classList.toggle('vector', !!def.vector);
  playOverlay.style.setProperty('--ar', `${def.width} / ${def.height}`);
  playOverlay.hidden = false;
  requestAnimationFrame(() => playOverlay.classList.add('on'));
  document.body.classList.toggle('pointer-game', !!def.pointer);
  coinSlot = { credits: 0, onChange: syncPlayCoins };
  running = Reg.run(def.id, gameCanvas, { onExit: leaveCabinet, coins: coinSlot });
  music.setDuck(.1);
  idleT = 0; raidReady = true; syncPlayCoins();
  running.cab = cab;
  if (cab.preview) cab.paused = true;
  fitGame();
}
function fitGame() {
  if (!running) return;
  const def = running.def, wrap = $('#crt');
  const bar = $('#play-bar').offsetHeight + 24, pad = (window.matchMedia('(pointer: coarse)').matches ? 170 : 24);
  const aw = innerWidth - 32, ah = innerHeight - bar - pad;
  const k = Math.min(aw / def.width, ah / def.height);
  wrap.style.width = Math.floor(def.width * k) + 'px'; wrap.style.height = Math.floor(def.height * k) + 'px';
}
window.addEventListener('resize', fitGame);
function leaveCabinet() {
  if (!running) return;
  const cab = running.cab;
  running.stop(); running = null; cab.paused = false;
  coinSlot = null; idleT = 0; // unused credits stay in the machine
  music.setDuck(1);
  playOverlay.classList.remove('on');
  setTimeout(() => { playOverlay.hidden = true; }, 350);
  mode = 'exit';
  const back = desiredCam();
  camTween = { t: 0, pts: [camera.position.clone(), back.pos], look: [lookCur.clone(), back.look], dur: 1.1, done: () => { mode = 'walk'; } };
}
$('#play-exit').addEventListener('click', leaveCabinet);
$('#play-mute').addEventListener('click', () => { settings.sound = !settings.sound; Reg.audio.setMuted(!settings.sound); music.setMuted(!settings.sound); syncSettingsUI(); saveSettings(); });
// on-screen gamepad for touch
document.querySelectorAll('[data-vk]').forEach(b => {
  const code = b.dataset.vk;
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); Reg.virtualKey(code, true); b.classList.add('down'); });
  const up = () => { Reg.virtualKey(code, false); b.classList.remove('down'); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
});

// ---------------------------------------------------------------- camera
const lookCur = new THREE.Vector3(0, 1.2, 0);
function desiredCam() {
  const h = 1.15 * 0.8 + .25;
  const look = boy.pos.clone().add(new THREE.Vector3(0, h, 0));
  const armed = raid && raid.armed();
  if (armed) look.add(new THREE.Vector3(Math.cos(orbit.yaw), .12, -Math.sin(orbit.yaw)).multiplyScalar(.42)); // over the right shoulder
  const cp = Math.cos(orbit.pitch);
  const pos = look.clone().add(new THREE.Vector3(Math.sin(orbit.yaw) * cp, Math.sin(orbit.pitch), Math.cos(orbit.yaw) * cp).multiplyScalar(armed ? 1.55 : orbit.dist));
  // keep the camera inside the room
  if (boy.pos.z < HALL.maxZ - .2) {
    pos.x = Math.max(HALL.minX + .15, Math.min(HALL.maxX - .15, pos.x));
    pos.z = Math.max(HALL.minZ + .15, Math.min(HALL.maxZ - .15, pos.z));
  }
  pos.y = Math.max(.3, Math.min(HALL.h - .15, pos.y));
  return { pos, look };
}
function bez(pts, t) {
  if (pts.length === 2) return pts[0].clone().lerp(pts[1], t);
  const a = pts[0].clone().lerp(pts[1], t), b = pts[1].clone().lerp(pts[2], t); return a.lerp(b, t);
}
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let introT = 0, ambT = 0, liveIdx = 0, farT = 0;
const perf = { t: 0, n: 0, slow: 0, fast: 0, last: performance.now() };
// Auto resolution: step the pixel ratio down 15% at a time while frames take longer than ~21ms,
// and back up once there is plenty of headroom again.
function watchFrameRate() {
  const now = performance.now(), ft = now - perf.last; perf.last = now;
  if (!settings.auto || mode === 'play' || mode === 'title' || document.hidden || ft > 250) return;
  perf.t += ft; perf.n++;
  if (perf.t < 1500) return;
  const avg = perf.t / perf.n; perf.t = 0; perf.n = 0;
  if (avg > 21 && perfScale > .55) { perf.slow++; perf.fast = 0; if (perf.slow >= 2) { perfScale = Math.max(.55, perfScale - .15); perf.slow = 0; applyResolution(); } }
  else if (avg < 13 && perfScale < 1) { perf.fast++; perf.slow = 0; if (perf.fast >= 4) { perfScale = Math.min(1, perfScale + .15); perf.fast = 0; applyResolution(); } }
  else { perf.slow = 0; perf.fast = 0; }
}
function applyResolution() {
  const pr = Math.min(window.devicePixelRatio || 1, 2) * settings.scale * (settings.auto ? perfScale : 1);
  renderer.setPixelRatio(Math.max(0.4, Math.min(pr, 3))); resize();
}
function tick() {
  watchFrameRate();
  const dt = Math.min(clock.getDelta(), 0.05);
  if (mode !== 'play') updateHall(dt);
  if (raid && mode !== 'play') raid.update(dt);
  if (claw && mode !== 'play') claw.update(dt);
  if (boy.mixer) boy.mixer.update(dt);
  boy.root.position.copy(boy.pos); boy.root.rotation.y = boy.yaw;
  if (raid && mode !== 'play') raid.postAnim();
  if (mode !== 'play') updateShadows();
  updateCan(dt);
  updateMoney(dt);
  updateScreens();
  if (mode !== 'play') composer.render(); // the 3D view is fully covered while playing
  requestAnimationFrame(tick);
}
function updateHall(dt) {
  if (mode === 'title') {
    const t = performance.now() / 1000 * .08;
    camera.position.set(Math.sin(t) * 3.5, 2.1, 6.5 + Math.cos(t) * .6); lookCur.set(0, 1.6, -6); camera.lookAt(lookCur);
    return;
  }
  if (mode === 'intro') {
    introT += dt;
    const dz = -2.0 * dt; boy.pos.z += dz; boy.yaw = Math.PI; setAnim('Walk'); if (boy.actions.Walk) boy.actions.Walk.setEffectiveTimeScale(1.6);
    const d = desiredCam();
    camera.position.lerp(d.pos, Math.min(1, dt * 1.2)); lookCur.lerp(d.look, Math.min(1, dt * 2.5)); camera.lookAt(lookCur);
    if (boy.pos.z < HALL.maxZ - 2.0) { mode = 'walk'; setAnim('Idle'); $('#hud').hidden = false; showHelpOnce(); }
    return;
  }
  if (mode === 'claw' && claw) {
    camera.position.lerp(claw.camera.pos, Math.min(1, dt * 4)); lookCur.lerp(claw.camera.look, Math.min(1, dt * 5)); camera.lookAt(lookCur);
    return;
  }
  if (camTween) {
    camTween.t += dt / camTween.dur; const t = ease(Math.min(1, camTween.t));
    camera.position.copy(bez(camTween.pts, t)); lookCur.copy(bez(camTween.look, t)); camera.lookAt(lookCur);
    if (camTween.t >= 1) { const d = camTween.done; camTween = null; d && d(); }
    return;
  }
  // walking
  let mx = 0, mz = 0;
  if (mode === 'walk' && !canBusy()) {
    const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - touchStick.dy;
    const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touchStick.dx;
    const fx = -Math.sin(orbit.yaw), fz = -Math.cos(orbit.yaw);
    mx = fx * f - fz * s; mz = fz * f + fx * s;
  } else if (mode === 'auto' && autoPath) {
    const target = autoPath.pts[0];
    const dx = target.x - boy.pos.x, dz = target.z - boy.pos.z, d = Math.hypot(dx, dz);
    if (d < .12) {
      autoPath.pts.shift();
      if (!autoPath.pts.length) { const c = autoPath.cab; autoPath = null; mode = 'walk'; if (autoPlay) startPlay(c); return; }
    } else { mx = dx / d; mz = dz / d; }
  }
  const len = Math.hypot(mx, mz);
  const running_ = keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(touchStick.dx, touchStick.dy) > .9;
  const speed = len > .01 ? (running_ && mode === 'walk' ? 4.3 : 2.1) : 0;
  if (len > .01) {
    mx /= len; mz /= len;
    const targetYaw = Math.atan2(mx, mz);
    let dy = targetYaw - boy.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    boy.yaw += dy * Math.min(1, dt * 10);
    boy.pos.x += mx * speed * dt; boy.pos.z += mz * speed * dt;
    collide(boy.pos);
    setAnim(speed > 3 ? 'Run' : 'Walk', .25);
    if (boy.actions.Walk) boy.actions.Walk.setEffectiveTimeScale(1.6);
    if (boy.actions.Run) boy.actions.Run.setEffectiveTimeScale(1.15);
  } else setAnim('Idle', .35);
  if (raid && raid.armed()) {
    let dy = (orbit.yaw + Math.PI) - boy.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); boy.yaw += dy * Math.min(1, dt * 14);
  }
  // raiders show up after five minutes without a game
  // one raid at a time: after a raid, he has to play a game before the next one can happen
  if (raid && !raid.active && raidReady && (mode === 'walk' || mode === 'auto')) { idleT += dt; if (idleT >= RAID_AFTER) { idleT = 0; raidReady = false; raid.start(); } }
  // camera follow; gently swing behind the boy while moving
  if (len > .01 && !orbit.dragging && !(raid && raid.armed())) {
    let dy = (boy.yaw + Math.PI) - orbit.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    orbit.yaw += dy * Math.min(1, dt * (mode === 'auto' ? 1.5 : .8));
  }
  const d = desiredCam();
  camera.position.lerp(d.pos, Math.min(1, dt * 6)); lookCur.lerp(d.look, Math.min(1, dt * 8)); camera.lookAt(lookCur);
  // nearest cabinet prompt
  nearCab = null; let best = 1.05;
  if (!(raid && raid.active)) for (const c of cabinets) { const dd = Math.hypot(c.front.x - boy.pos.x, c.front.z - boy.pos.z); if (dd < best) { best = dd; nearCab = c; } }
  nearChange = Math.hypot(changeSpot.x - boy.pos.x, changeSpot.z - boy.pos.z) < .8;
  nearAtm = Math.hypot(atmSpot.x - boy.pos.x, atmSpot.z - boy.pos.z) < .7;
  nearSoda = Math.hypot(sodaSpot.x - boy.pos.x, sodaSpot.z - boy.pos.z) < .95;
  nearPrize = Math.abs(boy.pos.x - prizeSpot.x) < 1.3 && Math.abs(boy.pos.z - prizeSpot.z) < .7;
  nearClaw = !!claw && Math.hypot(claw.front.x - boy.pos.x, claw.front.z - boy.pos.z) < .85 && !(raid && raid.active);
  nearTrash = Math.hypot(trashSpot.x - boy.pos.x, trashSpot.z - boy.pos.z) < .85;
  const pr = $('#prompt');
  if (mode === 'walk' && nearClaw) { pr.hidden = false; $('#prompt-p1').textContent = 'PRESS E TO PLAY · 50¢ A TRY'; $('#prompt-title').textContent = 'Claw machine'; $('#prompt-play').textContent = 'Play'; }
  else if (mode === 'walk' && nearPrize) { pr.hidden = false; $('#prompt-p1').textContent = 'PRESS E FOR PRIZES · $1–$10'; $('#prompt-title').textContent = 'Prize counter'; $('#prompt-play').textContent = 'See prizes'; }
  else if (mode === 'walk' && nearTrash && heldCan) { pr.hidden = false; $('#prompt-p1').textContent = 'PRESS E TO RECYCLE · +25¢'; $('#prompt-title').textContent = 'Recycle bin'; $('#prompt-play').textContent = 'Recycle can'; }
  else if (mode === 'walk' && nearSoda) { pr.hidden = false; $('#prompt-p1').textContent = heldCan ? 'RECYCLE YOUR CAN FIRST' : 'PRESS E FOR A SODA · 50¢'; $('#prompt-title').textContent = 'Valley Cola'; $('#prompt-play').textContent = 'Buy soda'; }
  else if (mode === 'walk' && nearAtm) { pr.hidden = false; $('#prompt-p1').textContent = 'PRESS E · DEPOSIT / WITHDRAW'; $('#prompt-title').textContent = 'ATM'; $('#prompt-play').textContent = 'Use ATM'; }
  else if (mode === 'walk' && nearChange) { pr.hidden = false; $('#prompt-p1').textContent = 'PRESS E FOR QUARTERS'; $('#prompt-title').textContent = 'Change machine'; $('#prompt-play').textContent = 'Get change'; }
  else if (nearCab && mode === 'walk') { pr.hidden = false; $('#prompt-p1').textContent = 'PRESS E TO PLAY · 25¢'; $('#prompt-title').textContent = nearCab.meta.title; $('#prompt-play').textContent = 'Play'; }
  else pr.hidden = true;
  if (!nearChange && !$('#change').hidden) $('#change').hidden = true;
  if (!nearAtm && !$('#atm').hidden) $('#atm').hidden = true;
  if (!nearPrize && !$('#prizes').hidden) $('#prizes').hidden = true;
  // ambience: occasional bleeps from nearby cabinets
  ambT -= dt;
  if (settings.ambience && settings.sound && ambT <= 0 && cabinets.length) {
    ambT = .35 + Math.random() * .9;
    const c = cabinets[Math.random() * cabinets.length | 0];
    const dist = Math.hypot(c.front.x - boy.pos.x, c.front.z - boy.pos.z);
    const v = Math.max(0, .035 - dist * .003);
    if (v > .004) { const f = [262, 330, 392, 523, 659, 784, 880, 1047][Math.random() * 8 | 0]; Reg.audio.tone(f, .07 + Math.random() * .1, { type: Math.random() < .5 ? 'square' : 'triangle', vol: v }); }
  }
}
const screenLight = new THREE.PointLight(0xffffff, 0, 3.2, 1.6); scene.add(screenLight);
const sampleCanvas = document.createElement('canvas'); sampleCanvas.width = sampleCanvas.height = 1;
const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
let sampleT = 0;
function updateScreenLight() {
  let near = null, bd = 3.5;
  for (const c of cabinets) { const d = Math.hypot(c.front.x - boy.pos.x, c.front.z - boy.pos.z); if (d < bd) { bd = d; near = c; } }
  if (!near || !near.preview || near.preview.broken) { screenLight.intensity *= .9; return; }
  near.screen.getWorldPosition(screenLight.position).addScaledVector(near.fwd, .35);
  if (--sampleT <= 0) {
    sampleT = 8;
    try { sampleCtx.drawImage(near.preview.canvas, 0, 0, 1, 1); const d = sampleCtx.getImageData(0, 0, 1, 1).data; screenLight.userData.c = new THREE.Color(d[0] / 255, d[1] / 255, d[2] / 255); } catch (e) { }
  }
  const c = screenLight.userData.c || new THREE.Color(.5, .5, .7);
  const lum = Math.max(.25, c.r + c.g + c.b);
  screenLight.color.lerp(c.clone().multiplyScalar(1 / lum * 1.6), .2);
  screenLight.intensity += ((3.2 - bd) * 1.1 - screenLight.intensity) * .15;
}
function updateScreens() {
  if (!cabinets.length) return;
  if (mode !== 'play') updateScreenLight();
  const live = mode === 'play' ? 0 : settings.live;
  if (live <= 0) return;
  // the N closest cabinets run their attract mode at full rate
  const byDist = cabinets.filter(c => c.preview && !c.preview.broken && !c.paused)
    .map(c => [c, c.front.distanceToSquared(camera.position)]).sort((a, b) => a[1] - b[1]).slice(0, live);
  byDist.forEach(([c], i) => { c.preview.step(); if ((c._f = (c._f || 0) + 1) % (i < 3 ? 2 : 3) === 0) c.preview.draw(); });
  // everyone else advances slowly in the background (one cabinet per frame)
  const rest = cabinets.filter(c => c.preview && !c.preview.broken && !byDist.find(b => b[0] === c));
  if (rest.length && (farT = (farT + 1) % 3) === 0) { const c = rest[liveIdx++ % rest.length]; for (let k = 0; k < 6; k++) c.preview.step(); c.preview.draw(); }
}

// ---------------------------------------------------------------- UI
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2600); }
function buildMenu() {
  const list = $('#menu-list'); list.innerHTML = '';
  for (const c of cabinets) {
    const b = document.createElement('button'); b.className = 'game'; b.type = 'button';
    b.style.setProperty('--acc', c.meta.marquee.accent); b.style.setProperty('--fg', c.meta.marquee.fg);
    b.innerHTML = `<span class="g-year">${c.meta.year}</span><span class="g-title"></span><span class="g-maker"></span>${c.meta.def ? '' : '<span class="g-ooo">Out of order</span>'}`;
    b.querySelector('.g-title').textContent = c.meta.title; b.querySelector('.g-maker').textContent = c.meta.maker;
    b.addEventListener('click', () => { if (mode === 'walk' || mode === 'auto') walkTo(c, true); });
    list.appendChild(b);
  }
}
function toggleMenu() { const m = $('#menu'); m.hidden = !m.hidden; }
function closeMenu() { $('#menu').hidden = true; }
$('#btn-games').addEventListener('click', toggleMenu);
$('#menu-close').addEventListener('click', closeMenu);
$('#btn-settings').addEventListener('click', () => $('#settings').hidden = !$('#settings').hidden);
$('#settings-close').addEventListener('click', () => $('#settings').hidden = true);
function syncSettingsUI() {
  document.querySelectorAll('[name=preset]').forEach(r => r.checked = r.value === settings.preset);
  $('#opt-shadows').checked = settings.shadows; $('#opt-bloom').checked = settings.bloom; $('#opt-aa').checked = settings.aa;
  $('#opt-music').value = settings.music; $('#opt-music-v').textContent = Math.round(settings.music * 100) + '%'; $('#hud-music').value = settings.music;
  $('#opt-auto').checked = settings.auto; $('#opt-crt').checked = settings.crt; $('#opt-sound').checked = settings.sound; $('#opt-ambience').checked = settings.ambience;
  $('#opt-scale').value = settings.scale; $('#opt-scale-v').textContent = Math.round(settings.scale * 100) + '%';
  $('#opt-live').value = settings.live; $('#opt-live-v').textContent = settings.live;
  $('#play-mute').textContent = settings.sound ? 'Sound on' : 'Sound off';
  document.querySelectorAll('[name=character]').forEach(r => r.checked = r.value === settings.character);
}
document.querySelectorAll('[name=preset]').forEach(r => r.addEventListener('change', () => {
  settings.preset = r.value; Object.assign(settings, PRESETS[r.value]); syncSettingsUI(); applySettings(); saveSettings();
}));
for (const [id, key] of [['opt-auto', 'auto'], ['opt-shadows', 'shadows'], ['opt-bloom', 'bloom'], ['opt-aa', 'aa'], ['opt-crt', 'crt'], ['opt-sound', 'sound'], ['opt-ambience', 'ambience']]) {
  $('#' + id).addEventListener('change', e => { settings[key] = e.target.checked; settings.preset = 'custom'; syncSettingsUI(); applySettings(); saveSettings(); });
}
$('#opt-scale').addEventListener('input', e => { settings.scale = +e.target.value; settings.preset = 'custom'; syncSettingsUI(); applySettings(); saveSettings(); });
for (const id of ['#opt-music', '#hud-music']) $(id).addEventListener('input', e => { settings.music = +e.target.value; music.setVolume(settings.music); syncSettingsUI(); saveSettings(); });
$('#opt-live').addEventListener('input', e => { settings.live = +e.target.value; settings.preset = 'custom'; syncSettingsUI(); saveSettings(); });
document.querySelectorAll('[name=character]').forEach(r => r.addEventListener('change', () => { if (r.checked) switchCharacter(r.value); }));
let helpShown = false;
function showHelpOnce() { if (helpShown) return; helpShown = true; toast('Walk up to any cabinet and press E, or press Tab to pick a game.'); }


// ---------------------------------------------------------------- money: wallet, bank (ATM), change machine, coins, floor cash
const RAID_AFTER = (() => { const m = /raid=(\d+)/.exec(location.search); return m ? +m[1] : 60; })();
let nearPrize = false, nearClaw = false, claw = null;
const prizeSpot = new THREE.Vector3(-5.4, 0, HALL.minZ + 2.0);
let nearAtm = false;
const atmSpot = new THREE.Vector3(HALL.minX + 1.0, 0, -1.25);
let raidReady = true, raid = null, idleT = 0, coinSlot = null, nearChange = false, nearSoda = false, nearTrash = false, heldCan = null;
const sodaSpot = new THREE.Vector3(4.4, 0, HALL.maxZ - 1.25), trashSpot = new THREE.Vector3(5.5, 0, HALL.maxZ - 1.05);
const changeSpot = new THREE.Vector3();
const wallet = { cents: 2000, quarters: 0, bank: 0 };
try { const w = JSON.parse(localStorage.getItem('arcade.wallet') || 'null'); if (w && w.cents >= 0) Object.assign(wallet, w); } catch (e) { }
const money = c => '$' + (c / 100).toFixed(2);
function syncWallet() {
  $('#w-total').textContent = money(wallet.cents + wallet.quarters * 25);
  $('#w-cash').textContent = money(wallet.cents);
  $('#w-q').textContent = wallet.quarters;
  try { localStorage.setItem('arcade.wallet', JSON.stringify(wallet)); } catch (e) { }
  document.querySelectorAll('#change [data-bill]').forEach(b => b.disabled = wallet.cents < +b.dataset.bill * 100);
  wallet.bank = wallet.bank || 0;
  $('#atm-bank').textContent = money(wallet.bank);
  $('#atm-onhand').textContent = `On hand: ${money(wallet.cents)} cash · ${wallet.quarters} quarters`;
  document.querySelectorAll('#atm [data-dep]').forEach(b => { const v = b.dataset.dep; b.disabled = v === 'q' ? wallet.quarters === 0 : v === 'all' ? wallet.cents === 0 : wallet.cents < +v * 100; });
  document.querySelectorAll('#atm [data-wd]').forEach(b => { const v = b.dataset.wd; b.disabled = v === 'all' ? wallet.bank === 0 : wallet.bank < +v * 100; });
  $('#w-bank').textContent = wallet.bank ? ` · bank ${money(wallet.bank)}` : '';
  syncPlayCoins();
}
function addCash(cents) { wallet.cents += cents; syncWallet(); }
function coinClink(n = 4) { for (let i = 0; i < Math.min(n, 8); i++) Reg.audio.tone(2600 + Math.random() * 900, .09, { type: 'triangle', vol: .08, delay: i * .07 + Math.random() * .03 }); }
function interact() {
  if (mode !== 'walk') return;
  if (nearClaw) { enterClaw(); return; }
  if (nearPrize) { openPrizes(); return; }
  if (nearTrash && heldCan) { recycleCan(); return; }
  if (nearSoda) { buySoda(); return; }
  if (nearAtm) { $('#atm').hidden = false; syncWallet(); return; }
  if (nearChange) { $('#change').hidden = false; syncWallet(); return; }
  if (nearCab) startPlay(nearCab);
}
document.querySelectorAll('#change [data-bill]').forEach(b => b.addEventListener('click', () => {
  const d = +b.dataset.bill; if (wallet.cents < d * 100) return;
  wallet.cents -= d * 100; wallet.quarters += d * 4; syncWallet(); coinClink(d * 4);
  $('#change-msg').textContent = `${d * 4} quarters dropped into the tray.`;
}));
$('#change-close').addEventListener('click', () => $('#change').hidden = true);
$('#atm-close').addEventListener('click', () => $('#atm').hidden = true);
// ATM deposits and withdrawals: money in the bank is safe but can't be spent until it's taken out
function atmBeep() { Reg.audio.tone(1320, .06, { type: 'square', vol: .1 }); Reg.audio.tone(1760, .08, { type: 'square', vol: .1, delay: .08 }); }
document.querySelectorAll('#atm [data-dep]').forEach(b => b.addEventListener('click', () => {
  const v = b.dataset.dep; let amt = 0;
  if (v === 'q') { amt = wallet.quarters * 25; wallet.quarters = 0; coinClink(6); }
  else { amt = v === 'all' ? wallet.cents : +v * 100; if (amt > wallet.cents || amt <= 0) return; wallet.cents -= amt; }
  if (amt <= 0) return;
  wallet.bank += amt; syncWallet(); atmBeep();
  $('#atm-msg').textContent = `Deposited ${money(amt)}. New balance ${money(wallet.bank)}.`;
}));
document.querySelectorAll('#atm [data-wd]').forEach(b => b.addEventListener('click', () => {
  const v = b.dataset.wd, amt = v === 'all' ? wallet.bank : +v * 100;
  if (amt <= 0 || amt > wallet.bank) return;
  wallet.bank -= amt; wallet.cents += amt; syncWallet(); atmBeep();
  Reg.audio.noise(.4, { vol: .12, freq: 3000, type: 'bandpass', delay: .15 }); // bills counting out
  $('#atm-msg').textContent = `Take your cash: ${money(amt)}. Balance ${money(wallet.bank)}.`;
}));
function insertCoin() {
  if (!coinSlot) return;
  if (wallet.quarters > 0) wallet.quarters--;
  else {
    // machines only take quarters: out of quarters means a trip to the change machine by the entrance
    $('#play-msg').textContent = wallet.cents >= 100 ? 'Out of quarters! Leave the cabinet (Esc) and get more at the change machine by the entrance.' : 'Out of money. Leave the cabinet and look around the floor for dropped cash.';
    Reg.audio.tone(110, .25, { type: 'square', vol: .15 }); Reg.audio.tone(90, .25, { type: 'square', vol: .15, delay: .22 });
    return;
  }
  coinSlot.credits++; syncWallet();
  const fx = $('#coin-fx'); fx.classList.remove('go'); void fx.offsetWidth; fx.classList.add('go');
  const w = $('#wallet'); w.classList.remove('spend'); void w.offsetWidth; w.classList.add('spend');
  Reg.audio.tone(1900, .05, { type: 'triangle', vol: .12 }); Reg.audio.noise(.12, { vol: .1, freq: 900, delay: .06 }); Reg.audio.tone(140, .08, { type: 'square', vol: .08, delay: .18 });
  $('#play-msg').textContent = '';
}
function syncPlayCoins() {
  const c = $('#play-credits'); if (!c) return;
  c.textContent = coinSlot ? `CREDITS ${coinSlot.credits}` : '';
  $('#play-quarters').textContent = `${wallet.quarters} × 25¢ · ${money(wallet.cents)}`;
  $('#play-coin').disabled = !coinSlot;
}
$('#play-coin').addEventListener('click', insertCoin);
const fireBtn = $('#firebtn');
fireBtn.addEventListener('pointerdown', e => { e.preventDefault(); fireBtn.setPointerCapture(e.pointerId); raid && raid.trigger(true); });
fireBtn.addEventListener('pointerup', () => raid && raid.trigger(false));
fireBtn.addEventListener('pointercancel', () => raid && raid.trigger(false));


// ---- Valley Cola: 50¢ a can, 25¢ back for recycling it
function canMesh() {
  const g = new THREE.Group();
  const label = canvasTex(256, 128, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9a0610'); gr.addColorStop(.5, '#e8202c'); gr.addColorStop(1, '#9a0610'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, h * .75); c.bezierCurveTo(w * .3, h * .55, w * .6, h * .95, w, h * .7); c.stroke();
    c.fillStyle = '#fff'; c.font = 'italic bold 38px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Valley Cola', w * .3, h * .4); c.fillText('Valley Cola', w * .8, h * .4);
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.033, .033, .1, 28, 1, true), new THREE.MeshStandardMaterial({ map: label, metalness: .55, roughness: .3 }));
  const alu = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 1, roughness: .25 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.027, .033, .012, 28), alu); top.position.y = .056;
  const bot = new THREE.Mesh(new THREE.CylinderGeometry(.033, .027, .01, 28), alu); bot.position.y = -.055;
  const tab = new THREE.Mesh(new THREE.BoxGeometry(.014, .002, .02), alu); tab.position.set(0, .063, .006);
  g.add(body, top, bot, tab); g.traverse(o => o.castShadow = true);
  return g;
}
// Point a bone's +Y axis (Mixamo bones run along +Y) at a world direction, blended by w.
const _bq1 = new THREE.Quaternion(), _bq2 = new THREE.Quaternion(), _bq3 = new THREE.Quaternion(), _bv = new THREE.Vector3();
function aimBone(bone, dir, w) {
  if (!bone || w <= 0) return;
  bone.getWorldQuaternion(_bq1);
  _bv.set(0, 1, 0).applyQuaternion(_bq1);
  _bq2.setFromUnitVectors(_bv, dir.clone().normalize()).multiply(_bq1);
  bone.parent.getWorldQuaternion(_bq3).invert();
  bone.quaternion.slerp(_bq3.multiply(_bq2), w);
  bone.updateMatrixWorld(true);
}
let canAnim = null; // { phase: 'wait' | 'drink' | 'hold' | 'toss' | 'fly', t, ... }
const canBusy = () => canAnim && canAnim.phase !== 'hold' && canAnim.phase !== 'fly';
function buySoda() {
  if (heldCan) { toast('Recycle the can you have first. The blue recycle bin is right next to the machine.'); return; }
  if (wallet.quarters >= 2) wallet.quarters -= 2;
  else if (wallet.quarters === 1 && wallet.cents >= 25) { wallet.quarters = 0; wallet.cents -= 25; }
  else if (wallet.cents >= 50) wallet.cents -= 50;
  else { toast('A soda is 50¢. You need two quarters or 50¢ in cash.'); Reg.audio.tone(110, .25, { type: 'square', vol: .15 }); return; }
  syncWallet();
  // clunk of the can dropping, then the hiss of opening it
  Reg.audio.noise(.18, { vol: .3, freq: 500 }); Reg.audio.tone(90, .15, { type: 'square', vol: .15, delay: .02 });
  Reg.audio.noise(.35, { vol: .14, freq: 7000, type: 'highpass', delay: .55 });
  heldCan = canMesh(); scene.add(heldCan);
  canAnim = { phase: 'wait', t: 0, gulps: 0 };
  popText(sodaSpot.clone().setY(1.6), '-50¢', '#ff6b6b');
}
function recycleCan() {
  if (!heldCan || !canAnim || canAnim.phase === 'fly' || canAnim.phase === 'toss') return;
  if (canBusy()) { toast('Finish your drink first.'); return; }
  canAnim = { phase: 'toss', t: 0 };
}
const BIN_MOUTH = new THREE.Vector3(5.5, .82, HALL.maxZ - .45);
function updateCan(dt) {
  if (!heldCan || !canAnim) return;
  const A = canAnim; A.t += dt;
  const B = boy.bones;
  if (!B || !B.LeftHand || !B.LeftArm || !B.LeftForeArm || !B.Head) {
    // no skeleton to animate: hold the can at chest height and run the same timings
    heldCan.position.set(boy.pos.x + Math.sin(boy.yaw) * .3, 1.0, boy.pos.z + Math.cos(boy.yaw) * .3);
    if (A.phase === 'wait' && A.t > .5) { A.phase = 'drink'; A.t = 0; }
    if (A.phase === 'drink' && A.t > 2.8) { A.phase = 'hold'; A.t = 0; }
    if (A.phase === 'toss') canAnim = { phase: 'fly', t: 0, dur: .6, from: heldCan.position.clone() };
    if (A.phase !== 'fly') return;
  }
  // safety: no pose may run forever
  if ((A.phase === 'wait' && A.t > 3) || (A.phase === 'drink' && A.t > 6)) { A.phase = 'hold'; A.t = 0; }
  if (A.phase === 'toss' && A.t > 3) { canAnim = { phase: 'fly', t: 0, dur: .6, from: heldCan.position.clone() }; return; }
  heldCan.visible = mode !== 'play';
  if (A.phase === 'fly') {
    // arc from the hand into the bin, then drop through the hole
    const k = Math.min(1, A.t / A.dur);
    heldCan.position.lerpVectors(A.from, BIN_MOUTH, k); heldCan.position.y += Math.sin(k * Math.PI) * .55 + (k >= 1 ? 0 : 0);
    heldCan.rotation.x += dt * 14; heldCan.rotation.z += dt * 5;
    if (k >= 1) {
      A.sink = (A.sink || 0) + dt; heldCan.position.y = BIN_MOUTH.y - A.sink * 1.2; heldCan.rotation.set(0, 0, 0);
      if (!A.landed) { A.landed = true; Reg.audio.noise(.25, { vol: .28, freq: 2600 }); Reg.audio.tone(1400, .08, { type: 'triangle', vol: .1, delay: .05 }); Reg.audio.tone(1900, .1, { type: 'triangle', vol: .08, delay: .11 }); }
      if (A.sink > .2) {
        scene.remove(heldCan); heldCan = null; canAnim = null;
        wallet.quarters += 1; syncWallet(); popText(BIN_MOUTH.clone().setY(1.3), '+25¢', '#ffd24a'); coinClink(1);
      }
    }
    return;
  }
  boy.root.updateMatrixWorld(true);
  const f = new THREE.Vector3(Math.sin(boy.yaw), 0, Math.cos(boy.yaw)), L = new THREE.Vector3(f.z, 0, -f.x), up = new THREE.Vector3(0, 1, 0);
  const S = B.LeftArm.getWorldPosition(new THREE.Vector3());
  let w = 0, E = null, H = null;
  if (A.phase === 'wait' && A.t > .5) { A.phase = 'drink'; A.t = 0; }
  if (A.phase === 'drink') {
    const T = 2.8; w = Math.min(1, A.t / .45, (T - A.t) / .45);
    const head = B.Head.getWorldPosition(new THREE.Vector3());
    H = head.clone().addScaledVector(f, .11).addScaledVector(up, .02);
    E = S.clone().addScaledVector(up, -.16).addScaledVector(f, .13).addScaledVector(L, .07);
    if (A.t > .7 && A.gulps < 3 && A.t > .7 + A.gulps * .5) { A.gulps++; Reg.audio.tone(115, .12, { type: 'sine', vol: .25, slideTo: 80 }); }
    if (A.t >= T) { A.phase = 'hold'; A.t = 0; toast('Ahh. Drop the empty can in the blue recycle bin for 25¢.'); }
  } else if (A.phase === 'toss') {
    // turn toward the bin, wind up, then throw
    const ty = Math.atan2(BIN_MOUTH.x - boy.pos.x, BIN_MOUTH.z - boy.pos.z); let d = ty - boy.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); boy.yaw += d * Math.min(1, dt * 10);
    const k = A.t;
    if (k < .3) { w = Math.min(1, k / .15); E = S.clone().addScaledVector(up, .02).addScaledVector(f, -.16).addScaledVector(L, .1); H = S.clone().addScaledVector(up, .26).addScaledVector(f, -.12).addScaledVector(L, .1); }
    else { w = 1; E = S.clone().addScaledVector(up, .12).addScaledVector(f, .22); H = S.clone().addScaledVector(up, .3).addScaledVector(f, .5); }
    if (k >= .42) {
      // let go
      canAnim = { phase: 'fly', t: 0, dur: .6, from: heldCan.position.clone() };
      Reg.audio.noise(.12, { vol: .08, freq: 1500, type: 'bandpass' });
      return;
    }
  }
  if (w > 0 && E && H) {
    aimBone(B.LeftArm, E.clone().sub(S), w);
    aimBone(B.LeftForeArm, H.clone().sub(B.LeftForeArm.getWorldPosition(new THREE.Vector3())), w);
  }
  // can sits in the left hand; while drinking it tips toward the mouth
  B.LeftHand.getWorldPosition(heldCan.position); B.LeftHand.getWorldQuaternion(_canQ);
  heldCan.quaternion.copy(_canQ); heldCan.translateY(.07); heldCan.translateZ(.035);
  if (A.phase === 'drink' && w > 0) {
    const tilt = new THREE.Quaternion().setFromUnitVectors(up, f.clone().multiplyScalar(-.9).add(new THREE.Vector3(0, -.45, 0)).normalize());
    heldCan.quaternion.slerp(tilt, w * .85);
  }
}
const _canQ = new THREE.Quaternion();

// ---- prize counter: a list to pick from, purchases go on the "My Prizes" shelf (saved per viewer)
let myPrizes = [];
try { myPrizes = JSON.parse(localStorage.getItem('arcade.prizes') || '[]').filter(k => CATALOG.some(c => c.key === k)); } catch (e) { }
let thumbs = null, shelfItems = [];
function placeShelf() {
  for (const o of shelfItems) scene.remove(o);
  shelfItems = [];
  // the newest 28 small prizes fill the four shelves, bottom row first; giant bears sit on the floor by the counter
  const small = myPrizes.filter(k => k !== 'bigbear').slice(-28);
  small.forEach((k, i) => {
    const o = buildPrize(k); const row = Math.floor(i / 7), col = i % 7;
    o.scale.multiplyScalar(1.4); o.position.set(-6.35 + col * .32, SHELF_Y[row], HALL.minZ + .13); o.rotation.y = (col % 2 ? -.25 : .25);
    scene.add(o); shelfItems.push(o);
  });
  const bigs = myPrizes.filter(k => k === 'bigbear').length;
  for (let i = 0; i < Math.min(bigs, 2); i++) { const o = buildPrize('bigbear'); o.position.set(-3.85, 0, HALL.minZ + .45 + i * .55); o.rotation.y = .9; scene.add(o); shelfItems.push(o); }
}
function payDollars(d) {
  const need = d * 100, have = wallet.cents + wallet.quarters * 25;
  if (have < need) return false;
  let left = need; const fromCash = Math.min(wallet.cents, left); wallet.cents -= fromCash; left -= fromCash;
  if (left > 0) wallet.quarters -= Math.ceil(left / 25);
  syncWallet(); return true;
}
function openPrizes() {
  if (!thumbs) { try { thumbs = renderThumbs(120); } catch (e) { thumbs = {}; } }
  renderPrizeList(); $('#prizes').hidden = false;
}
function renderPrizeList() {
  const list = $('#prize-list'); list.innerHTML = '';
  const have = wallet.cents + wallet.quarters * 25;
  for (const it of CATALOG) {
    const row = document.createElement('div'); row.className = 'prize';
    const owned = myPrizes.filter(k => k === it.key).length;
    const pic = document.createElement('div'); pic.className = 'pz-pic';
    if (thumbs[it.key]) { const c = document.createElement('canvas'); c.width = c.height = 120; c.getContext('2d').drawImage(thumbs[it.key], 0, 0); pic.appendChild(c); }
    const info = document.createElement('div'); info.className = 'pz-info';
    info.innerHTML = '<span class="pz-name"></span><span class="pz-kind"></span>';
    info.querySelector('.pz-name').textContent = it.name;
    info.querySelector('.pz-kind').textContent = it.kind + (owned ? ` · you have ${owned}` : '');
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pz-buy'; btn.textContent = `$${it.price}`;
    btn.disabled = have < it.price * 100; btn.title = btn.disabled ? 'Not enough money' : `Buy ${it.name}`;
    btn.addEventListener('click', () => buyPrize(it));
    row.append(pic, info, btn); list.appendChild(row);
  }
  $('#prize-wallet').textContent = `You have ${money(wallet.cents)} cash and ${wallet.quarters} quarters.`;
}
function buyPrize(it) {
  if (!payDollars(it.price)) { $('#prize-msg').textContent = `${it.name} is $${it.price}. You need more money.`; return; }
  myPrizes.push(it.key); try { localStorage.setItem('arcade.prizes', JSON.stringify(myPrizes)); } catch (e) { }
  placeShelf(); renderPrizeList();
  $('#prize-msg').textContent = `${it.name} is on your prize shelf.`;
  Reg.audio.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: .13 });
  popText(new THREE.Vector3(-5.4, 2.1, HALL.minZ + .5), `+ ${it.name}`, '#ffd02b');
}
$('#prizes-close').addEventListener('click', () => $('#prizes').hidden = true);

// ---- claw machine
function enterClaw() {
  mode = 'claw'; claw.enter(); closeMenu(); $('#prompt').hidden = true; $('#clawhud').hidden = false; idleT = 0;
  boy.pos.copy(claw.front); boy.yaw = Math.PI; setAnim('Idle');
}
function exitClaw() { claw.leave(); $('#clawhud').hidden = true; mode = 'walk'; }
function clawPay(cents) {
  // the claw takes quarters only
  const q = Math.ceil(cents / 25);
  if (wallet.quarters < q) { toast(wallet.cents >= 100 ? 'The claw takes two quarters. Get more at the change machine by the entrance.' : 'Out of money. Look around the floor for dropped cash.'); return 'nq'; }
  wallet.quarters -= q; syncWallet();
  const w = $('#wallet'); w.classList.remove('spend'); void w.offsetWidth; w.classList.add('spend');
  coinClink(2); return true;
}
function clawWin(key) {
  myPrizes.push(key); try { localStorage.setItem('arcade.prizes', JSON.stringify(myPrizes)); } catch (e) { }
  placeShelf();
  const it = CATALOG.find(c => c.key === key);
  popText(claw.front.clone().setY(2.1), `You won ${it ? it.name : 'a prize'}!`, '#ffd02b');
  toast(`You won ${it ? 'a ' + it.name : 'a prize'}! It’s on your prize shelf.`);
}
$('#claw-pay').addEventListener('click', () => claw && claw.pay());
$('#claw-drop').addEventListener('click', () => claw && claw.drop());
$('#claw-leave').addEventListener('click', exitClaw);


// floating "+$5" labels
const pops = [];
function popText(pos, text, color) {
  const el = document.createElement('div'); el.className = 'pop'; el.textContent = text; el.style.color = color;
  $('#pops').appendChild(el); pops.push({ el, pos: pos.clone(), t: 0 });
}
// dropped money on the carpet
const pickups = [];
const glintTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.2, 'rgba(255,250,200,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 2); g.lineTo(32, 62); g.moveTo(2, 32); g.lineTo(62, 32); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
function billTex(d) {
  return canvasTex(256, 110, (g, w, h) => {
    g.fillStyle = '#cfd8c0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2f5a3a'; g.lineWidth = 5; g.strokeRect(6, 6, w - 12, h - 12); g.lineWidth = 1.5; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#7d9c78'; g.beginPath(); g.ellipse(w / 2, h / 2, 30, 36, 0, 0, 6.28); g.fill();
    g.fillStyle = '#3f6247'; g.beginPath(); g.ellipse(w / 2, h / 2 - 4, 14, 18, 0, 0, 6.28); g.fill(); g.fillRect(w / 2 - 18, h / 2 + 12, 36, 18);
    g.fillStyle = '#2f5a3a'; g.font = 'bold 30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(d, 34, 32); g.fillText(d, w - 34, h - 30); g.font = 'bold 11px Georgia, serif'; g.fillText('THE UNITED STATES OF AMERICA', w / 2, 20);
  });
}
function spawnMoney(kind, x, z) {
  const g = new THREE.Group(); let value = 0, quarters = 0;
  if (kind === 'q') {
    const mat = new THREE.MeshStandardMaterial({ color: 0xd6d9de, metalness: 1, roughness: .28 });
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.024, .024, .004, 24), mat); c.position.set((Math.random() - .5) * .14, .003 + i * .001, (Math.random() - .5) * .14); c.rotation.set((Math.random() - .5) * .2, 0, (Math.random() - .5) * .2); c.castShadow = true; g.add(c); }
    quarters = 4;
  } else {
    const d = kind === '5' ? 5 : 1; value = d * 100;
    const geo = new THREE.PlaneGeometry(.31, .133, 8, 4); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 18) * .006 + Math.cos(p.getY(i) * 30) * .004);
    geo.computeVertexNormals();
    const bill = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: billTex(d), roughness: .85, side: THREE.DoubleSide }));
    bill.rotation.x = -Math.PI / 2; bill.rotation.z = Math.random() * 6; bill.position.y = .01; bill.castShadow = true; g.add(bill);
  }
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff6c0 }));
  glint.position.y = .06; glint.scale.setScalar(.25); g.add(glint);
  g.position.set(x, 0, z); scene.add(g);
  pickups.push({ g, glint, value, quarters, t: Math.random() * 5 });
}
function openSpot() {
  for (let k = 0; k < 30; k++) {
    const x = (Math.random() - .5) * 10, z = -1.5 - Math.random() * 12.5;
    if (Math.hypot(x - boy.pos.x, z - boy.pos.z) > 2.5 && !(Math.abs(x) < 1 && z < -7 && z > -9.4)) return [x, z];
  }
  return [0, -8];
}
function seedFloorMoney() { for (const k of ['1', 'q']) spawnMoney(k, ...openSpot()); }
let moneyT = 120;
function updateMoney(dt) {
  for (const p of pickups) {
    p.t += dt; p.glint.material.opacity = .35 + Math.max(0, Math.sin(p.t * 3)) * .65; p.glint.scale.setScalar(.18 + Math.max(0, Math.sin(p.t * 3)) * .14);
    if (mode === 'walk' || mode === 'auto') {
      if (Math.hypot(boy.pos.x - p.g.position.x, boy.pos.z - p.g.position.z) < .5) {
        p.taken = true; scene.remove(p.g);
        wallet.cents += p.value; wallet.quarters += p.quarters; syncWallet();
        const at = p.g.position.clone(); at.y = 1.5;
        popText(at, p.value ? '+' + money(p.value) : '+4 quarters', '#ffd24a');
        if (p.quarters) coinClink(4); else Reg.audio.melody([[1318, .06], [1760, .12]], { type: 'square', vol: .12 });
      }
    }
  }
  for (let i = pickups.length - 1; i >= 0; i--) if (pickups[i].taken) pickups.splice(i, 1);
  // broke? drop some money where he can find it; otherwise the odd bill turns up now and then
  if (mode === 'walk' && wallet.cents < 100 && wallet.quarters === 0 && pickups.length === 0) {
    spawnMoney('5', ...openSpot()); spawnMoney('1', ...openSpot()); spawnMoney('q', ...openSpot());
    toast('Out of money? Someone dropped cash on the floor. Look for the sparkles.');
  }
  moneyT -= dt;
  if (moneyT <= 0) { moneyT = 150 + Math.random() * 90; if (pickups.length < 3) spawnMoney(Math.random() < .3 ? '5' : Math.random() < .5 ? '1' : 'q', ...openSpot()); }
  // floating labels
  for (const p of pops) {
    p.t += dt; p.pos.y += dt * .5;
    const v = p.pos.clone().project(camera);
    p.el.style.transform = `translate(${(v.x * .5 + .5) * innerWidth}px, ${(-v.y * .5 + .5) * innerHeight}px) translate(-50%, -50%)`;
    p.el.style.opacity = String(Math.max(0, 1 - p.t / 1.6)); p.el.hidden = v.z > 1 || mode === 'play';
    if (p.t > 1.6) p.el.remove();
  }
  for (let i = pops.length - 1; i >= 0; i--) if (pops[i].t > 1.6) pops.splice(i, 1);
}

// ---------------------------------------------------------------- boot
async function boot() {
  const bar = $('#load-bar'), label = $('#load-label');
  const prog = [0, 0];
  const setP = (i, v) => { prog[i] = v; const p = (prog[0] + prog[1]) / 2; bar.style.width = (15 + p * 75) + '%'; };
  label.textContent = 'Loading fonts';
  try { await Promise.race([Promise.all(['Bungee', 'Press Start 2P', 'Monoton'].map(f => document.fonts.load(`40px "${f}"`))), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
  bar.style.width = '10%';
  label.textContent = 'Building the arcade';
  await new Promise(r => setTimeout(r, 30));
  buildHall(); placeCabinets(); batchCabinets();
  claw = createClaw({ scene, position: new THREE.Vector3(0, 0, -8.2), buildPrize, audio: Reg.audio, keys, pay: c => clawPay(c), onWin: k => clawWin(k), toast });
  solids.push(claw.root); colliders.push({ minX: -.56, maxX: .56, minZ: -8.76, maxZ: -7.45 });
  proxySolids(); buildMenu();
  bar.style.width = '15%';
  label.textContent = 'Getting dressed';
  try { await loadBoy(setP); } catch (e) {
    console.error(e);
    const t = $('#toast'); t.textContent = `The character didn’t load (${String(e && e.message || e).slice(0, 140)}). Reload the page to try again.`; t.hidden = false;
    setTimeout(() => t.hidden = true, 12000);
  }
  boy.pos.set(0, 0, HALL.maxZ + 4.2); boy.yaw = Math.PI;
  raid = createRaid({ scene, camera, boy, HALL, collide, solids, audio: Reg.audio, toast, popText, addCash, soldier: boy.soldier, soldierYaw: Math.PI, boyBones: boy.bones,
    onRaidEnd: () => { idleT = 0; } });
  syncWallet(); seedFloorMoney(); placeShelf();
  syncSettingsUI(); applySettings();
  bar.style.width = '100%'; label.textContent = 'Ready';
  $('#loader').classList.add('ready');
  tick();
}
$('#enter').addEventListener('click', () => {
  Reg.audio.unlock(); music.start();
  $('#title').classList.add('gone'); setTimeout(() => $('#title').hidden = true, 600);
  mode = 'intro'; introT = 0; orbit.yaw = 0; orbit.pitch = .22; orbit.dist = 3.2;
  Reg.audio.melody([[523, .09], [659, .09], [784, .09], [1047, .2]], { type: 'square', vol: .12 });
});
window.__cam = camera.position;
window.__renderer = renderer;
window.__arcade = { get claw() { return claw; }, cabinets, boy, startPlay, walkTo, orbit, interact, wallet, get raid() { return raid; }, get mode() { return mode; }, startRaid: () => raid && raid.start(), get pickups() { return pickups; }, get canPhase() { return canAnim ? canAnim.phase : null; }, get canT() { return canAnim ? canAnim.t : 0; } };
boot();
