/** Runs once when the server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { warmUpDatabase } = await import("@/lib/db");
  // Don't hold up startup; just get connections opening in the background.
  void warmUpDatabase();
}
