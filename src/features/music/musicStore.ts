import { create } from "zustand";
import { TrackInfo, PlaybackState, ProviderInfo } from "@/types/music";

interface MusicStoreState {
  currentTrack: TrackInfo | null;
  playbackState: PlaybackState;
  activeProvider: ProviderInfo;
  setCurrentTrack: (track: TrackInfo | null) => void;
  updatePlayback: (playback: Partial<PlaybackState>) => void;
  setActiveProvider: (provider: ProviderInfo) => void;
}

export const useMusicStore = create<MusicStoreState>((set) => ({
  currentTrack: {
    id: "demo-track",
    title: "Synchronized Floating Lyrics",
    artist: "Lyrica Desktop App",
    album: "Always-On-Top Glass Overlay",
    source: "spotify",
  },
  playbackState: {
    isPlaying: true,
    position: 0,
    updatedAt: Date.now(),
  },
  activeProvider: {
    name: "SMTC Provider",
    confidence: 1.0,
    appId: "Spotify.exe",
  },

  setCurrentTrack: (track) => set({ currentTrack: track }),

  updatePlayback: (partialState) =>
    set((state) => ({
      playbackState: {
        ...state.playbackState,
        ...partialState,
        updatedAt: Date.now(),
      },
    })),

  setActiveProvider: (provider) => set({ activeProvider: provider }),
}));
