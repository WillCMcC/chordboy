/**
 * Chord Solver
 * Finds optimal voicings for a sequence of chords to minimize voice movement.
 * Uses dynamic programming to find the best inversion/spread/drop combination.
 */

import { buildChord, invertChord } from "./chordBuilder";
import { parseKeys } from "./parseKeys";
import { applyProgressiveDrop, applySpread } from "./voicingTransforms";

/**
 * Calculate the total voice distance between two chord voicings.
 * Measures how much each voice needs to move between chords.
 * @param {Array<number>} chord1 - First chord MIDI notes (sorted)
 * @param {Array<number>} chord2 - Second chord MIDI notes (sorted)
 * @returns {number} Total semitone distance
 */
function calculateVoiceDistance(chord1, chord2) {
  if (!chord1 || !chord2 || chord1.length === 0 || chord2.length === 0) {
    return Infinity;
  }

  // If chords have different numbers of notes, handle accordingly
  const maxLen = Math.max(chord1.length, chord2.length);
  const minLen = Math.min(chord1.length, chord2.length);

  let totalDistance = 0;

  // Match voices from bass up
  for (let i = 0; i < minLen; i++) {
    totalDistance += Math.abs(chord1[i] - chord2[i]);
  }

  // Penalize voice count differences
  totalDistance += (maxLen - minLen) * 12; // One octave penalty per missing voice

  return totalDistance;
}

/**
 * Generate all possible voicings for a chord
 * @param {Object} preset - Preset object with keys, octave, etc.
 * @returns {Array<Object>} Array of voicing options with their resulting notes
 */
function generateAllVoicings(preset) {
  const parsedKeys = parseKeys(preset.keys);
  if (!parsedKeys.root) return [];

  const baseChord = buildChord(parsedKeys.root, parsedKeys.modifiers, {
    octave: preset.octave,
  });

  if (!baseChord || !baseChord.notes) return [];

  const voicings = [];
  const numNotes = baseChord.notes.length;
  const maxInversions = numNotes;
  const maxDrops = Math.max(0, numNotes - 1);
  const maxSpread = 3;

  // Generate combinations - but limit to reasonable options
  // Prioritize: inversions (most important), some spread, minimal drops
  for (let inversion = 0; inversion < maxInversions; inversion++) {
    for (let spread = 0; spread <= maxSpread; spread++) {
      for (let drops = 0; drops <= maxDrops; drops++) {
        let notes = [...baseChord.notes];

        // Apply in the same order as useChordEngine
        if (drops > 0) {
          notes = applyProgressiveDrop(notes, drops);
        }
        if (spread > 0) {
          notes = applySpread(notes, spread);
        }
        notes = invertChord(notes, inversion);

        voicings.push({
          inversionIndex: inversion,
          spreadAmount: spread,
          droppedNotes: drops,
          notes: notes.sort((a, b) => a - b),
        });
      }
    }
  }

  return voicings;
}

/**
 * Generate voicings with octave shifts for a chord
 * @param {Object} preset - Preset object
 * @param {number} octaveRange - How many octaves up/down to try
 * @returns {Array<Object>} Array of voicing options
 */
function generateVoicingsWithOctaveShifts(preset, octaveRange = 1) {
  const allVoicings = [];

  for (
    let octaveShift = -octaveRange;
    octaveShift <= octaveRange;
    octaveShift++
  ) {
    const shiftedPreset = {
      ...preset,
      octave: Math.max(1, Math.min(7, preset.octave + octaveShift)),
    };

    const voicings = generateAllVoicings(shiftedPreset);
    voicings.forEach((v) => {
      v.octave = shiftedPreset.octave;
      allVoicings.push(v);
    });
  }

  return allVoicings;
}

/**
 * Solve for optimal voicings using dynamic programming
 * @param {Array<Object>} presets - Array of preset objects in order
 * @param {Object} options - Solver options
 * @param {number} options.targetOctave - Preferred octave to center voicings around
 * @returns {Array<Object>} Optimal voicing settings for each chord
 */
export function solveChordVoicings(presets, options = {}) {
  const { targetOctave } = options;

  if (!presets || presets.length === 0) return [];
  if (presets.length === 1) {
    // Single chord - return default voicing
    return [
      {
        inversionIndex: presets[0].inversionIndex || 0,
        spreadAmount: presets[0].spreadAmount || 0,
        droppedNotes: presets[0].droppedNotes || 0,
        octave: targetOctave || presets[0].octave,
      },
    ];
  }

  // Generate all possible voicings for each chord
  // If targetOctave is specified, use it as the base for all presets
  const allVoicings = presets.map((preset) => {
    const presetWithTargetOctave = targetOctave
      ? { ...preset, octave: targetOctave }
      : preset;
    return generateVoicingsWithOctaveShifts(presetWithTargetOctave, 1);
  });

  // Check if any chord has no valid voicings
  if (allVoicings.some((v) => v.length === 0)) {
    console.error("Some chords have no valid voicings");
    return presets.map((p) => ({
      inversionIndex: p.inversionIndex || 0,
      spreadAmount: p.spreadAmount || 0,
      droppedNotes: p.droppedNotes || 0,
      octave: p.octave,
    }));
  }

  const n = presets.length;

  // dp[i][j] = minimum total distance to reach chord i with voicing j
  const dp = [];
  const parent = []; // To reconstruct the path

  // Initialize first chord (no distance to start)
  dp[0] = allVoicings[0].map(() => 0);
  parent[0] = allVoicings[0].map(() => -1);

  // Fill DP table
  for (let i = 1; i < n; i++) {
    dp[i] = [];
    parent[i] = [];

    for (let j = 0; j < allVoicings[i].length; j++) {
      let minDist = Infinity;
      let minParent = 0;

      for (let k = 0; k < allVoicings[i - 1].length; k++) {
        const dist =
          dp[i - 1][k] +
          calculateVoiceDistance(
            allVoicings[i - 1][k].notes,
            allVoicings[i][j].notes
          );

        if (dist < minDist) {
          minDist = dist;
          minParent = k;
        }
      }

      dp[i][j] = minDist;
      parent[i][j] = minParent;
    }
  }

  // Find the best ending voicing
  let minFinalDist = Infinity;
  let bestFinalVoicing = 0;
  for (let j = 0; j < allVoicings[n - 1].length; j++) {
    if (dp[n - 1][j] < minFinalDist) {
      minFinalDist = dp[n - 1][j];
      bestFinalVoicing = j;
    }
  }

  // Reconstruct the optimal path
  const result = new Array(n);
  let currentVoicing = bestFinalVoicing;

  for (let i = n - 1; i >= 0; i--) {
    const voicing = allVoicings[i][currentVoicing];
    result[i] = {
      inversionIndex: voicing.inversionIndex,
      spreadAmount: voicing.spreadAmount,
      droppedNotes: voicing.droppedNotes,
      octave: voicing.octave,
    };
    currentVoicing = parent[i][currentVoicing];
  }

  console.log("Solved voicings:", result);
  console.log("Total voice movement:", minFinalDist);

  return result;
}

/**
 * Get a preview of the solved chord notes
 * @param {Object} preset - Preset object
 * @param {Object} voicing - Voicing settings
 * @returns {Array<number>} MIDI notes for the voiced chord
 */
export function getVoicedChordNotes(preset, voicing) {
  const parsedKeys = parseKeys(preset.keys);
  if (!parsedKeys.root) return [];

  const baseChord = buildChord(parsedKeys.root, parsedKeys.modifiers, {
    octave: voicing.octave,
  });

  if (!baseChord || !baseChord.notes) return [];

  let notes = [...baseChord.notes];

  if (voicing.droppedNotes > 0) {
    notes = applyProgressiveDrop(notes, voicing.droppedNotes);
  }
  if (voicing.spreadAmount > 0) {
    notes = applySpread(notes, voicing.spreadAmount);
  }
  notes = invertChord(notes, voicing.inversionIndex);

  return notes.sort((a, b) => a - b);
}
