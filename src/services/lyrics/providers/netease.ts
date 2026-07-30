/**
 * NetEase Cloud Music lyrics provider for Lyrica.
 *
 * Fetches synced LRC lyrics from NetEase's public (unofficial) API.
 * The endpoint is configurable — never hardcoded — to avoid breakage
 * if a community proxy goes offline.
 *
 * Default: Direct NetEase web API (no proxy, no auth required, works
 * from native Rust HTTP — no browser CORS restrictions).
 *
 * Two search strategies:
 *   1. normalizedArtist + normalizedTitle
 *   2. normalizedTitle only
 */

import { LyricsProvider, LyricsResult, TrackMetadata } from "@/types/lyrics";

const TIMEOUT_MS = 2000;

const DEFAULT_SEARCH_URL = "https://music.163.com/api/search/get/web";
const DEFAULT_LYRIC_URL = "https://music.163.com/api/song/lyric";

// Required headers for NetEase to return results (not block as bot)
const NETEASE_HEADERS = {
  Referer: "https://music.163.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface NetEaseSong {
  id: number;
  name: string;
}

interface NetEaseSearchResponse {
  result?: {
    songs?: NetEaseSong[];
  };
  code?: number;
}

interface NetEaseLyricResponse {
  lrc?: {
    lyric?: string;
  };
  code?: number;
}

async function searchSong(
  query: string,
  searchBase: string
): Promise<number | null> {
  const url = `${searchBase}?csrf_token=&s=${encodeURIComponent(query)}&type=1&offset=0&total=true&limit=5`;
  const res = await fetchWithTimeout(url, { headers: NETEASE_HEADERS });
  if (!res?.ok) return null;

  try {
    const data: NetEaseSearchResponse = await res.json();
    const songs = data?.result?.songs;
    if (Array.isArray(songs) && songs.length > 0) {
      return songs[0].id;
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchLyric(
  songId: number,
  lyricBase: string
): Promise<string | null> {
  const url = `${lyricBase}?id=${songId}&lv=1&kv=1&tv=-1`;
  const res = await fetchWithTimeout(url, { headers: NETEASE_HEADERS });
  if (!res?.ok) return null;

  try {
    const data: NetEaseLyricResponse = await res.json();
    const lrc = data?.lrc?.lyric;
    if (lrc && lrc.trim().length > 0) return lrc;
  } catch {
    return null;
  }
  return null;
}

export class NetEaseProvider implements LyricsProvider {
  readonly name = "netease";
  private readonly searchBase: string;
  private readonly lyricBase: string;

  constructor(
    searchBase = DEFAULT_SEARCH_URL,
    lyricBase = DEFAULT_LYRIC_URL
  ) {
    this.searchBase = searchBase;
    this.lyricBase = lyricBase;
  }

  async search(track: TrackMetadata): Promise<LyricsResult | null> {
    let songId: number | null = null;

    // Strategy 1: artist + title
    const query1 = `${track.normalizedArtist} ${track.normalizedTitle}`;
    songId = await searchSong(query1, this.searchBase);

    // Strategy 2: title only
    if (!songId) {
      songId = await searchSong(track.normalizedTitle, this.searchBase);
    }

    if (!songId) return null;

    const lrc = await fetchLyric(songId, this.lyricBase);
    if (!lrc) return null;

    // NetEase returns bare "纯音乐，请欣赏" for instrumentals — detect it
    const isInstrumental =
      lrc.includes("纯音乐") || lrc.includes("纯音乐，请欣赏");

    if (isInstrumental) {
      return {
        syncedLrc: null,
        plainLyrics: null,
        lyricsType: "none",
        provider: "netease",
        isInstrumental: true,
      };
    }

    return {
      syncedLrc: lrc,
      plainLyrics: null,
      lyricsType: "synced",
      provider: "netease",
      isInstrumental: false,
    };
  }
}
