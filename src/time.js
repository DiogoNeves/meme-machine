// Timestamps are stored as seconds (numbers). `null` means "not set", `NaN` means "unreadable".

const MAX_SECONDS = 24 * 60 * 60;
const UNITS = /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s?)?$/;

export function parseTime(input) {
  if (input == null) return null;
  if (typeof input === "number") return valid(input);
  const text = String(input).trim().toLowerCase().replace(/,/g, ".").replace(/\s+/g, "");
  if (!text) return null;

  if (/^\d+(?:\.\d+)?$/.test(text)) return valid(Number(text));
  if (/^\d+(?::\d{1,2}){1,2}(?:\.\d+)?$/.test(text)) {
    const parts = text.split(":").map(Number);
    if (parts.slice(1).some((part) => part >= 60)) return NaN;
    return valid(parts.reduce((total, part) => total * 60 + part, 0));
  }
  const match = text.match(UNITS);
  if (match && (match[1] || match[2] || match[3])) {
    const [, h = 0, m = 0, s = 0] = match;
    return valid(Number(h) * 3600 + Number(m) * 60 + Number(s));
  }
  return NaN;
}

function valid(seconds) {
  return Number.isFinite(seconds) && seconds >= 0 && seconds <= MAX_SECONDS
    ? Math.round(seconds * 100) / 100
    : NaN;
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const cs = Math.round(seconds * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor(cs / 6000) % 60;
  const s = String(Math.floor(cs / 100) % 60).padStart(2, "0");
  const fraction = cs % 100 ? "." + String(cs % 100).padStart(2, "0").replace(/0$/, "") : "";
  return (h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`) + fraction;
}
