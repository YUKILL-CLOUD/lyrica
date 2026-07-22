// Lyrica — Application State
// Shared mutable state passed via Tauri's manage() system.

use std::sync::Mutex;

/// Core application state shared across Tauri commands.
#[derive(Debug, Default)]
pub struct AppState {
    /// Whether the overlay is in locked (click-through) mode.
    pub overlay_locked: Mutex<bool>,
    /// Label of the currently active music provider (e.g. "smtc").
    pub active_provider: Mutex<String>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            overlay_locked: Mutex::new(true), // locked by default
            active_provider: Mutex::new(String::from("smtc")),
        }
    }
}
