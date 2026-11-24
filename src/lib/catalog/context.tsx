"use client";

import { createContext, useContext } from "react";
import { iconFor, toneFor } from "./icons";
import { cohortLabelFromKey, courseByKey, optionName, subjectName, subjectOf, type CatalogLite, type Track } from "./shared";

const EMPTY: CatalogLite = { options: [], subjects: [], courses: [] };
const CatalogContext = createContext<CatalogLite>(EMPTY);

/** Makes subject / board / course names available to client components (provided once from the root layout). */
export function CatalogProvider({ value, children }: { value: CatalogLite; children: React.ReactNode }) {
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  return useContext(CatalogContext);
}

/** Subject metadata with the icon component and colour classes resolved. */
export function useSubject(slug: string) {
  const cat = useCatalog();
  const meta = subjectOf(cat, slug);
  return { meta, name: subjectName(cat, slug), Icon: iconFor(meta?.icon), tone: toneFor(meta?.tone) };
}

export function useCatalogLabels() {
  const cat = useCatalog();
  return {
    subjectName: (slug: string) => subjectName(cat, slug),
    optionName: (kind: "board" | "stream" | "exam", id: string | null | undefined, field?: "name" | "short") => optionName(cat, kind, id, field),
    courseName: (key: string | null | undefined) => courseByKey(cat, key)?.name ?? key ?? "",
    cohortLabel: (key: string | null | undefined) => cohortLabelFromKey(cat, key),
    trackLabel: (t: Track) => courseByKey(cat, t.kind === "school" ? `${t.board}-${t.grade}${t.stream ? `-${t.stream}` : ""}` : `exam-${t.exam}${t.stream ? `-${t.stream}` : ""}`)?.name ?? "",
  };
}
