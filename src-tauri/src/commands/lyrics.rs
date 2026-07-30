// Lyrica — Backend Lyrics Fetcher
// Waterfall: LRCLIB (Primary) → Kugou (High-Availability Secondary) → NetEase (Tertiary).
// All fetched lyrics pass through CJK Chinese translation line filtering in the parser.

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

const TIMEOUT: Duration = Duration::from_secs(8);
const LRCLIB_BASE: &str = "https://lrclib.net/api";
const NETEASE_SEARCH: &str = "https://music.163.com/api/search/get/web";
const NETEASE_LYRIC: &str = "https://music.163.com/api/song/lyric";

fn build_client() -> reqwest::Result<Client> {
    Client::builder()
        .timeout(TIMEOUT)
        .user_agent("Lyrica/1.0.0 (https://github.com/YUKILL-CLOUD/lyrica)")
        .build()
}

/// Check if two artist strings match (case-insensitive substring or initial overlap).
fn is_artist_match(target_artist: &str, candidate_artist: &str) -> bool {
    let target = target_artist.to_lowercase().trim().to_string();
    let candidate = candidate_artist.to_lowercase().trim().to_string();

    if target.is_empty() || candidate.is_empty() {
        return true;
    }

    target.contains(&candidate) || candidate.contains(&target)
}

/// Check if an LRC file header [ti:SongTitle] mismatches the requested song title.
fn is_lrc_title_mismatch(lrc_text: &str, requested_title: &str) -> bool {
    let req_clean = requested_title
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>();

    if req_clean.trim().is_empty() {
        return false;
    }

    for line in lrc_text.lines().take(15) {
        let trimmed = line.trim();
        let lower = trimmed.to_lowercase();
        if lower.starts_with("[ti:") {
            if let Some(end_idx) = trimmed.find(']') {
                let tag_raw = &trimmed[4..end_idx];
                let tag_clean = tag_raw
                    .to_lowercase()
                    .chars()
                    .filter(|c| c.is_alphanumeric() || c.is_whitespace())
                    .collect::<String>();

                if !tag_clean.trim().is_empty() {
                    let tag_words: Vec<&str> = tag_clean.split_whitespace().filter(|w| w.len() >= 2).collect();
                    let req_words: Vec<&str> = req_clean.split_whitespace().filter(|w| w.len() >= 2).collect();

                    if !tag_words.is_empty() && !req_words.is_empty() {
                        let has_overlap = req_words.iter().any(|rw| tag_clean.contains(rw))
                            || tag_words.iter().any(|tw| req_clean.contains(tw));

                        if !has_overlap {
                            tracing::warn!(tag_title = %tag_raw, requested = %requested_title, "LRC title header mismatch rejected!");
                            return true;
                        }
                    }
                }
            }
        }
    }

    false
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
// LRCLIB Provider (Primary)
// ────────────────────────────────────────────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LrclibTrack {
    artist_name: Option<String>,
    synced_lyrics: Option<String>,
    plain_lyrics: Option<String>,
    instrumental: Option<bool>,
}

async fn lrclib_fetch(
    client: &Client,
    raw_title: &str,
    raw_artist: &str,
    norm_title: &str,
    norm_artist: &str,
    duration: Option<f64>,
    album: Option<&str>,
) -> Option<FetchedLyrics> {
    // 1. Try raw metadata first with /api/get
    let mut params1 = vec![
        ("track_name", raw_title.to_string()),
        ("artist_name", raw_artist.to_string()),
    ];
    if let Some(d) = duration {
        params1.push(("duration", (d.round() as u64).to_string()));
    }
    if let Some(a) = album {
        if !a.is_empty() {
            params1.push(("album_name", a.to_string()));
        }
    }

    if let Ok(res) = client
        .get(format!("{LRCLIB_BASE}/get"))
        .query(&params1)
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

    // 2. Try search queries with raw and normalized queries
    let queries = [
        format!("{raw_artist} {raw_title}"),
        format!("{norm_artist} {norm_title}"),
    ];

    for q in &queries {
        if q.trim().is_empty() {
            continue;
        }

        if let Ok(res) = client
            .get(format!("{LRCLIB_BASE}/search"))
            .query(&[("q", q.as_str())])
            .header("Lrclib-Client", "Lyrica/1.0.0 (https://github.com/YUKILL-CLOUD/lyrica)")
            .send()
            .await
        {
            if res.status().is_success() {
                if let Ok(results) = res.json::<Vec<LrclibTrack>>().await {
                    let matching_track = results.into_iter().find(|r| {
                        let has_lyrics = r.synced_lyrics.is_some() || r.plain_lyrics.is_some() || r.instrumental == Some(true);
                        if let Some(cand_artist) = &r.artist_name {
                            has_lyrics && (is_artist_match(raw_artist, cand_artist) || is_artist_match(norm_artist, cand_artist))
                        } else {
                            false
                        }
                    });

                    if let Some(best) = matching_track {
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
                                synced_lrc: best.synced_lyrics,
                                plain_lyrics: best.plain_lyrics,
                                provider: "lrclib".into(),
                                lyrics_type: if has_synced { "synced".into() } else { "plain".into() },
                                is_instrumental: false,
                            });
                        }
                    }
                }
            }
        }
    }

    None
}

// ────────────────────────────────────────────────────────────
// Kugou Provider (High-Availability Secondary)
// ────────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct KugouSearchResponse {
    data: Option<KugouSearchData>,
}

#[derive(Deserialize)]
struct KugouSearchData {
    info: Option<Vec<KugouSong>>,
}

#[derive(Deserialize)]
struct KugouSong {
    hash: String,
    singername: Option<String>,
}

#[derive(Deserialize)]
struct KugouLrcSearchResponse {
    candidates: Option<Vec<KugouCandidate>>,
}

#[derive(Deserialize)]
struct KugouCandidate {
    id: String,
    accesskey: String,
}

#[derive(Deserialize)]
struct KugouDownloadResponse {
    content: Option<String>,
}

async fn kugou_fetch(
    client: &Client,
    raw_title: &str,
    raw_artist: &str,
    norm_title: &str,
    norm_artist: &str,
) -> Option<FetchedLyrics> {
    let queries = [
        format!("{raw_artist} {raw_title}"),
        format!("{norm_artist} {norm_title}"),
    ];

    for query in &queries {
        if query.trim().is_empty() {
            continue;
        }

        let search_res = client
            .get("http://mobilecdn.kugou.com/api/v3/search/song")
            .query(&[
                ("format", "json"),
                ("keyword", query.as_str()),
                ("page", "1"),
                ("pagesize", "5"),
            ])
            .send()
            .await;

        let songs = match search_res {
            Ok(r) => match r.json::<KugouSearchResponse>().await {
                Ok(data) => data.data.and_then(|d| d.info),
                Err(_) => None,
            },
            Err(_) => None,
        };

        let Some(song_list) = songs else { continue };

        for song in song_list {
            let is_artist = song.singername.as_ref().map_or(false, |singer| {
                is_artist_match(raw_artist, singer) || is_artist_match(norm_artist, singer)
            });

            if !is_artist {
                continue;
            }

            let lrc_search_res = client
                .get("http://krcs.kugou.com/search")
                .query(&[
                    ("ver", "1"),
                    ("man", "yes"),
                    ("client", "mobi"),
                    ("hash", song.hash.as_str()),
                ])
                .send()
                .await;

            let candidate = match lrc_search_res {
                Ok(r) => match r.json::<KugouLrcSearchResponse>().await {
                    Ok(data) => data.candidates.and_then(|c| c.into_iter().next()),
                    Err(_) => None,
                },
                Err(_) => None,
            };

            let Some(cand) = candidate else { continue };

            let text_res = client
                .get("http://lyrics.kugou.com/download")
                .query(&[
                    ("ver", "1"),
                    ("client", "pc"),
                    ("id", cand.id.as_str()),
                    ("accesskey", cand.accesskey.as_str()),
                    ("fmt", "lrc"),
                    ("charset", "utf8"),
                ])
                .send()
                .await;

            let base64_content = match text_res {
                Ok(r) => match r.json::<KugouDownloadResponse>().await {
                    Ok(data) => data.content.filter(|s| !s.trim().is_empty()),
                    Err(_) => None,
                },
                Err(_) => None,
            };

            if let Some(b64) = base64_content {
                use base64::Engine;
                if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(&b64) {
                    if let Ok(lrc_str) = String::from_utf8(bytes) {
                        if !lrc_str.trim().is_empty() && lrc_str.contains('[') {
                            if is_lrc_title_mismatch(&lrc_str, raw_title) && is_lrc_title_mismatch(&lrc_str, norm_title) {
                                continue;
                            }
                            return Some(FetchedLyrics {
                                synced_lrc: Some(lrc_str),
                                plain_lyrics: None,
                                provider: "kugou".into(),
                                lyrics_type: "synced".into(),
                                is_instrumental: false,
                            });
                        }
                    }
                }
            }
        }
    }

    None
}

// ────────────────────────────────────────────────────────────
// NetEase Provider (Tertiary)
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
    ar: Option<Vec<NetEaseArtist>>,
    artists: Option<Vec<NetEaseArtist>>,
}

#[derive(Deserialize)]
struct NetEaseArtist {
    name: String,
}

#[derive(Deserialize)]
struct NetEaseLyricResult {
    lrc: Option<NetEaseLrc>,
}

#[derive(Deserialize)]
struct NetEaseLrc {
    lyric: Option<String>,
}

async fn netease_fetch(
    client: &Client,
    raw_title: &str,
    raw_artist: &str,
    norm_title: &str,
    norm_artist: &str,
) -> Option<FetchedLyrics> {
    let queries = [
        format!("{raw_artist} {raw_title}"),
        format!("{norm_artist} {norm_title}"),
    ];

    for query in &queries {
        if query.trim().is_empty() {
            continue;
        }

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

        let songs = match search_res {
            Ok(r) => match r.json::<NetEaseSearchResult>().await {
                Ok(data) => data.result.and_then(|r| r.songs),
                Err(_) => None,
            },
            Err(_) => None,
        };

        let Some(song_list) = songs else { continue };

        for song in song_list {
            let is_artist = {
                let artists_vec = song.ar.as_ref().or(song.artists.as_ref());
                if let Some(artists) = artists_vec {
                    artists.iter().any(|a| {
                        is_artist_match(raw_artist, &a.name) || is_artist_match(norm_artist, &a.name)
                    })
                } else {
                    false
                }
            };

            if !is_artist {
                continue;
            }

            let lyric_res = client
                .get(NETEASE_LYRIC)
                .header("Referer", "https://music.163.com")
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .query(&[
                    ("id", song.id.to_string().as_str()),
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
                if is_lrc_title_mismatch(&lrc, raw_title) && is_lrc_title_mismatch(&lrc, norm_title) {
                    continue;
                }

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
    }

    None
}

// ────────────────────────────────────────────────────────────
// Tauri command — called by useLyrics hook via invoke()
// Waterfall: LRCLIB (Primary) → Kugou (High-Availability Secondary) → NetEase (Tertiary)
// ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn fetch_lyrics_backend(
    title: String,
    artist: String,
    normalized_title: String,
    normalized_artist: String,
    duration: Option<f64>,
    album: Option<String>,
) -> Result<Option<FetchedLyrics>, String> {
    let client = build_client().map_err(|e| e.to_string())?;

    // 1. Primary: LRCLIB
    if let Some(result) = lrclib_fetch(
        &client,
        &title,
        &artist,
        &normalized_title,
        &normalized_artist,
        duration,
        album.as_deref(),
    ).await {
        tracing::info!(provider = "lrclib", title = %title, "Lyrics found via LRCLIB");
        return Ok(Some(result));
    }

    // 2. Secondary: Kugou (High-Availability, CJK filtered in parser)
    if let Some(result) = kugou_fetch(
        &client,
        &title,
        &artist,
        &normalized_title,
        &normalized_artist,
    ).await {
        tracing::info!(provider = "kugou", title = %title, "Lyrics found via Kugou");
        return Ok(Some(result));
    }

    // 3. Tertiary: NetEase
    if let Some(result) = netease_fetch(
        &client,
        &title,
        &artist,
        &normalized_title,
        &normalized_artist,
    ).await {
        tracing::info!(provider = "netease", title = %title, "Lyrics found via NetEase");
        return Ok(Some(result));
    }

    tracing::info!(title = %title, "All providers exhausted — no lyrics found");
    Ok(None)
}
