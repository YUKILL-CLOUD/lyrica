import { LyricLine, LyricContext } from "@/types/lyrics";

/**
 * Parses a raw LRC string into a sorted array of LyricLine objects.
 * Handles:
 * - Standard timestamps: `[mm:ss.xx]` or `[mm:ss:xx]` or `[mm:ss]`
 * - Multi-timestamp lines: `[00:12.50][01:15.20]Same lyric text`
 * - Metadata tags: `[ar:Artist]`, `[ti:Title]`, `[al:Album]` (skipped)
 * - Empty lines and instrumental section markers
 */
const CREDIT_LINE_PATTERNS: RegExp[] = [
  /^(lyrics?|lyricist|written|words)(\s+by)?\s*[:：]/i,
  /^(composed|composer|music)(\s+by)?\s*[:：]/i,
  /^(arranged|arranger|produced|producer)(\s+by)?\s*[:：]/i,
  /^(qq音乐|网易云|歌词贡献|lrc generated)/i,
];

export function parseLrc(lrc: string | null | undefined): LyricLine[] {
  if (!lrc || typeof lrc !== "string") {
    return [];
  }

  const rawLines = lrc.split(/\r?\n/);
  const parsedLines: { time: number; text: string }[] = [];

  // Match timestamp tags like [01:23.45] or [01:23:45] or [01:23]
  const timestampRegex = /\[(\d{1,3}):(\d{2})(?:[\.:](\d{2,3}))?\]/g;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip metadata headers like [ar:Artist], [ti:Song], etc.
    if (/^\[(ar|ti|al|au|by|offset|length|re|ve):/i.test(trimmed)) {
      continue;
    }

    const timestamps: number[] = [];
    let match: RegExpExecArray | null;

    // Extract all timestamps from the line
    timestampRegex.lastIndex = 0;
    while ((match = timestampRegex.exec(trimmed)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const sub = match[3];

      let secondsFraction = 0;
      if (sub) {
        // If 2 digits, divided by 100; if 3 digits, divided by 1000
        secondsFraction = sub.length === 2 ? parseInt(sub, 10) / 100 : parseInt(sub, 10) / 1000;
      }

      const totalTime = minutes * 60 + seconds + secondsFraction;
      timestamps.push(totalTime);
    }

    // Strip out all timestamp tags to extract lyric text
    const text = trimmed.replace(timestampRegex, "").trim();

    // Skip credit metadata lines (e.g. "Lyrics by: ...", "Composed by: ...", "QQ音乐")
    if (text && CREDIT_LINE_PATTERNS.some((pattern) => pattern.test(text))) {
      continue;
    }

    // Skip Chinese CJK translation subtitle lines
    if (text && /[\u4e00-\u9fa5]/.test(text)) {
      continue;
    }

    if (timestamps.length > 0) {
      for (const time of timestamps) {
        parsedLines.push({ time, text });
      }
    }
  }

  // Sort chronologically by time timestamp
  parsedLines.sort((a, b) => a.time - b.time);

  // Assign stable index for React rendering keys
  return parsedLines.map((line, idx) => ({
    time: line.time,
    text: line.text,
    index: idx,
  }));
}

/**
 * Fast binary search O(log n) to find the index of the currently active lyric line.
 * Returns the index of the last line whose timestamp is <= position.
 */
export function findCurrentIndex(lines: LyricLine[], position: number): number {
  if (lines.length === 0 || position < lines[0].time) {
    return -1;
  }

  let low = 0;
  let high = lines.length - 1;
  let result = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lines[mid].time <= position) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}

/**
 * Returns previous, current (active 1), next (active 2), and future lyric lines surrounding the given index.
 */
export function getContext(lines: LyricLine[], index: number): LyricContext {
  if (lines.length === 0 || index < 0 || index >= lines.length) {
    return {
      prev: null,
      current: null,
      next: lines.length > 0 && index < 0 ? lines[0] : null,
      future: lines.length > 1 && index < 0 ? lines[1] : null,
    };
  }

  return {
    prev: index > 0 ? lines[index - 1] : null,
    current: lines[index],
    next: index < lines.length - 1 ? lines[index + 1] : null,
    future: index < lines.length - 2 ? lines[index + 2] : null,
  };
}
