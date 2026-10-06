// Things Mark holds in his hands for the "birthday", "shopping" and food gestures: a cake with a candle,
// a bunch of balloons, shopping bags, pizza, a burger, ice cream, ...
//
// Like the robot itself, every prop is built from simple Three.js shapes - there are no model files.
// robot3d.js calls createProps() once, then setMood() / update() every frame.

import * as THREE from "three";

// The gestures that give him something to hold (the food ones all work the same way: lift, bite, chew).
export const FOODS = ["pizza", "burger", "icecream", "donut", "coffee", "fries", "noodles", "tteokbokki", "veggies", "fruits", "momos", "sweets", "chocolate", "chips", "tea"];
export const DRINKS = ["coffee", "tea"]; // these are sipped (cup tilts towards his face) rather than bitten and chewed

const { PI } = Math;

/** A matte colour. Props use plain materials so they look like painted toys next to the glossy robot. */
const paint = (color, roughness = 0.6) => new THREE.MeshStandardMaterial({ color, roughness });
/** A glossy colour, for balloons. */
const gloss = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 });

/** Adds a mesh to `parent` at x, y, z and returns it. */
function part(parent, geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// ------------------------------------------------------------------------------------------------
// The props. Each builder returns a group whose origin is where the hand grips it; the thing itself
// stands up from there (+y). The bags are the exception: they hang down (-y) from the hand.
// ------------------------------------------------------------------------------------------------

function pizza() {
  const g = new THREE.Group();
  // A slice is a flat three-sided prism. It is turned so the toppings face us and the tip points up.
  const slice = new THREE.Group();
  slice.rotation.order = "ZXY";
  slice.rotation.set(PI / 2, 0, PI);
  slice.position.y = 0.17;
  g.add(slice);
  const r = 0.34;
  part(slice, new THREE.CylinderGeometry(r, r, 0.05, 3), paint(0xe8b470));
  part(slice, new THREE.CylinderGeometry(r * 0.86, r * 0.86, 0.045, 3), paint(0xffc94a), 0, 0.03, 0); // cheese
  [[0, 0.12], [-0.1, -0.05], [0.1, -0.05]].forEach(([x, z]) => {
    part(slice, new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), paint(0xc0392b), x, 0.06, z); // pepperoni
  });
  const crust = part(slice, new THREE.CapsuleGeometry(0.045, 0.5, 8, 12), paint(0xd9984f), 0, 0.03, -r / 2);
  crust.rotation.z = PI / 2;
  return g;
}

function burger() {
  const g = new THREE.Group();
  const bun = paint(0xe0a050);
  const half = (y, flip) => {
    const bunHalf = part(g, new THREE.SphereGeometry(0.27, 28, 12, 0, PI * 2, flip ? 0 : PI / 2, PI / 2), bun, 0, y);
    bunHalf.scale.y = flip ? 0.8 : 0.5;
    return bunHalf;
  };
  half(0.1, false); // bottom bun
  part(g, new THREE.CylinderGeometry(0.26, 0.26, 0.07, 28), paint(0x5a3420), 0, 0.15); // patty
  const cheese = part(g, new THREE.BoxGeometry(0.46, 0.015, 0.46), paint(0xffc93c), 0, 0.2);
  cheese.rotation.y = PI / 4;
  const lettuce = part(g, new THREE.TorusGeometry(0.24, 0.035, 8, 28), paint(0x6bbf3a), 0, 0.22);
  lettuce.rotation.x = PI / 2;
  part(g, new THREE.CylinderGeometry(0.22, 0.22, 0.03, 24), paint(0xe0412f), 0, 0.245); // tomato
  half(0.26, true); // top bun
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    const seed = part(g, new THREE.SphereGeometry(0.018, 8, 6), paint(0xfff3d0), Math.cos(a) * 0.12, 0.45, Math.sin(a) * 0.12);
    seed.scale.y = 0.6;
  }
  return g;
}

function iceCream() {
  const g = new THREE.Group();
  const cone = part(g, new THREE.ConeGeometry(0.15, 0.42, 24), paint(0xd9a05b), 0, 0.16);
  cone.rotation.x = PI; // point down
  part(g, new THREE.SphereGeometry(0.17, 24, 18), paint(0xff9ec4, 0.5), 0, 0.5); // strawberry scoop
  part(g, new THREE.SphereGeometry(0.15, 24, 18), paint(0x9be8c8, 0.5), 0, 0.7); // mint scoop
  part(g, new THREE.SphereGeometry(0.05, 12, 10), paint(0xd62839, 0.3), 0, 0.86); // cherry
  return g;
}

function donut() {
  const g = new THREE.Group();
  const ring = new THREE.Group();
  ring.position.y = 0.26;
  g.add(ring);
  part(ring, new THREE.TorusGeometry(0.2, 0.09, 16, 36), paint(0xd9a05b));
  const icing = part(ring, new THREE.TorusGeometry(0.2, 0.1, 16, 36), paint(0xff7aa8, 0.4), 0, 0, 0.03);
  icing.scale.z = 0.7;
  const colors = [0xffffff, 0xfff176, 0x7dd3fc, 0x86efac];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2 + 0.3;
    const sprinkle = part(ring, new THREE.BoxGeometry(0.05, 0.014, 0.014), paint(colors[i % 4]), Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.1);
    sprinkle.rotation.z = a * 3;
  }
  return g;
}

/** Steam: soft grey puffs that rise from the top of hot food. update() animates them. */
function addSteam(group, glowTexture, y, count = 3, rise = 0.5) {
  group.userData.steam = Array.from({ length: count }, (_, i) => {
    const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0x8296ad, transparent: true, depthWrite: false, opacity: 0 }));
    puff.userData = { x: (i - (count - 1) / 2) * (0.3 / count), baseY: y, phase: i / count, rise };
    group.add(puff);
    return puff;
  });
}

/** A small cup and saucer: `color` is the china, `drink` the colour of what is inside. */
function cupAndSaucer(glowTexture, color, drink, rim) {
  const g = new THREE.Group();
  const china = paint(color, 0.25);
  part(g, new THREE.CylinderGeometry(0.17, 0.15, 0.018, 28), china, 0, 0.01); // saucer
  const cup = part(g, new THREE.CylinderGeometry(0.11, 0.07, 0.14, 28, 1, true), china, 0, 0.09);
  cup.material.side = THREE.DoubleSide;
  part(g, new THREE.CylinderGeometry(0.07, 0.065, 0.02, 24), china, 0, 0.025); // the cup's base
  part(g, new THREE.CylinderGeometry(0.105, 0.105, 0.01, 28), paint(drink, 0.15), 0, 0.145); // the hot drink
  const lip = part(g, new THREE.TorusGeometry(0.11, 0.008, 8, 28), paint(rim, 0.3), 0, 0.16);
  lip.rotation.x = PI / 2;
  const handle = part(g, new THREE.TorusGeometry(0.045, 0.014, 8, 16), china, 0.135, 0.1);
  handle.scale.set(0.9, 1.1, 1);
  addSteam(g, glowTexture, 0.2, 4, 0.7); // wisps rising, so it clearly looks hot
  return g;
}

const coffee = (glowTexture) => cupAndSaucer(glowTexture, 0x3b82c4, 0x3b2314, 0xffffff); // blue cup of dark coffee
const tea = (glowTexture) => cupAndSaucer(glowTexture, 0xffc2d4, 0xc77d2a, 0xf5c542); // pink teacup of amber tea

function fries() {
  const g = new THREE.Group();
  const carton = part(g, new THREE.CylinderGeometry(0.19, 0.13, 0.26, 4), paint(0xe03a3a), 0, 0.15);
  carton.rotation.y = PI / 4;
  const potato = paint(0xf5c542);
  for (let i = 0; i < 10; i++) {
    const a = i * 2.4;
    const stick = part(g, new THREE.BoxGeometry(0.04, 0.3, 0.04), potato, Math.cos(a) * 0.08, 0.36 + (i % 3) * 0.03, Math.sin(a) * 0.06);
    stick.rotation.set(Math.sin(a) * 0.15, a, Math.cos(a) * 0.15);
  }
  return g;
}

/** A dark bowl with a red spicy broth on top, 0.3 wide. Shared by ramyeon and tteokbokki. */
function koreanBowl(g) {
  const bowl = part(g, new THREE.SphereGeometry(0.3, 28, 16, 0, PI * 2, PI / 2, PI / 2), paint(0x374151, 0.4), 0, 0.3);
  bowl.scale.y = 0.85;
  const broth = part(g, new THREE.CircleGeometry(0.29, 28), paint(0xd9381e, 0.25), 0, 0.298);
  broth.rotation.x = -PI / 2;
}

/** Korean spicy ramyeon: a heap of noodles piled high over red broth, long noodles lifted on chopsticks, egg, seaweed, spring onion. */
function noodles(glowTexture) {
  const g = new THREE.Group();
  koreanBowl(g);
  const noodle = paint(0xf6d365, 0.5);
  // the heap: rings of noodle getting smaller towards the top, so it stands well above the rim and shows from the front
  [[0.25, 0.31], [0.21, 0.36], [0.16, 0.41], [0.1, 0.46]].forEach(([r, y], i) => {
    const ring = part(g, new THREE.TorusGeometry(r, 0.05, 10, 28), noodle, 0, y, 0);
    ring.rotation.set(PI / 2 + (i % 2 ? 0.15 : -0.15), 0, i);
  });
  part(g, new THREE.SphereGeometry(0.1, 14, 10), noodle, 0, 0.5, 0);
  // long noodles pulled up out of the heap by the chopsticks
  [[-0.04, 0], [0, 0.03], [0.04, -0.02]].forEach(([dx, dz]) => {
    const points = Array.from({ length: 9 }, (_, k) => new THREE.Vector3(dx + Math.sin(k * 1.4 + dx * 20) * 0.04, 0.5 + k * 0.045, dz + Math.cos(k * 1.2) * 0.03));
    part(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 20, 0.028, 6), noodle);
  });
  // a few noodles flopping over the front of the bowl, where they can be seen
  [-0.12, 0, 0.12].forEach((x, i) => {
    const drape = [[x * 0.4, 0.5, 0.04], [x * 0.7, 0.52, 0.2], [x, 0.44, 0.33], [x * 1.1, 0.3, 0.37], [x * 1.1, 0.16, 0.36]].map(([px, py, pz]) => new THREE.Vector3(px, py - i * 0.02, pz));
    part(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(drape), 16, 0.03, 6), noodle);
  });
  [-0.018, 0.018].forEach((z) => {
    const stick = part(g, new THREE.CylinderGeometry(0.014, 0.014, 0.6, 6), paint(0xc08a4b), 0.27, 0.99, z); // gripping the noodles, pointing out to the side so they stay clear of his head
    stick.rotation.z = -1.1;
  });
  const egg = part(g, new THREE.SphereGeometry(0.1, 14, 10), paint(0xffffff, 0.4), -0.16, 0.42, 0.14);
  egg.scale.y = 0.65;
  part(g, new THREE.SphereGeometry(0.052, 12, 8), paint(0xffb703, 0.4), -0.16, 0.455, 0.14); // yolk
  const seaweed = part(g, new THREE.BoxGeometry(0.2, 0.2, 0.012), paint(0x1f3a2b, 0.7), 0.2, 0.5, -0.1); // a sheet of nori
  seaweed.rotation.z = -0.25;
  for (let i = 0; i < 7; i++) {
    const a = i * 1.9;
    part(g, new THREE.CylinderGeometry(0.022, 0.022, 0.016, 8), paint(0x4ade80), Math.cos(a) * 0.1, 0.55, Math.sin(a) * 0.1); // spring onion
  }
  addSteam(g, glowTexture, 0.6, 5, 0.8);
  return g;
}

/** A white salad bowl heaped with lettuce, tomatoes, cucumber, carrots and broccoli. */
function veggies() {
  const g = new THREE.Group();
  const bowl = part(g, new THREE.SphereGeometry(0.3, 28, 16, 0, PI * 2, PI / 2, PI / 2), paint(0xf1f5f9, 0.35), 0, 0.3);
  bowl.scale.y = 0.85;
  const leaf = paint(0x4cae4f, 0.6);
  [[0, 0.43, 0, 0.2], [-0.15, 0.37, 0.08, 0.15], [0.15, 0.37, -0.05, 0.15], [0.02, 0.37, 0.16, 0.14], [-0.08, 0.38, -0.12, 0.13]].forEach(([x, y, z, r]) => {
    const blob = part(g, new THREE.SphereGeometry(r, 14, 10), leaf, x, y, z); // lettuce
    blob.scale.y = 0.7;
  });
  [[-0.13, 0.5, 0.16], [0.17, 0.47, 0.13]].forEach(([x, y, z]) => part(g, new THREE.SphereGeometry(0.07, 14, 10), paint(0xe0312a, 0.3), x, y, z)); // tomatoes
  [[0.02, 0.52, 0.2], [-0.2, 0.46, 0.0]].forEach(([x, y, z]) => {
    const slice = part(g, new THREE.CylinderGeometry(0.06, 0.06, 0.015, 16), paint(0xbfe3a0, 0.5), x, y, z); // cucumber slices
    slice.rotation.x = PI / 2;
  });
  [[0.07, 0.62, 0.0, 0.35], [0.0, 0.64, -0.03, -0.1], [-0.07, 0.6, 0.03, -0.4]].forEach(([x, y, z, tilt]) => {
    const carrot = part(g, new THREE.ConeGeometry(0.035, 0.3, 10), paint(0xff8c1a, 0.5), x, y, z); // carrots sticking up
    carrot.rotation.z = tilt;
    carrot.rotation.x = PI; // point down into the bowl
  });
  part(g, new THREE.CylinderGeometry(0.02, 0.025, 0.1, 8), paint(0x8ccf6a), 0.18, 0.52, -0.02); // broccoli stem
  [[0.18, 0.62, -0.02, 0.075], [0.12, 0.6, -0.02, 0.055], [0.24, 0.6, -0.02, 0.055]].forEach(([x, y, z, r]) => part(g, new THREE.SphereGeometry(r, 10, 8), paint(0x2e8b3d, 0.7), x, y, z));
  return g;
}

/** A wooden bowl of fruit: apple, orange, banana, grapes and a strawberry. */
function fruits() {
  const g = new THREE.Group();
  const bowl = part(g, new THREE.SphereGeometry(0.3, 28, 16, 0, PI * 2, PI / 2, PI / 2), paint(0x8b5e34, 0.5), 0, 0.3);
  bowl.scale.y = 0.85;
  part(g, new THREE.SphereGeometry(0.13, 18, 14), paint(0xe0312a, 0.3), -0.12, 0.42, 0.06); // apple
  part(g, new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), paint(0x6b4423), -0.12, 0.56, 0.06);
  const appleLeaf = part(g, new THREE.SphereGeometry(0.04, 8, 6), paint(0x4cae4f), -0.08, 0.57, 0.06);
  appleLeaf.scale.set(1.6, 0.4, 0.8);
  part(g, new THREE.SphereGeometry(0.12, 18, 14), paint(0xff9f1c, 0.4), 0.14, 0.4, 0.05); // orange
  const banana = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.22, 0.34, -0.06), new THREE.Vector3(0, 0.5, -0.1), new THREE.Vector3(0.24, 0.38, -0.06)]);
  part(g, new THREE.TubeGeometry(banana, 16, 0.045, 8), paint(0xffd93d, 0.5));
  [[-0.22, 0.34], [0.24, 0.38]].forEach(([x, y]) => part(g, new THREE.SphereGeometry(0.035, 8, 6), paint(0x5a3a1a), x, y, -0.06)); // banana tips
  [[0, 0], [0.05, 0.01], [-0.05, 0.01], [0.025, -0.04], [-0.025, -0.04], [0, 0.05], [0.04, 0.05], [-0.04, 0.05]].forEach(([x, y]) => part(g, new THREE.SphereGeometry(0.036, 10, 8), paint(0x7b3fa0, 0.3), 0.02 + x, 0.5 + y, 0.16)); // grapes
  const berry = part(g, new THREE.ConeGeometry(0.05, 0.11, 12), paint(0xe0243a, 0.4), 0.0, 0.36, 0.22);
  berry.rotation.x = PI;
  part(g, new THREE.SphereGeometry(0.035, 8, 6), paint(0x3fa34d), 0.0, 0.42, 0.22); // its green top
  return g;
}

/** A bamboo steamer of momos (dumplings), steaming hot. */
function momos(glowTexture) {
  const g = new THREE.Group();
  part(g, new THREE.CylinderGeometry(0.28, 0.27, 0.1, 28), paint(0xd7b377, 0.6), 0, 0.06);
  part(g, new THREE.CylinderGeometry(0.285, 0.285, 0.1, 28), paint(0xc29a5b, 0.6), 0, 0.16);
  const dough = paint(0xfffaf0, 0.5);
  const dumpling = (x, y, z, turn) => {
    const d = new THREE.Group();
    d.position.set(x, y, z);
    d.rotation.y = turn;
    g.add(d);
    const body = part(d, new THREE.SphereGeometry(0.1, 16, 12), dough);
    body.scale.set(1.25, 0.75, 0.9);
    for (let i = 0; i < 5; i++) part(d, new THREE.SphereGeometry(0.02, 8, 6), dough, (i - 2) * 0.045, 0.065, 0); // the pleats on top
  };
  [[0.13, 0.28, 0.08, 0.4], [-0.13, 0.28, 0.08, -0.4], [0.1, 0.28, -0.12, 2.6], [-0.1, 0.28, -0.12, -2.6]].forEach(([x, y, z, turn]) => dumpling(x, y, z, turn));
  dumpling(0, 0.37, 0, 0.1);
  addSteam(g, glowTexture, 0.5, 5, 0.8);
  return g;
}

/** A chocolate bar: dark squares, with a red wrapper still folded round the bottom half. */
function chocolate() {
  const g = new THREE.Group();
  part(g, new THREE.BoxGeometry(0.24, 0.38, 0.05), paint(0x4a2a1a, 0.35), 0, 0.22);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      part(g, new THREE.BoxGeometry(0.095, 0.105, 0.02), paint(0x5c3522, 0.3), (col - 0.5) * 0.11, 0.24 + row * 0.115, 0.03); // the squares
    }
  }
  part(g, new THREE.BoxGeometry(0.26, 0.2, 0.065), paint(0xd7263d, 0.35), 0, 0.12); // wrapper
  part(g, new THREE.BoxGeometry(0.16, 0.05, 0.01), paint(0xffd23f, 0.4), 0, 0.12, 0.036); // gold label
  return g;
}

/** Sweets: a big swirly lollipop and a couple of wrapped candies. */
function sweets() {
  const g = new THREE.Group();
  part(g, new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8), paint(0xf8fafc), 0, 0.15); // stick
  const disc = part(g, new THREE.CylinderGeometry(0.17, 0.17, 0.04, 28), paint(0xff5fa2, 0.3), 0, 0.38);
  disc.rotation.x = PI / 2; // face towards us
  [0.12, 0.07].forEach((r, i) => {
    const swirl = part(g, new THREE.TorusGeometry(r, 0.014, 8, 28), paint(i ? 0xffffff : 0xffd6ea, 0.3), 0, 0.38, 0.03);
    swirl.rotation.z = i;
  });
  [[-0.2, 0.08, 0x4ea8ff], [0.2, 0.1, 0xffd23f]].forEach(([x, y, color]) => {
    part(g, new THREE.SphereGeometry(0.06, 12, 10), paint(color, 0.3), x, y, 0.04); // a wrapped candy: a ball
    [-1, 1].forEach((side) => {
      const twist = part(g, new THREE.ConeGeometry(0.045, 0.07, 8), paint(color, 0.3), x + side * 0.085, y, 0.04);
      twist.rotation.z = -side * PI / 2; // with a twisted wrapper at each end
    });
  });
  return g;
}

/** A bag of crisps: shiny red bag, crimped top, a few chips poking out. */
function chips() {
  const g = new THREE.Group();
  part(g, new THREE.BoxGeometry(0.32, 0.44, 0.09), paint(0xe03a3a, 0.25), 0, 0.23);
  const label = part(g, new THREE.CylinderGeometry(0.08, 0.08, 0.01, 20), paint(0xffd23f, 0.4), 0, 0.24, 0.05);
  label.rotation.x = PI / 2;
  for (let i = 0; i < 8; i++) part(g, new THREE.BoxGeometry(0.03, 0.03, 0.095), paint(0xc02b2b, 0.3), (i - 3.5) * 0.04, 0.46, 0); // the crimped top edge
  [[-0.07, 0.2], [0.04, -0.1], [0.1, 0.4]].forEach(([x, tilt]) => {
    const crisp = part(g, new THREE.CylinderGeometry(0.075, 0.075, 0.012, 16), paint(0xf5c542, 0.5), x, 0.52, 0.01);
    crisp.rotation.set(PI / 2, 0, tilt); // crisps standing up out of the bag
    crisp.scale.set(1, 1, 0.85);
  });
  return g;
}

/** Tteokbokki: chewy rice cakes in fiery red sauce. */
function tteokbokki(glowTexture) {
  const g = new THREE.Group();
  koreanBowl(g);
  const cake = paint(0xf3d9b1, 0.5);
  for (let i = 0; i < 8; i++) {
    const a = i * 2.2;
    const rice = part(g, new THREE.CylinderGeometry(0.045, 0.045, 0.16, 10), cake, Math.cos(a) * 0.13, 0.33 + (i % 2) * 0.03, Math.sin(a) * 0.13);
    rice.rotation.set(PI / 2, 0, a);
  }
  part(g, new THREE.CylinderGeometry(0.025, 0.025, 0.012, 8), paint(0x4ade80), 0.05, 0.36, 0.05); // spring onion
  addSteam(g, glowTexture, 0.6);
  return g;
}

function bag(color) {
  const g = new THREE.Group();
  part(g, new THREE.BoxGeometry(0.36, 0.44, 0.17), paint(color, 0.7), 0, -0.31); // the paper bag
  part(g, new THREE.BoxGeometry(0.2, 0.09, 0.01), paint(0xffffff), 0, -0.3, 0.09); // a label on the front
  const handle = part(g, new THREE.TorusGeometry(0.09, 0.012, 8, 20, PI), paint(0xf1f5f9), 0, -0.09);
  handle.rotation.y = 0;
  return g;
}

/** Candles on a two-tier cake. The flame is a glowing sprite, returned so it can flicker. */
function cake(glowTexture) {
  const g = new THREE.Group();
  part(g, new THREE.CylinderGeometry(0.3, 0.3, 0.02, 32), paint(0xffffff, 0.3), 0, 0); // plate
  part(g, new THREE.CylinderGeometry(0.24, 0.24, 0.15, 32), paint(0xffb3c7, 0.5), 0, 0.095);
  const icing = part(g, new THREE.TorusGeometry(0.24, 0.025, 8, 32), paint(0xffffff, 0.4), 0, 0.17);
  icing.rotation.x = PI / 2;
  part(g, new THREE.CylinderGeometry(0.17, 0.17, 0.12, 32), paint(0xfff4e0, 0.5), 0, 0.235);
  part(g, new THREE.SphereGeometry(0.035, 12, 10), paint(0xd62839, 0.3), 0.07, 0.31, 0.04); // cherry
  part(g, new THREE.CylinderGeometry(0.018, 0.018, 0.14, 10), paint(0x4aa3ff), 0, 0.37); // candle
  const flame = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture, color: 0xffb347, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }),
  );
  flame.position.y = 0.52;
  g.add(flame);
  g.userData.flame = flame;
  return g;
}

/** A tall glass of sparkling drink: golden fizz, bubbles rising, little sparkles above. */
function flute(glowTexture) {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.55, roughness: 0.05, clearcoat: 1 });
  part(g, new THREE.CylinderGeometry(0.08, 0.05, 0.34, 20, 1, true), glass, 0, 0.36); // the glass, open at the top
  part(g, new THREE.CylinderGeometry(0.075, 0.048, 0.24, 20), paint(0xffc82e, 0.2), 0, 0.31); // golden drink
  part(g, new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), glass, 0, 0.09); // stem
  part(g, new THREE.CylinderGeometry(0.07, 0.07, 0.015, 20), glass, 0, 0); // base
  g.userData.bubbles = [0, 1, 2, 3, 4].map((i) => part(g, new THREE.SphereGeometry(0.012, 8, 6), paint(0xffffff, 0.2), (i - 2) * 0.02, 0.2, ((i * 7) % 5 - 2) * 0.012));
  g.userData.sparks = [0, 1, 2, 3].map(() => {
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffe9a8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    g.add(spark);
    return spark;
  });
  return g;
}

/** Two bunches of party balloons, tied to a weight on the floor either side of him and swaying gently. */
function partyBalloons() {
  const g = new THREE.Group();
  [[-1.5, [0xff4d6d, 0xffd23f, 0x4ea8ff]], [1.5, [0x7ee081, 0xc084fc, 0xff9f43]]].forEach(([x, colors]) => {
    const bunch = new THREE.Group(); // pivots at the weight on the floor, so the balloons sway above it
    bunch.position.set(x, 0.1, -0.3);
    bunch.userData.sway = x;
    g.add(bunch);
    [[0, 3.2], [-0.28, 2.8], [0.26, 2.6]].forEach(([bx, by], i) => {
      const body = part(bunch, new THREE.SphereGeometry(0.22, 24, 18), gloss(colors[i]), bx, by);
      body.scale.set(1, 1.2, 1);
      const knot = part(bunch, new THREE.ConeGeometry(0.03, 0.05, 8), gloss(colors[i]), bx, by - 0.28);
      knot.rotation.x = PI;
      const string = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(bx, by - 0.3, 0)]);
      bunch.add(new THREE.Line(string, new THREE.LineBasicMaterial({ color: 0xe2e8f0 })));
    });
    part(bunch, new THREE.SphereGeometry(0.06, 12, 8), paint(0x64748b), 0, 0); // the weight
  });
  return g;
}

/** A striped party hat with a pompom. It is worn tilted to one side so the antenna stays clear. */
function partyHat() {
  const g = new THREE.Group();
  part(g, new THREE.ConeGeometry(0.22, 0.5, 24), paint(0xff4d6d, 0.4), 0, 0.25);
  [0.12, 0.26].forEach((y, i) => {
    const stripe = part(g, new THREE.TorusGeometry(0.19 - i * 0.07, 0.016, 8, 24), paint(0xffffff), 0, y);
    stripe.rotation.x = PI / 2;
  });
  part(g, new THREE.SphereGeometry(0.05, 12, 10), paint(0xffd23f), 0, 0.52);
  return g;
}

// how much to enlarge each prop when he holds it (1 = as built)
const SIZE = { cake: 1.6, flute: 1.9, bagL: 1.15, bagR: 1.15, noodles: 1.8, tteokbokki: 1.9, veggies: 1.4, fruits: 1.4, momos: 1.7, chocolate: 1.35, sweets: 1.3, chips: 1.35, coffee: 2.1, tea: 2.1 };

const BUILDERS = { pizza, burger, icecream: iceCream, donut, coffee, fries, noodles, tteokbokki, veggies, fruits, momos, sweets, chocolate, chips, tea };

/**
 * What he holds for each gesture: [which hand (0 = his left, 1 = his right), prop, keepUpright].
 * keepUpright props (food, cake) stay level whichever way the arm swings; bags and balloons just hang from it.
 */
function holdingFor(mood, props) {
  if (mood === "birthday") return [[1, props.cake, true], [0, props.flute, true]];
  if (mood === "shopping") return [[0, props.bagL, false], [1, props.bagR, false]];
  if (FOODS.includes(mood)) return [[1, props[mood], true]];
  return null;
}

/**
 * @param scene        the Three.js scene (the confetti falls in it)
 * @param arms         the two shoulder groups [left, right]; props are attached to the hands
 * @param glowTexture  a soft round gradient, used for the candle flame, sparkles and steam
 * @param head         the head group (the party hat sits on it)
 */
export function createProps(scene, arms, glowTexture, head) {
  // an empty holder at each hand, so a prop is placed relative to the hand rather than the shoulder
  const hands = arms.map((arm) => {
    const hand = new THREE.Group();
    hand.position.set(0, -0.68, 0.04);
    hand.rotation.order = "ZXY";
    arm.add(hand);
    return hand;
  });

  const props = { cake: cake(glowTexture), flute: flute(glowTexture), bagL: bag(0xff6fa5), bagR: bag(0x4aa8ff) };
  for (const name of FOODS) props[name] = BUILDERS[name](glowTexture);
  Object.entries(props).forEach(([kind, p]) => { p.userData.kind = kind; p.visible = false; });
  hands[1].add(props.cake, props.bagR, ...FOODS.map((name) => props[name]));
  hands[0].add(props.flute, props.bagL);

  // the rest of the party: balloons either side of him, and a hat
  const balloons = partyBalloons();
  balloons.visible = false;
  scene.add(balloons);
  const hat = partyHat();
  hat.position.set(0.42, 1.12, 0);
  hat.rotation.z = -0.5;
  hat.visible = false;
  head.add(hat);

  // confetti for the birthday: little coloured paper rectangles that flutter down
  const confetti = Array.from({ length: 18 }, (_, i) => {
    const piece = new THREE.Mesh(
      new THREE.PlaneGeometry(0.07, 0.04),
      new THREE.MeshBasicMaterial({ color: [0xff4d6d, 0xffd23f, 0x4ea8ff, 0x7ee081, 0xc084fc][i % 5], side: THREE.DoubleSide, transparent: true, toneMapped: false }),
    );
    piece.userData = { x: ((i * 0.37) % 1) * 3.2 - 1.6, z: (i % 4) * 0.2 - 0.1, offset: (i * 0.173) % 1 };
    piece.visible = false;
    scene.add(piece);
    return piece;
  });

  let holding = null; // what is in his hands right now; it stays until it has shrunk away

  return {
    /** Choose what he holds for this mood. A mood with nothing to hold leaves the current props to shrink away. */
    setMood(mood) {
      holding = holdingFor(mood, props) ?? holding;
    },

    /** `amount` runs from 0 (nothing in his hands) to 1 (fully shown). */
    update(t, amount, sip = 0) {
      Object.values(props).forEach((p) => { p.visible = false; });
      confetti.forEach((c) => { c.visible = false; });
      balloons.visible = false;
      hat.visible = false;
      if (!holding || amount < 0.02) return;

      holding.forEach(([handIndex, prop, keepUpright]) => {
        const hand = hands[handIndex];
        prop.visible = true;
        prop.scale.setScalar(amount * (SIZE[prop.userData.kind] ?? 1.2)); // food is drawn a little small, so it is enlarged
        // undo the arm's swing so the food/cake stays level, like a real hand would keep it
        if (keepUpright) hand.rotation.set(-arms[handIndex].rotation.x, 0, -arms[handIndex].rotation.z);
        else hand.rotation.set(0, 0, 0);
        // sipping: the cup tips its rim towards his face while the hand is raised
        if (DRINKS.includes(prop.userData.kind)) hand.rotation.x += 0.8 * sip;
      });

      // hot food steams, and the sparkling drink fizzes
      holding.forEach(([, prop]) => {
        prop.userData.steam?.forEach((puff) => {
          const phase = (t * 0.5 + puff.userData.phase) % 1;
          puff.position.set(puff.userData.x + Math.sin(t * 2 + puff.userData.phase * 6) * 0.03, puff.userData.baseY + phase * puff.userData.rise, 0.05);
          puff.scale.setScalar(0.2 + phase * 0.4);
          puff.material.opacity = amount * 0.85 * Math.sin(Math.PI * phase);
        });
      });
      props.flute.userData.bubbles.forEach((bubble, i) => {
        bubble.position.y = 0.2 + ((t * 0.5 + i * 0.2) % 1) * 0.22;
      });
      props.flute.userData.sparks.forEach((spark, i) => {
        const twinkle = 0.5 + 0.5 * Math.sin(t * 7 + i * 2);
        spark.position.set(Math.cos(t * 1.5 + i * 1.6) * 0.12, 0.55 + (i % 2) * 0.08, Math.sin(t * 1.5 + i * 1.6) * 0.08);
        spark.scale.setScalar(0.06 + 0.16 * twinkle);
        spark.material.opacity = twinkle;
      });

      const flame = props.cake.userData.flame;
      if (props.cake.visible) flame.scale.setScalar(0.17 + Math.sin(t * 17) * 0.02 + Math.sin(t * 29) * 0.015);

      if (props.cake.visible) {
        balloons.visible = true;
        balloons.scale.setScalar(amount);
        balloons.children.forEach((bunch) => { bunch.rotation.z = Math.sin(t * 1.3 + bunch.userData.sway) * 0.05; });
        hat.visible = true;
        hat.scale.setScalar(amount);
        confetti.forEach((c) => {
          const { x, z, offset } = c.userData;
          const fall = (t * 0.4 + offset) % 1;
          c.visible = true;
          c.position.set(x + Math.sin(t * 2 + offset * 9) * 0.15, 4.4 - fall * 4.3, z);
          c.rotation.set(t * 3 + offset * 6, t * 2 + offset * 3, 0);
          c.material.opacity = amount * Math.sin(Math.PI * fall);
        });
      }
    },

    /** True while the gesture's prop is a food (so the robot knows to lift it to his mouth). */
    isFood: (mood) => FOODS.includes(mood),
  };
}
