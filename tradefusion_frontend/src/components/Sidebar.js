import React from 'react';

// PUBLIC_INTERFACE
/**
 * Sidebar component - placeholder for main navigation
 */
const Sidebar = () => (
  <aside style={{ width: '220px', padding: '1rem', background: '#182237', color: '#fff', minHeight: '100vh' }}>
    <h2>Sidebar</h2>
    <ul style={{ listStyle: 'none', padding: 0 }}>
      <li>Strategy Builder</li>
      <li>Historical Data</li>
      <li>Backtesting</li>
      <li>Paper Trading</li>
      <li>Portfolio</li>
      <li>Broker API</li>
      <li>AI Assistant</li>
    </ul>
  </aside>
);

export default Sidebar;
