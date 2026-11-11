import type { ReactElement } from "react";
import type { DiagramKey } from "@/convex/genotab/model";
import {
  Chloroplast,
  Cytoskeleton,
  ErRibosome,
  Golgi,
  LifeLevels,
  Membrane,
  MembraneProteins,
  Microscope,
  Mitochondrion,
  Nucleus,
  PlantAnimal,
  ProkaryoteEukaryote,
  CellOverview,
} from "./diagrams/structures";
import { ActiveTransport, Apoptosis, CellCycle, Meiosis, Mitosis, Transport, Vesicular } from "./diagrams/processes";

const REGISTRY: Record<DiagramKey, () => ReactElement> = {
  "life-levels": LifeLevels,
  "cell-overview": CellOverview,
  "prokaryote-eukaryote": ProkaryoteEukaryote,
  "plant-animal": PlantAnimal,
  microscope: Microscope,
  membrane: Membrane,
  "membrane-proteins": MembraneProteins,
  transport: Transport,
  "active-transport": ActiveTransport,
  "vesicular": Vesicular,
  nucleus: Nucleus,
  "er-ribosome": ErRibosome,
  golgi: Golgi,
  mitochondrion: Mitochondrion,
  chloroplast: Chloroplast,
  cytoskeleton: Cytoskeleton,
  "cell-cycle": CellCycle,
  mitosis: Mitosis,
  meiosis: Meiosis,
  apoptosis: Apoptosis,
};

/**
 * Original Genotab diagram. Every drawing is authored for this course (SVG), so
 * no external image licence applies; the caption in the lesson explains what the
 * learner should look at.
 */
export function Diagram({ kind, className }: { kind: DiagramKey; className?: string }) {
  const Component = REGISTRY[kind];
  if (!Component) return null;
  return (
    <div className={className ?? "overflow-hidden rounded-2xl border border-emerald-900/10 bg-white"}>
      <Component />
    </div>
  );
}
