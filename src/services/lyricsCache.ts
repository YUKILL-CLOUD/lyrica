/**
 * @deprecated Use `src/services/lyrics/cache.ts` instead.
 * This file is kept only for any remaining imports during migration.
 * It re-exports from the new cache module.
 */
export { lyricsCache as lyricsCacheService } from "./lyrics/cache";
export { makeCacheKey } from "./lyrics/normalizer";
