import {
  Atom,
  BookOpen,
  Database,
  Dna,
  FlaskConical,
  GraduationCap,
  GitBranch,
  Layers,
  Microscope,
  Shield,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  microscope: Microscope,
  dna: Dna,
  branch: GitBranch,
  flask: FlaskConical,
  atom: Atom,
  shield: Shield,
  database: Database,
  graduation: GraduationCap,
};

export function iconFor(key?: string | null): LucideIcon {
  return (key && ICONS[key]) || FlaskConical;
}

export function productIconFor(type?: string | null): LucideIcon {
  if (type === "flashcards") return Layers;
  if (type === "poster") return ImageIcon;
  return BookOpen;
}
