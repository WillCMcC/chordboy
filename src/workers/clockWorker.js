/**
 * Clock Worker
 * Runs a precise MIDI clock in a Web Worker to avoid background throttling.
 * Web Workers continue running at full speed even when the tab is in the background.
 *
 * @module workers/clockWorker
 */

let intervalId = null;
let bpm = 120;
let pulseInterval = (60000 / bpm) / 24; // 24 PPQN

/**
 * Handle messages from main thread.
 */
self.onmessage = (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case "start":
      if (payload?.bpm) {
        bpm = payload.bpm;
        pulseInterval = (60000 / bpm) / 24;
      }
      startClock();
      break;

    case "stop":
      stopClock();
      break;

    case "setBpm":
      bpm = payload.bpm;
      pulseInterval = (60000 / bpm) / 24;
      // Restart if running to apply new interval
      if (intervalId !== null) {
        stopClock();
        startClock();
      }
      break;
  }
};

/**
 * Start the clock interval.
 */
function startClock() {
  if (intervalId !== null) return;

  intervalId = setInterval(() => {
    self.postMessage({ type: "pulse" });
  }, pulseInterval);
}

/**
 * Stop the clock interval.
 */
function stopClock() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
