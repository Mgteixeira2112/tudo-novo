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
import { installTaskAlertIntegration } from './services/taskAlertIntegration.ts';
import { installKitchenOrderAlertIntegration } from './services/kitchenOrderAlertIntegration.ts';
import { installGovernanceCheckoutAlertIntegration } from './services/governanceCheckoutAlertIntegration.ts';
import { OperationalAlertsBellPortal } from './components/OperationalAlertsBellPortal.tsx';
import { OperationalAlertsNavPortal } from './components/OperationalAlertsNavPortal.tsx';
import { OperationalAlertsCenterPortal } from './components/OperationalAlertsCenterPortal.tsx';

if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
  api.getSettings = loadSettingsCloud;
  api.updateSettings = updateSettingsCloud;
  api.getSupabaseStatus = loadSupabaseStatusCloud;
}

installTaskAlertIntegration();
installKitchenOrderAlertIntegration();
installGovernanceCheckoutAlertIntegration();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <>
      <App />
      <OperationalAlertsBellPortal />
      <OperationalAlertsNavPortal />
      <OperationalAlertsCenterPortal />
    </>
  </StrictMode>,
);