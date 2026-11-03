import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const app = document.querySelector('#app');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const config = await fetch('./three.json?v='+Date.now()).then((r) => {
  if (!r.ok) throw new Error(`No se pudo cargar three.json (${r.status})`);
  return r.json();
});

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  config.camera.fov,
  window.innerWidth / window.innerHeight,
  0.05,
  100
);
camera.position.fromArray(config.camera.position);
const cameraTarget = new THREE.Vector3(...config.camera.lookAt);
camera.lookAt(cameraTarget);

// Real dimensions from the supplied dieline, scaled to web-friendly scene units.
const W = config.dimensionsMm.width * config.scale;
const D = config.dimensionsMm.depth * config.scale;
const H = config.dimensionsMm.height * config.scale;

// Outer group spins around the vertical axis; inner box stands on a corner, lid to camera.
const spin = new THREE.Group();
scene.add(spin);
const turntable = new THREE.Group();
turntable.rotation.order = 'ZYX';
turntable.rotation.set(Math.PI / 2, 0, config.tilt ?? -0.82);
spin.add(turntable);

// Base carton body. The face artwork is applied as very thin textured panels above it,
// leaving a small dark edge visible to mimic the folded mailer construction.
const bodyMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xc23a4a,
  roughness: 0.82,
  metalness: 0,
  clearcoat: 0.02,
  clearcoatRoughness: 0.9
});
const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), bodyMaterial);
body.castShadow = true;
body.receiveShadow = true;
turntable.add(body);

function makePaperNoise(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = Math.max(0, Math.min(255, 128 + (Math.random() - 0.5) * 28));
    image.data[i] = n;
    image.data[i + 1] = n;
    image.data[i + 2] = n;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}
const paperNoise = makePaperNoise();

const loader = new THREE.TextureLoader();
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

async function loadTexture(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      resolve(texture);
    }, undefined, reject);
  });
}

const textures = Object.fromEntries(
  await Promise.all(
    Object.entries(config.textures).map(async ([name, url]) => [name, await loadTexture(url)])
  )
);

function faceMaterial(map) {
  return new THREE.MeshPhysicalMaterial({
    map,
    roughness: config.materials.roughness,
    metalness: 0,
    clearcoat: config.materials.clearcoat,
    clearcoatRoughness: config.materials.clearcoatRoughness,
    bumpMap: paperNoise,
    bumpScale: config.materials.bumpScale
  });
}

// Artwork runs edge to edge up to the creases; panels slightly oversize so no body edge shows.
const lift = 0.0012;
const inset = -lift;

function addPanel(geometry, material, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  turntable.add(mesh);
  return mesh;
}

// Top / lid
addPanel(
  new THREE.PlaneGeometry(W - inset * 2, D - inset * 2),
  faceMaterial(textures.top),
  [0, H / 2 + lift, 0],
  [-Math.PI / 2, 0, 0]
);

// Bottom
addPanel(
  new THREE.PlaneGeometry(W - inset * 2, D - inset * 2),
  faceMaterial(textures.bottom),
  [0, -H / 2 - lift, 0],
  [Math.PI / 2, 0, 0]
);

// Front (+Z)
addPanel(
  new THREE.PlaneGeometry(W - inset * 2, H - inset * 2),
  faceMaterial(textures.front),
  [0, 0, D / 2 + lift]
);

// Back (-Z): flip horizontally so the printed artwork reads correctly from outside.
textures.back.wrapS = THREE.RepeatWrapping;
textures.back.repeat.x = -1;
textures.back.offset.x = 1;
addPanel(
  new THREE.PlaneGeometry(W - inset * 2, H - inset * 2),
  faceMaterial(textures.back),
  [0, 0, -D / 2 - lift],
  [0, Math.PI, 0]
);

// Left (-X)
addPanel(
  new THREE.PlaneGeometry(D - inset * 2, H - inset * 2),
  faceMaterial(textures.left),
  [-W / 2 - lift, 0, 0],
  [0, -Math.PI / 2, 0]
);

// Right (+X)
textures.right.wrapS = THREE.RepeatWrapping;
textures.right.repeat.x = -1;
textures.right.offset.x = 1;
addPanel(
  new THREE.PlaneGeometry(D - inset * 2, H - inset * 2),
  faceMaterial(textures.right),
  [W / 2 + lift, 0, 0],
  [0, Math.PI / 2, 0]
);

// Fold rails: subtle structure that makes the box feel like a real die-cut mailer,
// rather than a perfectly mathematical cuboid.
const railMat = new THREE.MeshPhysicalMaterial({
  color: 0x7a2932,
  roughness: 0.78,
  clearcoat: 0.02,
  clearcoatRoughness: 0.9
});
function rail(sx, sy, sz, x, y, z) {
  const r = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), railMat);
  r.position.set(x, y, z);
  r.castShadow = true;
  turntable.add(r);
}
// Creases (hendidos): thin pressed fold lines like the real mailer — shadow groove + light lip.
const creaseTex = (() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 4;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.35, 'rgba(255,235,230,0.10)');
  gr.addColorStop(0.5, 'rgba(30,0,8,0.22)'); gr.addColorStop(0.65, 'rgba(30,0,8,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const creaseMat = new THREE.MeshBasicMaterial({ map: creaseTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
// Fold logic (mailer): lid hinges on -X and tucks in on +X; walls each get one crease below the lid line.
// One line per fold, never crossing.
function creaseFace(pos, rot, lines) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.set(...rot);
  for (const [dir, at, len, w] of lines) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), creaseMat);
    if (dir === 'h') { m.rotation.z = Math.PI / 2; m.position.set(0, at, 0.0006); }
    else m.position.set(at, 0, 0.0006);
    g.add(m);
  }
  turntable.add(g);
}
const CL = 0.02, CS = 0.012, m0 = 0.03;
creaseFace([0, H / 2 + lift, 0], [-Math.PI / 2, 0, 0], [
  ['v', -(W / 2 - 0.07), D - m0 * 2, CL],
  ['v', W / 2 - 0.04, D - m0 * 2, CL]
]);
creaseFace([0, 0, D / 2 + lift], [0, 0, 0], [['h', H / 2 - 0.045, W - m0 * 2, CS]]);
creaseFace([0, 0, -D / 2 - lift], [0, Math.PI, 0], [['h', H / 2 - 0.045, W - m0 * 2, CS]]);
creaseFace([-W / 2 - lift, 0, 0], [0, -Math.PI / 2, 0], [['h', H / 2 - 0.02, D - m0 * 2, CS]]);
creaseFace([W / 2 + lift, 0, 0], [0, Math.PI / 2, 0], [['h', H / 2 - 0.045, D - m0 * 2, CS]]);

turntable.updateMatrix();
{
  let low = null;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const v = new THREE.Vector3(sx * W / 2, sy * H / 2, sz * D / 2).applyMatrix4(turntable.matrix);
    if (!low || v.y < low.y - 1e-6) low = v;
  }
  turntable.position.set(-low.x, -low.y + 0.004, 0);
}
// Fit camera so the whole box (at any spin angle) plus its shadow stays inside the frame.
const fitR = Math.hypot(W, H, D) / 2 + Math.abs(turntable.position.x);
const fitY = turntable.position.y;
const elev = Math.atan2(config.camera.position[1] - config.camera.lookAt[1], config.camera.position[2]);
function fitCamera() {
  const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
  const hf = Math.atan(Math.tan(vf) * camera.aspect);
  const dist = (fitR * 1.12) / Math.sin(Math.min(vf, hf));
  camera.position.set(0, fitY + Math.sin(elev) * dist, Math.cos(elev) * dist);
  camera.lookAt(0, fitY, 0);
}
fitCamera();

// Lighting tuned to the supplied studio reference.
// Poly Haven "University Workshop" HDRI as image-based lighting (background stays transparent).
const pmrem = new THREE.PMREMGenerator(renderer);
new RGBELoader().load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/university_workshop_1k.hdr', (hdr) => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  scene.environmentIntensity = 0.9;
  hdr.dispose();
  hemi.intensity = 0.35; key.intensity = 2.2; fill.intensity = 0.3; rim.intensity = 0.3;
}, undefined, (e) => console.warn('HDRI no cargado', e));
const hemi = new THREE.HemisphereLight(0xffffff, 0x6b5056, 1.35);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xfff7f1, 3.4);
key.position.set(-3.4, 5.5, 4.2);
scene.add(key);

// Overhead light only casts the shadow, so it sits straight below the box and turns with it.
const top = new THREE.DirectionalLight(0xffffff, 0.9);
top.position.set(0, 8, 0.0001);
top.target.position.set(0, 0, 0);
scene.add(top.target);
const sh = top;
sh.castShadow = false;
sh.shadow.mapSize.set(2048, 2048);
sh.shadow.camera.left = -2.5;
sh.shadow.camera.right = 2.5;
sh.shadow.camera.top = 2.5;
sh.shadow.camera.bottom = -2.5;
sh.shadow.camera.near = 0.1;
sh.shadow.camera.far = 12;
sh.shadow.bias = -0.0002;
sh.shadow.radius = 6;
scene.add(sh);

const fill = new THREE.DirectionalLight(0xd8e1e7, 0.85);
fill.position.set(4.5, 2.8, 1.2);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffc4ba, 0.58);
rim.position.set(0.4, 3.2, -4.8);
scene.add(rim);

// Ground plane catches a soft, realistic contact shadow while the CSS background
// supplies the subtle studio gradient.
const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ color: 0x35302f, opacity: 0.20 })
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -0.008;
shadowPlane.receiveShadow = true;

// Soft blurred contact shadow: an elliptical gradient under the box that turns with it.
const blobTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(40,30,30,0.55)'); gr.addColorStop(0.35, 'rgba(40,30,30,0.28)'); gr.addColorStop(1, 'rgba(40,30,30,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
})();
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
blob.rotation.x = -Math.PI / 2;
blob.position.set(turntable.position.x * 0.35, 0.002, 0);
blob.scale.set(W * 0.75, H * 1.6, 1);
spin.add(blob);

// Gentle drag interaction: lets the user inspect the pack without introducing a UI library.
let dragging = false;
let previousX = 0;
let dragYaw = 0;
let dragVelocity = 0;
let paused = false;

renderer.domElement.addEventListener('pointerdown', (e) => {
  dragging = true;
  previousX = e.clientX;
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - previousX;
  previousX = e.clientX;
  const delta = dx * 0.007;
  dragYaw += delta;
  dragVelocity = delta;
});
renderer.domElement.addEventListener('pointerup', (e) => {
  dragging = false;
  renderer.domElement.releasePointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointercancel', () => { dragging = false; });
renderer.domElement.addEventListener('dblclick', () => { paused = !paused; });

// Blend linear rotation with smoothstep. At 0.18 it feels premium and subtly eased,
// without the obvious stop-start of a full ease-in/ease-out loop.
function easedLoop01(t, blend = 0.18) {
  const smooth = t * t * (3 - 2 * t);
  return THREE.MathUtils.lerp(t, smooth, blend);
}

const clock = new THREE.Clock();
let elapsedMs = 0;

document.body.classList.remove('is-loading');

let exportMode = false;
function frame() {
  requestAnimationFrame(frame);
  if (exportMode) return;

  const dt = Math.min(clock.getDelta(), 0.05);
  if (!paused && !dragging && !reducedMotion) elapsedMs += dt * 1000;

  // Very light inertia after manual drag.
  if (!dragging && Math.abs(dragVelocity) > 0.00002) {
    dragYaw += dragVelocity;
    dragVelocity *= Math.pow(0.12, dt);
  }

  const duration = config.animation.durationMs;
  const phase = ((elapsedMs % duration) + duration) % duration / duration;
  const eased = easedLoop01(phase, config.animation.easeBlend);
  const autoYaw = reducedMotion ? 0 : eased * Math.PI * 2 * config.animation.direction;

  spin.rotation.y = config.animation.startRotationY + autoYaw + dragYaw;

  renderer.render(scene, camera);
}
frame();

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  fitCamera();
}
window.addEventListener('resize', onResize, { passive: true });

// Frame-exact hooks used by the GIF/MP4 exporter.
window.boxExport = {
  envReady: () => !!scene.environment,
  prepare(pr) {
    exportMode = true;
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(pr); renderer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix(); fitCamera();
  },
  frame(p) {
    spin.rotation.y = config.animation.startRotationY + easedLoop01(p, config.animation.easeBlend) * Math.PI * 2 * config.animation.direction;
    renderer.render(scene, camera);
    return renderer.domElement;
  }
};
