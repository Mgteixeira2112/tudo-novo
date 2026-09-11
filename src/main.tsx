import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './public-site-boutique.css';
import './public-site-urban.css';
import './public-site-nature.css';
import './public-site-classic.css';
import './public-site-template-heroes.css';
import { api } from './services/api.ts';
import {
  loadSettingsCloud,
  loadSupabaseStatusCloud,
  updateSettingsCloud
} from './services/settingsPages.ts';
import { installTaskAlertIntegration } from './services/taskAlertIntegration.ts';
import { installKitchenOrderAlertIntegration } from './services/kitchenOrderAlertIntegration.ts';
import { installGovernanceCheckoutAlertIntegration } from './services/governanceCheckoutAlertIntegration.ts';
import { OperationalAlertsBellPortal } from './components/OperationalAlertsBellPortal.tsx';
import { OperationalAlertsCenterPortal } from './components/OperationalAlertsCenterPortal.tsx';
import { KdsEntry } from './components/KdsEntry.tsx';

if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
  api.getSettings = loadSettingsCloud;
  api.updateSettings = updateSettingsCloud;
  api.getSupabaseStatus = loadSupabaseStatusCloud;
}

installTaskAlertIntegration();
installKitchenOrderAlertIntegration();
installGovernanceCheckoutAlertIntegration();

const kdsToken = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('kds')
  : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {kdsToken ? (
      <KdsEntry token={kdsToken} />
    ) : (
      <>
        <App />
        <OperationalAlertsBellPortal />
        <OperationalAlertsCenterPortal />
      </>
    )}
  </StrictMode>,
);
