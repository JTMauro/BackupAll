// WebGL backdrops for the 3D launcher. Each scene is procedural (no image assets)
// and takes a palette so the "Custom" theme can recolour any of them.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const THEMES = {
  standard: { name: 'Standard', scene: 'standard', palette: { sky1: '#0b1026', sky2: '#2a1650', primary: '#4f8cff', accent: '#b26bff', particles: '#cfe0ff' } },
  techno: { name: 'Techno', scene: 'techno', palette: { sky1: '#05010f', sky2: '#3a0a4a', primary: '#ff2bd6', accent: '#00f0ff', particles: '#ffffff' } },
  paleolithic: { name: 'Paleolithic', scene: 'paleolithic', palette: { sky1: '#241c3a', sky2: '#c8783e', primary: '#ffa040', accent: '#8d8272', particles: '#ffc070' } },
  futuristic: { name: 'Futuristic', scene: 'futuristic', palette: { sky1: '#000a12', sky2: '#002a3a', primary: '#00e5ff', accent: '#7cffcb', particles: '#9ff6ff' } },
  aurora: { name: 'Aurora', scene: 'aurora', palette: { sky1: '#020814', sky2: '#0a2340', primary: '#3dffa8', accent: '#9a5cff', particles: '#e8fbff' } },
  ocean: { name: 'Deep Ocean', scene: 'ocean', palette: { sky1: '#00121f', sky2: '#004a6e', primary: '#33c8ff', accent: '#00ffc8', particles: '#c8f4ff' } },
  ember: { name: 'Volcanic', scene: 'volcano', palette: { sky1: '#0a0000', sky2: '#5a0800', primary: '#ff3b00', accent: '#ffcc00', particles: '#ff8a00' } },
  minimal: { name: 'Minimal Dark', scene: 'standard', palette: { sky1: '#0d0f12', sky2: '#1b1f27', primary: '#8892a6', accent: '#d0d6e2', particles: '#7c8597' } },
};

const C = (hex) => new THREE.Color(hex);

function gradientSky(p) {
  const geo = new THREE.SphereGeometry(400, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { c1: { value: C(p.sky1) }, c2: { value: C(p.sky2) }, time: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 c1; uniform vec3 c2; uniform float time; varying vec3 vP;
      void main(){ float t = smoothstep(-0.4, 0.8, vP.y); vec3 col = mix(c2, c1, t);
      col += 0.04 * sin(vP.x*6. + time*0.2) * c2; gl_FragColor = vec4(col,1.); }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.userData.tick = (t) => { mat.uniforms.time.value = t; };
  return m;
}

function stars(count, color, spread = 300, size = 1.2) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: C(color), size, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
  return new THREE.Points(g, m);
}

// Ochre cave art (animals, hands, hunters) painted onto a canvas texture.
function cavePaintings(p) {
  const group = new THREE.Group();
  const make = (draw, w, hh) => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    g.strokeStyle = g.fillStyle = 'rgba(150, 50, 20, 0.95)';
    g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    draw(g);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.8, depthWrite: false }));
  };
  const bison = (g, x, y, s, dir = 1) => {
    g.save(); g.translate(x, y); g.scale(s * dir, s);
    g.beginPath(); g.ellipse(0, 0, 70, 38, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(-55, -22, 30, 26, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(-82, 4, 18, 14, 0, 0, Math.PI * 2); g.fill();
    for (const lx of [-40, -15, 25, 50]) { g.beginPath(); g.moveTo(lx, 25); g.lineTo(lx + 4, 70); g.stroke(); }
    g.beginPath(); g.moveTo(-90, -10); g.quadraticCurveTo(-105, -35, -88, -42); g.stroke();
    g.beginPath(); g.moveTo(68, -5); g.quadraticCurveTo(95, 5, 85, 40); g.stroke();
    g.restore();
  };
  const hand = (g, x, y, s) => {
    g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = 'rgba(170, 70, 30, 0.75)';
    g.beginPath(); g.ellipse(0, 20, 24, 28, 0, 0, Math.PI * 2); g.fill();
    [[-22, -10, -0.5], [-10, -30, -0.15], [3, -34, 0], [16, -28, 0.15], [28, 0, 0.7]].forEach(([fx, fy, r]) => { g.save(); g.translate(fx, fy); g.rotate(r); g.beginPath(); g.ellipse(0, 0, 6, 18, 0, 0, Math.PI * 2); g.fill(); g.restore(); });
    g.restore();
  };
  const hunter = (g, x, y) => {
    g.beginPath(); g.arc(x, y - 40, 9, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x, y + 5); g.lineTo(x - 14, y + 35); g.moveTo(x, y + 5); g.lineTo(x + 14, y + 35);
    g.moveTo(x, y - 20); g.lineTo(x + 22, y - 5); g.moveTo(x - 25, y - 30); g.lineTo(x + 45, y - 40); g.stroke();
  };
  const a = make((g) => { bison(g, 170, 120, 1.2); bison(g, 380, 150, 0.8, -1); }, 70, 35);
  a.position.set(-55, 22, -95); a.rotation.y = 0.35;
  const b = make((g) => { hand(g, 90, 120, 1.3); hand(g, 200, 100, 1); hand(g, 300, 140, 1.2); hunter(g, 400, 140); hunter(g, 460, 150); }, 60, 30);
  b.position.set(52, 16, -92); b.rotation.y = -0.4;
  const c2 = make((g) => { bison(g, 260, 120, 1.4, -1); hand(g, 450, 90, 0.9); }, 64, 32);
  c2.position.set(5, 40, -110);
  group.add(a, b, c2);
  return group;
}

// ---- Scenes -------------------------------------------------------------------
const SCENES = {
  standard(scene, p, q) {
    scene.add(gradientSky(p));
    const st = stars(q.particles * 3, p.particles, 400, 0.9);
    scene.add(st);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const l1 = new THREE.PointLight(C(p.primary), 300, 200); l1.position.set(-20, 15, 10); scene.add(l1);
    const l2 = new THREE.PointLight(C(p.accent), 300, 200); l2.position.set(25, -10, 5); scene.add(l2);
    const shapes = [];
    const geos = [new THREE.IcosahedronGeometry(3, 0), new THREE.TorusKnotGeometry(2, 0.6, 128, 16), new THREE.OctahedronGeometry(2.5), new THREE.TorusGeometry(2.5, 0.5, 24, 64)];
    for (let i = 0; i < 9; i++) {
      const mat = new THREE.MeshPhysicalMaterial({ color: C(i % 2 ? p.primary : p.accent), metalness: 0.2, roughness: 0.15, transmission: 0.6, thickness: 2, transparent: true, opacity: 0.85, emissive: C(i % 2 ? p.primary : p.accent), emissiveIntensity: 0.15 });
      const m = new THREE.Mesh(geos[i % geos.length], mat);
      m.position.set((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 40, -20 - Math.random() * 50);
      m.userData.spin = (Math.random() - 0.5) * 0.4;
      m.userData.y = m.position.y;
      scene.add(m);
      shapes.push(m);
    }
    return (t) => {
      st.rotation.y = t * 0.01;
      shapes.forEach((m, i) => { m.rotation.x += m.userData.spin * 0.01; m.rotation.y += m.userData.spin * 0.013; m.position.y = m.userData.y + Math.sin(t * 0.5 + i) * 1.5; });
    };
  },

  techno(scene, p, q) {
    scene.add(gradientSky(p));
    scene.fog = new THREE.Fog(C(p.sky1), 40, 220);
    // Retro sun with scanline cut-outs.
    const sunMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { a: { value: C(p.primary) }, b: { value: C('#ffd23f') }, time: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform vec3 a; uniform vec3 b; uniform float time; varying vec2 vUv;
        void main(){ vec2 c=vUv-.5; float d=length(c); if(d>.5) discard;
          float stripes = step(0.5, fract((vUv.y*14.) - time*0.3)); float cut = vUv.y < .45 ? stripes : 1.;
          if(cut < .5) discard; gl_FragColor=vec4(mix(a,b,vUv.y)*0.9,1.); }`,
    });
    const sun = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), sunMat);
    sun.position.set(0, 18, -200);
    scene.add(sun);
    // Infinite neon grid floor.
    const gridMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { col: { value: C(p.accent) }, col2: { value: C(p.primary) }, time: { value: 0 } },
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vW=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }',
      fragmentShader: `uniform vec3 col; uniform vec3 col2; uniform float time; varying vec3 vW;
        void main(){ vec2 g = vec2(vW.x, vW.z + time*18.) / 6.; vec2 gr = abs(fract(g-.5)-.5)/fwidth(g);
          float line = 1.-min(min(gr.x,gr.y),1.); float fade = smoothstep(-220., -10., vW.z);
          vec3 c = mix(col2, col, smoothstep(-200., 0., vW.z)); gl_FragColor = vec4(c*line*1.2, line*fade + .05*fade); }`,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 400, 1, 1), gridMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -14, -150);
    scene.add(floor);
    // Wireframe mountains.
    const mGeo = new THREE.PlaneGeometry(500, 80, 80, 12);
    const pos = mGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const edge = Math.min(1, Math.abs(x) / 70);
      pos.setZ(i, (Math.sin(x * 0.07) * 10 + Math.sin(x * 0.19 + 2) * 6 + Math.random() * 6) * edge * Math.max(0, (y + 40) / 80));
    }
    const mountains = new THREE.Mesh(mGeo, new THREE.MeshBasicMaterial({ color: C(p.primary), wireframe: true, transparent: true, opacity: 0.5 }));
    mountains.rotation.x = -Math.PI / 2;
    mountains.position.set(0, -14, -190);
    scene.add(mountains);
    const st = stars(q.particles * 2, p.particles, 400, 0.7);
    st.position.y = 120;
    scene.add(st);
    // Floating neon bars that pulse like an equaliser.
    const bars = [];
    for (let i = 0; i < 24; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.2), new THREE.MeshBasicMaterial({ color: C(i % 2 ? p.primary : p.accent) }));
      b.position.set(-60 + i * 5.2, -13, -70);
      scene.add(b);
      bars.push(b);
    }
    return (t) => {
      gridMat.uniforms.time.value = t;
      sunMat.uniforms.time.value = t;
      bars.forEach((b, i) => { const s = 1 + Math.abs(Math.sin(t * 3 + i * 0.7) * Math.sin(t * 1.3 + i)) * 14; b.scale.y = s; b.position.y = -14 + s / 2; });
    };
  },

  // Stone Age: dusk over the steppe, a ring of standing stones around a campfire,
  // mammoths walking the horizon and ochre paintings on the cliff.
  paleolithic(scene, p, q) {
    scene.fog = new THREE.Fog(C(p.sky2).lerp(C('#2a1c14'), 0.5), 60, 320);
    // Dusk sky with a low sun.
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: C(p.sky1) }, hor: { value: C(p.sky2) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top; uniform vec3 hor; varying vec3 vP;
        void main(){ float t = smoothstep(-0.05, 0.55, vP.y); vec3 c = mix(hor, top, t);
        float sun = smoothstep(0.985, 0.999, dot(vP, normalize(vec3(0.35, 0.06, -1.0))));
        float halo = pow(max(0., dot(vP, normalize(vec3(0.35, 0.06, -1.0)))), 24.);
        c += vec3(1.0, 0.75, 0.45) * (sun * 1.4 + halo * 0.45); gl_FragColor = vec4(c, 1.); }`,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), skyMat));
    scene.add(new THREE.HemisphereLight(C('#ffd6a8'), C('#2a2018'), 1.1));
    const sunL = new THREE.DirectionalLight(C('#ffb070'), 1.6);
    sunL.position.set(60, 20, -200);
    scene.add(sunL);
    // Rolling ground and a far ridge (flat-shaded, low-poly).
    const hill = (w, d, seg, amp, color, y, z) => {
      const g = new THREE.PlaneGeometry(w, d, seg, Math.max(4, seg / 4));
      g.rotateX(-Math.PI / 2);
      const a = g.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const x = a.getX(i); const zz = a.getZ(i);
        a.setY(i, (Math.sin(x * 0.03) * Math.cos(zz * 0.05) + Math.sin(x * 0.011 + zz * 0.02) * 1.6) * amp + Math.random() * amp * 0.25);
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: C(color), roughness: 1, flatShading: true }));
      m.position.set(0, y, z);
      return m;
    };
    scene.add(hill(600, 300, 60, 2.2, '#5a4632', -26, -110));
    const ridge = hill(900, 60, 90, 14, '#3a2e2a', -14, -290);
    scene.add(ridge);
    // Standing stones around the fire.
    const stoneMat = new THREE.MeshStandardMaterial({ color: C(p.accent), roughness: 0.95, flatShading: true });
    for (let i = 0; i < 11; i++) {
      const ang = (i / 11) * Math.PI * 2;
      const hgt = 9 + Math.random() * 7;
      const g = new THREE.BoxGeometry(3.2 + Math.random() * 1.5, hgt, 2 + Math.random(), 1, 3, 1);
      const a = g.attributes.position;
      for (let k = 0; k < a.count; k++) { a.setX(k, a.getX(k) * (1 - (a.getY(k) / hgt) * 0.25) + (Math.random() - 0.5) * 0.5); a.setZ(k, a.getZ(k) + (Math.random() - 0.5) * 0.4); }
      g.computeVertexNormals();
      const st = new THREE.Mesh(g, stoneMat);
      st.position.set(Math.cos(ang) * 30, -25 + hgt / 2 - 0.5, -70 + Math.sin(ang) * 14);
      st.rotation.set((Math.random() - 0.5) * 0.12, ang + Math.random() * 0.4, (Math.random() - 0.5) * 0.12);
      scene.add(st);
    }
    // Lintel across the two front stones (a trilithon).
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(16, 2.4, 2.6), stoneMat);
    lintel.position.set(0, -9, -56);
    scene.add(lintel);
    for (const x of [-6.5, 6.5]) { const s2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 15, 2.6), stoneMat); s2.position.set(x, -17.5, -56); scene.add(s2); }
    // Cliff with ochre paintings on the left.
    const cliffG = new THREE.IcosahedronGeometry(40, 2);
    const ca = cliffG.attributes.position;
    for (let i = 0; i < ca.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(ca, i); v.multiplyScalar(1 + (Math.random() - 0.5) * 0.18); ca.setXYZ(i, v.x, v.y * 1.3, v.z); }
    cliffG.computeVertexNormals();
    const cliff = new THREE.Mesh(cliffG, new THREE.MeshStandardMaterial({ color: C('#6b5444'), roughness: 1, flatShading: true }));
    cliff.position.set(-105, -5, -120);
    scene.add(cliff);
    const paintings = cavePaintings(p);
    paintings.children.forEach((m, i) => { m.position.set(-68 + i * 4, 8 + i * 7, -96 - i * 6); m.rotation.y = 0.75; m.scale.setScalar(0.55); });
    scene.add(paintings);
    // Mammoths walking along the horizon.
    const mamTex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 160;
      const g = c.getContext('2d'); g.fillStyle = '#1a120d';
      g.beginPath(); g.ellipse(130, 70, 78, 50, 0, 0, Math.PI * 2); g.fill();            // body
      g.beginPath(); g.ellipse(58, 62, 34, 36, 0, 0, Math.PI * 2); g.fill();             // head
      g.beginPath(); g.ellipse(100, 30, 40, 20, -0.2, 0, Math.PI * 2); g.fill();         // hump
      for (const x of [78, 106, 150, 180]) g.fillRect(x, 100, 18, 52);                     // legs
      g.lineWidth = 10; g.strokeStyle = '#1a120d'; g.lineCap = 'round';
      g.beginPath(); g.moveTo(36, 72); g.quadraticCurveTo(22, 120, 40, 140); g.stroke();   // trunk
      g.strokeStyle = '#e8dcc0'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(46, 86); g.quadraticCurveTo(10, 110, 30, 70); g.stroke();    // tusk
      g.strokeStyle = '#1a120d'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(206, 60); g.lineTo(222, 96); g.stroke();                     // tail
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const herd = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mamTex, transparent: true, fog: true }));
      const s = 13 - i * 1.8;
      m.scale.set(s * 1.6, s, 1);
      m.userData = { z: -170 - i * 18, speed: 1.6 + i * 0.35, x: -120 + i * 34 + Math.random() * 10, s };
      scene.add(m);
      herd.push(m);
    }
    // Campfire inside the ring.
    const fire = new THREE.PointLight(C(p.primary), 2600, 120, 1.7);
    fire.position.set(0, -20, -70);
    scene.add(fire);
    const fc = document.createElement('canvas'); fc.width = fc.height = 128;
    const fg = fc.getContext('2d');
    const grd = fg.createRadialGradient(64, 80, 4, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,245,210,1)'); grd.addColorStop(0.3, 'rgba(255,170,60,0.9)'); grd.addColorStop(0.65, 'rgba(255,90,20,0.3)'); grd.addColorStop(1, 'rgba(255,60,0,0)');
    fg.fillStyle = grd; fg.fillRect(0, 0, 128, 128);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(fc), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.position.set(0, -21, -70);
    scene.add(glow);
    const logMat = new THREE.MeshStandardMaterial({ color: C('#3a2414'), roughness: 1 });
    for (let i = 0; i < 4; i++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 6, 6), logMat); lg.position.set(0, -24.4, -70); lg.rotation.set(Math.PI / 2.3, (i / 4) * Math.PI, 0); scene.add(lg); }
    // Sparks.
    const n = Math.round(q.particles * 0.6);
    const eg = new THREE.BufferGeometry();
    const ep = new Float32Array(n * 3);
    const sp = new Float32Array(n);
    for (let i = 0; i < n; i++) { ep[i * 3] = (Math.random() - 0.5) * 4; ep[i * 3 + 1] = -22 + Math.random() * 30; ep[i * 3 + 2] = -70 + (Math.random() - 0.5) * 4; sp[i] = 3 + Math.random() * 6; }
    eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
    scene.add(new THREE.Points(eg, new THREE.PointsMaterial({ color: C(p.particles), size: 0.5, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
    let last = 0;
    return (t) => {
      const dt = Math.min(0.05, t - last); last = t;
      const f = 0.8 + Math.sin(t * 12) * 0.07 + Math.sin(t * 6.7) * 0.08 + Math.random() * 0.06;
      fire.intensity = 2600 * f;
      glow.scale.set(9 + f * 4, 11 + f * 6, 1);
      for (const m of herd) {
        const u = m.userData;
        u.x += u.speed * dt;
        if (u.x > 160) u.x = -160;
        m.position.set(u.x, -12 + u.s / 2 + Math.abs(Math.sin(t * 2 + u.z)) * 0.4, u.z);
      }
      const a = eg.attributes.position;
      for (let i = 0; i < n; i++) {
        let y = a.getY(i) + sp[i] * dt;
        let x = a.getX(i) + Math.sin(t * 3 + i) * 0.02;
        if (y > 10) { y = -22; x = (Math.random() - 0.5) * 3; }
        a.setY(i, y); a.setX(i, x);
      }
      a.needsUpdate = true;
    };
  },

  // Volcanic: an erupting volcano over a cracked lava field with hellfire flames.
  volcano(scene, p, q) {
    scene.fog = new THREE.FogExp2(C(p.sky1).lerp(C('#200000'), 0.5), 0.004);
    scene.add(gradientSky({ sky1: p.sky1, sky2: p.sky2 }));
    scene.add(new THREE.AmbientLight(C('#ff3010'), 0.5));
    // Lava field: dark crust with glowing, flowing cracks.
    const lavaMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, hot: { value: C(p.primary) }, hotter: { value: C(p.accent) } },
      vertexShader: 'varying vec2 vU; varying float vD; void main(){ vU = position.xy * 0.04; vec4 mv = modelViewMatrix * vec4(position,1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform float time; uniform vec3 hot; uniform vec3 hotter; varying vec2 vU; varying float vD;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
          return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a*n(p); p *= 2.03; a *= .5; } return v; }
        void main(){
          vec2 p = vU + vec2(0., time * 0.05);
          float q = fbm(p + fbm(p * 1.7 + time * 0.08));
          float crack = smoothstep(0.42, 0.5, q) * (1. - smoothstep(0.5, 0.58, q));
          float pool = smoothstep(0.74, 0.86, fbm(p * 0.6 - time * 0.03)) * 0.8;
          float heat = max(crack, pool);
          vec3 crust = vec3(0.06, 0.03, 0.025) * (0.6 + q);
          vec3 col = mix(crust, mix(hot * 0.75, hotter * 0.9, heat * heat * heat), clamp(heat, 0., 1.) * 0.9);
          col *= 0.7 + 0.2 * sin(time * 2. + q * 12.);
          col = mix(col, vec3(0.12, 0.01, 0.0), clamp((vD - 80.) / 260., 0., 0.85));
          gl_FragColor = vec4(col, 1.); }`,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 400, 1, 1), lavaMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -26, -150);
    scene.add(ground);
    // The volcano.
    const coneG = new THREE.CylinderGeometry(14, 95, 85, 48, 12, true);
    const ca = coneG.attributes.position;
    for (let i = 0; i < ca.count; i++) {
      const x = ca.getX(i); const y = ca.getY(i); const z = ca.getZ(i);
      const k = 1 + (Math.sin(Math.atan2(z, x) * 7 + y * 0.1) * 0.06 + (Math.random() - 0.5) * 0.08);
      ca.setXYZ(i, x * k, y, z * k);
    }
    coneG.computeVertexNormals();
    const volcano = new THREE.Mesh(coneG, new THREE.MeshStandardMaterial({ color: C('#1c1412'), roughness: 1, flatShading: true, emissive: C(p.primary), emissiveIntensity: 0.06 }));
    volcano.position.set(0, 14, -230);
    scene.add(volcano);
    // Lava streams down the slopes.
    const streamMat = new THREE.MeshBasicMaterial({ color: C(p.primary).lerp(C(p.accent), 0.3), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const a of [-0.5, 0.15, 0.7]) {
      const pts = [];
      for (let i = 0; i <= 12; i++) { const t2 = i / 12; const r = 15 + t2 * 80; pts.push(new THREE.Vector3(Math.sin(a + Math.sin(t2 * 5) * 0.08) * r, 56 - t2 * 85, -230 + Math.cos(a) * r + 2)); }
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 1.6, 6), streamMat));
    }
    const crater = new THREE.PointLight(C(p.accent), 9000, 260, 1.5);
    crater.position.set(0, 62, -225);
    scene.add(crater);
    const glowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(0.3, 'rgba(255,140,30,0.85)'); gr.addColorStop(0.7, 'rgba(255,40,0,0.25)'); gr.addColorStop(1, 'rgba(255,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();
    const craterGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    craterGlow.position.set(0, 60, -228);
    craterGlow.scale.set(60, 40, 1);
    scene.add(craterGlow);
    // Eruption: glowing bombs thrown out of the crater, falling back under gravity.
    const n = Math.round(q.particles * 0.8);
    const bg = new THREE.BufferGeometry();
    const bp = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    const spawn = (i, initial) => {
      bp[i * 3] = (Math.random() - 0.5) * 8; bp[i * 3 + 1] = 58; bp[i * 3 + 2] = -228 + (Math.random() - 0.5) * 8;
      vel[i * 3] = (Math.random() - 0.5) * 30; vel[i * 3 + 1] = 25 + Math.random() * 45; vel[i * 3 + 2] = (Math.random() - 0.5) * 30 + 6;
      if (initial) { const t0 = Math.random() * 3; bp[i * 3] += vel[i * 3] * t0; bp[i * 3 + 1] += vel[i * 3 + 1] * t0 - 12 * t0 * t0; bp[i * 3 + 2] += vel[i * 3 + 2] * t0; vel[i * 3 + 1] -= 24 * t0; }
    };
    for (let i = 0; i < n; i++) spawn(i, true);
    bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    scene.add(new THREE.Points(bg, new THREE.PointsMaterial({ color: C(p.particles), size: 1.6, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })));
    // Hellfire: flame tongues licking up along the front edge.
    const flameTex = (() => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 128;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 104, 2, 32, 80, 60);
      gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(0.25, 'rgba(255,190,60,0.95)'); gr.addColorStop(0.6, 'rgba(255,70,10,0.55)'); gr.addColorStop(1, 'rgba(160,0,0,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(32, 2); g.bezierCurveTo(58, 50, 64, 90, 32, 126); g.bezierCurveTo(0, 90, 6, 50, 32, 2); g.fill();
      return new THREE.CanvasTexture(c);
    })();
    const flames = [];
    for (let i = 0; i < 22; i++) {
      const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: C(i % 3 ? p.primary : p.accent), opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      f.userData = { x: -60 + (i / 21) * 120 + (Math.random() - 0.5) * 6, z: -40 - Math.random() * 30, ph: Math.random() * 10, s: 5 + Math.random() * 6 };
      scene.add(f);
      flames.push(f);
    }
    const hellLight = new THREE.PointLight(C(p.primary), 2500, 90, 1.6);
    hellLight.position.set(0, -18, -45);
    scene.add(hellLight);
    // Embers and ash drifting up through the smoke.
    const an = q.particles;
    const ag = new THREE.BufferGeometry();
    const ap = new Float32Array(an * 3);
    const asp = new Float32Array(an);
    for (let i = 0; i < an; i++) { ap[i * 3] = (Math.random() - 0.5) * 160; ap[i * 3 + 1] = -26 + Math.random() * 90; ap[i * 3 + 2] = -20 - Math.random() * 120; asp[i] = 2 + Math.random() * 6; }
    ag.setAttribute('position', new THREE.BufferAttribute(ap, 3));
    scene.add(new THREE.Points(ag, new THREE.PointsMaterial({ color: C(p.accent), size: 0.55, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })));
    let last = 0;
    return (t) => {
      const dt = Math.min(0.05, t - last); last = t;
      lavaMat.uniforms.time.value = t;
      const pulse = 0.8 + Math.sin(t * 3.1) * 0.12 + Math.random() * 0.1;
      crater.intensity = 9000 * pulse;
      craterGlow.scale.set(52 + pulse * 16, 34 + pulse * 12, 1);
      hellLight.intensity = 2500 * (0.8 + Math.random() * 0.3);
      for (const f of flames) {
        const u = f.userData;
        const k = 0.75 + Math.sin(t * 9 + u.ph) * 0.18 + Math.sin(t * 15.7 + u.ph * 2) * 0.1;
        f.scale.set(u.s * 0.55, u.s * 1.6 * k, 1);
        f.position.set(u.x + Math.sin(t * 3 + u.ph) * 0.6, -26 + u.s * 0.75 * k, u.z);
      }
      const b = bg.attributes.position;
      for (let i = 0; i < n; i++) {
        vel[i * 3 + 1] -= 24 * dt;
        bp[i * 3] += vel[i * 3] * dt; bp[i * 3 + 1] += vel[i * 3 + 1] * dt; bp[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (bp[i * 3 + 1] < -20) spawn(i, false);
      }
      b.needsUpdate = true;
      const a = ag.attributes.position;
      for (let i = 0; i < an; i++) {
        let y = a.getY(i) + asp[i] * dt;
        if (y > 70) y = -26;
        a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t + i) * 0.03);
      }
      a.needsUpdate = true;
    };
  },
  futuristic(scene, p, q) {
    scene.add(gradientSky(p));
    scene.fog = new THREE.FogExp2(C(p.sky1), 0.008);
    // Holographic rings tunnel.
    const rings = [];
    for (let i = 0; i < 14; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(26, 0.18, 8, 120), new THREE.MeshBasicMaterial({ color: C(i % 3 ? p.primary : p.accent), transparent: true, opacity: 0.8 }));
      r.position.z = -i * 18;
      scene.add(r);
      rings.push(r);
    }
    // Hexagon grid floor.
    const hexMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { col: { value: C(p.primary) }, time: { value: 0 } },
      vertexShader: 'varying vec3 vW; void main(){ vW=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }',
      fragmentShader: `uniform vec3 col; uniform float time; varying vec3 vW;
        float hex(vec2 p){ p = abs(p); return max(dot(p, normalize(vec2(1.,1.73))), p.x); }
        void main(){ vec2 uv = vW.xz/4.; vec2 r = vec2(1.,1.73); vec2 h = r*.5;
          vec2 a = mod(uv, r)-h; vec2 b = mod(uv-h, r)-h; vec2 g = dot(a,a)<dot(b,b)?a:b;
          float e = smoothstep(.45,.5,hex(g)); float pulse = .5+.5*sin(length(vW.xz)*.08 - time*2.);
          float fade = smoothstep(-260., -5., vW.z) * smoothstep(120., 20., abs(vW.x));
          gl_FragColor = vec4(col*(e*1.5+pulse*.15), (e*.9+pulse*.08)*fade); }`,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), hexMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -16, -120);
    scene.add(floor);
    // Data streams: particles flying toward the camera.
    const n = q.particles * 2;
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 10 + Math.random() * 40;
      arr[i * 3] = Math.cos(ang) * rad; arr[i * 3 + 1] = Math.sin(ang) * rad; arr[i * 3 + 2] = -Math.random() * 260;
    }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: C(p.particles), size: 0.5, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(pts);
    // Rotating holo core.
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(7, 1), new THREE.MeshBasicMaterial({ color: C(p.accent), wireframe: true, transparent: true, opacity: 0.35 }));
    core.position.set(0, 0, -90);
    scene.add(core);
    let last = 0;
    return (t) => {
      const dt = Math.min(0.05, t - last); last = t;
      hexMat.uniforms.time.value = t;
      rings.forEach((r, i) => { r.position.z += dt * 12; if (r.position.z > 20) r.position.z -= 14 * 18; r.rotation.z = t * 0.1 * (i % 2 ? 1 : -1); r.material.opacity = Math.min(0.9, (r.position.z + 250) / 250); });
      const a = g.attributes.position;
      for (let i = 0; i < n; i++) { let z = a.getZ(i) + dt * 60; if (z > 20) z = -260; a.setZ(i, z); }
      a.needsUpdate = true;
      core.rotation.x = t * 0.2; core.rotation.y = t * 0.3;
    };
  },

  aurora(scene, p, q) {
    scene.add(gradientSky(p));
    const st = stars(q.particles * 2, p.particles, 500, 0.8);
    st.position.y = 80;
    scene.add(st);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { a: { value: C(p.primary) }, b: { value: C(p.accent) }, time: { value: 0 } },
      vertexShader: `uniform float time; varying vec2 vUv; void main(){ vUv=uv; vec3 p=position; p.z += sin(p.x*.03+time*.4)*14. + sin(p.x*.07-time*.3)*6.; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
      fragmentShader: `uniform vec3 a; uniform vec3 b; uniform float time; varying vec2 vUv;
        void main(){ float rays = .5+.5*sin(vUv.x*80.+time*1.5)*sin(vUv.x*23.-time); float fade = smoothstep(0.,.3,vUv.y)*smoothstep(1.,.4,vUv.y);
          vec3 c = mix(a,b,vUv.y); gl_FragColor = vec4(c, fade*(.35+.45*rays)); }`,
    });
    for (let i = 0; i < 3; i++) {
      const cur = new THREE.Mesh(new THREE.PlaneGeometry(400, 70, 200, 1), mat);
      cur.position.set(0, 35 + i * 8, -150 - i * 30);
      cur.rotation.x = 0.2;
      scene.add(cur);
    }
    const snow = new THREE.Mesh(new THREE.PlaneGeometry(600, 300, 60, 30), new THREE.MeshStandardMaterial({ color: '#cfe6ff', roughness: 0.9, flatShading: true }));
    const sp = snow.geometry.attributes.position;
    for (let i = 0; i < sp.count; i++) sp.setZ(i, Math.sin(sp.getX(i) * 0.04) * 4 + Math.random() * 2);
    snow.geometry.computeVertexNormals();
    snow.rotation.x = -Math.PI / 2;
    snow.position.set(0, -18, -120);
    scene.add(snow);
    scene.add(new THREE.HemisphereLight(C(p.primary), C(p.sky1), 0.6));
    return (t) => { mat.uniforms.time.value = t; st.rotation.y = t * 0.005; };
  },

  ocean(scene, p, q) {
    scene.add(gradientSky(p));
    scene.fog = new THREE.FogExp2(C(p.sky1), 0.012);
    // Caustic light ripples on the sea floor.
    const caus = new THREE.ShaderMaterial({
      uniforms: { col: { value: C(p.primary) }, base: { value: C(p.sky2) }, time: { value: 0 } },
      vertexShader: 'varying vec3 vW; void main(){ vW=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }',
      fragmentShader: `uniform vec3 col; uniform vec3 base; uniform float time; varying vec3 vW;
        void main(){ vec2 p = vW.xz*.08; float c=0.; for(int i=1;i<4;i++){ float fi=float(i); p += vec2(sin(p.y*fi+time*.6), cos(p.x*fi-time*.5))*.4; c += abs(sin(p.x+p.y)); }
          c = pow(1.-c/3., 4.)*3.; gl_FragColor = vec4(base*.6 + col*c, 1.); }`,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(500, 400), caus);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -20, -120);
    scene.add(floor);
    // Bubbles.
    const n = q.particles;
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = (Math.random() - 0.5) * 160; arr[i * 3 + 1] = -20 + Math.random() * 90; arr[i * 3 + 2] = -10 - Math.random() * 120; }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const bubbles = new THREE.Points(g, new THREE.PointsMaterial({ color: C(p.particles), size: 0.6, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(bubbles);
    // God rays.
    const rayMat = new THREE.MeshBasicMaterial({ color: C(p.accent), transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const rays = [];
    for (let i = 0; i < 8; i++) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(6 + Math.random() * 8, 160), rayMat);
      r.position.set(-70 + i * 20, 40, -60 - Math.random() * 60);
      r.rotation.z = 0.25;
      scene.add(r);
      rays.push(r);
    }
    let last = 0;
    return (t) => {
      const dt = Math.min(0.05, t - last); last = t;
      caus.uniforms.time.value = t;
      const a = g.attributes.position;
      for (let i = 0; i < n; i++) { let y = a.getY(i) + dt * (2 + (i % 5)); if (y > 70) y = -20; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t + i) * 0.02); }
      a.needsUpdate = true;
      rays.forEach((r, i) => { r.material.opacity = 0.04 + Math.sin(t * 0.5 + i) * 0.02; });
    };
  },
};

// Particle layer used by uploaded image/video themes (transparent over the media).
function particleOverlay(scene, p, q, part) {
  const type = part.type || 'none';
  if (type === 'none') return () => {};
  const n = Math.min(part.count || 800, q.particles * 3);
  const g = new THREE.BufferGeometry();
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = (Math.random() - 0.5) * 160; arr[i * 3 + 1] = (Math.random() - 0.5) * 100; arr[i * 3 + 2] = -10 - Math.random() * 80; }
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const size = { stars: 0.5, embers: 0.7, snow: 0.9, bubbles: 0.8, rain: 0.35 }[type] || 0.6;
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: C(p.particles), size, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(pts);
  const speed = part.speed ?? 1;
  let last = 0;
  return (t) => {
    const dt = Math.min(0.05, t - last) * speed; last = t;
    const a = g.attributes.position;
    for (let i = 0; i < n; i++) {
      let x = a.getX(i); let y = a.getY(i);
      if (type === 'stars') { pts.rotation.z = t * 0.01 * speed; continue; }
      if (type === 'embers' || type === 'bubbles') { y += dt * (4 + (i % 7)); x += Math.sin(t + i) * 0.02; if (y > 50) y = -50; }
      if (type === 'snow') { y -= dt * (3 + (i % 5)); x += Math.sin(t * 0.7 + i) * 0.03; if (y < -50) y = 50; }
      if (type === 'rain') { y -= dt * 60; x -= dt * 6; if (y < -50) { y = 50; x = (Math.random() - 0.5) * 160; } }
      a.setX(i, x); a.setY(i, y);
    }
    a.needsUpdate = true;
  };
}

// Creates and drives a backdrop. quality: 'high' | 'medium' | 'low'.
export class Backdrop {
  constructor(canvas, { sceneName, palette, quality = 'high', motion = true, particles }) {
    this.canvas = canvas;
    this.motion = motion;
    const q = { high: { particles: 1500, ratio: Math.min(2, devicePixelRatio), bloom: true }, medium: { particles: 700, ratio: 1, bloom: true }, low: { particles: 250, ratio: 0.75, bloom: false } }[quality] || { particles: 1500, ratio: 1, bloom: true };
    // Image/video/none themes draw their own background; WebGL only adds particles.
    const overlay = ['image', 'video', 'none'].includes(sceneName);
    if (overlay) q.bloom = false;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance', alpha: overlay });
    if (overlay) this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(q.ratio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.camera.position.set(0, 0, 30);
    this.tick = overlay ? particleOverlay(this.scene, palette, q, particles || {}) : (SCENES[sceneName] || SCENES.standard)(this.scene, palette, q);
    if (q.bloom) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      const strength = { techno: 0.55, futuristic: 0.8, paleolithic: 0.45, volcano: 0.6 }[sceneName] ?? 0.7;
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), strength, 0.5, 0.45);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
    this.mouse = { x: 0, y: 0 };
    this.clock = new THREE.Clock();
    this.resize();
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.ro = new ResizeObserver(this.onResize);
    this.ro.observe(canvas.parentElement);
    this.running = false;
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const hh = Math.max(1, r.height);
    this.renderer.setSize(w, hh, false);
    this.composer && this.composer.setSize(w, hh);
    this.camera.aspect = w / hh;
    this.camera.updateProjectionMatrix();
  }

  setMouse(x, y) {
    this.mouse.x = x;
    this.mouse.y = y;
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const t = this.motion ? this.clock.getElapsedTime() : 0;
      if (this.motion) this.tick(t);
      // Gentle parallax camera.
      this.camera.position.x += (this.mouse.x * 4 - this.camera.position.x) * 0.04;
      this.camera.position.y += (-this.mouse.y * 2.5 - this.camera.position.y) * 0.04;
      this.camera.lookAt(0, 0, -60);
      if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    };
    loop();
    if (!this.motion) { this.tick(0); }
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.ro.disconnect();
    this.scene.traverse((o) => { o.geometry && o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
    this.composer && this.composer.dispose && this.composer.dispose();
    this.renderer.dispose();
  }
}
