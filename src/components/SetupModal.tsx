import React, { useState, useRef, useEffect } from "react";
import { ReviewConfig, Work, Category } from "../types";
import { X, Plus, Trash2, Shield, Sliders, Image, Folder, UploadCloud, Loader2, RefreshCw } from "lucide-react";
import { uploadToDrive, formatImageUrl, getWorkImages } from "../utils/drive";
import { initAuth, googleSignIn, getAccessToken, logout } from "../utils/firebase";
import { uploadImage } from "../api";
import type { User } from "firebase/auth";

interface SetupModalProps {
  currentConfig: ReviewConfig;
  isOpen: boolean;
  isInitialSetup?: boolean;
  onClose: () => void;
  onSave: (newConfig: Partial<ReviewConfig> & { currentPin?: string }) => Promise<void>;
  adminPin?: string;
}

export const SetupModal: React.FC<SetupModalProps> = ({
  currentConfig,
  isOpen,
  isInitialSetup = false,
  onClose,
  onSave,
  adminPin
}) => {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    try {
      const unsubscribe = initAuth(
        (currentUser) => {
          setUser(currentUser);
          setNeedsAuth(false);
        },
        () => {
          setUser(null);
          setNeedsAuth(true);
        }
      );
      return () => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      };
    } catch (e) {
      console.warn("Firebase Auth not configured or initialized", e);
    }
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setUser(res.user);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error("Sign-in failed", err);
      setError("Sign-in failed. You can still upload files locally or paste image URLs.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const [title, setTitle] = useState(currentConfig.title || "Brand Concept Review");
  const [brief, setBrief] = useState(
    currentConfig.brief || "Evaluate and select the most compelling visual identity routes."
  );
  
  const [categories, setCategories] = useState<Category[]>(
    currentConfig.categories && currentConfig.categories.length > 0
      ? currentConfig.categories.map((c) => ({ ...c }))
      : [
          { id: "cat-1", name: "Primary Mark" },
          { id: "cat-2", name: "Color & Typography" }
        ]
  );

  const [works, setWorks] = useState<Work[]>(
    currentConfig.works && currentConfig.works.length > 0
      ? currentConfig.works.map((w) => ({ ...w }))
      : [
          { id: "1", categoryId: "cat-1", name: "Concept A", note: "", img: "", images: [], presetStyle: 0 },
          { id: "2", categoryId: "cat-1", name: "Concept B", note: "", img: "", images: [], presetStyle: 1 }
        ]
  );
  
  const [maxSubmits, setMaxSubmits] = useState<number>(currentConfig.maxSubmits || 1);
  const [pin, setPin] = useState<string>(currentConfig.pin || "1234");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [assetInputs, setAssetInputs] = useState<Record<number, string>>({});

  // Sync state whenever modal is opened or currentConfig updates
  useEffect(() => {
    if (isOpen && currentConfig) {
      setTitle(currentConfig.title || "Brand Concept Review");
      setBrief(currentConfig.brief || "");
      if (currentConfig.categories && currentConfig.categories.length > 0) {
        setCategories(currentConfig.categories.map((c) => ({ ...c })));
      }
      if (currentConfig.works && currentConfig.works.length > 0) {
        setWorks(currentConfig.works.map((w) => ({ ...w })));
      }
      setMaxSubmits(currentConfig.maxSubmits || 1);
      setPin(currentConfig.pin || "1234");
      setError(null);
      setAssetInputs({});
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handleAddCategory = () => {
    setCategories([
      ...categories,
      { id: `cat-${Date.now()}`, name: `Category ${categories.length + 1}` }
    ]);
  };

  const handleRemoveCategory = (index: number) => {
    if (categories.length <= 1) {
      setError("You must have at least one category.");
      return;
    }
    const catToRemove = categories[index];
    const updated = [...categories];
    updated.splice(index, 1);
    setCategories(updated);
    
    // Default any orphaned works to the first available category
    const defaultCatId = updated[0].id;
    setWorks(works.map(w => w.categoryId === catToRemove.id ? { ...w, categoryId: defaultCatId } : w));
    setError(null);
  };

  const handleCategoryChange = (index: number, name: string) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], name };
    setCategories(updated);
  };

  const handleAddWork = (targetCatId?: string) => {
    setWorks([
      ...works,
      {
        id: `w-${Date.now()}-${works.length}`,
        categoryId: targetCatId || categories[0]?.id || "",
        name: "",
        note: "",
        img: "",
        images: [],
        presetStyle: works.length % 5
      }
    ]);
  };

  const handleRemoveWork = (index: number) => {
    if (works.length <= 2) {
      setError("A review needs at least two routes overall.");
      return;
    }
    const updated = [...works];
    updated.splice(index, 1);
    setWorks(updated);
    setError(null);
  };

  const handleWorkChange = (index: number, field: keyof Work, value: any) => {
    const updated = [...works];
    updated[index] = { ...updated[index], [field]: value };
    setWorks(updated);
  };

  const handleAddAssetToWork = (workIndex: number, newUrl: string) => {
    if (!newUrl || !newUrl.trim()) return;
    const formatted = formatImageUrl(newUrl.trim());
    const updated = [...works];
    const target = updated[workIndex];
    const currentImages = getWorkImages(target);
    
    if (!currentImages.includes(formatted)) {
      currentImages.push(formatted);
    }
    
    updated[workIndex] = {
      ...target,
      images: currentImages,
      img: currentImages[0] || ""
    };
    setWorks(updated);
    
    // Clear the input field for this work
    setAssetInputs(prev => ({ ...prev, [workIndex]: "" }));
  };

  const handleRemoveAssetFromWork = (workIndex: number, assetIndex: number) => {
    const updated = [...works];
    const target = updated[workIndex];
    const currentImages = getWorkImages(target);
    currentImages.splice(assetIndex, 1);
    
    updated[workIndex] = {
      ...target,
      images: currentImages,
      img: currentImages[0] || ""
    };
    setWorks(updated);
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIdx(index);
    setError(null);
    try {
      let url = "";

      // If signed into Google Drive, upload directly to Drive
      if (!needsAuth) {
        try {
          const token = await getAccessToken();
          if (token) {
            url = await uploadToDrive(file, token);
          }
        } catch (driveErr) {
          console.warn("Drive upload failed, falling back to local server upload", driveErr);
        }
      }

      // If Drive wasn't used or fell back, use direct local upload
      if (!url) {
        const res = await uploadImage(file);
        url = res.url;
      }

      // Automatically append to the concept's assets array
      const finalUrl = formatImageUrl(url);
      handleAddAssetToWork(index, finalUrl);
    } catch (err: any) {
      setError(err.message || "Failed to upload image.");
    } finally {
      setUploadingIdx(null);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Please enter a review title.");
      return;
    }

    const validCats = categories.filter(c => c.name && c.name.trim());
    if (validCats.length < 1) {
      setError("Please define at least one category.");
      return;
    }

    const validWorks = works.filter((w) => w.name && w.name.trim());
    if (validWorks.length < 2) {
      setError("Please name at least two concepts before saving.");
      return;
    }

    if (!pin.trim()) {
      setError("Please set an admin passcode so you can manage voting later.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        title: cleanTitle,
        brief: brief.trim(),
        categories: validCats,
        works: validWorks.map((w) => {
          const formattedImages = getWorkImages(w).map(img => formatImageUrl(img));
          return {
            ...w,
            images: formattedImages,
            img: formattedImages[0] || (w.img ? formatImageUrl(w.img) : "")
          };
        }),
        maxSubmits,
        pin: pin.trim(),
        currentPin: adminPin || currentConfig.pin || pin.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Could not save configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="w-full max-w-3xl bg-white/95 dark:bg-neutral-900/95 border border-white/60 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {isInitialSetup ? "Welcome — Setup Your Review" : "Configure Review & Assets"}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Customize categories, concept routes, multi-asset uploads, and voting rules.
            </p>
          </div>
          {!isInitialSetup && (
            <button
              onClick={onClose}
              aria-label="Close setup modal"
              className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Review Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Identity — Brand Concept Review"
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Creative Brief / Instructions
              </label>
              <textarea
                rows={2}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Short guidance for voters on what to evaluate..."
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none"
              />
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800" />

          {/* Categories */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5" />
                Voting Categories ({categories.length})
              </label>
              <button
                type="button"
                onClick={handleAddCategory}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Category
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
              {categories.map((cat, idx) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={cat.name}
                    onChange={(e) => handleCategoryChange(idx, e.target.value)}
                    placeholder="Category name"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(idx)}
                    disabled={categories.length <= 1}
                    className="p-1.5 text-neutral-400 hover:text-rose-500 disabled:opacity-30 transition"
                    title="Remove category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800" />

          {/* Concepts and Routes with Multi-Asset Uploads */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" />
                Concept Routes & Assets ({works.length})
              </label>
              <button
                type="button"
                onClick={() => handleAddWork()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#007AFF] text-white hover:bg-[#005bb5] transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Concept
              </button>
            </div>

            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {works.map((work, idx) => {
                const workImages = getWorkImages(work);
                const currentInputValue = assetInputs[idx] || "";

                return (
                  <div
                    key={work.id || idx}
                    className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 space-y-3"
                  >
                    {/* Header Row: Category, Name, Remove */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-neutral-400 w-5">
                        #{idx + 1}
                      </span>
                      <select
                        value={work.categoryId}
                        onChange={(e) => handleWorkChange(idx, "categoryId", e.target.value)}
                        className="w-full sm:w-1/3 px-2 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        required
                        value={work.name}
                        onChange={(e) => handleWorkChange(idx, "name", e.target.value)}
                        placeholder="Concept name (e.g. Kinetic Swiss)"
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveWork(idx)}
                        disabled={works.length <= 2}
                        className="p-1.5 text-neutral-400 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-neutral-400 transition ml-auto"
                        title="Delete this concept"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Description input */}
                    <div className="pl-7">
                      <input
                        type="text"
                        value={work.note || ""}
                        onChange={(e) => handleWorkChange(idx, "note", e.target.value)}
                        placeholder="Optional short description or design attributes..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none"
                      />
                    </div>

                    {/* Multi-Assets Section */}
                    <div className="pl-7 space-y-2 border-t border-neutral-200/60 dark:border-neutral-700/60 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                          Uploaded Assets ({workImages.length})
                        </span>
                        {workImages.length === 0 && (
                          <span className="text-[10px] text-neutral-400 italic">
                            No assets added yet (will display placeholder)
                          </span>
                        )}
                      </div>

                      {/* Assets Thumbnail Strip */}
                      {workImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center">
                          {workImages.map((assetUrl, assetIdx) => (
                            <div
                              key={assetIdx}
                              className="relative group w-14 h-14 rounded-xl border border-neutral-300 dark:border-neutral-700 overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow-2xs"
                            >
                              <img
                                src={formatImageUrl(assetUrl)}
                                alt={`Asset ${assetIdx + 1}`}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveAssetFromWork(idx, assetIdx)}
                                className="absolute top-0.5 right-0.5 p-1 rounded-full bg-black/75 text-white opacity-0 group-hover:opacity-100 transition hover:bg-rose-600"
                                title="Remove asset"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center font-mono py-0.5">
                                #{assetIdx + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Asset Row */}
                      <div className="flex gap-2 items-center">
                        <input
                          type="url"
                          value={currentInputValue}
                          onChange={(e) =>
                            setAssetInputs((prev) => ({ ...prev, [idx]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (currentInputValue.trim()) {
                                handleAddAssetToWork(idx, currentInputValue.trim());
                              }
                            }
                          }}
                          placeholder="Paste image URL or Drive link..."
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (currentInputValue.trim()) {
                              handleAddAssetToWork(idx, currentInputValue.trim());
                            }
                          }}
                          disabled={!currentInputValue.trim()}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 transition flex items-center gap-1 disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>

                        {/* Hidden file input */}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(idx, e)}
                          id={`file-upload-${idx}`}
                        />
                        <label
                          htmlFor={`file-upload-${idx}`}
                          className={`shrink-0 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/50 text-[#007AFF] hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer text-xs font-semibold flex items-center gap-1.5 transition ${
                            uploadingIdx === idx ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          title="Upload file directly"
                        >
                          {uploadingIdx === idx ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UploadCloud className="w-3.5 h-3.5" />
                          )}
                          <span>Upload File</span>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800" />

          {/* Voting Rules & Passcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Times a voter may submit
              </label>
              <select
                value={maxSubmits}
                onChange={(e) => setMaxSubmits(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              >
                {[1, 2, 3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "Once only" : `${n} times (can revise)`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Admin Passcode
              </label>
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Required to close/edit/clear"
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-200 dark:border-neutral-800 pt-4 mt-2">
            <div className="flex gap-4 items-center w-full sm:w-auto">
              {needsAuth ? (
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="gsi-material-button bg-white text-gray-600 border border-gray-300 rounded-lg shadow-2xs py-1.5 px-3 flex items-center gap-2 hover:bg-gray-50 focus:outline-none transition disabled:opacity-50 text-xs font-medium"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                  <span>Connect Google Drive</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-500 font-medium">
                  <Shield className="w-4 h-4" />
                  Drive Connected ({user?.email || "Signed In"})
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
              {!isInitialSetup && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 rounded-full text-sm font-semibold bg-[#007AFF] text-white hover:bg-[#005bb5] transition shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : isInitialSetup ? "Open voting" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
