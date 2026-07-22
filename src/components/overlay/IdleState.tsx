import React from "react";
import { Radio } from "lucide-react";

export const IdleState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center select-none">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 mb-2 text-white/40 animate-pulse">
        <Radio className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
        Waiting for music…
      </p>
      <p className="text-[11px] text-white/30 mt-1 max-w-[200px]">
        Play a song on Spotify or YouTube in browser
      </p>
    </div>
  );
};
