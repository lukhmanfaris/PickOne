/**
 * Image URL helpers.
 *
 * Replaces the formatting half of the old `utils/drive.ts`. The Google Drive
 * *upload* path is gone (Supabase Storage handles uploads now), but the Drive
 * URL *formatting* stays: any images uploaded to Drive before the migration
 * are still referenced in the database and must keep rendering.
 */

/**
 * Normalises an image URL for display.
 *
 * - Google Drive links in any of their several shapes become a direct,
 *   high-resolution lh3.googleusercontent.com URL.
 * - Supabase Storage URLs and ordinary https URLs pass through untouched.
 */
export function formatImageUrl(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();

  // drive.google.com/file/d/{id}, open?id={id}, uc?id={id}, thumbnail?id={id},
  // or an already-converted lh3.googleusercontent.com/d/{id}
  const driveMatch = trimmed.match(
    /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|thumbnail\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]{20,})/
  );

  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}=w1600`;
  }

  return trimmed;
}

/**
 * Returns every formatted image URL for a work, de-duplicated.
 * Falls back to the legacy single `img` field when `images` is empty.
 */
export function getWorkImages(
  work?: { img?: string; images?: string[] } | null
): string[] {
  if (!work) return [];
  const list: string[] = [];

  if (Array.isArray(work.images) && work.images.length > 0) {
    work.images.forEach((url) => {
      if (url && typeof url === "string" && url.trim()) {
        const formatted = formatImageUrl(url);
        if (formatted && !list.includes(formatted)) {
          list.push(formatted);
        }
      }
    });
  }

  if (list.length === 0 && work.img && work.img.trim()) {
    const formatted = formatImageUrl(work.img);
    if (formatted) list.push(formatted);
  }

  return list;
}
