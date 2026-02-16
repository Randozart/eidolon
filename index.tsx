import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;
(window as any).global = window;

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';

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