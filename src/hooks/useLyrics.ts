import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrackInfo } from "@/types/music";
import { parseLrc } from "@/features/lyrics/lrcParser";
import { useLyricsStore } from "@/features/lyrics/lyricsStore";
import { lyricsCacheService, makeCacheKey } from "@/services/lyricsCache";
import { lrclibService } from "@/services/lrclib";

/**
 * Custom hook to manage lyrics fetching, disk caching, parsing, and state updates.
 */
export function useLyrics(track: TrackInfo | null) {
  const { setLyrics, setStatus, reset } = useLyricsStore();

  const trackKey = track ? makeCacheKey(track) : null;

  const query = useQuery({
    queryKey: ["lyrics", trackKey],
    queryFn: async () => {
      if (!track || !track.title) return null;

      // 1. Try disk / memory cache first
      const cached = await lyricsCacheService.get(track);
      if (cached) {
        return {
          syncedLrc: cached.syncedLrc,
          plainLyrics: cached.plainLyrics,
          fromCache: true,
        };
      }

      // 2. Query LRCLIB API
      const remote = await lrclibService.fetchLyrics(track);

      const syncedLrc = remote?.syncedLyrics || null;
      const plainLyrics = remote?.plainLyrics || null;

      // 3. Persist to disk cache
      await lyricsCacheService.set(track, syncedLrc, plainLyrics);

      return {
        syncedLrc,
        plainLyrics,
        fromCache: false,
      };
    },
    enabled: !!track && !!track.title,
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

    if (query.data) {
      const { syncedLrc } = query.data;
      if (syncedLrc) {
        const parsed = parseLrc(syncedLrc);
        setLyrics(syncedLrc, parsed, "found");
      } else {
        setLyrics(null, [], "no_synced");
      }
    }
  }, [track, query.isLoading, query.isError, query.data, setLyrics, setStatus, reset]);

  return {
    refetch: query.refetch,
    isLoading: query.isLoading,
  };
}
