// Lyrica — Application Builder
// Wires together Tauri plugins, commands, tray, state management, logging, SMTC watcher, and Smart Drag-to-Unlock.

mod cache;
mod commands;
mod drag_unlock;
mod logging;
mod providers;
mod state;
mod tray;

use std::sync::Arc;
use cache::LyricsCache;
use providers::smtc::SmtcMonitor;
use state::AppState;
use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_data_dir = dirs_next::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("lyrica");

    // Initialize file logging before anything else
    logging::init_logging(&app_data_dir, "info");

    // Initialize disk cache engine
    let lyrics_cache = LyricsCache::new(&app_data_dir).expect("Failed to initialize lyrics cache");

    tauri::Builder::default()
        // --- Plugins ---
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        // --- Shared State ---
        .manage(AppState::new())
        .manage(lyrics_cache)
        // --- IPC Commands ---
        .invoke_handler(tauri::generate_handler![
            commands::overlay::lock_overlay,
            commands::overlay::unlock_overlay,
            commands::overlay::get_overlay_locked,
            commands::overlay::open_settings_window,
            commands::overlay::close_settings_window,
            commands::cache::get_cached_lyrics,
            commands::cache::set_cached_lyrics,
        ])
        // --- Window Event Handler (Prevent destroying settings window on 'X') ---
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "settings" {
                    api.prevent_close();
                    let _ = window.hide();
                    tracing::info!("Settings window close intercepted; hidden instead of destroyed");
                }
            }
        })
        // --- Setup ---
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Build system tray
            tray::build_tray(&app_handle)?;

            // Configure window icons
            if let Some(icon) = app.default_window_icon() {
                if let Some(settings_win) = app.get_webview_window("settings") {
                    let _ = settings_win.set_icon(icon.clone());
                }
                if let Some(overlay_win) = app.get_webview_window("overlay") {
                    let _ = overlay_win.set_icon(icon.clone());
                }
            }

            // Configure overlay window (disable OS shadow, enable click-through at startup)
            if let Some(overlay_win) = app.get_webview_window("overlay") {
                let _ = overlay_win.set_shadow(false);
                overlay_win
                    .set_ignore_cursor_events(true)
                    .expect("Failed to set click-through on overlay");
                tracing::info!("Overlay click-through enabled at startup (OS window shadow disabled)");
            }

            // Start Smart Drag-to-Unlock thread (allows clicking/dragging directly on overlay to unlock)
            #[cfg(target_os = "windows")]
            {
                drag_unlock::start_drag_unlock_monitor(app_handle.clone());
            }

            // Start SMTC Windows media monitor loop
            #[cfg(target_os = "windows")]
            {
                let monitor = Arc::new(SmtcMonitor::new(app_handle.clone()));
                monitor.start();
            }

            tracing::info!("Lyrica started successfully with SMTC monitor, Drag-to-Unlock, and disk cache");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Lyrica");
}
