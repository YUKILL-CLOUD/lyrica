/**
 * Lyrics cache service for Lyrica — Schema Version 3.
 *
 * Uses the Tauri sled IPC bridge (get_cached_lyrics / set_cached_lyrics)
 * with an in-memory Map as a fast first-layer fallback.
 *
 * Cache key: normalizedArtist | normalizedTitle | duration
 *
 * Schema Version 3: ONLY caches SUCCESSFUL lyrics results.
 * Prevents transient network errors or timeouts from permanently caching
 * "No lyrics found" on disk.
 */

import { invoke } from "@tauri-apps/api/core";
import { CachedLyrics, LyricsResult, TrackMetadata } from "@/types/lyrics";
import { makeCacheKey } from "./normalizer";

export const SCHEMA_VERSION = 3;

// Fast in-memory layer (session cache — survives hot reloads, cleared on app restart)
const memoryCache = new Map<string, CachedLyrics>();

export const lyricsCache = {
  /**
   * Retrieve cached lyrics. Returns null on cache miss.
   * Checks memory cache first, then Tauri sled disk store.
   */
  async get(track: TrackMetadata): Promise<CachedLyrics | null> {
    const key = makeCacheKey(track);

    // 1. Memory cache hit
    if (memoryCache.has(key)) {
      const cached = memoryCache.get(key)!;
      if (cached.lyricsType === "none" && !cached.isInstrumental) {
        return null; // Ignore negative cache entries
      }
      return cached;
    }

    // 2. Tauri sled disk store
    try {
      const cached = await invoke<CachedLyrics | null>("get_cached_lyrics", { key });
      if (cached) {
        // Reject stale schema versions or negative cache entries
        if ((cached.schemaVersion ?? 1) < SCHEMA_VERSION) {
          return null;
        }
        if (cached.lyricsType === "none" && !cached.isInstrumental) {
          return null;
        }
        memoryCache.set(key, cached); // Promote to memory cache
        return cached;
      }
    } catch {
      // Running outside Tauri (e.g. browser dev mode) — memory cache only
    }

    return null;
  },

  /**
   * Write a lyrics result to memory and sled disk cache.
   * ONLY caches valid lyrics (never stores negative "no lyrics found" entries).
   */
  async set(track: TrackMetadata, result: LyricsResult | null): Promise<void> {
    if (!result || (result.lyricsType === "none" && !result.isInstrumental)) {
      return; // Do NOT cache missing/failed lyrics! Allow future retries!
    }

    const key = makeCacheKey(track);
    const entry: CachedLyrics = {
      syncedLrc: result.syncedLrc ?? null,
      plainLyrics: result.plainLyrics ?? null,
      provider: result.provider ?? "none",
      lyricsType: result.lyricsType ?? "none",
      isInstrumental: result.isInstrumental ?? false,
      timestamp: Date.now(),
      schemaVersion: SCHEMA_VERSION,
    };

    memoryCache.set(key, entry);
    try {
      await invoke("set_cached_lyrics", { key, value: entry });
    } catch {}
  },

  /**
   * Clear in-memory cache for session reset.
   */
  clearMemory(): void {
    memoryCache.clear();
  },
};
