import { api } from './api.ts';

let installed = false;

export function installKitchenOrderAlertIntegration(): void {
  if (installed) return;
  installed = true;

  const baseCreateOrder = api.createOrder.bind(api);

  api.createOrder = async data => {
    // A persistência e o alerta operacional agora são atômicos no Supabase.
    // Este wrapper permanece apenas para preservar o ponto único de integração
    // usado pelo frontend sem duplicar notificações.
    return baseCreateOrder(data);
  };
}
