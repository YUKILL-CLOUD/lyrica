import { describe, it, expect } from "vitest";
import { parseLrc, findCurrentIndex, getContext } from "./lrcParser";

describe("lrcParser", () => {
  it("parses standard LRC format correctly", () => {
    const sampleLrc = `
[ar:Queen]
[ti:Bohemian Rhapsody]
[00:12.50]Is this the real life?
[00:16.20]Is this just fantasy?
[00:20.00]Caught in a landslide
    `;

    const lines = parseLrc(sampleLrc);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual({ time: 12.5, text: "Is this the real life?", index: 0 });
    expect(lines[1]).toEqual({ time: 16.2, text: "Is this just fantasy?", index: 1 });
    expect(lines[2]).toEqual({ time: 20.0, text: "Caught in a landslide", index: 2 });
  });

  it("handles multi-timestamp lines", () => {
    const multiLrc = `[00:10.00][00:30.00]Repeated Chorus Line`;
    const lines = parseLrc(multiLrc);
    expect(lines).toHaveLength(2);
    expect(lines[0].time).toBe(10);
    expect(lines[1].time).toBe(30);
    expect(lines[0].text).toBe("Repeated Chorus Line");
    expect(lines[1].text).toBe("Repeated Chorus Line");
  });

  it("handles empty and malformed lines gracefully", () => {
    expect(parseLrc("")).toEqual([]);
    expect(parseLrc(null as unknown as string)).toEqual([]);
    expect(parseLrc("Just text without timestamp")).toEqual([]);
  });

  it("finds current index correctly using binary search", () => {
    const lines = parseLrc(`
[00:10.00]Line 1
[00:20.00]Line 2
[00:30.00]Line 3
    `);

    expect(findCurrentIndex(lines, 5)).toBe(-1);
    expect(findCurrentIndex(lines, 10)).toBe(0);
    expect(findCurrentIndex(lines, 15)).toBe(0);
    expect(findCurrentIndex(lines, 20)).toBe(1);
    expect(findCurrentIndex(lines, 25)).toBe(1);
    expect(findCurrentIndex(lines, 30)).toBe(2);
    expect(findCurrentIndex(lines, 100)).toBe(2);
  });

  it("returns correct lyric context for prev, current, next", () => {
    const lines = parseLrc(`
[00:10.00]Line 1
[00:20.00]Line 2
[00:30.00]Line 3
    `);

    const ctxFirst = getContext(lines, 0);
    expect(ctxFirst.prev).toBeNull();
    expect(ctxFirst.current?.text).toBe("Line 1");
    expect(ctxFirst.next?.text).toBe("Line 2");

    const ctxMid = getContext(lines, 1);
    expect(ctxMid.prev?.text).toBe("Line 1");
    expect(ctxMid.current?.text).toBe("Line 2");
    expect(ctxMid.next?.text).toBe("Line 3");

    const ctxLast = getContext(lines, 2);
    expect(ctxLast.prev?.text).toBe("Line 2");
    expect(ctxLast.current?.text).toBe("Line 3");
    expect(ctxLast.next).toBeNull();
  });
});
