import { loadBuffer, playBuffer, routeMedia, unlock } from "./audio.js";
import { sourceSignature } from "./pads.js";
import { loadYouTubeAPI, PLAYER_VARS } from "./youtube.js";

const YT_PLAYING = 1;
const YT_ENDED = 0;
const YT_PAUSED = 2;

class YouTubeVoice {
  constructor(source, layer, onError, { loop = false } = {}) {
    this.signature = sourceSignature(source);
    this.loop = loop;
    this.ready = false;
    this.playing = false;
    this.primeState = "idle";
    this.el = document.createElement("div");
    this.el.className = loop ? "yt-layer yt-background" : "yt-layer";
    const mount = document.createElement("div");
    this.el.append(mount);
    layer.append(this.el);

    loadYouTubeAPI()
      .then((YT) => {
        if (this.destroyed) return;
        this.player = new YT.Player(mount, {
          width: "100%",
          height: "100%",
          videoId: source.videoId,
          playerVars: { ...PLAYER_VARS, start: Math.floor(source.start ?? 0) },
          events: {
            onReady: () => this.onReady(),
            onStateChange: (event) => this.onState(event.data),
            onError: (event) => onError?.(event.data),
          },
        });
      })
      .catch(() => onError?.("api"));
  }

  onReady() {
    this.ready = true;
    if (this.pending) this.play(this.pending);
    else if (this.wantsPrime) this.prime(this.wantsPrime);
  }

  onState(state) {
    if (this.primeState === "priming") {
      if (state !== YT_PLAYING) return;
      // Muted warm-up finished: park at the start so the first real hit is instant.
      this.primeState = "done";
      this.player.pauseVideo();
      this.player.seekTo(this.source?.start ?? 0, true);
      this.player.unMute();
      return;
    }
    this.onStateChange?.(state);
    if (state === YT_ENDED && this.playing) {
      if (this.loop) {
        this.player.seekTo(0, true);
        this.player.playVideo();
      } else {
        this.ended = true;
      }
    }
  }

  // Mobile browsers only allow scripted playback after a gesture, so we start each
  // player muted once from the "Play" tap. This also buffers the video ahead of time.
  prime(source) {
    this.source = source;
    if (!this.ready) return void (this.wantsPrime = source);
    if (this.primeState !== "idle" || this.playing) return;
    this.primeState = "priming";
    this.player.mute();
    this.player.seekTo(source.start ?? 0, true);
    this.player.playVideo();
  }

  play(source) {
    this.source = source;
    this.playing = true;
    this.ended = false;
    this.startedAt = performance.now();
    if (!this.ready) return void (this.pending = source);
    this.pending = null;
    this.primeState = "done";
    this.player.unMute();
    this.player.setVolume(Math.round(source.volume * 100));
    this.player.seekTo(source.start ?? 0, true);
    this.player.playVideo();
  }

  pause() {
    this.pending = null;
    this.playing = false;
    if (this.ready) this.player.pauseVideo();
  }

  setVolume(volume) {
    if (this.source) this.source = { ...this.source, volume };
    if (this.ready) this.player.setVolume(Math.round(volume * 100));
  }

  // 0..1 through the clip; >= 1 once it has reached its end.
  progress() {
    if (!this.playing) return 0;
    if (this.ended) return 1;
    // Right after seekTo the reported time can still be the old position.
    if (!this.ready || performance.now() - this.startedAt < 300) return 0;
    const start = this.source.start ?? 0;
    const end = this.source.end ?? this.player.getDuration?.() ?? 0;
    if (!(end > start)) return 0;
    return Math.max(0, (this.player.getCurrentTime() - start) / (end - start));
  }

  destroy() {
    this.destroyed = true;
    try {
      this.player?.destroy();
    } catch {
      // Player never finished loading.
    }
    this.el.remove();
  }
}

class AudioVoice {
  constructor(source, src, onError) {
    this.signature = sourceSignature(source);
    this.playing = false;
    this.loaded = Promise.resolve(src)
      .then((url) => {
        this.src = url;
        return loadBuffer(url);
      })
      .then((buffer) => {
        this.buffer = buffer;
      })
      .catch(() => {
        // No CORS on that host: fall back to a plain <audio> element (no visualiser).
        if (!this.src) throw new Error("missing");
        this.media = new Audio();
        this.media.preload = "auto";
        this.media.src = this.src;
        this.media.addEventListener("ended", () => (this.ended = true));
        this.media.addEventListener("error", () => onError?.("load"), { once: true });
      })
      .catch(() => onError?.("load"));
  }

  play(source) {
    this.pause();
    this.source = source;
    this.playing = true;
    this.ended = false;
    const start = source.start ?? 0;
    if (this.buffer) {
      const end = source.end ?? this.buffer.duration;
      const handle = playBuffer(this.buffer, {
        offset: start,
        duration: end - start,
        volume: source.volume,
        onEnded: () => {
          if (this.handle === handle) this.ended = true;
        },
      });
      this.handle = handle;
    } else if (this.media) {
      this.media.currentTime = start;
      this.media.volume = source.volume;
      this.media.play().catch(() => {});
    } else {
      this.loaded.then(() => {
        if (this.playing && this.source === source) this.play(source);
      });
    }
  }

  pause() {
    this.playing = false;
    this.handle?.stop();
    this.handle = null;
    this.media?.pause();
  }

  progress() {
    if (!this.playing) return 0;
    if (this.ended) return 1;
    if (this.handle) return this.handle.elapsed() / this.handle.length;
    if (this.media) {
      const start = this.source.start ?? 0;
      const end = this.source.end ?? this.media.duration;
      return end > start ? Math.max(0, (this.media.currentTime - start) / (end - start)) : 0;
    }
    return 0;
  }

  destroy() {
    this.pause();
    if (this.media) this.media.src = "";
  }
}

// Owns one voice per pad and decides what is playing.
export class Engine {
  constructor({ layer, resolveFile, onChange, onProgress, onError }) {
    Object.assign(this, { layer, resolveFile, onChange, onProgress, onError });
    this.pads = {};
    this.voices = new Map();
    this.active = new Set();
    this.latched = new Set();
    this.z = 10;
    this.primed = false;
    this.tick = this.tick.bind(this);
  }

  sync(pads) {
    this.pads = pads;
    for (const [key, voice] of this.voices) {
      if (voice.signature !== sourceSignature(pads[key])) {
        this.stop(key);
        voice.destroy();
        this.voices.delete(key);
      }
    }
    for (const pad of Object.values(pads)) {
      if (!pad.kind || this.voices.has(pad.key)) continue;
      const onError = (code) => this.onError?.(pad.key, code);
      const voice =
        pad.kind === "youtube"
          ? new YouTubeVoice(pad, this.layer, onError)
          : new AudioVoice(pad, pad.kind === "file" ? this.resolveFile(pad.fileId) : pad.url, onError);
      this.voices.set(pad.key, voice);
      if (this.primed && voice instanceof YouTubeVoice) voice.prime(pad);
    }
  }

  prime() {
    unlock();
    this.primed = true;
    for (const [key, voice] of this.voices) if (voice instanceof YouTubeVoice) voice.prime(this.pads[key]);
  }

  // `latch` keeps a hold-mode pad going after release (used by "Test" in the editor).
  trigger(key, { latch = false } = {}) {
    const pad = this.pads[key];
    const voice = this.voices.get(key);
    if (!pad || !voice) return;
    unlock();
    voice.play(pad);
    if (voice.el) voice.el.style.zIndex = String(++this.z);
    voice.el?.classList.add("live");
    this.active.add(key);
    if (latch) this.latched.add(key);
    else this.latched.delete(key);
    this.onChange?.();
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  release(key) {
    if (this.pads[key]?.mode === "oneshot" || this.latched.has(key)) return;
    this.stop(key);
  }

  stop(key) {
    this.latched.delete(key);
    if (!this.active.delete(key)) return;
    const voice = this.voices.get(key);
    voice?.pause();
    voice?.el?.classList.remove("live");
    this.onChange?.();
  }

  stopAll() {
    for (const key of [...this.active]) this.stop(key);
  }

  isActive(key) {
    return this.active.has(key);
  }

  tick() {
    this.frame = 0;
    const progress = {};
    for (const key of [...this.active]) {
      const value = this.voices.get(key)?.progress() ?? 1;
      if (value >= 1) this.stop(key);
      else progress[key] = value;
    }
    this.onProgress?.(progress);
    if (this.active.size) this.frame = requestAnimationFrame(this.tick);
  }
}

// Looping background track: a hidden YouTube player or an <audio> element.
export class Background {
  constructor({ layer, resolveFile, onChange, onError }) {
    Object.assign(this, { layer, resolveFile, onChange, onError });
    this.playing = false;
  }

  set(source) {
    if (sourceSignature(source) === this.signature) {
      if (source) this.setVolume(source.volume);
      return;
    }
    this.teardown();
    this.signature = sourceSignature(source);
    this.source = source;
    if (!source) return;

    if (source.kind === "youtube") {
      this.voice = new YouTubeVoice(source, this.layer, (code) => this.onError?.(code), { loop: true });
      this.voice.onStateChange = (state) => {
        if (state === YT_PLAYING) this.update(true);
        else if (state === YT_PAUSED || state === YT_ENDED) this.update(false);
      };
      return;
    }

    const media = new Audio();
    media.loop = true;
    media.preload = "auto";
    media.volume = source.volume;
    media.addEventListener("play", () => this.update(true));
    media.addEventListener("pause", () => this.update(false));
    this.media = media;
    Promise.resolve(source.kind === "file" ? this.resolveFile(source.fileId) : source.url)
      .then((src) => {
        if (this.media !== media) return;
        // Remote audio goes through the visualiser only if the host allows CORS; retry without it otherwise.
        const remote = !src.startsWith("blob:");
        if (remote) media.crossOrigin = "anonymous";
        media.addEventListener(
          "error",
          () => {
            if (this.media !== media) return;
            if (!remote) return this.onError?.("load");
            this.unrouted = true;
            media.removeAttribute("crossorigin");
            media.src = src;
            media.addEventListener("error", () => this.onError?.("load"), { once: true });
          },
          { once: true },
        );
        media.src = src;
      })
      .catch(() => this.onError?.("load"));
  }

  prime() {
    this.voice?.prime({ ...this.source, start: 0 });
  }

  update(playing) {
    if (this.playing === playing) return;
    this.playing = playing;
    this.onChange?.();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  play() {
    if (!this.source) return;
    unlock();
    if (this.media) {
      if (!this.unrouted) {
        try {
          routeMedia(this.media);
        } catch {
          this.unrouted = true;
        }
      }
      this.media.play().catch(() => this.onError?.("blocked"));
    } else if (this.voice) {
      this.voice.play({ ...this.source, start: 0, end: null });
    }
  }

  pause() {
    this.media?.pause();
    this.voice?.pause();
    this.update(false);
  }

  setVolume(volume) {
    if (this.source) this.source = { ...this.source, volume };
    if (this.media) this.media.volume = volume;
    this.voice?.setVolume(volume);
  }

  teardown() {
    this.pause();
    if (this.media) {
      this.media.removeAttribute("src");
      this.media.load();
    }
    this.voice?.destroy();
    this.media = this.voice = null;
    this.unrouted = false;
  }
}
