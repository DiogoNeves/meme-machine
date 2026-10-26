import { normaliseBackground, normalisePads } from "./pads.js";

const MAX_LENGTH = 30000;

function toBase64Url(textValue) {
  let binary = "";
  for (const byte of new TextEncoder().encode(textValue)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

const shareable = (source) => source?.kind === "youtube" || source?.kind === "audio";
const credit = (c) => (c ? [c.title, c.author, c.licence, c.page] : undefined);
const uncredit = (c) => (Array.isArray(c) ? { title: c[0], author: c[1], licence: c[2], page: c[3] } : null);

// Uploaded files live only in this browser, so they're left out of share links.
export function encodeKit({ pads, background }) {
  const p = Object.values(pads)
    .filter(shareable)
    .map((pad) => ({
      k: pad.key,
      u: pad.url,
      l: pad.label || undefined,
      s: pad.start ?? undefined,
      e: pad.end ?? undefined,
      m: pad.mode === "oneshot" ? 1 : undefined,
      v: pad.volume !== 1 ? pad.volume : undefined,
      c: pad.colour,
      r: credit(pad.credit),
    }));
  const b = shareable(background)
    ? { u: background.url, l: background.label || undefined, v: background.volume !== 1 ? background.volume : undefined, r: credit(background.credit) }
    : undefined;
  return toBase64Url(JSON.stringify({ v: 1, p, b }));
}

export function decodeKit(value) {
  if (typeof value !== "string" || !value || value.length > MAX_LENGTH) return null;
  try {
    const data = JSON.parse(fromBase64Url(value));
    if (data?.v !== 1 || !Array.isArray(data.p)) return null;
    const raw = {};
    for (const item of data.p) {
      if (!item || typeof item.k !== "string") continue;
      raw[item.k] = { url: item.u, label: item.l, start: item.s, end: item.e, mode: item.m ? "oneshot" : "hold", volume: item.v, colour: item.c, credit: uncredit(item.r) };
    }
    const background = data.b ? normaliseBackground({ url: data.b.u, label: data.b.l, volume: data.b.v, credit: uncredit(data.b.r) }) : null;
    const pads = normalisePads(raw);
    for (const key of Object.keys(pads)) if (!pads[key].kind) delete pads[key];
    return { pads, background };
  } catch {
    return null;
  }
}
