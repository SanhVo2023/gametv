import type {
  CheckPhoneResult,
  GasError,
  GasResponse,
  Prize,
  SpinResult,
} from "./types";

const GAS_URL = (process.env.NEXT_PUBLIC_GAS_URL ?? "").trim();

const NETWORK_RETRY = 3;
const RETRY_BACKOFF_MS = 800;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type WithOk = { ok: boolean; error?: string };

async function rawPost<T extends WithOk>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T | GasError> {
  if (!GAS_URL) {
    return { ok: false, error: "GAS_URL_NOT_CONFIGURED" };
  }

  // No `Content-Type` header → browser sends text/plain → avoids CORS preflight on Apps Script Web App.
  const res = await fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify({ action, ...params }),
    redirect: "follow",
  });
  if (!res.ok) {
    return { ok: false, error: `HTTP_${res.status}` };
  }
  const data = (await res.json()) as T | GasError;
  return data;
}

async function post<T extends WithOk>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < NETWORK_RETRY; attempt++) {
    try {
      const data = await rawPost<T>(action, params);
      if (data.ok === false) {
        // Application-level error — do NOT retry; surface immediately.
        throw new Error((data as GasError).error || "GAS_APPLICATION_ERROR");
      }
      return data as T;
    } catch (err) {
      lastError = err;
      if (attempt < NETWORK_RETRY - 1) {
        await delay(RETRY_BACKOFF_MS * (attempt + 1));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? "NETWORK_ERROR"));
}

export async function checkPhone(phone: string): Promise<CheckPhoneResult> {
  return post<CheckPhoneResult>("checkPhone", { phone });
}

export async function spinWheel(phone: string): Promise<SpinResult> {
  return post<SpinResult>("spinWheel", { phone });
}

export async function recordLoss(phone: string): Promise<void> {
  // Fire-and-forget, but log on failure for QA.
  try {
    await post<{ ok: true }>("recordLoss", { phone });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[gas] recordLoss failed (non-blocking):", err);
    }
  }
}

interface PrizesResponse {
  ok: true;
  prizes: Prize[];
}

let prizesCache: { data: Prize[]; fetchedAt: number } | null = null;
const PRIZE_CACHE_TTL_MS = 30_000;

export async function getPrizes(forceRefresh = false): Promise<Prize[]> {
  if (!forceRefresh && prizesCache && Date.now() - prizesCache.fetchedAt < PRIZE_CACHE_TTL_MS) {
    return prizesCache.data;
  }
  const res = await post<PrizesResponse>("getPrizes");
  prizesCache = { data: res.prizes, fetchedAt: Date.now() };
  return res.prizes;
}

export function clearPrizesCache(): void {
  prizesCache = null;
}

export function isGasConfigured(): boolean {
  return GAS_URL.length > 0;
}
