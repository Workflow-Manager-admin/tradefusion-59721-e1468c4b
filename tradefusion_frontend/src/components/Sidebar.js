import React from 'react';

// PUBLIC_INTERFACE
/**
 * Sidebar navigation for dashboard features.
 * @param {object} props
 * @param {Array} props.features - List of feature objects {key, label}
 * @param {string} props.activeTab - Currently selected tab key
 * @param {function} props.onNavigate - Callback when a feature is selected
 */
const Sidebar = ({ features, activeTab, onNavigate }) => (
  <aside
    style={{
      width: '210px',
      background: '#182237',
      color: '#fff',
      minHeight: '100vh',
      padding: '2rem 0 2rem 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      borderRight: '1px solid var(--border-color)',
      boxSizing: 'border-box'
    }}
  >
    <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#00ffff', marginBottom: '2.5rem', textAlign: 'center', letterSpacing: 1 }}>
      Menu
    </div>
    <nav style={{ flex: 1 }}>
      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '.25rem'
      }}>
        {features.map(f => (
          <li key={f.key}>
            <button
              style={{
                width: '100%',
                background: activeTab === f.key ? '#28324a' : 'none',
                color: activeTab === f.key ? '#00ffff' : '#fff',
                border: 'none',
                textAlign: 'left',
                fontWeight: activeTab === f.key ? 700 : 400,
                fontSize: '1rem',
                padding: '12px 24px',
                borderRadius: activeTab === f.key ? '0 1.1rem 1.1rem 0' : '0',
                cursor: 'pointer',
                transition: 'background 0.16s',
                outline: 'none'
              }}
              aria-current={activeTab === f.key ? 'page' : undefined}
              onClick={() => onNavigate(f.key)}
              tabIndex={0}
            >
              {f.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
    <div style={{
      fontSize: '.8rem', color: '#aaa', marginTop: 'auto', textAlign: 'center', padding: '1.7rem 0 0.2rem', opacity: .87
    }}>
      © 2024 Kavia.AI
    </div>
  </aside>
);

export default Sidebar;
