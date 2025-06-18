import React, { useState, useMemo } from 'react';

// PUBLIC_INTERFACE
/**
 * PortfolioTracker
 * Shows a list of active strategies with performance cards for each strategy.
 * Provides a toggle to switch the portfolio dashboard between real, paper, and backtested views.
 * All strategy lists/cards update according to the selected view.
 */

// Mock data sources for strategies with minimal demo metrics
const MOCK_STRATEGIES = [
  {
    id: 'strat01',
    name: 'RSI < 30 Buy, RSI > 70 Sell',
    description: 'Buys when RSI is below 30, sells above 70.',
    type: 'mean-reversion',
    enabled: true,
    stats: {
      real:    { roi: 14.9, risk: 3.95, lastTrade: '2024-06-11', trades: 11 },
      paper:   { roi: 12.5, risk: 3.55, lastTrade: '2024-06-06', trades: 10 },
      backtest:{ roi: 22.1, risk: 4.1,  lastTrade: '2024-04-27', trades: 23 }
    }
  },
  {
    id: 'strat02',
    name: 'Price > SMA 50',
    description: 'Momentum trading above 50-period SMA.',
    type: 'momentum',
    enabled: true,
    stats: {
      real:    { roi: 7.1, risk: 2.18, lastTrade: '2024-06-08', trades: 7 },
      paper:   { roi: 5.4, risk: 2.99, lastTrade: '2024-06-01', trades: 8 },
      backtest:{ roi: 15.7, risk: 3.24, lastTrade: '2024-05-31', trades: 14 }
    }
  },
  {
    id: 'strat03',
    name: 'MACD Crosses Above',
    description: 'Buys on MACD crossover signals.',
    type: 'trend-following',
    enabled: false,
    stats: {
      real:    { roi: 0, risk: 0, lastTrade: null, trades: 0 },
      paper:   { roi: 0, risk: 0, lastTrade: null, trades: 0 },
      backtest:{ roi: 9.2, risk: 1.93, lastTrade: '2024-05-01', trades: 6 }
    }
  }
];

// A minimal performance card showing strategy summary
function StrategyPerformanceCard({ name, description, stats, lastTrade, trades }) {
  return (
    <div style={{
      minWidth: 244,
      minHeight: 103,
      background: '#fff',
      borderRadius: 15,
      border: `1.3px solid #e0e7ef`,
      boxShadow: '0 2.5px 12px 0 rgba(15,76,129,0.07)',
      margin: '8px 0',
      padding: '18px 22px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <div style={{ fontWeight: 600, fontSize: '1.13rem', color: '#0f4c81', marginBottom: 2 }}>{name}</div>
      <span style={{ color: '#537091', fontSize: '0.94rem', marginBottom: 7 }}>{description}</span>
      <div style={{display: 'flex', gap: 14, alignItems: 'center', fontSize: '1rem', fontWeight: 500}}>
        <span>ROI:&nbsp;<span style={{ color: stats.roi > 0 ? '#17ae61' : '#e74c3c', fontWeight: 700 }}>{stats.roi.toFixed(2)}%</span></span>
        <span style={{ color: '#b92e13', fontWeight: 600, fontSize: '0.98em'}}>Risk: <span style={{fontWeight:700}}>{stats.risk.toFixed(2)}</span></span>
        <span style={{color:'#333', fontSize:'.98em'}}>Last Trade: {lastTrade || <span style={{color:'#b0b6bd'}}>-</span>}</span>
        <span style={{ color: '#888', fontSize: '.97em' }}>Trades: {trades}</span>
      </div>
    </div>
  );
}

// View selector toggle group
function ViewToggle({ value, onChange }) {
  const opts = [
    { key: 'real', label: 'Real' },
    { key: 'paper', label: 'Paper' },
    { key: 'backtest', label: 'Backtested' }
  ];
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 15 }}>
      <span style={{ fontWeight: 700, color: '#0f4c81', marginRight: '8px', fontSize: '1.07rem' }}>Portfolio View:</span>
      {opts.map(opt => (
        <button
          key={opt.key}
          style={{
            borderRadius: 7,
            border: value === opt.key ? '1.2px solid #0f4c81' : '1.2px solid #e0e7ef',
            background: value === opt.key ? '#e9f2fa' : '#fff',
            color: value === opt.key ? '#0f4c81' : '#537091',
            fontWeight: value === opt.key ? 700 : 400,
            fontSize: '1.04rem',
            padding: '7px 23px',
            marginRight: 5,
            cursor: 'pointer',
            transition: 'background .14s'
          }}
          aria-pressed={value === opt.key}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Mock: fetch the active strategies for requested view.
 * For demo, we only use local mock list and filter by "enabled = true".
 */
function getActiveStrategiesForView(view) {
  // For demo, treat "real" as only enabled+stats, show all with dummy stats.
  return MOCK_STRATEGIES
    .filter(s => view === 'backtest' ? true : s.enabled)
    .map(s => ({
      ...s,
      currentStats: s.stats[view]
    }));
}

/**
 * PUBLIC_INTERFACE
 */
const PortfolioTracker = () => {
  // Current dashboard view: real, paper, or backtest
  const [portfolioView, setPortfolioView] = useState('real');

  // Memo for current active strategies with stats for this view
  const strategies = useMemo(
    () => getActiveStrategiesForView(portfolioView),
    [portfolioView]
  );

  return (
    <div style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{
        color: '#0f4c81',
        fontWeight: 700,
        fontSize: '2rem',
        marginBottom: '.14em'
      }}>
        Portfolio Tracker <span style={{
          color: '#ff6f61',
          fontWeight: 600,
          fontSize: '1.09rem',
          marginLeft: 6
        }}>{portfolioView.charAt(0).toUpperCase() + portfolioView.slice(1)} View</span>
      </h2>
      <ViewToggle value={portfolioView} onChange={setPortfolioView} />
      <div style={{ marginBottom: 19, color: '#537091', fontWeight: 500 }}>
        Showing all {portfolioView} {portfolioView === 'backtest' ? 'strategy results' : 'active strategies'} with summary performance.
      </div>

      {strategies.length === 0 ? (
        <div style={{
          color: '#b0b6bd',
          fontSize: '1.09rem',
          fontStyle: 'italic',
          background: '#f6fcff',
          padding: '30px',
          borderRadius: '14px'
        }}>
          No strategies have been activated for this portfolio type yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 12 }}>
          {strategies.map(s => (
            <StrategyPerformanceCard
              key={s.id}
              name={s.name}
              description={s.description}
              stats={s.currentStats}
              lastTrade={s.currentStats.lastTrade}
              trades={s.currentStats.trades}
            />
          ))}
        </div>
      )}

      <div style={{
        background: '#e9f2fa',
        color: '#22364c',
        fontSize: '.97em',
        borderRadius: 8,
        padding: '12px 16px 10px',
        border: '1.2px solid #dbcad2',
        margin: '5px 0 0 0'
      }}>
        <div>
          <b>View types:</b> <strong>Real:</strong> Live brokerage data. <strong>Paper:</strong> Simulated trading returns. <strong>Backtested:</strong> Historical simulation. Performance metrics: <b>ROI</b>=return on investment, <b>Risk</b>=Volatility measure, <b>Last Trade</b>=date of last trade in this mode.<br />
          Only active/enabled strategies appear in Real/Paper views; Backtested view lists all strategies with available performance.
        </div>
      </div>
    </div>
  );
};

export default PortfolioTracker;
