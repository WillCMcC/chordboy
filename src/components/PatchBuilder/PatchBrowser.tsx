/**
 * PatchBrowser Component
 * Browse and select patches from factory and custom library.
 * Displays patches grouped by category with search functionality.
 */

import { useState, useMemo } from 'react';
import { useCustomPatches } from '../../hooks/useCustomPatches';
import type { PatchCategory, PatchLibraryEntry } from '../../types/synth';
import './patch-browser.css';

interface PatchBrowserProps {
  onSelect: (patchId: string) => void;
  currentPatchId?: string;
}

// Category labels and order
const CATEGORY_LABELS: Record<PatchCategory, string> = {
  keys: 'Keys',
  pad: 'Pads',
  lead: 'Leads',
  bass: 'Bass',
  fx: 'FX',
  custom: 'Custom',
};

const CATEGORY_ORDER: PatchCategory[] = ['keys', 'pad', 'lead', 'bass', 'fx', 'custom'];

/**
 * PatchBrowser Component
 */
export function PatchBrowser({ onSelect, currentPatchId }: PatchBrowserProps) {
  const { patchLibrary, isLoaded } = useCustomPatches();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter patches by search query
  const filteredPatches = useMemo(() => {
    if (!searchQuery.trim()) {
      return patchLibrary;
    }

    const query = searchQuery.toLowerCase();
    return patchLibrary.filter(
      (patch) =>
        patch.name.toLowerCase().includes(query) ||
        patch.category.toLowerCase().includes(query)
    );
  }, [patchLibrary, searchQuery]);

  // Group patches by category
  const groupedPatches = useMemo(() => {
    const groups: Record<PatchCategory, PatchLibraryEntry[]> = {
      keys: [],
      pad: [],
      lead: [],
      bass: [],
      fx: [],
      custom: [],
    };

    filteredPatches.forEach((patch) => {
      groups[patch.category].push(patch);
    });

    return groups;
  }, [filteredPatches]);

  if (!isLoaded) {
    return (
      <div className="patch-browser">
        <div className="patch-browser-loading">Loading patches...</div>
      </div>
    );
  }

  return (
    <div className="patch-browser">
      <div className="patch-browser-header">
        <h3>Patch Browser</h3>
        <input
          type="text"
          className="patch-search-input"
          placeholder="Search patches..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search patches"
        />
      </div>

      <div className="patch-browser-content">
        {filteredPatches.length === 0 ? (
          <div className="patch-browser-empty">
            {searchQuery ? 'No patches found matching your search.' : 'No patches available.'}
          </div>
        ) : (
          <div className="patch-categories">
            {CATEGORY_ORDER.map((category) => {
              const patches = groupedPatches[category];
              if (patches.length === 0) return null;

              return (
                <div key={category} className="patch-category">
                  <div className="patch-category-header">
                    <span className="patch-category-label">{CATEGORY_LABELS[category]}</span>
                    <span className="patch-category-count">{patches.length}</span>
                  </div>
                  <div className="patch-list">
                    {patches.map((patch) => (
                      <button
                        key={patch.id}
                        className={`patch-item ${
                          patch.id === currentPatchId ? 'active' : ''
                        } ${patch.isFactory ? 'factory' : 'custom'}`}
                        onClick={() => onSelect(patch.id)}
                        aria-label={`Select patch ${patch.name}`}
                      >
                        <div className="patch-item-content">
                          <span className="patch-item-name">{patch.name}</span>
                          <div className="patch-item-badges">
                            <span className="patch-category-badge">
                              {CATEGORY_LABELS[patch.category]}
                            </span>
                            {patch.isFactory && (
                              <span className="patch-factory-badge" title="Factory patch">
                                🔒
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
