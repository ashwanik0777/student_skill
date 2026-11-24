#!/usr/bin/env node
/**
 * Loads the starter catalog (boards, exams, courses, subjects, chapters and the hand-checked question bank)
 * from scripts/catalog-seed.json into the database.
 *
 *   npm run catalog:seed
 *
 * Safe to re-run: existing rows are left untouched (nothing an admin edited is overwritten);
 * only missing rows are added.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Run this from the project folder so .env is loaded.");
  process.exit(1);
}
const seed = JSON.parse(readFileSync(new URL("./catalog-seed.json", import.meta.url), "utf8"));

const url = new URL(process.env.DATABASE_URL);
const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
const ssl = !local && url.searchParams.get("sslmode") !== "disable";
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const client = new pg.Client({ connectionString: url.toString(), ssl });
await client.connect();

/** Multi-row insert with ON CONFLICT DO NOTHING; returns the number of rows actually inserted. */
async function insertMany(table, columns, rows, conflict, chunk = 200) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const params = [];
    const values = slice
      .map((row) => `(${columns.map((c) => { params.push(row[c]); return `$${params.length}`; }).join(", ")})`)
      .join(", ");
    const cols = columns.map((c) => `"${c}"`).join(", ");
    const res = await client.query(`insert into ${table} (${cols}) values ${values} on conflict ${conflict} do nothing`, params);
    inserted += res.rowCount ?? 0;
  }
  return inserted;
}
const json = (v) => JSON.stringify(v);

try {
  await client.query("begin");

  const options = await insertMany(
    "catalog_options",
    ["kind", "id", "name", "short", "description", "note", "group_key", "needs_stream", "sort"],
    seed.options.map((o) => ({ kind: o.kind, id: o.id, name: o.name, short: o.short, description: o.description, note: o.note, group_key: o.groupKey, needs_stream: o.needsStream, sort: o.sort })),
    "(kind, id)",
  );

  const subjects = await insertMany(
    "subjects",
    ["slug", "name", "short", "icon", "tone", "sort"],
    seed.subjects,
    "(slug)",
  );

  const syllabi = await insertMany(
    "syllabi",
    ["id", "subject_slug", "title", "note", "sort"],
    seed.syllabi.map((s, i) => ({ id: s.id, subject_slug: s.subjectSlug, title: s.title, note: s.note, sort: i })),
    "(id)",
  );

  const chapterRows = seed.syllabi.flatMap((s) => s.chapters.map((c, i) => ({ id: randomUUID(), syllabus_id: s.id, name: c.name, unit: c.unit, sort: i })));
  const chapters = await insertMany("chapters", ["id", "syllabus_id", "name", "unit", "sort"], chapterRows, "(syllabus_id, name)");

  const courses = await insertMany(
    "courses",
    ["key", "kind", "board", "grade", "stream", "exam", "name", "short", "cohort_key", "cohort_label", "audience", "daily_questions", "daily_duration_sec", "weekly", "sort"],
    seed.courses.map((c) => ({
      key: c.key, kind: c.kind, board: c.board, grade: c.grade, stream: c.stream, exam: c.exam, name: c.name, short: c.short,
      cohort_key: c.cohortKey, cohort_label: c.cohortLabel, audience: c.audience, daily_questions: c.dailyQuestions,
      daily_duration_sec: c.dailyDurationSec, weekly: json(c.weekly), sort: c.sort,
    })),
    "(key)",
  );

  const courseSubjects = await insertMany(
    "course_subjects",
    ["id", "course_key", "subject_slug", "syllabus_ids", "borrow_ids", "strict", "sort"],
    seed.courses.flatMap((c) => c.subjects.map((s) => ({ id: randomUUID(), course_key: c.key, subject_slug: s.slug, syllabus_ids: json(s.syllabusIds), borrow_ids: json(s.borrowIds), strict: s.strict, sort: s.sort }))),
    "(course_key, subject_slug)",
  );

  const questions = await insertMany(
    "bank_questions",
    ["id", "syllabus_id", "subject_slug", "chapter", "topic", "text", "options", "correct_index", "explanation", "difficulty", "source"],
    seed.questions.map((q) => ({ id: q.id, syllabus_id: q.syllabusId, subject_slug: q.subjectSlug, chapter: q.chapter, topic: q.topic, text: q.text, options: json(q.options), correct_index: q.correctIndex, explanation: q.explanation, difficulty: q.difficulty, source: "seed" })),
    "(id)",
  );

  await client.query("commit");
  console.log(`✓ Catalog seeded — new rows: ${options} options, ${subjects} subjects, ${syllabi} syllabi, ${chapters} chapters, ${courses} courses, ${courseSubjects} course subjects, ${questions} questions.`);
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
