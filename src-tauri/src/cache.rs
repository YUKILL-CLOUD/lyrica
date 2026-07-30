// Lyrica — Embedded Lyrics Cache Engine
// Uses sled KV store to persist lyrics on disk at %AppData%\lyrica\lyrics-cache\
// Schema Version 2 — includes provider metadata, lyrics type, and schema versioning.

use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedLyrics {
    pub synced_lrc: Option<String>,
    pub plain_lyrics: Option<String>,

    // Rich metadata (schema v2)
    #[serde(default)]
    pub provider: Option<String>,
    #[serde(default)]
    pub lyrics_type: Option<String>,
    #[serde(default)]
    pub is_instrumental: Option<bool>,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub artist: Option<String>,
    #[serde(default)]
    pub duration: Option<f64>,
    #[serde(default)]
    pub schema_version: Option<u8>,

    // Legacy field kept for backward compat (schema v1)
    #[serde(default)]
    pub fetched_at: Option<u64>,
    #[serde(default)]
    pub cached_at: Option<u64>,
    #[serde(default)]
    pub version: Option<u8>,
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
