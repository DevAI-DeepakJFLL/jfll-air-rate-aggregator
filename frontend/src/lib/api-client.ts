import { RateSearchRequest, RateSearchResponse, DestinationItem } from "../types/rate";
import { ChargeRule, ChargeRuleCreate, ChargeRuleUpdate } from "../types/charge";
import { CarrierRegistryItem, CarrierRateRow } from "../types/tariff";
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

/**
 * Air Cargo Tariff Registry & Circular API Client
 */
export async function fetchTariffRegistry(): Promise<CarrierRegistryItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/tariffs/registry`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to fetch tariff registry (Status ${res.status})`);
  }
  return res.json();
}

export async function fetchCarrierRates(carrierCode: string): Promise<{
  carrier_code: string;
  carrier_name: string;
  prefix: string;
  parser_id: string;
  rates: CarrierRateRow[];
}> {
  const res = await fetch(`${API_BASE}/api/v1/tariffs/${encodeURIComponent(carrierCode)}/rates`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to fetch rates for ${carrierCode} (Status ${res.status})`);
  }
  return res.json();
}

export async function uploadTariffPdf(
  carrierCode: string,
  file: File,
  role?: string,
  currency: string = "INR"
): Promise<{
  status: string;
  filename: string;
  carrier_code: string;
  registry_status: CarrierRegistryItem;
}> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("carrier_code", carrierCode);
  formData.append("currency", currency);

  const res = await fetch(`${API_BASE}/api/v1/tariffs/upload`, {
    method: "POST",
    headers: {
      "X-Admin-Key": ADMIN_API_KEY,
      "X-Admin-Role": role || "PRICING_HEAD",
      "X-Admin-User": "deepak.naidu@jfll.com",
    },
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to upload rate sheet (Status ${res.status})`);
  }

  return res.json();
}

export async function deleteTariffCircular(
  carrierCode: string,
  role?: string
): Promise<{
  success: boolean;
  message: string;
  carrier: CarrierRegistryItem;
}> {
  const res = await fetch(`${API_BASE}/api/v1/tariffs/${encodeURIComponent(carrierCode)}`, {
    method: "DELETE",
    headers: {
      "X-Admin-Key": ADMIN_API_KEY,
      "X-Admin-Role": role || "PRICING_HEAD",
      "X-Admin-User": "deepak.naidu@jfll.com",
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to clear circular (Status ${res.status})`);
  }

  return res.json();
}
