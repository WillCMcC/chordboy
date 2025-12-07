/**
 * useStateContainer Hook
 * Manages a mutable ref container alongside React state.
 *
 * Replaces the anti-pattern of syncing refs to state with useEffect:
 *   const valueRef = useRef(value);
 *   useEffect(() => { valueRef.current = value; }, [value]);
 *
 * Instead, use a single container that's always in sync:
 *   const [container, setters] = useStateContainer({ value: 0 });
 *   // container.current.value is always current
 *   // setters.value(5) updates both ref and triggers re-render
 *
 * @module hooks/useStateContainer
 */

import { useRef, useState, useCallback, useMemo, MutableRefObject } from "react";

/** Setter function type - can accept value or updater function */
type StateSetter<T> = (valueOrFn: T | ((prev: T) => T)) => void;

/** Setters object type - maps each key to a setter function */
type StateSetters<T extends Record<string, unknown>> = {
  [K in keyof T]: StateSetter<T[K]>;
};

/** Return type for useStateContainer */
export type UseStateContainerReturn<T extends Record<string, unknown>> = [
  MutableRefObject<T>,
  StateSetters<T>,
  () => T
];

/**
 * Create a state container that keeps a ref in sync with state.
 *
 * @param initialState - Initial state values
 * @returns [containerRef, setters, getState]
 *
 * @example
 * const [container, setters, getState] = useStateContainer({
 *   sequencerEnabled: false,
 *   sequencerSteps: 8,
 *   sequence: [],
 * });
 *
 * // In callbacks that need current values:
 * const handlePulse = () => {
 *   if (container.current.sequencerEnabled) {
 *     // ...
 *   }
 * };
 *
 * // To update state (triggers re-render):
 * setters.sequencerEnabled(true);
 * setters.sequencerSteps(prev => prev * 2);
 *
 * // To get current state object:
 * const state = getState();
 */
export function useStateContainer<T extends Record<string, unknown>>(
  initialState: T
): UseStateContainerReturn<T> {
  // The container ref that's always current
  const containerRef = useRef<T>({ ...initialState });

  // React state for re-renders (stored as object for batch updates)
  const [, forceUpdate] = useState<number>(0);

  // Create setter for each key
  const setters = useMemo(() => {
    const result = {} as StateSetters<T>;
    (Object.keys(initialState) as Array<keyof T>).forEach((key) => {
      result[key] = ((valueOrFn: T[typeof key] | ((prev: T[typeof key]) => T[typeof key])) => {
        const newValue =
          typeof valueOrFn === "function"
            ? (valueOrFn as (prev: T[typeof key]) => T[typeof key])(containerRef.current[key])
            : valueOrFn;

        // Only update if value changed
        if (containerRef.current[key] !== newValue) {
          containerRef.current[key] = newValue;
          forceUpdate((n) => n + 1);
        }
      }) as StateSetter<T[typeof key]>;
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get current state snapshot
  const getState = useCallback((): T => ({ ...containerRef.current }), []);

  return [containerRef, setters, getState];
}

/** Callback ref type - generic to support any callback signatures */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CallbackRef<T extends Record<string, ((...args: any[]) => any) | undefined>> = MutableRefObject<T>;

/**
 * Create a callback ref pattern - keeps callbacks in a ref without re-subscribing.
 * Useful for Web Worker message handlers or event listeners that shouldn't
 * cause re-subscription when callbacks change.
 *
 * @param callbacks - Object of callback functions
 * @returns Ref containing callbacks (ref.current.callbackName)
 *
 * @example
 * const callbacksRef = useCallbackRef({
 *   onTriggerPreset,
 *   onRetriggerPreset,
 *   onStopNotes,
 * });
 *
 * // In worker message handler:
 * worker.onmessage = (e) => {
 *   callbacksRef.current.onTriggerPreset?.(preset);
 * };
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCallbackRef<T extends Record<string, ((...args: any[]) => any) | undefined>>(
  callbacks: T
): CallbackRef<T> {
  const ref = useRef<T>(callbacks);
  // Update ref on every render (no effect needed)
  ref.current = callbacks;
  return ref;
}
