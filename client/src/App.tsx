import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Test from "@/pages/test";
import Tests from "@/pages/tests";
import Results from "@/pages/results";
import Profile from "@/pages/profile";
import Leaderboard from "@/pages/leaderboard";
import FAQ from "@/pages/faq";
import SignIn from "@/pages/sign-in";
import SignUp from "@/pages/sign-up";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { useEffect, useState } from "react";
import OfflineIndicator from "@/components/OfflineIndicator";
import { subscribeToNetworkChanges, isOnline, syncPendingTestAttempts } from "@/lib/offlineStorage";
import { ClerkLoaded, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

function App() {
  const [online, setOnline] = useState(isOnline());
  
  // Handle network status changes and sync attempts when online
  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true);
      
      // Try to sync any pending test attempts
      try {
        await syncPendingTestAttempts();
      } catch (error) {
        console.error("Failed to sync test attempts:", error);
      }
    };
    
    const handleOffline = () => {
      setOnline(false);
    };
    
    // Subscribe to network changes
    const unsubscribe = subscribeToNetworkChanges(handleOnline, handleOffline);
    
    // Initial sync attempt if online
    if (online) {
      syncPendingTestAttempts().catch(console.error);
    }
    
    return unsubscribe;
  }, []);
  
  return (
    <ClerkLoaded>
      <div className="flex flex-col min-h-screen">
        <Header />
        
        {/* Offline indicator */}
        <div className="z-50 sticky top-16 bg-background">
          {!online && (
            <div className="w-full bg-amber-100 py-1 px-4 text-amber-800 text-sm text-center">
              <span className="inline-flex items-center">
                <OfflineIndicator className="mr-2" /> 
                आप वर्तमान में ऑफलाइन हैं। कुछ सुविधाएँ सीमित हो सकती हैं।
              </span>
            </div>
          )}
        </div>
        
        <main className="flex-grow container mx-auto px-4 pt-16 pb-20 md:pb-4 md:pt-20">
          <Switch>
            {/* Public routes */}
            <Route path="/faq" component={FAQ} />
            <Route path="/sign-in" component={SignIn} />
            <Route path="/sign-up" component={SignUp} />
            
            {/* Protected routes */}
            <Route path="/">
              {() => (
                <SignedIn>
                  <Dashboard />
                </SignedIn>
              )}
            </Route>
            <Route path="/tests">
              {() => (
                <SignedIn>
                  <Tests />
                </SignedIn>
              )}
            </Route>
            <Route path="/test/:id">
              {(params) => (
                <SignedIn>
                  <Test id={params.id} />
                </SignedIn>
              )}
            </Route>
            <Route path="/results/:id">
              {(params) => (
                <SignedIn>
                  <Results id={params.id} />
                </SignedIn>
              )}
            </Route>
            <Route path="/profile">
              {() => (
                <SignedIn>
                  <Profile />
                </SignedIn>
              )}
            </Route>
            <Route path="/leaderboard">
              {() => (
                <SignedIn>
                  <Leaderboard />
                </SignedIn>
              )}
            </Route>
            
            {/* Fallback route */}
            <Route component={NotFound} />
          </Switch>
          
          {/* Redirect to sign in if trying to access protected routes while signed out */}
          <SignedOut>
            <Switch>
              <Route path="/" component={() => <RedirectToSignIn redirectUrl="/sign-in" />} />
              <Route path="/tests" component={() => <RedirectToSignIn redirectUrl="/sign-in" />} />
              <Route path="/test/:id" component={() => <RedirectToSignIn redirectUrl="/sign-in" />} />
              <Route path="/results/:id" component={() => <RedirectToSignIn redirectUrl="/sign-in" />} />
              <Route path="/profile" component={() => <RedirectToSignIn redirectUrl="/sign-in" />} />
              <Route path="/leaderboard" component={() => <RedirectToSignIn redirectUrl="/sign-in" />} />
            </Switch>
          </SignedOut>
        </main>
        
        <MobileNav />
      </div>
    </ClerkLoaded>
  );
}

export default App;
