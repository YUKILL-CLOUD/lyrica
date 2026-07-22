import { useEffect, useRef } from "react";
import { useOverlayStore } from "@/features/overlay/overlayStore";

/**
 * Custom hook to auto-hide the overlay only when NO music is playing (idle/paused).
 * Never hides while music is actively playing.
 */
export function useAutoHide(isPlaying: boolean) {
  const { autoHideTimeout, isAutoHidden, setAutoHidden, isLocked } =
    useOverlayStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If music is actively playing, overlay must ALWAYS remain visible!
    if (isPlaying) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (isAutoHidden) {
        setAutoHidden(false);
      }
      return;
    }

    // If music is paused/idle: apply auto-hide inactivity timer if enabled
    if (autoHideTimeout > 0 && isLocked) {
      timerRef.current = setTimeout(() => {
        setAutoHidden(true);
      }, autoHideTimeout * 1000);
    } else if (isAutoHidden) {
      setAutoHidden(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, autoHideTimeout, isLocked, isAutoHidden, setAutoHidden]);

  return { isAutoHidden };
}
