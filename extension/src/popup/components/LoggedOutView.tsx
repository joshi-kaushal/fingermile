const SYNC_HOST = import.meta.env.VITE_CLERK_SYNC_HOST || '';

export function LoggedOutView() {
  const openWebSignIn = () => {
    chrome.tabs.create({ url: `${SYNC_HOST}/sign-in` });
  };

  return (
    <div className="view-panel active">
      <div className="hero-section">
        <div className="hero-illustration">
          <div className="pulse-ring" />
          <div className="pulse-ring delay-1" />
          <div className="finger-icon" />
        </div>
        <h2 className="hero-heading">Measure Your Scrolled Distance</h2>
        <p className="hero-subtext">
          Sign in on the web to sync your account, then reopen this popup to see your stats.
        </p>
      </div>
      <button type="button" className="btn btn-primary" onClick={openWebSignIn}>
        <span>Sign In on Web</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8v-2h3V7l5 5-5 5z" />
        </svg>
      </button>

      <div className="view-footer">
        <a href="https://github.com/joshi-kaushal/fingermile" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <span style={{ color: 'var(--color-border)', fontSize: '10px' }}>|</span>
        <a href="https://fingermile-production.up.railway.app/privacy" target="_blank" rel="noopener noreferrer">
          Privacy
        </a>
      </div>
    </div>
  );
}
