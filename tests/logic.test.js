import { describe, expect, it } from "vitest";
import { describeSource, normalisePad, normalisePads, padTitle } from "../src/pads.js";
import { decodeKit, encodeKit } from "../src/share.js";
import { formatTime, parseTime } from "../src/time.js";
import { parseYouTube } from "../src/youtube.js";

describe("parseTime", () => {
  it.each([
    ["", null],
    ["  ", null],
    ["0", 0],
    ["90", 90],
    ["90.5", 90.5],
    ["90,5", 90.5],
    ["1:30", 90],
    ["1:30.25", 90.25],
    ["1:30,5", 90.5],
    ["01:02:03", 3723],
    ["1m30s", 90],
    ["1m30.5s", 90.5],
    ["30s", 30],
    ["2m", 120],
    ["1h2m3s", 3723],
    ["1 : 30", 90],
  ])("reads %j as %j", (input, expected) => {
    expect(parseTime(input)).toBe(expected);
  });

  it.each(["abc", "1:75", "1:2:3:4", "-5", "s", "1.2.3", "99999999"])("rejects %j", (input) => {
    expect(parseTime(input)).toBeNaN();
  });

  it("round-trips with formatTime", () => {
    for (const value of [0, 5, 59.99, 61.5, 600.25, 3723.1]) expect(parseTime(formatTime(value))).toBe(value);
  });
});

describe("formatTime", () => {
  it.each([
    [0, "0:00"],
    [5, "0:05"],
    [90.5, "1:30.5"],
    [90.25, "1:30.25"],
    [3723, "1:02:03"],
    [59.999, "1:00"],
    [NaN, "0:00"],
  ])("formats %j as %j", (input, expected) => {
    expect(formatTime(input)).toBe(expected);
  });
});

describe("parseYouTube", () => {
  const id = "dQw4w9WgXcQ";
  it.each([
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&list=abc`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://music.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `youtu.be/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `https://www.youtube.com/live/${id}?si=xyz`,
    id,
  ])("finds the ID in %s", (url) => {
    expect(parseYouTube(url)?.id).toBe(id);
  });

  it("reads start times", () => {
    expect(parseYouTube(`https://youtu.be/${id}?t=42`).start).toBe(42);
    expect(parseYouTube(`https://www.youtube.com/watch?v=${id}&t=1m5s`).start).toBe(65);
    expect(parseYouTube(`https://youtu.be/${id}`).start).toBeNull();
  });

  it.each(["", "hello", "https://vimeo.com/123", `https://evil.com/watch?v=${id}`, "https://youtube.com/watch?v=short", "https://youtube.com/channel/abc"])(
    "rejects %j",
    (url) => expect(parseYouTube(url)).toBeNull(),
  );
});

describe("pads", () => {
  it("classifies sources", () => {
    expect(describeSource("https://youtu.be/dQw4w9WgXcQ").kind).toBe("youtube");
    expect(describeSource("https://upload.wikimedia.org/a.mp3").kind).toBe("audio");
    expect(describeSource("http://example.com/a.mp3")).toBeNull();
    expect(describeSource("javascript:alert(1)")).toBeNull();
  });

  it("normalises untrusted data", () => {
    const pad = normalisePad({ url: "https://youtu.be/dQw4w9WgXcQ", start: "1:00", end: "0:30", volume: 7, mode: "weird", colour: 99, label: 5 }, "A");
    expect(pad).toMatchObject({ kind: "youtube", videoId: "dQw4w9WgXcQ", start: 60, end: null, volume: 1, mode: "hold", label: "" });
    expect(pad.colour).toBeLessThan(8);
    expect(normalisePad({ url: "javascript:alert(1)", kind: "audio" }, "A").kind).toBeNull();
    expect(normalisePad({}, "1")).toBeNull();
    expect(normalisePads({ A: { url: "https://youtu.be/dQw4w9WgXcQ" }, "<img>": {} })).toHaveProperty("A");
    expect(Object.keys(normalisePads({ "<img>": { url: "x" } }))).toEqual([]);
  });

  it("drops credits with unsafe links", () => {
    const pad = normalisePad({ url: "https://a.org/x.mp3", credit: { title: "X", page: "javascript:alert(1)" } }, "B");
    expect(pad.credit).toEqual({ title: "X", author: "", licence: "", page: "" });
  });

  it("titles pads sensibly", () => {
    expect(padTitle(normalisePad({ url: "https://a.org/sounds/Air%20horn.mp3" }, "A"))).toBe("Air horn");
    expect(padTitle(normalisePad({ url: "https://youtu.be/dQw4w9WgXcQ" }, "A"))).toBe("YouTube clip");
    expect(padTitle(normalisePad({ url: "https://youtu.be/dQw4w9WgXcQ", label: "Rick" }, "A"))).toBe("Rick");
  });
});

describe("share links", () => {
  it("round-trips a kit and skips uploads", () => {
    const pads = normalisePads({
      Q: { url: "https://youtu.be/dQw4w9WgXcQ", label: "Rick ✨", start: 42.5, end: 44, mode: "oneshot", volume: 0.5, colour: 3 },
      W: { url: "https://upload.wikimedia.org/a.mp3", credit: { title: "Horn", author: "Someone", licence: "CC0", page: "https://commons.wikimedia.org/wiki/File:A.ogg" } },
      E: { kind: "file", fileId: "f-1", fileName: "local.mp3" },
    });
    const background = normalisePad({ url: "https://youtu.be/aaaaaaaaaaa", volume: 0.3 }, "A");
    const kit = decodeKit(encodeKit({ pads, background }));
    expect(Object.keys(kit.pads)).toEqual(["Q", "W"]);
    expect(kit.pads.Q).toMatchObject({ label: "Rick ✨", start: 42.5, end: 44, mode: "oneshot", volume: 0.5, colour: 3, kind: "youtube" });
    expect(kit.pads.W.credit.author).toBe("Someone");
    expect(kit.background).toMatchObject({ kind: "youtube", videoId: "aaaaaaaaaaa", volume: 0.3 });
  });

  it("rejects junk", () => {
    expect(decodeKit("not-base64!!")).toBeNull();
    expect(decodeKit(btoa(JSON.stringify({ v: 9 })))).toBeNull();
    expect(decodeKit("")).toBeNull();
  });
});
