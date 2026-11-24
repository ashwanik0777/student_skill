/** Post-login redirect target: only same-origin relative paths are allowed. */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/dashboard";
  return value;
}

/** Reads `?next=` from the current URL at event time (keeps the auth pages fully static). */
export function nextFromLocation(): string {
  return safeNext(new URLSearchParams(window.location.search).get("next"));
}
