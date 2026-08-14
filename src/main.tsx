import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import TramiaDialogHost from './components/TramiaDialog';
import './index.css';

// Light is the canonical theme. This explicit attribute creates a stable hook
// for a future dark theme without changing component structure.
document.documentElement.dataset.theme = 'light';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <TramiaDialogHost />
  </StrictMode>,
);
