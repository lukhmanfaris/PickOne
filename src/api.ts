import { ReviewConfig, Ballot, Voter } from "./types";

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

export async function fetchReviewState(): Promise<{ cfg: ReviewConfig; ballots: Ballot[] }> {
  const res = await fetch("/api/review");
  if (!res.ok) {
    throw new Error("Failed to load review data");
  }
  return res.json();
}

export async function submitBallot(
  voterId: string,
  name: string,
  votes: Record<string, string>
): Promise<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }> {
  const res = await fetch("/api/review/ballot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voterId, name, votes })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to submit ballot");
  }
  return data;
}

export async function saveReviewConfig(
  config: Partial<ReviewConfig> & { currentPin?: string }
): Promise<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }> {
  const res = await fetch("/api/review/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to save configuration");
  }
  return data;
}

export async function toggleVotingStatus(pin: string): Promise<{ success: boolean; open: boolean }> {
  const res = await fetch("/api/review/admin/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to update voting status");
  }
  return data;
}

export async function clearAllBallots(pin: string): Promise<{ success: boolean }> {
  const res = await fetch("/api/review/admin/clear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to clear ballots");
  }
  return data;
}

export async function verifyAdminPasscode(pin: string): Promise<boolean> {
  const res = await fetch("/api/review/admin/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin })
  });
  const data = await res.json();
  if (!res.ok || !data.valid) {
    throw new Error(data.error || "Incorrect admin passcode");
  }
  return true;
}

export async function resetToSampleReview(pin: string): Promise<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }> {
  const res = await fetch("/api/review/admin/reset-sample", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to reset review");
  }
  return data;
}
