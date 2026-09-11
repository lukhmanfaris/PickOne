import React, { useState } from "react";
import { ReviewConfig } from "../types";
import { IdCard, ArrowRight, Eye } from "lucide-react";
import { normaliseVoterId } from "../utils/voterId";

interface NameGateModalProps {
  cfg: ReviewConfig;
  isOpen: boolean;
  /** Normalised voter IDs that have already submitted a ballot. */
  takenIds?: string[];
  onEnter: (voterId: string) => void;
}

export const NameGateModal: React.FC<NameGateModalProps> = ({
  cfg,
  isOpen,
  takenIds = [],
  onEnter
}) => {
  const [voterId, setVoterId] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const normalised = normaliseVoterId(voterId);
  const hasVotedBefore =
    normalised.length > 0 && Array.isArray(takenIds) && takenIds.includes(normalised);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalised) {
      setError("Please enter your voter ID to continue.");
      return;
    }
    if (normalised.length < 3) {
      setError("That ID looks too short. Please check and try again.");
      return;
    }
    onEnter(normalised);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-white/95 dark:bg-neutral-900/95 border border-white/60 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-[#007AFF] flex items-center justify-center mx-auto mb-3">
            <IdCard className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {cfg.title}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
            {cfg.brief ? `${cfg.brief} ` : ""}Enter your assigned Company ID to cast your ballot.
          </p>
        </div>

        {hasVotedBefore && !error && (
          <div className="p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs sm:text-sm">
            <div className="flex items-start gap-2">
              <Eye className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">This ID has already voted.</p>
                <p className="mt-0.5 leading-relaxed">
                  Continue and your previous picks will load. You can revise them
                  only if the review still allows it.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Company ID
            </label>
            <input
              type="text"
              autoFocus
              required
              autoComplete="off"
              autoCapitalize="characters"
              value={voterId}
              onChange={(e) => {
                setVoterId(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. MA00XXX"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm tracking-wide uppercase focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            />
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5">
              Your ID identifies your ballot on any device. Capitalisation and
              spaces don't matter.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-full font-semibold text-sm bg-[#007AFF] text-white hover:bg-[#005bb5] transition shadow-md shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            <span>{hasVotedBefore ? "Continue to my ballot" : "Enter the review"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
