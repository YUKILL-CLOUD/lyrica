import { create } from "zustand";
import { LyricLine, LyricsStatus } from "@/types/lyrics";

interface LyricsStoreState {
  rawLrc: string | null;
  parsedLines: LyricLine[];
  status: LyricsStatus;
  currentIndex: number;
  setLyrics: (rawLrc: string | null, parsedLines: LyricLine[], status: LyricsStatus) => void;
  setStatus: (status: LyricsStatus) => void;
  setCurrentIndex: (index: number) => void;
  reset: () => void;
}

export const useLyricsStore = create<LyricsStoreState>((set) => ({
  rawLrc: null,
  parsedLines: [],
  status: "idle",
  currentIndex: -1,

  setLyrics: (rawLrc, parsedLines, status) =>
    set({
      rawLrc,
      parsedLines,
      status,
      currentIndex: parsedLines.length > 0 ? 0 : -1,
    }),

  setStatus: (status) => set({ status }),

  setCurrentIndex: (index) =>
    set((state) => (state.currentIndex !== index ? { currentIndex: index } : state)),

  reset: () =>
    set({
      rawLrc: null,
      parsedLines: [],
      status: "idle",
      currentIndex: -1,
    }),
}));
