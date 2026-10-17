import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Importando estilos globais e Tailwind

// Safe JSON.stringify wrapper to prevent circular structure errors (e.g. DOM elements / Fiber nodes)
const nativeJSONStringify = JSON.stringify;
JSON.stringify = function (value: any, replacer?: any, space?: any) {
  const seen = new WeakSet();
  const safeReplacer = (key: string, val: any) => {
    if (val !== null && typeof val === 'object') {
      if (typeof Element !== 'undefined' && val instanceof Element) {
        return `<${val.tagName.toLowerCase()} />`;
      }
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);
    }
    if (typeof replacer === 'function') {
      return replacer(key, val);
    }
    return val;
  };

  try {
    return nativeJSONStringify(value, replacer ? (k: string, v: any) => safeReplacer(k, typeof replacer === 'function' ? replacer(k, v) : v) : safeReplacer, space);
  } catch {
    return '"[Unserializable Object]"';
  }
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);