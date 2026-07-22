import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

/**
 * Generic typed hook to listen for Tauri background events with automatic unlisten cleanup.
 *
 * @param eventName Name of the Tauri event (e.g. "lyrica://track-changed")
 * @param handler Callback function receiving event payload
 */
export function useTauriEvent<T>(
  eventName: string,
  handler: (payload: T) => void
) {
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        const fn = await listen<T>(eventName, (event) => {
          handler(event.payload);
        });
        unlisten = fn;
      } catch (e) {
        // Ignore when running outside Tauri context
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [eventName, handler]);
}
