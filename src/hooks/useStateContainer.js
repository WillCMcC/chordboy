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

import { useRef, useState, useCallback, useMemo } from "react";

/**
 * Create a state container that keeps a ref in sync with state.
 *
 * @param {Object} initialState - Initial state values
 * @returns {[Object, Object, Function]} [containerRef, setters, getState]
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
export function useStateContainer(initialState) {
  // The container ref that's always current
  const containerRef = useRef({ ...initialState });

  // React state for re-renders (stored as object for batch updates)
  const [, forceUpdate] = useState(0);

  // Create setter for each key
  const setters = useMemo(() => {
    const result = {};
    Object.keys(initialState).forEach((key) => {
      result[key] = (valueOrFn) => {
        const newValue =
          typeof valueOrFn === "function"
            ? valueOrFn(containerRef.current[key])
            : valueOrFn;

        // Only update if value changed
        if (containerRef.current[key] !== newValue) {
          containerRef.current[key] = newValue;
          forceUpdate((n) => n + 1);
        }
      };
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get current state snapshot
  const getState = useCallback(() => ({ ...containerRef.current }), []);

  return [containerRef, setters, getState];
}

/**
 * Create a callback ref pattern - keeps callbacks in a ref without re-subscribing.
 * Useful for Web Worker message handlers or event listeners that shouldn't
 * cause re-subscription when callbacks change.
 *
 * @param {Object} callbacks - Object of callback functions
 * @returns {Object} Ref containing callbacks (ref.current.callbackName)
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
export function useCallbackRef(callbacks) {
  const ref = useRef(callbacks);
  // Update ref on every render (no effect needed)
  ref.current = callbacks;
  return ref;
}
