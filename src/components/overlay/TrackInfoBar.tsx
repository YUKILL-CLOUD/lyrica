import React from "react";
import { AlbumArt } from "./AlbumArt";
import { Badge } from "@/components/ui/badge";
import { MusicSource } from "@/types/music";

interface TrackInfoBarProps {
  title?: string;
  artist?: string;
  album?: string;
  albumArt?: string;
  source?: MusicSource;
  confidence?: number;
  compact?: boolean;
  theme?: string;
}

export const TrackInfoBar: React.FC<TrackInfoBarProps> = ({
  title = "No Track Playing",
  artist = "Lyrica Overlay",
  album,
  albumArt,
  source = "unknown",
  confidence,
  compact = false,
  theme = "dark",
}) => {
  const isLight = theme === "light";

  const getSourceBadgeText = (src: MusicSource) => {
    switch (src) {
      case "spotify":
        return "Spotify";
      case "youtube":
        return "YouTube";
      default:
        return "Media";
    }
  };

  return (
    <div className="flex items-center gap-3 w-full overflow-hidden select-none">
      <AlbumArt albumArt={albumArt} title={title} size={compact ? 36 : 42} />

      <div className="flex flex-col min-w-0 flex-1 justify-center">
        <div className="flex items-center gap-1.5 min-w-0">
          <h2
            className={`text-sm font-semibold tracking-tight truncate ${
              isLight ? "text-slate-900" : "text-white/90"
            }`}
          >
            {title}
          </h2>
          {source !== "unknown" && (
            <Badge
              variant="outline"
              className={`text-[9px] px-1.5 py-0 h-4 font-mono flex-shrink-0 ${
                isLight
                  ? "border-slate-300 bg-slate-100 text-slate-700"
                  : "border-white/15 bg-white/5 text-white/70"
              }`}
            >
              {getSourceBadgeText(source)}
              {confidence !== undefined && (
                <span className="ml-1 opacity-60">
                  {Math.round(confidence * 100)}%
                </span>
              )}
            </Badge>
          )}
        </div>

        <p
          className={`text-xs truncate font-medium ${
            isLight ? "text-slate-600" : "text-white/60"
          }`}
        >
          {artist}
          {album ? <span className="opacity-60"> • {album}</span> : null}
        </p>
      </div>
    </div>
  );
};
