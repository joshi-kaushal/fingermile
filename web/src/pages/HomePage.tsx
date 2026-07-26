import { useAuth, SignedOut } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface SiteStats {
  site: string;
  distance_m: number;
  duration_min: number;
}

type Range = 'today' | '7d' | '30d' | 'all';

const RANGE_LABELS: Record<Range, string> = {
  today: 'Today',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  all: 'Since Inception',
};

export function HomePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [range, setRange] = useState<Range>('7d');
  const [sortBy, setSortBy] = useState<'distance' | 'duration'>('distance');
  const [sites, setSites] = useState<SiteStats[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setFetchError(false);

        const token = await getToken();
        if (!token || cancelled) return;

        const today = new Date();
        let from: string;
        switch (range) {
          case 'today': from = today.toISOString().split('T')[0]; break;
          case '7d': from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; break;
          case '30d': from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; break;
          case 'all': from = '2000-01-01'; break;
        }

        const to = today.toISOString().split('T')[0];
        const res = await fetch(`${BACKEND_URL}/v1/metrics?from=${from}&to=${to}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cancelled) return;

        if (res.status === 401) {
          setFetchError(false);
          setSites([]);
          setTotalDistance(0);
          setTotalDuration(0);
          return;
        }

        if (!res.ok) {
          setFetchError(true);
          return;
        }

        const data = await res.json();

        const siteList: SiteStats[] = [];
        for (const [site, entries] of Object.entries(data.data)) {
          const entriesArr = entries as Array<{ distance_m: number; duration_min: number }>;
          let distance = 0;
          let duration = 0;
          for (const e of entriesArr) {
            distance += e.distance_m;
            duration += e.duration_min;
          }
          siteList.push({
            site,
            distance_m: Math.round(distance * 10) / 10,
            duration_min: Math.round(duration * 10) / 10,
          });
        }

        siteList.sort((a, b) =>
          sortBy === 'distance' ? b.distance_m - a.distance_m : b.duration_min - a.duration_min,
        );

        setSites(siteList);
        setTotalDistance(data.totals.distance_m);
        setTotalDuration(data.totals.duration_min);
      } catch {
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [getToken, isLoaded, isSignedIn, range, sortBy]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ===== SIGNED OUT VIEW ===== */}
      <SignedOut>
        <Header />

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-md">
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#001D56] flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-white" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#001D56]">
                  Fingermile
                </h1>
              </div>
              <p className="text-[#64748B] text-sm max-w-xs mx-auto leading-relaxed">
                Measure how far your fingers travel across the web.
                Personal analytics for the modern browser.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#F58538]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#F58538" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#1E293B]">Track scroll distance per website</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#F58538]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#F58538" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#1E293B]">Personal analytics dashboard</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#F58538]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#F58538" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#1E293B]">Privacy-first — raw data never leaves your browser</p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Link
                  to="/sign-in"
                  className="block w-full text-center py-2.5 px-4 rounded-lg font-semibold text-sm bg-[#001D56] text-white hover:bg-[#002a7a] transition-colors no-underline"
                >
                  Sign In
                </Link>
                <Link
                  to="/sign-up"
                  className="block w-full text-center py-2.5 px-4 rounded-lg font-semibold text-sm bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#1E293B] hover:border-[#94A3B8] transition-colors no-underline"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </SignedOut>

      {/* ===== SIGNED IN VIEW (full dashboard) ===== */}
      {isSignedIn && (
        <>
          <Header />

          <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
              {(['today', '7d', '30d', 'all'] as Range[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer border-none ${
                    range === r
                      ? 'bg-[#001D56] text-white shadow-sm'
                      : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-1 text-xs text-[#94A3B8]">
                <span>Sort:</span>
                <button
                  type="button"
                  onClick={() => setSortBy('distance')}
                  className={`px-2 py-1 rounded font-medium transition-all cursor-pointer border-none ${
                    sortBy === 'distance' ? 'text-[#F58538] bg-[#FFF7ED]' : 'text-[#64748B] hover:text-[#1E293B] bg-transparent'
                  }`}
                >
                  Distance
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('duration')}
                  className={`px-2 py-1 rounded font-medium transition-all cursor-pointer border-none ${
                    sortBy === 'duration' ? 'text-[#F58538] bg-[#FFF7ED]' : 'text-[#64748B] hover:text-[#1E293B] bg-transparent'
                  }`}
                >
                  Duration
                </button>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-[3px] border-[#E2E8F0] border-t-[#001D56] rounded-full animate-spin" />
              </div>
            )}

            {/* Stats + breakdown */}
            {!loading && (
              <>
                {fetchError && (
                  <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-xl p-4 text-center mb-6">
                    <p className="text-[#DC2626] text-xs">Could not load latest data. Showing last known results.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#001D56]" />
                    <p className="text-xs text-[#64748B] font-semibold uppercase tracking-wider mb-2">Total Scroll Distance</p>
                    <p className="text-4xl font-extrabold tracking-tight text-[#001D56]">{totalDistance.toFixed(1)}</p>
                    <p className="text-sm text-[#94A3B8] mt-1">meters</p>
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#F58538]" />
                    <p className="text-xs text-[#64748B] font-semibold uppercase tracking-wider mb-2">Total Time Spent Scrolling</p>
                    <p className="text-4xl font-extrabold tracking-tight text-[#001D56]">{totalDuration.toFixed(1)}</p>
                    <p className="text-sm text-[#94A3B8] mt-1">minutes</p>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                  <h2 className="text-xs text-[#64748B] font-semibold uppercase tracking-wider mb-4">Top Sites</h2>
                  {sites.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-[#E2E8F0] rounded-lg">
                      <p className="text-[#94A3B8] text-sm">No scroll history recorded yet.</p>
                      <p className="text-[#94A3B8] text-xs mt-1">Install the extension and start scrolling!</p>
                    </div>
                  )}
                  <div className="space-y-2.5">
                    {sites.map((s) => (
                      <div key={s.site} className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 hover:border-[#94A3B8] transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-[#1E293B] truncate max-w-[200px]">{s.site}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-bold text-[#1E293B]">{s.distance_m.toFixed(1)} m</span>
                            <span className="text-[#94A3B8]">{s.duration_min.toFixed(1)} min</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#F58538] transition-all duration-500"
                            style={{ width: `${(s.distance_m / Math.max(...sites.map((x) => x.distance_m), 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-center gap-6 mt-8 text-xs text-[#94A3B8]">
              <Link to="/privacy" className="hover:text-[#1E293B] transition-colors no-underline">Privacy &amp; How It Works</Link>
              <Link to="/contact" className="hover:text-[#1E293B] transition-colors no-underline">Contact</Link>
            </div>
          </main>

          <Footer />
        </>
      )}
    </div>
  );
}
