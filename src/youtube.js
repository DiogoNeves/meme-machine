import { parseTime } from "./time.js";

const VIDEO_ID = /^[\w-]{11}$/;
const HOSTS = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i;

// Accepts watch, short, shorts, embed and live links (plus bare video IDs).
export function parseYouTube(input) {
  const text = String(input ?? "").trim();
  if (!text) return null;
  if (VIDEO_ID.test(text)) return { id: text, start: null };

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (!HOSTS.test(url.hostname)) return null;

  let id = null;
  if (/(^|\.)youtu\.be$/i.test(url.hostname)) id = url.pathname.split("/")[1];
  else if (url.pathname === "/watch") id = url.searchParams.get("v");
  else id = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/)?.[1];
  if (!id || !VIDEO_ID.test(id)) return null;

  const start = parseTime(url.searchParams.get("t") ?? url.searchParams.get("start"));
  return { id, start: Number.isFinite(start) && start > 0 ? start : null };
}

let apiPromise = null;

export function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      script.remove();
      apiPromise = null;
      reject(new Error("YouTube player could not load"));
    };
    document.head.append(script);
  });
  return apiPromise;
}

export const PLAYER_VARS = {
  controls: 0,
  disablekb: 1,
  fs: 0,
  iv_load_policy: 3,
  playsinline: 1,
  rel: 0,
};

export const ERROR_MESSAGES = {
  2: "That YouTube link looks broken.",
  5: "YouTube couldn't play that video here.",
  100: "That YouTube video is private or was removed.",
  101: "The owner of that video doesn't allow it to be embedded.",
  150: "The owner of that video doesn't allow it to be embedded.",
  api: "Couldn't load the YouTube player. Check your connection or content blocker.",
};
