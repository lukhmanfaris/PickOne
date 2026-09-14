/** Options and helpers for the jersey sizing form. */

export const COMPANIES = [
  "MYDATA Analytics",
  "MYDATA Infomatica",
  "POIS",
] as const;

export const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;

/** Numbers 1..99, displayed zero-padded as 01..99. */
export const JERSEY_NUMBERS = Array.from({ length: 99 }, (_, i) => i + 1);

/** Printing limit for the name on the back of the jersey. */
export const JERSEY_NAME_MAX = 6;

export function padNumber(n: number): string {
  return String(n).padStart(2, "0");
}

export interface JerseyEntry {
  fullName: string;
  company: string;
  size: string;
  jerseyNumber: number;
  jerseyName: string;
  createdAt?: string;
}

export interface JerseyAdminRow {
  jerseyNumber: number;
  jerseyName: string;
  fullName: string;
  company: string;
  size: string;
  voterId: string;
  createdAt: string;
}
