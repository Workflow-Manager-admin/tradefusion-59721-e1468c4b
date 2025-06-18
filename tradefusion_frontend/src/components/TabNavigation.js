import React from 'react';

// PUBLIC_INTERFACE
/**
 * TabNavigation - horizontal navigation for dashboard features (above main content)
 * @param {object} props
 * @param {Array} props.features - List of feature objects
 * @param {string} props.activeTab - Current tab key
 * @param {function} props.onNavigate - Callback to switch tab
 */
const TabNavigation = ({ features, activeTab, onNavigate }) => (
  <nav
    style={{
      borderBottom: '1.5px solid #28324a',
      background: '#151a2c',
      padding: '0.6rem 0.8vw',
      minHeight: 52,
      display: 'flex',
      gap: '0.7rem',
      alignItems: 'center',
      overflowX: 'auto'
    }}
    aria-label="Dashboard main navigation"
  >
    {features.map(f => (
      <button
        key={f.key}
        style={{
          background: activeTab === f.key ? 'var(--base-light)' : 'none',
          color: activeTab === f.key ? '#111' : '#d8fcfc',
          border: 'none',
          fontWeight: activeTab === f.key ? 600 : 400,
          fontSize: '1.04rem',
          padding: '9px 1.2rem',
          borderRadius: '2rem',
          marginRight: '0.22rem',
          minWidth: 100,
          transition: 'background 0.15s,color 0.15s',
          outline: 'none',
          cursor: 'pointer',
          boxShadow: activeTab === f.key ? '0 2px 8px 0 rgba(0,255,255,0.10)' : undefined
        }}
        aria-current={activeTab === f.key ? 'page' : undefined}
        onClick={() => onNavigate(f.key)}
        tabIndex={0}
      >
        {f.label}
      </button>
    ))}
  </nav>
);

export default TabNavigation;
