import * as THREE from 'three';

const canvas = document.getElementById('stitch3d');
const stage = canvas.parentElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

scene.add(new THREE.HemisphereLight(0xfffaf2, 0xd8cdb8, 2.1));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(3, 6, 5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = key.shadow.camera.bottom = -5;
key.shadow.camera.right = key.shadow.camera.top = 5;
key.shadow.radius = 6;
scene.add(key);
const rim = new THREE.DirectionalLight(0xffd9c9, 0.9);
rim.position.set(-4, 2, -3);
scene.add(rim);

/* ---------- textures ---------- */
function weaveTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) for (let x = 0; x < 256; x += 4) {
    const v = 238 + Math.random() * 17 - ((x + y) / 4 % 2 ? 10 : 0);
    g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 4, 2);
    g.fillStyle = `rgb(${v - 8},${v - 8},${v - 8})`; g.fillRect(x, y + 2, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.2, 2.2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function matTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#e4dccb'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i <= 1024; i += 32) {
    g.strokeStyle = i % 128 === 0 ? 'rgba(15,27,45,.22)' : 'rgba(15,27,45,.08)';
    g.lineWidth = i % 128 === 0 ? 2 : 1;
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1024); g.moveTo(0, i); g.lineTo(1024, i); g.stroke();
  }
  g.strokeStyle = 'rgba(217,71,43,.35)'; g.setLineDash([10, 8]); g.lineWidth = 2;
  g.beginPath(); g.arc(512, 512, 300, 0, Math.PI * 2); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function textTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.redraw = txt => { draw(c.getContext('2d'), w, h, txt); t.needsUpdate = true; };
  return t;
}

/* ---------- garment pieces (shapes in garment space) ---------- */
const S = (pts, curves) => {
  const s = new THREE.Shape();
  s.moveTo(...pts[0]);
  curves(s);
  return s;
};
const body = neckY => S([[-1, -1.5]], s => {
  s.lineTo(1, -1.5); s.lineTo(1, 0.72);
  s.quadraticCurveTo(0.84, 0.95, 0.8, 1.25);
  s.lineTo(0.34, 1.45);
  s.quadraticCurveTo(0, neckY, -0.34, 1.45);
  s.lineTo(-0.8, 1.25);
  s.quadraticCurveTo(-0.84, 0.95, -1, 0.72);
  s.closePath();
});
const sleeve = m => S([[m * 1, 0.72]], s => {
  s.lineTo(m * 1.62, 0.3);
  s.quadraticCurveTo(m * 1.8, 0.5, m * 1.9, 0.78);
  s.lineTo(m * 0.8, 1.25);
  s.quadraticCurveTo(m * 0.84, 0.95, m * 1, 0.72);
});

const fabricMap = weaveTexture();
const fabric = new THREE.MeshStandardMaterial({ color: '#efe8db', map: fabricMap, bumpMap: fabricMap, bumpScale: 0.6, roughness: 0.92, side: THREE.DoubleSide });
const garment = new THREE.Group();
scene.add(garment);

const pieces = [];
function addPiece(shape, z, start) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 24 });
  geo.computeBoundingBox();
  const c = new THREE.Vector3(); geo.boundingBox.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z);
  const m = new THREE.Mesh(geo, fabric);
  m.castShadow = m.receiveShadow = true;
  garment.add(m);
  pieces.push({ m, end: new THREE.Vector3(c.x, c.y, z), start: new THREE.Vector3(...start.pos), rz: start.rz });
}
// laid out on the cutting table (x, y(height), z), rotation on the table
addPiece(body(1.3), -0.07, { pos: [1.55, -1.45, 0.35], rz: -0.12 });  // back
addPiece(body(1.05), 0.07, { pos: [-1.35, -1.45, 0.2], rz: 0.1 });    // front
addPiece(sleeve(1), 0, { pos: [0.6, -1.45, 2.05], rz: 0.5 });
addPiece(sleeve(-1), 0, { pos: [-0.9, -1.45, -1.75], rz: -0.35 });

/* ---------- cutting table ---------- */
const table = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshStandardMaterial({ map: matTexture(), roughness: 1, transparent: true }));
table.rotation.x = -Math.PI / 2; table.position.y = -1.5; table.receiveShadow = true;
scene.add(table);

/* ---------- stitches (seams drawn in thread red) ---------- */
const stitchMat = new THREE.LineDashedMaterial({ color: 0xd9472b, dashSize: 0.055, gapSize: 0.04 });
const seams = [];
const front = 0.115;
function seam(pts) {
  const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0], p[1], front)));
  const l = new THREE.Line(g, stitchMat); l.computeLineDistances();
  l.userData.n = pts.length; g.setDrawRange(0, 0);
  garment.add(l); seams.push(l);
}
const curvePts = (a, ctrl, b, n = 20) => new THREE.QuadraticBezierCurve(new THREE.Vector2(...a), new THREE.Vector2(...ctrl), new THREE.Vector2(...b)).getPoints(n).map(v => [v.x, v.y]);
for (const m of [1, -1]) {
  seam([[m * 0.95, -1.44], [m * 0.95, 0.7]]);                                             // side seam
  seam(curvePts([m * 0.96, 0.72], [m * 0.8, 0.95], [m * 0.77, 1.21]));                  // armhole
  seam([[m * 0.78, 1.2], [m * 0.36, 1.39]]);                                              // shoulder
  seam([[m * 1.58, 0.36], [m * 1.84, 0.76]]);                                             // sleeve hem
}
seam(curvePts([-0.3, 1.38], [0, 1.0], [0.3, 1.38], 30));                                  // neck rib
seam([[-0.95, -1.38], [0.95, -1.38]]);                                                    // hem
seams.forEach(l => { l.visible = false; });

/* ---------- your brand: chest print + woven hem label ---------- */
let brand = 'YOUR BRAND';
let ink = '#0f1b2d';
const printTex = textTexture(1024, 256, (g, w, h, txt) => {
  g.clearRect(0, 0, w, h);
  g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 150; g.font = `italic ${fs}px "Instrument Serif", Georgia, serif`;
  while (g.measureText(txt).width > w * 0.92 && fs > 40) { fs -= 6; g.font = `italic ${fs}px "Instrument Serif", Georgia, serif`; }
  g.fillText(txt.charAt(0) + txt.slice(1).toLowerCase(), w / 2, h / 2 + 8);
});
const print = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.31), new THREE.MeshStandardMaterial({ map: printTex, transparent: true, roughness: 1, opacity: 0, depthWrite: false }));
print.position.set(0, 0.45, front + 0.002);
garment.add(print);

const labelTex = textTexture(512, 220, (g, w, h, txt) => {
  g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 3) { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(x, 0, 1, h); }
  g.setLineDash([10, 7]); g.strokeStyle = 'rgba(239,230,210,.45)'; g.lineWidth = 3; g.strokeRect(12, 12, w - 24, h - 24);
  g.fillStyle = '#efe6d2'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 74; g.font = `${fs}px "Instrument Serif", Georgia, serif`;
  const spaced = txt.split('').join(String.fromCharCode(8202));
  while (g.measureText(spaced).width > w * 0.84 && fs > 26) { fs -= 4; g.font = `${fs}px "Instrument Serif", Georgia, serif`; }
  g.fillText(spaced, w / 2, h / 2 - 8);
  g.font = '500 17px "IBM Plex Mono", monospace'; g.globalAlpha = 0.6;
  g.fillText('100% COTTON · MADE FOR YOU', w / 2, h - 42); g.globalAlpha = 1;
});
const label = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.27, 0.012), [null, null, null, null, new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.8 }), null].map(m => m || new THREE.MeshStandardMaterial({ color: '#1b1b1b' })));
label.castShadow = true;
const labelEnd = new THREE.Vector3(-0.58, -1.12, front + 0.012);
const labelStart = new THREE.Vector3(-2.6, -0.2, 2.2);
garment.add(label);

const redraw = () => { printTex.redraw(brand); labelTex.redraw(brand); };
document.fonts && document.fonts.ready.then(redraw);
redraw();
addEventListener('brand', e => { brand = e.detail; redraw(); });
const targetColor = new THREE.Color('#efe8db');
addEventListener('fabric', e => {
  targetColor.set(e.detail);
  const hsl = {}; targetColor.getHSL(hsl);
  ink = hsl.l < 0.35 ? '#efe6d2' : '#0f1b2d';
  printTex.redraw(brand);
});

/* ---------- interaction ---------- */
let drag = 0, dragV = 0, down = false, lastX = 0;
canvas.addEventListener('pointerdown', e => { down = true; lastX = e.clientX; });
addEventListener('pointerup', () => { down = false; });
addEventListener('pointermove', e => {
  if (!down) return;
  dragV = (e.clientX - lastX) * 0.008; lastX = e.clientX;
});

/* ---------- layout ---------- */
let mobile = false;
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  mobile = w < 761;
}
addEventListener('resize', resize);
resize();

/* ---------- animation ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lerp = (a, b, t) => a + (b - a) * t;
const camFrom = new THREE.Vector3(), camTo = new THREE.Vector3(), look = new THREE.Vector3();
let p = 0, visible = false;
const clock = new THREE.Clock();

new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(stage);

function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const t = clock.getElapsedTime();
  p += ((window.labelProgress || 0) - p) * 0.09;

  // 1. cut -> assemble (pieces lift off the table and fly into place)
  pieces.forEach((pc, i) => {
    const a = ease(range(p, 0.04 + i * 0.05, 0.3 + i * 0.03));
    pc.m.position.lerpVectors(pc.start, pc.end, a);
    pc.m.position.y += Math.sin(a * Math.PI) * 0.9;
    pc.m.rotation.set(lerp(-Math.PI / 2, 0, a), Math.sin(a * Math.PI) * (i % 2 ? 0.5 : -0.5), lerp(pc.rz, 0, a));
  });
  table.material.opacity = 1 - range(p, 0.22, 0.4);
  table.visible = table.material.opacity > 0.01;

  // 2. stitch: seams sew themselves one after another
  const s = range(p, 0.33, 0.58);
  seams.forEach((l, i) => {
    const k = clamp(s * seams.length - i * 0.6);
    l.visible = k > 0;
    l.geometry.setDrawRange(0, Math.ceil(k * l.userData.n));
  });

  // 3. label: brand printed on the chest, woven label sewn on the hem
  const lp = ease(range(p, 0.6, 0.74));
  print.material.opacity = ease(range(p, 0.64, 0.76));
  label.position.lerpVectors(labelStart, labelEnd, lp);
  label.rotation.set(lerp(-1.2, 0, lp), lerp(2.4, 0, lp), lerp(0.6, 0.02, lp));
  label.visible = p > 0.58;

  fabric.color.lerp(targetColor, 0.08);

  // garment idle motion + drag
  if (!down) dragV *= 0.94;
  drag += dragV;
  const settled = range(p, 0.3, 0.45);
  garment.rotation.y = settled * (Math.sin(t * 0.6) * 0.18 + 0.12) + drag;
  garment.rotation.x = settled * Math.sin(t * 0.8) * 0.03;
  garment.position.x = mobile ? 0 : lerp(0.6, 1.25, settled);
  garment.position.y = mobile ? lerp(0.2, 0.75, settled) : 0;

  // camera: overhead table -> front view -> close on label -> pull back
  const zoom = ease(range(p, 0.6, 0.72)) * (1 - ease(range(p, 0.8, 0.95)));
  const dist = mobile ? 11 : 8.2;
  camFrom.set(mobile ? 0 : 0.6, mobile ? 11.5 : 8.5, mobile ? 3.5 : 2.6);
  camTo.set(garment.position.x, garment.position.y + 0.1, dist);
  const c = ease(range(p, 0.08, 0.42));
  camera.position.lerpVectors(camFrom, camTo, c);
  const lw = new THREE.Vector3(); label.getWorldPosition(lw);
  camera.position.lerp(new THREE.Vector3(lw.x + 0.5, lw.y + 0.35, lw.z + (mobile ? 3.4 : 2.4)), zoom * 0.85);
  look.set(lerp(garment.position.x * c, garment.position.x, c), lerp(-1.4, garment.position.y, c), 0);
  look.lerp(lw, zoom * 0.85);
  camera.lookAt(look);

  renderer.render(scene, camera);
}
frame();
