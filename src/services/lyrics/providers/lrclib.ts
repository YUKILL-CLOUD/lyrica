/**
 * LRCLIB lyrics provider for Lyrica.
 *
 * Fetches synced LRC lyrics from lrclib.net using two strategies:
 *   1. artist + normalized title
 *   2. normalized title only
 *
 * No fuzzy search — avoids false positive matches on common/short titles.
 */

import { LyricsProvider, LyricsResult, TrackMetadata } from "@/types/lyrics";

const LRCLIB_BASE = "https://lrclib.net/api";
const CLIENT_HEADER = "Lyrica/1.0.0 (https://github.com/YUKILL-CLOUD/lyrica)";
const TIMEOUT_MS = 2000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildResult(data: {
  syncedLyrics: string | null;
  plainLyrics: string | null;
  instrumental: boolean;
}): LyricsResult {
  const hasSynced = !!data.syncedLyrics?.trim();
  const hasPlain = !!data.plainLyrics?.trim();
  return {
    syncedLrc: data.syncedLyrics ?? null,
    plainLyrics: data.plainLyrics ?? null,
    lyricsType: hasSynced ? "synced" : hasPlain ? "plain" : "none",
    provider: "lrclib",
    isInstrumental: data.instrumental === true,
  };
}

export class LrclibProvider implements LyricsProvider {
  readonly name = "lrclib";

  async search(track: TrackMetadata): Promise<LyricsResult | null> {
    const headers = { "Lrclib-Client": CLIENT_HEADER };

    // --- Strategy 1: /api/get with exact parameters ---
    try {
      const params = new URLSearchParams({
        track_name: track.normalizedTitle,
        artist_name: track.normalizedArtist,
      });
      if (track.duration) params.set("duration", String(Math.round(track.duration)));
      if (track.album) params.set("album_name", track.album);

      const res = await fetchWithTimeout(`${LRCLIB_BASE}/get?${params}`, { headers });
      if (res?.ok) {
        const data = await res.json();
        // Instrumental flag — explicit signal from provider
        if (data.instrumental === true) return buildResult(data);
        if (data.syncedLyrics || data.plainLyrics) return buildResult(data);
      }
    } catch {
      // Continue to strategy 2
    }

    // --- Strategy 2: /api/search by title only ---
    try {
      const params = new URLSearchParams({ track_name: track.normalizedTitle });
      const res = await fetchWithTimeout(`${LRCLIB_BASE}/search?${params}`, { headers });
      if (res?.ok) {
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          // Prefer a result with synced lyrics
          const best = results.find((r) => r.syncedLyrics) ?? results[0];
          if (best.syncedLyrics || best.plainLyrics || best.instrumental) {
            return buildResult(best);
          }
        }
      }
    } catch {
      // Fall through
    }

    return null;
  }
}
