import { ReviewConfig, Ballot, Voter, Category, Work, SaveConfigPayload } from "./types";
import { optimizeImageForUpload } from "./utils/imageCompressor";
import { supabase, REVIEW_ID, ASSET_BUCKET } from "./utils/supabase";

const VOTER_KEY = "dr_voter_profile";

/* ------------------------------------------------------------------ */
/* Local voter identity (unchanged)                                    */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Error handling                                                      */
/* ------------------------------------------------------------------ */

/**
 * Turns a Postgres/PostgREST error into a message worth showing a person.
 *
 * Errors raised by our own database functions (RAISE EXCEPTION) arrive with
 * their text intact, so "Invalid admin passcode" and "Submission limit
 * reached (2 of 2)" surface as-is. Everything else gets a plain fallback
 * rather than leaking internals into a toast.
 */
function toFriendlyError(error: any, fallback: string): Error {
  if (!error) return new Error(fallback);

  const raw: string = error.message || error.error_description || "";

  // Messages raised deliberately by our SQL functions
  if (
    /invalid admin passcode/i.test(raw) ||
    /submission limit reached/i.test(raw) ||
    /voting is currently closed/i.test(raw) ||
    /review not found/i.test(raw) ||
    /work not found/i.test(raw) ||
    /voter name is required/i.test(raw) ||
    /asset url is required/i.test(raw)
  ) {
    // Strip the Postgres prefix if PostgREST added one
    return new Error(raw.replace(/^.*?(?:ERROR:\s*)?/i, "").trim() || fallback);
  }

  if (/Failed to fetch|NetworkError|fetch failed/i.test(raw)) {
    return new Error("Network error: could not reach the server.");
  }
  if (/JWT|api key/i.test(raw)) {
    return new Error("Configuration problem: check your Supabase keys.");
  }
  if (error.statusCode === "413" || /exceeded the maximum allowed size/i.test(raw)) {
    return new Error("That file is too large. Maximum size is 50MB.");
  }

  console.error(fallback, error);
  return new Error(raw || fallback);
}

/* ------------------------------------------------------------------ */
/* Row -> app type mapping                                             */
/* ------------------------------------------------------------------ */

interface WorkImageRow { url: string; sort_order: number }
interface WorkRow {
  id: string;
  category_id: string;
  name: string;
  note: string | null;
  preset_style: number | null;
  sort_order: number;
  work_images?: WorkImageRow[] | null;
}
interface CategoryRow { id: string; name: string; sort_order: number }
interface VoteRow { category_id: string; work_id: string }
interface BallotRow {
  id: string;
  voter_id: string;
  voter_name: string;
  submit_count: number;
  updated_at: string;
  votes?: VoteRow[] | null;
}

function mapWork(row: WorkRow): Work {
  const images = (row.work_images || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => i.url)
    .filter(Boolean);

  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    note: row.note || "",
    images,
    img: images[0] || "",
    presetStyle: row.preset_style ?? 0,
  };
}

function mapBallot(row: BallotRow): Ballot {
  const votes: Record<string, string> = {};
  (row.votes || []).forEach((v) => {
    votes[v.category_id] = v.work_id;
  });

  return {
    key: row.id,
    voterId: row.voter_id,
    name: row.voter_name,
    count: row.submit_count,
    votes,
    timestamp: new Date(row.updated_at).getTime(),
  };
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export async function fetchReviewState(): Promise<{ cfg: ReviewConfig; ballots: Ballot[] }> {
  // Note: `reviews_public` has no pin column, by design.
  const [reviewRes, catRes, workRes, ballotRes] = await Promise.all([
    supabase
      .from("reviews_public")
      .select("id, title, brief, max_submits, is_open, sizing_open, size_chart_url, created_at, updated_at")
      .eq("id", REVIEW_ID)
      .single(),
    supabase
      .from("categories")
      .select("id, name, sort_order")
      .eq("review_id", REVIEW_ID),
    supabase
      .from("works")
      .select("id, category_id, name, note, preset_style, sort_order, work_images(url, sort_order)")
      .eq("review_id", REVIEW_ID),
    supabase
      .from("ballots")
      .select("id, voter_id, voter_name, submit_count, updated_at, votes(category_id, work_id)")
      .eq("review_id", REVIEW_ID),
  ]);

  if (reviewRes.error) throw toFriendlyError(reviewRes.error, "Could not load the review.");
  if (catRes.error) throw toFriendlyError(catRes.error, "Could not load categories.");
  if (workRes.error) throw toFriendlyError(workRes.error, "Could not load concepts.");
  if (ballotRes.error) throw toFriendlyError(ballotRes.error, "Could not load ballots.");

  const r = reviewRes.data as any;

  const categories: Category[] = ((catRes.data || []) as CategoryRow[])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({ id: c.id, name: c.name }));

  const works: Work[] = ((workRes.data || []) as unknown as WorkRow[])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(mapWork);

  const cfg: ReviewConfig = {
    id: r.id,
    title: r.title,
    brief: r.brief || "",
    categories,
    works,
    maxSubmits: r.max_submits,
    open: r.is_open,
    sizingOpen: r.sizing_open !== false,
    sizeChartUrl: r.size_chart_url || undefined,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  };

  const ballots = ((ballotRes.data || []) as unknown as BallotRow[]).map(mapBallot);

  return { cfg, ballots };
}

/* ------------------------------------------------------------------ */
/* Voting                                                              */
/* ------------------------------------------------------------------ */

export async function submitBallot(
  voterId: string,
  name: string,
  votes: Record<string, string>
): Promise<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }> {
  const { error } = await supabase.rpc("cast_ballot", {
    p_review_id: REVIEW_ID,
    p_voter_id: voterId,
    p_voter_name: name,
    p_votes: votes,
  });

  if (error) throw toFriendlyError(error, "Could not submit your ballot.");

  const state = await fetchReviewState();
  return { success: true, ...state };
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export async function verifyAdminPasscode(pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("verify_review_pin", {
    p_review_id: REVIEW_ID,
    p_pin: pin,
  });

  if (error) throw toFriendlyError(error, "Could not verify the passcode.");
  if (data !== true) throw new Error("Incorrect admin passcode");
  return true;
}

export async function toggleVotingStatus(pin: string): Promise<{ success: boolean; open: boolean }> {
  const { data, error } = await supabase.rpc("admin_toggle_voting", {
    p_review_id: REVIEW_ID,
    p_pin: pin,
  });

  if (error) throw toFriendlyError(error, "Could not change the voting status.");
  return { success: true, open: data as boolean };
}

export async function clearAllBallots(pin: string): Promise<{ success: boolean }> {
  const { error } = await supabase.rpc("admin_clear_ballots", {
    p_review_id: REVIEW_ID,
    p_pin: pin,
  });

  if (error) throw toFriendlyError(error, "Could not clear the ballots.");
  return { success: true };
}

export async function saveReviewConfig(
  config: SaveConfigPayload
): Promise<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }> {
  const currentPin = config.currentPin;
  if (!currentPin) throw new Error("Admin passcode required to save changes.");

  // 1. Review-level settings (title, brief, limit, optional new pin)
  const { error: reviewErr } = await supabase.rpc("admin_update_review", {
    p_review_id: REVIEW_ID,
    p_pin: currentPin,
    p_title: config.title ?? "Design Review",
    p_brief: config.brief ?? "",
    p_max_submits: config.maxSubmits ?? 99,
    p_new_pin: config.pin && config.pin !== currentPin ? config.pin : null,
  });
  if (reviewErr) throw toFriendlyError(reviewErr, "Could not save review settings.");

  // The pin may have just changed; later calls must use the new one.
  const pinForStructure = config.pin && config.pin !== currentPin ? config.pin : currentPin;

  // 2. Categories and works, saved atomically
  if (config.categories || config.works) {
    const categories = (config.categories || []).map((c, i) => ({
      id: c.id,
      name: c.name,
      sort_order: i,
    }));

    const works = (config.works || []).map((w, i) => ({
      id: w.id,
      category_id: w.categoryId,
      name: w.name,
      note: w.note || "",
      preset_style: w.presetStyle ?? 0,
      sort_order: i,
      images: (w.images && w.images.length > 0 ? w.images : w.img ? [w.img] : []).filter(Boolean),
    }));

    const { error: structErr } = await supabase.rpc("admin_save_structure", {
      p_review_id: REVIEW_ID,
      p_pin: pinForStructure,
      p_categories: categories,
      p_works: works,
    });
    if (structErr) throw toFriendlyError(structErr, "Could not save categories and concepts.");
  }

  const state = await fetchReviewState();
  return { success: true, ...state };
}

export async function addWorkAsset(
  workId: string,
  assetUrl: string,
  pin?: string
): Promise<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }> {
  if (!pin) throw new Error("Admin passcode required to add assets.");

  const { error } = await supabase.rpc("admin_add_work_asset", {
    p_review_id: REVIEW_ID,
    p_pin: pin,
    p_work_id: workId,
    p_url: assetUrl,
  });

  if (error) throw toFriendlyError(error, "Could not add the asset.");

  const state = await fetchReviewState();
  return { success: true, ...state };
}

/* ------------------------------------------------------------------ */
/* Uploads                                                             */
/* ------------------------------------------------------------------ */

export async function uploadImage(file: File): Promise<{ url: string }> {
  // Compress oversized images client-side before sending (unchanged behaviour).
  const optimized = await optimizeImageForUpload(file);

  const rawExt = optimized.name.split(".").pop() || "jpg";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `images/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await supabase.storage
    .from(ASSET_BUCKET)
    .upload(path, optimized, {
      contentType: optimized.type || "image/jpeg",
      upsert: false,
    });

  if (error) throw toFriendlyError(error, "Upload failed.");

  const { data } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Upload succeeded but no public URL was returned.");

  return { url: data.publicUrl };
}

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

export async function resetToSampleReview(
  pin: string
): Promise<{ success: boolean; cfg: ReviewConfig; ballots: Ballot[] }> {
  const cat = (n: number) => `00000000-0000-4000-8000-0000000000c${n}`;
  const work = (n: number) => `00000000-0000-4000-8000-0000000000f${n}`;

  const categories = [
    { id: cat(1), name: "Logo Direction", sort_order: 0 },
    { id: cat(2), name: "Packaging", sort_order: 1 },
  ];

  const works = [
    { id: work(1), category_id: cat(1), name: "Route A — Geometric", note: "Bold, structural.", preset_style: 0, sort_order: 0, images: [] },
    { id: work(2), category_id: cat(1), name: "Route B — Humanist", note: "Warm, approachable.", preset_style: 1, sort_order: 1, images: [] },
    { id: work(3), category_id: cat(1), name: "Route C — Monogram", note: "Compact, versatile.", preset_style: 2, sort_order: 2, images: [] },
    { id: work(4), category_id: cat(2), name: "Route A — Minimal", note: "Lots of white space.", preset_style: 3, sort_order: 3, images: [] },
    { id: work(5), category_id: cat(2), name: "Route B — Editorial", note: "Type-led.", preset_style: 4, sort_order: 4, images: [] },
  ];

  const { error: clearErr } = await supabase.rpc("admin_clear_ballots", {
    p_review_id: REVIEW_ID,
    p_pin: pin,
  });
  if (clearErr) throw toFriendlyError(clearErr, "Could not reset the sample review.");

  const { error } = await supabase.rpc("admin_save_structure", {
    p_review_id: REVIEW_ID,
    p_pin: pin,
    p_categories: categories,
    p_works: works,
  });
  if (error) throw toFriendlyError(error, "Could not reset the sample review.");

  const state = await fetchReviewState();
  return { success: true, ...state };
}

/* ------------------------------------------------------------------ */
/* Jersey sizing                                                       */
/* ------------------------------------------------------------------ */

import type { JerseyEntry, JerseyAdminRow } from "./utils/jersey";

/** Numbers already claimed. This is all a voter is allowed to see. */
export async function fetchTakenNumbers(): Promise<number[]> {
  const { data, error } = await supabase
    .from("jersey_numbers_public")
    .select("jersey_number")
    .eq("review_id", REVIEW_ID);

  if (error) throw toFriendlyError(error, "Could not load claimed numbers.");
  return (data || []).map((r: any) => r.jersey_number as number);
}

/** This voter's own entry, or null if they haven't submitted. */
export async function getMyJerseyEntry(voterId: string): Promise<JerseyEntry | null> {
  const { data, error } = await supabase.rpc("get_my_jersey_entry", {
    p_review_id: REVIEW_ID,
    p_voter_id: voterId,
  });

  if (error) throw toFriendlyError(error, "Could not load your jersey details.");
  if (!data) return null;

  const d = data as any;
  return {
    fullName: d.full_name,
    company: d.company,
    size: d.size,
    jerseyNumber: d.jersey_number,
    jerseyName: d.jersey_name,
    createdAt: d.created_at,
  };
}

export async function claimJersey(
  voterId: string,
  entry: { fullName: string; company: string; size: string; jerseyNumber: number; jerseyName: string }
): Promise<{ jerseyNumber: number; jerseyName: string }> {
  const { data, error } = await supabase.rpc("claim_jersey", {
    p_review_id: REVIEW_ID,
    p_voter_id: voterId,
    p_full_name: entry.fullName,
    p_company: entry.company,
    p_size: entry.size,
    p_jersey_number: entry.jerseyNumber,
    p_jersey_name: entry.jerseyName,
  });

  if (error) throw toFriendlyError(error, "Could not submit your jersey details.");
  const d = data as any;
  return { jerseyNumber: d.jersey_number, jerseyName: d.jersey_name };
}

export async function adminListJerseyEntries(pin: string): Promise<JerseyAdminRow[]> {
  const { data, error } = await supabase.rpc("admin_list_jersey_entries", {
    p_review_id: REVIEW_ID,
    p_pin: pin,
  });

  if (error) throw toFriendlyError(error, "Could not load the jersey list.");
  return ((data || []) as any[]).map((r) => ({
    jerseyNumber: r.jersey_number,
    jerseyName: r.jersey_name,
    fullName: r.full_name,
    company: r.company,
    size: r.size,
    voterId: r.voter_id,
    createdAt: r.created_at,
  }));
}

export async function adminToggleSizing(pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("admin_toggle_sizing", {
    p_review_id: REVIEW_ID,
    p_pin: pin,
  });
  if (error) throw toFriendlyError(error, "Could not change the sizing form status.");
  return data as boolean;
}

export async function adminReleaseJersey(pin: string, voterId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_release_jersey", {
    p_review_id: REVIEW_ID,
    p_pin: pin,
    p_voter_id: voterId,
  });
  if (error) throw toFriendlyError(error, "Could not release that entry.");
}

export async function adminSetSizeChart(pin: string, url: string | null): Promise<void> {
  const { error } = await supabase.rpc("admin_set_size_chart", {
    p_review_id: REVIEW_ID,
    p_pin: pin,
    p_url: url,
  });
  if (error) throw toFriendlyError(error, "Could not save the size guide.");
}
