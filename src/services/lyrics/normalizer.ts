/**
 * Metadata normalizer for Lyrica lyrics engine.
 *
 * Strips common noise from song titles and artist names before sending
 * to lyrics providers, dramatically improving match rates.
 */

import { TrackMetadata } from "@/types/lyrics";
import { TrackInfo } from "@/types/music";

// Ordered list of patterns to strip from titles
const TITLE_NOISE_PATTERNS: RegExp[] = [
  // Bracketed / parenthesized tags (case-insensitive)
  /\s*[\[(]official\s*(music\s*)?(video|audio|mv|clip|visualizer)[^\])]*/gi,
  /\s*[\[(]lyrics?\s*(video)?[^\])]*[\])]/gi,
  /\s*[\[(]lyric\s*video[^\])]*[\])]/gi,
  /\s*[\[( ](hd|hq|4k|uhd)[^\])]*[\])]/gi,
  /\s*[\[(]remastered?(\s+\d{4})?[^\])]*[\])]/gi,
  /\s*[\[(](\d{4}\s+)?remaster[^\])]*[\])]/gi,
  /\s*[\[(]deluxe(\s+edition)?[^\])]*[\])]/gi,
  /\s*[\[(]bonus\s+track[^\])]*[\])]/gi,
  /\s*[\[(]explicit[^\])]*[\])]/gi,
  /\s*[\[(]clean[^\])]*[\])]/gi,
  /\s*[\[(]radio\s+edit[^\])]*[\])]/gi,
  /\s*[\[(]live(\s+at[^\])]*)?[\])]/gi,
  /\s*[\[(]acoustic[^\])]*[\])]/gi,
  /\s*[\[(]extended(\s+version)?[^\])]*[\])]/gi,
  /\s*[\[(]feat\.?[^\])]*[\])]/gi,
  /\s*[\[(]ft\.?[^\])]*[\])]/gi,
  /\s*[\[(]with\s+[^\])]*[\])]/gi,
  /\s*[\[(]interlude[^\])]*[\])]/gi,

  // Dash-suffix patterns: " - Official Video", " - Remastered", etc.
  /\s+[-–—]\s+official\s*(music\s*)?(video|audio|mv|clip|visualizer)$/gi,
  /\s+[-–—]\s+(hd|hq|4k|uhd)$/gi,
  /\s+[-–—]\s+remastered?(\s+\d{4})?$/gi,
  /\s+[-–—]\s+\d{4}\s+remaster$/gi,
  /\s+[-–—]\s+lyrics?(\s+video)?$/gi,
  /\s+[-–—]\s+live(\s+at\s+\S+)?$/gi,
  /\s+[-–—]\s+acoustic$/gi,
  /\s+[-–—]\s+radio\s+edit$/gi,
  /\s+[-–—]\s+extended(\s+version)?$/gi,
  /\s+[-–—]\s+topic$/gi, // YouTube auto-generated "Artist - Topic"
];

const ARTIST_NOISE_PATTERNS: RegExp[] = [
  // Strip " - Topic" YouTube auto-generated channel suffix
  /\s*-\s*topic$/gi,
  // Strip "VEVO" suffix
  /\s*VEVO$/gi,
];

const FEATURE_PATTERN = /\s*[\[(](?:feat|ft|featuring|with)\.?\s+[^\])]+[\])]/gi;
const TRAILING_FEATURE = /\s+(?:feat|ft|featuring)\.?\s+.+$/gi;

/**
 * Normalize a song title by removing noise suffixes and tags.
 */
export function normalizeTitle(title: string): string {
  let result = title;

  // Strip feature tags first (they confuse artist+title searches)
  result = result.replace(FEATURE_PATTERN, "");
  result = result.replace(TRAILING_FEATURE, "");

  // Apply all noise patterns
  for (const pattern of TITLE_NOISE_PATTERNS) {
    result = result.replace(pattern, "");
  }

  // Collapse multiple spaces and trim
  return result.replace(/\s{2,}/g, " ").trim();
}

/**
 * Normalize an artist name.
 */
export function normalizeArtist(artist: string): string {
  let result = artist;
  for (const pattern of ARTIST_NOISE_PATTERNS) {
    result = result.replace(pattern, "");
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

/**
 * Build a deterministic, URL-safe cache key from normalized track metadata.
 * Includes duration to disambiguate songs with the same title (e.g. "Intro").
 */
export function makeCacheKey(track: Pick<TrackMetadata, "normalizedArtist" | "normalizedTitle" | "duration">): string {
  const dur = Math.round(track.duration ?? 0);
  const raw = `${track.normalizedArtist}|${track.normalizedTitle}|${dur}`;
  return raw.toLowerCase().replace(/[^a-z0-9|]/g, "_");
}

/**
 * Build a TrackMetadata object from a TrackInfo (which comes from SMTC).
 */
export function buildTrackMetadata(track: TrackInfo): TrackMetadata {
  const normalizedTitle = normalizeTitle(track.title ?? "");
  const normalizedArtist = normalizeArtist(track.artist ?? "");
  return {
    title: track.title ?? "",
    artist: track.artist ?? "",
    normalizedTitle,
    normalizedArtist,
    duration: track.duration ?? 0,
    album: track.album,
  };
}
