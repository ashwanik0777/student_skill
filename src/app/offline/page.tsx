import type { Metadata } from "next";
import { OfflineCenter } from "@/components/pwa/offline-center";

export const metadata: Metadata = { title: "Offline centre" };

/** Fully static so the service worker can serve it with no network and no session. */
export default function OfflinePage() {
  return <OfflineCenter />;
}
