"use client";

import { useEffect } from "react";

/**
 * Registers the offline service worker in production builds only.
 * In development it removes any worker left over from a production run on the same origin,
 * so cached files never hide your latest code changes.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.filter((k) => k.startsWith("tp-")).map((k) => caches.delete(k))))
          .catch(() => {});
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
