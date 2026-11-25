/**
 * kessel-assets.js: procedural ships, terrain/water/lava materials and effects for Kessel Run.
 * Three.js r160. Every builder takes THREE as its first argument; this file imports nothing.
 * Units: 1 = 1 m. Ships face -Z, up is +Y. HDR colours (> 1) are meant for UnrealBloomPass (threshold ~0.82).
 *
 *   import * as THREE from 'three';
 *   import * as K from './kessel-assets.js';
 *   const ship = K.buildLancer(THREE);            // { g, flames, exh, guns, flameTint, update }
 *   scene.add(ship.g);
 *   ship.flames.forEach(f => f.scale.z = throttle); // 0..1.5
 *   // each frame:
 *   K.updateKesselAssets(clock.elapsedTime);        // drives every shader's time
 *   ship.update?.(dt);                              // spins fans, blinks lights
 *
 * Original designs; no file or network loads. Each ship stays under 60k triangles.
 */

const shared = { uTime: { value: 0 } };

/** Call once per frame with elapsed seconds; animates flames, water, lava, clouds, shields, sky. */
export function updateKesselAssets(timeSeconds) {
  shared.uTime.value = timeSeconds;
}

// ---------------------------------------------------------------------------------------------
// GLSL helpers
// ---------------------------------------------------------------------------------------------

const GLSL_NOISE = /* glsl */ `
float kHash2(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float kHash3(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float kNoise2(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(kHash2(i), kHash2(i+vec2(1,0)), u.x), mix(kHash2(i+vec2(0,1)), kHash2(i+vec2(1,1)), u.x), u.y); }
float kNoise3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(kHash3(i+vec3(0,0,0)),kHash3(i+vec3(1,0,0)),f.x), mix(kHash3(i+vec3(0,1,0)),kHash3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(kHash3(i+vec3(0,0,1)),kHash3(i+vec3(1,0,1)),f.x), mix(kHash3(i+vec3(0,1,1)),kHash3(i+vec3(1,1,1)),f.x),f.y), f.z); }
float kFbm2(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*kNoise2(p); p=p*2.03+vec2(17.1,9.2); a*=0.5; } return s; }
float kFbm3(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*kNoise3(p); p=p*2.02+vec3(5.2,1.3,7.7); a*=0.5; } return s; }
`;

const GLSL_TRIPLANAR = /* glsl */ `
float kTri(vec3 p, vec3 n){
  vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z + 1e-5);
  return kFbm2(p.yz)*w.x + kFbm2(p.zx)*w.y + kFbm2(p.xy)*w.z;
}
`;

// ---------------------------------------------------------------------------------------------
// Shared textures and materials
// ---------------------------------------------------------------------------------------------

let panelCanvas = null;

/** A tiling panel-line + rivet sheet, used as colour map (multiplied) and bump map. */
function panelTexture(THREE, repeat = 1) {
  if (!panelCanvas) {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#f2f2f2';
    x.fillRect(0, 0, 512, 512);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // subtle panel tone variation
    for (let i = 0; i < 40; i++) {
      const w = 40 + rnd() * 160, h = 30 + rnd() * 120;
      x.fillStyle = `rgba(0,0,0,${0.015 + rnd() * 0.03})`;
      x.fillRect(rnd() * 512, rnd() * 512, w, h);
    }
    // panel seams
    x.strokeStyle = 'rgba(40,40,40,0.55)';
    x.lineWidth = 1.6;
    const rows = [0, 92, 188, 300, 404];
    rows.forEach((y) => { x.beginPath(); x.moveTo(0, y + 0.5); x.lineTo(512, y + 0.5); x.stroke(); });
    for (let r = 0; r < rows.length; r++) {
      const y0 = rows[r], y1 = rows[r + 1] ?? 512;
      let px = (r * 97) % 140;
      while (px < 512) {
        x.beginPath(); x.moveTo(px + 0.5, y0); x.lineTo(px + 0.5, y1); x.stroke();
        px += 90 + rnd() * 110;
      }
    }
    // access hatches
    for (let i = 0; i < 6; i++) {
      const w = 22 + rnd() * 30, h = 14 + rnd() * 22, px = rnd() * 470, py = rnd() * 480;
      x.strokeRect(px + 0.5, py + 0.5, w, h);
    }
    // rivets
    x.fillStyle = 'rgba(30,30,30,0.35)';
    rows.forEach((y) => { for (let px = 4; px < 512; px += 9) { x.beginPath(); x.arc(px, y + 4, 0.9, 0, 6.283); x.fill(); } });
    panelCanvas = c;
  }
  const t = new THREE.CanvasTexture(panelCanvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

function hullMaterial(THREE, color, { metalness = 0.6, roughness = 0.35, clearcoat = 0.8, panel = true, flat = false, repeat = 1 } = {}) {
  const map = panel ? panelTexture(THREE, repeat) : null;
  if (map) map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshPhysicalMaterial({
    color, metalness, roughness, clearcoat, clearcoatRoughness: 0.12,
    map, bumpMap: panel ? panelTexture(THREE, repeat) : null, bumpScale: panel ? 0.6 : 0,
    flatShading: flat,
  });
}

function glassMaterial(THREE, tint = 0x16222c, iridescence = 0) {
  return new THREE.MeshPhysicalMaterial({
    color: tint, metalness: 0.2, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02,
    transparent: true, opacity: 0.72, iridescence, iridescenceIOR: 1.6, envMapIntensity: 1.6,
  });
}

function glowMaterial(THREE, rgb, power = 4) {
  // Colours above 1 survive ACES and trip the bloom threshold.
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(rgb[0] * power, rgb[1] * power, rgb[2] * power), toneMapped: true });
}

const MAT_DARK = (THREE) => new THREE.MeshStandardMaterial({ color: 0x16181c, metalness: 0.5, roughness: 0.6 });

// ---------------------------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------------------------

function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/**
 * A smooth lofted hull. sections: [{ z, w, top, bot, y=0, n=2 }] from nose to tail.
 * w = half width, top/bot = height above/below y, n = superellipse exponent
 * (2 ellipse, >2 boxier, <2 chined / diamond). Sections are spline-interpolated.
 */
function loft(THREE, sections, { rings = 64, radial = 40, capStart = false, capEnd = true, uScale = 1, vScale = 1 } = {}) {
  const keys = ['z', 'w', 'top', 'bot', 'y', 'n'];
  const S = sections.map((s) => ({ y: 0, n: 2, top: s.h ?? s.top, bot: s.h ?? s.bot, ...s }));
  const get = (i) => S[Math.max(0, Math.min(S.length - 1, i))];
  const pos = [], uv = [], idx = [];
  const z0 = S[0].z, z1 = S[S.length - 1].z;
  const samples = [];
  for (let r = 0; r <= rings; r++) {
    const f = (r / rings) * (S.length - 1);
    const i = Math.min(Math.floor(f), S.length - 2), t = f - i;
    const s = {};
    for (const k of keys) s[k] = cr(get(i - 1)[k], get(i)[k], get(i + 1)[k], get(i + 2)[k], t);
    s.w = Math.max(s.w, 0.001); s.top = Math.max(s.top, 0.001); s.bot = Math.max(s.bot, 0.001); s.n = Math.max(s.n, 0.6);
    samples.push(s);
  }
  for (let r = 0; r <= rings; r++) {
    const s = samples[r];
    const e = 2 / s.n;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a), sn = Math.sin(a);
      const x = s.w * Math.sign(c) * Math.pow(Math.abs(c), e);
      const yv = (sn >= 0 ? s.top : s.bot) * Math.sign(sn) * Math.pow(Math.abs(sn), e);
      pos.push(x, s.y + yv, s.z);
      uv.push(((s.z - z0) / 8) * uScale, (j / radial) * 4 * vScale);
    }
  }
  const row = radial + 1;
  for (let r = 0; r < rings; r++) {
    for (let j = 0; j < radial; j++) {
      const a = r * row + j, b = a + row;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const cap = (r, flip) => {
    const s = samples[r];
    const center = pos.length / 3;
    pos.push(0, s.y, s.z); uv.push(0, 0);
    for (let j = 0; j < radial; j++) {
      const a = r * row + j;
      if (flip) idx.push(center, a + 1, a); else idx.push(center, a, a + 1);
    }
  };
  if (capStart) cap(0, true);
  if (capEnd) cap(rings, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A tapered wing/fin panel with rounded edges. side = +1 right, -1 left. Lies in XZ, thickness on Y. */
function wingGeo(THREE, { root = 6, tip = 2, span = 5, sweep = 3, thick = 0.35, side = 1 }) {
  const sh = new THREE.Shape();
  const pts = [[0, 0], [span, sweep], [span, sweep + tip], [0, root]];
  sh.moveTo(pts[0][0] * side, pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0] * side, pts[i][1]);
  sh.closePath();
  const bev = thick * 0.45;
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: Math.max(thick - 2 * bev, 0.01), bevelEnabled: true, bevelThickness: bev, bevelSize: Math.min(bev, 0.25),
    bevelSegments: 3, curveSegments: 1,
  });
  g.rotateX(Math.PI / 2);
  g.translate(0, thick / 2, 0);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 8, uv.getY(i) / 8);
  g.computeVertexNormals();
  return g;
}

/** A rounded-rectangle frame (intake lip, hatch rim) facing -Z, centred on the origin. */
function rimGeo(THREE, w, h, r, lip) {
  const rr = (s, W, H, R) => {
    s.moveTo(-W / 2 + R, -H / 2); s.lineTo(W / 2 - R, -H / 2); s.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + R);
    s.lineTo(W / 2, H / 2 - R); s.quadraticCurveTo(W / 2, H / 2, W / 2 - R, H / 2); s.lineTo(-W / 2 + R, H / 2);
    s.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - R); s.lineTo(-W / 2, -H / 2 + R); s.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + R, -H / 2);
  };
  const outer = new THREE.Shape(); rr(outer, w, h, r);
  const hole = new THREE.Path(); rr(hole, w - lip * 2, h - lip * 2, Math.max(r - lip, 0.02));
  outer.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(outer, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -0.06);
  return g;
}

/** Engine nozzle with petals. Exit faces +Z at z = 0; returns a group. */
function nozzle(THREE, { radius = 0.8, length = 1.6, petals = 18, metal, glow }) {
  const grp = new THREE.Group();
  const prof = [
    new THREE.Vector2(radius * 1.12, -length), new THREE.Vector2(radius * 1.15, -length * 0.6),
    new THREE.Vector2(radius * 1.02, -length * 0.15), new THREE.Vector2(radius * 0.96, 0),
    new THREE.Vector2(radius * 0.86, 0), new THREE.Vector2(radius * 0.8, -length * 0.5),
  ];
  const lathe = new THREE.LatheGeometry(prof, 40);
  lathe.rotateX(-Math.PI / 2); // lathe axis Y -> Z (exit at z = 0, body towards -z)
  grp.add(new THREE.Mesh(lathe, metal));
  const petalGeo = new THREE.BoxGeometry(radius * 0.32, 0.04, length * 0.55);
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const p = new THREE.Mesh(petalGeo, metal);
    p.position.set(Math.cos(a) * radius * 0.98, Math.sin(a) * radius * 0.98, -length * 0.2);
    p.rotation.z = a + Math.PI / 2;
    p.rotateX(0.12);
    grp.add(p);
  }
  // hot throat
  const throat = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.8, 32), glowMaterial(THREE, glow, 2.2));
  throat.position.z = -length * 0.45;
  grp.add(throat);
  return grp;
}

function canopyFrame(THREE, { w, h, l, ribs = 3, radius = 0.035, material }) {
  // Frames on the upper half-ellipsoid of half-sizes (w, h, l), centred at origin, long axis Z.
  const grp = new THREE.Group();
  const onShell = (u, v) => new THREE.Vector3(w * Math.cos(v) * Math.sin(u), h * Math.sin(v), l * Math.cos(u) * Math.cos(v) * -1);
  const spine = [];
  for (let i = 0; i <= 24; i++) spine.push(new THREE.Vector3(0, h * Math.sin((i / 24) * Math.PI) * 1.01, -l * Math.cos((i / 24) * Math.PI) * 1.01));
  grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spine), 32, radius, 6), material));
  for (let r = 1; r <= ribs; r++) {
    const zf = -1 + (2 * r) / (ribs + 1);
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI;
      const k = Math.sqrt(Math.max(0, 1 - zf * zf));
      pts.push(new THREE.Vector3(Math.cos(a) * w * k * 1.01, Math.sin(a) * h * k * 1.01, l * zf));
    }
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, radius, 6), material));
  }
  void onShell;
  return grp;
}

function navLight(THREE, rgb, pos, size = 0.09, power = 6) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 8), glowMaterial(THREE, rgb, power));
  m.position.copy(pos);
  m.userData.noShadow = true;
  return m;
}

function antenna(THREE, pos, len, material, tilt = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.025, len, 6), material);
  m.position.copy(pos).add(new THREE.Vector3(0, len / 2, 0));
  m.rotation.z = tilt;
  return m;
}

function bladeAntenna(THREE, pos, material) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.lineTo(0.5, 0); sh.lineTo(0.35, 0.32); sh.lineTo(0.2, 0.32); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(g, material);
  m.position.copy(pos);
  return m;
}

function finish(THREE, g) {
  g.traverse((o) => {
    if (o.isMesh) {
      const glowy = o.userData.noShadow || o.material.blending === THREE.AdditiveBlending || o.material.transparent;
      o.castShadow = !glowy;
      o.receiveShadow = !glowy;
    }
  });
  return g;
}

export function triangleCount(object) {
  let n = 0;
  object.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const count = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    n += o.isInstancedMesh ? count * o.count : count;
  });
  return Math.round(n);
}

// ---------------------------------------------------------------------------------------------
// Engine flame (with heat shimmer)
// ---------------------------------------------------------------------------------------------

/**
 * An engine plume: base at the origin, extending along +Z (behind a ship facing -Z).
 * Scale .scale.z by throttle. Shimmer: a refracting sheath (MeshPhysicalMaterial transmission)
 * whose surface wobbles, so whatever is behind the exhaust ripples.
 */
export function createEngineFlame(THREE, { radius = 0.7, length = 7, tint = [0.55, 0.75, 1.0], shimmer = true } = {}) {
  const grp = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uTint: { value: new THREE.Vector3(...tint) }, uSeed: { value: Math.random() * 10 } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uSeed;
      varying float vAlong; varying vec3 vN; varying vec3 vV; varying vec3 vAxis;
      ${GLSL_NOISE}
      void main(){
        vAlong = uv.y;
        vAxis = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));
        vec3 p = position;
        float n = kNoise2(vec2(uv.x*6.0 + uSeed, uv.y*5.0 - uTime*9.0));
        p.xy *= 1.0 + (n - 0.5) * 0.35 * uv.y;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uTint; uniform float uSeed;
      varying float vAlong; varying vec3 vN; varying vec3 vV; varying vec3 vAxis;
      ${GLSL_NOISE}
      void main(){
        float axial = abs(dot(normalize(vV), normalize(vAxis)));  // 1 when looking straight into the plume
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.5);
        float body = pow(1.0 - vAlong, 1.6);
        float diamonds = 0.75 + 0.25 * sin(vAlong * 38.0 - uTime * 6.0);
        float flick = 0.8 + 0.4 * kNoise2(vec2(uTime * 14.0 + uSeed, vAlong * 6.0));
        float core = smoothstep(0.55, 1.0, edge) * smoothstep(0.6, 0.0, vAlong);
        vec3 col = mix(uTint, vec3(1.0, 0.97, 0.9), core);
        float a = clamp(body * edge * diamonds * flick * (1.0 - 0.7 * axial), 0.0, 1.0);
        gl_FragColor = vec4(col * (1.5 + 2.4 * core) * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const cone = new THREE.ConeGeometry(radius, length, 28, 10, true);
  cone.rotateX(Math.PI / 2);
  cone.translate(0, 0, length / 2);
  // cone apex is now at +Z; uv.y: 0 at base (nozzle), 1 at apex
  const outer = new THREE.Mesh(cone, mat);
  outer.userData.noShadow = true;
  outer.renderOrder = 10;
  grp.add(outer);
  const inner = new THREE.Mesh(cone.clone().scale(0.5, 0.5, 0.55), mat);
  inner.userData.noShadow = true;
  inner.renderOrder = 11;
  grp.add(inner);
  if (shimmer) {
    const sheathGeo = new THREE.ConeGeometry(radius * 1.35, length * 0.9, 20, 6, true);
    sheathGeo.rotateX(Math.PI / 2);
    sheathGeo.translate(0, 0, length * 0.45);
    const sheathMat = new THREE.MeshPhysicalMaterial({
      transmission: 1, roughness: 0.0, thickness: 0.6, ior: 1.04, transparent: true, opacity: 1,
      color: 0xffffff, metalness: 0, depthWrite: false, side: THREE.DoubleSide,
    });
    sheathMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = shared.uTime;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uTime;\n${GLSL_NOISE}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float kw = kNoise2(vec2(atan(position.y, position.x) * 3.0, position.z * 0.8 - uTime * 7.0));
          transformed.xy *= 1.0 + (kw - 0.5) * 0.25;`)
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
          objectNormal = normalize(objectNormal + 0.35 * vec3(sin(position.z * 3.0 - uTime * 11.0), cos(position.z * 2.3 - uTime * 9.0), 0.0));`);
    };
    const sheath = new THREE.Mesh(sheathGeo, sheathMat);
    sheath.userData.noShadow = true;
    grp.add(sheath);
  }
  return grp;
}

// ---------------------------------------------------------------------------------------------
// Ship 1: Lancer, single-engine stealth strike fighter (~24 m)
// ---------------------------------------------------------------------------------------------

export function buildLancer(THREE) {
  const g = new THREE.Group();
  g.name = 'Lancer';
  const skin = hullMaterial(THREE, 0x8f969e, { metalness: 0.45, roughness: 0.42, clearcoat: 0.6, repeat: 1 });
  const dark = hullMaterial(THREE, 0x3c4148, { metalness: 0.5, roughness: 0.5, clearcoat: 0.4, panel: false });
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x5b5f66, metalness: 1, roughness: 0.38, clearcoat: 0.3 });
  const tint = [0.55, 0.78, 1.0];

  // Fuselage: chined nose (n < 2 gives the sharp chine at the sides), blended mid body, round tail.
  const fus = loft(THREE, [
    { z: -12.2, w: 0.02, top: 0.02, bot: 0.02, y: 0.05, n: 1.5 },
    { z: -10.8, w: 0.55, top: 0.32, bot: 0.22, y: 0.05, n: 1.45 },
    { z: -8.6, w: 1.15, top: 0.72, bot: 0.45, y: 0.1, n: 1.5 },
    { z: -6.0, w: 1.55, top: 1.0, bot: 0.62, y: 0.12, n: 1.7 },
    { z: -3.0, w: 1.95, top: 0.95, bot: 0.75, y: 0.1, n: 2.0 },
    { z: 1.0, w: 2.1, top: 0.85, bot: 0.8, y: 0.05, n: 2.2 },
    { z: 5.0, w: 1.75, top: 0.72, bot: 0.72, y: 0.05, n: 2.2 },
    { z: 8.5, w: 1.1, top: 0.85, bot: 0.85, y: 0.05, n: 2.0 },
    { z: 10.6, w: 0.95, top: 0.95, bot: 0.95, y: 0.05, n: 2.0 },
  ], { rings: 90, radial: 48, capEnd: false });
  g.add(new THREE.Mesh(fus, skin));

  // Bubble canopy with frames
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), glassMaterial(THREE, 0x2a2416, 0.55));
  canopy.scale.set(0.62, 0.62, 2.1);
  canopy.position.set(0, 0.82, -6.7);
  canopy.rotation.x = Math.PI / 2 * 0; // dome opens upward (+Y)
  // SphereGeometry's hemisphere points +Y already; stretch along Z.
  g.add(canopy);
  const frame = canopyFrame(THREE, { w: 0.62, h: 0.62, l: 2.1, ribs: 2, material: dark });
  frame.position.copy(canopy.position);
  g.add(frame);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), MAT_DARK(THREE));
  seat.position.set(0, 1.05, -6.3);
  g.add(seat);

  // Side intakes (caret style) with lips and dark throats
  for (const side of [-1, 1]) {
    const duct = loft(THREE, [
      { z: -4.4, w: 0.55, top: 0.6, bot: 0.6, n: 3.2 },
      { z: -2.0, w: 0.6, top: 0.62, bot: 0.62, n: 3.2 },
      { z: 1.5, w: 0.5, top: 0.55, bot: 0.55, n: 3.0 },
      { z: 3.5, w: 0.2, top: 0.4, bot: 0.4, n: 2.5 },
    ], { rings: 24, radial: 24, capEnd: true });
    const d = new THREE.Mesh(duct, skin);
    d.position.set(side * 1.85, -0.15, 0);
    g.add(d);
    const lip = new THREE.Mesh(rimGeo(THREE, 1.12, 1.28, 0.22, 0.09), metal);
    lip.position.set(side * 1.85, -0.15, -4.42);
    lip.rotation.y = side * 0.12;
    g.add(lip);
    const throat = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.1), MAT_DARK(THREE));
    throat.position.set(side * 1.85, -0.15, -4.3);
    throat.rotation.y = Math.PI;
    g.add(throat);
  }

  // Trapezoid wings
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo(THREE, { root: 8.2, tip: 1.8, span: 5.2, sweep: 4.6, thick: 0.34, side }), skin);
    wing.position.set(side * 1.7, -0.05, -1.4);
    wing.rotation.z = side * -0.03;
    g.add(wing);
    // wingtip light and leading-edge seam
    g.add(navLight(THREE, side > 0 ? [0.1, 1, 0.25] : [1, 0.08, 0.05], new THREE.Vector3(side * 6.9, 0.0, 4.0)));
    // horizontal stabilators
    const stab = new THREE.Mesh(wingGeo(THREE, { root: 3.2, tip: 1.2, span: 2.6, sweep: 2.1, thick: 0.18, side }), skin);
    stab.position.set(side * 1.0, 0.0, 7.6);
    g.add(stab);
    // twin canted tails
    const fin = new THREE.Mesh(wingGeo(THREE, { root: 3.6, tip: 1.3, span: 2.9, sweep: 2.5, thick: 0.18, side: 1 }), skin);
    fin.rotation.z = Math.PI / 2 - side * 0.42; // stand up, cant outward 24 deg
    if (side < 0) fin.rotation.z = Math.PI / 2 + 0.42;
    fin.position.set(side * 1.05, 0.6, 5.4);
    g.add(fin);
    g.add(navLight(THREE, [1, 1, 1], new THREE.Vector3(side * 2.0, 3.1, 8.4), 0.07, 5));
  }

  // Spine, dorsal antennas, belly blades
  g.add(bladeAntenna(THREE, new THREE.Vector3(0, 0.85, -1.5), dark));
  g.add(antenna(THREE, new THREE.Vector3(0, 0.82, 3.2), 0.5, dark));
  const belly = bladeAntenna(THREE, new THREE.Vector3(0, -0.8, -3.5), dark);
  belly.rotation.z = Math.PI;
  g.add(belly);
  g.add(navLight(THREE, [1, 0.1, 0.06], new THREE.Vector3(0, -0.82, 2), 0.06, 8));

  // Engine: one round nozzle with petals
  const noz = nozzle(THREE, { radius: 0.82, length: 1.8, metal, glow: tint });
  noz.position.set(0, 0.05, 12.0);
  g.add(noz);

  // Internal cannon port, right of the canopy
  const gunPort = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.6, 10), metal);
  gunPort.rotation.x = Math.PI / 2;
  gunPort.position.set(1.15, 0.45, -5.6);
  g.add(gunPort);

  const flame = createEngineFlame(THREE, { radius: 0.74, length: 7.5, tint });
  flame.position.set(0, 0.05, 12.05);
  g.add(flame);

  finish(THREE, g);
  return {
    g, flames: [flame], flameTint: tint,
    exh: [new THREE.Vector3(0, 0.05, 12.1)],
    guns: [new THREE.Vector3(1.15, 0.45, -5.95), new THREE.Vector3(-1.15, 0.45, -5.95)],
    update() {},
  };
}

// ---------------------------------------------------------------------------------------------
// Ship 2: Kestrel, armored VTOL dropship (~23 m) with folding outer wings and landing gear
// ---------------------------------------------------------------------------------------------

export function buildKestrel(THREE) {
  const g = new THREE.Group();
  g.name = 'Kestrel';
  const armor = hullMaterial(THREE, 0x50565f, { metalness: 0.85, roughness: 0.36, clearcoat: 0.45, flat: true, repeat: 1 });
  const armorSmooth = hullMaterial(THREE, 0x50565f, { metalness: 0.85, roughness: 0.36, clearcoat: 0.45, repeat: 1 });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x23262b, metalness: 0.7, roughness: 0.5 });
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x8a8f96, metalness: 1, roughness: 0.3 });
  const warn = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.2, roughness: 0.5 });
  const tint = [1.0, 0.55, 0.22];

  // Armored, faceted body (few radial segments + flat shading = armor plates)
  const body = loft(THREE, [
    { z: -11.5, w: 0.5, top: 0.4, bot: 0.4, y: -0.2, n: 2.6 },
    { z: -10.0, w: 1.4, top: 1.0, bot: 0.8, y: -0.1, n: 3.0 },
    { z: -7.5, w: 2.0, top: 1.45, bot: 1.1, y: 0.0, n: 3.4 },
    { z: -3.0, w: 2.3, top: 1.6, bot: 1.25, y: 0.1, n: 3.8 },
    { z: 3.0, w: 2.3, top: 1.6, bot: 1.25, y: 0.1, n: 3.8 },
    { z: 7.5, w: 1.9, top: 1.35, bot: 1.0, y: 0.25, n: 3.4 },
    { z: 10.8, w: 1.3, top: 1.0, bot: 0.6, y: 0.4, n: 3.0 },
  ], { rings: 26, radial: 16, capStart: true, capEnd: true });
  g.add(new THREE.Mesh(body, armor));

  // Faceted glass canopy
  const can = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), glassMaterial(THREE, 0x0f2433, 0.25));
  can.material.flatShading = true;
  can.scale.set(1.35, 0.85, 2.0);
  can.position.set(0, 0.85, -8.6);
  g.add(can);
  const canRim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 20), dark);
  canRim.scale.set(1.36, 2.0, 1);
  canRim.rotation.x = Math.PI / 2;
  canRim.position.set(0, 0.45, -8.6);
  g.add(canRim);

  // Dorsal spine and sensor blister
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 9), armorSmooth);
  spine.position.set(0, 1.85, 1.5);
  g.add(spine);
  const blister = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), dark);
  blister.position.set(0, 2.05, -3.2);
  g.add(blister);
  g.add(antenna(THREE, new THREE.Vector3(0.3, 2.05, 4.5), 0.9, dark));
  g.add(antenna(THREE, new THREE.Vector3(-0.3, 2.05, 5.2), 0.6, dark));

  // Inner wings with lift fans, outer wings on hinges
  const fans = [];
  const outerPivots = [];
  for (const side of [-1, 1]) {
    const inner = new THREE.Mesh(wingGeo(THREE, { root: 7.0, tip: 6.0, span: 3.6, sweep: 0.6, thick: 0.7, side }), armor);
    inner.position.set(side * 2.0, 0.0, -1.6);
    g.add(inner);
    // lift fan: rim, grille, spinning rotor
    const fanCenter = new THREE.Vector3(side * 3.8, 0.0, 1.8);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.12, 10, 36), metal);
    rim.rotation.x = Math.PI / 2;
    rim.position.copy(fanCenter).add(new THREE.Vector3(0, 0.38, 0));
    g.add(rim);
    const rotor = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.3, 16), dark);
    rotor.add(hub);
    for (let b = 0; b < 11; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.26), metal);
      blade.position.x = 0.72;
      blade.rotation.x = 0.35;
      const holder = new THREE.Group();
      holder.rotation.y = (b / 11) * Math.PI * 2;
      holder.add(blade);
      rotor.add(holder);
    }
    rotor.position.copy(fanCenter).add(new THREE.Vector3(0, 0.25, 0));
    g.add(rotor);
    fans.push(rotor);
    const fanGlow = new THREE.Mesh(new THREE.CircleGeometry(1.15, 32), glowMaterial(THREE, tint, 0.6));
    fanGlow.rotation.x = Math.PI / 2;
    fanGlow.position.copy(fanCenter).add(new THREE.Vector3(0, -0.36, 0));
    fanGlow.userData.noShadow = true;
    g.add(fanGlow);
    for (let s = -2; s <= 2; s++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.05, 0.08), dark);
      slat.position.copy(fanCenter).add(new THREE.Vector3(0, 0.42, s * 0.42));
      g.add(slat);
    }
    // hinge + outer wing: pivot at the hinge line, outer panel extends outward from it
    const pivot = new THREE.Group();
    pivot.position.set(side * 5.6, 0.0, -1.0);
    const outer = new THREE.Mesh(wingGeo(THREE, { root: 5.8, tip: 2.4, span: 4.4, sweep: 2.8, thick: 0.5, side }), armor);
    outer.position.set(0, -0.25, 0);
    pivot.add(outer);
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 5.6, 12), metal);
    hinge.rotation.x = Math.PI / 2;
    hinge.position.set(0, 0, 2.8);
    pivot.add(hinge);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, 4.6), warn);
    stripe.position.set(side * 0.55, 0.02, 2.7);
    pivot.add(stripe);
    pivot.add(navLight(THREE, side > 0 ? [0.1, 1, 0.25] : [1, 0.08, 0.05], new THREE.Vector3(side * 4.45, 0.0, 4.0)));
    g.add(pivot);
    outerPivots.push({ pivot, side });
  }

  // Rear thrusters (rectangular, armored shrouds)
  const flames = [];
  const exh = [];
  for (const side of [-1, 1]) {
    const shroud = loft(THREE, [
      { z: 5.0, w: 0.75, top: 0.6, bot: 0.6, n: 3.5 },
      { z: 8.0, w: 0.85, top: 0.68, bot: 0.68, n: 3.5 },
      { z: 11.6, w: 0.78, top: 0.62, bot: 0.62, n: 3.5 },
    ], { rings: 12, radial: 20, capStart: true, capEnd: false });
    const sm = new THREE.Mesh(shroud, armor);
    sm.position.set(side * 1.9, 0.75, 0);
    g.add(sm);
    const noz = nozzle(THREE, { radius: 0.58, length: 1.0, petals: 12, metal, glow: tint });
    noz.position.set(side * 1.9, 0.75, 11.75);
    g.add(noz);
    const f = createEngineFlame(THREE, { radius: 0.52, length: 5.5, tint });
    f.position.set(side * 1.9, 0.75, 11.8);
    g.add(f);
    flames.push(f);
    exh.push(new THREE.Vector3(side * 1.9, 0.75, 11.85));
  }

  // Chin turret: twin cannons
  const turret = new THREE.Group();
  turret.position.set(0, -1.15, -8.2);
  turret.add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), dark));
  const guns = [];
  for (const side of [-1, 1]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 10), metal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(side * 0.18, -0.05, -0.9);
    turret.add(barrel);
    guns.push(new THREE.Vector3(side * 0.18, -1.2, -9.9));
  }
  g.add(turret);

  // Landing gear: nose + two mains, each on a pivot that swings down from the belly
  const gearPivots = [];
  const makeLeg = (pos, len, wheels) => {
    const pivot = new THREE.Group();
    pivot.position.copy(pos);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, len, 10), metal);
    strut.position.y = -len / 2;
    pivot.add(strut);
    const oleo = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, len * 0.35, 10), dark);
    oleo.position.y = -len * 0.2;
    pivot.add(oleo);
    for (let w = 0; w < wheels; w++) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 18), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wheels > 1 ? (w ? 0.24 : -0.24) : 0, -len, 0);
      pivot.add(wheel);
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 1.6), armorSmooth);
    door.position.set(0, -0.05, 0.4);
    pivot.add(door);
    g.add(pivot);
    gearPivots.push(pivot);
  };
  makeLeg(new THREE.Vector3(0, -0.95, -7.0), 1.6, 2);
  makeLeg(new THREE.Vector3(-1.7, -1.05, 3.5), 1.8, 2);
  makeLeg(new THREE.Vector3(1.7, -1.05, 3.5), 1.8, 2);

  g.add(navLight(THREE, [1, 1, 1], new THREE.Vector3(0, 2.1, 6.2), 0.08, 6));
  g.add(navLight(THREE, [1, 0.12, 0.05], new THREE.Vector3(0, -1.3, 1.0), 0.07, 8));

  finish(THREE, g);

  const ease = (x) => x * x * (3 - 2 * x);
  const ship = {
    g, flames, exh, guns, flameTint: tint, foldT: 0,
    /** 0 = wings deployed and gear up (flight); 1 = wings folded up and gear down (landed). */
    applyFold(t) {
      ship.foldT = Math.max(0, Math.min(1, t));
      const wingT = ease(Math.min(1, Math.max(0, (ship.foldT - 0.25) / 0.75)));
      const gearT = ease(Math.min(1, ship.foldT / 0.6));
      for (const { pivot, side } of outerPivots) pivot.rotation.z = side * wingT * (Math.PI * 0.52);
      gearPivots.forEach((p) => {
        p.rotation.x = (1 - gearT) * -Math.PI / 2; // up: lies flat along the belly
        p.scale.setScalar(0.6 + 0.4 * gearT);
        p.visible = gearT > 0.02;
      });
    },
    update(dt) {
      for (const f of fans) f.rotation.y += dt * (14 + 30 * (1 - ship.foldT));
    },
  };
  ship.applyFold(0);
  return ship;
}

// ---------------------------------------------------------------------------------------------
// Ship 3: Starflare, heavy gunship frigate (~28 m)
// ---------------------------------------------------------------------------------------------

export function buildStarflare(THREE) {
  const g = new THREE.Group();
  g.name = 'Starflare';
  const chrome = hullMaterial(THREE, 0xdfe4ea, { metalness: 1.0, roughness: 0.14, clearcoat: 1.0, repeat: 1 });
  const trim = hullMaterial(THREE, 0x2b3038, { metalness: 0.7, roughness: 0.4, clearcoat: 0.6, panel: false });
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x9aa1aa, metalness: 1, roughness: 0.25, clearcoat: 0.5 });
  const tint = [0.62, 0.5, 1.0];

  // Long chrome hull
  const hull = loft(THREE, [
    { z: -14.2, w: 0.05, top: 0.05, bot: 0.05, y: 0.0, n: 2.0 },
    { z: -12.6, w: 0.9, top: 0.7, bot: 0.6, y: 0.0, n: 2.0 },
    { z: -9.5, w: 1.6, top: 1.25, bot: 1.0, y: 0.05, n: 2.2 },
    { z: -4.0, w: 2.05, top: 1.55, bot: 1.3, y: 0.1, n: 2.4 },
    { z: 3.0, w: 2.15, top: 1.6, bot: 1.4, y: 0.1, n: 2.5 },
    { z: 9.0, w: 1.85, top: 1.4, bot: 1.2, y: 0.1, n: 2.4 },
    { z: 13.0, w: 1.3, top: 1.05, bot: 0.9, y: 0.1, n: 2.2 },
  ], { rings: 96, radial: 48, capEnd: true });
  g.add(new THREE.Mesh(hull, chrome));

  // Glass cockpit wrapping the upper nose
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), glassMaterial(THREE, 0x0d1d2b, 0.35));
  cockpit.scale.set(1.05, 0.75, 2.6);
  cockpit.position.set(0, 0.6, -9.6);
  g.add(cockpit);
  const cf = canopyFrame(THREE, { w: 1.05, h: 0.75, l: 2.6, ribs: 3, material: trim });
  cf.position.copy(cockpit.position);
  g.add(cf);

  // Hull trim bands and a dorsal fin pair
  for (const z of [-6.5, 0.5, 7.5]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 48), trim);
    band.scale.set(2.17, 1.55, 1);
    band.position.set(0, 0.12, z);
    g.add(band);
  }
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(wingGeo(THREE, { root: 4.2, tip: 1.6, span: 1.8, sweep: 2.6, thick: 0.16, side: 1 }), chrome);
    fin.rotation.z = side > 0 ? Math.PI / 2 - 0.3 : Math.PI / 2 + 0.3;
    fin.position.set(side * 0.6, 1.55, 7.2);
    g.add(fin);
  }

  // Three outboard engine pods on pylons: left, right, dorsal
  const flames = [];
  const exh = [];
  const pods = [
    { p: new THREE.Vector3(-4.6, -0.2, 5.0), pylonRot: Math.PI / 2 },
    { p: new THREE.Vector3(4.6, -0.2, 5.0), pylonRot: -Math.PI / 2 },
    { p: new THREE.Vector3(0, 3.9, 6.5), pylonRot: 0 },
  ];
  const podGeo = loft(THREE, [
    { z: -4.4, w: 0.55, top: 0.55, bot: 0.55, n: 2 },
    { z: -3.6, w: 0.95, top: 0.95, bot: 0.95, n: 2 },
    { z: 0.0, w: 1.05, top: 1.05, bot: 1.05, n: 2 },
    { z: 3.4, w: 0.95, top: 0.95, bot: 0.95, n: 2 },
  ], { rings: 30, radial: 36, capStart: false, capEnd: false });
  for (const { p, pylonRot } of pods) {
    const pod = new THREE.Mesh(podGeo, chrome);
    pod.position.copy(p);
    g.add(pod);
    const intake = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.11, 10, 32), metal);
    intake.position.copy(p).add(new THREE.Vector3(0, 0, -4.4));
    g.add(intake);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24), MAT_DARK(THREE));
    fan.rotation.y = Math.PI;
    fan.position.copy(p).add(new THREE.Vector3(0, 0, -4.2));
    g.add(fan);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.05, 6, 40), trim);
    ring.position.copy(p).add(new THREE.Vector3(0, 0, 0.8));
    g.add(ring);
    const noz = nozzle(THREE, { radius: 0.78, length: 1.3, petals: 16, metal, glow: tint });
    noz.position.copy(p).add(new THREE.Vector3(0, 0, 4.4));
    g.add(noz);
    const f = createEngineFlame(THREE, { radius: 0.7, length: 8.0, tint });
    f.position.copy(p).add(new THREE.Vector3(0, 0, 4.45));
    g.add(f);
    flames.push(f);
    exh.push(p.clone().add(new THREE.Vector3(0, 0, 4.5)));
    // swept pylon from the hull to the pod
    const len = pylonRot === 0 ? 2.4 : 2.8;
    const pylon = new THREE.Mesh(wingGeo(THREE, { root: 4.6, tip: 3.2, span: len, sweep: 1.0, thick: 0.28, side: 1 }), chrome);
    if (pylonRot === 0) {
      pylon.rotation.z = Math.PI / 2;
      pylon.position.set(0, 1.4, p.z - 2.4);
    } else {
      const s = Math.sign(p.x);
      pylon.rotation.z = s > 0 ? 0 : Math.PI;
      pylon.position.set(s * 1.85, -0.2 + (s > 0 ? 0 : 0), p.z - 2.4);
    }
    g.add(pylon);
  }

  // Twin ventral turrets
  const guns = [new THREE.Vector3(0.45, -0.2, -14.0), new THREE.Vector3(-0.45, -0.2, -14.0)];
  const turrets = [];
  for (const z of [-4.5, 3.5]) {
    const t = new THREE.Group();
    t.position.set(0, -1.38, z);
    t.add(new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), trim));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.06, 6, 28), metal);
    ring.rotation.x = Math.PI / 2;
    t.add(ring);
    for (const side of [-1, 1]) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.2, 10), metal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(side * 0.24, -0.38, -1.1);
      t.add(barrel);
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 10), trim);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.set(side * 0.24, -0.38, -2.2);
      t.add(muzzle);
      guns.push(new THREE.Vector3(side * 0.24, -1.76, z - 2.3));
    }
    g.add(t);
    turrets.push(t);
  }
  // nose cannons
  for (const side of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2, 8), metal);
    b.rotation.x = Math.PI / 2;
    b.position.set(side * 0.45, -0.2, -13.4);
    g.add(b);
  }

  // Lights and antennas
  g.add(navLight(THREE, [1, 0.08, 0.05], new THREE.Vector3(-5.7, -0.2, 5.0)));
  g.add(navLight(THREE, [0.1, 1, 0.25], new THREE.Vector3(5.7, -0.2, 5.0)));
  g.add(navLight(THREE, [1, 1, 1], new THREE.Vector3(0, 5.0, 6.5), 0.08, 6));
  g.add(antenna(THREE, new THREE.Vector3(0.5, 1.6, -3.0), 1.1, trim));
  g.add(antenna(THREE, new THREE.Vector3(-0.5, 1.6, -2.2), 0.7, trim));
  g.add(bladeAntenna(THREE, new THREE.Vector3(0, 1.62, 1.6), trim));

  finish(THREE, g);
  return {
    g, flames, exh, guns, flameTint: tint, turrets,
    update() {},
  };
}

// ---------------------------------------------------------------------------------------------
// Terrain, water and lava materials (MeshStandardMaterial + onBeforeCompile: lights, fog and
// shadows keep working)
// ---------------------------------------------------------------------------------------------

/**
 * Slope- and height-based rock/grass/sand/snow with triplanar procedural detail and a distance fade.
 * Heights are world Y in metres. Give the terrain mesh receiveShadow = true.
 */
export function makeTerrainMaterial(THREE, {
  sandLevel = 4, snowLevel = 420, grassMaxSlope = 0.32, rockSlope = 0.5,
  detailScale = 0.18, macroScale = 0.0016, fadeStart = 350, fadeEnd = 2600,
  sand = 0xc9b48a, grass = 0x4f6b34, rock = 0x6d645b, snow = 0xf2f5f8, haze = 0x9fb3c8,
} = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0.0 });
  const U = {
    kSand: { value: new THREE.Color(sand) }, kGrass: { value: new THREE.Color(grass) },
    kRock: { value: new THREE.Color(rock) }, kSnow: { value: new THREE.Color(snow) }, kHaze: { value: new THREE.Color(haze) },
    kLevels: { value: new THREE.Vector4(sandLevel, snowLevel, grassMaxSlope, rockSlope) },
    kScales: { value: new THREE.Vector4(detailScale, macroScale, fadeStart, fadeEnd) },
  };
  mat.userData.uniforms = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vKW; varying vec3 vKN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vKW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vKN = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vKW; varying vec3 vKN;
        uniform vec3 kSand; uniform vec3 kGrass; uniform vec3 kRock; uniform vec3 kSnow; uniform vec3 kHaze;
        uniform vec4 kLevels; uniform vec4 kScales;
        ${GLSL_NOISE}
        ${GLSL_TRIPLANAR}
        float kDetailFade(){ return 1.0 - smoothstep(kScales.z, kScales.w, distance(cameraPosition, vKW)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 kn = normalize(vKN);
        float slope = 1.0 - clamp(kn.y, 0.0, 1.0);
        float fade = kDetailFade();
        float macro = kFbm2(vKW.xz * kScales.y);
        float detail = mix(0.5, kTri(vKW * kScales.x, kn), fade);
        float fine = mix(0.5, kTri(vKW * kScales.x * 6.0, kn), fade * fade);
        float h = vKW.y + (macro - 0.5) * 40.0;
        // layers
        vec3 grassC = kGrass * (0.75 + 0.5 * macro) * (0.85 + 0.3 * detail);
        vec3 sandC = kSand * (0.9 + 0.2 * detail);
        vec3 rockC = mix(kRock * 0.7, kRock * 1.25, detail) * (0.85 + 0.3 * fine);
        float strata = 0.5 + 0.5 * sin(vKW.y * 0.35 + detail * 6.0);
        rockC *= 0.85 + 0.25 * strata;
        vec3 snowC = kSnow * (0.92 + 0.08 * fine);
        float wSand = 1.0 - smoothstep(kLevels.x - 2.0, kLevels.x + 6.0 + detail * 6.0, h);
        float wRock = smoothstep(kLevels.z, kLevels.w, slope + (detail - 0.5) * 0.18);
        float wSnow = smoothstep(kLevels.y - 40.0, kLevels.y + 40.0, h + detail * 60.0) * (1.0 - smoothstep(0.45, 0.75, slope));
        vec3 base = mix(grassC, sandC, wSand);
        base = mix(base, rockC, wRock);
        base = mix(base, snowC, wSnow);
        // distance: towards a cooler, flatter tone so far slopes don't shimmer
        base = mix(kHaze * 0.55 + base * 0.45, base, 0.35 + 0.65 * fade);
        diffuseColor.rgb *= base;
        float kRough = mix(0.95, 0.75, wSnow) - 0.08 * wRock * fine;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = kRough;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // small procedural bumps from the detail noise (world space -> view space)
          float e = 0.6;
          vec3 P = vKW * kScales.x * 6.0;
          float c0 = kTri(P, kn);
          float cx = kTri(P + vec3(e, 0.0, 0.0), kn);
          float cz = kTri(P + vec3(0.0, 0.0, e), kn);
          vec3 bumpW = normalize(vec3((c0 - cx) * 1.6, 1.0, (c0 - cz) * 1.6));
          vec3 t = normalize(cross(vec3(0.0, 0.0, 1.0), kn) + vec3(1e-4, 0.0, 0.0));
          vec3 b = normalize(cross(kn, t));
          vec3 nW = normalize(t * bumpW.x + kn * bumpW.y + b * bumpW.z);
          vec3 nV = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
          normal = normalize(mix(normal, nV, 0.55 * kDetailFade()));
        }`);
  };
  mat.customProgramCacheKey = () => 'kessel-terrain';
  return mat;
}

/** Animated water: wave normals, depth-of-view tint, glossy reflections. Use a flat plane at sea level. */
export function makeWaterMaterial(THREE, { shallow = 0x2e8c9a, deep = 0x0a2a3d, opacity = 0.86, waveScale = 0.06, choppiness = 0.55 } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.06, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.04,
    transparent: true, opacity, envMapIntensity: 1.3,
  });
  const U = { uTime: shared.uTime, wShallow: { value: new THREE.Color(shallow) }, wDeep: { value: new THREE.Color(deep) },
    wParams: { value: new THREE.Vector2(waveScale, choppiness) } };
  mat.userData.uniforms = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWW; uniform float uTime; uniform vec3 wShallow; uniform vec3 wDeep; uniform vec2 wParams;
        ${GLSL_NOISE}
        vec2 kWaveGrad(vec2 p){
          vec2 g = vec2(0.0);
          vec2 dirs[4]; dirs[0]=vec2(1.0,0.2); dirs[1]=vec2(-0.6,1.0); dirs[2]=vec2(0.3,-1.0); dirs[3]=vec2(-1.0,-0.4);
          float f = 1.0, a = 1.0;
          for(int i=0;i<4;i++){ vec2 d = normalize(dirs[i]); float ph = dot(d, p) * f + uTime * (1.2 + 0.4*float(i));
            g += d * cos(ph) * a * f; f *= 1.9; a *= 0.55; }
          float n1 = kNoise2(p * 3.0 + uTime * 0.6), n2 = kNoise2(p * 3.0 + vec2(0.4, 0.0) + uTime * 0.6), n3 = kNoise2(p * 3.0 + vec2(0.0, 0.4) + uTime * 0.6);
          g += vec2(n2 - n1, n3 - n1) * 6.0;
          return g;
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 wV = normalize(cameraPosition - vWW);
        float facing = clamp(wV.y, 0.0, 1.0);
        diffuseColor.rgb *= mix(wDeep, wShallow, pow(facing, 0.6) * 0.8);
        diffuseColor.a *= mix(1.0, 0.75, facing);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec2 gr = kWaveGrad(vWW.xz * wParams.x) * wParams.y * 0.1;
          vec3 nW = normalize(vec3(-gr.x, 1.0, -gr.y));
          normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
        }`);
  };
  mat.customProgramCacheKey = () => 'kessel-water';
  return mat;
}

/** Flowing lava: dark cooled crust over glowing HDR cracks (blooms), slow churn. */
export function makeLavaMaterial(THREE, { scale = 0.05, flow = [0.25, 0.1], glow = 3.2 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.0, emissive: 0xffffff });
  const U = { uTime: shared.uTime, lParams: { value: new THREE.Vector4(scale, flow[0], flow[1], glow) } };
  mat.userData.uniforms = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLW; uniform float uTime; uniform vec4 lParams;
        ${GLSL_NOISE}
        float kLava(vec2 p){
          vec2 q = vec2(kFbm2(p + uTime * 0.05), kFbm2(p + vec2(5.2, 1.3) - uTime * 0.04));
          return kFbm2(p + 3.0 * q + lParams.yz * uTime);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float lv = kLava(vLW.xz * lParams.x);
        float cracks = smoothstep(0.45, 0.62, lv);
        float pulse = 0.85 + 0.15 * sin(uTime * 1.7 + lv * 9.0);
        diffuseColor.rgb *= mix(vec3(0.07, 0.05, 0.045), vec3(0.35, 0.08, 0.02), cracks);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 hot = mix(vec3(1.0, 0.18, 0.02), vec3(1.0, 0.75, 0.25), smoothstep(0.62, 0.85, lv));
        totalEmissiveRadiance = hot * cracks * lParams.w * pulse;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.95, 0.45, cracks);`);
  };
  mat.customProgramCacheKey = () => 'kessel-lava';
  return mat;
}

// ---------------------------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------------------------

/**
 * Explosion: fireball, smoke, shockwave ring, debris and sparks, plus a light flash.
 * const ex = createExplosion(THREE, { size: 12 }); ex.object.position.copy(p); scene.add(ex.object);
 * each frame: if (!ex.update(dt, camera)) { scene.remove(ex.object); ex.dispose(); }
 */
export function createExplosion(THREE, { size = 10, duration = 2.2, debris = 36, sparks = 160, tint = [1.0, 0.55, 0.18] } = {}) {
  const obj = new THREE.Group();
  const fireMat = new THREE.ShaderMaterial({
    uniforms: { uAge: { value: 0 }, uSeed: { value: Math.random() * 50 }, uTint: { value: new THREE.Vector3(...tint) } },
    vertexShader: /* glsl */ `
      uniform float uAge; uniform float uSeed; varying vec3 vP; varying float vN; varying vec3 vNorm; varying vec3 vView;
      ${GLSL_NOISE}
      void main(){
        float n = kFbm3(position * 2.2 + uSeed + uAge * 1.5);
        vec3 p = position * (1.0 + (n - 0.5) * 0.6);
        vP = p; vN = n;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vNorm = normalize(normalMatrix * normal); vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAge; uniform vec3 uTint; varying vec3 vP; varying float vN; varying vec3 vNorm; varying vec3 vView;
      void main(){
        float heat = clamp(1.25 - uAge * 1.3 + (vN - 0.5) * 1.2, 0.0, 1.0);
        vec3 col = mix(vec3(0.25, 0.05, 0.02), uTint, smoothstep(0.1, 0.5, heat));
        col = mix(col, vec3(1.0, 0.92, 0.7), smoothstep(0.6, 1.0, heat));
        float rim = pow(abs(dot(normalize(vNorm), normalize(vView))), 0.8);
        float a = clamp((1.0 - uAge) * 1.4, 0.0, 1.0) * (0.35 + 0.65 * rim);
        gl_FragColor = vec4(col * (0.55 + 2.4 * heat) * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const fire = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 5), fireMat);
  obj.add(fire);
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  const smoke = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), smokeMat);
  obj.add(smoke);
  const ringMat = new THREE.ShaderMaterial({
    uniforms: { uAge: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */ `uniform float uAge; varying vec2 vUv;
      void main(){ float r = length(vUv - 0.5) * 2.0; float band = smoothstep(0.7, 0.92, r) * (1.0 - smoothstep(0.92, 1.0, r));
        float a = band * (1.0 - uAge); gl_FragColor = vec4(vec3(1.6, 1.3, 1.0) * a * 1.6, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ringMat);
  obj.add(ring);
  const debrisGeo = new THREE.BoxGeometry(1, 1, 1);
  const debrisMesh = new THREE.InstancedMesh(debrisGeo, new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.7, metalness: 0.4 }), debris);
  debrisMesh.castShadow = true;
  const dState = [];
  for (let i = 0; i < debris; i++) {
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 - 0.1, Math.random() - 0.5).normalize();
    dState.push({ v: dir.multiplyScalar(size * (1.2 + Math.random() * 2.2)), p: new THREE.Vector3(),
      r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), w: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
      s: size * (0.02 + Math.random() * 0.06) });
  }
  obj.add(debrisMesh);
  const sparkPos = new Float32Array(sparks * 3);
  const sparkVel = [];
  for (let i = 0; i < sparks; i++) sparkVel.push(new THREE.Vector3().randomDirection().multiplyScalar(size * (2 + Math.random() * 4)));
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({ color: new THREE.Color(4, 2.4, 0.9), size: size * 0.04, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sparkPts = new THREE.Points(sparkGeo, sparkMat);
  obj.add(sparkPts);
  const light = new THREE.PointLight(new THREE.Color(tint[0], tint[1] * 0.9, tint[2]), 0, size * 12, 2);
  obj.add(light);
  let age = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  return {
    object: obj,
    update(dt, camera) {
      age += dt;
      const t = Math.min(age / duration, 1);
      const grow = 1 - Math.pow(1 - Math.min(t * 2.2, 1), 3);
      fireMat.uniforms.uAge.value = Math.min(t * 1.4, 1);
      fire.scale.setScalar(size * (0.15 + 0.85 * grow));
      smoke.scale.setScalar(size * (0.4 + 1.1 * t));
      smokeMat.opacity = Math.max(0, Math.min(t * 3, 1) * (1 - t)) * 0.55;
      ringMat.uniforms.uAge.value = Math.min(t * 2.5, 1);
      ring.scale.setScalar(size * (0.2 + 3.2 * Math.min(t * 2.5, 1)));
      if (camera) ring.quaternion.copy(camera.quaternion);
      light.intensity = size * size * 6 * Math.max(0, 1 - t * 3);
      for (let i = 0; i < debris; i++) {
        const d = dState[i];
        d.v.y -= 9.8 * dt; d.p.addScaledVector(d.v, dt);
        d.r.x += d.w.x * dt; d.r.y += d.w.y * dt; d.r.z += d.w.z * dt;
        q.setFromEuler(d.r); sc.setScalar(d.s * (1 - t * 0.5));
        debrisMesh.setMatrixAt(i, m4.compose(d.p, q, sc));
      }
      debrisMesh.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < sparks; i++) {
        const v = sparkVel[i]; v.multiplyScalar(1 - 1.8 * dt); v.y -= 4 * dt;
        sparkPos[i * 3] += v.x * dt; sparkPos[i * 3 + 1] += v.y * dt; sparkPos[i * 3 + 2] += v.z * dt;
      }
      sparkGeo.attributes.position.needsUpdate = true;
      sparkMat.opacity = Math.max(0, 1 - t * 1.6);
      return age < duration;
    },
    dispose() {
      obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    },
  };
}

/** Laser bolt along -Z (its travel direction): white-hot core + coloured HDR glow. Move it yourself. */
export function createLaserBolt(THREE, { color = [1.0, 0.18, 0.12], length = 6, radius = 0.12 } = {}) {
  const grp = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CapsuleGeometry(radius * 0.45, length, 4, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 6) }));
  core.rotation.x = Math.PI / 2;
  grp.add(core);
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Vector3(...color) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(uColor * 5.0 * f, f); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(new THREE.CapsuleGeometry(radius * 2.4, length, 4, 12), glowMat);
  glow.rotation.x = Math.PI / 2;
  grp.add(glow);
  grp.traverse((o) => { o.castShadow = false; });
  return grp;
}

/**
 * Shield bubble that ripples where it is hit. const sh = createShield(THREE, { radius: 16 });
 * ship.g.add(sh.object); sh.hit(worldPoint); each frame sh.update(dt).
 */
export function createShield(THREE, { radius = 10, color = [0.35, 0.75, 1.0], scale = [1, 0.6, 1.4] } = {}) {
  const MAX = 6;
  const hits = Array.from({ length: MAX }, () => new THREE.Vector4(0, 0, 1, 99));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uColor: { value: new THREE.Vector3(...color) }, uHits: { value: hits } },
    vertexShader: /* glsl */ `varying vec3 vDir; varying vec3 vN; varying vec3 vV;
      void main(){ vDir = normalize(position); vec4 mv = modelViewMatrix * vec4(position,1.0);
        vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform float uTime; uniform vec3 uColor; uniform vec4 uHits[${MAX}];
      varying vec3 vDir; varying vec3 vN; varying vec3 vV;
      ${GLSL_NOISE}
      void main(){
        float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0) * 0.07;
        float hex = 0.5 + 0.5 * sin(vDir.x * 60.0) * sin(vDir.y * 60.0 + vDir.z * 34.0);
        float energy = 0.0;
        for (int i = 0; i < ${MAX}; i++) {
          float age = uHits[i].w;
          if (age > 2.0) continue;
          float d = acos(clamp(dot(vDir, normalize(uHits[i].xyz)), -1.0, 1.0));
          float wave = exp(-pow((d - age * 1.6) * 9.0, 2.0)) * (1.0 - age / 2.0);
          float flash = exp(-d * 9.0) * exp(-age * 5.0) * 2.5;
          energy += wave * (0.6 + 0.4 * hex) + flash;
        }
        float n = kNoise3(vDir * 6.0 + uTime * 0.4);
        float a = clamp(rim * (0.7 + 0.6 * n) + energy, 0.0, 1.0);
        gl_FragColor = vec4(uColor * (1.0 + 3.0 * energy) * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 40), mat);
  mesh.scale.set(...scale);
  mesh.userData.noShadow = true;
  let next = 0;
  const local = new THREE.Vector3();
  return {
    object: mesh,
    /** point: a world-space position (or local if `isLocal`). */
    hit(point, isLocal = false) {
      local.copy(point);
      if (!isLocal) mesh.worldToLocal(local);
      hits[next].set(local.x, local.y, local.z, 0);
      next = (next + 1) % MAX;
    },
    update(dt) { for (const h of hits) h.w += dt; },
  };
}

/**
 * Atmospheric sky dome with Rayleigh-style gradient, Mie sun halo and an HDR sun disc (blooms).
 * const sky = createSky(THREE, { sunDirection: new THREE.Vector3(0.4, 0.35, -0.8) }); scene.add(sky.mesh);
 * scene.fog = new THREE.FogExp2(sky.horizonColor, 0.00012) matches the horizon.
 */
export function createSky(THREE, { sunDirection = new THREE.Vector3(0.4, 0.3, -0.85), radius = 9000,
  zenith = [0.12, 0.3, 0.65], horizon = [0.62, 0.74, 0.86], sunColor = [1.0, 0.86, 0.66], ground = [0.32, 0.33, 0.34] } = {}) {
  const sun = sunDirection.clone().normalize();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uSun: { value: sun }, uZenith: { value: new THREE.Vector3(...zenith) }, uHorizon: { value: new THREE.Vector3(...horizon) },
      uSunColor: { value: new THREE.Vector3(...sunColor) }, uGround: { value: new THREE.Vector3(...ground) },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: /* glsl */ `uniform vec3 uSun; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunColor; uniform vec3 uGround; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        float sunH = clamp(uSun.y, -0.2, 1.0);
        // Rayleigh-ish: deeper blue overhead, bright at the horizon, warmer when the sun is low
        vec3 sky = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.45));
        sky = mix(sky, sky * vec3(1.15, 0.85, 0.7), (1.0 - smoothstep(0.0, 0.35, sunH)) * (1.0 - smoothstep(0.0, 0.5, h)));
        float mu = dot(d, normalize(uSun));
        float mie = pow(max(mu, 0.0), 12.0) * 0.6 + pow(max(mu, 0.0), 120.0) * 1.2;
        float rayleigh = 0.75 * (1.0 + mu * mu);
        vec3 col = sky * (0.75 + 0.35 * rayleigh) + uSunColor * mie;
        float disc = smoothstep(0.9994, 0.99975, mu);
        col += uSunColor * disc * 22.0;
        col = mix(col, uGround * (0.6 + 0.4 * sunH), smoothstep(0.0, -0.08, h));
        col *= 0.35 + 0.65 * smoothstep(-0.25, 0.25, sunH);
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  const horizonColor = new THREE.Color(horizon[0], horizon[1], horizon[2]);
  return {
    mesh, horizonColor,
    setSun(dir) { mat.uniforms.uSun.value.copy(dir).normalize(); },
  };
}

/** A drifting cloud layer (large plane) at an altitude, lit from the sun, fades into fog. */
export function createCloudLayer(THREE, { altitude = 900, size = 16000, coverage = 0.5, scale = 0.00035, sunDirection = new THREE.Vector3(0.4, 0.3, -0.85) } = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uCoverage: { value: coverage }, uScale: { value: scale }, uSun: { value: sunDirection.clone().normalize() },
    }]),
    vertexShader: /* glsl */ `varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vW = (modelMatrix * vec4(position, 1.0)).xyz; vec4 mvPosition = viewMatrix * vec4(vW, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `uniform float uTime; uniform float uCoverage; uniform float uScale; uniform vec3 uSun; varying vec3 vW;
      #include <fog_pars_fragment>
      ${GLSL_NOISE}
      void main(){
        vec2 p = vW.xz * uScale + vec2(uTime * 0.004, uTime * 0.002);
        float n = kFbm2(p * 4.0) * 0.7 + kFbm2(p * 13.0 + 3.1) * 0.3;
        float d = smoothstep(1.0 - uCoverage, 1.0 - uCoverage + 0.25, n);
        float shade = 0.75 + 0.35 * clamp(uSun.y + (n - 0.5), 0.0, 1.0);
        float edge = 1.0 - smoothstep(0.35, 0.5, length(vW.xz) * uScale * 0.35);
        gl_FragColor = vec4(vec3(shade), d * 0.85 * edge);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
  });
  mat.uniforms.uTime = shared.uTime;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = altitude;
  mesh.userData.noShadow = true;
  return mesh;
}

/** A planet for the sky: banded surface, a separate drifting cloud shell and an atmosphere rim glow. */
export function createPlanet(THREE, { radius = 800, surface = [0.62, 0.42, 0.28], ocean = [0.12, 0.28, 0.45], atmosphere = [0.45, 0.65, 1.0] } = {}) {
  const grp = new THREE.Group();
  const surfMat = new THREE.ShaderMaterial({
    uniforms: { uLand: { value: new THREE.Vector3(...surface) }, uSea: { value: new THREE.Vector3(...ocean) }, uLight: { value: new THREE.Vector3(1, 0.3, 0.2).normalize() } },
    vertexShader: 'varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */ `uniform vec3 uLand; uniform vec3 uSea; uniform vec3 uLight; varying vec3 vP; varying vec3 vN;
      ${GLSL_NOISE}
      void main(){ vec3 d = normalize(vP); float n = kFbm3(d * 3.5); float bands = 0.5 + 0.5 * sin(d.y * 18.0 + n * 6.0);
        vec3 c = mix(uSea, uLand * (0.8 + 0.4 * bands), smoothstep(0.48, 0.52, n));
        float l = clamp(dot(normalize(vN), uLight), 0.0, 1.0); gl_FragColor = vec4(c * (0.06 + l), 1.0); }`,
  });
  const surf = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 40), surfMat);
  grp.add(surf);
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uLight: surfMat.uniforms.uLight },
    vertexShader: 'varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */ `uniform float uTime; uniform vec3 uLight; varying vec3 vP; varying vec3 vN;
      ${GLSL_NOISE}
      void main(){ vec3 d = normalize(vP); float a = uTime * 0.01; mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
        d.xz = r * d.xz; float n = kFbm3(d * 5.0 + vec3(0.0, uTime * 0.005, 0.0));
        float c = smoothstep(0.5, 0.75, n); float l = clamp(dot(normalize(vN), uLight), 0.0, 1.0);
        gl_FragColor = vec4(vec3(0.05 + l), c * 0.9); }`,
    transparent: true, depthWrite: false,
  });
  grp.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 1.012, 64, 40), cloudMat));
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Vector3(...atmosphere) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uColor; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 4.0); gl_FragColor = vec4(uColor * f * 2.2, f); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
  });
  grp.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 1.08, 64, 40), atmoMat));
  grp.traverse((o) => { o.castShadow = false; o.receiveShadow = false; });
  return { object: grp, setLight(dir) { surfMat.uniforms.uLight.value.copy(dir).normalize(); } };
}
