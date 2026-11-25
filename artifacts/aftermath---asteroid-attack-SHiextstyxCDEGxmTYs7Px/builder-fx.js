/*  builder-fx.js 2.1 — procedural graphics kit for "Chip Away" (three.js r128, UMD global THREE).
 *
 *  Everything is generated in code: geometry, shaders and canvas/data textures. No images, models,
 *  fonts or fetches. Colours are LINEAR; glowing parts use values above 1 so UnrealBloomPass picks them up.
 *  2.0 is backward compatible with 1.0: same functions, same userData API.
 *
 *  Quick start
 *    BuilderFX.applyEnvironment(renderer, scene);   // reflections for the metal (once)
 *    scene.add(BuilderFX.makeLights());             // key sun + rim + fill, matching the backdrop
 *    scene.add(BuilderFX.makeSpaceBackdrop());      // camera.far must be > 2400
 *    const ship = BuilderFX.makeShip({ guns: 4 }); scene.add(ship);
 *    ...each frame:  BuilderFX.update(dt, t);       // ticks every live effect AND every kit object in a scene
 *
 *  Objects
 *    makeShip({guns:3|4|5})      hero-detail fighter; V2 engine flames (white-hot core, shock diamonds,
 *                                heat shimmer, afterburner above thrust 1.15)
 *                                userData.gunTips[], setGunColor(i, Color|null), fireGun(i), setThrust(0..1.5), engines[]
 *    makeDrone()                 userData.setCargo(Color|null), fire(), cargoAnchor (Object3D)
 *    makeExplodingPlanet({radius})  userData.setCrack(0..1), detonate(), reset(), core, debris, state
 *                                2.0: Kessel Run fireball (billowing puffs cooling into smoke), spark burst,
 *                                burning debris trails, lingering smoke, molten core and drifting rock field
 *    makeIsland({radius 6-12, seed, biome:'rock'|'grass'|'ice'|'lava'|'crystal'})
 *                                floating asteroid island, flat-ish centre at y = 0, < 20k triangles
 *                                userData.heightAt(x, z), radius, biome, triangles
 *    makeDistantPlanet({seed, radius=60, type:'gas'|'rocky'|'ice', ring})   background planet/moon
 *    makeAsteroidBelt({count=2400, inner=40, outer=375, clearInner=120, clearOuter=215, thickness, heroes=6, seed, orbitSpeed})
 *                                instanced rocks (GPU tumble, no per-frame CPU) + big hero asteroids; the clear ring stays empty
 *    makeSpaceBackdrop()         userData.sunDirection (Vector3)
 *    makeLights()                Group of lights matching the backdrop's sun
 *    makeEngineFlame({radius, length, tint, abTint})  standalone V2 flame: userData.setState({throttle, afterburner}), update(dt)
 *  Effects (self-removing):  e = makeX(...); scene.add(e); e.userData.play(fromVec3, toVec3)
 *    makeTracer(color)           laser bolt (white-hot core, soft glow, flicker, muzzle spark)   userData.onArrive = fn
 *    makeImpact(color)           streak sparks, hot cube fragments, fire/smoke puff, flash, ring
 *    makeHammerShot()            heavy slug; spawns makeHammerImpact() on arrival   userData.onImpact = fn
 *    makeHammerImpact()          shockwave burst at `to`
 *    makePurgeBeam(color)        beam; `to` may be one Vector3 or an array it sweeps through
 *  Cubes
 *    makeCubeMaterial()          MeshStandardMaterial for beveled voxels (InstancedMesh + setColorAt)
 *    roundedBoxGeometry(size=1, radius=0.12, segments=3)
 *
 *  Particle sizes adapt to the camera automatically (onBeforeRender), and engine glows fade when the
 *  camera is close, so a camera right behind the ship isn't blinded.
 */
(function () {
  "use strict";
  if (typeof THREE === "undefined") throw new Error("builder-fx.js needs three.js r128 (global THREE) loaded first");

  var V3 = THREE.Vector3, C = THREE.Color;
  var live = new Set();           // everything that animates: effects and objects
  var UP = new V3(0, 1, 0);

  function rng(seed) {            // small deterministic PRNG (mulberry32)
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function col(c) { return c instanceof C ? c.clone() : new C(c); }
  function scaled(c, k) { return col(c).multiplyScalar(k); }

  // An object made by the kit animates while it's in a scene; BuilderFX.update ticks it.
  function track(obj) {
    live.add(obj);
    obj.userData.dispose = function () { live.delete(obj); disposeTree(obj); };
    return obj;
  }
  function inScene(o) { while (o.parent) o = o.parent; return o.isScene === true; }
  function disposeTree(root) {
    root.traverse(function (o) {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      var m = o.material;
      (Array.isArray(m) ? m : m ? [m] : []).forEach(function (mm) { if (!mm.userData.shared) mm.dispose(); });
    });
  }
  function finish(effect) {       // self-removal for one-shot effects
    live.delete(effect);
    if (effect.parent) effect.parent.remove(effect);
    disposeTree(effect);
  }
  function shared(x) { x.userData.shared = true; return x; }

  /* ------------------------------------------------------------------ shared textures */
  var tex = {};
  function canvasTex(key, size, draw) {
    if (tex[key]) return tex[key];
    var c = document.createElement("canvas"); c.width = c.height = size;
    draw(c.getContext("2d"), size);
    var t = new THREE.CanvasTexture(c);   // shared and cached; the kit never disposes these
    return (tex[key] = t);
  }
  function glowTex() {
    return canvasTex("glow", 128, function (g, s) {
      var gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.18, "rgba(255,255,255,0.55)");
      gr.addColorStop(0.45, "rgba(255,255,255,0.14)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
  }
  function ringTex() {
    return canvasTex("ring", 128, function (g, s) {
      var gr = g.createRadialGradient(s / 2, s / 2, s * 0.30, s / 2, s / 2, s / 2);
      gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.55, "rgba(255,255,255,1)");
      gr.addColorStop(0.75, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
  }
  function flareTex() {           // 4-point star for muzzle flashes
    return canvasTex("flare", 128, function (g, s) {
      g.translate(s / 2, s / 2);
      var gr = g.createRadialGradient(0, 0, 0, 0, 0, s / 2);
      gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(-s / 2, -s / 2, s, s);
      g.globalCompositeOperation = "lighter";
      for (var i = 0; i < 2; i++) {
        g.rotate(Math.PI / 2 * i);
        var lg = g.createLinearGradient(-s / 2, 0, s / 2, 0);
        lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.5, "rgba(255,255,255,0.9)"); lg.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = lg; g.fillRect(-s / 2, -2, s, 4);
      }
    });
  }
  function brushedTex() {         // brushed-metal streaks: used as roughness + subtle albedo variation
    return canvasTex("brushed", 512, function (g, s) {
      var r = rng(7), img = g.createImageData(s, s), d = img.data;
      var rows = new Float32Array(s);
      for (var y = 0; y < s; y++) rows[y] = r();
      for (y = 0; y < s; y++) {
        var base = 150 + 50 * rows[y] + 20 * rows[(y + 1) % s];
        for (var x = 0; x < s; x++) {
          var v = base + 38 * (r() - 0.5) + 14 * Math.sin((x / s) * Math.PI * 2 * 3 + rows[y] * 6);
          var i = (y * s + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      g.fillStyle = "rgba(40,40,40,0.55)";          // panel seams
      for (var k = 0; k < 6; k++) { g.fillRect(0, Math.floor(r() * s), s, 2); g.fillRect(Math.floor(r() * s), 0, 2, s); }
    });
  }
  function flipWinding(geo) {     // after mirroring with a negative scale, keep faces pointing outwards
    if (geo.index) { var ix = geo.index.array; for (var i = 0; i < ix.length; i += 3) { var t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } return; }
    Object.keys(geo.attributes).forEach(function (k) {
      var at = geo.attributes[k], n = at.itemSize, arr = at.array;
      for (var v = 0; v < at.count; v += 3) for (var c = 0; c < n; c++) {
        var a1 = (v + 1) * n + c, a2 = (v + 2) * n + c, tmp = arr[a1]; arr[a1] = arr[a2]; arr[a2] = tmp;
      }
    });
  }
  function wrapTex(t, rx, ry) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }

  /* ------------------------------------------------------------------ GLSL noise (shared) */
  var NOISE = [
    "float bfx_h(vec3 p){p=fract(p*0.3183099+vec3(0.71,0.113,0.419));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}",
    "vec3 bfx_h3(vec3 p){return vec3(bfx_h(p),bfx_h(p+vec3(17.3,9.1,4.7)),bfx_h(p+vec3(3.9,31.7,12.1)));}",
    "float bfx_n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
    " return mix(mix(mix(bfx_h(i),bfx_h(i+vec3(1,0,0)),f.x),mix(bfx_h(i+vec3(0,1,0)),bfx_h(i+vec3(1,1,0)),f.x),f.y),",
    "            mix(mix(bfx_h(i+vec3(0,0,1)),bfx_h(i+vec3(1,0,1)),f.x),mix(bfx_h(i+vec3(0,1,1)),bfx_h(i+vec3(1,1,1)),f.x),f.y),f.z);}",
    "float bfx_fbm(vec3 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*bfx_n(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s/0.96875;}",
    // cellular: distances to the nearest and second-nearest feature points (for cracks)
    "vec2 bfx_cell(vec3 p){vec3 i=floor(p),f=fract(p);float d1=8.,d2=8.;",
    " for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){vec3 g=vec3(float(x),float(y),float(z));",
    "  vec3 r=g+bfx_h3(i+g)-f;float d=dot(r,r);if(d<d1){d2=d1;d1=d;}else if(d<d2){d2=d;}}",
    " return vec2(sqrt(d1),sqrt(d2));}"
  ].join("\n");

  // Kessel Run noise names and blackbody ramp, on top of the shared noise
  var FXN = NOISE + "\n" +
    "float fxN3(vec3 p){return bfx_n(p);}\nfloat fxFbm(vec3 p){return bfx_fbm(p);}\n" +
    "vec3 fxHeat(float t){t=clamp(t,0.,1.);vec3 c=mix(vec3(0.35,0.04,0.01),vec3(1.0,0.32,0.04),smoothstep(0.,0.35,t));" +
    "c=mix(c,vec3(1.0,0.72,0.22),smoothstep(0.3,0.65,t));c=mix(c,vec3(1.0,0.97,0.88),smoothstep(0.65,1.,t));return c;}\n";
  var fxTime = { value: 0 };                 // shared shader clock (BuilderFX.update sets it)
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randDir(out) {
    out = out || new V3();
    var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    return out.set(r * Math.cos(th), u, r * Math.sin(th));
  }

  /* ------------------------------------------------------------------ soft particles (from Kessel Run) */
  var P_FIRE = 0, P_SMOKE = 1, P_SPARK = 2, P_DUST = 3, P_EMBER = 4;
  // Points with colour over life. Sizes are world units: the pixel scale is taken from the camera that
  // draws them (onBeforeRender), so they look right at any resolution and field of view.
  function particlePool(capacity, additive, opts) {
    opts = opts || {};
    var pos = new Float32Array(capacity * 3), data = new Float32Array(capacity * 4), vel = new Float32Array(capacity * 3);
    var life = new Float32Array(capacity), age = new Float32Array(capacity), grow = new Float32Array(capacity);
    var drag = new Float32Array(capacity), buoy = new Float32Array(capacity);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aData", new THREE.BufferAttribute(data, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    var mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 }, uTime: fxTime, uSmokeTint: { value: opts.smokeTint || new C(0.16, 0.15, 0.14) } },
      vertexShader: "attribute vec4 aData;uniform float uScale;varying vec4 vData;void main(){vData=aData;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=aData.x>=1.?0.:aData.y*uScale/max(-mv.z,0.1);}",
      fragmentShader: "uniform float uTime;uniform vec3 uSmokeTint;varying vec4 vData;\n" + FXN +
        "void main(){vec2 c=gl_PointCoord*2.-1.;float r=length(c);if(r>1.)discard;float t=vData.x,kind=vData.z,seed=vData.w;" +
        "float n=fxFbm(vec3(c*1.7,seed*13.+uTime*0.6));float soft=smoothstep(1.,0.25+0.35*n,r);vec3 col;float a;" +
        "if(kind<0.5){float heat=clamp(1.15-t*1.6+(n-0.5)*0.5,0.,1.);vec3 smoke=vec3(0.07,0.065,0.06);col=mix(smoke,fxHeat(heat)*(1.+3.5*heat),smoothstep(0.08,0.35,heat));a=soft*(1.-smoothstep(0.55,1.,t))*(0.6+0.4*n);}" +
        "else if(kind<1.5){float lit=0.35+0.65*clamp(0.5-c.y*0.5+(n-0.5),0.,1.);col=uSmokeTint*lit;a=soft*smoothstep(0.,0.12,t)*(1.-t)*0.55*(0.5+n);}" +
        "else if(kind<2.5){col=mix(vec3(4.,3.2,1.8),vec3(3.,0.9,0.2),t);a=smoothstep(1.,0.,r)*(1.-t);}" +
        "else if(kind<3.5){float lit=0.5+0.5*clamp(0.6-c.y*0.5+(n-0.5),0.,1.);col=vec3(0.42,0.34,0.25)*lit;a=soft*smoothstep(0.,0.1,t)*(1.-t)*0.5*(0.5+n);}" +
        "else{float fl=0.6+0.4*sin(uTime*30.+seed*50.);col=vec3(3.2,1.,0.2)*fl;a=smoothstep(1.,0.,r)*(1.-t);}" +
        "gl_FragColor=vec4(col,a);}",
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    var points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    var vs = new THREE.Vector2();
    points.onBeforeRender = function (renderer, scene, camera) {
      renderer.getDrawingBufferSize(vs);
      mat.uniforms.uScale.value = camera.isPerspectiveCamera ? vs.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) : vs.y;
    };
    var count = 0, gravity = opts.gravity != null ? opts.gravity : 0;
    return {
      points: points,
      emit: function (p, v, o) {
        if (count >= capacity) return;
        var i = count++;
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        vel[i * 3] = v.x; vel[i * 3 + 1] = v.y; vel[i * 3 + 2] = v.z;
        data[i * 4] = 0; data[i * 4 + 1] = o.size || 1; data[i * 4 + 2] = o.kind; data[i * 4 + 3] = Math.random();
        life[i] = o.life || 1; age[i] = 0; grow[i] = o.grow == null ? 1 : o.grow; drag[i] = o.drag == null ? 0.5 : o.drag; buoy[i] = o.buoy || 0;
      },
      update: function (dt) {
        var w = 0;
        for (var i = 0; i < count; i++) {
          age[i] += dt;
          if (age[i] >= life[i]) continue;
          var k = Math.exp(-drag[i] * dt), kind = data[i * 4 + 2];
          vel[i * 3] *= k; vel[i * 3 + 2] *= k;
          vel[i * 3 + 1] = vel[i * 3 + 1] * k + (buoy[i] - (kind === P_SPARK || kind === P_EMBER ? gravity : 0)) * dt;
          if (w !== i) {
            pos[w * 3] = pos[i * 3]; pos[w * 3 + 1] = pos[i * 3 + 1]; pos[w * 3 + 2] = pos[i * 3 + 2];
            vel[w * 3] = vel[i * 3]; vel[w * 3 + 1] = vel[i * 3 + 1]; vel[w * 3 + 2] = vel[i * 3 + 2];
            data[w * 4 + 1] = data[i * 4 + 1]; data[w * 4 + 2] = data[i * 4 + 2]; data[w * 4 + 3] = data[i * 4 + 3];
            life[w] = life[i]; age[w] = age[i]; grow[w] = grow[i]; drag[w] = drag[i]; buoy[w] = buoy[i];
          }
          pos[w * 3] += vel[w * 3] * dt; pos[w * 3 + 1] += vel[w * 3 + 1] * dt; pos[w * 3 + 2] += vel[w * 3 + 2] * dt;
          data[w * 4] = age[w] / life[w];
          data[w * 4 + 1] *= 1 + (grow[w] - 1) * dt / Math.max(life[w], 0.01);
          w++;
        }
        count = w;
        geo.setDrawRange(0, count);
        geo.attributes.position.needsUpdate = true; geo.attributes.aData.needsUpdate = true;
        return count;
      },
      clear: function () { count = 0; geo.setDrawRange(0, 0); },
      count: function () { return count; },
      dispose: function () { geo.dispose(); mat.dispose(); }
    };
  }

  /* ------------------------------------------------------------------ billowing puff (from Kessel Run) */
  var puffGeo = null;
  function makePuff(sunDir) {
    if (!puffGeo) puffGeo = shared(new THREE.IcosahedronGeometry(1, 4));
    var m = new THREE.Mesh(puffGeo, new THREE.ShaderMaterial({
      uniforms: { uTime: fxTime, uHeat: { value: 1 }, uSmoke: { value: 0 }, uFade: { value: 1 }, uSeed: { value: Math.random() * 100 },
        uSun: { value: (sunDir || SUN_DIR).clone() }, uRoll: { value: 0 } },
      vertexShader: "uniform float uTime;uniform float uSeed;uniform float uRoll;varying vec3 vN;varying vec3 vV;varying vec3 vP;varying float vD;\n" + FXN +
        "void main(){vec3 dir=normalize(position);float d=fxFbm(dir*2.3+vec3(0.,-uRoll,uSeed));float d2=fxN3(dir*6.+vec3(uSeed,uRoll*1.7,0.));" +
        "vec3 p=dir*(0.78+0.45*d+0.12*d2);vD=d;vP=dir;vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*normalize(dir+(d-0.5)*0.8));vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}",
      fragmentShader: "uniform float uTime;uniform float uHeat;uniform float uSmoke;uniform float uFade;uniform float uSeed;uniform vec3 uSun;uniform float uRoll;varying vec3 vN;varying vec3 vV;varying vec3 vP;varying float vD;\n" + FXN +
        "void main(){float facing=abs(dot(normalize(vN),normalize(vV)));float n=fxFbm(vP*4.+vec3(uSeed,-uRoll*2.,uTime*0.2));" +
        "float heat=clamp(uHeat*(0.55+0.75*facing)+(n-0.5)*0.45-(1.-vD)*0.25,0.,1.);vec3 fire=fxHeat(heat)*(0.6+4.2*heat*heat);" +
        "float lit=clamp(dot(normalize(vP),uSun)*0.5+0.5,0.,1.);vec3 smoke=mix(vec3(0.03,0.028,0.026),vec3(0.24,0.22,0.2),lit*(0.6+0.6*n));" +
        "float burn=smoothstep(0.05,0.4,heat)*(1.-uSmoke);vec3 col=mix(smoke,fire,burn);float edge=smoothstep(0.08,0.75+0.2*n,facing);" +
        "edge*=smoothstep(0.25,0.55,n+facing*0.35);float a=edge*uFade*mix(0.95,0.62,uSmoke)*(0.7+0.4*n);gl_FragColor=vec4(col,a);}",
      transparent: true, depthWrite: false
    }));
    return m;
  }
  // Drive a puff along a fireball-to-smoke life (a = seconds since it started).
  function puffLife(pf, a, size, lifeLen) {
    var e = 1 - Math.exp(-a * 3.2), U = pf.m.material.uniforms;
    pf.m.position.copy(pf.v).multiplyScalar(e * 0.55);
    pf.m.position.addScaledVector(pf.rise, Math.max(0, a - 0.4) * 0.6);
    pf.m.scale.setScalar(pf.r0 + (pf.r1 - pf.r0) * e + size * 0.18 * Math.max(0, a - 1.0));
    U.uHeat.value = Math.max(0, 1.15 - a / pf.cool);
    U.uSmoke.value = Math.min(1, Math.max(0, (a - pf.cool * 0.9) / 1.4));
    U.uFade.value = Math.max(0, 1 - Math.max(0, a - lifeLen * 0.45) / (lifeLen * 0.55));
    U.uRoll.value = a * 0.35;
    pf.m.visible = U.uFade.value > 0.002 && a > 0;
  }

  /* ------------------------------------------------------------------ environment + lights */
  var SUN_DIR = new V3(0.62, 0.32, -0.72).normalize();

  function applyEnvironment(renderer, scene) {
    // A procedural "studio in space" painted straight into a small float equirect image: a dark nebula
    // gradient, a warm sun patch and cool/magenta rim strips. PMREM prefilters it so MeshStandardMaterial
    // metals have something to reflect. (Pure data: no scene render, so nothing can go NaN.)
    var w = 256, h = 128, data = new Float32Array(w * h * 4), d = new V3();
    var spots = [
      { dir: SUN_DIR, col: [2.6, 2.1, 1.6], size: 0.1 },
      { dir: new V3(-0.75, 0.25, 0.6).normalize(), col: [0.6, 1.2, 2.2], size: 0.18 },
      { dir: new V3(0.6, -0.5, 0.6).normalize(), col: [1.4, 0.5, 1.8], size: 0.14 },
      { dir: new V3(0, 1, 0), col: [0.45, 0.5, 0.55], size: 0.5 }
    ];
    for (var y = 0; y < h; y++) {
      var th = (y + 0.5) / h * Math.PI;                     // 0 at the top
      for (var x = 0; x < w; x++) {
        var ph = (x + 0.5) / w * Math.PI * 2;
        d.set(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th));  // three.js equirect layout
        var k = d.y * 0.5 + 0.5, i = (y * w + x) * 4;
        var r0 = 0.02 + 0.08 * k, g0 = 0.025 + 0.035 * k, b0 = 0.05 + 0.11 * k;
        var teal = Math.pow(Math.max(0, -d.x), 2) * 0.08; g0 += teal; b0 += teal * 1.1;
        for (var sI = 0; sI < spots.length; sI++) {
          var sp = spots[sI], c = d.dot(sp.dir), f = Math.exp((c - 1) / (sp.size * sp.size));
          r0 += sp.col[0] * f; g0 += sp.col[1] * f; b0 += sp.col[2] * f;
        }
        data[i] = r0; data[i + 1] = g0; data[i + 2] = b0; data[i + 3] = 1;
      }
    }
    var eq = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType);
    eq.mapping = THREE.EquirectangularReflectionMapping;
    eq.magFilter = eq.minFilter = THREE.LinearFilter;
    eq.needsUpdate = true;
    var pm = new THREE.PMREMGenerator(renderer);
    var rt = pm.fromEquirectangular(eq);
    pm.dispose(); eq.dispose();
    scene.environment = rt.texture;
    return rt.texture;
  }

  function makeLights() {
    var g = new THREE.Group(); g.name = "BuilderFX.lights";
    var sun = new THREE.DirectionalLight(new C(1.0, 0.86, 0.7), 1.6); sun.position.copy(SUN_DIR).multiplyScalar(100);
    var rim = new THREE.DirectionalLight(new C(0.45, 0.3, 1.0), 1.0); rim.position.set(-60, 30, 80);
    var fill = new THREE.HemisphereLight(new C(0.18, 0.2, 0.32), new C(0.06, 0.02, 0.08), 0.9);
    g.add(sun, rim, fill);
    g.userData.sun = sun; g.userData.rim = rim; g.userData.fill = fill;
    return g;
  }

  /* ------------------------------------------------------------------ cubes */
  function roundedBoxGeometry(size, radius, segments) {
    size = size || 1; segments = segments || 3;
    var h = size / 2; radius = Math.min(radius == null ? 0.12 * size : radius, h * 0.999);
    var s = segments * 2 + 1;     // odd count keeps flat faces in the middle
    var geo = new THREE.BoxGeometry(size, size, size, s, s, s);
    var pos = geo.attributes.position, nor = geo.attributes.normal, p = new V3(), inner = new V3(), n = new V3(), lim = h - radius;
    for (var i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      inner.set(Math.max(-lim, Math.min(lim, p.x)), Math.max(-lim, Math.min(lim, p.y)), Math.max(-lim, Math.min(lim, p.z)));
      n.subVectors(p, inner);
      if (n.lengthSq() < 1e-12) n.fromBufferAttribute(nor, i); else n.normalize();
      p.copy(inner).addScaledVector(n, radius);
      pos.setXYZ(i, p.x, p.y, p.z); nor.setXYZ(i, n.x, n.y, n.z);
    }
    pos.needsUpdate = nor.needsUpdate = true;
    geo.computeBoundingSphere();
    return geo;
  }

  function makeCubeMaterial(opts) {
    opts = opts || {};
    var m = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: opts.roughness != null ? opts.roughness : 0.32, metalness: opts.metalness != null ? opts.metalness : 0.08,
      envMapIntensity: 0.9
    });
    m.userData.uniforms = { uGlow: { value: opts.glow != null ? opts.glow : 0.06 }, uRim: { value: opts.rim != null ? opts.rim : 0.3 } };
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uGlow = m.userData.uniforms.uGlow; sh.uniforms.uRim = m.userData.uniforms.uRim;
      sh.fragmentShader = "uniform float uGlow;uniform float uRim;\n" + sh.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\n" +
        "#if defined( USE_INSTANCING_COLOR ) || defined( USE_COLOR )\n" +
        " float bfxF = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.0);\n" +
        " totalEmissiveRadiance += vColor * (uGlow + uRim * bfxF);\n" +   // gem-like inner light + coloured rim
        "#endif\n");
    };
    m.customProgramCacheKey = function () { return "bfx-cube"; };
    return m;
  }

  /* ------------------------------------------------------------------ small helpers */
  function glowSprite(color, size, opacity) {
    var s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex(), color: col(color), transparent: true, opacity: opacity == null ? 1 : opacity,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    s.scale.setScalar(size); return s;
  }
  // Fade a sprite out when the camera gets within `near` units (no blinding glows right in the lens).
  function nearFade(sprite, near, far) {
    var base = sprite.material.opacity, wp = new V3();
    sprite.userData.baseOpacity = base;
    sprite.onBeforeRender = function (r, sc, cam) {
      sprite.getWorldPosition(wp);
      var d = wp.distanceTo(cam.position), k = Math.max(0, Math.min(1, (d - near) / (far - near)));
      sprite.material.opacity = sprite.userData.baseOpacity * k * k;
    };
    return sprite;
  }
  function additive(color, extra) {
    var o = { color: col(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false };
    for (var k in extra) o[k] = extra[k];
    return new THREE.MeshBasicMaterial(o);
  }
  var unitCyl = shared(new THREE.CylinderGeometry(1, 1, 1, 12, 1, true).translate(0, 0.5, 0)); // base at 0, up +Y
  function stretch(mesh, from, to) {           // place a +Y unit cylinder between two points
    var d = new V3().subVectors(to, from), L = Math.max(d.length(), 1e-4);
    mesh.position.copy(from); mesh.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / L)); mesh.scale.y = L;
  }
  function beamMaterial(color, soft) {         // additive cylinder that fades towards its silhouette
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: col(color) }, uAlpha: { value: 1 }, uSoft: { value: soft || 1.5 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "varying vec3 vN;varying vec3 vV;varying float vY;void main(){vY=position.y;vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}",
      fragmentShader: "uniform vec3 uColor;uniform float uAlpha;uniform float uSoft;varying vec3 vN;varying vec3 vV;varying float vY;void main(){float f=pow(abs(dot(vN,vV)),uSoft);gl_FragColor=vec4(uColor*f*uAlpha,1.);}"
    });
  }

  /* ------------------------------------------------------------------ engine flame V2 (from Kessel Run) */
  function plumeMaterial(tint, abTint, layer) {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: fxTime, uTint: { value: new V3(tint[0], tint[1], tint[2]) }, uAB: { value: new V3(abTint[0], abTint[1], abTint[2]) },
        uThrottle: { value: 0.8 }, uBoost: { value: 0 }, uSeed: { value: Math.random() * 10 }, uLayer: { value: layer } },
      vertexShader: "uniform float uTime;uniform float uSeed;uniform float uBoost;varying float vAlong;varying vec3 vN;varying vec3 vV;varying vec3 vAxis;\n" + FXN +
        "varying float vNear;void main(){vAlong=uv.y;vec3 p=position;float n=fxN3(vec3(uv.x*6.+uSeed,uv.y*5.-uTime*11.,uSeed));p.xy*=1.+(n-0.5)*(0.25+0.25*uBoost)*uv.y;" +
        "vec4 mv=modelViewMatrix*vec4(p,1.);vNear=smoothstep(0.6,3.0,-mv.z);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vAxis=normalize(normalMatrix*vec3(0.,0.,1.));gl_Position=projectionMatrix*mv;}",
      fragmentShader: "uniform float uTime;uniform vec3 uTint;uniform vec3 uAB;uniform float uThrottle;uniform float uBoost;uniform float uSeed;uniform float uLayer;varying float vAlong;varying vec3 vN;varying vec3 vV;varying vec3 vAxis;varying float vNear;\n" + FXN +
        "void main(){float axial=abs(dot(normalize(vV),normalize(vAxis)));float edge=pow(abs(dot(normalize(vN),normalize(vV))),1.3);float x=vAlong;" +
        "float temp=clamp((1.-x)*(0.75+0.5*uThrottle)+uBoost*0.25,0.,1.);float spacing=mix(7.,5.,uBoost);" +
        "float node=pow(0.5+0.5*cos(x*6.2831*spacing),6.)*smoothstep(0.85,0.05,x);float diamonds=node*(0.4+0.8*uThrottle+0.8*uBoost);" +
        "float flick=0.82+0.3*fxN3(vec3(uTime*16.,x*7.,uSeed));vec3 base=mix(uTint,uAB,uBoost);vec3 col;float a;" +
        "if(uLayer<0.5){col=mix(base,vec3(1.,0.97,0.92),smoothstep(0.35,0.85,temp))*(2.4+4.*diamonds);a=pow(1.-x,2.2)*edge*flick;}" +
        "else if(uLayer<1.5){vec3 hc=mix(base*0.6,base,smoothstep(0.2,0.7,temp));hc=mix(hc,vec3(1.,0.85,0.65),smoothstep(0.75,1.,temp)*0.6);col=hc*(1.3+2.*diamonds);a=pow(1.-x,1.4)*edge*flick*0.8;}" +
        "else{col=mix(base,uAB,0.5)*1.2;a=pow(1.-x,1.1)*edge*(0.12+0.35*uBoost)*flick;}" +
        "a*=(1.-0.65*axial)*clamp(uThrottle*1.4,0.,1.)*vNear;gl_FragColor=vec4(col*a,a);}",
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
  }
  function coneAlongZ(radius, length, radial, rings) {
    var g = new THREE.ConeGeometry(radius, length, radial || 24, rings || 12, true);
    g.rotateX(Math.PI / 2); g.translate(0, 0, length / 2);
    return g;                                 // base at z=0 (uv.y=0), tip at +length (uv.y=1)
  }
  // Base at the origin, plume along +Z. setState({throttle 0..1.6, afterburner}), update(dt).
  function makeEngineFlame(opts) {
    opts = opts || {};
    var radius = opts.radius || 0.7, length = opts.length || 7, tint = opts.tint || [0.55, 0.75, 1.0], abTint = opts.abTint || [1.0, 0.45, 0.62];
    var grp = new THREE.Group(); grp.name = "BuilderFX.engineFlame";
    var layers = [
      { m: plumeMaterial(tint, abTint, 0), r: radius * 0.42, l: length * 0.55 },
      { m: plumeMaterial(tint, abTint, 1), r: radius * 0.92, l: length },
      { m: plumeMaterial(tint, abTint, 2), r: radius * 1.35, l: length * 1.5 }
    ];
    var plume = new THREE.Group();
    layers.forEach(function (L, i) { var mesh = new THREE.Mesh(coneAlongZ(L.r, L.l), L.m); mesh.renderOrder = 10 + i; plume.add(mesh); });
    grp.add(plume);
    var ringMat = new THREE.ShaderMaterial({
      uniforms: { uTemp: { value: 0.3 }, uTime: fxTime },
      vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: "uniform float uTemp;uniform float uTime;varying vec2 vUv;\n" + FXN +
        "void main(){float n=0.85+0.15*fxN3(vec3(vUv.x*30.,uTime*2.,0.));float t=uTemp*n;vec3 c=fxHeat(t)*(0.15+3.*t*t);gl_FragColor=vec4(c,1.);}"
    });
    var ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.02, radius * 0.07, 8, 40), ringMat); ring.position.z = -0.02; grp.add(ring);
    var discMat = new THREE.MeshBasicMaterial({ color: new C(1, 1, 1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    var disc = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.95, 32), discMat); disc.position.z = -0.05; grp.add(disc);
    // Heat shimmer: a faint wavering sheath that breaks up what's behind the plume
    var hazeMat = new THREE.ShaderMaterial({
      uniforms: { uTime: fxTime, uThrottle: { value: 0.8 } },
      vertexShader: "uniform float uTime;varying vec2 vUv;varying vec3 vN;varying vec3 vV;\n" + FXN +
        "varying float vNear;void main(){vUv=uv;vec3 p=position;p.xy*=1.+(fxN3(vec3(uv.x*8.,uv.y*6.-uTime*6.,0.))-0.5)*0.35;vec4 mv=modelViewMatrix*vec4(p,1.);vNear=smoothstep(0.6,3.0,-mv.z);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}",
      fragmentShader: "uniform float uTime;uniform float uThrottle;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying float vNear;\n" + FXN +
        "void main(){float n=fxFbm(vec3(vUv.x*10.,vUv.y*8.-uTime*4.,1.));float bands=smoothstep(0.45,0.6,n)-smoothstep(0.6,0.75,n);" +
        "float edge=pow(abs(dot(normalize(vN),normalize(vV))),2.);float a=bands*edge*(1.-vUv.y)*0.09*uThrottle*vNear;gl_FragColor=vec4(vec3(0.85,0.88,0.9),a);}",
      transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
    var haze = new THREE.Mesh(coneAlongZ(radius * 1.8, length * 1.3, 16, 6), hazeMat); haze.renderOrder = 9; grp.add(haze);
    var throttle = 0.8, boost = 0, boostTarget = 0, temp = 0.4;
    grp.userData.setState = function (o) {
      o = o || {};
      if (o.throttle != null) throttle = Math.max(0, Math.min(1.6, o.throttle));
      if (o.afterburner != null) boostTarget = o.afterburner ? 1 : 0;
    };
    grp.userData.update = function (dt) {
      boost += (boostTarget - boost) * Math.min(1, dt * 6);
      var tT = Math.min(1, 0.15 + throttle * 0.55 + boost * 0.35);
      temp += (tT - temp) * Math.min(1, dt * (tT > temp ? 1.2 : 0.35));      // metal heats faster than it cools
      layers.forEach(function (L) { L.m.uniforms.uThrottle.value = throttle; L.m.uniforms.uBoost.value = boost; });
      plume.scale.set(1 + boost * 0.15, 1 + boost * 0.15, Math.max(0.001, 0.35 + throttle * 0.55 + boost * 0.7));
      plume.visible = throttle > 0.01;
      ringMat.uniforms.uTemp.value = temp;
      if (boostTarget) discMat.color.setRGB(3.0, 1.6, 1.4); else discMat.color.setRGB(2.0, 2.2, 2.6);
      discMat.color.multiplyScalar(0.25 + throttle * 0.6);
      hazeMat.uniforms.uThrottle.value = throttle; haze.scale.z = 0.5 + throttle * 0.6;
    };
    return grp;
  }

  /* ------------------------------------------------------------------ hull panels (albedo, roughness, normal) */
  var hullCache = null;
  function hullTextures() {
    if (hullCache) return hullCache;
    var S = 512, r = rng(19);
    var h = new Float32Array(S * S);           // height: panels slightly raised, grooves and rivets
    var panels = [];
    (function split(x, y, w, hh, depth) {
      if (depth > 4 || (depth > 1 && r() < 0.25) || w < 40 || hh < 40) { panels.push([x, y, w, hh]); return; }
      if (w > hh) { var c = Math.round(w * (0.3 + 0.4 * r())); split(x, y, c, hh, depth + 1); split(x + c, y, w - c, hh, depth + 1); }
      else { var c2 = Math.round(hh * (0.3 + 0.4 * r())); split(x, y, w, c2, depth + 1); split(x, y + c2, w, hh - c2, depth + 1); }
    })(0, 0, S, S, 0);
    var tone = new Float32Array(S * S);
    panels.forEach(function (P) {
      var lift = 0.4 + 0.6 * r(), shade = 0.86 + 0.24 * r();
      for (var y = P[1]; y < P[1] + P[3]; y++) for (var x = P[0]; x < P[0] + P[2]; x++) {
        var e = Math.min(x - P[0], y - P[1], P[0] + P[2] - 1 - x, P[1] + P[3] - 1 - y);
        var i = y * S + x; h[i] = e < 1 ? 0 : e < 3 ? 0.5 * lift : lift; tone[i] = shade;
      }
      // rivets along two edges
      for (var k = 6; k < P[2] - 4; k += 12) { var rx = P[0] + k, ry = P[1] + 5; if (ry < S && rx < S) h[ry * S + rx] += 0.8; }
      for (k = 6; k < P[3] - 4; k += 12) { var qx = P[0] + 5, qy = P[1] + k; if (qy < S && qx < S) h[qy * S + qx] += 0.8; }
    });
    function canvasFrom(fn) {
      var c = document.createElement("canvas"); c.width = c.height = S;
      var g = c.getContext("2d"), img = g.createImageData(S, S), d = img.data;
      for (var i = 0; i < S * S; i++) { var v = fn(i); d[i * 4] = v[0]; d[i * 4 + 1] = v[1]; d[i * 4 + 2] = v[2]; d[i * 4 + 3] = 255; }
      g.putImageData(img, 0, 0);
      var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
    }
    var streak = new Float32Array(S); for (var y0 = 0; y0 < S; y0++) streak[y0] = r();
    var albedo = canvasFrom(function (i) {
      var y = (i / S) | 0, v = 165 * tone[i] + 26 * (streak[y] - 0.5) + 10 * (r() - 0.5);
      if (h[i] === 0) v *= 0.45;
      return [v, v, v * 1.03];
    });
    var rough = canvasFrom(function (i) {
      var y = (i / S) | 0, v = 120 + 70 * streak[y] + 30 * (r() - 0.5) + (tone[i] - 1) * 120;
      if (h[i] === 0) v = 220;
      return [v, v, v];
    });
    var normal = canvasFrom(function (i) {
      var x = i % S, y = (i / S) | 0;
      var dx = h[y * S + ((x + 1) % S)] - h[y * S + ((x - 1 + S) % S)], dy = h[((y + 1) % S) * S + x] - h[((y - 1 + S) % S) * S + x];
      var nx = -dx * 2.2, ny = dy * 2.2, nz = 1, L = Math.sqrt(nx * nx + ny * ny + nz * nz);
      return [(nx / L * 0.5 + 0.5) * 255, (ny / L * 0.5 + 0.5) * 255, (nz / L * 0.5 + 0.5) * 255];
    });
    hullCache = { albedo: albedo, rough: rough, normal: normal };
    return hullCache;
  }
  function hullMaterial(color, repeat, extra) {
    var H = hullTextures();
    function rep(t) { var c = t.clone(); c.needsUpdate = true; c.repeat.set(repeat[0], repeat[1]); return c; }
    var o = { color: color, metalness: 0.86, roughness: 0.55, map: rep(H.albedo), roughnessMap: rep(H.rough), normalMap: rep(H.normal),
      normalScale: new THREE.Vector2(0.7, 0.7), envMapIntensity: 1.3 };
    for (var k in extra) o[k] = extra[k];
    return new THREE.MeshStandardMaterial(o);
  }

  /* ------------------------------------------------------------------ ship */
  function makeShip(opts) {
    opts = opts || {};
    var guns = Math.max(3, Math.min(5, opts.guns | 0 || 3));
    var ship = new THREE.Group(); ship.name = "BuilderFX.ship";
    var body = new THREE.Group(); ship.add(body);      // everything that banks/bobs

    var hull = hullMaterial(new C(0.42, 0.44, 0.47), [6, 2.5], { envMapIntensity: 0.85, roughness: 0.62 });
    var wingHull = hullMaterial(new C(0.38, 0.4, 0.43), [0.34, 0.34], { envMapIntensity: 0.8, roughness: 0.65 });
    var dark = new THREE.MeshStandardMaterial({ color: new C(0.045, 0.05, 0.058), metalness: 0.75, roughness: 0.42, envMapIntensity: 1.0 });
    var gunmetal = new THREE.MeshStandardMaterial({ color: new C(0.2, 0.21, 0.23), metalness: 0.95, roughness: 0.28, envMapIntensity: 1.4 });
    var orange = new THREE.MeshStandardMaterial({ color: new C(1.0, 0.3, 0.035), metalness: 0.35, roughness: 0.32, emissive: new C(0.32, 0.08, 0.0) });
    var glass = new THREE.MeshPhysicalMaterial({ color: new C(0.015, 0.04, 0.06), metalness: 0.2, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03,
      emissive: new C(0.0, 0.03, 0.045), envMapIntensity: 2.4 });

    // Fuselage: a lathe profile around Y, turned so the nose points -Z.
    var prof = [[0.0, -2.35], [0.34, -2.3], [0.52, -1.9], [0.62, -1.0], [0.66, 0.0], [0.6, 0.9], [0.45, 1.75], [0.26, 2.4], [0.1, 2.8], [0.0, 2.9]]
      .map(function (q) { return new THREE.Vector2(q[0], q[1]); });
    var fus = new THREE.Mesh(new THREE.LatheGeometry(prof, 48).rotateX(-Math.PI / 2), hull);
    fus.scale.set(1, 0.68, 1); body.add(fus);
    var belly = new THREE.Mesh(new THREE.LatheGeometry(prof, 32, Math.PI * 0.62, Math.PI * 0.76).rotateX(-Math.PI / 2), dark);
    belly.scale.set(1.02, 0.7, 1.0); body.add(belly);
    // Nose: dark radome tip, glowing sensor ring, pitot spike
    var tipProf = [[0.0, 2.38], [0.27, 2.38], [0.19, 2.62], [0.09, 2.82], [0.0, 2.92]].map(function (q) { return new THREE.Vector2(q[0], q[1]); });
    var tip = new THREE.Mesh(new THREE.LatheGeometry(tipProf, 32).rotateX(-Math.PI / 2), gunmetal); tip.scale.set(1.02, 0.7, 1); body.add(tip);
    var sensor = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.016, 8, 40), new THREE.MeshBasicMaterial({ color: new C(0.3, 1.6, 2.0), toneMapped: false }));
    sensor.scale.set(1, 0.7, 1); sensor.position.z = -2.39; body.add(sensor);
    var pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.018, 0.55, 8).rotateX(Math.PI / 2), gunmetal); pitot.position.set(0, 0.0, -3.15); body.add(pitot);
    // Chin intakes
    [-1, 1].forEach(function (sd) {
      var intake = new THREE.Mesh(roundedBoxGeometry(1, 0.12, 2), dark); intake.scale.set(0.22, 0.16, 0.7); intake.position.set(sd * 0.42, -0.24, -0.7); body.add(intake);
      var lip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.04), orange); lip.position.set(sd * 0.42, -0.15, -1.06); body.add(lip);
    });

    // Canopy with frame struts and a softly lit cockpit
    var canopy = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), glass);
    canopy.scale.set(0.85, 0.7, 2.1); canopy.position.set(0, 0.32, -0.75); body.add(canopy);
    var hud = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.1), new THREE.MeshBasicMaterial({ color: new C(0.2, 0.9, 1.1), transparent: true, opacity: 0.8, toneMapped: false }));
    hud.position.set(0, 0.42, -1.05); hud.rotation.x = -0.6; body.add(hud);
    [-0.42, 0.0, 0.42].forEach(function (zz, k) {
      var strut = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.022, 6, 24, Math.PI), dark);
      strut.position.set(0, 0.33, -0.75 + zz * 1.6); strut.scale.set(1, 0.82, 1); body.add(strut);
    });
    var spineStrut = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 1.7), dark); spineStrut.position.set(0, 0.61, -0.75); body.add(spineStrut);

    // Dorsal spine behind the canopy: vents and an antenna
    var spine = new THREE.Mesh(roundedBoxGeometry(1, 0.2, 2), hull); spine.scale.set(0.5, 0.22, 1.5); spine.position.set(0, 0.47, 0.75); body.add(spine);
    for (var vI = 0; vI < 5; vI++) {
      var vent = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.06), dark); vent.position.set(0, 0.585, 0.25 + vI * 0.13); body.add(vent);
    }
    var ventGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.5), new THREE.MeshBasicMaterial({ color: new C(1.4, 0.4, 0.06), transparent: true, opacity: 0.55, toneMapped: false }));
    ventGlow.rotation.x = -Math.PI / 2; ventGlow.position.set(0, 0.578, 0.51); body.add(ventGlow);
    var antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.5, 6), gunmetal); antenna.position.set(0.12, 0.8, 1.25); antenna.rotation.x = 0.35; body.add(antenna);
    var antTip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: new C(4, 0.4, 0.2), toneMapped: false }));
    antTip.position.set(0.12, 1.03, 1.34); body.add(antTip); antTip.userData.blink = 0.25;

    // Swept wings (extruded shapes), wingspan ~7.7.
    function wing(side) {
      var sh = new THREE.Shape();
      sh.moveTo(0.35, -1.0); sh.lineTo(3.85, 0.85); sh.lineTo(3.85, 1.45); sh.lineTo(2.6, 1.55); sh.lineTo(0.35, 2.0); sh.lineTo(0.35, -1.0);
      var g = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.05, bevelSegments: 3, steps: 1 });
      g.rotateX(Math.PI / 2); g.translate(0, 0.02, 0);
      if (side < 0) { g.scale(-1, 1, 1); flipWinding(g); }
      var m = new THREE.Mesh(g, wingHull); m.rotation.z = side * 0.05; return m;
    }
    body.add(wing(-1), wing(1));
    function bar(a, b, w, hgt, mat) {
      var L = a.distanceTo(b), m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, L), mat);
      m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); return m;
    }
    function wingY(x) { return 0.085 + Math.abs(x) * 0.05; }   // top surface height with dihedral
    [-1, 1].forEach(function (sd) {
      // dark leading edge, orange stripes, chevrons, wing fences
      body.add(bar(new V3(sd * 0.4, wingY(0.4) - 0.02, -0.98), new V3(sd * 3.84, wingY(3.84) - 0.02, 0.86), 0.07, 0.07, dark));
      body.add(bar(new V3(sd * 0.7, wingY(0.7), -0.35), new V3(sd * 3.6, wingY(3.6), 0.95), 0.16, 0.02, orange));
      body.add(bar(new V3(sd * 0.6, wingY(0.6), 0.15), new V3(sd * 3.0, wingY(3.0), 1.2), 0.07, 0.02, orange));
      for (var cI = 0; cI < 3; cI++) {
        var cz = 1.18 + cI * 0.09;
        body.add(bar(new V3(sd * 3.35, wingY(3.35) + 0.002, cz), new V3(sd * 3.75, wingY(3.75) + 0.002, cz - 0.12), 0.035, 0.015, orange));
      }
      [1.6, 2.7].forEach(function (fx) {
        var fence = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.9), dark);
        fence.position.set(sd * fx, wingY(fx) + 0.04, -0.2 + fx * 0.45); fence.rotation.z = sd * 0.05; body.add(fence);
      });
      // wing-tip blades and running lights
      var blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 1.0), dark); blade.position.set(sd * 3.86, 0.3, 1.1); body.add(blade);
      var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: sd < 0 ? new C(4, 0.2, 0.1) : new C(0.2, 4, 0.6), toneMapped: false }));
      lamp.position.set(sd * 3.9, 0.3, 0.62); body.add(lamp); lamp.userData.blink = sd < 0 ? 0 : 0.5;
      body.userData.lamps = (body.userData.lamps || []).concat([lamp]);
      // tail fins
      var fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(0.9, 0.0); fs.lineTo(0.25, 0.85); fs.lineTo(0, 0.85);
      var fg = new THREE.ExtrudeGeometry(fs, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
      fg.rotateY(-Math.PI / 2); var fin = new THREE.Mesh(fg, wingHull);
      fin.position.set(sd * 0.55, 0.25, 1.15); fin.rotation.z = -sd * 0.42; body.add(fin);
      var finStripe = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.5, 0.12), orange);
      finStripe.position.set(sd * (0.55 + 0.17), 0.62, 1.55); finStripe.rotation.z = -sd * 0.42; body.add(finStripe);
    });
    body.userData.lamps.push(antTip);
    body.add(bar(new V3(0, 0.455, -2.15), new V3(0, 0.455, -1.75), 0.1, 0.02, orange));

    // Engines: nacelles with intake rings and V2 flames (white-hot core, shock diamonds, heat shimmer)
    var engines = [], halos = [];
    [-0.82, 0.82].forEach(function (x) {
      var nac = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.7, 28).rotateX(Math.PI / 2), hull);
      nac.position.set(x, 0.02, 1.75); body.add(nac);
      var cowl = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.06, 10, 32), gunmetal); cowl.position.set(x, 0.02, 2.6); body.add(cowl);
      for (var rI = 0; rI < 3; rI++) {
        var band = new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.012, 6, 32), dark); band.position.set(x, 0.02, 1.2 + rI * 0.35); body.add(band);
      }
      var flame = makeEngineFlame({ radius: 0.26, length: 3.4, tint: [0.45, 0.72, 1.0], abTint: [0.9, 0.55, 1.0] });
      flame.position.set(x, 0.02, 2.64); body.add(flame); engines.push(flame);
      var halo = nearFade(glowSprite(new C(0.25, 0.55, 1.5), 1.1, 0.6), 1.5, 4.5); halo.position.set(x, 0.02, 2.75); body.add(halo); halos.push(halo);
    });

    // Guns, ordered left to right
    var layouts = { 3: [-2.55, 0, 2.55], 4: [-3.05, -1.35, 1.35, 3.05], 5: [-3.25, -1.9, 0, 1.9, 3.25] };
    var tips = [], gunParts = [];
    layouts[guns].forEach(function (x, i) {
      var g = new THREE.Group();
      var centre = Math.abs(x) < 0.01;
      var wz = centre ? -2.0 : -0.95 + (Math.abs(x) - 0.35) * (1.85 / 3.5) + 0.1;   // wing guns at the leading edge
      g.position.set(x, centre ? 0.05 : 0.17 + Math.abs(x) * 0.05, wz);            // centre gun: nose cannon
      var housing = new THREE.Mesh(roundedBoxGeometry(1, 0.08, 2), dark); housing.scale.set(0.34, 0.24, 0.9); housing.position.z = 0.25; g.add(housing);
      var sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.345, 0.03, 0.5), orange); sideStripe.position.set(0, -0.06, 0.3); g.add(sideStripe);
      var recoil = new THREE.Group(); g.add(recoil);
      var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.05, 16).rotateX(Math.PI / 2), gunmetal); barrel.position.z = -0.55; recoil.add(barrel);
      for (var k = 0; k < 4; k++) {
        var fin = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.014, 6, 18), dark); fin.position.z = -0.25 - k * 0.12; recoil.add(fin);
      }
      var brake = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 6).rotateX(Math.PI / 2), gunmetal); brake.position.z = -0.97; recoil.add(brake);
      var slot = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.035, 0.06), dark); slot.position.z = -0.97; recoil.add(slot);
      var cellMat = new THREE.MeshStandardMaterial({ color: new C(0.1, 0.1, 0.11), metalness: 0.2, roughness: 0.3, emissive: new C(0, 0, 0) });
      var cell = new THREE.Mesh(roundedBoxGeometry(0.26, 0.05, 2), cellMat); cell.position.set(0, 0.2, 0.25); g.add(cell);
      [[0.15, 0], [-0.15, 0], [0, 0.15], [0, -0.15]].forEach(function (o) {   // cage around the ammo cell
        var b2 = new THREE.Mesh(new THREE.BoxGeometry(o[0] ? 0.025 : 0.32, 0.3, o[1] ? 0.025 : 0.32), dark);
        b2.position.set(o[0], 0.2, 0.25 + o[1]); g.add(b2);
      });
      var conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6).rotateX(Math.PI / 2), gunmetal); conduit.position.set(0.12, 0.08, -0.05); g.add(conduit);
      var ringMat = new THREE.MeshBasicMaterial({ color: new C(0.04, 0.04, 0.05), toneMapped: false });
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.02, 8, 18), ringMat); ring.position.z = -1.1; recoil.add(ring);
      var tipO = new THREE.Object3D(); tipO.position.z = -1.14; recoil.add(tipO); tipO.name = "gunTip" + i;
      var flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex(), color: new C(3, 2.4, 1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
      flash.scale.setScalar(0.01); tipO.add(flash);
      var cellGlow = glowSprite(new C(0, 0, 0), 0.9, 0); cellGlow.position.copy(cell.position); g.add(cellGlow);
      body.add(g); tips.push(tipO);
      gunParts.push({ cell: cellMat, ring: ringMat, flash: flash, recoil: recoil, glow: cellGlow, color: null, fireT: 1 });
    });

    function setGunColor(i, c) {
      var gp = gunParts[i]; if (!gp) return;
      gp.color = c ? col(c) : null;
      if (gp.color) {
        gp.cell.color.copy(gp.color).multiplyScalar(0.6); gp.cell.emissive.copy(gp.color).multiplyScalar(1.8);
        gp.ring.color.copy(gp.color).multiplyScalar(2.5); gp.glow.material.color.copy(gp.color).multiplyScalar(1.4); gp.glow.material.opacity = 0.9;
      } else {
        gp.cell.color.setRGB(0.1, 0.1, 0.11); gp.cell.emissive.setRGB(0, 0, 0);
        gp.ring.color.setRGB(0.04, 0.04, 0.05); gp.glow.material.opacity = 0;
      }
    }
    function fireGun(i) {
      var gp = gunParts[i]; if (!gp) return;
      gp.fireT = 0;
      gp.flash.material.color.copy(gp.color || new C(1, 0.8, 0.5)).multiplyScalar(3).add(new C(1.5, 1.5, 1.5));
      gp.flash.material.rotation = Math.random() * Math.PI;
    }
    var thrust = 1;
    ship.update = function (dt, t) {
      body.position.y = Math.sin(t * 1.3) * 0.05; body.rotation.z = Math.sin(t * 0.9) * 0.025; body.rotation.x = Math.sin(t * 1.1) * 0.012;
      engines.forEach(function (e) { e.userData.setState({ throttle: thrust, afterburner: thrust > 1.15 }); e.userData.update(dt); });
      halos.forEach(function (h) { h.userData.baseOpacity = 0.35 + 0.3 * Math.min(thrust, 1.2); });
      (body.userData.lamps || []).forEach(function (l) { l.visible = ((t + l.userData.blink) % 1.2) < 0.12; });
      ventGlow.material.opacity = 0.4 + 0.25 * thrust;
      gunParts.forEach(function (gp) {
        if (gp.fireT < 1) {
          gp.fireT = Math.min(1, gp.fireT + dt / 0.14);
          var k = 1 - gp.fireT;
          gp.flash.material.opacity = k; gp.flash.scale.setScalar(0.45 + 1.1 * Math.sqrt(gp.fireT) * k);
          gp.recoil.position.z = 0.16 * k * k;
        } else { gp.flash.material.opacity = 0; gp.recoil.position.z = 0; }
        if (gp.color) gp.glow.material.opacity = 0.7 + 0.2 * Math.sin(t * 4);
      });
    };
    ship.userData.gunTips = tips;
    ship.userData.gunCount = guns;
    ship.userData.setGunColor = setGunColor;
    ship.userData.fireGun = fireGun;
    ship.userData.setThrust = function (v) { thrust = Math.max(0, Math.min(1.5, v)); };
    ship.userData.engines = engines;
    for (var i = 0; i < guns; i++) setGunColor(i, null);
    return track(ship);
  }

  /* ------------------------------------------------------------------ drone */
  function makeDrone() {
    var d = new THREE.Group(); d.name = "BuilderFX.drone";
    var bob = new THREE.Group(); d.add(bob);
    var brushed = wrapTex(brushedTex(), 1, 1);
    var metal = new THREE.MeshStandardMaterial({ color: new C(0.7, 0.72, 0.76), metalness: 0.85, roughness: 0.35, roughnessMap: brushed, envMapIntensity: 1.2 });
    var dark = new THREE.MeshStandardMaterial({ color: new C(0.05, 0.055, 0.06), metalness: 0.6, roughness: 0.4 });
    var orange = new THREE.MeshStandardMaterial({ color: new C(1.0, 0.32, 0.04), metalness: 0.3, roughness: 0.4, emissive: new C(0.3, 0.08, 0) });

    var hull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 18), metal); hull.scale.set(1, 0.72, 1.1); bob.add(hull);
    var band = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.035, 10, 32), orange); band.rotation.x = Math.PI / 2; band.scale.set(1, 1.1, 1); bob.add(band);
    var eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), new THREE.MeshBasicMaterial({ color: new C(0.6, 2.8, 3.2), toneMapped: false }));
    eye.position.set(0, 0.04, -0.34); bob.add(eye);
    var visor = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 20), dark); visor.position.copy(eye.position); bob.add(visor);
    var eyeGlow = glowSprite(new C(0.4, 1.6, 2.0), 0.45, 0.8); eyeGlow.position.set(0, 0.04, -0.4); bob.add(eyeGlow);

    var pods = [];
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
      var arm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.07), dark);
      arm.position.set(q[0] * 0.38, 0.0, q[1] * 0.26); arm.rotation.y = q[0] * q[1] * 0.6; bob.add(arm);
      var pod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 16), metal); pod.position.set(q[0] * 0.55, 0, q[1] * 0.38); bob.add(pod);
      var jet = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new C(0.8, 1.8, 4.5), toneMapped: false, side: THREE.DoubleSide }));
      jet.position.set(q[0] * 0.55, -0.065, q[1] * 0.38); bob.add(jet);
      var jg = glowSprite(new C(0.3, 0.8, 2.2), 0.42, 0.7); jg.position.set(q[0] * 0.55, -0.12, q[1] * 0.38); bob.add(jg);
      pods.push(jg);
    });

    // Claws and the cargo cube they hold
    var clawL = new THREE.Group(), clawR = new THREE.Group();
    [clawL, clawR].forEach(function (cl, k) {
      var s = k ? 1 : -1;
      var a = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.12), dark); a.position.set(0, -0.12, 0); cl.add(a);
      var b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.12), metal); b.position.set(-s * 0.04, -0.24, 0); cl.add(b);
      cl.position.set(s * 0.2, -0.18, 0); bob.add(cl);
    });
    var anchor = new THREE.Object3D(); anchor.position.set(0, -0.48, 0); bob.add(anchor);
    var cargoMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.25, metalness: 0.1, emissive: new C(0, 0, 0) });
    var cargo = new THREE.Mesh(roundedBoxGeometry(0.3, 0.05, 2), cargoMat); anchor.add(cargo);
    var cargoGlow = glowSprite(new C(1, 1, 1), 1.0, 0.85); anchor.add(cargoGlow);
    var flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex(), color: new C(3, 3, 3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    anchor.add(flash);
    var carrying = null, open = 1, fireT = 1;

    function setCargo(c) {
      carrying = c ? col(c) : null;
      cargo.visible = cargoGlow.visible = !!carrying;
      if (carrying) {
        cargoMat.color.copy(carrying).multiplyScalar(0.6); cargoMat.emissive.copy(carrying).multiplyScalar(2.0);
        cargoGlow.material.color.copy(carrying).multiplyScalar(1.6);
      }
    }
    d.update = function (dt, t) {
      var ph = d.id * 1.7;
      bob.position.y = Math.sin(t * 2.1 + ph) * 0.07;
      bob.rotation.z = Math.sin(t * 1.3 + ph) * 0.08; bob.rotation.x = Math.sin(t * 1.7 + ph) * 0.05;
      pods.forEach(function (p, k) { p.material.opacity = 0.55 + 0.2 * Math.sin(t * 23 + k * 2.1); });
      var want = carrying ? 0 : 1; open += (want - open) * Math.min(1, dt * 8);
      clawL.rotation.z = -0.5 * open; clawR.rotation.z = 0.5 * open;
      cargo.rotation.y += dt * 1.2; cargo.rotation.x = Math.sin(t * 1.5) * 0.3;
      if (carrying) cargoGlow.material.opacity = 0.65 + 0.2 * Math.sin(t * 5 + ph);
      if (fireT < 1) {
        fireT = Math.min(1, fireT + dt / 0.18); var k = 1 - fireT;
        flash.material.opacity = k; flash.scale.setScalar(0.3 + 1.6 * Math.sqrt(fireT) * k);
        cargo.scale.setScalar(1 + 0.25 * k);
      } else { flash.material.opacity = 0; cargo.scale.setScalar(1); }
    };
    d.userData.setCargo = setCargo;
    d.userData.cargoAnchor = anchor;
    d.userData.fire = function () {
      fireT = 0; flash.material.color.copy(carrying || new C(1, 1, 1)).multiplyScalar(2.5).add(new C(1.2, 1.2, 1.2));
    };
    setCargo(null);
    return track(d);
  }

  /* ------------------------------------------------------------------ exploding planet */
  function makeExplodingPlanet(opts) {
    opts = opts || {};
    var R = opts.radius || 14, seed = opts.seed || 3;
    var g = new THREE.Group(); g.name = "BuilderFX.planet";
    var r = rng(seed);

    // Planet: albedo and cracks computed per pixel from 3D noise of the surface position (no textures).
    var pu = { uCrack: { value: 0 }, uTime: { value: 0 }, uSeed: { value: seed * 1.37 } };
    var pmat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.0 });
    pmat.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, pu);
      sh.vertexShader = "varying vec3 vObj;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
      sh.fragmentShader = "uniform float uCrack;uniform float uTime;uniform float uSeed;varying vec3 vObj;\n" + NOISE + "\n" +
        sh.fragmentShader
          .replace("#include <color_fragment>",
            "#include <color_fragment>\n" +
            "vec3 P = normalize(vObj);\n" +
            "float h = bfx_fbm(P*2.6+uSeed);\n" +
            "float lat = abs(P.y);\n" +
            "vec3 ocean = mix(vec3(0.010,0.035,0.08), vec3(0.02,0.10,0.16), smoothstep(0.35,0.5,h));\n" +
            "vec3 land = mix(vec3(0.20,0.16,0.10), vec3(0.08,0.14,0.06), bfx_n(P*9.+uSeed));\n" +
            "land = mix(land, vec3(0.32,0.30,0.28), smoothstep(0.62,0.72,h));\n" +
            "vec3 albedo = mix(ocean, land, smoothstep(0.5,0.53,h));\n" +
            "albedo = mix(albedo, vec3(0.8,0.85,0.9), smoothstep(0.78,0.9,lat+0.08*bfx_n(P*7.)));\n" +
            "float cl = smoothstep(0.55,0.8,bfx_fbm(P*4.+vec3(uTime*0.01,0.,0.)+11.));\n" +
            "albedo = mix(albedo, vec3(0.75), cl*0.65*(1.0-uCrack));\n" +
            "albedo = mix(albedo, albedo*vec3(0.55,0.4,0.35), uCrack);\n" +   // scorched as it cracks
            "diffuseColor.rgb = albedo;\n")
          .replace("#include <emissivemap_fragment>",
            "#include <emissivemap_fragment>\n" +
            "vec2 cc = bfx_cell(P*3.2+uSeed); float edge = cc.y-cc.x;\n" +
            "vec2 cc2 = bfx_cell(P*8.+uSeed*2.); float edge2 = cc2.y-cc2.x;\n" +
            "float w = mix(0.0, 0.065, uCrack);\n" +
            "float crack = (1.0-smoothstep(0.0, w+0.001, edge)) * step(0.02, uCrack);\n" +
            "crack = max(crack, (1.0-smoothstep(0.0, w*0.35+0.001, edge2)) * smoothstep(0.5,0.95,uCrack) * 0.7);\n" +
            "float pulse = 0.85+0.15*sin(uTime*7.+edge*40.);\n" +
            "totalEmissiveRadiance += vec3(4.0,1.25,0.25) * crack * (0.5+1.2*uCrack) * pulse;\n" +
            "totalEmissiveRadiance += vec3(0.5,0.08,0.01) * uCrack*uCrack * 0.12;\n");
    };
    pmat.customProgramCacheKey = function () { return "bfx-planet"; };
    var planet = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), pmat); g.add(planet);

    var atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 64, 40), new THREE.ShaderMaterial({
      uniforms: { uCrack: pu.uCrack, uSun: { value: SUN_DIR.clone() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
      vertexShader: "varying vec3 vN;varying vec3 vW;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
      fragmentShader: "uniform float uCrack;uniform vec3 uSun;varying vec3 vN;varying vec3 vW;void main(){vec3 V=normalize(cameraPosition-vW);float f=pow(1.-abs(dot(vN,V)),2.2);float lit=0.35+0.65*max(0.,dot(-vN,uSun)*0.5+0.5);vec3 c=mix(vec3(0.25,0.55,1.4),vec3(2.4,0.6,0.15),uCrack);gl_FragColor=vec4(c*f*lit*0.9,1.);}"
    }));
    g.add(atmo);

    // Molten core (hidden until the explosion)
    var coreU = { uTime: { value: 0 }, uHeat: { value: 1 } };
    var core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.28, 64, 40), new THREE.ShaderMaterial({
      uniforms: coreU,
      vertexShader: "varying vec3 vP;varying vec3 vN;varying vec3 vW;void main(){vP=position;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
      fragmentShader: NOISE + "\nuniform float uTime;uniform float uHeat;varying vec3 vP;varying vec3 vN;varying vec3 vW;void main(){vec3 P=normalize(vP);" +
        "float n=bfx_fbm(P*3.+vec3(0.,uTime*0.15,uTime*0.07));float m=bfx_fbm(P*7.-vec3(uTime*0.2,0.,0.)+n*2.);" +
        "float crust=smoothstep(0.55,0.75,m);vec3 hot=mix(vec3(3.2,0.9,0.12),vec3(5.,2.6,0.8),smoothstep(0.3,0.7,n));" +
        "vec3 c=mix(hot,vec3(0.25,0.06,0.02),crust*0.85);float f=pow(1.-abs(dot(vN,normalize(cameraPosition-vW))),2.);" +
        "c+=vec3(2.5,0.8,0.15)*f;gl_FragColor=vec4(c*uHeat,1.);}"
    }));
    core.visible = false; g.add(core);
    var coreGlow = glowSprite(new C(2.2, 0.8, 0.2), R * 1.6, 0.0); coreGlow.visible = false; g.add(coreGlow);
    var coreLight = new THREE.PointLight(new C(1.0, 0.45, 0.15), 0, R * 8, 2); g.add(coreLight);

    // Debris: rocks (instanced) that fly out and settle into a slowly drifting field 15–50 units out
    var N = opts.debris || 520;
    var rockGeo = new THREE.IcosahedronGeometry(1, 1), rp = rockGeo.attributes.position, rr = rng(seed + 11), v = new V3(), jit = {};
    for (var i = 0; i < rp.count; i++) {
      v.fromBufferAttribute(rp, i);
      var key = v.x.toFixed(3) + "," + v.y.toFixed(3) + "," + v.z.toFixed(3);   // same corner, same jitter: no gaps
      if (jit[key] == null) jit[key] = 0.7 + 0.5 * rr();
      v.multiplyScalar(jit[key]); rp.setXYZ(i, v.x, v.y * 0.8, v.z);
    }
    if (rockGeo.index) rockGeo = rockGeo.toNonIndexed();
    rockGeo.computeVertexNormals();
    var heatAttr = new Float32Array(N);
    var rockU = { uHeat: { value: 0 } };
    var rockMat = new THREE.MeshStandardMaterial({ color: new C(0.16, 0.13, 0.12), roughness: 0.9, metalness: 0.05, flatShading: true });
    rockMat.onBeforeCompile = function (sh) {
      sh.uniforms.uHeat = rockU.uHeat;
      sh.vertexShader = "attribute float aHot;varying float vHot;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvHot=aHot;");
      sh.fragmentShader = "uniform float uHeat;varying float vHot;\n" + sh.fragmentShader.replace("#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\nfloat hh=clamp(uHeat*vHot,0.,1.);totalEmissiveRadiance+=mix(vec3(0.9,0.12,0.02),vec3(4.,1.5,0.3),hh*hh)*hh*1.4;");
    };
    rockMat.customProgramCacheKey = function () { return "bfx-rock"; };
    var rocks = new THREE.InstancedMesh(rockGeo, rockMat, N);
    rockGeo.setAttribute("aHot", new THREE.InstancedBufferAttribute(heatAttr, 1));
    rocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); rocks.visible = false; rocks.frustumCulled = false; g.add(rocks);
    var rocksData = [];
    for (i = 0; i < N; i++) {
      var dir = new V3(rr() * 2 - 1, (rr() * 2 - 1) * 0.55, rr() * 2 - 1).normalize();
      var big = rr() < 0.08;
      rocksData.push({
        dir: dir, r0: R * (0.6 + 0.35 * rr()), rT: 15 + Math.pow(rr(), 0.8) * 35, k: 0.6 + 0.9 * rr(),
        size: big ? 1.4 + 1.8 * rr() : 0.25 + 0.9 * Math.pow(rr(), 2), spin: new V3(rr() - 0.5, rr() - 0.5, rr() - 0.5).multiplyScalar(2),
        orbit: (0.006 + 0.02 * rr()) * (rr() < 0.5 ? 1 : -1), tilt: (rr() - 0.5) * 0.4, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rr() * 6, rr() * 6, rr() * 6))
      });
      heatAttr[i] = 0.4 + 0.6 * rr();
    }

    // Embers: GPU-animated points (no per-frame CPU work)
    var E = opts.embers || 1400, ep = new Float32Array(E * 3), ev = new Float32Array(E * 4);
    for (i = 0; i < E; i++) {
      var ed = new V3(rr() * 2 - 1, rr() * 2 - 1, rr() * 2 - 1).normalize();
      ep[i * 3] = ed.x; ep[i * 3 + 1] = ed.y; ep[i * 3 + 2] = ed.z;
      ev[i * 4] = 20 + 90 * Math.pow(rr(), 1.5); ev[i * 4 + 1] = 0.6 + 1.6 * rr(); ev[i * 4 + 2] = 2.5 + 6 * rr(); ev[i * 4 + 3] = rr();
    }
    var emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute("position", new THREE.BufferAttribute(ep, 3));
    emberGeo.setAttribute("aV", new THREE.BufferAttribute(ev, 4));
    var emberU = { uT: { value: 0 }, uR: { value: R }, uSize: { value: 1 }, uMap: { value: glowTex() } };
    var embers = new THREE.Points(emberGeo, new THREE.ShaderMaterial({
      uniforms: emberU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: "uniform float uT;uniform float uR;uniform float uSize;attribute vec4 aV;varying vec3 vC;varying float vA;void main(){" +
        "float k=aV.y;float d=uR*0.9+aV.x*(1.-exp(-k*uT))/k;vec3 p=position*d;float life=clamp(uT/aV.z,0.,1.);" +
        "vec3 hot=vec3(4.,1.8,0.6);vec3 cool=vec3(1.2,0.2,0.04);vC=mix(hot,cool,smoothstep(0.,0.5,life))*(0.6+0.8*aV.w);vA=1.-smoothstep(0.55,1.,life);" +
        "vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=uSize*(1.2+2.6*aV.w)*(160./-mv.z)*(1.-0.5*life);gl_Position=projectionMatrix*mv;}",
      fragmentShader: "uniform sampler2D uMap;varying vec3 vC;varying float vA;void main(){vec4 t=texture2D(uMap,gl_PointCoord);gl_FragColor=vec4(vC*t.r*vA,1.);}"
    }));
    embers.visible = false; embers.frustumCulled = false; g.add(embers);

    // Flash and shockwave rings
    var flash = glowSprite(new C(8, 6, 4), R * 5, 0); flash.visible = false; g.add(flash);
    var rings = [];
    for (i = 0; i < 3; i++) {
      var ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
        uniforms: { uA: { value: 0 }, uC: { value: [new C(3.5, 2.2, 1.2), new C(1.0, 1.8, 3.5), new C(2.6, 0.9, 2.4)][i] } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: "varying vec2 vUv;void main(){vUv=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: "uniform float uA;uniform vec3 uC;varying vec2 vUv;void main(){float r=length(vUv);float band=smoothstep(0.80,0.97,r)*(1.-smoothstep(0.97,1.,r));float inner=smoothstep(0.3,0.97,r)*0.12*(1.-step(1.,r));gl_FragColor=vec4(uC*(band+inner)*uA,1.);}"
      }));
      ring.rotation.set(Math.PI / 2 + (r() - 0.5) * 0.7, (r() - 0.5) * 0.7, 0); ring.visible = false; g.add(ring); rings.push(ring);
    }
    var blastLight = new THREE.PointLight(new C(1, 0.8, 0.6), 0, R * 30, 2); g.add(blastLight);

    // Kessel-style fireball and smoke (v2): billowing puffs plus soft fire/smoke and spark particles
    var puffs = [];
    for (i = 0; i < 9; i++) {
      var pm = makePuff(); pm.visible = false; pm.renderOrder = 2; g.add(pm);
      var pdir = i === 0 ? new V3() : randDir();
      puffs.push({ m: pm, dir: pdir, v: pdir.clone().multiplyScalar(i === 0 ? 0 : R * rand(1.3, 2.4)), rise: pdir.clone().multiplyScalar(R * 0.25),
        r0: R * (i === 0 ? 0.95 : rand(0.45, 0.65)), r1: R * (i === 0 ? 2.1 : rand(1.1, 1.6)), cool: rand(0.55, 0.85) });
    }
    var soft = particlePool(2600, false, { smokeTint: new C(0.2, 0.18, 0.17) }), glow = particlePool(1800, true);
    soft.points.renderOrder = 3; glow.points.renderOrder = 4;
    g.add(soft.points, glow.points);
    var pv = new V3(), pp = new V3();

    var crack = 0, state = "intact", tB = 0;
    var m4 = new THREE.Matrix4(), pos = new V3(), sc = new V3(), qq = new THREE.Quaternion(), dq = new THREE.Quaternion(), ax = new V3();

    function setCrack(c) { crack = Math.max(0, Math.min(1, c)); pu.uCrack.value = crack; }
    function detonate() {
      if (state === "exploded") return;
      state = "exploded"; tB = 0;
      planet.visible = false; atmo.visible = false;
      core.visible = coreGlow.visible = rocks.visible = embers.visible = flash.visible = true;
      rings.forEach(function (rg) { rg.visible = true; });
      puffs.forEach(function (pf) { pf.m.visible = true; });
      for (var k = 0; k < 500; k++) glow.emit(pp.set(0, 0, 0).addScaledVector(randDir(pv), R * 0.8), randDir(pv).multiplyScalar(R * rand(2.5, 8)), { kind: P_SPARK, life: rand(0.8, 2.2), size: R * 0.035, grow: 0.5, drag: 0.5 });
      for (k = 0; k < 120; k++) soft.emit(pp.set(0, 0, 0).addScaledVector(randDir(pv), R * 0.6), randDir(pv).multiplyScalar(R * rand(0.6, 1.8)), { kind: P_FIRE, life: rand(2, 4), size: R * rand(0.35, 0.7), grow: 2.6, drag: 0.8 });
      g.userData.state = state;
    }
    function reset() {
      state = "intact"; tB = 0; setCrack(0);
      planet.visible = atmo.visible = true; planet.position.set(0, 0, 0);
      core.visible = coreGlow.visible = rocks.visible = embers.visible = flash.visible = false;
      rings.forEach(function (rg) { rg.visible = false; });
      blastLight.intensity = coreLight.intensity = 0; rockU.uHeat.value = 0;
      soft.clear(); glow.clear(); puffs.forEach(function (pf) { pf.m.visible = false; });
      g.userData.state = state;
    }

    g.update = function (dt, t) {
      pu.uTime.value = t; coreU.uTime.value = t;
      if (state === "intact") {
        planet.rotation.y += dt * 0.03;
        var shake = crack > 0.6 ? (crack - 0.6) * 0.5 : 0;
        planet.position.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        return;
      }
      tB += dt;
      // flash: blinding for a moment, then gone
      var fk = Math.exp(-tB * 4.5);
      flash.material.opacity = fk; flash.scale.setScalar(R * (3 + 6 * (1 - Math.exp(-tB * 4))));
      flash.visible = fk > 0.01;
      blastLight.intensity = 60 * Math.exp(-tB * 2.5);
      rings.forEach(function (rg, k) {
        var tt = Math.max(0, tB - k * 0.12), sR = R * 1.1 + 140 * (1 - Math.exp(-tt * (0.9 - k * 0.15)));
        rg.scale.setScalar(sR); rg.material.uniforms.uA.value = Math.exp(-tt * 0.9) * (tt > 0 ? 1 : 0);
        rg.visible = rg.material.uniforms.uA.value > 0.01;
      });
      emberU.uT.value = tB; embers.visible = tB < 9;
      core.scale.setScalar(Math.min(1, 0.3 + tB * 1.5)); core.rotation.y += dt * 0.05;
      coreU.uHeat.value = 1.6 * Math.exp(-tB * 1.2) + 0.85;
      coreGlow.material.opacity = 0.55 + 0.1 * Math.sin(t * 1.7); coreGlow.scale.setScalar(R * 1.4 * core.scale.x);
      coreLight.intensity = 3 + 22 * Math.exp(-tB);
      rockU.uHeat.value = Math.max(0.02, Math.exp(-tB * 0.4));
      for (var i = 0; i < N; i++) {
        var d = rocksData[i];
        var rad = d.r0 + (d.rT - d.r0) * (1 - Math.exp(-tB * d.k));
        var ang = tB * d.orbit;                                      // slow orbital drift
        var ca = Math.cos(ang), sa = Math.sin(ang);
        pos.set(d.dir.x * ca - d.dir.z * sa, d.dir.y + d.tilt * Math.sin(ang * 0.7) * 0.2, d.dir.x * sa + d.dir.z * ca).multiplyScalar(rad);
        ax.copy(d.spin).normalize(); dq.setFromAxisAngle(ax, d.spin.length() * dt * (0.3 + 2.5 * Math.exp(-tB * 0.6)));
        d.q.premultiply(dq); qq.copy(d.q);
        sc.setScalar(d.size * Math.min(1, 0.2 + tB * 2));
        m4.compose(pos, qq, sc); rocks.setMatrixAt(i, m4);
        if (i < 80 && tB < 6 && Math.random() < 0.55) {          // burning trails behind the first 80 rocks
          soft.emit(pos, pv.set(rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.3, 0.3)), { kind: tB < 2.5 ? P_FIRE : P_SMOKE, life: rand(0.8, 1.8), size: Math.max(1.0, d.size * 2.4), grow: 2.4, drag: 1.2 });
        }
      }
      rocks.instanceMatrix.needsUpdate = true;
      puffs.forEach(function (pf) { puffLife(pf, tB * 0.42, R * 0.35, 5); });
      if (tB > 0.8 && tB < 10 && Math.random() < 0.7) {           // lingering smoke clouds
        soft.emit(pp.copy(randDir(pv)).multiplyScalar(R * rand(1.0, 2.6)), pv.multiplyScalar(R * 0.05), { kind: P_SMOKE, life: rand(6, 9), size: R * rand(0.6, 1.2), grow: 2.2, drag: 0.3 });
      }
      soft.update(dt); glow.update(dt);
    };
    g.userData.setCrack = setCrack;
    g.userData.detonate = detonate;
    g.userData.reset = reset;
    g.userData.update = function (dt, t) { g.update(dt, t); };
    g.userData.core = core; g.userData.debris = rocks; g.userData.state = state; g.userData.radius = R;
    return track(g);
  }

  /* ------------------------------------------------------------------ JS noise (terrain) */
  function noise2(seed) {
    var r = rng(seed), P = new Float32Array(512);
    for (var i = 0; i < 512; i++) P[i] = r();
    function h(x, y) { return P[((x * 73856093) ^ (y * 19349663)) & 511]; }
    function n(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
    }
    return function fbm(x, y, oct) {
      var sum = 0, a = 0.5, tot = 0; oct = oct || 5;
      for (var o = 0; o < oct; o++) { sum += a * n(x, y); tot += a; x = x * 2.03 + 17.1; y = y * 2.03 + 3.7; a *= 0.5; }
      return sum / tot;
    };
  }
  function smooth(e0, e1, x) { var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

  /* ------------------------------------------------------------------ floating island */
  var BIOMES = {
    rock:    { top: [0.30, 0.27, 0.24], top2: [0.38, 0.34, 0.3], slope: [0.17, 0.15, 0.14], under: [0.13, 0.11, 0.1], rough: 0.92, glow: [0, 0, 0] },
    grass:   { top: [0.10, 0.26, 0.05], top2: [0.2, 0.32, 0.08], slope: [0.29, 0.21, 0.13], under: [0.15, 0.11, 0.08], rough: 0.95, glow: [0, 0, 0] },
    ice:     { top: [0.82, 0.88, 0.94], top2: [0.7, 0.8, 0.9], slope: [0.32, 0.52, 0.72], under: [0.18, 0.22, 0.3], rough: 0.32, glow: [0.3, 0.8, 1.6] },
    lava:    { top: [0.07, 0.062, 0.058], top2: [0.11, 0.09, 0.08], slope: [0.05, 0.045, 0.04], under: [0.06, 0.05, 0.045], rough: 0.85, glow: [4.5, 1.3, 0.22] },
    crystal: { top: [0.13, 0.1, 0.17], top2: [0.2, 0.15, 0.24], slope: [0.09, 0.07, 0.12], under: [0.08, 0.06, 0.1], rough: 0.7, glow: [0.6, 2.2, 2.6] }
  };
  function makeIsland(opts) {
    opts = opts || {};
    var R = Math.max(4, Math.min(16, opts.radius || 9)), seed = (opts.seed == null ? 1 : opts.seed) | 0;
    var biome = BIOMES[opts.biome] ? opts.biome : "rock", B = BIOMES[biome];
    var g = new THREE.Group(); g.name = "BuilderFX.island." + biome;
    var fbm = noise2(seed * 7 + 3), rr = rng(seed * 13 + 5);

    // craters away from the flat centre
    var craters = [];
    for (var k = 0; k < 4 + (rr() * 4 | 0); k++) {
      var ca = rr() * Math.PI * 2, cd = R * (0.45 + 0.4 * rr());
      craters.push({ x: Math.cos(ca) * cd, z: Math.sin(ca) * cd, r: R * (0.08 + 0.12 * rr()), d: R * (0.025 + 0.035 * rr()) });
    }
    function rimRadius(ang) { return R * (1 + 0.1 * (fbm(Math.cos(ang) * 1.5 + 9, Math.sin(ang) * 1.5 + 4, 3) - 0.5) * 2); }
    // Top surface height. The centre (r < ~0.3R) is flat at y = 0 for the sculpture.
    function heightAt(x, z) {
      var r = Math.sqrt(x * x + z * z) / R;
      var hills = (fbm(x / R * 2.2, z / R * 2.2, 5) - 0.45) * R * 0.22 * smooth(0.28, 0.7, r);
      var crat = 0;
      for (var c = 0; c < craters.length; c++) {
        var C0 = craters[c], dd = Math.sqrt((x - C0.x) * (x - C0.x) + (z - C0.z) * (z - C0.z)) / C0.r;
        if (dd < 1.4) crat += dd < 1 ? -C0.d * (1 - dd * dd) + C0.d * 0.3 * dd * dd * dd * dd : C0.d * 0.3 * Math.max(0, 1 - (dd - 1) / 0.4);
      }
      var edge = -Math.pow(smooth(0.8, 1.02, r), 2) * R * 0.22;
      return hills + crat * smooth(0.2, 0.4, r) + edge;
    }
    function glowAt(x, z, h) {                // lava pools in crater bottoms and cracks; faint ice/crystal veins
      if (biome === "lava") {
        var crack = 1 - Math.abs(fbm(x * 0.9 + 31, z * 0.9 + 7, 4) - 0.5) * 18;
        return Math.max(0, Math.max(crack, 0) * smooth(0.3, 0.5, Math.sqrt(x * x + z * z) / R)) + (h < -R * 0.03 ? smooth(-R * 0.03, -R * 0.06, h) : 0);
      }
      if (biome === "crystal") return Math.max(0, 1 - Math.abs(fbm(x * 0.7 + 11, z * 0.7, 4) - 0.5) * 25) * 0.6;
      if (biome === "ice") return Math.max(0, 1 - Math.abs(fbm(x * 0.6 + 5, z * 0.6 + 2, 4) - 0.5) * 30) * 0.25;
      return 0;
    }

    var S = 112, NT = 34, NB = 40, depth = R * (1.35 + 0.3 * rr());
    var verts = [], glows = [], kind = [];    // kind: 0 top, 1 underside
    verts.push(0, heightAt(0, 0), 0); glows.push(glowAt(0, 0, 0)); kind.push(0);
    for (var ri = 1; ri <= NT; ri++) {
      for (var ci = 0; ci < S; ci++) {
        var ang = ci / S * Math.PI * 2, rr0 = rimRadius(ang) * Math.pow(ri / NT, 0.9);
        var x = Math.cos(ang) * rr0, z = Math.sin(ang) * rr0, y = heightAt(x, z);
        verts.push(x, y, z); glows.push(glowAt(x, z, y)); kind.push(0);
      }
    }
    var rimY = -R * 0.22;
    for (ri = 1; ri < NB; ri++) {
      var u = ri / NB;
      for (ci = 0; ci < S; ci++) {
        ang = ci / S * Math.PI * 2;
        var lump = 1 + 0.28 * (fbm(Math.cos(ang) * 2 + u * 3 + 50, Math.sin(ang) * 2 + u * 2.5, 4) - 0.5) * 2;
        var rad = rimRadius(ang) * Math.pow(1 - u, 0.85) * lump * (1 - 0.06 * Math.sin(u * 30 + ang * 3) * u);   // strata
        verts.push(Math.cos(ang) * rad, rimY - depth * Math.pow(u, 1.15) + (fbm(ang * 2, u * 4, 3) - 0.5) * R * 0.15 * u, Math.sin(ang) * rad);
        glows.push(biome === "lava" ? Math.max(0, 1 - Math.abs(fbm(ang * 3 + 70, u * 6, 4) - 0.5) * 22) * 0.6 : 0); kind.push(1);
      }
    }
    var tipX = (rr() - 0.5) * R * 0.3, tipZ = (rr() - 0.5) * R * 0.3;
    verts.push(tipX, rimY - depth * 1.02, tipZ); glows.push(0); kind.push(1);
    var idx = [], ring = function (r_, c_) { return 1 + (r_ - 1) * S + ((c_ % S) + S) % S; };
    for (ci = 0; ci < S; ci++) idx.push(0, ring(1, ci + 1), ring(1, ci));
    var rows = NT + NB - 1;
    for (ri = 1; ri < rows; ri++) for (ci = 0; ci < S; ci++) {
      var a0 = ring(ri, ci), a1 = ring(ri, ci + 1), b0 = ring(ri + 1, ci), b1 = ring(ri + 1, ci + 1);
      idx.push(a0, a1, b1, a0, b1, b0);
    }
    var tipI = verts.length / 3 - 1;
    for (ci = 0; ci < S; ci++) idx.push(ring(rows, ci), ring(rows, ci + 1), tipI);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // Colours from biome, height, slope and noise
    var nrm = geo.attributes.normal, cols = new Float32Array(verts.length), tmpC = [0, 0, 0];
    function mixc(a, b2, t) { return [a[0] + (b2[0] - a[0]) * t, a[1] + (b2[1] - a[1]) * t, a[2] + (b2[2] - a[2]) * t]; }
    for (var vi = 0; vi < verts.length / 3; vi++) {
      var vx = verts[vi * 3], vy = verts[vi * 3 + 1], vz = verts[vi * 3 + 2], ny = nrm.getY(vi);
      var cc;
      if (kind[vi] === 0) {
        cc = mixc(B.top, B.top2, fbm(vx * 0.5 + 3, vz * 0.5, 4));
        cc = mixc(cc, B.slope, smooth(0.92, 0.6, ny));
        if (biome === "grass" && vy < -R * 0.12) cc = mixc(cc, B.slope, 0.7);
        if (biome === "ice") cc = mixc(cc, B.slope, smooth(0.95, 0.75, ny) * 0.8);
      } else {
        var band = 0.5 + 0.5 * Math.sin(vy * 2.3 + fbm(vx * 0.3, vz * 0.3, 3) * 4);
        cc = mixc(B.under, B.slope, band * 0.5);
        cc = mixc(cc, B.under, 0.3);
      }
      var shade = 0.85 + 0.3 * fbm(vx * 1.7 + 40, vz * 1.7 + vy * 1.3, 3);
      cols[vi * 3] = cc[0] * shade; cols[vi * 3 + 1] = cc[1] * shade; cols[vi * 3 + 2] = cc[2] * shade;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    geo.setAttribute("aGlow", new THREE.Float32BufferAttribute(glows, 1));
    geo.computeBoundingSphere();
    var glowU = { uGlow: { value: new C(B.glow[0], B.glow[1], B.glow[2]) }, uTime: fxTime };
    var mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: B.rough, metalness: biome === "crystal" ? 0.25 : 0.02, envMapIntensity: biome === "ice" ? 1.3 : 0.6 });
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uGlow = glowU.uGlow; sh.uniforms.uTime = glowU.uTime;
      sh.vertexShader = "attribute float aGlow;varying float vGlow;varying vec3 vWp;\n" + sh.vertexShader.replace("#include <begin_vertex>",
        "#include <begin_vertex>\nvGlow=aGlow;vWp=(modelMatrix*vec4(position,1.)).xyz;");
      sh.fragmentShader = "uniform vec3 uGlow;uniform float uTime;varying float vGlow;varying vec3 vWp;\n" + NOISE + "\n" + sh.fragmentShader
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb*=0.82+0.36*bfx_fbm(vWp*2.1);")   // close-up grit
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" +
          "float gp=0.75+0.25*sin(uTime*1.7+vWp.x*0.8+vWp.z*0.6);totalEmissiveRadiance+=uGlow*vGlow*gp*(0.7+0.6*bfx_n(vWp*1.5+uTime*0.2));");
    };
    mat.customProgramCacheKey = function () { return "bfx-island"; };
    var land = new THREE.Mesh(geo, mat); land.name = "terrain"; g.add(land);

    // Props
    function instanced(geo2, mat2, n, place) {
      var im = new THREE.InstancedMesh(geo2, mat2, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new V3(), pv2 = new V3();
      for (var i2 = 0; i2 < n; i2++) { place(i2, pv2, q, sv); im.setMatrixAt(i2, m4.compose(pv2, q, sv)); }
      im.instanceMatrix.needsUpdate = true; g.add(im); return im;
    }
    function spot(minR, maxR) {                // random point on the top, away from the flat centre
      var a2 = rr() * Math.PI * 2, d2 = R * (minR + (maxR - minR) * rr()), x2 = Math.cos(a2) * d2, z2 = Math.sin(a2) * d2;
      return new V3(x2, heightAt(x2, z2), z2);
    }
    var rockMat = new THREE.MeshStandardMaterial({ color: new C(B.slope[0] * 1.3, B.slope[1] * 1.3, B.slope[2] * 1.3), roughness: 0.9, flatShading: true });
    var boulderGeo = new THREE.IcosahedronGeometry(1, 0);
    instanced(boulderGeo, rockMat, 14, function (i2, pv2, q, sv) {
      pv2.copy(spot(0.42, 0.9)); var s2 = R * (0.02 + 0.045 * rr()); sv.set(s2 * (1 + rr() * 0.6), s2 * 0.7, s2);
      pv2.y += s2 * 0.3; q.setFromEuler(new THREE.Euler(rr() * 3, rr() * 3, rr() * 3));
    });
    if (biome === "grass") {
      var treeGeo = new THREE.ConeGeometry(1, 2.6, 7).translate(0, 1.6, 0);
      var trunkGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.6, 5).translate(0, 0.3, 0);
      var pts = []; for (k = 0; k < 18; k++) pts.push(spot(0.45, 0.88));
      var sizes = pts.map(function () { return R * (0.025 + 0.025 * rr()); });
      instanced(treeGeo, new THREE.MeshStandardMaterial({ color: new C(0.04, 0.14, 0.05), roughness: 0.9, flatShading: true }), 18, function (i2, pv2, q, sv) { pv2.copy(pts[i2]); sv.setScalar(sizes[i2]); });
      instanced(trunkGeo, new THREE.MeshStandardMaterial({ color: new C(0.14, 0.08, 0.04), roughness: 0.9 }), 18, function (i2, pv2, q, sv) { pv2.copy(pts[i2]); sv.setScalar(sizes[i2]); });
    }
    if (biome === "ice") {
      var spikeGeo = new THREE.ConeGeometry(0.3, 1, 6).translate(0, 0.5, 0);
      var iceMat = new THREE.MeshStandardMaterial({ color: new C(0.55, 0.75, 0.95), roughness: 0.15, metalness: 0.05, emissive: new C(0.03, 0.08, 0.14), envMapIntensity: 1.6, flatShading: true });
      instanced(spikeGeo, iceMat, 16, function (i2, pv2, q, sv) { pv2.copy(spot(0.6, 0.95)); var s2 = R * (0.06 + 0.08 * rr()); sv.set(s2, s2 * 1.6, s2); q.setFromEuler(new THREE.Euler((rr() - 0.5) * 0.5, 0, (rr() - 0.5) * 0.5)); });
      instanced(spikeGeo, iceMat, 22, function (i2, pv2, q, sv) {           // icicles under the rim
        var a2 = rr() * Math.PI * 2, rad2 = rimRadius(a2) * (0.85 + 0.1 * rr());
        pv2.set(Math.cos(a2) * rad2, -R * 0.24, Math.sin(a2) * rad2); var s2 = R * (0.03 + 0.04 * rr()); sv.set(s2, s2 * 3, s2); q.setFromEuler(new THREE.Euler(Math.PI, 0, 0));
      });
    }
    if (biome === "crystal") {
      var crGeo = new THREE.OctahedronGeometry(1, 0).scale(0.35, 1.6, 0.35).translate(0, 1.2, 0);
      var crPal = [new C(0.4, 1.8, 2.2), new C(1.8, 0.5, 2.2), new C(0.7, 0.6, 2.4)];
      var crMat = new THREE.MeshStandardMaterial({ color: new C(0.35, 0.3, 0.45), roughness: 0.1, metalness: 0.1, emissive: new C(1, 1, 1), envMapIntensity: 1.8, flatShading: true });
      var crys = instanced(crGeo, crMat, 30, function (i2, pv2, q, sv) {
        pv2.copy(spot(0.4, 0.92)); var s2 = R * (0.025 + 0.045 * rr()); sv.setScalar(s2);
        q.setFromEuler(new THREE.Euler((rr() - 0.5) * 0.9, rr() * 3, (rr() - 0.5) * 0.9));
      });
      crMat.emissive.setRGB(0.5, 0.5, 0.5);
      for (k = 0; k < 30; k++) crys.setColorAt(k, crPal[k % 3]);
      crys.instanceColor.needsUpdate = true;
    }
    if (biome === "lava") {
      craters.forEach(function (C0) { var gs = glowSprite(new C(1.6, 0.45, 0.08), C0.r * 2.4, 0.55); gs.position.set(C0.x, heightAt(C0.x, C0.z) + 0.2, C0.z); g.add(gs); });
    }
    // Hanging debris under the island
    var hang = [];
    for (k = 0; k < 7; k++) {
      var hm = new THREE.Mesh(boulderGeo, rockMat), ha = rr() * Math.PI * 2, hd = R * (0.3 + 0.6 * rr());
      var hs = R * (0.03 + 0.06 * rr());
      hm.scale.set(hs * 1.3, hs, hs); hm.position.set(Math.cos(ha) * hd, -R * (0.45 + 0.9 * rr()) - depth * 0.2 * rr(), Math.sin(ha) * hd);
      hm.rotation.set(rr() * 3, rr() * 3, 0); g.add(hm);
      hang.push({ m: hm, y0: hm.position.y, ph: rr() * 6, sp: 0.3 + rr() * 0.4 });
    }
    g.update = function (dt, t) {
      hang.forEach(function (H) { H.m.position.y = H.y0 + Math.sin(t * H.sp + H.ph) * R * 0.02; H.m.rotation.y += dt * 0.1; });
    };
    g.userData.heightAt = heightAt;
    g.userData.radius = R;
    g.userData.biome = biome;
    g.userData.triangles = idx.length / 3;
    return track(g);
  }

  /* ------------------------------------------------------------------ asteroid belt */
  // A displaced rock: 3D value-noise lumps plus a few craters (JS, so normals are real).
  function rockGeometry(seed, detail, roughness, craterCount) {
    var geo = new THREE.IcosahedronGeometry(1, detail), r = rng(seed), P = new Float32Array(256);
    for (var i = 0; i < 256; i++) P[i] = r();
    function h(x, y, z) { return P[((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & 255]; }
    function n3(x, y, z) {
      var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
      function L(a, b, t) { return a + (b - a) * t; }
      return L(L(L(h(xi, yi, zi), h(xi + 1, yi, zi), u), L(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
               L(L(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), L(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
    }
    var craters = [];
    for (i = 0; i < craterCount; i++) craters.push({ d: randDir(new V3()).set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize(), s: 0.15 + 0.3 * r(), k: 0.06 + 0.1 * r() });
    var stretch = new V3(1 + 0.5 * r(), 0.65 + 0.3 * r(), 0.8 + 0.4 * r());
    var pos = geo.attributes.position, v = new V3(), cache = {};
    for (i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      var key = v.x.toFixed(4) + "," + v.y.toFixed(4) + "," + v.z.toFixed(4);
      if (!cache[key]) {
        var d = v.clone().normalize(), f = 0, a = 0.5, fr = 1.4;
        for (var o = 0; o < 5; o++) { f += a * (n3(d.x * fr + 9, d.y * fr + 3, d.z * fr + 5) - 0.5); fr *= 2.1; a *= 0.5; }
        var rad = 1 + f * roughness;
        craters.forEach(function (c) {
          var t = d.angleTo(c.d) / c.s;
          if (t < 1.3) rad += t < 1 ? -c.k * (1 - t * t) : c.k * 0.35 * (1.3 - t) / 0.3;   // bowl and raised rim
        });
        cache[key] = d.multiply(stretch).multiplyScalar(rad);
      }
      pos.setXYZ(i, cache[key].x, cache[key].y, cache[key].z);
    }
    if (geo.index) geo = geo.toNonIndexed();
    geo.computeVertexNormals();   // smooth-ish via shared positions; flat facets read as rock at a distance
    return geo;
  }
  function rockMaterial(spin) {
    var m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.02, envMapIntensity: 0.4 });
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uTime = fxTime;
      var rot = "vec3 bfxRot(vec3 p,vec3 ax,float a){return p*cos(a)+cross(ax,p)*sin(a)+ax*dot(ax,p)*(1.-cos(a));}\n";
      sh.vertexShader = "uniform float uTime;varying vec3 vObjP;\n" + (spin ? "attribute vec4 aSpin;\n" : "") + rot + sh.vertexShader
        .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\n" + (spin ? "objectNormal=bfxRot(objectNormal,normalize(aSpin.xyz),uTime*aSpin.w);" : ""))
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjP=position;\n" + (spin ? "transformed=bfxRot(transformed,normalize(aSpin.xyz),uTime*aSpin.w);" : ""));
      sh.fragmentShader = "varying vec3 vObjP;\n" + NOISE + "\n" + sh.fragmentShader.replace("#include <color_fragment>",
        "#include <color_fragment>\nfloat g1=bfx_fbm(vObjP*3.1);float g2=bfx_n(vObjP*14.);" +
        "vec3 rockA=vec3(0.16,0.14,0.13),rockB=vec3(0.28,0.25,0.22),rust=vec3(0.32,0.18,0.1);" +
        "vec3 rc=mix(rockA,rockB,g1);rc=mix(rc,rust,smoothstep(0.62,0.8,bfx_fbm(vObjP*1.3+7.))*0.6);" +
        "diffuseColor.rgb*=rc*(0.75+0.5*g2);");
    };
    m.customProgramCacheKey = function () { return spin ? "bfx-rock-spin" : "bfx-rock"; };
    return m;
  }
  // Instanced belt in [inner, outer], leaving [clearInner, clearOuter] empty (the level ring and lanes).
  function makeAsteroidBelt(opts) {
    opts = opts || {};
    var count = opts.count || 2400, inner = opts.inner != null ? opts.inner : 40, outer = opts.outer != null ? opts.outer : 375;
    var cIn = opts.clearInner != null ? opts.clearInner : 120, cOut = opts.clearOuter != null ? opts.clearOuter : 215;
    var thick = opts.thickness != null ? opts.thickness : (outer - inner) * 0.06, seed = opts.seed || 11, r = rng(seed);
    var g = new THREE.Group(); g.name = "BuilderFX.asteroidBelt";
    var variants = [rockGeometry(seed, 2, 0.55, 3), rockGeometry(seed + 1, 2, 0.75, 2), rockGeometry(seed + 2, 1, 0.45, 4)];
    var mat = rockMaterial(true);
    var per = Math.ceil(count / variants.length), placed = 0, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new V3(), pv = new V3();
    // area-weighted radius in the allowed bands only
    var bands = [[inner, Math.min(cIn, outer)], [Math.max(cOut, inner), outer]].filter(function (b) { return b[1] > b[0]; });
    var areas = bands.map(function (b) { return b[1] * b[1] - b[0] * b[0]; }), total = areas.reduce(function (a, b) { return a + b; }, 0);
    function radius() {
      var x = r() * total, k = 0; while (k < bands.length - 1 && x > areas[k]) { x -= areas[k]; k++; }
      var b = bands[k]; return Math.sqrt(b[0] * b[0] + r() * (b[1] * b[1] - b[0] * b[0]));
    }
    variants.forEach(function (vg, vi) {
      var n = Math.min(per, count - placed); if (n <= 0) return;
      var spin = new Float32Array(n * 4);
      var im = new THREE.InstancedMesh(vg, mat, n);
      for (var i = 0; i < n; i++) {
        var rad = radius(), ang = r() * Math.PI * 2;
        var gy = (r() + r() + r() - 1.5) / 1.5;                 // roughly gaussian height
        pv.set(Math.cos(ang) * rad, gy * thick * (0.6 + 0.4 * rad / outer), Math.sin(ang) * rad);
        var sz = 0.25 + Math.pow(r(), 3.2) * 4.5;               // mostly pebbles, a few boulders
        sv.set(sz, sz, sz); q.setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6));
        im.setMatrixAt(i, m4.compose(pv, q, sv));
        var ax = new V3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
        spin[i * 4] = ax.x; spin[i * 4 + 1] = ax.y; spin[i * 4 + 2] = ax.z; spin[i * 4 + 3] = (0.05 + 0.4 * r()) / Math.sqrt(sz);
      }
      vg.setAttribute("aSpin", new THREE.InstancedBufferAttribute(spin, 4));
      im.instanceMatrix.needsUpdate = true;
      im.frustumCulled = false;
      g.add(im); placed += n;
    });
    // Hero asteroids: a few big, detailed rocks (never inside the clear ring)
    var heroes = [], heroCount = opts.heroes != null ? opts.heroes : 6, heroMat = rockMaterial(false);
    for (var h = 0; h < heroCount; h++) {
      var hg = rockGeometry(seed * 7 + h, 9, 0.6, 7);   // ~2k triangles each
      var hm = new THREE.Mesh(hg, heroMat), hr = radius(), ha = r() * Math.PI * 2, hs = 8 + 14 * r();
      hm.position.set(Math.cos(ha) * hr, (r() - 0.5) * thick, Math.sin(ha) * hr); hm.scale.setScalar(hs);
      hm.rotation.set(r() * 6, r() * 6, r() * 6); g.add(hm);
      heroes.push({ m: hm, ax: new V3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), w: 0.02 + 0.04 * r() });
    }
    var orbit = opts.orbitSpeed != null ? opts.orbitSpeed : 0.004, dq = new THREE.Quaternion();
    g.update = function (dt) {
      g.rotation.y += dt * orbit;                                 // the whole belt drifts slowly
      heroes.forEach(function (H) { dq.setFromAxisAngle(H.ax, H.w * dt); H.m.quaternion.premultiply(dq); });
    };
    g.userData.count = placed; g.userData.heroes = heroes.map(function (H) { return H.m; });
    g.userData.clear = [cIn, cOut];
    return track(g);
  }

  /* ------------------------------------------------------------------ distant planets */
  function makeDistantPlanet(opts) {
    opts = opts || {};
    var seed = (opts.seed == null ? 1 : opts.seed) | 0, r = rng(seed * 31 + 7), RAD = opts.radius || 60;
    var type = opts.type || ["gas", "rocky", "ice", "gas"][seed % 4];
    var palettes = {
      gas: [[0.5, 0.32, 0.18], [0.75, 0.6, 0.42], [0.3, 0.16, 0.1]],
      rocky: [[0.28, 0.24, 0.22], [0.45, 0.38, 0.32], [0.16, 0.14, 0.13]],
      ice: [[0.55, 0.68, 0.8], [0.8, 0.88, 0.95], [0.3, 0.42, 0.6]]
    };
    var pal = palettes[type] || palettes.rocky;
    if (type === "gas" && r() < 0.5) pal = [[0.22, 0.3, 0.55], [0.5, 0.6, 0.8], [0.12, 0.15, 0.3]];   // blue giant
    var g = new THREE.Group(); g.name = "BuilderFX.distantPlanet." + type;
    var U = { uSun: { value: SUN_DIR.clone() }, uA: { value: new C(pal[0][0], pal[0][1], pal[0][2]) }, uB: { value: new C(pal[1][0], pal[1][1], pal[1][2]) },
      uC: { value: new C(pal[2][0], pal[2][1], pal[2][2]) }, uType: { value: type === "gas" ? 0 : type === "ice" ? 2 : 1 }, uSeed: { value: r() * 50 }, uTime: fxTime };
    var body = new THREE.Mesh(new THREE.SphereGeometry(RAD, 64, 40), new THREE.ShaderMaterial({
      uniforms: U, fog: false,
      vertexShader: "varying vec3 vP;varying vec3 vNw;void main(){vP=normalize(position);vNw=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: NOISE + "\nuniform vec3 uSun;uniform vec3 uA;uniform vec3 uB;uniform vec3 uC;uniform float uType;uniform float uSeed;uniform float uTime;varying vec3 vP;varying vec3 vNw;" +
        "void main(){vec3 P=vP;vec3 col;" +
        "if(uType<0.5){float w=bfx_fbm(P*vec3(2.,6.,2.)+uSeed+vec3(uTime*0.004,0.,0.));float b=sin(P.y*22.+w*5.)*0.5+0.5;float b2=sin(P.y*7.+w*3.+uSeed)*0.5+0.5;" +
        "col=mix(uA,uB,b);col=mix(col,uC,b2*0.5);float storm=smoothstep(0.08,0.0,length(P-normalize(vec3(0.6,-0.25,0.75))));col=mix(col,uC*1.2,storm*0.8);}" +
        "else{float h=bfx_fbm(P*3.+uSeed);vec2 cc=bfx_cell(P*6.+uSeed);float crater=smoothstep(0.12,0.0,cc.x)*0.4;col=mix(uC,uB,smoothstep(0.35,0.7,h));col=mix(col,uA,crater);" +
        "if(uType>1.5)col=mix(col,vec3(0.95),smoothstep(0.6,0.9,abs(P.y)));}" +
        "float l=dot(normalize(vNw),uSun);float lit=smoothstep(-0.15,0.6,l);col*=0.06+0.9*lit;gl_FragColor=vec4(col,1.);}"
    }));
    g.add(body);
    var atmoCol = type === "gas" ? new C(pal[1][0] * 0.8, pal[1][1] * 0.8, pal[1][2]) : type === "ice" ? new C(0.4, 0.6, 1.0) : new C(0.3, 0.35, 0.45);
    var atmo = new THREE.Mesh(new THREE.SphereGeometry(RAD * 1.04, 48, 32), new THREE.ShaderMaterial({
      uniforms: { uSun: U.uSun, uC: { value: atmoCol } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
      vertexShader: "varying vec3 vN;varying vec3 vW;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
      fragmentShader: "uniform vec3 uSun;uniform vec3 uC;varying vec3 vN;varying vec3 vW;void main(){vec3 V=normalize(cameraPosition-vW);float f=pow(1.-abs(dot(vN,V)),3.);float lit=smoothstep(-0.3,0.5,dot(-vN,uSun));gl_FragColor=vec4(uC*f*lit*0.8,1.);}"
    }));
    g.add(atmo);
    if (opts.ring != null ? opts.ring : type === "gas" && r() < 0.7) {
      var rg = new THREE.RingGeometry(RAD * 1.35, RAD * 2.3, 128, 1);
      var ringMat = new THREE.ShaderMaterial({
        uniforms: { uSun: U.uSun, uA: U.uB, uSeed: U.uSeed, uIn: { value: RAD * 1.35 }, uOut: { value: RAD * 2.3 }, uR: { value: RAD } },
        transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
        vertexShader: "varying vec3 vL;varying vec3 vW;varying vec3 vCtr;void main(){vL=position;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vCtr=(modelMatrix*vec4(0.,0.,0.,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
        fragmentShader: "uniform vec3 uSun;uniform vec3 uA;uniform float uSeed;uniform float uIn;uniform float uOut;uniform float uR;varying vec3 vL;varying vec3 vW;varying vec3 vCtr;" +
          "float h1(float x){return fract(sin(x*127.1+uSeed)*43758.5);}void main(){float d=(length(vL.xy)-uIn)/(uOut-uIn);float i=floor(d*60.);float bands=mix(h1(i),h1(i+1.),fract(d*60.));" +
          "float a=bands*smoothstep(0.,0.05,d)*smoothstep(1.,0.9,d)*0.75;" +
          "vec3 c=vec3(0.,0.,0.);vec3 toP=vW-vCtr;float along=dot(toP,uSun);vec3 perp=toP-uSun*along;float shadow=(along<0.&&length(perp)<uR)?0.15:1.;" +
          "gl_FragColor=vec4(uA*0.9*shadow,a);}"
      });
      var ringM = new THREE.Mesh(rg, ringMat); ringM.rotation.x = -Math.PI / 2 + (r() - 0.5) * 0.6; ringM.rotation.y = (r() - 0.5) * 0.4; g.add(ringM);
    }
    body.rotation.z = (r() - 0.5) * 0.5;
    g.update = function (dt) { body.rotation.y += dt * 0.01; };
    g.userData.type = type;
    return track(g);
  }

  /* ------------------------------------------------------------------ backdrop */
  function makeSpaceBackdrop(opts) {
    opts = opts || {};
    var RAD = opts.radius || 2400;
    var g = new THREE.Group(); g.name = "BuilderFX.backdrop";
    var skyU = { uSun: { value: SUN_DIR.clone() }, uTime: { value: 0 } };
    var sky = new THREE.Mesh(new THREE.SphereGeometry(RAD, 64, 32), new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: "varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: NOISE + "\nuniform vec3 uSun;varying vec3 vD;void main(){vec3 d=normalize(vD);" +
        "vec3 q=vec3(bfx_fbm(d*2.1),bfx_fbm(d*2.1+5.2),bfx_fbm(d*2.1+9.7));float n=bfx_fbm(d*2.4+q*1.6);" +
        "float n2=bfx_fbm(d*5.+q*2.+3.);float lanes=smoothstep(0.42,0.6,bfx_fbm(d*6.+q));" +
        "vec3 purple=vec3(0.26,0.05,0.38),teal=vec3(0.0,0.26,0.30),pink=vec3(0.45,0.08,0.22);" +
        "vec3 c=vec3(0.003,0.004,0.010);float neb=smoothstep(0.38,0.75,n);" +
        "c+=mix(purple,teal,smoothstep(0.35,0.65,q.x))*neb*0.75;c+=pink*smoothstep(0.62,0.85,n2)*neb*0.45;" +
        "c*=1.-0.75*lanes*neb;float s=max(dot(d,uSun),0.);c+=vec3(0.9,0.55,0.3)*pow(s,24.)*0.35+vec3(0.25,0.15,0.1)*pow(s,4.)*0.12;" +
        "gl_FragColor=vec4(c,1.);}"
    }));
    sky.renderOrder = -10; sky.frustumCulled = false; g.add(sky);

    var S = opts.stars || 7000, sp = new Float32Array(S * 3), sa = new Float32Array(S * 4), r = rng(42), dv = new V3();
    for (var i = 0; i < S; i++) {
      dv.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1); if (dv.lengthSq() > 1 || dv.lengthSq() < 0.01) { i--; continue; }
      dv.normalize().multiplyScalar(RAD * 0.96); sp[i * 3] = dv.x; sp[i * 3 + 1] = dv.y; sp[i * 3 + 2] = dv.z;
      var b = Math.pow(r(), 6);                                                          // a few bright ones
      sa[i * 4] = 0.25 + 3.2 * b; sa[i * 4 + 1] = r(); sa[i * 4 + 2] = 0.6 + r() * 3; sa[i * 4 + 3] = r();
    }
    var sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3)); sg.setAttribute("aS", new THREE.BufferAttribute(sa, 4));
    var starU = { uTime: skyU.uTime, uScale: { value: (typeof window !== "undefined" && window.devicePixelRatio) || 1 } };
    var stars = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: starU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: "uniform float uTime;uniform float uScale;attribute vec4 aS;varying vec3 vC;void main(){" +
        "float tw=0.65+0.35*sin(uTime*aS.z+aS.w*30.);vec3 tint=mix(vec3(0.7,0.8,1.3),vec3(1.3,0.95,0.7),aS.y);vC=tint*aS.x*tw;" +
        "gl_PointSize=(1.2+1.8*min(aS.x,2.))*uScale;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: "varying vec3 vC;void main(){vec2 p=gl_PointCoord*2.-1.;float a=max(0.,1.-dot(p,p));gl_FragColor=vec4(vC*a*a,1.);}"
    }));
    stars.renderOrder = -9; stars.frustumCulled = false; g.add(stars);

    var sun = glowSprite(new C(7, 5, 3.4), 520, 1); sun.position.copy(SUN_DIR).multiplyScalar(RAD * 0.9); sun.renderOrder = -8; g.add(sun);
    var halo = glowSprite(new C(1.0, 0.55, 0.3), 1700, 0.55); halo.position.copy(sun.position); halo.renderOrder = -8; g.add(halo);
    [sun, halo].forEach(function (s) { s.material.fog = false; });

    g.update = function (dt, t) { skyU.uTime.value = t; };
    g.userData.sunDirection = SUN_DIR.clone();
    return track(g);
  }

  /* ------------------------------------------------------------------ effects */
  function effectBase(name) {
    var e = new THREE.Group(); e.name = name; e.userData.t = 0; e.userData.playing = false;
    return e;
  }
  function startEffect(e) { e.userData.playing = true; live.add(e); }

  function laserMaterial(color, core) {        // additive bolt shader: hot core, soft falloff, flicker
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: col(color) }, uAlpha: { value: 1 }, uTime: fxTime, uSeed: { value: Math.random() * 10 }, uCore: { value: core ? 1 : 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "varying vec3 vN;varying vec3 vV;varying float vY;void main(){vY=position.y;vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}",
      fragmentShader: "uniform vec3 uColor;uniform float uAlpha;uniform float uTime;uniform float uSeed;uniform float uCore;varying vec3 vN;varying vec3 vV;varying float vY;" +
        "void main(){float f=abs(dot(vN,vV));float prof=uCore>0.5?pow(f,0.8):pow(f,2.4);float ends=smoothstep(0.0,0.18,vY)*smoothstep(1.0,0.75,vY);" +
        "float fl=0.85+0.15*sin(uTime*90.+uSeed*20.+vY*12.);gl_FragColor=vec4(uColor*prof*ends*fl*uAlpha,1.);}"
    });
  }

  function makeTracer(color) {
    var c = col(color || 0xffffff);
    var e = effectBase("BuilderFX.tracer");
    var core = new THREE.Mesh(unitCyl, laserMaterial(new C(6, 6, 6).add(scaled(c, 3)), true)); core.scale.set(0.035, 1, 0.035);
    var glow = new THREE.Mesh(unitCyl, laserMaterial(scaled(c, 2.4), false)); glow.scale.set(0.17, 1, 0.17);
    var outer = new THREE.Mesh(unitCyl, laserMaterial(scaled(c, 0.7), false)); outer.scale.set(0.4, 1, 0.4);
    var head = glowSprite(scaled(c, 2.5).add(new C(1.5, 1.5, 1.5)), 1.2, 1);
    var muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex(), color: scaled(c, 3).add(new C(2, 2, 2)), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    muzzle.scale.setScalar(1.3);
    e.add(core, glow, outer, head, muzzle);
    var from = new V3(), to = new V3(), dir = new V3(), dur = 0.15, L = 1, a = new V3(), b = new V3(), BOLT = 2.6;
    e.userData.play = function (f, t) {
      from.copy(f); to.copy(t); L = from.distanceTo(to); dir.subVectors(to, from).divideScalar(Math.max(L, 1e-4));
      dur = Math.max(0.06, L / 160); muzzle.position.copy(from); muzzle.material.rotation = Math.random() * 3;
      e.userData.t = 0; startEffect(e); e.update(0);
      return e;
    };
    e.update = function (dt) {
      var u = e.userData; u.t += dt; var k = Math.min(1, u.t / dur);
      var dHead = k * L;
      b.copy(from).addScaledVector(dir, dHead); a.copy(from).addScaledVector(dir, Math.max(0, dHead - BOLT));
      stretch(core, a, b); stretch(glow, a, b); stretch(outer, a, b); head.position.copy(b);
      muzzle.material.opacity = Math.max(0, 1 - u.t / 0.08); muzzle.scale.setScalar(0.8 + 2.5 * Math.min(1, u.t / 0.08));
      if (k >= 1) {
        var fade = Math.min(1, (u.t - dur) / 0.05);
        [core, glow, outer].forEach(function (m) { m.material.uniforms.uAlpha.value = 1 - fade; });
        head.material.opacity = 1 - fade;
        if (!u.arrived) { u.arrived = true; if (u.onArrive) u.onArrive(to.clone()); }
        if (fade >= 1) finish(e);
      }
    };
    return e;
  }

  var fragGeo = null;
  function makeImpact(color) {
    var c = col(color || 0xffffff);
    var e = effectBase("BuilderFX.impact");
    if (!fragGeo) fragGeo = shared(roundedBoxGeometry(0.22, 0.04, 1));
    var F = 16;
    var fm = new THREE.MeshStandardMaterial({ color: scaled(c, 0.7), emissive: scaled(c, 2.2), roughness: 0.3, metalness: 0.1, transparent: true });
    var frags = new THREE.InstancedMesh(fragGeo, fm, F); frags.frustumCulled = false; e.add(frags);
    var flash = glowSprite(scaled(c, 3).add(new C(3, 3, 3)), 3.2, 1); e.add(flash);
    var ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex(), color: scaled(c, 2.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    e.add(ring);
    // streak sparks: line segments drawn along their velocity (hot white heads, colour tails)
    var SP = 48, sp = new Float32Array(SP * 6), sc = new Float32Array(SP * 6), spV = [], spP = [];
    var sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3).setUsage(THREE.DynamicDrawUsage));
    sGeo.setAttribute("color", new THREE.BufferAttribute(sc, 3).setUsage(THREE.DynamicDrawUsage));
    var sparks = new THREE.LineSegments(sGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    sparks.frustumCulled = false; e.add(sparks);
    var puffs = particlePool(40, false); e.add(puffs.points);
    var data = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new V3(), dur = 0.9, tmp = new V3();
    e.userData.play = function (f, t) {
      e.position.copy(t);
      var back = new V3().subVectors(f, t).normalize();                    // debris kicks back towards the shooter
      for (var i = 0; i < F; i++) {
        var v = randDir().addScaledVector(back, 0.7).normalize().multiplyScalar(4 + 8 * Math.random());
        data.push({ v: v, p: new V3(), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, 0)), spin: randDir(), s: 0.5 + 0.9 * Math.random() });
      }
      for (i = 0; i < SP; i++) { spV.push(randDir().addScaledVector(back, 0.5).normalize().multiplyScalar(10 + 22 * Math.random())); spP.push(new V3()); }
      for (i = 0; i < 6; i++) puffs.emit(tmp.set(0, 0, 0), randDir().multiplyScalar(rand(1, 3)), { kind: P_FIRE, life: rand(0.35, 0.6), size: rand(0.6, 1.0), grow: 2.2, drag: 3 });
      for (i = 0; i < 5; i++) puffs.emit(tmp.set(0, 0, 0), randDir().addScaledVector(back, 0.5).multiplyScalar(rand(0.8, 2)), { kind: P_SMOKE, life: rand(0.8, 1.3), size: rand(0.6, 1.1), grow: 2.5, drag: 2 });
      e.userData.t = 0; startEffect(e); e.update(0); return e;
    };
    e.update = function (dt) {
      var u = e.userData; u.t += dt; var k = Math.min(1, u.t / dur);
      var drag = Math.exp(-dt * 3.5);
      for (var i = 0; i < F; i++) {
        var d = data[i]; d.v.multiplyScalar(drag); d.p.addScaledVector(d.v, dt);
        q.setFromAxisAngle(d.spin, dt * 9); d.q.premultiply(q);
        s3.setScalar(d.s * (1 - k * k)); m4.compose(d.p, d.q, s3); frags.setMatrixAt(i, m4);
      }
      frags.instanceMatrix.needsUpdate = true; fm.opacity = 1 - k;
      fm.emissive.copy(c).multiplyScalar(2.2 * (1 - k) + 0.3);
      var sk = Math.max(0, 1 - u.t / 0.5);
      for (i = 0; i < SP; i++) {
        spV[i].multiplyScalar(Math.exp(-dt * 4)); spP[i].addScaledVector(spV[i], dt);
        var j = i * 6;
        sp[j] = spP[i].x; sp[j + 1] = spP[i].y; sp[j + 2] = spP[i].z;
        sp[j + 3] = spP[i].x - spV[i].x * 0.025; sp[j + 4] = spP[i].y - spV[i].y * 0.025; sp[j + 5] = spP[i].z - spV[i].z * 0.025;
        sc[j] = 4 * sk; sc[j + 1] = 3.4 * sk; sc[j + 2] = 2.6 * sk;                 // white-hot head
        sc[j + 3] = c.r * 2 * sk; sc[j + 4] = c.g * 2 * sk; sc[j + 5] = c.b * 2 * sk;  // coloured tail
      }
      sGeo.attributes.position.needsUpdate = true; sGeo.attributes.color.needsUpdate = true;
      puffs.update(dt);
      flash.material.opacity = Math.exp(-u.t * 16); flash.scale.setScalar(1.5 + 2.5 * Math.min(1, u.t * 10));
      ring.scale.setScalar(0.5 + 4.5 * Math.sqrt(Math.min(1, u.t / 0.6))); ring.material.opacity = Math.pow(Math.max(0, 1 - u.t / 0.6), 2);
      if (k >= 1 && puffs.count() === 0) { puffs.dispose(); finish(e); }
    };
    return e;
  }

  function makeHammerImpact() {
    var e = effectBase("BuilderFX.hammerImpact");
    var hot = new C(3.6, 2.2, 1.1);
    var shell = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), beamMaterial(new C(2.4, 1.6, 1.0), 0.0));
    shell.material.fragmentShader = "uniform vec3 uColor;uniform float uAlpha;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(vN,vV)),2.5);gl_FragColor=vec4(uColor*f*uAlpha,1.);}";
    e.add(shell);
    var disc = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: { uA: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "varying vec2 vUv;void main(){vUv=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: "uniform float uA;varying vec2 vUv;void main(){float r=length(vUv);float band=smoothstep(0.7,0.96,r)*(1.-smoothstep(0.96,1.,r));gl_FragColor=vec4(vec3(3.,2.,1.2)*band*uA,1.);}"
    }));
    e.add(disc);
    var flash = glowSprite(new C(8, 6, 4), 6, 1); e.add(flash);
    var light = new THREE.PointLight(new C(1, 0.7, 0.4), 0, 40, 2); e.add(light);
    var chunks = new THREE.InstancedMesh(shared(new THREE.IcosahedronGeometry(0.18, 0)), new THREE.MeshStandardMaterial({ color: 0x332a24, emissive: new C(2.5, 0.9, 0.2), flatShading: true, transparent: true }), 26);
    chunks.frustumCulled = false; e.add(chunks);
    var data = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new V3(), dur = 1.1;
    e.userData.play = function (f, t) {
      e.position.copy(t);
      var n = new V3().subVectors(f || t.clone().add(new V3(0, 0, 1)), t).normalize();
      disc.quaternion.setFromUnitVectors(new V3(0, 0, 1), n);
      for (var i = 0; i < 26; i++) data.push({ p: new V3(), v: new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(6 + 12 * Math.random()), q: new THREE.Quaternion(), ax: new V3(Math.random(), Math.random(), Math.random()).normalize(), s: 0.6 + Math.random() * 1.4 });
      e.userData.t = 0; startEffect(e); e.update(0); return e;
    };
    e.update = function (dt) {
      var u = e.userData; u.t += dt; var k = Math.min(1, u.t / dur);
      shell.scale.setScalar(0.5 + 6 * (1 - Math.pow(1 - k, 3))); shell.material.uniforms.uAlpha.value = Math.pow(1 - k, 2);
      disc.scale.setScalar(0.5 + 9 * (1 - Math.pow(1 - k, 2.2))); disc.material.uniforms.uA.value = 1 - k;
      flash.material.opacity = Math.exp(-u.t * 10); flash.scale.setScalar(3 + 6 * Math.min(1, u.t * 8));
      light.intensity = 25 * Math.exp(-u.t * 6);
      var drag = Math.exp(-dt * 2.5);
      for (var i = 0; i < data.length; i++) {
        var d = data[i]; d.v.multiplyScalar(drag); d.p.addScaledVector(d.v, dt);
        q.setFromAxisAngle(d.ax, dt * 8); d.q.premultiply(q); s3.setScalar(d.s * (1 - k)); m4.compose(d.p, d.q, s3); chunks.setMatrixAt(i, m4);
      }
      chunks.instanceMatrix.needsUpdate = true; chunks.material.opacity = 1 - k * k;
      chunks.material.emissive.setRGB(2.5 * (1 - k), 0.9 * (1 - k), 0.2 * (1 - k));
      if (k >= 1) finish(e);
    };
    return e;
  }

  function makeHammerShot() {
    var e = effectBase("BuilderFX.hammerShot");
    var slug = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), new THREE.MeshBasicMaterial({ color: new C(4, 3, 1.8), toneMapped: false }));
    var glow = glowSprite(new C(3.0, 1.8, 0.8), 2.6, 1);
    var r1 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 32), additive(new C(3, 1.6, 0.6)));
    var r2 = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.025, 8, 32), additive(new C(1.6, 0.9, 0.4)));
    var trail = new THREE.Mesh(unitCyl, beamMaterial(new C(2.2, 1.2, 0.5), 1.4)); trail.scale.set(0.28, 1, 0.28);
    var head = new THREE.Group(); head.add(slug, glow, r1, r2); e.add(head, trail);
    var from = new V3(), to = new V3(), dir = new V3(), dur = 0.5, tail = new V3();
    e.userData.play = function (f, t) {
      from.copy(f); to.copy(t); dir.subVectors(to, from).normalize(); dur = Math.max(0.2, from.distanceTo(to) / 55);
      head.quaternion.setFromUnitVectors(new V3(0, 0, 1), dir); e.userData.t = 0; startEffect(e); e.update(0); return e;
    };
    e.update = function (dt) {
      var u = e.userData; u.t += dt; var k = Math.min(1, u.t / dur);
      head.position.lerpVectors(from, to, k);
      r1.rotation.z += dt * 14; r2.rotation.z -= dt * 9; r1.scale.setScalar(1 + 0.15 * Math.sin(u.t * 40));
      tail.lerpVectors(from, to, Math.max(0, k - 0.25)); stretch(trail, tail, head.position);
      if (k >= 1) {
        var hit = makeHammerImpact();
        if (e.parent) e.parent.add(hit);
        hit.userData.play(from, to);
        if (u.onImpact) u.onImpact(to.clone(), hit);
        finish(e);
      }
    };
    return e;
  }

  function makePurgeBeam(color) {
    var c = col(color || 0xffffff);
    var e = effectBase("BuilderFX.purgeBeam");
    var core = new THREE.Mesh(unitCyl, beamMaterial(scaled(c, 5).add(new C(2, 2, 2)), 0.5)); core.scale.set(0.09, 1, 0.09);
    var glow = new THREE.Mesh(unitCyl, beamMaterial(scaled(c, 1.8), 2.2)); glow.scale.set(0.45, 1, 0.45);
    var spiral = new THREE.Mesh(unitCyl, new THREE.ShaderMaterial({
      uniforms: { uColor: { value: scaled(c, 2.5) }, uT: { value: 0 }, uAlpha: { value: 1 }, uLen: { value: 10 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: "uniform vec3 uColor;uniform float uT;uniform float uAlpha;uniform float uLen;varying vec2 vUv;void main(){float s=fract(vUv.x*2.+vUv.y*uLen*0.35-uT*4.);float band=smoothstep(0.0,0.08,s)*(1.-smoothstep(0.08,0.2,s));gl_FragColor=vec4(uColor*band*uAlpha*0.8,1.);}"
    }));
    spiral.scale.set(0.3, 1, 0.3);
    var muzzle = glowSprite(scaled(c, 3).add(new C(1, 1, 1)), 2.2, 1);
    var hit = glowSprite(scaled(c, 4).add(new C(1.5, 1.5, 1.5)), 3.0, 1);
    var hitRing = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex(), color: scaled(c, 2.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    e.add(core, glow, spiral, muzzle, hit, hitRing);
    var from = new V3(), targets = [], cur = new V3(), ramp = 0.18, sweep = 0.6, fadeT = 0.3;
    e.userData.play = function (f, t) {
      from.copy(f); targets = Array.isArray(t) ? t.map(function (x) { return x.clone(); }) : [t.clone()];
      if (!targets.length) targets = [f.clone()];
      sweep = Math.max(0.6, targets.length * 0.05);
      e.userData.t = 0; startEffect(e); e.update(0); return e;
    };
    e.update = function (dt) {
      var u = e.userData; u.t += dt;
      var s = Math.min(1, Math.max(0, (u.t - ramp) / sweep));
      var f = s * (targets.length - 1), i0 = Math.floor(f), i1 = Math.min(targets.length - 1, i0 + 1);
      cur.lerpVectors(targets[i0], targets[i1], f - i0);
      var on = Math.min(1, u.t / ramp), off = u.t > ramp + sweep ? 1 - Math.min(1, (u.t - ramp - sweep) / fadeT) : 1;
      var a = on * off, wob = 1 + 0.12 * Math.sin(u.t * 70);
      [core, glow, spiral].forEach(function (m) { stretch(m, from, cur); });
      core.scale.x = core.scale.z = 0.09 * a * wob; glow.scale.x = glow.scale.z = 0.45 * a * (2 - wob);
      core.material.uniforms.uAlpha.value = glow.material.uniforms.uAlpha.value = a;
      spiral.material.uniforms.uT.value = u.t; spiral.material.uniforms.uAlpha.value = a; spiral.material.uniforms.uLen.value = from.distanceTo(cur);
      muzzle.position.copy(from); muzzle.material.opacity = a;
      hit.position.copy(cur); hit.material.opacity = a; hit.scale.setScalar(2.4 + 0.8 * Math.sin(u.t * 50));
      hitRing.position.copy(cur); hitRing.scale.setScalar(1 + 3 * ((u.t * 3) % 1)); hitRing.material.opacity = a * (1 - (u.t * 3) % 1);
      if (u.t >= ramp + sweep + fadeT) finish(e);
    };
    return e;
  }

  /* ------------------------------------------------------------------ public API */
  function update(dt, t) {
    fxTime.value = t;
    live.forEach(function (o) {
      if (o.userData.playing) { o.update(dt, t); return; }    // effects run until they finish
      if (inScene(o)) o.update(dt, t);                         // objects run while they're in a scene
    });
  }

  window.BuilderFX = {
    version: "2.1.0",
    update: update,
    applyEnvironment: applyEnvironment,
    makeLights: makeLights,
    makeShip: makeShip,
    makeDrone: makeDrone,
    makeExplodingPlanet: makeExplodingPlanet,
    makeSpaceBackdrop: makeSpaceBackdrop,
    makeTracer: makeTracer,
    makeImpact: makeImpact,
    makeHammerShot: makeHammerShot,
    makeHammerImpact: makeHammerImpact,
    makePurgeBeam: makePurgeBeam,
    makeCubeMaterial: makeCubeMaterial,
    makeIsland: makeIsland,
    makeDistantPlanet: makeDistantPlanet,
    makeAsteroidBelt: makeAsteroidBelt,
    makeEngineFlame: makeEngineFlame,
    roundedBoxGeometry: roundedBoxGeometry,
    sunDirection: SUN_DIR.clone(),
    liveCount: function () { return live.size; }
  };
})();
