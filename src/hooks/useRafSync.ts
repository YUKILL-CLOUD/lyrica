import { useEffect, useRef } from "react";
import { PlaybackState } from "@/types/music";
import { LyricLine, LyricContext } from "@/types/lyrics";
import { findCurrentIndex, getContext } from "@/features/lyrics/lrcParser";
import { useLyricsStore } from "@/features/lyrics/lyricsStore";
import { useSettingsStore } from "@/features/settings/settingsStore";

/**
 * requestAnimationFrame-based lyric synchronization engine with Monotonic Position Smoothing
 * and Customizable Lyrics Offset (Delay Compensation).
 */
export function useRafSync(
  lines: LyricLine[],
  playbackState: PlaybackState
): { currentIndex: number; context: LyricContext } {
  const { currentIndex, setCurrentIndex } = useLyricsStore();
  const { lyricsOffsetMs } = useSettingsStore();

  const rafRef = useRef<number | null>(null);
  const maxPositionRef = useRef<number>(0);
  const lastStateRef = useRef<PlaybackState>(playbackState);

  // Reset max position tracking on seek or track reset
  useEffect(() => {
    const prev = lastStateRef.current;
    lastStateRef.current = playbackState;

    if (playbackState.position < prev.position - 2.0 || playbackState.position === 0) {
      maxPositionRef.current = playbackState.position;
    }
  }, [playbackState]);

  useEffect(() => {
    if (!playbackState.isPlaying || lines.length === 0) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = () => {
      const now = Date.now();
      const elapsedSecs = Math.max(0, (now - playbackState.updatedAt) / 1000);

      // Apply customizable lyrics offset delay compensation (converted to seconds)
      const offsetSecs = lyricsOffsetMs / 1000;
      const rawPos = playbackState.position + elapsedSecs + offsetSecs;

      // Monotonic smoothing: ignore small backward jitter (< 2.0s)
      let smoothPos = rawPos;
      if (rawPos < maxPositionRef.current && maxPositionRef.current - rawPos < 2.0) {
        smoothPos = maxPositionRef.current;
      } else {
        maxPositionRef.current = rawPos;
      }

      const newIndex = findCurrentIndex(lines, smoothPos);

      // Only update state if index changed to avoid React re-renders
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    lines,
    playbackState.isPlaying,
    playbackState.position,
    playbackState.updatedAt,
    lyricsOffsetMs,
    currentIndex,
    setCurrentIndex,
  ]);

  const context = getContext(lines, currentIndex);
  return { currentIndex, context };
}
