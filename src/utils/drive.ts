/**
 * Converts any Google Drive web or view link into a direct, high-res renderable image URL.
 * Also handles standard image URLs and local server URLs.
 */
export function formatImageUrl(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();

  // Extract Google Drive File ID if present
  // Matches drive.google.com/file/d/{id}, open?id={id}, uc?id={id}, thumbnail?id={id}, lh3.googleusercontent.com/d/{id}
  const driveMatch = trimmed.match(
    /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|thumbnail\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]{20,})/
  );

  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return `https://lh3.googleusercontent.com/d/${fileId}=w1600`;
  }

  return trimmed;
}

/**
 * Returns an array of formatted image URLs for a work.
 * Supports both work.images array and legacy work.img string.
 */
export function getWorkImages(work?: { img?: string; images?: string[] } | null): string[] {
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

export async function uploadToDrive(file: File, accessToken: string): Promise<string> {
  // Step 1: Upload the file data
  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': file.type
    },
    body: file
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => "");
    throw new Error(`Failed to upload file to Google Drive: ${errText || uploadRes.statusText}`);
  }

  const uploadData = await uploadRes.json();
  const fileId = uploadData.id;

  // Step 2: Update file metadata
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: file.name })
    });
  } catch (e) {
    console.warn("Could not patch file name", e);
  }

  // Step 3: Set permissions to make it readable by anyone (so it displays directly in the app)
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (e) {
    console.warn("Could not set anyone reader permission", e);
  }

  // Always return the reliable high-res direct image URL
  return `https://lh3.googleusercontent.com/d/${fileId}=w1600`;
}
