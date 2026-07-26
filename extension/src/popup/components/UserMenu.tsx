import { useUser, useAuth } from '@clerk/chrome-extension';
import { useState } from 'react';

const WEB_DASHBOARD_URL = import.meta.env.VITE_WEB_DASHBOARD_URL || 'http://localhost:5173';

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress || '';
  const initials = (user.firstName?.[0] || email[0] || 'U').toUpperCase();

  const handleSignOut = () => {
    setOpen(false);
    signOut();
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="user-avatar-btn"
        onClick={() => setOpen(!open)}
        title={email}
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: '#001D56',
          border: 'none',
          color: '#FFFFFF',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {initials}
      </button>

      {open && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99,
            }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              zIndex: 100,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: 6,
              minWidth: 160,
              boxShadow: '0 4px 12px rgba(0, 29, 86, 0.08)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: '#64748B',
                padding: '6px 10px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                borderBottom: '1px solid #E2E8F0',
                marginBottom: 4,
              }}
            >
              {email}
            </div>
            <button
              type="button"
              onClick={() => {
                chrome.tabs.create({ url: WEB_DASHBOARD_URL });
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: 'none',
                background: '#001D56',
                color: 'white',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <svg viewBox="0 0 24 24" width={13} height={13} fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8v-2h3V7l5 5-5 5z" />
              </svg>
              View Dashboard
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                padding: '7px 10px',
                marginTop: 4,
                borderRadius: 6,
                border: 'none',
                background: '#FEF2F2',
                color: '#DC2626',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14l5-5-5-5m5 5H9" />
              </svg>
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
