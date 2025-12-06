/**
 * useEventSubscription Hook
 * Subscribe to event bus events with automatic cleanup.
 *
 * @module hooks/useEventSubscription
 */

import { useEffect, useRef } from "react";

/**
 * Subscribe to an event on an event bus.
 * Handler is kept in a ref to avoid re-subscribing when handler changes.
 *
 * @param {Object} eventBus - Event bus to subscribe to
 * @param {string} event - Event name to listen for
 * @param {Function} handler - Handler to call when event fires
 *
 * @example
 * useEventSubscription(appEvents, 'chord:changed', (chord) => {
 *   playChord(chord.notes);
 * });
 */
export function useEventSubscription(eventBus, event, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrappedHandler = (payload) => handlerRef.current(payload);
    return eventBus.on(event, wrappedHandler);
  }, [eventBus, event]);
}

/**
 * Subscribe to multiple events on an event bus.
 *
 * @param {Object} eventBus - Event bus to subscribe to
 * @param {Object} handlers - Map of event names to handlers
 *
 * @example
 * useEventSubscriptions(appEvents, {
 *   'chord:changed': handleChordChanged,
 *   'chord:cleared': handleChordCleared,
 * });
 */
export function useEventSubscriptions(eventBus, handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const unsubscribes = Object.entries(handlersRef.current).map(
      ([event, handler]) => {
        const wrappedHandler = (payload) =>
          handlersRef.current[event]?.(payload);
        return eventBus.on(event, wrappedHandler);
      }
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
    // Re-subscribe when handler keys change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventBus, Object.keys(handlers).join(",")]);
}

