// Skip tracking on localhost, loopback, and browser-internal pages
const hostname = window.location.hostname;
if (
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '::1' ||
  hostname.endsWith('.local') ||
  hostname.endsWith('.internal')
) {
  // Enable this log to verify localhost filtering during development:
  // console.log('[Fingermile] Skipping tracking on development host:', hostname);
} else {
  let accumulatedDistanceCm = 0;
  const site = hostname.replace(/^www\./, '');

  // Listen to wheel events to calculate finger scrolling distance
  window.addEventListener('wheel', (event) => {
    let deltaY = event.deltaY;

    // Normalize deltaMode
    if (event.deltaMode === 1) {
      deltaY *= 16; // LINE -> px (approx)
    } else if (event.deltaMode === 2) {
      deltaY *= window.innerHeight; // PAGE -> px
    }

    // Convert pixels to centimeters
    const dpi = 96 * window.devicePixelRatio;
    const px_per_cm = dpi / 2.54;
    const distance_cm = Math.abs(deltaY) / px_per_cm;

    accumulatedDistanceCm += distance_cm;
  }, { passive: true });

  // Flush accumulated distance to background service worker every 2 seconds
  const flushInterval = setInterval(() => {
    flushDistance();
  }, 2000);

  // Flush distance on tab unload
  window.addEventListener('beforeunload', () => {
    clearInterval(flushInterval);
    flushDistance();
  });

  function flushDistance() {
    if (accumulatedDistanceCm > 0) {
      const distanceToSend = Math.round(accumulatedDistanceCm);
      if (distanceToSend > 0) {
        chrome.runtime.sendMessage({
          type: 'SCROLL_UPDATE',
          site: site,
          distance_cm: distanceToSend
        }, () => {
          // Suppress extension context invalidated errors silently
          if (chrome.runtime.lastError) {
            // No action needed
          }
        });
      }
      accumulatedDistanceCm = 0;
    }
  }
}
