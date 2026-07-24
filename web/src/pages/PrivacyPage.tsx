import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export function PrivacyPage() {
  const { getToken, isSignedIn } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [deleteDone, setDeleteDone] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async () => {
    if (!window.confirm('This will permanently delete ALL your scroll tracking data. This action cannot be undone. Are you sure?')) return;

    try {
      setDeleting(true);
      setDeleteError('');
      const token = await getToken();
      if (!token) {
        setDeleteError('You must be signed in to delete your data.');
        return;
      }
      const res = await fetch(`${BACKEND_URL}/v1/data`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) {
        setDeleteDone(true);
      } else {
        setDeleteError('Failed to delete data. Please try again.');
      }
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] relative overflow-hidden">
      <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 py-12 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-[#030712]" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Fingermile
            </span>
          </Link>
          <Link to="/" className="text-xs text-[#6b7280] hover:text-[#9ca3af] transition-colors">
            Back to Home
          </Link>
        </div>

        <div className="space-y-10">
          {/* Section: How Tracking Works */}
          <section className="backdrop-blur-sm bg-[rgba(17,24,39,0.7)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 shadow-xl">
            <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              How Tracking Works
            </h1>

            <div className="space-y-4 text-sm text-[#9ca3af] leading-relaxed">
              <p>
                Fingermile is a Chrome extension that measures how far your finger travels
                while scrolling on websites. It is <strong className="text-[#f9fafb]">not</strong> a keylogger,
                screen recorder, or session replay tool.
              </p>

              <h2 className="text-base font-semibold text-[#f9fafb] mt-6 mb-2">The Algorithm</h2>
              <ol className="list-decimal list-inside space-y-2 pl-4">
                <li>
                  The extension listens for <code className="text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded text-xs">wheel</code> events as you scroll.
                  It reads the <code className="text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded text-xs">deltaY</code> value — the number of pixels the page moved.
                </li>
                <li>
                  Events in <em>line</em> mode are converted to pixels (line × 16).
                  Events in <em>page</em> mode are converted using the viewport height.
                </li>
                <li>
                  Pixels are converted to centimeters using your screen&apos;s DPI
                  (pixels per inch ÷ 2.54) and device pixel ratio.
                </li>
                <li>
                  The distance is accumulated in the content script, then flushed to the
                  extension&apos;s background service worker every 2 seconds.
                </li>
                <li>
                  Every 5 minutes, the data is synced to our server via an authenticated
                  API call. Only the site hostname (e.g., &quot;youtube.com&quot;), the cumulative
                  distance in centimeters, and the time spent scrolling are sent.
                </li>
              </ol>

              <h2 className="text-base font-semibold text-[#f9fafb] mt-6 mb-2">What We Do NOT Collect</h2>
              <ul className="list-disc list-inside space-y-1 pl-4 text-[#10b981]">
                <li><span className="text-[#9ca3af]">No page content, HTML, or DOM data</span></li>
                <li><span className="text-[#9ca3af]">No keystrokes, mouse clicks, or form input</span></li>
                <li><span className="text-[#9ca3af]">No screenshots or screen recordings</span></li>
                <li><span className="text-[#9ca3af]">No network requests or page URLs (only hostnames)</span></li>
                <li><span className="text-[#9ca3af]">No personal browsing history beyond site names</span></li>
              </ul>
            </div>
          </section>

          {/* Section: Data Storage */}
          <section className="backdrop-blur-sm bg-[rgba(17,24,39,0.7)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-[#f9fafb]">Data Storage</h2>
            <div className="space-y-3 text-sm text-[#9ca3af] leading-relaxed">
              <p>
                For each scroll session, we store: the site hostname, the total scroll distance
                in centimeters, the duration spent scrolling (in seconds), and the date.
                We also store your Clerk account ID — this is a random identifier, not your
                email or personal information.
              </p>
              <p>
                All distance calculation happens <strong className="text-[#f9fafb]">entirely in your browser</strong>.
                Raw pixel data never leaves your device — only the final converted
                centimeter value is sent to our server.
              </p>
              <p>
                We do not share, sell, or redistribute your data. Your scroll history
                is private to your account.
              </p>
            </div>
          </section>

          {/* Section: Privacy Policy */}
          <section className="backdrop-blur-sm bg-[rgba(17,24,39,0.7)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-[#f9fafb]">Privacy Policy</h2>
            <div className="space-y-3 text-sm text-[#9ca3af] leading-relaxed">
              <p><strong className="text-[#f9fafb]">Data Controller:</strong> Fingermile</p>
              <p><strong className="text-[#f9fafb]">Data Collected:</strong> Scroll distance (cm), time spent scrolling (seconds), site hostname, date, and a Clerk account identifier.</p>
              <p><strong className="text-[#f9fafb]">Purpose:</strong> Personal analytics — showing you how much you scroll across different websites.</p>
              <p><strong className="text-[#f9fafb]">Data Retention:</strong> Data is stored until you choose to delete it. You can delete all your data at any time.</p>
              <p><strong className="text-[#f9fafb]">Third Parties:</strong> We use Clerk for authentication. Clerk stores your email address and handles sign-in. No scroll data is shared with Clerk.</p>
              <p><strong className="text-[#f9fafb]">Data Deletion:</strong> You can permanently erase all your data using the button below. This is a hard delete — no backups or traces remain.</p>
              <p><strong className="text-[#f9fafb]">Contact:</strong> For questions about this policy, open an issue on our GitHub repository.</p>
            </div>

            {/* Delete button */}
            {isSignedIn && !deleteDone && (
              <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete All My Data'}
                </button>
                {deleteError && (
                  <p className="mt-2 text-xs text-red-400">{deleteError}</p>
                )}
              </div>
            )}
            {deleteDone && (
              <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                <p className="text-sm text-[#10b981]">
                  All your data has been permanently deleted.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="text-center mt-10 text-xs text-[#6b7280]">
          <Link to="/" className="hover:text-[#9ca3af] transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
