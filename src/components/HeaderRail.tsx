import React, { useState, useEffect } from "react";
import { ReviewConfig, Voter, TallyRow } from "../types";
import {
  Lock,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Share2,
  Check,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface HeaderRailProps {
  cfg: ReviewConfig;
  voter: Voter | null;
  ballotCount: number;
  isAdmin: boolean;
  tallies: TallyRow[];
  onOpenAdminPrompt: () => void;
  onSwitchVoter: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onCopyResults: () => void;
  copiedResults: boolean;
}

export const HeaderRail: React.FC<HeaderRailProps> = ({
  cfg,
  voter,
  ballotCount,
  isAdmin,
  tallies,
  onOpenAdminPrompt,
  onSwitchVoter,
  onRefresh,
  isRefreshing,
  onCopyResults,
  copiedResults
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 640;
    }
    return false;
  });

  const isOpen = cfg.open !== false;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY;
        // Hysteresis deadband:
        // Scrolled down past 70px -> minimize
        if (y > 70) {
          setIsScrolled((prev) => {
            if (!prev) return true;
            return prev;
          });
          // If user scrolls down while standings was manually opened, collapse it
          setManualExpanded((prev) => (prev ? false : prev));
        } else if (y <= 10) {
          // Returning to the very top (<= 10px) restores top-of-page state
          setIsScrolled((prev) => {
            if (prev) {
              setManualExpanded(null); // Reset manual override on return to top
              return false;
            }
            return false;
          });
        }
        rafId = null;
      });
    };

    if (window.scrollY > 70) {
      setIsScrolled(true);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // On desktop: expanded by default at the top of the page, collapses on scroll.
  // On mobile: collapsed by default to prevent 400px of standings taking over the phone screen
  // and pushing content unpredictably. On mobile, tapping "Standings" opens it smoothly.
  const isStandingsExpanded =
    manualExpanded !== null ? manualExpanded : !isMobile && !isScrolled;

  const handleToggleStandings = () => {
    setManualExpanded(!isStandingsExpanded);
  };

  return (
    <div className="sticky top-2 sm:top-3 z-40 w-full px-2.5 sm:px-6 mb-4 sm:mb-7 pointer-events-none sticky-header-container">
      <header
        className={`max-w-[1240px] mx-auto pointer-events-auto rounded-2xl sm:rounded-3xl floating-glass-header transition-[padding,box-shadow,background-color] duration-300 ease-out flex flex-col justify-center ${
          isScrolled
            ? "scrolled shadow-lg py-2.5 sm:py-3.5 px-3.5 sm:px-6"
            : "shadow-xl py-3.5 sm:py-5 px-3.5 sm:px-6"
        }`}
      >
        {/* Top Row: Title, Quick Info & Identity Rail */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 w-full">
          {/* Left Column: Title & Subtitle */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white truncate">
                {cfg.title}
              </h1>
              <button
                onClick={onRefresh}
                title="Refresh live tallies"
                aria-label="Refresh live tallies"
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5 shrink-0 active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? "animate-spin text-[#007AFF]" : ""}`} />
              </button>
            </div>

            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 sm:mt-1">
              <span className="inline-flex items-center gap-1 font-semibold text-neutral-800 dark:text-neutral-200 bg-black/5 dark:bg-white/10 px-2.5 py-0.5 rounded-full tabular-nums border border-black/5 dark:border-white/5 text-[11px] sm:text-xs shrink-0">
                {ballotCount} {ballotCount === 1 ? "ballot" : "ballots"} recorded
              </span>
              {cfg.brief && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-neutral-400">
                  <span className="text-neutral-300 dark:text-neutral-600">·</span>
                  <span className="truncate max-w-xs md:max-w-md italic text-xs">{cfg.brief}</span>
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Unified Actions & Identity Rail */}
          <div className="flex items-center gap-1.5 sm:gap-2 self-start md:self-center shrink-0 flex-wrap sm:flex-nowrap">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-black/5 dark:border-white/10 bg-white/70 dark:bg-neutral-800/70 text-[11px] sm:text-xs font-semibold shadow-xs shrink-0">
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  isOpen
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
                    : "bg-neutral-400 dark:bg-neutral-600"
                }`}
              />
              <span className={isOpen ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500"}>
                {isOpen ? "Open" : "Closed"}
              </span>
            </div>

            {/* Voter Badge */}
            {voter ? (
              <div className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-black/5 dark:border-white/10 bg-white/70 dark:bg-neutral-800/70 text-[11px] sm:text-xs text-neutral-700 dark:text-neutral-300 shadow-xs shrink-0">
                <UserCheck className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-[140px] font-medium">
                  {voter.name}
                </span>
                <button
                  onClick={onSwitchVoter}
                  className="text-[10px] sm:text-xs text-[#007AFF] hover:underline font-semibold ml-0.5 cursor-pointer"
                  title="Switch voter name"
                >
                  Switch
                </button>
              </div>
            ) : null}

            {/* Admin Trigger */}
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-500/10 text-[#007AFF] dark:text-blue-400 text-[11px] sm:text-xs font-semibold border border-blue-500/20 shadow-xs shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin Active</span>
                <span className="sm:hidden">Admin</span>
              </span>
            ) : (
              <button
                onClick={onOpenAdminPrompt}
                className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-neutral-300/80 dark:border-neutral-700/80 bg-white/80 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:border-[#007AFF] hover:text-[#007AFF] dark:hover:text-blue-400 transition text-[11px] sm:text-xs font-semibold shadow-xs active:scale-95 cursor-pointer shrink-0"
              >
                <Lock className="w-3 h-3" />
                <span>Admin</span>
              </button>
            )}

            {/* Copy / Share Standings Button */}
            <button
              onClick={onCopyResults}
              title="Copy Standings Summary"
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-black/5 dark:border-white/10 bg-white/70 dark:bg-neutral-800/70 text-[11px] sm:text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition shadow-xs active:scale-95 cursor-pointer shrink-0"
            >
              {copiedResults ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>

            {/* Standings Collapse/Expand Toggle */}
            <button
              onClick={handleToggleStandings}
              className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border transition-all shadow-xs cursor-pointer text-[11px] sm:text-xs font-semibold shrink-0 ${
                isStandingsExpanded
                  ? "bg-[#007AFF]/10 border-[#007AFF]/30 text-[#007AFF]"
                  : "border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              title={isStandingsExpanded ? "Minimize live standings" : "Open live standings"}
            >
              <span>Standings</span>
              {isStandingsExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Embedded Live Standings Panel (Inside Floating Header) */}
        <div
          className={`standings-collapse w-full ${
            isStandingsExpanded
              ? "expanded mt-3 sm:mt-3.5 pt-3 sm:pt-3.5 border-t border-black/10 dark:border-white/10"
              : "border-t border-transparent"
          }`}
        >
          <div className="standings-collapse-inner w-full">
            <div className="flex items-center justify-between mb-2 sm:mb-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <h2 className="text-xs uppercase font-bold tracking-widest text-neutral-500 dark:text-neutral-400">
                  Live Standings
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] text-neutral-400 dark:text-neutral-500">
                  Tallies update automatically
                </span>
                {isStandingsExpanded && (
                  <button
                    onClick={handleToggleStandings}
                    className="text-[11px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 underline cursor-pointer ml-1"
                  >
                    Minimize
                  </button>
                )}
              </div>
            </div>

            {/* Categories Standings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 w-full pb-0.5 max-h-[50vh] sm:max-h-none overflow-y-auto sm:overflow-visible">
              {(cfg.categories || []).map((cat) => {
                const catTallies = (tallies || []).filter((t) => t.work?.categoryId === cat.id);
                if (catTallies.length === 0) return null;

                const maxPts = Math.max(1, catTallies[0]?.pts || 1);
                const leadId = catTallies[0]?.pts > 0 ? catTallies[0].work.id : null;

                return (
                  <div
                    key={cat.id}
                    className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 border-b border-black/5 dark:border-white/5 pb-1">
                      <span className="truncate">{cat.name}</span>
                      {leadId && (
                        <span className="text-[10px] font-bold text-[#F5A623] normal-case truncate max-w-[150px]">
                          ★ Leading: {catTallies[0]?.work.name}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {catTallies.map((row) => {
                        const isLead = row.work.id === leadId;
                        const pct = Math.round((row.pts / maxPts) * 100);

                        return (
                          <div key={row.work.id} className="flex flex-col gap-1">
                            <div className="flex items-baseline justify-between gap-2 text-xs">
                              <span
                                className={`truncate ${
                                  isLead
                                    ? "font-bold text-neutral-900 dark:text-white"
                                    : "font-medium text-neutral-700 dark:text-neutral-300"
                                }`}
                              >
                                {row.work.name}
                              </span>
                              <span
                                className={`tabular-nums font-bold shrink-0 text-xs ${
                                  isLead
                                    ? "text-[#F5A623]"
                                    : "text-neutral-800 dark:text-neutral-200"
                                }`}
                              >
                                {row.pts} <span className="text-[10px] font-normal text-neutral-400">v</span>
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isLead
                                    ? "bg-[#F5A623] shadow-[0_0_8px_rgba(245,166,35,0.5)]"
                                    : "bg-[#007AFF]"
                                }`}
                                style={{ width: `${Math.max(3, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};
