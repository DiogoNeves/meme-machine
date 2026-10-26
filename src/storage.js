import { describeSource, normaliseBackground, normalisePads } from "./pads.js";

const STATE_KEY = "meme-machine:v2";
const LEGACY = {
  clips: "meme-machine-clips",
  backgroundTrack: "meme-machine-background-track",
  backgroundAudioData: "meme-machine-background-audio-data",
  backgroundAudioName: "meme-machine-background-audio-name",
  settings: "meme-machine-settings",
  firstVisit: "meme-machine-first-visit",
};

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage unavailable (private mode); nothing to clean up.
  }
}

export function loadState() {
  let saved = null;
  try {
    saved = JSON.parse(read(STATE_KEY));
  } catch {
    saved = null;
  }
  return {
    pads: normalisePads(saved?.pads),
    background: normaliseBackground(saved?.background),
    seenHelp: Boolean(saved?.seenHelp),
  };
}

export function saveState({ pads, background, seenHelp }) {
  return write(STATE_KEY, JSON.stringify({ v: 2, pads, background, seenHelp }));
}

// --- Uploaded audio lives in IndexedDB (localStorage is too small for audio) ---

let dbPromise = null;

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("meme-machine", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function transact(mode, run) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("files", mode);
    const request = run(tx.objectStore("files"));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const putFile = (id, blob, name) => transact("readwrite", (store) => store.put({ blob, name }, id));
export const getFile = (id) => transact("readonly", (store) => store.get(id));
export const deleteFile = (id) => transact("readwrite", (store) => store.delete(id));
export const listFileIds = () => transact("readonly", (store) => store.getAllKeys());

const objectUrls = new Map();

export async function fileUrl(id) {
  if (!objectUrls.has(id)) {
    const record = await getFile(id);
    if (!record?.blob) throw new Error("Uploaded file is missing");
    objectUrls.set(id, URL.createObjectURL(record.blob));
  }
  return objectUrls.get(id);
}

export function forgetFile(id) {
  const url = objectUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  objectUrls.delete(id);
  return deleteFile(id).catch(() => {});
}

export const newFileId = () => `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// --- Migration from the original version (array of clips + base64 audio in localStorage) ---

export async function migrateLegacy() {
  if (read(STATE_KEY) || !read(LEGACY.clips)) return null;
  let clips = [];
  try {
    clips = JSON.parse(read(LEGACY.clips)) ?? [];
  } catch {
    clips = [];
  }

  const raw = {};
  for (const clip of Array.isArray(clips) ? clips : []) {
    const key = String(clip?.key ?? "").toUpperCase();
    if (key && clip.url && !raw[key]) raw[key] = { url: clip.url, start: clip.timestamp };
  }

  let background = null;
  const name = read(LEGACY.backgroundAudioName);
  const data = read(LEGACY.backgroundAudioData);
  if (name && data) {
    try {
      const blob = await (await fetch(data)).blob();
      const fileId = newFileId();
      await putFile(fileId, blob, name);
      background = normaliseBackground({ kind: "file", fileId, fileName: name });
    } catch {
      background = null;
    }
  } else if (describeSource(read(LEGACY.backgroundTrack))?.kind === "youtube") {
    background = normaliseBackground({ url: read(LEGACY.backgroundTrack) });
  }

  const state = { pads: normalisePads(raw), background, seenHelp: Boolean(read(LEGACY.firstVisit)) };
  if (saveState(state)) Object.values(LEGACY).forEach(remove);
  return state;
}
