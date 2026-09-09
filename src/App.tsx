import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ReviewConfig, Ballot, Voter } from "./types";
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
import { formatImageUrl, uploadToDrive } from "./utils/drive";
import { getAccessToken } from "./utils/firebase";
import { calculateTally } from "./utils/tally";
import { HeaderRail } from "./components/HeaderRail";
import { AdminBar } from "./components/AdminBar";
import { DesignHang } from "./components/DesignHang";
import { ArtworkLightbox } from "./components/ArtworkLightbox";
import { SetupModal } from "./components/SetupModal";
import { NameGateModal } from "./components/NameGateModal";
import { AdminPromptModal } from "./components/AdminPromptModal";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function App() {
  const [cfg, setCfg] = useState<ReviewConfig | null>(null);
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [voter, setVoter] = useState<Voter | null>(null);
  const [draftVotes, setDraftVotes] = useState<Record<string, string>>({});
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
      setVoter(localUser);
    }

    loadState();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/review/stream");
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.cfg) setCfg(payload.cfg);
          if (payload.ballots) setBallots(payload.ballots);
        } catch (e) {
          console.error("Failed to parse SSE payload", e);
        }
      };
      eventSource.onerror = () => {
        eventSource?.close();
      };
    } catch (e) {
      console.warn("SSE not available, falling back to interval refresh", e);
    }

    const interval = setInterval(() => {
      if (!document.hidden && lightboxIndex === null) {
        loadState(true);
      }
    }, 8000);

    const onVisibilityChange = () => {
      if (!document.hidden && lightboxIndex === null) {
        loadState(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      eventSource?.close();
    };
  }, [loadState, lightboxIndex]);

  const myBallot = useMemo(() => {
    if (!voter || !ballots) return null;
    return ballots.find((b) => b.voterId === voter.id) || null;
  }, [voter, ballots]);

  useEffect(() => {
    if (myBallot && !draftInitialized) {
      setDraftVotes(myBallot.votes || {});
      setDraftInitialized(true);
    }
  }, [myBallot, draftInitialized]);

  const tallies = useMemo(() => {
    if (!cfg) return [];
    return calculateTally(cfg, ballots);
  }, [cfg, ballots]);

  const handleEnterVoter = (name: string) => {
    const newVoter: Voter = {
      id: Math.random().toString(36).slice(2, 8),
      name
    };
    setLocalVoter(newVoter);
    setVoter(newVoter);
    setDraftInitialized(false);
    showToast("ok", `Welcome, ${name}! Click any route to cast your vote.`);
  };

  const handleSwitchVoter = () => {
    clearLocalVoter();
    setVoter(null);
    setDraftVotes({});
    setDraftInitialized(false);
  };

  const isOpen = cfg?.open !== false;
  const isLocked = !isOpen;

  const handleToggleVote = async (categoryId: string, workId: string) => {
    if (isLocked) {
      showToast("err", "Voting is currently closed.");
      return;
    }
    if (!voter) {
      showToast("err", "Please enter your name first.");
      return;
    }

    const nextVotes = { ...draftVotes };
    const isRemoving = nextVotes[categoryId] === workId;
    if (isRemoving) {
      delete nextVotes[categoryId];
    } else {
      nextVotes[categoryId] = workId;
    }
    setDraftVotes(nextVotes);

    try {
      const res = await submitBallot(voter.id, voter.name, nextVotes);
      setCfg(res.cfg);
      setBallots(res.ballots);
      if (isRemoving) {
        showToast("ok", "Vote removed.");
      } else {
        showToast("ok", "Vote recorded!");
      }
    } catch (err: any) {
      showToast("err", err.message || "Failed to record vote.");
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

  const handleSaveConfig = async (newConfig: Partial<ReviewConfig> & { currentPin?: string }) => {
    const res = await saveReviewConfig({
      ...newConfig,
      currentPin: adminPin || cfg?.pin || newConfig.currentPin || newConfig.pin
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
      let url = "";
      try {
        const token = await getAccessToken();
        if (token) {
          url = await uploadToDrive(file, token);
        }
      } catch (driveErr) {
        console.warn("Drive upload failed, falling back to local server upload", driveErr);
      }

      if (!url) {
        const res = await uploadImage(file);
        url = res.url;
      }

      const formattedUrl = formatImageUrl(url);
      const res = await addWorkAsset(workId, formattedUrl, adminPin || cfg?.pin);
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

        {/* Centered Main Gallery: 3 Concept Cards Per Row */}
        <section aria-label="Design Routes" className="w-full">
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
        </section>
      </main>

      <NameGateModal
        cfg={cfg}
        isOpen={!voter}
        onEnter={handleEnterVoter}
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
