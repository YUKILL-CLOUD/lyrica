import React, { useEffect, useRef, useState } from "react";
import { TrackInfoBar } from "@/components/overlay/TrackInfoBar";
import { LyricsDisplay } from "@/components/overlay/LyricsDisplay";
import { EditModeIndicator } from "@/components/overlay/EditModeIndicator";
import { IdleState } from "@/components/overlay/IdleState";
import { useOverlayStore } from "@/features/overlay/overlayStore";
import { useSettingsStore } from "@/features/settings/settingsStore";
import { useMusicStore } from "@/features/music/musicStore";
import { useLyricsStore } from "@/features/lyrics/lyricsStore";
import { useMusicEvents } from "@/features/music/useMusicEvents";
import { useLyrics } from "@/hooks/useLyrics";
import { useRafSync } from "@/hooks/useRafSync";
import { useAutoHide } from "@/hooks/useAutoHide";
import { tauriCommands } from "@/services/tauriCommands";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const OverlayWindow: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);

  const {
    isLocked,
    isAutoHidden,
    toggleLock,
    setIsLocked,
    syncLockStateWithRust,
  } = useOverlayStore();

  const {
    theme,
    fontFamily,
    displayMode,
    fontSize,
    fontWeight,
    activeLyricColor,
    inactiveLyricColor,
    opacity,
    bgOpacity,
    bgBlur,
    showBorder,
    borderColor,
    borderWidth,
    cornerRadius,
    loadSettings,
  } = useSettingsStore();

  const { currentTrack, playbackState, activeProvider } = useMusicStore();
  const { parsedLines, status } = useLyricsStore();

  // Bind background SMTC music detection events
  useMusicEvents();

  // Load persisted user settings
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Set font-family and theme attribute on html
  useEffect(() => {
    document.documentElement.setAttribute("data-font", fontFamily);
    if (theme === "oled") {
      document.documentElement.className = "overlay-mode oled";
    } else if (theme === "light") {
      document.documentElement.className = "overlay-mode light";
    } else {
      document.documentElement.className = "overlay-mode dark";
    }
  }, [fontFamily, theme]);

  // Dynamic Font Size Auto-Scaling on Box Resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Base dimensions 480x200
        const scaleW = width / 480;
        const scaleH = height / 200;
        const calculatedScale = Math.min(scaleW, scaleH);
        // Clamp scale between 0.75x and 2.5x
        const clamped = Math.max(0.75, Math.min(2.5, calculatedScale));
        setScaleFactor(clamped);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch & cache LRCLIB synced lyrics
  const { refetch: refetchLyrics } = useLyrics(currentTrack);

  // Synchronize playback position with parsed lyrics via rAF
  const { context } = useRafSync(parsedLines, playbackState);

  // Inactivity auto-hide (only triggers when music is stopped/idle)
  useAutoHide(playbackState.isPlaying);

  // Sync initial lock state & listen for system tray event updates
  useEffect(() => {
    syncLockStateWithRust();

    let unlistenLock: (() => void) | null = null;
    let unlistenRefresh: (() => void) | null = null;

    tauriCommands
      .onOverlayLockedChange((locked) => {
        setIsLocked(locked);
      })
      .then((fn) => {
        unlistenLock = fn;
      });

    tauriCommands
      .onRefreshLyrics(() => {
        refetchLyrics();
      })
      .then((fn) => {
        unlistenRefresh = fn;
      });

    return () => {
      if (unlistenLock) unlistenLock();
      if (unlistenRefresh) unlistenRefresh();
    };
  }, [refetchLyrics, setIsLocked, syncLockStateWithRust]);

  const handleCardMouseDown = async (e: React.MouseEvent) => {
    if (isLocked) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".pointer-events-auto")) {
      return;
    }
    try {
      await getCurrentWindow().startDragging();
    } catch (err) {
      // Fallback outside Tauri
    }
  };

  const hasTrack = Boolean(currentTrack && currentTrack.title);

  // Auto-scale font size dynamically based on box dimensions
  const effectiveFontSize = Math.round(fontSize * scaleFactor);

  // Dynamic card background & border styling based on user settings
  const cardStyle: React.CSSProperties = {
    backgroundColor:
      theme === "oled"
        ? `rgba(0, 0, 0, ${bgOpacity})`
        : `rgba(18, 18, 22, ${bgOpacity})`,
    backdropFilter: `blur(${bgBlur}px) saturate(180%)`,
    WebkitBackdropFilter: `blur(${bgBlur}px) saturate(180%)`,
    border: !isLocked
      ? "2px solid rgba(245, 158, 11, 0.8)" // Amber highlight in edit mode
      : showBorder
      ? `${borderWidth}px solid ${borderColor}`
      : "none",
    borderRadius: `${cornerRadius}px`,
    boxShadow: "none !important",
    filter: "none !important",
  };

  return (
    <div
      className={`lyrica-overlay-wrapper w-screen h-screen p-0 m-0 overflow-hidden select-none ${
        isAutoHidden ? "auto-hidden" : ""
      }`}
      style={{ opacity: isAutoHidden ? 0 : opacity }}
    >
      <div
        ref={containerRef}
        onMouseDown={handleCardMouseDown}
        data-tauri-drag-region
        className={`relative w-full h-full p-4 transition-colors duration-200 flex flex-col justify-between ${
          !isLocked ? "cursor-move" : ""
        }`}
        style={cardStyle}
      >
        {/* Lock / Drag indicator banner */}
        <EditModeIndicator isLocked={isLocked} onLockToggle={toggleLock} />

        {hasTrack ? (
          <>
            {/* Header with track metadata (Hidden in "lyrics-only" display mode) */}
            {displayMode !== "lyrics-only" && (
              <div data-tauri-drag-region className="mb-1 pr-16 select-none shrink-0">
                <TrackInfoBar
                  title={currentTrack?.title}
                  artist={currentTrack?.artist}
                  album={displayMode === "full" ? currentTrack?.album : undefined}
                  albumArt={currentTrack?.albumArt}
                  source={currentTrack?.source}
                  confidence={activeProvider.confidence}
                  compact={displayMode === "compact"}
                />
              </div>
            )}

            {/* Lyrics synchronization display with Auto-Scaled Font Size */}
            <div data-tauri-drag-region className="w-full flex-1 flex items-center justify-center min-h-0 overflow-hidden">
              <LyricsDisplay
                context={context}
                status={status}
                fontSize={effectiveFontSize}
                fontWeight={fontWeight}
                activeLyricColor={activeLyricColor}
                inactiveLyricColor={inactiveLyricColor}
              />
            </div>
          </>
        ) : (
          <IdleState />
        )}
      </div>
    </div>
  );
};
