/**
 * Test preset fixtures for common jazz chord progressions
 */

export interface TestPreset {
  slot: number;
  root: string;
  quality: string;
  extensions?: string[];
  expectedName?: string; // Expected chord display name
  expectedNotes?: number[]; // Expected MIDI note numbers
}

export interface PresetFixture {
  name: string;
  description: string;
  presets: TestPreset[];
}

/**
 * ii-V-I progression in C major
 */
export const II_V_I_C: PresetFixture = {
  name: 'ii-V-I in C',
  description: 'Classic jazz turnaround',
  presets: [
    {
      slot: 1,
      root: 'D',
      quality: 'minor',
      extensions: [],
      expectedName: 'D min',
    },
    {
      slot: 2,
      root: 'G',
      quality: 'dom7',
      extensions: [],
      expectedName: 'G7',
    },
    {
      slot: 3,
      root: 'C',
      quality: 'maj7',
      extensions: [],
      expectedName: 'C Maj7',
    },
  ],
};

/**
 * Extended ii-V-I with 9ths
 */
export const II_V_I_EXTENDED: PresetFixture = {
  name: 'ii-V-I Extended',
  description: 'ii-V-I with 9th extensions',
  presets: [
    {
      slot: 1,
      root: 'D',
      quality: 'min7',
      extensions: ['9th'],
      expectedName: 'D min9',
    },
    {
      slot: 2,
      root: 'G',
      quality: 'dom7',
      extensions: ['9th'],
      expectedName: 'G9',
    },
    {
      slot: 3,
      root: 'C',
      quality: 'maj7',
      extensions: ['9th'],
      expectedName: 'C Maj7 9',
    },
  ],
};

/**
 * Modal vamp (Dorian)
 */
export const MODAL_VAMP: PresetFixture = {
  name: 'Modal Vamp',
  description: 'D Dorian and E Dorian',
  presets: [
    {
      slot: 1,
      root: 'D',
      quality: 'min7',
      extensions: ['9th'],
      expectedName: 'D min9',
    },
    {
      slot: 2,
      root: 'E',
      quality: 'min7',
      extensions: ['9th'],
      expectedName: 'E min9',
    },
  ],
};

/**
 * Rhythm changes (A section)
 */
export const RHYTHM_CHANGES_A: PresetFixture = {
  name: 'Rhythm Changes A',
  description: 'I-VI-ii-V in Bb',
  presets: [
    {
      slot: 1,
      root: 'B',
      quality: 'maj7',
      extensions: [],
      expectedName: 'B Maj7',
    },
    {
      slot: 2,
      root: 'G',
      quality: 'dom7',
      extensions: [],
      expectedName: 'G7',
    },
    {
      slot: 3,
      root: 'C',
      quality: 'minor',
      extensions: [],
      expectedName: 'C min',
    },
    {
      slot: 4,
      root: 'F',
      quality: 'dom7',
      extensions: [],
      expectedName: 'F7',
    },
  ],
};

/**
 * Altered dominant progression
 */
export const ALTERED_DOMINANTS: PresetFixture = {
  name: 'Altered Dominants',
  description: 'Dominant chords with alterations',
  presets: [
    {
      slot: 1,
      root: 'G',
      quality: 'dom7',
      extensions: ['b5'],
      expectedName: 'G7♭5',
    },
    // Note: #5 not available as keyboard modifier
    {
      slot: 2,
      root: 'G',
      quality: 'dom7',
      extensions: ['b9'],
      expectedName: 'G7♭9',
    },
    {
      slot: 3,
      root: 'G',
      quality: 'dom7',
      extensions: ['#9'],
      expectedName: 'G7♯9',
    },
    {
      slot: 4,
      root: 'G',
      quality: 'dom7',
      extensions: ['#11'],
      expectedName: 'G7♯11',
    },
  ],
};

/**
 * Basic triads for testing
 */
export const BASIC_TRIADS: PresetFixture = {
  name: 'Basic Triads',
  description: 'Major, minor, diminished',
  presets: [
    {
      slot: 1,
      root: 'C',
      quality: 'major',
      extensions: [],
      expectedName: 'C',
    },
    {
      slot: 2,
      root: 'C',
      quality: 'minor',
      extensions: [],
      expectedName: 'C min',
    },
    {
      slot: 3,
      root: 'C',
      quality: 'diminished',
      extensions: [],
      expectedName: 'C dim',
    },
    // Note: augmented uses '7' key which conflicts with preset slot 7
  ],
};

/**
 * All available preset fixtures
 */
export const PRESET_FIXTURES = {
  ii_v_i_c: II_V_I_C,
  ii_v_i_extended: II_V_I_EXTENDED,
  modal_vamp: MODAL_VAMP,
  rhythm_changes_a: RHYTHM_CHANGES_A,
  altered_dominants: ALTERED_DOMINANTS,
  basic_triads: BASIC_TRIADS,
};

/**
 * Helper function to load a preset fixture
 */
export function getPresetFixture(name: keyof typeof PRESET_FIXTURES): PresetFixture {
  return PRESET_FIXTURES[name];
}
