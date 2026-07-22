// Lyrica — Overlay commands
// Tauri IPC commands for locking/unlocking the overlay and querying its state.

use tauri::{command, AppHandle, Emitter, Manager, WebviewWindow};
use crate::state::AppState;

/// Lock the overlay: enable click-through, emit event to frontend.
#[command]
pub async fn lock_overlay(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    window
        .set_ignore_cursor_events(true)
        .map_err(|e| e.to_string())?;

    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(mut locked) = state.overlay_locked.lock() {
            *locked = true;
        }
    }

    app.emit("lyrica://overlay-locked", true)
        .map_err(|e| e.to_string())?;

    tracing::info!("Overlay locked");
    Ok(())
}

/// Unlock the overlay: disable click-through, emit event to frontend.
#[command]
pub async fn unlock_overlay(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    window
        .set_ignore_cursor_events(false)
        .map_err(|e| e.to_string())?;

    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(mut locked) = state.overlay_locked.lock() {
            *locked = false;
        }
    }

    app.emit("lyrica://overlay-locked", false)
        .map_err(|e| e.to_string())?;

    tracing::info!("Overlay unlocked");
    Ok(())
}

/// Query whether the overlay is currently locked.
#[command]
pub async fn get_overlay_locked(app: AppHandle) -> bool {
    app.try_state::<AppState>()
        .and_then(|s| s.overlay_locked.lock().ok().map(|l| *l))
        .unwrap_or(true)
}

/// Open the settings window (show, unminimize, and focus).
#[command]
pub async fn open_settings_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
        tracing::info!("Settings window shown and focused");
    }
    Ok(())
}

/// Hide the settings window.
#[command]
pub async fn close_settings_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.hide();
        tracing::info!("Settings window hidden");
    }
    Ok(())
}
