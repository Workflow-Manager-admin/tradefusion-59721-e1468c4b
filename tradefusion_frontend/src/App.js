import React, { useState } from 'react';
import './App.css';

import DashboardLayout from './components/DashboardLayout';
import Sidebar from './components/Sidebar';
import TabNavigation from './components/TabNavigation';

import StrategyBuilder from './components/StrategyBuilder';
import HistoricalDataViewer from './components/HistoricalDataViewer';
import BacktestingSimulator from './components/BacktestingSimulator';
import PaperTradingDashboard from './components/PaperTradingDashboard';
import PortfolioTracker from './components/PortfolioTracker';
import BrokerAPIIntegration from './components/BrokerAPIIntegration';
import AIStrategyAssistant from './components/AIStrategyAssistant';

// Array of dashboard features for navigation
const features = [
  {
    key: 'strategy-builder',
    label: 'Strategy Builder',
    component: <StrategyBuilder />
  },
  {
    key: 'historical-data',
    label: 'Historical Data',
    component: <HistoricalDataViewer />
  },
  {
    key: 'backtesting',
    label: 'Backtesting',
    component: <BacktestingSimulator />
  },
  {
    key: 'paper-trading',
    label: 'Paper Trading',
    component: <PaperTradingDashboard />
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    component: <PortfolioTracker />
  },
  {
    key: 'broker-api',
    label: 'Broker API',
    component: <BrokerAPIIntegration />
  },
  {
    key: 'ai-assistant',
    label: 'AI Assistant',
    component: <AIStrategyAssistant />
  },
];

function App() {
  // Track current feature tab
  const [activeTab, setActiveTab] = useState(features[0].key);

  const getActiveComponent = () => {
    const active = features.find(f => f.key === activeTab);
    return active ? active.component : null;
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div className="logo">
              <span className="logo-symbol">*</span> TradeFusion
            </div>
            <span className="subtitle" style={{ display: 'flex', alignItems: 'center', color: '#00ffff', fontWeight: 400, fontSize: '1.05rem' }}>
              Modular FinTech Dashboard
            </span>
          </div>
        </div>
      </nav>
      <div style={{ paddingTop: 64, minHeight: '100vh', background: 'var(--base-dark)' }}>
        <DashboardLayout
          sidebar={
            <Sidebar
              features={features}
              activeTab={activeTab}
              onNavigate={setActiveTab}
            />
          }
          tabNavigation={
            <TabNavigation
              features={features}
              activeTab={activeTab}
              onNavigate={setActiveTab}
            />
          }
        >
          <div style={{
            background: '#28324a',
            borderRadius: 16,
            boxShadow: '0 4px 16px 0 rgba(0,17,40,0.18)',
            padding: '2.5rem 1.5rem',
            margin: '0 auto',
            maxWidth: 900,
            minHeight: '360px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {getActiveComponent()}
          </div>
        </DashboardLayout>
      </div>
    </div>
  );
}

export default App;