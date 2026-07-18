import { ClerkProvider } from '@clerk/chrome-extension';
import { Outlet, useNavigate } from 'react-router-dom';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const SYNC_HOST = import.meta.env.VITE_CLERK_SYNC_HOST;
const EXTENSION_URL = chrome.runtime.getURL('index.html');

if (!PUBLISHABLE_KEY) {
  throw new Error('Add VITE_CLERK_PUBLISHABLE_KEY to extension/.env');
}

if (!SYNC_HOST) {
  throw new Error('Add VITE_CLERK_SYNC_HOST to extension/.env');
}

export function RootLayout() {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      syncHost={SYNC_HOST}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      afterSignOutUrl={`${EXTENSION_URL}#/`}
      signInFallbackRedirectUrl={`${EXTENSION_URL}#/`}
      signUpFallbackRedirectUrl={`${EXTENSION_URL}#/`}
    >
      <div className="app-container">
        <Outlet />
      </div>
    </ClerkProvider>
  );
}
