import { useCallback } from "react";
import { useTauriEvent } from "@/hooks/useTauriEvent";
import { useMusicStore } from "@/features/music/musicStore";
import { TrackInfo, PlaybackState, ProviderInfo } from "@/types/music";

interface RustTrackPayload {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  album_art?: string;
  source: "spotify" | "youtube" | "unknown";
}

interface RustPlaybackPayload {
  is_playing: boolean;
  position: number;
  updated_at: number;
}

/**
 * Custom hook to bind Rust event-driven music updates into the Zustand music store.
 */
export function useMusicEvents() {
  const { setCurrentTrack, updatePlayback, setActiveProvider } =
    useMusicStore();

  const handleTrackChanged = useCallback(
    (payload: RustTrackPayload) => {
      const track: TrackInfo = {
        id: payload.id,
        title: payload.title,
        artist: payload.artist,
        album: payload.album,
        duration: payload.duration,
        albumArt: payload.album_art,
        source: payload.source,
      };
      setCurrentTrack(track);
    },
    [setCurrentTrack]
  );

  const handlePlaybackChanged = useCallback(
    (payload: RustPlaybackPayload) => {
      const playback: PlaybackState = {
        isPlaying: payload.is_playing,
        position: payload.position,
        updatedAt: payload.updated_at,
      };
      updatePlayback(playback);
    },
    [updatePlayback]
  );

  const handleProviderChanged = useCallback(
    (provider: ProviderInfo) => {
      setActiveProvider(provider);
    },
    [setActiveProvider]
  );

  useTauriEvent<RustTrackPayload>("lyrica://track-changed", handleTrackChanged);
  useTauriEvent<RustPlaybackPayload>("lyrica://playback-changed", handlePlaybackChanged);
  useTauriEvent<ProviderInfo>("lyrica://provider-changed", handleProviderChanged);
}
