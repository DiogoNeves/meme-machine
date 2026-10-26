// One shared AudioContext: pads and the background mix into `master`, which feeds the visualiser.

let ctx = null;
let master = null;
let analyser = null;
const buffers = new Map();
const routed = new WeakSet();

export function context() {
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext({ latencyHint: "interactive" });
    master = ctx.createGain();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    master.connect(analyser);
    analyser.connect(ctx.destination);
  }
  return ctx;
}

// Browsers only start audio after a user gesture; call this from one.
export function unlock() {
  const audio = context();
  if (audio && audio.state !== "running") audio.resume().catch(() => {});
}

export const getAnalyser = () => analyser;

export function loadBuffer(src) {
  if (!buffers.has(src)) {
    const pending = (async () => {
      const audio = context();
      if (!audio) throw new Error("Web Audio unavailable");
      const response = await fetch(src);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.arrayBuffer();
      // Callback form keeps older Safari happy.
      return new Promise((resolve, reject) => audio.decodeAudioData(data, resolve, reject));
    })();
    pending.catch(() => buffers.delete(src));
    buffers.set(src, pending);
  }
  return buffers.get(src);
}

export function playBuffer(buffer, { offset = 0, duration = Infinity, volume = 1, onEnded }) {
  const audio = context();
  const source = audio.createBufferSource();
  const gain = audio.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain).connect(master);

  const start = Math.min(Math.max(0, offset), buffer.duration);
  const length = Math.max(0.01, Math.min(duration, buffer.duration - start));
  const startedAt = audio.currentTime;
  source.onended = () => {
    gain.disconnect();
    onEnded?.();
  };
  source.start(0, start, length);

  return {
    length,
    elapsed: () => audio.currentTime - startedAt,
    stop() {
      // A tiny fade avoids the click of cutting a waveform mid-cycle.
      const now = audio.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.02);
      try {
        source.stop(now + 0.025);
      } catch {
        // Already stopped.
      }
    },
  };
}

// Sends an <audio> element through the visualiser. Only safe for same-origin or CORS-enabled media.
export function routeMedia(element) {
  const audio = context();
  if (!audio || routed.has(element)) return;
  audio.createMediaElementSource(element).connect(master);
  routed.add(element);
}
