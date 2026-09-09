import React, { useState, useEffect } from "react";
import { Work, Category } from "../types";
import { VectorArtwork } from "./VectorArtwork";
import { ChevronLeft, ChevronRight, X, Check, Trash2 } from "lucide-react";
import { getWorkImages } from "../utils/drive";

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
  const [activeAssetIdx, setActiveAssetIdx] = useState(0);

  const images = currentWork ? getWorkImages(currentWork) : [];

  // Reset active asset index when switching works
  useEffect(() => {
    setActiveAssetIdx(0);
  }, [currentIndex]);

  // Navigate strictly within the assets/images of this specific concept card
  const handlePrev = () => {
    if (images.length <= 1) return;
    setActiveAssetIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    if (images.length <= 1) return;
    setActiveAssetIdx((prev) => (prev + 1) % images.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && images.length > 1) {
        handlePrev();
      }
      if (e.key === "ArrowRight" && images.length > 1) {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, images.length]);

  if (!currentWork) return null;

  const category = categories.find((c) => c.id === currentWork.categoryId);
  const catName = category ? category.name : "Unknown Category";
  
  const isSelected = draftVotes[currentWork.categoryId] === currentWork.id;
  const isCatFilled = !!draftVotes[currentWork.categoryId];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-3xl flex flex-col p-4 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      {/* Top Header */}
      <div
        className="flex items-start justify-between gap-4 text-white mb-3 max-w-6xl mx-auto w-full"
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
                Selected Vote
              </span>
            )}
          </div>
          {currentWork.note && (
            <p className="text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
              {currentWork.note}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {images.length > 1 && (
            <span className="text-xs sm:text-sm font-semibold text-neutral-300 tabular-nums bg-white/10 px-2.5 sm:px-3 py-1 rounded-full border border-white/10">
              Asset {activeAssetIdx + 1} of {images.length}
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="Close inspector"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
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
          onClick={handlePrev}
          disabled={images.length <= 1}
          aria-label="Previous asset in this concept card"
          className={`p-3 sm:p-4 rounded-full bg-white/10 text-white transition shrink-0 ${
            images.length <= 1
              ? "opacity-20 cursor-not-allowed invisible sm:visible sm:opacity-20"
              : "hover:bg-white/25 active:scale-95 cursor-pointer"
          }`}
          title={images.length > 1 ? "Previous asset in this concept card" : "No other assets"}
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        <div className="flex-1 h-full max-h-[68vh] rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-900/50 border border-white/10 flex items-center justify-center p-3 sm:p-6 shadow-2xl relative">
          <VectorArtwork
            work={currentWork}
            index={currentIndex}
            activeImageIndex={activeAssetIdx}
            className="max-h-full max-w-full drop-shadow-2xl"
          />

          {/* Sub-asset pill switcher when concept has multiple images */}
          {images.length > 1 && (
            <div className="absolute bottom-4 inset-x-0 flex justify-center items-center gap-1.5 z-20">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20">
                {images.map((imgUrl, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveAssetIdx(i)}
                    className={`w-6 h-6 rounded-md overflow-hidden transition-all border cursor-pointer ${
                      activeAssetIdx === i
                        ? "border-[#007AFF] scale-110 ring-1 ring-blue-400"
                        : "border-white/20 opacity-60 hover:opacity-100"
                    }`}
                    title={`Asset ${i + 1}`}
                  >
                    <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={images.length <= 1}
          aria-label="Next asset in this concept card"
          className={`p-3 sm:p-4 rounded-full bg-white/10 text-white transition shrink-0 ${
            images.length <= 1
              ? "opacity-20 cursor-not-allowed invisible sm:visible sm:opacity-20"
              : "hover:bg-white/25 active:scale-95 cursor-pointer"
          }`}
          title={images.length > 1 ? "Next asset in this concept card" : "No other assets"}
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      </div>

      {/* Bottom Action Rail */}
      <div
        className="flex items-center justify-between gap-4 mt-3 max-w-6xl mx-auto w-full flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs sm:text-sm text-neutral-300 font-medium">
          {isSelected ? (
            <span>
              Your current vote for <strong className="text-[#007AFF]">{catName}</strong>
            </span>
          ) : (
            <span className="text-neutral-400">Not selected for {catName}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isLocked && (
            <>
              {isSelected ? (
                <button
                  onClick={() => onToggleVote(currentWork.categoryId, currentWork.id)}
                  className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove vote
                </button>
              ) : (
                <button
                  onClick={() => onToggleVote(currentWork.categoryId, currentWork.id)}
                  className="px-5 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#007AFF] text-white hover:bg-[#005bb5] transition flex items-center gap-1.5 shadow-lg shadow-blue-500/25"
                >
                  <Check className="w-4 h-4" />
                  {isCatFilled ? "Change vote to this" : "Vote for this"}
                </button>
              )}
            </>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full text-xs sm:text-sm font-semibold bg-white/15 text-white hover:bg-white/25 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
