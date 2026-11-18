"use client";

import React, { useState } from "react";
import { RateSearchForm } from "@/components/rates/RateSearchForm";
import { RatesTable } from "@/components/rates/RatesGrid";
import { AirlineCardSkeleton } from "@/components/rates/AirlineCardSkeleton";
import { EmptyRateState } from "@/components/rates/EmptyRateState";
import { RateSearchRequest, RateSearchResponse } from "@/types/rate";
import { fetchLiveRates } from "@/lib/api-client";

export default function RateDiscoveryPage() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RateSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState({ origin: "BOM", destination: "" });

  const handleSearch = async (payload: RateSearchRequest) => {
    setLoading(true);
    setError(null);
    setCurrentRoute({ origin: payload.origin, destination: payload.destination });
    try {
      const data = await fetchLiveRates(payload);
      setResponse(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch rates from server.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input Section */}
      <RateSearchForm
        initialOrigin={currentRoute.origin}
        initialDestination={currentRoute.destination}
        onSearch={handleSearch}
        loading={loading}
      />

      {/* Error notification */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading Skeleton (Zero CLS) */}
      {loading && <AirlineCardSkeleton />}

      {/* Operational Weight Limit Warning (> 500 kg desk ceiling) */}
      {!loading && response?.is_heavy_cargo && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm font-semibold text-amber-900 shadow-2xs"
        >
          <div className="font-extrabold text-base mb-1 text-amber-950">
            Cargo Exceeds 500 kg Desk Limit ({response.chargeable_weight.toFixed(1)} kg)
          </div>
          <p className="text-amber-800 text-xs font-normal leading-relaxed">
            {response.message}
          </p>
        </div>
      )}

      {/* Empty Rate State */}
      {!loading && response && !response.is_heavy_cargo && response.rates.length === 0 && (
        <EmptyRateState
          origin={currentRoute.origin}
          destination={currentRoute.destination}
        />
      )}

      {/* High-Density Tariff Comparison Table */}
      {!loading && response && !response.is_heavy_cargo && response.rates.length > 0 && (
        <RatesTable rates={response.rates} />
      )}
    </div>
  );
}
