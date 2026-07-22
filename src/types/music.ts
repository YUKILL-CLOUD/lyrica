/**
 * Core music data types for Lyrica.
 * These types are mirrored on the Rust side via serde-compatible structs.
 */

/** Uniquely identifies a music source. */
export type MusicSource = "spotify" | "youtube" | "unknown";

/** Information about the currently playing track. */
export interface TrackInfo {
  /** Stable hash of title + artist for caching and deduplication. */
  id: string;
  title: string;
  artist: string;
  album?: string;
  /** Track duration in seconds — used for LRCLIB exact matching. */
  duration?: number;
  /** Base64 PNG data URL from SMTC album art thumbnail. */
  albumArt?: string;
  source: MusicSource;
}

/** Real-time playback position state. */
export interface PlaybackState {
  isPlaying: boolean;
  /** Current position in seconds at the time of `updatedAt`. */
  position: number;
  /**
   * `performance.now()` timestamp when this state was captured.
   * Used for drift compensation in the rAF sync loop.
   */
  updatedAt: number;
}

/**
 * Provider identification and confidence scoring.
 * Higher confidence = more reliable track data.
 */
export interface ProviderInfo {
  name: string;
  /** 0.0–1.0 confidence score. Spotify desktop = 1.0, YouTube browser = 0.85. */
  confidence: number;
  /** App ID from SMTC session (e.g. "Spotify.exe", "chrome.exe"). */
  appId?: string;
}

/** Combined media state emitted on `lyrica://track-changed`. */
export interface MediaUpdatePayload {
  track: TrackInfo;
  playback: PlaybackState;
  provider: ProviderInfo;
}
