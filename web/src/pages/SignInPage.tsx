import { SignIn } from '@clerk/clerk-react';
import { Logo } from '../components/Logo';
import { Footer } from '../components/Footer';

export function SignInPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo size="lg" />
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
            <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
