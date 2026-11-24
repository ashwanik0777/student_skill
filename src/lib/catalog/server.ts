import "server-only";
import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { catalogOptions, chapters, courseSubjects, courses, subjects, syllabi } from "@/lib/db/schema";
import {
  courseByKey,
  courseForTrack,
  subjectName as liteSubjectName,
  trackKey,
  type CatalogData,
  type CatalogLite,
  type Chapter,
  type CourseConfig,
  type CourseSubject,
  type SubjectMeta,
  type SyllabusInfo,
  type Track,
} from "./shared";

export const CATALOG_TAG = "catalog";
export const BANK_TAG = "question-bank";

/**
 * The whole catalog (boards/exams, subjects, chapter lists, courses) in one cached read. It changes only when an
 * admin edits it, so every admin action on these tables calls `updateTag(CATALOG_TAG)`.
 */
export async function getCatalog(): Promise<CatalogData> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  const [optionRows, subjectRows, syllabusRows, chapterRows, courseRows, courseSubjectRows] = await Promise.all([
    db.select().from(catalogOptions).orderBy(asc(catalogOptions.sort), asc(catalogOptions.name)),
    db.select().from(subjects).orderBy(asc(subjects.sort), asc(subjects.name)),
    db.select().from(syllabi).orderBy(asc(syllabi.sort), asc(syllabi.title)),
    db.select().from(chapters).orderBy(asc(chapters.syllabusId), asc(chapters.sort), asc(chapters.name)),
    db.select().from(courses).orderBy(asc(courses.sort), asc(courses.name)),
    db.select().from(courseSubjects).orderBy(asc(courseSubjects.courseKey), asc(courseSubjects.sort)),
  ]);

  const chaptersBySyllabus = new Map<string, Chapter[]>();
  for (const c of chapterRows) {
    const list = chaptersBySyllabus.get(c.syllabusId) ?? [];
    list.push({ name: c.name, unit: c.unit });
    chaptersBySyllabus.set(c.syllabusId, list);
  }
  const syllabusList: SyllabusInfo[] = syllabusRows.map((s) => ({
    id: s.id,
    subjectSlug: s.subjectSlug,
    title: s.title,
    note: s.note,
    sort: s.sort,
    chapters: chaptersBySyllabus.get(s.id) ?? [],
  }));
  const syllabusById = new Map(syllabusList.map((s) => [s.id, s]));

  const subjectList: SubjectMeta[] = subjectRows.map((s) => ({ slug: s.slug, name: s.name, short: s.short, icon: s.icon, tone: s.tone, sort: s.sort, active: s.active }));

  const bySubjectCourse = new Map<string, CourseSubject[]>();
  for (const cs of courseSubjectRows) {
    const seen = new Set<string>();
    const resolved: Chapter[] = [];
    for (const id of cs.syllabusIds) {
      for (const ch of syllabusById.get(id)?.chapters ?? []) {
        if (seen.has(ch.name)) continue;
        seen.add(ch.name);
        resolved.push(ch);
      }
    }
    const list = bySubjectCourse.get(cs.courseKey) ?? [];
    list.push({ slug: cs.subjectSlug, chapters: resolved, syllabusIds: cs.syllabusIds, borrowIds: cs.borrowIds, strict: cs.strict, sort: cs.sort });
    bySubjectCourse.set(cs.courseKey, list);
  }

  const courseConfigs: CourseConfig[] = courseRows.map((c) => {
    const track: Track =
      c.kind === "school"
        ? { kind: "school", board: c.board ?? "", grade: c.grade ?? 0, stream: c.stream }
        : { kind: "exam", exam: c.exam ?? "", stream: c.stream };
    const weekly = c.weekly;
    return {
      key: c.key,
      track,
      name: c.name,
      label: c.name,
      short: c.short,
      cohortKey: c.cohortKey,
      cohortLabel: c.cohortLabel,
      cohort: { key: c.cohortKey, label: c.cohortLabel },
      audience: c.audience,
      isExam: c.kind === "exam",
      active: c.active,
      sort: c.sort,
      subjects: (bySubjectCourse.get(c.key) ?? []).sort((a, b) => a.sort - b.sort),
      subjectSlugs: (bySubjectCourse.get(c.key) ?? []).sort((a, b) => a.sort - b.sort).map((s) => s.slug),
      daily: { questions: c.dailyQuestions, durationSec: c.dailyDurationSec },
      weekly: { ...weekly, questions: weekly.parts.reduce((n, p) => n + p.count, 0) },
    };
  });

  return {
    options: optionRows.map((o) => ({
      kind: o.kind,
      id: o.id,
      name: o.name,
      short: o.short,
      description: o.description,
      note: o.note,
      groupKey: o.groupKey,
      needsStream: o.needsStream,
      sort: o.sort,
      active: o.active,
    })),
    subjects: subjectList,
    courses: courseConfigs.map(({ key, track, name, short, cohortKey, cohortLabel, active, sort, subjectSlugs }) => ({ key, track, name, short, cohortKey, cohortLabel, active, sort, subjectSlugs })),
    syllabi: syllabusList,
    courseConfigs,
  };
}

/** The part of the catalog that is sent to the browser (names and summaries only). */
export async function getCatalogLite(): Promise<CatalogLite> {
  const { options, subjects, courses } = await getCatalog();
  return { options, subjects, courses };
}

export async function getCourseConfig(trackOrKey: Track | string | null | undefined): Promise<CourseConfig | null> {
  if (!trackOrKey) return null;
  const key = typeof trackOrKey === "string" ? trackOrKey : trackKey(trackOrKey);
  const cat = await getCatalog();
  return cat.courseConfigs.find((c) => c.key === key) ?? null;
}

export async function getSubjectMeta(slug: string): Promise<SubjectMeta | undefined> {
  const cat = await getCatalog();
  return cat.subjects.find((s) => s.slug === slug);
}

export async function subjectName(slug: string) {
  return liteSubjectName(await getCatalog(), slug);
}

export { courseByKey, courseForTrack };

/** Fallback questions of a subject across the given pools; cached until an admin edits the bank. */
export async function getBankPool(poolIds: string[], subjectSlug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(BANK_TAG);
  if (poolIds.length === 0) return [];
  const rows = await db.query.bankQuestions.findMany({
    where: (q, { and, eq, inArray }) => and(inArray(q.syllabusId, poolIds), eq(q.subjectSlug, subjectSlug), eq(q.active, true), eq(q.review, "approved")),
    columns: { id: true, syllabusId: true, chapter: true, topic: true, text: true, options: true, correctIndex: true, explanation: true, difficulty: true },
  });
  return rows;
}

export type BankPoolQuestion = Awaited<ReturnType<typeof getBankPool>>[number];
