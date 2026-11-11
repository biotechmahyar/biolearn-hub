/** TEMP content validator for ژن‌آموز — reports malformed exercises. */
import { ALL_LESSONS, CHAPTERS, CURRICULUM_SUMMARY } from "../src/convex/genotab/index";
import type { Exercise } from "../src/convex/genotab/model";

function problems(exercise: Exercise): string[] {
  const out: string[] = [];
  const raw = exercise as unknown as Record<string, unknown>;
  if (exercise.kind === "single") {
    if (typeof raw.answer !== "number") out.push("missing answer");
    else if (!exercise.options[raw.answer as number]) out.push("answer index out of range");
  }
  if (exercise.kind === "multi") {
    const answers = raw.answers as number[] | undefined;
    if (!Array.isArray(answers) || answers.length === 0) out.push("missing answers");
    else if (answers.some((i) => !exercise.options[i])) out.push("answers index out of range");
  }
  if (exercise.kind === "truefalse" && typeof raw.answer !== "boolean") out.push("missing answer");
  if (exercise.kind === "fill") {
    const accept = raw.accept as string[] | undefined;
    if (!Array.isArray(accept) || accept.length === 0) out.push("missing accept");
  }
  if (exercise.kind === "order" && (!Array.isArray(raw.items) || (raw.items as string[]).length < 3))
    out.push("order needs >=3 items");
  if (exercise.kind === "match" && (!Array.isArray(raw.pairs) || (raw.pairs as unknown[]).length < 3))
    out.push("match needs >=3 pairs");
  if (!exercise.explain || exercise.explain.length < 10) out.push("explain too short");
  if (!exercise.prompt) out.push("missing prompt");
  return out;
}

let bad = 0;
for (const lesson of ALL_LESSONS) {
  const groups: [string, Exercise[]][] = [
    ["practice", lesson.practice],
    ["bank", lesson.bank],
  ];
  for (const [name, list] of groups) {
    for (const exercise of list) {
      const issues = problems(exercise);
      if (issues.length) {
        bad++;
        console.log(`${lesson.id} ${name} ${exercise.id} (${exercise.kind}): ${issues.join(", ")}`);
      }
    }
  }
  if (lesson.practice.length < 3) console.log(`${lesson.id}: practice < 3 (${lesson.practice.length})`);
  if (lesson.bank.length < 10) console.log(`${lesson.id}: bank < 10 (${lesson.bank.length})`);
  if (lesson.cards.length < 5) console.log(`${lesson.id}: cards < 5 (${lesson.cards.length})`);
  if (!lesson.refs.length) console.log(`${lesson.id}: no references`);
}

const ids = new Set<string>();
for (const lesson of ALL_LESSONS) {
  for (const exercise of [...lesson.practice, ...lesson.bank]) {
    if (ids.has(exercise.id)) console.log(`duplicate exercise id: ${exercise.id}`);
    ids.add(exercise.id);
  }
}

console.log("summary:", CURRICULUM_SUMMARY);
console.log("chapters:", CHAPTERS.map((c) => `${c.id}:${c.lessonIds.length}`).join(" "));
console.log("malformed exercises:", bad);
