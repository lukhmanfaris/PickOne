import React from "react";
import { Work, Category, TallyRow } from "../types";
import { VectorArtwork } from "./VectorArtwork";
import { Maximize2, Award } from "lucide-react";

interface DesignHangProps {
  categories: Category[];
  works: Work[];
  draftVotes: Record<string, string>;
  tallies: TallyRow[];
  isOpen: boolean;
  isLocked: boolean;
  totalBallots: number;
  onToggleVote: (categoryId: string, workId: string) => void;
  onOpenZoom: (index: number) => void;
}

export const DesignHang: React.FC<DesignHangProps> = ({
  categories,
  works,
  draftVotes,
  tallies,
  isOpen,
  isLocked,
  totalBallots,
  onToggleVote,
  onOpenZoom
}) => {
  const tallyMap = new Map<string, TallyRow>();
  tallies.forEach((t) => {
    tallyMap.set(t.work.id, t);
  });

  const showScores = !isOpen || totalBallots > 0;

  return (
    <div className="flex flex-col gap-10">
      {(categories || []).map((category) => {
        const catWorks = (works || []).filter((w) => w.categoryId === category.id);
        if (catWorks.length === 0) return null;

        // Determine if there's a leader for this category (when voting is closed)
        let leadId: string | null = null;
        if (!isOpen && catWorks.length > 0) {
          const catTallies = catWorks
            .map(w => tallyMap.get(w.id))
            .filter(t => t && t.pts > 0)
            .sort((a, b) => (b?.pts || 0) - (a?.pts || 0));
          if (catTallies.length > 0) {
            leadId = catTallies[0]!.work.id;
          }
        }

        return (
          <div key={category.id} className="relative">
            <h3 className="text-xl sm:text-2xl font-bold mb-4 text-neutral-900 dark:text-white border-b border-black/10 dark:border-white/10 pb-3 flex items-center justify-between">
              {category.name}
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                1 Vote
              </span>
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {catWorks.map((work) => {
                const index = (works || []).findIndex(w => w.id === work.id);
                const isSelected = draftVotes[category.id] === work.id;
                const isLeader = leadId === work.id;
                const tally = tallyMap.get(work.id);
                const pts = tally ? tally.pts : 0;

                return (
                  <div
                    key={work.id}
                    id={`work-card-${work.id}`}
                    className={`group relative flex flex-col p-3 rounded-2xl glass-panel text-left transition-all select-none ${
                      isSelected ? "ring-2 ring-[#007AFF] shadow-lg shadow-blue-500/10 bg-white/90 dark:bg-neutral-800/90" : ""
                    }`}
                  >
                    {!isOpen && isLeader && pts > 0 && (
                      <div className="absolute -top-3 -right-2 z-20 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F5A623] text-black font-bold text-xs shadow-md shadow-amber-500/30 animate-bounce">
                        <Award className="w-3.5 h-3.5" />
                        Selected
                      </div>
                    )}

                    {/* Artwork Frame (Clickable for Lightbox) */}
                    <div 
                      onClick={() => onOpenZoom(index)}
                      className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-white/40 dark:bg-black/20 flex items-center justify-center relative border border-black/5 dark:border-white/5 cursor-pointer hover:shadow-lg transition-shadow"
                    >
                      <VectorArtwork work={work} index={index} />
                      
                      {/* Hover Caption Overlay */}
                      <div className="absolute top-2 inset-x-2 text-center text-[10px] font-bold uppercase tracking-widest text-white bg-black/60 backdrop-blur-md rounded-full py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center gap-1.5">
                        <Maximize2 className="w-3 h-3" />
                        Click to enlarge
                      </div>
                    </div>

                    {/* Info */}
                    <div className="mt-3 flex items-start justify-between gap-2 px-1 pb-1">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-sm sm:text-base text-neutral-900 dark:text-white truncate">
                          {work.name}
                        </h2>
                        {work.note && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                            {work.note}
                          </p>
                        )}
                      </div>
                      
                      {showScores && (
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                            {pts}
                          </span>
                          <span className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 ml-1 font-medium">
                            votes
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dedicated Action Button */}
                    <div className="mt-auto pt-2 px-1">
                      <button
                        disabled={isLocked && !isSelected}
                        onClick={() => onToggleVote(category.id, work.id)}
                        className={`w-full py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                          isSelected
                            ? "bg-[#007AFF] text-white shadow-md shadow-blue-500/25 border-transparent"
                            : isLocked 
                              ? "bg-transparent text-neutral-400 border border-neutral-300 dark:border-neutral-700 cursor-not-allowed"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-transparent"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            Voted
                          </>
                        ) : (
                          "Vote for this"
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
