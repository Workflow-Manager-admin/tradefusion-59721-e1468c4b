import React from 'react';

/**
 * PUBLIC_INTERFACE
 * DashboardLayout - primary dashboard structure for TradeFusion.
 * Arranges the sidebar, tab navigation, and main content in a modular, responsive card layout.
 * @param {object} props
 * @param {React.ReactNode} props.sidebar - The sidebar component (feature navigation)
 * @param {React.ReactNode} props.tabNavigation - The tab navigation component (top navigation for features)
 * @param {React.ReactNode} props.children - The main dashboard content/cards
 */
const DashboardLayout = ({ sidebar, tabNavigation, children }) => (
  <div style={{
    display: 'flex',
    minHeight: 'calc(100vh - 64px)',
    background: 'var(--base-dark)',
    boxSizing: 'border-box',
  }}>
    {/* Sidebar */}
    <div
      style={{
        flex: '0 0 210px',
        minWidth: 160,
        background: '#182237',
        borderRight: '1px solid var(--border-color)'
      }}
    >
      {sidebar}
    </div>
    {/* Main dashboard area */}
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#222b44',
        minWidth: 0,
        overflow: 'hidden',
        padding: 0
      }}
    >
      <div style={{ minHeight: 0 }}>
        {tabNavigation}
      </div>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2.5vw' }}>
        {children}
      </main>
    </div>
  </div>
);

export default DashboardLayout;
