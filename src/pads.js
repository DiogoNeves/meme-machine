import { parseTime } from "./time.js";
import { parseYouTube } from "./youtube.js";

export const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
export const KEYS = ROWS.join("").split("");
export const COLOURS = ["#ff4d6d", "#ff9f1c", "#ffd23f", "#3ddc97", "#2ec4ff", "#8b7bff", "#e056fd", "#e9ecf5"];

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const seconds = (value) => {
  const parsed = parseTime(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const clamp = (value, min, max, fallback) =>
  Number.isFinite(Number(value)) && value !== null && value !== "" ? Math.min(max, Math.max(min, Number(value))) : fallback;

export const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

// Works out what a pasted link is. Returns null when it's neither YouTube nor a usable https URL.
export function describeSource(input) {
  const url = text(input, 2048);
  if (!url) return null;
  const yt = parseYouTube(url);
  if (yt) return { kind: "youtube", url, videoId: yt.id, start: yt.start };
  if (isHttpsUrl(url)) return { kind: "audio", url };
  return null;
}

export function normaliseCredit(raw) {
  if (!raw || typeof raw !== "object") return null;
  const credit = {
    title: text(raw.title, 120),
    author: text(raw.author, 120),
    licence: text(raw.licence, 60),
    page: isHttpsUrl(raw.page) ? text(raw.page, 2048) : "",
  };
  return credit.title || credit.page ? credit : null;
}

// Shared by pads and the background track: a source plus its metadata.
function normaliseSource(raw) {
  const source = {
    kind: null,
    url: text(raw.url, 2048),
    videoId: null,
    fileId: text(raw.fileId, 64),
    fileName: text(raw.fileName, 200),
    label: text(raw.label, 60),
    volume: clamp(raw.volume, 0, 1, 1),
    credit: normaliseCredit(raw.credit),
  };
  if (raw.kind === "file" && source.fileId) source.kind = "file";
  else if (raw.kind !== "file") {
    const described = describeSource(source.url);
    if (described) Object.assign(source, { kind: described.kind, videoId: described.videoId ?? null });
  }
  return source;
}

export function normalisePad(raw, key) {
  if (!raw || typeof raw !== "object" || !KEYS.includes(key)) return null;
  const pad = {
    key,
    ...normaliseSource(raw),
    start: seconds(raw.start),
    end: seconds(raw.end),
    mode: raw.mode === "oneshot" ? "oneshot" : "hold",
    colour: Number.isInteger(raw.colour) ? Math.abs(raw.colour) % COLOURS.length : KEYS.indexOf(key) % COLOURS.length,
  };
  if (pad.end !== null && pad.end <= (pad.start ?? 0)) pad.end = null;
  return pad;
}

export function normaliseBackground(raw) {
  if (!raw || typeof raw !== "object") return null;
  const background = normaliseSource(raw);
  return background.kind ? background : null;
}

export function normalisePads(raw) {
  const pads = {};
  if (raw && typeof raw === "object") {
    for (const key of KEYS) {
      const pad = normalisePad(raw[key], key);
      if (pad) pads[key] = pad;
    }
  }
  return pads;
}

export function newPad(key, colour) {
  return normalisePad({ colour }, key);
}

export const hasSource = (pad) => Boolean(pad?.kind);

export function padTitle(pad) {
  if (!pad) return "";
  if (pad.label) return pad.label;
  if (pad.kind === "file") return pad.fileName.replace(/\.[a-z0-9]+$/i, "");
  if (pad.credit?.title) return pad.credit.title;
  if (pad.kind === "youtube") return "YouTube clip";
  if (pad.kind === "audio") {
    try {
      return decodeURIComponent(new URL(pad.url).pathname.split("/").pop()).replace(/\.[a-z0-9]+$/i, "") || "Audio";
    } catch {
      return "Audio";
    }
  }
  return "";
}

// A pad's playback source changes only when these do; other edits keep the loaded player.
export const sourceSignature = (source) => (source?.kind ? `${source.kind}|${source.url}|${source.fileId}` : "");
