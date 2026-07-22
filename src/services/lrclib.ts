import { LrclibResponse } from "@/types/lyrics";
import { TrackInfo } from "@/types/music";

const LRCLIB_BASE = "https://lrclib.net/api";
const LRCLIB_CLIENT_HEADER = "Lyrica/1.0.0 (https://github.com/lyrica-app/lyrica)";

/**
 * Service for fetching synchronized lyrics from LRCLIB.
 */
export const lrclibService = {
  /**
   * Fetch lyrics from LRCLIB using exact parameters (/api/get) with search fallback (/api/search).
   */
  fetchLyrics: async (track: TrackInfo): Promise<LrclibResponse | null> => {
    if (!track.title || !track.artist) {
      return null;
    }

    // 1. Try exact signature match (/api/get)
    try {
      const params = new URLSearchParams({
        track_name: track.title,
        artist_name: track.artist,
      });

      if (track.album) {
        params.set("album_name", track.album);
      }

      if (track.duration) {
        params.set("duration", String(Math.round(track.duration)));
      }

      const res = await fetch(`${LRCLIB_BASE}/get?${params.toString()}`, {
        headers: {
          "Lrclib-Client": LRCLIB_CLIENT_HEADER,
        },
      });

      if (res.ok) {
        const data: LrclibResponse = await res.json();
        return data;
      }
    } catch (e) {
      console.warn("LRCLIB /get failed, attempting search fallback...", e);
    }

    // 2. Fallback search (/api/search?q=artist+title)
    try {
      const query = `${track.artist} ${track.title}`;
      const res = await fetch(
        `${LRCLIB_BASE}/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            "Lrclib-Client": LRCLIB_CLIENT_HEADER,
          },
        }
      );

      if (res.ok) {
        const results: LrclibResponse[] = await res.json();
        if (results && results.length > 0) {
          // Prefer result with syncedLyrics
          const syncedMatch = results.find((r) => r.syncedLyrics);
          return syncedMatch || results[0];
        }
      }
    } catch (e) {
      console.error("LRCLIB search fallback failed:", e);
    }

    return null;
  },
};
