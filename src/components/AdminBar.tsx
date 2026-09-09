import React from "react";
import { ReviewConfig } from "../types";
import { Power, Settings, Trash2, RotateCcw, X } from "lucide-react";

interface AdminBarProps {
  cfg: ReviewConfig;
  onToggleVoting: () => void;
  onEditRules: () => void;
  onClearTallies: () => void;
  onResetSample: () => void;
  onExitAdmin: () => void;
  isToggling?: boolean;
}

export const AdminBar: React.FC<AdminBarProps> = ({
  cfg,
  onToggleVoting,
  onEditRules,
  onClearTallies,
  onResetSample,
  onExitAdmin,
  isToggling
}) => {
  const isOpen = cfg.open !== false;

  return (
    <div className="mb-8 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/25 p-3.5 sm:p-4 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs font-bold tracking-wider uppercase text-[#007AFF] px-2.5 py-1 rounded-full bg-blue-500/15">
            Admin Console
          </span>

          {/* Toggle Voting */}
          <button
            onClick={onToggleVoting}
            disabled={isToggling}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition shadow-sm ${
              isOpen
                ? "bg-neutral-800 text-white hover:bg-neutral-900 dark:bg-neutral-200 dark:text-neutral-900"
                : "bg-[#007AFF] text-white hover:bg-[#005bb5]"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isOpen ? "Close Voting" : "Reopen Voting"}
          </button>

          {/* Edit Rules */}
          <button
            onClick={onEditRules}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/70 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-700 transition"
          >
            <Settings className="w-3.5 h-3.5" />
            Edit Rules & Routes
          </button>

          {/* Clear Tallies */}
          <button
            onClick={onClearTallies}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Ballots
          </button>

          {/* Reset to Sample */}
          <button
            onClick={onResetSample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="Reset to default sample concepts"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Sample
          </button>
        </div>

        {/* Right side info */}
        <div className="flex items-center gap-3 ml-auto text-xs text-neutral-600 dark:text-neutral-400">
          <span className="hidden sm:inline">
            Each voter:{" "}
            <strong className="text-neutral-900 dark:text-white font-semibold">
              {cfg.maxSubmits === 1 ? "1 vote" : `${cfg.maxSubmits} submissions`}
            </strong>{" "}
            · <strong className="text-neutral-900 dark:text-white font-semibold">{cfg.categories?.length || 1}</strong> {cfg.categories?.length === 1 ? "category" : "categories"}
          </span>
          <button
            onClick={onExitAdmin}
            title="Exit Admin mode"
            aria-label="Exit Admin mode"
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
