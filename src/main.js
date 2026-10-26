import "./style.css";
import { getAnalyser } from "./audio.js";
import { Background, Engine } from "./engine.js";
import { icon } from "./icons.js";
import { MORE_SOURCES, SUGGESTIONS, searchSounds } from "./library.js";
import { COLOURS, KEYS, ROWS, describeSource, hasSource, newPad, normaliseBackground, padTitle } from "./pads.js";
import { decodeKit, encodeKit } from "./share.js";
import { fileUrl, forgetFile, listFileIds, loadState, migrateLegacy, newFileId, putFile, saveState } from "./storage.js";
import { formatTime, parseTime } from "./time.js";
import { ERROR_MESSAGES, loadYouTubeAPI } from "./youtube.js";

const MAX_UPLOAD = 40 * 1024 * 1024;
const AUDIO_ACCEPT = "audio/*,video/mp4,video/webm,.mp3,.m4a,.wav,.ogg,.opus,.flac,.aac";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const isTouchOnly = () => matchMedia("(hover: none) and (pointer: coarse)").matches;

const state = {
  mode: "edit",
  pads: {},
  background: null,
  seenHelp: false,
  selected: null,
  moving: null,
  errors: {},
  lastKey: null,
};

let engine;
let background;

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

function renderShell() {
  $("#app").innerHTML = `
    <header class="topbar">
      <a class="brand" href="./" aria-label="Meme Machine home">
        <img src="${import.meta.env.BASE_URL}favicon.svg" alt="" width="28" height="28">
        <span>Meme Machine</span>
      </a>
      <div class="mode-switch" role="group" aria-label="Mode">
        <button type="button" data-mode="edit">${icon("pencil")}<span>Edit</span></button>
        <button type="button" data-mode="play">${icon("pads")}<span>Play</span></button>
      </div>
      <nav class="top-actions" aria-label="Tools">
        <button type="button" class="btn ghost" data-action="library" title="Free sound library" aria-label="Free sound library">${icon("search")}<span class="hide-sm">Sounds</span></button>
        <button type="button" class="btn ghost" data-action="kit" title="Share or reset your kit" aria-label="Share or reset your kit">${icon("link")}<span class="hide-sm">Share</span></button>
        <button type="button" class="icon-btn" data-action="help" aria-label="Help">${icon("help")}</button>
      </nav>
    </header>

    <main class="layout">
      <section class="stage-area" aria-label="Stage">
        <div class="stage" id="stage">
          <canvas class="viz" id="viz" aria-hidden="true"></canvas>
          <div class="stage-overlay" id="overlay"></div>
          <div class="preview" id="preview">
            <div class="preview-yt"><div id="preview-yt"></div></div>
            <div class="preview-audio">
              <div class="preview-audio-title" id="preview-audio-title"></div>
              <audio id="preview-audio" controls preload="metadata"></audio>
            </div>
          </div>
          <div class="yt-layers" id="layers"></div>
          <div class="now-playing" id="now-playing" aria-live="polite"></div>
        </div>
        <div class="transport" id="transport"></div>
      </section>

      <section class="editor" id="editor" aria-label="Pad editor"></section>

      <section class="pads" aria-label="Pads">
        <div class="keyboard" id="keyboard"></div>
      </section>
    </main>

    <footer class="footer">
      <span>Made by <strong>Diogo Neves</strong></span>
      <a href="https://github.com/DiogoNeves/meme-machine" target="_blank" rel="noopener noreferrer">GitHub</a>
      <a href="https://www.youtube.com/@DiogoNeves" target="_blank" rel="noopener noreferrer">YouTube</a>
    </footer>

    <div class="toasts" id="toasts" aria-live="polite"></div>
    <dialog class="dialog" id="dialog"></dialog>
    <input type="file" id="file-input" accept="${AUDIO_ACCEPT}" hidden>
  `;
}

// ---------------------------------------------------------------------------
// State changes
// ---------------------------------------------------------------------------

let saveTimer = 0;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 250);
}

function flushSave() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = 0;
  const pads = Object.fromEntries(Object.entries(state.pads).filter(([, pad]) => hasSource(pad) || pad.label));
  if (!saveState({ pads, background: state.background, seenHelp: state.seenHelp })) {
    toast("Couldn't save in this browser (private mode?). Your kit will reset on reload.", { tone: "warn" });
  }
}

function setPads(pads) {
  state.pads = pads;
  engine.sync(pads);
  persist();
  renderKeyboard();
  renderStage();
}

function setPad(key, patch) {
  const current = state.pads[key] ?? newPad(key, nextColour());
  if ("url" in patch || "fileId" in patch) delete state.errors[key];
  setPads({ ...state.pads, [key]: { ...current, ...patch } });
}

function removePad(key) {
  const pad = state.pads[key];
  if (!pad) return;
  engine.stop(key);
  const { [key]: _removed, ...rest } = state.pads;
  if (state.selected === key) state.selected = null;
  setPads(rest);
  renderEditor();
  syncPreview();
  if (hasSource(pad)) {
    toast(`Removed ${padTitle(pad)} from ${key}`, {
      action: "Undo",
      onAction: () => {
        if (state.pads[key]) return toast(`${key} is already in use`, { tone: "warn" });
        setPads({ ...state.pads, [key]: pad });
        selectKey(key);
      },
      onExpire: cleanOrphanFiles,
    });
  }
}

function movePad(from, to) {
  state.moving = null;
  if (from === to || !state.pads[from]) return renderEditor();
  const pads = { ...state.pads };
  const target = pads[to];
  pads[to] = { ...pads[from], key: to };
  if (target) pads[from] = { ...target, key: from };
  else delete pads[from];
  engine.stop(from);
  engine.stop(to);
  setPads(pads);
  state.selected = to;
  renderAll();
  syncPreview();
  toast(target ? `Swapped ${from} and ${to}` : `Moved to ${to}`);
}

function nextColour() {
  const used = Object.values(state.pads).map((pad) => pad.colour);
  return [...COLOURS.keys()].sort((a, b) => used.filter((c) => c === a).length - used.filter((c) => c === b).length)[0];
}

const firstFreeKey = () => KEYS.find((key) => !hasSource(state.pads[key])) ?? null;

function pruneEmpty(except) {
  const pads = { ...state.pads };
  let changed = false;
  for (const [key, pad] of Object.entries(pads)) {
    if (key !== except && !hasSource(pad) && !pad.label) {
      delete pads[key];
      changed = true;
    }
  }
  if (changed) setPads(pads);
}

function selectKey(key) {
  if (state.mode !== "edit") return;
  if (state.moving) return movePad(state.moving, key);
  state.selected = state.selected === key ? null : key;
  if (state.selected && !state.pads[key]) state.pads = { ...state.pads, [key]: newPad(key, nextColour()) };
  pruneEmpty(state.selected);
  renderAll();
  syncPreview();
  if (state.selected && matchMedia("(max-width: 899px)").matches) {
    requestAnimationFrame(() => $("#editor").scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }
}

function setMode(mode) {
  if (state.mode === mode) return;
  state.mode = mode;
  state.moving = null;
  engine.stopAll();
  pausePreview();
  if (mode === "play") {
    state.selected = null;
    pruneEmpty();
    // Must run inside this tap so mobile browsers allow scripted playback later.
    engine.prime();
    background.prime();
  }
  renderAll();
  syncPreview();
}

async function cleanOrphanFiles() {
  try {
    const used = new Set([...Object.values(state.pads), state.background].map((source) => source?.fileId).filter(Boolean));
    for (const id of await listFileIds()) if (!used.has(id)) forgetFile(id);
  } catch {
    // IndexedDB unavailable; nothing stored.
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderAll() {
  document.body.dataset.mode = state.mode;
  document.body.classList.toggle("editing", state.mode === "edit" && Boolean(state.selected));
  $$(".mode-switch button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode)));
  renderKeyboard();
  renderEditor();
  renderTransport();
  renderStage();
}

function kindIcon(pad) {
  if (pad.kind === "youtube") return icon("youtube", "key-kind");
  if (pad.kind) return icon("wave", "key-kind");
  return "";
}

function renderKeyboard() {
  const play = state.mode === "play";
  $("#keyboard").innerHTML = ROWS.map(
    (row) => `<div class="krow">${row
      .split("")
      .map((key) => {
        const pad = state.pads[key];
        const mapped = hasSource(pad);
        const classes = [
          "key",
          mapped && "mapped",
          state.selected === key && "selected",
          state.moving && "drop-target",
          engine?.isActive(key) && "live",
          state.errors[key] && "error",
          pad?.mode === "oneshot" && "oneshot",
        ].filter(Boolean);
        const name = mapped ? padTitle(pad) : "";
        const label = mapped ? `${key}: ${name}` : play ? `${key}: empty` : `${key}: empty, tap to add a sound`;
        return `<button type="button" class="${classes.join(" ")}" data-key="${key}" style="--pad:${COLOURS[pad?.colour ?? 0]}"
          aria-label="${esc(label)}" ${play ? 'tabindex="-1"' : `aria-pressed="${state.selected === key}"`} ${play && !mapped ? "disabled" : ""}>
          <span class="cap">${key}</span>
          ${mapped ? `<span class="name">${esc(name)}</span>${kindIcon(pad)}` : play ? "" : '<span class="plus" aria-hidden="true">+</span>'}
        </button>`;
      })
      .join("")}</div>`,
  ).join("");
}

function updateLiveKeys() {
  for (const el of $$("#keyboard .key")) el.classList.toggle("live", engine.isActive(el.dataset.key));
  const test = $("#editor [data-action=test]");
  if (test && state.selected) {
    const live = engine.isActive(state.selected);
    test.innerHTML = `${icon(live ? "stop" : "play")}<span>${live ? "Stop" : "Test"}</span>`;
  }
  renderNowPlaying();
}

function renderNowPlaying() {
  const pad = state.pads[state.lastKey];
  const live = pad && engine.isActive(pad.key);
  const box = $("#now-playing");
  box.classList.toggle("show", Boolean(live));
  box.classList.toggle("audio-only", Boolean(live && pad.kind !== "youtube"));
  if (live) {
    box.style.setProperty("--pad", COLOURS[pad.colour]);
    box.innerHTML = `<span class="cap">${pad.key}</span><span class="np-title">${esc(padTitle(pad))}</span>`;
  }
}

function renderProgress(progress) {
  for (const [key, value] of Object.entries(progress)) {
    $(`#keyboard .key[data-key="${key}"]`)?.style.setProperty("--p", Math.min(1, value).toFixed(3));
  }
}

function renderStage() {
  const overlay = $("#overlay");
  const pad = state.pads[state.selected];
  const anyPads = Object.values(state.pads).some(hasSource);
  const touch = isTouchOnly();
  let html = "";

  if (state.mode === "play") {
    html = anyPads
      ? `<p class="stage-big">${touch ? "Tap a pad" : "Press a key"}</p>
         <p class="stage-sub">${touch ? "Hold pads to keep them playing" : "Hold to keep playing · <kbd>Space</kbd> background · <kbd>Esc</kbd> stop all"}</p>`
      : `<p class="stage-big">No pads yet</p>
         <p class="stage-sub">Switch to Edit and drop some sounds on the keys.</p>
         <div class="stage-ctas"><button type="button" class="btn primary" data-mode="edit">${icon("pencil")}Start editing</button></div>`;
  } else if (state.moving) {
    html = `<p class="stage-big">Move ${esc(state.moving)}</p><p class="stage-sub">${touch ? "Tap" : "Press or click"} the key you want it on. <kbd>Esc</kbd> cancels.</p>`;
  } else if (pad && !hasSource(pad)) {
    html = `<p class="stage-big">Key ${pad.key}</p>
      <p class="stage-sub">Paste a YouTube link, upload a file or grab a free sound.</p>
      <div class="stage-ctas"><button type="button" class="btn primary" data-action="library">${icon("search")}Browse free sounds</button></div>`;
  } else if (!pad) {
    html = anyPads
      ? `<p class="stage-big">Pick a key to edit</p><p class="stage-sub">Or hit <strong>Play</strong> when you're ready to perform.</p>`
      : `<p class="stage-kicker">YouTube sampler</p>
         <p class="stage-big">Turn any moment into a pad</p>
         <p class="stage-sub">Map clips to your keyboard, then play them like an instrument.</p>
         <div class="stage-ctas">
           <button type="button" class="btn primary" data-action="library">${icon("search")}Free sounds</button>
           <button type="button" class="btn" data-action="first-key">${icon("youtube")}Add a YouTube clip</button>
         </div>`;
  }
  overlay.innerHTML = html;
  overlay.hidden = !html;
  renderNowPlaying();
}

function renderTransport() {
  const bg = state.background;
  const name = bg ? bg.label || bg.credit?.title || (bg.kind === "file" ? bg.fileName : bg.kind === "youtube" ? "YouTube track" : "Audio track") : "";
  $("#transport").innerHTML = `
    <button type="button" class="bg-toggle ${background?.playing ? "on" : ""}" data-action="bg-toggle" ${bg ? "" : "disabled"}
      aria-label="${background?.playing ? "Pause" : "Play"} background track">
      ${icon(background?.playing ? "pause" : "play")}
    </button>
    <button type="button" class="bg-info" data-action="bg-settings">
      <span class="bg-label">${icon("music")}Background</span>
      <span class="bg-name">${bg ? esc(name) : "None. Tap to add a loop"}</span>
    </button>
    ${bg ? `<input type="range" class="bg-volume" min="0" max="100" value="${Math.round(bg.volume * 100)}" aria-label="Background volume">` : ""}
    <button type="button" class="btn stop-all" data-action="stop-all" title="Stop everything (Esc)">${icon("stop")}<span class="hide-sm">Stop</span></button>
  `;
}

function sourceHint(pad) {
  if (state.errors[pad.key]) return `<span class="bad">${esc(state.errors[pad.key])}</span>`;
  if (pad.kind === "file") return `${icon("check")} Uploaded file · <strong>${esc(pad.fileName)}</strong> (stays in this browser)`;
  if (pad.credit) {
    const c = pad.credit;
    return `${icon("check")} “${esc(c.title)}” by ${esc(c.author)} · <a href="${esc(c.page)}" target="_blank" rel="noopener noreferrer">${esc(c.licence)}</a>`;
  }
  if (pad.kind === "youtube") return `${icon("check")} YouTube video`;
  if (pad.kind === "audio") return `${icon("check")} Audio link`;
  return "YouTube link, direct audio link (https), or a free sound from the library.";
}

function renderEditor() {
  const editor = $("#editor");
  const pad = state.pads[state.selected];
  if (state.mode !== "edit") return void (editor.innerHTML = "");
  if (!pad) {
    const count = Object.values(state.pads).filter(hasSource).length;
    editor.innerHTML = `
      <div class="panel empty-panel">
        <h2>Your kit</h2>
        <p>${count ? `${count} of ${KEYS.length} keys loaded.` : "No sounds yet."} ${isTouchOnly() ? "Tap" : "Click or press"} a key to edit it.</p>
        <ul class="tips">
          <li>${icon("youtube")}<span>Paste any YouTube link, then scrub to the moment and hit <strong>Set</strong>.</span></li>
          <li>${icon("search")}<span>Grab free, properly licensed sounds from the <button type="button" class="link" data-action="library">library</button>.</span></li>
          <li>${icon("link")}<span><button type="button" class="link" data-action="kit">Share your kit</button> as a link.</span></li>
        </ul>
      </div>`;
    return;
  }

  const colour = COLOURS[pad.colour];
  editor.innerHTML = `
    <div class="panel" style="--pad:${colour}">
      <div class="editor-head">
        <span class="cap big">${pad.key}</span>
        <input class="label-input" id="pad-label" maxlength="60" placeholder="Name this pad" value="${esc(pad.label)}" aria-label="Pad name" autocomplete="off">
        <button type="button" class="icon-btn" data-action="deselect" aria-label="Close editor">${icon("close")}</button>
      </div>

      <div class="field">
        <label for="pad-source">Sound</label>
        <input id="pad-source" type="url" inputmode="url" autocomplete="off" spellcheck="false"
          placeholder="https://youtu.be/…" value="${esc(pad.kind === "file" ? "" : pad.url)}">
        <p class="hint" id="source-hint">${sourceHint(pad)}</p>
        <div class="row">
          <button type="button" class="btn small" data-action="library">${icon("search")}Free sounds</button>
          <button type="button" class="btn small" data-action="upload">${icon("upload")}Upload</button>
        </div>
      </div>

      <div class="times">
        ${timeField("start", "Start", pad.start)}
        ${timeField("end", "End", pad.end, "optional")}
      </div>
      <p class="hint" id="time-hint">Scrub the preview, then hit <strong>Set</strong>. Formats: 1:23.5, 83.5, 1m23s</p>

      <div class="field">
        <span class="label">When the pad is released</span>
        <div class="segmented" role="radiogroup" aria-label="Playback mode">
          <button type="button" role="radio" data-pmode="hold" aria-checked="${pad.mode === "hold"}">Stop</button>
          <button type="button" role="radio" data-pmode="oneshot" aria-checked="${pad.mode === "oneshot"}">Keep playing</button>
        </div>
      </div>

      <div class="field split">
        <label for="pad-volume">Volume</label>
        <input id="pad-volume" type="range" min="0" max="100" value="${Math.round(pad.volume * 100)}">
      </div>

      <div class="field split">
        <span class="label">Colour</span>
        <div class="swatches" role="radiogroup" aria-label="Pad colour">
          ${COLOURS.map((c, i) => `<button type="button" role="radio" class="swatch" style="--c:${c}" data-colour="${i}" aria-checked="${i === pad.colour}" aria-label="Colour ${i + 1}"></button>`).join("")}
        </div>
      </div>

      <div class="editor-foot">
        <button type="button" class="btn primary" data-action="test" ${hasSource(pad) ? "" : "disabled"}>${icon("play")}<span>Test</span></button>
        <button type="button" class="btn" data-action="move" ${hasSource(pad) ? "" : "disabled"}>${icon("move")}<span>Move</span></button>
        <button type="button" class="btn danger" data-action="remove">${icon("trash")}<span>Remove</span></button>
      </div>
    </div>`;
  bindEditorInputs(pad.key);
  updateLiveKeys();
}

function timeField(name, label, value, note = "") {
  return `<div class="field">
    <label for="pad-${name}">${label}${note ? ` <small>${note}</small>` : ""}</label>
    <div class="input-group">
      <input id="pad-${name}" data-time="${name}" inputmode="decimal" autocomplete="off" placeholder="${name === "start" ? "0:00" : "end of clip"}" value="${value == null ? "" : formatTime(value)}">
      <button type="button" class="btn small" data-set-time="${name}" title="Use the preview's current time">Set</button>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Editor behaviour
// ---------------------------------------------------------------------------

function bindEditorInputs(key) {
  const label = $("#pad-label");
  label.addEventListener("input", () => {
    setPad(key, { label: label.value.trim().slice(0, 60) });
  });

  const source = $("#pad-source");
  let timer = 0;
  const apply = () => {
    clearTimeout(timer);
    applySource(key, source.value);
  };
  source.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(apply, 500);
  });
  source.addEventListener("change", apply);
  source.addEventListener("paste", () => setTimeout(apply));

  for (const input of $$("[data-time]")) {
    input.addEventListener("input", () => input.classList.toggle("invalid", Number.isNaN(parseTime(input.value))));
    input.addEventListener("change", () => commitTime(key, input));
    input.addEventListener("keydown", (event) => event.key === "Enter" && input.blur());
  }

  $("#pad-volume").addEventListener("input", (event) => setPad(key, { volume: Number(event.target.value) / 100 }));
}

function applySource(key, value) {
  const pad = state.pads[key];
  if (!pad) return;
  const hint = $("#source-hint");
  const text = value.trim();
  if (!text) {
    if (pad.kind && pad.kind !== "file") {
      engine.stop(key);
      setPad(key, { kind: null, url: "", videoId: null, credit: null });
      renderEditor();
      syncPreview();
    }
    return;
  }
  const described = describeSource(text);
  if (!described) {
    hint.innerHTML = `<span class="bad">${
      /^http:/i.test(text)
        ? "Use an https:// link. Browsers block insecure audio on this page."
        : "That doesn't look like a YouTube link or an https:// audio link."
    }</span>`;
    return;
  }
  if (described.kind === pad.kind && described.url === pad.url) return;
  // A new sound gets fresh timings (a YouTube ?t= link supplies its own start).
  const patch = { kind: described.kind, url: described.url, videoId: described.videoId ?? null, fileId: "", fileName: "", credit: null, start: described.start ?? null, end: null };
  engine.stop(key);
  setPad(key, patch);
  renderEditor();
  syncPreview();
  cleanOrphanFiles();
}

function commitTime(key, input) {
  const pad = state.pads[key];
  const value = parseTime(input.value);
  const hint = $("#time-hint");
  if (Number.isNaN(value)) {
    input.classList.add("invalid");
    hint.innerHTML = `<span class="bad">Couldn't read “${esc(input.value)}”. Try 1:23.5, 83.5 or 1m23s.</span>`;
    return;
  }
  const next = { ...pad, [input.dataset.time]: value };
  if (next.end != null && next.end <= (next.start ?? 0)) {
    input.classList.add("invalid");
    hint.innerHTML = `<span class="bad">The end needs to be after the start (${formatTime(next.start ?? 0)}).</span>`;
    return;
  }
  input.classList.remove("invalid");
  input.value = value == null ? "" : formatTime(value);
  hint.innerHTML = clipLength(next);
  setPad(key, { [input.dataset.time]: value });
}

function clipLength(pad) {
  return pad.end != null ? `Clip length: <strong>${formatTime(pad.end - (pad.start ?? 0))}</strong>` : "Plays from the start until you release (or the video ends).";
}

function setTimeFromPreview(which) {
  const key = state.selected;
  const time = previewTime();
  if (time == null) return toast("Load a sound first, then scrub the preview to the right moment.", { tone: "warn" });
  const input = $(`#pad-${which}`);
  input.value = formatTime(time);
  commitTime(key, input);
}

async function uploadFile(file, target) {
  if (!file) return;
  if (!/^(audio|video)\//.test(file.type) && !/\.(mp3|m4a|wav|ogg|opus|flac|aac|webm|mp4)$/i.test(file.name)) {
    return toast("That doesn't look like an audio file.", { tone: "warn" });
  }
  if (file.size > MAX_UPLOAD) return toast("That file is over 40 MB. Try a shorter clip.", { tone: "warn" });
  const fileId = newFileId();
  try {
    await putFile(fileId, file, file.name);
  } catch {
    return toast("This browser wouldn't store the file (private mode?).", { tone: "warn" });
  }
  const source = { kind: "file", fileId, fileName: file.name.slice(0, 200), url: "", videoId: null, credit: null };
  if (target.type === "background") {
    setBackground(normaliseBackground({ ...source, volume: state.background?.volume ?? 1 }));
  } else {
    const pad = state.pads[target.key];
    engine.stop(target.key);
    setPad(target.key, { ...source, start: null, end: null, label: pad?.label || file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 60) });
    renderEditor();
    syncPreview();
  }
  cleanOrphanFiles();
}

let uploadTarget = null;
function pickFile(target) {
  uploadTarget = target;
  const input = $("#file-input");
  input.value = "";
  input.click();
}

// ---------------------------------------------------------------------------
// Edit preview (YouTube player with controls, or a native audio player)
// ---------------------------------------------------------------------------

const preview = { player: null, ready: false, videoId: null, creating: null };

function ensurePreviewPlayer(videoId, start) {
  preview.creating ??= loadYouTubeAPI().then(
    (YT) =>
      new Promise((resolve) => {
        preview.videoId = videoId;
        preview.player = new YT.Player("preview-yt", {
          width: "100%",
          height: "100%",
          videoId,
          playerVars: { playsinline: 1, rel: 0, iv_load_policy: 3, start: Math.floor(start ?? 0) },
          events: {
            onReady: () => {
              preview.ready = true;
              resolve(preview.player);
              autoLabelFromPreview();
            },
            onStateChange: () => autoLabelFromPreview(),
            onError: (event) => {
              const key = state.selected;
              if (key && state.pads[key]?.videoId === preview.videoId) {
                state.errors[key] = ERROR_MESSAGES[event.data] ?? ERROR_MESSAGES[5];
                renderKeyboard();
                const hint = $("#source-hint");
                if (hint) hint.innerHTML = sourceHint(state.pads[key]);
              }
            },
          },
        });
      }),
  );
  return preview.creating;
}

function autoLabelFromPreview() {
  const key = state.selected;
  const pad = state.pads[key];
  if (!pad || pad.kind !== "youtube" || pad.label || !preview.ready) return;
  const data = preview.player.getVideoData?.();
  if (!data?.title || data.video_id !== pad.videoId) return;
  const label = data.title.slice(0, 60);
  setPad(key, { label });
  const input = $("#pad-label");
  if (input && document.activeElement !== input && !input.value) input.value = label;
}

async function syncPreview() {
  const box = $("#preview");
  const pad = state.mode === "edit" ? state.pads[state.selected] : null;
  const kind = pad?.kind ?? "";
  box.dataset.kind = kind;
  const audio = $("#preview-audio");

  if (kind !== "youtube" && preview.ready) preview.player.pauseVideo();
  if (kind !== "audio" && kind !== "file") {
    audio.pause();
    audio.removeAttribute("src");
  }

  if (kind === "youtube") {
    try {
      const player = await ensurePreviewPlayer(pad.videoId, pad.start);
      const current = state.mode === "edit" ? state.pads[state.selected] : null;
      if (current?.videoId !== pad.videoId) return;
      if (preview.videoId !== pad.videoId) {
        preview.videoId = pad.videoId;
        player.cueVideoById({ videoId: pad.videoId, startSeconds: pad.start ?? 0 });
      }
    } catch {
      toast(ERROR_MESSAGES.api, { tone: "warn" });
    }
  } else if (kind === "audio" || kind === "file") {
    $("#preview-audio-title").textContent = padTitle(pad);
    try {
      const src = kind === "file" ? await fileUrl(pad.fileId) : pad.url;
      if (audio.getAttribute("src") !== src) {
        audio.src = src;
        audio.addEventListener("loadedmetadata", () => (audio.currentTime = pad.start ?? 0), { once: true });
      }
    } catch {
      state.errors[pad.key] = "The uploaded file is missing from this browser. Upload it again.";
      renderKeyboard();
    }
  }
}

function previewTime() {
  const kind = $("#preview").dataset.kind;
  if (kind === "youtube" && preview.ready) return Math.round(preview.player.getCurrentTime() * 100) / 100;
  if (kind === "audio" || kind === "file") return Math.round($("#preview-audio").currentTime * 100) / 100;
  return null;
}

function pausePreview() {
  if (preview.ready) preview.player.pauseVideo();
  $("#preview-audio")?.pause();
}

// ---------------------------------------------------------------------------
// Background track
// ---------------------------------------------------------------------------

function setBackground(source) {
  state.background = source;
  background.set(source);
  persist();
  renderTransport();
  if (source && $("#dialog").open && $("#dialog").dataset.kind === "background") openBackgroundDialog();
}

function openBackgroundDialog() {
  const bg = state.background;
  openDialog({
    kind: "background",
    title: "Background track",
    body: `
      <p class="muted">A loop that plays under your pads. Toggle it with the play button${isTouchOnly() ? "" : " or <kbd>Space</kbd> in Play mode"}.</p>
      <div class="field">
        <label for="bg-source">YouTube or audio link</label>
        <input id="bg-source" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://youtu.be/…"
          value="${esc(bg && bg.kind !== "file" ? bg.url : "")}">
        <p class="hint" id="bg-hint">${bg ? `${icon("check")} ${esc(bg.kind === "file" ? `Uploaded file · ${bg.fileName}` : bg.credit ? `“${bg.credit.title}” by ${bg.credit.author} · ${bg.credit.licence}` : bg.kind === "youtube" ? "YouTube video" : "Audio link")}` : "Nothing set yet."}</p>
      </div>
      <div class="row">
        <button type="button" class="btn" data-action="bg-library">${icon("search")}Free sounds</button>
        <button type="button" class="btn" data-action="bg-upload">${icon("upload")}Upload</button>
        ${bg ? `<button type="button" class="btn danger" data-action="bg-clear">${icon("trash")}Remove</button>` : ""}
      </div>`,
    setup(dialog) {
      const input = $("#bg-source", dialog);
      input.addEventListener("change", () => {
        const text = input.value.trim();
        if (!text) return;
        const described = describeSource(text);
        if (!described) {
          $("#bg-hint", dialog).innerHTML = `<span class="bad">Paste a YouTube link or an https:// audio link.</span>`;
          return;
        }
        setBackground(normaliseBackground({ ...described, volume: state.background?.volume ?? 1 }));
        cleanOrphanFiles();
      });
      dialog.addEventListener("click", (event) => {
        const action = event.target.closest("[data-action]")?.dataset.action;
        if (action === "bg-library") openLibrary({ type: "background" });
        if (action === "bg-upload") pickFile({ type: "background" });
        if (action === "bg-clear") {
          setBackground(null);
          cleanOrphanFiles();
          closeDialog();
        }
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Dialogs, toasts
// ---------------------------------------------------------------------------

let dialogCleanup = null;

function openDialog({ kind, title, body, setup, onClose }) {
  closeDialog();
  const dialog = $("#dialog");
  dialog.dataset.kind = kind;
  dialog.innerHTML = `
    <div class="dialog-inner">
      <div class="dialog-head">
        <h2>${title}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Close">${icon("close")}</button>
      </div>
      <div class="dialog-body">${body}</div>
    </div>`;
  dialogCleanup = onClose ?? null;
  // Listeners go on the inner wrapper, which is replaced each time, so they never pile up.
  setup?.($(".dialog-inner", dialog));
  dialog.showModal();
  dialog.scrollTop = 0;
}

function closeDialog() {
  const dialog = $("#dialog");
  dialogCleanup?.();
  dialogCleanup = null;
  if (dialog.open) dialog.close();
}

let toastId = 0;
function toast(message, { action, onAction, onExpire, tone = "info", timeout = action ? 6000 : 3500 } = {}) {
  const id = ++toastId;
  const el = document.createElement("div");
  el.className = `toast ${tone}`;
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button">${esc(action)}</button>` : ""}`;
  const dismiss = () => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 250);
  };
  el.querySelector("button")?.addEventListener("click", () => {
    onAction?.();
    onExpire = null;
    dismiss();
  });
  $("#toasts").append(el);
  setTimeout(() => {
    onExpire?.();
    dismiss();
  }, timeout);
  return id;
}

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

function openLibrary(target) {
  const libTarget = target ?? (state.selected ? { type: "pad", key: state.selected } : null);
  const audio = new Audio();
  let controller = null;
  let playingId = null;

  const destination =
    libTarget?.type === "background"
      ? "Pick a loop for the background."
      : libTarget?.key
        ? `Adding to key <span class="cap inline">${libTarget.key}</span>`
        : "Sounds go onto the next free key.";

  openDialog({
    kind: "library",
    title: "Free sound library",
    body: `
      <p class="muted">${destination} Everything here comes from <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> and is free to use. Credits are saved with each pad.</p>
      <form class="search" role="search">
        <input type="search" name="q" placeholder="Search sounds…" aria-label="Search sounds" autocomplete="off" enterkeyhint="search">
        <button type="submit" class="btn primary">${icon("search")}<span class="hide-sm">Search</span></button>
      </form>
      <div class="chips">${SUGGESTIONS.map((s) => `<button type="button" class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join("")}</div>
      <ul class="results" id="results" aria-live="polite"></ul>
      <details class="more-sources">
        <summary>More free libraries</summary>
        <ul>${MORE_SOURCES.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}${icon("external", "icon tiny")}</a><span>${esc(s.note)}</span></li>`).join("")}</ul>
      </details>`,
    onClose() {
      controller?.abort();
      audio.pause();
      audio.removeAttribute("src");
    },
    setup(dialog) {
      const results = $("#results", dialog);
      const form = $("form", dialog);
      let sounds = [];

      const run = async (query) => {
        if (!query.trim()) return;
        form.q.value = query;
        controller?.abort();
        controller = new AbortController();
        results.innerHTML = `<li class="status"><span class="spinner"></span>Searching…</li>`;
        try {
          sounds = await searchSounds(query, { signal: controller.signal });
          results.innerHTML = sounds.length
            ? sounds.map(resultRow).join("")
            : `<li class="status">Nothing found for “${esc(query)}”. Try a simpler word.</li>`;
        } catch (error) {
          if (error.name === "AbortError") return;
          results.innerHTML = `<li class="status bad">Couldn't reach Wikimedia Commons. Check your connection and try again.</li>`;
        }
      };

      const resultRow = (sound) => `
        <li class="result" data-id="${sound.id}">
          <button type="button" class="icon-btn round" data-preview="${sound.id}" aria-label="Preview ${esc(sound.title)}">${icon("play")}</button>
          <div class="result-text">
            <strong>${esc(sound.title)}</strong>
            <span>${esc(sound.credit.author)} · <a href="${esc(sound.credit.page)}" target="_blank" rel="noopener noreferrer">${esc(sound.credit.licence)}</a>${sound.duration ? ` · ${formatTime(sound.duration)}` : ""}</span>
          </div>
          <button type="button" class="btn small primary" data-use="${sound.id}">Use</button>
        </li>`;

      const setPreviewIcon = (id, playing) => {
        const button = $(`[data-preview="${id}"]`, dialog);
        if (button) button.innerHTML = icon(playing ? "stop" : "play");
      };
      audio.addEventListener("ended", () => {
        setPreviewIcon(playingId, false);
        playingId = null;
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        run(form.q.value);
      });
      dialog.addEventListener("click", (event) => {
        const chip = event.target.closest("[data-q]");
        if (chip) return run(chip.dataset.q);

        const previewButton = event.target.closest("[data-preview]");
        if (previewButton) {
          const id = Number(previewButton.dataset.preview);
          const sound = sounds.find((s) => s.id === id);
          if (playingId !== null) setPreviewIcon(playingId, false);
          if (playingId === id) {
            audio.pause();
            playingId = null;
            return;
          }
          playingId = id;
          audio.src = sound.src;
          audio.play().catch(() => toast("Couldn't play that preview.", { tone: "warn" }));
          setPreviewIcon(id, true);
          return;
        }

        const use = event.target.closest("[data-use]");
        if (use) {
          const sound = sounds.find((s) => s.id === Number(use.dataset.use));
          if (sound) useSound(sound, libTarget);
        }
      });

      run(SUGGESTIONS[0]);
      if (!isTouchOnly()) form.q.focus();
    },
  });
}

function useSound(sound, target) {
  const source = { url: sound.src, label: sound.title.slice(0, 60), credit: sound.credit };
  if (target?.type === "background") {
    setBackground(normaliseBackground({ ...source, volume: state.background?.volume ?? 1 }));
    closeDialog();
    cleanOrphanFiles();
    return toast(`Background set to “${sound.title}”`);
  }
  const key = target?.key ?? firstFreeKey();
  if (!key) return toast("Every key is taken. Remove a pad first.", { tone: "warn" });
  const described = describeSource(sound.src);
  engine.stop(key);
  setPad(key, { ...source, kind: described.kind, videoId: null, fileId: "", fileName: "", start: null, end: null });
  closeDialog();
  if (state.mode !== "edit") setMode("edit");
  state.selected = key;
  renderAll();
  syncPreview();
  cleanOrphanFiles();
  toast(`Added “${sound.title}” to ${key}`);
}

// ---------------------------------------------------------------------------
// Sharing and help
// ---------------------------------------------------------------------------

function kitLink() {
  return `${location.origin}${location.pathname}#kit=${encodeKit(state)}`;
}

function openKitDialog() {
  const pads = Object.values(state.pads).filter(hasSource);
  const uploads = pads.filter((pad) => pad.kind === "file").length + (state.background?.kind === "file" ? 1 : 0);
  const shareable = pads.length - pads.filter((pad) => pad.kind === "file").length;
  openDialog({
    kind: "kit",
    title: "Share your kit",
    body: `
      ${shareable
        ? `<p class="muted">Anyone with this link gets your pads, timings and colours.</p>
           <div class="input-group">
             <input id="kit-link" readonly value="${esc(kitLink())}" aria-label="Share link">
             <button type="button" class="btn primary" data-action="copy">${icon("copy")}Copy</button>
           </div>
           ${uploads ? `<p class="hint">${uploads} uploaded file${uploads > 1 ? "s aren't" : " isn't"} included. Uploads stay in this browser.</p>` : ""}`
        : `<p class="muted">Add some YouTube or library sounds first, then share them with a link.</p>`}
      <hr>
      <h3>Start over</h3>
      <p class="muted">Clears every pad and the background track on this device.</p>
      <button type="button" class="btn danger" data-action="reset" ${pads.length || state.background ? "" : "disabled"}>${icon("trash")}Clear kit</button>`,
    setup(dialog) {
      dialog.addEventListener("click", async (event) => {
        const action = event.target.closest("[data-action]")?.dataset.action;
        if (action === "copy") {
          const input = $("#kit-link", dialog);
          try {
            await navigator.clipboard.writeText(input.value);
            toast("Link copied");
          } catch {
            input.select();
            toast("Select the link and copy it", { tone: "warn" });
          }
        }
        if (action === "reset") {
          if (!confirm("Clear every pad and the background track?")) return;
          engine.stopAll();
          state.selected = null;
          setPads({});
          setBackground(null);
          cleanOrphanFiles();
          renderAll();
          syncPreview();
          closeDialog();
          toast("Kit cleared");
        }
      });
    },
  });
}

function readSharedKit() {
  const match = location.hash.match(/^#kit=([\w-]+)$/);
  if (!match) return null;
  history.replaceState(null, "", location.pathname + location.search);
  const kit = decodeKit(match[1]);
  if (!kit) toast("That share link looks broken.", { tone: "warn" });
  return kit;
}

function loadKit(kit) {
  engine.stopAll();
  state.selected = null;
  setPads(kit.pads);
  if (kit.background) setBackground(kit.background);
  cleanOrphanFiles();
  renderAll();
  syncPreview();
  toast(`Loaded ${Object.keys(kit.pads).length} pads`);
}

function offerSharedKit(kit) {
  const count = Object.keys(kit.pads).length;
  const mine = Object.values(state.pads).filter(hasSource).length;
  if (!mine) return loadKit(kit);
  openDialog({
    kind: "shared",
    title: "Load shared kit?",
    body: `
      <p class="muted">This link has <strong>${count} pad${count === 1 ? "" : "s"}</strong>${kit.background ? " and a background track" : ""}. Loading it replaces your current ${mine} pad${mine === 1 ? "" : "s"}.</p>
      <div class="row end">
        <button type="button" class="btn" data-close>Keep mine</button>
        <button type="button" class="btn primary" data-action="load">Load kit</button>
      </div>`,
    setup(dialog) {
      $("[data-action=load]", dialog).addEventListener("click", () => {
        closeDialog();
        loadKit(kit);
      });
    },
  });
}

function openHelp() {
  const credits = [...Object.values(state.pads), state.background].filter((source) => source?.credit);
  openDialog({
    kind: "help",
    title: "How it works",
    onClose() {
      if (!state.seenHelp) {
        state.seenHelp = true;
        persist();
      }
    },
    body: `
      <ol class="steps">
        <li><span class="step-n">1</span><div><strong>Pick a key</strong><p>In <em>Edit</em>, ${isTouchOnly() ? "tap" : "click (or press)"} any key on the keyboard.</p></div></li>
        <li><span class="step-n">2</span><div><strong>Give it a sound</strong><p>Paste a YouTube link, upload audio, or grab a free sound from the library.</p></div></li>
        <li><span class="step-n">3</span><div><strong>Find the moment</strong><p>Scrub the preview and hit <em>Set</em> for the start (and optionally the end).</p></div></li>
        <li><span class="step-n">4</span><div><strong>Perform</strong><p>Switch to <em>Play</em>. Hold keys or pads to play clips; let go to stop. Choose <em>Keep playing</em> for clips that should run to the end.</p></div></li>
      </ol>
      <div class="help-grid">
        <div><h3>Keyboard</h3><p><kbd>A</kbd>–<kbd>Z</kbd> play pads<br><kbd>Space</kbd> background on/off<br><kbd>Esc</kbd> stop everything</p></div>
        <div><h3>On a phone</h3><p>Tap <em>Play</em> first, then use several fingers at once. Turn off silent mode on iPhone to hear sound.</p></div>
      </div>
      <p class="muted small">Everything is saved in this browser. Respect creators: credit the sounds you use and check each licence before publishing.</p>
      ${credits.length
        ? `<h3>Credits for this kit</h3><ul class="credits">${credits
            .map((s) => `<li>“${esc(s.credit.title)}” by ${esc(s.credit.author)} · <a href="${esc(s.credit.page)}" target="_blank" rel="noopener noreferrer">${esc(s.credit.licence)}</a></li>`)
            .join("")}</ul>`
        : ""}
      <div class="row end"><button type="button" class="btn primary" data-close>Let's go</button></div>`,
  });
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const heldKeys = new Set();
const pointers = new Map();

const isTyping = (el) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

function letterFrom(event) {
  if (/^[a-z]$/i.test(event.key)) return event.key.toUpperCase();
  // Non-Latin layouts: fall back to the physical key position.
  const code = event.code?.match(/^Key([A-Z])$/)?.[1];
  return event.key.length === 1 && code ? code : null;
}

function trigger(key) {
  if (!hasSource(state.pads[key])) return;
  state.lastKey = key;
  engine.trigger(key);
}

function onKeyDown(event) {
  if (event.metaKey || event.ctrlKey || event.altKey || $("#dialog").open || isTyping(event.target)) return;
  const key = letterFrom(event);
  if (state.mode === "play") {
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) toggleBackground();
    } else if (event.key === "Escape") {
      stopEverything();
    } else if (key && hasSource(state.pads[key])) {
      event.preventDefault();
      if (!event.repeat && !heldKeys.has(key)) {
        heldKeys.add(key);
        trigger(key);
      }
    }
    return;
  }
  if (event.key === "Escape") {
    if (state.moving) {
      state.moving = null;
      renderAll();
    } else if (state.selected) {
      selectKey(state.selected);
    }
  } else if (key && !event.repeat) {
    event.preventDefault();
    selectKey(key);
  }
}

function onKeyUp(event) {
  const key = letterFrom(event);
  if (key && heldKeys.delete(key)) engine.release(key);
}

function releaseAll() {
  for (const key of heldKeys) engine.release(key);
  heldKeys.clear();
  for (const key of pointers.values()) engine.release(key);
  pointers.clear();
}

function toggleBackground() {
  if (!state.background) return openBackgroundDialog();
  background.toggle();
}

function stopEverything() {
  engine.stopAll();
  background.pause();
}

function bindEvents() {
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", releaseAll);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    releaseAll();
    flushSave();
  });
  window.addEventListener("pagehide", flushSave);

  document.addEventListener("click", (event) => {
    const modeButton = event.target.closest("button[data-mode]");
    if (modeButton) return setMode(modeButton.dataset.mode);
    if (event.target.closest("[data-close]")) return closeDialog();

    const keyButton = event.target.closest("#keyboard .key");
    if (keyButton && state.mode === "edit") return selectKey(keyButton.dataset.key);

    const pmode = event.target.closest("[data-pmode]");
    if (pmode && state.selected) {
      setPad(state.selected, { mode: pmode.dataset.pmode });
      return renderEditor();
    }
    const swatch = event.target.closest("[data-colour]");
    if (swatch && state.selected) {
      setPad(state.selected, { colour: Number(swatch.dataset.colour) });
      return renderEditor();
    }
    const setTime = event.target.closest("[data-set-time]");
    if (setTime) return setTimeFromPreview(setTime.dataset.setTime);

    const action = event.target.closest("[data-action]")?.dataset.action;
    switch (action) {
      case "library":
        return openLibrary();
      case "kit":
        return openKitDialog();
      case "help":
        return openHelp();
      case "first-key":
        return selectKey(firstFreeKey() ?? "A");
      case "deselect":
        return selectKey(state.selected);
      case "upload":
        return pickFile({ type: "pad", key: state.selected });
      case "remove":
        return removePad(state.selected);
      case "move":
        state.moving = state.selected;
        renderAll();
        return;
      case "test": {
        const key = state.selected;
        if (engine.isActive(key)) return engine.stop(key);
        pausePreview();
        state.lastKey = key;
        return engine.trigger(key, { latch: true });
      }
      case "bg-toggle":
        return toggleBackground();
      case "bg-settings":
        return openBackgroundDialog();
      case "stop-all":
        return stopEverything();
    }
  });

  document.addEventListener("input", (event) => {
    if (!event.target.matches(".bg-volume") || !state.background) return;
    state.background = { ...state.background, volume: Number(event.target.value) / 100 };
    background.setVolume(state.background.volume);
    persist();
  });

  $("#file-input").addEventListener("change", (event) => {
    if (uploadTarget) uploadFile(event.target.files[0], uploadTarget);
  });

  // Close dialogs by clicking the backdrop.
  $("#dialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeDialog();
  });
  $("#dialog").addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });

  // Pads: pointer events give us multi-touch and press-and-hold on phones.
  const keyboard = $("#keyboard");
  keyboard.addEventListener("pointerdown", (event) => {
    if (state.mode !== "play" || (event.pointerType === "mouse" && event.button !== 0)) return;
    const el = event.target.closest(".key.mapped");
    if (!el) return;
    event.preventDefault();
    try {
      el.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic or already-released pointer; the press still counts.
    }
    pointers.set(event.pointerId, el.dataset.key);
    trigger(el.dataset.key);
  });
  const lift = (event) => {
    const key = pointers.get(event.pointerId);
    if (!key) return;
    pointers.delete(event.pointerId);
    if (![...pointers.values()].includes(key) && !heldKeys.has(key)) engine.release(key);
  };
  keyboard.addEventListener("pointerup", lift);
  keyboard.addEventListener("pointercancel", lift);
  keyboard.addEventListener("lostpointercapture", lift);
  keyboard.addEventListener("contextmenu", (event) => state.mode === "play" && event.preventDefault());

  window.addEventListener("hashchange", () => {
    const kit = readSharedKit();
    if (kit) offerSharedKit(kit);
  });
}

// ---------------------------------------------------------------------------
// Visualiser
// ---------------------------------------------------------------------------

function startVisualiser() {
  const canvas = $("#viz");
  const ctx = canvas.getContext("2d");
  const bars = 40;
  const gap = 3;
  let data = new Uint8Array(128);
  let energy = 0;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const frame = (time) => {
    requestAnimationFrame(frame);
    const { clientWidth: w, clientHeight: h } = canvas;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const analyser = getAnalyser();
    if (analyser) {
      if (data.length !== analyser.frequencyBinCount) data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
    }
    // YouTube audio can't be analysed (cross-origin), so animate from activity instead.
    const target = engine.active.size || background.playing ? 1 : 0;
    energy += (target - energy) * 0.08;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const pad = state.pads[state.lastKey];
    const colour = pad && engine.isActive(pad.key) ? COLOURS[pad.colour] : "#ff4d6d";
    const barWidth = (w - gap * (bars - 1)) / bars;
    if (barWidth <= 1 || h <= 0) return;
    const t = reduceMotion.matches ? 0 : time;
    for (let i = 0; i < bars; i++) {
      const centre = Math.abs(i - (bars - 1) / 2) / (bars / 2);
      const bin = data[Math.floor((1 - centre) * data.length * 0.6)] / 255;
      const synthetic = energy * (0.28 + 0.22 * Math.sin(t / 170 + i * 0.7)) * (1 - centre * 0.6);
      const idle = 0.035 + 0.02 * Math.sin(t / 900 + i * 0.4);
      const level = Math.max(bin, synthetic, idle);
      const barHeight = Math.max(2, level * h * 0.55);
      ctx.globalAlpha = 0.18 + level * 0.5;
      ctx.fillStyle = colour;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(i * (barWidth + gap), h - barHeight, barWidth, barHeight, Math.min(4, barWidth / 2));
      else ctx.rect(i * (barWidth + gap), h - barHeight, barWidth, barHeight);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function init() {
  renderShell();
  const migrated = await migrateLegacy().catch(() => null);
  Object.assign(state, migrated ?? loadState());

  engine = new Engine({
    layer: $("#layers"),
    resolveFile: fileUrl,
    onChange: updateLiveKeys,
    onProgress: renderProgress,
    onError(key, code) {
      const message = ERROR_MESSAGES[code] ?? "Couldn't load that sound. Check the link still works.";
      if (state.errors[key] === message) return;
      state.errors[key] = message;
      renderKeyboard();
      if (state.selected === key) {
        const hint = $("#source-hint");
        if (hint) hint.innerHTML = sourceHint(state.pads[key]);
      }
      toast(`${key}: ${message}`, { tone: "warn" });
    },
  });
  background = new Background({
    layer: $("#layers"),
    resolveFile: fileUrl,
    onChange: renderTransport,
    onError(code) {
      if (code === "blocked") return toast("Tap the play button to start the background track.", { tone: "warn" });
      toast(`Background: ${ERROR_MESSAGES[code] ?? "couldn't load that track."}`, { tone: "warn" });
    },
  });

  engine.sync(state.pads);
  background.set(state.background);
  renderAll();
  bindEvents();
  startVisualiser();

  const shared = readSharedKit();
  if (shared) offerSharedKit(shared);
  else if (!state.seenHelp) openHelp();
  cleanOrphanFiles();
}

init();
