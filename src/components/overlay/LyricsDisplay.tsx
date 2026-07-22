import React from "react";
import { LyricContext, LyricsStatus } from "@/types/lyrics";

interface LyricsDisplayProps {
  context: LyricContext;
  status: LyricsStatus;
  fontSize?: number;
  fontWeight?: number;
  activeLyricColor?: string;
  inactiveLyricColor?: string;
}

export const LyricsDisplay: React.FC<LyricsDisplayProps> = ({
  context,
  status,
  fontSize = 18,
  fontWeight = 700,
  activeLyricColor = "#38bdf8",
  inactiveLyricColor = "rgba(255, 255, 255, 0.4)",
}) => {
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-white/50 text-xs animate-pulse font-medium">
        Fetching synchronized lyrics...
      </div>
    );
  }

  if (status === "not_found" || status === "no_synced") {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-white/40 text-xs font-medium">
        No synchronized lyrics available
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-red-300/60 text-xs font-medium">
        Failed to load lyrics
      </div>
    );
  }

  const { prev, current, next } = context;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-2 py-1 select-none overflow-hidden">
      {/* Previous Inactive Lyric (Subtle Smooth Shadow) */}
      <p
        className="text-center truncate w-full px-4 transition-all duration-200"
        style={{
          fontSize: Math.max(12, fontSize - 4),
          color: inactiveLyricColor,
          opacity: 0.5,
          textShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
        }}
      >
        {prev ? prev.text : " "}
      </p>

      {/* Current Active Lyric */}
      <p
        className="text-center truncate w-full px-2 transition-all duration-200"
        style={{
          fontSize: fontSize,
          fontWeight: fontWeight,
          color: activeLyricColor,
        }}
      >
        {current ? current.text : "♪ ♪ ♪"}
      </p>

      {/* Next Inactive Lyric (Subtle Smooth Shadow) */}
      <p
        className="text-center truncate w-full px-4 transition-all duration-200"
        style={{
          fontSize: Math.max(12, fontSize - 4),
          color: inactiveLyricColor,
          opacity: 0.5,
          textShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
        }}
      >
        {next ? next.text : " "}
      </p>
    </div>
  );
};
