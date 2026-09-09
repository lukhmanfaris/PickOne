import React, { useState } from "react";
import { Work, Category, TallyRow } from "../types";
import { VectorArtwork } from "./VectorArtwork";
import { Maximize2, Award, Plus, ChevronLeft, ChevronRight, UploadCloud, Loader2, ImagePlus } from "lucide-react";
import { getWorkImages } from "../utils/drive";

interface DesignHangProps {
  categories: Category[];
  works: Work[];
  draftVotes: Record<string, string>;
  tallies: TallyRow[];
  isOpen: boolean;
  isLocked: boolean;
  totalBallots: number;
  isAdmin?: boolean;
  onToggleVote: (categoryId: string, workId: string) => void;
  onOpenZoom: (index: number) => void;
  onAddAssetToWork?: (workId: string, file: File) => Promise<void>;
  onAddOptionToCategory?: (categoryId: string) => void;
}

export const DesignHang: React.FC<DesignHangProps> = ({
  categories,
  works,
  draftVotes,
  tallies,
  isOpen,
  isLocked,
  totalBallots,
  isAdmin = false,
  onToggleVote,
  onOpenZoom,
  onAddAssetToWork,
  onAddOptionToCategory
}) => {
  const [activeAssetMap, setActiveAssetMap] = useState<Record<string, number>>({});
  const [uploadingWorkId, setUploadingWorkId] = useState<string | null>(null);

  const tallyMap = new Map<string, TallyRow>();
  tallies.forEach((t) => {
    tallyMap.set(t.work.id, t);
  });

  const showScores = !isOpen || totalBallots > 0;

  const handlePrevAsset = (workId: string, count: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveAssetMap((prev) => {
      const current = prev[workId] || 0;
      return { ...prev, [workId]: (current - 1 + count) % count };
    });
  };

  const handleNextAsset = (workId: string, count: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveAssetMap((prev) => {
      const current = prev[workId] || 0;
      return { ...prev, [workId]: (current + 1) % count };
    });
  };

  const handleCardFileUpload = async (workId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAddAssetToWork) return;

    setUploadingWorkId(workId);
    try {
      await onAddAssetToWork(workId, file);
    } finally {
      setUploadingWorkId(null);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-14 sm:gap-20 w-full">
      {(categories || []).map((category) => {
        const catWorks = (works || []).filter((w) => w.categoryId === category.id);
        if (catWorks.length === 0) return null;

        // Determine if there's a leader for this category (when voting is closed)
        let leadId: string | null = null;
        if (!isOpen && catWorks.length > 0) {
          const catTallies = catWorks
            .map((w) => tallyMap.get(w.id))
            .filter((t) => t && t.pts > 0)
            .sort((a, b) => (b?.pts || 0) - (a?.pts || 0));
          if (catTallies.length > 0) {
            leadId = catTallies[0]!.work.id;
          }
        }

        return (
          <div key={category.id} className="relative w-full max-w-[1240px] mx-auto">
            {/* Category Header - Centered & Refined */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8 border-b border-black/10 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {category.name}
                </h3>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-300">
                  {catWorks.length} {catWorks.length === 1 ? "concept" : "concepts"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-[#007AFF] uppercase tracking-wider font-mono border border-blue-500/15">
                  1 Vote Allowed
                </span>
                {isAdmin && onAddOptionToCategory && (
                  <button
                    onClick={() => onAddOptionToCategory(category.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#007AFF] text-white hover:bg-[#005bb5] transition shadow-xs active:scale-95 cursor-pointer"
                    title={`Add another concept option to ${category.name}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Concept</span>
                  </button>
                )}
              </div>
            </div>

            {/* Options Cards Grid - 3 Cards Per Row on Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full max-w-[1240px] mx-auto">
              {catWorks.map((work) => {
                const globalIndex = (works || []).findIndex((w) => w.id === work.id);
                const isSelected = draftVotes[category.id] === work.id;
                const isLeader = leadId === work.id;
                const tally = tallyMap.get(work.id);
                const pts = tally ? tally.pts : 0;

                const images = getWorkImages(work);
                const activeIdx = activeAssetMap[work.id] || 0;
                const hasAssets = images.length > 0;
                const isUploading = uploadingWorkId === work.id;

                return (
                  <div
                    key={work.id}
                    id={`work-card-${work.id}`}
                    className={`group relative flex flex-col p-5 sm:p-6 rounded-3xl glass-panel text-left transition-all select-none shadow-md ${
                      isSelected
                        ? "ring-2 ring-[#007AFF] shadow-xl shadow-blue-500/15 bg-white/95 dark:bg-neutral-800/95"
                        : "hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-lg"
                    }`}
                  >
                    {/* Winner badge when voting closed */}
                    {!isOpen && isLeader && pts > 0 && (
                      <div className="absolute -top-3.5 -right-2.5 z-20 flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F5A623] text-black font-bold text-xs shadow-md shadow-amber-500/30">
                        <Award className="w-4 h-4" />
                        Selected
                      </div>
                    )}

                    {/* Artwork Stage - Scaled for 3 Cards Per Row */}
                    <div className="relative aspect-[16/10] min-h-[260px] sm:min-h-[280px] w-full rounded-2xl overflow-hidden bg-neutral-100/70 dark:bg-neutral-900/50 flex items-center justify-center border border-neutral-200/70 dark:border-neutral-800/70 shadow-inner">
                      <div
                        onClick={() => hasAssets && onOpenZoom(globalIndex)}
                        className={`w-full h-full flex items-center justify-center ${
                          hasAssets ? "cursor-pointer" : ""
                        }`}
                      >
                        <VectorArtwork
                          work={work}
                          index={globalIndex}
                          activeImageIndex={activeIdx}
                          isAdmin={isAdmin}
                          onAddAsset={() => {
                            if (isAdmin) {
                              const inputEl = document.getElementById(
                                `card-upload-${work.id}`
                              ) as HTMLInputElement | null;
                              inputEl?.click();
                            }
                          }}
                        />
                      </div>

                      {/* Hover caption when assets exist */}
                      {hasAssets && (
                        <div
                          onClick={() => onOpenZoom(globalIndex)}
                          className="absolute top-3 inset-x-3 text-center text-xs font-bold uppercase tracking-widest text-white bg-black/60 backdrop-blur-md rounded-full py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          Click to enlarge
                        </div>
                      )}

                      {/* Multi-asset carousel arrows */}
                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handlePrevAsset(work.id, images.length, e)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/85 cursor-pointer shadow-md"
                            title="Previous asset"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleNextAsset(work.id, images.length, e)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/85 cursor-pointer shadow-md"
                            title="Next asset"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>

                          {/* Asset count badge */}
                          <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-xs text-xs font-semibold text-white">
                            {activeIdx + 1} / {images.length} assets
                          </div>
                        </>
                      )}

                      {/* Uploading overlay if admin initiated upload on this card */}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white text-sm font-semibold gap-2.5 z-10">
                          <Loader2 className="w-5 h-5 animate-spin text-[#007AFF]" />
                          <span>Uploading asset...</span>
                        </div>
                      )}

                      {/* Hidden file input for admin only */}
                      {isAdmin && (
                        <input
                          type="file"
                          accept="image/*"
                          id={`card-upload-${work.id}`}
                          className="hidden"
                          onChange={(e) => handleCardFileUpload(work.id, e)}
                        />
                      )}
                    </div>

                    {/* Concept Info */}
                    <div className="mt-4 sm:mt-5 flex items-start justify-between gap-3 px-1">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-lg sm:text-xl text-neutral-900 dark:text-white truncate">
                          {work.name}
                        </h4>
                        {work.note ? (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                            {work.note}
                          </p>
                        ) : null}
                      </div>

                      {showScores && (
                        <div className="text-right shrink-0">
                          <span className="text-base sm:text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                            {pts}
                          </span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-1 font-medium">
                            votes
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dedicated Voting Button */}
                    <div className="mt-auto pt-4 px-1">
                      <button
                        disabled={isLocked && !isSelected}
                        onClick={() => onToggleVote(category.id, work.id)}
                        className={`w-full py-3 sm:py-3.5 rounded-2xl text-base font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          isSelected
                            ? "bg-[#007AFF] text-white shadow-lg shadow-blue-500/25 active:scale-[0.98]"
                            : isLocked
                            ? "bg-transparent text-neutral-400 border border-neutral-300 dark:border-neutral-700 cursor-not-allowed"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white active:scale-[0.98]"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                            <span>Voted for this concept</span>
                          </>
                        ) : (
                          "Vote for this concept"
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
