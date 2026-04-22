import type { LandlordInfo } from "./pdf";

const KEY = "palier_landlord_info";
const LEGACY_KEY = "immostore_landlord_info";

export interface StoredLandlordInfo extends LandlordInfo {
  name: string;
  address: string;
  email: string;
  vatId: string;
}

const EMPTY: StoredLandlordInfo = { name: "", address: "", email: "", vatId: "" };

export function getLandlordInfo(): StoredLandlordInfo {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return EMPTY;
    const parsed = { ...EMPTY, ...(JSON.parse(raw) as Partial<StoredLandlordInfo>) };
    // One-time migration: copy legacy data under the new key so future
    // reads don't touch the legacy key, then keep the legacy key around
    // until the user re-saves (non-destructive).
    if (!localStorage.getItem(KEY) && localStorage.getItem(LEGACY_KEY)) {
      try {
        localStorage.setItem(KEY, localStorage.getItem(LEGACY_KEY)!);
      } catch {
        /* ignore storage errors */
      }
    }
    return parsed;
  } catch {
    return EMPTY;
  }
}

export function saveLandlordInfo(info: StoredLandlordInfo): void {
  localStorage.setItem(KEY, JSON.stringify(info));
}
