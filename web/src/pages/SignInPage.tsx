import { SignIn } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

export function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-[#030712]" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Fingermile
            </span>
          </Link>
        </div>

        <div className="backdrop-blur-sm bg-[rgba(17,24,39,0.7)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 shadow-xl">
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
        </div>
      </div>
    </div>
  );
}
