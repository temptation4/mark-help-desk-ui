import React, { useEffect, useState } from "react";

/**
 * A full-page painted scene behind the whole UI, shown while Mark plays the "mountain" or "beach" gesture.
 * It is drawn as SVG (so it is sharp at any size) with slow ambient motion: drifting clouds, birds, waves. It fades in and out.
 *
 *   <SceneBackdrop kind="mountain" />   // or "beach"; null/undefined hides it
 */

const CSS = `
@keyframes sb-drift  { from { transform: translateX(-12%); } to { transform: translateX(12%); } }
@keyframes sb-drift2 { from { transform: translateX(10%); } to { transform: translateX(-14%); } }
@keyframes sb-wave   { from { transform: translateX(0); } to { transform: translateX(-200px); } }
@keyframes sb-foam   { 0%, 100% { transform: translateY(0); opacity: .95; } 50% { transform: translateY(-16px); opacity: .6; } }
@keyframes sb-fly    { from { transform: translateX(-10%) translateY(0); } 50% { transform: translateX(40%) translateY(-18px); } to { transform: translateX(95%) translateY(6px); } }
@keyframes sb-glint  { 0%, 100% { opacity: .35; } 50% { opacity: .9; } }
@keyframes sb-sway   { 0%, 100% { transform: rotate(-1.5deg); } 50% { transform: rotate(1.5deg); } }
@keyframes sb-bob    { 0%, 100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(5px) rotate(1deg); } }
@keyframes sb-burst { 0% { transform: scale(0.05); opacity: 0; } 8% { opacity: 1; } 55% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.12); opacity: 0; } }
@keyframes sb-fall { from { transform: translate3d(0, -40px, 0); } to { transform: translate3d(40px, 960px, 0); } }
@keyframes sb-confetti { from { transform: translate3d(0, -40px, 0) rotate(0deg); } to { transform: translate3d(70px, 960px, 0) rotate(720deg); } }
@keyframes sb-flicker { 0%, 100% { transform: scale(1, 1); } 30% { transform: scale(0.88, 1.12); } 60% { transform: scale(1.08, 0.94); } }
@keyframes sb-puff { 0%, 100% { transform: scale(0.9); opacity: 0.7; } 50% { transform: scale(1.12); opacity: 1; } }
@keyframes sb-rise { from { transform: translateY(0); opacity: 0; } 15% { opacity: 0.95; } to { transform: translateY(-460px); opacity: 0; } }
@keyframes sb-dash { to { stroke-dashoffset: -76; } }
.sb-drift  { animation: sb-drift 40s ease-in-out infinite alternate; }
.sb-drift2 { animation: sb-drift2 55s ease-in-out infinite alternate; }
.sb-wave   { animation: sb-wave 7s linear infinite; }
.sb-wave2  { animation: sb-wave 11s linear infinite reverse; }
.sb-foam   { animation: sb-foam 5s ease-in-out infinite; }
.sb-fly    { animation: sb-fly 26s linear infinite; }
.sb-glint  { animation: sb-glint 3s ease-in-out infinite; }
.sb-sway   { animation: sb-sway 6s ease-in-out infinite; transform-origin: 50% 100%; transform-box: fill-box; }
.sb-bob    { animation: sb-bob 6s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
.sb-burst  { animation: sb-burst 4.5s ease-out infinite backwards; transform-box: fill-box; transform-origin: center; }
.sb-fall   { animation: sb-fall linear infinite; }
.sb-confetti { animation: sb-confetti linear infinite; transform-box: fill-box; transform-origin: center; }
.sb-flicker { animation: sb-flicker 1.4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
.sb-puff   { animation: sb-puff 6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.sb-rise   { animation: sb-rise 9s ease-in infinite; }
.sb-dash   { animation: sb-dash 2.2s linear infinite; }
.sb-fly-slow { animation: sb-fly 40s linear infinite; }
@media (prefers-reduced-motion: reduce) { .sb-drift, .sb-drift2, .sb-wave, .sb-wave2, .sb-foam, .sb-fly, .sb-glint, .sb-sway, .sb-bob, .sb-burst, .sb-fall, .sb-confetti, .sb-flicker, .sb-puff, .sb-rise, .sb-dash, .sb-fly-slow { animation: none; } }
`;

const pts = (list) => list.map(([x, y]) => `${x},${y}`).join(" ");

/** A snowy peak: the mountain, its shaded right side, and a jagged snow cap. */
function Peak({ cx, top, hw, base, rock, shade, snow = "#ffffff", cap }) {
  const capH = cap ?? (base - top) * 0.28;
  const dx = hw * (capH / (base - top));
  return (
    <g>
      <polygon points={pts([[cx - hw, base], [cx, top], [cx + hw, base]])} fill={rock} />
      <polygon points={pts([[cx, top], [cx + hw, base], [cx + hw * 0.1, base]])} fill={shade} />
      <polygon
        points={pts([[cx - dx, top + capH], [cx - dx * 0.5, top + capH * 0.62], [cx - dx * 0.12, top + capH * 1.12], [cx + dx * 0.25, top + capH * 0.7], [cx + dx * 0.62, top + capH * 1.05], [cx + dx, top + capH], [cx, top]])}
        fill={snow}
      />
      <polygon points={pts([[cx, top], [cx + dx, top + capH], [cx + dx * 0.62, top + capH * 1.05], [cx + dx * 0.25, top + capH * 0.7]])} fill="#cfdcf7" opacity="0.8" />
    </g>
  );
}

function Pines({ y, from, to, step, size, color, jitter = 0 }) {
  const trees = [];
  for (let x = from, i = 0; x < to; x += step, i++) {
    const s = size * (0.8 + ((i * 37) % 10) / 25);
    const ty = y + ((i * 53) % 10) * jitter;
    trees.push(
      <g key={x} transform={`translate(${x} ${ty})`}>
        <polygon points={pts([[-s * 0.5, 0], [0, -s * 1.3], [s * 0.5, 0]])} fill={color} />
        <polygon points={pts([[-s * 0.42, -s * 0.55], [0, -s * 1.7], [s * 0.42, -s * 0.55]])} fill={color} />
        <polygon points={pts([[-s * 0.3, -s * 1.1], [0, -s * 2.1], [s * 0.3, -s * 1.1]])} fill={color} />
      </g>,
    );
  }
  return <g>{trees}</g>;
}

function Cloud({ x, y, s = 1, opacity = 0.9 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity} fill="#ffffff">
      <ellipse cx="0" cy="0" rx="90" ry="26" />
      <ellipse cx="-45" cy="-16" rx="48" ry="30" />
      <ellipse cx="25" cy="-26" rx="58" ry="36" />
      <ellipse cx="75" cy="-6" rx="42" ry="24" />
    </g>
  );
}

function Birds({ y, count = 3 }) {
  return (
    <g className="sb-fly" fill="none" stroke="#33415c" strokeWidth="2.4" strokeLinecap="round" opacity="0.75">
      {Array.from({ length: count }, (_, i) => (
        <path key={i} d={`M${i * 46} ${y + (i % 2) * 22} q10 -12 20 0 q10 -12 20 0`} />
      ))}
    </g>
  );
}

function Mountains() {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="mt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fb4f2" />
          <stop offset="0.45" stopColor="#c7c4f5" />
          <stop offset="0.78" stopColor="#ffd9c7" />
          <stop offset="1" stopColor="#fff0d6" />
        </linearGradient>
        <radialGradient id="mt-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffbe6" stopOpacity="1" />
          <stop offset="0.25" stopColor="#ffe9a8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mt-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id="mt-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fc6e8" />
          <stop offset="1" stopColor="#4f8fc0" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#mt-sky)" />
      <circle cx="1180" cy="330" r="260" fill="url(#mt-sun)" />
      <circle cx="1180" cy="330" r="46" fill="#fffdf2" />
      <g className="sb-drift"><Cloud x="260" y="190" s={1.2} opacity={0.85} /><Cloud x="820" y="120" s={0.8} opacity={0.7} /></g>
      <g className="sb-drift2"><Cloud x="1250" y="230" s={1} opacity={0.8} /><Cloud x="560" y="300" s={0.7} opacity={0.6} /></g>
      <Birds y={250} />
      {/* far ridge */}
      <path d="M0 560 L120 500 L240 545 L380 460 L520 540 L660 480 L800 550 L960 470 L1100 540 L1260 480 L1420 545 L1600 500 L1600 900 L0 900Z" fill="#c9cdf0" />
      {/* the big peaks */}
      <Peak cx={330} top={300} hw={330} base={720} rock="#8d95cf" shade="#7079b8" />
      <Peak cx={820} top={215} hw={410} base={720} rock="#7f89c8" shade="#6069ad" cap={130} />
      <Peak cx={1290} top={330} hw={320} base={720} rock="#939bd2" shade="#7580bd" />
      <rect x="0" y="560" width="1600" height="200" fill="url(#mt-mist)" />
      {/* nearer ridges */}
      <path d="M0 690 L180 610 L360 680 L540 620 L720 690 L900 630 L1100 695 L1300 625 L1480 690 L1600 650 L1600 900 L0 900Z" fill="#5f79b0" />
      <Pines y={700} from={30} to={1600} step={90} size={36} color="#456a8f" jitter={2} />
      <rect x="0" y="650" width="1600" height="140" fill="url(#mt-mist)" opacity="0.7" />
      {/* a little lake with the peaks in it */}
      <path d="M0 770 Q400 745 800 765 T1600 760 L1600 900 L0 900Z" fill="url(#mt-lake)" />
      <g opacity="0.25" fill="#ffffff" className="sb-glint">
        <rect x="260" y="800" width="180" height="4" rx="2" /><rect x="700" y="830" width="260" height="4" rx="2" /><rect x="1130" y="805" width="200" height="4" rx="2" />
      </g>
      {/* foreground */}
      <path d="M0 860 Q300 800 620 850 T1180 840 T1600 830 L1600 900 L0 900Z" fill="#2d4a5e" />
      <Pines y={880} from={-20} to={420} step={64} size={78} color="#1d3a45" jitter={3} />
      <Pines y={885} from={1180} to={1650} step={70} size={86} color="#1d3a45" jitter={3} />
    </svg>
  );
}

function Palm({ x, y, lean = 1, scale = 1 }) {
  const fronds = [-150, -112, -74, -34, 6, 46, 86, 126, 166];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * lean} ${scale})`}>
      <path d="M0 0 C 20 -150 60 -300 110 -430" fill="none" stroke="#7a4a22" strokeWidth="26" strokeLinecap="round" />
      <path d="M0 0 C 20 -150 60 -300 110 -430" fill="none" stroke="#a06a35" strokeWidth="10" strokeLinecap="round" strokeDasharray="14 22" />
      <g transform="translate(110 -430)">
        <g className="sb-sway">
        {fronds.map((a, i) => (
          <path key={a} transform={`rotate(${a})`} d="M0 0 Q 80 -70 210 -10 Q 110 -28 0 0Z" fill={i % 2 ? "#2f9e5a" : "#3fb56b"} />
        ))}
        <circle cx="-14" cy="14" r="13" fill="#6b3f1d" /><circle cx="12" cy="18" r="12" fill="#7a4a22" />
        </g>
      </g>
    </g>
  );
}

function Beach() {
  const crest = (y, o = 0.9, w = 3) => (
    <path d={`M0 ${y} ${Array.from({ length: 22 }, () => "q50 -9 100 0").join(" ")}`} fill="none" stroke="#ffffff" strokeWidth={w} opacity={o} strokeLinecap="round" />
  );
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="bc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4fb8ee" />
          <stop offset="0.5" stopColor="#a8e0f7" />
          <stop offset="0.85" stopColor="#ffe9bd" />
          <stop offset="1" stopColor="#ffd9a3" />
        </linearGradient>
        <radialGradient id="bc-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffdf0" />
          <stop offset="0.22" stopColor="#ffeaa0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffd08a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bc-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#58d7da" />
          <stop offset="0.5" stopColor="#25aac6" />
          <stop offset="1" stopColor="#1580ad" />
        </linearGradient>
        <linearGradient id="bc-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8e6b4" />
          <stop offset="1" stopColor="#efca86" />
        </linearGradient>
        <linearGradient id="bc-wet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9bd86" stopOpacity="0.9" />
          <stop offset="1" stopColor="#f8e6b4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#bc-sky)" />
      <circle cx="1060" cy="470" r="330" fill="url(#bc-sun)" />
      <circle cx="1060" cy="470" r="58" fill="#fffef5" />
      <g className="sb-drift"><Cloud x="300" y="170" s={1.3} opacity={0.9} /><Cloud x="900" y="110" s={0.9} opacity={0.75} /></g>
      <g className="sb-drift2"><Cloud x="1320" y="220" s={1.1} opacity={0.85} /><Cloud x="620" y="290" s={0.6} opacity={0.6} /></g>
      <Birds y={210} count={4} />
      {/* the sea */}
      <rect x="0" y="500" width="1600" height="260" fill="url(#bc-sea)" />
      <rect x="0" y="500" width="1600" height="3" fill="#ffffff" opacity="0.6" />
      {/* the sun's reflection */}
      <g className="sb-glint" fill="#fff6c8">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} x={1060 - (60 + i * 14)} y={520 + i * 30} width={(60 + i * 14) * 2} height={5 + i} rx="3" opacity={0.85 - i * 0.08} />
        ))}
      </g>
      {/* a sailboat on the horizon */}
      <g transform="translate(360 470)">
        <g className="sb-bob">
        <polygon points={pts([[0, 0], [0, -70], [48, 0]])} fill="#ffffff" />
        <polygon points={pts([[-6, 0], [-6, -50], [-42, 0]])} fill="#ffe3c2" />
        <path d="M-52 4 L58 4 L40 20 L-34 20Z" fill="#c8553d" />
        </g>
      </g>
      {/* waves rolling in */}
      <g className="sb-wave" style={{ transform: "translateX(0)" }}>{crest(560, 0.7)}{crest(610, 0.8, 3.5)}</g>
      <g className="sb-wave2">{crest(660, 0.85, 4)}{crest(705, 0.9, 4.5)}</g>
      {/* sand, wet sand and foam at the shore */}
      <path d="M0 740 Q300 715 620 735 T1200 728 T1600 722 L1600 900 L0 900Z" fill="url(#bc-sand)" />
      <path d="M0 740 Q300 715 620 735 T1200 728 T1600 722 L1600 790 L0 790Z" fill="url(#bc-wet)" />
      <g className="sb-foam">
        <path d="M0 738 Q150 722 300 736 T620 732 T940 738 T1260 726 T1600 724" fill="none" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" opacity="0.9" />
        <path d="M0 752 Q200 740 420 750 T820 748 T1220 744 T1600 742" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      </g>
      {/* shells and a starfish */}
      <g>
        <path d="M430 850 q14 -22 28 0 q-14 8 -28 0Z" fill="#ffd1c2" />
        <path d="M1090 838 q12 -18 24 0 q-12 7 -24 0Z" fill="#ffe3d6" />
        <polygon points={pts([[760, 822], [768, 842], [790, 844], [772, 856], [778, 878], [760, 866], [742, 878], [748, 856], [730, 844], [752, 842]])} fill="#ff8d6b" />
      </g>
      {/* palms on both sides */}
      <Palm x={300} y={915} lean={1} scale={1.05} />
      <Palm x={1350} y={915} lean={-1} scale={0.95} />
      <Palm x={520} y={905} lean={1} scale={0.6} />
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Festival scenes. Positions of stars, snow, confetti and so on come from a tiny deterministic "random", so they do not jump on re-render.
// ---------------------------------------------------------------------------------------------------------------------

const rnd = (i, k = 1) => { const x = Math.sin(i * 12.9898 * k + k * 78.233) * 43758.5453; return x - Math.floor(x); };

function Stars({ count, yMax, seed = 1 }) {
  return (
    <g fill="#ffffff">
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={rnd(i, seed) * 1600} cy={rnd(i, seed + 7) * yMax} r={0.8 + rnd(i, seed + 3) * 2}
          className="sb-glint" style={{ animationDelay: `${rnd(i, seed + 5) * 4}s`, animationDuration: `${2 + rnd(i, seed + 9) * 3}s` }} />
      ))}
    </g>
  );
}

/** A firework: rays and sparks that burst out from the middle, fade, and start again after `delay`. */
function Burst({ x, y, r, color, delay = 0, dur = 4.5, rays = 18 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="sb-burst" style={{ animationDelay: `${delay}s`, animationDuration: `${dur}s` }}>
        {Array.from({ length: rays }, (_, i) => {
          const a = (i / rays) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
          return (
            <g key={i}>
              <line x1={c * r * 0.3} y1={s * r * 0.3} x2={c * r} y2={s * r} stroke={color} strokeWidth="4" strokeLinecap="round" />
              <circle cx={c * r * 1.1} cy={s * r * 1.1} r="5.5" fill={color} />
              <circle cx={c * r * 0.62} cy={s * r * 0.62} r="3" fill="#ffffff" />
            </g>
          );
        })}
        <circle r="12" fill="#ffffff" opacity="0.9" />
      </g>
    </g>
  );
}

/** Bulbs along a sagging string of lights from x0 to x1. */
function Garland({ x0 = -20, x1 = 1620, y = 40, sag = 36, spans = 4, colors, id }) {
  const bulbs = [];
  const w = (x1 - x0) / spans;
  let path = `M${x0} ${y}`;
  for (let s = 0; s < spans; s++) {
    const a = x0 + s * w;
    path += ` Q${a + w / 2} ${y + sag * 2} ${a + w} ${y}`;
    for (let k = 1; k <= 6; k++) {
      const t = k / 7;
      const bx = a + w * t, by = y + 4 * sag * t * (1 - t);
      const c = colors[(s * 6 + k) % colors.length];
      bulbs.push(
        <g key={`${s}-${k}`}>
          <circle cx={bx} cy={by + 8} r="15" fill={c} opacity="0.28" className="sb-glint" style={{ animationDelay: `${((s * 6 + k) % 5) * 0.5}s` }} />
          <ellipse cx={bx} cy={by + 9} rx="5" ry="8" fill={c} className="sb-glint" style={{ animationDelay: `${((s * 6 + k) % 5) * 0.5}s` }} />
        </g>,
      );
    }
  }
  return (
    <g key={id}>
      <path d={path} fill="none" stroke="#1a1330" strokeWidth="2.2" opacity="0.8" />
      {bulbs}
    </g>
  );
}

function Skyline({ color, windowColor, base = 900, from = 0, to = 1600, seed = 1, min = 120, max = 380, lit = 0.45 }) {
  const out = [];
  let x = from, i = 0;
  while (x < to) {
    const w = 60 + rnd(i, seed) * 90, h = min + rnd(i, seed + 2) * (max - min);
    out.push(<rect key={`b${i}`} x={x} y={base - h} width={w} height={h} fill={color} />);
    for (let wy = base - h + 18; wy < base - 20; wy += 26) {
      for (let wx = x + 10; wx < x + w - 14; wx += 20) {
        if (rnd(wx + wy, seed + 4) < lit) out.push(<rect key={`w${i}-${wx}-${wy}`} x={wx} y={wy} width="9" height="13" fill={windowColor} className="sb-glint" style={{ animationDelay: `${rnd(wx * wy, 3) * 5}s`, animationDuration: `${3 + rnd(wx, 8) * 4}s` }} />);
      }
    }
    x += w + 4 + rnd(i, seed + 6) * 10;
    i++;
  }
  return <g>{out}</g>;
}

function Diya({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="-22" r="64" fill="url(#dw-glow)" className="sb-glint" />
      <path d="M-34 -8 Q-34 18 0 18 Q34 18 34 -8 Q0 4 -34 -8Z" fill="#c2561d" />
      <path d="M-40 -10 Q0 8 40 -10 Q0 -2 -40 -10Z" fill="#e8883a" />
      <path d="M-26 6 Q0 14 26 6" fill="none" stroke="#ffd37a" strokeWidth="2" opacity="0.7" />
      <g className="sb-flicker">
        <path d="M0 -12 C-14 -26 -8 -44 0 -58 C8 -44 14 -26 0 -12Z" fill="#ff9a1f" />
        <path d="M0 -14 C-7 -24 -4 -36 0 -46 C4 -36 7 -24 0 -14Z" fill="#ffe27a" />
        <ellipse cx="0" cy="-20" rx="3" ry="6" fill="#ffffff" />
      </g>
    </g>
  );
}

function Temple({ x, base, s = 1 }) {
  return (
    <g transform={`translate(${x} ${base}) scale(${s})`} fill="#160c2b">
      <rect x="-170" y="-110" width="340" height="110" />
      <rect x="-120" y="-190" width="240" height="80" />
      <path d="M-100 -190 Q0 -330 100 -190Z" />
      <rect x="-5" y="-360" width="10" height="40" />
      <circle cx="0" cy="-372" r="9" />
      {[-140, 140].map((dx) => (
        <g key={dx}>
          <rect x={dx - 22} y="-190" width="44" height="80" />
          <path d={`M${dx - 24} -190 Q${dx} -260 ${dx + 24} -190Z`} />
          <rect x={dx - 2} y="-280" width="4" height="26" />
        </g>
      ))}
      {[-80, -40, 0, 40, 80].map((dx) => <rect key={dx} x={dx - 8} y="-90" width="16" height="50" rx="8" fill="#ffb347" opacity="0.8" className="sb-glint" style={{ animationDelay: `${Math.abs(dx) / 40}s` }} />)}
    </g>
  );
}

function Diwali() {
  const burstColors = ["#ffd24a", "#ff5fa2", "#ff8a3d", "#6ee7ff", "#c084fc"];
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="dw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#140a3d" />
          <stop offset="0.45" stopColor="#3f1466" />
          <stop offset="0.78" stopColor="#a52c5b" />
          <stop offset="1" stopColor="#ff8f3f" />
        </linearGradient>
        <radialGradient id="dw-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd37a" stopOpacity="0.95" />
          <stop offset="0.4" stopColor="#ff9a3d" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff7a1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#dw-sky)" />
      <Stars count={70} yMax={430} seed={2} />
      <ellipse cx="800" cy="900" rx="900" ry="260" fill="url(#dw-glow)" opacity="0.7" />
      {burstColors.map((c, i) => (
        <Burst key={c} x={[300, 760, 1180, 520, 1420][i]} y={[250, 170, 280, 400, 160][i]} r={[120, 150, 130, 90, 100][i]} color={c} delay={i * 0.9} dur={4.6 + (i % 3) * 0.6} />
      ))}
      <Skyline color="#1a0d2e" windowColor="#ffcf6b" from={0} to={560} seed={3} min={150} max={330} base={900} />
      <Skyline color="#1a0d2e" windowColor="#ffcf6b" from={1040} to={1600} seed={5} min={150} max={300} base={900} />
      <Temple x={800} base={900} s={1.25} />
      <Garland y={30} sag={34} colors={["#ffb703", "#ff5fa2", "#ff8a3d", "#ffe27a", "#fb6f92"]} />
      <Garland y={92} sag={26} spans={5} colors={["#ffe27a", "#ff8a3d", "#ffb703"]} />
      {/* rangoli on the ground, and the row of diyas */}
      <ellipse cx="800" cy="868" rx="420" ry="46" fill="#2a0f2e" opacity="0.7" />
      {[[330, 40, "#ff5fa2"], [270, 34, "#ffd24a"], [210, 28, "#ffffff"], [150, 22, "#ff8a3d"], [90, 16, "#6ee7ff"]].map(([rx, ry, c]) => (
        <ellipse key={rx} cx="800" cy="868" rx={rx} ry={ry} fill="none" stroke={c} strokeWidth="6" strokeDasharray="3 13" strokeLinecap="round" opacity="0.9" />
      ))}
      {[120, 330, 560, 1040, 1270, 1480].map((x, i) => <Diya key={x} x={x} y={860 + (i % 2) * 14} s={0.9 + (i % 3) * 0.1} />)}
      <Diya x={690} y={872} s={1.1} /><Diya x={910} y={872} s={1.1} /><Diya x={800} y={850} s={1.35} />
    </svg>
  );
}

function NewYear() {
  const colors = ["#ff4d6d", "#ffd23f", "#4ea8ff", "#7ee081", "#c084fc", "#ffffff", "#ff9f43"];
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="ny-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#02040f" />
          <stop offset="0.55" stopColor="#0b1445" />
          <stop offset="1" stopColor="#2a2f86" />
        </linearGradient>
        <radialGradient id="ny-haze" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#8f7bff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8f7bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#ny-sky)" />
      <Stars count={90} yMax={520} seed={4} />
      <ellipse cx="800" cy="860" rx="1000" ry="240" fill="url(#ny-haze)" />
      {colors.map((c, i) => (
        <Burst key={i} x={[260, 620, 980, 1340, 450, 800, 1180][i]} y={[230, 150, 300, 200, 420, 420, 440][i]} r={[130, 160, 140, 120, 90, 100, 85][i]} color={c} delay={i * 0.65} dur={4 + (i % 4) * 0.5} rays={i % 2 ? 14 : 20} />
      ))}
      <Skyline color="#070b22" windowColor="#ffe08a" from={-20} to={1620} seed={7} min={130} max={430} base={900} lit={0.5} />
      <Skyline color="#0c1236" windowColor="#9ec5ff" from={-40} to={1640} seed={11} min={90} max={250} base={900} lit={0.35} />
      {/* streamers across the top */}
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M0 ${30 + i * 40} Q400 ${90 + i * 40} 800 ${30 + i * 40} T1600 ${30 + i * 40}`} fill="none" stroke={["#ff4d6d", "#ffd23f", "#4ea8ff"][i]} strokeWidth="5" strokeDasharray="16 10" opacity="0.8" className="sb-dash" />
      ))}
      {/* confetti */}
      {Array.from({ length: 70 }, (_, i) => (
        <rect key={i} x={rnd(i, 3) * 1600} y="0" width="9" height="14" rx="2" fill={colors[i % colors.length]} className="sb-confetti"
          style={{ animationDuration: `${7 + rnd(i, 5) * 8}s`, animationDelay: `-${rnd(i, 9) * 14}s` }} />
      ))}
    </svg>
  );
}

function Tree({ x, base, s = 1, lights = true }) {
  const tiers = [[0, -140, 150, 190], [0, -250, 120, 170], [0, -350, 90, 150]];
  const dots = [[-60, -190], [50, -170], [-30, -270], [40, -300], [0, -380], [-80, -150], [80, -160], [-20, -215]];
  return (
    <g transform={`translate(${x} ${base}) scale(${s})`}>
      <rect x="-18" y="-60" width="36" height="60" fill="#5a3320" />
      {tiers.map(([cx, y, hw, h], i) => (
        <g key={i}>
          <polygon points={`${cx - hw},${y} ${cx},${y - h} ${cx + hw},${y}`} fill={i % 2 ? "#2a8a4a" : "#1f6b3a"} />
          <polygon points={`${cx - hw * 0.78},${y - 14} ${cx - hw * 0.4},${y - 38} ${cx},${y - 20} ${cx + hw * 0.4},${y - 38} ${cx + hw * 0.78},${y - 14} ${cx + hw},${y} ${cx - hw},${y}`} fill="#ffffff" opacity="0.88" />
        </g>
      ))}
      {lights && dots.map(([dx, dy], i) => (
        <g key={i}>
          <circle cx={dx} cy={dy} r="15" fill={["#ff4d6d", "#ffd23f", "#4ea8ff"][i % 3]} opacity="0.3" className="sb-glint" style={{ animationDelay: `${i * 0.35}s` }} />
          <circle cx={dx} cy={dy} r="7.5" fill={["#ff4d6d", "#ffd23f", "#4ea8ff"][i % 3]} className="sb-glint" style={{ animationDelay: `${i * 0.35}s` }} />
        </g>
      ))}
      <g className="sb-glint">
        <circle cx="0" cy="-505" r="34" fill="#ffe27a" opacity="0.4" />
        <polygon points="0,-532 8,-512 30,-512 12,-499 19,-478 0,-491 -19,-478 -12,-499 -30,-512 -8,-512" fill="#ffd23f" />
      </g>
    </g>
  );
}

function Sleigh() {
  return (
    <g className="sb-fly-slow" fill="#0d1a38">
      <g transform="translate(0 0) scale(0.9)">
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${-150 - i * 80} ${i % 2 ? 6 : 0})`}>
            <ellipse cx="0" cy="0" rx="26" ry="11" />
            <circle cx="24" cy="-12" r="8" />
            <path d="M24 -18 l-4 -16 m4 16 l6 -14 m-6 14 l10 -10" fill="none" stroke="#0d1a38" strokeWidth="2.5" />
            <path d="M-18 8 l-8 20 m18 -20 l-4 22 m20 -22 l8 20" fill="none" stroke="#0d1a38" strokeWidth="3" />
          </g>
        ))}
        <path d="M-20 -6 Q-10 28 40 26 Q80 24 84 -10 L60 -8 Q50 8 20 10 Z" />
        <circle cx="38" cy="-18" r="14" fill="#c8102e" />
        <path d="M28 -26 q10 -26 28 -10 l-4 6 q-10 -14 -20 4Z" fill="#c8102e" />
        <circle cx="58" cy="-34" r="5" fill="#ffffff" />
        <path d="M-60 6 L-150 6" stroke="#0d1a38" strokeWidth="2" />
      </g>
    </g>
  );
}

function Christmas() {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="xm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#081633" />
          <stop offset="0.55" stopColor="#1b3566" />
          <stop offset="1" stopColor="#4b78b0" />
        </linearGradient>
        <radialGradient id="xm-moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff8dd" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff8dd" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="xm-win" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd37a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd37a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#xm-sky)" />
      <Stars count={80} yMax={420} seed={6} />
      <circle cx="420" cy="230" r="220" fill="url(#xm-moon)" />
      <circle cx="420" cy="230" r="76" fill="#fff6d6" />
      {[[400, 210, 14], [445, 250, 10], [392, 255, 8]].map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} fill="#eadfb8" opacity="0.7" />)}
      <g transform="translate(260 190)"><Sleigh /></g>
      {/* snowy hills */}
      <path d="M0 640 Q300 560 620 620 T1200 600 T1600 620 L1600 900 L0 900Z" fill="#d8e6fa" />
      <path d="M0 720 Q400 650 800 710 T1600 700 L1600 900 L0 900Z" fill="#eef5ff" />
      {/* far pines */}
      {[60, 150, 230, 1400, 1480, 1550].map((x, i) => (
        <g key={x} transform={`translate(${x} ${690 + (i % 2) * 14})`}>
          <polygon points="-30,0 0,-90 30,0" fill="#1c5a3c" /><polygon points="-24,-44 0,-120 24,-44" fill="#236b46" />
          <polygon points="-18,-90 0,-132 18,-90" fill="#ffffff" opacity="0.85" />
        </g>
      ))}
      {/* the cosy house */}
      <g transform="translate(260 760)">
        <rect x="-110" y="-120" width="220" height="120" fill="#7a3f2b" />
        <polygon points="-130,-118 0,-210 130,-118" fill="#f4f8ff" />
        <polygon points="-130,-118 0,-210 130,-118 120,-110 0,-196 -120,-110" fill="#c9dcf5" />
        <rect x="60" y="-200" width="26" height="50" fill="#5a2f1f" /><rect x="56" y="-208" width="34" height="12" fill="#f4f8ff" />
        {[[-60, -80], [40, -80]].map(([wx, wy]) => (
          <g key={wx}>
            <circle cx={wx + 17} cy={wy + 17} r="46" fill="url(#xm-win)" className="sb-glint" />
            <rect x={wx} y={wy} width="34" height="36" fill="#ffd37a" /><path d={`M${wx + 17} ${wy} v36 M${wx} ${wy + 18} h34`} stroke="#7a3f2b" strokeWidth="3" />
          </g>
        ))}
        <rect x="-15" y="-60" width="30" height="60" rx="3" fill="#4a2a1d" />
        <circle cx="0" cy="-100" r="10" fill="#2a8a4a" />
      </g>
      <Tree x={1160} base={810} s={1.1} />
      {/* presents under the tree */}
      {[[1070, "#c8102e", "#ffd23f"], [1130, "#2a6ad0", "#ffffff"], [1240, "#16a34a", "#ffd23f"]].map(([px, c, r], i) => (
        <g key={px} transform={`translate(${px} ${812 + (i % 2) * 6})`}>
          <rect x="-24" y="-30" width="48" height="30" fill={c} /><rect x="-4" y="-30" width="8" height="30" fill={r} /><rect x="-24" y="-18" width="48" height="6" fill={r} opacity="0.8" />
          <path d="M0 -30 q-14 -16 -14 -4 q8 4 14 4 q6 0 14 -4 q0 -12 -14 4Z" fill={r} />
        </g>
      ))}
      <Garland y={26} sag={30} colors={["#ff4d6d", "#16a34a", "#ffd23f", "#4ea8ff"]} />
      {/* snow */}
      {Array.from({ length: 100 }, (_, i) => (
        <circle key={i} cx={rnd(i, 2) * 1600} cy="0" r={1.8 + rnd(i, 6) * 4} fill="#ffffff" opacity={0.65 + rnd(i, 8) * 0.35} className="sb-fall"
          style={{ animationDuration: `${8 + rnd(i, 4) * 10}s`, animationDelay: `-${rnd(i, 1) * 18}s` }} />
      ))}
      <rect x="0" y="860" width="1600" height="40" fill="#f4f8ff" />
    </svg>
  );
}

function Holi() {
  const palette = ["#ff2e93", "#ffd400", "#00c2ff", "#3ddc84", "#ff7a00", "#8e44ff"];
  const clouds = [[250, 260, 230], [620, 190, 200], [1000, 280, 240], [1350, 180, 210], [450, 520, 210], [850, 470, 230], [1230, 560, 220], [100, 560, 170], [1520, 440, 170]];
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="hl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6e0" />
          <stop offset="0.6" stopColor="#ffe9f3" />
          <stop offset="1" stopColor="#e6f6ff" />
        </linearGradient>
        <filter id="hl-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="34" /></filter>
        <filter id="hl-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14" /></filter>
      </defs>
      <rect width="1600" height="900" fill="url(#hl-sky)" />
      <g filter="url(#hl-blur)">
        {clouds.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={palette[i % palette.length]} opacity="0.78" className="sb-puff" style={{ animationDelay: `-${i * 0.9}s`, animationDuration: `${5 + (i % 3)}s` }} />
        ))}
      </g>
      {/* spray from the pichkaris */}
      <g fill="none" strokeLinecap="round" strokeWidth="9" opacity="0.85" filter="url(#hl-soft)">
        <path d="M0 820 Q420 260 880 520" stroke="#ff2e93" strokeDasharray="22 16" className="sb-dash" />
        <path d="M1600 800 Q1160 240 760 540" stroke="#00c2ff" strokeDasharray="22 16" className="sb-dash" />
        <path d="M120 860 Q560 380 1000 430" stroke="#ffd400" strokeDasharray="18 18" className="sb-dash" />
      </g>
      {/* powder floating up */}
      {Array.from({ length: 90 }, (_, i) => (
        <circle key={i} cx={rnd(i, 3) * 1600} cy={620 + rnd(i, 5) * 280} r={3 + rnd(i, 7) * 8} fill={palette[i % palette.length]} className="sb-rise"
          style={{ animationDuration: `${6 + rnd(i, 2) * 8}s`, animationDelay: `-${rnd(i, 4) * 12}s` }} />
      ))}
      {/* mounds of colour powder along the bottom */}
      {palette.map((c, i) => {
        const x = 150 + i * 260;
        return (
          <g key={c}>
            <path d={`M${x - 150} 905 Q${x - 60} ${770 - (i % 2) * 30} ${x} ${760 - (i % 3) * 20} Q${x + 60} ${770 - (i % 2) * 30} ${x + 150} 905Z`} fill={c} />
            <path d={`M${x - 70} 880 Q${x - 20} 800 ${x + 10} 786`} fill="none" stroke="#ffffff" strokeWidth="6" opacity="0.4" strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
}

const DARK = ["diwali", "newyear", "christmas"]; // the night scenes
export const SCENES = ["mountain", "beach", "diwali", "newyear", "christmas", "holi"];
const VIEW = { mountain: Mountains, beach: Beach, diwali: Diwali, newyear: NewYear, christmas: Christmas, holi: Holi };


export default function SceneBackdrop({ kind }) {
  const [shown, setShown] = useState(null); // the scene that is on screen (kept while it fades out)
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (kind) {
      setShown(kind);
      const raf = requestAnimationFrame(() => setVisible(true)); // after it is mounted, so the fade-in runs
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timer = setTimeout(() => setShown(null), 1100); // unmount after the fade-out
    return () => clearTimeout(timer);
  }, [kind]);

  if (!shown) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-1000 ease-in-out"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    >
      <style>{CSS}</style>
      {React.createElement(VIEW[shown])}
      {/* softens the scene so the dark text of the page on top stays readable; the night scenes need more of it */}
      <div className={`absolute inset-0 ${DARK.includes(shown) ? "bg-white/45" : "bg-white/20"}`} />
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent ${DARK.includes(shown) ? "h-24 from-white/60" : "h-40 from-white/80"}`} /> {/* the message box sits on a pale fade */}
    </div>
  );
}
