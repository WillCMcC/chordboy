/**
 * BankSelector Component
 * Dropdown for switching between chord banks with create/rename/delete actions.
 *
 * @module components/BankSelector
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { KeyboardEvent, MouseEvent, FocusEvent } from "react";
import type { ChordBankEntry } from "../types";
import "./BankSelector.css";

/** Props for BankSelector component */
interface BankSelectorProps {
  /** List of available banks */
  banks: ChordBankEntry[];
  /** ID of currently active bank */
  activeBankId: string;
  /** Callback when bank is switched */
  onSwitchBank: (bankId: string) => void;
  /** Callback when new bank is created */
  onCreateBank: (name: string) => void;
  /** Callback when bank is renamed */
  onRenameBank: (bankId: string, newName: string) => void;
  /** Callback when bank is deleted */
  onDeleteBank: (bankId: string) => void;
  /** Callback when bank is duplicated */
  onDuplicateBank: (bankId: string, newName: string) => void;
}

/**
 * Dropdown component for selecting and managing chord banks.
 */
export function BankSelector({
  banks,
  activeBankId,
  onSwitchBank,
  onCreateBank,
  onRenameBank,
  onDeleteBank,
  onDuplicateBank,
}: BankSelectorProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newBankName, setNewBankName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const activeBank = banks.find((b) => b.id === activeBankId);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setEditingId(null);
        setIsCreating(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen]);

  // Focus create input when entering create mode
  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreate = useCallback(() => {
    const trimmed = newBankName.trim();
    if (trimmed) {
      onCreateBank(trimmed);
      setNewBankName("");
      setIsCreating(false);
    }
  }, [newBankName, onCreateBank]);

  const handleCreateKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleCreate();
      } else if (e.key === "Escape") {
        setIsCreating(false);
        setNewBankName("");
      }
    },
    [handleCreate]
  );

  const handleRenameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, bankId: string) => {
      if (e.key === "Enter") {
        const newName = e.currentTarget.value.trim();
        if (newName) {
          onRenameBank(bankId, newName);
        }
        setEditingId(null);
      } else if (e.key === "Escape") {
        setEditingId(null);
      }
    },
    [onRenameBank]
  );

  const handleRenameBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>, bankId: string) => {
      const newName = e.target.value.trim();
      if (newName) {
        onRenameBank(bankId, newName);
      }
      setEditingId(null);
    },
    [onRenameBank]
  );

  const handleDuplicate = useCallback(
    (e: MouseEvent<HTMLButtonElement>, bank: ChordBankEntry) => {
      e.stopPropagation();
      onDuplicateBank(bank.id, `${bank.name} (copy)`);
    },
    [onDuplicateBank]
  );

  const handleDelete = useCallback(
    (e: MouseEvent<HTMLButtonElement>, bankId: string) => {
      e.stopPropagation();
      onDeleteBank(bankId);
    },
    [onDeleteBank]
  );

  return (
    <div className="bank-selector" ref={menuRef}>
      <button
        className="bank-selector-trigger"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        data-testid="bank-selector-trigger"
      >
        <span className="bank-name">{activeBank?.name ?? "Default"}</span>
        <span className="bank-count">({activeBank?.presetCount ?? 0})</span>
        <span className="dropdown-arrow">{isMenuOpen ? "\u25B2" : "\u25BC"}</span>
      </button>

      {isMenuOpen && (
        <div className="bank-menu" data-testid="bank-menu">
          <div className="bank-list">
            {banks.map((bank) => (
              <div
                key={bank.id}
                className={`bank-item ${bank.id === activeBankId ? "active" : ""}`}
                data-testid={`bank-item-${bank.id}`}
              >
                {editingId === bank.id ? (
                  <input
                    type="text"
                    className="bank-rename-input"
                    defaultValue={bank.name}
                    autoFocus
                    onBlur={(e) => handleRenameBlur(e, bank.id)}
                    onKeyDown={(e) => handleRenameKeyDown(e, bank.id)}
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`bank-rename-input-${bank.id}`}
                  />
                ) : (
                  <>
                    <button
                      className="bank-select-btn"
                      onClick={() => {
                        onSwitchBank(bank.id);
                        setIsMenuOpen(false);
                      }}
                      data-testid={`bank-select-${bank.id}`}
                    >
                      <span className="bank-select-name">{bank.name}</span>
                      <span className="bank-preset-count">{bank.presetCount}</span>
                    </button>
                    <div className="bank-actions">
                      <button
                        className="bank-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(bank.id);
                        }}
                        title="Rename"
                        data-testid={`bank-rename-${bank.id}`}
                      >
                        <span className="action-icon">R</span>
                      </button>
                      <button
                        className="bank-action-btn"
                        onClick={(e) => handleDuplicate(e, bank)}
                        title="Duplicate"
                        data-testid={`bank-duplicate-${bank.id}`}
                      >
                        <span className="action-icon">D</span>
                      </button>
                      {banks.length > 1 && (
                        <button
                          className="bank-action-btn delete"
                          onClick={(e) => handleDelete(e, bank.id)}
                          title="Delete"
                          data-testid={`bank-delete-${bank.id}`}
                        >
                          <span className="action-icon">X</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="bank-menu-footer">
            {isCreating ? (
              <div className="create-bank-form">
                <input
                  ref={createInputRef}
                  type="text"
                  className="create-bank-input"
                  placeholder="Bank name..."
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  onKeyDown={handleCreateKeyDown}
                  data-testid="create-bank-input"
                />
                <button
                  className="create-bank-submit"
                  onClick={handleCreate}
                  disabled={!newBankName.trim()}
                  data-testid="create-bank-submit"
                >
                  Add
                </button>
                <button
                  className="create-bank-cancel"
                  onClick={() => {
                    setIsCreating(false);
                    setNewBankName("");
                  }}
                  data-testid="create-bank-cancel"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="create-bank-btn"
                onClick={() => setIsCreating(true)}
                data-testid="create-bank-btn"
              >
                + New Bank
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
