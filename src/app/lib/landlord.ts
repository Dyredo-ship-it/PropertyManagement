import type { LandlordInfo } from "./pdf";

const KEY = "immostore_landlord_info";

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
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<StoredLandlordInfo>) };
  } catch {
    return EMPTY;
  }
}

export function saveLandlordInfo(info: StoredLandlordInfo): void {
  localStorage.setItem(KEY, JSON.stringify(info));
}
