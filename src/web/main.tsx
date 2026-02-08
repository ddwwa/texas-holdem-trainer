import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

console.log('main.tsx loading...');

try {
  const rootElement = document.getElementById('root');
  console.log('Root element:', rootElement);
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  console.log('Creating React root...');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('Rendering App...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('App rendered successfully');
} catch (error) {
  console.error('Fatal error in main.tsx:', error);
  document.body.innerHTML = `
    <div style="padding: 2rem; color: red; font-family: monospace;">
      <h1>Fatal Error</h1>
      <pre>${error}</pre>
    </div>
  `;
}
