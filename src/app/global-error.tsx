"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, background: "#fafafa", color: "#18181b" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>TestPrep hit a snag</h1>
          <p style={{ color: "#71717a" }}>Please reload the page.</p>
          <button
            onClick={reset}
            style={{ marginTop: 12, padding: "10px 18px", borderRadius: 12, border: 0, background: "#4f46e5", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
