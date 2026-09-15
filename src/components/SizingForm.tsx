import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Lock, Shirt, Loader2, Ruler, X } from "lucide-react";
import {
  COMPANIES, SIZES, JERSEY_NUMBERS, JERSEY_NAME_MAX, padNumber,
  type JerseyEntry,
} from "../utils/jersey";
import { fetchTakenNumbers, getMyJerseyEntry, claimJersey } from "../api";
import { supabase } from "../utils/supabase";

interface SizingFormProps {
  voterId: string;
  sizingOpen: boolean;
  sizeChartUrl?: string;
  onToast: (type: "ok" | "err", text: string) => void;
}

export const SizingForm: React.FC<SizingFormProps> = ({ voterId, sizingOpen, sizeChartUrl, onToast }) => {
  const [taken, setTaken] = useState<number[]>([]);
  const [entry, setEntry] = useState<JerseyEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [number, setNumber] = useState<number | null>(null);
  const [jerseyName, setJerseyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [chartOpen, setChartOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nums, mine] = await Promise.all([
        fetchTakenNumbers(),
        getMyJerseyEntry(voterId),
      ]);
      setTaken(nums);
      setEntry(mine);
    } catch (e: any) {
      setError(e.message || "Could not load the sizing form.");
    } finally {
      setLoading(false);
    }
  }, [voterId]);

  useEffect(() => { load(); }, [load]);

  // Numbers grey out live as other people claim them.
  useEffect(() => {
    const channel = supabase
      .channel("jersey-changes")
      .on("postgres_changes",
          { event: "*", schema: "public", table: "jersey_entries" },
          () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) return setError("Please enter your name.");
    if (!company) return setError("Please choose your company.");
    if (!size) return setError("Please choose a size.");
    if (number === null) return setError("Please pick a jersey number.");
    if (!jerseyName.trim()) return setError("Please enter the name for the back of the jersey.");

    setSaving(true);
    try {
      await claimJersey(voterId, {
        fullName: fullName.trim(),
        company,
        size,
        jerseyNumber: number,
        jerseyName: jerseyName.trim(),
      });
      onToast("ok", `Number ${padNumber(number)} is yours.`);
      await load();
    } catch (err: any) {
      // Most likely someone claimed this number a moment ago.
      setError(err.message || "Could not submit your details.");
      setNumber(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  /* ---------------- Already submitted: confirmation card ---------------- */
  if (entry) {
    return (
      <div className="max-w-md mx-auto">
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">You're all set</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Your jersey details are locked in.
          </p>

          <div className="my-6 py-6 border-y border-emerald-500/20">
            <div className="text-6xl font-black tracking-tighter text-neutral-900 leading-none">
              {padNumber(entry.jerseyNumber)}
            </div>
            <div className="text-sm font-bold tracking-[0.2em] text-neutral-600 mt-2 uppercase">
              {entry.jerseyName}
            </div>
          </div>

          <dl className="space-y-2 text-left text-sm">
            {[
              ["Name", entry.fullName],
              ["Company", entry.company],
              ["Size", entry.size],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="font-semibold text-neutral-900 text-right">{v}</dd>
              </div>
            ))}
          </dl>

          <p className="text-[11px] text-neutral-500 mt-6 leading-relaxed">
            Entries can't be changed once submitted. If something's wrong, ask the
            admin to release your number so you can submit again.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------- Form closed ---------------- */
  if (!sizingOpen) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-12 h-12 rounded-2xl bg-neutral-200 text-neutral-500 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900">Sizing is closed</h2>
        <p className="text-sm text-neutral-500 mt-2">
          The jersey sizing form is no longer accepting entries.
        </p>
      </div>
    );
  }

  /* ---------------- The form ---------------- */
  const takenSet = new Set(taken);

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-[#007AFF] flex items-center justify-center mx-auto mb-3">
          <Shirt className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900">Jersey sizing</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Numbers are first come, first served.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-sm font-medium">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
          Full name
        </label>
        <input
          type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
          Company
        </label>
        <select
          value={company} onChange={(e) => setCompany(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
        >
          <option value="">Choose your company…</option>
          {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
            Size
          </label>
          {sizeChartUrl && (
            <button
              type="button"
              onClick={() => setChartOpen(true)}
              className="text-xs font-semibold text-[#007AFF] hover:underline flex items-center gap-1"
            >
              <Ruler className="w-3.5 h-3.5" />
              Size guide
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {SIZES.map((s) => (
            <button
              key={s} type="button" onClick={() => setSize(s)}
              className={`py-2.5 rounded-xl text-sm font-bold border transition ${
                size === s
                  ? "bg-[#007AFF] text-white border-[#007AFF]"
                  : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
              }`}
            >{s}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
          Jersey number
        </label>
        <p className="text-[11px] text-neutral-500 mb-2">
          Greyed-out numbers are already taken. {99 - taken.length} of 99 left.
        </p>
        <div className="grid grid-cols-10 gap-1.5">
          {JERSEY_NUMBERS.map((n) => {
            const isTaken = takenSet.has(n);
            const isPicked = number === n;
            return (
              <button
                key={n} type="button" disabled={isTaken}
                onClick={() => setNumber(n)}
                className={`aspect-square rounded-lg text-[11px] sm:text-xs font-bold border transition ${
                  isTaken
                    ? "bg-neutral-100 text-neutral-300 border-neutral-200 cursor-not-allowed line-through"
                    : isPicked
                      ? "bg-[#007AFF] text-white border-[#007AFF] scale-105"
                      : "bg-white text-neutral-700 border-neutral-300 hover:border-[#007AFF]"
                }`}
              >{padNumber(n)}</button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
          Name on jersey
        </label>
        <input
          type="text" value={jerseyName} maxLength={JERSEY_NAME_MAX}
          onChange={(e) => setJerseyName(e.target.value.toUpperCase())}
          placeholder="MAX 6"
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 text-sm tracking-[0.2em] uppercase font-bold focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
        />
        <p className="text-[11px] text-neutral-500 mt-1.5">
          {jerseyName.length}/{JERSEY_NAME_MAX} characters. This is printed on the back.
        </p>
      </div>

      {chartOpen && sizeChartUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setChartOpen(false)}
        >
          <button
            type="button"
            onClick={() => setChartOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            aria-label="Close size guide"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={sizeChartUrl}
            alt="Jersey measurement chart"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[85vh] object-contain rounded-xl bg-white"
          />
        </div>
      )}

      <button
        type="submit" disabled={saving}
        className="w-full py-3 rounded-full font-semibold text-sm bg-[#007AFF] text-white hover:bg-[#005bb5] transition shadow-md shadow-blue-500/25 disabled:opacity-40"
      >
        {saving ? "Submitting…" : "Submit — this can't be changed"}
      </button>
    </form>
  );
};
