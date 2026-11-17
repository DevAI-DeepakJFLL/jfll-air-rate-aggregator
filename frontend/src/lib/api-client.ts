import { RateSearchRequest, RateSearchResponse, DestinationItem } from "../types/rate";
import { ChargeRule, ChargeRuleCreate, ChargeRuleUpdate } from "../types/charge";
import { CarrierRegistryItem, CarrierRateRow } from "../types/tariff";
import { RATE_SHEET_DESTINATIONS } from "./rate-destinations";

/**
 * Dynamically resolves the API base URL.
 * Priority:
 * 1. User runtime override saved in browser localStorage (JFLL_API_URL)
 * 2. Build-time baked NEXT_PUBLIC_API_URL environment variable
 * 3. Empty string if running on HTTPS (same-origin / CloudFront proxy)
 * 4. Fallback to http://localhost:8000 for local development
 */
export function getApiBase(): string {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("JFLL_API_URL");
      if (stored && stored.trim()) {
        return stored.trim().replace(/\/+$/, "");
      }
    } catch {
      // Ignore local storage errors
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return "";
  }

  return "http://localhost:8000";
}

export function setCustomApiUrl(url: string): void {
  if (typeof window !== "undefined") {
    try {
      if (!url || !url.trim()) {
        localStorage.removeItem("JFLL_API_URL");
      } else {
        localStorage.setItem("JFLL_API_URL", url.trim().replace(/\/+$/, ""));
      }
    } catch {
      // Ignore
    }
  }
}

export function getCustomApiUrl(): string | null {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem("JFLL_API_URL");
    } catch {
      return null;
    }
  }
  return null;
}

export function setAdminApiKey(key: string): void {
  if (typeof window !== "undefined") {
    try {
      const cleanKey = key.trim();
      if (cleanKey) {
        sessionStorage.setItem("JFLL_ADMIN_API_KEY", cleanKey);
        localStorage.setItem("JFLL_ADMIN_API_KEY", cleanKey);
      } else {
        sessionStorage.removeItem("JFLL_ADMIN_API_KEY");
        localStorage.removeItem("JFLL_ADMIN_API_KEY");
      }
    } catch {
      // Storage unavailable
    }
  }
}

export function getAdminApiKey(): string {
  if (typeof window !== "undefined") {
    try {
      const stored =
        sessionStorage.getItem("JFLL_ADMIN_API_KEY") ||
        localStorage.getItem("JFLL_ADMIN_API_KEY");
      if (stored && stored.trim()) return stored.trim();
    } catch {
      // Storage unavailable
    }
  }
  return process.env.NEXT_PUBLIC_ADMIN_API_KEY || "dev-admin-api-key-change-in-production";
}

let _chargesCache: ChargeRule[] | null = null;

export function getCachedCharges(): ChargeRule[] | null {
  return _chargesCache;
}

export function clearChargesCache(): void {
  _chargesCache = null;
}

function getAdminHeaders(role?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Admin-Key": getAdminApiKey(),
    "X-Admin-Role": role || "PRICING_HEAD",
    "X-Admin-User": "deepak.naidu@jfll.com",
  };
  return headers;
}

/**
 * Resilient fetch wrapper with actionable error diagnostics for network and CORS errors.
 */
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getApiBase();
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  try {
    return await fetch(url, init);
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
      const targetDisplay = url || "(relative path)";
      throw new Error(
        `Failed to reach API at ${targetDisplay}. Check CORS on your AWS Lambda Function URL or verify your API endpoint.`
      );
    }
    throw err;
  }
}

export async function fetchDestinations(): Promise<DestinationItem[]> {
  try {
    const res = await apiFetch("/api/v1/rates/destinations");
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Graceful fallback to verified rate sheet dataset
  }
  return RATE_SHEET_DESTINATIONS;
}

export async function fetchLiveRates(payload: RateSearchRequest): Promise<RateSearchResponse> {
  const res = await apiFetch("/api/v1/rates/quote", {
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
  const base = getApiBase();
  const rawPath = base ? `${base}/api/v1/charges` : "/api/v1/charges";
  const url = new URL(
    rawPath,
    typeof window !== "undefined" ? window.location.origin : "http://localhost:8000"
  );
  if (activeOnly) {
    url.searchParams.set("active_only", "true");
  }

  const res = await apiFetch(url.toString(), {
    method: "GET",
    headers: getAdminHeaders(role),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to fetch charges (Status ${res.status})`);
  }

  const data: ChargeRule[] = await res.json();
  if (!activeOnly) {
    _chargesCache = data;
  }
  return data;
}

export async function fetchChargeById(id: string, role?: string): Promise<ChargeRule> {
  const res = await apiFetch(`/api/v1/charges/${encodeURIComponent(id)}`, {
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
  const res = await apiFetch("/api/v1/charges", {
    method: "POST",
    headers: getAdminHeaders(role),
    body: JSON.stringify(charge),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to create charge (Status ${res.status})`);
  }

  const created: ChargeRule = await res.json();
  if (_chargesCache) {
    _chargesCache = [..._chargesCache, created];
  }
  return created;
}

export async function updateCharge(
  id: string,
  update: ChargeRuleUpdate,
  role?: string
): Promise<ChargeRule> {
  const res = await apiFetch(`/api/v1/charges/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: getAdminHeaders(role),
    body: JSON.stringify(update),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to update charge ${id} (Status ${res.status})`);
  }

  const updated: ChargeRule = await res.json();
  if (_chargesCache) {
    _chargesCache = _chargesCache.map((c) => (c.id === updated.id ? updated : c));
  }
  return updated;
}

export async function deleteCharge(
  id: string,
  role?: string
): Promise<{ status: string; charge_id: string }> {
  const res = await apiFetch(`/api/v1/charges/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAdminHeaders(role),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to delete charge ${id} (Status ${res.status})`);
  }

  if (_chargesCache) {
    _chargesCache = _chargesCache.filter((c) => c.id !== id);
  }
  return res.json();
}

export async function resetChargesToDefaults(role?: string): Promise<ChargeRule[]> {
  const res = await apiFetch("/api/v1/charges/reset-defaults", {
    method: "POST",
    headers: getAdminHeaders(role),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to reset charges to defaults (Status ${res.status})`);
  }

  const resetList: ChargeRule[] = await res.json();
  _chargesCache = resetList;
  return resetList;
}

/**
 * Air Cargo Tariff Registry & Circular API Client
 */
let _tariffRegistryCache: CarrierRegistryItem[] | null = null;

export function getCachedTariffRegistry(): CarrierRegistryItem[] | null {
  return _tariffRegistryCache;
}

export function clearTariffRegistryCache(): void {
  _tariffRegistryCache = null;
}

export async function fetchTariffRegistry(): Promise<CarrierRegistryItem[]> {
  const res = await apiFetch("/api/v1/tariffs/registry", {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to fetch tariff registry (Status ${res.status})`);
  }
  const data: CarrierRegistryItem[] = await res.json();
  _tariffRegistryCache = data;
  return data;
}

export async function fetchCarrierRates(carrierCode: string): Promise<{
  carrier_code: string;
  carrier_name: string;
  prefix: string;
  parser_id: string;
  rates: CarrierRateRow[];
}> {
  const res = await apiFetch(`/api/v1/tariffs/${encodeURIComponent(carrierCode)}/rates`, {
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

  const res = await apiFetch("/api/v1/tariffs/upload", {
    method: "POST",
    headers: {
      "X-Admin-Key": getAdminApiKey(),
      "X-Admin-Role": role || "PRICING_HEAD",
      "X-Admin-User": "deepak.naidu@jfll.com",
    },
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to upload rate sheet (Status ${res.status})`);
  }

  const result = await res.json();
  if (_tariffRegistryCache && result.registry_status) {
    _tariffRegistryCache = _tariffRegistryCache.map((c) =>
      c.carrier_code === result.carrier_code ? { ...c, ...result.registry_status } : c
    );
  }
  return result;
}

export async function deleteTariffCircular(
  carrierCode: string,
  role?: string
): Promise<{
  success: boolean;
  message: string;
  carrier: CarrierRegistryItem;
}> {
  const res = await apiFetch(`/api/v1/tariffs/${encodeURIComponent(carrierCode)}`, {
    method: "DELETE",
    headers: {
      "X-Admin-Key": getAdminApiKey(),
      "X-Admin-Role": role || "PRICING_HEAD",
      "X-Admin-User": "deepak.naidu@jfll.com",
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Failed to clear circular (Status ${res.status})`);
  }

  const result = await res.json();
  if (_tariffRegistryCache && result.carrier) {
    _tariffRegistryCache = _tariffRegistryCache.map((c) =>
      c.carrier_code === carrierCode ? { ...c, ...result.carrier } : c
    );
  }
  return result;
}
