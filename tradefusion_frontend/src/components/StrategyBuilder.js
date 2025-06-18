import React, { useState } from 'react';

/*
  PUBLIC_INTERFACE
  StrategyBuilder component - An interactive drag-and-drop rule editor for technical conditions, logic combinators, and strategy saving.
  Allows users to:
    - Drag technical indicators/conditions into a workspace (e.g., RSI < 30)
    - Combine condition "blocks" using AND, OR, NOT logic
    - Name and save strategies
*/

/**
 * DraggableCondition - reusable draggable "block" for technical conditions
 */
const DraggableCondition = ({ condition }) => (
  <div
    draggable
    onDragStart={e => {
      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'condition', condition }));
    }}
    style={{
      padding: '10px 18px',
      borderRadius: 9,
      border: '1.5px solid #0f4c81',
      margin: '0.22rem 0',
      background: '#e9f2fa',
      color: '#063354',
      fontWeight: 500,
      cursor: 'grab',
      fontSize: '1rem',
      userSelect: 'none',
      boxShadow: '0 3px 13px 0 rgba(15,76,129,0.05)'
    }}
  >
    {condition.label}
  </div>
);


/**
 * DraggableLogic - draggable logic combinator blocks (AND/OR/NOT)
 */
const DraggableLogic = ({ combinator }) => (
  <div
    draggable
    onDragStart={e => {
      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'logic', combinator }));
    }}
    style={{
      padding: '7px 16px',
      margin: '0.17rem 0',
      borderRadius: 7,
      border: '1.5px solid #ff6f61',
      background: '#fff0ec',
      color: '#b92e13',
      fontWeight: 700,
      display: 'inline-block',
      fontSize: '1rem',
      cursor: 'grab',
      userSelect: 'none',
      letterSpacing: 0.5,
      boxShadow: '0 2px 13px 0 rgba(255,111,97,0.09)'
    }}
  >
    {combinator}
  </div>
);

/**
 * LogicBlock - recursively render a block: a single condition, or a combinator combining more blocks
 */
function LogicBlock({ node, onRemove, onUpdate }) {
  if (!node) return null;
  if (node.type === 'condition') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', margin: '4px 0', background: '#e9f2fa',
        padding: '8px 14px', borderRadius: 11, border: '1.5px solid #0f4c81', fontWeight: 500, minWidth: 100,
        fontSize: '1rem', maxWidth: 250, overflow: 'hidden', whiteSpace: 'nowrap'
      }}>
        {node.condition.label}
        <button
          aria-label="Remove condition"
          style={{
            marginLeft: 12, color: '#b92e13', background: 'none',
            border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16, outline: 'none'
          }}
          onClick={() => onRemove()}
        >✕</button>
      </div>
    );
  }
  if (node.type === 'logic') {
    return (
      <div style={{
        border: '2px solid #ff6f61',
        borderRadius: 12,
        padding: '6px 12px 7px',
        margin: '5px 0',
        background: '#fff0ec',
        display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
        <span style={{
          color: '#ff6f61', fontWeight: 700, letterSpacing: 1, fontSize: '1.13rem', marginBottom: 2, textAlign: 'center'
        }}>
          {node.combinator}
        </span>
        <div style={{
          display: 'flex',
          flexDirection: node.combinator === 'NOT' ? 'column' : 'row',
          gap: node.combinator === 'NOT' ? '8px' : '20px',
          flexWrap: 'wrap', justifyContent: 'center', width: '100%'
        }}>
          {node.children.map((child, i) => (
            <LogicBlock
              key={i}
              node={child}
              onRemove={() => {
                // Remove this child node from parent's children
                const newChildren = node.children.slice();
                newChildren.splice(i, 1);
                if (newChildren.length === 0) {
                  // If no child left, remove the logic block itself
                  onRemove();
                } else {
                  onUpdate({ ...node, children: newChildren });
                }
              }}
              onUpdate={updatedChild => {
                const newChildren = node.children.slice();
                newChildren[i] = updatedChild;
                onUpdate({ ...node, children: newChildren });
              }}
            />
          ))}
        </div>
        <button
          aria-label="Remove logic block"
          style={{
            marginTop: 5, color: '#b92e13', background: 'none',
            border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16, outline: 'none', alignSelf: 'flex-end'
          }}
          onClick={onRemove}
        >✕</button>
      </div>
    );
  }
  return null;
}

/**
 * DropWorkspace - main area for drag & drop, recursively holds the root logic/condition tree.
 */
function DropWorkspace({ value, onChange }) {
  // Handle dropping new blocks into root (top-level)
  function handleDrop(e) {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    const obj = JSON.parse(data);
    if (!value) {
      // No root yet: Place the dropped node as root (condition or logic)
      if (obj.type === 'condition') {
        onChange({ type: 'condition', condition: obj.condition });
      } else if (obj.type === 'logic') {
        // for logic block, create with 1 child (to be added after)
        onChange({ ...obj, children: [] });
      }
    } else if (value && obj.type === 'logic') {
      // Wrapping existing value with new combinator (e.g. drag 'AND' on a block)
      onChange({ type: 'logic', combinator: obj.combinator, children: [value] });
    }
    // Dragging condition onto existing tree is not allowed (ambiguous operator placement)
  }
  function handleDragOver(e) {
    e.preventDefault();
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        minHeight: 112,
        minWidth: 180,
        padding: '22px',
        border: '2.5px dashed #0f4c81',
        borderRadius: 19,
        background: value ? '#f6ffff' : '#f2f4f7',
        display: 'flex',
        alignItems: value ? 'flex-start' : 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'border-color 0.17s, background 0.11s'
      }}
      aria-label="Strategy rule builder workspace"
    >
      {value
        ? <LogicBlock node={value} onRemove={() => onChange(null)} onUpdate={onChange} />
        : <span style={{ color: '#537091', fontStyle: 'italic', fontSize: '1.07rem' }}>
            Drag a condition or logic block here to start building...
          </span>
      }
    </div>
  );
}


/** List of available technical conditions to drag */
const DEFAULT_CONDITIONS = [
  { label: 'RSI < 30', value: { type: 'RSI', operator: '<', threshold: 30 } },
  { label: 'RSI > 70', value: { type: 'RSI', operator: '>', threshold: 70 } },
  { label: 'Price > SMA 50', value: { type: 'SMA', operator: '<PriceGreaterThan>', period: 50 } },
  { label: 'Price < SMA 200', value: { type: 'SMA', operator: '<PriceLessThan>', period: 200 } },
  { label: 'MACD Crosses Above Signal', value: { type: 'MACD_Cross_Above', operator: null } },
  { label: 'MACD Crosses Below Signal', value: { type: 'MACD_Cross_Below', operator: null } },
  // Add more conditions here as needed...
];

/** List of logic combinators to drag */
const LOGIC_COMBINATORS = ['AND', 'OR', 'NOT'];

// PUBLIC_INTERFACE
function StrategyBuilder() {
  // Rule tree state (null or condition/logic block)
  const [ruleTree, setRuleTree] = useState(null);

  // Strategy naming/saving UI state
  const [strategyName, setStrategyName] = useState('');
  const [savedStrategies, setSavedStrategies] = useState([]); // Array of { name, ruleTree }
  const [saveMessage, setSaveMessage] = useState('');

  // Handles saving new strategy (basic local only)
  function handleSave() {
    if (!strategyName.trim()) {
      setSaveMessage('Strategy name required.');
      return;
    }
    if (!ruleTree) {
      setSaveMessage('Add rules before saving.');
      return;
    }
    const exists = savedStrategies.some(s => s.name === strategyName.trim());
    if (exists) {
      setSaveMessage('A strategy with this name already exists.');
      return;
    }
    setSavedStrategies([...savedStrategies, { name: strategyName.trim(), ruleTree }]);
    setSaveMessage('Strategy saved!');
    setStrategyName('');
    // Optionally, reset ruleTree: setRuleTree(null)
    setTimeout(() => setSaveMessage(''), 1600);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      <h2 style={{ color: '#0f4c81', fontWeight: 700, fontSize: '2rem', marginBottom: '.13em' }}>
        Strategy Builder <span style={{color: '#ff6f61', fontWeight: 600, fontSize: '1.09rem', marginLeft: 3}}>Visual Rule Editor</span>
      </h2>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2.1rem',
        alignItems: 'flex-start'
      }}>
        {/* Palette of draggable conditions */}
        <div>
          <div style={{ fontWeight: 600, color: '#537091', marginBottom: 8, fontSize: '1.1rem', letterSpacing: 0.2 }}>Conditions</div>
          {DEFAULT_CONDITIONS.map((c, idx) => (
            <DraggableCondition key={'cond-' + idx} condition={c} />
          ))}
        </div>
        {/* Palette of logic combinators */}
        <div>
          <div style={{ fontWeight: 600, color: '#b92e13', marginBottom: 8, fontSize: '1.1rem', letterSpacing: 0.2 }}>Logic Blocks</div>
          {LOGIC_COMBINATORS.map((logic, idx) => (
            <DraggableLogic key={'logic-' + logic + idx} combinator={logic} />
          ))}
        </div>
        {/* Drag-and-drop workspace */}
        <div style={{ flex: 1, minWidth: 255, maxWidth: 540 }}>
          <DropWorkspace value={ruleTree} onChange={setRuleTree} />
          {ruleTree &&
            <button
              style={{
                marginTop: 10,
                background: '#ff6f61',
                color: '#fff',
                padding: '8px 23px',
                fontSize: '1rem',
                border: 'none',
                borderRadius: 7,
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 1.5px 7px 0 rgba(216,47,25,0.07)',
                transition: 'background 0.16s'
              }}
              onClick={() => setRuleTree(null)}
            >Clear Workspace</button>
          }
        </div>
      </div>
      {/* Naming and saving UI */}
      <div style={{ marginTop: 15, display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
        <input
          type="text"
          aria-label="Strategy name"
          placeholder="Name your strategy"
          value={strategyName}
          maxLength={40}
          onChange={e => setStrategyName(e.target.value.slice(0,40))}
          style={{
            fontSize: '1.08rem',
            padding: '8px 17px',
            border: '1.6px solid #0f4c81',
            borderRadius: 7,
            minWidth: 170,
            outline: 'none'
          }}
        />
        <button
          style={{
            background: '#0f4c81',
            color: '#fff',
            padding: '10px 28px',
            border: 'none',
            borderRadius: 9,
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 2.5px 10px 0 rgba(15,76,129,0.10)',
            marginLeft: '1px'
          }}
          onClick={handleSave}
        >Save Strategy</button>
        <span style={{ color: saveMessage === 'Strategy saved!' ? '#14a66e' : '#b92e13', fontSize: '1.01rem', minWidth: 120 }}>
          {saveMessage}
        </span>
      </div>
      {/* Saved strategies view (local/ephemeral) */}
      <div style={{ marginTop: '10px', background: '#e9f2fa', padding: '14px 13px', borderRadius: 10, border: '1.5px solid #dae3ed' }}>
        <div style={{ fontWeight: 500, color: '#537091', marginBottom: 5, fontSize: '1rem' }}>Saved Strategies</div>
        {savedStrategies.length === 0
          ? <div style={{ color: '#b0b6bd', fontStyle: 'italic' }}>None saved yet.</div>
          : <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              {savedStrategies.map((s, i) => (
                <li key={s.name} style={{ marginRight: 18, marginBottom: 4 }}>
                  <span style={{
                    background: '#fff',
                    color: '#063354',
                    padding: '5px 13px',
                    borderRadius: 7,
                    border: '1.1px solid #b6cadf',
                    fontWeight: 500,
                    marginRight: 6,
                    fontSize: '1rem'
                  }}>{s.name}</span>
                  <button
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#b92e13',
                      cursor: 'pointer',
                      fontSize: 15,
                      marginLeft: 4
                    }}
                    aria-label="Delete saved strategy"
                    onClick={() => setSavedStrategies(prev => prev.filter(x => x.name !== s.name))}
                  >✕</button>
                  <button
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#1a718c',
                      cursor: 'pointer',
                      fontSize: 14,
                      marginLeft: 6
                    }}
                    aria-label="Load saved strategy"
                    onClick={() => setRuleTree(structuredClone(s.ruleTree))}
                  >Load</button>
                </li>
              ))}
            </ul>
        }
      </div>
      <div style={{ margin: '11px 0 0 2px', color: '#537091', fontSize: '0.97em', fontStyle: 'italic', opacity: .91 }}>
        <ul style={{ margin: '0 0 0 1.5em', padding: 0 }}>
          <li>Drag conditions and/or logic blocks onto the workspace. Drag logic blocks to wrap existing blocks.</li>
          <li>Combine blocks using <strong>AND</strong>, <strong>OR</strong>, <strong>NOT</strong> as needed.</li>
          <li>Name and save your strategy for later use.</li>
        </ul>
      </div>
    </div>
  );
}

export default StrategyBuilder;
