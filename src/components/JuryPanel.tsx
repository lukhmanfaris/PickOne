import React from "react";
import { ReviewConfig, Work, Ballot, TallyRow } from "../types";
import { X, Check, ArrowRight, Share2 } from "lucide-react";

interface JuryPanelProps {
  cfg: ReviewConfig;
  draftVotes: Record<string, string>;
  tallies: TallyRow[];
  myBallot: Ballot | null;
  totalBallots: number;
  isOpen: boolean;
  isLocked: boolean;
  isSubmitting: boolean;
  onClearSlot: (categoryId: string) => void;
  onSubmitBallot: () => void;
  onCopyResults: () => void;
  copiedResults: boolean;
}

export const JuryPanel: React.FC<JuryPanelProps> = ({
  cfg,
  draftVotes,
  tallies,
  myBallot,
  totalBallots,
  isOpen,
  isLocked,
  isSubmitting,
  onClearSlot,
  onSubmitBallot,
  onCopyResults,
  copiedResults
}) => {
  const worksMap = new Map<string, Work>();
  (cfg.works || []).forEach((w) => worksMap.set(w.id, w));

  const used = myBallot ? myBallot.count : 0;
  const left = Math.max(0, cfg.maxSubmits - used);
  const categoriesCount = cfg.categories?.length || 0;
  const votedCount = Object.keys(draftVotes).length;
  const isFull = votedCount === categoriesCount;

  return (
    <aside className="flex flex-col gap-6 w-full">
      {/* Panel 1: Your Ballot */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Your ballot
          </h2>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
            {votedCount}/{categoriesCount} Voted
          </span>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed">
          Select one preferred concept for each category.
        </p>

        {/* Category Slots */}
        <div className="flex flex-col gap-2 mb-4">
          {(cfg.categories || []).map((cat, idx) => {
            const workId = draftVotes[cat.id];
            const work = workId ? worksMap.get(workId) : null;
            const isFilled = !!work;

            return (
              <div
                key={cat.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  isFilled
                    ? "bg-blue-500/10 border-blue-500/30 dark:bg-blue-500/15"
                    : "glass-well border-black/5 dark:border-white/5"
                }`}
              >
                <span
                  className={`text-sm font-bold w-5 text-center shrink-0 ${
                    isFilled ? "text-[#007AFF]" : "text-neutral-400 dark:text-neutral-600"
                  }`}
                >
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0 flex flex-col">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400 mb-0.5 truncate">
                    {cat.name}
                  </span>
                  {work ? (
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate block">
                      {work.name}
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm italic text-neutral-400 dark:text-neutral-500">
                      Pending selection
                    </span>
                  )}
                </div>

                {isFilled && !isLocked && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onClearSlot(cat.id)}
                      title="Clear selection"
                      className="p-1.5 text-neutral-400 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Button & Status Note */}
        {!isOpen ? (
          <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 text-center font-medium">
            Voting is closed. {myBallot ? "Your final submitted ballot is recorded." : "No ballot was submitted."}
          </div>
        ) : left <= 0 ? (
          <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 text-center font-medium">
            You have used all {cfg.maxSubmits} submissions. Your last ballot stands.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={onSubmitBallot}
              disabled={!isFull || isSubmitting}
              className={`w-full py-2.5 px-4 rounded-full font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                isFull && !isSubmitting
                  ? "bg-[#007AFF] text-white hover:bg-[#005bb5] shadow-blue-500/25 active:scale-[0.98]"
                  : "bg-neutral-300 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 cursor-not-allowed shadow-none"
              }`}
            >
              {isSubmitting ? (
                <span>Recording ballot...</span>
              ) : myBallot ? (
                <>
                  <span>Update my ballot</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Submit ballot</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center leading-relaxed">
              {isFull ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Ready to submit.{" "}
                </span>
              ) : (
                <span>Vote in {categoriesCount - votedCount} more categories to complete. </span>
              )}
              {myBallot ? (
                <>Submitted {used} of {cfg.maxSubmits} times — {left} left.</>
              ) : (
                <>You may submit {cfg.maxSubmits === 1 ? "once only" : `up to ${cfg.maxSubmits} times`}.</>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Panel 2: Live Standings */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Live standings
          </h2>
          <button
            onClick={onCopyResults}
            title="Share or copy current standings summary"
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            {copiedResults ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">
          Tallies update automatically as ballots are cast.
        </p>

        {/* Group Standings by Category */}
        <div className="flex flex-col gap-6">
          {(cfg.categories || []).map((cat) => {
            const catTallies = tallies.filter(t => t.work?.categoryId === cat.id);
            if (catTallies.length === 0) return null;
            
            const maxPts = Math.max(1, catTallies[0]?.pts || 1);
            const leadId = catTallies[0]?.pts > 0 ? catTallies[0].work.id : null;

            return (
              <div key={cat.id} className="flex flex-col gap-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 border-b border-black/5 dark:border-white/5 pb-1">
                  {cat.name}
                </h4>
                
                <div className="flex flex-col gap-3">
                  {catTallies.map((row) => {
                    const isLead = row.work.id === leadId;
                    const pct = Math.round((row.pts / maxPts) * 100);

                    return (
                      <div key={row.work.id} className="flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between gap-2 text-xs sm:text-sm">
                          <span
                            className={`truncate ${
                              isLead
                                ? "font-bold text-neutral-900 dark:text-white flex items-center gap-1.5"
                                : "font-medium text-neutral-700 dark:text-neutral-300"
                            }`}
                          >
                            {row.work.name}
                          </span>
                          <span
                            className={`font-bold tabular-nums shrink-0 ${
                              isLead ? "text-[#F5A623] text-sm" : "text-neutral-800 dark:text-neutral-200"
                            }`}
                          >
                            {row.pts} <span className="text-[10px] font-normal text-neutral-500">votes</span>
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-2 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              isLead
                                ? "bg-[#F5A623] shadow-[0_0_10px_rgba(245,166,35,0.6)]"
                                : "bg-[#007AFF]"
                            }`}
                            style={{ width: `${Math.max(2, pct)}%` }}
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

        <div className="pt-4 mt-2 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
          <strong>{totalBallots}</strong> {totalBallots === 1 ? "ballot" : "ballots"} counted.
        </div>
      </div>
    </aside>
  );
};
