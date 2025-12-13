# PatchBuilder Control Components

Base UI control components for the ChordBoy patch builder interface. These components follow the existing glass-morphism design language with purple accent colors.

## Components

### KnobControl

Rotary knob component with drag-to-change behavior.

**Features:**
- Drag up/down to adjust value (not circular motion)
- Hold Shift for fine control (0.5x sensitivity)
- Touch-friendly with 48px minimum target
- Visual indicator line shows current position
- Supports bipolar mode (centered at 0)

**Props:**
- `label: string` - Label text displayed above knob
- `value: number` - Current value
- `min: number` - Minimum value
- `max: number` - Maximum value
- `step?: number` - Step increment (default: 1)
- `onChange: (value: number) => void` - Value change handler
- `unit?: string` - Unit suffix for display (e.g., "Hz", "ms", "%")
- `bipolar?: boolean` - Use blue colors for bipolar controls (default: false)
- `disabled?: boolean` - Disable interaction (default: false)

**Example:**
```tsx
<KnobControl
  label="Cutoff"
  value={1000}
  min={20}
  max={20000}
  step={10}
  onChange={(val) => setPatchParam('cutoff', val)}
  unit="Hz"
/>
```

### SliderControl

Horizontal slider component with CSS-styled range input.

**Props:**
- `label: string` - Label text
- `value: number` - Current value
- `min: number` - Minimum value
- `max: number` - Maximum value
- `step?: number` - Step increment (default: 1)
- `onChange: (value: number) => void` - Value change handler
- `unit?: string` - Unit suffix for display
- `disabled?: boolean` - Disable interaction (default: false)

**Example:**
```tsx
<SliderControl
  label="Volume"
  value={0.8}
  min={0}
  max={1}
  step={0.01}
  onChange={(val) => setVolume(val)}
  unit=""
/>
```

### DropdownControl

Styled select dropdown matching the glass-morphism theme.

**Props:**
- `label: string` - Label text
- `value: string | number` - Current selected value
- `options: DropdownOption[]` - Array of {value, label} options
- `onChange: (value: string | number) => void` - Selection change handler
- `disabled?: boolean` - Disable interaction (default: false)

**DropdownOption type:**
```typescript
interface DropdownOption {
  value: string | number;
  label: string;
}
```

**Example:**
```tsx
<DropdownControl
  label="Waveform"
  value={waveform}
  options={[
    { value: 'sine', label: 'Sine' },
    { value: 'square', label: 'Square' },
    { value: 'sawtooth', label: 'Sawtooth' },
    { value: 'triangle', label: 'Triangle' },
  ]}
  onChange={(val) => setWaveform(val as string)}
/>
```

### SectionHeader

Collapsible section header with optional enable/disable toggle.

**Props:**
- `title: string` - Section title
- `enabled?: boolean` - Enable state (for toggle button)
- `onToggle?: (enabled: boolean) => void` - Toggle handler (shows toggle button when provided)
- `collapsed?: boolean` - Initial collapsed state (default: false)
- `onCollapseToggle?: (collapsed: boolean) => void` - Collapse handler (shows arrow when provided)
- `children?: React.ReactNode` - Content to render in collapsible area

**Example:**
```tsx
<SectionHeader
  title="Filter"
  enabled={filterEnabled}
  onToggle={setFilterEnabled}
  collapsed={false}
  onCollapseToggle={(collapsed) => console.log('Collapsed:', collapsed)}
>
  <div style={{ display: 'flex', gap: '16px', padding: '16px 0' }}>
    <KnobControl label="Cutoff" value={1000} min={20} max={20000} onChange={setCutoff} />
    <KnobControl label="Resonance" value={0.5} min={0} max={1} onChange={setResonance} />
  </div>
</SectionHeader>
```

## Usage

Import the components you need:

```tsx
import {
  KnobControl,
  SliderControl,
  DropdownControl,
  SectionHeader,
  type DropdownOption,
} from '@/components/PatchBuilder';
```

## Design Tokens

The components use CSS variables from the global theme:

- Purple accent: `#8b5cf6`, `#7c3aed`
- Blue (bipolar): `#3b82f6`, `#60a5fa`
- Dark backgrounds: `rgba(0, 0, 0, 0.3-0.4)`
- Glass-morphism borders: `rgba(139, 92, 246, 0.25)`
- Text colors: `--text-primary`, `--text-secondary`, `--text-muted`

## Touch Optimization

All controls include:
- Minimum 44px touch targets on mobile
- Larger controls on mobile (knobs: 52px, slider thumbs: 20px)
- Touch feedback animations
- Prevented default touch behaviors for drag operations

## Accessibility

- Semantic HTML elements
- ARIA labels on interactive elements
- Keyboard navigation support (native for sliders/dropdowns)
- Clear visual focus states
- Sufficient color contrast
