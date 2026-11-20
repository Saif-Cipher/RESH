import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const { clamp, lerp } = THREE.MathUtils;
const PI = Math.PI;
const BOTTLE_HEIGHT = 3.68;
const smooth = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const point = (x, y, size) => ({ x, y, size });
const mix = (from, to, amount) =>
  point(lerp(from.x, to.x, amount), lerp(from.y, to.y, amount), lerp(from.size, to.size, amount));

function textureCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

function labelTexture(fragrance, presentation, back) {
  const { canvas, ctx } = textureCanvas(440, 568);
  const { label: [width, height], paper: stock, text: ink } = presentation;
  const light = new THREE.Color(stock).lerp(new THREE.Color('#ffffff'), .06);
  const shade = new THREE.Color(stock).lerp(new THREE.Color('#221c1a'), .11);
  const paper = ctx.createLinearGradient(0, 0, 440, 568);
  paper.addColorStop(0, '#' + light.getHexString());
  paper.addColorStop(.48, stock);
  paper.addColorStop(1, '#' + shade.getHexString());
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, 440, 568);
  let grain = 41291;
  for (let i = 0; i < 7500; i++) {
    grain ^= grain << 13;
    grain ^= grain >>> 17;
    grain ^= grain << 5;
    ctx.fillStyle = grain & 1 ? '#45382d15' : '#fffae51f';
    ctx.fillRect((grain & 65535) % 440, (grain >>> 16) % 568, 1, 1);
  }
  ctx.strokeStyle = ink + '99';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, 412, 540);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.translate(220, 0);
  ctx.scale(clamp(440 / 568 * height / width, .62, 1.17), 1);
  ctx.font = '600 74px Georgia, serif';
  ctx.fillText('RESH', 0, 140, 330);
  ctx.fillRect(-46, 173, 92, 2);
  ctx.font = '55px Georgia, serif';
  const lines = back ? ['Bangladesh'] : fragrance.name.length > 11 ? fragrance.name.split(' ') : [fragrance.name];
  lines.forEach((line, index) => ctx.fillText(line, 0, 303 + (index - (lines.length - 1) / 2) * 60, 315));
  ctx.font = '600 24px sans-serif';
  ctx.fillText('EXTRAIT DE PARFUM', 0, 451, 316);
  ctx.font = '19px sans-serif';
  ctx.fillText('50 ML', 0, 496);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function woodTexture() {
  const { canvas, ctx } = textureCanvas(512, 256);
  const data = ctx.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const theta = x / canvas.width * 2 * PI;
      const growth = theta * 26 + Math.sin(y * .026 + theta * 3) * 2.2 + Math.sin(y * .048 + theta * 6) * .59;
      const line = Math.sin(growth) ** 8;
      const grain = (Math.cos(theta * 4 + y * .007) + .4 * Math.sin(growth * 2)) * 7 - line * 19;
      const speck = ((x * 111 + y * 61) % 29 - 14) * .19;
      const i = (y * canvas.width + x) * 4;
      data.data[i] = 79 + grain + speck;
      data.data[i + 1] = 45 + grain * .70;
      data.data[i + 2] = 28 + grain * .48;
      data.data[i + 3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function addMesh(group, geometry, material, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, y, z);
  group.add(mesh);
  return mesh;
}

function vesselGeometry(rings, profile, flutes = 0) {
  const segments = flutes ? 104 : 64;
  const positions = [];
  const colors = [];
  const indices = [];
  for (const [y, width, depth] of rings) {
    const light = lerp(.4, 1, smooth((y + 1.64) / 2.14));
    for (let i = 0; i < segments; i++) {
      const angle = 2 * PI * i / segments;
      const x = Math.cos(angle);
      const z = Math.sin(angle);
      const fluting = flutes * Math.sin(angle * 38) * Math.abs(x) ** 2.1;
      positions.push(
        Math.sign(x) * Math.abs(x) ** profile * (width + fluting),
        y,
        Math.sign(z) * Math.abs(z) ** profile * (depth + fluting * .76),
      );
      colors.push(light, light, light);
    }
  }
  for (let row = 0; row < rings.length - 1; row++) {
    for (let i = 0; i < segments; i++) {
      const a = row * segments + i;
      const b = row * segments + (i + 1) % segments;
      indices.push(a, a + segments, b, b, a + segments, b + segments);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const presentations = {
  pahari: {
    profile: .48, flutes: .014, head: .81,
    rings: [[-1.72,0,0],[-1.72,.62,.36],[-1.67,.77,.428],[-1.57,.83,.45],[-1.25,.845,.45],
      [.20,.86,.45],[.47,.81,.422],[.62,.63,.337],[.76,.34,.236],[.81,.24,.19],[.81,0,0]],
    glass: '#85946a', absorption: '#47673d', liquid: '#607444', cap: 'orb', finish: '#9d855c',
    label: [1.15,1.42,-.59], paper: '#f1edd6', text: '#283a26',
  },
  'knights-oud': {
    profile: .26, head: .99,
    rings: [[-1.74,0,0],[-1.74,.93,.46],[-1.70,1.03,.52],[-1.61,1.06,.55],
      [.77,1.06,.55],[.91,1.03,.52],[.98,.94,.45],[.99,.34,.25],[.99,0,0]],
    glass: '#78644b', absorption: '#5b331c', liquid: '#73431f', cap: 'armor', finish: '#a2865d',
    label: [1.46,1.15,-.52], paper: '#211b18', text: '#e7d6a9',
  },
  'resh-swim': {
    profile: .72, head: .91,
    rings: [[-1.69,0,0],[-1.69,.65,.31],[-1.64,.84,.40],[-1.44,.94,.449],
      [-.83,1.03,.47],[-.22,1.06,.48],[.30,.98,.455],[.59,.83,.39],[.81,.56,.31],
      [.91,.285,.23],[.91,0,0]],
    glass: '#78b1a7', absorption: '#277864', liquid: '#4c8f7d', cap: 'dome', finish: '#c8cbce',
    label: [1.27,.97,-.43], paper: '#e9f6ef', text: '#174a42',
  },
  'vampire-blood': {
    profile: .65, flutes: .008, head: 1.03,
    rings: [[-1.74,0,0],[-1.74,.49,.32],[-1.68,.59,.39],[-1.54,.64,.426],
      [-.73,.69,.45],[.14,.83,.50],[.64,.96,.55],[.76,.93,.53],[.97,.46,.29],[1.03,.29,.22],[1.03,0,0]],
    glass: '#aa3c56', absorption: '#8e1538', liquid: '#9c234e', cap: 'garnet', finish: '#9d6873',
    label: [1.10,1.42,-.43], paper: '#391726', text: '#f5ddd8',
  },
  'resh-oud': {
    profile: .81, head: .70,
    rings: [[-1.70,0,0],[-1.70,.81,.44],[-1.63,.99,.50],[-1.48,1.08,.55],[-.98,1.13,.565],
      [-.40,1.13,.565],[.02,1.03,.545],[.36,.86,.455],[.61,.52,.318],[.70,.255,.212],[.70,0,0]],
    glass: '#b48649', absorption: '#8a4e21', liquid: '#a46a24', cap: 'walnut', finish: '#b1844b',
    label: [1.45,1.04,-.66], paper: '#f2e3c4', text: '#563321',
  },
  'acqua-profumo': {
    profile: .29, head: 1.18,
    rings: [[-1.74,0,0],[-1.74,.63,.345],[-1.67,.72,.39],[-1.56,.745,.418],
      [.98,.745,.418],[1.11,.718,.395],[1.17,.60,.335],[1.18,.275,.225],[1.18,0,0]],
    glass: '#83acc4', absorption: '#467f9b', liquid: '#598eac', cap: 'chrome', finish: '#c6d2d7',
    label: [1.00,1.58,-.30], paper: '#e7f0f1', text: '#153347',
  },
};

function createKit() {
  const wood = woodTexture();
  return {
    neck: new THREE.CylinderGeometry(.242, .268, .29, 40),
    collar: new THREE.CylinderGeometry(.32, .32, .095, 40),
    ring: new THREE.TorusGeometry(.299, .017, 8, 40),
    wood: new THREE.MeshStandardMaterial({ map: wood, roughness: .43, bumpMap: wood, bumpScale: .017 }),
    tube: new THREE.MeshStandardMaterial({ color: '#e5d8b7', roughness: .29, opacity: .52, transparent: true }),
  };
}

function sectionAt(rings, y) {
  for (let index = 1; index < rings.length; index++) {
    const [upper, width, depth] = rings[index];
    if (y < upper) {
      const [lower, previousWidth, previousDepth] = rings[index - 1];
      const amount = clamp((y - lower) / (upper - lower), 0, 1);
      return [lerp(previousWidth, width, amount), lerp(previousDepth, depth, amount)];
    }
  }
  return rings.at(-1).slice(1);
}

function curvedLabel(presentation) {
  const [width, height, center] = presentation.label;
  const geometry = new THREE.PlaneGeometry(width, height, 20, 18);
  const vertices = geometry.getAttribute('position');
  for (let index = 0; index < vertices.count; index++) {
    const x = vertices.getX(index);
    const y = vertices.getY(index) + center;
    const [halfWidth, depth] = sectionAt(presentation.rings, y);
    const radialX = clamp(Math.abs(x) / halfWidth, 0, .99) ** (1 / presentation.profile);
    const z = depth * Math.sqrt(1 - radialX ** 2) ** presentation.profile;
    vertices.setXYZ(index, x, y, z + .018);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function fillGeometry({ rings, profile, head }) {
  const floor = -1.45;
  const top = Math.min(.70, head - .23);
  const outline = [floor, floor + .05, ...rings.map(([y]) => y).filter((y) => y > floor + .05 && y < top - .025), top - .02, top]
    .map((y) => {
      const [width, depth] = sectionAt(rings, y);
      return [y, width * .84, depth * .79];
    });
  return vesselGeometry([[floor, 0, 0], ...outline, [top, 0, 0]], profile);
}

function addCap(bottle, presentation, kit, hardware) {
  const { cap, head } = presentation;
  const bottom = head + .21;
  const capHeight = 1.93 - bottom;
  const center = bottom + capHeight / 2;
  if (cap === 'orb' || cap === 'walnut') {
    const shape = cap === 'orb'
      ? new THREE.SphereGeometry(.54, 42, 28)
      : new THREE.CylinderGeometry(.46, .51, 1, 12);
    const capMesh = addMesh(bottle, shape, kit.wood, center);
    capMesh.scale.y = cap === 'orb' ? capHeight / 1.08 : capHeight;
    if (cap === 'walnut') addMesh(bottle, new THREE.CylinderGeometry(.52, .52, .045, 40), hardware, bottom + .018);
    return;
  }

  if (cap === 'dome') {
    const shape = new THREE.LatheGeometry([
      [0,0],[.413,0],[.43,.10],[.43,.43],[.404,.72],[.37,.89],[.30,.970],[.17,1],[0,1],
    ].map(([r,h]) => new THREE.Vector2(r,h * capHeight)), 48);
    addMesh(bottle, shape, hardware, bottom);
    return;
  }

  if (cap === 'garnet') {
    const shape = new THREE.CylinderGeometry(.395, .46, capHeight, 8, 1);
    const finish = new THREE.MeshStandardMaterial({ color:'#27171e', roughness:.24, metalness:.49, flatShading:true });
    addMesh(bottle, shape, finish, center).rotation.y = PI / 8;
    addMesh(bottle, new THREE.CylinderGeometry(.465,.465,.035,8), hardware, bottom + .028).rotation.y = PI / 8;
    return;
  }

  const dark = cap === 'armor';
  const finish = dark
    ? new THREE.MeshStandardMaterial({ color:'#24242a', roughness:.30, metalness:.69 })
    : hardware;
  const half = dark ? .53 : .444;
  const depth = dark ? .372 : .344;
  const shape = vesselGeometry([
    [-capHeight/2,0,0],[-capHeight/2,half*.91,depth*.91],[-capHeight/2+.045,half,depth],
    [capHeight/2-.066,half,depth],[capHeight/2-.012,half*.90,depth*.90],[capHeight/2,0,0],
  ], .29);
  addMesh(bottle, shape, finish, center);
  if (dark) {
    const band = vesselGeometry([[-.026,half+.007,depth+.008],[.026,half+.007,depth+.008]], .29);
    addMesh(bottle, band, hardware, bottom + .047);
  }
}

function createBottle(fragrance, kit) {
  const presentation = presentations[fragrance.id];
  const bottle = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({
    color: presentation.glass, transmission: .83, thickness: .24, roughness: .083,
    ior: 1.52, attenuationColor: presentation.absorption, attenuationDistance: .80,
    envMapIntensity: .83, specularIntensity: .62,
  });
  const liquid = new THREE.MeshPhysicalMaterial({
    color: presentation.liquid, roughness: .19, clearcoat: .22, vertexColors: true,
  });
  const hardware = new THREE.MeshStandardMaterial({
    color: presentation.finish, roughness: .26, metalness: .87,
  });
  const { head, profile, rings, flutes } = presentation;
  addMesh(bottle, vesselGeometry(rings, profile, flutes), glass);
  addMesh(bottle, fillGeometry(presentation), liquid);
  addMesh(bottle, kit.neck, glass, head + .085);
  addMesh(bottle, kit.collar, hardware, head + .204);
  addMesh(bottle, kit.ring, hardware, head + .241).rotation.x = PI / 2;
  const pickup = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(.02, head + .014, -.07), new THREE.Vector3(.051, .34, -.069),
    new THREE.Vector3(.106, -.36, -.03), new THREE.Vector3(.193, -1.36, .017),
  ]), 12, .015, 6, false);
  addMesh(bottle, pickup, kit.tube);
  addCap(bottle, presentation, kit, hardware);

  const label = curvedLabel(presentation);
  for (const side of [1, -1]) {
    const material = new THREE.MeshBasicMaterial({
      map: labelTexture(fragrance, presentation, side < 0), toneMapped: false, polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    addMesh(bottle, label, material).rotation.y = side < 0 ? PI : 0;
  }
  return bottle;
}

function createStudio(canvas, preserveDrawingBuffer = false) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .91;
  renderer.transmissionResolutionScale = preserveDrawingBuffer ? 1 : .57;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .035);
  scene.environment = environment.texture;
  scene.environmentIntensity = 1.01;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#fff1dc', '#372921', .88));
  for (const [color, intensity, x, y, z] of [
    ['#fdf2e9', 2.45, -310, 500, 420],
    ['#e7eafa', 1.28, 460, 110, 300],
    ['#fff0ca', 2.4, 170, 395, -410],
  ]) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(x, y, z);
    scene.add(light);
  }
  return { renderer, scene, environment };
}

export function renderBottleArtwork(fragrances) {
  const canvas = document.createElement('canvas');
  const { renderer, scene, environment } = createStudio(canvas, true);
  const kit = createKit();
  const camera = new THREE.OrthographicCamera(-1.85, 1.85, 2.277, -2.277, 1, 100);
  camera.position.z = 14;
  renderer.setSize(416, 512, false);
  const artwork = {};
  for (const fragrance of fragrances) {
    const bottle = createBottle(fragrance, kit);
    bottle.rotation.set(.055, -.205, .035);
    scene.add(bottle);
    renderer.render(scene, camera);
    artwork[fragrance.id] = canvas.toDataURL('image/webp', .93);
    scene.remove(bottle);
  }
  environment.dispose();
  renderer.dispose();
  return artwork;
}


function createMist(scene) {
  const count = 104;
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3);
  const marks = new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2);
  geometry.setAttribute('position', position);
  geometry.setAttribute('aMark', marks);
  const material = new THREE.ShaderMaterial({
    uniforms: { pixelRatio: { value: 1 }, tint: { value: new THREE.Color('#eee2d0') } },
    vertexShader: `
      attribute vec2 aMark;
      uniform float pixelRatio;
      varying float vFade;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(1.0, aMark.x * pixelRatio);
        vFade = aMark.y;
      }
    `,
    fragmentShader: `
      uniform vec3 tint;
      varying float vFade;
      void main() {
        vec2 offset = gl_PointCoord - vec2(0.5);
        float falloff = max(0.0, 1.0 - dot(offset, offset) * 4.0);
        gl_FragColor = vec4(tint, falloff * falloff * vFade);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const cloud = new THREE.Points(geometry, material);
  cloud.frustumCulled = false;
  cloud.visible = false;
  scene.add(cloud);
  const seeds = Array.from({ length: count }, (_, i) => ({
    angle: i * 2.399963,
    drift: ((i * 37 + 29) % 103) / 103,
    opacity: .22 + ((i * 83 + 7) % 97) / 180,
  }));
  return function mist(pose, progress, hue, pixelRatio) {
    cloud.visible = progress > .002 && progress < .999;
    if (!cloud.visible) return;
    material.uniforms.tint.value.set(hue).lerp(new THREE.Color('#fff8eb'), .58);
    material.uniforms.pixelRatio.value = pixelRatio;
    const fade = Math.sin(progress * PI);
    const spread = pose.size * (.16 + progress * 1.08);
    seeds.forEach(({ angle, drift, opacity }, i) => {
      const radius = spread * (.13 + drift * .87);
      const swirl = angle + progress * .84 + drift * .42;
      position.setXYZ(i,
        pose.x + Math.cos(swirl) * radius,
        -pose.y + Math.sin(swirl) * radius * .68 + progress * 38,
        69 + Math.sin(angle * 4) * 80,
      );
      const blur = i % 6 === 0 ? 2.9 : 1;
      marks.setXY(i, (1.3 + drift * 2.4) * blur, fade * opacity / Math.sqrt(blur));
    });
    position.needsUpdate = true;
    marks.needsUpdate = true;
  };
}

function makeShadows(scene, count) {
  const { canvas, ctx } = textureCanvas(128, 128);
  const blur = ctx.createRadialGradient(64, 64, 0, 64, 64, 63);
  blur.addColorStop(0, '#3a251e88');
  blur.addColorStop(.40, '#3a251e48');
  blur.addColorStop(1, '#3a251e00');
  ctx.fillStyle = blur;
  ctx.fillRect(0, 0, 128, 128);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return Array.from({ length: count }, () => {
    const shadow = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
    shadow.visible = false;
    scene.add(shadow);
    return shadow;
  });
}

export function createStage(fragrances, state) {
  const canvas = document.createElement('canvas');
  canvas.id = 'bottle-stage';
  canvas.setAttribute('aria-hidden', 'true');
  const { renderer, scene } = createStudio(canvas);
  const kit = createKit();
  const models = fragrances.map((fragrance) => {
    const bottle = createBottle(fragrance, kit);
    scene.add(bottle);
    return bottle;
  });
  const shadows = makeShadows(scene, models.length);
  const mist = createMist(scene);
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, 1, 5000);
  camera.position.z = 2200;
  const hero = document.querySelector('#hero-model');
  const notes = document.querySelector('#notes-model');
  const notesFrame = document.querySelector('.notes-frame');
  const notesSection = document.querySelector('#notes');
  const collection = document.querySelector('#collection');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const total = fragrances.length;
  let target = state().active;
  let center = target;
  let spin = 0;
  let paintedSpin = 0;
  let scroll = window.scrollY;
  let width;
  let height;
  let pixelRatio;
  let frame = 0;
  let previousFrame;
  let layout;
  let dirty = true;
  let travellingCard;
  let canvasOccupied = false;
  let lost = false;

  function refresh() {
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio, width < 701 ? 1.25 : 1.5);
    camera.right = width;
    camera.bottom = -height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    update(true);
  }

  function measure(active, scrollY) {
    const heroRect = hero.getBoundingClientRect();
    const section = notesSection.getBoundingClientRect();
    const frame = notesFrame.getBoundingClientRect();
    const model = notes.getBoundingClientRect();
    const product = collection.querySelector(`[data-product="${fragrances[active].id}"]`);
    const card = product?.getBoundingClientRect();
    const mobile = width <= 700;
    const spacing = heroRect.width * (mobile ? .267 : .166);
    const heroSize = Math.min(heroRect.height * (mobile ? .744 : .856), spacing * (mobile ? 2.32 : 2.08));

    return {
      mobile, spacing, heroHeight: heroRect.height,
      hero: point(heroRect.left + heroRect.width / 2, heroRect.top + scrollY + heroRect.height * .505, heroSize),
      notesTop: section.top + scrollY,
      pinnedTravel: Math.max(0, section.height - frame.height),
      notes: point(model.left + model.width / 2, model.top - frame.top + model.height / 2,
        Math.min(model.height * .88, model.width * .99, height * .65)),
      collectionTop: collection.getBoundingClientRect().top + scrollY,
      cardTop: card ? card.top + scrollY : 0,
      card: card ? point(card.left + card.width / 2, card.top + scrollY + card.height / 2,
        Math.min(card.height * .715, card.width * .704)) : null,
      product,
    };
  }

  function showCard(next) {
    if (next === travellingCard) return;
    if (travellingCard) {
      travellingCard.classList.remove('landing');
      travellingCard.style.removeProperty('--still-opacity');
    }
    travellingCard = next;
    travellingCard?.classList.add('landing');
  }

  function approach(from, to, speed, epsilon) {
    const value = lerp(from, to, speed);
    return Math.abs(value - to) < epsilon ? to : value;
  }

  function paint(now) {
    frame = 0;
    if (lost || !width || !height) return;
    const { active } = state();
    const reduced = motion.matches;
    const liveScroll = window.scrollY;
    if (dirty) {
      layout = measure(active, liveScroll);
      dirty = false;
    }
    const elapsed = previousFrame === undefined ? 16 : Math.min(now - previousFrame, 34);
    previousFrame = now;
    const damp = (time) => reduced ? 1 : 1 - Math.exp(-elapsed / time);
    center = approach(center, target, damp(87), .0035);
    paintedSpin = approach(paintedSpin, spin, damp(99), .014);
    scroll = approach(scroll, liveScroll, damp(57), .38);

    const { mobile, spacing, heroHeight, notesTop, pinnedTravel, collectionTop, cardTop, product } = layout;
    const heroCenter = point(layout.hero.x, layout.hero.y - scroll, layout.hero.size);
    const notesOffset = notesTop + clamp(scroll - notesTop, 0, pinnedTravel) - scroll;
    const detail = point(layout.notes.x, notesOffset + layout.notes.y, layout.notes.size);
    const enter = reduced ? 0 : smooth((height * .81 - (notesTop - scroll)) / (height * .81));
    const progress = reduced || !pinnedTravel ? 0 : clamp((scroll - notesTop) / pinnedTravel, 0, 1);
    const travel = reduced ? 0 : smooth((height * .80 - (collectionTop - scroll)) / (height * .86));
    const arrive = !reduced && product ? smooth((height * 1.06 - (cardTop - scroll)) / (height * .55)) : 0;
    const turns = smooth((progress - .245) / .19) + smooth((progress - .575) / .19);
    const storm = clamp((progress - .78) / .22 + travel * .32, 0, 1);
    const bridge = point(width / 2, lerp(detail.y, height * .46, travel), detail.size * .84);
    const card = layout.card ? point(layout.card.x, layout.card.y - scroll, layout.card.size) : bridge;
    const destination = mix(mix(detail, bridge, travel), card, arrive);
    const move = Math.max(travel * .72, arrive);
    const handoff = arrive >= .998;
    const settle = smooth((arrive - .924) / .074);
    showCard(arrive > .54 && !handoff ? product : null);
    if (travellingCard) {
      travellingCard.style.setProperty('--still-opacity',
        (1 - smooth((arrive - .54) / .18) + settle).toFixed(3));
    }
    const canvasOpacity = String(Math.round((1 - settle) * 1000) / 1000);
    if (canvas.style.opacity !== canvasOpacity) canvas.style.opacity = canvasOpacity;

    let chosen = detail;
    let occupied = false;
    for (let index = 0; index < models.length; index++) {
      const bottle = models[index];
      const shadow = shadows[index];
      const offset = ((index - center + total * 1000 + total / 2) % total) - total / 2;
      const distance = Math.abs(offset);
      const selected = index === active;
      // Move the wrapping bottle past the clipped edge before it re-enters on the other side.
      const edge = smooth((distance - (mobile ? 1.72 : 2.29)) / (mobile ? .54 : .60)) * width * .24;
      const home = point(
        heroCenter.x + offset * spacing + Math.sign(offset) * edge,
        heroCenter.y + heroHeight * (.052 * distance + .012 * distance ** 2),
        heroCenter.size * (1 - .163 * distance),
      );
      let pose = home;
      if (selected) {
        pose = mix(home, destination, enter);
        pose.y -= Math.sin(arrive * PI) * Math.min(31, height * .035);
        chosen = pose;
      } else {
        pose = point(home.x, home.y - enter * height * .14, home.size * (1 - enter) ** 1.3);
      }
      const display = pose.size > 7 && pose.x + pose.size * .4 > 0 && pose.x - pose.size * .4 < width &&
        pose.y + pose.size > 0 && pose.y - pose.size < height &&
        (!selected || (!handoff && (product || travel < .995)));
      bottle.visible = display;
      shadow.visible = display;
      if (!display) continue;
      occupied = true;

      bottle.position.set(pose.x, -pose.y, 35 - distance * 42);
      bottle.scale.setScalar(pose.size / BOTTLE_HEIGHT);
      const front = -offset * .235 - .15;
      const carry = (turns + smooth(storm) * .96) * PI;
      const turn = selected ? lerp(enter * carry + (1 - enter) * paintedSpin, 4 * PI, move) : 0;
      const pitch = selected ? lerp(.045 + enter * .13, .055, move) : .07;
      const lean = selected ? lerp(offset * -.12 + .032, -.137, enter) : offset * -.13;
      bottle.rotation.set(pitch, lerp(front, -.205, enter) + turn, lerp(lean, .035, move));
      shadow.position.set(pose.x, -(pose.y + pose.size * .47), -365);
      shadow.scale.set(pose.size * .64, pose.size * .12, 1);
      shadow.material.opacity = selected ? lerp(.54, .15, enter * (1 - arrive)) : .5;
    }
    mist(chosen, !reduced && enter > .99 ? storm : 1, fragrances[active].light, pixelRatio);
    if (occupied || canvasOccupied) renderer.render(scene, camera);
    canvasOccupied = occupied;

    if (center !== target || paintedSpin !== spin || scroll !== liveScroll) {
      update();
    } else {
      previousFrame = undefined;
    }
  }

  function update(remeasure = false) {
    dirty ||= remeasure === true;
    if (!frame && !lost) frame = requestAnimationFrame(paint);
  }

  document.body.append(canvas);
  document.body.classList.add('has-3d');
  canvas.addEventListener('webglcontextlost', () => {
    lost = true;
    showCard(null);
    document.body.classList.remove('has-3d');
    canvas.remove();
  }, { once: true });
  window.addEventListener('scroll', () => update(), { passive: true });
  window.addEventListener('resize', refresh);
  motion.addEventListener('change', () => update(true));
  document.fonts.ready.then(() => update(true));
  refresh();

  return {
    update,
    select: (distance, animate) => {
      target += distance;
      if (!animate) center = target;
      spin = paintedSpin = 0;
      update(true);
    },
    rotate: () => {
      spin += motion.matches ? PI : 2 * PI;
      update();
    },
  };
}
