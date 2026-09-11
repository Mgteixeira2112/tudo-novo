import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './public-site-boutique.css';
import './public-site-urban.css';
import './public-site-nature.css';
import './public-site-classic.css';
import './public-site-template-heroes.css';
import { api, setApiAccessToken } from './services/api.ts';
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
import { HotelProvider } from './context/HotelContext.tsx';
import { PublicBookingExperience } from './components/PublicBookingExperience.tsx';

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

const isSystemRoute = () => typeof window !== 'undefined' && window.location.hash.startsWith('#/sistema');

const resolveSystemRoute = () => {
  const systemRoute = isSystemRoute();
  if (!systemRoute) {
    // O site público nunca deve depender do token administrativo que ficou em memória
    // após navegar pelo sistema. O HotelProvider passa a carregar getPublicSettings()
    // na montagem e mantém as acomodações públicas independentes da sessão interna.
    setApiAccessToken(null);
  }
  return systemRoute;
};

const PublicSiteEntry = () => (
  <HotelProvider>
    <PublicBookingExperience />
    <a
      href="#/sistema"
      className="fixed bottom-4 right-4 z-[70] rounded-xl border border-black/10 bg-white/95 px-4 py-2.5 text-xs font-bold text-[#2C3327] shadow-lg backdrop-blur transition hover:bg-white hover:shadow-xl sm:bottom-5 sm:right-5"
      aria-label="Acessar sistema administrativo"
    >
      Acessar sistema
    </a>
  </HotelProvider>
);

const ApplicationEntry = () => {
  const [systemRoute, setSystemRoute] = useState(resolveSystemRoute);

  useEffect(() => {
    const syncRoute = () => {
      setSystemRoute(resolveSystemRoute());
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    const handleSystemBookingClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('#tab-mode-booking')) {
        window.location.hash = '';
      }
    };

    window.addEventListener('hashchange', syncRoute);
    document.addEventListener('click', handleSystemBookingClick, true);
    syncRoute();

    return () => {
      window.removeEventListener('hashchange', syncRoute);
      document.removeEventListener('click', handleSystemBookingClick, true);
    };
  }, []);

  if (!systemRoute) {
    return <PublicSiteEntry />;
  }

  return (
    <>
      <App />
      <OperationalAlertsBellPortal />
      <OperationalAlertsCenterPortal />
    </>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {kdsToken ? (
      <KdsEntry token={kdsToken} />
    ) : (
      <ApplicationEntry />
    )}
  </StrictMode>,
);
