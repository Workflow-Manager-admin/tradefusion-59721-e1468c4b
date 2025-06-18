import React, { useState } from 'react';

// PUBLIC_INTERFACE
/**
 * AIStrategyAssistant provides:
 * - Recommendations for new trading rules based on mock user history.
 * - A strategy optimizer UI suggesting ROI/risk parameter tweaks.
 * - A natural language input to parse casual strategy requests.
 * - A chatbot-like clarifications/idea section (using GPT API, simulated).
 */
const MOCK_HISTORY = [
  // "Simplified" trade history, for demo recommendations
  { symbol: "BTC-USD", period: "30d", roi: 6.2, maxDrawdown: 3.1, trades: 5, usedRules: [{ type: "RSI", params: "<30" }] },
  { symbol: "AAPL", period: "6m", roi: -1.4, maxDrawdown: 7.9, trades: 8, usedRules: [{ type: "SMA", params: ">SMA 50" }] },
  { symbol: "ETH-USD", period: "60d", roi: 10.8, maxDrawdown: 12.8, trades: 7, usedRules: [{ type: "MACD", params: "cross above" }] }
];

// Recommendation engine (demo): Given mock history, recommends new rules
function getRecommendedRules(history = MOCK_HISTORY) {
  let recs = [];
  if (history.some(r => r.symbol === "BTC-USD" && r.roi < 8))
    recs.push({
      text: "Try increasing the RSI buy threshold to 35 for BTC for more entry signals during uptrends.",
      rule: { label: "RSI < 35", value: { type: "RSI", operator: "<", threshold: 35 } }
    });
  if (history.some(r => r.trades > 7 && r.maxDrawdown > 7))
    recs.push({
      text: "Reduce trade frequency (raise momentum threshold or add MA filter) to limit drawdowns.",
      rule: { label: "SMA 20 > SMA 50", value: { type: "SMAComparison", operator: ">", fast: 20, slow: 50 } }
    });
  if (history.some(r => r.symbol === "AAPL" && r.roi < 0))
    recs.push({
      text: "Backtest a crossover: Buy when Price crosses above SMA 100 on AAPL for trend reversal detection.",
      rule: { label: "Price crosses above SMA 100", value: { type: "CrossOver", fast: "Price", slow: "SMA100" } }
    });
  if (recs.length === 0)
    recs.push({
      text: "Maintain your current strategies. No clear improvements found (try more trade data!)."
    });
  return recs;
}

// Mock optimizer: given selected rule, outputs parameter tweaks
function optimizeStrategyParams(rule, mode = 'roi') {
  if (!rule || typeof rule !== 'object' || !rule.label) return null;
  // Simple demo logic
  if (rule.label.startsWith("RSI") && mode === "roi")
    return {
      tweak: "Bump RSI threshold from 30 → 35",
      projected: "+1.2% ROI, -0.6% win rate"
    };
  if (rule.label.startsWith("SMA") && mode === "risk")
    return {
      tweak: "Switch SMA period from 50 → 100",
      projected: "Max drawdown may decrease by 2.5%"
    };
  if (rule.label.startsWith("Price crosses above SMA 100"))
    return {
      tweak: "Test SMA 100 vs 200: Higher lag, less noise",
      projected: "Potential for steadier trend capture"
    };
  return {
    tweak: "No optimizer suggestions (try another rule or strategy).",
    projected: null
  };
}

// Mock "intent" parser for natural language queries (just a demo!)
function parseNLQuery(q) {
  const txt = q.trim().toLowerCase();
  if (!txt) return null;
  if (txt.includes("low-risk") && txt.includes("btc")) {
    return {
      summary: "Low-risk BTC swing strategy (30 days):",
      rule: "Combine SMA 100/200 crossover with RSI < 40 filter. Avoid trades during high volatility spikes.",
      tip: "Target <5 trades/month, use stop loss -4%."
    };
  }
  if (txt.includes("macd") && txt.includes("momentum")) {
    return {
      summary: "MACD Momentum Strategy Suggestion:",
      rule: "Enter long when MACD crosses above signal, exit if RSI > 70 or MACD turns down.",
      tip: "Backtest for your symbol and tune periods for best fit."
    };
  }
  if (txt.includes("best") && txt.includes("30-day")) {
    return {
      summary: "Best 30-Day Backtest (Demo):",
      rule: "Buy on RSI < 35, sell RSI > 70. Overlay EMA 20 filter.",
      tip: "Simulated ROI: 6.8% (BTC-USD, last 30d)."
    };
  }
  // Fallback
  return {
    summary: "Sorry, I couldn't parse that query.",
    rule: "Try phrasing as: 'Show me low-risk strategy for ETH', 'Best ROI for AAPL 30d'.",
    tip: ""
  };
}

// Simulated GPT-powered chat API: returns canned or context-aware responses
async function fakeGptChatResponse(message, history = []) {
  // Simulate GPT-3/4 for demo: canned replies, some basic context
  await new Promise(res => setTimeout(res, 575)); // fake latency
  const m = message.trim().toLowerCase();
  if (m.includes("clarify") || m.includes("explain"))
    return "Sure! For example, 'RSI < 30' means buying when the Relative Strength Index drops below 30, often indicating an oversold condition.";
  if (m.includes("why") && m.includes("sma"))
    return "SMA crossovers indicate potential trend changes. Filtering by longer-term SMAs (like 100/200) helps reduce false signals.";
  if (m.includes("drawdown"))
    return "Max drawdown quantifies the largest decline from a peak to a trough. Lower drawdown means less inherent risk.";
  if (m.includes("how many trades"))
    return "You can target a low-frequency (2-5/month) or high-frequency (daily) strategy using the rule parameters in the Strategy Builder.";
  if (m.includes("hello") || m.startsWith("hi"))
    return "Hello! 👋 How can I help with your trading strategy today?";
  if (m.match(/strategy\s+idea/))
    return "Try an RSI+EMA combo: Buy when RSI < 35 AND Price > EMA 50. This focuses on oversold but still uptrending assets.";
  return "I'm here for your questions—ask about technical rules, optimization tips, or backtest ideas!";
}

function RuleCard({ rec }) {
  return (
    <div style={{
      background: "#fff", border: "1.2px solid #dae3ed", borderRadius: 10, padding: "15px 19px",
      margin: "0 0 12px 0", boxShadow: "0 2px 10px 0 rgba(14,65,130,0.04)", minWidth: 210
    }}>
      <span style={{ fontWeight: 500, color: "#0f4c81" }}>{rec.text}</span>
      <br />
      {rec.rule && (
        <span style={{
          display: "inline-block", margin: "7px 0 0 2px",
          background: "#e9f2fa", color: "#0f4c81", padding: "5px 13px", borderRadius: 7,
          fontWeight: 500, fontSize: "1rem"
        }}>{rec.rule.label}</span>
      )}
    </div>
  );
}

function ChatBubble({ text, user }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: user ? "row-reverse" : "row",
      alignItems: "flex-start",
      margin: "9px 0"
    }}>
      <div style={{
        background: user ? "#e7f6fc" : "#e9f2fa", color: user ? "#0059a8" : "#0f4c81",
        borderRadius: 17, padding: "11px 18px 12px", maxWidth: 330, fontSize: "1.08rem",
        boxShadow: "0 2px 12px 0 rgba(20,121,180,0.14)", alignSelf: "flex-start"
      }}>
        {text}
      </div>
    </div>
  );
}

// Main component
const AIStrategyAssistant = () => {
  // State for recommended rules
  const [recommendations, setRecommendations] = useState(getRecommendedRules(MOCK_HISTORY));

  // State for strategy optimizer
  const [selectedRuleIdx, setSelectedRuleIdx] = useState(0);
  const ruleForOptimize = recommendations.find(r => !!r.rule)?.rule
    || { label: "RSI < 30", value: { type: "RSI", operator: "<", threshold: 30 } };
  const [optimizerOutput, setOptimizerOutput] = useState(optimizeStrategyParams(ruleForOptimize, "roi"));
  const [optimizerMode, setOptimizerMode] = useState("roi");

  // State for natural language query UI
  const [nlQuery, setNlQuery] = useState("");
  const [nlQueryResult, setNlQueryResult] = useState(null);

  // State for chatbot UI
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { text: "Hi! I'm your AI assistant. Ask me about trading rules, strategy ideas, or optimization tips.", user: false }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Handlers
  const handleOptimize = () => {
    const rule = recommendations[selectedRuleIdx]?.rule || ruleForOptimize;
    setOptimizerOutput(optimizeStrategyParams(rule, optimizerMode));
  };

  const handleNlQuerySubmit = (e) => {
    e.preventDefault();
    if (!nlQuery.trim()) return;
    const result = parseNLQuery(nlQuery);
    setNlQueryResult(result);
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newHistory = [...chatHistory, { text: chatInput, user: true }];
    setChatHistory(newHistory);
    setChatLoading(true);
    const resp = await fakeGptChatResponse(chatInput, newHistory);
    setChatHistory([...newHistory, { text: resp, user: false }]);
    setChatInput("");
    setChatLoading(false);
  };

  // UI
  return (
    <div style={{ width: "100%", maxWidth: 780, margin: "0 auto" }}>
      <h2 style={{ color: "#0f4c81", fontWeight: 700, fontSize: "2.07rem", marginBottom: ".31em" }}>
        AI Strategy Assistant{" "}
        <span style={{ color: "#ff6f61", fontWeight: 600, fontSize: "1.07rem", marginLeft: 4 }}>Smart Insights</span>
      </h2>
      <div style={{ color: "#537091", marginBottom: 19, fontWeight: 500 }}>
        Let me recommend trading rules from your history, optimize for higher ROI/risk, answer your queries, and chat about trading ideas!
      </div>

      {/* 1. Recommendations */}
      <div style={{
        margin: "0 0 29px", background: "#e9f2fa", borderRadius: 15, border: "1.3px solid #dae3ed",
        padding: "18px 29px 23px"
      }}>
        <span style={{ color: "#0f4c81", fontWeight: 600, fontSize: "1.13rem" }}>
          Recommendations Based on Your (Demo) History
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 10 }}>
          {recommendations.map((rec, i) => <RuleCard rec={rec} key={rec.text} />)}
        </div>
      </div>

      {/* 2. Strategy Optimizer */}
      <div style={{
        margin: "0 0 29px", background: "#f6fcff", borderRadius: 14, border: "1.3px solid #e0e7ef",
        padding: "18px 25px 18px"
      }}>
        <span style={{ color: "#0f4c81", fontWeight: 600, fontSize: "1.13rem" }}>
          Strategy Optimizer
        </span>
        <div style={{
          display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", marginTop: 8
        }}>
          <label style={{ fontWeight: 500, color: "#197aef" }}>
            Pick Rule:&nbsp;
            <select
              value={selectedRuleIdx}
              onChange={e => setSelectedRuleIdx(Number(e.target.value))}
              style={{
                fontSize: "1.05rem", padding: "7px 12px", borderRadius: 7,
                border: "1.3px solid #0f4c81", background: "#fff", minWidth: 140, color: "#063354"
              }}
            >
              {recommendations.filter(r => r.rule).map((rec, idx) => (
                <option key={idx} value={idx}>{rec.rule.label}</option>
              ))}
              <option value={-1}>{"Default: RSI < 30"}</option>
            </select>
          </label>
          <span>
            <label>
              <input
                type="radio"
                name="optMode"
                checked={optimizerMode === "roi"}
                onChange={() => setOptimizerMode("roi")}
                style={{ marginRight: 4 }} /> ROI
            </label>
            <label style={{ marginLeft: 13 }}>
              <input
                type="radio"
                name="optMode"
                checked={optimizerMode === "risk"}
                onChange={() => setOptimizerMode("risk")}
                style={{ marginRight: 4 }} /> Risk
            </label>
          </span>
          <button
            style={{
              background: "#0f4c81", color: "#fff", borderRadius: 7, fontWeight: 600,
              border: "none", padding: "7px 22px", cursor: "pointer"
            }}
            onClick={handleOptimize}
          >Suggest Tweaks</button>
        </div>
        <div style={{ marginTop: 13, color: "#0f4c81", fontSize: "1.07em", fontWeight: 500 }}>
          {optimizerOutput?.tweak}
        </div>
        {optimizerOutput?.projected &&
          <span style={{
            marginLeft: 7, color: "#14a66e", fontWeight: 700, fontSize: "1.03em"
          }}>{optimizerOutput.projected}</span>}
      </div>

      {/* 3. Natural Language Query */}
      <div style={{
        margin: "0 0 32px", background: "#e9f2fa", borderRadius: 14, border: "1.3px solid #dae3ed",
        padding: "17px 24px 16px"
      }}>
        <span style={{ color: "#197aef", fontWeight: 600, fontSize: "1.11rem" }}>
          Natural Language Query
        </span>
        <form onSubmit={handleNlQuerySubmit} style={{ marginTop: 7, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder='e.g. "Show me low-risk BTC strategy for 30-day swing"'
            value={nlQuery}
            onChange={e => setNlQuery(e.target.value)}
            style={{
              flex: 1,
              fontSize: "1.09rem", padding: "8px 16px", borderRadius: 7, minWidth: 230,
              border: "1.5px solid #0f4c81", outline: "none"
            }}
          />
          <button type="submit" style={{
            background: "#17ae61",
            color: "#fff",
            fontWeight: 600,
            borderRadius: 7,
            border: "none",
            padding: "8px 23px",
            fontSize: "1.02rem",
            cursor: "pointer",
            boxShadow: "0 1.2px 7px 0 rgba(23,174,97,0.09)"
          }}>Query</button>
        </form>
        {nlQueryResult &&
          <div style={{
            background: "#fff", borderRadius: 8, marginTop: 12, padding: "13px 20px 10px",
            color: "#0f4c81", border: "1.2px solid #dae3ed"
          }}>
            <div style={{ fontWeight: 600 }}>{nlQueryResult.summary}</div>
            <div style={{ fontStyle: "italic", margin: "7px 0 2px", color: "#197aef", fontWeight: 500 }}>
              {nlQueryResult.rule}
            </div>
            <div style={{ color: "#537091" }}>
              {nlQueryResult.tip}
            </div>
          </div>
        }
      </div>

      {/* 4. Chatbot Section */}
      <div style={{
        margin: "0 0 17px", background: "#f6fcff", borderRadius: 13, border: "1.3px solid #e0e7ef",
        padding: "13px 19px 19px"
      }}>
        <span style={{ color: "#0f4c81", fontWeight: 600, fontSize: "1.11rem" }}>
          Chatbot: Talk to the AI
        </span>
        <div style={{
          minHeight: 98, minWidth: 210, margin: "9px 0 0", background: "#fff",
          borderRadius: 9, border: "1px solid #dae3ed", padding: "13px 9vw 9px 21px",
          maxHeight: 245, overflowY: "auto"
        }}>
          {chatHistory.map((msg, i) => (
            <ChatBubble key={i} text={msg.text} user={msg.user} />
          ))}
          {chatLoading &&
            <ChatBubble text="Typing…" user={false} />}
        </div>
        <form onSubmit={handleChatSubmit} style={{ display: "flex", gap: 9, alignItems: "center", marginTop: 9 }}>
          <input
            value={chatInput}
            disabled={chatLoading}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Ask me anything about trading, rules, indicators..."
            style={{
              flex: 1,
              fontSize: "1.09rem", padding: "8px 15px",
              borderRadius: 6, border: "1.3px solid #0f4c81"
            }}
          />
          <button
            type="submit"
            disabled={chatLoading}
            style={{
              background: "#197aef",
              color: "#fff",
              fontWeight: 600,
              borderRadius: 7,
              border: "none",
              padding: "8px 21px",
              fontSize: "1rem",
              opacity: chatLoading ? 0.63 : 1,
              cursor: chatLoading ? "not-allowed" : "pointer"
            }}
          >Send</button>
        </form>
      </div>

      <div style={{ fontSize: ".96em", color: "#537091", opacity: 0.84, margin: "7px 0 0 1px" }}>
        All logic here is demo/front-end only. In production, AI chat and recommendations would call actual backend APIs (OpenAI, etc.) and use real user trade data!
      </div>
    </div>
  );
};

export default AIStrategyAssistant;
