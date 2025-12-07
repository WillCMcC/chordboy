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

let intervalId: ReturnType<typeof setInterval> | null = null;
let bpm = 120;
let pulseInterval = (60000 / bpm) / 24; // 24 PPQN

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
      // Restart if running to apply new interval
      if (intervalId !== null) {
        stopClock();
        startClock();
      }
      break;
    }
  }
};

/**
 * Start the clock interval.
 */
function startClock(): void {
  if (intervalId !== null) return;

  intervalId = setInterval(() => {
    self.postMessage({ type: "pulse" } satisfies PulseMessage);
  }, pulseInterval);
}

/**
 * Stop the clock interval.
 */
function stopClock(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
