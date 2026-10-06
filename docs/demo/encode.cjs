// Turns recorded screencast frames into: one MP4 (MP4 env, default mark-demo.mp4) and one small GIF per scene.
// warps.json (optional) lists stretches that are played faster, e.g. while the model is thinking.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const OUT = process.env.OUT;       // recording folder (frames.json, scenes.json, raw/)
const DEST = process.env.DEST;     // where the media goes
const FPS = 15;
fs.mkdirSync(DEST, { recursive: true });

const frames = JSON.parse(fs.readFileSync(path.join(OUT, "frames.json")));
const scenes = JSON.parse(fs.readFileSync(path.join(OUT, "scenes.json")));
const warps = fs.existsSync(path.join(OUT, "warps.json")) ? JSON.parse(fs.readFileSync(path.join(OUT, "warps.json"))) : [];
const t0 = scenes[0].start, t1 = scenes[scenes.length - 1].end;

// constant frame rate; inside a warp the source clock runs faster. Remember at which output frame each scene starts and ends.
const seq = path.join(OUT, "seq");
fs.rmSync(seq, { recursive: true, force: true });
fs.mkdirSync(seq);
let t = t0, k = 0, n = 0;
const bounds = scenes.map(() => ({ from: null, to: null }));
while (t < t1) {
  scenes.forEach((s, i) => {
    if (bounds[i].from === null && t >= s.start) bounds[i].from = n;
    if (t < s.end) bounds[i].to = n;
  });
  while (k + 1 < frames.length && frames[k + 1].t <= t) k++;
  fs.copyFileSync(path.join(OUT, frames[k].file), path.join(seq, `s${String(n).padStart(6, "0")}.jpg`));
  n++;
  const warp = warps.find((w) => t >= w.start && t < w.end);
  t += (warp ? warp.factor : 1) / FPS;
}
console.log("frames at", FPS, "fps:", n);

const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });

ff(["-framerate", String(FPS), "-start_number", "0", "-i", path.join(seq, "s%06d.jpg"),
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", path.join(DEST, process.env.MP4 || "mark-demo.mp4")]);

scenes.forEach((s, i) => {
  const from = Math.max(0, bounds[i].from - 2);
  const count = bounds[i].to - from + 4;
  ff(["-framerate", String(FPS), "-start_number", String(from), "-i", path.join(seq, "s%06d.jpg"), "-frames:v", String(count),
    "-vf", "fps=12,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
    path.join(DEST, `${s.name}.gif`)]);
});
for (const f of fs.readdirSync(DEST)) console.log(f, (fs.statSync(path.join(DEST, f)).size / 1048576).toFixed(1) + " MB");
