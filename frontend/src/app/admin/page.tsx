"use client";

import React, { useState } from "react";
import {
  UploadCloud,
  CheckCircle,
  FileText,
  AlertTriangle,
  Eye,
} from "lucide-react";

interface StagedRow {
  destination: string;
  commodity: string;
  min_charge: number;
  rate_normal: number;
  rate_45: number;
  rate_100: number;
  rate_250: number;
  rate_300: number;
  fsc_per_kg: number;
  ssc_per_kg: number;
}

const DEFAULT_STAGED_DATA: StagedRow[] = [
  { destination: "DXB", commodity: "General Cargo", min_charge: 4500, rate_normal: 240, rate_45: 190, rate_100: 160, rate_250: 138, rate_300: 128, fsc_per_kg: 22, ssc_per_kg: 4.0 },
  { destination: "AUH", commodity: "General Cargo", min_charge: 4500, rate_normal: 235, rate_45: 185, rate_100: 155, rate_250: 135, rate_300: 125, fsc_per_kg: 22, ssc_per_kg: 4.0 },
  { destination: "ORD", commodity: "General Cargo", min_charge: 18165, rate_normal: 852, rate_45: 762, rate_100: 686, rate_250: 614, rate_300: 590, fsc_per_kg: 45, ssc_per_kg: 5.0 },
  { destination: "YYZ", commodity: "General Cargo", min_charge: 19563, rate_normal: 924, rate_45: 830, rate_100: 745, rate_250: 669, rate_300: 640, fsc_per_kg: 45, ssc_per_kg: 5.0 },
];

export default function AdminIngestionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [airline, setAirline] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [uploading, setUploading] = useState(false);
  const [stagedRows, setStagedRows] = useState<StagedRow[] | null>(null);
  const [published, setPublished] = useState(false);
  const [isScanned, setIsScanned] = useState(false);

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setPublished(false);

    // Simulate fast multimodal extraction
    setTimeout(() => {
      setUploading(false);
      setIsScanned(file.name.toLowerCase().includes("et") || file.name.toLowerCase().includes("asis"));
      setStagedRows(DEFAULT_STAGED_DATA);
    }, 1200);
  };

  const handleCellChange = (index: number, field: keyof StagedRow, value: string | number) => {
    if (!stagedRows) return;
    const numValue = typeof value === "number" ? value : parseFloat(value) || 0;
    const updated = [...stagedRows];
    updated[index] = { ...updated[index], [field]: numValue };
    setStagedRows(updated);
  };

  const handlePublish = () => {
    setPublished(true);
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-jfll-blue">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Airline Rate Sheet Ingestion Engine</h2>
            <p className="text-xs font-semibold text-slate-600">
              Upload PDF rate circulars &bull; AI table extraction &bull; Admin verification staging
            </p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="airline-input" className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Airline / GSA
            </label>
            <input
              id="airline-input"
              type="text"
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              placeholder="e.g. Etihad Airways, Emirates, Qatar Cargo..."
              className="w-full h-11 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold focus-ring"
              required
            />
          </div>

          <div>
            <label htmlFor="currency-select" className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Tariff Currency
            </label>
            <select
              id="currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 focus-ring cursor-pointer"
            >
              <option value="INR">INR (Indian Rupee)</option>
              <option value="USD">USD (US Dollar)</option>
            </select>
          </div>

          <div>
            <label htmlFor="pdf-input" className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Airline Rate Sheet PDF
            </label>
            <input
              id="pdf-input"
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full h-11 text-xs text-slate-500 file:mr-2 file:h-full file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-bold hover:file:bg-slate-200 cursor-pointer"
              required
            />
          </div>

          <div className="sm:col-span-3 flex justify-end mt-2">
            <button
              type="submit"
              disabled={uploading || !file}
              className="inline-flex items-center gap-2 rounded-xl bg-jfll-blue px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-jfll-navy transition-all focus-ring disabled:opacity-50 cursor-pointer"
            >
              <UploadCloud className="h-4 w-4" />
              {uploading ? "Extracting Tabular Tariffs..." : "Upload & Parse to Staging"}
            </button>
          </div>
        </form>
      </div>

      {/* Success Notification */}
      {published && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="h-5 w-5 text-emerald-700" />
            <span className="text-sm font-bold">
              Tariffs Published Successfully! Updated live dashboard for {airline} across {stagedRows?.length} corridors.
            </span>
          </div>
          <a
            href="/"
            className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
          >
            View on Live Dashboard →
          </a>
        </div>
      )}

      {/* Split-Pane Staging Workbench (Left: Document Overview, Right: Editable Grid) */}
      {stagedRows && !published && (
        <div className="space-y-4">
          {/* Surcharge Verification Alert */}
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong>Surcharge Verification Notice:</strong> Extracted tariffs from{" "}
              <strong>{file?.name}</strong> indicate <em>"Preferential Net Net INR Rates ++"</em>.
              Fuel Surcharge is flagged as <strong>₹22.00/kg</strong> and Security as{" "}
              <strong>₹4.00/kg</strong>. Verify these rates in the grid below before publishing.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column: PDF Source Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="h-5 w-5 text-jfll-blue" />
                <h3 className="text-sm font-bold text-slate-900">Source Document</h3>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="font-bold text-slate-900 truncate">{file?.name}</div>
                <div className="text-slate-600">
                  Size: {(file ? file.size / 1024 : 0).toFixed(1)} KB
                </div>
                <div className="text-slate-600">
                  Status:{" "}
                  <span className="font-bold text-amber-700">STAGED_FOR_REVIEW</span>
                </div>
                <div className="text-slate-600">
                  Mode:{" "}
                  <span className="font-bold text-slate-800">
                    {isScanned ? "Vision OCR (Raster)" : "Digital Text Engine"}
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-semibold text-slate-500 leading-normal">
                Human-in-the-loop guarantee: Review rates and surcharge columns before committing to
                live quotation desk.
              </div>
            </div>

            {/* Right Column: Editable Staged Tariff Table */}
            <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Extracted Buying Rates ({stagedRows.length} Corridors)
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Click any cell to edit extracted tariffs inline
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-jfll-blue border border-blue-200">
                  Scope: &lt; 500 kg Smalls
                </span>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-y border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">Dest</th>
                      <th className="px-3 py-2.5">Min (₹)</th>
                      <th className="px-3 py-2.5">Norm</th>
                      <th className="px-3 py-2.5">+45kg</th>
                      <th className="px-3 py-2.5">+100kg</th>
                      <th className="px-3 py-2.5">+250kg</th>
                      <th className="px-3 py-2.5">+300kg</th>
                      <th className="px-3 py-2.5">FSC/kg</th>
                      <th className="px-3 py-2.5">SSC/kg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {stagedRows.map((row, idx) => (
                      <tr key={row.destination} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2 font-bold text-slate-900 font-sans">
                          {row.destination}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.min_charge}
                            onChange={(e) => handleCellChange(idx, "min_charge", e.target.value)}
                            className="w-16 rounded border border-slate-200 px-1.5 py-1 text-xs focus-ring bg-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.rate_normal}
                            onChange={(e) => handleCellChange(idx, "rate_normal", e.target.value)}
                            className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs focus-ring bg-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.rate_45}
                            onChange={(e) => handleCellChange(idx, "rate_45", e.target.value)}
                            className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs focus-ring bg-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.rate_100}
                            onChange={(e) => handleCellChange(idx, "rate_100", e.target.value)}
                            className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs focus-ring bg-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.rate_250}
                            onChange={(e) => handleCellChange(idx, "rate_250", e.target.value)}
                            className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs focus-ring bg-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.rate_300}
                            onChange={(e) => handleCellChange(idx, "rate_300", e.target.value)}
                            className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs focus-ring bg-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.fsc_per_kg}
                            onChange={(e) => handleCellChange(idx, "fsc_per_kg", e.target.value)}
                            className="w-14 rounded border border-amber-200 bg-amber-50/50 px-1.5 py-1 text-xs text-amber-900 focus-ring"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.ssc_per_kg}
                            onChange={(e) => handleCellChange(idx, "ssc_per_kg", e.target.value)}
                            className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs focus-ring bg-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Review Approval Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStagedRows(null)}
                  className="text-xs font-bold text-slate-500 hover:text-red-700 transition-colors cursor-pointer"
                >
                  Discard Staging Draft
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePublish}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 transition-colors shadow-sm focus-ring cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve & Publish to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
