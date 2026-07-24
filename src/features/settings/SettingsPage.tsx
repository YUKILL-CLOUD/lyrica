import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  useSettingsStore,
  FontFamily,
  AppTheme,
  SettingsUiTheme,
  DisplayMode,
} from "./settingsStore";
import { tauriCommands } from "@/services/tauriCommands";
import { invoke } from "@tauri-apps/api/core";
import {
  Check,
  RotateCcw,
  Palette,
  PlayCircle,
  Music,
  Code,
  Clock,
  Sun,
  Moon,
  Laptop,
  Layers,
  Sparkles,
} from "lucide-react";

const COLOR_SWATCHES = [
  { name: "Sky Blue", hex: "#38bdf8" },
  { name: "Electric Violet", hex: "#a855f7" },
  { name: "Emerald Green", hex: "#22c55e" },
  { name: "Rose Pink", hex: "#f43f5e" },
  { name: "Amber Gold", hex: "#eab308" },
  { name: "Pure White", hex: "#ffffff" },
];

const BORDER_COLOR_SWATCHES = [
  { name: "Subtle White", hex: "rgba(255, 255, 255, 0.15)" },
  { name: "Bright White", hex: "rgba(255, 255, 255, 0.4)" },
  { name: "Cyan Glass", hex: "rgba(56, 189, 248, 0.4)" },
  { name: "Amber Glass", hex: "rgba(245, 158, 11, 0.4)" },
  { name: "Rose Glass", hex: "rgba(244, 63, 94, 0.4)" },
  { name: "None", hex: "transparent" },
];

export const SettingsPage: React.FC = () => {
  const {
    theme,
    settingsUiTheme,
    fontFamily,
    displayMode,
    fontSize,
    activeLyricColor,
    opacity,
    bgOpacity,
    bgBlur,
    showBorder,
    borderColor,
    borderWidth,
    cornerRadius,
    lyricsOffsetMs,
    alwaysOnTop,
    autoHideTimeout,
    debugMode,
    setTheme,
    setSettingsUiTheme,
    setFontFamily,
    setDisplayMode,
    setFontSize,
    setActiveLyricColor,
    setOpacity,
    setBgOpacity,
    setBgBlur,
    setShowBorder,
    setBorderColor,
    setBorderWidth,
    setCornerRadius,
    setLyricsOffsetMs,
    setAlwaysOnTop,
    setAutoHideTimeout,
    setDebugMode,
    resetDefaults,
    loadSettings,
  } = useSettingsStore();

  const [savedNotice, setSavedNotice] = useState(false);
  const [systemIsDark, setSystemIsDark] = useState(false);

  useEffect(() => {
    loadSettings();

    if (typeof window !== "undefined") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      setSystemIsDark(media.matches);

      const listener = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, [loadSettings]);

  const triggerSaveNotice = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const getNumVal = (val: any) => (Array.isArray(val) ? val[0] : Number(val));

  const handleClose = async () => {
    try {
      await tauriCommands.closeSettingsWindow();
    } catch (e) {
      console.warn("Could not close settings:", e);
    }
  };

  // Determine actual Settings Window Theme (Independent of Overlay Theme)
  const isSettingsDark =
    settingsUiTheme === "dark" ||
    (settingsUiTheme === "system" && systemIsDark);

  return (
    <div
      className={`w-full min-h-screen transition-colors duration-200 flex flex-col p-6 select-none font-sans ${
        isSettingsDark
          ? "bg-[#09090b] text-neutral-100"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Header */}
      <div
        className={`flex items-center justify-between pb-4 border-b mb-6 ${
          isSettingsDark ? "border-neutral-800/80" : "border-slate-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <img
            src="/app-logo.png"
            alt="Lyrica Logo"
            className="w-10 h-10 rounded-xl object-contain shadow-sm border border-neutral-800"
          />
          <div>
            <h1
              className={`text-lg font-bold tracking-tight ${
                isSettingsDark ? "text-white" : "text-slate-900"
              }`}
            >
              Lyrica Preferences
            </h1>
            <p
              className={`text-xs ${
                isSettingsDark ? "text-neutral-400" : "text-slate-500"
              }`}
            >
              Customize floating lyrics layout, transparency, timing sync, and themes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Settings UI Theme Selector (Dark / Light / System) */}
          <div
            className={`flex items-center gap-0.5 p-1 rounded-lg border ${
              isSettingsDark
                ? "bg-[#141417] border-neutral-800"
                : "bg-slate-200/80 border-slate-300"
            }`}
            title="Settings Window UI Theme"
          >
            {[
              { id: "dark", label: "Dark", icon: Moon },
              { id: "light", label: "Light", icon: Sun },
              { id: "system", label: "System", icon: Laptop },
            ].map((st) => {
              const Icon = st.icon;
              const isActive = settingsUiTheme === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => {
                    setSettingsUiTheme(st.id as SettingsUiTheme);
                    triggerSaveNotice();
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? isSettingsDark
                        ? "bg-sky-600 text-white shadow-sm font-semibold"
                        : "bg-white text-slate-900 shadow-sm font-semibold"
                      : isSettingsDark
                      ? "text-neutral-400 hover:text-neutral-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {st.label}
                </button>
              );
            })}
          </div>

          {/* Saved Status Indicator */}
          {savedNotice && (
            <span className="text-xs text-emerald-500 font-medium flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}

          {/* Reset Defaults Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              resetDefaults();
              triggerSaveNotice();
            }}
            className={`text-xs ${
              isSettingsDark
                ? "text-neutral-400 hover:text-white hover:bg-neutral-900"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
            title="Reset all settings to factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Defaults
          </Button>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="appearance" className="flex-1 flex flex-col">
        <TabsList
          className={`w-full h-auto flex items-center justify-between gap-1 border rounded-xl p-1.5 mb-6 ${
            isSettingsDark
              ? "bg-[#121215] border-neutral-800/80"
              : "bg-slate-200/70 border-slate-300/80"
          }`}
        >
          <TabsTrigger
            value="appearance"
            className={`flex-1 h-9 px-2 text-xs flex items-center justify-center gap-1.5 rounded-lg transition-all cursor-pointer ${
              isSettingsDark
                ? "text-neutral-300 hover:text-white data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-md font-semibold"
                : "text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold"
            }`}
          >
            <Palette className="w-3.5 h-3.5 shrink-0" /> Appearance
          </TabsTrigger>
          <TabsTrigger
            value="overlay"
            className={`flex-1 h-9 px-2 text-xs flex items-center justify-center gap-1.5 rounded-lg transition-all cursor-pointer ${
              isSettingsDark
                ? "text-neutral-300 hover:text-white data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-md font-semibold"
                : "text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold"
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" /> Overlay & Border
          </TabsTrigger>
          <TabsTrigger
            value="behavior"
            className={`flex-1 h-9 px-2 text-xs flex items-center justify-center gap-1.5 rounded-lg transition-all cursor-pointer ${
              isSettingsDark
                ? "text-neutral-300 hover:text-white data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-md font-semibold"
                : "text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold"
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5 shrink-0" /> Behavior
          </TabsTrigger>
          <TabsTrigger
            value="lyrics"
            className={`flex-1 h-9 px-2 text-xs flex items-center justify-center gap-1.5 rounded-lg transition-all cursor-pointer ${
              isSettingsDark
                ? "text-neutral-300 hover:text-white data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-md font-semibold"
                : "text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold"
            }`}
          >
            <Music className="w-3.5 h-3.5 shrink-0" /> Lyrics & Sync
          </TabsTrigger>
          <TabsTrigger
            value="developer"
            className={`flex-1 h-9 px-2 text-xs flex items-center justify-center gap-1.5 rounded-lg transition-all cursor-pointer ${
              isSettingsDark
                ? "text-neutral-300 hover:text-white data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-md font-semibold"
                : "text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-semibold"
            }`}
          >
            <Code className="w-3.5 h-3.5 shrink-0" /> Developer
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Appearance */}
        <TabsContent value="appearance" className="space-y-6">
          {/* Display Mode */}
          <div
            className={`p-4 rounded-xl border ${
              isSettingsDark
                ? "bg-[#121215] border-neutral-800/80"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-sky-500" />
              <label
                className={`text-xs font-bold ${
                  isSettingsDark ? "text-neutral-200" : "text-slate-800"
                }`}
              >
                Display Layout Mode
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "full", label: "Full Mode", desc: "Artwork + Title + Lyrics" },
                { id: "compact", label: "Compact Mode", desc: "Minimal Header + Lyrics" },
                { id: "lyrics-only", label: "Lyrics Only", desc: "Pure Floating Text" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setDisplayMode(m.id as DisplayMode);
                    triggerSaveNotice();
                  }}
                  className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                    displayMode === m.id
                      ? "border-sky-500 bg-sky-500/10 text-sky-400 shadow-sm ring-1 ring-sky-500/30"
                      : isSettingsDark
                      ? "border-neutral-800 bg-[#18181c] text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  <div className="text-xs font-bold">{m.label}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    {m.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Lyric Highlight Color */}
          <div
            className={`p-4 rounded-xl border ${
              isSettingsDark
                ? "bg-[#121215] border-neutral-800/80"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-sky-500" />
              <label
                className={`text-xs font-bold ${
                  isSettingsDark ? "text-neutral-200" : "text-slate-800"
                }`}
              >
                Active Lyric Highlight Color
              </label>
            </div>
            <div className="flex items-center gap-3">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.hex}
                  onClick={() => {
                    setActiveLyricColor(swatch.hex);
                    triggerSaveNotice();
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center shadow-sm cursor-pointer ${
                    activeLyricColor === swatch.hex
                      ? "border-sky-500 scale-110 ring-2 ring-sky-500/40"
                      : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                  title={swatch.name}
                >
                  {activeLyricColor === swatch.hex && (
                    <Check
                      className={`w-4 h-4 ${
                        swatch.hex === "#ffffff" ? "text-slate-900" : "text-white"
                      }`}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Overlay Color Theme */}
          <div
            className={`p-4 rounded-xl border ${
              isSettingsDark
                ? "bg-[#121215] border-neutral-800/80"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-sky-500" />
                <label
                  className={`text-xs font-bold ${
                    isSettingsDark ? "text-neutral-200" : "text-slate-800"
                  }`}
                >
                  Floating Overlay Color Theme
                </label>
              </div>
              <span className="text-[10px] text-neutral-500">
                Controls the floating lyrics overlay on your desktop
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: "dark", label: "Dark Slate", desc: "Default dark" },
                { id: "oled", label: "OLED Black", desc: "#000000 Pitch black" },
                { id: "light", label: "Light Mode", desc: "Bright white card" },
                { id: "system", label: "System", desc: "Match OS theme" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id as AppTheme);
                    triggerSaveNotice();
                  }}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    theme === t.id
                      ? "border-sky-500 bg-sky-500/10 text-sky-400 shadow-sm ring-1 ring-sky-500/30"
                      : isSettingsDark
                      ? "border-neutral-800 bg-[#18181c] text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  <div className="text-xs font-bold">{t.label}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    {t.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div
            className={`p-4 rounded-xl border ${
              isSettingsDark
                ? "bg-[#121215] border-neutral-800/80"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <label
                className={`text-xs font-bold ${
                  isSettingsDark ? "text-neutral-200" : "text-slate-800"
                }`}
              >
                Font Family
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: "geist", label: "Geist Sans" },
                { id: "inter", label: "Inter" },
                { id: "jetbrains-mono", label: "JetBrains Mono" },
                { id: "outfit", label: "Outfit" },
                { id: "nunito", label: "Nunito" },
                { id: "playfair", label: "Playfair Display" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFontFamily(f.id as FontFamily);
                    triggerSaveNotice();
                  }}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                    fontFamily === f.id
                      ? "border-sky-500 bg-sky-500/10 text-sky-400 shadow-sm"
                      : isSettingsDark
                      ? "border-neutral-800 bg-[#18181c] text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isSettingsDark
                ? "bg-[#121215] border-neutral-800/80"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex justify-between items-center text-xs font-bold">
              <span className={isSettingsDark ? "text-neutral-200" : "text-slate-800"}>
                Active Lyric Font Size
              </span>
              <span className="text-sky-500 font-mono font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                {fontSize}px
              </span>
            </div>
            <Slider
              value={[fontSize]}
              min={12}
              max={32}
              step={1}
              onValueChange={(val: any) => {
                setFontSize(getNumVal(val));
                triggerSaveNotice();
              }}
            />
          </div>
        </TabsContent>

        {/* Tab 2: Overlay & Border */}
        <TabsContent value="overlay" className="space-y-6">
          {/* Border Visibility Toggle */}
          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              isSettingsDark
                ? "bg-[#121215] border-neutral-800/80"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div>
              <div
                className={`text-xs font-bold ${
                  isSettingsDark ? "text-neutral-200" : "text-slate-900"
                }`}
              >
                Show Overlay Border
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                Toggle outer card border visibility
              </div>
            </div>
            <Switch
              checked={showBorder}
              onCheckedChange={(val: boolean) => {
                setShowBorder(val);
                triggerSaveNotice();
              }}
            />
          </div>

          {/* Border Color Swatches */}
          {showBorder && (
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                isSettingsDark
                  ? "bg-[#121215] border-neutral-800/80"
                  : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              <label
                className={`text-xs font-bold block ${
                  isSettingsDark ? "text-neutral-200" : "text-slate-800"
                }`}
              >
                Border Color
              </label>
              <div className="flex items-center gap-3">
                {BORDER_COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    onClick={() => {
                      setBorderColor(swatch.hex);
                      triggerSaveNotice();
                    }}
                    className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center shadow-sm cursor-pointer ${
                      borderColor === swatch.hex
                        ? "border-sky-500 scale-110 ring-2 ring-sky-500/40"
                        : "border-neutral-700 opacity-80 hover:opacity-100 hover:scale-105"
                    }`}
                    style={{
                      backgroundColor:
                        swatch.hex === "transparent" ? "#f1f5f9" : swatch.hex,
                    }}
                    title={swatch.name}
                  >
                    {borderColor === swatch.hex && (
                      <Check className="w-4 h-4 text-sky-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Border Width */}
          {showBorder && (
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                isSettingsDark
                  ? "bg-[#121215] border-neutral-800/80"
                  : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              <div className="flex justify-between items-center text-xs font-bold">
                <span className={isSettingsDark ? "text-neutral-200" : "text-slate-800"}>
                  Border Width
                </span>
                <span className="text-sky-500 font-mono font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  {borderWidth}px
                </span>
              </div>
              <Slider
                value={[borderWidth]}
                min={1}
                max={4}
                step={1}
                onValueChange={(val: any) => {
                  setBorderWidth(getNumVal(val));
                  triggerSaveNotice();
                }}
              />
            </div>
          )}

          {/* Corner Radius */}
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isSettingsDark
                ? "bg-[#121215] border-neutral-800/80"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex justify-between items-center text-xs font-bold">
              <span className={isSettingsDark ? "text-neutral-200" : "text-slate-800"}>
                Corner Roundness (Radius)
              </span>
              <span className="text-sky-500 font-mono font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                {cornerRadius}px
              </span>
            </div>
            <Slider
              value={[cornerRadius]}
              min={0}
              max={32}
              step={2}
              onValueChange={(val: any) => {
                setCornerRadius(getNumVal(val));
                triggerSaveNotice();
              }}
            />
          </div>

          {/* Background Opacity */}
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isSettingsDark
                ? "bg-[#121215] border-neutral-800/80"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex justify-between items-center text-xs font-bold">
              <span className={isSettingsDark ? "text-neutral-200" : "text-slate-800"}>
                Card Background Opacity
              </span>
              <span className="text-sky-500 font-mono font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                {Math.round(bgOpacity * 100)}%
              </span>
            </div>
            <Slider
              value={[bgOpacity]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={(val: any) => {
                setBgOpacity(getNumVal(val));
                triggerSaveNotice();
              }}
            />
            <p className="text-[10px] text-neutral-500">
              Set to 0% for pure floating text without container box
            </p>
          </div>

          {/* Background Blur */}
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isSettingsDark
                ? "bg-[#121215] border-neutral-800/80"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex justify-between items-center text-xs font-bold">
              <span className={isSettingsDark ? "text-neutral-200" : "text-slate-800"}>
                Glassmorphism Backdrop Blur
              </span>
              <span className="text-sky-500 font-mono font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                {bgBlur}px
              </span>
            </div>
            <Slider
              value={[bgBlur]}
              min={0}
              max={30}
              step={2}
              onValueChange={(val: any) => {
                setBgBlur(getNumVal(val));
                triggerSaveNotice();
              }}
            />
          </div>

          {/* Overall Window Opacity */}
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isSettingsDark
                ? "bg-[#121215] border-neutral-800/80"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex justify-between items-center text-xs font-bold">
              <span className={isSettingsDark ? "text-neutral-200" : "text-slate-800"}>
                Overall Overlay Window Opacity
              </span>
              <span className="text-sky-500 font-mono font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <Slider
              value={[opacity]}
              min={0.2}
              max={1}
              step={0.05}
              onValueChange={(val: any) => {
                setOpacity(getNumVal(val));
                triggerSaveNotice();
              }}
            />
          </div>

          {/* Always On Top */}
          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              isSettingsDark
                ? "bg-[#121215] border-neutral-800/80"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div>
              <div
                className={`text-xs font-bold ${
                  isSettingsDark ? "text-neutral-200" : "text-slate-900"
                }`}
              >
                Always On Top
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                Keep lyrics floating above all Windows applications
              </div>
            </div>
            <Switch
              checked={alwaysOnTop}
              onCheckedChange={(val: boolean) => {
                setAlwaysOnTop(val);
                triggerSaveNotice();
              }}
            />
          </div>
        </TabsContent>

        {/* Tab 3: Behavior */}
        <TabsContent value="behavior" className="space-y-6">
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isSettingsDark
                ? "bg-[#121215] border-neutral-800/80"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex justify-between items-center text-xs font-bold">
              <span className={isSettingsDark ? "text-neutral-200" : "text-slate-800"}>
                Auto-Hide Timeout (When Music Paused / Stopped)
              </span>
              <span className="text-sky-500 font-mono font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                {autoHideTimeout === 0 ? "Disabled" : `${autoHideTimeout}s`}
              </span>
            </div>
            <Slider
              value={[autoHideTimeout]}
              min={0}
              max={60}
              step={5}
              onValueChange={(val: any) => {
                setAutoHideTimeout(getNumVal(val));
                triggerSaveNotice();
              }}
            />
            <p className="text-[10px] text-neutral-500">
              Overlay automatically stays 100% visible while music is actively playing
            </p>
          </div>
        </TabsContent>

        {/* Tab 4: Lyrics & Timing Sync */}
        <TabsContent value="lyrics" className="space-y-6">
          {/* Lyrics Sync Offset Delay Compensation */}
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isSettingsDark
                ? "bg-sky-500/5 border-sky-500/20"
                : "bg-sky-50/50 border-sky-200 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-500" />
                <span
                  className={`text-xs font-bold ${
                    isSettingsDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Lyrics Sync Offset (Delay Compensation)
                </span>
              </div>
              <span className="text-xs font-bold font-mono text-sky-500 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                {lyricsOffsetMs > 0
                  ? `+${lyricsOffsetMs}ms (Later)`
                  : lyricsOffsetMs < 0
                  ? `${lyricsOffsetMs}ms (Earlier)`
                  : "0ms (Exact Sync)"}
              </span>
            </div>

            <Slider
              value={[lyricsOffsetMs]}
              min={-2000}
              max={2000}
              step={50}
              onValueChange={(val: any) => {
                setLyricsOffsetMs(getNumVal(val));
                triggerSaveNotice();
              }}
            />

            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-neutral-500">
                Adjust slider if lyrics feel delayed or ahead of audio.
              </p>
              <div className="flex gap-1.5">
                {[-500, 0, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setLyricsOffsetMs(preset);
                      triggerSaveNotice();
                    }}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono border transition-all cursor-pointer ${
                      lyricsOffsetMs === preset
                        ? "bg-sky-600 text-white border-sky-600 font-bold"
                        : isSettingsDark
                        ? "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {preset > 0 ? `+${preset}ms` : `${preset}ms`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border space-y-2 ${
              isSettingsDark
                ? "bg-[#121215] border-neutral-800/80"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <label
              className={`text-xs font-bold block ${
                isSettingsDark ? "text-neutral-200" : "text-slate-800"
              }`}
            >
              Primary Lyrics Provider
            </label>
            <div
              className={`p-3 rounded-lg border text-xs ${
                isSettingsDark
                  ? "bg-[#18181c] border-neutral-800 text-neutral-300"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <span className="font-bold text-sky-500">LRCLIB</span> — Open-Source Synchronized LRC Database
            </div>
          </div>
        </TabsContent>

        {/* Tab 5: Developer */}
        <TabsContent value="developer" className="space-y-6">
          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              isSettingsDark
                ? "bg-[#121215] border-neutral-800/80"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div>
              <div
                className={`text-xs font-bold ${
                  isSettingsDark ? "text-neutral-200" : "text-slate-900"
                }`}
              >
                Debug Logging
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                Write detailed trace events to disk log files
              </div>
            </div>
            <Switch
              checked={debugMode}
              onCheckedChange={(val: boolean) => {
                setDebugMode(val);
                triggerSaveNotice();
              }}
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await invoke("open_log_dir");
              } catch (e) {
                console.warn(e);
              }
            }}
            className={`text-xs ${
              isSettingsDark
                ? "bg-[#18181c] border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            Open Diagnostic Logs Folder
          </Button>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div
        className={`pt-4 border-t flex items-center justify-between mt-auto ${
          isSettingsDark ? "border-neutral-800/80" : "border-slate-200"
        }`}
      >
        <span className="text-[10px] text-neutral-500 font-mono">
          Lyrica v0.1.0 • Windows 11 Floating Lyrics
        </span>

        <Button
          size="sm"
          onClick={handleClose}
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-6 shadow-sm cursor-pointer"
        >
          Done
        </Button>
      </div>
    </div>
  );
};
