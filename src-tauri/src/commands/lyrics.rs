// Lyrica — Backend Lyrics Fetcher
// Runs the QQ Music → LRCLIB → NetEase provider waterfall from the Rust backend.
// Passes both raw metadata (e.g. "The Red Strings") and normalized metadata (e.g. "red strings")
// to prevent search index errors on databases like LRCLIB.

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

/// Check if two artist strings match (case-insensitive substring or initial overlap).
fn is_artist_match(target_artist: &str, candidate_artist: &str) -> bool {
    let target = target_artist.to_lowercase().trim().to_string();
    let candidate = candidate_artist.to_lowercase().trim().to_string();

    if target.is_empty() || candidate.is_empty() {
        return true;
    }

    target.contains(&candidate) || candidate.contains(&target)
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
// QQ Music Provider
// ────────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct QqSearchResponse {
    data: Option<QqSearchData>,
}

#[derive(Deserialize)]
struct QqSearchData {
    song: Option<QqSongList>,
}

#[derive(Deserialize)]
struct QqSongList {
    list: Option<Vec<QqSong>>,
}

#[derive(Deserialize)]
struct QqSong {
    songmid: String,
    singer: Option<Vec<QqSinger>>,
}

#[derive(Deserialize)]
struct QqSinger {
    name: String,
}

#[derive(Deserialize)]
struct QqLyricResponse {
    lyric: Option<String>,
}

async fn qqmusic_fetch(
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
            .get("https://c.y.qq.com/soso/fcgi-bin/client_search_cp")
            .query(&[
                ("w", query.as_str()),
                ("format", "json"),
                ("n", "5"),
            ])
            .send()
            .await;

        let songs = match search_res {
            Ok(r) => match r.json::<QqSearchResponse>().await {
                Ok(data) => data.data.and_then(|d| d.song).and_then(|s| s.list),
                Err(_) => None,
            },
            Err(_) => None,
        };

        let Some(song_list) = songs else { continue };

        for song in song_list {
            let is_artist = song.singer.as_ref().map_or(false, |singers| {
                singers.iter().any(|sg| {
                    is_artist_match(raw_artist, &sg.name) || is_artist_match(norm_artist, &sg.name)
                })
            });

            if !is_artist {
                continue;
            }

            let lyric_res = client
                .get("https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg")
                .header("Referer", "https://y.qq.com/")
                .query(&[
                    ("songmid", song.songmid.as_str()),
                    ("format", "json"),
                    ("nobase64", "1"),
                ])
                .send()
                .await;

            let raw_lyric = match lyric_res {
                Ok(r) => match r.json::<QqLyricResponse>().await {
                    Ok(data) => data.lyric.filter(|s| !s.trim().is_empty() && s.contains('[')),
                    Err(_) => None,
                },
                Err(_) => None,
            };

            if let Some(lrc) = raw_lyric {
                let cleaned = lrc
                    .replace("&apos;", "'")
                    .replace("&quot;", "\"")
                    .replace("&#32;", " ")
                    .replace("&#38;", "&")
                    .replace("&#10;", "\n")
                    .replace("&#13;", "");

                return Some(FetchedLyrics {
                    synced_lrc: Some(cleaned),
                    plain_lyrics: None,
                    provider: "qqmusic".into(),
                    lyrics_type: "synced".into(),
                    is_instrumental: false,
                });
            }
        }
    }

    None
}

// ────────────────────────────────────────────────────────────
// LRCLIB Provider
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
// NetEase Provider
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

    // 1. Try QQ Music first
    if let Some(result) = qqmusic_fetch(
        &client,
        &title,
        &artist,
        &normalized_title,
        &normalized_artist,
    ).await {
        tracing::info!(provider = "qqmusic", title = %title, "Lyrics found via QQ Music");
        return Ok(Some(result));
    }

    // 2. Try LRCLIB second (tries both raw "The Red Strings" and normalized "red strings")
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

    // 3. Fallback: NetEase
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
