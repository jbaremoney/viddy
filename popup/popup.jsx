import { useState, useEffect } from 'react';
import './popup.css';

const MODELS = [
  { label: 'ChatGPT', value: 'chatgpt' },
  { label: 'Claude', value: 'claude' },
  { label: 'Gemini', value: 'gemini' },
  { label: 'Llama', value: 'llama' },
];

function Toggle({ enabled, onToggle }) {
  return (
    <div
      className={`toggle-switch${enabled ? ' enabled' : ''}`}
      onClick={onToggle}
      role="button"
      aria-pressed={enabled}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <div className="toggle-knob" />
    </div>
  );
}

function Popup() {
  const [viddyEnabled, setViddyEnabled] = useState(true);
  const [model, setModel] = useState(MODELS[0].value);

  // Sync toggle with chrome.storage.sync
  useEffect(() => {
    chrome.storage.sync.get(['viddyEnabled'], (result) => {
      setViddyEnabled(result.viddyEnabled !== false); // default to true
    });
  }, []);

  const handleToggle = () => {
    const newValue = !viddyEnabled;
    setViddyEnabled(newValue);
    chrome.storage.sync.set({ viddyEnabled: newValue });
  };

  return (
    <div className="popup-content">
      <h2>VIDDY</h2>
      <div className="toggle-row">
        <span>Enable Viddy</span>
        <Toggle enabled={viddyEnabled} onToggle={handleToggle} />
      </div>
      <div className="toggle-row">
        <span>Model</span>
        <select value={model} onChange={e => setModel(e.target.value)}>
          {MODELS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <button className="feedback-btn" onClick={() => { /* placeholder */ }}>
        Leave Feedback
      </button>
    </div>
  );
}

import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root'));
root.render(<Popup />);
