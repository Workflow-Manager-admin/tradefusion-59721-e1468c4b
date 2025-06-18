import React, { useState, useEffect, useRef } from 'react';

// PUBLIC_INTERFACE
/**
 * HistoricalDataViewer
 *
 * Displays a selectable interactive candlestick chart for the chosen stock/crypto symbol,
 * allows time frame selection (1D, 1W, 1M, 1Y, MAX), and adds/removes overlays (SMA, EMA, RSI, MACD).
 * Uses mock chart data (no backend/fetch).
 */
const MOCK_SYMBOLS = [
  { label: 'Apple (AAPL)', value: 'AAPL', type: 'stock' },
  { label: 'Tesla (TSLA)', value: 'TSLA', type: 'stock' },
  { label: 'Bitcoin (BTC-USD)', value: 'BTC-USD', type: 'crypto' },
  { label: 'Ethereum (ETH-USD)', value: 'ETH-USD', type: 'crypto' },
  { label: 'Nifty 50 (NSEI)', value: 'NSEI', type: 'stock' },
];

const TIME_FRAMES = [
  { key: '1D', label: '1D', days: 1, points: 60 }, // 1D, 1min granularity
  { key: '1W', label: '1W', days: 7, points: 80 },
  { key: '1M', label: '1M', days: 30, points: 100 },
  { key: '1Y', label: '1Y', days: 365, points: 130 },
  { key: 'MAX', label: 'Max', days: 700, points: 200 },
];

const INDICATORS = [
  { key: 'sma', label: 'SMA (20)', color: '#ff8c00' },
  { key: 'ema', label: 'EMA (20)', color: '#1696d7' },
  { key: 'rsi', label: 'RSI (14)', color: '#c71f6a' },
  { key: 'macd', label: 'MACD', color: '#6fa71c' },
];

/** Helper: Generate mock OHLCV data as array of {date, open, high, low, close, volume} */
function generateMockData(seed = 123, points = 120, base = 180) {
  const data = [];
  let price = base + (seed % 50);
  let date = Date.now() - (points - 1) * 24 * 60 * 60 * 1000;
  for (let i = 0; i < points; ++i) {
    const open = price + ((Math.sin(i / 9 + seed / 80) * price) / 36) + (Math.random() - 0.5) * 3;
    let close = open + (Math.random() - 0.5) * 6;
    let high = Math.max(open, close) + Math.random() * 3;
    let low = Math.min(open, close) - Math.random() * 3;
    const volume = Math.floor(Math.abs((Math.sin(i / 3 + seed) * 300000 + Math.random() * 70000)));
    data.push({
      date: new Date(date).toISOString().slice(0, 10), // Format as YYYY-MM-DD
      open, high, low, close, volume,
    });
    price = close;
    date += 24 * 60 * 60 * 1000;
  }
  return data;
}

/* Indicator calculations */
function calcSMA(data, period = 20) {
  if (!data || data.length < period) return [];
  const sma = [];
  for (let i = 0; i < data.length; ++i) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; ++j) sum += data[j].close;
      sma.push(sum / period);
    }
  }
  return sma;
}

function calcEMA(data, period = 20) {
  if (!data || data.length < period) return [];
  const ema = [];
  let k = 2 / (period + 1);
  let prev = data[0].close;
  for (let i = 0; i < data.length; ++i) {
    if (i === 0) {
      ema.push(prev);
    } else if (i < period - 1) {
      prev = (data[i].close + prev * i) / (i + 1);
      ema.push(prev);
    } else {
      let val = k * data[i].close + (1 - k) * prev;
      ema.push(val);
      prev = val;
    }
  }
  return ema;
}

function calcRSI(data, period = 14) {
  if (!data || data.length < period) return [];
  const rsi = [];
  let gains = 0, losses = 0;
  for (let i = 1; i < period; ++i) {
    let diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
    rsi.push(null);
  }
  let avgGain = gains / (period - 1);
  let avgLoss = losses / (period - 1);
  for (let i = period; i < data.length; ++i) {
    let diff = data[i].close - data[i - 1].close;
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
  while (rsi.length < data.length) rsi.unshift(null); // pad left
  return rsi;
}

function calcMACD(data, slow = 26, fast = 12, signal = 9) {
  if (!data || data.length < slow + signal) return { macd: [], signal: [], hist: [] };
  const emaFast = calcEMA(data, fast);
  const emaSlow = calcEMA(data, slow);
  const macd = emaFast.map((v, i) => (v !== undefined && emaSlow[i] !== undefined) ? v - emaSlow[i] : null);
  // macd line may have nulls at start, so for EMA need to skip nulls
  const macdData = macd.map((val, idx) => ({ close: val !== null ? val : 0 }));
  const macdSignal = calcEMA(macdData, signal);
  const hist = macd.map((v, i) =>
    v !== null && macdSignal[i] !== undefined ? v - macdSignal[i] : null
  );
  return { macd, signal: macdSignal, hist };
}

/** Interactive Candlestick Chart Canvas (minimal, self-contained, no external lib) */
function CandleChart({
  data,
  overlays,
  selectedIndicators, // {sma: true, ...}
  width = 790,
  height = 340,
}) {
  const canvasRef = useRef();

  useEffect(() => {
    if (!data || data.length < 2 || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // Chart area
    const lpad = 38, rpad = 13, tpad = 32, bpad = 30;
    const chartW = width - lpad - rpad, chartH = height - tpad - bpad;
    const N = data.length;
    // Value scale
    let min = Math.min(...data.map(x => x.low));
    let max = Math.max(...data.map(x => x.high));
    // Also expand y scale for overlays that might go over price range
    if (selectedIndicators.sma && overlays.sma) {
      overlays.sma.forEach((v) => { if (v) { if (v > max) max = v; if (v < min) min = v; } });
    }
    if (selectedIndicators.ema && overlays.ema) {
      overlays.ema.forEach((v) => { if (v) { if (v > max) max = v; if (v < min) min = v; } });
    }

    // X: index to px, Y: price to px
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

    // Y axis labels (min, max, quartiles)
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

    // Draw candlesticks
    for (let i = 0; i < data.length; ++i) {
      const d = data[i];
      const cX = lpad + (xScale * (i + 0.5));
      const cOpen = tpad + (max - d.open) * yScale;
      const cClose = tpad + (max - d.close) * yScale;
      const cHigh = tpad + (max - d.high) * yScale;
      const cLow = tpad + (max - d.low) * yScale;
      // Candle body
      ctx.save();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = d.close >= d.open ? '#14a66e' : '#d02133';
      ctx.beginPath();
      ctx.moveTo(cX, Math.min(cOpen, cClose));
      ctx.lineTo(cX, Math.max(cOpen, cClose));
      ctx.stroke();
      // Wick
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cX, cHigh);
      ctx.lineTo(cX, cLow);
      ctx.stroke();
      ctx.restore();
    }

    // Overlays
    if (selectedIndicators.sma && overlays.sma) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = INDICATORS[0].color;
      ctx.lineWidth = 2;
      for (let i = 0; i < overlays.sma.length; ++i) {
        let v = overlays.sma[i];
        if (v === null || v === undefined) continue;
        let x = lpad + xScale * (i + 0.5);
        let y = tpad + (max - v) * yScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.restore();
    }
    if (selectedIndicators.ema && overlays.ema) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = INDICATORS[1].color;
      ctx.lineWidth = 1.8;
      for (let i = 0; i < overlays.ema.length; ++i) {
        let v = overlays.ema[i];
        if (v === null || v === undefined) continue;
        let x = lpad + xScale * (i + 0.5);
        let y = tpad + (max - v) * yScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.globalAlpha = .98;
      ctx.setLineDash([3.5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Draw cursor/markers (add any future interactivity here)
    // e.g., tooltip (not implemented for brevity)
  }, [data, overlays, width, height, selectedIndicators]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        borderRadius: 15,
        width: '100%',
        maxWidth: width,
        maxHeight: height,
        background: '#131822',
        boxShadow: '0 4px 16px rgba(0,24,40,0.14)',
        border: '1.2px solid #233157',
        margin: '0 auto'
      }}
      aria-label="Candlestick chart"
    />
  );
}

function IndicatorPanel({ overlays, selectedIndicators, changeIndicator }) {
  // For RSI and MACD: display as mini-chart below main
  return (
    <div style={{ marginTop: 22, display: 'flex', gap: '36px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div>
        <span style={{ color: '#668', fontWeight: 500, fontSize: '.98rem' }}>Indicators:</span>
        {INDICATORS.map(ind => (
          <label
            key={ind.key}
            style={{
              marginLeft: 17,
              color: ind.color,
              fontWeight: selectedIndicators[ind.key] ? 700 : 400,
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: '1.02rem'
            }}
          >
            <input
              type="checkbox"
              checked={!!selectedIndicators[ind.key]}
              onChange={e => changeIndicator(ind.key, e.target.checked)}
              style={{ marginRight: 4, accentColor: ind.color, cursor: 'pointer' }}
            />
            {ind.label}
          </label>
        ))}
      </div>
      {selectedIndicators.rsi && overlays.rsi &&
        <MiniLineChart
          data={overlays.rsi}
          minY={0}
          maxY={100}
          color={INDICATORS[2].color}
          width={205}
          height={64}
          label="RSI"
          zoneLines={[30, 70]}
        />
      }
      {selectedIndicators.macd && overlays.macd &&
        <MiniLineChart
          data={overlays.macd.macd}
          data2={overlays.macd.signal}
          color={INDICATORS[3].color}
          color2={'#c0ff71'}
          width={225}
          height={68}
          label="MACD"
        />
      }
    </div>
  );
}

// Mini line chart for RSI/MACD below main chart
function MiniLineChart({ data, data2, minY, maxY, label, color, color2, width = 180, height = 60, zoneLines = [] }) {
  const canvasRef = useRef();
  useEffect(() => {
    if (!canvasRef.current || !data || (data && data.length === 0)) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    let min = minY !== undefined ? minY : Math.min(...data.filter(v => v !== null));
    let max = maxY !== undefined ? maxY : Math.max(...data.filter(v => v !== null));
    const n = data.length;
    const lpad = 7, rpad = 7, tpad = 13, bpad = 14;
    // Grid/zone lines
    if (zoneLines) {
      ctx.save();
      ctx.strokeStyle = '#e0e7ef';
      ctx.setLineDash([3, 2]);
      for (let zl of zoneLines) {
        let y = tpad + ((max - zl) / (max - min)) * (height - tpad - bpad);
        ctx.beginPath();
        ctx.moveTo(lpad, y); ctx.lineTo(width - rpad, y); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }
    // Main line
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color || '#197aef';
    ctx.lineWidth = 1.7;
    for (let i = 0; i < n; ++i) {
      if (data[i] === null || data[i] === undefined) continue;
      let x = lpad + (i * (width - lpad - rpad)) / (n - 1);
      let y = tpad + ((max - data[i]) / (max - min)) * (height - tpad - bpad);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.globalAlpha = .97;
    ctx.stroke();
    ctx.restore();
    // Optionally, draw second line (MACD signal)
    if (data2 && data2.length === n) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = color2 || '#b0b8fa';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < n; ++i) {
        if (data2[i] === null || data2[i] === undefined) continue;
        let x = lpad + (i * (width - lpad - rpad)) / (n - 1);
        let y = tpad + ((max - data2[i]) / (max - min)) * (height - tpad - bpad);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.setLineDash([2.3, 2.7]);
      ctx.globalAlpha = .93;
      ctx.stroke();
      ctx.restore();
    }
    // Label
    ctx.save();
    ctx.font = '12px Inter,sans-serif';
    ctx.fillStyle = color || '#173a3a';
    ctx.fillText(label, 4, 13);
    ctx.restore();
  }, [data, data2, width, height, minY, maxY, label, color, color2, zoneLines]);
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        margin: '0 4px',
        background: '#18232f',
        border: '1px solid #2d363c',
        borderRadius: 11,
      }}
      aria-label={label + " chart"}
    />
  );
}

// PUBLIC_INTERFACE
function HistoricalDataViewer() {
  const [symbol, setSymbol] = useState(MOCK_SYMBOLS[0].value);
  const [timeFrame, setTimeFrame] = useState(TIME_FRAMES[1].key); // default: 1W
  const [selectedIndicators, setSelectedIndicators] = useState({
    sma: true,
    ema: false,
    rsi: false,
    macd: false,
  });

  // Simulate "loading", mock data switching, etc.
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [overlays, setOverlays] = useState({});

  // Symbol/timeFrame mapping -> generate new data for each for plausibility
  function getMockSeed(sym) {
    // Take base value from symbol letters to keep chart shapes distinct
    let code = 0;
    for (let i = 0; i < sym.length; ++i) code += sym.charCodeAt(i) * (i+1);
    return code % 911;
  }

  useEffect(() => {
    setIsLoading(true);
    // Simulate loading, update chart after 320ms (in real code, fetch API)
    setTimeout(() => {
      const tf = TIME_FRAMES.find(f => f.key === timeFrame);
      const seed = getMockSeed(symbol) + tf.points;
      const base = 120 + (tf.points * 0.45);
      setChartData(generateMockData(seed, tf.points, base));
      setIsLoading(false);
    }, 320);
  }, [symbol, timeFrame]);

  // Calculate overlays
  useEffect(() => {
    if (!chartData || chartData.length === 0) {
      setOverlays({});
      return;
    }
    // SMA/EMA overlays are arrays
    const next = {};
    if (selectedIndicators.sma) next.sma = calcSMA(chartData, 20);
    if (selectedIndicators.ema) next.ema = calcEMA(chartData, 20);
    if (selectedIndicators.rsi) next.rsi = calcRSI(chartData, 14);
    if (selectedIndicators.macd) next.macd = calcMACD(chartData, 26, 12, 9);
    setOverlays(next);
  }, [chartData, selectedIndicators]);

  function handleIndicatorChange(key, value) {
    setSelectedIndicators(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ color: '#1696d7', fontSize: '2.09rem', fontWeight: 700, marginBottom: '.3em' }}>
        Historical Data Viewer
      </h2>

      <div style={{
        display: 'flex', gap: '22px', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap'
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
        {/* Time frame selector */}
        <div>
          <span style={{ fontWeight: 500, color: '#537091', fontSize: '1rem' }}>Time Frame:</span>
          {TIME_FRAMES.map(tf => (
            <button
              key={tf.key}
              style={{
                marginLeft: 7,
                background: timeFrame === tf.key ? '#0f4c81' : 'none',
                color: timeFrame === tf.key ? '#fff' : '#18304b',
                fontWeight: timeFrame === tf.key ? 700 : 400,
                border: timeFrame === tf.key ? 'none' : '1px solid #eaeaea',
                borderRadius: 7,
                padding: '7px 16px',
                fontSize: '1rem',
                cursor: 'pointer',
                outline: 'none',
                transition: 'background 0.12s'
              }}
              aria-current={timeFrame === tf.key ? 'page' : undefined}
              onClick={() => setTimeFrame(tf.key)}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: '#19223a',
        borderRadius: 18,
        boxShadow: '0 2.5px 11px 0 rgba(23,80,115,0.13)',
        border: '1.2px solid #226',
        padding: '24px 14px 17px',
        minHeight: 405,
        marginBottom: 19,
        position: 'relative'
      }}>
        {isLoading ? (
          <div style={{
            color: '#5082C3',
            fontWeight: 600,
            fontSize: '1.22rem',
            padding: '88px 0',
            letterSpacing: 1
          }}>
            Loading data...
          </div>
        ) : (
          <>
            {/* Single Candlestick Chart */}
            <CandleChart
              data={chartData}
              overlays={overlays}
              selectedIndicators={selectedIndicators}
            />
            {/* Indicator controls and panel below chart */}
            <IndicatorPanel
              overlays={overlays}
              selectedIndicators={selectedIndicators}
              changeIndicator={handleIndicatorChange}
            />
          </>
        )}
      </div>
      {/* Legend/Explanation */}
      <div style={{
        background: '#e9f2fa',
        color: '#22364c',
        fontSize: '.97em',
        borderRadius: 8,
        padding: '10px 14px 9px',
        border: '1.2px solid #dbcad2',
        margin: '5px 0 0 0'
      }}>
        <div><b>How to use:</b> Select a symbol and time frame above. Toggle overlays (SMA, EMA, RSI, MACD) to visualize indicators. For demonstration, data is randomly generated on each change.</div>
        <ul style={{margin:'7px 0 0 1.1em', color: '#214073'}}>
          <li><b>SMA:</b> Simple Moving Average (20 periods)</li>
          <li><b>EMA:</b> Exponential Moving Average (20 periods)</li>
          <li><b>RSI:</b> Relative Strength Index (14 periods), shown in panel below</li>
          <li><b>MACD:</b> MACD with signal line, shown in panel below</li>
        </ul>
      </div>
    </div>
  );
}

export default HistoricalDataViewer;
