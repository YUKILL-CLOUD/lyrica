// Lyrica — Windows System Media Transport Controls (SMTC) Provider
// Detects currently playing track, playback status, position, and album art thumbnail
// from Spotify, YouTube (in Chrome/Edge/Firefox), and other Windows media sessions.

use std::sync::Arc;
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};
use windows::Storage::Streams::{DataReader, IRandomAccessStreamWithContentType};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackInfo {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: Option<f64>,
    pub album_art: Option<String>,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackState {
    pub is_playing: bool,
    pub position: f64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub name: String,
    pub confidence: f32,
    pub app_id: Option<String>,
}

/// Strip common YouTube channel suffixes (" - Topic", " VEVO", " Official")
pub fn clean_artist_name(raw: &str) -> String {
    let mut s = raw.trim().to_string();
    let suffixes = [
        " - Topic",
        "VEVO",
        " VEVO",
        " Official",
        " - Official",
        " Topic",
    ];

    for suffix in &suffixes {
        if s.ends_with(suffix) {
            s = s[..s.len() - suffix.len()].trim().to_string();
        }
    }
    s
}

/// Calculate a stable track hash ID from title + artist
pub fn hash_track_id(title: &str, artist: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(title.to_lowercase().trim().as_bytes());
    hasher.update(b"|");
    hasher.update(artist.to_lowercase().trim().as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Calculate provider confidence score and source type based on AppUserModelId
pub fn evaluate_provider_source(app_id: &str) -> (f32, String) {
    let lower = app_id.to_lowercase();
    if lower.contains("spotify") {
        (1.0, "spotify".to_string())
    } else if lower.contains("chrome") || lower.contains("msedge") || lower.contains("firefox") || lower.contains("brave") {
        (0.85, "youtube".to_string())
    } else {
        (0.5, "unknown".to_string())
    }
}

/// Read base64 data URL from IRandomAccessStreamWithContentType
fn read_stream_to_base64(
    stream: IRandomAccessStreamWithContentType,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let size = stream.Size()? as u32;
    if size == 0 {
        return Err("Empty stream".into());
    }

    let reader = DataReader::CreateDataReader(&stream)?;
    reader.LoadAsync(size)?.get()?;

    let mut bytes = vec![0u8; size as usize];
    reader.ReadBytes(&mut bytes)?;

    let base64_str = BASE64.encode(&bytes);
    Ok(format!("data:image/png;base64,{}", base64_str))
}

/// Structure managing SMTC monitoring loop
pub struct SmtcMonitor {
    app_handle: AppHandle,
    last_track_id: Arc<Mutex<Option<String>>>,
}

impl SmtcMonitor {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            last_track_id: Arc::new(Mutex::new(None)),
        }
    }

    /// Start background SMTC polling thread
    pub fn start(self: Arc<Self>) {
        std::thread::spawn(move || {
            tracing::info!("Starting Windows SMTC media monitor loop thread");

            loop {
                std::thread::sleep(std::time::Duration::from_millis(500));
                if let Err(e) = self.poll_media_session() {
                    // Failures when no media session exists are normal
                    tracing::trace!("SMTC poll step: {}", e);
                }
            }
        });
    }

    fn poll_media_session(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()?.get()?;
        let session = match manager.GetCurrentSession() {
            Ok(s) => s,
            Err(_) => return Ok(()), // No active media session
        };

        let app_id = session.SourceAppUserModelId()?.to_string();
        let (confidence, source) = evaluate_provider_source(&app_id);

        // Media properties
        let props = session.TryGetMediaPropertiesAsync()?.get()?;
        let raw_title = props.Title()?.to_string();
        let raw_artist = props.Artist()?.to_string();

        if raw_title.trim().is_empty() {
            return Ok(());
        }

        let cleaned_artist = clean_artist_name(&raw_artist);
        let track_id = hash_track_id(&raw_title, &cleaned_artist);

        // Timeline properties
        let timeline = session.GetTimelineProperties()?;
        let position_secs = (timeline.Position()?.Duration as f64) / 10_000_000.0;
        let end_secs = (timeline.EndTime()?.Duration as f64) / 10_000_000.0;
        let duration = if end_secs > 0.0 { Some(end_secs) } else { None };

        // Playback state
        let playback_info = session.GetPlaybackInfo()?;
        let status = playback_info.PlaybackStatus()?;
        let is_playing = status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing;

        // Emit playback state
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let playback_state = PlaybackState {
            is_playing,
            position: position_secs,
            updated_at: now_ms,
        };
        let _ = self.app_handle.emit("lyrica://playback-changed", &playback_state);

        // Check if track changed
        let mut last_id = match self.last_track_id.try_lock() {
            Ok(guard) => guard,
            Err(_) => return Ok(()),
        };

        if last_id.as_deref() != Some(&track_id) {
            *last_id = Some(track_id.clone());

            // Extract thumbnail artwork
            let album_art = if let Ok(ref_stream) = props.Thumbnail() {
                match ref_stream.OpenReadAsync() {
                    Ok(async_op) => match async_op.get() {
                        Ok(stream) => read_stream_to_base64(stream).ok(),
                        Err(_) => None,
                    },
                    Err(_) => None,
                }
            } else {
                None
            };

            let track = TrackInfo {
                id: track_id.clone(),
                title: raw_title.clone(),
                artist: cleaned_artist.clone(),
                album: match props.AlbumTitle()?.to_string() {
                    s if !s.trim().is_empty() => Some(s),
                    _ => None,
                },
                duration,
                album_art,
                source: source.clone(),
            };

            let provider = ProviderInfo {
                name: "Windows SMTC Provider".to_string(),
                confidence,
                app_id: Some(app_id),
            };

            tracing::info!(
                title = %track.title,
                artist = %track.artist,
                source = %source,
                confidence = confidence,
                "Detected active track change via SMTC"
            );

            let _ = self.app_handle.emit("lyrica://track-changed", &track);
            let _ = self.app_handle.emit("lyrica://provider-changed", &provider);
        }

        Ok(())
    }
}
