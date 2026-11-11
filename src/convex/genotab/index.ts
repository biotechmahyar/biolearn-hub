/**
 * ژن‌آموز (Genotab) — assembled curriculum.
 * Content modules are split by chapter to keep each file reviewable.
 */
import type { Chapter, Course, Lesson, Subject } from "./model";
import {
  CELL_BIOLOGY_CHAPTERS,
  CELL_BIOLOGY_COURSE,
  CELL_BIOLOGY_REFERENCES,
  SUBJECTS,
} from "./model";
import { CH1_LESSONS_PART_A, CH1_LESSONS_PART_B } from "./lessons/ch1";
import { CH2_LESSONS_PART_A } from "./lessons/ch2";
import { CH3_LESSONS_PART_A } from "./lessons/ch3";
import { CH4_LESSONS_PART_A } from "./lessons/ch4";

export const ALL_LESSONS: Lesson[] = [
  ...CH1_LESSONS_PART_A,
  ...CH1_LESSONS_PART_B,
  ...CH2_LESSONS_PART_A,
  ...CH3_LESSONS_PART_A,
  ...CH4_LESSONS_PART_A,
].sort((a, b) => a.order - b.order);

export const COURSES: Course[] = [CELL_BIOLOGY_COURSE];
export const CHAPTERS: Chapter[] = [...CELL_BIOLOGY_CHAPTERS].sort((a, b) => a.order - b.order);
export const SUBJECT_LIST: Subject[] = [...SUBJECTS].sort((a, b) => a.order - b.order);
export { CELL_BIOLOGY_REFERENCES };

const LESSON_BY_ID = new Map(ALL_LESSONS.map((lesson) => [lesson.id, lesson]));
const CHAPTER_BY_ID = new Map(CHAPTERS.map((chapter) => [chapter.id, chapter]));
const COURSE_BY_SLUG = new Map(COURSES.map((course) => [course.slug, course]));

export function lessonById(id: string): Lesson | null {
  return LESSON_BY_ID.get(id) ?? null;
}

export function chapterById(id: string): Chapter | null {
  return CHAPTER_BY_ID.get(id) ?? null;
}

export function courseBySlug(slug: string): Course | null {
  return COURSE_BY_SLUG.get(slug) ?? null;
}

export function lessonsOfChapter(chapterId: string): Lesson[] {
  const chapter = CHAPTER_BY_ID.get(chapterId);
  if (!chapter) return [];
  return chapter.lessonIds
    .map((id) => LESSON_BY_ID.get(id))
    .filter((lesson): lesson is Lesson => Boolean(lesson));
}

export function lessonsOfCourse(courseSlug: string): Lesson[] {
  const course = COURSE_BY_SLUG.get(courseSlug);
  if (!course) return [];
  return course.chapterIds.flatMap((chapterId) => lessonsOfChapter(chapterId));
}

export function chapterOfLesson(lesson: Lesson): Chapter | null {
  return CHAPTER_BY_ID.get(lesson.chapterId) ?? null;
}

/** Every exercise of a lesson (practice + bank), keyed for authoritative grading. */
export function exerciseById(lesson: Lesson, exerciseId: string) {
  return (
    lesson.practice.find((exercise) => exercise.id === exerciseId) ??
    lesson.bank.find((exercise) => exercise.id === exerciseId) ??
    null
  );
}

export function findExercise(exerciseId: string): { lesson: Lesson; exercise: Lesson["bank"][number] } | null {
  for (const lesson of ALL_LESSONS) {
    const exercise = exerciseById(lesson, exerciseId);
    if (exercise) return { lesson, exercise };
  }
  return null;
}

/** Chapter exam: 15 questions drawn from the chapter's 50-question bank. */
export function chapterExamPool(chapterId: string) {
  return lessonsOfChapter(chapterId).flatMap((lesson) => lesson.bank);
}

/** Final exam pool: the whole course bank (200 questions). */
export function courseExamPool(courseSlug: string) {
  return lessonsOfCourse(courseSlug).flatMap((lesson) => lesson.bank);
}

export const CURRICULUM_SUMMARY = {
  subjects: SUBJECT_LIST.length,
  courses: COURSES.length,
  chapters: CHAPTERS.length,
  lessons: ALL_LESSONS.length,
  bankQuestions: ALL_LESSONS.reduce((sum, lesson) => sum + lesson.bank.length, 0),
  practiceExercises: ALL_LESSONS.reduce((sum, lesson) => sum + lesson.practice.length, 0),
  plannedLessons: SUBJECT_LIST.length * 20,
};
