// Scripted flight through /explore, recorded from headless Chrome.
//   node scripts/record.mjs <url> <out.webp> <width> <steps-json>
// steps: [{"tap":"css"}, {"click":"css"}, {"hover":"css"}, {"wait":ms}, {"text":"css"}, {"eval":"js expr"}, {"shot":"file.jpg"}]
// Touch widths (<600) send real touch events; others send mouse events.
// Frames come from Page.startScreencast and are joined into an animated WebP.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const [url, out, widthArg = "1440", stepsArg = "[]"] = process.argv.slice(2);
const W = Number(widthArg);
const H = W < 600 ? 812 : W < 1000 ? 1024 : 900;
const touch = W < 600;
const steps = JSON.parse(stepsArg);
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9334;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${path.join(os.tmpdir(), "ff-record-profile")}`,
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--hide-scrollbars",
  "--no-first-run",
  "about:blank",
]);

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("chrome did not start");
}
const ws = new WebSocket(await target());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
const frames = [];
let recording = false;
const errors = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  } else if (m.method === "Page.screencastFrame") {
    if (recording) frames.push({ data: m.params.data, t: m.params.metadata.timestamp });
    ws.send(JSON.stringify({ id: ++id, method: "Page.screencastFrameAck", params: { sessionId: m.params.sessionId } }));
  } else if (m.method === "Runtime.exceptionThrown") {
    errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  } else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    errors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const center = (sel) =>
  evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const b = el.getBoundingClientRect(); if (b.bottom > innerHeight || b.top < 0) el.scrollIntoView({ block: "center", behavior: "instant" }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; })()`);

await send("Runtime.enable");
await send("Page.enable");
if (process.env.REDUCED) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: touch });
await send("Emulation.setTouchEmulationEnabled", { enabled: touch, maxTouchPoints: touch ? 5 : 0 });
await send("Page.navigate", { url });
await sleep(9000);
await send("Page.startScreencast", { format: "jpeg", quality: 70, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
recording = true;

for (const s of steps) {
  if (s.wait) await sleep(s.wait);
  for (const kind of ["tap", "click", "hover"]) {
    if (!s[kind]) continue;
    const c = await center(s[kind]);
    if (!c) {
      console.log(`  not found: ${s[kind]}`);
      continue;
    }
    console.log(`  ${kind} ${s[kind]} at ${Math.round(c.x)},${Math.round(c.y)} (target ${Math.round(c.w)}px)`);
    if (kind === "tap") {
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: c.x, y: c.y }] });
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: c.x, y: c.y });
      if (kind === "click") {
        await send("Input.dispatchMouseEvent", { type: "mousePressed", x: c.x, y: c.y, button: "left", clickCount: 1 });
        await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: c.x, y: c.y, button: "left", clickCount: 1 });
      }
    }
  }
  if (s.tapAt) {
    const [x, y] = s.tapAt;
    console.log(`  tapAt ${x},${y}`);
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }
  if (s.eval) console.log(`  eval: ${JSON.stringify(await evaluate(s.eval))}`);
  if (s.text) console.log(`  text(${s.text}): ${JSON.stringify((await evaluate(`document.querySelector(${JSON.stringify(s.text)})?.innerText ?? null`))?.slice(0, Number(process.env.TEXTMAX ?? 600)))}`);
  if (s.shot) {
    const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
    mkdirSync(path.dirname(s.shot), { recursive: true });
    writeFileSync(s.shot, Buffer.from(shot.result.data, "base64"));
  }
}
recording = false;
await send("Page.stopScreencast");
const overflow = await evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
const uniq = [...new Set(errors.map((e) => e.split("\n")[0]))];
console.log(`frames: ${frames.length}, overflowX: ${overflow}px, errors: ${uniq.length ? `${errors.length} (${uniq.slice(0, 3).join(" | ")})` : "none"}`);

// Join frames into an animated WebP at a steady ~12 fps (scaled to <= 720px wide).
if (frames.length && out) {
  const fps = 12;
  const start = frames[0].t;
  const end = frames.at(-1).t;
  const picked = [];
  for (let t = start, i = 0; t <= end; t += 1 / fps) {
    while (i < frames.length - 1 && frames[i + 1].t <= t) i++;
    picked.push(frames[i].data);
  }
  const scale = Math.min(1, 720 / W);
  const fw = Math.round(W * scale);
  const fh = Math.round(H * scale);
  const raws = await Promise.all(picked.map((d) => sharp(Buffer.from(d, "base64")).resize(fw, fh, { fit: "fill" }).toBuffer()));
  await sharp(raws, { join: { animated: true } })
    .webp({ quality: 62, effort: 4, delay: Array(raws.length).fill(Math.round(1000 / fps)), loop: 0 })
    .toFile(out);
  console.log(`wrote ${out} (${raws.length} frames @ ${fps}fps, ${fw}x${fh})`);
}
ws.close();
chrome.kill();
