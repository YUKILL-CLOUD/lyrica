import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

/**
 * Typed Tauri IPC wrappers for Rust commands and events.
 */
export const tauriCommands = {
  /** Lock the overlay window (enable mouse click-through) */
  lockOverlay: async (): Promise<void> => {
    return invoke("lock_overlay");
  },

  /** Unlock the overlay window (disable click-through for dragging/editing) */
  unlockOverlay: async (): Promise<void> => {
    return invoke("unlock_overlay");
  },

  /** Get current overlay lock status from Rust AppState */
  getOverlayLocked: async (): Promise<boolean> => {
    return invoke("get_overlay_locked");
  },

  /** Show and focus the settings window */
  openSettingsWindow: async (): Promise<void> => {
    return invoke("open_settings_window");
  },

  /** Hide the settings window */
  closeSettingsWindow: async (): Promise<void> => {
    return invoke("close_settings_window");
  },

  /** Listen for overlay lock state changes emitted from tray or IPC */
  onOverlayLockedChange: async (
    callback: (isLocked: boolean) => void
  ): Promise<UnlistenFn> => {
    return listen<boolean>("lyrica://overlay-locked", (event) => {
      callback(event.payload);
    });
  },

  /** Listen for refresh lyrics events emitted from tray */
  onRefreshLyrics: async (callback: () => void): Promise<UnlistenFn> => {
    return listen("lyrica://refresh-lyrics", () => {
      callback();
    });
  },

  /** Listen for restart detection events emitted from tray */
  onRestartDetection: async (callback: () => void): Promise<UnlistenFn> => {
    return listen("lyrica://restart-detection", () => {
      callback();
    });
  },
};
