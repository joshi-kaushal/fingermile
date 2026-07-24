import { Show, useAuth } from '@clerk/chrome-extension';
import { Dashboard } from '../components/Dashboard';
import { LoggedOutView } from '../components/LoggedOutView';
import { UserMenu } from '../components/UserMenu';

export function HomePage() {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <>
        <header className="app-header">
          <div className="logo-group">
            <div className="logo-icon" />
            <h1 className="logo-title">Fingermile</h1>
          </div>
        </header>
        <main className="app-main">
          <div className="view-panel active" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
            <p className="loading-text">Initializing Dashboard...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="app-header">
        <div className="logo-group">
          <div className="logo-icon" />
          <h1 className="logo-title">Fingermile</h1>
        </div>
        <div className="user-status">
          <Show when="signed-in">
            <UserMenu />
          </Show>
        </div>
      </header>

      <main className="app-main">
        <Show when="signed-out">
          <LoggedOutView />
        </Show>
        <Show when="signed-in">
          <Dashboard />
        </Show>
      </main>
    </>
  );
}
