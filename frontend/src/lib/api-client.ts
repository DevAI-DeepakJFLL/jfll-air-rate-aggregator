import { RateSearchRequest, RateSearchResponse } from "../types/rate";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchLiveRates(payload: RateSearchRequest): Promise<RateSearchResponse> {
  const res = await fetch(`${API_BASE}/api/v1/rates/quote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Request failed with status ${res.status}`);
  }

  return res.json();
}
