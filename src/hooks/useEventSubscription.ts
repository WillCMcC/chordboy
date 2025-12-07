/**
 * useEventSubscription Hook
 * Subscribe to event bus events with automatic cleanup.
 *
 * @module hooks/useEventSubscription
 */

import { useEffect, useRef } from "react";
import type { EventBus, AppEventType, AppEventMap, EventHandler } from "../types";

/**
 * Subscribe to an event on an event bus.
 * Handler is kept in a ref to avoid re-subscribing when handler changes.
 *
 * @param eventBus - Event bus to subscribe to
 * @param event - Event name to listen for
 * @param handler - Handler to call when event fires
 *
 * @example
 * useEventSubscription(appEvents, 'chord:changed', (chord) => {
 *   playChord(chord.notes);
 * });
 */
export function useEventSubscription<K extends AppEventType>(
  eventBus: EventBus,
  event: K,
  handler: EventHandler<AppEventMap[K]>
): void {
  const handlerRef = useRef<EventHandler<AppEventMap[K]>>(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrappedHandler = (payload: AppEventMap[K]): void => handlerRef.current(payload);
    return eventBus.on(event, wrappedHandler);
  }, [eventBus, event]);
}

/** Handler map type for multiple event subscriptions */
type EventHandlerMap = {
  [K in AppEventType]?: EventHandler<AppEventMap[K]>;
};

/**
 * Subscribe to multiple events on an event bus.
 *
 * @param eventBus - Event bus to subscribe to
 * @param handlers - Map of event names to handlers
 *
 * @example
 * useEventSubscriptions(appEvents, {
 *   'chord:changed': handleChordChanged,
 *   'chord:cleared': handleChordCleared,
 * });
 */
export function useEventSubscriptions(
  eventBus: EventBus,
  handlers: EventHandlerMap
): void {
  const handlersRef = useRef<EventHandlerMap>(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const unsubscribes = (Object.entries(handlersRef.current) as Array<[AppEventType, EventHandler<unknown>]>).map(
      ([event, _handler]) => {
        const wrappedHandler = (payload: unknown): void => {
          const currentHandler = handlersRef.current[event];
          if (currentHandler) {
            (currentHandler as EventHandler<unknown>)(payload);
          }
        };
        return eventBus.on(event, wrappedHandler as EventHandler<AppEventMap[typeof event]>);
      }
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
    // Re-subscribe when handler keys change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventBus, Object.keys(handlers).join(",")]);
}
