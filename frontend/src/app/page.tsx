"use client";

import React, { useState } from "react";
import { RateSearchForm } from "../components/rates/RateSearchForm";
import { RatesGrid } from "../components/rates/RatesGrid";
import { HeavyCargoBanner } from "../components/rates/HeavyCargoBanner";
import { RateSearchRequest, RateSearchResponse } from "../types/rate";
import { fetchLiveRates } from "../lib/api-client";

export default function RateDiscoveryPage() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RateSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (payload: RateSearchRequest) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLiveRates(payload);
      setResponse(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch rates from server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input Section */}
      <RateSearchForm onSearch={handleSearch} loading={loading} />

      {/* Error notification */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Heavy Cargo Banner (> 500 kg) */}
      {response?.is_heavy_cargo && (
        <HeavyCargoBanner
          chargeableWeight={response.chargeable_weight}
          message={response.message}
        />
      )}

      {/* Ranked Rates Leaderboard (< 500 kg) */}
      {response && !response.is_heavy_cargo && (
        <RatesGrid rates={response.rates} />
      )}
    </div>
  );
}
