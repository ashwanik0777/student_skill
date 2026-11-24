import { connection } from "next/server";
import { Suspense } from "react";
import { googleEnabled } from "@/lib/auth";
import { GoogleButton } from "./google-button";

async function GoogleButtonAtRequestTime() {
  await connection();
  return <GoogleButton enabled={googleEnabled} />;
}

/** Reads the env at request time (adding Google keys needs no rebuild); the rest of the auth page stays static. */
export function GoogleSlot() {
  return (
    <Suspense fallback={<GoogleButton enabled={false} pending />}>
      <GoogleButtonAtRequestTime />
    </Suspense>
  );
}
