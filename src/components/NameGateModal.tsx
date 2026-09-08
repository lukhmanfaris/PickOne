import React, { useState } from "react";
import { ReviewConfig } from "../types";
import { User, ArrowRight } from "lucide-react";

interface NameGateModalProps {
  cfg: ReviewConfig;
  isOpen: boolean;
  onEnter: (name: string) => void;
}

export const NameGateModal: React.FC<NameGateModalProps> = ({ cfg, isOpen, onEnter }) => {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name to continue.");
      return;
    }
    onEnter(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-white/95 dark:bg-neutral-900/95 border border-white/60 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-[#007AFF] flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {cfg.title}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
            {cfg.brief ? `${cfg.brief} ` : ""}Add your name so the review room knows whose ballot is whose.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              autoFocus
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Alex Morgan"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-full font-semibold text-sm bg-[#007AFF] text-white hover:bg-[#005bb5] transition shadow-md shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            <span>Enter the review</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
