import { RateSearchRequest, RateSearchResponse, DestinationItem } from "../types/rate";
import { ChargeRule, ChargeRuleCreate, ChargeRuleUpdate } from "../types/charge";
import { RATE_SHEET_DESTINATIONS } from "./rate-destinations";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY || "dev-admin-api-key-change-in-production";

function getAdminHeaders(role?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Admin-Key": ADMIN_API_KEY,
    "X-Admin-Role": role || "PRICING_HEAD",
    "X-Admin-User": "deepak.naidu@jfll.com",
  };
  return headers;
}

export async function fetchDestinations(): Promise<DestinationItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/rates/destinations`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Graceful fallback to verified rate sheet dataset
  }
  return RATE_SHEET_DESTINATIONS;
}

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

/**
 * Charges & Surcharges Management API Client
 */

export async function fetchCharges(role?: string, activeOnly = false): Promise<ChargeRule[]> {
  const url = new URL(`${API_BASE}/api/v1/charges`);
  if (activeOnly) {
    url.searchParams.set("active_only", "true");
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getAdminHeaders(role),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to fetch charges (Status ${res.status})`);
  }

  return res.json();
}

export async function fetchChargeById(id: string, role?: string): Promise<ChargeRule> {
  const res = await fetch(`${API_BASE}/api/v1/charges/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: getAdminHeaders(role),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to fetch charge ${id} (Status ${res.status})`);
  }

  return res.json();
}

export async function createCharge(charge: ChargeRuleCreate, role?: string): Promise<ChargeRule> {
  const res = await fetch(`${API_BASE}/api/v1/charges`, {
    method: "POST",
    headers: getAdminHeaders(role),
    body: JSON.stringify(charge),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to create charge (Status ${res.status})`);
  }

  return res.json();
}

export async function updateCharge(
  id: string,
  update: ChargeRuleUpdate,
  role?: string
): Promise<ChargeRule> {
  const res = await fetch(`${API_BASE}/api/v1/charges/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: getAdminHeaders(role),
    body: JSON.stringify(update),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to update charge ${id} (Status ${res.status})`);
  }

  return res.json();
}

export async function deleteCharge(
  id: string,
  role?: string
): Promise<{ status: string; charge_id: string }> {
  const res = await fetch(`${API_BASE}/api/v1/charges/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAdminHeaders(role),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to delete charge ${id} (Status ${res.status})`);
  }

  return res.json();
}

export async function resetChargesToDefaults(role?: string): Promise<ChargeRule[]> {
  const res = await fetch(`${API_BASE}/api/v1/charges/reset-defaults`, {
    method: "POST",
    headers: getAdminHeaders(role),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to reset charges to defaults (Status ${res.status})`);
  }

  return res.json();
}
