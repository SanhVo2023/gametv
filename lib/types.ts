export type AppState =
  | "idle"
  | "phone"
  | "game"
  | "win_transition"
  | "wheel"
  | "prize_reveal"
  | "lose_modal"
  | "no_prizes";

export interface Prize {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  colorHex?: string;
  weight?: number;
}

export interface CheckPhoneResult {
  ok: true;
  allowed: boolean;
  isTester: boolean;
  reason?: "already_won" | "invalid_phone" | string;
}

export interface SpinResultPrize {
  id: string;
  name: string;
  description: string;
  code: string;
  imageUrl?: string;
  colorHex?: string;
}

export interface SpinResult {
  ok: true;
  wedgeIndex: number;
  totalWedges: number;
  isTester: boolean;
  prize: SpinResultPrize;
}

export interface GasError {
  ok: false;
  error: string;
}

export type GasResponse<T> = T | GasError;
