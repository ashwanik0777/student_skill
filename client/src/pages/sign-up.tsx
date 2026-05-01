import { SignUp as ClerkSignUp } from "@clerk/clerk-react";
import { useLocation } from "wouter";

export default function SignUp() {
  const [_, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-250px)]">
      <div className="max-w-md w-full bg-white p-8 shadow-lg rounded-lg">
        <h1 className="text-2xl font-bold text-center mb-6">
          नया खाता बनाएँ
        </h1>
        <ClerkSignUp 
          signInUrl="/sign-in"
          routing="path"
          path="/sign-up"
          redirectUrl="/"
          afterSignUpUrl="/"
        />
      </div>
    </div>
  );
}