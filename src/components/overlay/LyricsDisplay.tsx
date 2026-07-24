import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LyricLine, LyricContext, LyricsStatus } from "@/types/lyrics";

interface LyricsDisplayProps {
  lines?: LyricLine[];
  currentIndex?: number;
  context: LyricContext;
  status: LyricsStatus;
  fontSize?: number;
  fontWeight?: number;
  activeLyricColor?: string;
  inactiveLyricColor?: string;
  theme?: string;
}

function getLightAdaptiveActiveColor(hex: string): string {
  const lower = hex.toLowerCase().trim();
  if (lower === "#22c55e") return "#16a34a"; // Deep crisp green for light mode
  if (lower === "#38bdf8") return "#0284c7"; // Deep crisp cyan for light mode
  if (lower === "#a855f7") return "#7e22ce"; // Deep crisp violet for light mode
  if (lower === "#f43f5e") return "#be123c"; // Deep crisp rose for light mode
  if (lower === "#eab308") return "#b45309"; // Deep crisp amber for light mode
  if (lower === "#ffffff") return "#0f172a"; // Dark slate for white in light mode
  return hex;
}

function getLightAdaptiveInactiveColor(color: string): string {
  const lower = color.toLowerCase().trim();
  if (lower.includes("255, 255, 255") || lower === "#ffffff" || lower.includes("255,255,255")) {
    return "#475569"; // Crisp slate-600 for inactive text on white background
  }
  return color;
}

export const LyricsDisplay: React.FC<LyricsDisplayProps> = ({
  lines = [],
  currentIndex = 0,
  context,
  status,
  fontSize = 18,
  fontWeight = 700,
  activeLyricColor = "#38bdf8",
  inactiveLyricColor = "rgba(255, 255, 255, 0.75)",
  theme = "dark",
}) => {
  const isLight = theme === "light";

  if (status === "loading") {
    return (
      <div
        className={`flex flex-col items-center justify-center py-4 text-xs animate-pulse font-medium ${
          isLight ? "text-slate-500" : "text-white/50"
        }`}
      >
        Fetching synchronized lyrics...
      </div>
    );
  }

  if (status === "not_found" || status === "no_synced") {
    return (
      <div
        className={`flex flex-col items-center justify-center py-4 text-xs font-medium ${
          isLight ? "text-slate-400" : "text-white/40"
        }`}
      >
        No synchronized lyrics available
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-red-500/80 text-xs font-medium">
        Failed to load lyrics
      </div>
    );
  }

  const effectiveActiveColor = isLight ? getLightAdaptiveActiveColor(activeLyricColor) : activeLyricColor;
  const effectiveInactiveColor = isLight ? getLightAdaptiveInactiveColor(inactiveLyricColor) : inactiveLyricColor;

  const inactiveShadow = isLight ? "none" : "0 1px 3px rgba(0, 0, 0, 0.4)";
  const activeShadow = isLight ? "none" : "0 2px 8px rgba(0, 0, 0, 0.5)";

  const { prev, current, next, future } = context;

  // Resolve lines for 4-line viewport
  const prevLine = (lines.length > 0 && currentIndex > 0) ? lines[currentIndex - 1] : prev;
  const active1Line = (lines.length > 0 && currentIndex >= 0 && currentIndex < lines.length) ? lines[currentIndex] : current;
  const active2Line = (lines.length > 0 && currentIndex + 1 < lines.length) ? lines[currentIndex + 1] : next;
  const futureLine = (lines.length > 0 && currentIndex + 2 < lines.length) ? lines[currentIndex + 2] : future;

  const visibleItems: { line: LyricLine | null; role: "prev" | "active1" | "active2" | "future"; key: string }[] = [];

  visibleItems.push({ line: prevLine, role: "prev", key: prevLine ? `line-${prevLine.index}` : "empty-prev" });
  visibleItems.push({ line: active1Line, role: "active1", key: active1Line ? `line-${active1Line.index}` : "empty-active1" });
  visibleItems.push({ line: active2Line, role: "active2", key: active2Line ? `line-${active2Line.index}` : "empty-active2" });
  visibleItems.push({ line: futureLine, role: "future", key: futureLine ? `line-${futureLine.index}` : "empty-future" });

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-1.5 py-1 select-none overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        {visibleItems.map((item) => {
          let styleFontSize = Math.max(12, fontSize - 4);
          let styleFontWeight = 400;
          let styleColor = effectiveInactiveColor;
          let styleOpacity = isLight ? 0.85 : 0.8;
          let styleTextShadow = inactiveShadow;

          if (item.role === "active1") {
            styleFontSize = fontSize;
            styleFontWeight = fontWeight;
            styleColor = effectiveActiveColor;
            styleOpacity = 1.0;
            styleTextShadow = activeShadow;
          } else if (item.role === "active2") {
            styleFontSize = Math.max(13, fontSize - 1);
            styleFontWeight = Math.max(600, fontWeight - 100);
            styleColor = effectiveActiveColor;
            styleOpacity = 0.9;
            styleTextShadow = activeShadow;
          }

          let textContent = " ";
          if (item.line) {
            textContent = item.line.text;
          } else if (item.role === "active1" && !item.line) {
            textContent = "♪ ♪ ♪";
          } else if (item.role === "active2" && !item.line && !active1Line) {
            textContent = "♪ ♪ ♪";
          }

          return (
            <motion.p
              key={item.key}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{
                opacity: styleOpacity,
                y: 0,
                fontSize: styleFontSize,
                fontWeight: styleFontWeight,
                color: styleColor,
              }}
              exit={{ opacity: 0, y: -14 }}
              transition={{
                layout: { type: "spring", stiffness: 320, damping: 30 },
                opacity: { duration: 0.25 },
                y: { duration: 0.3, ease: [0.25, 1, 0.5, 1] },
                color: { duration: 0.25 },
                fontSize: { duration: 0.3, ease: [0.25, 1, 0.5, 1] },
              }}
              className="text-center truncate w-full px-4"
              style={{
                textShadow: styleTextShadow,
              }}
            >
              {textContent}
            </motion.p>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
