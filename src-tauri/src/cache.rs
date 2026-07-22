// Lyrica — Embedded Lyrics Cache Engine
// Uses sled KV store to persist LRCLIB synced lyrics on disk at %AppData%\lyrica\lyrics-cache\

use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedLyrics {
    pub synced_lrc: Option<String>,
    pub plain_lyrics: Option<String>,
    pub fetched_at: u64,
    pub version: u8,
}

pub struct LyricsCache {
    db: sled::Db,
}

impl LyricsCache {
    pub fn new(data_dir: &Path) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let db_path = data_dir.join("lyrics-cache");
        let db = sled::open(&db_path)?;
        tracing::info!(path = %db_path.display(), "Lyrics disk cache opened");
        Ok(Self { db })
    }

    pub fn get(&self, key: &str) -> Option<CachedLyrics> {
        let bytes = self.db.get(key.as_bytes()).ok()??;
        serde_json::from_slice(&bytes).ok()
    }

    pub fn set(&self, key: &str, lyrics: &CachedLyrics) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let bytes = serde_json::to_vec(lyrics)?;
        self.db.insert(key.as_bytes(), bytes)?;
        self.db.flush()?;
        Ok(())
    }
}
