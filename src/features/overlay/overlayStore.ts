import { create } from "zustand";
import { tauriCommands } from "@/services/tauriCommands";

interface OverlayStoreState {
  isLocked: boolean;
  isAutoHidden: boolean;
  opacity: number;
  fontSize: number;
  accentColor: string;
  autoHideTimeout: number; // in seconds (0 = disabled)
  setIsLocked: (locked: boolean) => void;
  toggleLock: () => Promise<void>;
  setAutoHidden: (hidden: boolean) => void;
  setOpacity: (opacity: number) => void;
  setFontSize: (size: number) => void;
  setAccentColor: (color: string) => void;
  setAutoHideTimeout: (seconds: number) => void;
  syncLockStateWithRust: () => Promise<void>;
}

export const useOverlayStore = create<OverlayStoreState>((set, get) => ({
  isLocked: true,
  isAutoHidden: false,
  opacity: 0.85,
  fontSize: 16,
  accentColor: "oklch(0.72 0.20 260)",
  autoHideTimeout: 30, // Default 30s inactivity auto-hide

  setIsLocked: (locked: boolean) => set({ isLocked: locked }),

  toggleLock: async () => {
    const nextState = !get().isLocked;
    try {
      if (nextState) {
        await tauriCommands.lockOverlay();
      } else {
        await tauriCommands.unlockOverlay();
      }
      set({ isLocked: nextState });
    } catch (e) {
      console.warn("Tauri IPC lock toggle fallback:", e);
      set({ isLocked: nextState });
    }
  },

  setAutoHidden: (hidden: boolean) => set({ isAutoHidden: hidden }),

  setOpacity: (opacity: number) => set({ opacity }),

  setFontSize: (fontSize: number) => set({ fontSize }),

  setAccentColor: (accentColor: string) => set({ accentColor }),

  setAutoHideTimeout: (autoHideTimeout: number) => set({ autoHideTimeout }),

  syncLockStateWithRust: async () => {
    try {
      const locked = await tauriCommands.getOverlayLocked();
      set({ isLocked: locked });
    } catch (e) {
      // Ignore when running in pure browser preview
    }
  },
}));
