"use client";

import React, { useState } from "react";
import { UploadCloud, CheckCircle, FileText, AlertTriangle } from "lucide-react";

export default function AdminIngestionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [airline, setAirline] = useState("Etihad Airways");
  const [currency, setCurrency] = useState("INR");
  const [uploading, setUploading] = useState(false);
  const [stagedResult, setStagedResult] = useState<any | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("airline_name", airline);
    formData.append("currency", currency);

    try {
      const res = await fetch("http://localhost:8000/api/v1/tariffs/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setStagedResult(data);
    } catch (err) {
      alert("Failed to upload rate sheet. Ensure backend is running.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
          <UploadCloud className="h-5 w-5 text-jfll-blue" />
          <h2 className="text-lg font-bold text-gray-900">Admin Rate Sheet Ingestion Pipeline</h2>
        </div>

        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Airline Partner</label>
            <input
              type="text"
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium"
            >
              <option value="INR">INR (Indian Rupee)</option>
              <option value="USD">USD (US Dollar)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">PDF Circular</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-500 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold hover:file:bg-slate-200"
              required
            />
          </div>

          <div className="md:col-span-3 flex justify-end mt-2">
            <button
              type="submit"
              disabled={uploading || !file}
              className="rounded-xl bg-jfll-blue px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-jfll-navy disabled:opacity-50"
            >
              {uploading ? "Parsing Document..." : "Upload & Parse to Staging"}
            </button>
          </div>
        </form>
      </div>

      {stagedResult && (
        <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-bold text-gray-900">
                Staged Rate Sheet Review: {stagedResult.filename}
              </h3>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
              Mode: {stagedResult.mode}
            </span>
          </div>

          {stagedResult.is_scanned && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Scanned PDF detected. Vision OCR extracted tables into staging for side-by-side
                human verification.
              </span>
            </div>
          )}

          <div className="text-xs text-gray-500">
            Carrier: <strong className="text-gray-800">{stagedResult.carrier_hint}</strong> |
            Currency: <strong className="text-gray-800">{stagedResult.currency}</strong> | Status:{" "}
            <strong className="text-emerald-700">{stagedResult.status}</strong>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => alert("Approved! Published to live operational table.")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow-sm"
            >
              <CheckCircle className="h-4 w-4" />
              Approve & Publish to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
