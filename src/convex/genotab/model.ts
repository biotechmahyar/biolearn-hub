/**
 * ژن‌آموز (Genotab) — content model
 * ─────────────────────────────────────────────────────────────────────────────
 * The curriculum is versioned code owned by the server, exactly like the
 * Virtual Lab catalog: stable string ids, typed data, no hidden answers in the
 * client. Student progress lives in the `genotab*` tables.
 *
 * Scientific policy for this content:
 *   • Every claim follows an open textbook or a peer-review-level reference
 *     listed in `CELL_BIOLOGY_REFERENCES` (OpenStax Biology 2e, Alberts
 *     Molecular Biology of the Cell, NCBI Bookshelf, Nikon MicroscopyU).
 *   • Explanations are written originally in Persian (no copied textbook text).
 *   • Diagrams are original vector drawings (`diagram` keys) — no unlicensed
 *     third-party images.
 *   • Visuals never replace a real laboratory procedure; simulations are
 *     labelled as simulations.
 */

export type Level = "beginner" | "intermediate" | "advanced";

export type DiagramKey =
  | "life-levels"
  | "cell-overview"
  | "prokaryote-eukaryote"
  | "plant-animal"
  | "microscope"
  | "membrane"
  | "membrane-proteins"
  | "transport"
  | "active-transport"
  | "vesicular"
  | "nucleus"
  | "er-ribosome"
  | "golgi"
  | "mitochondrion"
  | "chloroplast"
  | "cytoskeleton"
  | "cell-cycle"
  | "mitosis"
  | "meiosis"
  | "apoptosis";

export interface TermPair {
  fa: string;
  en: string;
}

export interface LessonCard {
  id: string;
  title: string;
  body: string;
  terms?: TermPair[];
  diagram?: DiagramKey;
  /** What the learner should look at in the diagram / image. */
  caption?: string;
  /** Short laboratory or real-world connection. */
  lab?: string;
}

export type ExerciseKind = "single" | "multi" | "truefalse" | "fill" | "order" | "match";

interface ExerciseBase {
  id: string;
  kind: ExerciseKind;
  prompt: string;
  /** Why the correct answer is correct (shown only after answering). */
  explain: string;
}

export interface SingleExercise extends ExerciseBase {
  kind: "single";
  options: string[];
  answer: number;
}

export interface MultiExercise extends ExerciseBase {
  kind: "multi";
  options: string[];
  answers: number[];
}

export interface TrueFalseExercise extends ExerciseBase {
  kind: "truefalse";
  answer: boolean;
}

export interface FillExercise extends ExerciseBase {
  kind: "fill";
  /** Accepted answers (compared case/space-insensitively). */
  accept: string[];
}

export interface OrderExercise extends ExerciseBase {
  kind: "order";
  /** Items in the CORRECT order; the client shuffles them for display. */
  items: string[];
}

export interface MatchExercise extends ExerciseBase {
  kind: "match";
  /** Left → right pairs; the client shuffles the right column. */
  pairs: { left: string; right: string }[];
}

export type Exercise =
  | SingleExercise
  | MultiExercise
  | TrueFalseExercise
  | FillExercise
  | OrderExercise
  | MatchExercise;

export interface PracticalSection {
  title: string;
  /** `concept` = explanation only, `simulation` = virtual, `protocol` = real lab. */
  mode: "concept" | "simulation" | "protocol";
  body: string;
  items?: string[];
  safety?: string;
}

export interface Lesson {
  id: string;
  courseSlug: string;
  chapterId: string;
  order: number;
  slug: string;
  titleFa: string;
  titleEn: string;
  level: Level;
  minutes: number;
  intro: string;
  why: string;
  objectives: string[];
  cards: LessonCard[];
  practical?: PracticalSection;
  /** Ungraded practice, shown after the cards. At least three per lesson. */
  practice: Exercise[];
  /** Question bank (≥10). Assessments draw randomised subsets from it. */
  bank: Exercise[];
  summary: {
    takeaways: string[];
    terms: TermPair[];
    review: string[];
  };
  /** Reference keys from CELL_BIOLOGY_REFERENCES. */
  refs: string[];
}

export interface Chapter {
  id: string;
  courseSlug: string;
  order: number;
  titleFa: string;
  titleEn: string;
  description: string;
  lessonIds: string[];
}

export interface Course {
  slug: string;
  subjectId: string;
  titleFa: string;
  titleEn: string;
  description: string;
  level: Level | "mixed";
  hours: number;
  prerequisites: string;
  status: "published" | "in_production";
  chapterIds: string[];
}

export interface Subject {
  id: string;
  order: number;
  titleFa: string;
  titleEn: string;
  phase: 1 | 2;
  blurb: string;
  icon: string;
  status: "published" | "in_production";
  courseSlugs: string[];
}

export interface Reference {
  key: string;
  label: string;
  url: string;
  note?: string;
}

/** Citation registry — the only URLs the lessons may point to. */
export const CELL_BIOLOGY_REFERENCES: Record<string, Reference> = {
  "openstax-studying-cells": {
    key: "openstax-studying-cells",
    label: "OpenStax Biology 2e — Studying Cells (4.1)",
    url: "https://openstax.org/books/biology-2e/pages/4-1-studying-cells",
  },
  "openstax-prokaryotic": {
    key: "openstax-prokaryotic",
    label: "OpenStax Biology 2e — Prokaryotic Cells (4.2)",
    url: "https://openstax.org/books/biology-2e/pages/4-2-prokaryotic-cells",
  },
  "openstax-eukaryotic": {
    key: "openstax-eukaryotic",
    label: "OpenStax Biology 2e — Eukaryotic Cells (4.3)",
    url: "https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells",
  },
  "openstax-endomembrane": {
    key: "openstax-endomembrane",
    label: "OpenStax Biology 2e — Endomembrane System (4.4)",
    url: "https://openstax.org/books/biology-2e/pages/4-4-the-endomembrane-system-and-proteins",
  },
  "openstax-membrane": {
    key: "openstax-membrane",
    label: "OpenStax Biology 2e — Components and Structure of Membranes (5.1)",
    url: "https://openstax.org/books/biology-2e/pages/5-1-components-and-structure",
  },
  "openstax-passive": {
    key: "openstax-passive",
    label: "OpenStax Biology 2e — Passive Transport (5.2)",
    url: "https://openstax.org/books/biology-2e/pages/5-2-passive-transport",
  },
  "openstax-active": {
    key: "openstax-active",
    label: "OpenStax Biology 2e — Active Transport (5.3)",
    url: "https://openstax.org/books/biology-2e/pages/5-3-active-transport",
  },
  "openstax-cell-cycle": {
    key: "openstax-cell-cycle",
    label: "OpenStax Biology 2e — The Cell Cycle (10.2)",
    url: "https://openstax.org/books/biology-2e/pages/10-2-the-cell-cycle",
  },
  "openstax-cycle-control": {
    key: "openstax-cycle-control",
    label: "OpenStax Biology 2e — Control of the Cell Cycle (10.3)",
    url: "https://openstax.org/books/biology-2e/pages/10-3-control-of-the-cell-cycle",
  },
  "openstax-cancer": {
    key: "openstax-cancer",
    label: "OpenStax Biology 2e — Cancer and the Cell Cycle (10.4)",
    url: "https://openstax.org/books/biology-2e/pages/10-4-cancer-and-the-cell-cycle",
  },
  "alberts-visualizing": {
    key: "alberts-visualizing",
    label: "Alberts et al., Molecular Biology of the Cell — Visualizing Cells",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK21048/",
    note: "NCBI Bookshelf, 4th edition",
  },
  "alberts-mboc": {
    key: "alberts-mboc",
    label: "Alberts et al., Molecular Biology of the Cell (NCBI Bookshelf)",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK21054/",
  },
  "ncbi-bookshelf": {
    key: "ncbi-bookshelf",
    label: "NCBI Bookshelf",
    url: "https://www.ncbi.nlm.nih.gov/books/",
  },
  "nikon-micrscopyu": {
    key: "nikon-micrscopyu",
    label: "Nikon MicroscopyU — Microscopy concepts and optics",
    url: "https://www.microscopyu.com/",
  },
  "hhmi-biointeractive": {
    key: "hhmi-biointeractive",
    label: "HHMI BioInteractive — animations and classroom activities",
    url: "https://www.biointeractive.org/",
  },
};

// ── Curriculum: nine subjects (spec §3) ─────────────────────────────────────

export const SUBJECTS: Subject[] = [
  {
    id: "cell-biology",
    order: 1,
    titleFa: "زیست‌شناسی سلولی",
    titleEn: "Cell Biology",
    phase: 1,
    blurb: "ساختار و عملکرد سلول؛ از غشا و اندامک‌ها تا چرخه سلولی و مرگ برنامه‌ریزی‌شده.",
    icon: "cell",
    status: "published",
    courseSlugs: ["cell-biology-intro"],
  },
  {
    id: "molecular-biology",
    order: 2,
    titleFa: "زیست‌شناسی مولکولی",
    titleEn: "Molecular Biology",
    phase: 1,
    blurb: "DNA، رونویسی، ترجمه و تنظیم بیان ژن در سطح مولکولی.",
    icon: "dna",
    status: "in_production",
    courseSlugs: [],
  },
  {
    id: "genetics",
    order: 3,
    titleFa: "ژنتیک و ژنومیکس",
    titleEn: "Genetics & Genomics",
    phase: 1,
    blurb: "وراثت مندلی، ژنوم، جهش و ابزارهای ژنومیک.",
    icon: "chromosome",
    status: "in_production",
    courseSlugs: [],
  },
  {
    id: "biochemistry",
    order: 4,
    titleFa: "بیوشیمی",
    titleEn: "Biochemistry",
    phase: 1,
    blurb: "ماکرومولکول‌ها، آنزیم‌ها و مسیرهای تولید انرژی.",
    icon: "molecule",
    status: "in_production",
    courseSlugs: [],
  },
  {
    id: "microbiology",
    order: 5,
    titleFa: "میکروبیولوژی",
    titleEn: "Microbiology",
    phase: 1,
    blurb: "باکتری، قارچ و ویروس؛ کشت، رنگ‌آمیزی و کنترل رشد.",
    icon: "microbe",
    status: "in_production",
    courseSlugs: [],
  },
  {
    id: "immunology",
    order: 6,
    titleFa: "ایمونولوژی",
    titleEn: "Immunology",
    phase: 1,
    blurb: "ایمنی ذاتی و اکتسابی، آنتی‌بادی و پاسخ ایمنی.",
    icon: "shield",
    status: "in_production",
    courseSlugs: [],
  },
  {
    id: "virology",
    order: 7,
    titleFa: "ویروس‌شناسی",
    titleEn: "Virology",
    phase: 2,
    blurb: "ساختار ویروس، چرخه تکثیر و ویروس‌های مهم انسانی.",
    icon: "virus",
    status: "in_production",
    courseSlugs: [],
  },
  {
    id: "biotechnology",
    order: 8,
    titleFa: "بیوتکنولوژی",
    titleEn: "Biotechnology",
    phase: 2,
    blurb: "DNA نوترکیب، PCR، بیان پروتئین و کاربردهای صنعتی.",
    icon: "flask",
    status: "in_production",
    courseSlugs: [],
  },
  {
    id: "bioinformatics",
    order: 9,
    titleFa: "بیوانفورماتیک",
    titleEn: "Bioinformatics",
    phase: 2,
    blurb: "همترازی توالی، بانک‌های زیستی و تحلیل داده‌های زیستی.",
    icon: "laptop",
    status: "in_production",
    courseSlugs: [],
  },
];

export const CELL_BIOLOGY_COURSE: Course = {
  slug: "cell-biology-intro",
  subjectId: "cell-biology",
  titleFa: "زیست‌شناسی سلولی",
  titleEn: "Cell Biology",
  description:
    "مقدمه‌ای تعاملی بر ساختار، سازمان‌دهی و عملکرد سلول‌های زنده: نظریه سلولی، میکروسکوپ، غشا، انتقال مواد، اندامک‌ها، چرخه سلولی و مرگ برنامه‌ریزی‌شده — همراه با پیوند مفاهیم به کار آزمایشگاهی.",
  level: "mixed",
  hours: 8,
  prerequisites: "بدون پیش‌نیاز",
  status: "published",
  chapterIds: ["cb-ch1", "cb-ch2", "cb-ch3", "cb-ch4"],
};

export const CELL_BIOLOGY_CHAPTERS: Chapter[] = [
  {
    id: "cb-ch1",
    courseSlug: "cell-biology-intro",
    order: 1,
    titleFa: "مبانی زیست‌شناسی سلولی",
    titleEn: "Foundations of Cell Biology",
    description: "حیات چیست، سلول چگونه کشف شد و چگونه آن را می‌بینیم.",
    lessonIds: ["cb-1", "cb-2", "cb-3", "cb-4", "cb-5"],
  },
  {
    id: "cb-ch2",
    courseSlug: "cell-biology-intro",
    order: 2,
    titleFa: "غشای سلولی و انتقال مواد",
    titleEn: "Cell Membrane and Transport",
    description: "مرز سلول: ساختار غشا و راه‌هایی که مواد از آن عبور می‌کنند.",
    lessonIds: ["cb-6", "cb-7", "cb-8", "cb-9", "cb-10"],
  },
  {
    id: "cb-ch3",
    courseSlug: "cell-biology-intro",
    order: 3,
    titleFa: "اندامک‌ها و سازمان‌دهی سلولی",
    titleEn: "Cellular Organelles and Organization",
    description: "تقسیم کار درون سلول: هسته، ریبوزوم، ER، گلژی، میتوکندری و اسکلت سلولی.",
    lessonIds: ["cb-11", "cb-12", "cb-13", "cb-14", "cb-15"],
  },
  {
    id: "cb-ch4",
    courseSlug: "cell-biology-intro",
    order: 4,
    titleFa: "چرخه سلولی، تقسیم و مرگ سلولی",
    titleEn: "Cell Cycle, Division and Cell Death",
    description: "سلول چگونه تکثیر می‌شود، چگونه مهار می‌شود و چگونه می‌میرد.",
    lessonIds: ["cb-16", "cb-17", "cb-18", "cb-19", "cb-20"],
  },
];

/** Plan-level totals shown in the UI, derived from the curriculum below. */
export const CURRICULUM_TOTALS = {
  subjects: SUBJECTS.length,
  plannedCourses: SUBJECTS.length,
  lessonsPerCourse: 20,
  plannedLessons: SUBJECTS.length * 20,
};
