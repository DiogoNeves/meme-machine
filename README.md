# 🎛️ Meme Machine

**A YouTube sampler for your keyboard and phone.** Drop clips onto keys, trim them to the perfect moment, then play them like an instrument.

👉 **[diogoneves.github.io/meme-machine](https://diogoneves.github.io/meme-machine/)**

---

## Quick start

1. **Pick a key.** In **Edit**, click, tap or press any letter.
2. **Give it a sound.** You can:
   - paste a YouTube link (`watch`, `youtu.be`, `shorts`, `live` and `?t=` links all work)
   - upload an audio file
   - grab a free sound from the built-in **library**
3. **Find the moment.** Scrub the preview and hit **Set** for the start (and the end, if you want one).
4. **Perform.** Switch to **Play**, then hold keys or pads to play clips.

Each pad can **Stop** when you let go, or **Keep playing** to the end. There's also an optional looping **background track** (YouTube, audio link, upload or library).

### Controls

| Play mode | |
|---|---|
| <kbd>A</kbd>–<kbd>Z</kbd> / tap a pad | Play the clip (hold to keep playing) |
| <kbd>Space</kbd> | Background track on/off |
| <kbd>Esc</kbd> | Stop everything |

| Edit mode | |
|---|---|
| <kbd>A</kbd>–<kbd>Z</kbd> | Select that key |
| <kbd>Esc</kbd> | Close the editor / cancel a move |

On phones, Play mode switches to big pads that work with several fingers at once.

## Free sound library

The **Sounds** button searches [Wikimedia Commons](https://commons.wikimedia.org/), where every file is freely licensed (public domain, CC0, CC BY or CC BY-SA). Each pad remembers its author and licence, and the **Help** panel lists the credits for your kit. If you publish anything you make, credit those sounds.

The library also links to other free sources:

- [YouTube, filtered to Creative Commons](https://www.youtube.com/results?search_query=sound+effect&sp=EgIwAQ%253D%253D)
- [Freesound CC0](https://freesound.org/search/?q=&f=license:%22Creative+Commons+0%22)
- [Pixabay sound effects](https://pixabay.com/sound-effects/)
- [Incompetech music (CC BY)](https://incompetech.com/music/royalty-free/music.html)

## Sharing

**Share** creates a link that rebuilds your kit (pads, times, colours, background) in anyone's browser. Uploaded files stay on your device, so they aren't included.

Kits save automatically in your browser. Uploaded audio is kept in IndexedDB.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run build
npm run test:e2e   # browser smoke test (needs Playwright + Chromium); SHOTS_DIR=… saves screenshots
npm run deploy     # build and publish to the gh-pages branch
```

The app is plain JavaScript with Vite and has no runtime dependencies:

| File | Purpose |
|---|---|
| `src/main.js` | UI, input handling, dialogs |
| `src/engine.js` | Pad voices (YouTube players and Web Audio buffers) and the background track |
| `src/audio.js` | Shared `AudioContext`, buffer playback, visualiser feed |
| `src/library.js` | Wikimedia Commons search |
| `src/pads.js`, `src/time.js`, `src/youtube.js` | Data model, timestamp parsing, YouTube link parsing |
| `src/share.js`, `src/storage.js` | Share links, localStorage, IndexedDB and migration from v1 |

## Licence

MIT. Made by [Diogo Neves](https://www.youtube.com/@DiogoNeves).
