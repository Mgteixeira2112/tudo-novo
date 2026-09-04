import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { api } from './services/api.ts';
import {
  loadSettingsCloud,
  loadSupabaseStatusCloud,
  updateSettingsCloud
} from './services/settingsPages.ts';
import { OperationalAlertsBellPortal } from './components/OperationalAlertsBellPortal.tsx';

if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
  api.getSettings = loadSettingsCloud;
  api.updateSettings = updateSettingsCloud;
  api.getSupabaseStatus = loadSupabaseStatusCloud;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <>
      <App />
      <OperationalAlertsBellPortal />
    </>
  </StrictMode>,
);
