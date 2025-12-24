import { useCallback } from "react";
import type { Dispatch, SetStateAction, PointerEvent } from "react";
import { RIGHT_HAND_MODIFIERS } from "../../lib/keyboardMappings";

interface ModifiersSectionProps {
  mobileKeys: Set<string>;
  setMobileKeys: Dispatch<SetStateAction<Set<string>>>;
}

export function ModifiersSection({
  mobileKeys,
  setMobileKeys,
}: ModifiersSectionProps) {
  // Handle modifier key tap - toggle behavior
  const handleModifierTap = useCallback(
    (key: string): void => {
      setMobileKeys((prev) => {
        const next = new Set(prev);
        if (prev.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [setMobileKeys],
  );

  return (
    <div className="mobile-controls-section">
      <span className="mobile-controls-label">Modifiers</span>
      <div className="mobile-grid modifier-grid">
        {Object.entries(RIGHT_HAND_MODIFIERS).map(([key, label]) => (
          <button
            key={key}
            className={`mobile-btn ${mobileKeys.has(key) ? "active" : ""}`}
            data-testid={`mobile-quality-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
              e.preventDefault();
              handleModifierTap(key);
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
