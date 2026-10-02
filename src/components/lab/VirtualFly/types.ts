/**
 * Genova Virtual Lab — virtual fly types
 * ─────────────────────────────────────────────────────────────────────────────
 * The shape of one row of `virtualFlies`. Kept in its own module so the list,
 * the detail panel, the fly viewer and the brain snapshot all agree on it
 * without importing each other.
 *
 * `brainModel` is the *only* field that carries scientific source data, and it
 * only ever holds what the Virtual Fly Brain API returned plus the moment it was
 * read. Everything else is the student's own lab metadata.
 */

export type FlySex = "female" | "male" | "unknown";
export type FlyStatus = "healthy" | "experimental" | "modified";

export interface FlyBrainModel {
  /** VFB short form, e.g. `FBbt_00003748`. */
  vfbId: string;
  label: string;
  entityType?: string;
  /** Always "Virtual Fly Brain" today; kept so the attribution can evolve. */
  source: string;
  accessedAt: number;
}

export interface FlyRow {
  _id: string;
  genovaFlyId: string;
  name: string;
  species: string;
  sex: FlySex;
  ageDays: number;
  genotype?: string;
  phenotype?: string;
  notes?: string;
  status: FlyStatus;
  brainModel?: FlyBrainModel;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export const SEX_LABEL: Record<FlySex, string> = { female: "ماده", male: "نر", unknown: "نامشخص" };
export const STATUS_LABEL: Record<FlyStatus, string> = {
  healthy: "سالم",
  experimental: "آزمایشی",
  modified: "دستکاری‌شده",
};
export const STATUS_CHIP: Record<FlyStatus, string> = {
  healthy: "bg-emerald-100 text-emerald-800",
  experimental: "bg-sky-100 text-sky-800",
  modified: "bg-amber-100 text-amber-800",
};
