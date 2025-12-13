import React, { useState } from 'react';
import './controls.css';

interface SectionHeaderProps {
  title: string;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  collapsed?: boolean;
  onCollapseToggle?: (collapsed: boolean) => void;
  children?: React.ReactNode;
}

/**
 * Collapsible section header with optional enable/disable toggle
 * - Toggle button when onToggle provided
 * - Collapse/expand arrow when onCollapseToggle provided
 * - Renders children in collapsible content area
 */
export function SectionHeader({
  title,
  enabled = true,
  onToggle,
  collapsed = false,
  onCollapseToggle,
  children,
}: SectionHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const handleToggle = () => {
    if (onToggle) {
      onToggle(!enabled);
    }
  };

  const handleCollapseToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    if (onCollapseToggle) {
      onCollapseToggle(newCollapsed);
    }
  };

  return (
    <div className="section-header-wrapper">
      <div className="section-header">
        <div className="section-header-content">
          {onToggle && (
            <button
              className={`section-toggle ${enabled ? 'active' : ''}`}
              onClick={handleToggle}
              aria-label={`${enabled ? 'Disable' : 'Enable'} ${title}`}
            >
              {enabled ? '✓' : ''}
            </button>
          )}
          <div className="section-title">{title}</div>
        </div>
        {onCollapseToggle && (
          <button
            className={`section-collapse-btn ${isCollapsed ? 'collapsed' : ''}`}
            onClick={handleCollapseToggle}
            aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${title}`}
          >
            <span className="section-collapse-arrow">▼</span>
          </button>
        )}
      </div>
      {children && (
        <div className={`section-content ${isCollapsed ? 'collapsed' : 'expanded'}`}>
          {children}
        </div>
      )}
    </div>
  );
}
