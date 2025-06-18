import React, { useEffect, useState, useRef } from 'react';

// PUBLIC_INTERFACE
/**
 * PaperTradingDashboard
 * - Simulates live trading using mock up-to-date prices (demo: local mock, no backend)
 * - Tracks a virtual capital account (initial balance, updates with buys/sells)
 * - Displays a live-updating trade log (timestamp, action, asset, P/L)
 */

const MOCK_SYMBOLS = [
  { label: 'Apple (AAPL)', value: 'AAPL', type: 'stock' },
  { label: 'Tesla (TSLA)', value: 'TSLA', type: 'stock' },
  { label: 'Bitcoin (BTC-USD)', value: 'BTC-USD', type: 'crypto' },
  { label: 'Ethereum (ETH-USD)', value: 'ETH-USD', type: 'crypto' },
  { label: 'Nifty 50 (NSEI)', value: 'NSEI', type: 'stock' },
];

// Generate a mock "live" price stream for the selected asset
function useMockLivePrice(symbol) {
  const [price, setPrice] = useState(() => 100 + Math.random() * 60);
  const priceRef = useRef(price);

  useEffect(() => {
    // Re-seed each time symbol changes
    let base = 120 + symbol.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % 40;
    let value = base + Math.random() * 8;
    setPrice(value);
    priceRef.current = value;

    const interval = setInterval(() => {
      // Simulate random walk with mean reversion
      const drift = ((Math.random() - 0.5) * 1.25);
      let mean = base + 8;
      let next = priceRef.current + drift + ((mean - priceRef.current) * 0.07);
      next = Math.max(1, next); // never negative
      next = +next.toFixed(3);
      priceRef.current = next;
      setPrice(next);
    }, 1400 + Math.random() * 800);

    return () => clearInterval(interval);
  }, [symbol]);

  return price;
}

function formatUSD(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '--';
  if (amount >= 1e6)
    return '$' + (amount/1e6).toFixed(2) + 'M';
  if (amount >= 1e3)
    return '$' + (amount/1e3).toFixed(2) + 'K';
  return '$' + amount.toFixed(2);
}

/**
 * Simple trade P/L calculation:
 *  - For each round trip (buy then sell) show realized P/L
 *  - For open trades show unrealized P/L (current price)
 */

// TradeLogEntry: {timestamp, action, symbol, qty, price, realized, balance, pl}
function PaperTradingDashboard() {
  // User params and asset selection
  const [symbol, setSymbol] = useState(MOCK_SYMBOLS[0].value);
  const [qty, setQty] = useState(1);
  const price = useMockLivePrice(symbol);

  // Virtual balance and position state
  const INITIAL_BALANCE = 10000;
  const [balance, setBalance] = useState(INITIAL_BALANCE);

  // 'Position' state: Only one position per asset supported (long-only, can easily expand later)
  const [positions, setPositions] = useState({});
  // Trade log: List of all trade actions
  const [tradeLog, setTradeLog] = useState([]);

  // When symbol changes, reset qty but keep balance and positions/log
  useEffect(() => { setQty(1); }, [symbol]);

  // Handle Buy Action
  function handleBuy() {
    if (price <= 0 || qty <= 0) return;
    const totalCost = price * qty;
    if (balance < totalCost) {
      alert('Not enough virtual capital for this trade.');
      return;
    }
    const timestamp = new Date();
    const prevPos = positions[symbol] || { qty: 0, avgPrice: 0 };

    // New weighted average price for total position
    const newQty = prevPos.qty + qty;
    const newAvg = (prevPos.qty * prevPos.avgPrice + qty * price) / (newQty);

    setPositions(prev => ({
      ...prev,
      [symbol]: { qty: newQty, avgPrice: newAvg }
    }));
    setBalance(prev => +(prev - totalCost).toFixed(2));
    setTradeLog(prev => [
      {
        timestamp,
        action: 'Buy',
        symbol,
        qty,
        price,
        realized: 0, // Buying, so no realized P/L yet
        balance: +(balance - totalCost).toFixed(2),
        pl: 0
      },
      ...prev
    ]);
  }

  // Handle Sell Action
  function handleSell() {
    const pos = positions[symbol] || { qty: 0, avgPrice: 0 };
    if (qty <= 0 || price <= 0 || pos.qty < qty) {
      alert('Not enough position to sell.');
      return;
    }
    const totalSale = price * qty;
    const realizedPL = (price - pos.avgPrice) * qty;
    const timestamp = new Date();
    const newQty = pos.qty - qty;
    const newPos = newQty > 0 ? { qty: newQty, avgPrice: pos.avgPrice } : undefined;

    setPositions(prev => {
      const next = { ...prev };
      if (newPos) next[symbol] = newPos;
      else delete next[symbol];
      return next;
    });
    setBalance(prev => +(prev + totalSale).toFixed(2));
    setTradeLog(prev => [
      {
        timestamp,
        action: 'Sell',
        symbol,
        qty,
        price,
        realized: realizedPL,
        balance: +(balance + totalSale).toFixed(2),
        pl: realizedPL
      },
      ...prev
    ]);
  }

  // Calculating unrealized P/L for each open position
  function getUnrealizedPL(sym) {
    const pos = positions[sym];
    if (!pos || !pos.qty) return 0;
    let currPrice = sym === symbol ? price : 0; // show for selected
    return (currPrice - pos.avgPrice) * pos.qty;
  }

  // Helper to render the open (current) position in asset
  function renderPositionSummary(sym) {
    const pos = positions[sym];
    if (!pos || !pos.qty) return <span style={{ color: '#bbb' }}>No open position</span>;
    const currPrice = sym === symbol ? price : 0;
    const value = currPrice * pos.qty;
    const pl = (currPrice - pos.avgPrice) * pos.qty;

    return (
      <span>
        <b>{pos.qty}</b> @ <b>{formatUSD(pos.avgPrice)}</b> {' '}
        [Mkt: <span style={{ color: currPrice > pos.avgPrice ? '#17ae61' : '#e74c3c', fontWeight: 600 }}>{formatUSD(currPrice)}</span>]
        <span style={{ marginLeft: 10, color: pl >= 0 ? '#17ae61' : '#e74c3c', fontWeight: 600 }}>
          ({pl >= 0 ? '+' : ''}{pl.toFixed(2)} P/L)
        </span>
      </span>
    );
  }

  // Format date for log
  function fmt(dt) {
    const d = new Date(dt);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString().slice(0,5);
  }

  return (
    <div style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ color: '#0f4c81', fontWeight: 700, fontSize: '2rem', marginBottom: '.14em' }}>
        Paper Trading Dashboard <span style={{ color: '#ff6f61', fontWeight: 600, fontSize: '1.09rem', marginLeft: 4 }}>Live Simulator</span>
      </h2>
      {/* Virtual Capital and Position Summary */}
      <div style={{ marginBottom: 15, display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          color: '#18304b', background: '#e9f2fa', fontWeight: 600,
          borderRadius: 11, padding: '11px 25px', fontSize: '1.25rem', border: '1px solid #dae3ed'
        }}>
          Virtual Capital:&nbsp;
          <span style={{ color: balance >= INITIAL_BALANCE ? '#17ae61' : '#e74c3c', fontWeight: 700 }}>
            {formatUSD(balance)}
          </span>
        </div>
        <div style={{
          color: '#537091', fontWeight: 600, background: '#fcfaea', borderRadius: 11,
          fontSize: '1.10rem', padding: '9px 22px', border: '1.2px solid #f5dfa0'
        }}>
          Your Position: {renderPositionSummary(symbol)}
        </div>
      </div>
      {/* Trading Controls */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', marginBottom: 22, flexWrap: 'wrap' }}>
        {/* Asset selector */}
        <div>
          <label style={{ fontWeight: 600, color: '#197aef', marginRight: 8 }}>
            Symbol:
          </label>
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            style={{
              fontSize: '1.08rem',
              padding: '8px 12px',
              borderRadius: 7,
              border: '1.4px solid #197aef',
              background: '#fff',
              color: '#063354',
              minWidth: 100
            }}
            aria-label="Select symbol"
          >
            {MOCK_SYMBOLS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {/* Current Price */}
        <div style={{
          fontWeight: 700, color: '#ff6f61', fontSize: '1.18rem', letterSpacing: '.6px',
          background: '#fff3ed', borderRadius: 8, border: '1.3px solid #ff6f61', padding: '6px 18px'
        }}>
          Current Price:&nbsp;{price > 0 ? formatUSD(price) : '--'}
        </div>
        {/* Qty to trade */}
        <div>
          <label style={{ fontWeight: 600, color: '#0f4c81', marginRight: 8 }}>Quantity:</label>
          <input
            type="number"
            value={qty}
            min={1}
            step={1}
            onChange={e => setQty(Math.max(1, Math.floor(e.target.value)))}
            style={{
              fontSize: '1.08rem',
              padding: '7px 14px',
              borderRadius: 7,
              border: '1.2px solid #0f4c81',
              minWidth: 60,
              background: '#fff'
            }}
          />
        </div>
        {/* Buy/sell buttons */}
        <button
          className="btn"
          style={{
            background: '#17ae61', color: '#fff',
            fontWeight: 700, borderRadius: 7, padding: '10px 23px', marginLeft: 12
          }}
          onClick={handleBuy}
        >
          Buy
        </button>
        <button
          className="btn"
          style={{
            background: '#e74c3c', color: '#fff',
            fontWeight: 700, borderRadius: 7, padding: '10px 23px', marginLeft: 4
          }}
          onClick={handleSell}
        >
          Sell
        </button>
      </div>
      {/* Trade Log */}
      <div style={{
        margin: '0 0 12px 0', background: '#f6fcff', borderRadius: 11,
        border: '1.3px solid #dae3ed', padding: '11px 11px 2px 13px'
      }}>
        <div style={{ color: '#537091', fontWeight: 600, fontSize: '1.04rem', marginBottom: 7 }}>
          Live Trade Log
        </div>
        {tradeLog.length === 0
          ? <span style={{ color: '#b0b6bd', fontStyle: 'italic' }}>No trades yet. Your trades will appear here.</span>
          : <table style={{
              width: '100%', background: '#fff', borderRadius: 7, boxShadow: '0 2px 8px 0 rgba(15,76,129,0.01)',
              border: '1.1px solid #dae3ed', fontSize: '.99em'
            }}>
            <thead>
              <tr style={{ background: '#e9f2fa', color: '#197aef' }}>
                <th style={{ padding: 5, fontWeight: 600 }}>Time</th>
                <th style={{ padding: 5, fontWeight: 600 }}>Action</th>
                <th style={{ padding: 5, fontWeight: 600 }}>Symbol</th>
                <th style={{ padding: 5, fontWeight: 600 }}>Qty</th>
                <th style={{ padding: 5, fontWeight: 600 }}>Price</th>
                <th style={{ padding: 5, fontWeight: 600 }}>P/L</th>
                <th style={{ padding: 5, fontWeight: 600 }}>New Balance</th>
              </tr>
            </thead>
            <tbody>
            {tradeLog.map((tr, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#f8fbff' : '#fff' }}>
                <td style={{ padding: 4 }}>{fmt(tr.timestamp)}</td>
                <td style={{
                  color: tr.action === 'Buy' ? '#17ae61' : '#e74c3c',
                  fontWeight: 700, padding: 4
                }}>{tr.action}</td>
                <td style={{ padding: 4 }}>{tr.symbol}</td>
                <td style={{ textAlign: 'right', padding: 4 }}>{tr.qty}</td>
                <td style={{ textAlign: 'right', padding: 4 }}>{formatUSD(tr.price)}</td>
                <td style={{
                  color: tr.realized === 0 ? '#aaa' : (tr.realized > 0 ? '#17ae61' : '#e74c3c'),
                  textAlign: 'right', fontWeight: 600, padding: 4
                }}>
                  {tr.realized === 0 ? '--' : (tr.realized > 0 ? '+' : '') + tr.realized.toFixed(2)}
                </td>
                <td style={{ textAlign: 'right', padding: 4 }}>{formatUSD(tr.balance)}</td>
              </tr>
            ))}
            </tbody>
          </table>
        }
      </div>
      {/* P/L Summary for open position */}
      {positions[symbol] && positions[symbol].qty > 0 &&
        <div style={{
          color: getUnrealizedPL(symbol) >= 0 ? '#17ae61' : '#e74c3c',
          fontWeight: 600,
          fontSize: '1.12rem',
          background: '#fffdf5',
          border: `1.6px solid ${getUnrealizedPL(symbol) >= 0 ? '#caffc0' : '#fbc8c8'}`,
          borderRadius: 9,
          marginTop: 10,
          marginBottom: 8,
          padding: '8px 14px',
          maxWidth: 350,
          opacity: .97
        }}>
          Unrealized P/L for this position: {getUnrealizedPL(symbol) >= 0 ? '+' : ''}{getUnrealizedPL(symbol).toFixed(2)}
      </div>
      }
      <div style={{
        margin: '8px 0 0 0',
        color: '#537091',
        fontSize: '0.97em',
        background: '#e9f2fa',
        borderRadius: 7,
        border: '1.2px solid #cbcadd',
        padding: '9px 15px 8px',
        fontStyle: 'italic',
        opacity: .94
      }}>
        Simulate buying and selling assets at up-to-date market prices, using your virtual capital. All trades, including timestamp, action, symbol, and P/L are logged above. Capital and positions remain local (not connected to real brokerage).
      </div>
    </div>
  );
}

export default PaperTradingDashboard;
