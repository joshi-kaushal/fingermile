import { Link } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Logo } from './Logo';

export function Header() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  return (
    <header className="border-b border-[#E2E8F0] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Logo size="sm" />

        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-medium text-[#64748B] hover:text-[#1E293B] transition-colors no-underline"
          >
            Home
          </Link>
          <Link
            to="/privacy"
            className="text-sm font-medium text-[#64748B] hover:text-[#1E293B] transition-colors no-underline"
          >
            Privacy
          </Link>
          <a
            href="https://github.com/joshi-kaushal/fingermile"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#64748B] hover:text-[#1E293B] transition-colors no-underline"
          >
            GitHub
          </a>

          {isSignedIn ? (
            <div className="flex items-center gap-3 ml-2">
              <div className="w-7 h-7 rounded-full bg-[#001D56] flex items-center justify-center text-xs font-semibold text-white">
                {user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() || 'U'}
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                className="text-xs font-medium text-[#64748B] hover:text-[#DC2626] transition-colors cursor-pointer bg-transparent border-none"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link
                to="/sign-in"
                className="text-sm font-medium text-[#64748B] hover:text-[#1E293B] transition-colors no-underline"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-[#001D56] text-white hover:bg-[#002a7a] transition-colors no-underline"
              >
                Sign Up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
