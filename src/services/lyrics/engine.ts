/**
 * Lyrics Engine for Lyrica.
 *
 * Delegates provider waterfall (LRCLIB → NetEase) to the Rust backend
 * via Tauri IPC. This bypasses WebView fetch restrictions and CORS
 * entirely — the Rust backend uses reqwest with no restrictions.
 *
 * Frontend responsibilities:
 *  - Cache-first lookup (memory → sled disk via IPC)
 *  - Request deduplication (in-flight Map<CacheKey, Promise>)
 *  - Metadata normalization before every lookup
 *
 * All HTTP calls happen in Rust.
 */

import { invoke } from "@tauri-apps/api/core";
import { LyricsResult, TrackMetadata } from "@/types/lyrics";
import { lyricsCache } from "./cache";
import { makeCacheKey } from "./normalizer";

interface BackendLyricsResult {
  syncedLrc: string | null;  // Rust snake_case serialized as camelCase
  plainLyrics: string | null;
  provider: string;
  lyricsType: string;
  isInstrumental: boolean;
}

async function fetchFromBackend(track: TrackMetadata): Promise<LyricsResult | null> {
  try {
    const result = await invoke<BackendLyricsResult | null>("fetch_lyrics_backend", {
      title: track.title,
      artist: track.artist,
      normalizedTitle: track.normalizedTitle,
      normalizedArtist: track.normalizedArtist,
      duration: track.duration ?? null,
      album: track.album ?? null,
    });

    if (!result) return null;

    return {
      syncedLrc: result.syncedLrc ?? null,
      plainLyrics: result.plainLyrics ?? null,
      lyricsType: (result.lyricsType as "synced" | "plain" | "none") ?? "none",
      provider: result.provider,
      isInstrumental: result.isInstrumental ?? false,
    };
  } catch (err) {
    console.error("[LyricsEngine] Rust backend invocation failed:", err);
    return null;
  }
}

class LyricsEngine {
  /** In-flight deduplication map: prevents concurrent fetches for the same track. */
  private inFlight = new Map<string, Promise<LyricsResult | null>>();

  /**
   * Resolve lyrics for a track.
   * - Returns cached result immediately if available.
   * - Deduplicates concurrent requests for the same track.
   * - All HTTP is done in Rust (no WebView fetch restrictions).
   */
  async resolve(track: TrackMetadata): Promise<LyricsResult | null> {
    // 1. Cache hit — instant return
    const cached = await lyricsCache.get(track);
    if (cached) {
      return {
        syncedLrc: cached.syncedLrc,
        plainLyrics: cached.plainLyrics,
        lyricsType: cached.lyricsType,
        provider: cached.provider,
        isInstrumental: cached.isInstrumental,
      };
    }

    const key = makeCacheKey(track);

    // 2. Deduplication — if a fetch is already running, await it
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key)!;
    }

    // 3. Delegate to Rust backend
    const promise = fetchFromBackend(track).then(async (result) => {
      await lyricsCache.set(track, result);
      return result;
    }).finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }
}

// Singleton engine instance — shared across the app
export const lyricsEngine = new LyricsEngine();
