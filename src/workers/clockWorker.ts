/**
 * Clock Worker
 * Runs a precise MIDI clock in a Web Worker to avoid background throttling.
 * Web Workers continue running at full speed even when the tab is in the background.
 *
 * @module workers/clockWorker
 */

// ============================================================================
// Worker Message Types
// ============================================================================

/** Message to start the clock */
interface StartMessage {
  type: "start";
  payload?: {
    bpm: number;
  };
}

/** Message to stop the clock */
interface StopMessage {
  type: "stop";
}

/** Message to set BPM */
interface SetBpmMessage {
  type: "setBpm";
  payload: {
    bpm: number;
  };
}

/** Union of all incoming message types */
type ClockWorkerMessage = StartMessage | StopMessage | SetBpmMessage;

/** Message sent from worker (pulse) */
interface PulseMessage {
  type: "pulse";
}

/** Union of all outgoing message types */
export type ClockWorkerOutgoingMessage = PulseMessage;

// ============================================================================
// Worker State
// ============================================================================

let timeoutId: ReturnType<typeof setTimeout> | null = null;
let bpm = 120;
let pulseInterval = (60000 / bpm) / 24; // 24 PPQN
let nextTickTime = 0; // Next expected tick time using performance.now()

// ============================================================================
// Worker Self Context
// ============================================================================

// Type the worker global scope
declare const self: DedicatedWorkerGlobalScope;

/**
 * Handle messages from main thread.
 */
self.onmessage = (event: MessageEvent<ClockWorkerMessage>): void => {
  const { type } = event.data;

  switch (type) {
    case "start": {
      const startMsg = event.data as StartMessage;
      if (startMsg.payload?.bpm) {
        bpm = startMsg.payload.bpm;
        pulseInterval = (60000 / bpm) / 24;
      }
      startClock();
      break;
    }

    case "stop":
      stopClock();
      break;

    case "setBpm": {
      const setBpmMsg = event.data as SetBpmMessage;
      bpm = setBpmMsg.payload.bpm;
      pulseInterval = (60000 / bpm) / 24;
      // Note: tempo changes take effect immediately on next tick calculation
      // No need to restart - the tick function uses current pulseInterval
      break;
    }
  }
};

/**
 * High-resolution tick function with drift compensation.
 * Uses performance.now() for precise timing and catches up on any missed ticks.
 */
function tick(): void {
  const now = performance.now();

  // Catch up on any missed ticks (if event loop was delayed)
  while (nextTickTime <= now) {
    self.postMessage({ type: "pulse" } satisfies PulseMessage);
    nextTickTime += pulseInterval;
  }

  // Schedule next tick with drift compensation
  // Subtract 1ms to account for setTimeout's minimum delay and ensure we wake up slightly early
  const delay = Math.max(0, nextTickTime - performance.now() - 1);
  timeoutId = setTimeout(tick, delay);
}

/**
 * Start the clock with high-resolution timing.
 */
function startClock(): void {
  if (timeoutId !== null) return;

  // Initialize next tick time to now, so first tick happens immediately
  nextTickTime = performance.now();
  tick();
}

/**
 * Stop the clock.
 */
function stopClock(): void {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}
