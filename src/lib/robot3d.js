// Mark, the help desk robot, as a real 3D model (Three.js).
//
// Glossy white plastic body, a dark visor with a glowing face, lit by a soft studio environment so
// it gets realistic highlights and reflections. Everything is built from simple shapes (rounded
// spheres and capsules) - there is no model file to download.
//
// Moods, and what the body does for each:
//   neutral   stands and floats gently
//   happy     laughs and jumps for joy, arms up, sparkles
//   sad       concerned for the user: worried brows, head tilted, hands together (no crying)
//   thinking  runs (on the spot, or sideways when `travel` is set)
//   listening tilts its head, hand to its ear
// Gestures (short moods used for interaction):
//   wave      waves hello with one hand
//   spin      jumps and spins all the way round
//   dance     bounces on the beat and steps side to side, with disco / raise-the-roof / shimmy moves (never turns)
//   surprised hops back with wide eyes
//   nod       nods "got it"
//   delighted giggles and wiggles (used when the mouse is over him)
//   grabbed   dangles with arms flailing while the user carries him around
// On top of any mood he can be "speaking": his mouth moves while a reply is read aloud.
// The head also turns towards the mouse pointer, and the eyes glance the same way.
//
// createRobot() returns a small controller; components/MoodAvatar.jsx is the React wrapper.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createProps, FOODS, DRINKS } from "./robotProps";

const FACE_W = 512;
const FACE_H = 379; // same shape as the visor screen (1.0 x 0.74)

// Colour of the glowing face, and of the antenna bulb / chest light, for each mood.
const GLOW = { heartbreak: "#9cc5ff", sad: "#9cc5ff", hurt: "#9cc5ff", crying: "#9cc5ff", sleepy: "#9cc5ff", angry: "#ff7b7b", love: "#ff8fb8", namaste: "#ffc36b" }; // every other mood glows cyan
const BULB = {
  neutral: 0x67e8f9, happy: 0x4ade80, sad: 0x94a3b8, thinking: 0xfbbf24, listening: 0xc084fc,
  wave: 0x4ade80, spin: 0x4ade80, dance: 0x4ade80, surprised: 0xfbbf24, delighted: 0x4ade80, grabbed: 0xfbbf24, nod: 0x67e8f9,
  thanks: 0xf472b6,
  hurt: 0x94a3b8, crying: 0x94a3b8, sleepy: 0x94a3b8, angry: 0xef4444, excited: 0xfbbf24, confused: 0xc084fc, scared: 0xfbbf24,
  clapping: 0x4ade80, cheering: 0x4ade80, love: 0xf472b6, namaste: 0xfb923c, birthday: 0xf472b6, party: 0xc084fc, wedding: 0xf472b6, congrats: 0xf472b6, popcorn: 0xfbbf24, heartbreak: 0x94a3b8, working: 0x38bdf8, meeting: 0x38bdf8, shopping: 0xfbbf24,
};
for (const food of FOODS) BULB[food] = 0xfb923c; // orange while he eats
const bulbFor = (mood) => BULB[mood] ?? BULB.neutral;

// Two names are just other names for a mood he already has: he runs on the spot for both.
const ALIAS = { running: "thinking", walking: "thinking" };
const canonical = (mood) => ALIAS[mood] ?? mood;

// Moods whose eyes are drawn as happy "smiling arcs".
const HAPPY_EYES = ["happy", "dance", "spin", "delighted", "thanks", "namaste", "excited", "cheering", "clapping", "birthday", "party", "wedding", "congrats", "popcorn", "shopping", "proud", "magic", "thumbs_up", ...FOODS];
const BIG_SMILE = ["happy", "dance", "spin", "excited", "cheering", "clapping", "birthday", "party", "wedding", "congrats", "popcorn", "shopping"]; // open-mouth smile
const SPIN_SECONDS = 1.4; // how long the spin gesture takes
const DANCE_MOVE_SECONDS = 2.4; // each move of the dance routine lasts this long
const DANCE_SPIN_MOVE = 1; // ...and this move (counting from 0) is a full turn

const smoothstep = (x) => x * x * (3 - 2 * x);

/**
 * One bite of food: the hand lifts to his face, holds, comes down, and he chews (about 1.8 s per bite).
 * `bump` is how high the hand is (0..1); `chewing` is true while his mouth should be moving.
 */
function foodCycle(seconds) {
  const p = (seconds * 0.55) % 1;
  const bump = p < 0.25 ? smoothstep(p / 0.25) : p < 0.5 ? 1 : p < 0.7 ? 1 - smoothstep((p - 0.5) / 0.2) : 0;
  return { bump, chewing: p > 0.4 && p < 0.85 };
}

/**
 * The Korean thank-you bow, from 0 (standing) to 1 (fully bowed): down in 0.9 s, held until 2.3 s,
 * back up by 3.2 s. `seconds` is the time since the gesture began.
 */
function bowAmount(seconds) {
  if (seconds < 0.9) return smoothstep(seconds / 0.9);
  if (seconds < 2.3) return 1;
  if (seconds < 3.2) return 1 - smoothstep((seconds - 2.3) / 0.9);
  return 0;
}


let webglSupport; // checked once: browsers only allow a limited number of WebGL contexts

/** True if this browser can create a WebGL context (the 3D robot needs it). */
export function webglAvailable() {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      webglSupport = !!gl;
      gl?.getExtension("WEBGL_lose_context")?.loseContext(); // hand the test context straight back
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

/**
 * Builds the robot inside `container` (a div). It creates its own <canvas> for every robot and removes
 * it on dispose: a canvas whose WebGL context has been released cannot be reused, and React may mount
 * the same component twice in a row during development.
 */
export function createRobot(container, { full, mood = "neutral", travel = 0, animated = true }) {
  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  // ---------------------------------------------------------------- renderer, camera, lights
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (error) {
    canvas.remove();
    throw error;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0); // transparent: no background behind the robot
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();

  // A virtual photo studio: gives the glossy plastic something to reflect.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new RoomEnvironment();
  scene.environment = pmrem.fromScene(studio, 0.04).texture;
  scene.environmentIntensity = 0.8;

  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fd8ff, 1.3); // cool edge light from behind
  rim.position.set(4, 3, -4);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c4d6, 0.55));

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  if (full) {
    camera.position.set(0, 2.2, 10.2); // whole robot, with room above for jumping
    camera.lookAt(0, 2.2, 0);
  } else {
    camera.position.set(0, 2.55, 5.1); // head and shoulders
    camera.lookAt(0, 2.5, 0);
  }

  // ---------------------------------------------------------------- materials
  const plastic = new THREE.MeshPhysicalMaterial({ color: 0xf3f6fb, roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.28 });
  const accent = new THREE.MeshPhysicalMaterial({ color: 0x8fa9c9, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.3 });
  // Dark glass. A strong reflection of the bright studio would wash it out to grey, so the
  // environment's influence on it is turned down.
  const visorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x040b17, roughness: 0.18, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.06, envMapIntensity: 0.22,
  });
  const bulbMaterial = new THREE.MeshBasicMaterial({ color: bulbFor(mood), toneMapped: false });

  const glowTexture = radialTexture([[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,0.45)"], [1, "rgba(255,255,255,0)"]]);
  const shadowTexture = radialTexture([[0, "rgba(15,23,42,0.55)"], [0.6, "rgba(15,23,42,0.18)"], [1, "rgba(15,23,42,0)"]]);
  const starTexture = starShape();
  const heartTexture = heartShape();

  const glowSprite = (size) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }),
    );
    sprite.scale.set(size, size, 1);
    return sprite;
  };

  // ---------------------------------------------------------------- the robot
  const root = new THREE.Group(); // (kept for the jump height)
  scene.add(root);
  const model = new THREE.Group(); // yaw, lean and squash happen here, pivoting at the feet
  root.add(model);

  const mesh = (geometry, material, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // legs (pivot at the hip)
  const legs = [-1, 1].map((side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.27, 0.74, 0);
    model.add(hip);
    mesh(new THREE.CapsuleGeometry(0.19, 0.3, 12, 24), plastic, hip, 0, -0.33, 0);
    const ring = mesh(new THREE.TorusGeometry(0.19, 0.035, 12, 32), accent, hip, 0, -0.45, 0);
    ring.rotation.x = Math.PI / 2;
    return hip;
  });

  // body: a big, round belly
  const belly = mesh(new THREE.SphereGeometry(1, 64, 48), plastic, model, 0, 1.14, 0);
  belly.scale.set(0.62, 0.68, 0.54);
  mesh(new THREE.CircleGeometry(0.075, 32), bulbMaterial, model, 0, 1.02, 0.545);
  const chestGlow = glowSprite(0.5);
  chestGlow.position.set(0, 1.02, 0.6);
  model.add(chestGlow);
  mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.14, 32), accent, model, 0, 1.8, 0);

  // arms (pivot at the shoulder)
  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.66, 1.5, 0);
    model.add(shoulder);
    mesh(new THREE.CapsuleGeometry(0.15, 0.4, 12, 24), plastic, shoulder, 0, -0.3, 0);
    const ring = mesh(new THREE.TorusGeometry(0.15, 0.03, 12, 32), accent, shoulder, 0, -0.5, 0);
    ring.rotation.x = Math.PI / 2;
    return shoulder;
  });

  // head (pivot at the neck)
  const head = new THREE.Group();
  head.position.set(0, 1.8, 0);
  head.scale.setScalar(1.14); // a big head makes him cuter
  model.add(head);

  const shell = mesh(new THREE.SphereGeometry(1, 80, 56), plastic, head, 0, 0.55, 0);
  shell.scale.set(0.9, 0.74, 0.76);

  [-1, 1].forEach((side) => {
    mesh(new THREE.CapsuleGeometry(0.13, 0.22, 12, 24), accent, head, side * 0.93, 0.55, 0);
  });

  // visor: a dark glossy lens that bulges out of the front of the head, so it is always visible
  const visor = mesh(new THREE.SphereGeometry(1, 64, 48), visorMaterial, head, 0, 0.55, LENS.z);
  visor.scale.set(LENS.rx, LENS.ry, LENS.rz);

  // the glowing face is drawn on a 2D canvas every frame and shown as a texture on the visor
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = FACE_W;
  faceCanvas.height = FACE_H;
  const faceContext = faceCanvas.getContext("2d");
  const faceTexture = new THREE.CanvasTexture(faceCanvas);
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  faceTexture.anisotropy = 4;
  const faceMaterial = new THREE.MeshBasicMaterial({ map: faceTexture, transparent: true, depthWrite: false, toneMapped: false });
  mesh(curveOnLens(new THREE.PlaneGeometry(1.3, 0.96, 52, 38)), faceMaterial, head, 0, 0.55, 0);

  // antenna with a glowing bulb
  mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.3, 12), accent, head, 0, 1.4, 0);
  mesh(new THREE.SphereGeometry(0.08, 24, 16), bulbMaterial, head, 0, 1.58, 0);
  const bulbGlow = glowSprite(0.5);
  bulbGlow.position.set(0, 1.58, 0);
  head.add(bulbGlow);

  // soft blob shadow on the floor (stays on the ground while the robot jumps)
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 2.2),
    new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  scene.add(shadow);

  // sparkles around a happy robot
  const stars = [[-1.35, 3.0, 0.3], [1.45, 3.3, 0.3], [1.15, 2.1, 0.4]].map(([x, y, z]) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTexture, transparent: true, depthWrite: false, toneMapped: false }));
    sprite.position.set(x, y, z);
    sprite.scale.set(0, 0, 1);
    scene.add(sprite);
    return sprite;
  });

  // little hearts that float up after the thank-you bow
  const hearts = [[-0.7, 0.2], [0.1, 0.55], [0.8, 0.9]].map(([x, delay]) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTexture, transparent: true, depthWrite: false, toneMapped: false }));
    sprite.position.set(x, 3.0, 0.5);
    sprite.scale.set(0, 0, 1);
    sprite.userData.delay = delay; // so they do not all rise at once
    scene.add(sprite);
    return sprite;
  });

  // the 💤 that drifts up from a sleepy robot
  const sleepTexture = emojiTexture("💤");
  const sleepZs = [0, 1, 2].map((i) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sleepTexture, transparent: true, depthWrite: false, toneMapped: false }));
    sprite.userData.offset = i / 3;
    sprite.scale.set(0, 0, 1);
    scene.add(sprite);
    return sprite;
  });

  // the 😋 that floats up around his head while he eats or drinks
  const yumTexture = emojiTexture("😋");
  const yums = [0, 1, 2].map((i) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: yumTexture, transparent: true, depthWrite: false, toneMapped: false }));
    sprite.userData = { offset: i / 3, side: i % 2 ? -1 : 1 };
    sprite.scale.set(0, 0, 1);
    scene.add(sprite);
    return sprite;
  });

  // the 🙏 that floats up while he greets you
  const prayTexture = emojiTexture("🙏");
  const prays = [0, 1].map((i) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: prayTexture, transparent: true, depthWrite: false, toneMapped: false }));
    sprite.userData = { offset: i / 2, side: i ? -1 : 1 };
    sprite.scale.set(0, 0, 1);
    scene.add(sprite);
    return sprite;
  });

  // what he holds for birthday / shopping / food gestures (see robotProps.js)
  const props = createProps(scene, arms, glowTexture, head);
  props.setMood(canonical(mood));

  // motion lines behind a running robot
  const speedLines = [0.7, 1.45, 2.2].map((y) => {
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.045),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0, depthWrite: false }),
    );
    line.position.set(0, y, -0.3);
    scene.add(line);
    return line;
  });

  // ---------------------------------------------------------------- animation
  // moodStart: when the current mood began, so gestures like the spin can play from their beginning
  const state = { mood: canonical(mood), travel, animated, lookX: 0, lookY: 0, speaking: false, moodStart: 0 };
  // `pose` holds the current value of everything that moves; each frame it eases towards the target
  // pose for the current mood, so changing mood blends smoothly instead of snapping.
  const pose = {
    bodyY: 0, squash: 1, yaw: 0, lean: 0,
    headX: 0, headY: 0, headZ: 0,
    armLz: -0.1, armLx: 0, armRz: 0.1, armRx: 0,
    legLx: 0, legRx: 0, legLz: 0, legRz: 0, rootX: 0, shadow: 1, stars: 0, hearts: 0, lines: 0, props: 0, zzz: 0, yum: 0, pray: 0,
  };
  const bulbColor = new THREE.Color(bulbFor(mood));
  const clock = new THREE.Clock();
  let time = 0;
  let frameId = 0;
  let disposed = false;

  function targetPose(m, t, travelling) {
    const target = {
      bodyY: Math.sin(t * 1.6) * 0.03, squash: 1, yaw: 0, lean: 0,
      headX: 0, headY: 0, headZ: Math.sin(t * 0.8) * 0.02,
      armLz: -0.12 + Math.sin(t * 1.6) * 0.04, armLx: 0, armRz: 0.12 - Math.sin(t * 1.6) * 0.04, armRx: 0,
      legLx: 0, legRx: 0, legLz: 0, legRz: 0, rootX: 0, shadow: 1, stars: 0, hearts: 0, lines: 0, props: 0, zzz: 0, yum: 0, pray: 0,
    };

    if (m === "happy") {
      // jump: crouch, launch, hang, land, repeat - legs tucked and arms waving in the air
      const p = (t * 1.25) % 1;
      const air = 4 * p * (1 - p);
      target.bodyY = air * 0.95;
      target.squash = 0.9 + 0.17 * Math.min(1, air * 2.2);
      target.legLx = -0.75 * air;
      target.legRx = 0.55 * air;
      target.armLz = -2.55 + Math.sin(t * 13) * 0.35;
      target.armRz = 2.55 - Math.sin(t * 13 + 1) * 0.35;
      target.headX = -0.14 + Math.sin(t * 26) * 0.05; // laughing: head back, shaking
      target.headZ = Math.sin(t * 26 + 1) * 0.06;
      target.shadow = 1 - air * 0.5;
      target.stars = 1;
    } else if (m === "sad") {
      // concerned, like "oh no, I'm sorry to hear that": head tilted a little to one side and slightly
      // down, hands brought together in front, a slow breath now and then
      const breath = Math.sin(t * 1.3);
      target.bodyY = -0.02 + breath * 0.012;
      target.headX = 0.2 + breath * 0.02;
      target.headZ = 0.13;
      target.armLz = 0.42;
      target.armRz = -0.42;
      target.armLx = 0.55 + breath * 0.03;
      target.armRx = 0.55 + breath * 0.03;
      target.lean = 0.05;
    } else if (m === "thinking") {
      // running: bob, lean forward, arms and legs swinging in opposite pairs
      const f = t * 11;
      target.bodyY = Math.abs(Math.sin(f)) * 0.09;
      target.lean = 0.16;
      target.legLx = Math.sin(f) * 0.95;
      target.legRx = -Math.sin(f) * 0.95;
      target.armLx = -Math.sin(f) * 0.95;
      target.armRx = Math.sin(f) * 0.95;
      target.armLz = -0.28;
      target.armRz = 0.28;
      target.headX = 0.04;
      target.shadow = 0.9;
      target.lines = 1;
    } else if (m === "listening") {
      // curious: head tilted, right hand cupped to the ear
      target.headZ = -0.2 + Math.sin(t * 1.5) * 0.03;
      target.armRz = 2.45 + Math.sin(t * 2) * 0.04;
      target.armRx = 0.45;
    } else if (m === "wave") {
      // "hello!": right hand up, waving; a friendly lean and a little bounce
      target.armRz = 2.75 + Math.sin(t * 10) * 0.28;
      target.armRx = 0.15;
      target.headZ = 0.1 + Math.sin(t * 3) * 0.03;
      target.bodyY = Math.abs(Math.sin(t * 5)) * 0.05;
      target.lean = 0.04;
    } else if (m === "spin") {
      // a hop and a full turn (the turn itself is added in apply(); this is the hop and the open arms)
      const p = Math.min(1, (t - state.moodStart) / SPIN_SECONDS);
      target.bodyY = Math.sin(p * Math.PI) * 0.55;
      target.armLz = -1.5;
      target.armRz = 1.5;
      target.legLx = -0.3 * Math.sin(p * Math.PI);
      target.legRx = 0.3 * Math.sin(p * Math.PI);
      target.stars = 1;
    } else if (m === "dance") {
      // A dance routine of five moves, 2.4 s each, always starting from the first. He bounces on every
      // beat (about 120 per minute) and steps from side to side throughout:
      //   0 disco   - one arm points up while the other points down, switching each step
      //   1 turn    - a full spin on the spot, arms out, bouncing (the turn itself is added in apply())
      //   2 march   - high knees, one after the other, fists pumping
      //   3 roof    - both arms up, pumping ("raise the roof")
      //   4 shimmy  - arms out to the sides, wiggling fast
      // Then it starts again from the disco.
      const tm = t - state.moodStart;
      const move = Math.floor(tm / DANCE_MOVE_SECONDS) % 5;
      const w = t * 6.5; // one bounce lasts about half a second
      const step = Math.sin(w); // +1 = stepping one way, -1 = the other way

      target.bodyY = Math.abs(step) * 0.2;
      target.squash = 1 + Math.sin(w * 2) * 0.05; // squashes on landing, stretches on the way up
      target.rootX = move === DANCE_SPIN_MOVE ? 0 : step * 0.32; // the whole body shifts with the step
      target.yaw = step * 0.12; // a little hip twist
      target.headZ = step * 0.16;
      target.headX = Math.abs(step) * 0.12; // head nods on the beat
      target.legLz = -0.3 * Math.max(0, step); // the leg on the side he steps towards swings out
      target.legRz = 0.3 * Math.max(0, -step);
      target.legLx = Math.sin(w * 2) * 0.25;
      target.legRx = -Math.sin(w * 2) * 0.25;

      if (move === 0) {
        target.armLz = -0.3 - 2.2 * Math.max(0, step);
        target.armRz = 0.3 + 2.2 * Math.max(0, -step);
      } else if (move === 1) {
        target.armLz = -1.5;
        target.armRz = 1.5;
        target.yaw = 0; // the spin supplies the turning
        target.bodyY = 0.12 + Math.abs(step) * 0.12;
      } else if (move === 2) {
        const knee = Math.sin(w); // left knee up, then right knee up
        target.legLx = -1.1 * Math.max(0, knee);
        target.legRx = -1.1 * Math.max(0, -knee);
        target.legLz = target.legRz = 0;
        target.rootX = 0;
        target.armLz = -0.5;
        target.armRz = 0.5;
        target.armLx = 1.0 * Math.max(0, -knee); // the opposite arm pumps forward
        target.armRx = 1.0 * Math.max(0, knee);
      } else if (move === 3) {
        target.armLz = -2.3 + Math.sin(w * 2) * 0.35;
        target.armRz = 2.3 - Math.sin(w * 2) * 0.35;
        target.armLx = target.armRx = 0.25;
      } else {
        target.armLz = -1.25 + Math.sin(w * 4) * 0.3;
        target.armRz = 1.25 - Math.sin(w * 4) * 0.3;
        target.yaw = Math.sin(w * 2) * 0.2;
        target.headZ = Math.sin(w * 2) * 0.1;
      }
      target.shadow = 0.9;
      target.stars = 1;
    } else if (m === "thanks" || m === "bow") {
      // The polite Korean thank-you (gamsahamnida): hands together in front, a deep bow, hold it, rise;
      // the visor shows 감사합니다 and little hearts float up afterwards.
      const seconds = t - state.moodStart;
      const bow = bowAmount(seconds);
      target.lean = 0.3 * bow; // the body leans forward from the feet
      target.headX = 0.8 * bow; // and the head dips further
      target.bodyY = -0.05 * bow;
      target.armLz = -0.1 + 0.65 * bow; // hands brought together in front of him
      target.armRz = 0.1 - 0.65 * bow;
      target.armLx = target.armRx = 0.95 * bow;
      target.hearts = m === "thanks" ? Math.min(1, Math.max(0, (seconds - 1.0) / 0.5)) : 0; // a plain bow has no hearts
    } else if (m === "namaste") {
      // palms pressed together at the chest and a gentle bow, with 🙏 floating up
      const bow = bowAmount(t - state.moodStart);
      target.armLx = target.armRx = -1.3;
      target.armLz = 0.85;
      target.armRz = -0.85;
      target.headX = 0.35 * bow;
      target.lean = 0.1 * bow;
      target.bodyY = -0.02 * bow;
      target.pray = 1;
    } else if (m === "surprised") {
      // startled: a quick hop backwards, arms thrown up
      const p = Math.min(1, (t - state.moodStart) / 0.35);
      target.bodyY = Math.sin(p * Math.PI) * 0.3;
      target.lean = -0.14;
      target.headX = -0.12;
      target.armLz = -1.1;
      target.armRz = 1.1;
      target.armLx = 0.2;
      target.armRx = 0.2;
    } else if (m === "nod") {
      // "got it": a couple of clear nods, standing attentively
      const p = Math.min(1, (t - state.moodStart) / 1.5);
      target.headX = Math.sin(p * Math.PI * 4) * 0.28 * (1 - p * 0.3);
      target.bodyY = Math.abs(Math.sin(p * Math.PI * 4)) * 0.02;
      target.armLz = -0.2;
      target.armRz = 0.2;
    } else if (m === "grabbed") {
      // picked up and carried: hanging in the air, legs dangling and swinging, arms flailing up
      target.squash = 1.05;
      target.legLx = -0.15 + Math.sin(t * 6) * 0.35;
      target.legRx = -0.15 - Math.sin(t * 6) * 0.35;
      target.armLz = -2.2 + Math.sin(t * 9) * 0.4;
      target.armRz = 2.2 + Math.sin(t * 9 + 1) * 0.4;
      target.headX = -0.18;
      target.headZ = Math.sin(t * 5) * 0.09;
      target.lean = Math.sin(t * 3) * 0.06;
      target.shadow = 0.4;
    } else if (m === "delighted") {
      // flattered ("you are cute!", or the pointer is over him): bouncing on the spot, head tilting from
      // side to side, both hands up at his cheeks, and little hearts floating up
      const seconds = t - state.moodStart;
      target.bodyY = Math.abs(Math.sin(t * 8)) * 0.14;
      target.headZ = Math.sin(t * 4) * 0.2;
      target.lean = Math.sin(t * 4 + 1) * 0.07;
      target.armLz = -1.5 + Math.sin(t * 8) * 0.12; // hands raised beside the face
      target.armRz = 1.5 - Math.sin(t * 8) * 0.12;
      target.armLx = target.armRx = 0.6;
      target.legLx = Math.sin(t * 8) * 0.12;
      target.legRx = -Math.sin(t * 8) * 0.12;
      target.stars = 0.6;
      target.hearts = Math.min(1, Math.max(0, seconds / 0.3));
    }

    state.eating = false;
    state.bump = 0; // how high his hand is during a bite or sip (0..1), so drinks can tilt their cup
    const seconds = t - state.moodStart;

    if (m === "birthday" || m === "party") {
      // birthday: a cake with candles in one hand and a present in the other; party: a cocktail raised in a toast, one arm waving in the air, with sparkles and fireworks. Both dance about
      const toast = Math.max(0, Math.sin(t * 1.8)) * 0.35; // the glass lifts now and then
      target.bodyY = Math.abs(Math.sin(t * 6)) * 0.07;
      target.headZ = Math.sin(t * 3) * 0.12;
      target.lean = Math.sin(t * 3) * 0.05;
      target.legLx = Math.sin(t * 6) * 0.25;
      target.legRx = -Math.sin(t * 6) * 0.25;
      // with the cake and the present he holds both arms out to the sides, so the candles are not hidden behind his head (an arm pointing at the camera cannot be moved sideways)
      const out = m === "birthday";
      target.armRx = out ? -0.55 + Math.sin(t * 6) * 0.04 : 0.1; // at a party the free arm is up in the air, waving
      target.armRz = out ? 0.9 : 2.2 + Math.sin(t * 6) * 0.3; // positive = the right arm swings out to the side
      target.armLx = out ? -0.55 : -0.95 - toast;
      target.armLz = out ? -0.9 : -0.55; // negative = the left arm swings out to the side
      target.stars = 1;
      target.props = 1;
    } else if (m === "wedding") {
      // a slow, happy waltz with a bouquet, one hand on his heart, hearts and rose petals floating down
      target.bodyY = Math.abs(Math.sin(t * 2)) * 0.05;
      target.lean = Math.sin(t * 2) * 0.08;
      target.headZ = Math.sin(t * 2) * 0.1;
      target.legLx = Math.sin(t * 2) * 0.2;
      target.legRx = -Math.sin(t * 2) * 0.2;
      target.armRx = -0.95 + Math.sin(t * 2) * 0.05;
      target.armRz = 0.35;
      target.armLx = -1.0;
      target.armLz = -0.15;
      target.hearts = 1;
      target.stars = 0.6;
      target.props = 1;
    } else if (m === "congrats") {
      // congratulations: presenting a bouquet with a happy bounce, the other hand waving, petals and sparkles
      target.bodyY = Math.abs(Math.sin(t * 5)) * 0.07;
      target.headZ = Math.sin(t * 2.5) * 0.1;
      target.armRx = -1.3;
      target.armRz = 0.4;
      target.armLx = -1.0 + Math.sin(t * 10) * 0.15;
      target.armLz = -0.5;
      target.stars = 1;
      target.props = 1;
    } else if (m === "popcorn") {
      // tossing popcorn about: the bucket held high, a happy bounce, the other hand sweeping, popcorn flying everywhere
      const bounce = Math.abs(Math.sin(t * 5));
      target.bodyY = bounce * 0.06;
      target.armRx = -1.5 - Math.max(0, Math.sin(t * 5)) * 0.35;
      target.armRz = 0.55;
      target.armLx = -1.1 + Math.sin(t * 5 + 1) * 0.3;
      target.armLz = -0.7;
      target.headZ = Math.sin(t * 2.5) * 0.1;
      target.stars = 0.8;
      target.props = 1;
    } else if (m === "heartbreak") {
      // a break-up: head hanging, shoulders low, the broken heart held against his chest, slowly shaking his head
      target.headX = 0.5;
      target.headY = Math.sin(t * 1.2) * 0.25;
      target.lean = 0.08;
      target.armRx = -0.95;
      target.armRz = 0.2;
      target.armLx = -0.7;
      target.armLz = -0.15;
      target.props = 1;
    } else if (m === "working") {
      // typing at the laptop: head tipped down at the screen, both hands tapping away
      const tap = Math.sin(t * 14);
      target.headX = 0.28 + Math.sin(t * 1.3) * 0.03; // head tipped down at the screen
      target.armRx = -1.0 + tap * 0.12;
      target.armLx = -1.0 - tap * 0.12;
      target.armRz = 0.2;
      target.armLz = -0.2;
      target.lean = 0.04;
      target.props = 1;
    } else if (m === "meeting") {
      // presenting in a meeting: clipboard in one hand, the other hand gesturing, nodding along
      target.headX = Math.sin(t * 2.2) * 0.1;
      target.headZ = Math.sin(t * 1.1) * 0.05;
      target.armRx = -1.05;
      target.armRz = 0.25;
      target.armLx = -0.9 + Math.sin(t * 3) * 0.35;
      target.armLz = -0.55;
      target.props = 1;
    } else if (m === "shopping") {
      // strolling happily with a shopping bag in each hand
      const step = Math.sin(t * 5);
      target.bodyY = Math.abs(step) * 0.08;
      target.lean = Math.sin(t * 2.5) * 0.07;
      target.headZ = Math.sin(t * 2.5) * 0.08;
      target.armLz = -0.25 + step * 0.12;
      target.armRz = 0.25 - step * 0.12;
      target.armLx = step * 0.15;
      target.armRx = -step * 0.15;
      target.legLx = step * 0.4;
      target.legRx = -step * 0.4;
      target.stars = 0.4;
      target.props = 1;
    } else if (FOODS.includes(m)) {
      // eating: lifts the food up to his face, takes a bite and chews; the other hand rests under it
      const { bump, chewing } = foodCycle(seconds);
      const drinking = DRINKS.includes(m);
      target.armRx = -1.1 - (drinking ? 0.95 : 0.55) * bump; // a sip brings the cup right up to his face
      target.armRz = -0.45;
      target.armLx = -0.5;
      target.armLz = 0.15;
      target.headX = (drinking ? -0.15 : 0.25) * bump; // head tips back for a sip, forward for a bite
      target.headZ = Math.sin(t * 3) * 0.05;
      target.bodyY = Math.sin(t * 3) * 0.02 + (chewing ? Math.abs(Math.sin(t * 10)) * 0.015 : 0);
      target.props = 1;
      state.eating = chewing && !drinking; // nothing to chew while sipping tea
      state.bump = bump;
      target.yum = 1; // yummy!
    } else if (m === "hurt") {
      // someone was unkind: head down and turned away, shoulders drooping (no crying)
      target.headX = 0.5;
      target.headY = 0.5;
      target.headZ = Math.sin(t * 1.5) * 0.05;
      target.lean = 0.12;
      target.squash = 0.97;
      target.armLz = -0.05;
      target.armRz = 0.05;
    } else if (m === "angry") {
      // stomping and shaking with frowning brows and red eyes
      target.rootX = Math.sin(t * 38) * 0.025;
      target.lean = 0.1;
      target.headX = 0.15;
      target.bodyY = Math.abs(Math.sin(t * 7)) * 0.05;
      target.legLx = Math.sin(t * 7) * 0.35;
      target.legRx = -Math.sin(t * 7) * 0.35;
      target.armLz = -0.3;
      target.armRz = 0.3;
      target.armLx = target.armRx = -0.5;
    } else if (m === "excited") {
      // small fast bounces with both arms up
      target.bodyY = Math.abs(Math.sin(t * 10)) * 0.25;
      target.armLz = -2.5 + Math.sin(t * 16) * 0.3;
      target.armRz = 2.5 - Math.sin(t * 16 + 1) * 0.3;
      target.legLx = -0.3 * Math.abs(Math.sin(t * 10));
      target.legRx = 0.3 * Math.abs(Math.sin(t * 10));
      target.stars = 1;
    } else if (m === "cheering") {
      // a big jump with both arms thrown up in a V
      const p = (t * 1.5) % 1;
      const air = 4 * p * (1 - p);
      target.bodyY = air * 0.6;
      target.squash = 0.92 + 0.12 * Math.min(1, air * 2.2);
      target.armLz = -2.7 + Math.sin(t * 9) * 0.1;
      target.armRz = 2.7 - Math.sin(t * 9) * 0.1;
      target.headX = -0.2;
      target.stars = 1;
    } else if (m === "clapping") {
      // arms out in front, hands meeting again and again
      const clap = 0.5 + 0.5 * Math.sin(t * 14);
      target.armLx = target.armRx = -1.25;
      target.armLz = 0.1 + 0.3 * clap;
      target.armRz = -0.1 - 0.3 * clap;
      target.bodyY = Math.abs(Math.sin(t * 7)) * 0.05;
      target.headZ = Math.sin(t * 3.5) * 0.08;
      target.stars = 0.5;
    } else if (m === "love") {
      // his right hand on his heart, a big bunch of flowers held out in his left hand; swaying, hearts floating up, heart-shaped eyes
      target.armRx = -0.9;
      target.armRz = -0.5;
      target.armLx = -1.2;
      target.armLz = -0.45;
      target.headZ = Math.sin(t * 2) * 0.15;
      target.lean = Math.sin(t * 2) * 0.05;
      target.bodyY = Math.abs(Math.sin(t * 3)) * 0.04;
      target.hearts = 1;
      target.props = 1; // a bouquet of flowers in his hand
    } else if (m === "sleepy") {
      // slowly nodding off, arms hanging, "zzz" on the visor
      target.headX = 0.35 + Math.sin(t * 0.9) * 0.12;
      target.headZ = Math.sin(t * 0.9) * 0.1;
      target.lean = 0.08;
      target.squash = 0.98;
      target.armLz = -0.05;
      target.armRz = 0.05;
      target.zzz = 1;
    } else if (m === "confused") {
      // head tilting from side to side, shrugging, a question mark on the visor
      target.headZ = Math.sin(t * 2.2) * 0.3;
      target.headX = -0.05;
      target.armLz = -0.9 + Math.sin(t * 4) * 0.1;
      target.armRz = 0.9 - Math.sin(t * 4) * 0.1;
      target.armLx = target.armRx = -0.3;
      target.bodyY = Math.abs(Math.sin(t * 2.2)) * 0.03;
    } else if (m === "scared") {
      // trembling, leaning back, hands up in front of his face
      target.rootX = Math.sin(t * 42) * 0.03;
      target.lean = -0.1;
      target.headX = -0.12;
      target.armLx = target.armRx = -2.0;
      target.armLz = 0.6;
      target.armRz = -0.6;
      target.bodyY = Math.abs(Math.sin(t * 20)) * 0.02;
    } else if (m === "crying") {
      // sobbing with his hands at his eyes and tears running down
      target.armLx = target.armRx = -2.1;
      target.armLz = 0.5;
      target.armRz = -0.5;
      target.headX = 0.3;
      target.bodyY = Math.abs(Math.sin(t * 9)) * 0.03;
      target.lean = Math.sin(t * 9) * 0.02;
    } else if (m === "shake_head") {
      target.headY = Math.sin(t * 9) * 0.55; // "no"
      target.armLz = -0.2;
      target.armRz = 0.2;
    } else if (m === "thumbs_up") {
      target.armRx = -1.4 + Math.sin(t * 6) * 0.1; // arm out front, a little bounce
      target.armRz = -0.1;
      target.headX = Math.sin(t * 5) * 0.1;
      target.bodyY = Math.abs(Math.sin(t * 5)) * 0.04;
      target.stars = 0.6;
    } else if (m === "point") {
      target.armRx = -1.55; // the arm straight out in front, at you
      target.armRz = 0;
      target.lean = 0.05;
      target.headX = 0.05;
    } else if (m === "shrug") {
      const lift = 0.5 + 0.5 * Math.sin(t * 3);
      target.armLz = -1.0 - lift * 0.2;
      target.armRz = 1.0 + lift * 0.2;
      target.armLx = target.armRx = -0.3;
      target.headZ = 0.18;
      target.bodyY = lift * 0.03;
    } else if (m === "stretch") {
      target.armLz = -2.9 + Math.sin(t * 2) * 0.1;
      target.armRz = 2.9 - Math.sin(t * 2) * 0.1;
      target.lean = -0.15;
      target.headX = -0.3;
      target.squash = 1.04;
    } else if (m === "peek") {
      // half turned away, head tilted round to look at you
      target.yaw = 0.6;
      target.headY = -0.45;
      target.headZ = 0.2;
      target.armLz = 0.3;
      target.armRz = -0.3;
    } else if (m === "hide") {
      // crouching with his hands over his head
      target.squash = 0.72;
      target.armLx = target.armRx = -2.4;
      target.armLz = 0.4;
      target.armRz = -0.4;
      target.headX = 0.4;
      target.legLx = target.legRx = -0.6;
      target.rootX = Math.sin(t * 30) * 0.01;
    } else if (m === "magic") {
      // waves a (pretend) wand with sparkles everywhere
      target.armRx = -0.8;
      target.armRz = 1.6 + Math.sin(t * 5) * 0.5;
      target.armLz = -0.3;
      target.headZ = 0.1;
      target.stars = 1;
    } else if (m === "sit") {
      target.bodyY = -0.3;
      target.legLx = target.legRx = -1.45;
      target.shadow = 0.9;
    } else if (m === "proud") {
      // chest out, chin up, hands on hips
      target.lean = -0.1;
      target.headX = -0.15;
      target.armLz = -0.75;
      target.armRz = 0.75;
      target.armLx = target.armRx = -0.2;
      target.stars = 0.5;
    } else if (m === "curious") {
      // leaning in, head tilted, a hand at his chin
      target.lean = 0.1;
      target.headZ = 0.25;
      target.headX = 0.1;
      target.armRx = -2.0;
      target.armRz = -0.4;
    } else if (m === "explain") {
      // standing and talking with his hands, one after the other
      target.armRx = -0.9 + Math.sin(t * 3) * 0.3;
      target.armRz = -0.4;
      target.armLx = -0.6 + Math.sin(t * 3 + 2) * 0.3;
      target.armLz = 0.3;
      target.headZ = Math.sin(t * 2) * 0.06;
    }

    // talking: a gentle nod in time with the speech
    if (state.speaking) target.headX += Math.sin(t * 9) * 0.03;

    if (travelling) target.yaw = state.travel * 1.15; // turn sideways to run across the screen
    return target;
  }

  function blend(target, k) {
    for (const key of Object.keys(pose)) pose[key] += (target[key] - pose[key]) * k;
  }

  function apply(t) {
    // the spin: one full turn, starting slowly, fastest in the middle, slowing at the end
    let spin = 0;
    if (state.mood === "spin") {
      const p = Math.min(1, (t - state.moodStart) / SPIN_SECONDS);
      spin = (p * p * (3 - 2 * p)) * Math.PI * 2;
    }

    // the dance's turn move: one full spin during move DANCE_SPIN_MOVE, standing still for the others
    if (state.mood === "dance") {
      const tm = t - state.moodStart;
      if (Math.floor(tm / DANCE_MOVE_SECONDS) % 5 === DANCE_SPIN_MOVE) {
        spin = smoothstep((tm % DANCE_MOVE_SECONDS) / DANCE_MOVE_SECONDS) * Math.PI * 2;
      }
    }

    root.position.set(pose.rootX, pose.bodyY, 0);
    shadow.position.x = pose.rootX; // the floor shadow stays under him as he steps
    model.rotation.set(pose.lean, pose.yaw + spin, 0);
    model.scale.set(1 / Math.sqrt(pose.squash), pose.squash, 1 / Math.sqrt(pose.squash));

    head.rotation.set(pose.headX + (state.mood === "working" ? 0 : state.lookY) * 0.28, state.lookX * 0.55 + pose.headY, pose.headZ);
    arms[0].rotation.set(pose.armLx, 0, pose.armLz);
    arms[1].rotation.set(pose.armRx, 0, pose.armRz);
    legs[0].rotation.set(pose.legLx, 0, pose.legLz);
    legs[1].rotation.set(pose.legRx, 0, pose.legRz);
    props.update(t, Math.max(0, pose.props), state.bump ?? 0);

    shadow.scale.setScalar(pose.shadow);
    shadow.material.opacity = pose.shadow;

    stars.forEach((star, i) => {
      const twinkle = Math.max(0, Math.sin(t * 5 + i * 1.7));
      star.scale.setScalar(pose.stars * (0.1 + twinkle * 0.45));
      star.material.opacity = pose.stars * twinkle;
    });

    // hearts drift up from his head and fade out, each one a little later than the last
    hearts.forEach((heart) => {
      const phase = (((t - heart.userData.delay) * 0.7) % 1 + 1) % 1;
      heart.position.y = 2.9 + phase * 1.0;
      heart.scale.setScalar(pose.hearts * 0.5);
      heart.material.opacity = pose.hearts * Math.sin(Math.PI * phase);
    });

    sleepZs.forEach((z) => {
      const phase = (t * 0.4 + z.userData.offset) % 1;
      z.position.set(0.5 + phase * 0.4, 3.0 + phase * 0.9, 0.5);
      z.scale.setScalar(pose.zzz * (0.25 + phase * 0.35));
      z.material.opacity = pose.zzz * Math.sin(Math.PI * phase);
    });

    yums.forEach((y) => {
      const phase = (t * 0.45 + y.userData.offset) % 1;
      y.position.set(y.userData.side * (0.55 + phase * 0.5), 3.0 + phase * 0.8, 0.5);
      y.scale.setScalar(pose.yum * (0.3 + phase * 0.3));
      y.material.opacity = pose.yum * Math.sin(Math.PI * phase);
    });

    prays.forEach((p) => {
      const phase = (t * 0.4 + p.userData.offset) % 1;
      p.position.set(p.userData.side * (0.5 + phase * 0.45), 3.0 + phase * 0.8, 0.5);
      p.scale.setScalar(pose.pray * (0.35 + phase * 0.3));
      p.material.opacity = pose.pray * Math.sin(Math.PI * phase);
    });

    // lines trail behind whichever way the robot is facing (to its left when running on the spot)
    const side = state.travel === 0 ? -1 : -Math.sign(state.travel);
    speedLines.forEach((line, i) => {
      const phase = (t * 2.6 + i * 0.37) % 1;
      line.position.x = side * (1.1 + phase * 0.9);
      line.material.opacity = pose.lines * (1 - phase) * 0.7;
    });

    // antenna bulb and chest light take the mood colour, and the bulb pulses
    bulbColor.lerp(new THREE.Color(bulbFor(state.mood)), 0.15);
    bulbMaterial.color.copy(bulbColor);
    const pulse = state.mood === "listening" ? 0.65 + 0.35 * Math.sin(t * 14) : 0.8 + 0.2 * Math.sin(t * 4);
    bulbGlow.material.color.copy(bulbColor).multiplyScalar(pulse);
    chestGlow.material.color.copy(bulbColor).multiplyScalar(0.7);

    // while bowing, the visor shows the written greeting (Korean "thank you" or Hindi "namaste") for as long as he is bowed
    const greeting = state.mood === "thanks" || state.mood === "namaste" ? bowAmount(t - state.moodStart) : 0;
    drawFace(faceContext, state.mood, t, state.mood === "working" ? 0 : state.lookX, state.mood === "working" ? 0.9 : state.lookY, state.speaking || state.eating || state.talking, greeting, state.mood === "namaste" ? "नमस्ते" : "감사합니다");
    faceTexture.needsUpdate = true;
  }

  function frame() {
    if (disposed) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    time += dt;
    const travelling = state.travel !== 0;
    blend(targetPose(state.mood, time, travelling), 1 - Math.exp(-dt * 14));
    apply(time);
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(frame);
  }

  // One still frame (reduced motion, or an avatar that should not move).
  function renderStill() {
    blend(targetPose(state.mood, 0.4, false), 1);
    apply(0.4);
    renderer.render(scene, camera);
  }

  function start() {
    cancelAnimationFrame(frameId);
    clock.getDelta();
    if (state.animated) frame();
    else renderStill();
  }

  start();

  // ---------------------------------------------------------------- controller
  return {
    setMood(requested) {
      const next = canonical(requested);
      if (next !== state.mood) state.moodStart = time;
      state.mood = next;
      state.talking = requested === "explain"; // explaining: the mouth moves, even though no reply is being read aloud
      props.setMood(next);
      if (!state.animated) renderStill();
    },
    /** True while a reply is read aloud: his mouth moves. */
    setSpeaking(next) {
      state.speaking = next;
    },
    setTravel(next) {
      state.travel = next;
    },
    /** Where the pointer is relative to the robot, each from -1 to 1. The head and eyes turn that way. */
    setLook(x, y) {
      state.lookX = x;
      state.lookY = y;
    },
    setAnimated(next) {
      if (state.animated === next) return;
      state.animated = next;
      start();
    },
    setSize(width, height) {
      renderer.setSize(width, height); // also sets the canvas's CSS size
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (!state.animated) renderStill();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      scene.traverse((object) => {
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          material?.map?.dispose();
          material?.dispose();
        });
      });
      glowTexture.dispose();
      shadowTexture.dispose();
      starTexture.dispose();
      heartTexture.dispose();
      sleepTexture.dispose();
      yumTexture.dispose();
      prayTexture.dispose();
      faceTexture.dispose();
      scene.environment?.dispose();
      pmrem.dispose();
      studio.dispose();
      renderer.dispose();
      renderer.forceContextLoss(); // free the GPU context right away (browsers only allow a handful)
      canvas.remove();
    },
  };
}

// ------------------------------------------------------------------------------------------------
// The glowing face: eyes, brows and mouth, drawn on a canvas that is used as the visor texture.
// ------------------------------------------------------------------------------------------------

function drawFace(ctx, mood, t, lookX, lookY, speaking, thanksText = 0, greeting = "감사합니다") {
  const w = FACE_W;
  const h = FACE_H;
  const color = GLOW[mood] ?? "#7ff0ff";
  const sadLike = mood === "sad" || mood === "hurt" || mood === "crying" || mood === "heartbreak"; // worried brows, small frown
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.shadowColor = color;

  // eyes glance towards the pointer
  const shiftX = lookX * w * 0.04;
  const shiftY = lookY * h * 0.045;
  const eyeXs = [w * 0.31 + shiftX, w * 0.69 + shiftX];
  const eyeY = h * (sadLike ? 0.42 : 0.4) + shiftY;
  const blink = t % 4 > 3.86 ? 0.12 : 1;

  const eyeW = w * 0.1;
  const eyeH = h * (sadLike ? 0.2 : mood === "listening" ? 0.27 : (mood === "surprised" || mood === "grabbed" || mood === "scared") ? 0.33 : 0.24) * blink;

  // each shape is drawn twice: once blurred (the glow) and once sharp
  const twice = (draw) => {
    ctx.shadowBlur = w * 0.07;
    draw();
    ctx.shadowBlur = 0;
    draw();
  };

  if (mood === "love") {
    // heart-shaped eyes that pulse
    const s = w * 0.055 * (1 + 0.15 * Math.sin(t * 8));
    twice(() => {
      for (const x of eyeXs) {
        ctx.beginPath();
        ctx.moveTo(x, eyeY + s * 0.9);
        ctx.bezierCurveTo(x - s * 1.4, eyeY + s * 0.1, x - s * 0.7, eyeY - s * 0.9, x, eyeY - s * 0.3);
        ctx.bezierCurveTo(x + s * 0.7, eyeY - s * 0.9, x + s * 1.4, eyeY + s * 0.1, x, eyeY + s * 0.9);
        ctx.fill();
      }
    });
  } else if (mood === "sleepy" || mood === "crying") {
    // eyes closed: a gentle downward curve
    ctx.lineWidth = w * 0.035;
    twice(() => {
      for (const x of eyeXs) {
        ctx.beginPath();
        ctx.arc(x, eyeY, w * 0.06, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
    });
  } else if (HAPPY_EYES.includes(mood)) {
    ctx.lineWidth = w * 0.04;
    twice(() => {
      for (const x of eyeXs) {
        ctx.beginPath();
        ctx.arc(x, eyeY + h * 0.06, w * 0.065, Math.PI + 0.3, Math.PI * 2 - 0.3);
        ctx.stroke();
      }
    });
  } else {
    twice(() => {
      for (const x of eyeXs) {
        capsule(ctx, x, eyeY, eyeW, Math.max(eyeH, eyeW));
        ctx.fill();
      }
    });
    // a little shine on each eye
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (const x of eyeXs) {
      ctx.beginPath();
      ctx.ellipse(x - eyeW * 0.2, eyeY - eyeH * 0.22, eyeW * 0.14, eyeH * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = color;
  }

  if (sadLike) {
    // concerned brows, higher on the inside - he feels for you, he is not crying
    ctx.lineWidth = w * 0.022;
    twice(() => {
      ctx.beginPath();
      ctx.moveTo(eyeXs[0] - w * 0.075, eyeY - h * 0.17);
      ctx.lineTo(eyeXs[0] + w * 0.07, eyeY - h * 0.25);
      ctx.moveTo(eyeXs[1] + w * 0.075, eyeY - h * 0.17);
      ctx.lineTo(eyeXs[1] - w * 0.07, eyeY - h * 0.25);
      ctx.stroke();
    });

  }

  if (mood === "angry") {
    // brows slanting down towards the nose
    ctx.lineWidth = w * 0.03;
    twice(() => {
      ctx.beginPath();
      ctx.moveTo(eyeXs[0] - w * 0.08, eyeY - h * 0.27);
      ctx.lineTo(eyeXs[0] + w * 0.08, eyeY - h * 0.15);
      ctx.moveTo(eyeXs[1] + w * 0.08, eyeY - h * 0.27);
      ctx.lineTo(eyeXs[1] - w * 0.08, eyeY - h * 0.15);
      ctx.stroke();
    });
  }
  if (mood === "crying") {
    // tears running down from both eyes
    ctx.fillStyle = "#7cc4ff";
    eyeXs.forEach((x, i) => {
      const fall = (t * 1.3 + i * 0.5) % 1;
      ctx.globalAlpha = 1 - fall;
      capsule(ctx, x + (i ? 1 : -1) * w * 0.02, eyeY + h * 0.1 + fall * h * 0.35, w * 0.022, w * 0.06);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
  }
  if (mood === "sleepy") {
    // a 💤 bobbing in the corner of the visor
    ctx.font = `${Math.round(w * 0.17)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(t * 2);
    ctx.fillText("💤", w * 0.84, h * 0.24 + Math.sin(t * 2) * h * 0.03);
    ctx.globalAlpha = 1;
  }
  if (FOODS.includes(mood)) {
    // a 😋 on the visor too, pulsing as he enjoys it
    ctx.font = `${Math.round(w * 0.17)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("😋", w * 0.84, h * 0.24 + Math.sin(t * 6) * h * 0.02);
  }
  if (mood === "popcorn" || mood === "heartbreak") {
    // 🍿 for the popcorn toss, 💔 for a break-up
    ctx.font = `${Math.round(w * 0.17)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(mood === "popcorn" ? "🍿" : "💔", w * 0.84, h * 0.24 + Math.sin(t * (mood === "popcorn" ? 6 : 2)) * h * 0.02);
  }
  if (mood === "confused") {
    // a question mark that bobs above one eye
    ctx.font = `bold ${Math.round(w * 0.16)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("?", w * 0.84, h * 0.22 + Math.sin(t * 5) * h * 0.02);
  }

  // mouth
  ctx.lineWidth = w * 0.022;
  const mouthX = w / 2 + shiftX * 0.5;
  twice(() => {
    ctx.beginPath();
    if (thanksText > 0.05) {
      // 감사합니다 ("thank you") or नमस्ते written where the mouth would be, fading in as he bows
      ctx.globalAlpha = thanksText;
      ctx.font = `bold ${Math.round(w * 0.1)}px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "Kohinoor Devanagari", "Devanagari Sangam MN", "Noto Sans Devanagari", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(greeting, mouthX, h * 0.74);
      ctx.globalAlpha = 1;
    } else if (speaking) {
      // talking: the mouth opens and closes in a lively, uneven rhythm
      const open = 0.25 + 0.75 * Math.abs(Math.sin(t * 12) * 0.7 + Math.sin(t * 19) * 0.3);
      ctx.ellipse(mouthX, h * 0.72, w * 0.055, h * (0.012 + 0.065 * open), 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (BIG_SMILE.includes(mood)) {
      ctx.moveTo(mouthX - w * 0.1, h * 0.66);
      ctx.quadraticCurveTo(mouthX, h * 0.96, mouthX + w * 0.1, h * 0.66);
      ctx.closePath();
      ctx.fill();
    } else if (sadLike || mood === "angry") {
      ctx.arc(mouthX, h * 0.86, w * 0.075, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (mood === "confused") {
      // a wobbly line
      ctx.moveTo(mouthX - w * 0.09, h * 0.74);
      ctx.quadraticCurveTo(mouthX - w * 0.045, h * 0.68, mouthX, h * 0.74);
      ctx.quadraticCurveTo(mouthX + w * 0.045, h * 0.8, mouthX + w * 0.09, h * 0.74);
      ctx.stroke();
    } else if (mood === "sleepy") {
      ctx.ellipse(mouthX, h * 0.74, w * 0.035, h * (0.03 + 0.03 * Math.sin(t * 1.8)), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.stroke();
    } else if (mood === "thinking") {
      ctx.moveTo(mouthX - w * 0.045, h * 0.73);
      ctx.lineTo(mouthX + w * 0.045, h * 0.73);
      ctx.stroke();
    } else if (mood === "listening") {
      ctx.ellipse(mouthX, h * 0.73, w * 0.03, h * 0.05, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (mood === "surprised" || mood === "grabbed" || mood === "scared") {
      ctx.ellipse(mouthX + (mood === "scared" ? Math.sin(t * 40) * w * 0.004 : 0), h * 0.75, w * 0.042, h * 0.075, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // neutral, wave and delighted: a friendly smile
      ctx.arc(mouthX, h * 0.64, w * 0.075, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  });

  ctx.restore();
}

// ------------------------------------------------------------------------------------------------
// small helpers
// ------------------------------------------------------------------------------------------------

/** A vertical pill shape (rounded ends) centred on cx, cy. */
function capsule(ctx, cx, cy, width, height) {
  const r = width / 2;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - height / 2 + r);
  ctx.arc(cx, cy - height / 2 + r, r, Math.PI, 0);
  ctx.lineTo(cx + r, cy + height / 2 - r);
  ctx.arc(cx, cy + height / 2 - r, r, 0, Math.PI);
  ctx.closePath();
}

// The visor lens: an ellipsoid centred just inside the front of the head (position and radii, in head units).
const LENS = { z: 0.58, rx: 0.7, ry: 0.5, rz: 0.22 };

/**
 * Pushes every point of a flat plane forwards onto the surface of the visor lens (plus a hair, so it
 * sits just in front), so the glowing face follows the curve of the glass instead of floating flat in
 * front of it. Points beyond the lens edge stay level with its rim, hidden inside the head.
 */
function curveOnLens(geometry) {
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const inside = 1 - (x / LENS.rx) ** 2 - (y / LENS.ry) ** 2;
    position.setZ(i, LENS.z + LENS.rz * Math.sqrt(Math.max(0, inside)) + 0.006);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function radialTexture(stops) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function heartShape() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.translate(64, 70);
  ctx.fillStyle = "#fb7185";
  ctx.shadowColor = "#f43f5e";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(0, 34);
  ctx.bezierCurveTo(-60, -4, -34, -46, 0, -18);
  ctx.bezierCurveTo(34, -46, 60, -4, 0, 34);
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function starShape() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.translate(64, 64);
  ctx.fillStyle = "#fcd34d";
  ctx.shadowColor = "#fbbf24";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const radius = i % 2 === 0 ? 52 : 11;
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A texture of one emoji (the browser draws it in colour), for floating sprites. */
function emojiTexture(emoji) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.font = '96px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
