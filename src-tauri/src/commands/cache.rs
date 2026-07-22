// Lyrica — Cache Tauri IPC Commands

use tauri::{command, AppHandle, Manager};
use crate::cache::{CachedLyrics, LyricsCache};

#[command]
pub async fn get_cached_lyrics(app: AppHandle, key: String) -> Option<CachedLyrics> {
    let cache = app.try_state::<LyricsCache>()?;
    cache.get(&key)
}

#[command]
pub async fn set_cached_lyrics(
    app: AppHandle,
    key: String,
    lyrics: CachedLyrics,
) -> Result<(), String> {
    let cache = app
        .try_state::<LyricsCache>()
        .ok_or_else(|| "LyricsCache state not initialized".to_string())?;

    cache.set(&key, &lyrics).map_err(|e| e.to_string())
}
