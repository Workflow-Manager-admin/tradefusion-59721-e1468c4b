import React, { useState } from 'react';

// PUBLIC_INTERFACE
/**
 * BrokerAPIIntegration component
 * UI and placeholder logic for connecting to Binance and Zerodha Kite APIs, including:
 *   - Broker selection,
 *   - OAuth login (mocked),
 *   - Portfolio sync (mocked),
 *   - Trade execution (mocked).
 */
const BROKERS = [
  {
    name: 'Binance',
    key: 'binance',
    logo: '🟡', // Placeholder for Binance logo
    supports: ['crypto'],
    oAuthName: 'Binance OAuth'
  },
  {
    name: 'Zerodha Kite',
    key: 'zerodha',
    logo: '🟠', // Placeholder for Zerodha logo
    supports: ['stocks'],
    oAuthName: 'Kite Connect OAuth'
  }
];

function getBrokerByKey(key) {
  return BROKERS.find(b => b.key === key);
}

const MOCK_PORTFOLIOS = {
  binance: [
    { asset: 'BTC', qty: 0.27, valueUSD: 18430 },
    { asset: 'ETH', qty: 2.9, valueUSD: 8900 }
  ],
  zerodha: [
    { asset: 'TCS', qty: 8, valueINR: 28000 },
    { asset: 'RELIANCE', qty: 2, valueINR: 6800 },
    { asset: 'INFY', qty: 10, valueINR: 14700 }
  ]
}

function nowFmt() {
  const d = new Date();
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString().slice(0,5);
}

const BrokerAPIIntegration = () => {
  const [selectedBroker, setSelectedBroker] = useState(BROKERS[0].key);
  const [connection, setConnection] = useState({ // per-broker status
    binance: { connected: false, lastSync: null, error: null },
    zerodha: { connected: false, lastSync: null, error: null }
  });
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [tradeForm, setTradeForm] = useState({ asset: '', qty: '', action: 'buy' });
  const [executeResult, setExecuteResult] = useState('');
  const broker = getBrokerByKey(selectedBroker);

  // Mock: simulate OAuth login
  function handleLogin() {
    setIsAuthorizing(true);
    setTimeout(() => {
      setConnection(prev => ({
        ...prev,
        [selectedBroker]: {
          ...prev[selectedBroker],
          connected: true,
          error: null
        }
      }));
      setIsAuthorizing(false);
    }, 1500);
  }

  // Mock: simulate disconnect/logout
  function handleLogout() {
    setConnection(prev => ({
      ...prev,
      [selectedBroker]: {
        ...prev[selectedBroker],
        connected: false,
        lastSync: null,
        error: null
      }
    }));
    setPortfolio([]);
    setExecuteResult('');
  }

  // Mock: simulate portfolio sync
  function handleSyncPortfolio() {
    setIsSyncing(true);
    setTimeout(() => {
      setPortfolio(MOCK_PORTFOLIOS[selectedBroker]);
      setIsSyncing(false);
      setConnection(prev => ({
        ...prev,
        [selectedBroker]: {
          ...prev[selectedBroker],
          lastSync: nowFmt()
        }
      }));
    }, 1000);
  }

  // Mock: trade execution logic
  function handleTradeSubmit(e) {
    e.preventDefault();
    if (!tradeForm.asset || !tradeForm.qty || Number(tradeForm.qty) <= 0) {
      setExecuteResult('Fill all fields.');
      return;
    }
    setExecuteResult('Processing...');
    setTimeout(() => {
      setExecuteResult(
        `Trade Confirmed: ${tradeForm.action === 'buy' ? 'Bought' : 'Sold'} ${tradeForm.qty} ${tradeForm.asset} via ${broker.name} at mock market price.`
      );
      // Optionally, update portfolio mock here.
    }, 900);
  }

  // UI for broker selection
  function renderBrokerSelector() {
    return (
      <div style={{display:'flex', gap:19, marginBottom:15, alignItems:'center'}}>
        <span style={{fontWeight:600, color:'#0f4c81'}}>Select Broker:</span>
        {BROKERS.map(b => (
          <button
            key={b.key}
            onClick={() => { setSelectedBroker(b.key); setExecuteResult(''); setPortfolio([]); }}
            style={{
              fontWeight: selectedBroker === b.key ? 700 : 400,
              color: selectedBroker === b.key ? '#fff' : '#0f4c81',
              background: selectedBroker === b.key ? '#0f4c81' : '#e9f2fa',
              border: selectedBroker === b.key ? '2px solid #0f4c81' : '1.4px solid #c7eafb',
              borderRadius: 12,
              fontSize: '1.09em',
              padding: '8px 21px',
              marginRight: 6,
              transition: 'background 0.13s',
              cursor: 'pointer',
              minWidth: 113
            }}
            aria-pressed={selectedBroker === b.key}
          >
            <span style={{marginRight:6}}>{b.logo}</span>{b.name}
          </button>
        ))}
      </div>
    );
  }

  // UI for connection status and OAuth login section
  function renderConnectionSection() {
    const conn = connection[selectedBroker];
    return (
      <div style={{
        background:'#e9f2fa', borderRadius:11, padding:'17px 20px 9px',
        border: '1.5px solid #dae3ed', marginBottom:14, marginTop:2
      }}>
        <div style={{fontWeight:500, color:'#0f4c81', fontSize:'1.14rem', marginBottom:4}}>
          {broker.logo} {broker.name} Connection
        </div>
        <div>
          Status:&nbsp;
          <span style={{
            color: conn.connected ? '#17ae61' : (isAuthorizing ? '#f5a742' : '#e74c3c'),
            fontWeight:600
          }}>
            {conn.connected ? 'Connected' : (isAuthorizing ? 'Authorizing...' : 'Not connected')}
          </span>
          {conn.connected && (
            <button onClick={handleLogout}
              style={{
                marginLeft:13, background:'#ff6f61', color:'#fff', fontWeight:600,
                borderRadius:6, border:'none', padding:'6px 19px', cursor:'pointer'
              }}>Log Out</button>
          )}
          {!conn.connected && (
            <button onClick={handleLogin}
              disabled={isAuthorizing}
              style={{
                marginLeft:13, background:'#0f4c81', color:'#fff', fontWeight:700,
                borderRadius:6, border:'none', padding:'7px 22px', cursor:'pointer',
                opacity: isAuthorizing ? 0.66 : 1
              }}>
              {isAuthorizing ? 'Authorizing...' : `Log In with ${broker.oAuthName}`}
            </button>
          )}
        </div>
        {conn.connected && (
          <div style={{marginTop:6, color:'#537091', fontSize:'0.99em'}}>
            {broker.key === 'binance' && <>You are connected to <b>Binance</b>. Portfolio data and trades use the Binance API.</>}
            {broker.key === 'zerodha' && <>You are connected to <b>Zerodha Kite</b>. Portfolio and trades use the Kite Connect API.</>}
          </div>
        )}
        {conn.lastSync && (
          <div style={{marginTop:7, color:'#008c56', fontSize:'0.98em'}}>
            Last Portfolio Sync: {conn.lastSync}
          </div>
        )}
        {conn.error && (
          <div style={{color:'#e74c3c', fontWeight:600}}>{conn.error}</div>
        )}
      </div>
    );
  }

  // Portfolio UI
  function renderPortfolio() {
    if (!connection[selectedBroker].connected) return null;
    return (
      <div style={{
        background:'#fff', borderRadius:10,
        boxShadow:'0 2.5px 14px 0 rgba(15,76,129,0.07)',
        border:'1.4px solid #e0e7ef', margin:'14px 0 16px', padding:'14px 17px 11px'
      }}>
        <div style={{marginBottom:8, display:'flex',gap:12,alignItems:'center'}}>
          <span style={{fontWeight:600,color:'#0f4c81',fontSize:'1.09rem'}}>Portfolio Holdings</span>
          <button
            onClick={handleSyncPortfolio}
            disabled={isSyncing}
            style={{
              background:'#17ae61', color:'#fff', fontWeight:600, borderRadius:6,
              border:'none', padding:'6px 17px', marginLeft:10, cursor:'pointer', fontSize:'1em',
              opacity: isSyncing ? 0.63 : 1
            }}>
            {isSyncing ? 'Syncing...' : 'Sync Portfolio'}
          </button>
        </div>
        {portfolio.length === 0 && !isSyncing && (
          <div style={{color:'#b0b6bd'}}>No portfolio data yet. Click "Sync Portfolio" to fetch holdings.</div>
        )}
        {portfolio.length > 0 && (
          <table style={{width:'100%',background:'#f9fbfe',borderRadius:7,fontSize:'1.05rem',marginTop:3}}>
            <thead>
              <tr style={{background:'#e9f2fa',color:'#00384f'}}>
                <th style={{padding:4}}>Asset</th>
                <th style={{padding:4}}>Qty</th>
                <th style={{padding:4}}>Value</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((pos,i) => (
                <tr key={pos.asset} style={{background:i%2===0?'#f8fbff':'#fff'}}>
                  <td style={{padding:4,fontWeight:600}}>{pos.asset}</td>
                  <td style={{padding:4}}>{pos.qty}</td>
                  <td style={{padding:4}}>
                    {typeof pos.valueUSD==='number' && <>${pos.valueUSD.toLocaleString()}</>}
                    {typeof pos.valueINR==='number' && <>₹{pos.valueINR.toLocaleString()}</>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  // Trade execution UI
  function renderTradeExecution() {
    if (!connection[selectedBroker].connected) return null;

    // asset options from mock portfolio
    const assetOpts = (portfolio.length > 0 ? portfolio.map(p => p.asset) :
      broker.key === 'binance' ? ['BTC', 'ETH', 'SOL'] : ['TCS', 'RELIANCE', 'INFY', 'HDFC']);
    return (
      <div style={{
        background:'#fff',
        borderRadius:10, border:'1.3px solid #e0e7ef',
        boxShadow:'0 2.5px 11px 0 rgba(15,76,129,0.06)',
        padding:'13px 17px 16px', margin:'12px 0'
      }}>
        <div style={{fontWeight:600,color:'#197aef',marginBottom:8}}>Execute Trade</div>
        <form onSubmit={handleTradeSubmit} style={{display:'flex',gap:15,alignItems:'center',flexWrap:'wrap'}}>
          <div>
            <label style={{marginRight:6,fontWeight:500}}>Action</label>
            <select
              value={tradeForm.action}
              onChange={e => setTradeForm(f => ({ ...f, action: e.target.value }))}
              style={{fontSize:'1.04em',padding:'6px 9px',borderRadius:7,border:'1.2px solid #0f4c81',
              background:'#fff',color:'#163a3b',marginRight:7}}>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div>
            <label style={{marginRight:5,fontWeight:500}}>Asset</label>
            <select
              value={tradeForm.asset}
              onChange={e => setTradeForm(f => ({ ...f, asset: e.target.value }))}
              style={{
                fontSize:'1.04em', padding:'6px 13px',
                borderRadius: 7, border:'1.2px solid #0f4c81', background:'#fff', color:'#141d29', minWidth:70
              }}>
              <option value="">Select asset</option>
              {assetOpts.map(as => <option key={as}>{as}</option>)}
            </select>
          </div>
          <div>
            <label style={{marginRight:5,fontWeight:500}}>Qty</label>
            <input
              type="number" min="0" step="0.01"
              required value={tradeForm.qty}
              onChange={e => setTradeForm(f=>({ ...f, qty: e.target.value }))}
              style={{
                fontSize:'1.04em',padding:'6px 8px',borderRadius:7,border:'1.2px solid #0f4c81',minWidth:54
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              background:'#ff6f61',color:'#fff',fontWeight:600,borderRadius:7,border:'none',
              padding:'8px 21px',fontSize:'1.09em',boxShadow:'0 1.2px 7px 0 rgba(216,47,25,0.05)'
            }}>Execute Trade</button>
        </form>
        {executeResult && (
          <div style={{marginTop:8, color:executeResult.startsWith('Trade Confirmed')?'#17ae61':'#e74c3c',fontWeight:600}}>
            {executeResult}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 670, margin: '0 auto' }}>
      <h2 style={{
        color: '#0f4c81', fontWeight: 700, fontSize: '2rem', marginBottom: '.19em'
      }}>
        Broker API Integration <span style={{
          color: '#ff6f61', fontWeight: 600,
          fontSize: '1.05rem', marginLeft: 4
        }}>Binance & Zerodha</span>
      </h2>
      <div style={{ color: '#537091', fontSize: '1.04em', marginBottom: 13 }}>
        Connect your broker account via OAuth to sync portfolio and execute real or simulated trades.<br />
        <b>Supported:</b> Binance (crypto), Zerodha Kite (stocks).
      </div>
      {renderBrokerSelector()}
      {renderConnectionSection()}
      {renderPortfolio()}
      {renderTradeExecution()}
      <div style={{
        background: '#e9f2fa',
        color: '#22364c',
        fontSize: '.97em',
        borderRadius: 8,
        padding: '10px 15px 8px',
        border: '1.2px solid #dbcad2',
        margin: '5px 0 0 0',
        marginTop:12
      }}>
        <div>
          <b>How it works:</b> Choose a broker, log in with OAuth, sync to load holdings, and submit trades.<br />
          <ul style={{margin:'7px 0 0 1.1em', color: '#214073'}}>
            <li>Login triggers a simulated OAuth flow (API keys/OAuth for demo only).</li>
            <li>Portfolio sync retrieves a mocked portfolio.</li>
            <li>Trade execution is confirmed in-app (real API would be used in production).</li>
            <li>Status bar shows connection state and last sync.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BrokerAPIIntegration;
