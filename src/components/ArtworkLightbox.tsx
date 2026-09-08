import React, { useEffect } from "react";
import { Work, Category } from "../types";
import { VectorArtwork } from "./VectorArtwork";
import { ChevronLeft, ChevronRight, X, Check, Trash2 } from "lucide-react";

interface ArtworkLightboxProps {
  works: Work[];
  categories: Category[];
  currentIndex: number;
  draftVotes: Record<string, string>;
  isLocked: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onToggleVote: (categoryId: string, workId: string) => void;
}

export const ArtworkLightbox: React.FC<ArtworkLightboxProps> = ({
  works,
  categories,
  currentIndex,
  draftVotes,
  isLocked,
  onClose,
  onNavigate,
  onToggleVote
}) => {
  const currentWork = works[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate((currentIndex - 1 + works.length) % works.length);
      if (e.key === "ArrowRight") onNavigate((currentIndex + 1) % works.length);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, works.length, onClose, onNavigate]);

  if (!currentWork) return null;

  const category = categories.find((c) => c.id === currentWork.categoryId);
  const catName = category ? category.name : "Unknown Category";
  
  const isSelected = draftVotes[currentWork.categoryId] === currentWork.id;
  const isCatFilled = !!draftVotes[currentWork.categoryId];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-3xl flex flex-col p-4 sm:p-8 animate-fadeIn"
      onClick={onClose}
    >
      {/* Top Header */}
      <div
        className="flex items-start justify-between gap-4 text-white mb-4 sm:mb-6 max-w-6xl mx-auto w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
            {catName}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white truncate">
              {currentWork.name}
            </h2>
            {isSelected && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#007AFF] text-white text-xs font-bold shadow-md">
                Voted
              </span>
            )}
          </div>
          {currentWork.note && (
            <p className="text-sm text-neutral-300 mt-2 max-w-2xl leading-relaxed">
              {currentWork.note}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className="text-sm font-semibold text-neutral-400 tabular-nums">
            {currentIndex + 1} of {works.length}
          </span>
          <button
            onClick={onClose}
            aria-label="Close inspector"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Stage with Prev/Next buttons */}
      <div
        className="flex-1 min-h-0 flex items-center justify-between gap-2 sm:gap-6 max-w-6xl mx-auto w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onNavigate((currentIndex - 1 + works.length) % works.length)}
          aria-label="Previous concept"
          className="p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/25 text-white transition active:scale-95 shrink-0"
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        <div className="flex-1 h-full max-h-[70vh] rounded-2xl sm:rounded-3xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center p-4 sm:p-8 shadow-2xl relative">
          <VectorArtwork
            work={currentWork}
            index={currentIndex}
            className="max-h-full max-w-full drop-shadow-2xl"
          />
        </div>

        <button
          onClick={() => onNavigate((currentIndex + 1) % works.length)}
          aria-label="Next concept"
          className="p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/25 text-white transition active:scale-95 shrink-0"
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      </div>

      {/* Bottom Action Rail */}
      <div
        className="flex items-center justify-between gap-4 mt-4 sm:mt-6 max-w-6xl mx-auto w-full flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm text-neutral-300 font-medium">
          {isSelected ? (
            <span>
              Currently selected for <strong className="text-[#F5A623]">{catName}</strong>
            </span>
          ) : (
            <span className="text-neutral-400">Not selected in this category</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isLocked && (
            <>
              {isSelected ? (
                <button
                  onClick={() => onToggleVote(currentWork.categoryId, currentWork.id)}
                  className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove vote
                </button>
              ) : (
                <button
                  onClick={() => onToggleVote(currentWork.categoryId, currentWork.id)}
                  className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#F5A623] text-black hover:bg-[#ffbe4d] transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Check className="w-4 h-4" />
                  {isCatFilled ? "Change vote to this" : "Vote for this"}
                </button>
              )}
            </>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-white/15 text-white hover:bg-white/25 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
