import { createClerkClient } from '@clerk/chrome-extension/client';

// Retrieve backend and publishable keys from build-time env or use fallbacks
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const SYNC_HOST = import.meta.env.VITE_CLERK_SYNC_HOST || '';

// Initialize Clerk for background environment asynchronously to avoid top-level await in service workers
const clerkPromise = (async () => {
  const instance = await createClerkClient({
    publishableKey: CLERK_PUBLISHABLE_KEY,
    background: true,
    syncHost: SYNC_HOST,
  });
  await instance.load({
    allowedRedirectProtocols: ['chrome-extension:'],
  });
  return instance;
})();

// Cache active scroll sessions per tab
// Key: tabId, Value: session data
interface ActiveSession {
  session_id: string;
  site: string;
  date: string;
  distance_cm: number;
  duration_seconds: number;
  synced: boolean;
}

const activeSessions: Record<number, ActiveSession> = {};

// Helper to retrieve JWT token from Clerk
async function getAuthToken(): Promise<string | null> {
  try {
    const clerk = await clerkPromise;
    if (clerk.session) {
      // clerk.session.getToken() retrieves the JWT for API authentication
      const token = await clerk.session.getToken();
      return token;
    }
  } catch (error) {
    console.error('[Fingermile Background] Error fetching token:', error);
  }
  return null;
}

// Sync session data with the FastAPI backend
async function syncSession(session: ActiveSession): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) {
    console.warn('[Fingermile Background] No active user session. Retaining data locally.');
    // Save locally as unsynced
    session.synced = false;
    await chrome.storage.local.set({ [`session:${session.session_id}`]: session });
    return false;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/v1/scroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        session_id: session.session_id,
        site: session.site,
        duration_seconds: session.duration_seconds,
        distance_cm: session.distance_cm,
        date: session.date,
      }),
    });

    if (response.ok) {
      console.log(`[Fingermile Background] Session ${session.session_id} synced successfully for ${session.site}.`);
      session.synced = true;
      // Remove from pending cache in storage since it is now saved to the DB
      await chrome.storage.local.remove(`session:${session.session_id}`);
      return true;
    } else {
      console.error('[Fingermile Background] Sync server returned error status:', response.status);
    }
  } catch (error) {
    console.error('[Fingermile Background] Failed to send sync payload:', error);
  }

  // Backup to storage for offline sync retry
  session.synced = false;
  await chrome.storage.local.set({ [`session:${session.session_id}`]: session });
  return false;
}

// Scan storage for orphaned unsynced sessions and flush them
async function flushOrphanedSessions() {
  try {
    const allStorage = await chrome.storage.local.get(null);
    for (const [key, session] of Object.entries(allStorage)) {
      if (key.startsWith('session:') && !(session as ActiveSession).synced) {
        console.log(`[Fingermile Background] Flushing orphaned session: ${key}`);
        await syncSession(session as ActiveSession);
      }
    }
  } catch (error) {
    console.error('[Fingermile Background] Error flushing orphans:', error);
  }
}

// Listen for messages from content scripts and popup UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCROLL_UPDATE') {
    const tabId = sender.tab?.id;
    if (!tabId) return false;

    const site = message.site;
    const distance_cm = message.distance_cm;

    if (!activeSessions[tabId]) {
      activeSessions[tabId] = {
        session_id: crypto.randomUUID(),
        site: site,
        date: new Date().toISOString().split('T')[0],
        distance_cm: 0,
        duration_seconds: 0,
        synced: false,
      };
    }

    const currentSession = activeSessions[tabId];

    // If the tab changed site hostname, sync the old one and start a new session
    if (currentSession.site !== site) {
      const oldSession = { ...currentSession };
      syncSession(oldSession);

      currentSession.session_id = crypto.randomUUID();
      currentSession.site = site;
      currentSession.date = new Date().toISOString().split('T')[0];
      currentSession.distance_cm = distance_cm;
      currentSession.duration_seconds = 0;
      currentSession.synced = false;
    } else {
      currentSession.distance_cm += distance_cm;
    }

    // Keep storage updated
    chrome.storage.local.set({ [`session:${currentSession.session_id}`]: currentSession });
    return false;
  }

  if (message.type === 'GET_TOKEN') {
    getAuthToken().then((token) => sendResponse({ token }));
    return true; // Keeps the sendResponse channel open for async returns
  }

  if (message.type === 'GET_BACKEND_URL') {
    sendResponse({ url: BACKEND_URL });
    return false;
  }

  return false;
});

// Periodic timer to increment active tab's session duration (1 tick per second)
setInterval(async () => {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (activeTab && activeTab.id && activeSessions[activeTab.id]) {
      const session = activeSessions[activeTab.id];
      session.duration_seconds += 1;

      // Persist state to local storage every 10 seconds
      if (session.duration_seconds % 10 === 0) {
        await chrome.storage.local.set({ [`session:${session.session_id}`]: session });
      }

      // Upsert to backend database every 300 seconds (5 minutes)
      if (session.duration_seconds % 300 === 0) {
        await syncSession(session);
      }
    }
  } catch (error) {
    console.error('[Fingermile Background] Error in active session duration tick:', error);
  }
}, 1000);

// Sync session immediately on tab removal
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (activeSessions[tabId]) {
    const session = activeSessions[tabId];
    delete activeSessions[tabId];
    await syncSession(session);
  }
});

// Run orphaned flush and load handler on extension start
chrome.runtime.onStartup.addListener(flushOrphanedSessions);
chrome.runtime.onInstalled.addListener(flushOrphanedSessions);

// Execute immediately on load/reload
flushOrphanedSessions();
