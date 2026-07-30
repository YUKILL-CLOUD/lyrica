import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrackInfo } from "@/types/music";
import { parseLrc } from "@/features/lyrics/lrcParser";
import { useLyricsStore } from "@/features/lyrics/lyricsStore";
import { lyricsEngine } from "@/services/lyrics/engine";
import { buildTrackMetadata, makeCacheKey } from "@/services/lyrics/normalizer";

/**
 * Custom hook to manage lyrics fetching, provider waterfall, caching,
 * parsing, and state updates.
 *
 * Uses LyricsEngine which handles:
 *  - Cache-first lookup (memory → sled disk)
 *  - Provider waterfall: LRCLIB → NetEase
 *  - Request deduplication (in-flight Map)
 *  - Metadata normalization
 */
export function useLyrics(track: TrackInfo | null) {
  const { setLyrics, setStatus, reset } = useLyricsStore();

  const trackMeta = track ? buildTrackMetadata(track) : null;
  const trackKey = trackMeta ? makeCacheKey(trackMeta) : null;

  const query = useQuery({
    queryKey: ["lyrics", trackKey],
    queryFn: async () => {
      if (!trackMeta || !trackMeta.title) return null;
      return lyricsEngine.resolve(trackMeta);
    },
    enabled: !!trackMeta && !!trackMeta.title,
    staleTime: Infinity, // Lyrics don't change
  });

  useEffect(() => {
    if (!track) {
      reset();
      return;
    }

    if (query.isLoading) {
      setStatus("loading");
      return;
    }

    if (query.isError) {
      setStatus("error");
      return;
    }

    if (query.data === undefined) return;

    const result = query.data;

    if (!result) {
      // All providers returned null — no lyrics found in any database
      setLyrics(null, [], "not_found");
      return;
    }

    if (result.isInstrumental) {
      // Provider explicitly flagged as instrumental
      setLyrics(null, [], "instrumental");
      return;
    }

    if (result.syncedLrc) {
      const parsed = parseLrc(result.syncedLrc);
      if (parsed.length > 0) {
        setLyrics(result.syncedLrc, parsed, "found");
        return;
      }
    }

    if (result.plainLyrics) {
      // Plain text available but no timestamps
      setLyrics(result.plainLyrics, [], "no_synced");
      return;
    }

    setLyrics(null, [], "not_found");
  }, [track, query.isLoading, query.isError, query.data, setLyrics, setStatus, reset]);

  return {
    refetch: query.refetch,
    isLoading: query.isLoading,
  };
}
