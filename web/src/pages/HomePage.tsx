import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="app-shell">
      <h1 className="brand">Fingermile</h1>
      <p className="subtitle">Sign in here to sync with the Chrome extension.</p>

      <SignedOut>
        <div className="card">
          <p>Create an account or sign in to start tracking scroll distance across the web.</p>
          <div className="auth-links">
            <Link to="/sign-in">Sign in</Link>
            <Link to="/sign-up">Sign up</Link>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="card signed-in-card">
          <p>You are signed in. Open the Fingermile extension popup to view your stats.</p>
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>
    </div>
  );
}
