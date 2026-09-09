import React, { useEffect, useState } from 'react';
import { CalendarRange, RefreshCw, Sparkles } from 'lucide-react';
import { loadOperationalForecast, OperationalForecast } from '../services/operationalForecast.ts';
import { setMenuDemandForecast } from '../services/purchaseNeed.ts';

const tomorrowIso = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const fmt = (value: number, digits = 2) => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: digits });

export const OperationalForecastPanel: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [targetDate] = useState(tomorrowIso());
  const [data, setData] = useState<OperationalForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setData(await loadOperationalForecast(targetDate));
    } catch (err: any) {
      setError(err?.message || 'Erro ao calcular previsão operacional.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [targetDate]);

  const applySuggestion = async (menuItemId: string, menuItemName: string, quantity: number) => {
    if (quantity <= 0) return;
    try {
      setApplyingId(menuItemId);
      setError('');
      setSuccess('');
      await setMenuDemandForecast(menuItemId, targetDate, quantity);
      setSuccess(`Sugestão operacional de ${quantity} unidade(s) aplicada a ${menuItemName}.`);
      await load();
      onChanged();
    } catch (err: any) {
      setError(err?.message || 'Erro ao aplicar sugestão operacional.');
    } finally {
      setApplyingId('');
    }
  };

  return (
    <div className="rounded-2xl border border-[#DDE5D8] bg-white p-5 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#588157]/10 flex items-center justify-center text-[#588157]"><CalendarRange className="w-5 h-5" /></div>
          <div>
            <h3 className="font-black text-[#2C3327]">Previsão Operacional Futura — amanhã</h3>
            <p className="text-sm text-[#6B705C]">Histórico real + hóspedes previstos + dia da semana quando houver amostra suficiente.</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#DAD7CC] text-sm font-bold text-[#2C3327] disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recalcular
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      {loading && !data ? (
        <div className="py-6 text-sm text-[#6B705C]">Calculando sinais operacionais...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-xl bg-[#F8F6F0] p-3"><p className="text-xs font-bold uppercase text-[#6B705C]">Quartos previstos</p><p className="text-xl font-black text-[#2C3327]">{data.signals.expectedRooms}/{data.signals.totalRooms}</p></div>
            <div className="rounded-xl bg-[#F8F6F0] p-3"><p className="text-xs font-bold uppercase text-[#6B705C]">Ocupação</p><p className="text-xl font-black text-[#2C3327]">{fmt(data.signals.occupancyPct, 1)}%</p></div>
            <div className="rounded-xl bg-[#F8F6F0] p-3"><p className="text-xs font-bold uppercase text-[#6B705C]">Hóspedes</p><p className="text-xl font-black text-[#2C3327]">{fmt(data.signals.expectedGuests, 0)}</p></div>
            <div className="rounded-xl bg-[#F8F6F0] p-3"><p className="text-xs font-bold uppercase text-[#6B705C]">Check-ins</p><p className="text-xl font-black text-[#2C3327]">{data.signals.checkins}</p></div>
            <div className="rounded-xl bg-[#F8F6F0] p-3"><p className="text-xs font-bold uppercase text-[#6B705C]">Check-outs</p><p className="text-xl font-black text-[#2C3327]">{data.signals.checkouts}</p></div>
          </div>

          <div className="rounded-xl border border-[#E6E3D8] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-[#F4F1EA] text-[#596052]">
                  <tr>
                    <th className="text-left px-4 py-3">Receita</th>
                    <th className="text-right px-3 py-3">Manual</th>
                    <th className="text-right px-3 py-3">28 dias</th>
                    <th className="text-right px-3 py-3">Taxa/hóspede</th>
                    <th className="text-right px-3 py-3">Fator semanal</th>
                    <th className="text-right px-3 py-3">Sugestão</th>
                    <th className="text-center px-3 py-3">Confiança</th>
                    <th className="text-right px-4 py-3">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE3]">
                  {data.recipes.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-[#6B705C]">Nenhuma receita elegível encontrada.</td></tr>
                  ) : data.recipes.map(recipe => (
                    <tr key={recipe.menuItemId} className="align-top hover:bg-[#FAF9F5]">
                      <td className="px-4 py-3 min-w-[260px]">
                        <p className="font-bold text-[#2C3327]">{recipe.menuItemName}</p>
                        <p className="text-xs text-[#7A806F] mt-0.5">{recipe.reason}</p>
                      </td>
                      <td className="text-right px-3 py-3">{fmt(recipe.manualForecast, 0)}</td>
                      <td className="text-right px-3 py-3">{fmt(recipe.historicalUnits28d, 0)}</td>
                      <td className="text-right px-3 py-3">{fmt(recipe.ratePerGuest, 4)}</td>
                      <td className="text-right px-3 py-3">{fmt(recipe.weekdayFactor, 2)}×</td>
                      <td className="text-right px-3 py-3 font-black text-[#588157]">{fmt(recipe.suggestedUnits, 0)}</td>
                      <td className="text-center px-3 py-3"><span className="inline-flex rounded-full bg-[#F1EFE7] px-2.5 py-1 text-xs font-bold text-[#596052]">{recipe.confidence}</span></td>
                      <td className="text-right px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void applySuggestion(recipe.menuItemId, recipe.menuItemName, recipe.suggestedUnits)}
                          disabled={recipe.suggestedUnits <= 0 || applyingId === recipe.menuItemId || recipe.manualForecast === recipe.suggestedUnits}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2C3327] text-white text-xs font-bold disabled:opacity-40"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Aplicar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#676D5F]">
            <div className="rounded-xl bg-[#F8F6F0] px-4 py-3">Histórico: {fmt(data.signals.historicalGuestNights28d, 0)} hóspede-dia em 28 dias. Dias comparáveis do mesmo dia da semana: {data.signals.sameWeekdaySampleDays}.<br />{data.methodology}</div>
            <div className="rounded-xl bg-[#F8F6F0] px-4 py-3">Sazonalidade: {data.signals.seasonality}<br />Eventos: {data.signals.events}</div>
          </div>
        </>
      ) : null}
    </div>
  );
};
