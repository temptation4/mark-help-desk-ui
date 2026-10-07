import React, { useEffect, useRef, useState } from "react";
import { createRobot, webglAvailable } from "../lib/robot3d";

// What each mood looks like, for screen readers.
const LABEL = {
  // Basic
  neutral: "is waiting for you",
  happy: "is laughing and jumping",
  sad: "looks concerned",
  thinking: "is thinking",
  listening: "is listening closely",

  // Greetings
  wave: "is waving hello",
  bow: "is bowing politely",
  namaste: "is greeting you with a namaste",
  nod: "is nodding",

  // Emotions
  angry: "looks angry",
  excited: "is super excited",
  surprised: "looks surprised",
  scared: "looks scared",
  confused: "looks confused",
  proud: "looks proud",
  curious: "looks curious",
  sleepy: "looks sleepy",
  hurt: "looks hurt",
  crying: "is crying",

  // Fun
  spin: "is spinning around",
  dance: "is dancing",
  running: "is running",
  walking: "is walking",
  clapping: "is clapping",
  cheering: "is cheering",
  delighted: "is giggling",
  birthday: "is celebrating a birthday: a cake with lit candles, a present, balloons and a party hat",
  party: "is at a party, toasting with a sparkling drink under balloons",
  shopping: "is shopping with bags in both hands",

  // Food
  pizza: "is eating pizza",
  burger: "is eating a burger",
  icecream: "is eating ice cream",
  donut: "is eating a donut",
  coffee: "is sipping hot coffee from a small cup",
  tea: "is sipping hot tea from a teacup",
  fries: "is eating fries",
  popcorn: "is eating popcorn from a striped bucket on movie night",
  noodles: "is slurping hot Korean ramyeon",
  tteokbokki: "is eating spicy tteokbokki",
  veggies: "is munching fresh vegetables",
  fruits: "is eating fruit",
  momos: "is eating steaming momos",
  sweets: "is enjoying sweets and a lollipop",
  chocolate: "is eating chocolate",
  chips: "is munching crisps",

  // Communication
  explain: "is explaining",
  point: "is pointing",
  shake_head: "is shaking their head",
  thumbs_up: "is giving a thumbs up",
  shrug: "is shrugging",

  // Actions
  grabbed: "is being carried",
  sit: "is sitting",
  stretch: "is stretching",
  peek: "is peeking",
  hide: "is hiding",

  // Special
  thanks: "is bowing to say thank you",
  love: "is sending love",
  magic: "is doing magic",
};

/**
 * Mark, the 3D help desk robot (see lib/robot3d.js for the model and its animations).
 *
 * Props
 *   mood:     "neutral" | "happy" | "sad" (concerned) | "thinking" (running) | "listening",
 *             or any gesture named in LABEL below ("wave", "dance", "birthday", "pizza", "thanks", ...)
 *   size:     rendered width in px
 *   full:     true shows the whole robot; false shows head and shoulders
 *   travel:   -1 runs sideways towards the left, 1 towards the right, 0 faces the viewer. Used for
 *             running onto and off the screen together with mood="thinking".
 *   speaking: true makes his mouth move, as if he were saying the reply out loud
 *   lookAt:   {x, y} screen position to look at; by default he follows the mouse pointer
 *   animate:  false renders one still frame
 *
 * The 3D scene is created once and then driven through its controller, so changing the mood never
 * rebuilds the model. If the browser has no WebGL (or it fails), a plain emoji is shown instead, so a
 * graphics problem can never break the page.
 */
function MoodAvatar({
  mood = "neutral", size = 40, animate = true, full = false, travel = 0, speaking = false, lookAt = null,
}) {
  const containerRef = useRef(null);
  const robotRef = useRef(null);
  const [failed, setFailed] = useState(!webglAvailable());

  const width = size;
  const height = full ? Math.round(size * 1.2) : size;

  // The newest props, for the effect below that must not re-run when they change.
  const latest = useRef({});
  useEffect(() => {
    latest.current = { mood, travel, animate, width, height, speaking };
  });

  useEffect(() => {
    if (failed) return;
    const { mood, travel, animate, width, height, speaking } = latest.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let robot;
    try {
      robot = createRobot(containerRef.current, { full, mood, travel, animated: animate && !reducedMotion });
    } catch (error) {
      console.warn("3D robot unavailable, showing a plain icon instead:", error);
      setFailed(true);
      return;
    }
    robot.setSize(width, height);
    robot.setSpeaking(speaking);
    robotRef.current = robot;

    return () => {
      robot.dispose();
      robotRef.current = null;
    };
  }, [full, failed]);

  useEffect(() => robotRef.current?.setMood(mood), [mood]);
  useEffect(() => robotRef.current?.setTravel(travel), [travel]);
  useEffect(() => robotRef.current?.setSpeaking(speaking), [speaking]);
  useEffect(() => robotRef.current?.setSize(width, height), [width, height]);

  // The big robot's head and eyes follow a point on the screen: the mouse pointer, or `lookAt`.
  useEffect(() => {
    if (!full || failed) return;

    const lookTowards = (screenX, screenY) => {
      const container = containerRef.current;
      if (!container) return;
      const box = container.getBoundingClientRect();
      const x = (screenX - (box.left + box.width / 2)) / 450;
      const y = (screenY - (box.top + box.height * 0.3)) / 350;
      robotRef.current?.setLook(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
    };

    if (lookAt) {
      lookTowards(lookAt.x, lookAt.y);
      return;
    }
    const onMove = (event) => lookTowards(event.clientX, event.clientY);
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [full, failed, lookAt?.x, lookAt?.y]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) {
    return (
      <span role="img" aria-label={`Mark ${LABEL[mood] ?? "is here"}`} style={{ fontSize: size * 0.8, lineHeight: 1 }}>
        🤖
      </span>
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Mark ${LABEL[mood] ?? "is here"}`}
      style={{ width, height }}
      className="shrink-0"
    />
  );
}

export default MoodAvatar;
