import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useState } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

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
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 w-full">
        <h1 className="text-2xl font-bold text-[#001D56] mb-8">Privacy &amp; How It Works</h1>

        <div className="space-y-8">
          {/* How Tracking Works */}
          <section className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#001D56] mb-4">How Tracking Works</h2>

            <div className="space-y-3 text-sm text-[#64748B] leading-relaxed">
              <p>
                Fingermile is a Chrome extension that measures how far your finger travels
                while scrolling on websites. It is <strong className="text-[#1E293B]">not</strong> a keylogger,
                screen recorder, or session replay tool.
              </p>

              <h3 className="text-base font-semibold text-[#1E293B] mt-5 mb-2">The Algorithm</h3>
              <ol className="list-decimal list-inside space-y-1.5 pl-4">
                <li>
                  The extension listens for <code className="text-[#001D56] bg-[#001D56]/5 px-1.5 py-0.5 rounded text-xs font-mono">wheel</code> events as you scroll.
                  It reads the <code className="text-[#001D56] bg-[#001D56]/5 px-1.5 py-0.5 rounded text-xs font-mono">deltaY</code> value — the number of pixels the page moved.
                </li>
                <li>Events in <em>line</em> mode are converted to pixels (line &times; 16).</li>
                <li>Events in <em>page</em> mode are converted using the viewport height.</li>
                <li>
                  Pixels are converted to centimeters using your screen&apos;s DPI
                  (pixels per inch &divide; 2.54) and device pixel ratio.
                </li>
                <li>The distance is accumulated in the content script, then flushed to the extension&apos;s background service worker every 2 seconds.</li>
                <li>
                  Every 5 minutes, the data is synced to our server via an authenticated
                  API call. Only the site hostname (e.g., &quot;youtube.com&quot;), the cumulative
                  distance in centimeters, and the time spent scrolling are sent.
                </li>
              </ol>

              <h3 className="text-base font-semibold text-[#1E293B] mt-5 mb-2">What We Do NOT Collect</h3>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li><span className="text-[#64748B]">No page content, HTML, or DOM data</span></li>
                <li><span className="text-[#64748B]">No keystrokes, mouse clicks, or form input</span></li>
                <li><span className="text-[#64748B]">No screenshots or screen recordings</span></li>
                <li><span className="text-[#64748B]">No network requests or page URLs (only hostnames)</span></li>
                <li><span className="text-[#64748B]">No personal browsing history beyond site names</span></li>
              </ul>
            </div>
          </section>

          {/* Data Storage */}
          <section className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#001D56] mb-4">Data Storage</h2>
            <div className="space-y-3 text-sm text-[#64748B] leading-relaxed">
              <p>
                For each scroll session, we store: the site hostname, the total scroll distance
                in centimeters, the duration spent scrolling (in seconds), and the date.
                We also store your Clerk account ID — this is a random identifier, not your
                email or personal information.
              </p>
              <p>
                All distance calculation happens <strong className="text-[#1E293B]">entirely in your browser</strong>.
                Raw pixel data never leaves your device — only the final converted
                centimeter value is sent to our server.
              </p>
              <p>
                We do not share, sell, or redistribute your data. Your scroll history
                is private to your account.
              </p>
            </div>
          </section>

          {/* Privacy Policy */}
          <section className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#001D56] mb-4">Privacy Policy</h2>
            <div className="space-y-3 text-sm text-[#64748B] leading-relaxed">
              <p><strong className="text-[#1E293B]">Data Controller:</strong> Fingermile</p>
              <p><strong className="text-[#1E293B]">Data Collected:</strong> Scroll distance (cm), time spent scrolling (seconds), site hostname, date, and a Clerk account identifier.</p>
              <p><strong className="text-[#1E293B]">Purpose:</strong> Personal analytics — showing you how much you scroll across different websites.</p>
              <p><strong className="text-[#1E293B]">Data Retention:</strong> Data is stored until you choose to delete it. You can delete all your data at any time.</p>
              <p><strong className="text-[#1E293B]">Third Parties:</strong> We use Clerk for authentication. Clerk stores your email address and handles sign-in. No scroll data is shared with Clerk.</p>
              <p><strong className="text-[#1E293B]">Data Deletion:</strong> You can permanently erase all your data using the button below. This is a hard delete — no backups or traces remain.</p>
              <p>
                <strong className="text-[#1E293B]">Contact:</strong> For questions about this policy,{' '}
                <Link to="/contact" className="text-[#F58538] hover:text-[#e0742e] transition-colors no-underline font-medium">
                  contact us
                </Link>{' '}
                or{' '}
                <a href="https://github.com/joshi-kaushal/fingermile" target="_blank" rel="noopener noreferrer" className="text-[#F58538] hover:text-[#e0742e] transition-colors no-underline font-medium">
                  open an issue on GitHub
                </a>.
              </p>
            </div>

            {/* Delete button */}
            {isSignedIn && !deleteDone && (
              <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#DC2626]/10 border border-[#DC2626]/20 text-[#DC2626] hover:bg-[#DC2626]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {deleting ? 'Deleting...' : 'Delete All My Data'}
                </button>
                {deleteError && (
                  <p className="mt-2 text-xs text-[#DC2626]">{deleteError}</p>
                )}
              </div>
            )}
            {deleteDone && (
              <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
                <p className="text-sm text-[#16A34A]">
                  All your data has been permanently deleted.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
