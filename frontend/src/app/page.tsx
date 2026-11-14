"use client";

import React, { useState } from "react";
import { RateSearchForm } from "../components/rates/RateSearchForm";
import { RatesGrid } from "../components/rates/RatesGrid";
import { HeavyCargoBanner } from "../components/rates/HeavyCargoBanner";
import { AirlineCardSkeleton } from "../components/rates/AirlineCardSkeleton";
import { EmptyRateState } from "../components/rates/EmptyRateState";
import { RateSearchRequest, RateSearchResponse } from "../types/rate";
import { fetchLiveRates } from "../lib/api-client";

export default function RateDiscoveryPage() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RateSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState({ origin: "BOM", destination: "DXB" });

  const handleSearch = async (payload: RateSearchRequest) => {
    setLoading(true);
    setError(null);
    setCurrentRoute({ origin: payload.origin, destination: payload.destination });
    try {
      const data = await fetchLiveRates(payload);
      setResponse(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch rates from server.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoute = (origin: string, destination: string) => {
    setCurrentRoute({ origin, destination });
    handleSearch({
      origin,
      destination,
      actual_weight_kg: 120.0,
      commodity: "General Cargo",
    });
  };

  return (
    <div className="space-y-6">
      {/* Search Input Section */}
      <RateSearchForm
        key={`${currentRoute.origin}-${currentRoute.destination}`}
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

      {/* Heavy Cargo Banner (>= 500 kg) */}
      {!loading && response?.is_heavy_cargo && (
        <HeavyCargoBanner
          chargeableWeight={response.chargeable_weight}
          message={response.message}
        />
      )}

      {/* Empty Rate State */}
      {!loading && response && !response.is_heavy_cargo && response.rates.length === 0 && (
        <EmptyRateState
          origin={currentRoute.origin}
          destination={currentRoute.destination}
          onSelectRoute={handleQuickRoute}
        />
      )}

      {/* Ranked Rates Leaderboard (< 500 kg) */}
      {!loading && response && !response.is_heavy_cargo && response.rates.length > 0 && (
        <RatesGrid rates={response.rates} />
      )}
    </div>
  );
}
