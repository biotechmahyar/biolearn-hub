/**
 * Virtual Fly Brain — lab readout
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase D needs *real* numbers to put next to a student's observation, not
 * numbers invented by Genova. This module runs the live VFB endpoints against a
 * chosen entity and returns a small, fully attributed set of measurements.
 *
 * Hard rules encoded here:
 *   • Every value in `measurements` comes verbatim from a VFB HTTP response.
 *   • Nothing is derived, scaled, averaged or extrapolated here.
 *   • A value is either present with the moment it was read, or absent.
 *   • `found === false` means VFB has no record for the id; we return an empty
 *     measurement set rather than substituting anything.
 *
 * What these numbers are *not*: biological measurements of a live animal. They
 * are counts and metadata fields as served by the Virtual Fly Brain API for a
 * specific ontology term / reconstruction, at a specific moment. The UI keeps
 * that distinction visible.
 */
import {
  getVFBConnectivity,
  getVFBHierarchy,
  getVFBImages,
  getVFBTermInfo,
} from "./queries";
import { VFB_SOURCE } from "./types";

export interface VfbMeasurement {
  /** Stable machine key — used to aggregate across observations. */
  key: string;
  /** Persian label shown in the results table. */
  label: string;
  value: number;
  unit?: string;
}

export interface VfbReadout {
  entityId: string;
  entityLabel: string;
  /** Always `VFB_SOURCE.name`; kept so the row is self-describing. */
  source: string;
  /** When these numbers were read from the API. */
  accessedAt: number;
  /** False when VFB returned no usable record for `entityId`. */
  found: boolean;
  measurements: VfbMeasurement[];
  /** Dataset / reconstruction identifiers exactly as returned (e.g. flywire783). */
  datasets: string[];
  /** Warnings, "not available" statements and resolution notes from VFB. */
  notes: string[];
}

export interface VfbReadoutRequest {
  id: string;
  label?: string;
  /**
   * Optional second neuron type. When present, a connectivity readout is added.
   * Edges are evidence for one reconstruction, not an absolute claim.
   */
  connectivityTo?: string;
  signal?: AbortSignal;
}

/** Append every defined, not-yet-present value to `target`. */
function uniquePush(target: string[], values: (string | undefined)[]): void {
  for (const v of values) {
    if (v && !target.includes(v)) target.push(v);
  }
}

function unique(values: (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const v of values) {
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

/**
 * Read everything Phase D records about one VFB entity.
 * Never throws for "VFB has no such entity" — it returns `found: false`.
 */
export async function runVfbReadout(request: VfbReadoutRequest): Promise<VfbReadout> {
  const measurements: VfbMeasurement[] = [];
  const datasets: string[] = [];
  const notes: string[] = [];
  const accessedAt = Date.now();

  const term = await getVFBTermInfo({ id: request.id, signal: request.signal });
  if (!term.found) {
    return {
      entityId: request.id,
      entityLabel: request.label ?? request.id,
      source: VFB_SOURCE.name,
      accessedAt,
      found: false,
      measurements: [],
      datasets: [],
      notes: [
        `VFB برای شناسهٔ ${request.id} هیچ رکوردی برنگرداند؛ هیچ عددی ثبت نشد.`,
      ],
    };
  }

  measurements.push(
    { key: "synonyms", label: "مترادف‌های ثبت‌شده", value: term.synonyms.length },
    { key: "publications", label: "مقالات ارجاع‌شده", value: term.publications.length },
    { key: "crossRefs", label: "ارجاع متقابل", value: term.crossRefs.length },
    { key: "superTypes", label: "زیرنوع‌های اعلام‌شده", value: term.superTypes.length },
    { key: "namedQueries", label: "پرس‌وجوهای نام‌دار", value: term.namedQueries.length },
  );

  const hierarchy = await getVFBHierarchy({ id: request.id, maxDepth: 1, signal: request.signal });
  measurements.push(
    { key: "ancestors", label: "نیا-نهاده‌ها (سطح ۱)", value: hierarchy.ancestors.length },
    { key: "descendants", label: "فرزند-نهاده‌ها (سطح ۱)", value: hierarchy.descendants.length },
  );

  const images = await getVFBImages({ id: request.id, signal: request.signal });
  measurements.push({ key: "images", label: "تصاویر ثبت‌شده", value: images.total });
  uniquePush(datasets, images.images.map((i) => i.dataset));
  if (images.raw.error) {
    notes.push(`تصاویر: VFB پرس‌وجو را برنگرداند (${images.raw.error}).`);
  }

  const downstream = (request.connectivityTo ?? "").trim();
  if (downstream.length > 0) {
    // Query with the FBbt id, not the display name: VFB resolves many names
    // ambiguously (`medulla` matches `transmedullary neuron`, `medulla columnar
    // neuron`, …) and would silently answer about a different class.
    const upstream = term.id || request.id;
    const connectivity = await getVFBConnectivity({
      upstreamType: upstream,
      downstreamType: downstream,
      signal: request.signal,
    });
    measurements.push({
      key: "connections",
      label: `یال‌های اتصال ${term.name || upstream} ← ${downstream}`,
      value: connectivity.count,
      unit: "یال",
    });

    const weights = connectivity.connections
      .map((c) => c.weight)
      .filter((w): w is number => typeof w === "number" && Number.isFinite(w));
    if (weights.length > 0) {
      measurements.push({
        key: "synapseWeightSum",
        label: "مجموع وزن سیناپسی یال‌های بازگشتی",
        value: weights.reduce((a, b) => a + b, 0),
      });
    } else {
      notes.push("VFB برای این جفت، وزن سیناپسی برنگرداند؛ این مقدار محاسبه یا حدس زده نشد.");
    }

    uniquePush(
      datasets,
      connectivity.connections.flatMap((c) => [c.upstreamDataSource, c.downstreamDataSource]),
    );
    notes.push(...connectivity.warnings);
    notes.push(
      ...connectivity.excludedDbs.map((db) => `VFB مجموعه‌دادهٔ ${db} را از این پرس‌وجو کنار گذاشت.`),
    );
  }

  const imageLicenses = unique(images.images.map((i) => i.license));
  if (imageLicenses.length > 0) {
    notes.push(`پروانهٔ تصاویر: ${imageLicenses.join("، ")}.`);
  }

  return {
    entityId: term.id || request.id,
    entityLabel: request.label ?? term.name,
    source: VFB_SOURCE.name,
    accessedAt,
    found: true,
    measurements,
    datasets,
    notes,
  };
}