import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

let seededThisSession = false;

export function SeedBootstrap() {
  const categories = useQuery(api.content.listCategories, {});
  const seed = useMutation(api.seed.run);
  const refreshBrand = useMutation(api.seed.refreshBrand);
  const ensureAdmin = useMutation(api.seed.ensureAdmin);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (categories === undefined) {
      ran.current = false;
      return;
    }
    if (categories.length === 0) {
      if (!seededThisSession) {
        seededThisSession = true;
        seed()
          .then(() => refreshBrand())
          .then(() => ensureAdmin())
          .catch(() => {});
      }
    } else {
      // Data already exists — keep copy in sync with the Genova brand.
      refreshBrand()
        .then(() => ensureAdmin())
        .catch(() => {});
    }
  }, [categories, seed, refreshBrand, ensureAdmin]);

  return null;
}
