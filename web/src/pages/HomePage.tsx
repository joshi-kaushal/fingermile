import { useAuth, useUser, SignedOut } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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
  const { getToken, isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const [range, setRange] = useState<Range>('7d');
  const [sortBy, setSortBy] = useState<'distance' | 'duration'>('distance');
  const [sites, setSites] = useState<SiteStats[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Load dashboard data
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
          // Session not synced yet — silently show empty state, no error
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
    <div className="min-h-screen bg-[#030712] relative overflow-hidden">
      <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />

      <div className={isSignedIn ? 'max-w-4xl mx-auto px-4 py-8' : 'min-h-screen flex flex-col items-center justify-center p-6'}>

        {/* ===== SIGNED OUT VIEW ===== */}
        <SignedOut>
          <div className="w-full max-w-md relative z-10">
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-[#030712]" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Fingermile
                </h1>
              </div>
              <p className="text-[#9ca3af] text-sm">Measure how far your fingers travel across the web.</p>
            </div>

            <div className="backdrop-blur-sm bg-[rgba(17,24,39,0.7)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 shadow-xl">
              <p className="text-sm text-[#9ca3af] mb-6 leading-relaxed">
                Create an account or sign in to sync with the Chrome extension and
                start tracking your scroll distance across every website you visit.
              </p>
              <div className="flex flex-col gap-3">
                <Link to="/sign-in" className="block w-full text-center py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
                  Sign In
                </Link>
                <Link to="/sign-up" className="block w-full text-center py-3 px-4 rounded-xl font-semibold text-sm bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[rgba(255,255,255,0.08)] transition-all duration-200">
                  Create Account
                </Link>
              </div>
            </div>

            <div className="text-center mt-8 text-xs text-[#6b7280]">
              <Link to="/privacy" className="hover:text-[#9ca3af] transition-colors">Privacy &amp; How It Works</Link>
            </div>
          </div>
        </SignedOut>

        {/* ===== SIGNED IN VIEW (full dashboard) ===== */}
        {isSignedIn && (
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-[#030712]" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Fingermile</span>
              </Link>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                  {user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() || 'U'}
                </div>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-xs text-[#6b7280] hover:text-red-400 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              {(['today', '7d', '30d', 'all'] as Range[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    range === r
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#9ca3af] hover:text-[#f9fafb]'
                  }`}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2 text-xs text-[#6b7280]">
                <span>Sort by:</span>
                <button
                  type="button"
                  onClick={() => setSortBy('distance')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    sortBy === 'distance' ? 'text-indigo-400 bg-indigo-500/10' : 'hover:text-[#9ca3af]'
                  }`}
                >
                  Distance
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('duration')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    sortBy === 'duration' ? 'text-indigo-400 bg-indigo-500/10' : 'hover:text-[#9ca3af]'
                  }`}
                >
                  Duration
                </button>
              </div>
            </div>

            {/* Loading — just spinner, no flash */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            )}

            {/* Stats + breakdown */}
            {!loading && (
              <>
                {/* Fetch error banner — silent, doesn't block the UI */}
                {fetchError && (
                  <div className="backdrop-blur-sm bg-red-500/5 border border-red-500/20 rounded-2xl p-4 text-center mb-6">
                    <p className="text-red-400 text-xs">Could not load latest data. Showing last known results.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="backdrop-blur-sm bg-[rgba(17,24,39,0.7)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    <p className="text-xs text-[#9ca3af] font-medium uppercase tracking-wider mb-2">Total Scroll Distance</p>
                    <p className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white via-white/90 to-white/70 bg-clip-text text-transparent">{totalDistance.toFixed(1)}</p>
                    <p className="text-sm text-[#6b7280] mt-1">meters</p>
                  </div>
                  <div className="backdrop-blur-sm bg-[rgba(17,24,39,0.7)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
                    <p className="text-xs text-[#9ca3af] font-medium uppercase tracking-wider mb-2">Total Time Spent Scrolling</p>
                    <p className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white via-white/90 to-white/70 bg-clip-text text-transparent">{totalDuration.toFixed(1)}</p>
                    <p className="text-sm text-[#6b7280] mt-1">minutes</p>
                  </div>
                </div>

                <div className="backdrop-blur-sm bg-[rgba(17,24,39,0.7)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 shadow-xl">
                  <h2 className="text-xs text-[#9ca3af] font-semibold uppercase tracking-wider mb-4">Top Sites</h2>
                  {sites.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-[rgba(255,255,255,0.06)] rounded-xl">
                      <p className="text-[#6b7280] text-sm">No scroll history recorded yet.</p>
                      <p className="text-[#6b7280] text-xs mt-1">Install the extension and start scrolling!</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {sites.map((s) => (
                      <div key={s.site} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-[#f9fafb] truncate max-w-[200px]">{s.site}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-bold text-[#f9fafb]">{s.distance_m.toFixed(1)} m</span>
                            <span className="text-[#6b7280]">{s.duration_min.toFixed(1)} min</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500"
                            style={{ width: `${(s.distance_m / Math.max(...sites.map((x) => x.distance_m), 1)) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-center gap-6 mt-8 text-xs text-[#6b7280]">
              <Link to="/privacy" className="hover:text-[#9ca3af] transition-colors">Privacy &amp; How It Works</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
