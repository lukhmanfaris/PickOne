import { ReviewConfig, Ballot, Voter } from "./types";
import { optimizeImageForUpload } from "./utils/imageCompressor";

const VOTER_KEY = "dr_voter_profile";

export function getLocalVoter(): Voter | null {
  try {
    const raw = localStorage.getItem(VOTER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read voter from localStorage", e);
  }
  return null;
}

export function setLocalVoter(voter: Voter): void {
  try {
    localStorage.setItem(VOTER_KEY, JSON.stringify(voter));
  } catch (e) {
    console.error("Failed to save voter to localStorage", e);
  }
}

export function clearLocalVoter(): void {
  try {
    localStorage.removeItem(VOTER_KEY);
  } catch (e) {
    console.error("Failed to clear voter", e);
  }
}

/**
 * Universal safe fetch wrapper that guarantees structured error reporting
 * and prevents JSON parsing errors when receiving HTML / proxy error pages.
 */
async function safeJsonFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers || {});
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (netErr: any) {
    throw new Error(`Network error: ${netErr.message || "Could not reach server."}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (res.status === 413) {
      throw new Error("Uploaded content is too large. Maximum allowed size is 50MB.");
    }
    if (res.status >= 500) {
      throw new Error(`Server temporarily unavailable (${res.status}).`);
    }
    if (res.status === 404) {
      throw new Error(`Endpoint not found: ${url}`);
    }
    throw new Error(`Server returned unexpected response (${res.status}).`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (parseErr: any) {
    throw new Error("Received malformed JSON from server.");
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export async function fetchReviewState(): Promise<{ cfg: ReviewConfig; ballots: Ballot[] }> {
  return safeJsonFetch<{ cfg: ReviewConfig; ballots: Ballot[] }>("/api/review");
}

export async function submitBallot(
  voterId: string,
  name: string,
  votes: Record<string, string>
): Promise<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }> {
  return safeJsonFetch<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }>("/api/review/ballot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voterId, name, votes })
  });
}

export async function saveReviewConfig(
  config: Partial<ReviewConfig> & { currentPin?: string }
): Promise<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }> {
  return safeJsonFetch<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }>("/api/review/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
}

export async function toggleVotingStatus(pin: string): Promise<{ success: boolean; open: boolean }> {
  return safeJsonFetch<{ success: boolean; open: boolean }>("/api/review/admin/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin })
  });
}

export async function clearAllBallots(pin: string): Promise<{ success: boolean }> {
  return safeJsonFetch<{ success: boolean }>("/api/review/admin/clear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin })
  });
}

export async function verifyAdminPasscode(pin: string): Promise<boolean> {
  const data = await safeJsonFetch<{ valid: boolean; error?: string }>("/api/review/admin/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin })
  });
  if (!data || !data.valid) {
    throw new Error(data?.error || "Incorrect admin passcode");
  }
  return true;
}

export async function resetToSampleReview(pin: string): Promise<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }> {
  return safeJsonFetch<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }>("/api/review/admin/reset-sample", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin })
  });
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  // Pre-process large image files if needed to prevent 413 / timeout errors
  const optimized = await optimizeImageForUpload(file);

  const formData = new FormData();
  formData.append("image", optimized);

  let res: Response;
  try {
    res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" }
    });
  } catch (netErr: any) {
    throw new Error(`Network upload error: ${netErr.message || "Connection failed."}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (res.status === 413) {
      throw new Error("Uploaded file is too large (maximum size is 50MB). Please select a smaller image.");
    }
    throw new Error(`Server returned error (${res.status}) while uploading.`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error("Unable to parse server upload response.");
  }

  if (!res.ok) {
    throw new Error(data.error || `Upload failed with status ${res.status}`);
  }

  return data;
}

export async function addWorkAsset(
  workId: string,
  assetUrl: string,
  pin?: string
): Promise<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }> {
  return safeJsonFetch<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }>("/api/review/work/asset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workId, assetUrl, pin })
  });
}
