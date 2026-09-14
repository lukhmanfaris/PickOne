import React, { useState, useEffect, useCallback } from "react";
import { Download, Loader2, X } from "lucide-react";
import { adminListJerseyEntries, adminReleaseJersey } from "../api";
import { padNumber, SIZES, type JerseyAdminRow } from "../utils/jersey";

interface Props {
  isOpen: boolean;
  adminPin: string;
  onClose: () => void;
  onToast: (type: "ok" | "err", text: string) => void;
}

export const JerseyAdminPanel: React.FC<Props> = ({ isOpen, adminPin, onClose, onToast }) => {
  const [rows, setRows] = useState<JerseyAdminRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!adminPin) return;
    setLoading(true);
    try {
      setRows(await adminListJerseyEntries(adminPin));
    } catch (e: any) {
      onToast("err", e.message || "Could not load the list.");
    } finally {
      setLoading(false);
    }
  }, [adminPin, onToast]);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

  if (!isOpen) return null;

  const downloadCsv = () => {
    const header = ["Number", "Jersey Name", "Full Name", "Company", "Size", "Voter ID"];
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      header.join(","),
      ...rows.map((r) => [
        padNumber(r.jerseyNumber), r.jerseyName, r.fullName, r.company, r.size, r.voterId,
      ].map(esc).join(",")),
    ];
    // Excel needs the BOM to read UTF-8 names correctly.
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jersey-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const release = async (voterId: string) => {
    if (!confirm(`Release ${voterId}'s entry? Their number becomes available again.`)) return;
    try {
      await adminReleaseJersey(adminPin, voterId);
      onToast("ok", "Entry released.");
      load();
    } catch (e: any) {
      onToast("err", e.message || "Could not release that entry.");
    }
  };

  const sizeCounts = SIZES.map((s) => ({
    size: s,
    count: rows.filter((r) => r.size === s).length,
  })).filter((x) => x.count > 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl my-8">
        <div className="flex items-center justify-between p-5 border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Jersey orders</h2>
            <p className="text-xs text-neutral-500">{rows.length} submitted</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadCsv} disabled={rows.length === 0}
              className="px-4 py-2 rounded-full bg-[#007AFF] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#005bb5] transition disabled:opacity-40">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {sizeCounts.length > 0 && (
          <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-200">
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
              Order summary
            </p>
            <div className="flex flex-wrap gap-2">
              {sizeCounts.map(({ size, count }) => (
                <span key={size} className="px-3 py-1 rounded-full bg-white border border-neutral-300 text-xs font-semibold text-neutral-700">
                  {count} × {size}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="p-5 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-neutral-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-12">Nobody has submitted yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                  <th className="pb-2 pr-3">No.</th>
                  <th className="pb-2 pr-3">On jersey</th>
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Company</th>
                  <th className="pb-2 pr-3">Size</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.voterId} className="border-b border-neutral-100">
                    <td className="py-2.5 pr-3 font-black text-neutral-900">{padNumber(r.jerseyNumber)}</td>
                    <td className="py-2.5 pr-3 font-bold tracking-wider text-neutral-700">{r.jerseyName}</td>
                    <td className="py-2.5 pr-3 text-neutral-700">{r.fullName}</td>
                    <td className="py-2.5 pr-3 text-neutral-500 text-xs">{r.company}</td>
                    <td className="py-2.5 pr-3 font-semibold text-neutral-700">{r.size}</td>
                    <td className="py-2.5 text-right">
                      <button onClick={() => release(r.voterId)}
                        className="text-xs text-rose-600 hover:underline font-medium">
                        Release
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
