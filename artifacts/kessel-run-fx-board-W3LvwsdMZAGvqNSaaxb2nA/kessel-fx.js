/**
 * kessel-fx.js: film-style explosions, V2 engine flames and synthesized audio for Kessel Run.
 * Three.js r160, ES module, imports nothing. Every builder takes THREE first; audio takes an AudioContext.
 *
 *   import * as FX from './kessel-fx.js';
 *   // each frame
 *   FX.updateKesselFx(clock.elapsedTime);
 *
 *   // explosions (no lights inside: drive your one persistent light from ex.flash)
 *   const ex = FX.createExplosionV2(THREE, { size: 12, type: 'air' | 'ground' | 'ship' });
 *   ex.object.position.copy(p); scene.add(ex.object);
 *   if (!ex.update(dt, camera)) { scene.remove(ex.object); ex.dispose(); }
 *   flashLight.position.copy(ex.flash.position); flashLight.intensity = ex.flash.intensity;
 *
 *   // engines
 *   const eng = FX.createEngineFlameV2(THREE, { radius: 0.75, length: 8 });  // base at origin, plume along +Z
 *   eng.setState({ throttle: 0.8, afterburner: false }); eng.update(dt);
 *   FX.upgradeShipFlames(THREE, ship);   // swaps a kessel-assets ship's flames for V2; then ship.setEngine({...})
 *
 *   // audio (create the AudioContext from a click)
 *   const engine = FX.createEngineAudio(ctx, ctx.destination);
 *   engine.setState({ rpm: 0.8, boost: false, cruise: false, damage: 0 });
 *   FX.playExplosion(ctx, ctx.destination, { size: 1, distance: 120 });
 */

const fxTime = { value: 0 };

/** Call once per frame with elapsed seconds. */
export function updateKesselFx(timeSeconds) {
  fxTime.value = timeSeconds;
}

const NOISE = /* glsl */ `
float fxH3(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float fxN3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(fxH3(i),fxH3(i+vec3(1,0,0)),f.x), mix(fxH3(i+vec3(0,1,0)),fxH3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(fxH3(i+vec3(0,0,1)),fxH3(i+vec3(1,0,1)),f.x), mix(fxH3(i+vec3(0,1,1)),fxH3(i+vec3(1,1,1)),f.x),f.y), f.z); }
float fxFbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*fxN3(p); p=p*2.02+vec3(5.2,1.3,7.7); a*=0.5; } return s; }
// Blackbody-ish ramp: t in 0..1 (cool smoke-red -> orange -> yellow -> white-hot)
vec3 fxHeat(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(vec3(0.35, 0.04, 0.01), vec3(1.0, 0.32, 0.04), smoothstep(0.0, 0.35, t));
  c = mix(c, vec3(1.0, 0.72, 0.22), smoothstep(0.3, 0.65, t));
  c = mix(c, vec3(1.0, 0.97, 0.88), smoothstep(0.65, 1.0, t));
  return c;
}
`;

const rand = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------------------------------------
// Soft particle pool (Points) with colour over life
// ---------------------------------------------------------------------------------------------

const P_FIRE = 0, P_SMOKE = 1, P_SPARK = 2, P_DUST = 3, P_EMBER = 4;

function particlePool(THREE, capacity, { additive = false } = {}) {
  const pos = new Float32Array(capacity * 3);
  const data = new Float32Array(capacity * 4); // age01, size, kind, seed
  const vel = new Float32Array(capacity * 3);
  const life = new Float32Array(capacity);
  const age = new Float32Array(capacity);
  const grow = new Float32Array(capacity);
  const drag = new Float32Array(capacity);
  const buoy = new Float32Array(capacity);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aData', new THREE.BufferAttribute(data, 4).setUsage(THREE.DynamicDrawUsage));
  geo.setDrawRange(0, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 600 }, uTime: fxTime, uSun: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() } },
    vertexShader: /* glsl */ `
      attribute vec4 aData; uniform float uScale; varying vec4 vData;
      void main(){
        vData = aData;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aData.x >= 1.0 ? 0.0 : aData.y * uScale / max(-mv.z, 0.1);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec4 vData;
      ${NOISE}
      void main(){
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r = length(c);
        if (r > 1.0) discard;
        float t = vData.x, kind = vData.z, seed = vData.w;
        float n = fxFbm(vec3(c * 1.7, seed * 13.0 + uTime * 0.6));
        float soft = smoothstep(1.0, 0.25 + 0.35 * n, r);
        vec3 col; float a;
        if (kind < 0.5) {            // fire: white-hot -> orange -> dark smoke
          float heat = clamp(1.15 - t * 1.6 + (n - 0.5) * 0.5, 0.0, 1.0);
          vec3 smoke = vec3(0.07, 0.065, 0.06);
          col = mix(smoke, fxHeat(heat) * (1.0 + 3.5 * heat), smoothstep(0.08, 0.35, heat));
          a = soft * (1.0 - smoothstep(0.55, 1.0, t)) * (0.6 + 0.4 * n);
        } else if (kind < 1.5) {     // smoke: lit from above, thins out
          float lit = 0.35 + 0.65 * clamp(0.5 - c.y * 0.5 + (n - 0.5), 0.0, 1.0);
          col = vec3(0.16, 0.15, 0.14) * lit;
          a = soft * smoothstep(0.0, 0.12, t) * (1.0 - t) * 0.55 * (0.5 + n);
        } else if (kind < 2.5) {     // spark
          col = mix(vec3(4.0, 3.2, 1.8), vec3(3.0, 0.9, 0.2), t);
          a = smoothstep(1.0, 0.0, r) * (1.0 - t);
        } else if (kind < 3.5) {     // dust
          float lit = 0.5 + 0.5 * clamp(0.6 - c.y * 0.5 + (n - 0.5), 0.0, 1.0);
          col = vec3(0.42, 0.34, 0.25) * lit;
          a = soft * smoothstep(0.0, 0.1, t) * (1.0 - t) * 0.5 * (0.5 + n);
        } else {                     // ember: flickering orange point
          float fl = 0.6 + 0.4 * sin(uTime * 30.0 + seed * 50.0);
          col = vec3(3.2, 1.0, 0.2) * fl;
          a = smoothstep(1.0, 0.0, r) * (1.0 - t);
        }
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let count = 0;
  return {
    points,
    emit(p, v, { kind, life: l = 1, size = 1, grow: gr = 1, drag: dr = 0.5, buoy: by = 0 }) {
      if (count >= capacity) return;
      const i = count++;
      pos.set([p.x, p.y, p.z], i * 3);
      vel.set([v.x, v.y, v.z], i * 3);
      data.set([0, size, kind, Math.random()], i * 4);
      life[i] = l; age[i] = 0; grow[i] = gr; drag[i] = dr; buoy[i] = by;
    },
    update(dt, gravity = 9.8) {
      let w = 0;
      for (let i = 0; i < count; i++) {
        age[i] += dt;
        if (age[i] >= life[i]) continue;
        const k = Math.exp(-drag[i] * dt);
        vel[i * 3] *= k; vel[i * 3 + 2] *= k;
        vel[i * 3 + 1] = vel[i * 3 + 1] * k + (buoy[i] - (data[i * 4 + 2] === P_SPARK || data[i * 4 + 2] === P_EMBER ? gravity : 0)) * dt;
        const t = age[i] / life[i];
        if (w !== i) {
          pos[w * 3] = pos[i * 3]; pos[w * 3 + 1] = pos[i * 3 + 1]; pos[w * 3 + 2] = pos[i * 3 + 2];
          vel[w * 3] = vel[i * 3]; vel[w * 3 + 1] = vel[i * 3 + 1]; vel[w * 3 + 2] = vel[i * 3 + 2];
          data[w * 4 + 1] = data[i * 4 + 1]; data[w * 4 + 2] = data[i * 4 + 2]; data[w * 4 + 3] = data[i * 4 + 3];
          life[w] = life[i]; age[w] = age[i]; grow[w] = grow[i]; drag[w] = drag[i]; buoy[w] = buoy[i];
        }
        pos[w * 3] += vel[w * 3] * dt; pos[w * 3 + 1] += vel[w * 3 + 1] * dt; pos[w * 3 + 2] += vel[w * 3 + 2] * dt;
        data[w * 4] = t;
        data[w * 4 + 1] *= 1 + (grow[w] - 1) * dt / Math.max(life[w], 0.01);
        w++;
      }
      count = w;
      geo.setDrawRange(0, count);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aData.needsUpdate = true;
      return count;
    },
    get count() { return count; },
    setScale(px) { mat.uniforms.uScale.value = px; },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

// ---------------------------------------------------------------------------------------------
// Billowing puff (fireball that cools into smoke), the core of the V2 explosion
// ---------------------------------------------------------------------------------------------

let puffGeo = null;

function puffMaterial(THREE) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: fxTime, uHeat: { value: 1 }, uSmoke: { value: 0 }, uFade: { value: 1 }, uSeed: { value: Math.random() * 100 },
      uSun: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() }, uRoll: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uSeed; uniform float uRoll;
      varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vD;
      ${NOISE}
      void main(){
        vec3 dir = normalize(position);
        // cauliflower billows that roll outward over time
        float d = fxFbm(dir * 2.3 + vec3(0.0, -uRoll, uSeed)) ;
        float d2 = fxN3(dir * 6.0 + vec3(uSeed, uRoll * 1.7, 0.0));
        vec3 p = dir * (0.78 + 0.45 * d + 0.12 * d2);
        vD = d;
        vP = dir;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normalize(dir + (d - 0.5) * 0.8));
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uHeat; uniform float uSmoke; uniform float uFade; uniform float uSeed; uniform vec3 uSun; uniform float uRoll;
      varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vD;
      ${NOISE}
      void main(){
        float facing = abs(dot(normalize(vN), normalize(vV)));
        float n = fxFbm(vP * 4.0 + vec3(uSeed, -uRoll * 2.0, uTime * 0.2));
        // hot interior seen through the middle, cooler crust and soot at the edges
        float heat = clamp(uHeat * (0.55 + 0.75 * facing) + (n - 0.5) * 0.45 - (1.0 - vD) * 0.25, 0.0, 1.0);
        vec3 fire = fxHeat(heat) * (0.6 + 4.2 * heat * heat);
        // self-shadowed smoke: lit side vs shadow side, with soot pockets
        float lit = clamp(dot(normalize(vP), uSun) * 0.5 + 0.5, 0.0, 1.0);
        vec3 smoke = mix(vec3(0.03, 0.028, 0.026), vec3(0.24, 0.22, 0.2), lit * (0.6 + 0.6 * n));
        float burn = smoothstep(0.05, 0.4, heat) * (1.0 - uSmoke);
        vec3 col = mix(smoke, fire, burn);
        // soft, wispy silhouette
        float edge = smoothstep(0.08, 0.75 + 0.2 * n, facing);
        edge *= smoothstep(0.25, 0.55, n + facing * 0.35);  // ragged, wispy silhouette
        float a = edge * uFade * mix(0.95, 0.62, uSmoke) * (0.7 + 0.4 * n);
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true, depthWrite: false,
  });
}

function makePuff(THREE) {
  if (!puffGeo) puffGeo = new THREE.IcosahedronGeometry(1, 4);
  const m = new THREE.Mesh(puffGeo, puffMaterial(THREE));
  m.userData.noShadow = true;
  return m;
}

// ---------------------------------------------------------------------------------------------
// Explosion V2
// ---------------------------------------------------------------------------------------------

function ringMaterial(THREE) {
  return new THREE.ShaderMaterial({
    uniforms: { uAge: { value: 0 }, uTime: fxTime },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */ `uniform float uAge; uniform float uTime; varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 c = vUv * 2.0 - 1.0; float r = length(c);
        float ang = atan(c.y, c.x);
        float n = fxN3(vec3(ang * 3.0, r * 4.0, uTime));
        float w = 0.06 + 0.06 * n;
        float band = smoothstep(1.0 - w * 2.0, 1.0 - w, r) * (1.0 - smoothstep(1.0 - w * 0.5, 1.0, r));
        // a bright leading edge with a pale "refracted" wash behind it
        float wash = smoothstep(0.55, 0.98, r) * (1.0 - smoothstep(0.98, 1.0, r)) * 0.18;
        float a = (band * 1.1 + wash) * (1.0 - uAge) * (1.0 - uAge);
        gl_FragColor = vec4(vec3(1.6, 1.45, 1.25) * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

function shellMaterial(THREE) {
  return new THREE.ShaderMaterial({
    uniforms: { uAge: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: /* glsl */ `uniform float uAge; varying vec3 vN; varying vec3 vV;
      void main(){ float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 4.0);
        float a = rim * (1.0 - uAge) * (1.0 - uAge) * 0.9; gl_FragColor = vec4(vec3(1.3, 1.25, 1.2) * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

/**
 * Film-style explosion. type 'air' (default), 'ground' (dust skirt, horizontal shock, thrown dirt),
 * 'ship' (spherical shock, secondary pops, burning hull debris). No lights inside: read `flash`.
 */
export function createExplosionV2(THREE, { size = 10, type = 'air', duration } = {}) {
  const ground = type === 'ground', ship = type === 'ship';
  const life = duration ?? (ground ? 7 : 6);
  const obj = new THREE.Group();
  obj.name = `explosionV2-${type}`;
  const flash = { position: new THREE.Vector3(), intensity: 0 };

  // Fireball: one core puff plus billows thrown outward, each cooling from white-hot to soot.
  const puffs = [];
  const nPuffs = ship ? 9 : 7;
  for (let i = 0; i < nPuffs; i++) {
    const m = makePuff(THREE);
    const dir = i === 0 ? new THREE.Vector3(0, 0.2, 0) : new THREE.Vector3().randomDirection();
    if (ground && dir.y < 0) dir.y *= -0.3;
    const speed = i === 0 ? 0 : size * rand(0.9, 1.7);
    puffs.push({ m, v: dir.multiplyScalar(speed), r0: size * (i === 0 ? 0.55 : rand(0.28, 0.45)), r1: size * (i === 0 ? 1.15 : rand(0.6, 0.95)),
      delay: i === 0 ? 0 : rand(0, 0.12), cool: rand(0.55, 0.85), rise: size * rand(0.25, 0.45) });
    obj.add(m);
  }
  // Secondary pops (ship): small fireballs after a delay
  const pops = [];
  if (ship) {
    for (let i = 0; i < 3; i++) {
      const m = makePuff(THREE);
      m.visible = false;
      pops.push({ m, at: rand(0.35, 1.2), p: new THREE.Vector3().randomDirection().multiplyScalar(size * rand(0.6, 1.2)), r: size * rand(0.3, 0.5) });
      obj.add(m);
    }
  }
  // Shock: ring (billboard in air, flat on the ground) or a spherical shell for ships
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ringMaterial(THREE));
  if (ground) ring.rotation.x = -Math.PI / 2;
  obj.add(ring);
  let shell = null;
  if (ship) {
    shell = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), shellMaterial(THREE));
    obj.add(shell);
  }
  // Particles: fire/smoke trails and dust (normal blend), sparks/embers (additive)
  const soft = particlePool(THREE, 1400);
  const glow = particlePool(THREE, 900, { additive: true });
  obj.add(soft.points, glow.points);
  // Debris chunks with fire trails
  const nDebris = ship ? 26 : ground ? 22 : 16;
  const chunkGeo = new THREE.TetrahedronGeometry(1, 0);
  const chunkMat = new THREE.MeshStandardMaterial({ color: ship ? 0x5a5d62 : 0x3b3530, roughness: 0.8, metalness: ship ? 0.6 : 0.1, emissive: 0x220800 });
  const chunks = new THREE.InstancedMesh(chunkGeo, chunkMat, nDebris);
  chunks.castShadow = true;
  obj.add(chunks);
  const deb = [];
  for (let i = 0; i < nDebris; i++) {
    const d = new THREE.Vector3().randomDirection();
    if (ground) d.y = Math.abs(d.y) * 1.6 + 0.3;
    deb.push({ p: new THREE.Vector3(), v: d.normalize().multiplyScalar(size * rand(2.2, 5.0)), s: size * rand(0.03, 0.09),
      rot: new THREE.Euler(rand(0, 6), rand(0, 6), 0), w: new THREE.Vector3(rand(-9, 9), rand(-9, 9), rand(-9, 9)),
      burn: Math.random() < (ship ? 0.85 : 0.6) ? rand(1.2, 2.8) : 0, landed: false });
  }
  // Initial bursts
  const v = new THREE.Vector3(), p0 = new THREE.Vector3();
  for (let i = 0; i < 140; i++) glow.emit(p0, v.randomDirection().multiplyScalar(size * rand(3, 9)), { kind: P_SPARK, life: rand(0.4, 1.1), size: size * 0.05, grow: 0.4, drag: 1.4 });
  for (let i = 0; i < 40; i++) glow.emit(p0, v.randomDirection().multiplyScalar(size * rand(1, 3)), { kind: P_EMBER, life: rand(1.5, 3.5), size: size * 0.035, grow: 1, drag: 0.6 });
  for (let i = 0; i < 26; i++) soft.emit(p0, v.randomDirection().multiplyScalar(size * rand(0.8, 2.0)), { kind: P_FIRE, life: rand(0.8, 1.6), size: size * rand(0.5, 0.9), grow: 2.2, drag: 1.6, buoy: size * 0.3 });
  if (ground) {
    for (let i = 0; i < 70; i++) {
      const a = rand(0, Math.PI * 2);
      soft.emit(p0, v.set(Math.cos(a), rand(0.02, 0.18), Math.sin(a)).multiplyScalar(size * rand(2.5, 5.5)),
        { kind: P_DUST, life: rand(2.5, 5.5), size: size * rand(0.5, 1.0), grow: 3.2, drag: 1.3, buoy: size * 0.05 });
    }
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  let age = 0;
  const px = 600;
  return {
    object: obj, flash, type,
    update(dt, camera) {
      age += dt;
      const t = age / life;
      if (camera) {
        const h = camera.isPerspectiveCamera ? (window.innerHeight || 800) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) : 600;
        soft.setScale(h); glow.setScale(h);
        if (!ground) ring.quaternion.copy(camera.quaternion);
      } else { soft.setScale(px); glow.setScale(px); }
      // fireball puffs: expand with drag, rise, cool, then thin out as smoke
      for (const pf of puffs) {
        const a = Math.max(0, age - pf.delay);
        const e = 1 - Math.exp(-a * 3.2);
        pf.m.position.copy(pf.v).multiplyScalar(e * 0.55);
        pf.m.position.y += pf.rise * Math.max(0, a - 0.4) * 0.6;
        const r = pf.r0 + (pf.r1 - pf.r0) * e + size * 0.18 * Math.max(0, a - 1.0);
        pf.m.scale.setScalar(r);
        const U = pf.m.material.uniforms;
        U.uHeat.value = Math.max(0, 1.15 - a / pf.cool);
        U.uSmoke.value = Math.min(1, Math.max(0, (a - pf.cool * 0.9) / 1.4));
        U.uFade.value = Math.max(0, 1 - Math.max(0, a - life * 0.45) / (life * 0.55));
        U.uRoll.value = a * 0.35;
        pf.m.visible = U.uFade.value > 0.002 && a > 0;
      }
      for (const pp of pops) {
        const a = age - pp.at;
        if (a < 0) continue;
        if (!pp.m.visible && a < 0.1) {
          pp.m.visible = true;
          for (let i = 0; i < 30; i++) glow.emit(pp.p, v.randomDirection().multiplyScalar(size * rand(2, 5)), { kind: P_SPARK, life: rand(0.3, 0.7), size: size * 0.04, drag: 1.5 });
        }
        const e = 1 - Math.exp(-a * 5);
        pp.m.position.copy(pp.p);
        pp.m.scale.setScalar(pp.r * (0.3 + 0.9 * e));
        const U = pp.m.material.uniforms;
        U.uHeat.value = Math.max(0, 1.1 - a / 0.5);
        U.uSmoke.value = Math.min(1, Math.max(0, (a - 0.45) / 1.2));
        U.uFade.value = Math.max(0, 1 - Math.max(0, a - 1.5) / 2.5);
        U.uRoll.value = a * 0.5;
        pp.m.visible = U.uFade.value > 0.002;
      }
      // shock ring / shell
      const st = Math.min(1, age / (ship ? 0.6 : 0.9));
      ring.material.uniforms.uAge.value = st;
      ring.scale.setScalar(size * (0.3 + (ground ? 6.0 : 4.2) * Math.sqrt(st)));
      ring.visible = st < 1;
      if (shell) {
        const s2 = Math.min(1, age / 0.45);
        shell.material.uniforms.uAge.value = s2;
        shell.scale.setScalar(size * (0.4 + 3.6 * s2));
        shell.visible = s2 < 1;
      }
      // debris with fire/smoke trails
      for (let i = 0; i < nDebris; i++) {
        const d = deb[i];
        if (!d.landed) {
          d.v.y -= 9.8 * dt;
          d.v.multiplyScalar(Math.exp(-0.15 * dt));
          d.p.addScaledVector(d.v, dt);
          d.rot.x += d.w.x * dt; d.rot.y += d.w.y * dt; d.rot.z += d.w.z * dt;
          if (ground && d.p.y < 0) { d.p.y = 0; d.landed = true; }
          if (d.burn > age && Math.random() < 0.9) {
            soft.emit(d.p, v.set(rand(-0.3, 0.3), rand(0, 0.5), rand(-0.3, 0.3)), { kind: age < d.burn * 0.6 ? P_FIRE : P_SMOKE, life: rand(0.5, 1.2), size: d.s * 4.5, grow: 2.6, drag: 2, buoy: 1 });
            if (Math.random() < 0.3) glow.emit(d.p, v.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)), { kind: P_EMBER, life: rand(0.3, 0.8), size: size * 0.02, drag: 2 });
          }
        }
        q.setFromEuler(d.rot);
        sc.setScalar(d.s);
        chunks.setMatrixAt(i, m4.compose(d.p, q, sc));
      }
      chunks.instanceMatrix.needsUpdate = true;
      // lingering smoke column
      if (age > 0.4 && age < life * 0.55 && Math.random() < 0.6) {
        soft.emit(p0.set(rand(-0.3, 0.3) * size, size * rand(0.2, 0.6), rand(-0.3, 0.3) * size),
          v.set(rand(-0.4, 0.4), rand(0.8, 1.6), rand(-0.4, 0.4)).multiplyScalar(size * 0.35),
          { kind: P_SMOKE, life: rand(2.5, 4.5), size: size * rand(0.7, 1.2), grow: 2.4, drag: 0.4, buoy: size * 0.05 });
      }
      soft.update(dt);
      glow.update(dt);
      // flash for the game's one persistent light: sharp peak, quick decay, flicker while hot
      obj.getWorldPosition(flash.position);
      flash.position.y += size * 0.4;
      const hot = Math.max(0, 1 - age / 0.9);
      flash.intensity = size * size * 4 * (Math.exp(-age * 9) * 3 + hot * hot * (0.7 + 0.3 * Math.random()));
      return age < life || soft.count > 0;
    },
    dispose() {
      soft.dispose(); glow.dispose();
      obj.traverse((o) => { if (o.material && o.geometry !== puffGeo) { o.geometry?.dispose(); } if (o.material) o.material.dispose(); });
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Engine flame V2 (no transmission)
// ---------------------------------------------------------------------------------------------

function plumeMaterial(THREE, { tint, abTint, layer }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: fxTime, uTint: { value: new THREE.Vector3(...tint) }, uAB: { value: new THREE.Vector3(...abTint) },
      uThrottle: { value: 0.8 }, uBoost: { value: 0 }, uSeed: { value: Math.random() * 10 }, uLayer: { value: layer },
    },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uSeed; uniform float uBoost;
      varying float vAlong; varying vec3 vN; varying vec3 vV; varying vec3 vAxis; varying float vAng;
      ${NOISE}
      void main(){
        vAlong = uv.y; vAng = uv.x;
        vec3 p = position;
        float n = fxN3(vec3(uv.x * 6.0 + uSeed, uv.y * 5.0 - uTime * 11.0, uSeed));
        p.xy *= 1.0 + (n - 0.5) * (0.25 + 0.25 * uBoost) * uv.y;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        vAxis = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uTint; uniform vec3 uAB; uniform float uThrottle; uniform float uBoost; uniform float uSeed; uniform float uLayer;
      varying float vAlong; varying vec3 vN; varying vec3 vV; varying vec3 vAxis; varying float vAng;
      ${NOISE}
      void main(){
        float axial = abs(dot(normalize(vV), normalize(vAxis)));
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.3);
        float x = vAlong;
        // temperature falls along the plume; afterburner keeps it hotter and longer
        float temp = clamp((1.0 - x) * (0.75 + 0.5 * uThrottle) + uBoost * 0.25, 0.0, 1.0);
        // shock diamonds: bright nodes at fixed spacing, stronger with throttle/afterburner
        float spacing = mix(7.0, 5.0, uBoost);
        float node = pow(0.5 + 0.5 * cos(x * 6.2831 * spacing - uTime * 0.0), 6.0) * smoothstep(0.85, 0.05, x);
        float diamonds = node * (0.4 + 0.8 * uThrottle + 0.8 * uBoost);
        float flick = 0.82 + 0.3 * fxN3(vec3(uTime * 16.0, x * 7.0, uSeed));
        vec3 base = mix(uTint, uAB, uBoost);
        vec3 col;
        float a;
        if (uLayer < 0.5) {          // core: thin white-hot spike with diamonds
          col = mix(base, vec3(1.0, 0.97, 0.92), smoothstep(0.35, 0.85, temp)) * (2.4 + 4.0 * diamonds);
          a = pow(1.0 - x, 2.2) * edge * flick;
        } else if (uLayer < 1.5) {   // mid plume: heat gradient
          vec3 heatCol = mix(base * 0.6, base, smoothstep(0.2, 0.7, temp));
          heatCol = mix(heatCol, vec3(1.0, 0.85, 0.65), smoothstep(0.75, 1.0, temp) * 0.6);
          col = heatCol * (1.3 + 2.0 * diamonds);
          a = pow(1.0 - x, 1.4) * edge * flick * 0.8;
        } else {                     // afterglow: faint wide tail, mostly in afterburner
          col = mix(base, uAB, 0.5) * 1.2;
          a = pow(1.0 - x, 1.1) * edge * (0.12 + 0.35 * uBoost) * flick;
        }
        a *= (1.0 - 0.65 * axial) * clamp(uThrottle * 1.4, 0.0, 1.0);
        gl_FragColor = vec4(col * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

function coneAlongZ(THREE, radius, length, radial = 24, rings = 12) {
  const g = new THREE.ConeGeometry(radius, length, radial, rings, true);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, length / 2);
  return g; // base at z=0 (uv.y=0), apex at +length (uv.y=1)
}

/**
 * Engine flame V2. Base at the origin, plume along +Z. Returns
 * { object, ring, setState({ throttle 0..1.6, afterburner: bool }), update(dt) }.
 * Scale object.scale.z yourself if you prefer, but setState already lengthens the plume with throttle.
 */
export function createEngineFlameV2(THREE, { radius = 0.7, length = 7, tint = [0.55, 0.75, 1.0], abTint = [1.0, 0.45, 0.62], haze = true } = {}) {
  const grp = new THREE.Group();
  grp.name = 'engineFlameV2';
  const layers = [
    { m: plumeMaterial(THREE, { tint, abTint, layer: 0 }), r: radius * 0.42, l: length * 0.55 },
    { m: plumeMaterial(THREE, { tint, abTint, layer: 1 }), r: radius * 0.92, l: length },
    { m: plumeMaterial(THREE, { tint, abTint, layer: 2 }), r: radius * 1.35, l: length * 1.5 },
  ];
  const plume = new THREE.Group();
  layers.forEach((L, i) => {
    const mesh = new THREE.Mesh(coneAlongZ(THREE, L.r, L.l), L.m);
    mesh.renderOrder = 10 + i;
    mesh.userData.noShadow = true;
    plume.add(mesh);
  });
  grp.add(plume);
  // Nozzle heat ring: glows dull red -> orange -> white with temperature (lags throttle)
  const ringMat = new THREE.ShaderMaterial({
    uniforms: { uTemp: { value: 0.3 }, uTime: fxTime },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */ `uniform float uTemp; uniform float uTime; varying vec2 vUv;
      ${NOISE}
      void main(){ float n = 0.85 + 0.15 * fxN3(vec3(vUv.x * 30.0, uTime * 2.0, 0.0));
        float t = uTemp * n; vec3 c = fxHeat(t) * (0.15 + 3.0 * t * t);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.02, radius * 0.07, 8, 40), ringMat);
  ring.position.z = -0.02;
  grp.add(ring);
  // Hot exit disc (looking into the nozzle)
  const discMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.95, 32), discMat);
  disc.position.z = -0.05;
  disc.userData.noShadow = true;
  grp.add(disc);
  // Cheap heat haze: a faint, wavering grey-clear sheath that breaks up what's behind it
  let hazeMesh = null;
  if (haze) {
    const hm = new THREE.ShaderMaterial({
      uniforms: { uTime: fxTime, uThrottle: { value: 0.8 } },
      vertexShader: /* glsl */ `uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        ${NOISE}
        void main(){ vUv = uv; vec3 p = position;
          p.xy *= 1.0 + (fxN3(vec3(uv.x * 8.0, uv.y * 6.0 - uTime * 6.0, 0.0)) - 0.5) * 0.35;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `uniform float uTime; uniform float uThrottle; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        ${NOISE}
        void main(){ float n = fxFbm(vec3(vUv.x * 10.0, vUv.y * 8.0 - uTime * 4.0, 1.0));
          float bands = smoothstep(0.45, 0.6, n) - smoothstep(0.6, 0.75, n);
          float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.0);
          float a = bands * edge * (1.0 - vUv.y) * 0.09 * uThrottle;
          gl_FragColor = vec4(vec3(0.85, 0.88, 0.9), a); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    hazeMesh = new THREE.Mesh(coneAlongZ(THREE, radius * 1.8, length * 1.3, 16, 6), hm);
    hazeMesh.userData.noShadow = true;
    hazeMesh.renderOrder = 9;
    grp.add(hazeMesh);
  }
  let throttle = 0.8, boost = 0, boostTarget = 0, temp = 0.4;
  const ctrl = {
    object: grp, ring,
    setState({ throttle: th = throttle, afterburner = boostTarget > 0.5 } = {}) {
      throttle = Math.max(0, Math.min(1.6, th));
      boostTarget = afterburner ? 1 : 0;
    },
    update(dt) {
      boost += (boostTarget - boost) * Math.min(1, dt * 6);
      const tTarget = Math.min(1, 0.15 + throttle * 0.55 + boost * 0.35);
      temp += (tTarget - temp) * Math.min(1, dt * (tTarget > temp ? 1.2 : 0.35)); // metal heats faster than it cools
      for (const L of layers) { L.m.uniforms.uThrottle.value = throttle; L.m.uniforms.uBoost.value = boost; }
      plume.scale.set(1 + boost * 0.15, 1 + boost * 0.15, Math.max(0.001, 0.35 + throttle * 0.55 + boost * 0.7));
      plume.visible = throttle > 0.01;
      ringMat.uniforms.uTemp.value = temp;
      discMat.color.setRGB(...(boostTarget ? [3.0, 1.6, 1.4] : [2.0, 2.2, 2.6])).multiplyScalar(0.25 + throttle * 0.6);
      if (hazeMesh) { hazeMesh.material.uniforms.uThrottle.value = throttle; hazeMesh.scale.z = 0.5 + throttle * 0.6; }
    },
  };
  return ctrl;
}

/**
 * Replace a kessel-assets ship's flames with V2 flames in place (same parent, position, orientation and
 * size). Afterwards ship.flames holds the V2 groups, ship.engines their controllers, and
 * ship.setEngine({ throttle, afterburner }) / ship.updateEngines(dt) drive them all.
 */
export function upgradeShipFlames(THREE, ship, { haze = true, abTint } = {}) {
  const engines = [];
  ship.flames = ship.flames.map((old) => {
    const cone = old.children?.find((c) => c.geometry?.parameters?.radius) || old;
    const prm = cone.geometry?.parameters || { radius: 0.7, height: 7 };
    const ctl = createEngineFlameV2(THREE, { radius: prm.radius, length: prm.height, tint: ship.flameTint || [0.55, 0.75, 1.0], abTint, haze });
    ctl.object.position.copy(old.position);
    ctl.object.quaternion.copy(old.quaternion);
    old.parent?.add(ctl.object);
    old.parent?.remove(old);
    engines.push(ctl);
    return ctl.object;
  });
  ship.engines = engines;
  ship.setEngine = (state) => engines.forEach((e) => e.setState(state));
  ship.updateEngines = (dt) => engines.forEach((e) => e.update(dt));
  return engines;
}

// ---------------------------------------------------------------------------------------------
// Audio (Web Audio API only, all synthesized)
// ---------------------------------------------------------------------------------------------

const noiseCache = new WeakMap();

function noiseBuffers(ctx) {
  if (noiseCache.has(ctx)) return noiseCache.get(ctx);
  const len = ctx.sampleRate * 3;
  const white = ctx.createBuffer(2, len, ctx.sampleRate);
  const brown = ctx.createBuffer(2, len, ctx.sampleRate);
  const pink = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const w = white.getChannelData(ch), b = brown.getChannelData(ch), p = pink.getChannelData(ch);
    let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const x = Math.random() * 2 - 1;
      w[i] = x;
      last = (last + 0.02 * x) / 1.02;
      b[i] = last * 3.5;
      b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852;
      b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
      p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11; b6 = x * 0.115926;
    }
  }
  const bufs = { white, brown, pink };
  noiseCache.set(ctx, bufs);
  return bufs;
}

function loopNoise(ctx, buffer, rate = 1) {
  const s = ctx.createBufferSource();
  s.buffer = buffer; s.loop = true; s.playbackRate.value = rate;
  s.loopStart = Math.random() * 1.5; s.start(0, Math.random() * 2);
  return s;
}

function softClip(ctx, amount = 2) {
  const ws = ctx.createWaveShaper();
  const n = 1024, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * amount) / Math.tanh(amount); }
  ws.curve = curve; ws.oversample = '2x';
  return ws;
}

/**
 * A jet/turbine engine. setState({ rpm 0..1.6, boost (afterburner) bool|0..1, cruise bool, damage 0..1 }).
 * RPM spools with lag (up ~1.8 s, down ~2.6 s). Returns { setState, stop, output, rpm() }.
 */
export function createEngineAudio(ctx, destination = ctx.destination, { style = 'jet' } = {}) {
  if (style === 'rumble') return createEngineAudioRumble(ctx, destination);
  const N = noiseBuffers(ctx);
  const out = ctx.createGain(); out.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.2;
  out.connect(comp).connect(destination);
  out.gain.setTargetAtTime(0.9, ctx.currentTime, 0.3);
  const nodes = [];
  const track = (n) => { nodes.push(n); return n; };

  // 1) Turbine whine: fundamental + inharmonic partials, slight vibrato
  const whineBus = ctx.createGain(); whineBus.gain.value = 0;
  const whineFilter = ctx.createBiquadFilter(); whineFilter.type = 'bandpass'; whineFilter.Q.value = 1.4;
  whineBus.connect(whineFilter).connect(out);
  const partials = [1, 1.51, 2.02, 3.1].map((m, i) => {
    const o = track(ctx.createOscillator()); o.type = i === 0 ? 'sine' : 'triangle';
    const g = ctx.createGain(); g.gain.value = [0.5, 0.22, 0.14, 0.05][i];
    o.connect(g).connect(whineBus); o.start(); return { o, m };
  });
  const vib = track(ctx.createOscillator()); vib.frequency.value = 5.3; const vibG = ctx.createGain(); vibG.gain.value = 6;
  vib.connect(vibG); partials.forEach((p) => vibG.connect(p.o.detune)); vib.start();

  // 2) Compressor / airflow rush: white noise bandpass sweeping with rpm
  const rush = track(loopNoise(ctx, N.white));
  const rushF = ctx.createBiquadFilter(); rushF.type = 'bandpass'; rushF.Q.value = 0.9;
  const rushG = ctx.createGain(); rushG.gain.value = 0;
  rush.connect(rushF).connect(rushG).connect(out);

  // 3) Combustion roar: brown noise through a moving lowpass + soft saturation
  const roar = track(loopNoise(ctx, N.brown));
  const roarF = ctx.createBiquadFilter(); roarF.type = 'lowpass'; roarF.Q.value = 0.7;
  const roarSat = softClip(ctx, 2.5);
  const roarG = ctx.createGain(); roarG.gain.value = 0;
  roar.connect(roarF).connect(roarSat).connect(roarG).connect(out);

  // 4) Sub rumble: sine + low brown noise
  const sub = track(ctx.createOscillator()); sub.type = 'sine';
  const subG = ctx.createGain(); subG.gain.value = 0; sub.connect(subG).connect(out); sub.start();
  const rumble = track(loopNoise(ctx, N.brown, 0.6));
  const rumbleF = ctx.createBiquadFilter(); rumbleF.type = 'lowpass'; rumbleF.frequency.value = 110;
  const rumbleG = ctx.createGain(); rumbleG.gain.value = 0;
  rumble.connect(rumbleF).connect(rumbleG).connect(out);

  // 5) Afterburner: wide low roar + crackle (scheduled bursts)
  const ab = track(loopNoise(ctx, N.pink));
  const abF = ctx.createBiquadFilter(); abF.type = 'lowpass'; abF.frequency.value = 700;
  const abF2 = ctx.createBiquadFilter(); abF2.type = 'peaking'; abF2.frequency.value = 140; abF2.gain.value = 9;
  const abG = ctx.createGain(); abG.gain.value = 0;
  ab.connect(abF).connect(abF2).connect(abG).connect(out);
  const crackleBus = ctx.createGain(); crackleBus.gain.value = 0.6;
  const crackleF = ctx.createBiquadFilter(); crackleF.type = 'highpass'; crackleF.frequency.value = 900;
  crackleBus.connect(crackleF).connect(out);

  // 6) Cruise drone: two detuned saws, lowpassed, slow beat
  const droneG = ctx.createGain(); droneG.gain.value = 0;
  const droneF = ctx.createBiquadFilter(); droneF.type = 'lowpass'; droneF.frequency.value = 320; droneF.Q.value = 3;
  droneG.connect(droneF).connect(out);
  const drones = [0, 7].map((det) => { const o = track(ctx.createOscillator()); o.type = 'sawtooth'; o.detune.value = det; o.connect(droneG); o.start(); return o; });
  const droneLfo = track(ctx.createOscillator()); droneLfo.frequency.value = 0.23; const droneLfoG = ctx.createGain(); droneLfoG.gain.value = 90;
  droneLfo.connect(droneLfoG).connect(droneF.frequency); droneLfo.start();

  // 7) Damage: tremolo dips on the whole mix + rattles
  const damageAM = ctx.createGain(); damageAM.gain.value = 1;
  out.disconnect(); out.connect(damageAM).connect(comp);

  let target = { rpm: 0, boost: 0, cruise: 0, damage: 0 };
  let rpm = 0, boost = 0;
  let last = ctx.currentTime;
  const set = (param, v, tc = 0.06) => param.setTargetAtTime(v, ctx.currentTime, tc);
  const burst = (gain, dur, freq) => {
    const s = ctx.createBufferSource(); s.buffer = N.white;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = ctx.createGain(); const t0 = ctx.currentTime + Math.random() * 0.03;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(crackleBus); s.start(t0, Math.random() * 2); s.stop(t0 + dur + 0.05);
  };
  const pop = (gain) => {
    const o = ctx.createOscillator(); o.type = 'sine'; const g = ctx.createGain(); const t0 = ctx.currentTime;
    o.frequency.setValueAtTime(140, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + 0.12);
    g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    o.connect(g).connect(out); o.start(t0); o.stop(t0 + 0.2);
  };
  const tick = () => {
    const now = ctx.currentTime, dt = Math.min(0.2, now - last); last = now;
    const tr = target.rpm;
    rpm += (tr - rpm) * (1 - Math.exp(-dt / (tr > rpm ? 0.9 : 1.3)));
    boost += (target.boost - boost) * (1 - Math.exp(-dt / 0.35));
    const r = Math.max(0, rpm), dmg = target.damage;
    const wob = dmg > 0 ? (Math.random() - 0.5) * dmg * 0.25 : 0;
    const base = 520 + r * 1700 * (1 + wob);
    partials.forEach((p) => set(p.o.frequency, base * p.m, 0.05));
    set(whineFilter.frequency, base * 1.6, 0.08);
    set(whineBus.gain, 0.05 + 0.13 * Math.min(r, 1.2), 0.08);
    set(rushF.frequency, 500 + r * 2600, 0.08);
    set(rushG.gain, 0.03 + 0.16 * r * r, 0.08);
    set(roarF.frequency, 160 + r * 900 + boost * 900, 0.08);
    set(roarG.gain, 0.06 + 0.4 * Math.pow(r, 1.3) + boost * 0.25, 0.08);
    set(sub.frequency, 32 + r * 22, 0.1);
    set(subG.gain, 0.08 + 0.22 * r + boost * 0.25, 0.1);
    set(rumbleG.gain, 0.15 + 0.35 * r + boost * 0.5, 0.1);
    set(abG.gain, boost * 0.75, 0.12);
    set(droneG.gain, target.cruise * (0.04 + 0.05 * r), 0.4);
    drones.forEach((o) => set(o.frequency, 55 + r * 18, 0.2));
    // afterburner crackle and pops
    if (boost > 0.3) {
      const n = Math.floor(Math.random() * 4 * boost);
      for (let i = 0; i < n; i++) burst(0.25 + Math.random() * 0.5, 0.01 + Math.random() * 0.04, 1500 + Math.random() * 5000);
      if (Math.random() < 0.12 * boost) pop(0.35 * boost);
    }
    // damage: sputter dips and rattles
    if (dmg > 0.02) {
      if (Math.random() < dmg * 0.35) {
        const t0 = ctx.currentTime;
        damageAM.gain.cancelScheduledValues(t0);
        damageAM.gain.setTargetAtTime(1 - 0.75 * dmg, t0, 0.02);
        damageAM.gain.setTargetAtTime(1, t0 + 0.06 + Math.random() * 0.12, 0.05);
      }
      if (Math.random() < dmg * 0.5) burst(0.3 * dmg, 0.02, 300 + Math.random() * 900);
    }
  };
  const timer = setInterval(tick, 40);
  return {
    output: out,
    rpm: () => rpm,
    setState({ rpm: rr = target.rpm, boost: b = target.boost, cruise = target.cruise, damage = target.damage } = {}) {
      target = { rpm: Math.max(0, Math.min(1.6, rr)), boost: +b ? Math.min(1, +b) : 0, cruise: cruise ? 1 : 0, damage: Math.max(0, Math.min(1, damage)) };
    },
    stop(fade = 0.4) {
      clearInterval(timer);
      out.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
      setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }); out.disconnect(); damageAM.disconnect(); }, fade * 1000 + 200);
    },
  };
}

/**
 * A layered explosion sound: crack, low thump, body, rolling rumble with terrain echoes, falling debris.
 * size ~0.5 (small hit) .. 3 (capital ship). distance in metres adds delay (343 m/s), dulls highs and
 * lowers volume. Returns the time (ctx clock) when it finishes.
 */
export function playExplosion(ctx, destination = ctx.destination, { size = 1, distance = 0, gain = 1 } = {}) {
  const N = noiseBuffers(ctx);
  const t0 = ctx.currentTime + 0.02 + Math.min(distance / 343, 4);
  const att = gain / (1 + distance / 180);
  const dull = Math.max(350, 16000 / (1 + distance / 60));
  const bus = ctx.createGain(); bus.gain.value = att * 0.82;
  const air = ctx.createBiquadFilter(); air.type = 'lowpass'; air.frequency.value = dull;
  const sat = softClip(ctx, 1.8);
  const headroom = ctx.createGain(); headroom.gain.value = 0.85; // keeps peaks near -1.4 dBFS after the soft clipper
  bus.connect(air).connect(sat).connect(headroom).connect(destination);
  const S = Math.max(0.3, size);
  const end = t0 + 2.5 + S * 2.2;
  const env = (g, a, peak, decay, start = t0) => { g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(peak, start + a); g.gain.exponentialRampToValueAtTime(0.0001, start + a + decay); };

  // crack: a very short bright transient (the supersonic snap)
  { const s = ctx.createBufferSource(); s.buffer = N.white; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800;
    const g = ctx.createGain(); env(g, 0.002, 0.9, 0.09); s.connect(f).connect(g).connect(bus); s.start(t0); s.stop(t0 + 0.2); }
  // thump: pitch-dropping sine with a click
  { const o = ctx.createOscillator(); o.type = 'sine'; const g = ctx.createGain();
    o.frequency.setValueAtTime(120 / Math.sqrt(S), t0); o.frequency.exponentialRampToValueAtTime(26, t0 + 0.55 * S);
    env(g, 0.004, 1.2, 0.7 * S); o.connect(g).connect(bus); o.start(t0); o.stop(t0 + 1.5 * S); }
  // body: noise through a closing lowpass
  { const s = ctx.createBufferSource(); s.buffer = N.pink; const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(3000, t0); f.frequency.exponentialRampToValueAtTime(180, t0 + 1.2 * S);
    const g = ctx.createGain(); env(g, 0.01, 0.9, 1.3 * S); s.connect(f).connect(g).connect(bus); s.start(t0, Math.random()); s.stop(t0 + 2 * S); }
  // rolling rumble: long low brown noise, amplitude rolling, with terrain echoes
  { const s = ctx.createBufferSource(); s.buffer = N.brown; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 140;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.9, t0 + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    const roll = ctx.createOscillator(); roll.frequency.value = 1.6 + Math.random(); const rollG = ctx.createGain(); rollG.gain.value = 0.35;
    roll.connect(rollG).connect(g.gain);
    const echo = ctx.createDelay(2); echo.delayTime.value = 0.35 + Math.random() * 0.4; const fb = ctx.createGain(); fb.gain.value = 0.35;
    const echoF = ctx.createBiquadFilter(); echoF.type = 'lowpass'; echoF.frequency.value = 400;
    s.connect(f).connect(g).connect(bus);
    g.connect(echo).connect(echoF).connect(fb).connect(echo); echoF.connect(bus);
    s.start(t0, Math.random() * 2); s.stop(end); roll.start(t0); roll.stop(end); }
  // debris: scattered crunches and clinks as pieces land
  const pieces = Math.round(10 + 14 * S);
  for (let i = 0; i < pieces; i++) {
    const at = t0 + 0.25 + Math.random() * (1.2 + 1.6 * S);
    const s = ctx.createBufferSource(); s.buffer = N.white; const f = ctx.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.value = 400 + Math.random() * 3500; f.Q.value = 2 + Math.random() * 6;
    const g = ctx.createGain(); env(g, 0.002, 0.08 + Math.random() * 0.18, 0.03 + Math.random() * 0.12, at);
    s.connect(f).connect(g).connect(bus); s.start(at, Math.random() * 2); s.stop(at + 0.3);
  }
  setTimeout(() => bus.disconnect(), (end - ctx.currentTime + 1) * 1000);
  return end;
}


/**
 * Deep "rumble" engine: a big rocket or volcano rather than a jet. Sub-bass (25-60 Hz) with slow,
 * irregular surges, a thick saturated 80-300 Hz roar, and a growl that rises with rpm. Only a faint
 * low-passed hint of whine. Afterburner: thunderous low roar with low crackle and deep thumps.
 * Cruise: a throbbing deep drone. Same API as createEngineAudio.
 */
export function createEngineAudioRumble(ctx, destination = ctx.destination) {
  const N = noiseBuffers(ctx);
  const nodes = [];
  const track = (n) => { nodes.push(n); return n; };
  const out = ctx.createGain(); out.gain.value = 0;
  const damageAM = ctx.createGain(); damageAM.gain.value = 1;
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2400; tone.Q.value = 0.5; // keep it dark
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 5; comp.attack.value = 0.02; comp.release.value = 0.35; comp.knee.value = 12;
  const makeup = ctx.createGain(); makeup.gain.value = 1.4;
  out.connect(damageAM).connect(tone).connect(comp).connect(makeup).connect(destination);
  out.gain.setTargetAtTime(0.9, ctx.currentTime, 0.4);

  // 1) Sub-bass: two sines (fundamental + fifth below an octave) + very low brown noise, surging
  const subG = ctx.createGain(); subG.gain.value = 0; subG.connect(out);
  const sub1 = track(ctx.createOscillator()); sub1.type = 'sine'; sub1.connect(subG); sub1.start();
  const sub2 = track(ctx.createOscillator()); sub2.type = 'sine'; const sub2G = ctx.createGain(); sub2G.gain.value = 0.55;
  sub2.connect(sub2G).connect(subG); sub2.start();
  const subNoise = track(loopNoise(ctx, N.brown, 0.5));
  const subNF = ctx.createBiquadFilter(); subNF.type = 'lowpass'; subNF.frequency.value = 60; subNF.Q.value = 0.9;
  const subNG = ctx.createGain(); subNG.gain.value = 0.9;
  subNoise.connect(subNF).connect(subNG).connect(subG);

  // 2) Low-mid roar: brown noise, resonant around 90-140 Hz, heavily saturated
  const roar = track(loopNoise(ctx, N.brown, 0.8));
  const roarLP = ctx.createBiquadFilter(); roarLP.type = 'lowpass'; roarLP.Q.value = 0.8;
  const roarPeak = ctx.createBiquadFilter(); roarPeak.type = 'peaking'; roarPeak.frequency.value = 110; roarPeak.Q.value = 1.1; roarPeak.gain.value = 10;
  const roarSat = softClip(ctx, 4.5);
  const roarPost = ctx.createBiquadFilter(); roarPost.type = 'lowpass'; roarPost.frequency.value = 420;
  const roarG = ctx.createGain(); roarG.gain.value = 0;
  roar.connect(roarLP).connect(roarPeak).connect(roarSat).connect(roarPost).connect(roarG).connect(out);

  // 3) Growl: detuned low saws, amplitude-burbled, saturated, rising with rpm
  const growlBus = ctx.createGain(); growlBus.gain.value = 0;
  const growlLP = ctx.createBiquadFilter(); growlLP.type = 'lowpass'; growlLP.Q.value = 2.2;
  const growlSat = softClip(ctx, 3);
  const burble = ctx.createGain(); burble.gain.value = 1;
  growlBus.connect(burble).connect(growlLP).connect(growlSat).connect(out);
  const growls = [0, -9, 12].map((det, i) => { const o = track(ctx.createOscillator()); o.type = 'sawtooth'; o.detune.value = det;
    const g = ctx.createGain(); g.gain.value = [0.5, 0.4, 0.18][i]; o.connect(g).connect(growlBus); o.start(); return o; });
  const burbleLfo = track(ctx.createOscillator()); burbleLfo.type = 'triangle'; const burbleDepth = ctx.createGain(); burbleDepth.gain.value = 0.35;
  burbleLfo.connect(burbleDepth).connect(burble.gain); burbleLfo.start();

  // 4) A faint hint of turbine, low-passed hard
  const hint = track(ctx.createOscillator()); hint.type = 'sine';
  const hintLP = ctx.createBiquadFilter(); hintLP.type = 'lowpass'; hintLP.frequency.value = 520;
  const hintG = ctx.createGain(); hintG.gain.value = 0;
  hint.connect(hintLP).connect(hintG).connect(out); hint.start();

  // 5) Afterburner: thunder (brown+pink, low-passed, big 60-80 Hz shelf), low crackle, deep thumps
  const ab = track(loopNoise(ctx, N.pink, 0.7));
  const ab2 = track(loopNoise(ctx, N.brown, 0.6));
  const abLP = ctx.createBiquadFilter(); abLP.type = 'lowpass'; abLP.frequency.value = 380; abLP.Q.value = 0.7;
  const abShelf = ctx.createBiquadFilter(); abShelf.type = 'lowshelf'; abShelf.frequency.value = 90; abShelf.gain.value = 10;
  const abSat = softClip(ctx, 3.5);
  const abG = ctx.createGain(); abG.gain.value = 0;
  ab.connect(abLP); ab2.connect(abLP); abLP.connect(abShelf).connect(abSat).connect(abG).connect(out);
  const crackleBus = ctx.createGain(); crackleBus.gain.value = 0.8;
  const crackleLP = ctx.createBiquadFilter(); crackleLP.type = 'lowpass'; crackleLP.frequency.value = 900;
  crackleBus.connect(crackleLP).connect(out);

  // 6) Cruise: throbbing deep drone
  const droneG = ctx.createGain(); droneG.gain.value = 0;
  const droneLP = ctx.createBiquadFilter(); droneLP.type = 'lowpass'; droneLP.frequency.value = 160; droneLP.Q.value = 1.5;
  const throb = ctx.createGain(); throb.gain.value = 0.7;
  droneG.connect(throb).connect(droneLP).connect(out);
  const drones = [0, 6, -1200].map((det) => { const o = track(ctx.createOscillator()); o.type = 'sawtooth'; o.detune.value = det; o.connect(droneG); o.start(); return o; });
  const throbLfo = track(ctx.createOscillator()); throbLfo.frequency.value = 2.1; const throbDepth = ctx.createGain(); throbDepth.gain.value = 0.3;
  throbLfo.connect(throbDepth).connect(throb.gain); throbLfo.start();

  let target = { rpm: 0, boost: 0, cruise: 0, damage: 0 };
  let rpm = 0, boost = 0, surge = 0, surgeTarget = 0, surgeTimer = 0;
  let last = ctx.currentTime;
  const set = (param, v, tc = 0.08) => param.setTargetAtTime(v, ctx.currentTime, tc);
  const lowBurst = (gain, dur, freq) => {
    const s = ctx.createBufferSource(); s.buffer = N.brown;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9;
    const g = ctx.createGain(); const t0 = ctx.currentTime + Math.random() * 0.04;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(crackleBus); s.start(t0, Math.random() * 2); s.stop(t0 + dur + 0.05);
  };
  const thump = (gain) => {
    const o = ctx.createOscillator(); o.type = 'sine'; const g = ctx.createGain(); const t0 = ctx.currentTime;
    o.frequency.setValueAtTime(75, t0); o.frequency.exponentialRampToValueAtTime(28, t0 + 0.25);
    g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    o.connect(g).connect(out); o.start(t0); o.stop(t0 + 0.4);
  };
  const tick = () => {
    const now = ctx.currentTime, dt = Math.min(0.2, now - last); last = now;
    rpm += (target.rpm - rpm) * (1 - Math.exp(-dt / (target.rpm > rpm ? 1.1 : 1.6)));   // heavy spool
    boost += (target.boost - boost) * (1 - Math.exp(-dt / 0.45));
    // slow, irregular surges: a new random target every 0.4-1.6 s, eased toward
    surgeTimer -= dt;
    if (surgeTimer <= 0) { surgeTarget = Math.random() * Math.random(); surgeTimer = 0.4 + Math.random() * 1.2; }
    surge += (surgeTarget - surge) * (1 - Math.exp(-dt / 0.5));
    const r = Math.max(0, rpm), dmg = target.damage;
    const wob = dmg > 0 ? (Math.random() - 0.5) * dmg * 0.2 : 0;
    const f0 = (26 + r * 22) * (1 + wob);
    set(sub1.frequency, f0, 0.15); set(sub2.frequency, f0 * 0.75, 0.15);
    set(subG.gain, (0.35 + 0.35 * r + boost * 0.3) * (0.75 + 0.5 * surge), 0.12);
    set(roarLP.frequency, 160 + r * 230 + boost * 160 + surge * 60, 0.1);
    set(roarG.gain, (0.12 + 0.55 * Math.pow(r, 1.2) + boost * 0.35) * (0.85 + 0.3 * surge), 0.1);
    growls.forEach((o) => set(o.frequency, 38 + r * 46, 0.12));
    set(growlLP.frequency, 140 + r * 260 + boost * 120, 0.1);
    set(growlBus.gain, 0.05 + 0.22 * r, 0.1);
    set(burbleLfo.frequency, 5 + r * 7 + surge * 2, 0.2);
    set(hint.frequency, 300 + r * 260, 0.1);
    set(hintG.gain, 0.012 * Math.min(r, 1), 0.2);
    set(abG.gain, boost * 0.95, 0.15);
    set(droneG.gain, target.cruise * (0.08 + 0.06 * r), 0.5);
    drones.forEach((o) => set(o.frequency, 36 + r * 10, 0.3));
    if (boost > 0.3) {
      const n = Math.floor(Math.random() * 3 * boost);
      for (let i = 0; i < n; i++) lowBurst(0.4 + Math.random() * 0.5, 0.03 + Math.random() * 0.07, 120 + Math.random() * 500);
      if (Math.random() < 0.1 * boost) thump(0.55 * boost);
    }
    if (dmg > 0.02) {
      if (Math.random() < dmg * 0.3) {
        const t0 = ctx.currentTime;
        damageAM.gain.cancelScheduledValues(t0);
        damageAM.gain.setTargetAtTime(1 - 0.7 * dmg, t0, 0.03);
        damageAM.gain.setTargetAtTime(1, t0 + 0.08 + Math.random() * 0.15, 0.06);
      }
      if (Math.random() < dmg * 0.4) lowBurst(0.35 * dmg, 0.04, 200 + Math.random() * 400);
    }
  };
  const timer = setInterval(tick, 40);
  return {
    output: out,
    style: 'rumble',
    rpm: () => rpm,
    setState({ rpm: rr = target.rpm, boost: b = target.boost, cruise = target.cruise, damage = target.damage } = {}) {
      target = { rpm: Math.max(0, Math.min(1.6, rr)), boost: +b ? Math.min(1, +b) : 0, cruise: cruise ? 1 : 0, damage: Math.max(0, Math.min(1, damage)) };
    },
    stop(fade = 0.5) {
      clearInterval(timer);
      out.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
      setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }); damageAM.disconnect(); makeup.disconnect(); }, fade * 1000 + 250);
    },
  };
}
