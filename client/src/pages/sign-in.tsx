import { SignIn as ClerkSignIn } from "@clerk/clerk-react";
import { useLocation } from "wouter";

export default function SignIn() {
  const [_, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-250px)]">
      <div className="max-w-md w-full bg-white p-8 shadow-lg rounded-lg">
        <h1 className="text-2xl font-bold text-center mb-6">
          स्किल टेस्ट प्लेटफॉर्म में आपका स्वागत है
        </h1>
        <ClerkSignIn 
          signUpUrl="/sign-up"
          routing="path"
          path="/sign-in"
          redirectUrl="/"
          afterSignInUrl="/"
        />
      </div>
    </div>
  );
}