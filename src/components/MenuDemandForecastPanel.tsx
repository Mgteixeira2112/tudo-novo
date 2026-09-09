import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Save } from 'lucide-react';
import { loadMenuDemandForecastSetup, MenuDemandForecastSetup, setMenuDemandForecast } from '../services/purchaseNeed.ts';

const tomorrowIso = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

export const MenuDemandForecastPanel: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [forecastDate] = useState(tomorrowIso());
  const [items, setItems] = useState<MenuDemandForecastSetup[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await loadMenuDemandForecastSetup(forecastDate);
      setItems(data);
      setDrafts(Object.fromEntries(data.map(item => [item.menuItemId, String(item.forecastQuantity || '')])));
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar previsão de produção.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [forecastDate]);

  const totalForecast = useMemo(() => items.reduce((sum, item) => sum + Number(drafts[item.menuItemId] || 0), 0), [items, drafts]);

  const save = async (item: MenuDemandForecastSetup) => {
    try {
      setSavingId(item.menuItemId);
      setError('');
      setSuccess('');
      const value = Number(drafts[item.menuItemId] || 0);
      if (!Number.isFinite(value) || value < 0) throw new Error('Informe uma quantidade válida, maior ou igual a zero.');
      await setMenuDemandForecast(item.menuItemId, forecastDate, value);
      setSuccess(value > 0
        ? `Previsão de ${value} unidade(s) para ${item.menuItemName} salva.`
        : `Previsão de ${item.menuItemName} removida.`
      );
      await load();
      onChanged();
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar previsão de produção.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#A3B18A]/15 flex items-center justify-center text-[#588157]"><CalendarDays className="w-5 h-5" /></div>
          <div>
            <h3 className="font-black text-[#2C3327]">Previsão de produção do cardápio — amanhã</h3>
            <p className="text-sm text-[#6B705C]">Somente receitas disponíveis com ficha técnica válida aparecem aqui.</p>
          </div>
        </div>
        <div className="text-sm text-[#596052] font-semibold">Total previsto: {totalForecast.toLocaleString('pt-BR')} prato(s)</div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      {loading ? (
        <div className="py-6 text-sm text-[#6B705C]">Carregando receitas...</div>
      ) : items.length === 0 ? (
        <div className="py-6 text-sm text-[#6B705C]">Nenhuma receita composta com ficha técnica válida encontrada.</div>
      ) : (
        <div className="divide-y divide-[#EFECE3] border border-[#E6E3D8] rounded-xl overflow-hidden">
          {items.map(item => (
            <div key={item.menuItemId} className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:justify-between bg-white">
              <div>
                <p className="font-bold text-[#2C3327]">{item.menuItemName}</p>
                <p className="text-xs text-[#7A806F]">{item.ingredientCount} ingrediente(s) vinculados</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={drafts[item.menuItemId] ?? ''}
                  onChange={e => setDrafts(prev => ({ ...prev, [item.menuItemId]: e.target.value }))}
                  placeholder="0"
                  className="w-28 px-3 py-2 rounded-xl border border-[#DAD7CC] text-sm text-right outline-none focus:ring-2 focus:ring-[#588157]/20"
                />
                <button
                  type="button"
                  onClick={() => void save(item)}
                  disabled={savingId === item.menuItemId}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#2C3327] text-white text-sm font-bold disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> Salvar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-[#F8F6F0] px-4 py-3 text-xs text-[#676D5F]">
        Criar uma receita não gera compra. Apenas uma previsão positiva para amanhã adiciona automaticamente a necessidade dos ingredientes ao painel de Compras. Informe 0 para remover a previsão.
      </div>
    </div>
  );
};
