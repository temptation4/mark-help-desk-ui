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

/** Movie night: a big red and white striped bucket, heaped with golden popcorn that spills over the rim. */
function popcorn() {
  const g = new THREE.Group();
  const red = paint(0xe03a3a, 0.45), white = paint(0xffffff, 0.45);
  // the bucket: ten stripes around a cone that is wider at the top, with a red rim
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    const stripe = part(g, new THREE.BoxGeometry(0.11, 0.38, 0.025), i % 2 ? white : red, Math.cos(a) * 0.16, 0.19, Math.sin(a) * 0.16);
    stripe.rotation.y = -a + PI / 2;
    stripe.rotation.z = Math.cos(a) * 0.14; // leans out at the top
    stripe.rotation.x = -Math.sin(a) * 0.14;
  }
  part(g, new THREE.CylinderGeometry(0.14, 0.14, 0.02, 16), red, 0, 0.01); // the bottom
  const rim = part(g, new THREE.TorusGeometry(0.2, 0.022, 8, 24), red, 0, 0.385);
  rim.rotation.x = PI / 2;
  // the popcorn: a dome of golden, bumpy puffs (three little balls each) that rises well above the rim so it reads as popcorn
  const golden = [paint(0xffd95a, 0.7), paint(0xffe9a0, 0.7), paint(0xf5b83d, 0.7), paint(0xfff3cf, 0.7)];
  for (let i = 0; i < 34; i++) {
    const a = i * 2.4, ring = 0.2 * Math.sqrt(i / 34);
    const lift = Math.sqrt(Math.max(0, 1 - (ring / 0.22) ** 2)) * 0.17;
    const puff = new THREE.Group();
    puff.position.set(Math.cos(a) * ring, 0.4 + lift + (i % 3) * 0.012, Math.sin(a) * ring);
    for (let k = 0; k < 3; k++) {
      part(puff, new THREE.SphereGeometry(0.045 + ((i + k) % 3) * 0.01, 8, 6), golden[(i + k) % 4], (k - 1) * 0.04, (k % 2) * 0.03, ((k * 5) % 3 - 1) * 0.03);
    }
    g.add(puff);
  }
  // a few puffs tumbling over the front of the rim
  [[0.13, 0.33, 0.17], [-0.1, 0.31, 0.18], [0.02, 0.29, 0.21]].forEach(([x, y, z], i) => {
    part(g, new THREE.SphereGeometry(0.05, 8, 6), golden[i], x, y, z);
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
  // a birthday cake has candles: five of them in different colours, each with its own flickering flame
  g.userData.flames = [0xff6fa5, 0x4aa3ff, 0xffd23f, 0x7ee081, 0xc084fc].map((color, i) => {
    const a = (i / 5) * PI * 2, x = Math.cos(a) * 0.1, z = Math.sin(a) * 0.1;
    part(g, new THREE.CylinderGeometry(0.016, 0.016, 0.2, 10), paint(color), x, 0.41, z); // candle
    const flame = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture, color: 0xffb347, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }),
    );
    flame.position.set(x, 0.57, z);
    g.add(flame);
    return flame;
  });
  return g;
}

/** A wrapped present: a box with a ribbon across it and a bow on top. */
function gift() {
  const g = new THREE.Group();
  part(g, new THREE.BoxGeometry(0.3, 0.24, 0.3), paint(0x4ea8ff, 0.45), 0, 0.12);
  const ribbon = paint(0xff4d6d, 0.4);
  part(g, new THREE.BoxGeometry(0.06, 0.25, 0.31), ribbon, 0, 0.12);
  part(g, new THREE.BoxGeometry(0.31, 0.25, 0.06), ribbon, 0, 0.12);
  [-1, 1].forEach((side) => { // the two loops of the bow
    const loop = part(g, new THREE.TorusGeometry(0.06, 0.018, 8, 16), ribbon, side * 0.06, 0.29);
    loop.rotation.x = PI / 2;
  });
  part(g, new THREE.SphereGeometry(0.03, 10, 8), ribbon, 0, 0.27);
  return g;
}

/** A clipboard with a few lines of notes, for the meeting. */
function clipboard() {
  const g = new THREE.Group();
  part(g, new THREE.BoxGeometry(0.34, 0.46, 0.025), paint(0x8b5a2b, 0.6), 0, 0.25);
  part(g, new THREE.BoxGeometry(0.3, 0.4, 0.012), paint(0xffffff, 0.8), 0, 0.25, 0.018); // the paper
  part(g, new THREE.BoxGeometry(0.14, 0.05, 0.03), new THREE.MeshStandardMaterial({ color: 0xb0b7c3, metalness: 0.6, roughness: 0.35 }), 0, 0.47, 0.02); // the clip
  for (let i = 0; i < 6; i++) part(g, new THREE.BoxGeometry(i === 5 ? 0.14 : 0.22, 0.015, 0.004), paint(i % 2 ? 0x94a3b8 : 0x334155, 0.8), (i === 5 ? -0.04 : 0), 0.38 - i * 0.055, 0.026); // notes
  return g;
}

/** Rounded rectangle path on a canvas. */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * What is on the laptop's screen, drawn on a canvas so it looks like a real desktop: a wallpaper, a menu bar with a clock, an
 * editor window with Java code (tabs, line numbers, syntax colours), a terminal under it, and a dock with app icons.
 * `cursorOn` is the blinking text cursor; two textures (on and off) are swapped to make it blink.
 */
function laptopScreen(cursorOn) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");
  // wallpaper
  const wall = ctx.createLinearGradient(0, 0, 640, 400);
  wall.addColorStop(0, "#4338ca");
  wall.addColorStop(0.55, "#9333ea");
  wall.addColorStop(1, "#fb923c");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, 640, 400);
  // menu bar
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(0, 0, 640, 20);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.fillText("●", 10, 14);
  ctx.fillText("Code", 30, 14);
  ctx.font = "12px system-ui, sans-serif";
  ["File", "Edit", "View", "Run", "Terminal"].forEach((item, i) => ctx.fillText(item, 76 + i * 44, 14));
  ctx.fillText("Wed 10:42", 566, 14);
  // the editor window
  const wx = 40, wy = 36, ww = 560, wh = 250;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, wx + 4, wy + 8, ww, wh, 10);
  ctx.fill();
  ctx.fillStyle = "#1e1e2e";
  roundRect(ctx, wx, wy, ww, wh, 10);
  ctx.fill();
  ctx.fillStyle = "#2a2a3c";
  roundRect(ctx, wx, wy, ww, 24, 10);
  ctx.fill();
  ["#ff5f57", "#febc2e", "#28c840"].forEach((color, i) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(wx + 16 + i * 17, wy + 12, 5, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("Mark.java — help-desk", wx + 220, wy + 16);
  // sidebar with files
  ctx.fillStyle = "#181825";
  ctx.fillRect(wx, wy + 24, 120, wh - 24);
  ctx.font = "11px system-ui, sans-serif";
  [["▾ help-desk", "#cbd5e1"], ["   ▾ service", "#94a3b8"], ["      Mark.java", "#ffffff"], ["      AIService.java", "#94a3b8"], ["   ▸ controller", "#94a3b8"], ["   ▸ config", "#94a3b8"], ["   pom.xml", "#94a3b8"]].forEach(([text, color], i) => {
    if (i === 2) { ctx.fillStyle = "#313244"; ctx.fillRect(wx, wy + 30 + i * 18, 120, 18); }
    ctx.fillStyle = color;
    ctx.fillText(text, wx + 8, wy + 43 + i * 18);
  });
  // the code
  ctx.font = "12px ui-monospace, Menlo, Consolas, monospace";
  const code = [
    [["public ", "#cba6f7"], ["class ", "#cba6f7"], ["Mark ", "#f9e2af"], ["{", "#cdd6f4"]],
    [["    @Autowired ", "#fab387"], ["ChatClient ", "#f9e2af"], ["chat;", "#cdd6f4"]],
    [[""]],
    [["    public ", "#cba6f7"], ["String ", "#f9e2af"], ["reply", "#89b4fa"], ["(String q) {", "#cdd6f4"]],
    [["        // Mark reacts, then answers", "#6c7086"]],
    [["        return ", "#cba6f7"], ["chat", "#cdd6f4"], [".prompt()", "#89b4fa"]],
    [["            .user", "#89b4fa"], ["(q)", "#cdd6f4"], [".call()", "#89b4fa"], [".content();", "#cdd6f4"]],
    [["    }", "#cdd6f4"]],
    [["}", "#cdd6f4"]],
  ];
  code.forEach((tokens, line) => {
    const y = wy + 46 + line * 17;
    ctx.fillStyle = "#585b70";
    ctx.fillText(String(line + 1).padStart(2, " "), wx + 128, y);
    let x = wx + 156;
    tokens.forEach(([text, color]) => { ctx.fillStyle = color; ctx.fillText(text, x, y); x += ctx.measureText(text).width; });
    if (cursorOn && line === 6) { ctx.fillStyle = "#f5e0dc"; ctx.fillRect(x + 1, y - 11, 2, 14); }
  });
  // the terminal under it
  ctx.fillStyle = "#11111b";
  roundRect(ctx, wx + 60, 300, 460, 56, 8);
  ctx.fill();
  ctx.font = "11px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillStyle = "#a6e3a1";
  ctx.fillText("$ mvn spring-boot:run", wx + 72, 318);
  ctx.fillStyle = "#94e2d5";
  ctx.fillText("Started HelpDeskApplication in 3.7 seconds", wx + 72, 334);
  ctx.fillStyle = "#cdd6f4";
  ctx.fillText(cursorOn ? "$ █" : "$", wx + 72, 350);
  // the dock
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  roundRect(ctx, 190, 364, 260, 30, 10);
  ctx.fill();
  ["#38bdf8", "#4ade80", "#f472b6", "#fbbf24", "#a78bfa", "#f87171", "#e2e8f0"].forEach((color, i) => { ctx.fillStyle = color; roundRect(ctx, 200 + i * 35, 368, 24, 22, 6); ctx.fill(); });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** The keyboard and trackpad of the laptop, drawn on a canvas: rows of rounded keys on a dark deck. */
function laptopKeyboard() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#cfd5de"; // the aluminium
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = "#1f2430";
  roundRect(ctx, 20, 14, 472, 190, 8);
  ctx.fill();
  const rows = [14, 13, 14, 13, 12];
  rows.forEach((count, row) => {
    const gap = 3, width = (472 - 16 - gap * (count - 1)) / count, y = 22 + row * 35;
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = "#2f3646";
      roundRect(ctx, 28 + i * (width + gap), y, width, 30, 4);
      ctx.fill();
    }
  });
  ctx.fillStyle = "#c2c9d4"; // the trackpad
  roundRect(ctx, 176, 222, 160, 84, 8);
  ctx.fill();
  ctx.strokeStyle = "#aab2bf";
  ctx.lineWidth = 2;
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * His desk for "working": a wooden desk in front of him with an open laptop (a thin aluminium body, a black bezel with a webcam, a real-looking
 * screen that faces us; he types on the keyboard from behind it), a mouse, a mug of coffee and a little plant. The screen throws a soft blue light
 * on him. It stands on the floor in front of him, so it hides his legs.
 */
function deskWithLaptop(glowTexture) {
  const g = new THREE.Group();
  g.position.z = 0.65;
  const wood = paint(0xb9814a, 0.5), darkWood = paint(0x946438, 0.6);
  part(g, new THREE.BoxGeometry(2.5, 0.07, 1.0), wood, 0, 0.86, 0); // the top
  [-1, 1].forEach((side) => part(g, new THREE.BoxGeometry(0.09, 0.83, 0.85), darkWood, side * 1.15, 0.415, 0)); // the sides
  part(g, new THREE.BoxGeometry(2.3, 0.55, 0.04), darkWood, 0, 0.55, -0.4); // the back panel
  // the laptop: aluminium base with the keyboard on top, a hinge, and the screen standing at the far (camera) side
  const aluminium = new THREE.MeshStandardMaterial({ color: 0xd5dae2, metalness: 0.75, roughness: 0.3 });
  part(g, new THREE.BoxGeometry(1.0, 0.035, 0.68), aluminium, 0, 0.92, -0.02);
  const keys = part(g, new THREE.PlaneGeometry(0.98, 0.66), new THREE.MeshStandardMaterial({ map: laptopKeyboard(), roughness: 0.5 }), 0, 0.9385, -0.02);
  keys.rotation.x = -PI / 2;
  part(g, new THREE.CylinderGeometry(0.018, 0.018, 0.9, 12), new THREE.MeshStandardMaterial({ color: 0x9aa3b2, metalness: 0.8, roughness: 0.3 }), 0, 0.945, 0.32).rotation.z = PI / 2; // the hinge
  const screen = new THREE.Group();
  screen.position.set(0, 0.945, 0.32);
  screen.rotation.x = -0.2; // leans back a little
  part(screen, new THREE.BoxGeometry(1.0, 0.66, 0.025), aluminium, 0, 0.33, -0.006); // the lid
  part(screen, new THREE.BoxGeometry(0.97, 0.63, 0.012), new THREE.MeshStandardMaterial({ color: 0x0a0a0f, roughness: 0.2 }), 0, 0.33, 0.01); // the black bezel
  const screens = [laptopScreen(true), laptopScreen(false)];
  const display = part(screen, new THREE.PlaneGeometry(0.9, 0.5625), new THREE.MeshBasicMaterial({ map: screens[0], toneMapped: false }), 0, 0.325, 0.0175);
  part(screen, new THREE.CircleGeometry(0.008, 12), new THREE.MeshBasicMaterial({ color: 0x1f2937 }), 0, 0.625, 0.0175); // the webcam
  part(screen, new THREE.CircleGeometry(0.003, 8), new THREE.MeshBasicMaterial({ color: 0x4ade80, toneMapped: false }), 0.02, 0.625, 0.0178); // its green light
  g.userData.display = display;
  g.userData.screens = screens;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0x93c5fd, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, opacity: 0.35 }));
  glow.position.set(0, 0.33, 0.2);
  glow.scale.set(1.8, 1.3, 1);
  screen.add(glow);
  const light = new THREE.PointLight(0x9ec5ff, 1.2, 3.2); // the screen lights his face and chest
  light.position.set(0, 0.5, 0.5);
  screen.add(light);
  g.add(screen);
  // a wireless mouse
  const mouse = part(g, new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.4, roughness: 0.4 }), 0.78, 0.915, 0.2);
  mouse.scale.set(0.8, 0.5, 1.25);
  // a mug of coffee
  part(g, new THREE.CylinderGeometry(0.075, 0.065, 0.14, 16), paint(0xffffff, 0.4), -0.95, 0.965, 0.15);
  part(g, new THREE.CylinderGeometry(0.065, 0.065, 0.01, 16), paint(0x3b2314, 0.3), -0.95, 1.035, 0.15);
  part(g, new THREE.TorusGeometry(0.045, 0.012, 8, 12), paint(0xffffff, 0.4), -0.875, 0.965, 0.15).rotation.y = PI / 2;
  // a little plant in a pot
  part(g, new THREE.CylinderGeometry(0.07, 0.055, 0.1, 14), paint(0xd97757, 0.6), 1.0, 0.945, -0.2);
  [-0.5, 0, 0.5].forEach((tilt, i) => {
    const leaf = part(g, new THREE.SphereGeometry(0.06, 10, 8), paint(0x3f9d4b, 0.55), 1.0 + tilt * 0.1, 1.04 + (i === 1 ? 0.04 : 0), -0.2);
    leaf.scale.set(0.5, 1.4, 0.5);
    leaf.rotation.z = -tilt;
  });
  return g;
}

/** A broken heart: two red halves with a jagged crack between them, held a little apart. */
function brokenHeart() {
  const g = new THREE.Group();
  const half = (mirror) => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.32);
    s.bezierCurveTo(-0.15, -0.18, -0.36, 0.0, -0.36, 0.18);
    s.bezierCurveTo(-0.36, 0.34, -0.2, 0.4, -0.1, 0.34);
    s.bezierCurveTo(-0.05, 0.31, -0.01, 0.26, 0, 0.2);
    s.lineTo(-0.03, 0.08);
    s.lineTo(0.03, -0.04);
    s.lineTo(-0.02, -0.17);
    s.lineTo(0, -0.32);
    const material = paint(0xe11d48, 0.35);
    material.side = THREE.DoubleSide; // the mirrored half is inside out otherwise
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 12 }), material);
    mesh.scale.x = mirror ? -1 : 1;
    mesh.position.y = 0.4;
    g.add(mesh);
    return mesh;
  };
  g.userData.halves = [half(false), half(true)];
  return g;
}

/** A sparkle sprite, used above the cocktail. */
function sparkle(glowTexture, color = 0xffe9a8) {
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
}

const clearGlass = () => new THREE.MeshPhysicalMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.5, roughness: 0.05, clearcoat: 1 });

/** A lemon slice for the rim of a glass. */
function lemonWheel(parent, x, y) {
  const wheel = part(parent, new THREE.CylinderGeometry(0.06, 0.06, 0.012, 20), paint(0xffe14d, 0.5), x, y, 0);
  wheel.rotation.z = PI / 2.6;
  return wheel;
}

/** A cocktail: a pink drink in a stemmed glass with a little paper umbrella, a cherry, a lemon slice and sparkles above. */
function cocktail(glowTexture) {
  const g = new THREE.Group();
  part(g, new THREE.CylinderGeometry(0.16, 0.012, 0.2, 24, 1, true), clearGlass(), 0, 0.3); // the glass, open at the top
  part(g, new THREE.CylinderGeometry(0.145, 0.014, 0.16, 24), paint(0xff5f93, 0.2), 0, 0.285); // the pink drink
  part(g, new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), clearGlass(), 0, 0.1); // stem
  part(g, new THREE.CylinderGeometry(0.075, 0.075, 0.015, 20), clearGlass(), 0, 0); // base
  const stick = part(g, new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6), paint(0xd6b98c), 0.04, 0.42);
  stick.rotation.z = -0.25;
  const umbrella = part(g, new THREE.ConeGeometry(0.1, 0.06, 12), paint(0x4ade80, 0.4), 0.075, 0.55);
  umbrella.rotation.z = -0.25;
  part(g, new THREE.SphereGeometry(0.035, 10, 8), paint(0xd62839, 0.3), -0.12, 0.41); // cherry
  lemonWheel(g, 0.15, 0.39);
  g.userData.sparks = [0, 1, 2, 3, 4].map((i) => { const s = sparkle(glowTexture, [0xffe9a8, 0xff9fc2, 0xa5f3fc][i % 3]); g.add(s); return s; });
  return g;
}

/**
 * A rose: a spiral of overlapping, cupped petals, the outer ones folding outwards, on a green calyx. `color` is the petal colour;
 * the outer petals are a little darker and the heart a little lighter, as on a real rose. About 0.2 wide.
 */
function rose(color) {
  const g = new THREE.Group();
  const base = new THREE.Color(color);
  for (let i = 0; i < 16; i++) {
    const shade = base.clone().multiplyScalar(0.82 + (1 - i / 15) * 0.2).lerp(new THREE.Color(0xffffff), (i < 5 ? 0.18 : 0) + (i < 2 ? 0.1 : 0));
    const a = i * 2.4, ring = 0.012 + i * 0.0062;
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(1, 12, 8, 0, PI * 2, 0, PI * 0.62), // a cup, open at the top
      new THREE.MeshStandardMaterial({ color: shade, roughness: 0.45, side: THREE.DoubleSide }),
    );
    const size = 0.034 + i * 0.0036;
    petal.scale.set(size, size * 0.9, size * 0.55);
    petal.position.set(Math.cos(a) * ring, 0.095 - i * 0.0045, Math.sin(a) * ring);
    petal.rotation.set(0, -a, -(0.15 + i * 0.075)); // later petals lean further out
    g.add(petal);
  }
  const sepal = paint(0x3f8f46, 0.6);
  for (let i = 0; i < 5; i++) { // the green calyx under the flower
    const a = (i / 5) * PI * 2;
    const leaf = part(g, new THREE.ConeGeometry(0.02, 0.09, 6), sepal, Math.cos(a) * 0.05, 0.02, Math.sin(a) * 0.05);
    leaf.rotation.set(Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0);
  }
  return g;
}

/** A daisy: a ring of white petals round a yellow heart. About 0.2 wide. */
function daisy() {
  const g = new THREE.Group();
  const white = paint(0xffffff, 0.5);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    const petal = part(g, new THREE.SphereGeometry(1, 8, 6), white, Math.cos(a) * 0.065, 0.0, Math.sin(a) * 0.065);
    petal.scale.set(0.05, 0.008, 0.016);
    petal.rotation.y = -a;
  }
  part(g, new THREE.SphereGeometry(0.035, 12, 8), paint(0xffc400, 0.6), 0, 0.008, 0);
  return g;
}

/** A leaf: a long pointed green blade with a lighter middle vein. */
function leafBlade() {
  const g = new THREE.Group();
  const blade = part(g, new THREE.SphereGeometry(1, 10, 6), paint(0x2f7d3a, 0.55), 0, 0, 0.1);
  blade.scale.set(0.05, 0.01, 0.13);
  const vein = part(g, new THREE.BoxGeometry(0.004, 0.004, 0.2), paint(0x6bbf6f, 0.6), 0, 0.01, 0.1);
  vein.scale.y = 1;
  return g;
}

/**
 * A bridal bouquet: pink, red, peach and white roses with a few daisies, green leaves and baby's breath, wrapped in two layers of paper
 * (kraft outside, pink inside) with a ribbon bow at the neck. The hand holds it at the neck, and the flowers dome up from there.
 */
function bouquet() {
  const g = new THREE.Group();
  // the stems, bound together, and the paper wrap that flares out round them
  part(g, new THREE.CylinderGeometry(0.02, 0.016, 0.36, 10), paint(0x3f8f46, 0.6), 0, 0.0, 0);
  const wrapOuter = part(g, new THREE.ConeGeometry(0.2, 0.36, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8d4b0, roughness: 0.7, side: THREE.DoubleSide }), 0, 0.2, 0);
  wrapOuter.rotation.x = PI;
  const wrapInner = part(g, new THREE.ConeGeometry(0.17, 0.3, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xffb3c7, roughness: 0.6, side: THREE.DoubleSide }), 0, 0.22, 0.012);
  wrapInner.rotation.x = PI;
  // the ribbon bow at the neck: a knot, two loops and two tails
  const ribbon = paint(0xff5f93, 0.35);
  part(g, new THREE.SphereGeometry(0.03, 12, 8), ribbon, 0, 0.115, 0.07);
  [-1, 1].forEach((side) => {
    const loop = part(g, new THREE.TorusGeometry(0.045, 0.012, 8, 16), ribbon, side * 0.055, 0.125, 0.075);
    loop.rotation.set(0, 0.5 * side, side * 0.5);
    const tail = part(g, new THREE.BoxGeometry(0.025, 0.12, 0.006), ribbon, side * 0.03, 0.04, 0.085);
    tail.rotation.z = side * 0.25;
  });
  // leaves fanning out round the edge of the flowers
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + 0.3;
    const leaf = leafBlade();
    leaf.position.set(Math.cos(a) * 0.1, 0.4 + (i % 2) * 0.03, Math.sin(a) * 0.1);
    leaf.rotation.set(-0.5, -a + PI / 2, 0);
    g.add(leaf);
  }
  // the flowers: one rose in the middle on top, a ring of roses round it, daisies and baby's breath between
  const roseColors = [0xe0314f, 0xff7fa0, 0xffffff, 0xf9a8b8, 0xd62e5e, 0xffc9b5, 0xff6b8f];
  const spots = [[0, 0.58, 0]];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2 + 0.4; spots.push([Math.cos(a) * 0.16, 0.5 - (i % 2) * 0.02, Math.sin(a) * 0.14]); }
  spots.forEach(([x, y, z], i) => {
    const flower = rose(roseColors[i % roseColors.length]);
    flower.position.set(x, y, z);
    flower.rotation.set(Math.sin(i * 2.1) * 0.25 + (z * 1.2), i, -x * 1.4); // tilted out from the middle
    g.add(flower);
    const stem = part(g, new THREE.CylinderGeometry(0.008, 0.008, Math.hypot(x, y - 0.1, z), 6), paint(0x3f8f46, 0.6), x / 2, 0.1 + (y - 0.1) / 2, z / 2);
    stem.lookAt(new THREE.Vector3(x, y, z).add(g.position));
    stem.rotateX(PI / 2);
  });
  for (let i = 0; i < 4; i++) { // daisies
    const a = (i / 4) * PI * 2 + 1.0;
    const flower = daisy();
    flower.position.set(Math.cos(a) * 0.24, 0.42 + (i % 2) * 0.03, Math.sin(a) * 0.2);
    flower.rotation.set(0.5 * Math.sin(a), 0, -0.6 * Math.cos(a));
    g.add(flower);
  }
  for (let i = 0; i < 12; i++) { // baby's breath: tiny white flowers on thin stalks
    const a = i * 2.1;
    const x = Math.cos(a) * 0.3, y = 0.46 + (i % 3) * 0.04, z = Math.sin(a) * 0.24;
    for (let k = 0; k < 3; k++) part(g, new THREE.SphereGeometry(0.014, 6, 5), paint(0xffffff, 0.6), x + (k - 1) * 0.02, y + (k % 2) * 0.02, z);
  }
  return g;
}

/** A small gold crown with pearls, worn on top of his head for the wedding. */
function crown() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xf5c542, metalness: 0.15, roughness: 0.35, emissive: 0x6b4e00, emissiveIntensity: 0.5 }); // not very metallic: there is nothing for it to reflect
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 8, 28), gold);
  band.rotation.x = PI / 2;
  g.add(band);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI * 2;
    const spike = part(g, new THREE.ConeGeometry(0.04, 0.16, 8), gold, Math.cos(a) * 0.27, 0.09, Math.sin(a) * 0.27);
    spike.scale.y = i % 2 ? 0.8 : 1.15;
    part(g, new THREE.SphereGeometry(0.03, 8, 6), paint(0xffffff, 0.2), Math.cos(a) * 0.27, 0.19 * (i % 2 ? 0.8 : 1.15) + 0.04, Math.sin(a) * 0.27); // pearl on each spike
  }
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
const SIZE = { cake: 1.9, gift: 1.5, cocktail: 2.0, bouquet: 1.7, bouquetL: 2.3, clipboard: 1.5, brokenheart: 1.15, bagL: 1.15, bagR: 1.15, noodles: 1.8, tteokbokki: 1.9, veggies: 1.4, fruits: 1.4, momos: 1.7, chocolate: 1.35, sweets: 1.3, chips: 1.35, popcorn: 1.9, coffee: 2.1, tea: 2.1 };

const BUILDERS = { pizza, burger, icecream: iceCream, donut, coffee, fries, noodles, tteokbokki, veggies, fruits, momos, sweets, chocolate, chips, tea };

/**
 * What he holds for each gesture: [which hand (0 = his left, 1 = his right), prop, keepUpright].
 * keepUpright props (food, cake) stay level whichever way the arm swings; bags and balloons just hang from it.
 */
const WORKING = []; // "holding" for the working gesture: nothing in his hands (see the desk in createProps)

function holdingFor(mood, props) {
  if (mood === "birthday") return [[1, props.cake, true], [0, props.gift, true]]; // a cake with candles, and a present
  if (mood === "party") return [[0, props.cocktail, true]]; // one cocktail
  if (mood === "wedding" || mood === "congrats") return [[1, props.bouquet, true]]; // flowers for marriage and congratulations
  if (mood === "love") return [[0, props.bouquetL, true]]; // a big bunch of flowers in his left hand
  if (mood === "meeting") return [[1, props.clipboard, true]];
  if (mood === "popcorn") return [[1, props.popcorn, true]]; // held up high, popcorn flying out of it
  if (mood === "heartbreak") return [[1, props.brokenheart, true]];
  if (mood === "working") return WORKING; // no hand props: the desk with the laptop stands in front of him
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

  const props = { cake: cake(glowTexture), gift: gift(), cocktail: cocktail(glowTexture), bouquet: bouquet(), bouquetL: bouquet(), clipboard: clipboard(), bagL: bag(0xff6fa5), bagR: bag(0x4aa8ff) };
  for (const name of FOODS) props[name] = BUILDERS[name](glowTexture);
  props.popcorn = popcorn();
  props.brokenheart = brokenHeart();
  Object.entries(props).forEach(([kind, p]) => { p.userData.kind = kind; p.visible = false; });
  hands[1].add(props.popcorn, props.brokenheart, props.clipboard, props.bouquet, props.cake, props.bagR, ...FOODS.map((name) => props[name]));
  hands[0].add(props.bouquetL, props.cocktail, props.gift, props.bagL);

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

  // fireworks and fountains of sparks for the party ("patakhe"): bursts high up either side of him, fountains on the floor
  const burstColors = [0xff4d6d, 0xffd23f, 0x4ea8ff, 0x7ee081, 0xc084fc];
  const bursts = [[-1.25, 3.3, 0], [1.3, 3.55, 0.33], [0.05, 4.05, 0.66]].map(([x, y, delay], b) => ({
    x, y, delay, sparks: Array.from({ length: 16 }, () => { const s = sparkle(glowTexture, burstColors[b % 5]); s.visible = false; scene.add(s); return s; }),
  }));
  const fountains = [-0.85, 0.85].map((x) => ({
    x, sparks: Array.from({ length: 12 }, (_, k) => { const s = sparkle(glowTexture, k % 2 ? 0xffb347 : 0xffe9a8); s.visible = false; scene.add(s); return s; }),
  }));

  // the wedding: a crown and a shower of rose petals
  const weddingCrown = crown();
  weddingCrown.position.set(0, 1.13, 0.02); // sits on top of his head, around the antenna
  weddingCrown.scale.setScalar(1.2);
  weddingCrown.visible = false;
  head.add(weddingCrown);
  const petals = Array.from({ length: 24 }, (_, i) => {
    const petal = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, 8),
      new THREE.MeshBasicMaterial({ color: [0xffc2d4, 0xffffff, 0xff9fb8][i % 3], side: THREE.DoubleSide, transparent: true, toneMapped: false }),
    );
    petal.scale.set(1, 0.65, 1);
    petal.userData = { x: ((i * 0.41) % 1) * 3.2 - 1.6, z: (i % 5) * 0.15 - 0.1, offset: (i * 0.137) % 1 };
    petal.visible = false;
    scene.add(petal);
    return petal;
  });

  // popcorn bits that pop out of the bucket, fly in arcs all around him and fall
  const popBits = Array.from({ length: 30 }, (_, i) => {
    const bit = new THREE.Group();
    const color = [0xffd95a, 0xffe9a0, 0xfff3cf, 0xf5b83d][i % 4];
    for (let k = 0; k < 3; k++) part(bit, new THREE.SphereGeometry(0.05 + (k % 2) * 0.012, 8, 6), paint(color, 0.7), (k - 1) * 0.04, (k % 2) * 0.03, 0);
    bit.userData = { vx: (((i * 0.37) % 1) - 0.5) * 3.4, vy: 1.6 + ((i * 0.61) % 1) * 1.6, vz: ((i * 0.29) % 1) * 0.8 - 0.2, offset: i / 30, spin: 2 + (i % 5) };
    bit.scale.setScalar(1.4);
    bit.visible = false;
    scene.add(bit);
    return bit;
  });
  const bucketAt = new THREE.Vector3();

  const desk = deskWithLaptop(glowTexture);
  desk.visible = false;
  scene.add(desk);

  let holding = null; // what is in his hands right now; it stays until it has shrunk away
  let current = ""; // the gesture he is playing (the bouquet is shared by the wedding, love and congratulations)

  return {
    /** Choose what he holds for this mood. A mood with nothing to hold leaves the current props to shrink away. */
    setMood(mood) {
      holding = holdingFor(mood, props) ?? holding;
      current = mood;
    },

    /** `amount` runs from 0 (nothing in his hands) to 1 (fully shown). */
    update(t, amount, sip = 0) {
      Object.values(props).forEach((p) => { p.visible = false; });
      confetti.forEach((c) => { c.visible = false; });
      balloons.visible = false;
      hat.visible = false;
      weddingCrown.visible = false;
      desk.visible = false;
      popBits.forEach((b) => { b.visible = false; });
      petals.forEach((p) => { p.visible = false; });
      bursts.forEach((b) => b.sparks.forEach((s) => { s.visible = false; }));
      fountains.forEach((f) => f.sparks.forEach((s) => { s.visible = false; }));
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
      props.cocktail.userData.sparks.forEach((spark, i) => {
        const twinkle = 0.5 + 0.5 * Math.sin(t * 7 + i * 2);
        spark.position.set(Math.cos(t * 1.5 + i * 1.6) * 0.2, 0.62 + (i % 2) * 0.1, Math.sin(t * 1.5 + i * 1.6) * 0.1);
        spark.scale.setScalar(0.06 + 0.16 * twinkle);
        spark.material.opacity = twinkle;
      });

      if (props.cake.visible) {
        props.cake.userData.flames.forEach((flame, i) => flame.scale.setScalar(0.2 + Math.sin(t * 17 + i * 2) * 0.025 + Math.sin(t * 29 + i) * 0.015));
      }

      if (props.popcorn.visible) { // popcorn pops out of the bucket and scatters around him
        props.popcorn.getWorldPosition(bucketAt);
        popBits.forEach((bit) => {
          const { vx, vy, vz, offset, spin } = bit.userData;
          const p = (t * 0.55 + offset) % 1, s = p * 1.2; // s = seconds in the air
          bit.visible = true;
          bit.position.set(bucketAt.x + vx * s * 0.6, bucketAt.y + 0.6 + vy * s - 3.2 * s * s, bucketAt.z + vz * s);
          bit.rotation.set(t * spin, t * spin * 0.7, 0);
          bit.scale.setScalar(1.4 * amount * (p > 0.9 ? (1 - p) * 10 : 1));
        });
      }

      if (props.brokenheart.visible) { // the two halves drift a little apart and back
        const [left, right] = props.brokenheart.userData.halves;
        const gap = 0.09 + Math.sin(t * 1.6) * 0.02;
        left.position.x = -gap;
        right.position.x = gap;
        left.rotation.z = 0.12;
        right.rotation.z = -0.12;
      }

      if (holding === WORKING) { // the desk with the laptop pops up in front of him
        desk.visible = true;
        desk.scale.setScalar(Math.max(0.01, amount));
        desk.userData.display.material.map = desk.userData.screens[Math.floor(t * 2) % 2]; // the text cursor blinks
      }

      if (props.cocktail.visible) { // patakhe: fireworks burst up in the sky and fountains of sparks fizz on the floor
        bursts.forEach((b) => b.sparks.forEach((s, i) => {
          const phase = (t * 0.5 + b.delay) % 1, a = (i / 16) * PI * 2, radius = phase * 0.95;
          s.visible = true;
          s.position.set(b.x + Math.cos(a) * radius, b.y + Math.sin(a) * radius - phase * phase * 0.3, 0.2);
          s.scale.setScalar(0.05 + 0.16 * (1 - phase));
          s.material.opacity = amount * (1 - phase);
        }));
        fountains.forEach((f) => f.sparks.forEach((s, k) => {
          const p = (t * 1.3 + k / 12) % 1;
          s.visible = true;
          s.position.set(f.x + (k % 5 - 2) * 0.1 * p, 0.12 + 2 * p * (1 - p) * 1.1, 0.35);
          s.scale.setScalar(0.04 + 0.1 * (1 - p));
          s.material.opacity = amount * (1 - p);
        }));
      }

      if (props.bouquet.visible) { // a crown for the wedding, and rose petals drifting down for the wedding and congratulations
        weddingCrown.visible = current === "wedding";
        weddingCrown.scale.setScalar(1.2 * amount);
        petals.forEach((p) => {
          const { x, z, offset } = p.userData;
          const fall = (t * 0.3 + offset) % 1;
          p.visible = true;
          p.position.set(x + Math.sin(t * 1.6 + offset * 9) * 0.2, 4.3 - fall * 4.2, z);
          p.rotation.set(t * 2 + offset * 6, t * 1.5 + offset * 3, 0);
          p.material.opacity = amount * Math.sin(Math.PI * fall);
        });
      }

      if (props.cake.visible) { // the rest of the birthday: balloons, hat and confetti
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
