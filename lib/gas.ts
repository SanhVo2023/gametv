import type {
  CheckPhoneResult,
  GasError,
  GasResponse,
  Prize,
  SpinResult,
} from "./types";

const GAS_URL = (process.env.NEXT_PUBLIC_GAS_URL ?? "").trim();

const NETWORK_RETRY = 2;
const RETRY_BACKOFF_MS = 700;
const PER_ATTEMPT_TIMEOUT_MS = 10_000;

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

  // Per-attempt timeout so a hung GAS request can't freeze the wheel.
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), PER_ATTEMPT_TIMEOUT_MS);
  try {
    // No `Content-Type` header → browser sends text/plain → avoids CORS preflight on Apps Script Web App.
    const res = await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify({ action, ...params }),
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP_${res.status}` };
    }
    const data = (await res.json()) as T | GasError;
    return data;
  } finally {
    window.clearTimeout(timer);
  }
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

// ============================================================
//   Lucky draw — admin force channel + audit log
// ============================================================

export interface DrawForce {
  number: number;
  at: number;
}

/** Admin page only. Throws 'bad_key' / 'invalid_number' via post(). */
export async function setDrawForce(number: number, key: string): Promise<void> {
  await post<{ ok: true }>("drawForceSet", { number, key });
}

/**
 * Single attempt with a hard timeout, never throws — the spin must NEVER
 * stall on the network (the default post() retry stack can take ~21 s).
 */
export async function getDrawForce(timeoutMs = 1500): Promise<DrawForce | null> {
  try {
    const res = await Promise.race([
      rawPost<{ ok: true; force: DrawForce | null }>("drawForceGet"),
      delay(timeoutMs).then(() => null),
    ]);
    if (!res || res.ok === false) return null;
    return res.force ?? null;
  } catch {
    return null;
  }
}

export function clearDrawForce(): void {
  post<{ ok: true }>("drawForceClear").catch(() => {
    /* best effort — TTL expires it anyway */
  });
}

export function logDrawWin(number: number, tier: string, status: "received" | "absent"): void {
  post<{ ok: true }>("drawLogWinner", { number, tier, status }).catch((err) => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[gas] drawLogWinner failed (non-blocking):", err);
    }
  });
}

export interface DrawLog {
  received: number[];
  absent: number[];
}

export async function getDrawLog(): Promise<DrawLog> {
  const res = await post<{ ok: true } & DrawLog>("drawGetLog");
  return { received: res.received ?? [], absent: res.absent ?? [] };
}
