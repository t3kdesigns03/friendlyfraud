// Headless Chrome screenshots over the DevTools protocol — no extra deps.
//   node scripts/shoot.mjs <url> <outDir> [widths=375,768,1440] [scrollFractions=0]
// Captures each width at each scroll fraction (0..1 of page height) and
// prints console errors / horizontal overflow per shot.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const [url, outDir = ".shots", widthsArg = "375,768,1440", scrollsArg = "0"] = process.argv.slice(2);
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9333;
mkdirSync(outDir, { recursive: true });

const profile = path.join(os.tmpdir(), "ff-shoot-profile");
const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--hide-scrollbars",
  "--no-first-run",
  "about:blank",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
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
const errors = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method === "Runtime.exceptionThrown") {
    errors.push(`exception: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
  } else if (msg.method === "Runtime.consoleAPICalled" && (msg.params.type === "error" || msg.params.type === "warning")) {
    errors.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(" ")}`.slice(0, 300));
  } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
    errors.push(`log: ${msg.params.entry.text}`.slice(0, 300));
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");
if (process.env.REDUCED) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

for (const w of widthsArg.split(",").map(Number)) {
  const h = w < 600 ? 812 : w < 1000 ? 1024 : 900;
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
  if (w < 600) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  else await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  errors.length = 0;
  await send("Page.navigate", { url });
  await sleep(9000);
  for (const frac of scrollsArg.split(",").map((v) => (v.endsWith("px") ? v : Number(v)))) {
    await evaluate(String(frac).endsWith("px") ? `window.scrollTo(0, ${parseFloat(frac)})` : `window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * ${frac})`);
    await sleep(2200);
    if (process.env.HOVER || process.env.CLICK) {
      const sel = process.env.HOVER || process.env.CLICK;
      const box = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; el.scrollIntoView({block: "center"}); const r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; })()`);
      if (box) {
        await sleep(600);
        await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
        if (process.env.CLICK) {
          await send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
          await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 });
        }
        await sleep(Number(process.env.AFTER ?? 1800));
      } else console.log(`  selector not found: ${sel}`);
    }
    const overflow = await evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
    const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
    const name = `${new URL(url).pathname.replace(/\W+/g, "_") || "_"}-${w}-${typeof frac === "string" ? frac : Math.round(frac * 100)}.jpg`;
    writeFileSync(path.join(outDir, name), Buffer.from(shot.result.data, "base64"));
    console.log(`${name}  overflowX=${overflow}px`);
  }
  if (errors.length) console.log(`  console (${w}px):\n   ` + [...new Set(errors)].join("\n   "));
}

ws.close();
chrome.kill();
