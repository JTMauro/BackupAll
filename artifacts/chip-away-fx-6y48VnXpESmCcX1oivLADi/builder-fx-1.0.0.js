/*  builder-fx.js — procedural graphics kit for "Chip Away" (three.js r128, UMD global THREE).
 *
 *  Everything is generated in code: geometry, shaders and canvas textures. No images, models, fonts
 *  or fetches. Colours are LINEAR; glowing parts use values above 1 so UnrealBloomPass (threshold
 *  ~0.86) picks them up.
 *
 *  Quick start
 *    BuilderFX.applyEnvironment(renderer, scene);   // reflections for the metal (once)
 *    scene.add(BuilderFX.makeLights());             // key sun + rim + fill, matching the backdrop
 *    scene.add(BuilderFX.makeSpaceBackdrop());
 *    const ship = BuilderFX.makeShip({ guns: 4 }); scene.add(ship);
 *    ...each frame:  BuilderFX.update(dt, t);       // ticks every live effect AND every object made here
 *
 *  BuilderFX.update(dt, t) ticks everything the kit made that animates, so you never need to call
 *  obj.update yourself (each animated object still has update(dt, t) if you'd rather drive it).
 *  Removing an object from the scene pauses it; obj.userData.dispose() frees it for good.
 *
 *  Objects
 *    makeShip({guns:3|4|5})      userData.gunTips[], setGunColor(i, Color|null), fireGun(i), setThrust(0..1)
 *    makeDrone()                 userData.setCargo(Color|null), fire(), cargoAnchor (Object3D)
 *    makeExplodingPlanet({radius})  userData.setCrack(0..1), detonate(), reset(), core, debris, state
 *    makeSpaceBackdrop()         userData.sunDirection (Vector3)
 *    makeLights()                Group of lights matching the backdrop's sun
 *  Effects (self-removing):  e = makeX(...); scene.add(e); e.userData.play(fromVec3, toVec3)
 *    makeTracer(color)           bolt from gun to cube        userData.onArrive = fn
 *    makeImpact(color)           cube-pop burst at `to`
 *    makeHammerShot()            heavy slug; spawns makeHammerImpact() on arrival   userData.onImpact = fn
 *    makeHammerImpact()          shockwave burst at `to`
 *    makePurgeBeam(color)        beam; `to` may be one Vector3 or an array it sweeps through
 *  Cubes
 *    makeCubeMaterial()          MeshStandardMaterial for beveled voxels (InstancedMesh + setColorAt)
 *    roundedBoxGeometry(size=1, radius=0.12, segments=3)
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

  /* ------------------------------------------------------------------ environment + lights */
  var SUN_DIR = new V3(0.62, 0.32, -0.72).normalize();

  function applyEnvironment(renderer, scene) {
    // A procedural "studio in space" painted straight into a small float equirect image: a dark nebula
    // gradient, a warm sun patch and cool/magenta rim strips. PMREM prefilters it so MeshStandardMaterial
    // metals have something to reflect. (Pure data: no scene render, so nothing can go NaN.)
    var w = 256, h = 128, data = new Float32Array(w * h * 4), d = new V3();
    var spots = [
      { dir: SUN_DIR, col: [9, 7, 5.2], size: 0.06 },
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
    var sun = new THREE.DirectionalLight(new C(1.0, 0.86, 0.7), 2.4); sun.position.copy(SUN_DIR).multiplyScalar(100);
    var rim = new THREE.DirectionalLight(new C(0.45, 0.3, 1.0), 1.6); rim.position.set(-60, 30, 80);
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

  /* ------------------------------------------------------------------ ship */
  function makeShip(opts) {
    opts = opts || {};
    var guns = Math.max(3, Math.min(5, opts.guns | 0 || 3));
    var ship = new THREE.Group(); ship.name = "BuilderFX.ship";
    var body = new THREE.Group(); ship.add(body);      // everything that banks/bobs

    var brushed = wrapTex(brushedTex(), 2, 2);
    var metal = new THREE.MeshStandardMaterial({ color: new C(0.62, 0.64, 0.68), metalness: 0.88, roughness: 0.42, roughnessMap: brushed, map: brushed, envMapIntensity: 1.25 });
    var dark = new THREE.MeshStandardMaterial({ color: new C(0.05, 0.055, 0.065), metalness: 0.7, roughness: 0.38, envMapIntensity: 1.0 });
    var orange = new THREE.MeshStandardMaterial({ color: new C(1.0, 0.32, 0.04), metalness: 0.35, roughness: 0.35, emissive: new C(0.35, 0.09, 0.0) });
    var glass = new THREE.MeshStandardMaterial({ color: new C(0.02, 0.05, 0.08), metalness: 1.0, roughness: 0.06, emissive: new C(0.0, 0.05, 0.07), envMapIntensity: 2.0 });

    // Fuselage: a lathe profile around Y, turned so the nose points -Z.
    var prof = [[0.0, -2.35], [0.34, -2.3], [0.52, -1.9], [0.62, -1.0], [0.66, 0.0], [0.58, 1.0], [0.42, 1.8], [0.22, 2.45], [0.05, 2.85], [0.0, 2.9]]
      .map(function (q) { return new THREE.Vector2(q[0], q[1]); });
    var fus = new THREE.Mesh(new THREE.LatheGeometry(prof, 28).rotateX(-Math.PI / 2), metal);
    fus.scale.set(1, 0.68, 1); body.add(fus);
    var belly = new THREE.Mesh(new THREE.LatheGeometry(prof, 28, Math.PI * 0.62, Math.PI * 0.76).rotateX(-Math.PI / 2), dark);
    belly.scale.set(1.02, 0.7, 1.0); body.add(belly);

    var canopy = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), glass);
    canopy.scale.set(0.85, 0.7, 2.1); canopy.position.set(0, 0.32, -0.75); body.add(canopy);
    var frame = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 8, 24, Math.PI), dark);
    frame.position.set(0, 0.33, -0.95); body.add(frame);

    // Swept wings (extruded shapes), wingspan ~7.7.
    function wing(side) {
      var s = new THREE.Shape();
      s.moveTo(0.35, -1.0); s.lineTo(3.85, 0.85); s.lineTo(3.85, 1.45); s.lineTo(2.6, 1.55); s.lineTo(0.35, 2.0); s.lineTo(0.35, -1.0);
      var g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.05, bevelSegments: 2, steps: 1 });
      g.rotateX(Math.PI / 2);                 // shape y -> world z; thickness downwards
      g.translate(0, 0.02, 0);
      if (side < 0) { g.scale(-1, 1, 1); flipWinding(g); }
      var m = new THREE.Mesh(g, metal); m.rotation.z = side * 0.05; return m;
    }
    var wl = wing(-1), wr = wing(1); body.add(wl, wr);
    // Orange accent stripes along the wings and spine
    function stripe(x0, z0, x1, z1, w, y) {
      var a = new V3(x0, y, z0), b = new V3(x1, y, z1), L = a.distanceTo(b);
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, L), orange);
      m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b.x, y, b.z); return m;
    }
    [-1, 1].forEach(function (sd) {
      body.add(stripe(sd * 0.7, -0.35, sd * 3.6, 0.95, 0.16, 0.085 + 0.05 * 0.7));
      body.add(stripe(sd * 0.6, 0.15, sd * 3.0, 1.2, 0.07, 0.085 + 0.05 * 0.6));
      // wing-tip blades and running lights
      var blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 1.0), dark); blade.position.set(sd * 3.86, 0.12, 1.1); body.add(blade);
      var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: sd < 0 ? new C(4, 0.2, 0.1) : new C(0.2, 4, 0.6), toneMapped: false }));
      lamp.position.set(sd * 3.9, 0.12, 0.62); body.add(lamp); lamp.userData.blink = sd < 0 ? 0 : 0.5;
      body.userData.lamps = (body.userData.lamps || []).concat([lamp]);
      // tail fins
      var fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(0.9, 0.0); fs.lineTo(0.25, 0.85); fs.lineTo(0, 0.85);
      var fg = new THREE.ExtrudeGeometry(fs, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
      fg.rotateY(-Math.PI / 2); var fin = new THREE.Mesh(fg, metal);
      fin.position.set(sd * 0.55, 0.25, 1.15); fin.rotation.z = -sd * 0.42; body.add(fin);
      var finStripe = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.5, 0.12), orange);
      finStripe.position.set(sd * (0.55 + 0.17), 0.62, 1.55); finStripe.rotation.z = -sd * 0.42; body.add(finStripe);
    });
    body.add(stripe(0, -2.2, 0, 1.6, 0.1, 0.46));

    // Engines: two nacelles with blue glow and flickering exhaust plumes
    var plumes = [], cores = [];
    [-0.82, 0.82].forEach(function (x) {
      var nac = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.7, 20).rotateX(Math.PI / 2), dark);
      nac.position.set(x, 0.02, 1.75); body.add(nac);
      var cowl = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.06, 10, 24), metal); cowl.position.set(x, 0.02, 2.6); body.add(cowl);
      var core = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), new THREE.MeshBasicMaterial({ color: new C(0.8, 1.8, 4.5), toneMapped: false }));
      core.position.set(x, 0.02, 2.62); body.add(core); cores.push(core);
      var plume = new THREE.Mesh(new THREE.ConeGeometry(0.27, 1, 20, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 0.5), new THREE.ShaderMaterial({
        uniforms: { uT: { value: 0 }, uPow: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: "uniform float uT;uniform float uPow;varying vec2 vUv;void main(){float a=pow(1.-vUv.y,2.2)*(0.8+0.2*sin(uT*60.+vUv.y*30.));vec3 c=mix(vec3(0.12,0.4,1.5),vec3(0.9,1.5,2.6),pow(1.-vUv.y,8.));gl_FragColor=vec4(c*a*uPow*0.55,1.);}"
      }));
      plume.position.set(x, 0.02, 2.63); plume.scale.set(0.8, 0.8, 1.6); body.add(plume); plumes.push(plume);
      var halo = glowSprite(new C(0.3, 0.7, 2.0), 1.2, 0.7); halo.position.set(x, 0.02, 2.75); body.add(halo); cores.push(halo);
    });

    // Guns, ordered left to right
    var layouts = { 3: [-2.55, 0, 2.55], 4: [-3.05, -1.35, 1.35, 3.05], 5: [-3.25, -1.9, 0, 1.9, 3.25] };
    var tips = [], gunParts = [];
    layouts[guns].forEach(function (x, i) {
      var g = new THREE.Group();
      var centre = Math.abs(x) < 0.01;
      var wz = centre ? -2.0 : -0.95 + (Math.abs(x) - 0.35) * (1.85 / 3.5) + 0.1;   // wing guns at the leading edge
      g.position.set(x, centre ? 0.05 : 0.17 + Math.abs(x) * 0.05, wz);            // centre gun: nose cannon
      var housing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.9), dark); housing.position.z = 0.25; g.add(housing);
      var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1.05, 12).rotateX(Math.PI / 2), metal); barrel.position.z = -0.55;
      var shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 12).rotateX(Math.PI / 2), dark); shroud.position.z = -0.95;
      var recoil = new THREE.Group(); recoil.add(barrel, shroud); g.add(recoil);
      var cellMat = new THREE.MeshStandardMaterial({ color: new C(0.1, 0.1, 0.11), metalness: 0.2, roughness: 0.3, emissive: new C(0, 0, 0) });
      var cell = new THREE.Mesh(roundedBoxGeometry(0.26, 0.05, 2), cellMat); cell.position.set(0, 0.2, 0.25); g.add(cell);
      var ringMat = new THREE.MeshBasicMaterial({ color: new C(0.04, 0.04, 0.05), toneMapped: false });
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 8, 16), ringMat); ring.position.z = -1.07; recoil.add(ring);
      var tip = new THREE.Object3D(); tip.position.z = -1.12; recoil.add(tip); tip.name = "gunTip" + i;
      var flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex(), color: new C(3, 2.4, 1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
      flash.scale.setScalar(0.01); tip.add(flash);
      var cellGlow = glowSprite(new C(0, 0, 0), 0.9, 0); cellGlow.position.copy(cell.position); g.add(cellGlow);
      body.add(g); tips.push(tip);
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
      plumes.forEach(function (p, k) { p.material.uniforms.uT.value = t + k; p.material.uniforms.uPow.value = thrust; p.scale.z = (0.8 + 0.9 * thrust) * (0.92 + 0.08 * Math.sin(t * 47 + k)); });
      cores.forEach(function (c) { if (c.isSprite) c.material.opacity = 0.55 + 0.35 * thrust; });
      (body.userData.lamps || []).forEach(function (l) { l.visible = ((t + l.userData.blink) % 1.2) < 0.12; });
      gunParts.forEach(function (gp) {
        if (gp.fireT < 1) {
          gp.fireT = Math.min(1, gp.fireT + dt / 0.14);
          var k = 1 - gp.fireT;
          gp.flash.material.opacity = k; gp.flash.scale.setScalar(0.25 + 1.1 * Math.sqrt(gp.fireT) * k + 0.2);
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

    var crack = 0, state = "intact", tB = 0;
    var m4 = new THREE.Matrix4(), pos = new V3(), sc = new V3(), qq = new THREE.Quaternion(), dq = new THREE.Quaternion(), ax = new V3();

    function setCrack(c) { crack = Math.max(0, Math.min(1, c)); pu.uCrack.value = crack; }
    function detonate() {
      if (state === "exploded") return;
      state = "exploded"; tB = 0;
      planet.visible = false; atmo.visible = false;
      core.visible = coreGlow.visible = rocks.visible = embers.visible = flash.visible = true;
      rings.forEach(function (rg) { rg.visible = true; });
      g.userData.state = state;
    }
    function reset() {
      state = "intact"; tB = 0; setCrack(0);
      planet.visible = atmo.visible = true; planet.position.set(0, 0, 0);
      core.visible = coreGlow.visible = rocks.visible = embers.visible = flash.visible = false;
      rings.forEach(function (rg) { rg.visible = false; });
      blastLight.intensity = coreLight.intensity = 0; rockU.uHeat.value = 0;
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
      rockU.uHeat.value = Math.max(0.12, Math.exp(-tB * 0.35));
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
      }
      rocks.instanceMatrix.needsUpdate = true;
    };
    g.userData.setCrack = setCrack;
    g.userData.detonate = detonate;
    g.userData.reset = reset;
    g.userData.update = function (dt, t) { g.update(dt, t); };
    g.userData.core = core; g.userData.debris = rocks; g.userData.state = state; g.userData.radius = R;
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

  function makeTracer(color) {
    var c = col(color || 0xffffff);
    var e = effectBase("BuilderFX.tracer");
    var core = new THREE.Mesh(unitCyl, beamMaterial(scaled(c, 4).add(new C(1.5, 1.5, 1.5)), 0.6)); core.scale.set(0.045, 1, 0.045);
    var glow = new THREE.Mesh(unitCyl, beamMaterial(scaled(c, 1.6), 2.0)); glow.scale.set(0.16, 1, 0.16);
    var head = glowSprite(scaled(c, 3).add(new C(1, 1, 1)), 0.9, 1);
    e.add(core, glow, head);
    var from = new V3(), to = new V3(), dur = 0.15, a = new V3(), b = new V3();
    e.userData.play = function (f, t) {
      from.copy(f); to.copy(t); dur = Math.max(0.07, from.distanceTo(to) / 140); e.userData.t = 0; startEffect(e); e.update(0);
      return e;
    };
    e.update = function (dt) {
      var u = e.userData; u.t += dt; var k = Math.min(1, u.t / dur);
      var trail = 0.35;                                      // trail length as a fraction of the path
      b.lerpVectors(from, to, k); a.lerpVectors(from, to, Math.max(0, k - trail));
      stretch(core, a, b); stretch(glow, a, b); head.position.copy(b);
      if (k >= 1) {
        var fade = Math.min(1, (u.t - dur) / 0.06);
        core.material.uniforms.uAlpha.value = glow.material.uniforms.uAlpha.value = 1 - fade; head.material.opacity = 1 - fade;
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
    var F = 14;
    var fm = new THREE.MeshStandardMaterial({ color: scaled(c, 0.7), emissive: scaled(c, 2.2), roughness: 0.3, metalness: 0.1, transparent: true });
    var frags = new THREE.InstancedMesh(fragGeo, fm, F); frags.frustumCulled = false; e.add(frags);
    var flash = glowSprite(scaled(c, 4).add(new C(2, 2, 2)), 3.2, 1); e.add(flash);
    var ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex(), color: scaled(c, 2.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    e.add(ring);
    var SP = 36, spPos = new Float32Array(SP * 3), spVel = [], spGeo = new THREE.BufferGeometry();
    spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
    var sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: scaled(c, 3).add(new C(1.5, 1.5, 1.5)), size: 0.16, map: glowTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sparks.frustumCulled = false; e.add(sparks);
    var data = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new V3(), p3 = new V3(), dur = 0.75;
    e.userData.play = function (f, t) {
      e.position.copy(t);
      var back = new V3().subVectors(f, t).normalize();                    // debris kicks back towards the shooter
      for (var i = 0; i < F; i++) {
        var v = new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().addScaledVector(back, 0.7).normalize().multiplyScalar(4 + 7 * Math.random());
        data.push({ v: v, p: new V3(), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, 0)), spin: new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), s: 0.6 + 0.8 * Math.random() });
      }
      for (i = 0; i < SP; i++) spVel.push(new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().addScaledVector(back, 0.4).multiplyScalar(8 + 14 * Math.random()));
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
      for (i = 0; i < SP; i++) { spVel[i].multiplyScalar(Math.exp(-dt * 5)); spPos[i * 3] += spVel[i].x * dt; spPos[i * 3 + 1] += spVel[i].y * dt; spPos[i * 3 + 2] += spVel[i].z * dt; }
      spGeo.attributes.position.needsUpdate = true; sparks.material.opacity = 1 - k;
      flash.material.opacity = Math.exp(-u.t * 16); flash.scale.setScalar(1.5 + 2.5 * Math.min(1, u.t * 10));
      ring.scale.setScalar(0.5 + 4.5 * Math.sqrt(k)); ring.material.opacity = (1 - k) * (1 - k);
      if (k >= 1) finish(e);
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
    live.forEach(function (o) {
      if (o.userData.playing) { o.update(dt, t); return; }    // effects run until they finish
      if (inScene(o)) o.update(dt, t);                         // objects run while they're in a scene
    });
  }

  window.BuilderFX = {
    version: "1.0.0",
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
    roundedBoxGeometry: roundedBoxGeometry,
    sunDirection: SUN_DIR.clone(),
    liveCount: function () { return live.size; }
  };
})();
