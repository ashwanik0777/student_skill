"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { OfflineSync } from "@/components/pwa/offline-sync";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast:
              "!rounded-xl !border !border-border !bg-surface !text-foreground !shadow-pop !font-sans",
            description: "!text-muted-foreground",
          },
        }}
      />
      <ServiceWorkerRegister />
      <OfflineSync />
    </ThemeProvider>
  );
}
