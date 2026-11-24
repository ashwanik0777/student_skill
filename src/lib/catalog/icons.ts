import {
  Atom,
  BookOpenText,
  Brain,
  BriefcaseBusiness,
  Calculator,
  CodeXml,
  Dna,
  Earth,
  Feather,
  FlaskConical,
  Globe,
  Hourglass,
  Landmark,
  Languages,
  Layers,
  Leaf,
  Lightbulb,
  Microscope,
  Music,
  Palette,
  PenLine,
  Scale,
  ScrollText,
  Sigma,
  Sparkles,
  TestTubeDiagonal,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Icons an admin can pick for a subject (stored by name). */
export const SUBJECT_ICONS = {
  Atom,
  BookOpenText,
  Brain,
  BriefcaseBusiness,
  Calculator,
  CodeXml,
  Dna,
  Earth,
  Feather,
  FlaskConical,
  Globe,
  Hourglass,
  Landmark,
  Languages,
  Layers,
  Leaf,
  Lightbulb,
  Microscope,
  Music,
  Palette,
  PenLine,
  Scale,
  ScrollText,
  Sigma,
  Sparkles,
  TestTubeDiagonal,
  TrendingUp,
  Trophy,
  Users,
} satisfies Record<string, LucideIcon>;

export type SubjectIconName = keyof typeof SUBJECT_ICONS;
export const SUBJECT_ICON_NAMES = Object.keys(SUBJECT_ICONS) as SubjectIconName[];

export function iconFor(name: string | null | undefined): LucideIcon {
  return (SUBJECT_ICONS as Record<string, LucideIcon>)[name ?? ""] ?? Layers;
}

export type SubjectTone = {
  /** Tinted tile / chip background with readable text. */
  soft: string;
  /** Solid swatch (dots, bars). */
  solid: string;
  /** Text / icon colour on neutral surfaces. */
  text: string;
  /** Raw colour for charts. */
  hex: string;
};

/* Full class strings are written out so Tailwind can see them. */
export const SUBJECT_TONES = {
  sky: { soft: "bg-sky-500/10 text-sky-700 dark:text-sky-300", solid: "bg-sky-500", text: "text-sky-600 dark:text-sky-400", hex: "#0ea5e9" },
  rose: { soft: "bg-rose-500/10 text-rose-700 dark:text-rose-300", solid: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", hex: "#f43f5e" },
  violet: { soft: "bg-violet-500/10 text-violet-700 dark:text-violet-300", solid: "bg-violet-500", text: "text-violet-600 dark:text-violet-400", hex: "#8b5cf6" },
  emerald: { soft: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", solid: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", hex: "#10b981" },
  amber: { soft: "bg-amber-500/10 text-amber-700 dark:text-amber-300", solid: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", hex: "#f59e0b" },
  blue: { soft: "bg-blue-500/10 text-blue-700 dark:text-blue-300", solid: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", hex: "#3b82f6" },
  teal: { soft: "bg-teal-500/10 text-teal-700 dark:text-teal-300", solid: "bg-teal-500", text: "text-teal-600 dark:text-teal-400", hex: "#14b8a6" },
  green: { soft: "bg-green-500/10 text-green-700 dark:text-green-300", solid: "bg-green-500", text: "text-green-600 dark:text-green-400", hex: "#22c55e" },
  orange: { soft: "bg-orange-500/10 text-orange-700 dark:text-orange-300", solid: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", hex: "#f97316" },
  cyan: { soft: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300", solid: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400", hex: "#06b6d4" },
  fuchsia: { soft: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300", solid: "bg-fuchsia-500", text: "text-fuchsia-600 dark:text-fuchsia-400", hex: "#d946ef" },
  red: { soft: "bg-red-500/10 text-red-700 dark:text-red-300", solid: "bg-red-500", text: "text-red-600 dark:text-red-400", hex: "#ef4444" },
  lime: { soft: "bg-lime-500/10 text-lime-700 dark:text-lime-300", solid: "bg-lime-500", text: "text-lime-700 dark:text-lime-400", hex: "#84cc16" },
  slate: { soft: "bg-slate-500/10 text-slate-700 dark:text-slate-300", solid: "bg-slate-500", text: "text-slate-600 dark:text-slate-400", hex: "#64748b" },
  pink: { soft: "bg-pink-500/10 text-pink-700 dark:text-pink-300", solid: "bg-pink-500", text: "text-pink-600 dark:text-pink-400", hex: "#ec4899" },
  indigo: { soft: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300", solid: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400", hex: "#6366f1" },
} satisfies Record<string, SubjectTone>;

export type SubjectToneName = keyof typeof SUBJECT_TONES;
export const SUBJECT_TONE_NAMES = Object.keys(SUBJECT_TONES) as SubjectToneName[];

export function toneFor(name: string | null | undefined): SubjectTone {
  return (SUBJECT_TONES as Record<string, SubjectTone>)[name ?? ""] ?? SUBJECT_TONES.indigo;
}
