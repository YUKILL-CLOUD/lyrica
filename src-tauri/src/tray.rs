// Lyrica — System Tray
// Builds the system tray icon and context menu using Tauri 2's TrayIconBuilder.

use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

use crate::state::AppState;

/// Generate a clean 32x32 RGBA icon for fallback if needed.
fn generate_fallback_icon() -> Image<'static> {
    let mut rgba = vec![0u8; 32 * 32 * 4];
    for y in 0..32 {
        for x in 0..32 {
            let i = (y * 32 + x) * 4;
            let is_border = x == 0 || x == 31 || y == 0 || y == 31;
            if is_border {
                rgba[i] = 255;
                rgba[i + 1] = 255;
                rgba[i + 2] = 255;
                rgba[i + 3] = 200;
            } else {
                rgba[i] = 56;      // R
                rgba[i + 1] = 189;  // G
                rgba[i + 2] = 248;  // B
                rgba[i + 3] = 255;  // A
            }
        }
    }
    Image::new_owned(rgba, 32, 32)
}

/// Build and register the system tray icon with its context menu.
pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    // --- Menu items ---
    let toggle_lock_item = MenuItem::with_id(app, "toggle_lock", "⚡ Toggle Lock / Unlock (Click-Through)", true, None::<&str>)?;
    let sep0 = PredefinedMenuItem::separator(app)?;
    let lock_item = MenuItem::with_id(app, "lock_overlay", "🔒 Lock Overlay", true, None::<&str>)?;
    let unlock_item = MenuItem::with_id(app, "unlock_overlay", "🔓 Unlock Overlay (Move / Resize)", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let settings_item = MenuItem::with_id(app, "settings", "⚙️  Settings", true, None::<&str>)?;
    let refresh_item = MenuItem::with_id(app, "refresh_lyrics", "🔄 Refresh Lyrics", true, None::<&str>)?;
    let restart_item = MenuItem::with_id(app, "restart_detection", "🔁 Restart Detection", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let about_item = MenuItem::with_id(app, "about", "ℹ️  About Lyrica", false, None::<&str>)?;
    let sep3 = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "✕  Quit Lyrica", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &toggle_lock_item,
            &sep0,
            &lock_item,
            &unlock_item,
            &sep1,
            &settings_item,
            &refresh_item,
            &restart_item,
            &sep2,
            &about_item,
            &sep3,
            &quit_item,
        ],
    )?;

    // Get default icon safely or use guaranteed fallback icon
    let icon = match app.default_window_icon() {
        Some(icon) => icon.clone(),
        None => generate_fallback_icon(),
    };

    let builder = TrayIconBuilder::with_id("lyrica_tray")
        .icon(icon)
        .tooltip("Lyrica — Left Click to Toggle Lock/Unlock | Right Click for Menu")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| handle_tray_event(app, event.id.as_ref()))
        .on_tray_icon_event(move |tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                // Left-click on tray icon toggles Lock/Unlock immediately!
                let app = tray.app_handle();
                toggle_overlay_lock(app);
            }
        });

    builder.build(app)?;

    tracing::info!("System tray built successfully with ID 'lyrica_tray'");
    Ok(())
}

fn toggle_overlay_lock(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("overlay") {
        let is_locked = app.try_state::<AppState>()
            .and_then(|s| s.overlay_locked.lock().ok().map(|l| *l))
            .unwrap_or(true);

        if is_locked {
            let _ = window.set_ignore_cursor_events(false);
            if let Some(state) = app.try_state::<AppState>() {
                if let Ok(mut locked) = state.overlay_locked.lock() {
                    *locked = false;
                }
            }
            let _ = app.emit("lyrica://overlay-locked", false);
        } else {
            let _ = window.set_ignore_cursor_events(true);
            if let Some(state) = app.try_state::<AppState>() {
                if let Ok(mut locked) = state.overlay_locked.lock() {
                    *locked = true;
                }
            }
            let _ = app.emit("lyrica://overlay-locked", true);
        }
    }
}

fn set_overlay_lock_state(app: &AppHandle, lock: bool) {
    if let Some(window) = app.get_webview_window("overlay") {
        let _ = window.set_ignore_cursor_events(lock);
        if let Some(state) = app.try_state::<AppState>() {
            if let Ok(mut locked) = state.overlay_locked.lock() {
                *locked = lock;
            }
        }
        let _ = app.emit("lyrica://overlay-locked", lock);
    }
}

fn handle_tray_event(app: &AppHandle, event_id: &str) {
    match event_id {
        "toggle_lock" => toggle_overlay_lock(app),
        "lock_overlay" => set_overlay_lock_state(app, true),
        "unlock_overlay" => set_overlay_lock_state(app, false),
        "settings" => {
            if let Some(window) = app.get_webview_window("settings") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
                tracing::info!("Settings window opened via tray menu");
            }
        }
        "refresh_lyrics" => {
            let _ = app.emit("lyrica://refresh-lyrics", ());
            tracing::info!("Lyrics refresh triggered via tray menu");
        }
        "restart_detection" => {
            let _ = app.emit("lyrica://restart-detection", ());
            tracing::info!("SMTC detection restart triggered via tray menu");
        }
        "about" => {}
        "quit" => {
            tracing::info!("Quit requested via tray");
            app.exit(0);
        }
        _ => {}
    }
}
