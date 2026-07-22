/**
 * Lyrics data types for Lyrica.
 */

/** A single time-stamped lyric line from a parsed LRC file. */
export interface LyricLine {
  /** Timestamp in seconds (e.g. 12.5 for [00:12.50]). */
  time: number;
  /** The lyric text for this line. */
  text: string;
  /** Original position in the LRC file (used as React key). */
  index: number;
}

/** The three lines displayed simultaneously in the overlay. */
export interface LyricContext {
  prev: LyricLine | null;
  current: LyricLine | null;
  next: LyricLine | null;
}

/** Status of the lyrics fetching lifecycle. */
export type LyricsStatus =
  | "idle"
  | "loading"
  | "found"
  | "not_found"
  | "no_synced"
  | "error";

/** Raw LRCLIB API response shape. */
export interface LrclibResponse {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  syncedLyrics: string | null;
  plainLyrics: string | null;
}

/** Cached lyrics entry stored in sled. */
export interface CachedLyrics {
  syncedLrc: string | null;
  plainLyrics: string | null;
  fetchedAt: number; // Unix timestamp ms
  version: number;   // Schema version for cache invalidation
}
