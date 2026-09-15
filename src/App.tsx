import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ReviewConfig, Ballot, Voter, SaveConfigPayload } from "./types";
import {
  fetchReviewState,
  getLocalVoter,
  setLocalVoter,
  clearLocalVoter,
  submitBallot,
  saveReviewConfig,
  toggleVotingStatus,
  clearAllBallots,
  verifyAdminPasscode,
  resetToSampleReview,
  addWorkAsset,
  uploadImage
} from "./api";
import { formatImageUrl } from "./utils/images";
import { supabase } from "./utils/supabase";
import { calculateTally } from "./utils/tally";
import { isLegacyVoterId } from "./utils/voterId";
import { HeaderRail } from "./components/HeaderRail";
import { AdminBar } from "./components/AdminBar";
import { DesignHang } from "./components/DesignHang";
import { ArtworkLightbox } from "./components/ArtworkLightbox";
import { SetupModal } from "./components/SetupModal";
import { NameGateModal } from "./components/NameGateModal";
import { AdminPromptModal } from "./components/AdminPromptModal";
import { SizingForm } from "./components/SizingForm";
import { JerseyAdminPanel } from "./components/JerseyAdminPanel";
import { adminToggleSizing, adminSetSizeChart } from "./api";
import { Shirt, Trophy } from "lucide-react";
import { AlertCircle, CheckCircle2, Eye } from "lucide-react";

export default function App() {
  const [cfg, setCfg] = useState<ReviewConfig | null>(null);
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [voter, setVoter] = useState<Voter | null>(null);
  const [draftVotes, setDraftVotes] = useState<Record<string, string>>({});

  // Sizing is the default view now that voting has closed.
  // Results stay reachable behind the second tab.
  const [view, setView] = useState<"sizing" | "results">(
    window.location.hash === "#results" ? "results" : "sizing"
  );
  const [isJerseyAdminOpen, setIsJerseyAdminOpen] = useState(false);
  /** True when this person entered a name that had already voted. */
  const [draftInitialized, setDraftInitialized] = useState(false);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState<string>("");

  // Modals & UI overlays
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isAdminPromptOpen, setIsAdminPromptOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [copiedResults, setCopiedResults] = useState(false);

  // Loading & network state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const showToast = useCallback((type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

  const loadState = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const data = await fetchReviewState();
      setCfg(data.cfg);
      setBallots(data.ballots || []);
    } catch (err: any) {
      console.error("Failed to load review state:", err);
      if (!quiet) {
        showToast("err", err.message || "Unable to load review state. Check your connection.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    const localUser = getLocalVoter();
    if (localUser) {
      // Identities used to be random UUIDs. Anyone still carrying one in
      // localStorage would keep voting as an anonymous device rather than as
      // their assigned ID, so send them back to the gate once.
      if (isLegacyVoterId(localUser.id)) {
        clearLocalVoter();
      } else {
        setVoter(localUser);
      }
    }

    loadState();

    // Live updates over Supabase Realtime, replacing the old SSE stream.
    //
    // The previous version listed `lightboxIndex` in this effect's dependency
    // array, which tore down and rebuilt the entire connection every time
    // someone opened or closed an image. This effect now depends only on
    // `loadState`, so the subscription is created once and survives.
    const channel = supabase
      .channel("review-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "ballots" }, () => loadState(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => loadState(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => loadState(true))
      .subscribe();

    // Cheap safety net in case the socket drops while the tab is hidden.
    const onVisibilityChange = () => {
      if (!document.hidden) {
        loadState(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [loadState]);

  const myBallot = useMemo(() => {
    if (!voter || !ballots) return null;
    return ballots.find((b) => b.voterId === voter.id) || null;
  }, [voter, ballots]);

  useEffect(() => {
    // Load whatever this voter ID previously submitted, so returning voters
    // see their own picks rather than a blank ballot.
    if (myBallot && !draftInitialized) {
      setDraftVotes(myBallot.votes || {});
      setDraftInitialized(true);
    }
  }, [myBallot, draftInitialized]);

  const tallies = useMemo(() => {
    if (!cfg) return [];
    return calculateTally(cfg, ballots);
  }, [cfg, ballots]);

  /** True when the draft differs from what this voter last submitted. */
  const hasUnsubmittedChanges = useMemo(() => {
    const submitted = myBallot?.votes || {};
    const draftKeys = Object.keys(draftVotes);
    const submittedKeys = Object.keys(submitted);
    if (draftKeys.length !== submittedKeys.length) return true;
    return draftKeys.some((k) => draftVotes[k] !== submitted[k]);
  }, [draftVotes, myBallot]);

  /** How many more times this voter may submit, per the review's max_submits. */
  const submitsLeft = useMemo(() => {
    if (!cfg) return 0;
    const used = myBallot?.count ?? 0;
    return Math.max(0, cfg.maxSubmits - used);
  }, [cfg, myBallot]);

  const hasSubmittedBefore = (myBallot?.count ?? 0) > 0;

  const handleUploadSizeChart = async (file: File) => {
    if (!adminPin) return;
    showToast("ok", "Uploading size guide…");
    try {
      const { url } = await uploadImage(file);
      await adminSetSizeChart(adminPin, url);
      await loadState(true);
      showToast("ok", "Size guide updated.");
    } catch (e: any) {
      showToast("err", e.message || "Could not upload the size guide.");
    }
  };

  const handleRemoveSizeChart = async () => {
    if (!adminPin) return;
    try {
      await adminSetSizeChart(adminPin, null);
      await loadState(true);
      showToast("ok", "Size guide removed.");
    } catch (e: any) {
      showToast("err", e.message || "Could not remove the size guide.");
    }
  };

  const handleToggleSizing = async () => {
    if (!adminPin) return;
    try {
      const open = await adminToggleSizing(adminPin);
      showToast("ok", open ? "Sizing form is now open." : "Sizing form is now closed.");
      await loadState(true);
    } catch (e: any) {
      showToast("err", e.message || "Could not change the sizing form status.");
    }
  };

  const handleEnterVoter = (voterId: string) => {
    // Identity is the voter's assigned ID, not a per-device random value.
    //
    // Previously this generated a fresh UUID on every entry, so the same
    // person coming back — after a refresh, in a private window, on a phone —
    // became a brand new voter with an untouched allowance. The name-based
    // spectator check tried to paper over that, but it guessed from a display
    // name and could not distinguish two people who share one.
    //
    // Keying on the assigned ID means one ballot per person across every
    // device, and the submission limit applies to a human rather than to a
    // browser profile. Whether they may still vote is then just a matter of
    // how many submissions that ID has left — no separate spectator flag.
    const newVoter: Voter = {
      id: voterId,
      name: voterId
    };
    setLocalVoter(newVoter);
    setVoter(newVoter);

    // Reload the draft from whatever this ID previously submitted.
    setDraftVotes({});
    setDraftInitialized(false);

    const existing = ballots.find((b) => b.voterId === voterId);
    if (existing) {
      showToast("ok", `Welcome back, ${voterId}. Your previous picks are loaded.`);
    } else {
      showToast("ok", `Signed in as ${voterId}. Pick your favourite in each category, then submit.`);
    }
  };

  const handleSwitchVoter = () => {
    clearLocalVoter();
    setVoter(null);
    setDraftVotes({});
    setDraftInitialized(false);
  };

  const isOpen = cfg?.open !== false;
  const isLocked = !isOpen;

  const handleToggleVote = (categoryId: string, workId: string) => {
    if (isLocked) {
      showToast("err", "Voting is currently closed.");
      return;
    }
    if (!voter) {
      showToast("err", "Please enter your name first.");
      return;
    }

    // Fix #3, part 1: selecting a card now only updates local draft state.
    // It used to fire submitBallot() on every single click, which is why a
    // submission limit of 2 would lock a voter out after two clicks. Nothing
    // reaches the database until the voter presses Submit.
    setDraftVotes((prev) => {
      const next = { ...prev };
      if (next[categoryId] === workId) {
        delete next[categoryId];
      } else {
        next[categoryId] = workId;
      }
      return next;
    });
  };

  const handleSubmitBallot = async () => {
    if (!voter || isLocked || isSubmitting) return;

    if (Object.keys(draftVotes).length === 0) {
      showToast("err", "Pick at least one concept before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitBallot(voter.id, voter.name, draftVotes);
      setCfg(res.cfg);
      setBallots(res.ballots);
      showToast("ok", "Ballot submitted. Thanks!");
    } catch (err: any) {
      // The database enforces the submission limit, so this is where a voter
      // finds out they have run out of revisions.
      showToast("err", err.message || "Failed to submit your ballot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Actions
  const handleUnlockAdmin = async (pin: string): Promise<boolean> => {
    try {
      await verifyAdminPasscode(pin);
      setIsAdmin(true);
      setAdminPin(pin);
      showToast("ok", "Admin controls unlocked.");
      return true;
    } catch (e: any) {
      return false;
    }
  };

  const handleToggleVoting = async () => {
    if (!adminPin) {
      setIsAdminPromptOpen(true);
      return;
    }
    setIsToggling(true);
    try {
      const res = await toggleVotingStatus(adminPin);
      if (cfg) {
        setCfg({ ...cfg, open: res.open });
      }
      showToast("ok", res.open ? "Voting is now OPEN." : "Voting is now CLOSED.");
    } catch (err: any) {
      showToast("err", err.message || "Failed to update voting status.");
    } finally {
      setIsToggling(false);
    }
  };

  const handleClearTallies = async () => {
    if (!adminPin) {
      setIsAdminPromptOpen(true);
      return;
    }
    if (!confirm("Are you sure you want to clear all submitted ballots? Standings will reset to zero.")) {
      return;
    }
    try {
      await clearAllBallots(adminPin);
      setBallots([]);
      setDraftVotes({});
      setDraftInitialized(false);
      showToast("ok", "All ballots have been cleared.");
    } catch (err: any) {
      showToast("err", err.message || "Failed to clear ballots.");
    }
  };

  const handleResetSample = async () => {
    if (!adminPin) {
      setIsAdminPromptOpen(true);
      return;
    }
    if (!confirm("Reset to default sample data? Existing custom routes will be replaced.")) {
      return;
    }
    try {
      const res = await resetToSampleReview(adminPin);
      setCfg(res.cfg);
      setBallots(res.ballots);
      setDraftVotes({});
      setDraftInitialized(false);
      showToast("ok", "Reset to sample routes.");
    } catch (err: any) {
      showToast("err", err.message || "Failed to reset sample.");
    }
  };

  const handleSaveConfig = async (newConfig: SaveConfigPayload) => {
    // The PIN is never returned by the server any more, so it can only come
    // from admin state (set after verifyAdminPasscode) or from the setup form
    // during first-time setup.
    const res = await saveReviewConfig({
      ...newConfig,
      currentPin: adminPin || newConfig.currentPin || newConfig.pin
    });
    setCfg(res.cfg);
    setBallots(res.ballots);
    if (newConfig.pin) {
      setAdminPin(newConfig.pin);
    }
    setIsAdmin(true);
    showToast("ok", "Review configuration saved.");
  };

  const handleAddAssetToWork = async (workId: string, file: File) => {
    if (!isAdmin) {
      showToast("err", "Admin access required to configure assets.");
      return;
    }

    try {
      // Single upload path now: compress, then straight to Supabase Storage.
      // The old Google Drive branch (with its OAuth token dance) is gone.
      const { url } = await uploadImage(file);

      const formattedUrl = formatImageUrl(url);
      const res = await addWorkAsset(workId, formattedUrl, adminPin);
      setCfg(res.cfg);
      setBallots(res.ballots);
      showToast("ok", "Asset added successfully!");
    } catch (err: any) {
      console.error("Failed to add asset:", err);
      showToast("err", err.message || "Failed to upload asset.");
    }
  };

  const handleCopyResults = () => {
    if (!cfg) return;
    const summaryLines = [
      `📊 ${cfg.title} — Live Standings`,
      `${ballots.length} ballots recorded (${cfg.open ? "Voting Open" : "Voting Closed"})`,
      ""
    ];
    
    (cfg.categories || []).forEach(cat => {
      summaryLines.push(`=== ${cat.name.toUpperCase()} ===`);
      const catTallies = tallies.filter(t => t.work.categoryId === cat.id);
      catTallies.forEach((t, i) => {
        summaryLines.push(`${i + 1}. ${t.work.name}: ${t.pts} pts`);
      });
      summaryLines.push("");
    });
    
    navigator.clipboard.writeText(summaryLines.join("\n"));
    setCopiedResults(true);
    showToast("ok", "Standings summary copied to clipboard!");
    setTimeout(() => setCopiedResults(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-neutral-500 font-medium">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Opening the review…</p>
        </div>
      </div>
    );
  }

  if (!cfg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-neutral-600">
        <div className="glass-panel p-8 rounded-3xl max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Review Not Found</h2>
          <p className="text-sm text-neutral-500 mb-4">
            Could not find an active review configuration.
          </p>
          <button
            onClick={() => loadState()}
            className="px-5 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 relative">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-xl text-xs sm:text-sm font-medium border ${
              toast.type === "ok"
                ? "bg-emerald-500/90 text-white border-emerald-400"
                : "bg-rose-500/90 text-white border-rose-400"
            }`}
          >
            {toast.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      <HeaderRail
        cfg={cfg}
        voter={voter}
        ballotCount={ballots.length}
        isAdmin={isAdmin}
        tallies={tallies}
        onOpenAdminPrompt={() => setIsAdminPromptOpen(true)}
        onSwitchVoter={handleSwitchVoter}
        onRefresh={() => loadState(false)}
        isRefreshing={isRefreshing}
        onCopyResults={handleCopyResults}
        copiedResults={copiedResults}
      />

      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 pb-20">
        {/* Sizing first, results behind a tab. */}
        <div className="flex items-center justify-center gap-1.5 mb-6 p-1 rounded-full bg-neutral-100 w-fit mx-auto">
          {([
            ["sizing", "Jersey sizing", Shirt],
            ["results", "Voting results", Trophy],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => {
                setView(key);
                window.location.hash = key === "results" ? "#results" : "#sizing";
              }}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition ${
                view === key
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {isAdmin && view === "sizing" && (
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={handleToggleSizing}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-700 transition"
            >
              {cfg.sizingOpen ? "Close sizing form" : "Reopen sizing form"}
            </button>
            <button
              onClick={() => setIsJerseyAdminOpen(true)}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-white border border-neutral-300 text-neutral-700 hover:border-neutral-400 transition"
            >
              View orders &amp; export
            </button>

            <label className="px-4 py-2 rounded-full text-xs font-semibold bg-white border border-neutral-300 text-neutral-700 hover:border-neutral-400 transition cursor-pointer">
              {cfg.sizeChartUrl ? "Replace size guide" : "Upload size guide"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadSizeChart(f);
                  e.target.value = "";
                }}
              />
            </label>

            {cfg.sizeChartUrl && (
              <button
                onClick={handleRemoveSizeChart}
                className="px-4 py-2 rounded-full text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
              >
                Remove guide
              </button>
            )}
          </div>
        )}

        {view === "sizing" && voter && (
          <SizingForm
            voterId={voter.id}
            sizingOpen={cfg.sizingOpen}
            sizeChartUrl={cfg.sizeChartUrl}
            onToast={showToast}
          />
        )}

        {view === "results" && (
        <>
        {isAdmin && (
          <AdminBar
            cfg={cfg}
            onToggleVoting={handleToggleVoting}
            onEditRules={() => setIsSetupOpen(true)}
            onClearTallies={handleClearTallies}
            onResetSample={handleResetSample}
            onExitAdmin={() => setIsAdmin(false)}
            isToggling={isToggling}
          />
        )}

        {voter && hasSubmittedBefore && (
          <div className={`mb-4 p-3.5 rounded-2xl border flex items-start gap-3 ${
            submitsLeft > 0
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-amber-500/10 border-amber-500/30"
          }`}>
            <Eye className={`w-4.5 h-4.5 shrink-0 mt-0.5 ${
              submitsLeft > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`} />
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${
                submitsLeft > 0
                  ? "text-emerald-800 dark:text-emerald-300"
                  : "text-amber-800 dark:text-amber-300"
              }`}>
                You've already voted
              </p>
              <p className={`text-xs mt-0.5 leading-relaxed ${
                submitsLeft > 0
                  ? "text-emerald-700/90 dark:text-emerald-400/90"
                  : "text-amber-700/90 dark:text-amber-400/90"
              }`}>
                {submitsLeft > 0
                  ? `Your picks are loaded below. You can change them and submit ${submitsLeft} more ${submitsLeft === 1 ? "time" : "times"}.`
                  : `Your ballot is final — highlighted below. Voting again isn't possible for ID ${voter.name}.`}
              </p>
            </div>
          </div>
        )}

        {/* Centered Main Gallery: 3 Concept Cards Per Row */}
        <section aria-label="Design Routes" className="w-full">
          {cfg.categories.length === 0 ? (
            <div className="py-20 px-6 text-center">
              <div className="max-w-md mx-auto">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Nothing to review yet
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                  {isAdmin
                    ? "Open Configure to add your categories and upload the concepts you want people to vote on."
                    : "The organiser hasn't added the concepts yet. Check back shortly — this page updates on its own."}
                </p>
                {isAdmin && (
                  <button
                    onClick={() => setIsSetupOpen(true)}
                    className="mt-5 px-5 py-2.5 rounded-full bg-[#007AFF] text-white text-sm font-semibold hover:bg-[#005bb5] transition shadow-md shadow-blue-500/20"
                  >
                    Configure review
                  </button>
                )}
              </div>
            </div>
          ) : (
            <DesignHang
              categories={cfg.categories}
              works={cfg.works}
              draftVotes={draftVotes}
              tallies={tallies}
              isOpen={isOpen}
              isLocked={isLocked}
              totalBallots={ballots.length}
              isAdmin={isAdmin}
              onToggleVote={handleToggleVote}
              onOpenZoom={(index) => setLightboxIndex(index)}
              onAddAssetToWork={handleAddAssetToWork}
              onAddOptionToCategory={() => setIsSetupOpen(true)}
            />
          )}
        </section>
        </>
        )}
      </main>

      {/* Fix #3, part 2: the explicit submit step.
          Clicking cards builds a draft; this is the only thing that writes a
          ballot to the database. It appears once the voter has picks that
          differ from what they last submitted. */}
      {voter && !isLocked && (hasUnsubmittedChanges || isSubmitting) && (
        <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pointer-events-none">
          <div className="max-w-[1240px] mx-auto pointer-events-auto">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl px-4 sm:px-5 py-3">
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {Object.keys(draftVotes).length} of {cfg.categories.length}{" "}
                  {cfg.categories.length === 1 ? "category" : "categories"} picked
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {submitsLeft <= 0
                    ? "You've used all your submissions."
                    : hasSubmittedBefore
                      ? `You can revise ${submitsLeft} more ${submitsLeft === 1 ? "time" : "times"}.`
                      : `Nothing is recorded until you submit.`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSubmitBallot}
                disabled={isSubmitting || submitsLeft <= 0 || Object.keys(draftVotes).length === 0}
                className="w-full sm:w-auto shrink-0 px-6 py-2.5 rounded-full text-sm font-semibold bg-[#007AFF] text-white hover:bg-[#005bb5] transition shadow-md shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Submitting…"
                  : hasSubmittedBefore
                    ? "Update ballot"
                    : "Submit ballot"}
              </button>
            </div>
          </div>
        </div>
      )}

      <NameGateModal
        cfg={cfg}
        isOpen={!voter}
        onEnter={handleEnterVoter}
      />

      <JerseyAdminPanel
        isOpen={isJerseyAdminOpen}
        adminPin={adminPin}
        onClose={() => setIsJerseyAdminOpen(false)}
        onToast={showToast}
      />

      <AdminPromptModal
        isOpen={isAdminPromptOpen}
        onClose={() => setIsAdminPromptOpen(false)}
        onUnlock={handleUnlockAdmin}
      />

      <SetupModal
        currentConfig={cfg}
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onSave={handleSaveConfig}
        adminPin={adminPin}
      />

      {lightboxIndex !== null && (
        <ArtworkLightbox
          works={cfg.works}
          categories={cfg.categories}
          currentIndex={lightboxIndex}
          draftVotes={draftVotes}
          isLocked={isLocked}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(newIdx) => setLightboxIndex(newIdx)}
          onToggleVote={handleToggleVote}
        />
      )}
    </div>
  );
}
