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

/** The lyric lines displayed in the overlay (with 2 active lines and surrounding context). */
export interface LyricContext {
  prev: LyricLine | null;
  current: LyricLine | null;
  next: LyricLine | null;
  future: LyricLine | null;
}

/** Status of the lyrics fetching lifecycle. */
export type LyricsStatus =
  | "idle"
  | "loading"
  | "found"        // synced or plain lyrics available
  | "instrumental" // provider explicitly flagged as instrumental (e.g. LRCLIB instrumental:true)
  | "not_found"    // all providers returned null — song exists but no lyrics in DB
  | "no_synced"    // plain lyrics found but no synced LRC timestamps
  | "error";

/** The type of lyrics content returned by a provider. */
export type LyricsType = "synced" | "plain" | "none";

/** Normalized track metadata passed to each lyrics provider. */
export interface TrackMetadata {
  /** Raw title from player */
  title: string;
  /** Raw artist from player */
  artist: string;
  /** Normalized title (noise stripped) */
  normalizedTitle: string;
  /** Normalized artist (noise stripped) */
  normalizedArtist: string;
  /** Duration in seconds */
  duration: number;
  /** Album name if available */
  album?: string;
}

/** Result returned by a LyricsProvider.search() call. */
export interface LyricsResult {
  syncedLrc: string | null;
  plainLyrics: string | null;
  lyricsType: LyricsType;
  /** Provider that returned this result, e.g. "lrclib" | "netease" */
  provider: string;
  /** Whether the provider explicitly flagged the track as instrumental */
  isInstrumental: boolean;
}

/** Common contract every lyrics provider must implement. */
export interface LyricsProvider {
  readonly name: string;
  search(track: TrackMetadata): Promise<LyricsResult | null>;
}

/** Rich cached lyrics entry stored in sled. */
export interface CachedLyrics {
  syncedLrc: string | null;
  plainLyrics: string | null;
  provider: string;
  lyricsType: LyricsType;
  isInstrumental: boolean;
  title: string;
  artist: string;
  duration: number;
  /** Unambiguous schema version (not appVersion / lyricsVersion) */
  schemaVersion: number;
  /** Unix timestamp ms when this entry was cached */
  cachedAt: number;
}

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
