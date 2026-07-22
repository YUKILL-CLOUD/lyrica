import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useSettingsStore, FontFamily, AppTheme, DisplayMode } from "./settingsStore";
import { tauriCommands } from "@/services/tauriCommands";
import { invoke } from "@tauri-apps/api/core";
import { Check, RotateCcw, Palette, Sliders, PlayCircle, Music, Code, Clock } from "lucide-react";

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

  useEffect(() => {
    loadSettings();
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

  return (
    <div className="w-full min-h-screen bg-white text-slate-900 flex flex-col p-6 select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>⚙️</span> Lyrica Settings
          </h1>
          <p className="text-xs text-slate-500">
            Customize floating lyrics layout, transparency, timing sync, and colors
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedNotice && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              resetDefaults();
              triggerSaveNotice();
            }}
            className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            title="Reset all settings to factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Defaults
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="appearance" className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-5 bg-slate-100 border border-slate-200 rounded-lg p-1 mb-6">
          <TabsTrigger value="appearance" className="text-xs flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            <Palette className="w-3.5 h-3.5" /> Appearance
          </TabsTrigger>
          <TabsTrigger value="overlay" className="text-xs flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            <Sliders className="w-3.5 h-3.5" /> Overlay & Border
          </TabsTrigger>
          <TabsTrigger value="behavior" className="text-xs flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            <PlayCircle className="w-3.5 h-3.5" /> Behavior
          </TabsTrigger>
          <TabsTrigger value="lyrics" className="text-xs flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            <Music className="w-3.5 h-3.5" /> Lyrics & Sync
          </TabsTrigger>
          <TabsTrigger value="developer" className="text-xs flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            <Code className="w-3.5 h-3.5" /> Developer
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Appearance */}
        <TabsContent value="appearance" className="space-y-6">
          {/* Display Mode */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Display Layout Mode</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "full", label: "Full", desc: "Artwork + Title + Lyrics" },
                { id: "compact", label: "Compact", desc: "Small Header + Lyrics" },
                { id: "lyrics-only", label: "Lyrics Only", desc: "Pure Floating Text" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setDisplayMode(m.id as DisplayMode);
                    triggerSaveNotice();
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    displayMode === m.id
                      ? "border-sky-600 bg-sky-50 text-slate-900 shadow-sm"
                      : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="text-xs font-bold">{m.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Lyric Highlight Color */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Active Lyric Highlight Color</label>
            <div className="flex items-center gap-3">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.hex}
                  onClick={() => {
                    setActiveLyricColor(swatch.hex);
                    triggerSaveNotice();
                  }}
                  className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                    activeLyricColor === swatch.hex
                      ? "border-slate-900 scale-110 shadow-md"
                      : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                  title={swatch.name}
                >
                  {activeLyricColor === swatch.hex && (
                    <Check className={`w-3.5 h-3.5 ${swatch.hex === "#ffffff" ? "text-slate-900" : "text-white"}`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Color Theme</label>
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: "dark", label: "Dark Slate", desc: "Default dark" },
                { id: "oled", label: "OLED Black", desc: "#000000 Pitch black" },
                { id: "light", label: "Light", desc: "Bright mode" },
                { id: "system", label: "System", desc: "Match OS" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id as AppTheme);
                    triggerSaveNotice();
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    theme === t.id
                      ? "border-sky-600 bg-sky-50 text-slate-900 shadow-sm"
                      : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="text-xs font-bold">{t.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Font Family</label>
            <div className="grid grid-cols-3 gap-2">
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
                  className={`px-3 py-2 rounded-md border text-xs font-medium transition-all ${
                    fontFamily === f.id
                      ? "border-sky-600 bg-sky-50 text-slate-900 shadow-sm"
                      : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Active Lyric Font Size</span>
              <span className="text-sky-600 font-bold">{fontSize}px</span>
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
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-900">Show Overlay Border</div>
              <div className="text-[10px] text-slate-500">Toggle outer card border visibility</div>
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
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Border Color</label>
              <div className="flex items-center gap-3">
                {BORDER_COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    onClick={() => {
                      setBorderColor(swatch.hex);
                      triggerSaveNotice();
                    }}
                    className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                      borderColor === swatch.hex
                        ? "border-slate-900 scale-110 shadow-md"
                        : "border-slate-300 opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: swatch.hex === "transparent" ? "#f1f5f9" : swatch.hex }}
                    title={swatch.name}
                  >
                    {borderColor === swatch.hex && <Check className="w-3.5 h-3.5 text-slate-900" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Border Width */}
          {showBorder && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Border Width</span>
                <span className="text-sky-600 font-bold">{borderWidth}px</span>
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
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Corner Roundness (Radius)</span>
              <span className="text-sky-600 font-bold">{cornerRadius}px</span>
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
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Card Background Opacity</span>
              <span className="text-sky-600 font-bold">{Math.round(bgOpacity * 100)}%</span>
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
            <p className="text-[10px] text-slate-500">Set to 0% for pure floating text without container box</p>
          </div>

          {/* Background Blur */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Glassmorphism Backdrop Blur</span>
              <span className="text-sky-600 font-bold">{bgBlur}px</span>
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
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Overall Overlay Window Opacity</span>
              <span className="text-sky-600 font-bold">{Math.round(opacity * 100)}%</span>
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
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-900">Always On Top</div>
              <div className="text-[10px] text-slate-500">Keep lyrics floating above all Windows applications</div>
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
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Auto-Hide Timeout (When Music Paused / Stopped)</span>
              <span className="text-sky-600 font-bold">
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
            <p className="text-[10px] text-slate-500">
              Overlay automatically stays 100% visible while music is actively playing
            </p>
          </div>
        </TabsContent>

        {/* Tab 4: Lyrics & Timing Sync */}
        <TabsContent value="lyrics" className="space-y-6">
          {/* Lyrics Sync Offset Delay Compensation */}
          <div className="space-y-3 p-4 rounded-lg bg-sky-50/50 border border-sky-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-900">Lyrics Sync Offset (Delay Compensation)</span>
              </div>
              <span className="text-xs font-bold font-mono text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-300">
                {lyricsOffsetMs > 0 ? `+${lyricsOffsetMs}ms (Later)` : lyricsOffsetMs < 0 ? `${lyricsOffsetMs}ms (Earlier)` : "0ms (Exact Sync)"}
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
              <p className="text-[10px] text-slate-500">
                Adjust slider if lyrics feel delayed or ahead of audio.
              </p>
              <div className="flex gap-1">
                {[-500, 0, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setLyricsOffsetMs(preset);
                      triggerSaveNotice();
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                      lyricsOffsetMs === preset
                        ? "bg-sky-600 text-white border-sky-600"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {preset > 0 ? `+${preset}ms` : `${preset}ms`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Primary Lyrics Provider</label>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <span className="font-bold text-sky-600">LRCLIB</span> — Open-Source Synchronized LRC Database
            </div>
          </div>
        </TabsContent>

        {/* Tab 5: Developer */}
        <TabsContent value="developer" className="space-y-6">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-900">Debug Logging</div>
              <div className="text-[10px] text-slate-500">Write detailed trace events to disk log files</div>
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
            className="text-xs bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
          >
            Open Diagnostic Logs Folder
          </Button>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between mt-auto">
        <span className="text-[10px] text-slate-400 font-mono">
          Lyrica v0.1.0 • Windows 11 Floating Lyrics
        </span>

        <Button
          size="sm"
          onClick={handleClose}
          className="bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs px-6 shadow-sm"
        >
          Done
        </Button>
      </div>
    </div>
  );
};
