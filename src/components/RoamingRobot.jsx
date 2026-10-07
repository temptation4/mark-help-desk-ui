import React, { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import MoodAvatar from "./MoodAvatar";
import { useMediaQuery } from "../lib/useMediaQuery";

/**
 * Mark the robot, wandering around on top of the page.
 *
 * He turns up from a random edge of the screen (left, right, top or bottom), waves hello, stands at a
 * random spot for a while, then leaves through another random edge. He floats above the page without
 * taking any space, and clicks pass straight through him to whatever is underneath.
 *
 *   away -> entering -> here -> leaving -> away ...
 *
 * How he interacts while he is standing there:
 *   - his eyes and head follow the mouse pointer
 *   - the pointer over him makes him giggle, and he will not leave while it is there
 *   - clicking him makes him do something random: jump, wave, spin, dance or get startled
 *   - you can pick him up and drag him anywhere; he dangles while you hold him and stays where you drop him. While you
 *     drag, a round "bin" shows in the bottom-right corner of the screen: let go of him inside it and he walks off and stays away
 *     ("dismissed") until the chat calls him back: a new chat, a new login, or the user saying "come robo" / "robo where are you"
 *   - he reacts to the chat: running while a reply is fetched, a hand to his ear while you type, and
 *     his mouth moves while a reply is read aloud
 *
 * Props
 *   baseMood: how he feels while he is just standing there ("happy", "sad", "thinking", "listening", "neutral")
 *   wakeKey:  change this number to call him back (the chat does it when the user types or sends)
 *   stayFor:  how long he stays, in ms, after arriving or after the last user activity (default 6 s)
 *   hold:     true keeps him on screen (e.g. while a reply is being fetched); the countdown starts when it turns false
 *   speaking: true while a reply is read aloud: his mouth moves
 *   dismissed: true after the user dragged him away. He stays off screen and ignores typing, replies and reactions.
 *             When it turns false again he comes back in and waves
 *   onDismiss: called when the user lets go of him after a drag (the chat sets dismissed to true)
 *   reaction: { id, name, leave } - play the gesture `name` (even while he is busy); a new id plays it
 *             again; with leave: true he walks off afterwards
 */

const TRAVEL_MS = 1500; // how long a run onto or off the screen takes
const EDGES = ["left", "right", "top", "bottom"];
const DRAG_THRESHOLD = 5; // px the pointer must move before a press counts as a drag instead of a click

// How long each gesture lasts, in ms. The ones a click can start are listed separately.
const GESTURE_MS = {
  happy: 2400, wave: 2600, spin: 1700, dance: 9800, surprised: 1500, thanks: 3600, namaste: 3600, sad: 3200, nod: 1700,
  delighted: 3000, // used when reacting to what the user says
  hurt: 3200, angry: 3000, excited: 2600, cheering: 2800, clapping: 3000, love: 3600, sleepy: 3600, confused: 3000,
  scared: 2600, crying: 3400, birthday: 5600, shopping: 4400, explain: 3400, shrug: 2200,
  thumbs_up: 2400, point: 2200, shake_head: 2000, stretch: 3000, peek: 2800, hide: 2800, magic: 3400, sit: 3000,
  bow: 3200, proud: 2800, curious: 2800,
  party: 6400, wedding: 6400, congrats: 5200, popcorn: 5600, heartbreak: 5000, working: 7500, meeting: 5200, // the new party, wedding and office looks need a while to show
  pizza: 4600, burger: 4600, icecream: 4600, donut: 4600, coffee: 4600, fries: 4600, noodles: 4600, tteokbokki: 4600, veggies: 4600, fruits: 4600, momos: 4600, sweets: 4600, chocolate: 4600, chips: 4600, tea: 4600,
};
const CLICK_GESTURES = ["happy", "wave", "spin", "dance", "surprised"];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Picks where he will stand (near the sides, above the message box, so he mostly avoids hiding the chat).
 * Always inside the window as it is right now.
 */
function pickRestingSpot(size) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const robotHeight = size * 1.2 + 20;
  const jitter = () => Math.random() * 40;

  const left = 12 + jitter();
  const right = width - size - 12 - jitter();
  const low = height - robotHeight - 90; // above the message box
  const middle = (height - robotHeight) / 2;
  const high = 70 + jitter();

  const spot = pick([
    { x: left, y: low }, { x: left, y: middle }, { x: left, y: high },
    { x: right, y: low }, { x: right, y: middle }, { x: right, y: high },
  ]);
  return keepOnScreen(spot, size);
}

/** Moves a position (his top-left corner) so that he is fully inside the window. */
function keepOnScreen(spot, size) {
  const robotHeight = size * 1.2 + 20;
  return {
    x: clamp(spot.x, 4, Math.max(4, window.innerWidth - size - 4)),
    y: clamp(spot.y, 4, Math.max(4, window.innerHeight - robotHeight - 4)),
  };
}

/** The bin in the bottom-right corner: a circle around the corner, as wide as most of his body. */
function bin(size) {
  return { x: window.innerWidth, y: window.innerHeight, radius: Math.round(size * 1.05) };
}

/** How close his middle is to the bin: 0 when he is far away, 1 when he is in it (his middle is less than a radius from the corner). */
function nearBin(spot, size) {
  const { x, y, radius } = bin(size);
  const distance = Math.hypot(spot.x + size / 2 - x, spot.y + (size * 1.2 + 20) / 2 - y);
  return Math.max(0, Math.min(1, 2 - distance / radius));
}

/** The edge of the window closest to a position (his top-left corner), where he leaves after being dragged away. */
function nearestEdge(spot, size) {
  const distances = {
    left: spot.x,
    right: window.innerWidth - size - spot.x,
    top: spot.y,
    bottom: window.innerHeight - (size * 1.2 + 20) - spot.y,
  };
  return Object.keys(distances).reduce((best, edge) => (distances[edge] < distances[best] ? edge : best));
}

/** One visit: the edge he comes in from, where he stands, and the edge he leaves by. */
function makePlan(size) {
  return { rest: pickRestingSpot(size), entry: pick(EDGES), exit: pick(EDGES) };
}

/** Just beyond the given edge of the screen, level with (or above/below) the resting spot. */
function offScreen(edge, rest, size) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  switch (edge) {
    case "left": return { x: -size - 80, y: rest.y };
    case "right": return { x: width + 80, y: rest.y };
    case "top": return { x: rest.x, y: -size * 1.2 - 100 };
    default: return { x: rest.x, y: height + 100 };
  }
}

function RoamingRobot({
  baseMood = "neutral", wakeKey = 0, stayFor = 6000, hold = false, speaking = false, reaction = null,
  dismissed = false, onDismiss,
}) {
  const large = useMediaQuery("(min-width: 1024px)");
  const size = large ? 230 : 150;

  const [presence, setPresence] = useState("away");
  const [plan, setPlan] = useState(() => makePlan(size));
  const [gesture, setGesture] = useState(null); // { name, force } while a gesture is playing
  const [hovered, setHovered] = useState(false); // the pointer is over him
  const [dragPosition, setDragPosition] = useState(null); // where he is while being carried, else null
  const boxRef = useRef(null);
  const lastWake = useRef(wakeKey);
  const lastGesture = useRef(null);
  const grab = useRef(null); // { offsetX, offsetY, startX, startY, moved } while the pointer is down on him
  const justDragged = useRef(false); // so the click that ends a drag is not treated as a poke
  const lastDrag = useRef(null); // where he was last carried to, for the drop

  // Latest values for the timers and window listeners below, which must not be rebuilt every time they change.
  const dismissedNow = useRef(dismissed);
  const onDismissNow = useRef(onDismiss);
  useEffect(() => {
    dismissedNow.current = dismissed;
    onDismissNow.current = onDismiss;
  });

  /** Plays a gesture. `force` lets it override "running to get your answer". */
  function play(name, force = false) {
    lastGesture.current = name;
    setGesture({ name, force });
  }

  /** Re-picks his standing spot for the window as it is now, just before he arrives. */
  function refreshRestingSpot() {
    setPlan((current) => ({ ...current, rest: pickRestingSpot(size) }));
  }

  // The first visit starts by itself shortly after the page opens.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dismissedNow.current) return;
      refreshRestingSpot();
      setPresence((p) => (p === "away" ? "entering" : p));
    }, 350);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A new wakeKey calls him back if he has gone (or is on his way out).
  useEffect(() => {
    if (wakeKey === lastWake.current) return;
    lastWake.current = wakeKey;
    const timer = setTimeout(() => {
      if (dismissedNow.current) return; // he was sent away: typing and replies do not bring him back
      setPresence((p) => {
        if (p === "away") refreshRestingSpot();
        return p === "away" || p === "leaving" ? "entering" : p;
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [wakeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Called back (new chat, or the user said "come robo"): he runs in and waves hello.
  const wasDismissed = useRef(dismissed);
  useEffect(() => {
    const cameBack = wasDismissed.current && !dismissed;
    wasDismissed.current = dismissed;
    if (!cameBack) return;
    const timer = setTimeout(() => {
      setPlan((current) => ({ ...current, rest: pickRestingSpot(size), entry: pick(EDGES) }));
      setPresence((p) => (p === "away" || p === "leaving" ? "entering" : p));
    }, 0);
    return () => clearTimeout(timer);
  }, [dismissed]); // eslint-disable-line react-hooks/exhaustive-deps

  // The chat can ask for a gesture, e.g. a wave back when the user says hello. If he is standing there
  // it plays at once; if he has wandered off (or is still running in) it is kept and played when he
  // arrives, instead of the usual "hello" wave. With `leave` he walks off when the gesture is done
  // (a goodbye).
  const presenceNow = useRef(presence);
  useEffect(() => {
    presenceNow.current = presence;
  });
  const pendingReaction = useRef(null);
  const leaveTimer = useRef(null);

  function performReaction(r) {
    play(r.name, true);
    clearTimeout(leaveTimer.current);
    if (r.leave) {
      leaveTimer.current = setTimeout(
        () => setPresence((p) => (p === "here" ? "leaving" : p)),
        (GESTURE_MS[r.name] ?? 2400) + 400,
      );
    }
  }

  const reactionId = reaction?.id;
  useEffect(() => {
    if (reactionId === undefined) return;
    const timer = setTimeout(() => {
      if (dismissedNow.current) return; // he is away on purpose: no reactions
      if (presenceNow.current === "here") performReaction(reaction);
      else pendingReaction.current = reaction;
    }, 0);
    return () => clearTimeout(timer);
  }, [reactionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  // Each state lasts a while and then moves on. wakeKey and the gesture are dependencies, so any
  // activity restarts the "stay" timer.
  const dragging = dragPosition !== null;
  useEffect(() => {
    if (presence === "away") return;
    // He stays while a reply is being fetched, the pointer is on him, or he is being carried; the
    // countdown starts after.
    if (presence === "here" && (hold || hovered || dragging)) return;
    const STEP = { entering: TRAVEL_MS, here: stayFor, leaving: TRAVEL_MS };
    const timer = setTimeout(() => {
      if (presence === "entering") {
        setPresence("here");
        // He arrives: a waiting reaction goes first (e.g. his answer to "thanks"), otherwise "hello!"
        const waiting = pendingReaction.current;
        pendingReaction.current = null;
        if (waiting) performReaction(waiting);
        else play("wave");
      } else if (presence === "here") {
        setPresence("leaving");
      } else {
        setPlan(makePlan(size)); // plan the next visit while he is off screen
        setPresence("away");
      }
    }, STEP[presence]);
    return () => clearTimeout(timer);
  }, [presence, wakeKey, stayFor, size, hold, hovered, dragging, gesture]);

  // A gesture ends by itself.
  useEffect(() => {
    if (!gesture) return;
    const timer = setTimeout(() => setGesture(null), GESTURE_MS[gesture.name] ?? 2400);
    return () => clearTimeout(timer);
  }, [gesture]);

  // He floats above the page and lets pointer events through, so hovering, clicking and dragging are
  // worked out here by checking whether the pointer is inside his body. Presses on buttons, links and
  // inputs are always left alone, so he never gets in their way.
  useEffect(() => {
    const interactive = "button, a, input, textarea, select, [role='button']";
    const isOnHim = (event) => {
      if (presence !== "here" || !boxRef.current) return false;
      const box = boxRef.current.getBoundingClientRect();
      return event.clientX > box.left + box.width * 0.15 && event.clientX < box.right - box.width * 0.15
        && event.clientY > box.top && event.clientY < box.bottom;
    };

    const onDown = (event) => {
      if (event.button !== 0 || event.target.closest?.(interactive) || !isOnHim(event)) return;
      const box = boxRef.current.getBoundingClientRect();
      grab.current = {
        offsetX: event.clientX - box.left, offsetY: event.clientY - box.top,
        startX: event.clientX, startY: event.clientY, moved: false,
      };
      event.preventDefault(); // do not start selecting the text underneath
    };

    const onMove = (event) => {
      if (grab.current) {
        const g = grab.current;
        if (!g.moved && Math.hypot(event.clientX - g.startX, event.clientY - g.startY) > DRAG_THRESHOLD) {
          g.moved = true;
        }
        if (g.moved) {
          lastDrag.current = keepOnScreen({ x: event.clientX - g.offsetX, y: event.clientY - g.offsetY }, size);
          setDragPosition(lastDrag.current);
        }
        return;
      }
      const onHim = isOnHim(event);
      setHovered((previous) => (previous === onHim ? previous : onHim));
    };

    const onUp = () => {
      const g = grab.current;
      grab.current = null;
      if (!g?.moved) return;
      justDragged.current = true;
      const spot = lastDrag.current;
      lastDrag.current = null;
      setDragPosition(null);

      if (spot && nearBin(spot, size) >= 1) {
        // Dropped in the bin: he walks off through the nearest edge and stays away until he is called back.
        setPlan((current) => ({ ...current, rest: spot, exit: nearestEdge(spot, size) }));
        pendingReaction.current = null;
        clearTimeout(leaveTimer.current);
        setGesture(null);
        setPresence("leaving");
        onDismissNow.current?.();
      } else {
        // Dropped anywhere else: he stays where he was put.
        if (spot) setPlan((current) => ({ ...current, rest: spot }));
        play("happy"); // that was fun
      }
    };

    const onClick = (event) => {
      if (justDragged.current) { // the click that ends a drag is not a poke
        justDragged.current = false;
        return;
      }
      if (event.target.closest?.(interactive) || !isOnHim(event)) return;
      // something random, but never the same thing twice in a row
      play(pick(CLICK_GESTURES.filter((name) => name !== lastGesture.current)));
    };

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("click", onClick);
    };
  }, [presence, size]);

  // The mouse cursor shows he can be picked up: an open hand over him, a closed one while carrying him.
  useEffect(() => {
    document.body.style.cursor = dragging ? "grabbing" : hovered ? "grab" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered, dragging]);

  // ---- where he is, which way he faces, and how he moves ----
  const moving = presence === "entering" || presence === "leaving";
  const edge = presence === "entering" ? plan.entry : plan.exit;

  let position = plan.rest;
  if (presence === "away") position = offScreen(plan.entry, plan.rest, size);
  if (presence === "leaving") position = offScreen(plan.exit, plan.rest, size);
  if (dragging) position = dragPosition;

  // Along the sides he runs (sideways view). From the top or bottom he flies/jumps with his arms up.
  const sideways = edge === "left" || edge === "right";
  let travel = 0;
  if (moving && sideways) {
    const movingRight = (presence === "entering") === (edge === "left"); // in from the left, or out to the right
    travel = movingRight ? 1 : -1;
  }

  // What he is doing, in order of priority: travelling; being carried; a gesture (which never hides
  // "running to get your answer" unless it was asked for by the chat); the pointer tickling him;
  // otherwise his base mood.
  let mood = baseMood;
  if (moving) {
    mood = sideways ? "thinking" : "happy";
  } else if (dragging) {
    mood = "grabbed";
  } else if (gesture && (gesture.force || baseMood !== "thinking")) {
    mood = gesture.name;
  } else if (hovered && (baseMood === "neutral" || baseMood === "happy")) {
    mood = "delighted";
  }

  // While the user types or talks he looks towards the message box at the bottom of the screen.
  const lookAt = baseMood === "listening" && !hovered
    ? { x: window.innerWidth * 0.55, y: window.innerHeight - 40 }
    : null;

  // The bin, shown only while he is being carried. It grows and turns red as he comes close, and he shrinks into it.
  const close = dragging ? nearBin(dragPosition, size) : 0;
  const inBin = close >= 1;
  const { radius } = bin(size);

  return (
    <>
      {dragging && (
        <div
          className={`pointer-events-none fixed bottom-0 right-0 z-20 flex items-end justify-end rounded-tl-full border-l-2 border-t-2 pb-5 pr-5 transition-all duration-150 ${
            inBin ? "border-red-500 bg-red-500/30 text-red-600" : "border-dashed border-slate-400/70 bg-slate-500/10 text-slate-500"
          }`}
          style={{ width: radius, height: radius, transform: `scale(${1 + close * 0.2})`, transformOrigin: "bottom right" }}
          aria-hidden="true"
        >
          <div className="flex w-28 flex-col items-center gap-1 text-center text-xs font-medium leading-tight">
            <Trash2 className={`h-8 w-8 ${inBin ? "animate-bounce" : ""}`} />
            {inBin ? "Let go" : "Drop here to send Mark away"}
          </div>
        </div>
      )}
    <div
      ref={boxRef}
      className="pointer-events-none fixed left-0 top-0 z-30 flex flex-col items-center"
      style={{
        width: size,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        // no easing while he is being carried (he sticks to the pointer), and when he is "away" he is
        // repositioned instantly, off screen, ready for the next visit
        transition: dragging || presence === "away" ? "none" : `transform ${TRAVEL_MS}ms cubic-bezier(0.3, 0.1, 0.2, 1)`,
        visibility: presence === "away" ? "hidden" : "visible",
        // he shrinks as he is pulled into the bin
        scale: dragging ? String(1 - close * 0.45) : "1",
      }}
    >
      <MoodAvatar mood={mood} size={size} full travel={travel} speaking={speaking} lookAt={lookAt} />
    </div>
    </>
  );
}

export default RoamingRobot;
