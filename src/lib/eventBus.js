/**
 * Event Bus - Simple pub/sub for decoupled communication
 *
 * Replaces reactive useEffect patterns with explicit event emission.
 * Components can subscribe to events and respond directly.
 *
 * @module lib/eventBus
 */

/**
 * Create a new event bus instance.
 * @returns {Object} Event bus with on, off, emit, once methods
 */
export function createEventBus() {
  const listeners = new Map();

  return {
    /**
     * Subscribe to an event.
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @returns {Function} Unsubscribe function
     */
    on(event, handler) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(handler);
      return () => listeners.get(event).delete(handler);
    },

    /**
     * Subscribe to an event once (auto-unsubscribes after first call).
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @returns {Function} Unsubscribe function
     */
    once(event, handler) {
      const wrappedHandler = (payload) => {
        this.off(event, wrappedHandler);
        handler(payload);
      };
      return this.on(event, wrappedHandler);
    },

    /**
     * Unsubscribe from an event.
     * @param {string} event - Event name
     * @param {Function} handler - Handler to remove
     */
    off(event, handler) {
      listeners.get(event)?.delete(handler);
    },

    /**
     * Emit an event to all subscribers.
     * @param {string} event - Event name
     * @param {*} payload - Event payload
     */
    emit(event, payload) {
      listeners.get(event)?.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      });
    },

    /**
     * Remove all listeners for an event (or all events if no event specified).
     * @param {string} [event] - Event name (optional)
     */
    clear(event) {
      if (event) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    },

    /**
     * Get subscriber count for an event.
     * @param {string} event - Event name
     * @returns {number} Number of subscribers
     */
    listenerCount(event) {
      return listeners.get(event)?.size ?? 0;
    }
  };
}

/**
 * App-wide event bus singleton.
 *
 * Event Types:
 * - chord:changed   { notes, name, source }
 * - chord:cleared   { source }
 * - voicing:changed { inversion, drop, spread, octave }
 * - preset:saved    { slot, keys, voicing }
 * - preset:recalled { slot, preset }
 * - preset:cleared  { slot }
 * - keys:allUp      {}
 */
export const appEvents = createEventBus();
