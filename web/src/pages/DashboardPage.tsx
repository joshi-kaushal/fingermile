import { useAuth, SignedOut } from '@clerk/clerk-react';
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

export function DashboardPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [range, setRange] = useState<Range>('7d');
  const [sortBy, setSortBy] = useState<'distance' | 'duration'>('distance');
  const [sites, setSites] = useState<SiteStats[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const token = await getToken();
        if (!token || cancelled) return;

        const today = new Date();
        let from: string;

        switch (range) {
          case 'today':
            from = today.toISOString().split('T')[0];
            break;
          case '7d':
            from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case '30d':
            from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case 'all':
            from = '2000-01-01';
            break;
        }

        const to = today.toISOString().split('T')[0];

        const res = await fetch(
          `${BACKEND_URL}/v1/metrics?from=${from}&to=${to}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (!res.ok) {
          if (res.status === 401) throw new Error('Session expired. Please sign in again.');
          throw new Error(`Server error (${res.status})`);
        }

        const data = await res.json();

        if (cancelled) return;

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
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [getToken, isLoaded, isSignedIn, range, sortBy]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712]">
        <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] relative overflow-hidden">
      <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-[#030712]" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Fingermile
            </span>
          </Link>
        </div>

        <SignedOut>
          <div className="text-center py-20">
            <p className="text-[#9ca3af] mb-4">You need to sign in to view your dashboard.</p>
            <Link
              to="/sign-in"
              className="inline-block py-3 px-6 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white"
            >
              Sign In
            </Link>
          </div>
        </SignedOut>

        {isSignedIn && (
          <>
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
                    sortBy === 'distance'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'hover:text-[#9ca3af]'
                  }`}
                >
                  Distance
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('duration')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    sortBy === 'duration'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'hover:text-[#9ca3af]'
                  }`}
                >
                  Duration
                </button>
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div className="backdrop-blur-sm bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-center mb-8">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-3 text-xs text-[#9ca3af] underline hover:text-[#f9fafb]"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            )}

            {/* Stats cards */}
            {!loading && !error && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="backdrop-blur-sm bg-[rgba(17,24,39,0.7)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    <p className="text-xs text-[#9ca3af] font-medium uppercase tracking-wider mb-2">
                      Total Scroll Distance
                    </p>
                    <p className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                      {totalDistance.toFixed(1)}
                    </p>
                    <p className="text-sm text-[#6b7280] mt-1">meters</p>
                  </div>

                  <div className="backdrop-blur-sm bg-[rgba(17,24,39,0.7)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
                    <p className="text-xs text-[#9ca3af] font-medium uppercase tracking-wider mb-2">
                      Total Time Spent Scrolling
                    </p>
                    <p className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                      {totalDuration.toFixed(1)}
                    </p>
                    <p className="text-sm text-[#6b7280] mt-1">minutes</p>
                  </div>
                </div>

                {/* Per-site breakdown */}
                <div className="backdrop-blur-sm bg-[rgba(17,24,39,0.7)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 shadow-xl">
                  <h2 className="text-xs text-[#9ca3af] font-semibold uppercase tracking-wider mb-4">
                    {sites.length > 0 ? `Top Sites` : 'Sites'}
                  </h2>

                  {sites.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-[rgba(255,255,255,0.06)] rounded-xl">
                      <p className="text-[#6b7280] text-sm">No scroll history recorded yet.</p>
                      <p className="text-[#6b7280] text-xs mt-1">Install the extension and start scrolling!</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {sites.map((site) => (
                      <div
                        key={site.site}
                        className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-[#f9fafb] truncate max-w-[200px]">
                            {site.site}
                          </span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-bold text-[#f9fafb]">
                              {site.distance_m.toFixed(1)} m
                            </span>
                            <span className="text-[#6b7280]">
                              {site.duration_min.toFixed(1)} min
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500"
                            style={{
                              width: `${(site.distance_m / Math.max(...sites.map((s) => s.distance_m), 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Footer link */}
            <div className="flex justify-center gap-6 mt-8 text-xs text-[#6b7280]">
              <Link to="/privacy" className="hover:text-[#9ca3af] transition-colors">
                Privacy &amp; How It Works
              </Link>
              <Link to="/" className="hover:text-[#9ca3af] transition-colors">
                Home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
