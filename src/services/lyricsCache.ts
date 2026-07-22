import { invoke } from "@tauri-apps/api/core";
import { CachedLyrics } from "@/types/lyrics";
import { TrackInfo } from "@/types/music";

/**
 * Creates a unique cache key from track metadata.
 */
export function makeCacheKey(track: TrackInfo): string {
  const durationKey = track.duration ? Math.round(track.duration) : "0";
  const raw = `${track.title.toLowerCase().trim()}|${track.artist.toLowerCase().trim()}|${durationKey}`;
  return raw.replace(/[^a-z0-9|]/gi, "_");
}

// In-memory fallback cache for browser runtime / preview
const memoryCache = new Map<string, CachedLyrics>();

export const lyricsCacheService = {
  /**
   * Retrieve cached lyrics from sled disk store or in-memory map.
   */
  get: async (track: TrackInfo): Promise<CachedLyrics | null> => {
    const key = makeCacheKey(track);

    try {
      const cached = await invoke<CachedLyrics | null>("get_cached_lyrics", { key });
      if (cached) return cached;
    } catch (e) {
      // Fall back to memory cache when running outside Tauri
      if (memoryCache.has(key)) {
        return memoryCache.get(key)!;
      }
    }

    return null;
  },

  /**
   * Write lyrics to sled disk store and in-memory map.
   */
  set: async (track: TrackInfo, syncedLrc: string | null, plainLyrics: string | null): Promise<void> => {
    const key = makeCacheKey(track);
    const cached: CachedLyrics = {
      syncedLrc,
      plainLyrics,
      fetchedAt: Date.now(),
      version: 1,
    };

    memoryCache.set(key, cached);

    try {
      await invoke("set_cached_lyrics", { key, lyrics: cached });
    } catch (e) {
      // Ignore IPC error when outside Tauri
    }
  },
};
