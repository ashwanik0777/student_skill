/**
 * Questions are shown as plain text, so LaTeX and ASCII maths ("\frac{5}{8}", "$m$", "x^2", "a_n", "E_0") are turned
 * into readable Unicode ("5/8", "m", "x²", "aₙ", "E₀"). Currency like "$5" and code identifiers like "max_value" are
 * left alone. Don't use it on programming questions (carets and underscores mean something there).
 */

const SUP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "-": "⁻", "−": "⁻", "+": "⁺", n: "ⁿ", i: "ⁱ", x: "ˣ", "(": "⁽", ")": "⁾",
};
const SUB: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  a: "ₐ", e: "ₑ", i: "ᵢ", k: "ₖ", m: "ₘ", n: "ₙ", o: "ₒ", p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ", x: "ₓ", "+": "₊", "-": "₋",
};
const CMD: Record<string, string> = {
  times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓", le: "≤", leq: "≤", ge: "≥", geq: "≥", neq: "≠", ne: "≠", approx: "≈",
  equiv: "≡", propto: "∝", infty: "∞", pi: "π", theta: "θ", alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ",
  epsilon: "ε", lambda: "λ", mu: "μ", nu: "ν", omega: "ω", Omega: "Ω", sigma: "σ", Sigma: "Σ", phi: "φ", rho: "ρ", tau: "τ",
  eta: "η", circ: "°", degree: "°", rightarrow: "→", to: "→", leftarrow: "←", Rightarrow: "⇒", Leftrightarrow: "⇔",
  angle: "∠", triangle: "△", perp: "⊥", parallel: "∥", in: "∈", notin: "∉", cup: "∪", cap: "∩", subset: "⊂", subseteq: "⊆",
  emptyset: "∅", forall: "∀", exists: "∃", sum: "Σ", int: "∫", partial: "∂", nabla: "∇", ldots: "…", cdots: "⋯", dots: "…",
  quad: " ", qquad: "  ", prime: "′",
};
const FUNCS = /^(sin|cos|tan|cot|sec|csc|cosec|arcsin|arccos|arctan|sinh|cosh|tanh|log|ln|exp|lim|max|min|det|gcd|deg)$/;

const wrap = (s: string) => (/^[\w.√π°′]+$/.test(s.trim()) ? s.trim() : `(${s.trim()})`);
const mapAll = (s: string, table: Record<string, string>) => ([...s].every((c) => table[c]) ? [...s].map((c) => table[c]).join("") : null);

export function plainMath(input: string): string {
  // An escaped dollar (\$100) is a real dollar sign, not a math delimiter.
  let t = input.replace(/\\\$/g, "\u0000");
  if (/\\[a-zA-Z]|\$[^$\d\s][^$]*\$/.test(t)) {
    // $…$ / $$…$$ math delimiters — but not currency such as "$5 and $10".
    t = t.replace(/\$\$([^$]+)\$\$/g, "$1").replace(/\$([^$\d\s][^$]*?)\$/g, "$1");
    for (let i = 0; i < 3; i++) t = t.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, a: string, b: string) => `${wrap(a)}/${wrap(b)}`);
    t = t.replace(/\\[dt]?frac\s+(\w)\s*(\w)/g, "$1/$2"); // \frac 1x shorthand
    t = t.replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]*)\}/g, (_, n: string, a: string) => `${mapAll(n, SUP) ?? n}√${wrap(a)}`);
    t = t.replace(/\\sqrt\s*\{([^{}]*)\}/g, (_, a: string) => `√${wrap(a)}`);
    t = t.replace(/\\(?:text|mathrm|mathbf|textbf|textit|operatorname|mathit|mbox)\s*\{([^{}]*)\}/g, "$1");
    t = t.replace(/\\(?:left|right|big|Big|bigg|displaystyle)\b/g, "");
    t = t.replace(/\\([a-zA-Z]+)/g, (m, c: string) => CMD[c] ?? (FUNCS.test(c) ? c : m));
    t = t.replace(/\\([%$#&{}])/g, "$1").replace(/\\[,;:! ]/g, " ");
  }
  // Powers: x^2, 10^-6, e^{-x} (only when every character has a superscript form).
  t = t.replace(/\^\{([^{}]+)\}|\^([-−+]?\d+|[nix])(?![A-Za-z0-9])/g, (m, a?: string, b?: string) => mapAll(a ?? b ?? "", SUP) ?? m);
  // Subscripts: a_n, E_0, S_22, x_{12} — a single letter base, so identifiers like max_value stay as they are.
  t = t.replace(/(?<![A-Za-z0-9])([A-Za-z])_\{([^{}]+)\}|(?<![A-Za-z0-9])([A-Za-z])_(\d+|[a-z])(?![A-Za-z0-9])/g, (m, b1?: string, s1?: string, b2?: string, s2?: string) => {
    const sub = mapAll(s1 ?? s2 ?? "", SUB);
    return sub ? `${b1 ?? b2}${sub}` : m;
  });
  // "4.0 x 10^-7" written with the letter x as a multiplication sign.
  t = t.replace(/(\d)\s*[xX]\s*10(?=[⁰¹²³⁴⁵⁶⁷⁸⁹⁻])/g, "$1 × 10");
  return t.replace(/\u0000/g, "$").replace(/[ \t]{2,}/g, " ").trim();
}
