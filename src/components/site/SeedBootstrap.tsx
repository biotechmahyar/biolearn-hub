import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

let seededThisSession = false;

export function SeedBootstrap() {
  const categories = useQuery(api.content.listCategories);
  const seed = useMutation(api.seed.run);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || seededThisSession) return;
    if (categories && categories.length === 0) {
      ran.current = true;
      seededThisSession = true;
      seed().catch(() => {});
    }
  }, [categories, seed]);

  return null;
}
