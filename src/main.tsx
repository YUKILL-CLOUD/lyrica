import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Lyrics don't change — infinite cache
      staleTime: Infinity,
      gcTime: 1000 * 60 * 60, // 1 hour
      retry: 2,
      retryDelay: 1000,
    },
  },
});

// Detect which window we're in via the URL hash.
// Overlay window: hash is "" or "#/"
// Settings window: hash starts with "#/settings"
const isOverlay = !window.location.hash.startsWith("#/settings");

// Apply overlay transparency class to html element for the overlay window
if (isOverlay) {
  document.documentElement.classList.add("overlay-mode");
  // Default dark theme for overlay
  document.documentElement.classList.add("dark");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <App />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
