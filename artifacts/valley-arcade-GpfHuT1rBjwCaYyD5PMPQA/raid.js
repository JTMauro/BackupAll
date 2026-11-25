// Arcade raid: five armed intruders walk in, weapons appear around the hall, each takedown pays $5.
// The intruders can't hurt the player; their shots always miss.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const WEAPONS = {
  pistol: { name: 'Pistol', slot: 1, dmg: 40, rate: .28, auto: false, spread: .01, kind: 'hit', color: '#ffd24a' },
  mg: { name: 'Machine gun', slot: 2, dmg: 24, rate: .085, auto: true, spread: .028, kind: 'hit', color: '#ff8a3b' },
  crossbow: { name: 'Crossbow', slot: 3, dmg: 160, rate: .95, auto: false, kind: 'bolt', speed: 42, color: '#c27bff' },
  bfg: { name: 'BFG 9000', slot: 4, dmg: 520, rate: 2.2, auto: false, kind: 'plasma', speed: 13, radius: 3.8, color: '#5bff7a' },
  heavy: { name: 'Heavy Barrel', slot: 5, dmg: 160, rate: .38, auto: true, kind: 'fan', rays: 5, arc: .42, color: '#ff9d2b' }
};
const ORDER = ['pistol', 'mg', 'crossbow', 'bfg', 'heavy'];
const SPOTS = [[-2.8, -3.4], [3.0, -7.6], [-2.6, -11.6], [2.6, -12.6], [0, -5.4]];
const TOTAL = 5;

const V = () => new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _v1 = V(), _v2 = V(), _up = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------- weapon models (barrel along +Z, origin at the grip)
const metal = () => new THREE.MeshStandardMaterial({ color: 0x2b2d31, metalness: .85, roughness: .32 });
const polymer = () => new THREE.MeshStandardMaterial({ color: 0x131315, metalness: .1, roughness: .7 });
function part(g, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m;
}
function zCyl(r, len, seg = 16, r2) { const g = new THREE.CylinderGeometry(r2 == null ? r : r2, r, len, seg); g.rotateX(Math.PI / 2); return g; }
function muzzle(g, z, y = 0) { const m = new THREE.Object3D(); m.position.set(0, y, z); g.add(m); g.userData.muzzle = m; }

function buildPistol() {
  const g = new THREE.Group(), M = metal(), P = polymer();
  part(g, new THREE.BoxGeometry(.03, .032, .19), M, 0, .07, .04);
  for (let i = 0; i < 6; i++) part(g, new THREE.BoxGeometry(.031, .022, .003), P, 0, .07, -.04 + i * .008);
  part(g, new THREE.BoxGeometry(.028, .022, .16), P, 0, .045, .035);
  part(g, new THREE.BoxGeometry(.029, .115, .047), P, 0, -.005, -.03, .22);
  part(g, new THREE.TorusGeometry(.019, .0035, 6, 16, Math.PI), P, 0, .035, .045, 0, Math.PI / 2, Math.PI);
  part(g, new THREE.BoxGeometry(.004, .016, .006), M, 0, .03, .04);
  part(g, zCyl(.0065, .012), M, 0, .072, .137);
  part(g, new THREE.BoxGeometry(.006, .008, .006), M, 0, .09, .125);
  part(g, new THREE.BoxGeometry(.018, .008, .006), M, 0, .09, -.045);
  muzzle(g, .145, .072);
  return g;
}
function buildMG() {
  const g = new THREE.Group(), M = metal(), P = polymer();
  part(g, new THREE.BoxGeometry(.048, .07, .3), M, 0, .07, .08);
  part(g, zCyl(.03, .3, 8), P, 0, .07, .38);
  for (let i = 0; i < 4; i++) part(g, new THREE.BoxGeometry(.012, .006, .28), M, Math.cos(i * Math.PI / 2) * .031, .07 + Math.sin(i * Math.PI / 2) * .031, .38, 0, 0, i * Math.PI / 2);
  part(g, zCyl(.009, .16), M, 0, .07, .6);
  part(g, zCyl(.014, .055, 6), M, 0, .07, .69);
  part(g, new THREE.BoxGeometry(.03, .17, .065), M, 0, -.035, .14, .22);
  part(g, new THREE.BoxGeometry(.032, .095, .042), P, 0, -.005, -.01, .38);
  part(g, new THREE.BoxGeometry(.04, .06, .22), P, 0, .055, -.18);
  part(g, new THREE.BoxGeometry(.044, .11, .03), P, 0, .04, -.295);
  part(g, new THREE.BoxGeometry(.024, .012, .3), M, 0, .111, .12);
  part(g, zCyl(.02, .13), M, 0, .14, .09);
  part(g, new THREE.CircleGeometry(.016, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, .2, .2), toneMapped: false }), 0, .14, .156);
  part(g, new THREE.BoxGeometry(.012, .03, .012), M, 0, .1, .5);
  muzzle(g, .72, .07);
  return g;
}
function buildCrossbow() {
  const g = new THREE.Group(), M = metal(), P = polymer();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5b3a1e, roughness: .6, metalness: .05 });
  part(g, new THREE.BoxGeometry(.05, .055, .58), wood, 0, .03, .14);
  part(g, new THREE.BoxGeometry(.05, .13, .13), wood, 0, .0, -.2, .15);
  part(g, new THREE.BoxGeometry(.03, .09, .04), P, 0, -.03, -.04, .3);
  part(g, new THREE.BoxGeometry(.012, .01, .5), M, 0, .062, .2);
  // limbs: a flat arc in front, plus the string drawn back to the nock
  const pivot = new THREE.Group(); pivot.position.set(0, .045, .1); pivot.rotation.x = Math.PI / 2; g.add(pivot);
  const inner = new THREE.Group(); inner.rotation.z = Math.PI / 2 - .78; pivot.add(inner);
  const limb = new THREE.Mesh(new THREE.TorusGeometry(.34, .012, 8, 32, 1.56), new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: .4, metalness: .4 }));
  limb.castShadow = true; inner.add(limb);
  const tip = a => new THREE.Vector3(Math.cos(a) * .34, .045, .1 + Math.sin(a) * .34);
  const L = tip(Math.PI / 2 + .78), R = tip(Math.PI / 2 - .78), nock = new THREE.Vector3(0, .062, .08);
  const strMat = new THREE.MeshStandardMaterial({ color: 0xddd6c8, roughness: .8 });
  for (const t of [L, R]) {
    const d = nock.clone().sub(t), s = new THREE.Mesh(new THREE.CylinderGeometry(.0015, .0015, d.length(), 4), strMat);
    s.position.copy(t).add(nock).multiplyScalar(.5); s.quaternion.setFromUnitVectors(_up, d.normalize()); g.add(s);
  }
  // loaded bolt
  part(g, zCyl(.004, .38), new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: .6, roughness: .3 }), 0, .072, .26);
  part(g, new THREE.ConeGeometry(.008, .03, 8).rotateX(Math.PI / 2), M, 0, .072, .465);
  for (const a of [0, 2.1, 4.2]) part(g, new THREE.PlaneGeometry(.018, .04), new THREE.MeshStandardMaterial({ color: 0xd8262b, side: THREE.DoubleSide }), Math.cos(a) * .008, .072 + Math.sin(a) * .008, .09, 0, Math.PI / 2, a);
  part(g, zCyl(.018, .14), M, 0, .11, .04);
  muzzle(g, .48, .072);
  return g;
}
function buildBFG() {
  const g = new THREE.Group(), M = metal(), P = polymer();
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(.5, 3, .7), toneMapped: false });
  const cell = new THREE.MeshPhysicalMaterial({ color: 0x3cff6a, emissive: 0x22ff55, emissiveIntensity: 1.6, transparent: true, opacity: .85, roughness: .1 });
  part(g, new THREE.BoxGeometry(.15, .15, .46), M, 0, .1, .12);
  part(g, new THREE.BoxGeometry(.17, .05, .36), P, 0, .19, .12);
  for (let i = 0; i < 5; i++) part(g, new THREE.BoxGeometry(.16, .008, .02), P, 0, .217, -.02 + i * .06);
  part(g, zCyl(.07, .2, 20), M, 0, .1, .44);
  part(g, zCyl(.082, .04, 20), P, 0, .1, .53);
  part(g, new THREE.CircleGeometry(.058, 24), glow, 0, .1, .552);
  part(g, new THREE.TorusGeometry(.064, .006, 8, 24), glow, 0, .1, .553);
  for (const s of [-1, 1]) {
    part(g, zCyl(.03, .3, 14), cell, s * .1, .07, .12);
    part(g, zCyl(.034, .02, 14), M, s * .1, .07, -.035); part(g, zCyl(.034, .02, 14), M, s * .1, .07, .275);
  }
  part(g, new THREE.SphereGeometry(.045, 18, 12), glow, 0, .1, .2).scale.set(1, 1, 1.4);
  part(g, new THREE.BoxGeometry(.09, .06, .14), new THREE.MeshPhysicalMaterial({ color: 0x113322, transparent: true, opacity: .35, roughness: 0 }), 0, .19, .2);
  part(g, new THREE.TorusGeometry(.07, .013, 8, 20, Math.PI), P, 0, .23, .14, 0, Math.PI / 2, 0);
  part(g, new THREE.BoxGeometry(.04, .12, .05), P, 0, -.02, -.02, .3);
  part(g, new THREE.BoxGeometry(.06, .1, .12), P, 0, .08, -.16);
  muzzle(g, .56, .1);
  return g;
}
// Heavy Barrel: a squat super-cannon with cooling rings, an ammo drum and a glowing core
function buildHeavy() {
  const g = new THREE.Group(), M = metal(), P = polymer();
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.5, .4), toneMapped: false });
  const olive = new THREE.MeshStandardMaterial({ color: 0x4a4f2a, metalness: .5, roughness: .45 });
  part(g, new THREE.BoxGeometry(.12, .12, .42), olive, 0, .09, .1);
  part(g, new THREE.BoxGeometry(.13, .04, .3), M, 0, .165, .08);
  part(g, zCyl(.05, .34, 20), M, 0, .09, .46);
  for (let i = 0; i < 6; i++) part(g, zCyl(.062, .018, 20), P, 0, .09, .34 + i * .045);
  part(g, zCyl(.068, .05, 6), M, 0, .09, .64);
  part(g, new THREE.CircleGeometry(.04, 20), glow, 0, .09, .666);
  part(g, zCyl(.075, .09, 24).rotateZ(Math.PI / 2), olive, -.1, .05, .05);
  part(g, new THREE.CylinderGeometry(.075, .075, .07, 24).rotateZ(Math.PI / 2), olive, -.1, .05, .05);
  for (const z of [.0, .22]) part(g, new THREE.BoxGeometry(.03, .03, .03), glow, .066, .12, z);
  part(g, new THREE.BoxGeometry(.035, .1, .045), P, 0, -.02, -.03, .3);
  part(g, new THREE.TorusGeometry(.06, .012, 8, 20, Math.PI), P, 0, .19, .2, 0, Math.PI / 2, 0);
  part(g, new THREE.BoxGeometry(.05, .09, .12), P, 0, .07, -.16);
  muzzle(g, .68, .09);
  return g;
}
const BUILDERS = { pistol: buildPistol, mg: buildMG, crossbow: buildCrossbow, bfg: buildBFG, heavy: buildHeavy };

// ---------------------------------------------------------------- helpers
function spriteTex(draw, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const markerTex = spriteTex((g, s) => {
  g.fillStyle = '#ff2a2a'; g.strokeStyle = '#fff'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(s * .15, s * .2); g.lineTo(s * .85, s * .2); g.lineTo(s * .5, s * .85); g.closePath(); g.fill(); g.stroke();
});
const flashTex = spriteTex((g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,230,1)'); r.addColorStop(.25, 'rgba(255,200,90,.9)'); r.addColorStop(1, 'rgba(255,120,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255,230,160,.9)'; g.lineWidth = 6; g.translate(s / 2, s / 2);
  for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(s * .48, 0); g.stroke(); }
});
const puffTex = spriteTex((g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s);
});
function labelTex(text, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.font = '44px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 18; g.fillStyle = '#fff'; g.fillText(text, 256, 64); g.shadowBlur = 0; g.fillStyle = color; g.globalAlpha = .55; g.fillText(text, 256, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Ray vs upright cylinder (people). Returns distance or Infinity.
function rayCyl(o, d, base, r, h) {
  const ox = o.x - base.x, oz = o.z - base.z;
  const a = d.x * d.x + d.z * d.z, b = 2 * (ox * d.x + oz * d.z), c = ox * ox + oz * oz - r * r;
  const disc = b * b - 4 * a * c; if (disc < 0 || a < 1e-8) return Infinity;
  const s = Math.sqrt(disc);
  for (const t of [(-b - s) / (2 * a), (-b + s) / (2 * a)]) {
    if (t < 0) continue; const y = o.y + d.y * t - base.y; if (y >= 0 && y <= h) return t;
  }
  return Infinity;
}
// Point a bone's +Y axis (the direction Mixamo bones run along) at a world direction.
function pointBone(bone, dir, w = 1) {
  if (!bone) return;
  bone.getWorldQuaternion(_q1);
  _v1.set(0, 1, 0).applyQuaternion(_q1);
  _q2.setFromUnitVectors(_v1, dir);
  if (w < 1) _q2.slerp(_q3.identity(), 1 - w);
  _q2.multiply(_q1);
  bone.parent.getWorldQuaternion(_q3).invert();
  bone.quaternion.copy(_q3.multiply(_q2));
  bone.updateMatrixWorld(true);
}

// ---------------------------------------------------------------- the raid
export function createRaid(ctx) {
  const { scene, camera, boy, collide, solids, audio } = ctx;
  const R = {
    active: false, ending: false, owned: new Set(), weapon: null, fireT: 0, triggerHeld: false,
    pickups: [], foes: [], fx: [], bolts: [], killed: 0, earned: 0, shake: 0
  };
  const ray = new THREE.Raycaster();
  const flashLight = new THREE.PointLight(0xffc070, 0, 6, 2); scene.add(flashLight);
  const alarm = new THREE.PointLight(0xff1020, 0, 26, 1.2); alarm.position.set(0, 3.2, -8); scene.add(alarm);
  const held = {};
  for (const k of ORDER) { held[k] = BUILDERS[k](); held[k].visible = false; scene.add(held[k]); }

  // ----- effects
  function addFx(obj, life, update) { scene.add(obj); R.fx.push({ obj, life, t: 0, update }); }
  function flash(pos, size = .35, color = 0xffd090) {
    flashLight.distance = 6;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    s.position.copy(pos); s.scale.setScalar(size * (.7 + Math.random() * .6)); s.material.rotation = Math.random() * 6;
    addFx(s, .06);
    flashLight.position.copy(pos); flashLight.intensity = 8; flashLight.color.set(color);
  }
  function tracer(a, b, color = 0xffe39a, width = .012) {
    const d = b.clone().sub(a), len = d.length(); if (len < .05) return;
    const m = new THREE.Mesh(new THREE.BoxGeometry(width, width, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(3), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.scale.z = len; m.position.copy(a).addScaledVector(d, .5); m.lookAt(b);
    addFx(m, .07, (o, k) => { o.material.opacity = 1 - k; });
  }
  function puffs(pos, color, n = 6, speed = 1.5, size = .12, life = .45) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color, transparent: true, depthWrite: false, blending: color === 0x8a0d0d ? THREE.NormalBlending : THREE.AdditiveBlending }));
      s.position.copy(pos); s.scale.setScalar(size);
      const v = new THREE.Vector3((Math.random() - .5), Math.random() * .8, (Math.random() - .5)).multiplyScalar(speed);
      addFx(s, life * (.6 + Math.random() * .6), (o, k, dt) => { o.position.addScaledVector(v, dt); v.y -= 4 * dt; o.material.opacity = 1 - k; o.scale.setScalar(size * (1 + k)); });
    }
  }
  // ----- sounds
  const sfx = {
    pistol() { audio.noise(.18, { vol: .5, freq: 3200, slideTo: 300 }); audio.tone(140, .12, { type: 'square', vol: .18, slideTo: 60 }); },
    mg() { audio.noise(.09, { vol: .4, freq: 2600, slideTo: 400 }); audio.tone(110, .07, { type: 'square', vol: .14, slideTo: 50 }); },
    crossbow() { audio.tone(520, .18, { type: 'triangle', vol: .3, slideTo: 140 }); audio.noise(.06, { vol: .2, freq: 5000, type: 'highpass' }); },
    bfgCharge() { audio.tone(80, .55, { type: 'sawtooth', vol: .18, slideTo: 900 }); audio.tone(160, .55, { type: 'square', vol: .06, slideTo: 1800 }); },
    bfgBoom() { audio.noise(1.4, { vol: .8, freq: 1800, slideTo: 60 }); audio.tone(55, 1.0, { type: 'sine', vol: .5, slideTo: 25 }); },
    foe(dist) { const v = Math.max(.04, .3 - dist * .015); audio.noise(.12, { vol: v, freq: 2000, slideTo: 300 }); },
    whiz() { audio.tone(2400, .12, { type: 'sine', vol: .07, slideTo: 900 }); },
    impact() { audio.noise(.05, { vol: .12, freq: 4000, type: 'highpass' }); },
    hit() { audio.tone(180, .08, { type: 'square', vol: .12, slideTo: 90 }); },
    pickup() { audio.melody([[660, .06], [990, .06], [1320, .12]], { type: 'square', vol: .14 }); },
    cash() { audio.melody([[1568, .07], [2093, .2]], { type: 'square', vol: .16 }); audio.noise(.25, { vol: .08, freq: 7000, type: 'highpass', delay: .05 }); },
    siren() { for (let i = 0; i < 4; i++) { audio.tone(620, .45, { type: 'sawtooth', vol: .09, slideTo: 980, delay: i * .9 }); audio.tone(980, .45, { type: 'sawtooth', vol: .09, slideTo: 620, delay: i * .9 + .45 }); } }
  };

  // ----- pickups
  function spawnPickups() {
    ORDER.forEach((k, i) => {
      const g = new THREE.Group();
      const model = BUILDERS[k](); model.scale.setScalar(k === 'pistol' ? 2.2 : 1.35); model.rotation.y = Math.PI / 2; g.add(model);
      const col = new THREE.Color(WEAPONS[k].color);
      const ring = new THREE.Mesh(new THREE.RingGeometry(.32, .4, 40), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = -.58;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, 1.4, 32, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = .1;
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(WEAPONS[k].name.toUpperCase(), WEAPONS[k].color), transparent: true, depthWrite: false, toneMapped: false }));
      label.scale.set(1.2, .3, 1); label.position.y = .55;
      g.add(ring, beam, label);
      g.position.set(SPOTS[i][0], .62, SPOTS[i][1]);
      scene.add(g);
      R.pickups.push({ key: k, g, model, ring, t: Math.random() * 6 });
    });
  }
  function clearPickups() { for (const p of R.pickups) scene.remove(p.g); R.pickups.length = 0; }

  // ----- foes
  let foeTemplate = null;
  function makeFoe(i, boss = false) {
    const gltf = ctx.soldier; if (!gltf) return null;
    const model = SkeletonUtils.clone(gltf.scene);
    model.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.frustumCulled = false;
        o.material = o.material.clone();
        if (/visor/i.test(o.name)) { o.material.color.set(0x220000); o.material.emissive = new THREE.Color(0xff1a1a); o.material.emissiveIntensity = boss ? 3 : 1.4; }
        else if (boss) { o.material.color.setRGB(.42, .45, .52); o.material.metalness = .85; o.material.roughness = .32; o.material.emissive = new THREE.Color(0x300404); }
        else { o.material.color.setRGB(.82 + (i % 2) * .08, .74, .68); o.material.emissive = new THREE.Color(0x200808); }
      }
    });
    const pivot = new THREE.Group(); pivot.add(model); model.rotation.y = ctx.soldierYaw || 0;
    const root = new THREE.Group(); root.add(pivot); scene.add(root);
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
    marker.scale.setScalar(boss ? .34 : .22); marker.position.y = boss ? 2.75 : 2.15; marker.renderOrder = 10; root.add(marker);
    if (boss) pivot.scale.setScalar(1.32);
    const mixer = new THREE.AnimationMixer(model), actions = {};
    for (const c of gltf.animations) { if (c.name === 'TPose') continue; const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); actions[c.name] = a; }
    const gun = buildMG(); gun.scale.setScalar(boss ? 1.35 : .95); scene.add(gun);
    const B = n => model.getObjectByName('mixamorig' + n);
    const f = {
      root, pivot, model, mixer, actions, cur: null, gun, hp: 100, alive: true, boss, r: boss ? .46 : .34, h: boss ? 2.45 : 1.85, state: 'enter', t: 0, deadT: 0,
      pos: new THREE.Vector3((Math.random() - .5) * 1.2, 0, ctx.HALL.maxZ + 1.6 + i * .6), yaw: Math.PI,
      target: new THREE.Vector3((Math.random() - .5) * 6, 0, -2.5 - Math.random() * 3), burst: 0, shotT: 0, flinch: 0,
      bones: { ra: B('RightArm'), rf: B('RightForeArm'), rh: B('RightHand'), la: B('LeftArm'), lf: B('LeftForeArm'), spine: B('Spine2') }
    };
    setFoeAnim(f, 'Walk');
    return f;
  }
  function setFoeAnim(f, n, fade = .25) {
    if (f.cur === n || !f.actions[n]) return;
    const a = f.actions[n]; a.reset(); a.setEffectiveWeight(1); a.play();
    if (f.cur) f.actions[f.cur].crossFadeTo(a, fade, true); else a.fadeIn(fade);
    f.cur = n;
  }
  function randomSpot() {
    for (let k = 0; k < 20; k++) {
      const p = new THREE.Vector3((Math.random() - .5) * 10, 0, -1.8 - Math.random() * 12);
      if (p.distanceTo(boy.pos) > 3) return p;
    }
    return new THREE.Vector3(0, 0, -8);
  }
  // hits needed to break the boss's armor: BFG 1, crossbow 2, pistol 4, machine gun 10 (head shots count double)
  const BOSS_HIT = { bfg: 100, crossbow: 50, pistol: 25, mg: 10, heavy: 50 };
  function damage(f, amount, at, weapon, head) {
    if (!f.alive) return;
    if (f.boss) {
      f.hp -= (BOSS_HIT[weapon] || 25) * (head ? 2 : 1);
      puffs(at, 0xffd27a, 7, 2.2, .06, .3); sfx.impact(); audio.tone(300, .06, { type: 'square', vol: .1 });
      updateHud();
      if (f.hp <= 0) return kill(f);
      f.flinch = .2; return; // armored: he flinches but keeps coming
    }
    f.hp -= amount * (head ? 2 : 1); sfx.hit();
    puffs(at, 0x8a0d0d, 5, 1.2, .1, .4);
    if (f.hp <= 0) return kill(f);
    f.flinch = .25;
    if (f.boss) return;
    f.state = 'run'; f.t = 1.6 + Math.random(); f.target = randomSpot(); setFoeAnim(f, 'Run', .15);
  }
  function kill(f) {
    f.alive = false; f.state = 'dead'; f.deadT = 0;
    const pay = f.boss ? 5 : 1;
    if (!f.boss) R.killed++;
    R.earned += pay; ctx.addCash(pay * 100);
    const head = f.pos.clone(); head.y = 2.0;
    if (f.boss) head.y = 2.7;
    ctx.popText(head, '+$' + pay, '#5bff7a');
    sfx.cash();
    // drop the rifle
    const g = f.gun; const v = new THREE.Vector3((Math.random() - .5) * 1.5, 2, (Math.random() - .5) * 1.5), spin = Math.random() * 6;
    addFx(new THREE.Object3D(), 1.2, (o, k, dt) => { if (g.position.y > .03) { g.position.addScaledVector(v, dt); v.y -= 9.8 * dt; g.rotation.z += spin * dt; } else g.position.y = .03; });
    updateHud();
    if (f.boss) finish();
    else if (R.killed >= TOTAL && !R.boss) {
      // the boss walks in through the front door
      R.boss = makeFoe(TOTAL, true);
      if (R.boss) { R.boss.target.set(0, 0, -4); R.foes.push(R.boss); }
      sfx.siren(); $('#raid-title').textContent = 'BOSS INCOMING!';
      $('#raid-sub').textContent = 'Armored. BFG 1 hit, crossbow 2, pistol 4, machine gun 10. Worth $5.';
      updateHud();
    }
  }
  function foeShoot(f) {
    const m = f.gun.userData.muzzle.getWorldPosition(V());
    const chest = boy.pos.clone(); chest.y = 1.0;
    // aim deliberately wide: they always miss
    const side = new THREE.Vector3().subVectors(chest, m).cross(_up).normalize();
    const miss = chest.clone().addScaledVector(side, (Math.random() < .5 ? -1 : 1) * (.55 + Math.random() * .9)).add(new THREE.Vector3(0, (Math.random() - .3) * .8, 0));
    const dir = miss.sub(m).normalize();
    ray.set(m, dir); ray.far = 40;
    const hit = ray.intersectObjects(solids, true)[0];
    const end = hit ? hit.point : m.clone().addScaledVector(dir, 40);
    tracer(m, end, 0xffb050, .01); flash(m, .3);
    if (hit) { puffs(hit.point, 0xffc070, 4, 2, .05, .25); }
    const dist = f.pos.distanceTo(boy.pos); sfx.foe(dist);
    if (Math.random() < .35) setTimeout(sfx.whiz, 60);
  }
  function updateFoe(f, dt) {
    f.t -= dt;
    if (!f.alive) {
      f.deadT += dt; if (f.root.children[1]) f.root.children[1].visible = false;
      const k = Math.min(1, f.deadT / .7), e = 1 - Math.pow(1 - k, 3);
      f.pivot.rotation.x = -Math.PI / 2 * e + (k >= 1 ? 0 : 0);
      if (f.deadT < .7) f.mixer.update(dt * .4);
      if (f.deadT > 7) { f.root.position.y -= dt * .25; if (f.deadT > 9) { scene.remove(f.root); scene.remove(f.gun); f.gone = true; } }
      else f.root.position.copy(f.pos);
      return;
    }
    let move = 0, speed = 0;
    if (f.state === 'enter' || f.state === 'move' || f.state === 'run') {
      const d = _v2.subVectors(f.target, f.pos); d.y = 0; const len = d.length();
      speed = f.state === 'run' ? 3.6 : f.boss ? 1.3 : 1.7;
      if (len < .25 || (f.state === 'run' && f.t <= 0)) {
        f.state = 'shoot'; f.t = 2.2 + Math.random() * 2.5; f.burst = 0; f.shotT = .4;
      } else {
        d.normalize(); move = 1;
        f.pos.addScaledVector(d, speed * dt); collide(f.pos, .32);
        const ty = Math.atan2(d.x, d.z); let dy = ty - f.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); f.yaw += dy * Math.min(1, dt * 8);
        setFoeAnim(f, f.state === 'run' ? 'Run' : 'Walk');
      }
    }
    if (f.state === 'shoot') {
      setFoeAnim(f, 'Idle', .2);
      const ty = Math.atan2(boy.pos.x - f.pos.x, boy.pos.z - f.pos.z); let dy = ty - f.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); f.yaw += dy * Math.min(1, dt * 6);
      f.shotT -= dt;
      if (f.shotT <= 0) {
        if (f.burst < (f.boss ? 8 : 4)) { foeShoot(f); f.burst++; f.shotT = .11; } else { f.burst = 0; f.shotT = .7 + Math.random() * .9; }
      }
      if (f.t <= 0) { f.state = 'move'; f.target = randomSpot(); }
    }
    f.mixer.update(dt);
    f.root.position.copy(f.pos); f.root.rotation.y = f.yaw;
    f.root.updateMatrixWorld(true);
    // aim the rifle at the player while shooting
    const B = f.bones;
    if (B.rh) {
      const aiming = f.state === 'shoot';
      const hand = B.rh.getWorldPosition(V());
      const aimAt = boy.pos.clone(); aimAt.y = 1.0;
      const dir = aiming ? aimAt.clone().sub(hand).normalize() : new THREE.Vector3(Math.sin(f.yaw), -.35, Math.cos(f.yaw)).normalize();
      if (aiming) {
        pointBone(B.ra, dir); pointBone(B.rf, dir);
        const fore = B.rh.getWorldPosition(V()).addScaledVector(dir, .32);
        const la = B.la.getWorldPosition(V()); pointBone(B.la, fore.clone().sub(la).normalize()); pointBone(B.lf, fore.clone().sub(B.lf.getWorldPosition(V())).normalize());
      }
      const h2 = B.rh.getWorldPosition(V());
      f.gun.position.copy(h2); f.gun.lookAt(h2.clone().add(dir));
      f.gun.translateY(-.02); f.gun.translateZ(-.04);
    }
    if (f.flinch > 0) { f.flinch -= dt; f.pivot.rotation.x = -Math.sin(f.flinch * 20) * .08; } else f.pivot.rotation.x = 0;
  }

  // ----- the player's weapon
  function heldModel() { return R.weapon ? held[R.weapon] : null; }
  function select(k) {
    if (!R.owned.has(k)) return;
    R.weapon = k; for (const x of ORDER) held[x].visible = x === k;
    updateHud();
  }
  function aimPoint() {
    ray.setFromCamera({ x: 0, y: 0 }, camera); ray.far = 60;
    const hit = ray.intersectObjects(solids, true).find(h => h.distance > camera.position.distanceTo(boy.pos) * .8);
    let best = hit ? hit.distance : 60;
    for (const f of R.foes) { if (!f.alive) continue; const t = rayCyl(ray.ray.origin, ray.ray.direction, f.pos, f.r, f.h); if (t < best) best = t; }
    return ray.ray.origin.clone().addScaledVector(ray.ray.direction, best);
  }
  function fire() {
    const w = WEAPONS[R.weapon]; if (!w) return;
    const g = heldModel(); const m = g.userData.muzzle.getWorldPosition(V());
    const target = aimPoint();
    if (w.kind === 'hit') {
      ray.setFromCamera({ x: (Math.random() - .5) * w.spread * 2, y: (Math.random() - .5) * w.spread * 2 }, camera); ray.far = 60;
      const o = ray.ray.origin, d = ray.ray.direction;
      const minD = camera.position.distanceTo(boy.pos) * .8;
      const wall = ray.intersectObjects(solids, true).find(h => h.distance > minD);
      let best = wall ? wall.distance : 60, foe = null;
      for (const f of R.foes) { if (!f.alive) continue; const t = rayCyl(o, d, f.pos, f.r, f.h); if (t < best && t > minD) { best = t; foe = f; } }
      const p = o.clone().addScaledVector(d, best);
      tracer(m, p); flash(m, R.weapon === 'mg' ? .32 : .26);
      if (foe) damage(foe, w.dmg, p, R.weapon, p.y - foe.pos.y > foe.h * .81);
      else if (wall) { puffs(p, 0xffd27a, 5, 1.8, .05, .3); sfx.impact(); }
      sfx[R.weapon]();
      R.shake = Math.max(R.shake, R.weapon === 'mg' ? .012 : .02);
    } else if (w.kind === 'bolt') {
      const dir = target.clone().sub(m).normalize();
      const bolt = new THREE.Group();
      const shaft = new THREE.Mesh(zCyl(.005, .42), new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: .6, roughness: .3 })); bolt.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(.01, .04, 8).rotateX(Math.PI / 2), metal()); tip.position.z = .23; bolt.add(tip);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(.02, .05), new THREE.MeshStandardMaterial({ color: 0xd8262b, side: THREE.DoubleSide })); fl.position.z = -.18; fl.rotation.y = Math.PI / 2; bolt.add(fl);
      bolt.position.copy(m); bolt.lookAt(m.clone().add(dir)); scene.add(bolt);
      R.bolts.push({ kind: 'bolt', obj: bolt, vel: dir.multiplyScalar(w.speed), life: 3, dmg: w.dmg });
      sfx.crossbow();
    } else if (w.kind === 'fan') {
      // a wide fan of heavy rounds; each raider takes at most one hit per volley
      const minD = camera.position.distanceTo(boy.pos) * .8, hit = new Set();
      ray.setFromCamera({ x: 0, y: 0 }, camera);
      const base = ray.ray.direction.clone(), o = ray.ray.origin.clone();
      for (let k = 0; k < w.rays; k++) {
        const a = (k / (w.rays - 1) - .5) * w.arc;
        const d = base.clone().applyAxisAngle(_up, a).normalize();
        ray.set(o, d); ray.far = 60;
        const wall = ray.intersectObjects(solids, true).find(h => h.distance > minD);
        let best = wall ? wall.distance : 60, foe = null;
        for (const f of R.foes) { if (!f.alive || hit.has(f)) continue; const t = rayCyl(o, d, f.pos, f.r, f.h); if (t < best && t > minD) { best = t; foe = f; } }
        const p = o.clone().addScaledVector(d, best);
        tracer(m, p, 0xff9d2b, .03);
        if (foe) { hit.add(foe); damage(foe, w.dmg, p, 'heavy', false); }
        else puffs(p, 0xffb050, 6, 2.4, .09, .35);
      }
      flash(m, .8, 0xffa040);
      audio.noise(.35, { vol: .55, freq: 1400, slideTo: 120 }); audio.tone(70, .3, { type: 'sawtooth', vol: .25, slideTo: 35 });
      R.shake = Math.max(R.shake, .05);
    } else if (w.kind === 'plasma') {
      sfx.bfgCharge();
      R.charging = { t: .55, m: () => heldModel().userData.muzzle.getWorldPosition(V()), target };
    }
  }
  function launchPlasma(from, target) {
    const dir = target.clone().sub(from).normalize();
    const ball = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(.16, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(.8, 4, 1), toneMapped: false }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0x4cff6a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); halo.scale.setScalar(1.1);
    ball.add(core, halo); ball.position.copy(from); scene.add(ball);
    R.bolts.push({ kind: 'plasma', obj: ball, vel: dir.multiplyScalar(WEAPONS.bfg.speed), life: 4, dmg: WEAPONS.bfg.dmg });
  }
  function explode(at) {
    sfx.bfgBoom(); R.shake = .12;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(.6, 3, .8), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    sphere.position.copy(at);
    addFx(sphere, .7, (o, k) => { o.scale.setScalar(.3 + k * WEAPONS.bfg.radius); o.material.opacity = (1 - k) * .9; });
    flashLight.position.copy(at); flashLight.color.set(0x5bff7a); flashLight.intensity = 60; flashLight.distance = 16;
    puffs(at, 0x6bff8a, 26, 6, .3, .9);
    for (const f of R.foes) {
      if (!f.alive) continue;
      const d = Math.hypot(f.pos.x - at.x, f.pos.z - at.z);
      if (d < WEAPONS.bfg.radius + f.r) damage(f, WEAPONS.bfg.dmg * (1 - d / WEAPONS.bfg.radius * .6), f.pos.clone().setY(1.2), 'bfg', false);
    }
  }
  function updateBolts(dt) {
    for (const b of R.bolts) {
      if (b.dead) continue;
      b.life -= dt;
      const from = b.obj.position.clone();
      if (b.kind === 'bolt') b.vel.y -= 1.5 * dt;
      const step = b.vel.clone().multiplyScalar(dt), len = step.length(), dir = step.clone().normalize();
      ray.set(from, dir); ray.far = len;
      const wall = ray.intersectObjects(solids, true)[0];
      let foeHit = null, best = wall ? wall.distance : len;
      for (const f of R.foes) { if (!f.alive) continue; const t = rayCyl(from, dir, f.pos, f.r + (b.kind === 'plasma' ? .11 : 0), f.h); if (t <= best) { best = t; foeHit = f; } }
      const p = from.clone().addScaledVector(dir, Math.min(best, len));
      b.obj.position.copy(p);
      if (b.kind === 'bolt') b.obj.lookAt(p.clone().add(dir));
      if (b.kind === 'plasma') { flashLight.position.copy(p); flashLight.color.set(0x4cff6a); flashLight.distance = 9; flashLight.intensity = Math.max(flashLight.intensity, 12); b.obj.children[1].material.rotation += dt * 4; b.obj.children[0].scale.setScalar(1 + Math.sin(performance.now() / 40) * .12); }
      if (foeHit || wall || b.life <= 0 || p.y < 0) {
        b.dead = true;
        if (b.kind === 'plasma') { scene.remove(b.obj); explode(p); }
        else {
          if (foeHit) { damage(foeHit, b.dmg, p, 'crossbow', p.y - foeHit.pos.y > foeHit.h * .81); scene.remove(b.obj); }
          else { sfx.impact(); puffs(p, 0xffd27a, 3, 1, .04, .25); const o = b.obj; addFx(new THREE.Object3D(), 8, (x, k) => { if (k >= .999) scene.remove(o); }); }
        }
      }
    }
    R.bolts = R.bolts.filter(b => !b.dead);
  }

  // ----- HUD
  const $ = s => document.querySelector(s);
  function updateHud() {
    const left = TOTAL - R.killed;
    const b = R.boss;
    $('#raid-count').textContent = !(R.active && R.countdown !== null && R.countdown <= 0) ? '' :
      left > 0 ? `${left} LEFT · $1 EACH` : b && b.alive ? `BOSS ARMOR ${'\u25A0'.repeat(Math.ceil(Math.max(0, b.hp) / 25))}${'\u25A1'.repeat(4 - Math.ceil(Math.max(0, b.hp) / 25))}` : 'ALL CLEAR';
    document.querySelectorAll('#weapons .wslot').forEach(el => {
      const k = el.dataset.w; el.classList.toggle('owned', R.owned.has(k)); el.classList.toggle('sel', R.weapon === k);
    });
    document.body.classList.toggle('armed', !!(R.active && R.weapon));
  }
  document.querySelectorAll('#weapons .wslot').forEach(el => el.addEventListener('click', () => select(el.dataset.w)));

  // ----- lifecycle
  R.start = function () {
    if (R.active) return;
    R.active = true; R.ending = false; R.killed = 0; R.earned = 0; R.boss = null; R.owned.clear(); R.weapon = null;
    spawnPickups();
    R.foes = []; R.spawnQueue = 0; R.spawnT = 0; R.countdown = null;
    document.body.classList.add('raid');
    $('#raid').hidden = false; $('#raid-title').textContent = 'ALARM! INTRUDERS SPOTTED';
    $('#raid-sub').textContent = 'Weapons just dropped around the arcade. Grab one. They arrive 15 seconds after you do.';
    sfx.siren();
    updateHud();
  };
  function finish() {
    R.ending = true; R.endT = 6;
    $('#raid-title').textContent = 'ARCADE SECURED';
    $('#raid-sub').textContent = `You earned $${R.earned}. Back to the games!`;
    audio.melody([[523, .12], [659, .12], [784, .12], [1047, .3], [784, .12], [1047, .5]], { type: 'square', vol: .14 });
  }
  function cleanup() {
    R.active = false; R.ending = false;
    clearPickups();
    for (const f of R.foes) { scene.remove(f.root); scene.remove(f.gun); }
    R.foes = []; R.owned.clear(); R.weapon = null; for (const k of ORDER) held[k].visible = false;
    $('#raid').hidden = true; document.body.classList.remove('raid', 'armed');
    alarm.intensity = 0;
    if (document.pointerLockElement) document.exitPointerLock();
    ctx.onRaidEnd && ctx.onRaidEnd();
  }
  R.armed = () => R.active && !!R.weapon;
  R.testDamage = (f, w, head) => damage(f, WEAPONS[w].dmg, f.pos.clone().setY(1.2), w, head);
  R.select = select;
  R.cycle = d => { const own = ORDER.filter(k => R.owned.has(k)); if (!own.length) return; const i = own.indexOf(R.weapon); select(own[(i + d + own.length) % own.length]); };
  R.trigger = down => {
    R.triggerHeld = down;
    if (down && R.armed() && R.fireT <= 0 && !R.charging) { fire(); R.fireT = WEAPONS[R.weapon].rate; }
  };

  // runs before the boy's animation is applied
  R.update = function (dt) {
    flashLight.intensity = Math.max(0, flashLight.intensity - dt * 160);
    for (const fx of R.fx) {
      fx.t += dt; const k = Math.min(1, fx.t / fx.life);
      fx.update && fx.update(fx.obj, k, dt);
      if (k >= 1) { scene.remove(fx.obj); fx.dead = true; }
    }
    R.fx = R.fx.filter(f => !f.dead);
    updateBolts(dt);
    if (!R.active) return;
    alarm.intensity = R.ending ? 0 : (Math.sin(performance.now() / 180) > 0 ? 9 : 0);
    // spawn the raiders one at a time at the door
    if (R.countdown !== null && R.countdown > 0) {
      R.countdown -= dt;
      const sec = Math.ceil(R.countdown);
      if (sec !== R.lastTick) { R.lastTick = sec; $('#raid-title').textContent = sec > 0 ? `TERRORISTS ARRIVE IN ${sec}` : 'TERRORISTS IN THE ARCADE!'; if (sec <= 5) audio.tone(sec ? 880 : 440, .12, { type: 'square', vol: .12 }); }
      if (R.countdown <= 0) {
        R.spawnQueue = TOTAL; R.spawnT = .2; sfx.siren(); updateHud();
        $('#raid-sub').textContent = 'GOD MODE ENABLED · $1 each, and a $5 boss after the fifth.';
      }
    }
    if (R.spawnQueue > 0) { R.spawnT -= dt; if (R.spawnT <= 0) { const f = makeFoe(TOTAL - R.spawnQueue); if (f) R.foes.push(f); R.spawnQueue--; R.spawnT = 1.6; } }
    for (const f of R.foes) if (!f.gone) updateFoe(f, dt);
    // pickups
    for (const p of R.pickups) {
      if (p.taken) continue;
      p.t += dt; p.model.rotation.y += dt * 1.4; p.model.position.y = Math.sin(p.t * 2) * .06; p.ring.material.opacity = .6 + Math.sin(p.t * 5) * .25;
      if (Math.hypot(boy.pos.x - p.g.position.x, boy.pos.z - p.g.position.z) < .7) {
        p.taken = true; scene.remove(p.g); R.owned.add(p.key); sfx.pickup();
        if (R.countdown === null) { R.countdown = 15; R.lastTick = 16; }
        ctx.toast(`${WEAPONS[p.key].name}! Press ${WEAPONS[p.key].slot} to switch. Click to shoot.`);
        if (!R.weapon || ORDER.indexOf(p.key) > ORDER.indexOf(R.weapon)) select(p.key); else updateHud();
      }
    }
    // weapon timing
    R.fireT -= dt;
    if (R.charging) { R.charging.t -= dt; if (R.charging.t <= 0) { const m = R.charging.m(); launchPlasma(m, aimPoint()); flash(m, .9, 0x5bff7a); R.charging = null; R.fireT = WEAPONS.bfg.rate; } }
    if (R.triggerHeld && R.armed() && WEAPONS[R.weapon].auto && R.fireT <= 0) { fire(); R.fireT = WEAPONS[R.weapon].rate; }
    if (R.ending) { R.endT -= dt; if (R.endT <= 0) cleanup(); }
  };
  // runs after the boy's animation: raise his arms and put the gun in his hands
  R.postAnim = function () {
    const g = heldModel(); if (!g || !R.active) return;
    const b = ctx.boyBones; if (!b || !b.RightHand) return;
    boy.root.updateMatrixWorld(true);
    const aim = aimPoint();
    const hand0 = b.RightHand.getWorldPosition(V());
    const dir = aim.clone().sub(hand0).normalize();
    pointBone(b.RightArm, dir); pointBone(b.RightForeArm, dir);
    const hand = b.RightHand.getWorldPosition(V());
    const fore = hand.clone().addScaledVector(dir, R.weapon === 'pistol' ? .06 : .3);
    pointBone(b.LeftArm, fore.clone().sub(b.LeftArm.getWorldPosition(V())).normalize());
    pointBone(b.LeftForeArm, fore.clone().sub(b.LeftForeArm.getWorldPosition(V())).normalize());
    g.position.copy(hand); g.lookAt(aim);
    g.translateY(-.03);
    if (R.shake > 0) { camera.position.x += (Math.random() - .5) * R.shake; camera.position.y += (Math.random() - .5) * R.shake; R.shake *= .82; if (R.shake < .001) R.shake = 0; }
  };
  return R;
}
