// End-to-end smoke test. YouTube and Wikimedia are replaced with local fakes so it runs offline.
// Usage: npm run build && npm run test:e2e   (needs Playwright with Chromium installed)
const { execSync, spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { chromium, devices } = require(require.resolve("playwright", { paths: [process.cwd(), execSync("npm root -g").toString().trim()] }));

const PORT = 4179;
const BASE = `http://localhost:${PORT}/meme-machine/`;
const SHOTS = process.env.SHOTS_DIR;
const VIDEO = "dQw4w9WgXcQ";

const FAKE_YT = `
window.__yt = { players: [] };
class Player {
  constructor(el, opts) {
    const mount = typeof el === "string" ? document.getElementById(el) : el;
    const frame = document.createElement("iframe");
    frame.className = "fake-yt";
    frame.srcdoc = "<body style='margin:0;background:linear-gradient(135deg,#e52d27,#b31217);height:100vh'></body>";
    mount.replaceWith(frame);
    Object.assign(this, { frame, opts, videoId: opts.videoId, t: opts.playerVars?.start || 0, playing: false, muted: false, vol: 100, calls: [] });
    window.__yt.players.push(this);
    setTimeout(() => opts.events?.onReady?.({ target: this }), 30);
  }
  emit(state) { this.opts.events?.onStateChange?.({ data: state, target: this }); }
  getIframe() { return this.frame; }
  playVideo() { this.calls.push("play"); this.base = this.t; this.t0 = performance.now(); this.playing = true; setTimeout(() => this.emit(1), 20); }
  pauseVideo() { this.calls.push("pause"); this.t = this.getCurrentTime(); this.playing = false; setTimeout(() => this.emit(2), 5); }
  seekTo(t) { this.calls.push("seek:" + t); this.t = this.base = t; this.t0 = performance.now(); }
  getCurrentTime() { return this.playing ? this.base + (performance.now() - this.t0) / 1000 : this.t; }
  getDuration() { return 120; }
  mute() { this.muted = true; } unMute() { this.muted = false; }
  setVolume(v) { this.vol = v; }
  getVideoData() { return { title: "Fake video " + this.videoId, video_id: this.videoId }; }
  cueVideoById(o) { this.videoId = o.videoId; this.t = o.startSeconds || 0; setTimeout(() => this.emit(5), 5); }
  destroy() { this.frame.remove(); this.destroyed = true; }
}
window.YT = { Player, PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } };
setTimeout(() => window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady());
`;

function wav(seconds = 1.5, rate = 22050) {
  const samples = Math.floor(seconds * rate);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin((i / rate) * 2 * Math.PI * 440) * 8000), 44 + i * 2);
  return buffer;
}

const COMMONS = {
  query: {
    pages: [
      {
        pageid: 11,
        index: 1,
        title: "File:Air horn blast.ogg",
        videoinfo: [
          {
            url: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Air_horn_blast.ogg",
            descriptionurl: "https://commons.wikimedia.org/wiki/File:Air_horn_blast.ogg",
            mime: "application/ogg",
            duration: 1.5,
            extmetadata: { Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Jane">Jane <b>Doe</b></a>' }, LicenseShortName: { value: "CC BY-SA 4.0" } },
            derivatives: [{ src: "https://upload.wikimedia.org/wikipedia/commons/transcoded/1/1a/Air_horn_blast.ogg/Air_horn_blast.ogg.mp3", type: "audio/mpeg", transcodekey: "mp3" }],
          },
        ],
      },
      {
        pageid: 12,
        index: 2,
        title: 'File:<img src=x onerror="window.__xss=1">.wav',
        videoinfo: [{ url: "https://upload.wikimedia.org/wikipedia/commons/2/2b/x.wav", descriptionurl: "javascript:alert(1)", mime: "audio/wav", extmetadata: {} }],
      },
    ],
  },
};

async function startServer() {
  const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "pipe", detached: true });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("preview server did not start")), 15000);
    server.stdout.on("data", (d) => d.toString().includes(String(PORT)) && (clearTimeout(timer), resolve()));
  });
  return server;
}

async function newPage(browser, options = {}) {
  const context = await browser.newContext(options);
  await context.route("https://www.youtube.com/iframe_api", (route) => route.fulfill({ contentType: "text/javascript", body: FAKE_YT }));
  await context.route("https://commons.wikimedia.org/w/api.php**", (route) =>
    route.fulfill({ contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(COMMONS) }),
  );
  await context.route("https://upload.wikimedia.org/**", (route) =>
    route.fulfill({ contentType: "audio/wav", headers: { "access-control-allow-origin": "*" }, body: wav() }),
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("dialog", (d) => d.accept());
  return { context, page, errors };
}

const shot = async (page, name, fullPage = !name.startsWith("phone")) => SHOTS && page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });
const step = (name) => console.log(`  ✓ ${name}`);

async function desktop(browser) {
  console.log("Desktop");
  const { context, page, errors } = await newPage(browser, { viewport: { width: 1280, height: 860 } });
  await page.goto(BASE);

  await page.getByRole("heading", { name: "How it works" }).waitFor();
  await shot(page, "desktop-help");
  await page.getByRole("button", { name: "Let's go" }).click();
  assert.equal(await page.locator("#dialog[open]").count(), 0);
  step("first-visit help shows and closes");
  await shot(page, "desktop-empty");

  // Add a YouTube clip to the first free key.
  await page.getByRole("button", { name: "Add a YouTube clip" }).click();
  await page.locator("#pad-source").fill(`https://youtu.be/${VIDEO}?t=42`);
  await page.locator("#pad-source").press("Tab");
  await page.waitForFunction(() => document.querySelector(".preview[data-kind=youtube] iframe"));
  await page.waitForFunction(() => document.querySelector("#pad-label").value.startsWith("Fake video"));
  assert.equal(await page.locator("#pad-start").inputValue(), "0:42");
  step("YouTube link creates preview, picks up ?t= and auto-names the pad");

  await page.locator("#pad-start").fill("1:05,5");
  await page.locator("#pad-start").press("Enter");
  assert.equal(await page.locator("#pad-start").inputValue(), "1:05.5");
  await page.locator("#pad-end").fill("1:00");
  await page.locator("#pad-end").press("Enter");
  assert.match(await page.locator("#time-hint").innerText(), /after the start/);
  await page.locator("#pad-end").fill("1:08");
  await page.locator("#pad-end").press("Enter");
  assert.match(await page.locator("#time-hint").innerText(), /0:02.5/);
  await page.locator("[data-set-time=start]").click();
  assert.match(await page.locator("#pad-start").inputValue(), /^\d+:\d\d/);
  await page.locator("#pad-start").fill("1:05.5");
  await page.locator("#pad-start").press("Enter");
  step("start/end validation and Set button");

  // Library from the top bar with nothing selected fills the next free key.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Free sound library" }).click();
  await page.locator(".result").first().waitFor();
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(await page.locator(".result").count(), 2);
  assert.match(await page.locator(".result").nth(1).innerText(), /<img/);
  assert.equal(await page.locator('.result a[href^="javascript"]').count(), 0);
  await shot(page, "desktop-library");
  await page.locator("[data-preview='11']").click();
  await page.locator("[data-use='11']").click();
  await page.waitForFunction(() => !document.querySelector("#dialog").open);
  assert.equal(await page.locator(".key.selected").getAttribute("data-key"), "W");
  assert.match(await page.locator('.key[data-key="Q"]').innerText(), /Fake video/);
  step("library search escapes untrusted text and fills the next free key");

  // Physical keyboard selects keys in edit mode.
  await page.locator("body").click({ position: { x: 5, y: 400 } });
  await page.keyboard.press("e");
  assert.equal(await page.locator(".key.selected").getAttribute("data-key"), "E");
  await page.locator("#pad-source").fill(`https://www.youtube.com/watch?v=${VIDEO}`);
  await page.locator("#pad-source").press("Tab");
  await page.waitForFunction(() => document.querySelector('.key[data-key="E"]').classList.contains("mapped"));
  await page.keyboard.press("Escape");
  await page.locator("body").click({ position: { x: 5, y: 400 } });
  await page.keyboard.press("t");
  await page.getByRole("button", { name: "Free sounds", exact: true }).click();
  await page.locator("[data-use='11']").click();
  await page.waitForFunction(() => document.querySelector('.key[data-key="T"]').classList.contains("mapped"));
  assert.match(await page.locator("#source-hint").innerText(), /Jane Doe · CC BY-SA 4.0/);
  await page.getByRole("radio", { name: "Keep playing" }).click();
  await shot(page, "desktop-edit");
  step("keyboard selection, second YouTube pad and a one-shot library pad");

  // Move Q -> R
  await page.locator('.key[data-key="Q"]').click();
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await page.locator('.key[data-key="R"]').click();
  assert.equal(await page.locator('.key[data-key="Q"]').getAttribute("class").then((c) => c.includes("mapped")), false);
  assert.equal(await page.locator(".key.selected").getAttribute("data-key"), "R");
  step("move pad to another key");

  // Play mode
  await page.locator(".mode-switch [data-mode=play]").click();
  await page.waitForTimeout(150);
  await page.keyboard.down("r");
  await page.waitForFunction(() => document.querySelector('.key[data-key="R"]').classList.contains("live"));
  const calls = await page.evaluate(() => window.__yt.players.map((p) => p.calls.join(",")));
  assert.ok(calls.some((c) => c.includes("seek:65.5") && c.endsWith("play")), `expected a seek+play, got ${calls}`);
  assert.equal(await page.locator(".yt-layer.live").count(), 1);
  await shot(page, "desktop-play-live");
  await page.keyboard.up("r");
  await page.waitForFunction(() => !document.querySelector('.key[data-key="R"]').classList.contains("live"));
  step("hold-to-play YouTube pad starts at the set time and stops on release");

  await page.keyboard.down("r");
  await page.waitForTimeout(2800);
  assert.equal(await page.locator('.key[data-key="R"]').getAttribute("class").then((c) => c.includes("live")), false);
  await page.keyboard.up("r");
  step("clip stops at its end time while still held");

  await page.keyboard.press("t");
  await page.waitForFunction(() => document.querySelector('.key[data-key="T"]').classList.contains("live"));
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.key[data-key="T"]').getAttribute("class").then((c) => c.includes("live")), true);
  await page.waitForFunction(() => !document.querySelector('.key[data-key="T"]').classList.contains("live"), null, { timeout: 4000 });
  step("one-shot audio pad keeps playing after release, stops at the end");

  await page.keyboard.down("w");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector(".key.live"));
  await page.keyboard.up("w");
  step("Escape stops everything");

  await page.locator('.key[data-key="W"]').dispatchEvent("pointerdown", { pointerId: 7, pointerType: "mouse", button: 0, isPrimary: true });
  await page.waitForFunction(() => document.querySelector('.key[data-key="W"]').classList.contains("live"));
  await page.locator('.key[data-key="W"]').dispatchEvent("pointerup", { pointerId: 7, pointerType: "mouse", isPrimary: true });
  await page.waitForFunction(() => !document.querySelector('.key[data-key="W"]').classList.contains("live"));
  step("pointer press and release on pads");

  // Background via the library
  await page.getByRole("button", { name: /Background/ }).click();
  await page.getByRole("button", { name: "Free sounds" }).click();
  await page.locator("[data-use='11']").click();
  await page.waitForFunction(() => !document.querySelector(".bg-toggle").disabled);
  await page.keyboard.press(" ");
  await page.waitForFunction(() => document.querySelector(".bg-toggle").classList.contains("on"));
  await page.keyboard.press(" ");
  await page.waitForFunction(() => !document.querySelector(".bg-toggle").classList.contains("on"));
  step("background track from library toggles with Space");

  // Persistence
  await page.reload();
  await page.locator('.key[data-key="R"].mapped').waitFor();
  assert.equal(await page.locator("#dialog[open]").count(), 0);
  assert.equal(await page.locator(".key.mapped").count(), 4);
  assert.match(await page.locator(".bg-name").innerText(), /Air horn blast/);
  step("kit and background survive a reload; help doesn't reappear");

  // Share
  await page.getByRole("button", { name: "Share or reset your kit" }).click();
  const link = await page.locator("#kit-link").inputValue();
  assert.ok(link.startsWith(BASE + "#kit="));
  await shot(page, "desktop-share");
  await page.keyboard.press("Escape");

  const other = await newPage(browser, { viewport: { width: 1280, height: 860 } });
  await other.page.goto(link);
  await other.page.locator('.key[data-key="R"].mapped').waitFor();
  assert.equal(await other.page.locator(".key.mapped").count(), 4);
  assert.equal(await other.page.evaluate(() => location.hash), "");
  assert.match(await other.page.locator(".bg-name").innerText(), /Air horn blast/);
  assert.deepEqual(other.errors, [], other.errors.join("\n"));
  await other.context.close();
  step("share link recreates the kit in a fresh browser");

  // Remove + undo
  await page.locator('.key[data-key="W"]').click();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  assert.equal(await page.locator(".key.mapped").count(), 3);
  await page.locator(".toast button").click();
  assert.equal(await page.locator(".key.mapped").count(), 4);
  step("remove with undo");

  assert.deepEqual(errors, [], errors.join("\n"));
  await context.close();
}

async function phone(browser) {
  console.log("Phone");
  const { context, page, errors } = await newPage(browser, { ...devices["iPhone 13"] });
  // Seed the original app's storage to check migration too.
  await context.addInitScript((video) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("meme-machine-clips", JSON.stringify([
      { key: "A", url: `https://youtu.be/${video}`, timestamp: "0:15" },
      { key: "S", url: "https://www.youtube.com/watch?v=aaaaaaaaaaa", timestamp: "" },
      { key: "D", url: "", timestamp: "" },
    ]));
    localStorage.setItem("meme-machine-first-visit", "true");
  }, VIDEO);
  await page.goto(BASE);
  await page.locator('.key[data-key="A"].mapped').waitFor();
  assert.equal(await page.locator(".key.mapped").count(), 2);
  assert.equal(await page.locator("#dialog[open]").count(), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem("meme-machine-clips")), null);
  step("old saved clips migrate to the new format");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 0, `page scrolls sideways by ${overflow}px`);
  await shot(page, "phone-edit-empty");

  await page.locator('.key[data-key="A"]').tap();
  await page.waitForFunction(() => document.querySelector(".preview[data-kind=youtube] iframe"));
  await page.waitForTimeout(800); // let the smooth scroll settle before the screenshot
  assert.equal(await page.locator("#pad-start").inputValue(), "0:15");
  await shot(page, "phone-edit-pad");
  const sticky = await page.evaluate(() => getComputedStyle(document.querySelector(".stage-area")).position);
  assert.equal(sticky, "sticky");
  const editorOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(editorOverflow <= 0, `editor scrolls sideways by ${editorOverflow}px`);
  step("tap to edit; preview stays pinned while editing");

  await page.getByRole("button", { name: "Free sound library" }).tap();
  await page.locator(".result").first().waitFor();
  await shot(page, "phone-library");
  await page.locator("[data-use='11']").tap();
  await page.waitForFunction(() => document.querySelector('.key[data-key="A"] .name').textContent.includes("Air horn"));
  step("bottom-sheet library replaces the selected pad");

  await page.locator(".mode-switch [data-mode=play]").tap();
  await page.waitForTimeout(150);
  const visible = await page.locator(".key:visible").count();
  assert.equal(visible, 2, "only mapped pads show on phones in Play mode");
  const size = await page.locator('.key[data-key="S"]').boundingBox();
  assert.ok(size.width >= 90 && size.height >= 88, `pads should be thumb-sized, got ${size.width}×${size.height}`);
  const primed = await page.evaluate(() => window.__yt.players.some((p) => p.calls.includes("play") && p.calls.includes("pause")));
  assert.ok(primed, "YouTube players are warmed up from the Play tap");
  step("big pads on phones; YouTube warmed up on the Play tap");

  // Two fingers at once.
  const a = page.locator('.key[data-key="A"]');
  const s = page.locator('.key[data-key="S"]');
  await a.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch", isPrimary: true });
  await s.dispatchEvent("pointerdown", { pointerId: 2, pointerType: "touch", isPrimary: false });
  await page.waitForFunction(() => document.querySelectorAll(".key.live").length === 2);
  await shot(page, "phone-play-live");
  await s.dispatchEvent("pointerup", { pointerId: 2, pointerType: "touch" });
  await page.waitForFunction(() => document.querySelectorAll(".key.live").length === 1);
  await a.dispatchEvent("pointercancel", { pointerId: 1, pointerType: "touch" });
  await page.waitForFunction(() => !document.querySelector(".key.live"));
  step("multi-touch: pads play together and stop independently");

  const overflowPlay = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflowPlay <= 0, `play mode scrolls sideways by ${overflowPlay}px`);
  await page.getByRole("button", { name: "Help" }).tap();
  await shot(page, "phone-help");
  assert.deepEqual(errors, [], errors.join("\n"));
  await context.close();
}

(async () => {
  if (!fs.existsSync("dist/index.html")) execSync("npx vite build", { stdio: "inherit" });
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch();
  try {
    await desktop(browser);
    await phone(browser);
    console.log("All end-to-end checks passed.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
    process.kill(-server.pid);
  }
})();
