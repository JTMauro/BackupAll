// MAME32 Game Room \u2014 a house at the end of the street, a game room in the back, and a PC running MAME32.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { createPC } from './pc.js';
import { createMusic } from './music.js';
import { createArcade } from './arcade.js';
import { createTVShow } from './tvshow.js';
import { retarget, gestures } from './teen-anim.js';

const $ = s => document.querySelector(s);
const Reg = window.ArcadeRegistry;

// ---------------------------------------------------------------- settings
const settings = { quality: 'high', time: 'day', sound: true, music: true };
try { Object.assign(settings, JSON.parse(localStorage.getItem('gameroom.settings') || '{}')); } catch (e) { }
function saveSettings() { try { localStorage.setItem('gameroom.settings', JSON.stringify(settings)); } catch (e) { } }

// ---------------------------------------------------------------- renderer
const canvas3d = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 3000);
const composer = new EffectComposer(renderer);
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.4, 0.98);
composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(new OutputPass());

function resize() {
  const w = innerWidth, h = innerHeight;
  const pr = Math.min(devicePixelRatio || 1, 2) * (settings.quality === 'high' ? 1 : .65);
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  composer.setPixelRatio(pr); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---------------------------------------------------------------- procedural textures
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
function speckle(g, w, h, seed, n, a) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { g.fillStyle = r() < .5 ? `rgba(255,255,255,${r() * a})` : `rgba(0,0,0,${r() * a})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
}
const TEX = {
  grass: () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#4c6b2c'; g.fillRect(0, 0, w, h);
    const r = rng(3);
    for (let i = 0; i < 26000; i++) {
      const x = r() * w, y = r() * h, l = 22 + r() * 22;
      g.strokeStyle = `hsl(${78 + r() * 26}, ${35 + r() * 25}%, ${l}%)`; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 3, y - 3 - r() * 5); g.stroke();
    }
  }, { repeat: [60, 60] }),
  concrete: () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#9b968c'; g.fillRect(0, 0, w, h); speckle(g, w, h, 5, 30000, .12);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; for (let y = 0; y <= h; y += 256) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }, { repeat: [1, 4] }),
  asphalt: () => canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#2f3032'; g.fillRect(0, 0, w, h); speckle(g, w, h, 8, 50000, .18); }, { repeat: [40, 2] }),
  siding: () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#c9cfd2'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { const gr = g.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, 'rgba(0,0,0,.22)'); gr.addColorStop(.12, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(0,0,0,.04)'); g.fillStyle = gr; g.fillRect(0, y, w, 32); }
    speckle(g, w, h, 9, 8000, .05);
  }, { repeat: [6, 2] }),
  shingles: () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#3b3633'; g.fillRect(0, 0, w, h);
    const r = rng(12);
    for (let y = 0; y < h; y += 24) for (let x = -((y / 24) % 2) * 24; x < w; x += 48) {
      const l = 16 + r() * 10; g.fillStyle = `hsl(20, 6%, ${l}%)`; g.fillRect(x + 1, y + 1, 46, 22);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + 21, 48, 3);
    }
    speckle(g, w, h, 13, 20000, .15);
  }, { repeat: [8, 4] }),
  brick: () => canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#8d8a84'; g.fillRect(0, 0, w, h);
    const r = rng(14);
    for (let y = 0; y < h; y += 32) for (let x = -((y / 32) % 2) * 32; x < w; x += 64) { g.fillStyle = `hsl(${10 + r() * 10}, ${35 + r() * 15}%, ${30 + r() * 10}%)`; g.fillRect(x + 2, y + 2, 60, 28); }
    speckle(g, w, h, 15, 9000, .15);
  }, { repeat: [4, 1] }),
  woodFloor: () => canvasTex(1024, 1024, (g, w, h) => {
    const r = rng(21);
    for (let y = 0; y < h; y += 64) for (let x = -r() * 400, len = 0; x < w; x += len) {
      len = 400 + r() * 300; const hue = 26 + r() * 8, l = 36 + r() * 12;
      g.fillStyle = `hsl(${hue}, 42%, ${l}%)`; g.fillRect(x, y, len, 64);
      for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(60,30,10,${.08 + r() * .12})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const yy = y + r() * 64; g.moveTo(x, yy); g.bezierCurveTo(x + len * .3, yy + (r() - .5) * 10, x + len * .6, yy + (r() - .5) * 10, x + len, yy + (r() - .5) * 6); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x, y, 2, 64); g.fillRect(x, y, len, 2);
    }
  }, { repeat: [3, 3] }),
  tile: () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8f8a82'; g.fillRect(0, 0, w, h);
    const r = rng(31);
    for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) { const l = 80 + r() * 8; g.fillStyle = `hsl(40, 12%, ${l}%)`; g.fillRect(x + 3, y + 3, 122, 122); }
    speckle(g, w, h, 32, 12000, .06);
  }, { repeat: [5, 5] }),
  carpet: () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#23202e'; g.fillRect(0, 0, w, h); speckle(g, w, h, 41, 90000, .16);
  }, { repeat: [5, 5] }),
  paint: (hex, seed) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = hex; g.fillRect(0, 0, w, h); speckle(g, w, h, seed, 9000, .035); }, { repeat: [4, 2] }),
  arcadeRug: () => canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#121022'; g.fillRect(0, 0, w, h);
    const r = rng(51), cols = ['#ff3be0', '#38f4ff', '#ffd24a', '#7cff5b'];
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = cols[i % 4]; g.lineWidth = 4; const x = r() * w, y = r() * h, s = 14 + r() * 26;
      g.save(); g.translate(x, y); g.rotate(r() * 6.28);
      if (i % 3 === 0) { g.beginPath(); g.arc(0, 0, s / 2, 0, 6.28); g.stroke(); }
      else if (i % 3 === 1) { g.beginPath(); g.moveTo(-s / 2, s / 2); g.lineTo(0, -s / 2); g.lineTo(s / 2, s / 2); g.closePath(); g.stroke(); }
      else { g.beginPath(); g.moveTo(-s / 2, 0); g.lineTo(-s / 4, -s / 3); g.lineTo(0, 0); g.lineTo(s / 4, -s / 3); g.lineTo(s / 2, 0); g.stroke(); }
      g.restore();
    }
    speckle(g, w, h, 52, 60000, .12);
  })
};
const M = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .7, metalness: 0 }, o));
const MAT = {
  grass: M(0xffffff, { map: TEX.grass(), roughness: .95 }),
  concrete: M(0xffffff, { map: TEX.concrete(), roughness: .9 }),
  asphalt: M(0xffffff, { map: TEX.asphalt(), roughness: .85 }),
  siding: M(0xffffff, { map: TEX.siding(), roughness: .75 }),
  shingles: M(0xffffff, { map: TEX.shingles(), roughness: .9 }),
  brick: M(0xffffff, { map: TEX.brick(), roughness: .9 }),
  trim: M(0xf2f0ea, { roughness: .5 }),
  wood: M(0xffffff, { map: TEX.woodFloor(), roughness: .55 }),
  tile: M(0xffffff, { map: TEX.tile(), roughness: .35 }),
  carpet: M(0xffffff, { map: TEX.carpet(), roughness: 1 }),
  livingWall: M(0xffffff, { map: TEX.paint('#d8cdb8', 61), roughness: .9 }),
  kitchenWall: M(0xffffff, { map: TEX.paint('#dfe3d6', 62), roughness: .9 }),
  gameWall: M(0xffffff, { map: TEX.paint('#2a2440', 63), roughness: .9 }),
  bedWall: M(0xffffff, { map: TEX.paint('#c9d3dc', 64), roughness: .9 }),
  ceiling: M(0xf4f2ee, { roughness: 1 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x9fb8c8, roughness: .05, metalness: 0, transmission: 0, transparent: true, opacity: .28, envMapIntensity: 1.5 }),
  dark: M(0x1d1d22, { roughness: .5 }),
  black: M(0x0b0b0d, { roughness: .4 }),
  steel: M(0xb8bcc2, { roughness: .3, metalness: .9 }),
  beige: M(0xd9d0bb, { roughness: .55 }),
  walnut: M(0x5a3a24, { roughness: .5 }),
  oak: M(0xa0794c, { roughness: .55 }),
  white: M(0xf0f0ee, { roughness: .45 }),
  fabric: M(0x55606e, { roughness: 1 }),
  leaf: M(0x355e2a, { roughness: .9 }),
  bark: M(0x4a3626, { roughness: 1 })
};

// ---------------------------------------------------------------- outdoors: sky, sun, moon, clouds
const sky = new Sky(); sky.scale.setScalar(2500); scene.add(sky);
const skyU = sky.material.uniforms;
const sunDir = new THREE.Vector3();
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 90 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = .03;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x4a5a33, .6); scene.add(hemi);

// sun / moon discs (the Sky shader draws its own sun; the moon is a lit sphere)
const moon = new THREE.Mesh(new THREE.SphereGeometry(28, 32, 16), new THREE.MeshBasicMaterial({ color: 0xf2efe4, fog: false,
  map: canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#e8e4d8'; g.fillRect(0, 0, w, h); const r = rng(77); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(90,90,100,${.1 + r() * .25})`; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 12, 0, 6.28); g.fill(); } }) }));
scene.add(moon);
// stars
const stars = (() => {
  const n = 2500, p = new Float32Array(n * 3), c = new Float32Array(n * 3), r = rng(99);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, th = r() * 6.283, y = Math.abs(u) * .98 + .02, s = Math.sqrt(1 - y * y);
    p.set([Math.cos(th) * s * 2000, y * 2000, Math.sin(th) * s * 2000], i * 3);
    const b = .5 + r() * .5, warm = r(); c.set([b, b * (.9 + warm * .1), b * (.85 + (1 - warm) * .15)], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const m = new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false });
  const pts = new THREE.Points(g, m); scene.add(pts); return pts;
})();
// clouds: a dome shader that ray-casts each pixel onto a cloud layer and shades fbm noise with the sun
const clouds = new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
  uniforms: { uTime: { value: 0 }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 1, 1) }, uAmb: { value: new THREE.Color(.6, .65, .75) }, uCover: { value: .48 }, uNight: { value: 0 } },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    varying vec3 vDir; uniform float uTime, uCover, uNight; uniform vec3 uSun, uSunCol, uAmb;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
    float fbm(vec2 p){ float v=0., a=.5; mat2 r=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<6;i++){ v+=a*noise(p); p=r*p; a*=.5; } return v; }
    float dens(vec2 p){ float d = fbm(p + vec2(uTime*.012, uTime*.004)); d += .35*fbm(p*2.7 - vec2(uTime*.02,0.)); return smoothstep(uCover, uCover+.38, d*.78); }
    void main(){
      vec3 d = normalize(vDir);
      if (d.y < 0.015) discard;
      vec2 p = d.xz / (d.y + .08) * 1.15;
      float c = dens(p);
      if (c < .01) discard;
      // light: sample density toward the sun to fake self-shadowing
      vec2 toSun = normalize(uSun.xz + 1e-4) * .18;
      float sh = dens(p + toSun) * .7 + dens(p + toSun*2.) * .3;
      float lit = clamp(1. - sh*.85, 0., 1.);
      float silver = pow(max(dot(d, uSun), 0.), 8.) * .8;
      vec3 col = uAmb * (.55 + .25*(1.-c)) + uSunCol * (lit*.75 + silver);
      col = mix(col, uAmb*.5, uNight*.6);
      float horizon = smoothstep(.015, .22, d.y);
      gl_FragColor = vec4(col, c * horizon * .95);
    }`
}));
clouds.renderOrder = -1; scene.add(clouds);

const TIMES = {
  day: { elev: 52, az: 215, turb: 4, ray: 1.2, exp: .55, sunI: 3.4, hemiI: .9, cover: .5, label: 'Day' },
  sunset: { elev: 4, az: 255, turb: 9, ray: 3, exp: .6, sunI: 2.2, hemiI: .45, cover: .52, label: 'Sunset' },
  night: { elev: -18, az: 120, turb: 2, ray: .5, exp: .62, sunI: 0, hemiI: .12, cover: .56, label: 'Night' }
};
const indoorLights = []; // {light, day, night}
let hemiBase = .6, envBase = .2;
function applyTime() {
  const T = TIMES[settings.time] || TIMES.day;
  const phi = THREE.MathUtils.degToRad(90 - T.elev), th = THREE.MathUtils.degToRad(T.az);
  sunDir.setFromSphericalCoords(1, phi, th);
  skyU.sunPosition.value.copy(sunDir);
  skyU.turbidity.value = T.turb; skyU.rayleigh.value = T.ray; skyU.mieCoefficient.value = .005; skyU.mieDirectionalG.value = .8;
  renderer.toneMappingExposure = T.exp;
  const night = settings.time === 'night';
  sky.visible = !night;
  scene.background = night ? new THREE.Color(0x060a16) : null;
  stars.visible = night; moon.visible = night;
  const moonDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 38), THREE.MathUtils.degToRad(160));
  moon.position.copy(moonDir).multiplyScalar(1500);
  const lightDir = night ? moonDir : sunDir;
  sun.position.copy(lightDir).multiplyScalar(60); sun.target.position.set(0, 0, -6);
  sun.intensity = night ? .55 : T.sunI;
  const sc = new THREE.Color().setRGB(1, 1, 1);
  if (settings.time === 'sunset') sc.setRGB(1, .62, .38);
  if (night) sc.setRGB(.55, .65, .95);
  sun.color.copy(sc);
  hemi.intensity = hemiBase = T.hemiI;
  hemi.color.set(night ? 0x2a3a66 : settings.time === 'sunset' ? 0xffb38a : 0xbfd8ff);
  hemi.groundColor.set(night ? 0x0b0f14 : 0x4a5a33);
  const cu = clouds.material.uniforms;
  cu.uSun.value.copy(lightDir); cu.uCover.value = T.cover; cu.uNight.value = night ? 1 : 0;
  cu.uSunCol.value.copy(night ? new THREE.Color(.25, .3, .42) : settings.time === 'sunset' ? new THREE.Color(1.25, .62, .38) : new THREE.Color(1.15, 1.1, 1.02));
  cu.uAmb.value.copy(night ? new THREE.Color(.05, .07, .12) : settings.time === 'sunset' ? new THREE.Color(.55, .45, .55) : new THREE.Color(.62, .7, .82));
  scene.fog = new THREE.Fog(night ? 0x0a0f1c : settings.time === 'sunset' ? 0xc89a86 : 0xb9cde0, 60, 420);
  for (const L of indoorLights) L.light.intensity = night ? L.night : L.day;
  porchLight.intensity = night ? 6 : settings.time === 'sunset' ? 2 : 0;
  // reflections: bake the current sky into an environment map
  envFromSky(night);
  $('#btn-time').textContent = T.label;
}
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;
function envFromSky(night) {
  const s = new THREE.Scene();
  if (night) s.background = new THREE.Color(0x0a1020);
  else { const k = new Sky(); k.scale.setScalar(100); Object.keys(skyU).forEach(key => k.material.uniforms[key].value = skyU[key].value); k.material.uniforms.sunPosition.value = sunDir.clone().setY(Math.min(sunDir.y, .3)); s.add(k); }
  if (envRT) envRT.dispose();
  envRT = pmrem.fromScene(s, 0, .1, 200);
  scene.environment = envRT.texture;
  scene.environmentIntensity = envBase = night ? .15 : .22;
}

// ---------------------------------------------------------------- the house
// Interior: x -6..6, z -12..0, ceiling 2.7. Front door on z=0. Living room (west) and kitchen (east) in front,
// game room (back west) and a bedroom (back east, door closed) behind the z=-6 wall.
const H = { minX: -6, maxX: 6, minZ: -12, maxZ: 0, h: 2.7, t: .2 };
// Upstairs: floor at F2, ceiling at TOP2. The stairs climb north along the east wall of the back hall.
const F2 = 2.9, TOP2 = 5.5;
const STAIR = { x0: 4.86, x1: 5.9, z0: -6.6, z1: -11.1 };
function floorY(p, y) {
  if (p.x > STAIR.x0 && p.x < STAIR.x1 && p.z < STAIR.z0 && p.z > STAIR.z1) return (STAIR.z0 - p.z) / (STAIR.z0 - STAIR.z1) * F2;
  return y > F2 / 2 ? F2 : 0;
}
const lvlOf = y => y > F2 / 2 ? 1 : 0;
const colliders = [];   // {minX,maxX,minZ,maxZ}
const camBlockers = []; // meshes the follow camera may not pass through
const clickables = [];  // meshes that send him to the computer
function box(w, h, d, mat, x, y, z, o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = o.cast !== false; m.receiveShadow = true;
  (o.parent || scene).add(m);
  if (o.collide) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, lvl: o.lvl || 0 });
  if (o.block) camBlockers.push(m);
  return m;
}
// a straight wall along X (at z) or Z (at x) with openings {a, b, bottom, top}; mats: [negative side, positive side]
function wall(axis, at, from, to, negMat, posMat, openings = [], h = H.h, t = H.t, base = 0) {
  const lvl = base > 1 ? 1 : 0;
  const segs = []; let cur = from;
  const ops = openings.slice().sort((p, q) => p.a - q.a);
  for (const o of ops) { if (o.a > cur) segs.push([cur, o.a, 0, h]); if (o.bottom > 0) segs.push([o.a, o.b, 0, o.bottom]); if (o.top < h) segs.push([o.a, o.b, o.top, h]); cur = o.b; }
  if (cur < to) segs.push([cur, to, 0, h]);
  for (const [a, b, y0, y1] of segs) {
    const len = b - a, mid = (a + b) / 2, hh = y1 - y0;
    // face order: +x, -x, +y, -y, +z, -z
    const mats = axis === 'x' ? [posMat, posMat, posMat, posMat, posMat, negMat] : [posMat, negMat, posMat, posMat, posMat, posMat];
    const m = axis === 'x' ? new THREE.Mesh(new THREE.BoxGeometry(len, hh, t), mats) : new THREE.Mesh(new THREE.BoxGeometry(t, hh, len), mats);
    if (axis === 'x') m.position.set(mid, base + y0 + hh / 2, at); else m.position.set(at, base + y0 + hh / 2, mid);
    m.castShadow = m.receiveShadow = true; scene.add(m); camBlockers.push(m);
    if (y0 < 1.2) colliders.push(axis === 'x' ? { minX: a, maxX: b, minZ: at - t / 2, maxZ: at + t / 2, lvl } : { minX: at - t / 2, maxX: at + t / 2, minZ: a, maxZ: b, lvl });
  }
}
function windowPane(axis, at, a, b, bottom, top, outward) {
  const w = b - a, hgt = top - bottom, mid = (a + b) / 2;
  const g = new THREE.Group();
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), MAT.glass); g.add(pane);
  const fr = .05;
  for (const [x, y, ww, hh] of [[0, hgt / 2, w + fr, fr], [0, -hgt / 2, w + fr, fr], [-w / 2, 0, fr, hgt], [w / 2, 0, fr, hgt], [0, 0, fr * .6, hgt], [0, 0, w, fr * .6]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, .08), MAT.trim); m.position.set(x, y, 0); m.castShadow = true; g.add(m);
  }
  // sill
  const sill = new THREE.Mesh(new THREE.BoxGeometry(w + .2, .05, .3), MAT.trim); sill.position.set(0, -hgt / 2 - .03, 0); g.add(sill);
  if (axis === 'x') { g.position.set(mid, (bottom + top) / 2, at); if (outward < 0) g.rotation.y = Math.PI; }
  else { g.position.set(at, (bottom + top) / 2, mid); g.rotation.y = outward > 0 ? Math.PI / 2 : -Math.PI / 2; }
  scene.add(g);
  return g;
}
// ---------------------------------------------------------------- outdoor detail: leafy trees, a real car, house trim
// Foliage is built from alpha-cut leaf cards (instanced), so crowns read as leaves rather than blobs.
const LEAF = (() => {
  const tex = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); const r = rng(77);
    for (let i = 0; i < 140; i++) {
      const x = 20 + r() * (w - 40), y = 20 + r() * (h - 40), a = r() * 6.28, l = 18 + r() * 22;
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = `hsl(${88 + r() * 30}, ${38 + r() * 25}%, ${l}%)`;
      g.beginPath(); g.ellipse(0, 0, 13 + r() * 6, 6 + r() * 3, 0, 0, 6.283); g.fill();
      g.strokeStyle = `hsla(90, 30%, ${l + 12}%, .5)`; g.lineWidth = 1; g.beginPath(); g.moveTo(-12, 0); g.lineTo(12, 0); g.stroke();
      g.restore();
    }
  });
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: .45, side: THREE.DoubleSide, roughness: .85 });
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: .45 });
  const geo = new THREE.PlaneGeometry(1, 1);
  return { mat, depth, geo };
})();
// a crown of leaf cards filling an ellipsoid
function foliage(cx, cy, cz, rx, ry, rz, n, size, seed, hue = 0) {
  const im = new THREE.InstancedMesh(LEAF.geo, LEAF.mat, n);
  im.castShadow = true; im.receiveShadow = true; im.customDepthMaterial = LEAF.depth;
  const r = rng(seed), o = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    let x, y, z; do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1; } while (x * x + y * y + z * z > 1);
    const k = .55 + .45 * Math.cbrt(r()); // favour the outer shell
    o.position.set(cx + x * rx * k, cy + y * ry * k, cz + z * rz * k);
    o.rotation.set(r() * 6.28, r() * 6.28, r() * 6.28); o.scale.setScalar(size * (.7 + r() * .6)); o.updateMatrix();
    im.setMatrixAt(i, o.matrix);
    const l = .75 + r() * .35 + y * .12; c.setRGB(l * (1 + hue), l, l * (1 - hue * .5)); im.setColorAt(i, c);
  }
  scene.add(im); return im;
}
const BARK = M(0xffffff, { map: canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#4a3a2c'; g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(${r() < .5 ? '20,14,8' : '120,104,88'},${.2 + r() * .4})`; g.lineWidth = 1 + r() * 3; const x = r() * w; g.beginPath(); g.moveTo(x, r() * h); g.lineTo(x + (r() - .5) * 6, r() * h); g.stroke(); } }, { repeat: [2, 1] }), roughness: 1 });
function realTree(x, z, s) {
  const r = rng(Math.floor(x * 13 + z * 7 + 99));
  const t = new THREE.Group(); t.position.set(x, 0, z); scene.add(t);
  const H = 2.6 * s, lean = (r() - .5) * .08;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.13 * s, .26 * s, H, 12), BARK); trunk.position.y = H / 2; trunk.rotation.z = lean; trunk.castShadow = true; t.add(trunk);
  const flare = new THREE.Mesh(new THREE.CylinderGeometry(.26 * s, .38 * s, .3 * s, 12), BARK); flare.position.y = .15 * s; t.add(flare);
  const tops = [];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * 6.28 + r(), up = .5 + r() * .5, len = (1.1 + r() * .8) * s;
    const dir = new THREE.Vector3(Math.cos(a) * (1 - up * .6), up, Math.sin(a) * (1 - up * .6)).normalize();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.04 * s, .1 * s, len, 7), BARK);
    const base = new THREE.Vector3(0, H * (.75 + r() * .2), 0);
    b.position.copy(base).addScaledVector(dir, len / 2); b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); b.castShadow = true; t.add(b);
    tops.push(base.clone().addScaledVector(dir, len));
  }
  const cy = H + 1.1 * s;
  foliage(x, cy, z, 1.9 * s, 1.5 * s, 1.9 * s, Math.round(220 * s), 1.25 * s, Math.floor(x * 7 + z), (r() - .5) * .15);
  for (const p of tops) foliage(x + p.x, p.y + .3 * s, z + p.z, .9 * s, .7 * s, .9 * s, Math.round(40 * s), 1.0 * s, Math.floor(p.x * 100 + p.z * 31));
  colliders.push({ minX: x - .3 * s, maxX: x + .3 * s, minZ: z - .3 * s, maxZ: z + .3 * s });
}
function bush(x, y, z, s, seed) { foliage(x, y + .38 * s, z, .55 * s, .42 * s, .5 * s, 34, .55 * s, seed, -.05); }

// a sedan: extruded side profile with wheel arches, glass house, wheels, lights, bumpers
let carRef = null;
function smashCar() {
  const C = carRef; if (!C || C.smashed) return;
  C.smashed = true; C.t = 0;
  const cracked = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#1a242c'; g.fillRect(0, 0, w, h); const r = rng(4); g.strokeStyle = 'rgba(230,240,245,.75)'; g.lineWidth = 1.2;
    for (const [cx, cy] of [[90, 50], [170, 70]]) for (let i = 0; i < 16; i++) { let x = cx, y = cy, a = r() * 6.28; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { a += (r() - .5) * .8; x += Math.cos(a) * 12; y += Math.sin(a) * 12; g.lineTo(x, y); } g.stroke(); } });
  C.glassMesh.material = new THREE.MeshStandardMaterial({ map: cracked, roughness: .3, metalness: .2 });
  C.lights.forEach(l => { l.material = l.material.clone(); l.material.emissiveIntensity = 0; });
  // cave the roof in where the barrel landed (car-local: y up, length along z, roof centre near z = -0.2)
  for (const mesh of [C.body, C.glassMesh]) {
    const g = mesh.geometry = mesh.geometry.clone(), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i); if (y < .7) continue;
      const d = Math.pow(Math.max(0, 1 - Math.hypot((p.getZ(i) + .25) / 1.25, p.getX(i) / 1.6)), .6);
      p.setY(i, .7 + (y - .7) * (1 - .95 * d));                           // a crater where the barrel hit
      p.setX(i, p.getX(i) * (1 + .14 * d * Math.min(1, (y - .7) / .4)));  // the sides bulge out
    }
    p.needsUpdate = true; g.computeVertexNormals();
  }
  // shattered glass on the driveway and steam hissing out of the hood
  const shard = new THREE.MeshStandardMaterial({ color: 0xd8eef8, roughness: .05, metalness: .4, transparent: true, opacity: .85, side: THREE.DoubleSide });
  const r = rng(17), cp = C.car.position;
  for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(.03 + r() * .05, 3), shard); m.rotation.set(-Math.PI / 2, 0, r() * 6.28); const a = r() * 6.28, d = 1.0 + r() * 1.6; m.position.set(cp.x + Math.cos(a) * d, .028, cp.z + Math.sin(a) * d * 1.4); scene.add(m); }
  C.steam = steamPuffs(cp.x, .9, cp.z + 1.7); C.steam.set(true);
  sfx.crash(); sfx.alarm(6);
}
function tickCar(dt) {
  const C = carRef; if (!C || !C.smashed) return;
  if (C.steam) C.steam.tick(dt);
  if (C.t > 1) return;
  C.t += dt; const k = Math.min(1, C.t / .18);
  C.car.scale.set(1 + .07 * k, 1 - .22 * k, 1 - .03 * k);              // squashed and splayed out
  C.car.rotation.set(-.06 * k, 0, .09 * k);                            // sagging on a burst tyre
  C.car.position.y = -.02 * k + (C.t < .3 ? Math.sin(C.t / .3 * Math.PI) * -.06 : 0);
}
function buildCar(cx, cz) {
  const car = new THREE.Group(); car.position.set(cx, 0, cz); scene.add(car);
  const W = 1.74;
  const prof = new THREE.Shape();
  prof.moveTo(-2.3, .32); prof.lineTo(-2.36, .62); prof.quadraticCurveTo(-2.36, .86, -2.15, .9); prof.lineTo(-1.32, .97);
  prof.quadraticCurveTo(-1.05, 1.36, -.82, 1.42); prof.lineTo(.3, 1.44); prof.quadraticCurveTo(.55, 1.42, 1.02, 1.0);
  prof.lineTo(2.05, .86); prof.quadraticCurveTo(2.36, .8, 2.38, .6); prof.lineTo(2.32, .32); prof.lineTo(1.85, .32);
  prof.absarc(1.42, .32, .43, 0, Math.PI, false); prof.lineTo(-.99, .32); prof.absarc(-1.42, .32, .43, 0, Math.PI, false); prof.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(prof, { depth: W - .12, bevelEnabled: true, bevelThickness: .06, bevelSize: .05, bevelSegments: 3, curveSegments: 16 });
  bodyGeo.translate(0, 0, -(W - .12) / 2); bodyGeo.rotateY(-Math.PI / 2);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x7a1218, roughness: .28, metalness: .55, clearcoat: 1, clearcoatRoughness: .08 });
  const body = new THREE.Mesh(bodyGeo, paint); body.castShadow = body.receiveShadow = true; car.add(body);
  // glass: the same cabin outline, a hair wider than the body so it shows on the sides
  const gl = new THREE.Shape(); gl.moveTo(-1.26, 1.0); gl.quadraticCurveTo(-1.02, 1.33, -.8, 1.385); gl.lineTo(.28, 1.4); gl.quadraticCurveTo(.5, 1.38, .96, 1.02); gl.closePath();
  const glGeo = new THREE.ExtrudeGeometry(gl, { depth: W + .005, bevelEnabled: false, curveSegments: 12 }); glGeo.translate(0, 0, -(W + .005) / 2); glGeo.rotateY(-Math.PI / 2);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x15202a, roughness: .05, metalness: .3, clearcoat: 1, envMapIntensity: 1.6 });
  const glassMesh = new THREE.Mesh(glGeo, glass); car.add(glassMesh);
  carRef = { car, body, glassMesh, lights: [], smashed: false, t: -1 };
  for (const sx of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(.012, .4, .09), paint); pillar.position.set(sx * (W / 2 + .006), 1.18, -.22); car.add(pillar);
    for (const zz of [.95, -.22, -1.25]) { const seam = new THREE.Mesh(new THREE.BoxGeometry(.006, .5, .012), MAT.black); seam.position.set(sx * (W / 2 + .052), .7, zz); car.add(seam); }
    const handle = new THREE.Mesh(new THREE.BoxGeometry(.02, .03, .14), MAT.steel); handle.position.set(sx * (W / 2 + .06), .86, .55); car.add(handle);
    const h2 = handle.clone(); h2.position.z = -.6; car.add(h2);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(.18, .1, .1), paint); mirror.position.set(sx * (W / 2 + .1), 1.04, .88); car.add(mirror);
  }
  // wheels: tyre, alloy rim with spokes, hub
  const tyre = M(0x111113, { roughness: .9 }), rim = M(0xc8ccd2, { metalness: .9, roughness: .25 });
  for (const zz of [1.42, -1.42]) for (const sx of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sx * .78, .34, zz); car.add(w);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .24, 28), tyre); t.rotation.z = Math.PI / 2; t.castShadow = true; w.add(t);
    const rm = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .02, 24), rim); rm.rotation.z = Math.PI / 2; rm.position.x = sx * .121; w.add(rm);
    for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.03, .2, .05), rim); sp.position.x = sx * .13; sp.rotation.x = k / 5 * 6.283; w.add(sp); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .04, 12), M(0x333336, { metalness: .8 })); hub.rotation.z = Math.PI / 2; hub.position.x = sx * .14; w.add(hub);
  }
  // bumpers, grille, lights, plates
  const trimDark = M(0x1a1a1c, { roughness: .5 });
  for (const [zz, d] of [[2.4, 1], [-2.4, -1]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(W + .05, .16, .12), trimDark); b.position.set(0, .42, zz); car.add(b);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(.42, .13), new THREE.MeshStandardMaterial({ map: canvasTex(256, 80, (g, w, h) => { g.fillStyle = '#f2f2ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b2a6b'; g.font = '700 46px Arial'; g.textAlign = 'center'; g.fillText('JT 1982', w / 2, 58); }) }));
    plate.position.set(0, .6, zz + d * .06); if (d < 0) plate.rotation.y = Math.PI; car.add(plate); }
  const grille = new THREE.Mesh(new THREE.BoxGeometry(.8, .16, .02), M(0x0e0e10, { metalness: .6, roughness: .4 })); grille.position.set(0, .72, 2.37); car.add(grille);
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(.36, .1, .04), new THREE.MeshStandardMaterial({ color: 0xf4f6ff, emissive: 0xfff6dd, emissiveIntensity: .35, metalness: .3, roughness: .1 })); hl.position.set(sx * .58, .74, 2.35); car.add(hl); carRef.lights.push(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(.42, .12, .04), new THREE.MeshStandardMaterial({ color: 0x8a0a0a, emissive: 0xff1010, emissiveIntensity: .35, roughness: .2 })); tl.position.set(sx * .58, .8, -2.36); car.add(tl); carRef.lights.push(tl);
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 4.9), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .025; car.add(shadow);
  colliders.push({ minX: cx - .95, maxX: cx + .95, minZ: cz - 2.4, maxZ: cz + 2.4 });
}

// neighbours: proper gabled houses with windows, a door and trim
function neighbourHouse(x, z, color, ry) {
  const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = ry || 0; scene.add(h);
  const sid = MAT.siding.clone(); sid.color.set(color);
  const bodyM = new THREE.Mesh(new THREE.BoxGeometry(11, 5.4, 9), sid); bodyM.position.y = 2.7; bodyM.castShadow = bodyM.receiveShadow = true; h.add(bodyM);
  const g = new THREE.Shape(); g.moveTo(-5.9, 0); g.lineTo(5.9, 0); g.lineTo(0, 2.6); g.closePath();
  for (const zz of [4.5, -4.5]) { const gm = new THREE.Mesh(new THREE.ShapeGeometry(g), sid); gm.position.set(0, 5.4, zz + (zz > 0 ? .01 : -.01)); if (zz < 0) gm.rotation.y = Math.PI; h.add(gm); }
  const slope = Math.hypot(5.9, 2.6);
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(slope + .3, .14, 9.8), MAT.shingles); r.position.set(s * 2.95, 6.7, 0); r.rotation.z = -s * Math.atan2(2.6, 5.9); r.castShadow = true; h.add(r); }
  const win = (wx, wy) => { const f = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, .08), MAT.trim); f.position.set(wx, wy, 4.52); h.add(f); const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3), new THREE.MeshPhysicalMaterial({ color: 0x1d2a33, roughness: .05, metalness: .2, envMapIntensity: 1.4 })); p.position.set(wx, wy, 4.57); h.add(p);
    for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(.4, 1.5, .05), M(0x2c3a2a)); sh.position.set(wx + sx * .88, wy, 4.53); h.add(sh); } };
  for (const wx of [-3.4, 3.4]) { win(wx, 1.6); win(wx, 4.0); } win(0, 4.0);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.1, .06), M(0x23384f, { roughness: .4 })); door.position.set(0, 1.05, 4.53); h.add(door);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, .2, .8), MAT.concrete); step.position.set(0, .1, 4.9); h.add(step);
  for (const sx of [-1, 1]) for (const zz of [-1, 1]) { const cb = new THREE.Mesh(new THREE.BoxGeometry(.18, 5.4, .18), MAT.trim); cb.position.set(sx * 5.5, 2.7, zz * 4.5); h.add(cb); }
  bush(x - 3.4, 0, z + 5.0, 1.2, Math.floor(x * 3)); bush(x + 3.4, 0, z + 5.0, 1.2, Math.floor(x * 5));
}

// details on my house: corner boards, a belt between the floors, shutters, gutters and downspouts, round porch columns
function houseDetails() {
  const shutter = M(0x2b3a2e, { roughness: .6 });
  for (const sx of [-1, 1]) for (const zz of [0, -12]) { const cb = box(.18, TOP2, .18, MAT.trim, sx * 6.08, TOP2 / 2, zz + (zz ? -.08 : .08), { cast: false }); }
  box(12.4, .2, .06, MAT.trim, 0, H.h + .1, .13, { cast: false }); box(12.4, .2, .06, MAT.trim, 0, H.h + .1, -12.13, { cast: false });
  box(.06, .2, 12.3, MAT.trim, -6.13, H.h + .1, -6, { cast: false }); box(.06, .2, 12.3, MAT.trim, 6.13, H.h + .1, -6, { cast: false });
  // shutters beside the front windows (both floors)
  for (const [a, b, y0, y1] of [[-4.4, -2.6, .9, 2.1], [2.8, 4.6, 1.0, 2.1], [-4.4, -2.6, H.h + 1.1, H.h + 2.3], [-.6, .9, H.h + 1.1, H.h + 2.3]]) {
    for (const xx of [a - .3, b + .3]) {
      const sh = box(.42, y1 - y0 + .1, .05, shutter, xx, (y0 + y1) / 2, .14, { cast: false });
      for (let k = 0; k < 6; k++) box(.36, .015, .02, M(0x1e2a20), xx, y0 + .1 + k * (y1 - y0) / 6, .17, { cast: false });
    }
  }
  // gutters along the front and back eaves, downspouts at the corners
  const gut = M(0xe8e6e0, { roughness: .4 });
  for (const zz of [.95, -12.95]) {
    const gm = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 13.4, 10, 1, false, 0, Math.PI), gut); gm.rotation.z = Math.PI / 2; gm.rotation.x = Math.PI; gm.position.set(0, TOP2 - .02, zz); scene.add(gm);
    for (const sx of [-1, 1]) box(.07, TOP2, .07, gut, sx * 6.3, TOP2 / 2, zz - Math.sign(zz + 6) * .75, { cast: false });
  }
  // ridge cap and chimney cap
  box(13.5, .1, .3, M(0x2c2826, { roughness: .9 }), 0, TOP2 + 1.68, -6, { cast: false });
  box(1.0, .12, 1.0, MAT.concrete, 4.2, TOP2 + 2.56, -8.5, { cast: false });
  // round porch columns over the square posts
  for (const sx of [-1.55, 1.55]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, 2.5, 16), MAT.trim); c.position.set(sx, 1.33, 1.75); c.castShadow = true; scene.add(c);
    box(.26, .1, .26, MAT.trim, sx, .14, 1.75, { cast: false }); box(.26, .1, .26, MAT.trim, sx, 2.56, 1.75, { cast: false }); }
  // lamp posts with arms and heads along the street
  for (const x of [-30, -12, 6, 24, 42]) { box(.3, .1, .9, MAT.dark, x, 4.2, 14.25, { cast: false }); const hd = new THREE.Mesh(new THREE.ConeGeometry(.28, .25, 12), MAT.dark); hd.position.set(x, 4.05, 13.85); scene.add(hd);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff1cc, emissive: 0xffd88a, emissiveIntensity: 1.2 })); bulb.position.set(x, 3.92, 13.85); scene.add(bulb); }
}

let frontDoor = null, porchLight = null;
function buildHouse() {
  // ground, street, driveway, path
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), MAT.grass); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(600, 9), MAT.asphalt); street.rotation.x = -Math.PI / 2; street.position.set(0, .01, 19); street.receiveShadow = true; scene.add(street);
  const lines = new THREE.Mesh(new THREE.PlaneGeometry(600, .12), M(0xe8d35a, { roughness: .6 })); lines.rotation.x = -Math.PI / 2; lines.position.set(0, .015, 19); scene.add(lines);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(600, 1.6), MAT.concrete); walk.rotation.x = -Math.PI / 2; walk.position.set(0, .02, 13.6); walk.receiveShadow = true; scene.add(walk);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 11), MAT.concrete); path.rotation.x = -Math.PI / 2; path.position.set(0, .025, 7.4); path.receiveShadow = true; scene.add(path);
  const drive = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 13), MAT.concrete); drive.rotation.x = -Math.PI / 2; drive.position.set(9, .022, 6.5); drive.receiveShadow = true; scene.add(drive);
  // foundation and floors
  box(12.6, .3, 12.6, MAT.brick, 0, -.13, -6, { cast: false });
  const floor = (w, d, x, z, mat, rep) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat.clone()); f.material.map = mat.map.clone(); f.material.map.repeat.set(rep[0], rep[1]); f.material.map.needsUpdate = true; f.rotation.x = -Math.PI / 2; f.position.set(x, .021, z); f.receiveShadow = true; scene.add(f); return f; };
  floor(8.6, 6, -1.7, -3, MAT.wood, [2.6, 1.8]);
  floor(3.4, 6, 4.3, -3, MAT.tile, [3.4, 6]);
  floor(6, 6, -3, -9, MAT.carpet, [5, 5]);
  floor(6, 6, 3, -9, MAT.wood, [1.8, 1.8]);
  // ceiling
  for (const [x0, x1, z0, z1] of [[-6, 4.8, -12, 0], [4.8, 6, -6.5, 0], [4.8, 6, -12, -11.1]]) {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MAT.ceiling); ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, H.h, cz); scene.add(ceil); camBlockers.push(ceil);
    box(w, F2 - H.h - .002, d, MAT.white, cx, (H.h + F2) / 2, cz, { cast: false, block: true });
  }
  // porch
  box(3.4, .18, 1.8, MAT.concrete, 0, .09, .95, { cast: false });
  box(3.4, .12, 1.0, MAT.concrete, 0, .06, 2.2, { cast: false });
  box(.14, 2.6, .14, MAT.trim, -1.55, 1.3, 1.75, { collide: true });
  box(.14, 2.6, .14, MAT.trim, 1.55, 1.3, 1.75, { collide: true });
  box(3.6, .12, 2.0, MAT.trim, 0, 2.62, .95);
  // outside walls: siding outside, paint inside
  const DOOR = { a: -.5, b: .5, bottom: 0, top: 2.1 };
  wall('x', 0, -6.1, 6.1, MAT.livingWall, MAT.siding, [DOOR, { a: -4.4, b: -2.6, bottom: .9, top: 2.1 }, { a: 2.8, b: 4.6, bottom: 1.0, top: 2.1 }]);
  wall('x', -12, -6.1, 0, MAT.siding, MAT.gameWall); wall('x', -12, 0, 6.1, MAT.siding, MAT.bedWall, [{ a: 3.0, b: 4.4, bottom: 1.0, top: 2.0 }]);
  wall('z', -6, -12, -6, MAT.siding, MAT.gameWall, [{ a: -10.2, b: -8.8, bottom: 1.1, top: 2.0 }]); wall('z', -6, -6, 0, MAT.siding, MAT.livingWall, [{ a: -3.8, b: -2.2, bottom: .9, top: 2.1 }]);
  wall('z', 6, -12, -6, MAT.bedWall, MAT.siding); wall('z', 6, -6, 0, MAT.kitchenWall, MAT.siding);
  windowPane('x', 0, -4.4, -2.6, .9, 2.1, 1); windowPane('x', 0, 2.8, 4.6, 1.0, 2.1, 1);
  windowPane('z', -6, -3.8, -2.2, .9, 2.1, -1); windowPane('z', -6, -10.2, -8.8, 1.1, 2.0, -1);
  windowPane('x', -12, 3.0, 4.4, 1.0, 2.0, -1);
  // inside walls
  wall('x', -6, -6, 6, MAT.gameWall, MAT.livingWall, [{ a: -3.6, b: -2.4, bottom: 0, top: 2.15 }, { a: 2.4, b: 3.4, bottom: 0, top: 2.15 }], H.h, .14);
  wall('z', 0, -12, -6, MAT.gameWall, MAT.bedWall, [], H.h, .14);
  // trim: baseboards around the living area
  box(12, .1, .03, MAT.trim, 0, .05, -.11, { cast: false }); box(12, .1, .03, MAT.trim, 0, .05, -5.91, { cast: false });
  // front door, hinged at x = -0.5
  frontDoor = new THREE.Group(); frontDoor.position.set(-.5, 0, 0); scene.add(frontDoor);
  const doorMat = M(0x6b1f22, { roughness: .45 });
  const dp = new THREE.Mesh(new THREE.BoxGeometry(1, 2.1, .06), doorMat); dp.position.set(.5, 1.05, 0); dp.castShadow = true; frontDoor.add(dp);
  for (const [y, h] of [[1.55, .7], [.55, .7]]) { const pn = new THREE.Mesh(new THREE.BoxGeometry(.7, h, .02), doorMat); pn.position.set(.5, y, .04); frontDoor.add(pn); }
  const dk = new THREE.Mesh(new THREE.SphereGeometry(.04, 12, 8), M(0xc9a54a, { metalness: 1, roughness: .25 })); dk.position.set(.88, 1.0, .06); frontDoor.add(dk);
  box(1.2, .12, .26, MAT.trim, 0, 2.16, 0, { cast: false });
  // house number + porch light
  const num = new THREE.Mesh(new THREE.PlaneGeometry(.5, .2), new THREE.MeshStandardMaterial({ map: canvasTex(256, 100, (g, w, h) => { g.fillStyle = '#20232a'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9e2cf'; g.font = '700 70px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1982', w / 2, h / 2 + 4); }) }));
  num.position.set(.95, 1.75, .11); scene.add(num);
  const lamp = box(.16, .26, .12, M(0x2b2b2b, { roughness: .4 }), -.85, 1.85, .16);
  lamp.material = [MAT.dark, MAT.dark, MAT.dark, MAT.dark, M(0xffe6b0, { emissive: 0xffd28a, emissiveIntensity: 2 }), MAT.dark];
  porchLight = new THREE.PointLight(0xffc98a, 0, 7, 1.6); porchLight.position.set(-.85, 1.8, .45); scene.add(porchLight);
  // roof: two slopes along X with gable ends
  const ridge = TOP2 + 1.6, eave = TOP2 + .05, half = 6.9, over = 7;
  const slope = Math.hypot(half, ridge - eave);
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(13.4, .14, slope), MAT.shingles);
    r.position.set(0, (ridge + eave) / 2, -6 + s * half / 2); r.rotation.x = s * Math.atan2(ridge - eave, half); r.castShadow = r.receiveShadow = true; scene.add(r);
    const fascia = box(13.4, .22, .05, MAT.trim, 0, eave - .05, -6 + s * (half + .02), { cast: false });
  }
  const gable = new THREE.Shape(); gable.moveTo(-6.05, 0); gable.lineTo(6.05, 0); gable.lineTo(0, ridge - eave); gable.closePath();
  for (const z of [0, -12]) {
    const gm = new THREE.Mesh(new THREE.ShapeGeometry(gable), MAT.siding); gm.position.set(0, eave, z + (z === 0 ? .1 : -.1)); if (z === -12) gm.rotation.y = Math.PI; gm.castShadow = true; scene.add(gm);
  }
  // chimney
  box(.8, 2.4, .8, MAT.brick, 4.2, TOP2 + 1.3, -8.5);
  // landscaping: trees, hedges, fence, mailbox, a car
  const tree = realTree;
  tree(-9, 6, 1.3); tree(-12, -4, 1.6); tree(12, -10, 1.5); tree(-14, -16, 1.8); tree(15, 4, 1.2); tree(-6, 10, 1.0); tree(20, -6, 1.7);
  for (let x = -5.6; x <= 5.6; x += .9) if (Math.abs(x) > 1.3) bush(x, 0, .6, 1, Math.floor(x * 10 + 50));
  colliders.push({ minX: -6, maxX: -1.2, minZ: .1, maxZ: 1.0 }, { minX: 1.2, maxX: 6, minZ: .1, maxZ: 1.0 });
  const mb = new THREE.Group(); mb.position.set(1.6, 0, 12.4); scene.add(mb);
  const post = new THREE.Mesh(new THREE.BoxGeometry(.1, 1.1, .1), MAT.trim); post.position.y = .55; mb.add(post);
  const bx = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .5, 16, 1, false, 0, Math.PI), M(0x2a2d33, { metalness: .6, roughness: .4 })); bx.rotation.z = Math.PI / 2; bx.rotation.y = Math.PI / 2; bx.position.set(0, 1.1, 0); mb.add(bx);
  const bxb = new THREE.Mesh(new THREE.BoxGeometry(.32, .16, .5), bx.material); bxb.position.set(0, 1.03, 0); mb.add(bxb);
  // a parked car in the driveway
  buildCar(9, 5);
  // neighbouring houses down the street (simple massing for depth)
  for (const [x, z, c] of [[-26, -4, 0xb9a98e], [26, -4, 0x9fb1a6], [-50, -2, 0xc4b6a4], [48, -6, 0xa8a2b4]]) neighbourHouse(x, z, c);
  for (const x of [-30, -12, 6, 24, 42]) { const lp = box(.12, 4.2, .12, MAT.dark, x, 2.1, 14.6); }
}

// ---------------------------------------------------------------- furniture
const screens = []; // canvas textures that animate {tex, draw}
function plant(x, z, s = 1, y = 0) {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.18 * s, .14 * s, .32 * s, 16), M(0xb5653d, { roughness: .8 })); pot.position.set(x, y + .16 * s, z); pot.castShadow = true; scene.add(pot);
  const r = rng(Math.floor(x * 31 - z * 17));
  for (let i = 0; i < 14; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.12 * s, 8, 6), MAT.leaf); l.scale.set(.5, 1.7, .5); l.position.set(x + (r() - .5) * .3 * s, y + (.45 + r() * .5) * s, z + (r() - .5) * .3 * s); l.rotation.set((r() - .5), r() * 3, (r() - .5)); l.castShadow = true; scene.add(l); }
  colliders.push({ minX: x - .2 * s, maxX: x + .2 * s, minZ: z - .2 * s, maxZ: z + .2 * s, lvl: y > 1 ? 1 : 0 });
}
function buildLiving() {
  // rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), M(0xffffff, { map: canvasTex(512, 384, (g, w, h) => { g.fillStyle = '#7a3b2e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9b77a'; g.lineWidth = 10; g.strokeRect(20, 20, w - 40, h - 40); g.lineWidth = 4; g.strokeRect(44, 44, w - 88, h - 88); speckle(g, w, h, 71, 40000, .12); }), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(-4.4, .025, -3); rug.receiveShadow = true; scene.add(rug);
  // TV on a low cabinet against the west wall
  box(.45, .5, 1.9, MAT.walnut, -5.7, .25, -3, { collide: true });
  const tvTex = canvasTex(512, 288, () => { });
  const tv = box(.06, .72, 1.25, MAT.black, -5.72, 1.02, -3);
  const tvScr = new THREE.Mesh(new THREE.PlaneGeometry(1.18, .66), new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false })); tvScr.position.set(-5.685, 1.02, -3); tvScr.rotation.y = Math.PI / 2; scene.add(tvScr);
  tvs.living = { mesh: tvScr, idle: tvTex, seat: 'couch', lvl: 0 };
  screens.push({ tex: tvTex, draw: (g, w, h, t) => {
    const k = (Math.sin(t * .3) + 1) / 2; const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, `hsl(${200 + k * 40}, 60%, 30%)`); gr.addColorStop(1, `hsl(${260 + k * 60}, 50%, 18%)`);
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '600 26px system-ui, sans-serif'; g.fillText('Channel 3', 24, 44); g.font = '16px system-ui, sans-serif'; g.fillText('Click the TV to watch Everybody Loves JT', 24, 70);
    g.fillStyle = 'rgba(255,255,255,.2)'; for (let i = 0; i < 6; i++) g.fillRect(24 + i * 80, h - 70, 64, 40);
  } });
  // couch facing the TV
  const couch = new THREE.Group(); couch.position.set(-3.9, 0, -3); scene.add(couch);
  const fab = MAT.fabric;
  const part = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fab); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; couch.add(m); };
  part(.9, .42, 2.2, 0, .21, 0); part(.22, .8, 2.2, .34, .4, 0); part(.9, .58, .2, 0, .29, -1.1); part(.9, .58, .2, 0, .29, 1.1);
  for (const z of [-.5, .5]) { const c = new THREE.Mesh(new THREE.BoxGeometry(.66, .14, .96), M(0x667383, { roughness: 1 })); c.position.set(-.08, .49, z); c.castShadow = true; couch.add(c); }
  colliders.push({ minX: -4.35, maxX: -3.45, minZ: -4.2, maxZ: -1.8 });
  // coffee table
  box(.6, .05, 1.1, MAT.oak, -4.9, .42, -3, { collide: true });
  for (const [x, z] of [[-5.15, -3.5], [-4.65, -3.5], [-5.15, -2.5], [-4.65, -2.5]]) box(.05, .4, .05, MAT.oak, x, .2, z);
  box(.18, .12, .26, M(0x2b5d8a), -4.9, .5, -3.2); // magazine stack
  // floor lamp + bookshelf + plant
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1.6, 8), MAT.dark); fl.position.set(-5.5, .8, -1.2); scene.add(fl);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(.16, .24, .3, 20, 1, true), M(0xf3e6c8, { emissive: 0xffd9a0, emissiveIntensity: .6, side: THREE.DoubleSide })); shade.position.set(-5.5, 1.65, -1.2); scene.add(shade);
  box(1.4, 1.9, .3, MAT.walnut, -1.5, .95, -5.77, { collide: true });
  const r = rng(91);
  for (let sh = 0; sh < 4; sh++) {
    box(1.36, .02, .3, MAT.walnut, -1.5, .12 + sh * .46, -5.56, { cast: false });
    for (let x = -2.12; x < -.9;) { const w = .035 + r() * .05, hh = .24 + r() * .1; box(w, hh, .22, M(new THREE.Color().setHSL(r(), .45, .3 + r() * .15), { roughness: .7 }), x + w / 2, .13 + sh * .46 + hh / 2, -5.5); x += w + .005; }
  }
  plant(-5.6, -.5, 1.2); plant(1.6, -.6);
  ceilingLamp(-3.4, -3); addLight(new THREE.PointLight(0xffd7a8, 1, 9, 1.6), -3.4, 2.1, -3, 2.5, 4);
  addLight(new THREE.PointLight(0xffc98a, 1, 4, 1.8), -5.5, 1.5, -1.2, .8, 2);
}
function buildKitchen() {
  // counters along the east wall
  box(.65, .9, 4.4, M(0xeeeae2, { roughness: .5 }), 5.62, .45, -3.2, { collide: true });
  box(.7, .04, 4.4, M(0x2a2a2c, { roughness: .25, metalness: .2 }), 5.6, .92, -3.2);
  box(.35, .7, 4.4, M(0xeeeae2, { roughness: .5 }), 5.78, 1.85, -3.2);
  // fridge
  box(.75, 1.85, .75, MAT.steel, 5.5, .925, -5.45, { collide: true });
  // stove top + sink hints
  box(.5, .02, .6, MAT.black, 5.6, .95, -2.4);
  const sink = box(.45, .02, .6, M(0x9aa0a6, { metalness: .8, roughness: .3 }), 5.6, .945, -4.0);
  // island with stools
  box(1.2, .9, 2.0, M(0x4f6a7a, { roughness: .6 }), 3.9, .45, -3, { collide: true });
  box(1.3, .05, 2.1, M(0xe9e6df, { roughness: .2 }), 3.9, .925, -3);
  for (const z of [-3.6, -3, -2.4]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .05, 18), M(0x2e2e2e)); s.position.set(3.05, .7, z); s.castShadow = true; scene.add(s);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .7, 8), MAT.steel); p.position.set(3.05, .35, z); scene.add(p);
  }
  // pendant lights
  for (const z of [-3.5, -2.5]) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .9, 4), MAT.black); cord.position.set(3.9, 2.25, z); scene.add(cord);
    const sh = new THREE.Mesh(new THREE.ConeGeometry(.16, .2, 20, 1, true), M(0x1c1c1c, { side: THREE.DoubleSide })); sh.position.set(3.9, 1.75, z); scene.add(sh);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2b0 })); bulb.position.set(3.9, 1.68, z); scene.add(bulb);
  }
  addLight(new THREE.PointLight(0xffe2b8, 1, 8, 1.7), 3.9, 1.6, -3, 1.8, 3.5);
}

// ---------------------------------------------------------------- stairs and the second floor
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const tvs = {};          // living | bed -> {mesh, idle}
const spots = [];        // things he can use: {lvl, x, z, r, p1, label(), act()}
function floorPlane(w, d, x, z, mat, rep, y) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat.clone()); f.material.map = mat.map.clone(); f.material.map.repeat.set(rep[0], rep[1]); f.material.map.needsUpdate = true;
  f.rotation.x = -Math.PI / 2; f.position.set(x, y, z); f.receiveShadow = true; scene.add(f); return f;
}
function buildStairs() {
  const n = 16, rise = F2 / n, run = (STAIR.z0 - STAIR.z1) / n, w = 1.1, cx = 5.35;
  const tread = M(0x7a4e2e, { roughness: .5 });
  for (let i = 0; i < n; i++) {
    const top = (i + 1) * rise, z = STAIR.z0 - (i + .5) * run;
    box(w, top, run, MAT.white, cx, top / 2, z, { cast: false });
    box(w + .02, .03, run + .03, tread, cx, top + .005, z, { cast: false });
  }
  // handrail along the open side, and the guard rail round the opening upstairs
  const ang = Math.atan2(F2, STAIR.z0 - STAIR.z1), len = Math.hypot(F2, STAIR.z0 - STAIR.z1);
  const rail = box(.06, .05, len, tread, 4.83, F2 / 2 + .92, (STAIR.z0 + STAIR.z1) / 2, { cast: false }); rail.rotation.x = ang;
  for (let i = 0; i <= n; i += 3) { const z = STAIR.z0 - i * run, y = i * rise; box(.04, .92, .04, MAT.white, 4.83, y + .46, z, { cast: false }); }
  box(.06, .05, 4.6, tread, 4.79, F2 + .95, -8.75, { cast: false });
  box(1.15, .05, .06, tread, 5.35, F2 + .95, -6.45, { cast: false });
  for (let z = -6.5; z > -11.05; z -= .3) box(.03, .95, .03, MAT.white, 4.79, F2 + .475, z, { cast: false });
  for (let x = 4.9; x < 5.95; x += .3) box(.03, .95, .03, MAT.white, x, F2 + .475, -6.45, { cast: false });
  colliders.push({ minX: 4.72, maxX: 4.86, minZ: -11.95, maxZ: -7.0, lvl: 0 });
  colliders.push({ minX: 4.72, maxX: 4.86, minZ: -11.0, maxZ: -6.4, lvl: 1 }, { minX: 4.72, maxX: 6, minZ: -6.5, maxZ: -6.4, lvl: 1 });
  // the downstairs hall: a bench, coat hooks, a plant, a picture
  box(.42, .45, 1.3, MAT.oak, .32, .225, -8.6, { collide: true });
  for (let i = 0; i < 3; i++) { box(.06, .06, .06, MAT.steel, .1, 1.7, -9.0 + i * .4, { cast: false }); }
  box(.12, .7, .32, M(0x8a2a2a, { roughness: 1 }), .14, 1.32, -9.0);
  plant(.5, -11.4, 1.1);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(.8, .6), new THREE.MeshStandardMaterial({ map: canvasTex(320, 240, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f2b27a'); gr.addColorStop(1, '#5a7aa8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#2d3b2a'; g.beginPath(); g.moveTo(0, h); g.lineTo(90, 120); g.lineTo(170, 170); g.lineTo(250, 100); g.lineTo(w, h); g.fill(); g.strokeStyle = '#3a2a1a'; g.lineWidth = 16; g.strokeRect(0, 0, w, h); }) }));
  pic.position.set(.08, 1.6, -10.6); pic.rotation.y = Math.PI / 2; scene.add(pic);
  ceilingLamp(3, -9); addLight(new THREE.PointLight(0xffe2c0, 1, 7, 1.7), 3, 2.1, -9, 1.2, 2.4);
}
function buildUpstairs() {
  MAT.bed2Wall = M(0xffffff, { map: TEX.paint('#b9c8b4', 65), roughness: .9 });
  MAT.bathWall = M(0xffffff, { map: TEX.paint('#e6eef2', 66), roughness: .6 });
  MAT.hallWall = M(0xffffff, { map: TEX.paint('#ddd2bf', 67), roughness: .9 });
  const y0 = F2 + .002;
  floorPlane(8, 12, -2, -6, MAT.carpet, [6, 9], y0);
  floorPlane(4, 6, 4, -3, MAT.tile, [4, 6], y0);
  floorPlane(2.8, 6, 3.4, -9, MAT.wood, [.9, 1.8], y0); floorPlane(1.2, .9, 5.4, -11.55, MAT.wood, [.4, .3], y0); floorPlane(1.2, .5, 5.4, -6.25, MAT.wood, [.4, .2], y0);
  // outside walls (from the top of the ground-floor walls) and windows
  const B = H.h, h2 = TOP2 - H.h;
  wall('x', 0, -6.1, 2, MAT.bed2Wall, MAT.siding, [{ a: -4.4, b: -2.6, bottom: 1.1, top: 2.3 }, { a: -.6, b: .9, bottom: 1.1, top: 2.3 }], h2, H.t, B);
  wall('x', 0, 2, 6.1, MAT.bathWall, MAT.siding, [{ a: 3.4, b: 4.4, bottom: 1.5, top: 2.3 }], h2, H.t, B);
  wall('x', -12, -6.1, 2, MAT.siding, MAT.bed2Wall, [{ a: -.4, b: 1.0, bottom: 1.1, top: 2.3 }], h2, H.t, B);
  wall('x', -12, 2, 6.1, MAT.siding, MAT.hallWall, [{ a: 2.6, b: 3.8, bottom: 1.1, top: 2.3 }], h2, H.t, B);
  wall('z', -6, -12, 0, MAT.siding, MAT.bed2Wall, [{ a: -4.2, b: -2.6, bottom: 1.1, top: 2.3 }], h2, H.t, B);
  wall('z', 6, -12, -6, MAT.hallWall, MAT.siding, [], h2, H.t, B); wall('z', 6, -6, 0, MAT.bathWall, MAT.siding, [], h2, H.t, B);
  windowPane('x', 0, -4.4, -2.6, B + 1.1, B + 2.3, 1); windowPane('x', 0, -.6, .9, B + 1.1, B + 2.3, 1); windowPane('x', 0, 3.4, 4.4, B + 1.5, B + 2.3, 1);
  windowPane('x', -12, -.4, 1.0, B + 1.1, B + 2.3, -1); windowPane('x', -12, 2.6, 3.8, B + 1.1, B + 2.3, -1); windowPane('z', -6, -4.2, -2.6, B + 1.1, B + 2.3, -1);
  // inside walls: bedroom | hall, bedroom | bath, hall | bath
  const hi = TOP2 - F2;
  wall('z', 2, -12, -6, MAT.bed2Wall, MAT.hallWall, [{ a: -8.2, b: -7.2, bottom: 0, top: 2.1 }], hi, .14, F2);
  wall('z', 2, -6, 0, MAT.bed2Wall, MAT.bathWall, [], hi, .14, F2);
  wall('x', -6, 2, 6, MAT.hallWall, MAT.bathWall, [{ a: 2.5, b: 3.4, bottom: 0, top: 2.1 }], hi, .14, F2);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), MAT.ceiling); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, TOP2, -6); scene.add(ceil); camBlockers.push(ceil);
  const L1 = { collide: true, lvl: 1 };

  // ---- the bedroom: a big bed against the back wall, the TV on a console facing it
  box(2.0, 1.15, .08, MAT.walnut, -3, F2 + .6, -11.86);
  box(1.9, .3, 2.3, MAT.walnut, -3, F2 + .2, -10.72, L1);
  box(1.8, .22, 2.2, MAT.white, -3, F2 + .46, -10.72, { cast: false });
  const quilt = box(1.86, .07, 1.45, M(0xffffff, { map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2f4f7f'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 3; for (let i = 0; i < w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } speckle(g, w, h, 81, 6000, .08); }), roughness: 1 }), -3, F2 + .59, -10.32, { cast: false });
  box(1.86, .08, .25, M(0xe8e2d4, { roughness: 1 }), -3, F2 + .6, -11.1, { cast: false });
  for (const x of [-3.45, -2.55]) { const pl = box(.62, .14, .36, M(0xf4f1ea, { roughness: 1 }), x, F2 + .65, -11.55, { cast: false }); pl.rotation.x = -.15; }
  for (const x of [-4.35, -1.65]) {
    box(.5, .55, .42, MAT.oak, x, F2 + .275, -11.62, L1);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, .3, 12), MAT.beige); base.position.set(x, F2 + .7, -11.62); scene.add(base);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, .2, 20, 1, true), M(0xf3e6c8, { emissive: 0xffd9a0, emissiveIntensity: .7, side: THREE.DoubleSide })); sh.position.set(x, F2 + .92, -11.62); scene.add(sh);
  }
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6), M(0xffffff, { map: canvasTex(512, 384, (g, w, h) => { g.fillStyle = '#d9cbb0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a6a4a'; g.lineWidth = 8; g.strokeRect(18, 18, w - 36, h - 36); speckle(g, w, h, 72, 30000, .1); }), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(-3, F2 + .01, -8.6); rug.receiveShadow = true; scene.add(rug);
  // TV console: a low dresser with the TV on it, screen facing the bed
  box(1.7, .7, .45, MAT.walnut, -3, F2 + .35, -6.3, L1);
  for (const x of [-3.42, -2.58]) box(.78, .26, .01, MAT.oak, x, F2 + .45, -6.53, { cast: false });
  box(.3, .05, .2, MAT.black, -3, F2 + .725, -6.25);
  box(1.25, .72, .06, MAT.black, -3, F2 + 1.13, -6.25);
  const bedIdle = canvasTex(512, 288, (g, w, h) => { g.fillStyle = '#07090c'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.12)'; g.font = '600 20px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('Click the TV to watch', w / 2, h / 2); });
  const bedScr = new THREE.Mesh(new THREE.PlaneGeometry(1.18, .66), new THREE.MeshBasicMaterial({ map: bedIdle, toneMapped: false }));
  bedScr.position.set(-3, F2 + 1.13, -6.285); bedScr.rotation.y = Math.PI; scene.add(bedScr);
  tvs.bed = { mesh: bedScr, idle: bedIdle, seat: 'bed', lvl: 1, center: V3(-3, F2 + 1.13, -6.3) };
  // the front half: wardrobe, armchair, floor lamp, plant
  box(.62, 2.1, 1.5, MAT.walnut, -5.62, F2 + 1.05, -4.2, L1);
  box(.01, 2.0, .01, MAT.black, -5.3, F2 + 1.05, -4.2, { cast: false });
  const chairA = new THREE.Group(); chairA.position.set(-4.6, F2, -1.3); chairA.rotation.y = Math.PI * .8; scene.add(chairA);
  for (const [w, h, d, x, y, z] of [[.8, .42, .8, 0, .21, 0], [.8, .55, .16, 0, .6, -.33], [.14, .3, .8, -.36, .55, 0], [.14, .3, .8, .36, .55, 0]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(0x9a5a3a, { roughness: 1 })); m.position.set(x, y, z); m.castShadow = true; chairA.add(m); }
  colliders.push({ minX: -5.0, maxX: -4.2, minZ: -1.7, maxZ: -.9, lvl: 1 });
  plant(-.3, -.6, 1.0, F2);
  ceilingLamp(-3, -8.6, TOP2); ceilingLamp(-3, -3, TOP2);
  addLight(new THREE.PointLight(0xffe0bc, 1, 10, 1.6), -3, TOP2 - .5, -8.6, 2.2, 3.4);
  addLight(new THREE.PointLight(0xffe0bc, 1, 8, 1.7), -3, TOP2 - .5, -3, 1.4, 2.4);

  // ---- the bathroom: vanity with a sink and mirror, a toilet, a walk-in shower
  box(.55, .85, 1.1, MAT.white, 5.62, F2 + .425, -3.4, L1);
  box(.6, .04, 1.15, M(0x2a2a2c, { roughness: .2 }), 5.6, F2 + .87, -3.4);
  box(.38, .02, .5, M(0xf6f6f4, { roughness: .15 }), 5.58, F2 + .895, -3.4, { cast: false });
  const bathFaucet = faucet(5.84, F2 + .89, -3.4);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(.95, .8), new THREE.MeshStandardMaterial({ color: 0xdfe8ee, metalness: 1, roughness: .04, envMapIntensity: 1.4 }));
  mirror.position.set(5.885, F2 + 1.6, -3.4); mirror.rotation.y = -Math.PI / 2; scene.add(mirror);
  box(.02, .86, 1.01, MAT.black, 5.9, F2 + 1.6, -3.4, { cast: false });
  box(.5, .38, .42, MAT.white, 5.5, F2 + .19, -4.9, L1); box(.22, .42, .46, MAT.white, 5.78, F2 + .6, -4.9);
  box(.46, .04, .4, MAT.white, 5.48, F2 + .4, -4.9, { cast: false });
  // shower: tray, glass on two sides (door gap on the north), head on the east wall
  box(1.2, .06, 1.2, M(0xf2f4f4, { roughness: .3 }), 5.3, F2 + .03, -.7, { cast: false });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe6ee, roughness: .05, transparent: true, opacity: .22, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false });
  const g1 = new THREE.Mesh(new THREE.BoxGeometry(.02, 2.0, 1.2), glass); g1.position.set(4.7, F2 + 1.04, -.7); scene.add(g1);
  const g2 = new THREE.Mesh(new THREE.BoxGeometry(.6, 2.0, .02), glass); g2.position.set(5.6, F2 + 1.04, -1.3); scene.add(g2);
  box(.03, 2.0, .03, MAT.steel, 4.7, F2 + 1.04, -1.3, { cast: false });
  colliders.push({ minX: 4.68, maxX: 4.72, minZ: -1.3, maxZ: -.1, lvl: 1 }, { minX: 5.3, maxX: 5.9, minZ: -1.32, maxZ: -1.28, lvl: 1 });
  box(.3, .03, .03, MAT.steel, 5.75, F2 + 2.12, -.7, { cast: false });
  const head = new THREE.Mesh(new THREE.CylinderGeometry(.09, .06, .04, 20), MAT.steel); head.position.set(5.6, F2 + 2.1, -.7); scene.add(head);
  box(.04, .5, .38, M(0x3b7ea8, { roughness: 1 }), 2.1, F2 + 1.25, -1.9);   // towel
  box(.6, .01, .4, M(0x6b9ac0, { roughness: 1 }), 4.4, F2 + .006, -.9, { cast: false }); // bath mat
  ceilingLamp(4, -3, TOP2); addLight(new THREE.PointLight(0xf4f6ff, 1, 7, 1.7), 4, TOP2 - .5, -3, 1.4, 2.4);
  // ---- the upstairs hall
  plant(2.6, -11.4, 1.0, F2);
  ceilingLamp(3.4, -9, TOP2); addLight(new THREE.PointLight(0xffe2c0, 1, 7, 1.7), 3.4, TOP2 - .5, -9, 1.0, 2.0);

  // ---- things to use upstairs
  shower.init(V3(5.6, F2 + 2.06, -.7), F2 + .06);
  spots.push({ lvl: 1, x: -3, z: -10.4, r: 2.3, p1: 'PRESS E TO LIE DOWN', label: () => 'Lie down on the bed', act: () => restAt('bed') });
  spots.push({ lvl: 1, x: 5.0, z: -3.4, r: .85, p1: 'PRESS E TO USE THE SINK', label: () => bathFaucet.on ? 'Turn off the water' : 'Run the water', act: () => bathFaucet.toggle() });
  spots.push({ lvl: 1, x: 5.05, z: -1.15, r: .9, p1: 'PRESS E TO SHOWER', label: () => 'Take a shower', act: () => restAt('shower') });
}
// a faucet with a running-water stream it can toggle
const faucets = [];
function faucet(x, y, z) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.018, .022, .22, 12), MAT.steel); post.position.set(x, y + .11, z); scene.add(post);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .17, 10), MAT.steel); spout.rotation.z = Math.PI / 2; spout.position.set(x - .08, y + .21, z); scene.add(spout);
  const tip = x - .16;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(.009, .013, .2, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfeeff, transparent: true, opacity: .6, roughness: .05, emissive: 0x335566, emissiveIntensity: .3 }));
  water.position.set(tip, y + .105, z); water.visible = false; scene.add(water);
  const f = { on: false, water, loop: null,
    toggle() { f.on = !f.on; water.visible = f.on; sfx.click(); if (f.on) f.loop = sfx.loop('water'); else if (f.loop) { f.loop.stop(); f.loop = null; } },
    tick(t) { if (f.on) { water.scale.set(1 + Math.sin(t * 40) * .15, 1, 1 + Math.cos(t * 37) * .15); } } };
  faucets.push(f);
  return f;
}
// shower water: falling streaks
const shower = {
  pts: null, on: false, loop: null, head: null, floor: 0,
  init(head, floor) {
    this.head = head; this.floor = floor;
    const n = 420, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) this.respawn(pos, i, Math.random());
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe4f6ff, size: .045, transparent: true, opacity: .8, depthWrite: false }));
    this.pts.visible = false; this.pts.frustumCulled = false; scene.add(this.pts);
  },
  respawn(pos, i, f) {
    const a = Math.random() * 6.283, r = Math.random() * .08;
    pos[i * 3] = this.head.x + Math.cos(a) * r; pos[i * 3 + 2] = this.head.z + Math.sin(a) * r;
    pos[i * 3 + 1] = this.head.y - f * (this.head.y - this.floor);
  },
  set(on) { this.on = on; this.pts.visible = on; if (on && !this.loop) this.loop = sfx.loop('shower'); if (!on && this.loop) { this.loop.stop(); this.loop = null; } },
  tick(dt) {
    if (!this.on) return;
    const pos = this.pts.geometry.attributes.position.array;
    for (let i = 0; i < pos.length / 3; i++) {
      pos[i * 3 + 1] -= dt * 4.2; const k = (this.head.y - pos[i * 3 + 1]) * .9 * dt;
      pos[i * 3] += (pos[i * 3] - this.head.x) * k * 2.2; pos[i * 3 + 2] += (pos[i * 3 + 2] - this.head.z) * k * 2.2;
      if (pos[i * 3 + 1] < this.floor) { const over = (this.floor - pos[i * 3 + 1]) % (this.head.y - this.floor); this.respawn(pos, i, 0); pos[i * 3 + 1] -= over; }
    }
    this.pts.geometry.attributes.position.needsUpdate = true;
  }
};
// rising steam puffs (the stove)
function steamPuffs(x, y, z) {
  const tex = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const list = [];
  for (let i = 0; i < 8; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 })); s.scale.setScalar(.15); s.position.set(x, y, z); s.userData.p = i / 8; s.visible = false; scene.add(s); list.push(s); }
  return { set(on) { list.forEach(s => s.visible = on); }, tick(dt) { for (const s of list) { if (!s.visible) continue; let p = s.userData.p = (s.userData.p + dt * .45) % 1; s.position.set(x + Math.sin(p * 9 + s.id) * .05, y + p * .55, z + Math.cos(p * 7 + s.id) * .05); s.scale.setScalar(.1 + p * .3); s.material.opacity = Math.sin(p * Math.PI) * .45; } } };
}

// small looping and one-shot sounds for the house (water, sizzling, the fridge); the Sound button mutes them
const sfx = (() => {
  let ctx = null, out = null, nb = null;
  function init() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      out = ctx.createGain(); out.gain.value = settings.sound ? .5 : 0; out.connect(ctx.destination);
      nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const api = {
    setMuted(m) { if (out) out.gain.value = m ? 0 : .5; },
    loop(kind) {
      if (!init()) return { stop() { } };
      const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true;
      const f = ctx.createBiquadFilter(), g = ctx.createGain(); g.gain.value = 0;
      let target = .2, extra = [], timer = null;
      if (kind === 'water') { f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = .6; target = .32; const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 6.5; lg.gain.value = 380; l.connect(lg); lg.connect(f.frequency); l.start(); extra.push(l); }
      else if (kind === 'shower') { f.type = 'highpass'; f.frequency.value = 700; target = .3; }
      else if (kind === 'sizzle') {
        f.type = 'highpass'; f.frequency.value = 3200; target = .12;
        timer = setInterval(() => { const t0 = ctx.currentTime + Math.random() * .05, s2 = ctx.createBufferSource(), g2 = ctx.createGain(), f2 = ctx.createBiquadFilter(); s2.buffer = nb; f2.type = 'highpass'; f2.frequency.value = 2000 + Math.random() * 4000; g2.gain.setValueAtTime(.25 * Math.random(), t0); g2.gain.exponentialRampToValueAtTime(.0001, t0 + .02); s2.connect(f2); f2.connect(g2); g2.connect(out); s2.start(t0, Math.random()); s2.stop(t0 + .03); }, 45);
      } else if (kind === 'hum') { f.type = 'lowpass'; f.frequency.value = 160; target = .25; const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 58; const og = ctx.createGain(); og.gain.value = .05; o.connect(og); og.connect(g); o.start(); extra.push(o); }
      src.connect(f); f.connect(g); g.connect(out); src.start(); g.gain.setTargetAtTime(target, ctx.currentTime, .12);
      return { stop() { g.gain.setTargetAtTime(0, ctx.currentTime, .1); clearInterval(timer); setTimeout(() => { try { src.stop(); extra.forEach(e => e.stop()); } catch (e) { } g.disconnect(); }, 700); } };
    },
    hit(freq, dur, vol = .3, type = 'sine') {
      if (!init()) return; const t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t0); o.frequency.exponentialRampToValueAtTime(freq * .5, t0 + dur);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + .02);
    },
    click() { api.hit(2400, .03, .12, 'square'); },
    pop() { if (!init()) return; const t0 = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nb; f.type = 'lowpass'; f.frequency.value = 600; g.gain.setValueAtTime(.5, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + .12); s.connect(f); f.connect(g); g.connect(out); s.start(t0); s.stop(t0 + .14); },
    // an original suspense cue: low drone, heartbeat drums, creeping tremolo strings that swell for `dur` seconds
    ominous(dur) {
      if (!init()) return { stop() { } };
      const t0 = ctx.currentTime + .05, bus = ctx.createGain(); bus.gain.setValueAtTime(.0001, t0); bus.gain.linearRampToValueAtTime(.55, t0 + 1.5); bus.connect(out);
      const nodes = [], hz = m => 440 * Math.pow(2, (m - 69) / 12);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(260, t0); lp.connect(bus);
      for (const [m, v] of [[26, .18], [38, .12], [39, .05]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = (Math.random() - .5) * 8; g.gain.value = v; o.connect(g); g.connect(lp); o.start(t0); nodes.push(o); }
      const sl = ctx.createBiquadFilter(); sl.type = 'lowpass'; sl.frequency.setValueAtTime(500, t0); sl.frequency.exponentialRampToValueAtTime(2400, t0 + dur); sl.connect(bus);
      const trem = ctx.createGain(); trem.gain.setValueAtTime(.0001, t0); trem.gain.exponentialRampToValueAtTime(.09, t0 + dur); trem.connect(sl);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 9; lg.gain.value = .045; lfo.connect(lg); lg.connect(trem.gain); lfo.start(t0); nodes.push(lfo);
      for (const m of [50, 53, 56, 62]) for (const det of [-6, 6]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(hz(m), t0); o.frequency.linearRampToValueAtTime(hz(m + 1), t0 + dur); o.detune.value = det; o.connect(trem); o.start(t0); nodes.push(o); }
      for (let b = 0; b < dur; b += 1.25) for (const [d, v] of [[0, .5], [.22, .32]]) {
        const tt = t0 + b + d, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(70, tt); o.frequency.exponentialRampToValueAtTime(38, tt + .3);
        g.gain.setValueAtTime(.0001, tt); g.gain.linearRampToValueAtTime(v * (.6 + b / dur * .6), tt + .01); g.gain.exponentialRampToValueAtTime(.0001, tt + .5); o.connect(g); g.connect(bus); o.start(tt); o.stop(tt + .55);
      }
      // a final low hit as they reach the roof
      { const tt = t0 + dur - .2, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(55, tt); o.frequency.exponentialRampToValueAtTime(30, tt + 1.6); g.gain.setValueAtTime(.0001, tt); g.gain.linearRampToValueAtTime(.7, tt + .02); g.gain.exponentialRampToValueAtTime(.0001, tt + 2.2); o.connect(g); g.connect(bus); o.start(tt); o.stop(tt + 2.3); }
      bus.gain.setValueAtTime(.55, t0 + dur); bus.gain.exponentialRampToValueAtTime(.0001, t0 + dur + 3);
      const end = () => { try { nodes.forEach(n => n.stop()); } catch (e) { } bus.disconnect(); };
      const timer = setTimeout(end, (dur + 3.2) * 1000);
      return { stop() { clearTimeout(timer); bus.gain.cancelScheduledValues(ctx.currentTime); bus.gain.setTargetAtTime(.0001, ctx.currentTime, .3); setTimeout(end, 1500); } };
    },
    // an original 80s arcade-style "monster stomp": square bass riff, pulse lead, noise drums, looping until stopped
    stomp() {
      if (!init()) return { stop() { } };
      const bus = ctx.createGain(); bus.gain.value = .0001; bus.gain.setTargetAtTime(.32, ctx.currentTime, .3); bus.connect(out);
      const hz = m => 440 * Math.pow(2, (m - 69) / 12), S = 60 / 140 / 2; // eighth notes at 140 BPM
      const roots = [40, 40, 36, 35], riff = [0, 0, 3, 0, 5, 0, 6, 7];
      const lead = [[64, 0, 67, 0, 69, 70, 71, 0], [71, 69, 67, 64, 62, 0, 64, 0], [72, 0, 71, 0, 67, 0, 64, 0], [63, 0, 66, 0, 69, 0, 71, 71]];
      const note = (type, f, t, d, v, duty) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + .02); };
      const drum = (kind, t) => {
        if (kind === 'k') { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + .12); g.gain.setValueAtTime(.9, t); g.gain.exponentialRampToValueAtTime(.0001, t + .16); o.connect(g); g.connect(bus); o.start(t); o.stop(t + .18); return; }
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nb; f.type = kind === 's' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 's' ? 1800 : 7000;
        g.gain.setValueAtTime(kind === 's' ? .55 : .14, t); g.gain.exponentialRampToValueAtTime(.0001, t + (kind === 's' ? .14 : .04)); s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + .16);
      };
      let step = 0, next = ctx.currentTime + .1;
      const timer = setInterval(() => {
        while (next < ctx.currentTime + .25) {
          const bar = Math.floor(step / 8) % 4, i = step % 8;
          note('square', hz(roots[bar] + riff[i]), next, S * .9, .22);
          if (lead[bar][i]) note('square', hz(lead[bar][i]), next, S * .85, .1);
          if (i % 4 === 0) drum('k', next); if (i % 4 === 2) drum('s', next); drum('h', next);
          step++; next += S;
        }
      }, 60);
      return { stop() { clearInterval(timer); bus.gain.setTargetAtTime(.0001, ctx.currentTime, .25); setTimeout(() => bus.disconnect(), 1500); } };
    },
    crash() {
      if (!init()) return; const t0 = ctx.currentTime;
      api.hit(55, .7, 1.0); api.hit(110, .35, .6, 'square');
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nb; f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t0); f.frequency.exponentialRampToValueAtTime(300, t0 + .8);
      g.gain.setValueAtTime(.9, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + .9); s.connect(f); f.connect(g); g.connect(out); s.start(t0); s.stop(t0 + .95);
      for (let i = 0; i < 18; i++) { const tt = t0 + .05 + Math.random() * .6, o = ctx.createOscillator(), gg = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 2500 + Math.random() * 3500; gg.gain.setValueAtTime(.12, tt); gg.gain.exponentialRampToValueAtTime(.0001, tt + .08); o.connect(gg); gg.connect(out); o.start(tt); o.stop(tt + .1); }
    },
    alarm(sec) {
      if (!init()) return; const t0 = ctx.currentTime + .4;
      for (let b = 0; b < sec / .5; b++) { const tt = t0 + b * .5, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(b % 2 ? 620 : 880, tt); g.gain.setValueAtTime(.0001, tt); g.gain.linearRampToValueAtTime(.08, tt + .02); g.gain.setValueAtTime(.08, tt + .3); g.gain.linearRampToValueAtTime(.0001, tt + .35); o.connect(g); g.connect(out); o.start(tt); o.stop(tt + .4); }
    },
    whoosh() { if (!init()) return; const t0 = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nb; f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(1800, t0 + .5); f.frequency.exponentialRampToValueAtTime(400, t0 + 1.2); g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(.5, t0 + .4); g.gain.exponentialRampToValueAtTime(.0001, t0 + 1.3); s.connect(f); f.connect(g); g.connect(out); s.start(t0); s.stop(t0 + 1.35); },
    roar(p = 1) {
      if (!init()) return; const t0 = ctx.currentTime, o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), s = ctx.createBufferSource(), sg = ctx.createGain();
      o.type = 'sawtooth'; o2.type = 'square'; o.frequency.setValueAtTime(120 * p, t0); o.frequency.exponentialRampToValueAtTime(55 * p, t0 + 1.3); o2.frequency.setValueAtTime(83 * p, t0); o2.frequency.exponentialRampToValueAtTime(41 * p, t0 + 1.3);
      f.type = 'lowpass'; f.frequency.setValueAtTime(900, t0); f.frequency.exponentialRampToValueAtTime(250, t0 + 1.3);
      g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(.35, t0 + .12); g.gain.exponentialRampToValueAtTime(.0001, t0 + 1.4);
      s.buffer = nb; sg.gain.value = .5; s.connect(sg); sg.connect(f); o.connect(f); o2.connect(f); f.connect(g); g.connect(out);
      for (const n of [o, o2, s]) { n.start(t0); n.stop(t0 + 1.45); }
    },
    fizz() { if (!init()) return; const t0 = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nb; f.type = 'highpass'; f.frequency.value = 4000; g.gain.setValueAtTime(.35, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + .6); s.connect(f); f.connect(g); g.connect(out); s.start(t0); s.stop(t0 + .62); }
  };
  return api;
})();

// a notice near the top of the screen
let toastTimer = null;
function toast(msg, ms = 2600) { const el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, ms); }

// ---- the kitchen appliances
const kitchen = { fridgeDoor: null, fridgeOpen: 0, fridgeTarget: 0, fridgeHum: null, burners: [], stoveOn: false, stoveT: 0, pancakes: null, steam: null, sizzle: null, sink: null };
function buildKitchenWorks() {
  // fridge interior (lit shelves of drinks) behind a hinged door
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(.66, 1.72), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(200, 520, (g, w, h) => {
    g.fillStyle = '#eef6fb'; g.fillRect(0, 0, w, h); g.fillStyle = '#cfe0ea'; g.fillRect(0, 150, w, 6);
    const r = rng(33);
    for (const y of [120, 250, 370, 490]) { g.fillStyle = '#b8ccd8'; g.fillRect(6, y, w - 12, 5); }
    for (const [y, hh] of [[250, 60], [370, 70], [490, 80]]) for (let x = 14; x < w - 24;) { const ww = 18 + r() * 16; g.fillStyle = ['#c81e1e', '#1e5ac8', '#2aa84a', '#f2c230', '#ffffff', '#e86a1a'][Math.floor(r() * 6)]; g.fillRect(x, y - hh * (.6 + r() * .4), ww, hh * (.6 + r() * .4)); x += ww + 5; }
    g.fillStyle = '#9fd8ff'; for (let i = 0; i < 10; i++) g.fillRect(12 + i * 18, 60 + (i % 3) * 10, 14, 40);
  }) }));
  inner.position.set(5.12, .93, -5.45); inner.rotation.y = -Math.PI / 2; scene.add(inner);
  const door = new THREE.Group(); door.position.set(5.105, 0, -5.08); scene.add(door);
  const dm = new THREE.Mesh(new THREE.BoxGeometry(.05, 1.82, .74), MAT.steel); dm.position.set(0, .925, -.37); dm.castShadow = true; door.add(dm);
  const hdl = new THREE.Mesh(new THREE.BoxGeometry(.03, .55, .03), MAT.dark); hdl.position.set(-.05, 1.05, -.66); door.add(hdl);
  const seam = new THREE.Mesh(new THREE.BoxGeometry(.052, .012, .74), MAT.dark); seam.position.set(0, 1.3, -.37); door.add(seam);
  kitchen.fridgeDoor = door;
  // stove burners, knobs, a pan
  for (const [dx, dz] of [[-.12, -.15], [-.12, .15], [.12, -.15], [.12, .15]]) {
    const b = new THREE.Mesh(new THREE.TorusGeometry(.075, .012, 8, 28), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0xff3a10, emissiveIntensity: 0, roughness: .6 }));
    b.rotation.x = Math.PI / 2; b.position.set(5.6 + dx, .965, -2.4 + dz); scene.add(b); kitchen.burners.push(b);
  }
  for (let i = 0; i < 4; i++) { const k = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .03, 14), MAT.dark); k.rotation.z = Math.PI / 2; k.position.set(5.28, .82, -2.62 + i * .14); scene.add(k); }
  const pan = new THREE.Mesh(new THREE.CylinderGeometry(.13, .11, .045, 24), M(0x1d1d1f, { roughness: .4, metalness: .5 })); pan.position.set(5.48, .99, -2.55); pan.castShadow = true; scene.add(pan);
  const ph = new THREE.Mesh(new THREE.BoxGeometry(.22, .02, .03), MAT.dark); ph.position.set(5.26, 1.0, -2.55); scene.add(ph);
  kitchen.pancakes = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .03, 20), M(0xc98a3a, { roughness: .8 })); kitchen.pancakes.position.set(5.48, 1.02, -2.55); kitchen.pancakes.visible = false; scene.add(kitchen.pancakes);
  kitchen.steam = steamPuffs(5.48, 1.05, -2.55);
  kitchen.sink = faucet(5.86, .945, -4.0);
  spots.push({ lvl: 0, x: 4.85, z: -5.35, r: .7, p1: 'PRESS E TO OPEN THE FRIDGE', label: () => 'Grab a cold drink', act: useFridge });
  spots.push({ lvl: 0, x: 4.85, z: -2.45, r: .7, p1: () => kitchen.stoveOn ? 'PRESS E TO TURN OFF THE STOVE' : 'PRESS E TO COOK', label: () => kitchen.stoveOn ? 'Turn off the stove' : 'Make pancakes', act: useStove });
  spots.push({ lvl: 0, x: 4.85, z: -4.0, r: .65, p1: 'PRESS E TO USE THE SINK', label: () => kitchen.sink.on ? 'Turn off the water' : 'Run the water', act: () => kitchen.sink.toggle() });
  spots.push({ lvl: 0, x: -3.9, z: -3.0, r: 1.8, p1: 'PRESS E TO SIT ON THE COUCH', label: () => 'Sit down and watch TV', act: () => restAt('couch') });
}
let canTimer = null;
function useFridge() {
  if (kitchen.fridgeTarget) return;
  kitchen.fridgeTarget = 1; sfx.pop(); kitchen.fridgeHum = sfx.loop('hum');
  setTimeout(() => { holdCan(9000); sfx.fizz(); toast('You grab a cold soda from the fridge.'); }, 700);
  setTimeout(() => { kitchen.fridgeTarget = 0; if (kitchen.fridgeHum) { kitchen.fridgeHum.stop(); kitchen.fridgeHum = null; } setTimeout(() => sfx.hit(90, .15, .4), 600); }, 2600);
}
function holdCan(ms) {
  const hand = boy.bones && boy.bones.RightHand; if (!hand) return;
  if (kitchen.can) kitchen.can.parent && kitchen.can.parent.remove(kitchen.can);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(.033, .033, .12, 16), M(0xc81e1e, { metalness: .7, roughness: .3 }));
  const s = hand.getWorldScale(new THREE.Vector3()).x || 1; can.scale.setScalar(1 / s);
  can.rotation.z = Math.PI / 2; can.position.set(.03 / s, .08 / s, .03 / s); hand.add(can); kitchen.can = can;
  clearTimeout(canTimer); canTimer = setTimeout(() => { if (can.parent) can.parent.remove(can); }, ms);
}
function useStove() {
  kitchen.stoveOn = !kitchen.stoveOn; sfx.click();
  kitchen.burners.forEach((b, i) => b.material.emissiveIntensity = kitchen.stoveOn && i === 0 ? 2.4 : 0);
  kitchen.steam.set(kitchen.stoveOn);
  if (kitchen.stoveOn) { kitchen.stoveT = 0; kitchen.pancakes.visible = false; kitchen.sizzle = sfx.loop('sizzle'); toast('Burner on. Pancakes in the pan...'); }
  else { if (kitchen.sizzle) { kitchen.sizzle.stop(); kitchen.sizzle = null; } }
}
function tickHouse(dt, t) {
  kitchen.fridgeOpen += (kitchen.fridgeTarget - kitchen.fridgeOpen) * Math.min(1, dt * 5);
  if (kitchen.fridgeDoor) kitchen.fridgeDoor.rotation.y = kitchen.fridgeOpen * 1.75;
  if (kitchen.stoveOn) {
    kitchen.stoveT += dt;
    kitchen.burners[0].material.emissiveIntensity = 2.2 + Math.sin(t * 7) * .25;
    if (kitchen.stoveT > 5 && !kitchen.pancakes.visible) { kitchen.pancakes.visible = true; toast('Pancakes are ready!'); }
  }
  kitchen.steam && kitchen.steam.tick(dt);
  for (const f of faucets) f.tick(t);
  shower.tick(dt);
  tickCar(dt);
}

// ---- resting: the couch, the bed, the shower
const SEATS = {
  couch: { pos: V3(-3.86, 0, -2.8), yaw: -Math.PI / 2, sit: 1, lvl: 0, tv: 'living', cam: { pos: V3(-2.45, 1.62, -2.05), look: V3(-5.7, 1.0, -3.05) } },
  bed: { pos: V3(-3, F2 + .76, -9.7), yaw: 0, lie: 1, lvl: 1, tv: 'bed', cam: { pos: V3(-3.3, F2 + 2.05, -11.25), look: V3(-3, F2 + 1.0, -6.3) } },
  shower: { pos: V3(5.3, F2 + .06, -.65), yaw: -Math.PI / 2, lvl: 1, cam: { pos: V3(5.0, F2 + 1.85, -3.1), look: V3(5.3, F2 + 1.15, -.7) } }
};
let rest = null, lieT = 0, lieTarget = 0;
function restAt(kind) {
  if (mode !== 'walk' && mode !== 'auto') return;
  const s = SEATS[kind];
  rest = { kind, s, from: boy.pos.clone(), fromYaw: boy.yaw, t: 0, leaving: false };
  mode = 'rest'; autoPath = null; $('#prompt').hidden = true; $('#objective').hidden = true; setAnim('Idle', .3);
  camTween = { t: 0, pts: [camera.position.clone(), s.cam.pos.clone()], look: [lookCur.clone(), s.cam.look.clone()], dur: 1.3 };
  if (kind === 'shower') setTimeout(() => { if (rest && rest.kind === 'shower' && !rest.leaving) shower.set(true); }, 900);
  if (kind === 'bed') toast('Click the TV to watch Everybody Loves JT. Press E to get up.', 3600);
  if (kind === 'couch' && !tvActive) toast('Click the TV to watch Everybody Loves JT. Press E to get up.', 3600);
}
function leaveRest() {
  if (!rest || rest.leaving) return;
  rest.leaving = true; rest.t = 0; sitTarget = 0; lieTarget = 0;
  if (rest.kind === 'shower') { shower.set(false); toast('Fresh and clean.'); }
  camTween = null;
}
function updateRest(dt) {
  if (!rest) return;
  rest.t += dt;
  const k = ease(Math.min(1, rest.t / .9)), s = rest.s;
  const a = rest.leaving ? s.pos : rest.from, b = rest.leaving ? rest.from : s.pos;
  boy.pos.lerpVectors(a, b, k);
  let y0 = rest.leaving ? s.yaw : rest.fromYaw, y1 = rest.leaving ? rest.fromYaw : s.yaw;
  let dy = Math.atan2(Math.sin(y1 - y0), Math.cos(y1 - y0)); boy.yaw = y0 + dy * Math.min(1, k * 1.6);
  if (!rest.leaving && k > .45) { sitTarget = s.sit || 0; lieTarget = s.lie || 0; }
  if (rest.leaving && rest.t > .95) { boy.pos.y = floorY(boy.pos, rest.from.y); rest = null; mode = 'walk'; houseMusic(); }
  const pr = $('#prompt');
  pr.hidden = !rest || rest.leaving;
  if (!pr.hidden) {
    $('#prompt-p1').textContent = rest.kind === 'shower' ? 'PRESS E TO STEP OUT' : 'PRESS E TO GET UP';
    $('#prompt-sit').textContent = rest.kind === 'shower' ? 'Turn off the water' : (tvActive === s.tv ? 'Turn off the TV' : 'Watch TV');
  }
}

// ---- the TVs: "Everybody Loves JT"
const show = createTVShow();
const showTex = new THREE.CanvasTexture(show.canvas); showTex.colorSpace = THREE.SRGBColorSpace;
let tvActive = null;
function tvOn(which) {
  if (tvActive && tvActive !== which) tvs[tvActive].mesh.material.map = tvs[tvActive].idle;
  tvActive = which; tvs[which].mesh.material.map = showTex;
  show.setMuted(!settings.sound); show.start(); showTex.needsUpdate = true;
  $('#tvbar').hidden = false; $('#objective').hidden = true; houseMusic();
}
function tvOff() {
  if (!tvActive) return;
  tvs[tvActive].mesh.material.map = tvs[tvActive].idle; tvActive = null;
  show.stop(); $('#tvbar').hidden = true; closeTvFull(); houseMusic();
}
function clickTV(which) {
  if (tvActive === which) { tvOff(); return; }
  tvOn(which);
  // sit down to watch when he's in the same room and on his feet
  const tv = tvs[which], p = boy.pos, lv = lvlOf(p.y);
  const sameRoom = which === 'living' ? (lv === 0 && p.z > -6 && p.x < 2.6 && inside(p)) : (lv === 1 && p.x < 2);
  if (sameRoom && (mode === 'walk' || mode === 'auto')) restAt(tv.seat);
}
const tvFull = $('#tvfull'), tvFullCtx = $('#tvfull-c').getContext('2d');
function openTvFull() { if (!tvActive) return; tvFull.hidden = false; tvFullCtx.drawImage(show.canvas, 0, 0); window.toggleFullscreen && !document.fullscreenElement && window.toggleFullscreen(tvFull); }
function closeTvFull() { if (tvFull.hidden) return; if (document.fullscreenElement === tvFull) try { document.exitFullscreen(); } catch (e) { } tvFull.hidden = true; }
$('#tv-full').addEventListener('click', openTvFull);
$('#tv-off').addEventListener('click', tvOff);
$('#tvfull-close').addEventListener('click', closeTvFull);
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !tvFull.hidden) tvFull.hidden = true; });

// ---------------------------------------------------------------- the game room
const PC = { chair: new THREE.Vector3(-3, 0, -10.45), stand: new THREE.Vector3(-3, 0, -9.85), screen: new THREE.Vector3(), screenNormal: new THREE.Vector3(0, 0, 1), screenW: .36, screenH: .27 };
let monitorTex = null, chair = null;
const cabinets = [], clickCabs = [];
function neonTex(text, color, w = 1024, h = 256, font = '400 150px "Monoton", "Audiowide", sans-serif') {
  return canvasTex(w, h, (g) => {
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font;
    for (const [blur, a] of [[40, .9], [18, 1], [6, 1]]) { g.shadowColor = color; g.shadowBlur = blur; g.fillStyle = color; g.globalAlpha = a; g.fillText(text, w / 2, h / 2); }
    g.shadowBlur = 0; g.globalAlpha = 1; g.fillStyle = '#fff'; g.fillText(text, w / 2, h / 2);
  });
}
function posterTex(title, sub, c1, c2, seed) {
  return canvasTex(400, 560, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(seed); for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${r() * .8})`; g.fillRect(r() * w, r() * h * .7, 2, 2); }
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; for (let y = h * .6; y < h; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '400 54px "Audiowide", Impact, sans-serif'; g.shadowColor = '#000'; g.shadowBlur = 12;
    title.split('\n').forEach((t, i) => g.fillText(t, w / 2, 120 + i * 62));
    g.font = '400 22px "Press Start 2P", monospace'; g.fillStyle = '#ffd24a'; g.fillText(sub, w / 2, h - 40);
  });
}
function cabinet(x, z, ry, title, body, c1, seed) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  const bm = M(body, { roughness: .5 });
  const sideShape = new THREE.Shape(); sideShape.moveTo(0, 0); sideShape.lineTo(.75, 0); sideShape.lineTo(.75, 1.85); sideShape.lineTo(.35, 1.85); sideShape.lineTo(.25, 1.55); sideShape.lineTo(.05, 1.15); sideShape.lineTo(-.02, .95); sideShape.lineTo(0, 0);
  for (const sx of [-.33, .31]) { const s = new THREE.Mesh(new THREE.ExtrudeGeometry(sideShape, { depth: .02, bevelEnabled: false }), bm); s.rotation.y = -Math.PI / 2; s.position.set(sx + .02, 0, -.35); s.castShadow = true; g.add(s); }
  const front = (w, h, d, px, py, pz, rx, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || bm); m.position.set(px, py, pz); m.rotation.x = rx || 0; m.castShadow = true; g.add(m); return m; };
  front(.62, .95, .7, 0, .475, 0);
  front(.62, .1, .3, 0, 1.0, .2, -.3, MAT.dark);
  const scrTex = canvasTex(256, 320, () => { });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.5, .48), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false })); scr.position.set(0, 1.38, .15); scr.rotation.x = -.38; g.add(scr);
  front(.62, .6, .6, 0, 1.4, -.15, 0, bm);
  const mq = new THREE.Mesh(new THREE.PlaneGeometry(.58, .2), new THREE.MeshStandardMaterial({ map: canvasTex(512, 160, (gg, w, h) => { gg.fillStyle = c1; gg.fillRect(0, 0, w, h); gg.fillStyle = '#fff'; gg.font = '400 68px "Audiowide", Impact, sans-serif'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.shadowColor = '#000'; gg.shadowBlur = 10; gg.fillText(title, w / 2, h / 2); }), emissive: 0xffffff, emissiveIntensity: .5 }));
  mq.material.emissiveMap = mq.material.map; mq.position.set(0, 1.76, .16); g.add(mq);
  front(.62, .25, .4, 0, 1.73, -.05);
  const stick = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), M(0xd8202a)); stick.position.set(-.12, 1.1, .3); g.add(stick);
  for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .02, 12), M(i ? 0xffd200 : 0x2a8cff)); b.position.set(.06 + i * .09, 1.07, .27); b.rotation.x = -.3; g.add(b); }
  const wc = new THREE.Vector3(0, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(g.position);
  colliders.push({ minX: wc.x - .45, maxX: wc.x + .45, minZ: wc.z - .45, maxZ: wc.z + .45 });
  g.updateMatrixWorld(true);
  const info = { title, color: c1, group: g, ry, front: g.localToWorld(new THREE.Vector3(0, 0, .85)), screen: scr.getWorldPosition(new THREE.Vector3()),
    normal: new THREE.Vector3(0, Math.sin(.38), Math.cos(.38)).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry) };
  info.front.y = 0;
  clickCabs.push([g, info]);
  const r = rng(seed);
  const dots = Array.from({ length: 40 }, () => [r() * 256, r() * 320, r()]);
  screens.push({ tex: scrTex, every: 2, draw: (gg, w, h, t) => {
    gg.fillStyle = '#000'; gg.fillRect(0, 0, w, h);
    for (const d of dots) { d[1] = (d[1] + d[2] * 3) % h; gg.fillStyle = `rgba(255,255,255,${.3 + d[2] * .7})`; gg.fillRect(d[0], d[1], 2, 2); }
    gg.textAlign = 'center'; gg.fillStyle = c1; gg.font = '400 26px "Press Start 2P", monospace'; gg.fillText(title, w / 2, 110);
    if (Math.floor(t * 2) % 2) { gg.fillStyle = '#fff'; gg.font = '400 12px "Press Start 2P", monospace'; gg.fillText('INSERT COIN', w / 2, 220); }
    gg.fillStyle = '#38f4ff'; gg.font = '400 10px "Press Start 2P", monospace'; gg.fillText('HI 024770', w / 2, 30);
  } });
  return info;
}
function buildGameRoom() {
  // rug, LED strips, neon sign
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3), M(0xffffff, { map: TEX.arcadeRug(), roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(-3, .026, -9); rug.receiveShadow = true; scene.add(rug);
  const led = (c, w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, .03, d), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); m.position.set(x, H.h - .04, z); scene.add(m); };
  led(0xc23bff, 5.8, .03, -3, -11.86); led(0xc23bff, 5.8, .03, -3, -6.12); led(0x38d4ff, .03, 5.8, -5.86, -9); led(0x38d4ff, .03, 5.8, -.12, -9);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .6), new THREE.MeshBasicMaterial({ map: neonTex('GAME ROOM', '#ff3be0'), transparent: true, toneMapped: false, depthWrite: false }));
  sign.position.set(-3, 2.2, -11.88); scene.add(sign);
  // door sign on the living-room side
  const ds = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .25), new THREE.MeshBasicMaterial({ map: neonTex('PLAYER 1', '#38f4ff', 1024, 256, '400 120px "Press Start 2P", monospace'), transparent: true, toneMapped: false, depthWrite: false }));
  ds.position.set(-3, 2.42, -5.92); scene.add(ds);
  // desk against the back wall
  const deskZ = -11.55;
  box(1.8, .05, .8, MAT.walnut, -3, .75, deskZ, { collide: true });
  box(.05, .73, .76, MAT.dark, -3.86, .365, deskZ); box(.05, .73, .76, MAT.dark, -2.14, .365, deskZ);
  box(1.7, .3, .03, MAT.dark, -3, .55, deskZ - .37);
  // CRT monitor
  const mon = new THREE.Group(); mon.position.set(-3, .775, deskZ - .02); scene.add(mon);
  const beige = MAT.beige;
  const mb = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), beige); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; mon.add(m); clickables.push(m); return m; };
  mb(.28, .03, .26, 0, .015, 0); mb(.12, .05, .1, 0, .05, 0);
  mb(.46, .38, .1, 0, .3, .12);               // front bezel
  const back = new THREE.Mesh(new THREE.BoxGeometry(.38, .3, .32), beige); back.position.set(0, .3, -.08); back.castShadow = true; mon.add(back);
  monitorTex = canvasTex(800, 600, () => { });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(PC.screenW, PC.screenH), new THREE.MeshBasicMaterial({ map: monitorTex, toneMapped: false }));
  scr.position.set(0, .31, .171); mon.add(scr); clickables.push(scr);
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(.05, .012), new THREE.MeshBasicMaterial({ color: 0x55ff77 })); badge.position.set(.17, .135, .171); mon.add(badge);
  mon.updateMatrixWorld(true); scr.getWorldPosition(PC.screen);
  // keyboard, mouse, mousepad, speakers, tower, joystick, mug, lamp
  const kb = box(.46, .025, .16, M(0xd5ccb6, { roughness: .6 }), -3.02, .79, deskZ + .28);
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(.43, .13), new THREE.MeshStandardMaterial({ map: canvasTex(430, 130, (g, w, h) => { g.fillStyle = '#cfc6af'; g.fillRect(0, 0, w, h); g.fillStyle = '#ece5d2'; for (let r = 0; r < 5; r++) for (let c = 0; c < 18; c++) g.fillRect(4 + c * 23.6, 6 + r * 24.5, 20, 20); }), roughness: .6 }));
  keys.rotation.x = -Math.PI / 2; keys.position.set(-3.02, .804, deskZ + .28); scene.add(keys);
  box(.24, .004, .2, M(0x1b2a6b), -2.6, .777, deskZ + .28);
  box(.06, .03, .1, M(0xd5ccb6), -2.6, .79, deskZ + .28);
  for (const x of [-3.42, -2.58]) { box(.1, .18, .1, MAT.beige, x, .865, deskZ - .1); }
  const tower = box(.2, .46, .46, MAT.beige, -2.32, .23, deskZ + .02, { collide: false });
  const tf = new THREE.Mesh(new THREE.PlaneGeometry(.2, .46), new THREE.MeshStandardMaterial({ map: canvasTex(200, 460, (g, w, h) => { g.fillStyle = '#d9d0bb'; g.fillRect(0, 0, w, h); g.fillStyle = '#bdb39c'; g.fillRect(20, 30, 160, 34); g.fillRect(20, 76, 160, 34); g.fillStyle = '#9a917c'; g.fillRect(30, 140, 140, 10); g.fillStyle = '#3a3a3a'; g.fillRect(60, 144, 80, 3); g.fillStyle = '#4caf50'; g.fillRect(40, 380, 10, 6); g.fillStyle = '#ff9800'; g.fillRect(40, 396, 10, 6); g.fillStyle = '#8f8670'; g.beginPath(); g.arc(150, 395, 16, 0, 6.28); g.fill(); g.fillStyle = '#444'; g.font = '700 16px Arial'; g.fillText('PENTIUM III', 50, 250); }), roughness: .55 }));
  tf.position.set(-2.32, .23, deskZ + .251); scene.add(tf); clickables.push(tower, tf);
  const stick = box(.34, .06, .16, MAT.black, -3.6, .805, deskZ + .2);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.024, 12, 8), M(0xd8202a, { roughness: .3 })); ball.position.set(-3.7, .9, deskZ + .2); scene.add(ball);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .06, 6), MAT.steel); shaft.position.set(-3.7, .86, deskZ + .2); scene.add(shaft);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .012, 12), M([0x2a8cff, 0xffd200, 0x22c55e][i])); b.position.set(-3.58 + i * .05, .84, deskZ + .2); scene.add(b); }
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(.04, .035, .1, 16), M(0x234b8c)); mug.position.set(-2.45, .825, deskZ + .1); mug.castShadow = true; scene.add(mug);
  // office chair
  chair = new THREE.Group(); chair.position.copy(PC.chair); scene.add(chair);
  const cm = M(0x1b1b1f, { roughness: .6 }), cmFab = M(0x2b2d3a, { roughness: 1 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.5, .08, .48), cmFab); seat.position.y = .48; seat.castShadow = true; chair.add(seat);
  const bk = new THREE.Mesh(new THREE.BoxGeometry(.48, .62, .07), cmFab); bk.position.set(0, .86, .25); bk.rotation.x = -.08; bk.castShadow = true; chair.add(bk);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .38, 10), MAT.steel); pole.position.y = .25; chair.add(pole);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const leg = new THREE.Mesh(new THREE.BoxGeometry(.04, .03, .32), cm); leg.position.set(Math.sin(a) * .15, .06, Math.cos(a) * .15); leg.rotation.y = a; chair.add(leg); const w = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), cm); w.position.set(Math.sin(a) * .3, .03, Math.cos(a) * .3); chair.add(w); }
  for (const s of [-1, 1]) { const ar = new THREE.Mesh(new THREE.BoxGeometry(.05, .03, .3), cm); ar.position.set(s * .27, .7, .02); chair.add(ar); const as = new THREE.Mesh(new THREE.BoxGeometry(.03, .2, .03), cm); as.position.set(s * .27, .59, .08); chair.add(as); }
  chair.traverse(o => { if (o.isMesh) clickables.push(o); });
  // arcade cabinets along the west wall, posters, shelf of game boxes, beanbag, mini fridge
  // three playable cabinets: two classics on the west wall, the MILITARY machine on the east wall
  cabinets.push(Object.assign(cabinet(-5.45, -7.4, Math.PI / 2, 'PAC-MAN', 0xe9c21a, '#ffd200', 1), { games: [['pacman']] }));
  cabinets.push(Object.assign(cabinet(-5.45, -8.55, Math.PI / 2, 'GALAGA', 0x151515, '#38f4ff', 2), { games: [['galaga']] }));
  cabinets.push(Object.assign(cabinet(-.55, -8.55, -Math.PI / 2, 'MILITARY', 0x3b4a2a, '#c8a24a', 8), { menuTitle: 'MILITARY OPERATIONS', games: [
    ['afterburner2', 'Military flight'], ['game1942', 'Military flight'], ['game1943', 'Military flight'], ['carrierairwing', 'Military flight'],
    ['twincobra', 'Military flight'], ['raiden', 'Military flight'], ['skyshark', 'Military flight'],
    ['flightsim', 'Simulators'], ['f117a', 'Simulators'], ['sub688', 'Simulators'],
    ['falcon3', 'Simulators'], ['f15se3', 'Simulators'], ['comanche', 'Simulators'], ['acesofpacific', 'Simulators'], ['usnavyfighters', 'Simulators'],
    ['seawolf', 'Submarine'], ['battleshark', 'Submarine'], ['subroc3d', 'Submarine'],
    ['silentservice2', 'Submarine'], ['acesofthedeep', 'Submarine'], ['hunterkiller688', 'Submarine']] }));
  cabinets.push(Object.assign(cabinet(-.55, -7.3, -Math.PI / 2, 'SHOOTERS', 0x5a1414, '#ff5a2a', 9), { menuTitle: 'SHOOTERS', games: [
    ['wolf3d', 'First-person (PC)'], ['spearofdestiny', 'First-person (PC)'], ['doom', 'First-person (PC)'], ['doom2', 'First-person (PC)'],
    ['riseofthetriad', 'First-person (PC)'], ['blakestone', 'First-person (PC)'], ['heretic', 'First-person (PC)'], ['hexen', 'First-person (PC)'],
    ['duke3d', 'First-person (PC)'], ['quake', 'First-person (PC)'], ['blood', 'First-person (PC)'], ['shadowwarrior', 'First-person (PC)'],
    ['berzerk', 'Arcade'], ['frenzy', 'Arcade'], ['robotron', 'Arcade'], ['smashtv', 'Arcade'], ['totalcarnage', 'Arcade']] }));
  const posters = [['DEFENDER', '1980', '#0b1b4d', '#02040e', 4, -.07, -9.75], ['STREET\nFIGHTER II', '1991', '#3a1a5c', '#0c0418', 5, -.07, -10.8]];
  for (const [t, s, a, b, seed, x, z] of posters) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(.6, .84), new THREE.MeshStandardMaterial({ map: posterTex(t, s, a, b, seed), roughness: .5 })); p.position.set(x - .01, 1.6, z); p.rotation.y = -Math.PI / 2; scene.add(p);
    box(.02, .88, .64, MAT.black, x + .0, 1.6, z, { cast: false });
  }
  { const p = new THREE.Mesh(new THREE.PlaneGeometry(.6, .84), new THREE.MeshStandardMaterial({ map: posterTex('DONKEY\nKONG', '1981', '#5a0d12', '#1a0306', 3), roughness: .5 })); p.position.set(-1.25, 1.6, -6.085); p.rotation.y = Math.PI; scene.add(p); box(.64, .88, .02, MAT.black, -1.25, 1.6, -6.075, { cast: false }); }
  const mp = new THREE.Mesh(new THREE.PlaneGeometry(.7, .98), new THREE.MeshStandardMaterial({ map: posterTex('MAME32', '4,700+ GAMES', '#0b3a2e', '#020c08', 6), roughness: .5 })); mp.position.set(-5.06, 1.55, -11.88); scene.add(mp);
  box(.74, 1.02, .02, MAT.black, -5.06, 1.55, -11.9, { cast: false });
  // shelf with game boxes on the back-right
  box(1.2, .03, .3, MAT.oak, -1.0, 1.25, -11.82); box(1.2, .03, .3, MAT.oak, -1.0, 1.65, -11.82);
  const r = rng(7);
  for (const y of [1.265, 1.665]) for (let x = -1.55; x < -.45;) { const w = .035 + r() * .02, hh = .2 + r() * .04; box(w, hh, .17, M(new THREE.Color().setHSL(r(), .6, .35 + r() * .15), { roughness: .4 }), x, y + hh / 2, -11.8); x += w + .004; }
  // beanbag
  const bb = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 16), M(0x8a2be2, { roughness: .9 })); bb.scale.set(1, .55, 1); bb.position.set(-5.0, .27, -10.9); bb.castShadow = true; scene.add(bb);
  colliders.push({ minX: -5.45, maxX: -4.55, minZ: -11.35, maxZ: -10.45 });
  box(.5, .6, .5, M(0x1c1c1c, { roughness: .4 }), -.42, .3, -10.6, { collide: true });
  const fg = box(.42, .08, .02, M(0xff3be0, { emissive: 0xff3be0, emissiveIntensity: 1 }), -.42, .5, -10.34, { cast: false });
  plant(-.5, -11.5, .9);
  ceilingLamp(-3, -9); addLight(new THREE.PointLight(0xb46bff, 1, 8, 1.6), -3, 2.05, -8.6, 2.2, 3);
  addLight(new THREE.PointLight(0xffe0c0, 1, 5, 1.8), -3, 1.9, -10.4, 1.0, 1.4);
  const ml = new THREE.PointLight(0x7fb2ff, 1, 2.6, 1.8); ml.position.set(-3, 1.1, -11.1); scene.add(ml); indoorLights.push({ light: ml, day: 1.2, night: 1.6 });
}
function ceilingLamp(x, z, y = H.h) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(.22, .26, .06, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1d8, emissiveIntensity: .9 }));
  m.position.set(x, y - .03, z); scene.add(m);
}
function addLight(l, x, y, z, day, night) { l.position.set(x, y, z); scene.add(l); indoorLights.push({ light: l, day, night }); }

// ---------------------------------------------------------------- the guy (character + retargeted clips)
const boy = { root: new THREE.Group(), mixer: null, actions: {}, current: null, ready: false, pos: new THREE.Vector3(0, 0, 5), yaw: Math.PI, speed: 0 };
scene.add(boy.root);
// Dress him for a night of gaming: charcoal hoodie, jeans, white sneakers.
function fabricTex(base, seed, weave) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const r = rng(seed);
    for (let i = 0; i < 40000; i++) { const a = r() * .12; g.fillStyle = r() < .5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
    if (weave) { g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; for (let k = -h; k < w; k += 3) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); } }
  }, { repeat: [4, 4] });
}
function restyle(o) {
  const m = o.material, n = m.name || '';
  if (/Wolf3D_Skin|Wolf3D_Body/.test(n)) {
    // Olive / light-tan skin, remapped on the GPU while shading (the page's sandbox forbids reading
    // texture pixels back on the CPU). Average linear colours of the two source textures were measured offline.
    const avg = /Skin/.test(n) ? '.4248, .2051, .1777' : '.4851, .2270, .1845';
    m.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec3 avgC = vec3(${avg});
        float avgL = dot(avgC, vec3(.3, .59, .11));
        float L = dot(diffuseColor.rgb, vec3(.3, .59, .11));
        float k = clamp(L / avgL, 0.0, 1.45);
        diffuseColor.rgb = max(vec3(0.0), vec3(.7605, .491, .305) * pow(k, 1.15) + (diffuseColor.rgb - avgC * k) * .45);
      }`);
    };
    m.customProgramCacheKey = () => 'olive-skin-' + n;
  }
  if (/Outfit_Top/.test(n)) { m.map = fabricTex('#3d4450', 11, false); m.normalMap = null; m.roughnessMap = m.metalnessMap = null; m.roughness = .85; m.metalness = 0; m.color.set('#ffffff'); }
  else if (/Outfit_Bottom/.test(n)) { m.map = fabricTex('#2f4f7f', 12, true); m.roughnessMap = m.metalnessMap = null; m.roughness = .9; m.metalness = 0; m.color.set('#ffffff'); }
  else if (/Footwear/.test(n)) { m.map = null; m.roughnessMap = m.metalnessMap = null; m.color.set('#d8d8d8'); m.roughness = .6; m.metalness = 0; }
  m.needsUpdate = true;
}
// The source avatar wears a fedora over curly hair: drop the hat, then grow hair over the scalp.
function curlTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#140d09'; g.fillRect(0, 0, w, h);
    const r = rng(21);
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, y = r() * h, rr = 3 + r() * 6, l = 25 + r() * 35;
      g.strokeStyle = `hsl(22, ${25 + r() * 15}%, ${l * .28}%)`; g.lineWidth = 1.5 + r() * 1.5;
      g.beginPath(); g.arc(x, y, rr, r() * 6, r() * 6 + 4); g.stroke();
    }
  }, { repeat: [6, 6] });
}
function fixHair(model) {
  let head = null, hair = null;
  model.traverse(o => { if (o.isSkinnedMesh && /Wolf3D_Head$/.test(o.name)) head = o; if (o.isSkinnedMesh && o.material && /Headwear/.test(o.material.name)) hair = o; });
  if (!hair || !head) return;
  const hg = hair.geometry, hp = hg.attributes.position, hi = hg.index;
  if (hi) {
    const keep = [];
    for (let t = 0; t < hi.count; t += 3) {
      const a = hi.getX(t), b = hi.getX(t + 1), c = hi.getX(t + 2);
      if (Math.max(hp.getY(a), hp.getY(b), hp.getY(c)) < 1.745) keep.push(a, b, c);
    }
    hg.setIndex(keep);
  }
  const g = head.geometry.clone(), pos = g.attributes.position, nor = g.attributes.normal, idx = g.index;
  const isHair = i => { const y = pos.getY(i), z = pos.getZ(i), x = pos.getX(i); if (z < -0.035) return y > 1.66; if (z < 0.0) return y > 1.70; return y > 1.735 && !(z > 0.045 && y < 1.776) && !(Math.abs(x) > 0.072 && y < 1.758 && z > 0.0); };
  const keep = [];
  for (let t = 0; t < idx.count; t += 3) { const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2); if (isHair(a) && isHair(b) && isHair(c)) keep.push(a, b, c); }
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + nor.getX(i) * .009, pos.getY(i) + nor.getY(i) * .014, pos.getZ(i) + nor.getZ(i) * .009);
  g.setIndex(keep);
  for (const k of Object.keys(g.morphAttributes)) delete g.morphAttributes[k];
  const t = curlTex();
  const mat = new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 2.5, roughness: .75, color: 0xffffff });
  const cap = new THREE.SkinnedMesh(g, mat); cap.name = 'HairCap';
  cap.castShadow = true; cap.frustumCulled = false;
  head.parent.add(cap); cap.bind(head.skeleton, head.bindMatrix);
  hair.visible = false;
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
  constructor(parser) { this.parser = parser; this.name = 'ROOM_embedded_textures'; }
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
async function loadBoy(onProgress) {
  const loader = new GLTFLoader();
  loader.register(parser => new EmbeddedTextures(parser));
  const once = async (url, i) => {
    // the downloadable single-file version carries the models inline
    const inline = document.getElementById('model:' + url);
    let text;
    if (inline) text = inline.textContent;
    else { const res = await fetch(url); if (!res.ok) throw new Error(`HTTP ${res.status}`); text = await res.text(); }
    const glb = gltfJsonToGlb(text); onProgress(i, 1);
    return await new Promise((ok, fail) => loader.parse(glb, '', ok, fail));
  };
  const load = async (url, i) => {
    for (let a = 1; ; a++) {
      try { return await once(url, i); }
      catch (e) { if (a >= 3) throw new Error(`${url}: ${e && e.message || e}`); await new Promise(r => setTimeout(r, 600 * a)); }
    }
  };
  const safe = (label, fn) => { try { fn(); } catch (e) { console.warn('character step skipped:', label, e); } };
  const [avatar, anims] = await Promise.all([load('models/boy.json', 0), load('models/anims.json', 1)]);
  const model = avatar.scene;
  model.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      if (/Beard/i.test(o.name)) o.visible = false;
      if (o.material) { o.material.envMapIntensity = .6; safe('restyle ' + o.name, () => restyle(o)); }
    }
  });
  const bones = {}; model.traverse(o => { if (o.isBone) bones[o.name] = o; });
  // retarget the mocap clips (Mixamo rig) onto the avatar (same bone layout, no prefix).
  // The source rig sits under a rotated, scaled armature, so the hips track is moved into
  // world space and back into the avatar's hips-parent space.
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
  const ratio = aRest.y / sRest.y;
  boy.mixer = new THREE.AnimationMixer(model);
  const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3();
  for (const clip of anims.animations) {
    if (clip.name === 'TPose') continue;
    const tracks = [];
    for (const t of clip.tracks) {
      const name = t.name.replace('mixamorig', '');
      const [bone, prop] = name.split('.');
      if (!bones[bone]) continue;
      if (prop === 'position') {
        if (bone !== 'Hips') continue;
        const v = t.values.slice();
        for (let i = 0; i < v.length; i += 3) {
          tmpV.set(v[i], v[i + 1], v[i + 2]).applyMatrix4(MS);
          tmpV.set(aRest.x, tmpV.y * ratio, aRest.z).applyMatrix4(MAinv);
          v[i] = tmpV.x; v[i + 1] = tmpV.y; v[i + 2] = tmpV.z;
        }
        tracks.push(new THREE.VectorKeyframeTrack(name, t.times, v)); continue;
      }
      if (prop === 'quaternion') {
        const v = t.values.slice();
        if (bone === 'Hips') for (let i = 0; i < v.length; i += 4) {
          tmpQ.fromArray(v, i).premultiply(qFix).toArray(v, i);
        }
        tracks.push(new THREE.QuaternionKeyframeTrack(name, t.times, v));
      }
    }
    const c = new THREE.AnimationClip(clip.name, clip.duration, tracks);
    const a = boy.mixer.clipAction(c); a.enabled = true; a.setEffectiveWeight(0); a.play();
    boy.actions[clip.name] = a;
  }
  safe('hair', () => fixHair(model));
  // cut the tailcoat down to sweatshirt length
  safe('outfit', () => model.traverse(o => {
    if (!o.isSkinnedMesh || !/Outfit_Top/.test(o.material.name || '')) return;
    const g = o.geometry, p = g.attributes.position, ix = g.index; if (!ix) return;
    const keep = [];
    for (let t = 0; t < ix.count; t += 3) { const a = ix.getX(t), b = ix.getX(t + 1), c = ix.getX(t + 2); if (Math.min(p.getY(a), p.getY(b), p.getY(c)) > 0.93) keep.push(a, b, c); }
    g.setIndex(keep);
  }));
  model.scale.setScalar(1.0);
  model.rotation.y = Math.PI;
  boy.root.add(model);
  boy.bones = bones; boy.soldier = anims;
  safe('hoodie', () => addHoodie(model, bones));
  setAnim('Idle', 0);
  boy.ready = true;
}
// Make the top read as a hoodie: a ribbed neckline over the collar, the hood bunched behind the neck and two
// drawstrings, all riding on the chest bone (placed in the bind pose, in the avatar's own coordinates).
function addHoodie(model, bones) {
  const chest = bones.Spine2 || bones.Spine1; if (!chest) return;
  model.updateMatrixWorld(true);
  const cloth = new THREE.MeshStandardMaterial({ map: fabricTex('#3d4450', 11, false), roughness: .9 });
  const put = (mesh, x, y, z) => { mesh.position.copy(model.localToWorld(new THREE.Vector3(x, y, z))); mesh.quaternion.copy(model.getWorldQuaternion(new THREE.Quaternion())).multiply(mesh.quaternion); mesh.castShadow = true; chest.attach(mesh); return mesh; };
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.088, .034, 10, 28), cloth); ring.rotation.x = Math.PI / 2 - .25; ring.scale.set(1.15, 1, 1); put(ring, 0, 1.5, .012);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(.14, 18, 12), cloth); hood.scale.set(1.25, .62, .7); put(hood, 0, 1.46, -.155);
  const fold = new THREE.Mesh(new THREE.TorusGeometry(.1, .025, 8, 20, Math.PI), cloth); fold.rotation.set(-.5, 0, 0); put(fold, 0, 1.5, -.13);
  const string = new THREE.MeshStandardMaterial({ color: 0xe9e6dc, roughness: .8 });
  for (const sx of [-1, 1]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .15, 6), string); st.rotation.x = .12; put(st, sx * .035, 1.4, .125);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .025, 8), M(0x9aa0a6, { metalness: .7, roughness: .3 })); put(tip, sx * .035, 1.32, .135);
  }
}
function setAnim(name, fade = .3) {
  if (boy.current === name || !boy.actions[name]) return;
  const next = boy.actions[name];
  if (boy.current === 'loco') { // leaving the blended walk: fade everything else out, keep this one's pose
    for (const k in boy.actions) if (boy.actions[k] !== next) boy.actions[k].fadeOut(fade);
    next.stopFading(); next.enabled = true; next.setEffectiveTimeScale(1); next.setEffectiveWeight(1); if (!next.isRunning()) next.play();
    boy.current = name; boy.speed = 0; return;
  }
  next.reset(); next.setEffectiveTimeScale(1); next.setEffectiveWeight(1);
  if (boy.current) boy.actions[boy.current].crossFadeTo(next, fade, true);
  else next.fadeIn(fade);
  next.play();
  boy.current = name;
}


// ---------------------------------------------------------------- two people: the guy and the teen
// Either one can be the player (the Player button in the HUD, or P). Whoever you aren't lives in the house:
// he hangs out in the living room, turns to look at you, and the teen waves, nods and gestures when you come by.
// The player's visual parts (root, mixer, actions, bones, current) live on `boy`; switching swaps them.
const chars = {}, VIS = ['root', 'mixer', 'actions', 'bones', 'current'];
const NPC_HOME = new THREE.Vector3(-3.3, 0, -.85), NPC_YAW = Math.PI;
const npcCol = { minX: 0, maxX: 0, minZ: 0, maxZ: 0, lvl: 0 };
let npc = null;
boy.who = 'guy';
async function loadGltfJson(url) {
  const loader = new GLTFLoader(); loader.register(parser => new EmbeddedTextures(parser));
  const inline = document.getElementById('model:' + url);
  let text;
  if (inline) text = inline.textContent;
  else { const res = await fetch(url); if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`); text = await res.text(); }
  return await new Promise((ok, fail) => loader.parse(gltfJsonToGlb(text), '', ok, fail));
}
// Where his hair is thin the pale scalp showed through as a line down the back of his head: colour the skin
// under the hair (every skin vertex close to a hair vertex, both in the bind pose) the same brown as the hair.
function tintScalp(model) {
  let skin = null, hair = null;
  model.traverse(o => { if (o.isMesh && o.material) { if (o.material.name === 'Skin') skin = o; if (o.material.name === 'Hair') hair = o; } });
  if (!skin || !hair) return;
  const hp = hair.geometry.attributes.position, sp = skin.geometry.attributes.position, C = .03, R = .03;
  const grid = new Map(), cell = (x, y, z) => `${Math.floor(x / C)},${Math.floor(y / C)},${Math.floor(z / C)}`;
  let minY = Infinity;
  for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i); minY = Math.min(minY, y); const k = cell(x, y, z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(x, y, z); }
  const w = new Float32Array(sp.count);
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i); if (y < minY - .02) continue;
    let best = R;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const list = grid.get(`${Math.floor(x / C) + a},${Math.floor(y / C) + b},${Math.floor(z / C) + c}`); if (!list) continue;
      for (let j = 0; j < list.length; j += 3) best = Math.min(best, Math.hypot(list[j] - x, list[j + 1] - y, list[j + 2] - z));
    }
    w[i] = Math.min(1, (1 - best / R) * 1.6);
  }
  skin.geometry.setAttribute('scalp', new THREE.BufferAttribute(w, 1));
  const m = skin.material;
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float scalp;\nvarying float vScalp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvScalp = scalp;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vScalp;').replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(.112, .068, .039), vScalp);');
  };
  m.customProgramCacheKey = () => 'teen-scalp'; m.needsUpdate = true;
}
async function loadTeen() {
  const [g, bot] = await Promise.all([loadGltfJson('models/teen.json'), loadGltfJson('models/xbot-clips.json')]);
  const model = g.scene;
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const m = o.material; if (!m) return; m.envMapIntensity = .6;
    if (/brow|lash|hair/i.test(m.name || '')) { m.alphaTest = .2; m.transparent = false; if (/hair/i.test(m.name)) { m.side = THREE.FrontSide; o.receiveShadow = false; } }
  });
  tintScalp(model);
  const moves = retarget(bot.scene, bot.animations.filter(c => ['idle', 'walk', 'run', 'agree', 'headShake'].includes(c.name)), model);
  const mixer = new THREE.AnimationMixer(model);
  const idle = moves.find(c => c.name === 'idle');
  const a0 = mixer.clipAction(idle); a0.play(); mixer.setTime(0); model.updateMatrixWorld(true);
  const pose0 = new Map(); model.traverse(o => { if (o.isBone) pose0.set(o, o.quaternion.clone()); });
  mixer.stopAllAction(); mixer.uncacheAction(idle);
  const NAMES = { idle: 'Idle', walk: 'Walk', run: 'Run' }, actions = {};
  for (const c of [...moves, ...gestures(model, pose0, idle)]) {
    const name = NAMES[c.name] || c.name; c.name = name;
    const a = mixer.clipAction(c); a.enabled = true;
    if (!['Idle', 'Walk', 'Run'].includes(name)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } // gestures play once
    actions[name] = a;
  }
  const bones = {}; model.traverse(o => { if (o.isBone) bones[o.name.replace('mixamorig', '')] = o; });
  const root = new THREE.Group(); root.add(model); scene.add(root);   // he faces +Z already
  const rec = { name: 'teen', label: 'Teen', root, mixer, actions, bones, current: null, sitDrop: .4, walkV: 1.15, runV: 3.4, leanK: .45, gestures: ['wave', 'agree', 'thumbs up', 'headShake', 'arms crossed', 'point'] };
  mixer.addEventListener('finished', e => { const c = rec === npc ? rec : null; if (c && e.action === c.curAct) npcPlay(c, 'Idle'); });
  chars.teen = rec;
  // until you pick him, he lives in the house
  makeNpc(rec);
  if (settings.player === 'teen' && (mode === 'title' || mode === 'walk')) switchPlayer('teen', true);
  $('#do-player').disabled = false;
}
function npcPlay(c, name, fade = .35) {
  const next = c.actions[name]; if (!next) return;
  if (c.curAct === next) { if (name !== 'Idle') next.reset().play(); return; }
  next.reset().setEffectiveWeight(1).fadeIn(fade).play();
  if (c.curAct) c.curAct.fadeOut(fade);
  c.curAct = next; c.current = name;
}
function makeNpc(c) {
  npc = c;
  c.mixer.stopAllAction(); c.curAct = null; npcPlay(c, 'Idle', 0);
  c.pos = NPC_HOME.clone(); c.yaw = NPC_YAW; c.nextGesture = performance.now() / 1000 + 6; c.greeted = false;
  c.root.position.copy(c.pos); c.root.rotation.set(0, c.yaw, 0); c.root.visible = true;
  if (!colliders.includes(npcCol)) colliders.push(npcCol);
}
// make `to` the player; the other one moves into the house
function switchPlayer(to, quiet) {
  if (boy.who === to || !chars[to]) return;
  if (mode !== 'walk' && mode !== 'title') { toast('Switch players while you are walking around.'); return; }
  const old = chars[boy.who], nu = chars[to];
  for (const k of VIS) old[k] = boy[k];
  for (const k of VIS) boy[k] = nu[k];
  boy.who = to; boy.sitDrop = nu.sitDrop; boy.walkV = nu.walkV; boy.runV = nu.runV; boy.leanK = nu.leanK;
  // the new player starts from a clean idle wherever the old one was standing
  nu.mixer.stopAllAction(); nu.curAct = null; boy.current = null; setAnim('Idle', 0); boy.speed = 0;
  boy.root.visible = true; boy.root.position.copy(boy.pos); boy.root.rotation.set(0, boy.yaw, 0);
  makeNpc(old);
  settings.player = to; saveSettings();
  $('#btn-player').textContent = nu.label;
  if (!quiet) toast(`You're the ${nu.label.toLowerCase()} now. The ${old.label.toLowerCase()} is hanging out in the living room.`, 3400);
}
// the one you aren't: turns to look at you when you're near, and (the teen) greets and gestures
function tickNpc(dt) {
  const c = npc; if (!c) return;
  c.mixer.update(dt);
  const p = boy.pos, near = lvlOf(p.y) === 0 && inside(p) && Math.hypot(p.x - c.pos.x, p.z - c.pos.z) < 4.2;
  const want = near ? Math.atan2(p.x - c.pos.x, p.z - c.pos.z) : NPC_YAW;
  let d = want - c.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); c.yaw += d * Math.min(1, dt * 3);
  c.root.position.copy(c.pos); c.root.rotation.set(0, c.yaw, 0);
  npcCol.minX = c.pos.x - .28; npcCol.maxX = c.pos.x + .28; npcCol.minZ = c.pos.z - .28; npcCol.maxZ = c.pos.z + .28;
  if (!c.gestures) return;
  const now = performance.now() / 1000, busy = c.current && c.current !== 'Idle';
  if (near && !c.greeted && !busy && Math.abs(d) < .5) { c.greeted = true; npcPlay(c, 'wave'); c.nextGesture = now + 9; return; }
  if (!near && Math.hypot(p.x - c.pos.x, p.z - c.pos.z) > 7) c.greeted = false;
  if (near && !busy && now > c.nextGesture) { npcPlay(c, c.gestures[Math.floor(Math.random() * c.gestures.length)]); c.nextGesture = now + 7 + Math.random() * 8; }
}

// Locomotion the way the Gate Theory runner moves: Idle, Walk and Run all play at once and are blended by his
// actual speed, each clip's playback rate is matched to that speed so the feet don't skate, and walk/run share a
// stride phase so the blend between them stays in step.
const loco = { Idle: 1, Walk: 0, Run: 0, lean: 0, pitch: 0 };
function setLoco(speed, dt) {
  const A = boy.actions; if (!A.Idle || !A.Walk || !A.Run) return;
  if (boy.current !== 'loco') {
    for (const k of ['Idle', 'Walk', 'Run']) { const a = A[k]; a.stopFading(); a.enabled = true; if (!a.isRunning()) a.play(); loco[k] = a.getEffectiveWeight(); }
    for (const k in A) if (!['Idle', 'Walk', 'Run'].includes(k)) A[k].fadeOut(.2);
    boy.current = 'loco';
  }
  const wr = Math.min(1, Math.max(0, (speed - 2.2) / 1.7)), wi = Math.max(0, 1 - speed / 1.1), ww = Math.max(0, 1 - wi - wr);
  const k = Math.min(1, dt * 10);
  for (const [n, v] of [['Idle', wi], ['Walk', ww], ['Run', wr]]) { loco[n] += (v - loco[n]) * k; A[n].setEffectiveWeight(loco[n]); }
  A.Walk.timeScale = Math.max(.7, Math.min(1.8, speed / (boy.walkV || 1.45)));
  A.Run.timeScale = Math.max(.85, Math.min(1.45, speed / (boy.runV || 3.9)));
  if (loco.Walk > .05 && loco.Run > .05) A.Run.time = A.Walk.time / A.Walk.getClip().duration * A.Run.getClip().duration;
}
// body lean on top of the clips: forward into a run, sideways into turns
const _lq = new THREE.Quaternion(), _lq2 = new THREE.Quaternion();
function rotBoneWorld(bone, axis, angle) {
  if (!bone || Math.abs(angle) < 1e-4) return;
  bone.getWorldQuaternion(_lq); _lq2.setFromAxisAngle(axis, angle).multiply(_lq);
  bone.parent.getWorldQuaternion(_lq).invert(); bone.quaternion.copy(_lq.multiply(_lq2)); bone.updateMatrixWorld(true);
}
function poseLean() {
  if (!boy.bones || boy.current !== 'loco') return;
  boy.root.updateMatrixWorld(true);
  const fwd = new THREE.Vector3(Math.sin(boy.yaw), 0, Math.cos(boy.yaw)), right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const k = boy.leanK ?? 1; // the teen's clips already lean, so he gets less on top
  rotBoneWorld(boy.bones.Spine, right, -loco.pitch * k);
  rotBoneWorld(boy.bones.Spine1, fwd, loco.lean);
  rotBoneWorld(boy.bones.Head || boy.bones.Neck, right, loco.pitch * .6 * k);
}

// ---------------------------------------------------------------- input
const keys = new Set();
let mode = 'title'; // title | walk | auto | sit | pc | stand
addEventListener('keydown', e => {
  if (mode === 'pc' || mode === 'cab') return; // the PC or a cabinet owns the keyboard
  if (!tvFull.hidden) { if (e.code === 'Escape') closeTvFull(); return; }
  keys.add(e.code);
  if (mode === 'rest' && /^(KeyE|Enter|KeyW|KeyA|KeyS|KeyD|Arrow\w+)$/.test(e.code)) leaveRest();
  else if ((e.code === 'KeyE' || e.code === 'Enter') && mode === 'walk') useNearest();
  if (e.code === 'KeyC' && (mode === 'walk' || mode === 'auto')) goToComputer();
  if (e.code === 'KeyT' && mode !== 'title') cycleTime();
  if (e.code === 'KeyP' && (mode === 'walk' || mode === 'title')) togglePlayer();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const orbit = { yaw: 0, pitch: .22, dist: 3.0, dragging: false, lx: 0, ly: 0, moved: 0 };
canvas3d.addEventListener('pointerdown', e => { orbit.dragging = true; orbit.lx = e.clientX; orbit.ly = e.clientY; orbit.moved = 0; canvas3d.setPointerCapture(e.pointerId); });
canvas3d.addEventListener('pointermove', e => {
  if (!orbit.dragging || touchStick.id === e.pointerId) return;
  const dx = e.clientX - orbit.lx, dy = e.clientY - orbit.ly; orbit.lx = e.clientX; orbit.ly = e.clientY; orbit.moved += Math.abs(dx) + Math.abs(dy);
  orbit.yaw -= dx * .006; orbit.pitch = Math.max(-.2, Math.min(1.1, orbit.pitch + dy * .004));
});
canvas3d.addEventListener('pointerup', e => {
  orbit.dragging = false;
  if (orbit.moved < 6 && (mode === 'walk' || mode === 'auto' || mode === 'rest')) {
    const v = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(v, camera);
    const hit = ray.intersectObjects(clickables, false)[0];
    const cabHit = ray.intersectObjects(clickCabs.map(c => c[0]), true)[0];
    const tvHit = ray.intersectObjects(Object.values(tvs).map(t => t.mesh), false)[0];
    if (tvHit && (!hit || tvHit.distance < hit.distance) && (!cabHit || tvHit.distance < cabHit.distance)) clickTV(Object.keys(tvs).find(k => tvs[k].mesh === tvHit.object));
    else if (mode === 'rest') return;
    else if (cabHit && (!hit || cabHit.distance < hit.distance)) { let o = cabHit.object; while (o && !clickCabs.find(c => c[0] === o)) o = o.parent; const c = o && clickCabs.find(x => x[0] === o)[1]; if (c) walkToCabinet(c); }
    else if (hit) goToComputer();
  }
});
canvas3d.addEventListener('wheel', e => { orbit.dist = Math.max(1.4, Math.min(6, orbit.dist + e.deltaY * .002)); }, { passive: true });
const ray = new THREE.Raycaster();
const touchStick = { id: null, x: 0, y: 0, dx: 0, dy: 0 };
const stickEl = $('#walkstick');
stickEl.addEventListener('pointerdown', e => { touchStick.id = e.pointerId; const r = stickEl.getBoundingClientRect(); touchStick.x = r.left + r.width / 2; touchStick.y = r.top + r.height / 2; stickEl.setPointerCapture(e.pointerId); moveStick(e); e.stopPropagation(); });
stickEl.addEventListener('pointermove', e => { if (e.pointerId === touchStick.id) moveStick(e); });
const endStick = e => { if (e.pointerId === touchStick.id) { touchStick.id = null; touchStick.dx = touchStick.dy = 0; stickEl.style.setProperty('--kx', '0px'); stickEl.style.setProperty('--ky', '0px'); } };
stickEl.addEventListener('pointerup', endStick); stickEl.addEventListener('pointercancel', endStick);
function moveStick(e) {
  let dx = (e.clientX - touchStick.x) / 50, dy = (e.clientY - touchStick.y) / 50;
  const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
  touchStick.dx = dx; touchStick.dy = dy;
  stickEl.style.setProperty('--kx', dx * 30 + 'px'); stickEl.style.setProperty('--ky', dy * 30 + 'px');
}

// ---------------------------------------------------------------- movement
function collide(p, r = .26, lvl = 0) {
  for (let pass = 0; pass < 2; pass++) for (const c of colliders) {
    if ((c.lvl || 0) !== lvl) continue;
    const cx = Math.max(c.minX, Math.min(c.maxX, p.x)), cz = Math.max(c.minZ, Math.min(c.maxZ, p.z));
    const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d < r) { if (d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; } else p.z += r; }
  }
  p.x = Math.max(-40, Math.min(40, p.x)); p.z = Math.max(-40, Math.min(17, p.z));
}
let autoPath = null, nearChair = false, nearCab = null, nearSpot = null;
function useNearest() { if (nearCab) playCabinet(nearCab); else if (nearChair) sitDown(); else if (nearSpot) nearSpot.act(); }
const inside = p => p.x > H.minX && p.x < H.maxX && p.z < H.maxZ && p.z > H.minZ;
// waypoints from upstairs or the back hall down to the front of the house
function exitBack(p, pts) {
  if (lvlOf(p.y)) {
    if (p.x < 2) pts.push(V3(1.0, 0, -7.7), V3(3.2, 0, -7.7));
    else if (p.z > -6) pts.push(V3(2.95, 0, -5.4), V3(2.95, 0, -6.8));
    pts.push(V3(3.6, 0, -11.45), V3(5.35, 0, -11.45), V3(5.35, 0, -6.3), V3(3.0, 0, -6.4), V3(2.9, 0, -5.3));
    return true;
  }
  if (p.x > 0 && p.z < -6.1) { pts.push(V3(2.9, 0, -6.6), V3(2.9, 0, -5.3)); return true; }
  return false;
}
function walkToCabinet(c) {
  if (mode !== 'walk' && mode !== 'auto') return;
  const p = boy.pos, pts = [];
  const back = exitBack(p, pts);
  if (back) pts.push(V3(-1.4, 0, -3.4), V3(-3, 0, -5.3), V3(-3, 0, -6.7));
  else if (!inside(p)) { if (Math.abs(p.x) > 1.2 || p.z > 3) pts.push(new THREE.Vector3(0, 0, 2.6)); pts.push(new THREE.Vector3(0, 0, .6), new THREE.Vector3(0, 0, -1.0)); }
  if (!back && p.z > -6.1) { if (p.x > 2.4) pts.push(new THREE.Vector3(2.2, 0, -1.2)); pts.push(new THREE.Vector3(-1.4, 0, -3.4), new THREE.Vector3(-3, 0, -5.3), new THREE.Vector3(-3, 0, -6.7)); }
  pts.push(new THREE.Vector3((c.front.x + -3) / 2, 0, c.front.z), c.front.clone());
  autoPath = { pts, cab: c }; mode = 'auto'; $('#objective').hidden = true;
}
function goToComputer() {
  if (mode !== 'walk' && mode !== 'auto') return;
  const p = boy.pos, pts = [];
  const back = exitBack(p, pts);
  if (back) pts.push(V3(-1.4, 0, -3.4), V3(-3, 0, -5.3), V3(-3, 0, -6.7));
  else if (!inside(p)) { if (Math.abs(p.x) > 1.2 || p.z > 3) pts.push(new THREE.Vector3(0, 0, 2.6)); pts.push(new THREE.Vector3(0, 0, .6), new THREE.Vector3(0, 0, -1.0)); }
  if (!back && p.z > -6.1) { if (p.x > 2.4) pts.push(new THREE.Vector3(2.2, 0, -1.2)); pts.push(new THREE.Vector3(-1.4, 0, -3.4), new THREE.Vector3(-3, 0, -5.3), new THREE.Vector3(-3, 0, -6.7)); }
  pts.push(PC.stand.clone());
  autoPath = { pts }; mode = 'auto';
  $('#objective').hidden = true;
}

// ---------------------------------------------------------------- sitting down at the PC
let sitT = 0;           // 0 standing .. 1 seated
let sitTarget = 0;
let pcOpen = false;
const pc = createPC({
  monitorCanvas: () => monitorTex.image,
  onMonitorChange: () => { monitorTex.needsUpdate = true; },
  onStandUp: () => standUp()
});
function sitDown() {
  mode = 'sit'; $('#prompt').hidden = true; autoPath = null; $('#objective').hidden = true;
  setAnim('Idle', .3);
  const from = boy.pos.clone();
  sitAnim = { t: 0, from, yaw0: boy.yaw };
  Reg.audio.unlock();
}
let sitAnim = null;
function updateSit(dt) {
  if (!sitAnim) return;
  sitAnim.t += dt;
  const a = Math.min(1, sitAnim.t / .55);
  // turn to face the desk and step in front of the chair
  let dy = Math.PI - sitAnim.yaw0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  boy.yaw = sitAnim.yaw0 + dy * ease(a);
  boy.pos.lerpVectors(sitAnim.from, PC.stand, ease(a));
  if (sitAnim.t > .45) { sitTarget = 1; boy.pos.z = THREE.MathUtils.lerp(PC.stand.z, PC.chair.z + .08, ease(Math.min(1, (sitAnim.t - .45) / .7))); }
  if (sitAnim.t > .5 && !sitAnim.cam) {
    sitAnim.cam = true;
    const look = PC.screen.clone();
    const over = new THREE.Vector3(-2.55, 1.62, -9.55);
    const fill = PC.screenH * .5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.12;
    const close = PC.screen.clone().addScaledVector(PC.screenNormal, fill);
    camTween = { t: 0, pts: [camera.position.clone(), over, close], look: [lookCur.clone(), look, look], dur: 2.2, done: () => { mode = 'pc'; openPC(); } };
    chairTween = 1;
  }
  if (sitAnim.t > 1.3) sitAnim.done = true;
}
let chairTween = 0;
function openPC() {
  pcOpen = true;
  $('#hud').hidden = true; $('#walkstick').classList.add('off');
  music.pause(1.5); // the games bring their own sound
  tvOff();
  pc.open();
}
function standUp() {
  pcOpen = false; pc.close();
  $('#hud').hidden = false; $('#walkstick').classList.remove('off');
  mode = 'stand'; sitTarget = 0; sitAnim = null;
  houseMusic();
  const back = { pos: new THREE.Vector3(-1.9, 1.75, -8.3), look: new THREE.Vector3(-3, 1.1, -10.6) };
  camTween = { t: 0, pts: [camera.position.clone(), back.pos], look: [lookCur.clone(), back.look], dur: 1.2, done: () => { mode = 'walk'; orbit.yaw = Math.atan2(back.pos.x - boy.pos.x, back.pos.z - boy.pos.z); } };
  standAnim = { t: 0 };
}
let standAnim = null;
function updateStand(dt) {
  if (!standAnim) return;
  standAnim.t += dt;
  const a = ease(Math.min(1, standAnim.t / .8));
  boy.pos.z = THREE.MathUtils.lerp(PC.chair.z + .08, PC.stand.z, a);
  if (standAnim.t > .8) standAnim = null;
}

// Seated pose: drive the leg, spine and arm bones on top of the Idle clip, blended by sitT.
const _q = new THREE.Quaternion(), _v = new THREE.Vector3();
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
function poseSeated(w, typing) {
  if (!boy.bones || w <= 0) return;
  const B = boy.bones;
  const fwd = new THREE.Vector3(Math.sin(boy.yaw), 0, Math.cos(boy.yaw));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const down = new THREE.Vector3(0, -1, 0);
  boy.root.updateMatrixWorld(true);
  for (const s of [-1, 1]) {
    const L = s < 0 ? 'Left' : 'Right';
    aimBone(B[L + 'UpLeg'], fwd.clone().multiplyScalar(1).add(right.clone().multiplyScalar(s * -.08)).add(new THREE.Vector3(0, -.05, 0)), w);
    aimBone(B[L + 'Leg'], down.clone().add(fwd.clone().multiplyScalar(.12)), w);
    aimBone(B[L + 'Foot'], fwd.clone().add(new THREE.Vector3(0, -.35, 0)), w);
  }
  aimBone(B.Spine, new THREE.Vector3(0, 1, 0).addScaledVector(fwd, .06), w);
  aimBone(B.Spine2, new THREE.Vector3(0, 1, 0).addScaledVector(fwd, .18), w);
  const tap = typing ? Math.sin(performance.now() / 90) * .03 : 0;
  for (const s of [-1, 1]) {
    const L = s < 0 ? 'Left' : 'Right';
    aimBone(B[L + 'Arm'], down.clone().multiplyScalar(.85).addScaledVector(fwd, .55).addScaledVector(right, s * -.18), w);
    aimBone(B[L + 'ForeArm'], fwd.clone().addScaledVector(down, .28 + (s > 0 ? tap : -tap)).addScaledVector(right, s * .25), w);
    aimBone(B[L + 'Hand'], fwd.clone().addScaledVector(down, .3), w);
  }
}

// Lying on his back (head toward -z): legs straight down the bed, arms along his sides, toes up.
function poseLying(w) {
  if (!boy.bones || w <= .01) return;
  const B = boy.bones; boy.root.updateMatrixWorld(true);
  const toFeet = new THREE.Vector3(0, -.06, 1);
  for (const L of ['Left', 'Right']) {
    const sx = L === 'Left' ? 1 : -1;
    aimBone(B[L + 'UpLeg'], toFeet.clone().add(new THREE.Vector3(sx * .07, 0, 0)), w);
    aimBone(B[L + 'Leg'], toFeet, w);
    aimBone(B[L + 'Foot'], new THREE.Vector3(0, 1, .35), w);
    aimBone(B[L + 'Arm'], new THREE.Vector3(sx * .28, -.12, 1), w);
    aimBone(B[L + 'ForeArm'], new THREE.Vector3(sx * .08, -.08, 1), w);
  }
}

// ---------------------------------------------------------------- camera
const lookCur = new THREE.Vector3(0, 1.4, 0);
let camTween = null;
const _ray = new THREE.Raycaster();
function desiredCam() {
  const look = boy.pos.clone().add(new THREE.Vector3(0, 1.45, 0));
  const cp = Math.cos(orbit.pitch);
  const dir = new THREE.Vector3(Math.sin(orbit.yaw) * cp, Math.sin(orbit.pitch), Math.cos(orbit.yaw) * cp);
  let dist = orbit.dist;
  // keep the camera on this side of walls and ceilings
  _ray.set(look, dir); _ray.far = dist + .3;
  const hit = _ray.intersectObjects(camBlockers, false)[0];
  if (hit) dist = Math.max(.35, hit.distance - .25);
  const pos = look.clone().addScaledVector(dir, dist);
  pos.y = Math.max(boy.pos.y + .35, pos.y);
  return { pos, look };
}
function bez(pts, t) {
  if (pts.length === 2) return pts[0].clone().lerp(pts[1], t);
  const a = pts[0].clone().lerp(pts[1], t), b = pts[1].clone().lerp(pts[2], t); return a.lerp(b, t);
}
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let screenT = 0, doorOpen = 0;
// ---------------------------------------------------------------- idle surprise: giant monsters climb the house
// Leave him standing for 10 seconds and three original giant monsters (a yeti, a spiky dino and a purple bear)
// come round from behind the house, climb its side walls, stand on the roof and shake their fists. Any key,
// click or mouse move sends them running.
const IDLE_MS = 10000;
let lastInput = performance.now();
function furTex(base, seed, scales) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const r = rng(seed);
    if (scales) {
      for (let y = 0; y < h + 20; y += 18) for (let x = (y / 18 % 2) * 11; x < w + 20; x += 22) {
        const l = r() * .25; g.fillStyle = `rgba(0,0,0,${.12 + l})`; g.beginPath(); g.ellipse(x, y, 11, 9, 0, 0, 6.283); g.fill();
        g.fillStyle = `rgba(255,255,255,${.05 + r() * .1})`; g.beginPath(); g.ellipse(x - 2, y - 3, 7, 5, 0, 0, 6.283); g.fill();
      }
      return;
    }
    for (let i = 0; i < 26000; i++) {
      const x = r() * w, y = r() * h, len = 6 + r() * 12, a = Math.PI / 2 + (r() - .5) * .7;
      g.strokeStyle = r() < .5 ? `rgba(255,255,255,${r() * .22})` : `rgba(0,0,0,${r() * .3})`; g.lineWidth = .8 + r() * 1.2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
    }
  }, { repeat: [3, 3] });
}
function makeMonster(kind) {
  const C = { yeti: { fur: '#dfe6ee', skin: 0x6a86a6, iris: 0x3fa9ff, claw: 0x2a3440 }, dino: { fur: '#d9702a', skin: 0xf0c27c, iris: 0xffc21a, claw: 0xf4ead8 }, bear: { fur: '#5e3585', skin: 0xc9a2dc, iris: 0x8a4a1a, claw: 0x221a14 } }[kind];
  const ft = furTex(C.fur, kind.length * 17, kind === 'dino');
  const fur = new THREE.MeshStandardMaterial({ map: ft, bumpMap: ft, bumpScale: kind === 'dino' ? 4 : 2.5, roughness: kind === 'dino' ? .55 : .95 });
  const skin = M(C.skin, { roughness: .7 }), dark = M(0x160e0e, { roughness: .5 }), claw = M(C.claw, { roughness: .35 }), tooth = M(0xf6f1e4, { roughness: .3 });
  const g = new THREE.Group(); g.visible = false; g.rotation.order = 'YXZ'; scene.add(g);
  const add = (geo, mat, x, y, z, p = g, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; p.add(m); return m; };
  const sph = (r, n = 20) => new THREE.SphereGeometry(r, n, Math.round(n * .75));
  const limb = (r0, r1, len) => { const geo = new THREE.CylinderGeometry(r0, r1, len, 16, 3); geo.translate(0, -len / 2, 0); return geo; };
  // torso: a lathe profile with a big chest and a pot belly
  const prof = [[0, .95], [.55, 1.0], [.82, 1.3], [.9, 1.7], [.98, 2.15], [1.02, 2.5], [.9, 2.8], [.55, 3.0], [0, 3.05]].map(([x, y]) => new THREE.Vector2(x, y));
  add(new THREE.LatheGeometry(prof, 28), fur, 0, 0, 0, g, 1, 1, .78);
  add(sph(.62), skin, 0, 1.8, .38, g, 1.05, 1.25, .55);                     // belly / chest patch
  for (const s of [-1, 1]) add(sph(.48), fur, s * .82, 2.7, 0, g, 1, .9, .95); // shoulder muscle
  // head
  const head = new THREE.Group(); head.position.set(0, 3.25, .12); g.add(head);
  add(sph(.6, 24), fur, 0, 0, 0, head, 1, .95, 1);
  const snoutLen = kind === 'dino' ? 1.6 : 1;
  add(sph(.36, 20), skin, 0, -.16, .44, head, 1.15, .78, snoutLen);           // muzzle
  add(sph(.13, 12), dark, 0, -.02, .44 + .34 * snoutLen, head, 1.3, .8, .9);  // nose
  add(new THREE.CapsuleGeometry(.09, .62, 4, 10), fur, 0, .2, .46, head).rotation.z = Math.PI / 2; // brow ridge
  for (const s of [-1, 1]) {
    add(sph(.12, 14), M(0xf8f6f0, { roughness: .2 }), s * .22, .08, .5, head);
    add(sph(.075, 12), M(C.iris, { roughness: .25, emissive: C.iris, emissiveIntensity: .15 }), s * .22, .08, .58, head);
    add(sph(.04, 10), M(0x050505, { roughness: .1 }), s * .22, .08, .63, head);
    add(sph(.015, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), s * .22 + .02, .11, .655, head);
  }
  // open mouth with teeth (scaled by the animation)
  const mouth = new THREE.Group(); mouth.position.set(0, -.3, .52 + .2 * (snoutLen - 1)); head.add(mouth);
  add(sph(.2, 14), M(0x5a1418, { roughness: .6 }), 0, 0, .1, mouth, 1.2, .45, .5);
  for (let i = 0; i < 6; i++) { const tth = add(new THREE.ConeGeometry(.028, .09, 6), tooth, -.15 + i * .06, .06, .18, mouth); tth.rotation.x = Math.PI; }
  for (const s of [-1, 1]) add(new THREE.ConeGeometry(.04, .16, 6), tooth, s * .14, -.07, .17, mouth);
  if (kind === 'yeti') for (const s of [-1, 1]) { const h = add(new THREE.ConeGeometry(.1, .55, 10), M(0xe8e0cc, { roughness: .5 }), s * .42, .5, -.05, head); h.rotation.z = s * -.55; }
  if (kind === 'bear') for (const s of [-1, 1]) { add(sph(.2), fur, s * .46, .46, -.05, head, 1, 1, .6); add(sph(.12), skin, s * .46, .46, .03, head, 1, 1, .4); }
  if (kind === 'dino') {
    for (let i = 0; i < 8; i++) { const sp = add(new THREE.ConeGeometry(.13 + (i < 4 ? i * .02 : (8 - i) * .02), .45, 6), M(0xf0c27c, { roughness: .5 }), 0, 3.6 - i * .36, -.62 - Math.sin(i / 7 * 2.8) * .28); sp.rotation.x = -.6; }
    const tail = add(new THREE.ConeGeometry(.42, 2.2, 14), fur, 0, 1.0, -1.25); tail.rotation.x = -1.25;
  }
  // arms: tapered upper arm, elbow, forearm, a clenched fist with knuckles and claws
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * .95, 2.75, 0); g.add(a);
    add(limb(.3, .22, .78), fur, 0, 0, 0, a);
    const el = new THREE.Group(); el.position.set(0, -.75, 0); a.add(el); a.userData.el = el;
    add(sph(.23), fur, 0, 0, 0, el);
    add(limb(.24, .19, .62), fur, 0, 0, 0, el);
    const fist = new THREE.Group(); fist.position.set(0, -.72, 0); el.add(fist); a.userData.fist = fist;
    add(sph(.22), skin, 0, 0, 0, fist, 1, 1.05, 1.15);
    for (let k = 0; k < 4; k++) { add(sph(.075, 10), skin, -.12 + k * .08, -.14, .12, fist); add(new THREE.ConeGeometry(.03, .1, 6), claw, -.12 + k * .08, -.2, .16, fist).rotation.x = 2.4; }
    add(new THREE.CapsuleGeometry(.06, .12, 4, 8), skin, s * -.17, -.02, .1, fist).rotation.z = s * .6; // thumb
    arms.push(a);
    // legs: thick thigh, shin, a big foot with toes and claws
    const l = new THREE.Group(); l.position.set(s * .45, 1.05, 0); g.add(l);
    add(limb(.36, .27, .58), fur, 0, 0, 0, l);
    add(limb(.27, .22, .44), fur, 0, -.52, 0, l);
    add(sph(.3), skin, 0, -.98, .14, l, 1, .45, 1.4);
    for (let k = 0; k < 3; k++) { add(sph(.08, 10), skin, -.12 + k * .12, -1.0, .52, l); add(new THREE.ConeGeometry(.035, .1, 6), claw, -.12 + k * .12, -1.0, .6, l).rotation.x = Math.PI / 2; }
    legs.push(l);
  }
  return { g, head, arms, legs, mouth };
}
const monsters = {
  list: [], active: false, leaving: false, watching: false, t: 0, lt: 0, roarAt: 0,
  cam: { pos: new THREE.Vector3(0, 10, 50), look: new THREE.Vector3(0, 3.8, -7) },
  build() {
    // a wooden barrel for the dino to throw: bulging staves and iron hoops
    const prof = []; for (let i = 0; i <= 10; i++) { const y = i / 10; prof.push(new THREE.Vector2(.36 + Math.sin(y * Math.PI) * .1, y - .5)); }
    const wood = M(0xffffff, { map: canvasTex(256, 128, (g, w, h) => { const r = rng(9); for (let x = 0; x < w; x += 16) { g.fillStyle = `hsl(28, ${45 + r() * 15}%, ${26 + r() * 10}%)`; g.fillRect(x, 0, 16, h); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x, 0, 2, h); for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + 3 + r() * 10, r() * h, 1, 20 + r() * 40); } } }), roughness: .85 });
    const b = new THREE.Group(), inner = new THREE.Group(); inner.rotation.order = 'ZYX'; b.add(inner); b.visible = false; scene.add(b);
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), wood); body.castShadow = true; inner.add(body);
    for (const y of [-.38, -.15, .15, .38]) { const hp = new THREE.Mesh(new THREE.TorusGeometry(.36 + Math.sin((y + .5) * Math.PI) * .1 + .01, .025, 6, 24), M(0x2a2a2c, { metalness: .7, roughness: .5 })); hp.rotation.x = Math.PI / 2; hp.position.y = y; inner.add(hp); }
    for (const y of [-.5, .5]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(.36, 20), wood); cap.rotation.x = y > 0 ? -Math.PI / 2 : Math.PI / 2; cap.position.y = y; inner.add(cap); }
    this.barrel = { g: b, inner }; this.thr = null; this.lastThrow = -99;
    // [kind, side (-1 west / 1 east), wall z where it climbs, roof spot x/z, start delay]
    [['yeti', -1, -3.2, -3.8, -3.4, 0], ['dino', 1, -9.0, .2, -5.4, .6], ['bear', 1, -3.2, 3.9, -3.4, 1.2]].forEach(([k, side, wz, tx, tz, d]) => { const m = makeMonster(k); Object.assign(m, { kind: k, side, wz, tx, tz, delay: d, fist: side < 0 ? 1 : (k === 'bear' ? 0 : 1) }); this.list.push(m); });
  },
  start() {
    this.active = true; this.leaving = false; this.watching = true; this.t = 0; this.roarAt = 10.6; this.thr = null; this.lastThrow = -99; this.barrel.g.visible = false;
    for (const m of this.list) { m.g.visible = true; m.g.position.set(m.side * 10, 0, -22); }
    toast('Uh oh... something big is moving behind the house!', 4000);
    if (this.score) this.score.stop(); this.score = settings.music ? sfx.ominous(10.5) : null;
    music.pause(1);
    camera.position.lerp(this.cam.pos, .35); lookCur.lerp(this.cam.look, .35); // start the pull-back right away
  },
  // Before they reach the walls a touch scares them off; once they start climbing they stay on the roof
  // for good, and a touch only hands the camera back.
  end() {
    if (!this.active || this.leaving) return;
    if (this.t > 3.5) { this.watching = false; return; } // the monster music keeps going (see tick) until he goes inside
    this.leaving = true; this.lt = 0; if (this.score) { this.score.stop(); this.score = null; }
    for (const m of this.list) m.from = m.g.position.clone();
    sfx.roar(1.4);
  },
  // the dino lifts a barrel over its head and heaves it at him; it sails over his head and crashes down behind him
  throwPose(m) {
    const k = this.thr.t, arm = m.arms, g = m.g;
    if (k < 1.2) { const e = ease(k / 1.2); arm.forEach((a, i) => { a.rotation.set(-3.0 * e, 0, (i ? 1 : -1) * .18); a.userData.el.rotation.set(-.9 * e, 0, 0); }); g.rotation.x = -.18 * e; }
    else { const q = Math.min(1, (k - 1.2) / .35); arm.forEach((a, i) => { a.rotation.set(-3.0 + 1.9 * ease(q), 0, (i ? 1 : -1) * .18); a.userData.el.rotation.set(-.9 * (1 - q), 0, 0); }); g.rotation.x = -.18 + .5 * q; }
    m.mouth.scale.y = 1.6; m.head.rotation.set(-.15, 0, 0);
  },
  tickBarrel(dt) {
    const dino = this.list.find(m => m.kind === 'dino'), B = this.barrel, SIZE = 1.5, R = .46 * SIZE;
    if (!dino) return;
    const ready = this.t - dino.delay > 11.2, p = boy.pos;
    // the first barrel always goes for the car in the driveway; after that they're lobbed over his head
    const atCar = carRef && !carRef.smashed;
    if (!this.thr && ready && this.t - this.lastThrow > 9 && (atCar || (!inside(p) && p.z > -1 && lvlOf(p.y) === 0))) { this.thr = { t: 0, car: atCar }; B.g.visible = true; B.g.scale.setScalar(SIZE); }
    if (!this.thr) return;
    const T = this.thr; T.t += dt;
    if (T.t < 1.4) { // held between his fists
      dino.g.updateMatrixWorld(true);
      const f0 = dino.arms[0].userData.fist.getWorldPosition(new THREE.Vector3()), f1 = dino.arms[1].userData.fist.getWorldPosition(new THREE.Vector3());
      B.g.position.copy(f0).add(f1).multiplyScalar(.5); B.g.position.y += R * .9; B.g.rotation.set(0, 0, 0); B.inner.rotation.set(0, 0, Math.PI / 2);
      return;
    }
    if (!T.fly) { // let go
      const P0 = B.g.position.clone();
      if (T.car) { // straight down onto the car's roof
        const c = carRef.car.position, land = new THREE.Vector3(c.x, 1.45 + R * .6, c.z - .2), dir = new THREE.Vector3(land.x - P0.x, 0, land.z - P0.z).normalize();
        T.fly = { P0, land, dir, h: 2.5, u: 0, dur: 1.3 + Math.hypot(land.x - P0.x, land.z - P0.z) * .035 };
      } else { // an arc that clears his head by a good margin and lands well past him
        const dir = new THREE.Vector3(p.x - P0.x, 0, p.z - P0.z); const dHim = dir.length(); dir.normalize();
        const land = new THREE.Vector3(p.x, 0, p.z).addScaledVector(dir, 8); land.y = R;
        const dTot = Math.hypot(land.x - P0.x, land.z - P0.z), fb = Math.min(.95, dHim / dTot);
        const need = p.y + 4.0 + R, base = P0.y + (land.y - P0.y) * fb, h = Math.max(2.5, (need - base) / (4 * fb * (1 - fb)));
        T.fly = { P0, land, dir, h, u: 0, dur: 1.3 + dTot * .035 };
      }
      sfx.whoosh(); B.g.rotation.y = Math.atan2(T.fly.dir.x, T.fly.dir.z);
    }
    const F = T.fly;
    if (F.u < 1) {
      F.u = Math.min(1, F.u + dt / F.dur); const u = F.u;
      B.g.position.set(F.P0.x + (F.land.x - F.P0.x) * u, F.P0.y + (F.land.y - F.P0.y) * u + 4 * F.h * u * (1 - u), F.P0.z + (F.land.z - F.P0.z) * u);
      B.inner.rotation.y -= dt * 9; B.inner.rotation.x += dt * 3;
      if (F.u >= 1) {
        F.roll = 0; F.y0 = F.land.y; B.inner.rotation.x = 0;
        if (T.car) { smashCar(); F.v = 3.2; F.dir.set(-1, 0, .35).normalize(); toast('CRASH! The dino flattened your car!', 3200); }
        else { sfx.hit(60, .45, .9); sfx.pop(); F.v = 5; toast('Whoa! That one went right over your head!', 2600); }
      }
      return;
    }
    // bounce and roll to a stop, then disappear
    F.roll += dt; F.v = Math.max(0, F.v - dt * 3.2);
    B.g.position.addScaledVector(F.dir, F.v * dt);
    B.g.position.y = R + Math.max(0, F.y0 - R) * Math.max(0, 1 - F.roll * 2.5) + Math.abs(Math.sin(F.roll * 7)) * .6 * Math.max(0, 1 - F.roll * 1.6);
    B.inner.rotation.y -= F.v * dt / R;
    if (F.roll > 2.6) { B.g.scale.setScalar(SIZE * Math.max(.01, 1 - (F.roll - 2.6) * 2)); }
    if (F.roll > 3.1) { B.g.visible = false; this.thr = null; this.lastThrow = this.t; }
  },
  // gone for good (until the next idle spell): no music, no barrel. The smashed car stays smashed until a restart.
  dismiss() {
    if (this.tune) { this.tune.stop(); this.tune = null; }
    if (this.score) { this.score.stop(); this.score = null; }
    this.list.forEach(m => m.g.visible = false); this.barrel.g.visible = false; this.thr = null;
    this.active = false; this.leaving = false; this.watching = false; this.wasIndoors = undefined;
    houseMusic();
  },
  roofY(z) { return TOP2 + .05 + Math.max(0, 6.9 - Math.abs(z + 6)) / 6.9 * 1.6; },
  tick(dt) {
    if (!this.active) return;
    this.t += dt;
    for (const m of this.list) {
      const g = m.g, t = this.t - m.delay, arm = m.arms, leg = m.legs, sx = m.side, wx = sx * 6.75;
      if (this.leaving) {
        // leap off the back of the roof and vanish
        const k = Math.min(1, this.lt / 1.3);
        g.position.set(m.from.x, m.from.y + Math.sin(k * Math.PI) * 2.5 - k * 3, m.from.z - k * 9);
        g.rotation.set(0, Math.PI, 0); arm.forEach(a => a.rotation.set(-2.6, 0, 0));
        continue;
      }
      if (t < 0) continue;
      arm.forEach(a => a.userData.el.rotation.set(0, 0, 0)); m.head.rotation.set(0, 0, 0);
      const step = Math.sin(t * 7), walkPose = () => { leg[0].rotation.x = step * .6; leg[1].rotation.x = -step * .6; arm[0].rotation.set(-step * .5, 0, 0); arm[1].rotation.set(step * .5, 0, 0); };
      if (t < 3.5) { // come round from behind the house to its side wall
        const k = t / 3.5, x = sx * 10 + (wx - sx * 10) * k, z = -22 + (m.wz + 22) * k;
        g.position.set(x, Math.abs(step) * .12, z); g.rotation.set(0, Math.atan2(wx - sx * 10, m.wz + 22), 0); walkPose();
      } else if (t < 7.5) { // climb the side wall hand over hand: reach, grab, haul the body up, knees pushing off
        const PULLS = 6, c = (t - 3.5) / 4 * PULLS, n = Math.floor(c), f = c - n, hand = n % 2;
        const lift = (n + ease(Math.min(1, f * 1.4))) / PULLS;              // each pull is a lurch, then a pause to re-grip
        g.position.set(wx - sx * Math.sin(f * Math.PI) * .08, lift * (TOP2 - .9), m.wz + Math.sin(c * Math.PI) * .12);
        g.rotation.set(.18 + Math.sin(f * Math.PI) * .1, -sx * Math.PI / 2, Math.sin(c * Math.PI) * .14);
        arm.forEach((a, i) => {
          if (i === hand) { a.rotation.set(-2.95 + f * 1.2, 0, 0); a.userData.el.rotation.x = -f * 1.3; }   // the gripping hand pulls down to the chest
          else { a.rotation.set(-1.9 - f * 1.05, 0, 0); a.userData.el.rotation.x = -1.0 + f * 1.0; }          // the free hand reaches up for the next hold
        });
        leg[hand].rotation.x = -1.1 + f * .9; leg[1 - hand].rotation.x = -.2 - f * .6;
        m.head.rotation.x = -.35;
      } else if (t < 8.3) { // haul over the eave
        const k = ease((t - 7.5) / .8), x = wx + (m.tx - wx) * .12 * k, z = m.wz;
        g.position.set(x, (TOP2 - .9) + (this.roofY(z) - (TOP2 - .9)) * k, z); g.rotation.set(.7 * (1 - k) + .2 * Math.sin(k * Math.PI), Math.atan2(m.tx - wx, m.tz - m.wz) * k + (-sx * Math.PI / 2) * (1 - k), 0);
        arm.forEach(a => { a.rotation.set(-2.2 + k * 1.8, 0, 0); a.userData.el.rotation.x = -.6 * (1 - k); });
        leg[0].rotation.x = -1.2 * (1 - k); leg[1].rotation.x = -.5 * Math.sin(k * Math.PI);
      } else if (t < 9.5) { // across the roof to a spot facing the street
        const x0 = wx + (m.tx - wx) * .12, k = (t - 8.3) / 1.2, x = x0 + (m.tx - x0) * k, z = m.wz + (m.tz - m.wz) * k;
        g.position.set(x, this.roofY(z), z); g.rotation.set(0, Math.atan2(m.tx - wx, m.tz - m.wz), 0); walkPose();
      } else if (t < 10.3) { // turn to face the street
        const k = ease((t - 9.5) / .8), a0 = Math.atan2(m.tx - wx, m.tz - m.wz);
        g.rotation.set(0, a0 * (1 - k), 0); leg.forEach(l => l.rotation.x = 0); arm.forEach(a => a.rotation.set(0, 0, 0));
      } else { // fists up by the face, shaking fast, leaning in now and then: "I'm gonna get you!"
        const sh = Math.sin(t * 24 + m.tx), lunge = Math.pow(Math.max(0, Math.sin(t * 1.4 + m.tx)), 4);
        g.rotation.set(.1 + lunge * .32, 0, Math.sin(t * 2.3 + m.tx) * .05);
        g.position.y = this.roofY(g.position.z) + Math.abs(Math.sin(t * 3.2 + m.tx)) * .07;
        if (m.kind === 'dino' && this.thr && this.thr.t < 1.7) { this.throwPose(m); continue; }
        arm.forEach((a, i) => {
          const side = i ? 1 : -1;
          if (i === m.fist) { a.rotation.set(-1.55 - lunge * .35 + sh * .1, 0, side * .3); a.userData.el.rotation.set(-1.45 + sh * .24, 0, 0); } // one fist up, shaking
          else { a.rotation.set(.15, 0, side * .55); a.userData.el.rotation.set(-1.6, 0, 0); }                                            // the other hand on the hip
        });
        m.head.rotation.set(-.12 + Math.sin(t * 24) * .03 - lunge * .1, Math.sin(t * 1.7 + m.tx) * .25, 0);
        m.mouth.scale.y = 1 + (.3 + lunge) * .7;
        leg[0].rotation.x = -lunge * .25; leg[1].rotation.x = 0;
      }
    }
    if (!this.leaving) this.tickBarrel(dt);
    // Their music owns the soundtrack while they're up there and he's outdoors; going inside hands it back to the house music.
    const indoors = inside(boy.pos) || mode === 'pc' || mode === 'cab';
    if (indoors && !this.leaving && this.t > 3.5) { this.dismiss(); return; } // he went inside: they're gone when he comes back out
    if (!this.leaving && !indoors && this.t > 11.3 && !this.tune && settings.music) { this.tune = sfx.stomp(); music.pause(.5); }
    if (this.tune && (this.leaving || indoors || !settings.music)) { this.tune.stop(); this.tune = null; }
    if (this.score && (indoors || this.leaving)) { this.score.stop(); this.score = null; }
    if (indoors !== this.wasIndoors) { this.wasIndoors = indoors; houseMusic(); }
    if (!this.leaving && this.t > this.roarAt) { if (this.watching) sfx.roar(.8 + Math.random() * .5); this.roarAt += 3.2; }
    if (!this.leaving && this.t > 3.9 && this.t < 9.5 && Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) sfx.hit(70, .2, .35);
    if (this.leaving) { this.barrel.g.visible = false; this.thr = null; this.lt += dt; if (this.lt > 1.4) { this.active = false; this.list.forEach(m => m.g.visible = false); houseMusic(); } return; }
    if (!this.watching) return;
    // the camera steps back to watch from the street
    camera.position.lerp(this.cam.pos, Math.min(1, dt * 1.2)); lookCur.lerp(this.cam.look, Math.min(1, dt * 1.2)); camera.lookAt(lookCur);
  }
};
function noteInput() {
  lastInput = performance.now();
  if (monsters.active) monsters.end();
}
for (const ev of ['keydown', 'pointerdown', 'pointermove', 'wheel', 'touchstart']) addEventListener(ev, noteInput, { capture: true, passive: true });

function tick() {
  const dt = Math.min(clock.getDelta(), window.__dtMax || .05);
  const t = clock.elapsedTime;
  if (mode !== 'pc') update(dt, t);
  if (mode === 'walk' && !autoPath && !camTween && boy.ready && performance.now() - lastInput > IDLE_MS) {
    if (!monsters.active) monsters.start();
    else if (!monsters.watching && !monsters.leaving) { monsters.watching = true; music.pause(1); } // idle again: back to the street view of the roof
  }
  monsters.tick(dt);
  if (boy.mixer) boy.mixer.update(dt);
  if (boy.ready && mode !== 'pc') poseLean();
  sitT += (sitTarget - sitT) * Math.min(1, dt * 5);
  boy.root.position.copy(boy.pos); boy.root.position.y -= sitT * (boy.sitDrop || .43);
  tickNpc(dt);
  boy.root.rotation.y = boy.yaw;
  lieT += (lieTarget - lieT) * Math.min(1, dt * 4); boy.root.rotation.x = -lieT * Math.PI / 2;
  if (show.update(dt)) { showTex.needsUpdate = true; if (!tvFull.hidden) tvFullCtx.drawImage(show.canvas, 0, 0); }
  if (boy.ready) { poseSeated(sitT, mode === 'pc'); poseLying(lieT); }
  if (chair) chair.rotation.y = 0;
  clouds.material.uniforms.uTime.value = t;
  // the PC screen on the desk mirrors the MAME32 desktop
  if ((screenT += dt) > .25) { screenT = 0; pc.paintMonitor(); for (const s of screens) { const g = s.tex.image.getContext('2d'); s.draw(g, s.tex.image.width, s.tex.image.height, t); s.tex.needsUpdate = true; } }
  // bloom is for the neon indoors and the night; outside by day the HDR sky would smear into haze
  const camIn = inside(camera.position);
  hemi.intensity += ((camIn ? hemiBase * .35 : hemiBase) - hemi.intensity) * .1;
  scene.environmentIntensity += ((camIn ? envBase * .5 : envBase) - scene.environmentIntensity) * .1;
  if (window.__noBloom) bloom.strength = 0; else bloom.strength = .45;
  bloom.enabled = settings.quality === 'high' && settings.time === 'night';
  if (mode !== 'pc') composer.render();
  requestAnimationFrame(tick);
}
function update(dt, t) {
  // front door swings open when he's near it
  const nearDoor = Math.hypot(boy.pos.x, boy.pos.z - .1) < 2.2 && mode !== 'title';
  doorOpen += ((nearDoor ? 1 : 0) - doorOpen) * Math.min(1, dt * 4);
  frontDoor.rotation.y = doorOpen * 1.6;
  if (mode === 'title') {
    const a = t * .05;
    camera.position.set(Math.sin(a) * 17, 4.4 + Math.sin(t * .1) * .4, 13 + Math.cos(a) * 4); lookCur.set(0, 3.2, -4); camera.lookAt(lookCur);
    return;
  }
  tickHouse(dt, t);
  if (mode === 'sit') updateSit(dt);
  if (mode === 'stand' || standAnim) updateStand(dt);
  if (mode === 'rest') updateRest(dt);
  if (camTween) {
    camTween.t += dt / camTween.dur; const k = ease(Math.min(1, camTween.t));
    camera.position.copy(bez(camTween.pts, k)); lookCur.copy(bez(camTween.look, k)); camera.lookAt(lookCur);
    if (camTween.t >= 1) { const d = camTween.done; camTween = null; d && d(); }
    return;
  }
  if (mode === 'sit' || mode === 'stand' || mode === 'rest') return;
  let mx = 0, mz = 0;
  if (mode === 'walk') {
    const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - touchStick.dy;
    const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touchStick.dx;
    const fx = -Math.sin(orbit.yaw), fz = -Math.cos(orbit.yaw);
    mx = fx * f - fz * s; mz = fz * f + fx * s;
  } else if (mode === 'auto' && autoPath) {
    const target = autoPath.pts[0];
    const dx = target.x - boy.pos.x, dz = target.z - boy.pos.z, d = Math.hypot(dx, dz);
    if (d < .15) { autoPath.pts.shift(); if (!autoPath.pts.length) { const c = autoPath.cab; autoPath = null; mode = 'walk'; if (c) playCabinet(c); else sitDown(); return; } }
    else { mx = dx / d; mz = dz / d; }
  }
  const len = Math.hypot(mx, mz);
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(touchStick.dx, touchStick.dy) > .9;
  // ease up to speed and back down instead of starting and stopping dead
  const want = len > .01 ? (run && mode === 'walk' ? 4.2 : 1.9) * Math.min(1, Math.max(.35, len)) : 0;
  boy.speed += (want - boy.speed) * Math.min(1, dt * (want > boy.speed ? 4.5 : 7));
  let turn = 0;
  if (len > .01) {
    mx /= len; mz /= len; boy.dir = { x: mx, z: mz };
    let dy = Math.atan2(mx, mz) - boy.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    turn = dy * Math.min(1, dt * 9); boy.yaw += turn;
    if (!orbit.dragging) { let d2 = (boy.yaw + Math.PI) - orbit.yaw; d2 = Math.atan2(Math.sin(d2), Math.cos(d2)); orbit.yaw += d2 * Math.min(1, dt * (mode === 'auto' ? 1.6 : .8)); }
  }
  if (boy.speed > .03 && boy.dir) {
    boy.pos.x += boy.dir.x * boy.speed * dt; boy.pos.z += boy.dir.z * boy.speed * dt;
    collide(boy.pos, .26, lvlOf(boy.pos.y)); boy.pos.y = floorY(boy.pos, boy.pos.y);
  } else boy.speed = 0;
  setLoco(boy.speed, dt);
  const kk = Math.min(1, dt * 6);
  loco.pitch += ((boy.speed > 2.4 ? .14 * Math.min(1, (boy.speed - 2.4) / 1.5) : boy.speed * .015) - loco.pitch) * kk;
  loco.lean += (Math.max(-.22, Math.min(.22, -turn / Math.max(dt, 1e-3) * .035 * Math.min(1, boy.speed / 2))) - loco.lean) * kk;
  if (!(monsters.active && monsters.watching && !monsters.leaving)) { // the monster show owns the camera while it's being watched
    const d = desiredCam();
    if (window.__snapCam) { camera.position.copy(d.pos); lookCur.copy(d.look); }
    camera.position.lerp(d.pos, Math.min(1, dt * 6)); lookCur.lerp(d.look, Math.min(1, dt * 8)); camera.lookAt(lookCur);
  }
  const lv = lvlOf(boy.pos.y);
  nearChair = lv === 0 && Math.hypot(boy.pos.x - PC.stand.x, boy.pos.z - PC.stand.z) < 1.0;
  nearCab = null; if (lv === 0) for (const c of cabinets) if (Math.hypot(boy.pos.x - c.front.x, boy.pos.z - c.front.z) < .8) nearCab = c;
  nearSpot = null; let best = 1;
  if (!nearChair && !nearCab) for (const sp of spots) { if (sp.lvl !== lv) continue; const d = Math.hypot(boy.pos.x - sp.x, boy.pos.z - sp.z) / sp.r; if (d < best) { best = d; nearSpot = sp; } }
  const pr = $('#prompt');
  pr.hidden = !(mode === 'walk' && (nearChair || nearCab || nearSpot));
  if (!pr.hidden) {
    $('#prompt-p1').textContent = nearCab ? 'PRESS E TO PLAY' : nearChair ? 'PRESS E TO SIT DOWN' : (typeof nearSpot.p1 === 'function' ? nearSpot.p1() : nearSpot.p1);
    $('#prompt-sit').textContent = nearCab ? (nearCab.games.length > 1 ? `${nearCab.title} \u00b7 choose a game` : `Play ${nearCab.title}`) : nearChair ? 'Sit at the computer' : nearSpot.label();
  }
  // objective chip: where he is
  const onStairs = boy.pos.x > STAIR.x0 && boy.pos.z < STAIR.z0 && boy.pos.z > STAIR.z1;
  const room = !inside(boy.pos) ? 'Outside' : onStairs ? 'Stairs' : lv ? (boy.pos.x < 2 ? 'Bedroom' : boy.pos.z > -6 ? 'Bathroom' : 'Upstairs hall')
    : boy.pos.z > -6 ? (boy.pos.x > 2.6 ? 'Kitchen' : 'Living room') : (boy.pos.x < 0 ? 'Game room' : 'Hall');
  $('#room').textContent = room;
  if (room === 'Game room') $('#objective').hidden = true;
}

// ---------------------------------------------------------------- UI
function cycleTime() {
  const order = ['day', 'sunset', 'night'];
  settings.time = order[(order.indexOf(settings.time) + 1) % 3]; saveSettings(); applyTime();
}
$('#do-time').addEventListener('click', cycleTime);
$('#do-full').addEventListener('click', () => window.toggleFullscreen(document.documentElement));
$('#btn-go').addEventListener('click', goToComputer);
$('#prompt-sit').addEventListener('click', () => {
  if (mode === 'rest' && rest) { if (rest.kind === 'shower') leaveRest(); else if (tvActive === rest.s.tv) tvOff(); else tvOn(rest.s.tv); return; }
  if (mode === 'walk') useNearest();
});

// ---------------------------------------------------------------- playing a cabinet
const arcade = createArcade({ onLeave: leaveCabinet });
let cabNow = null;
function playCabinet(c) {
  cabNow = c; mode = 'cab'; autoPath = null; tvOff();
  $('#prompt').hidden = true; $('#objective').hidden = true;
  boy.pos.copy(c.front); boy.yaw = c.ry + Math.PI; setAnim('Idle', .3);  // face the screen
  const close = c.screen.clone().addScaledVector(c.normal, .62);
  const over = c.front.clone().addScaledVector(c.normal.clone().setY(0).normalize(), .6).setY(1.75);
  camTween = { t: 0, pts: [camera.position.clone(), over, close], look: [lookCur.clone(), c.screen.clone(), c.screen.clone()], dur: 1.4, done: () => {
    $('#hud').hidden = true; $('#walkstick').classList.add('off'); music.pause(1); arcade.open(c);
  } };
  Reg.audio.unlock();
}
function leaveCabinet() {
  const c = cabNow; cabNow = null;
  $('#hud').hidden = false; $('#walkstick').classList.remove('off');
  mode = 'stand'; houseMusic();
  const back = c.front.clone().addScaledVector(c.normal.clone().setY(0).normalize(), 2.2).setY(1.8);
  camTween = { t: 0, pts: [camera.position.clone(), back], look: [lookCur.clone(), c.screen.clone().setY(1.2)], dur: 1.0, done: () => { mode = 'walk'; orbit.yaw = Math.atan2(back.x - boy.pos.x, back.z - boy.pos.z); } };
}
$('#do-quality').addEventListener('click', () => {
  settings.quality = settings.quality === 'high' ? 'low' : 'high'; saveSettings(); applyQuality();
});
function applyQuality() {
  const hi = settings.quality === 'high';
  renderer.shadowMap.enabled = hi;
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
  $('#btn-quality').textContent = hi ? 'High' : 'Low';
  resize();
}
function togglePlayer() { if (!chars.teen) { toast('The teen is still loading...'); return; } switchPlayer(boy.who === 'guy' ? 'teen' : 'guy'); }
$('#do-player').addEventListener('click', togglePlayer);
$('#do-sound').addEventListener('click', () => { settings.sound = !settings.sound; Reg.audio.setMuted(!settings.sound); sfx.setMuted(!settings.sound); show.setMuted(!settings.sound); $('#btn-sound').textContent = settings.sound ? 'On' : 'Off'; saveSettings(); });
// 70s walking music while he's in the house or yard; it fades out at the PC
const music = createMusic();
// Music is only the background groove; the Sound button covers everything else (game and effect sounds)
function monsterMusicOn() { return monsters.active && !monsters.leaving && !inside(boy.pos) && mode !== 'pc' && mode !== 'cab'; }
function houseMusic() { if (settings.music && mode !== 'pc' && mode !== 'cab' && mode !== 'title' && !tvActive && !monsterMusicOn()) music.play(); else music.pause(.6); }
$('#do-music').addEventListener('click', () => { settings.music = !settings.music; $('#btn-music').textContent = settings.music ? 'On' : 'Off'; saveSettings(); houseMusic(); });
$('#btn-music').textContent = settings.music ? 'On' : 'Off';

// ---------------------------------------------------------------- boot
// canvas textures (neon sign, posters, marquees) need the web fonts before they're drawn
await Promise.race([Promise.all(['150px Monoton', '54px Audiowide', '10px "Press Start 2P"'].map(f => document.fonts.load(f))).catch(() => { }), new Promise(r => setTimeout(r, 3000))]);
buildHouse(); buildLiving(); buildKitchen(); buildKitchenWorks(); buildGameRoom(); buildStairs(); buildUpstairs(); houseDetails(); monsters.build();
boy.pos.set(0, 0, 11.5); boy.yaw = Math.PI;
applyTime(); applyQuality(); resize();
Reg.audio.setMuted(!settings.sound); $('#btn-sound').textContent = settings.sound ? 'On' : 'Off';
requestAnimationFrame(tick);
const bar = $('#load-bar'), lbl = $('#load-label');
let loaded = 0;
loadBoy((i, f) => { loaded += f; bar.style.width = (10 + loaded * 45) + '%'; })
  .then(() => {
    chars.guy = { name: 'guy', label: 'Guy', sitDrop: .43, walkV: 1.45, runV: 3.9, leanK: 1 };
    bar.style.width = '100%'; $('#loader').classList.add('ready'); lbl.textContent = 'Ready'; if (location.hash === '#pc') startAtPC();
    loadTeen().catch(e => { console.warn('teen', e); $('#btn-player').textContent = 'Guy'; });
  })
  .catch(e => { console.error(e); lbl.textContent = 'The character could not load. Walk in anyway.'; $('#loader').classList.add('ready'); });
// Straight to the computer: he's already in the chair with MAME32 open (the download's launcher opens #pc)
function startAtPC() {
  Reg.audio.unlock();
  $('#title').classList.add('gone'); setTimeout(() => $('#title').hidden = true, 700);
  $('#objective').hidden = true;
  boy.pos.copy(PC.chair).setZ(PC.chair.z + .08); boy.yaw = Math.PI; sitTarget = sitT = 1; setAnim('Idle', 0);
  const fill = PC.screenH * .5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.12;
  camera.position.copy(PC.screen).addScaledVector(PC.screenNormal, fill); lookCur.copy(PC.screen); camera.lookAt(lookCur);
  mode = 'pc'; openPC();
  pc.ready.then(() => pc.openAvailable());
}
$('#enter-pc').addEventListener('click', startAtPC);
if (location.hash === '#pc') $('#loader').classList.add('to-pc');
$('#enter').addEventListener('click', () => {
  Reg.audio.unlock();
  $('#title').classList.add('gone'); setTimeout(() => $('#title').hidden = true, 700);
  $('#hud').hidden = false; $('#objective').hidden = false;
  mode = 'walk'; orbit.yaw = 0; orbit.pitch = .2;
  houseMusic();
  const d = desiredCam(); camera.position.copy(d.pos).add(new THREE.Vector3(0, 2, 4)); lookCur.copy(d.look);
  canvas3d.focus();
});
window.__room = { chars, switchPlayer, get npc() { return npc; }, smash: () => smashCar(), monsters, shower, tvOn, tvOff, clickTV, restAt, leaveRest, show, kitchen, spots, get rest() { return rest; }, useNearest, cabinets, playCabinet, setSit: v => { sitTarget = v; sitT = v; }, get mode() { return mode; }, orbit, boy, goToComputer, sitDown, standUp, camera, settings, applyTime, pc };
