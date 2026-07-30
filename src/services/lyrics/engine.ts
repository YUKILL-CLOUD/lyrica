/**
 * Lyrics Engine for Lyrica.
 *
 * Runs a provider waterfall (LRCLIB → NetEase) with:
 *  - Request deduplication (in-flight Map<CacheKey, Promise>)
 *  - Cache-first lookup (memory → sled disk)
 *  - Metadata normalization before every search
 *
 * Adding a new provider in future = push it to the `providers` array. No
 * other changes needed.
 */

import { LyricsProvider, LyricsResult, TrackMetadata } from "@/types/lyrics";
import { lyricsCache } from "./cache";
import { makeCacheKey } from "./normalizer";
import { LrclibProvider } from "./providers/lrclib";
import { NetEaseProvider } from "./providers/netease";

// Default provider chain: LRCLIB first, NetEase as fallback
const DEFAULT_PROVIDERS: LyricsProvider[] = [
  new LrclibProvider(),
  new NetEaseProvider(),
];

class LyricsEngine {
  private providers: LyricsProvider[];
  /** In-flight deduplication map: prevents concurrent fetches for the same track. */
  private inFlight = new Map<string, Promise<LyricsResult | null>>();

  constructor(providers: LyricsProvider[] = DEFAULT_PROVIDERS) {
    this.providers = providers;
  }

  /**
   * Resolve lyrics for a track.
   * Returns a cached result immediately if available.
   * If a fetch is already in-flight for this track, awaits the existing promise.
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

    // 3. Start provider waterfall
    const promise = this.fetchFromProviders(track).finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  private async fetchFromProviders(track: TrackMetadata): Promise<LyricsResult | null> {
    for (const provider of this.providers) {
      try {
        const result = await provider.search(track);
        if (result) {
          // Persist to cache regardless of provider
          await lyricsCache.set(track, result);
          return result;
        }
      } catch (err) {
        console.warn(`[LyricsEngine] Provider "${provider.name}" threw:`, err);
        // Continue to next provider
      }
    }

    // All providers exhausted — cache a "none" entry to avoid re-fetching
    await lyricsCache.set(track, null);
    return null;
  }

  /** Replace the provider list at runtime (e.g. from settings toggles). */
  setProviders(providers: LyricsProvider[]) {
    this.providers = providers;
  }
}

// Singleton engine instance — shared across the app
export const lyricsEngine = new LyricsEngine();
