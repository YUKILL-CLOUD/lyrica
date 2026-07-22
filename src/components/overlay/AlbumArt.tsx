import React from "react";
import { Music2 } from "lucide-react";

interface AlbumArtProps {
  albumArt?: string;
  title?: string;
  size?: number;
}

export const AlbumArt: React.FC<AlbumArtProps> = ({
  albumArt,
  title = "Album Artwork",
  size = 44,
}) => {
  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-sm transition-all duration-300"
      style={{ width: size, height: size }}
    >
      {albumArt ? (
        <img
          src={albumArt}
          alt={title}
          className="h-full w-full object-cover transition-opacity duration-500 animate-in fade-in-50"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/40 backdrop-blur-md">
          <Music2 className="h-5 w-5" />
        </div>
      )}
    </div>
  );
};
