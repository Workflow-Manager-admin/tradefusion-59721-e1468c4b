import React, { useState, useEffect, useRef } from 'react';

/**
 * PUBLIC_INTERFACE
 * BacktestingSimulator - Run and visualize strategies on historical data.
 * Allows selecting a saved strategy, running a simulated backtest,
 * visualizes trades (entry/exit points), displays ROI, Sharpe, Max Drawdown, Win Rate,
 * and compares to a simple buy-and-hold scenario.
 */
const MOCK_SYMBOLS = [
  { label: 'Apple (AAPL)', value: 'AAPL' },
  { label: 'Tesla (TSLA)', value: 'TSLA' },
  { label: 'Bitcoin (BTC-USD)', value: 'BTC-USD' },
  { label: 'Ethereum (ETH-USD)', value: 'ETH-USD' },
  { label: 'Nifty 50 (NSEI)', value: 'NSEI' },
];

// We use a local mock here, but in a real app this would be shared with StrategyBuilder and provided via props/context or API/localStorage
function getSavedStrategies() {
  // Try localStorage for persistence between reloads, fallback to demo strategies
  try {
    const strategies = JSON.parse(localStorage.getItem('savedStrategies'));
    if (Array.isArray(strategies) && strategies.length > 0) return strategies;
  } catch {}
  // Demo strategies
  return [
    {
      name: 'RSI < 30 Buy, RSI > 70 Sell',
      ruleTree: {
        type: 'logic',
        combinator: 'AND',
        children: [
          { type: 'condition', condition: { label: 'RSI < 30', value: { type: 'RSI', operator: '<', threshold: 30 } } }
        ]
      }
    },
    {
      name: 'Price > SMA 50',
      ruleTree: {
        type: 'condition',
        condition: { label: 'Price > SMA 50', value: { type: 'SMA', operator: '<PriceGreaterThan>', period: 50 } }
      }
    }
  ];
}

/** Re-use the mock generator and indicator functions from HistoricalDataViewer */
function generateMockData(seed = 171, points = 130, base = 150) {
  const data = [];
  let price = base + (seed % 35), date = Date.now() - (points - 1) * 24 * 60 * 60 * 1000;
  for (let i = 0; i < points; ++i) {
    const open = price + ((Math.sin(i / 9 + seed / 80) * price) / 39) + (Math.random() - 0.5) * 2.4;
    let close = open + (Math.random() - 0.5) * 6; // drifting
    let high = Math.max(open, close) + Math.random() * 2.2;
    let low = Math.min(open, close) - Math.random() * 2.2;
    const volume = Math.floor(Math.abs((Math.sin(i / 3 + seed) * 220000 + Math.random() * 60000)));
    data.push({
      date: new Date(date).toISOString().slice(0, 10), open, high, low, close, volume,
    });
    price = close;
    date += 24 * 60 * 60 * 1000;
  }
  return data;
}
function calcSMA(data, period = 20) {
  if (!data || data.length < period) return [];
  const sma = [];
  for (let i = 0; i < data.length; ++i) {
    if (i < period - 1) sma.push(null);
    else {
      let sum = 0, count = 0;
      for (let j = i - period + 1; j <= i; ++j) {
        if (data[j] && typeof data[j].close === "number") {
          sum += data[j].close;
          count++;
        }
      }
      sma.push(count === period ? sum / period : null);
    }
  }
  return sma;
}
function calcEMA(data, period = 20) {
  if (!data || data.length < period) return [];
  const ema = [], k = 2 / (period + 1);
  let prev = data[0] && typeof data[0].close === "number" ? data[0].close : 0;
  for (let i = 0; i < data.length; ++i) {
    if (!data[i] || typeof data[i].close !== "number") {
      ema.push(null);
      continue;
    }
    if (i === 0) ema.push(prev);
    else if (i < period - 1) {
      prev = (data[i].close + prev * i) / (i + 1);
      ema.push(prev);
    } else {
      let val = k * data[i].close + (1 - k) * prev; ema.push(val); prev = val;
    }
  }
  return ema;
}
function calcRSI(data, period = 14) {
  if (!data || data.length < period) return [];
  const rsi = [];
  let gains = 0, losses = 0;
  for (let i = 1; i < period; ++i) {
    if (
      !data[i] || !data[i-1] ||
      typeof data[i].close !== "number" ||
      typeof data[i-1].close !== "number"
    ) {
      rsi.push(null);
      continue;
    }
    let diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff; else losses -= diff;
    rsi.push(null);
  }
  let avgGain = gains / (period - 1), avgLoss = losses / (period - 1);
  for (let i = period; i < data.length; ++i) {
    if (
      !data[i] || !data[i-1] ||
      typeof data[i].close !== "number" ||
      typeof data[i-1].close !== "number"
    ) {
      rsi.push(null);
      continue;
    }
    let diff = data[i].close - data[i-1].close;
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }
  while (rsi.length < data.length) rsi.unshift(null);
  return rsi;
}

// --STRATEGY SIMULATION (SIMPLE RULE ENGINE FOR DEMO PURPOSES ONLY) --
/**
 * "Executes" a strategy tree on historical data and returns simulated trades.
 * For advanced PIPELINE, use a real trading/backtest engine -- here, we support rules that
 * refer to mock conditions: "RSI < x", "RSI > x", "Price > SMA Y", etc.
 * Returns trade history as array of { entryIdx, exitIdx, entryPrice, exitPrice }
 */
function simulateStrategyOnData(data, strategyRuleTree) {
  // Compute indicators used by the ruleset first (support only RSI/SMA conditions for demo)
  const indicators = {};
  // Scan for type needed
  let needs = { rsi: false, sma: [] };
  function walk(node) {
    if (node.type === 'condition') {
      const cond = node.condition.value;
      if (cond.type === 'RSI') needs.rsi = true;
      if (cond.type === 'SMA') needs.sma.push(cond.period);
    } else if (node.type === 'logic' && Array.isArray(node.children)) {
      node.children.forEach(walk);
    }
  }
  walk(strategyRuleTree);
  if (needs.rsi) indicators.rsi = calcRSI(data, 14);
  [...new Set(needs.sma)].forEach(p => indicators['sma' + p] = calcSMA(data, p));

  function evalNode(node, i) {
    if (node.type === 'condition') {
      const cond = node.condition.value;
      if (cond.type === 'RSI') {
        if (!indicators.rsi[i]) return false;
        if (cond.operator === '<') return indicators.rsi[i] < cond.threshold;
        if (cond.operator === '>') return indicators.rsi[i] > cond.threshold;
      }
      if (cond.type === 'SMA') {
        const smaVal = indicators['sma' + cond.period][i];
        if (!smaVal) return false;
        if (cond.operator === '<PriceGreaterThan>') return data[i].close > smaVal;
        if (cond.operator === '<PriceLessThan>') return data[i].close < smaVal;
      }
      if (cond.type === 'MACD_Cross_Above' || cond.type === 'MACD_Cross_Below') {
        // Not implemented in this demo. Always false.
        return false;
      }
      return false;
    }
    if (node.type === 'logic') {
      if (node.combinator === 'AND') return node.children.every(c => evalNode(c, i));
      if (node.combinator === 'OR') return node.children.some(c => evalNode(c, i));
      if (node.combinator === 'NOT') return !evalNode(node.children[0], i);
    }
    return false;
  }

  // Simulate: Enter trade when rule triggers, exit on opposite (for demo: flip when condition changes)
  let inPosition = false, entryIdx = null, trades = [];
  for (let i = 1; i < data.length; ++i) {
    const signal = evalNode(strategyRuleTree, i);
    if (!inPosition && signal) {
      inPosition = true; entryIdx = i;
    } else if (inPosition && !signal) {
      // Exit trade at last closing price
      const entryData = data[entryIdx && entryIdx >= 0 ? entryIdx : i];
      const exitData = data[i];
      if (
        entryData && exitData &&
        typeof entryData.close === "number" &&
        typeof exitData.close === "number"
      ) {
        trades.push({
          entryIdx,
          exitIdx: i,
          entryPrice: entryData.close,
          exitPrice: exitData.close
        });
      }
      inPosition = false; entryIdx = null;
    }
  }
  // If in position at the end, force close
  if (inPosition && entryIdx !== null && entryIdx < data.length - 1) {
    const entryData = data[entryIdx];
    const exitData = data[data.length - 1];
    if (
      entryData && exitData &&
      typeof entryData.close === "number" &&
      typeof exitData.close === "number"
    ) {
      trades.push({
        entryIdx,
        exitIdx: data.length - 1,
        entryPrice: entryData.close,
        exitPrice: exitData.close
      });
    }
  }
  return trades;
}

function computeStats(trades, data) {
  // ROI: Cumulative return (entry->exit) divided by initial capital (normalized to 1.0 for percentage)
  const initialPrice =
    data?.[0] && typeof data[0].close === "number"
      ? data[0].close
      : 1;
  let capital = 1, returns = [];
  if (trades.length === 0) {
    // No trades executed
    return {
      roi: 0,
      sharpe: 0,
      maxDrawdown: 0,
      winRate: 0,
      nTrades: 0,
    };
  }
  let balances = [1];
  trades.forEach(tr => {
    if (typeof tr.exitPrice === "number" && typeof tr.entryPrice === "number" && tr.entryPrice !== 0) {
      const pct = (tr.exitPrice - tr.entryPrice) / tr.entryPrice;
      capital *= (1 + pct);
      returns.push(pct);
      balances.push(capital);
    }
  });
  // Sharpe Ratio: mean(excess returns)/stddev, but here risk-free is 0, period is simplistic
  const mean = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const std = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length || 1));
  const sharpe = (!std || std === 0) ? 0 : (mean / std) * Math.sqrt(252 / (data.length || 50));
  // Max Drawdown (from running equity)
  let peak = 1, maxDrawdown = 0;
  for (let b of balances) {
    if (b > peak) peak = b;
    const dd = (peak - b) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }
  // Win rate
  const wins = trades.filter(tr =>
    typeof tr.exitPrice === "number" && typeof tr.entryPrice === "number" && tr.exitPrice > tr.entryPrice
  ).length;
  return {
    roi: ((capital - 1) * 100),
    sharpe: sharpe.toFixed(2),
    maxDrawdown: (maxDrawdown * 100),
    winRate: (returns.length ? ((wins / returns.length) * 100) : 0),
    nTrades: trades.length,
  };
}
function computeBuyHoldStats(data) {
  const first = data[0] && typeof data[0].close === "number" ? data[0].close : 1;
  const last =
    data.length > 0 && data[data.length - 1] && typeof data[data.length - 1].close === "number"
      ? data[data.length - 1].close
      : first;
  const roi = ((last - first) / first) * 100;
  // For Sharpe, assume simple daily return with no trading, low variance; max drawdown by closing prices
  let peak = first, maxDrawdown = 0, balances = [1];
  for (let i = 1; i < data.length; ++i) {
    if (!data[i] || typeof data[i].close !== "number") continue;
    if (data[i].close > peak) peak = data[i].close;
    const dd = (peak - data[i].close) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
    balances.push(data[i].close / first);
  }
  // Daily returns
  const returns = [];
  for (let i = 1; i < data.length; ++i) {
    if (
      !data[i] || !data[i - 1] ||
      typeof data[i].close !== "number" ||
      typeof data[i - 1].close !== "number" ||
      data[i - 1].close === 0
    ) continue;
    returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
  }
  const mean = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const std = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length || 1));
  const sharpe = (!std || std === 0) ? 0 : (mean / std) * Math.sqrt(252 / (data.length || 50));
  return {
    roi,
    sharpe: sharpe.toFixed(2),
    maxDrawdown: (maxDrawdown * 100),
    winRate: roi > 0 ? 100 : 0,
    nTrades: 1,
  };
}

/**
 * Chart component: draws candlestick/line chart, overlays entry/exit trade markers.
 */
function BacktestChart({ data, trades, width = 790, height = 290 }) {
  const canvasRef = useRef();
  useEffect(() => {
    if (!data || data.length < 2 || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // Chart bounds
    const lpad = 39, rpad = 14, tpad = 24, bpad = 27;
    const chartW = width - lpad - rpad, chartH = height - tpad - bpad;
    // Value bounds
    let min = Math.min(...data.map(x => x.low)), max = Math.max(...data.map(x => x.high));
    // X: index to px, Y: price to px
    const N = data.length;
    const xScale = chartW / N, yScale = chartH / (max - min);
    // Draw grid
    ctx.save();
    ctx.strokeStyle = '#e0e7ef';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 5; ++i) {
      let y = tpad + (chartH * i) / 4;
      ctx.moveTo(lpad, y);
      ctx.lineTo(width - rpad, y);
    }
    ctx.globalAlpha = 0.49;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
    // Y axis price labels
    ctx.save();
    ctx.font = '12px Inter,sans-serif';
    ctx.fillStyle = '#607191';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 5; ++i) {
      let y = tpad + (chartH * i) / 4;
      let v = max - ((max - min) * i) / 4;
      ctx.fillText(v.toFixed(2), lpad - 6, y);
    }
    ctx.restore();
    // Draw candlesticks (as lines for lower effort)
    for (let i = 0; i < data.length; ++i) {
      const d = data[i];
      if (
        !d ||
        typeof d.open !== "number" ||
        typeof d.close !== "number" ||
        typeof d.high !== "number" ||
        typeof d.low !== "number"
      ) {
        continue;
      }
      const cX = lpad + (xScale * (i + 0.5));
      const cOpen = tpad + (max - d.open) * yScale;
      const cClose = tpad + (max - d.close) * yScale;
      const cHigh = tpad + (max - d.high) * yScale;
      const cLow = tpad + (max - d.low) * yScale;
      // Body
      ctx.save();
      ctx.lineWidth = 3.6;
      ctx.strokeStyle = d.close >= d.open ? '#14a66e' : '#d02133';
      ctx.beginPath();
      ctx.moveTo(cX, cOpen);
      ctx.lineTo(cX, cClose);
      ctx.stroke();
      // Wick
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cX, cHigh); ctx.lineTo(cX, cLow);
      ctx.stroke();
      ctx.restore();
    }
    // Overlay trade points
    trades?.forEach((tr, idx) => {
      // Entry Point
      if (
        tr.entryIdx == null || !data[tr.entryIdx] ||
        typeof data[tr.entryIdx].close !== "number"
      ) return;
      const eX = lpad + xScale * (tr.entryIdx + 0.5);
      const eY = tpad + (max - data[tr.entryIdx].close) * yScale;
      ctx.save();
      ctx.fillStyle = '#006ef9';
      ctx.beginPath();
      ctx.arc(eX, eY, 6.2, 0, 2 * Math.PI);
      ctx.globalAlpha = 0.60;
      ctx.fill();
      // Text "BUY"
      ctx.globalAlpha = 1;
      ctx.font = 'bold 11px Inter,sans-serif';
      ctx.fillStyle = '#00cfff';
      ctx.fillText('BUY', eX - 13, eY - 9);
      ctx.restore();

      // Exit Point
      if (
        tr.exitIdx == null || !data[tr.exitIdx] ||
        typeof data[tr.exitIdx].close !== "number"
      ) return;
      const xX = lpad + xScale * (tr.exitIdx + 0.5);
      const xY = tpad + (max - data[tr.exitIdx].close) * yScale;
      ctx.save();
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(xX, xY, 6.6, 0, 2 * Math.PI);
      ctx.globalAlpha = 0.66;
      ctx.fill();
      // Text "SELL"
      ctx.globalAlpha = 1;
      ctx.font = 'bold 11px Inter,sans-serif';
      ctx.fillStyle = '#ffe2e2';
      ctx.fillText('SELL', xX + 7, xY + 11);
      ctx.restore();
    });
  }, [data, trades, width, height]);
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        borderRadius: 14,
        width: '100%',
        maxWidth: width,
        background: '#131822',
        boxShadow: '0 4px 16px rgba(0,24,40,0.13)',
        border: '1.2px solid #233157',
        margin: '0 auto',
        marginBottom: 16,
      }}
      aria-label="Backtest candlestick chart"
    />
  );
}

function MetricCard({ title, value, unit = '', diff = undefined, positiveIsUp = true }) {
  let color = '#537091';
  if (typeof diff === 'number') {
    if (diff > 0) color = positiveIsUp ? '#17ae61' : '#e74c3c';
    else if (diff < 0) color = positiveIsUp ? '#e74c3c' : '#17ae61';
    else color = '#777';
  }
  return (
    <div style={{
      minWidth: 108, minHeight: 66,
      background: '#e9f2fa',
      color: color,
      borderRadius: 13,
      margin: 0, padding: '7px 12px 7px 13px',
      border: `1.2px solid #dae3ed`,
      fontWeight: 500,
      boxShadow: '0 2.5px 12px 0 rgba(15,76,129,0.04)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'center'
    }}>
      <span style={{ fontSize: '.96em', fontWeight: 600, color: '#18304b', marginBottom: 2 }}>{title}</span>
      <span style={{ fontSize: '1.48rem', fontWeight: 700, color: color }}>
        {typeof value === 'number' ? value.toFixed(2) : value}{unit}
      </span>
      {
        typeof diff === 'number'
          ? <span style={{
            fontSize: '.97em',
            color: color,
            fontWeight: 500
          }}>
            {diff === 0 ? "Same" : (diff > 0 ? '+' : '') + diff.toFixed(2) + unit + " vs BH"}
          </span>
          : null
      }
    </div>
  );
}

// PUBLIC_INTERFACE
function BacktestingSimulator() {
  // User params
  const [symbol, setSymbol] = useState(MOCK_SYMBOLS[0].value);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Strategy selection & stats
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategyIdx, setSelectedStrategyIdx] = useState(0);
  const [trades, setTrades] = useState([]);
  const [strategyStats, setStrategyStats] = useState({});
  const [bhStats, setBhStats] = useState({});

  // Load saved strategies on mount (localStorage + demo fallback)
  useEffect(() => {
    setStrategies(getSavedStrategies());
  }, []);

  // Load data on symbol change
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const seed = symbol.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0) + 19; // stable
      setData(generateMockData(seed, 100 + (seed % 65), 110 + (seed % 60)));
      setLoading(false);
    }, 340);
  }, [symbol]);

  // Run selected strategy on data
  useEffect(() => {
    if (!data || data.length === 0 || strategies.length === 0 || !strategies[selectedStrategyIdx])
      return;
    const ruleTree = strategies[selectedStrategyIdx].ruleTree;
    const simTrades = simulateStrategyOnData(data, ruleTree);
    setTrades(simTrades);
    setStrategyStats(computeStats(simTrades, data));
    setBhStats(computeBuyHoldStats(data));
  }, [data, selectedStrategyIdx, strategies]);

  const handleStrategyChange = (e) => {
    setSelectedStrategyIdx(Number(e.target.value));
  };

  return (
    <div style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ color: '#0f4c81', fontWeight: 700, fontSize: '2.07rem', marginBottom: '.13em' }}>
        Backtesting Simulator <span style={{
          color: '#ff6f61', fontWeight: 600,
          fontSize: '1.09rem', marginLeft: 4
        }}>Advanced</span>
      </h2>
      <div style={{
        display: 'flex', gap: '24px', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap'
      }}>
        {/* Symbol selector */}
        <div>
          <label style={{ fontWeight: 600, color: '#197aef', marginRight: 8 }}>
            Symbol:
          </label>
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            style={{
              fontSize: '1.08rem',
              padding: '7px 12px',
              borderRadius: 7,
              border: '1.4px solid #197aef',
              background: '#fff',
              color: '#141d29',
              minWidth: 100
            }}
            aria-label="Select symbol"
          >
            {MOCK_SYMBOLS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {/* Strategy selector */}
        <div>
          <label style={{ fontWeight: 600, color: '#0f4c81', marginRight: 8 }}>
            Strategy:
          </label>
          <select
            value={selectedStrategyIdx}
            onChange={handleStrategyChange}
            style={{
              fontSize: '1.08rem',
              padding: '7px 12px',
              borderRadius: 7,
              border: '1.6px solid #0f4c81',
              background: '#fff',
              color: '#063354',
              minWidth: 150
            }}
            aria-label="Select strategy"
          >
            {strategies.map((s, idx) => (
              <option key={s.name} value={idx}>{s.name}</option>
            ))}
          </select>
        </div>
        <span style={{ color: '#b0b6bd', fontSize: '.9em', marginLeft: 5 }}>
          ({trades?.length ?? 0} trades)
        </span>
      </div>
      <div style={{
        background: '#19223a',
        borderRadius: 18,
        boxShadow: '0 2.5px 11px 0 rgba(23,80,115,0.13)',
        border: '1.2px solid #226',
        padding: '21px 10px 16px',
        minHeight: 325,
        marginBottom: 19,
        position: 'relative'
      }}>
        {loading || data.length < 2 ? (
          <div style={{
            color: '#5082C3',
            fontWeight: 600,
            fontSize: '1.22rem',
            padding: '87px 0',
            letterSpacing: 1
          }}>
            {loading ? 'Loading data...' : 'Loading...'}
          </div>
        ) : (
          <BacktestChart data={data} trades={trades} />
        )}
      </div>
      {/* Performance Metric Panels */}
      <div style={{
        display: 'flex', gap: 31, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8, marginTop: -12
      }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            color: '#0f4c81', fontWeight: 700, margin: '0 0 10px 0',
            fontSize: '1.13rem', letterSpacing: .6
          }}>Strategy Performance</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <MetricCard
              title="ROI"
              value={strategyStats.roi ?? 0}
              unit="%"
              diff={strategyStats.roi - (bhStats.roi ?? 0)}
            />
            <MetricCard
              title="Sharpe"
              value={strategyStats.sharpe ?? 0}
              diff={strategyStats.sharpe - (bhStats.sharpe ?? 0)}
            />
            <MetricCard
              title="Max Drawdown"
              value={strategyStats.maxDrawdown ?? 0}
              unit="%"
              diff={strategyStats.maxDrawdown - (bhStats.maxDrawdown ?? 0)}
              positiveIsUp={false}
            />
            <MetricCard
              title="Win Rate"
              value={strategyStats.winRate ?? 0}
              unit="%"
            />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{
            color: '#00384f', fontWeight: 600, margin: '0 0 10px 0',
            fontSize: '1.07rem', letterSpacing: .3
          }}>Buy &amp; Hold (Benchmark)</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <MetricCard
              title="ROI"
              value={bhStats.roi ?? 0}
              unit="%"
            />
            <MetricCard
              title="Sharpe"
              value={bhStats.sharpe ?? 0}
            />
            <MetricCard
              title="Max Drawdown"
              value={bhStats.maxDrawdown ?? 0}
              unit="%"
              positiveIsUp={false}
            />
            <MetricCard
              title="Win Rate"
              value={bhStats.winRate ?? 0}
              unit="%"
            />
          </div>
        </div>
      </div>
      {/* Trade log table */}
      <div style={{ marginBottom: 9, padding: '6px 5px 5px 7px', background: '#f6fcff', borderRadius: 11 }}>
        <div style={{ color: '#537091', fontWeight: 600, fontSize: '1.01rem', marginBottom: 6 }}>
          Simulated Trade Log
        </div>
        {trades.length === 0
          ? <span style={{ color: '#b0b6bd', fontStyle: 'italic' }}>No trades were executed on this data period using this strategy.</span>
          : <table style={{
            width: '100%', background: '#fff', borderRadius: 6, boxShadow: '0 1.5px 8px 0 rgba(15,76,129,0.03)',
            border: '1px solid #dae3ed', fontSize: '.97em'
          }}>
            <thead>
              <tr style={{ background: '#e9f2fa', color: '#197aef' }}>
                <th style={{ padding: 5, fontWeight: 600 }}>#</th>
                <th style={{ padding: 5, fontWeight: 600 }}>Entry Date</th>
                <th style={{ padding: 5, fontWeight: 600 }}>Entry Price</th>
                <th style={{ padding: 5, fontWeight: 600 }}>Exit Date</th>
                <th style={{ padding: 5, fontWeight: 600 }}>Exit Price</th>
                <th style={{ padding: 5, fontWeight: 600 }}>Return %</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((tr, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#f8fbff' : '#fff' }}>
                  <td style={{ textAlign: 'right', padding: 4 }}>{i + 1}</td>
                  <td style={{ padding: 4 }}>{(tr.entryIdx != null && data[tr.entryIdx]) ? data[tr.entryIdx].date : "--"}</td>
                  <td style={{ textAlign: 'right', padding: 4 }}>
                    {typeof tr.entryPrice === 'number' ? tr.entryPrice.toFixed(2) : '--'}
                  </td>
                  <td style={{ padding: 4 }}>{(tr.exitIdx != null && data[tr.exitIdx]) ? data[tr.exitIdx].date : "--"}</td>
                  <td style={{ textAlign: 'right', padding: 4 }}>
                    {typeof tr.exitPrice === 'number' ? tr.exitPrice.toFixed(2) : '--'}
                  </td>
                  <td style={{
                    color: typeof tr.exitPrice === 'number' && typeof tr.entryPrice === 'number' && tr.exitPrice > tr.entryPrice ? '#17ae61' : '#e74c3c',
                    textAlign: 'right',
                    fontWeight: 600, padding: 4
                  }}>
                    {typeof tr.exitPrice === 'number' && typeof tr.entryPrice === 'number'
                      ? (((tr.exitPrice - tr.entryPrice) / tr.entryPrice) * 100).toFixed(2)
                      : '--'
                    } %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
      <div style={{
        margin: '12px 0 0 0',
        color: '#537091',
        fontSize: '0.97em',
        background: '#e9f2fa',
        borderRadius: 7,
        border: '1.2px solid #cbcadd',
        padding: '10px 14px 9px',
        fontStyle: 'italic',
        opacity: .95
      }}>
        <div>
          Compare your strategy (above) with Buy &amp; Hold results for this symbol. <b>ROI</b>: Total net return. <b>Sharpe</b>: Return/risk ratio. <b>Max Drawdown</b>: Worst equity dip. <b>Win Rate</b>: % profitable trades.<br />
          Chart below shows candlesticks with trade entry/exits. <b>Tip:</b> Define &amp; save strategies in the Strategy Builder for more options.
        </div>
      </div>
    </div>
  );
}

export default BacktestingSimulator;
