import React, { useState } from "react";
import { Lock, X, ArrowRight } from "lucide-react";

interface AdminPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (pin: string) => Promise<boolean>;
}

export const AdminPromptModal: React.FC<AdminPromptModalProps> = ({
  isOpen,
  onClose,
  onUnlock
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pin.trim()) {
      setError("Please enter the admin passcode.");
      return;
    }

    setIsVerifying(true);
    try {
      const valid = await onUnlock(pin.trim());
      if (valid) {
        onClose();
      } else {
        setError("Passcode does not match.");
      }
    } catch (err: any) {
      setError(err.message || "Passcode verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="w-full max-w-sm bg-white/95 dark:bg-neutral-900/95 border border-white/60 dark:border-white/10 rounded-3xl p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-lg">
            <Lock className="w-4 h-4 text-[#007AFF]" />
            Admin Passcode
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          Enter the review administrator passcode to unlock voting controls, edit rules, or reset ballots.
        </p>

        {error && (
          <div className="p-2.5 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Enter passcode"
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="px-5 py-2 rounded-full text-xs font-semibold bg-[#007AFF] text-white hover:bg-[#005bb5] transition flex items-center gap-1.5 shadow-sm"
            >
              <span>{isVerifying ? "Verifying..." : "Unlock"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
