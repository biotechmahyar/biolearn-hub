// ── usePageConfig hook ───────────────────────────────────────────────────
// Reads published page config from Convex and merges with defaults.
// Used by real React pages to apply Studio edits.

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { mergeSectionProps, SECTION_DEFAULTS } from "@/components/studio/pageRegistry";

export function usePageConfig(pageKey: string) {
  const config = useQuery(api.siteStudio.getPageConfig, { pageKey });

  // Returns a function to get merged props for a section.
  // If no config exists or section has no overrides, falls back to defaults.
  const getSection = (sectionId: string): Record<string, unknown> => {
    return mergeSectionProps(sectionId, config?.sections ?? null);
  };

  // Check if a section is visible (can be hidden by the editor).
  const isSectionVisible = (sectionId: string): boolean => {
    const props = config?.sections?.[sectionId] as Record<string, unknown> | undefined;
    if (!props) return true; // default: visible
    return props._visible !== false;
  };

  return {
    config,
    getSection,
    isSectionVisible,
    loaded: config !== undefined,
  };
}
