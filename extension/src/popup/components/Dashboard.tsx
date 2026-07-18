import { useAuth } from '@clerk/chrome-extension';
import { useEffect, useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface LeaderboardItem {
  site: string;
  distance_m: number;
  duration_min: number;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function Dashboard() {
  const { getToken } = useAuth();
  const [distance, setDistance] = useState('0.0');
  const [duration, setDuration] = useState('0 min');
  const [siteListHtml, setSiteListHtml] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const token = await getToken();
        if (!token || cancelled) return;

        const todayStr = new Date().toISOString().split('T')[0];
        const sevenDaysAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

        let backendData: {
          data: Record<string, Array<{ distance_m: number; duration_min: number }>>;
        } = { data: {} };

        try {
          const response = await fetch(
            `${BACKEND_URL}/v1/metrics?from=${sevenDaysAgoStr}&to=${todayStr}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (response.ok) {
            backendData = await response.json();
          }
        } catch (e) {
          console.error('[Fingermile Popup] Failed to connect to metrics API:', e);
        }

        const allStorage = await chrome.storage.local.get(null);
        const unsyncedSessions: Array<{
          site: string;
          distance_cm: number;
          duration_seconds: number;
          synced: boolean;
        }> = [];

        for (const [key, value] of Object.entries(allStorage)) {
          if (key.startsWith('session:') && !(value as { synced: boolean }).synced) {
            unsyncedSessions.push(value as typeof unsyncedSessions[number]);
          }
        }

        const siteAggregations: Record<string, { distance_m: number; duration_min: number }> = {};

        for (const [site, dailyEntries] of Object.entries(backendData.data)) {
          let siteDistanceM = 0;
          let siteDurationMin = 0;
          for (const entry of dailyEntries) {
            siteDistanceM += entry.distance_m;
            siteDurationMin += entry.duration_min;
          }
          siteAggregations[site] = { distance_m: siteDistanceM, duration_min: siteDurationMin };
        }

        for (const session of unsyncedSessions) {
          const distanceM = session.distance_cm / 100.0;
          const durationMin = session.duration_seconds / 60.0;
          if (!siteAggregations[session.site]) {
            siteAggregations[session.site] = { distance_m: 0, duration_min: 0 };
          }
          siteAggregations[session.site].distance_m += distanceM;
          siteAggregations[session.site].duration_min += durationMin;
        }

        let grandTotalDistanceM = 0;
        let grandTotalDurationMin = 0;
        const leaderboardList: LeaderboardItem[] = [];

        for (const [site, stats] of Object.entries(siteAggregations)) {
          const distance_m = roundToOneDecimal(stats.distance_m);
          const duration_min = roundToOneDecimal(stats.duration_min);
          grandTotalDistanceM += distance_m;
          grandTotalDurationMin += duration_min;
          leaderboardList.push({ site, distance_m, duration_min });
        }

        leaderboardList.sort((a, b) => b.distance_m - a.distance_m);

        if (!cancelled) {
          setDistance(roundToOneDecimal(grandTotalDistanceM).toFixed(1));
          setDuration(`${roundToOneDecimal(grandTotalDurationMin).toFixed(1)} min`);
          setSiteListHtml(leaderboardList);
        }
      } catch (error) {
        console.error('[Fingermile Popup] Dashboard compilation error:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const maxVal = Math.max(...siteListHtml.map((i) => i.distance_m), 1.0);

  return (
    <div className="view-panel active">
      <div className="stats-card">
        <span className="stats-label">Today&apos;s Scroll Distance</span>
        <div className="odometer-container">
          <span className="stats-value">{loading ? '—' : distance}</span>
          <span className="stats-unit">meters</span>
        </div>
        <div className="stats-meta">
          <div className="meta-item">
            <svg viewBox="0 0 24 24" className="meta-icon" aria-hidden="true">
              <path
                fill="currentColor"
                d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
              />
            </svg>
            <span>{loading ? '—' : duration}</span>
          </div>
          <div className="meta-divider" />
          <div className="meta-item">
            <span className="badge badge-success">Tracking Active</span>
          </div>
        </div>
      </div>

      <section className="breakdown-section">
        <h3 className="section-title">Website Leaderboard</h3>
        <div className="site-list">
          {!loading && siteListHtml.length === 0 && (
            <div className="empty-state">
              <p>No scroll history recorded yet.</p>
              <p style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                Start scrolling on any page to begin!
              </p>
            </div>
          )}
          {siteListHtml.map((item) => {
            const pct = Math.min((item.distance_m / maxVal) * 100, 100);
            return (
              <div key={item.site} className="site-item">
                <div className="site-info">
                  <span className="site-name" title={item.site}>
                    {item.site}
                  </span>
                  <div className="site-values">
                    <span className="site-distance">{item.distance_m.toFixed(1)} m</span>
                    <span className="site-duration">{item.duration_min.toFixed(1)} min</span>
                  </div>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
