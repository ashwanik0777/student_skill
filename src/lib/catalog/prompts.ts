import type { CourseConfig } from "./shared";

const TEMPLATES = [
  (c: string) => `Explain ${c} simply with an example`,
  (c: string) => `Give me 5 quick revision points on ${c}`,
  (c: string) => `What are the most important exam questions from ${c}?`,
  (c: string) => `Help me understand the toughest idea in ${c}`,
];

/** Course-aware starter questions for the AI tutor. */
export function suggestedPrompts(config: CourseConfig, subjectName: (slug: string) => string, weak?: { chapter: string } | null, limit = 6) {
  const out: { subject: string; label: string; text: string }[] = [];
  if (weak) out.push({ subject: "", label: "Your weak spot", text: `Explain ${weak.chapter} simply with an example` });
  config.subjects.forEach((s, i) => {
    if (!s.chapters.length) return;
    const chapter = s.chapters[Math.floor(s.chapters.length / 2) + (i % 2)]?.name ?? s.chapters[0].name;
    const text = s.slug === "hindi" ? `“${chapter}” को सरल शब्दों में समझाइए` : TEMPLATES[i % TEMPLATES.length](chapter);
    out.push({ subject: s.slug, label: subjectName(s.slug), text });
  });
  return out.slice(0, limit);
}
