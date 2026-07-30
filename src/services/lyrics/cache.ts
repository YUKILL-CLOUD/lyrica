/**
 * Lyrics cache service for Lyrica — Schema Version 2.
 *
 * Uses the Tauri sled IPC bridge (get_cached_lyrics / set_cached_lyrics)
 * with an in-memory Map as a fast first-layer fallback.
 *
 * Cache key: normalizedArtist | normalizedTitle | duration
 * This disambiguates songs with identical names (e.g. "Intro" by different artists).
 */

import { invoke } from "@tauri-apps/api/core";
import { CachedLyrics, LyricsResult, TrackMetadata } from "@/types/lyrics";
import { makeCacheKey } from "./normalizer";

export const SCHEMA_VERSION = 2;

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
      return memoryCache.get(key)!;
    }

    // 2. Tauri sled disk store
    try {
      const cached = await invoke<CachedLyrics | null>("get_cached_lyrics", { key });
      if (cached) {
        // Reject stale schema versions
        if ((cached.schemaVersion ?? 1) < SCHEMA_VERSION) {
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
   */
  async set(track: TrackMetadata, result: LyricsResult | null): Promise<void> {
    const key = makeCacheKey(track);
    const entry: CachedLyrics = {
      syncedLrc: result?.syncedLrc ?? null,
      plainLyrics: result?.plainLyrics ?? null,
      provider: result?.provider ?? "none",
      lyricsType: result?.lyricsType ?? "none",
      isInstrumental: result?.isInstrumental ?? false,
      title: track.normalizedTitle,
      artist: track.normalizedArtist,
      duration: track.duration,
      schemaVersion: SCHEMA_VERSION,
      cachedAt: Date.now(),
    };

    memoryCache.set(key, entry);

    try {
      await invoke("set_cached_lyrics", { key, lyrics: entry });
    } catch {
      // Ignore IPC error when outside Tauri — memory cache is still valid
    }
  },
};
