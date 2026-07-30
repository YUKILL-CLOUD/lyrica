import { create } from "zustand";
import { Store } from "@tauri-apps/plugin-store";
import { emit, listen } from "@tauri-apps/api/event";

export type AppTheme = "dark" | "light" | "system" | "oled";
export type SettingsUiTheme = "dark" | "light" | "system";
export type FontFamily = "inter" | "geist" | "jetbrains-mono" | "outfit" | "nunito" | "playfair";
export type DisplayMode = "full" | "compact" | "lyrics-only";

interface SettingsState {
  theme: AppTheme; // Floating lyrics overlay theme
  settingsUiTheme: SettingsUiTheme; // Settings window UI theme (independent)
  fontFamily: FontFamily;
  displayMode: DisplayMode;
  fontSize: number;
  fontWeight: number;
  activeLyricColor: string;
  inactiveLyricColor: string;
  opacity: number;
  bgOpacity: number;
  bgBlur: number;
  showBorder: boolean;
  borderColor: string;
  borderWidth: number;
  cornerRadius: number;
  lyricsOffsetMs: number;
  alwaysOnTop: boolean;
  clickThroughDefault: boolean;
  autoHideTimeout: number;
  activeLinesCount: 1 | 2;
  lyricsProvider: string;
  debugMode: boolean;

  setTheme: (theme: AppTheme) => void;
  setSettingsUiTheme: (theme: SettingsUiTheme) => void;
  setFontFamily: (font: FontFamily) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setFontSize: (size: number) => void;
  setFontWeight: (weight: number) => void;
  setActiveLyricColor: (color: string) => void;
  setInactiveLyricColor: (color: string) => void;
  setActiveLinesCount: (count: 1 | 2) => void;
  setOpacity: (opacity: number) => void;
  setBgOpacity: (bgOpacity: number) => void;
  setBgBlur: (blur: number) => void;
  setShowBorder: (show: boolean) => void;
  setBorderColor: (color: string) => void;
  setBorderWidth: (width: number) => void;
  setCornerRadius: (radius: number) => void;
  setLyricsOffsetMs: (offsetMs: number) => void;
  setAlwaysOnTop: (alwaysOnTop: boolean) => void;
  setClickThroughDefault: (clickThrough: boolean) => void;
  setAutoHideTimeout: (seconds: number) => void;
  setLyricsProvider: (provider: string) => void;
  setDebugMode: (debug: boolean) => void;
  resetDefaults: () => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  applyExternalSettings: (settings: Partial<SettingsState>) => void;
}

const STORAGE_KEY = "lyrica_settings_v1";
const broadcastChannel = typeof window !== "undefined" ? new BroadcastChannel("lyrica_settings_sync") : null;

export const DEFAULT_SETTINGS = {
  theme: "dark" as AppTheme,
  settingsUiTheme: "dark" as SettingsUiTheme,
  fontFamily: "geist" as FontFamily,
  displayMode: "full" as DisplayMode,
  fontSize: 18,
  fontWeight: 700,
  activeLyricColor: "#38bdf8",
  inactiveLyricColor: "rgba(255, 255, 255, 0.75)",
  activeLinesCount: 2 as (1 | 2),
  opacity: 0.95,
  bgOpacity: 0.65,
  bgBlur: 20,
  showBorder: true,
  borderColor: "rgba(255, 255, 255, 0.15)",
  borderWidth: 1,
  cornerRadius: 16,
  lyricsOffsetMs: 0,
  alwaysOnTop: true,
  clickThroughDefault: true,
  autoHideTimeout: 0,
  lyricsProvider: "LRCLIB",
  debugMode: false,
};

function applyFontAttribute(fontFamily?: string) {
  if (typeof document === "undefined") return;
  if (fontFamily) {
    document.documentElement.setAttribute("data-font", fontFamily);
  }
}

function loadInitialSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = { ...DEFAULT_SETTINGS, ...parsed };
      applyFontAttribute(merged.fontFamily);
      return merged;
    }
  } catch (e) {
    console.warn("Failed reading localStorage:", e);
  }
  applyFontAttribute(DEFAULT_SETTINGS.fontFamily);
  return DEFAULT_SETTINGS;
}

let storeInstance: Store | null = null;
async function getPluginStore() {
  if (!storeInstance) {
    try {
      storeInstance = await Store.load("settings.json");
    } catch (e) {
      console.warn("Failed loading tauri-plugin-store:", e);
    }
  }
  return storeInstance;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadInitialSettings(),

  setTheme: (theme) => {
    set({ theme });
    get().saveSettings();
  },

  setSettingsUiTheme: (settingsUiTheme) => {
    set({ settingsUiTheme });
    get().saveSettings();
  },

  setFontFamily: (fontFamily) => {
    applyFontAttribute(fontFamily);
    set({ fontFamily });
    get().saveSettings();
  },

  setDisplayMode: (displayMode) => {
    set({ displayMode });
    get().saveSettings();
  },

  setFontSize: (fontSize) => {
    set({ fontSize });
    get().saveSettings();
  },

  setFontWeight: (fontWeight) => {
    set({ fontWeight });
    get().saveSettings();
  },

  setActiveLyricColor: (activeLyricColor) => {
    set({ activeLyricColor });
    get().saveSettings();
  },

  setInactiveLyricColor: (inactiveLyricColor) => {
    set({ inactiveLyricColor });
    get().saveSettings();
  },

  setActiveLinesCount: (activeLinesCount) => {
    set({ activeLinesCount });
    get().saveSettings();
  },

  setOpacity: (opacity) => {
    set({ opacity });
    get().saveSettings();
  },

  setBgOpacity: (bgOpacity) => {
    set({ bgOpacity });
    get().saveSettings();
  },

  setBgBlur: (bgBlur) => {
    set({ bgBlur });
    get().saveSettings();
  },

  setShowBorder: (showBorder) => {
    set({ showBorder });
    get().saveSettings();
  },

  setBorderColor: (borderColor) => {
    set({ borderColor });
    get().saveSettings();
  },

  setBorderWidth: (borderWidth) => {
    set({ borderWidth });
    get().saveSettings();
  },

  setCornerRadius: (cornerRadius) => {
    set({ cornerRadius });
    get().saveSettings();
  },

  setLyricsOffsetMs: (lyricsOffsetMs) => {
    set({ lyricsOffsetMs });
    get().saveSettings();
  },

  setAlwaysOnTop: (alwaysOnTop) => {
    set({ alwaysOnTop });
    get().saveSettings();
  },

  setClickThroughDefault: (clickThroughDefault) => {
    set({ clickThroughDefault });
    get().saveSettings();
  },

  setAutoHideTimeout: (autoHideTimeout) => {
    set({ autoHideTimeout });
    get().saveSettings();
  },

  setLyricsProvider: (lyricsProvider) => {
    set({ lyricsProvider });
    get().saveSettings();
  },

  setDebugMode: (debugMode) => {
    set({ debugMode });
    get().saveSettings();
  },

  resetDefaults: () => {
    applyFontAttribute(DEFAULT_SETTINGS.fontFamily);
    set({ ...DEFAULT_SETTINGS });
    get().saveSettings();
  },

  applyExternalSettings: (settings) => {
    applyFontAttribute(settings.fontFamily);
    set((state) => ({ ...state, ...settings }));
  },

  loadSettings: async () => {
    const store = await getPluginStore();
    if (!store) return;

    try {
      const keys = Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[];
      const loaded: Record<string, unknown> = {};

      for (const k of keys) {
        const val = await store.get(k);
        if (val !== null && val !== undefined) {
          loaded[k] = val;
        }
      }

      if (Object.keys(loaded).length > 0) {
        applyFontAttribute(loaded.fontFamily as string);
        set((state) => ({ ...state, ...loaded }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get() }));
      }
    } catch (e) {
      console.warn("Failed reading plugin store:", e);
    }
  },

  saveSettings: async () => {
    const currentState = get();

    // 1. Instant save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    } catch (e) {
      console.warn("localStorage save failed:", e);
    }

    // 2. Broadcast live update to other windows via BroadcastChannel & Tauri Event
    if (broadcastChannel) {
      broadcastChannel.postMessage(currentState);
    }
    try {
      await emit("lyrica://settings-updated", currentState);
    } catch (e) {
      // Ignore outside Tauri
    }

    // 3. Save to tauri-plugin-store settings.json
    const store = await getPluginStore();
    if (!store) return;

    try {
      const keys = Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[];
      for (const k of keys) {
        await store.set(k, currentState[k]);
      }
      await store.save();
    } catch (e) {
      console.warn("Plugin store save failed:", e);
    }
  },
}));

// Listen for cross-window broadcast messages
if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    if (event.data && typeof event.data === "object") {
      useSettingsStore.getState().applyExternalSettings(event.data);
    }
  };
}

// Listen for localStorage changes from other windows
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        useSettingsStore.getState().applyExternalSettings(parsed);
      } catch (err) {
        // ignore
      }
    }
  });

  listen("lyrica://settings-updated", (event: any) => {
    if (event.payload && typeof event.payload === "object") {
      useSettingsStore.getState().applyExternalSettings(event.payload);
    }
  });
}
