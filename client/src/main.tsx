import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { initOfflineSupport } from "./lib/offlineStorage";
import { ClerkProvider } from "@clerk/clerk-react";

// Initialize offline support
if (typeof window !== 'undefined') {
  initOfflineSupport()
    .then(() => console.log('Offline support initialized'))
    .catch(error => console.error('Failed to initialize offline support:', error));
}

// Clerk publishable key from environment variables - use direct value for now
// Normally we would use import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
// But we're providing the key directly to fix potential environment variable issue
const clerkPubKey = "pk_test_Zmlyc3QtZXdlLTY3LmNsZXJrLmFjY291bnRzLmRldiQ";
// Add trusted domains for Clerk
const hostUrl = window.location.host;
console.log('Current host URL:', hostUrl);

createRoot(document.getElementById("root")!).render(
  <ClerkProvider 
    publishableKey={clerkPubKey}
    appearance={{
      elements: {
        rootBox: "shadow-none",
        card: "shadow-none border-none",
        formButtonPrimary: "bg-primary hover:bg-primary/90 text-white",
      }
    }}
  >
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </ClerkProvider>
);
