# Experiments

This directory contains experimental features that are not currently active in the main app.

## PatchBuilder Modal

**Location:** `src/components/PatchBuilder/`

**Status:** Components exist but UI integration is disabled

**What it is:** A full-featured modal patch editor for the custom synthesis engine with:
- Visual ADSR envelope editors
- Knob controls for oscillator/filter parameters
- LFO modulation routing matrix
- Effects rack with visual meters
- Patch browser with factory and user patches
- Real-time parameter editing

**Why disabled:** The modal was integrated into SynthPanel but was removed to simplify the UI. The core components are complete and functional.

### Re-enabling the PatchBuilder

To re-enable the PatchBuilder modal in SynthPanel.tsx:

1. Add imports at the top:
```tsx
import { PatchBuilderModal } from "./PatchBuilder";
import { validatePatch } from "../lib/patchValidation";
import { ErrorBoundary } from "./ErrorBoundary";
```

2. Add the Edit/New button in the synth controls row (after the preset selector):
```tsx
<button
  className="edit-patch-btn"
  onClick={() => openPatchBuilder(isCustomPatch ? customPatchId : null)}
  title={isCustomPatch ? "Edit patch" : "Create custom patch"}
>
  {isCustomPatch ? "Edit" : "+ New"}
</button>
```

3. Add the modal at the end of the component (before closing `</div>`):
```tsx
<ErrorBoundary>
  <PatchBuilderModal
    isOpen={isPatchBuilderOpen}
    onClose={closePatchBuilder}
    patchId={editingPatchId}
    onSave={(patch) => {
      if (!validatePatch(patch)) {
        console.error('Invalid patch, cannot save');
        return;
      }
      customPatches.savePatch(patch);
      selectCustomPatch(patch.id);
      closePatchBuilder();
    }}
  />
</ErrorBoundary>
```

4. The required context values (`isPatchBuilderOpen`, `openPatchBuilder`, `closePatchBuilder`, `editingPatchId`, `customPatches`, `selectCustomPatch`) are already available from `useToneSynth()`.

### Related Files

- `src/components/PatchBuilder/` - All modal components
- `src/components/PatchBuilder/README.md` - Component documentation
- `src/hooks/useCustomPatches.ts` - Patch storage hook
- `src/lib/patchValidation.ts` - Patch schema validation
- `src/lib/patchStorage.ts` - IndexedDB persistence
- `LFO_UNROUTING_BUG_FIX.md` - Critical bug fix for LFO routing
