// Records a demo of Mark: a headless Chrome is driven through the DevTools protocol (typing, dragging)
// while its screencast frames are saved. Scene start/end times go to scenes.json. No extra packages.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUT = process.env.OUT;                       // folder for frames + scenes.json
const URL = process.env.APP || "http://localhost:5199";
const W = 1100, H = 700;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(path.join(OUT, "raw"), { recursive: true });
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--remote-debugging-port=9333", `--window-size=${W},${H}`, "--hide-scrollbars",
  "--no-first-run", "--no-default-browser-check", `--user-data-dir=${path.join(OUT, "profile")}`, "about:blank",
], { stdio: "ignore" });

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error("chrome did not start");
}

(async () => {
  const ws = new WebSocket(await connect());
  await new Promise((r) => (ws.onopen = r));
  let nextId = 1; const pending = new Map(); const listeners = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    else listeners.forEach((fn) => fn(msg));
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, (msg) => (msg.error ? reject(new Error(method + ": " + msg.error.message)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "evaluate failed");
    return r.result.value;
  };

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });

  // ---- input helpers
  const mouse = (type, x, y) => send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" ? "none" : "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
  const click = async (x, y) => { await mouse("mouseMoved", x, y); await mouse("mousePressed", x, y); await mouse("mouseReleased", x, y); };
  const type = async (text, delay = 55) => {
    for (const ch of text) { await send("Input.dispatchKeyEvent", { type: "char", text: ch }); await sleep(delay); }
  };
  const enter = async () => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  };
  const focusComposer = () => evaluate(`[...document.querySelectorAll('input[placeholder], textarea')].find(e => !/^Search/i.test(e.placeholder || "")).focus(); true`);
  // wait until the previous answer is done (the composer shows "Sending..." meanwhile), so messages never pile up
  const idle = async () => { for (let i = 0; i < 240; i++) { if (!(await evaluate(`document.body.innerText.includes("Sending...")`))) return; await sleep(500); } };
  const say = async (text) => { await idle(); await focusComposer(); await type(text); await sleep(300); await enter(); };

  // where Mark is on the page (null when he is not on screen)
  const markBox = () => evaluate(`(() => {
    const el = [...document.querySelectorAll("div.fixed")].find(e => e.style.transform && e.style.width);
    if (!el || el.style.visibility === "hidden") return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  })()`);
  const waitForMark = async (timeout = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const b = await markBox();
      if (b && b.x > 0 && b.x + b.w < W && b.y > 0 && b.y + b.h < H) { await sleep(500); const again = await markBox(); if (again) return again; }
      await sleep(120);
    }
    throw new Error("Mark never showed up");
  };
  const drag = async (from, to, steps = 28, hold = 600) => {
    await mouse("mouseMoved", from.x, from.y); await mouse("mousePressed", from.x, from.y);
    for (let i = 1; i <= steps; i++) { await mouse("mouseMoved", from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps); await sleep(28); }
    await sleep(hold); await mouse("mouseReleased", to.x, to.y);
  };

  const caption = (text) => evaluate(`(() => {
    let c = document.getElementById("demo-caption");
    if (!c) { c = document.createElement("div"); c.id = "demo-caption";
      c.style.cssText = "position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:99999;background:rgba(20,20,30,.88);color:#fff;font:600 17px system-ui,sans-serif;padding:9px 20px;border-radius:999px;pointer-events:none;white-space:nowrap";
      document.body.appendChild(c); }
    c.textContent = ${JSON.stringify(text)}; return true; })()`);

  // ---- log in (not recorded), then start the screencast
  await send("Page.navigate", { url: URL + "/login" });
  await sleep(2500);
  await evaluate(`document.querySelector('input[type="email"], input[placeholder*="example"]').focus(); true`);
  await type("demo@example.test", 15);
  await evaluate(`document.querySelector('input[type="password"]').focus(); true`);
  await type("demo-pass-1234", 15); await enter();
  await sleep(3000);

  const frames = []; // { file, t }
  let n = 0;
  listeners.push((msg) => {
    if (msg.method !== "Page.screencastFrame") return;
    const file = path.join("raw", `f${String(n++).padStart(6, "0")}.jpg`);
    fs.writeFileSync(path.join(OUT, file), Buffer.from(msg.params.data, "base64"));
    frames.push({ file, t: msg.params.metadata.timestamp });
    send("Page.screencastFrameAck", { sessionId: msg.params.sessionId }).catch(() => {});
  });

  // new chat
  await send("Page.navigate", { url: URL + "/chat/new" });
  await sleep(1200);
  await send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: W, maxHeight: H, everyNthFrame: 1 });

  const scenes = []; const scenesExtra = {};
  const scene = async (name, title, fn) => {
    const start = Date.now() / 1000;
    await caption(title);
    await fn();
    scenes.push({ name, title, start, end: Date.now() / 1000 });
    console.log("scene done:", name);
  };

if (process.env.PART === "agents") {
  // click a button / menu item by its visible text, with a real mouse click
  const clickText = async (selector, text) => {
    const r = await evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(e => e.textContent.trim().startsWith(${JSON.stringify(text)}));
      if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
    if (!r) throw new Error("no element: " + text);
    await click(r.x, r.y);
  };
  // wait until the page shows some text; the waiting part is sped up in the video (a "warp")
  const warps = [];
  const waitForText = async (text, timeout = 150000) => {
    const start = Date.now() / 1000;
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (await evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`)) break;
      await sleep(500);
    }
    const end = Date.now() / 1000;
    if (end - start > 6) warps.push({ start: start + 1.5, end: end - 0.5, factor: Math.max(2, Math.min(8, (end - start) / 5)) });
  };

  await scene("13-troubleshoot", "Troubleshoot agent: Mark checks your real laptop with MCP tools", async () => {
    await clickText("button", "Select agent"); await sleep(800);
    await clickText('[role="menuitemradio"]', "Troubleshoot"); await sleep(1200);
    await say("check my wifi status");
    await waitForText("Tools the model called");
    await sleep(5500);
  });
  await scene("14-interview-resume", "Interview agent: reads your resume file with a real file tool", async () => {
    await send("Page.navigate", { url: URL + "/chat/new" }); await sleep(2500);
    await caption("Interview agent: reads your resume file with a real file tool");
    await clickText("button", "Select agent"); await sleep(800);
    await clickText('[role="menuitemradio"]', "Interview prep"); await sleep(1500);
    await clickText("button", "Check my resume");
    await waitForText("Tools the model called");
    await sleep(5500);
  });
  await scene("15-interview-code", "…and writes a code project into your folder", async () => {
    await say("write a Java binary search with a small main and save it as a project");
    await waitForText("write_file");
    await sleep(5500);
  });
  scenesExtra.warps = warps;
} else {
  await scene("01-hello", "Mark walks in and waves hello", async () => { await sleep(6500); });
  await scene("02-cute", "Say something sweet: “you are so cute”", async () => { await say("you are so cute"); await sleep(7500); });
  await scene("03-thanks", "Say thanks: he bows (감사합니다)", async () => { await say("thank you so much"); await sleep(8000); });
  await scene("04-birthday", "Birthday? He brings the cake", async () => { await say("it is my birthday today!"); await sleep(8000); });
  await scene("05-pizza", "Mention food: he brings it", async () => { await say("i am so hungry, i want pizza"); await sleep(8000); });
  await scene("06-dance", "Ask him to dance", async () => { await say("dance for me"); await sleep(8000); });
  await scene("07-magic", "…or to do some magic", async () => { await say("do some magic"); await sleep(8000); });
  await scene("08-sleepy", "Tired? So is he", async () => { await say("i am so sleepy zzz"); await sleep(8000); });
  await scene("09-hurt", "Be mean and he gets sad", async () => { await say("you are stupid"); await sleep(8000); });
  await scene("10-drag", "Pick him up and put him anywhere", async () => {
    await say("hello mark");
    const b = await waitForMark();
    await drag({ x: b.x + b.w / 2, y: b.y + b.h * 0.4 }, { x: 560, y: 330 }, 30, 700);
    await sleep(2800);
  });
  await scene("11-bin", "Drop him in the corner bin to send him away", async () => {
    const b = await waitForMark(); // he is where he was dropped, or came back
    await drag({ x: b.x + b.w / 2, y: b.y + b.h * 0.4 }, { x: W - 70, y: H - 70 }, 42, 900);
    await sleep(3500);
  });
  await scene("12-return", "Say “come robo” and he is back", async () => { await say("come robo, where are you"); await sleep(8000); });

}
  await send("Page.stopScreencast");
  fs.writeFileSync(path.join(OUT, "frames.json"), JSON.stringify(frames));
  fs.writeFileSync(path.join(OUT, "scenes.json"), JSON.stringify(scenes, null, 2));
  fs.writeFileSync(path.join(OUT, "warps.json"), JSON.stringify(scenesExtra.warps || []));
  console.log("frames:", frames.length);
  chrome.kill();
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e); chrome.kill(); process.exit(1); });
