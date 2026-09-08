import React, { useState } from "react";
import { ReviewConfig, Work, Category } from "../types";
import { X, Plus, Trash2, Shield, Sliders, Image, Folder } from "lucide-react";

interface SetupModalProps {
  currentConfig: ReviewConfig;
  isOpen: boolean;
  isInitialSetup?: boolean;
  onClose: () => void;
  onSave: (newConfig: Partial<ReviewConfig> & { currentPin?: string }) => Promise<void>;
}

export const SetupModal: React.FC<SetupModalProps> = ({
  currentConfig,
  isOpen,
  isInitialSetup = false,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState(currentConfig.title || "Identity — Concept Review");
  const [brief, setBrief] = useState(currentConfig.brief || "");
  
  const [categories, setCategories] = useState<Category[]>(
    currentConfig.categories && currentConfig.categories.length > 0 
      ? currentConfig.categories.map(c => ({ ...c }))
      : [{ id: "cat-1", name: "Category 1" }]
  );

  const [works, setWorks] = useState<Work[]>(
    currentConfig.works && currentConfig.works.length > 0
      ? currentConfig.works.map((w) => ({ ...w }))
      : [
          { id: "1", categoryId: "cat-1", name: "", note: "", img: "", presetStyle: 0 },
          { id: "2", categoryId: "cat-1", name: "", note: "", img: "", presetStyle: 1 }
        ]
  );
  
  const [maxSubmits, setMaxSubmits] = useState<number>(currentConfig.maxSubmits || 2);
  const [pin, setPin] = useState<string>(currentConfig.pin || "1234");
  const [currentPin, setCurrentPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleAddWork = () => {
    setWorks([
      ...works,
      {
        id: `w-${Date.now()}-${works.length}`,
        categoryId: categories[0]?.id || "",
        name: "",
        note: "",
        img: "",
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

  const handleWorkChange = (index: number, field: keyof Work, value: string) => {
    const updated = [...works];
    updated[index] = { ...updated[index], [field]: value };
    setWorks(updated);
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
        works: validWorks,
        maxSubmits,
        pin: pin.trim(),
        currentPin: !isInitialSetup ? (currentPin.trim() || pin.trim()) : undefined
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
              {isInitialSetup ? "Set up the review" : "Edit the review rules"}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {isInitialSetup
                ? "Configure categories, routes and voting rules."
                : "Changes are synchronized live for everyone the moment you save."}
            </p>
          </div>
          {!isInitialSetup && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Review Title */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Review Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Identity — Concept Review"
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              />
            </div>

            {/* Short Brief */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Short Brief for Voters
              </label>
              <input
                type="text"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g. Pick the route that best fits."
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              />
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800" />

          {/* Categories Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5" />
                Categories ({categories.length})
              </label>
              <button
                type="button"
                onClick={handleAddCategory}
                className="text-xs font-semibold text-[#007AFF] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Category
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((cat, idx) => (
                <div key={cat.id || idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={cat.name}
                    onChange={(e) => handleCategoryChange(idx, e.target.value)}
                    placeholder="e.g. Brand Logo"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(idx)}
                    disabled={categories.length <= 1}
                    className="p-1.5 text-neutral-400 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-neutral-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Design Routes Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" />
                Concepts & Routes ({works.length})
              </label>
              <button
                type="button"
                onClick={handleAddWork}
                className="text-xs font-semibold text-[#007AFF] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Concept
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {works.map((work, idx) => (
                <div
                  key={work.id || idx}
                  className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 space-y-2"
                >
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-neutral-400 w-5">
                      #{idx + 1}
                    </span>
                    <select
                      value={work.categoryId}
                      onChange={(e) => handleWorkChange(idx, "categoryId", e.target.value)}
                      className="w-full sm:w-1/3 px-2 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      required
                      value={work.name}
                      onChange={(e) => handleWorkChange(idx, "name", e.target.value)}
                      placeholder="Concept name (e.g. Kinetic Swiss)"
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveWork(idx)}
                      disabled={works.length <= 2}
                      className="p-1.5 text-neutral-400 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-neutral-400 transition ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                    <input
                      type="text"
                      value={work.note || ""}
                      onChange={(e) => handleWorkChange(idx, "note", e.target.value)}
                      placeholder="One-line description or attributes"
                      className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none"
                    />
                    <input
                      type="url"
                      value={work.img || ""}
                      onChange={(e) => handleWorkChange(idx, "img", e.target.value)}
                      placeholder="Image URL (optional, defaults to vector lockup)"
                      className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
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
          <div className="pt-2 flex items-center justify-end gap-3">
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
        </form>
      </div>
    </div>
  );
};
