/**
 * Event Bus - Simple pub/sub for decoupled communication
 *
 * Replaces reactive useEffect patterns with explicit event emission.
 * Components can subscribe to events and respond directly.
 *
 * @module lib/eventBus
 */

import type { AppEventMap, AppEventType, EventHandler, EventBus } from "../types";

/**
 * Create a new event bus instance.
 * @returns Event bus with on, off, emit, once methods
 */
export function createEventBus(): EventBus {
  const listeners = new Map<AppEventType, Set<EventHandler<unknown>>>();

  const bus: EventBus = {
    /**
     * Subscribe to an event.
     * @param event - Event name
     * @param handler - Event handler
     * @returns Unsubscribe function
     */
    on<K extends AppEventType>(event: K, handler: EventHandler<AppEventMap[K]>): () => void {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler as EventHandler<unknown>);
      return () => listeners.get(event)?.delete(handler as EventHandler<unknown>);
    },

    /**
     * Subscribe to an event once (auto-unsubscribes after first call).
     * @param event - Event name
     * @param handler - Event handler
     * @returns Unsubscribe function
     */
    once<K extends AppEventType>(event: K, handler: EventHandler<AppEventMap[K]>): () => void {
      const wrappedHandler = ((payload: AppEventMap[K]) => {
        bus.off(event, wrappedHandler);
        handler(payload);
      }) as EventHandler<AppEventMap[K]>;
      return bus.on(event, wrappedHandler);
    },

    /**
     * Unsubscribe from an event.
     * @param event - Event name
     * @param handler - Handler to remove
     */
    off<K extends AppEventType>(event: K, handler: EventHandler<AppEventMap[K]>): void {
      listeners.get(event)?.delete(handler as EventHandler<unknown>);
    },

    /**
     * Emit an event to all subscribers.
     * @param event - Event name
     * @param payload - Event payload
     */
    emit<K extends AppEventType>(event: K, payload: AppEventMap[K]): void {
      listeners.get(event)?.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      });
    },

    /**
     * Remove all listeners for an event (or all events if no event specified).
     * @param event - Event name (optional)
     */
    clear(event?: AppEventType): void {
      if (event) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    },

    /**
     * Get subscriber count for an event.
     * @param event - Event name
     * @returns Number of subscribers
     */
    listenerCount(event: AppEventType): number {
      return listeners.get(event)?.size ?? 0;
    },
  };

  return bus;
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
export const appEvents: EventBus = createEventBus();
