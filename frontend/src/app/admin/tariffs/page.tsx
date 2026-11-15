"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  UploadCloud,
  CheckCircle,
  FileText,
  AlertTriangle,
  Lock,
  Plus,
  Trash2,
} from "lucide-react";
import { useAdminRole } from "@/context/AdminRoleContext";

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

export default function AdminTariffsPage() {
  const { isPricingHead } = useAdminRole();
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

    // Initialize clean staged workbench
    setTimeout(() => {
      setUploading(false);
      setIsScanned(
        file.name.toLowerCase().includes("scan") ||
          file.name.toLowerCase().includes("img")
      );
      setStagedRows([
        {
          destination: "DXB",
          commodity: "General Cargo",
          min_charge: 3500,
          rate_normal: 120,
          rate_45: 95,
          rate_100: 82,
          rate_250: 75,
          rate_300: 70,
          fsc_per_kg: 18.5,
          ssc_per_kg: 4.5,
        },
        {
          destination: "AUH",
          commodity: "General Cargo",
          min_charge: 3500,
          rate_normal: 125,
          rate_45: 98,
          rate_100: 84,
          rate_250: 78,
          rate_300: 72,
          fsc_per_kg: 18.5,
          ssc_per_kg: 4.5,
        },
      ]);
    }, 800);
  };

  const handleAddRow = () => {
    setStagedRows((prev) => [
      ...(prev || []),
      {
        destination: "",
        commodity: "General Cargo",
        min_charge: 0,
        rate_normal: 0,
        rate_45: 0,
        rate_100: 0,
        rate_250: 0,
        rate_300: 0,
        fsc_per_kg: 0,
        ssc_per_kg: 0,
      },
    ]);
  };

  const handleDeleteRow = (index: number) => {
    setStagedRows((prev) => (prev ? prev.filter((_, i) => i !== index) : null));
  };

  const handleCellChange = (
    index: number,
    field: keyof StagedRow,
    value: string | number
  ) => {
    if (!stagedRows) return;
    const updated = [...stagedRows];
    if (field === "destination" || field === "commodity") {
      updated[index] = { ...updated[index], [field]: String(value) };
    } else {
      const numValue =
        typeof value === "number" ? value : parseFloat(value) || 0;
      updated[index] = { ...updated[index], [field]: numValue };
    }
    setStagedRows(updated);
  };

  const handlePublish = () => {
    if (!isPricingHead) return;
    setPublished(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Airline Rate Sheet Ingestion Engine
          </h1>
          <p className="text-xs text-slate-600 font-medium">
            Upload PDF circulars, parse weight breaks, and stage tariffs for Mumbai Hub (BOM) export corridors.
          </p>
        </div>
      </div>

      {/* RBAC Notice for Coordinator */}
      {!isPricingHead && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900 flex items-center gap-3">
          <Lock className="h-5 w-5 text-sky-600 shrink-0" />
          <div>
            <span className="font-bold">Coordinator Preview Mode:</span> You can test parsing and inspect staged tariffs. Publishing tariffs to the live quotation engine requires{" "}
            <strong>Pricing Team Head</strong> authorization.
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-jfll-blue">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Upload Carrier Rate Circular
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Extract tabular tariffs &bull; Validate FSC/SSC surcharges &bull; Staging review
            </p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="airline-input"
              className="block text-xs font-bold text-slate-700 uppercase mb-1"
            >
              Airline / GSA
            </label>
            <input
              id="airline-input"
              type="text"
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              placeholder="e.g. Etihad Cargo, Emirates SkyCargo..."
              className="w-full h-11 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold focus-ring bg-white"
              required
            />
          </div>

          <div>
            <label
              htmlFor="currency-select"
              className="block text-xs font-bold text-slate-700 uppercase mb-1"
            >
              Tariff Currency
            </label>
            <select
              id="currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 focus-ring cursor-pointer bg-white"
            >
              <option value="INR">INR (Indian Rupee)</option>
              <option value="USD">USD (US Dollar)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="pdf-input"
              className="block text-xs font-bold text-slate-700 uppercase mb-1"
            >
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
              className="inline-flex items-center gap-2 rounded-xl bg-obsidian-950 px-6 py-2.5 text-xs font-bold text-amber-400 hover:bg-slate-900 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className="h-4 w-4" />
              {uploading ? "Extracting Tabular Tariffs..." : "Upload & Parse to Staging"}
            </button>
          </div>
        </form>
      </div>

      {/* Success Notification */}
      {published && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="h-5 w-5 text-emerald-700" />
            <span className="text-xs font-bold">
              Tariffs Published Successfully! Updated live dashboard for {airline || "Carrier"} across {stagedRows?.length} corridors.
            </span>
          </div>
          <Link
            href="/"
            className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
          >
            View on Live Calculator →
          </Link>
        </div>
      )}

      {/* Split-Pane Staging Workbench */}
      {stagedRows && !published && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-xs flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong>Staged Tariff Verification:</strong> Ingested rate circular for{" "}
              <strong>{airline || file?.name}</strong> is staged for administrative review. Verify base freight weight breaks and surcharges in the workbench below before approving for live quote calculation.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column: PDF Source Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="h-5 w-5 text-jfll-blue" />
                <h3 className="text-xs font-bold text-slate-900">Source Document</h3>
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
                Human-in-the-loop guarantee: Review rates and surcharge columns before committing to live quotation desk.
              </div>
            </div>

            {/* Right Column: Editable Staged Tariff Table */}
            <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Staged Buying Rates ({stagedRows.length} Corridors)
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Verify extracted weight breaks and fuel/security surcharges
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center gap-1 rounded-xl bg-obsidian-950 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Corridor</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-slate-700">
                  <thead className="bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-y border-slate-200">
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
                      <th className="px-2 py-2.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {stagedRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-4 py-8 text-center text-xs text-slate-500 font-medium"
                        >
                          No tariff corridors staged yet. Click{" "}
                          <button
                            type="button"
                            onClick={handleAddRow}
                            className="font-bold text-obsidian-900 underline hover:text-amber-600"
                          >
                            + Add Corridor
                          </button>{" "}
                          to key in an export corridor.
                        </td>
                      </tr>
                    ) : (
                      stagedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-2 font-bold text-slate-900 font-sans">
                            <input
                              type="text"
                              value={row.destination}
                              onChange={(e) =>
                                handleCellChange(idx, "destination", e.target.value.toUpperCase())
                              }
                              placeholder="IATA"
                              maxLength={3}
                              className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs font-bold font-mono uppercase focus-ring bg-white"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={row.min_charge || ""}
                              onChange={(e) => handleCellChange(idx, "min_charge", e.target.value)}
                              placeholder="0"
                              className="w-16 rounded border border-slate-200 px-1.5 py-1 text-xs focus-ring bg-white"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={row.rate_normal || ""}
                              onChange={(e) => handleCellChange(idx, "rate_normal", e.target.value)}
                              placeholder="0"
                              className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs focus-ring bg-white"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={row.rate_45 || ""}
                              onChange={(e) => handleCellChange(idx, "rate_45", e.target.value)}
                              placeholder="0"
                              className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs focus-ring bg-white"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={row.rate_100 || ""}
                              onChange={(e) => handleCellChange(idx, "rate_100", e.target.value)}
                              placeholder="0"
                              className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs focus-ring bg-white"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={row.rate_250 || ""}
                              onChange={(e) => handleCellChange(idx, "rate_250", e.target.value)}
                              placeholder="0"
                              className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs focus-ring bg-white"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={row.rate_300 || ""}
                              onChange={(e) => handleCellChange(idx, "rate_300", e.target.value)}
                              placeholder="0"
                              className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs focus-ring bg-white"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={row.fsc_per_kg || ""}
                              onChange={(e) => handleCellChange(idx, "fsc_per_kg", e.target.value)}
                              placeholder="0"
                              className="w-14 rounded border border-amber-200 bg-amber-50/50 px-1.5 py-1 text-xs text-amber-900 focus-ring"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={row.ssc_per_kg || ""}
                              onChange={(e) => handleCellChange(idx, "ssc_per_kg", e.target.value)}
                              placeholder="0"
                              className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs focus-ring bg-white"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(idx)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
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
                    disabled={!stagedRows || stagedRows.length === 0 || !isPricingHead}
                    title={
                      !isPricingHead
                        ? "Pricing Team Head authorization required to publish"
                        : "Publish staged tariffs to live calculator"
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
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
