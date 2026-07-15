import { createClerkClient } from '@clerk/chrome-extension/client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

// Initialize Clerk
const clerk = createClerkClient({ publishableKey: CLERK_PUBLISHABLE_KEY });

// DOM elements
const loadingView = document.getElementById('loading-view')!;
const loggedOutView = document.getElementById('logged-out-view')!;
const loggedInView = document.getElementById('logged-in-view')!;
const signinButton = document.getElementById('signin-button')!;
const signoutButton = document.getElementById('signout-button')!;
const headerUser = document.getElementById('header-user')!;
const statDistance = document.getElementById('stat-distance')!;
const statDuration = document.getElementById('stat-duration')!;
const siteList = document.getElementById('site-list')!;

// Setup event listeners
signinButton.addEventListener('click', () => {
  clerk.openSignIn({});
});

signoutButton.addEventListener('click', () => {
  clerk.signOut();
});

// Load Clerk client and wire render listener
clerk.load({
  allowedRedirectProtocols: ['chrome-extension:'],
}).then(() => {
  clerk.addListener(render);
  render();
});

async function render() {
  loadingView.classList.remove('active');
  
  if (clerk.user) {
    loggedOutView.classList.remove('active');
    loggedInView.classList.add('active');
    
    // Render user details in header
    const firstName = clerk.user.firstName || '';
    const lastName = clerk.user.lastName || '';
    const initials = firstName && lastName 
      ? `${firstName[0]}${lastName[0]}`
      : firstName 
        ? firstName[0] 
        : clerk.user.primaryEmailAddress?.emailAddress[0] || 'U';
        
    headerUser.innerHTML = `<div class="user-avatar-placeholder" title="${clerk.user.primaryEmailAddress?.emailAddress || ''}">${initials.toUpperCase()}</div>`;
    
    // Load statistics dashboard
    await updateDashboard();
  } else {
    loggedInView.classList.remove('active');
    loggedOutView.classList.add('active');
    headerUser.innerHTML = '';
  }
}

async function updateDashboard() {
  try {
    const token = await clerk.session?.getToken();
    if (!token) return;

    // We query metrics for the last 7 days inclusive
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Fetch records from the database via FastAPI
    let backendData: {
      from: string;
      to: string;
      data: Record<string, Array<{ date: string; distance_m: number; duration_min: number }>>;
      totals: { distance_m: number; duration_min: number };
    } = {
      from: sevenDaysAgoStr,
      to: todayStr,
      data: {},
      totals: { distance_m: 0.0, duration_min: 0.0 }
    };
    
    try {
      const response = await fetch(`${BACKEND_URL}/v1/metrics?from=${sevenDaysAgoStr}&to=${todayStr}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      if (response.ok) {
        backendData = await response.json();
      } else {
        console.warn('[Fingermile Popup] Backend metrics API returned status:', response.status);
      }
    } catch (e) {
      console.error('[Fingermile Popup] Failed to connect to metrics API:', e);
    }
    
    // Fetch currently cached unsynced sessions to merge and show real-time metrics
    const allStorage = await chrome.storage.local.get(null);
    const unsyncedSessions: Array<{
      session_id: string;
      site: string;
      distance_cm: number;
      duration_seconds: number;
      synced: boolean;
    }> = [];
    
    for (const [key, value] of Object.entries(allStorage)) {
      if (key.startsWith('session:') && !(value as any).synced) {
        unsyncedSessions.push(value as any);
      }
    }
    
    // Group and consolidate data per site
    const siteAggregations: Record<string, { distance_m: number; duration_min: number }> = {};
    
    // 1. Incorporate backend records
    for (const [site, dailyEntries] of Object.entries(backendData.data)) {
      let siteDistanceM = 0;
      let siteDurationMin = 0;
      
      for (const entry of dailyEntries) {
        siteDistanceM += entry.distance_m;
        siteDurationMin += entry.duration_min;
      }
      
      siteAggregations[site] = {
        distance_m: siteDistanceM,
        duration_min: siteDurationMin
      };
    }
    
    // 2. Overlay unsynced cache details
    for (const session of unsyncedSessions) {
      const site = session.site;
      const distanceM = session.distance_cm / 100.0;
      const durationMin = session.duration_seconds / 60.0;
      
      if (!siteAggregations[site]) {
        siteAggregations[site] = { distance_m: 0.0, duration_min: 0.0 };
      }
      
      siteAggregations[site].distance_m += distanceM;
      siteAggregations[site].duration_min += durationMin;
    }
    
    // 3. Assemble sorted list and compute totals
    let grandTotalDistanceM = 0;
    let grandTotalDurationMin = 0;
    
    interface LeaderboardItem {
      site: string;
      distance_m: number;
      duration_min: number;
    }
    
    const leaderboardList: LeaderboardItem[] = [];
    
    for (const [site, stats] of Object.entries(siteAggregations)) {
      const distance_m = roundToOneDecimal(stats.distance_m);
      const duration_min = roundToOneDecimal(stats.duration_min);
      
      grandTotalDistanceM += distance_m;
      grandTotalDurationMin += duration_min;
      
      leaderboardList.push({
        site,
        distance_m,
        duration_min
      });
    }
    
    // Sort descending by scrolled distance
    leaderboardList.sort((a, b) => b.distance_m - a.distance_m);
    
    // Update metric card values
    statDistance.textContent = roundToOneDecimal(grandTotalDistanceM).toFixed(1);
    statDuration.textContent = `${roundToOneDecimal(grandTotalDurationMin).toFixed(1)} min`;
    
    // Render leaderboard
    siteList.innerHTML = '';
    
    if (leaderboardList.length === 0) {
      siteList.innerHTML = `
        <div class="empty-state">
          <p>No scroll history recorded yet.</p>
          <p style="margin-top: 4px; font-size: 10px; color: var(--text-muted);">Start scrolling on any page to begin!</p>
        </div>
      `;
      return;
    }
    
    const maxVal = Math.max(...leaderboardList.map(i => i.distance_m), 1.0);
    
    for (const item of leaderboardList) {
      const pct = Math.min((item.distance_m / maxVal) * 100, 100);
      const itemRow = document.createElement('div');
      itemRow.className = 'site-item';
      itemRow.innerHTML = `
        <div class="site-info">
          <span class="site-name" title="${item.site}">${item.site}</span>
          <div class="site-values">
            <span class="site-distance">${item.distance_m.toFixed(1)} m</span>
            <span class="site-duration">${item.duration_min.toFixed(1)} min</span>
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-bar" style="width: ${pct}%"></div>
        </div>
      `;
      siteList.appendChild(itemRow);
    }
  } catch (error) {
    console.error('[Fingermile Popup] Dashboard compilation error:', error);
  }
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
