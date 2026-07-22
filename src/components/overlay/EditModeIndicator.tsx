import React from "react";
import { Lock, Unlock, Move, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tauriCommands } from "@/services/tauriCommands";

interface EditModeIndicatorProps {
  isLocked: boolean;
  onLockToggle: () => void;
}

export const EditModeIndicator: React.FC<EditModeIndicatorProps> = ({
  isLocked,
  onLockToggle,
}) => {
  const handleOpenSettings = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await tauriCommands.openSettingsWindow();
    } catch (err) {
      console.warn("Could not open settings:", err);
    }
  };

  const handleLockClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onLockToggle();
  };

  // Locked mode: display a subtle, semi-transparent lock icon with hover opacity
  if (isLocked) {
    return (
      <div className="absolute top-2 right-2 flex items-center gap-1 z-50 pointer-events-auto opacity-30 hover:opacity-100 transition-opacity duration-200">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleLockClick}
          title="Click to Unlock Overlay (Enable Moving & Dragging)"
          className="h-6 w-6 rounded-full bg-black/40 hover:bg-black/70 text-white/90 border border-white/20 p-0 shadow-sm"
        >
          <Lock className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  // Unlocked mode: display Drag handle + Settings button + Quick Lock button
  return (
    <div className="absolute top-2 right-2 flex items-center gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
      <div
        data-tauri-drag-region
        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-[10px] font-mono text-amber-200 select-none cursor-move shadow-md"
      >
        <Move className="w-3 h-3 opacity-80" />
        <span>Move Freely</span>
      </div>

      <Button
        size="icon"
        variant="ghost"
        onClick={handleOpenSettings}
        title="Open Settings"
        className="h-6 w-6 rounded-full bg-white/10 hover:bg-white/20 text-white/90 border border-white/20 p-0 shadow-sm"
      >
        <Settings className="w-3 h-3" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        onClick={handleLockClick}
        title="Lock Overlay (Enable Click-Through)"
        className="h-6 w-6 rounded-full bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 border border-amber-500/60 p-0 shadow-sm"
      >
        <Unlock className="w-3 h-3" />
      </Button>
    </div>
  );
};
