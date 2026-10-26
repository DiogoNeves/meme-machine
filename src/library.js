import { isHttpsUrl } from "./pads.js";

// Searches Wikimedia Commons: every file there is freely licensed (public domain, CC0, CC BY, CC BY-SA…).

const API = "https://commons.wikimedia.org/w/api.php";

export const SUGGESTIONS = ["air horn", "applause", "laugh", "drum roll", "explosion", "trombone", "boing", "scream", "cat", "bell"];

export const MORE_SOURCES = [
  {
    name: "YouTube · Creative Commons filter",
    url: "https://www.youtube.com/results?search_query=sound+effect&sp=EgIwAQ%253D%253D",
    note: "CC BY videos. Paste the link straight onto a pad and credit the creator.",
  },
  {
    name: "Wikimedia Commons · Sound effects",
    url: "https://commons.wikimedia.org/wiki/Category:Sound_effects",
    note: "Browse the full collection this search uses.",
  },
  {
    name: "Freesound · CC0 sounds",
    url: "https://freesound.org/search/?q=&f=license:%22Creative+Commons+0%22",
    note: "Huge community library. Download a sound, then upload it to a pad.",
  },
  {
    name: "Pixabay · Sound effects",
    url: "https://pixabay.com/sound-effects/",
    note: "Free under the Pixabay Content License. Download, then upload.",
  },
  {
    name: "Incompetech · Music by Kevin MacLeod",
    url: "https://incompetech.com/music/royalty-free/music.html",
    note: "Background tracks under CC BY 4.0.",
  },
];

const canPlay = (() => {
  const probe = typeof Audio === "function" ? new Audio() : null;
  return (type) => Boolean(type && probe?.canPlayType(type));
})();

function plainText(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(String(html), "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
}

const cleanTitle = (title) =>
  title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ").trim();

function toSound(page) {
  const info = page.videoinfo?.[0] ?? page.imageinfo?.[0];
  if (!info?.url) return null;
  const meta = info.extmetadata ?? {};
  const derivatives = info.derivatives ?? [];
  // Commons serves MP3 transcodes of Ogg/WAV/FLAC uploads, which every browser can play.
  const candidates = [
    ...derivatives.filter((d) => /mpeg|mp3/i.test(d.type ?? "") || d.transcodekey === "mp3"),
    { src: info.url, type: info.mime },
    ...derivatives,
  ];
  const playable = candidates.find((c) => c?.src && canPlay(c.type));
  if (!playable) return null;
  const src = new URL(playable.src, "https://commons.wikimedia.org").href;
  if (!isHttpsUrl(src)) return null;
  return {
    id: page.pageid,
    title: cleanTitle(page.title),
    src,
    duration: Number(info.duration) || null,
    credit: {
      title: cleanTitle(page.title),
      author: plainText(meta.Artist?.value) || "Unknown author",
      licence: plainText(meta.LicenseShortName?.value) || "See file page",
      page: isHttpsUrl(info.descriptionurl) ? info.descriptionurl : `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
    },
  };
}

export async function searchSounds(query, { signal } = {}) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "30",
    gsrsearch: `filetype:audio ${query}`,
    prop: "videoinfo",
    viprop: "url|size|mime|extmetadata|derivatives",
    viextmetadatafilter: "LicenseShortName|Artist",
  });
  const response = await fetch(`${API}?${params}`, { signal });
  if (!response.ok) throw new Error(`Search failed (${response.status})`);
  const data = await response.json();
  const pages = data.query?.pages ?? [];
  return pages
    .slice()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map(toSound)
    .filter(Boolean);
}
