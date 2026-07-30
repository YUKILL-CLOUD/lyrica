// Lyrica — Backend Lyrics Fetcher
// Runs the LRCLIB → NetEase provider waterfall from the Rust backend.
// This bypasses WebView fetch restrictions and CORS entirely.

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

const TIMEOUT: Duration = Duration::from_secs(5);
const LRCLIB_BASE: &str = "https://lrclib.net/api";
const NETEASE_SEARCH: &str = "https://music.163.com/api/search/get/web";
const NETEASE_LYRIC: &str = "https://music.163.com/api/song/lyric";

fn build_client() -> reqwest::Result<Client> {
    Client::builder()
        .timeout(TIMEOUT)
        .user_agent("Lyrica/1.0.0 (https://github.com/YUKILL-CLOUD/lyrica)")
        .build()
}

// ────────────────────────────────────────────────────────────
// Public data types (serialized to JSON for the frontend)
// ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FetchedLyrics {
    pub synced_lrc: Option<String>,
    pub plain_lyrics: Option<String>,
    pub provider: String,
    pub lyrics_type: String,  // "synced" | "plain" | "none"
    pub is_instrumental: bool,
}

// ────────────────────────────────────────────────────────────
// LRCLIB
// ────────────────────────────────────────────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LrclibTrack {
    synced_lyrics: Option<String>,
    plain_lyrics: Option<String>,
    instrumental: Option<bool>,
}

async fn lrclib_fetch(
    client: &Client,
    title: &str,
    artist: &str,
    duration: Option<f64>,
    album: Option<&str>,
) -> Option<FetchedLyrics> {
    // Strategy 1: /api/get with exact parameters
    let mut params = vec![
        ("track_name", title.to_string()),
        ("artist_name", artist.to_string()),
    ];
    if let Some(d) = duration {
        params.push(("duration", (d.round() as u64).to_string()));
    }
    if let Some(a) = album {
        if !a.is_empty() {
            params.push(("album_name", a.to_string()));
        }
    }

    if let Ok(res) = client
        .get(format!("{LRCLIB_BASE}/get"))
        .query(&params)
        .header("Lrclib-Client", "Lyrica/1.0.0 (https://github.com/YUKILL-CLOUD/lyrica)")
        .send()
        .await
    {
        if res.status().is_success() {
            if let Ok(track) = res.json::<LrclibTrack>().await {
                if track.instrumental == Some(true) {
                    return Some(FetchedLyrics {
                        synced_lrc: None,
                        plain_lyrics: None,
                        provider: "lrclib".into(),
                        lyrics_type: "none".into(),
                        is_instrumental: true,
                    });
                }
                if track.synced_lyrics.is_some() || track.plain_lyrics.is_some() {
                    let has_synced = track.synced_lyrics.as_ref().map(|s| !s.trim().is_empty()).unwrap_or(false);
                    return Some(FetchedLyrics {
                        synced_lrc: track.synced_lyrics,
                        plain_lyrics: track.plain_lyrics,
                        provider: "lrclib".into(),
                        lyrics_type: if has_synced { "synced".into() } else { "plain".into() },
                        is_instrumental: false,
                    });
                }
            }
        }
    }

    // Strategy 2: /api/search by track_name
    if let Ok(res) = client
        .get(format!("{LRCLIB_BASE}/search"))
        .query(&[("track_name", title)])
        .header("Lrclib-Client", "Lyrica/1.0.0 (https://github.com/YUKILL-CLOUD/lyrica)")
        .send()
        .await
    {
        if res.status().is_success() {
            if let Ok(results) = res.json::<Vec<LrclibTrack>>().await {
                if !results.is_empty() {
                    let best = results.iter().find(|r| r.synced_lyrics.is_some()).unwrap_or(&results[0]);
                    if best.instrumental == Some(true) {
                        return Some(FetchedLyrics {
                            synced_lrc: None,
                            plain_lyrics: None,
                            provider: "lrclib".into(),
                            lyrics_type: "none".into(),
                            is_instrumental: true,
                        });
                    }
                    if best.synced_lyrics.is_some() || best.plain_lyrics.is_some() {
                        let has_synced = best.synced_lyrics.as_ref().map(|s| !s.trim().is_empty()).unwrap_or(false);
                        return Some(FetchedLyrics {
                            synced_lrc: best.synced_lyrics.clone(),
                            plain_lyrics: best.plain_lyrics.clone(),
                            provider: "lrclib".into(),
                            lyrics_type: if has_synced { "synced".into() } else { "plain".into() },
                            is_instrumental: false,
                        });
                    }
                }
            }
        }
    }

    // Strategy 3: /api/search with query string (q = artist + title)
    let q = format!("{artist} {title}");
    if let Ok(res) = client
        .get(format!("{LRCLIB_BASE}/search"))
        .query(&[("q", q.as_str())])
        .header("Lrclib-Client", "Lyrica/1.0.0 (https://github.com/YUKILL-CLOUD/lyrica)")
        .send()
        .await
    {
        if res.status().is_success() {
            if let Ok(results) = res.json::<Vec<LrclibTrack>>().await {
                if !results.is_empty() {
                    let best = results.iter().find(|r| r.synced_lyrics.is_some()).unwrap_or(&results[0]);
                    if best.instrumental == Some(true) {
                        return Some(FetchedLyrics {
                            synced_lrc: None,
                            plain_lyrics: None,
                            provider: "lrclib".into(),
                            lyrics_type: "none".into(),
                            is_instrumental: true,
                        });
                    }
                    if best.synced_lyrics.is_some() || best.plain_lyrics.is_some() {
                        let has_synced = best.synced_lyrics.as_ref().map(|s| !s.trim().is_empty()).unwrap_or(false);
                        return Some(FetchedLyrics {
                            synced_lrc: best.synced_lyrics.clone(),
                            plain_lyrics: best.plain_lyrics.clone(),
                            provider: "lrclib".into(),
                            lyrics_type: if has_synced { "synced".into() } else { "plain".into() },
                            is_instrumental: false,
                        });
                    }
                }
            }
        }
    }

    None
}

// ────────────────────────────────────────────────────────────
// NetEase
// ────────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct NetEaseSearchResult {
    result: Option<NetEaseSearchResultInner>,
}

#[derive(Deserialize)]
struct NetEaseSearchResultInner {
    songs: Option<Vec<NetEaseSong>>,
}

#[derive(Deserialize)]
struct NetEaseSong {
    id: u64,
}

#[derive(Deserialize)]
struct NetEaseLyricResult {
    lrc: Option<NetEaseLrc>,
}

#[derive(Deserialize)]
struct NetEaseLrc {
    lyric: Option<String>,
}

async fn netease_fetch(client: &Client, title: &str, artist: &str) -> Option<FetchedLyrics> {
    let queries = [
        format!("{artist} {title}"),
        title.to_string(),
    ];

    for query in &queries {
        // Search for song ID
        let search_res = client
            .get(NETEASE_SEARCH)
            .header("Referer", "https://music.163.com")
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .query(&[
                ("csrf_token", ""),
                ("s", query.as_str()),
                ("type", "1"),
                ("offset", "0"),
                ("total", "true"),
                ("limit", "5"),
            ])
            .send()
            .await;

        let song_id = match search_res {
            Ok(r) => match r.json::<NetEaseSearchResult>().await {
                Ok(data) => data.result
                    .and_then(|r| r.songs)
                    .and_then(|s| s.into_iter().next())
                    .map(|s| s.id),
                Err(_) => None,
            },
            Err(_) => None,
        };

        let Some(id) = song_id else { continue };

        // Fetch lyrics for found song id
        let lyric_res = client
            .get(NETEASE_LYRIC)
            .header("Referer", "https://music.163.com")
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .query(&[
                ("id", id.to_string().as_str()),
                ("lv", "1"),
                ("kv", "1"),
                ("tv", "-1"),
            ])
            .send()
            .await;

        let lrc_text = match lyric_res {
            Ok(r) => match r.json::<NetEaseLyricResult>().await {
                Ok(data) => data.lrc.and_then(|l| l.lyric).filter(|s| !s.trim().is_empty()),
                Err(_) => None,
            },
            Err(_) => None,
        };

        if let Some(lrc) = lrc_text {
            if lrc.contains("\u{7eaf}\u{97f3}\u{4e50}") {
                return Some(FetchedLyrics {
                    synced_lrc: None,
                    plain_lyrics: None,
                    provider: "netease".into(),
                    lyrics_type: "none".into(),
                    is_instrumental: true,
                });
            }
            return Some(FetchedLyrics {
                synced_lrc: Some(lrc),
                plain_lyrics: None,
                provider: "netease".into(),
                lyrics_type: "synced".into(),
                is_instrumental: false,
            });
        }
    }

    None
}

// ────────────────────────────────────────────────────────────
// Tauri command — called by useLyrics hook via invoke()
// ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn fetch_lyrics_backend(
    title: String,
    _artist: String,
    normalized_title: String,
    normalized_artist: String,
    duration: Option<f64>,
    album: Option<String>,
) -> Result<Option<FetchedLyrics>, String> {
    let client = build_client().map_err(|e| e.to_string())?;

    // Try LRCLIB first with normalized metadata
    if let Some(result) = lrclib_fetch(
        &client,
        &normalized_title,
        &normalized_artist,
        duration,
        album.as_deref(),
    ).await {
        tracing::info!(provider = "lrclib", title = %title, "Lyrics found");
        return Ok(Some(result));
    }

    tracing::info!(title = %title, "LRCLIB miss — trying NetEase");

    // Fallback: NetEase
    if let Some(result) = netease_fetch(&client, &normalized_title, &normalized_artist).await {
        tracing::info!(provider = "netease", title = %title, "Lyrics found");
        return Ok(Some(result));
    }

    tracing::info!(title = %title, "All providers exhausted — no lyrics found");
    Ok(None)
}
