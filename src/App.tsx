import { Routes, Route } from "react-router-dom";
import { OverlayWindow } from "@/features/overlay/OverlayWindow";
import { SettingsPage } from "@/features/settings/SettingsPage";

/**
 * Root application router.
 * The overlay window renders "/" and the settings window renders "/settings".
 * Both load the same index.html — routing is determined by URL hash.
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<OverlayWindow />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

export default App;
