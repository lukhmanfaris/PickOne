import React, { useState, useEffect } from "react";
import { Work } from "../types";
import { formatImageUrl, getWorkImages } from "../utils/drive";
import { ImagePlus, AlertCircle } from "lucide-react";

interface VectorArtworkProps {
  work: Work;
  index: number;
  activeImageIndex?: number;
  className?: string;
  isAdmin?: boolean;
  onAddAsset?: () => void;
}

export const VectorArtwork: React.FC<VectorArtworkProps> = ({
  work,
  index,
  activeImageIndex = 0,
  className = "",
  isAdmin = false,
  onAddAsset
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [useProxy, setUseProxy] = useState(false);

  const images = getWorkImages(work);
  const rawUrl = images[activeImageIndex] || work.img || "";
  const resolvedUrl = formatImageUrl(rawUrl);

  useEffect(() => {
    setImgFailed(false);
    setUseProxy(false);
  }, [rawUrl, activeImageIndex]);

  // Determine current image source
  const currentSrc = useProxy
    ? `/api/image-proxy?url=${encodeURIComponent(resolvedUrl)}`
    : resolvedUrl;

  const handleImageError = () => {
    // If direct load failed and it's a web URL, attempt proxying once
    if (!useProxy && resolvedUrl.startsWith("http")) {
      setUseProxy(true);
    } else {
      setImgFailed(true);
    }
  };

  // If user provided an image and it hasn't completely failed
  if (resolvedUrl && !imgFailed) {
    return (
      <img
        src={currentSrc}
        alt={work.name}
        onError={handleImageError}
        className={`w-full h-full object-contain p-2 select-none transition-opacity duration-200 ${className}`}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    );
  }

  // When no image has been uploaded or image failed:
  // Render a clean, minimalist design review placeholder instead of fake default branding
  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-neutral-50/80 dark:bg-neutral-900/60 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center mb-3 shadow-inner">
        {imgFailed ? (
          <AlertCircle className="w-8 h-8 text-amber-500" />
        ) : (
          <ImagePlus className="w-8 h-8" />
        )}
      </div>
      <p className="text-base sm:text-lg font-bold text-neutral-800 dark:text-neutral-200">
        {imgFailed ? "Could not load asset" : (isAdmin ? "No asset uploaded" : "Asset Pending")}
      </p>
      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-[260px] leading-relaxed">
        {imgFailed
          ? "Check link or re-upload"
          : (isAdmin ? "Upload an image or mockup for this concept" : "Preview will appear once uploaded")}
      </p>
      {isAdmin && onAddAsset && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddAsset();
          }}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold bg-[#007AFF] text-white hover:bg-[#005bb5] shadow-xs active:scale-95 transition cursor-pointer"
        >
          + Add Asset
        </button>
      )}
    </div>
  );
};
