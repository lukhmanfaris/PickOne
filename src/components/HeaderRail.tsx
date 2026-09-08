import React from "react";
import { ReviewConfig, Voter } from "../types";
import { Lock, ShieldCheck, UserCheck, RefreshCw } from "lucide-react";

interface HeaderRailProps {
  cfg: ReviewConfig;
  voter: Voter | null;
  ballotCount: number;
  isAdmin: boolean;
  onOpenAdminPrompt: () => void;
  onSwitchVoter: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const HeaderRail: React.FC<HeaderRailProps> = ({
  cfg,
  voter,
  ballotCount,
  isAdmin,
  onOpenAdminPrompt,
  onSwitchVoter,
  onRefresh,
  isRefreshing
}) => {
  const isOpen = cfg.open !== false;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/40 dark:border-white/10 mb-8 backdrop-blur-xl">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          {/* Title and Brief */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white truncate">
                {cfg.title}
              </h1>
              <button
                onClick={onRefresh}
                title="Refresh live tallies"
                aria-label="Refresh live tallies"
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-500" : ""}`} />
              </button>
            </div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
              <span className="tabular-nums font-semibold text-neutral-800 dark:text-neutral-200">
                {ballotCount}
              </span>{" "}
              {ballotCount === 1 ? "ballot" : "ballots"} in
              {cfg.brief && (
                <>
                  <span className="mx-2 text-neutral-300 dark:text-neutral-600">·</span>
                  <span className="italic">{cfg.brief}</span>
                </>
              )}
            </p>
          </div>

          {/* Status, Voter Identity & Admin */}
          <div className="flex items-center flex-wrap gap-3 sm:gap-4 text-sm">
            {/* Status dot */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-well text-xs sm:text-sm font-semibold">
              <span
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  isOpen
                    ? "bg-[#007AFF] shadow-[0_0_8px_#007AFF] animate-pulse"
                    : "bg-neutral-400 dark:bg-neutral-600 shadow-none"
                }`}
              />
              <span className={isOpen ? "text-blue-600 dark:text-blue-400" : "text-neutral-500"}>
                {isOpen ? "Voting open" : "Voting closed"}
              </span>
            </div>

            {/* Voter pill */}
            {voter && (
              <div className="inline-flex items-center gap-2 border-l border-neutral-300 dark:border-neutral-700 pl-3 text-neutral-600 dark:text-neutral-300">
                <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
                <span>
                  Voting as <strong className="font-semibold text-neutral-900 dark:text-white">{voter.name}</strong>
                </span>
                <button
                  onClick={onSwitchVoter}
                  className="text-xs px-2 py-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-blue-600 dark:text-blue-400 transition"
                >
                  Not you?
                </button>
              </div>
            )}

            {/* Admin trigger */}
            {isAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-200 dark:border-blue-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Active
              </span>
            ) : (
              <button
                onClick={onOpenAdminPrompt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition text-xs font-semibold"
              >
                <Lock className="w-3 h-3" />
                Admin
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
