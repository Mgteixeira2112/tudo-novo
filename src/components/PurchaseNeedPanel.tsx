import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Search, ShoppingCart } from 'lucide-react';
import { loadPurchaseNeedDashboard, PurchaseNeedItem } from '../services/purchaseNeed.ts';
import { MenuDemandForecastPanel } from './MenuDemandForecastPanel.tsx';

const fmt = (value: number) => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const PurchaseNeedPanel: React.FC = () => {
  const [items, setItems] = useState<PurchaseNeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [onlySuggested, setOnlySuggested] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await loadPurchaseNeedDashboard());
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar necessidade de compras.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => items.filter(item => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || item.itemName.toLowerCase().includes(q) || item.sector.toLowerCase().includes(q);
    const matchSuggested = !onlySuggested || item.suggestedQuantity > 0;
    return matchSearch && matchSuggested;
  }), [items, search, onlySuggested]);

  const suggested = items.filter(item => item.suggestedQuantity > 0);
  const estimatedTotal = suggested.reduce((sum, item) => sum + item.estimatedCost, 0);
  const critical = items.filter(item => item.currentStock <= item.minStock).length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#588157]/10 flex items-center justify-center text-[#588157]"><ShoppingCart className="w-6 h-6" /></div>
            <div>
              <h2 className="text-xl font-black text-[#2C3327]">Necessidade de Compras</h2>
              <p className="text-sm text-[#6B705C]">Sugestão calculada pelo consumo real e pela previsão de produção do cardápio para amanhã.</p>
            </div>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#DAD7CC] text-sm font-bold text-[#2C3327] hover:bg-[#F4F1EA] disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </div>

      <MenuDemandForecastPanel onChanged={() => void load()} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#E6E3D8] bg-white p-4"><p className="text-xs font-bold uppercase text-[#6B705C]">Itens sugeridos</p><p className="text-2xl font-black text-[#2C3327] mt-1">{suggested.length}</p></div>
        <div className="rounded-2xl border border-[#E6E3D8] bg-white p-4"><p className="text-xs font-bold uppercase text-[#6B705C]">Abaixo do mínimo</p><p className="text-2xl font-black text-[#9E2A2B] mt-1">{critical}</p></div>
        <div className="rounded-2xl border border-[#E6E3D8] bg-white p-4"><p className="text-xs font-bold uppercase text-[#6B705C]">Custo estimado</p><p className="text-2xl font-black text-[#2C3327] mt-1">{money(estimatedTotal)}</p></div>
      </div>

      <div className="rounded-2xl border border-[#E6E3D8] bg-white p-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F7A]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar item ou setor" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#DAD7CC] text-sm outline-none focus:ring-2 focus:ring-[#588157]/20" />
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#4E5548]">
            <input type="checkbox" checked={onlySuggested} onChange={e => setOnlySuggested(e.target.checked)} /> Mostrar somente itens com compra sugerida
          </label>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}

      <div className="rounded-2xl border border-[#E6E3D8] bg-white overflow-hidden shadow-xs">
        <div className="px-4 py-2 border-b border-[#EFECE3] bg-[#FCFBF8] text-[11px] text-[#7A806F] lg:hidden">
          Deslize horizontalmente para conferir todas as colunas.
        </div>
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="min-w-[1070px] w-full table-fixed text-[12px] xl:text-[13px]">
            <colgroup>
              <col className="w-[280px]" />
              <col className="w-[78px]" />
              <col className="w-[55px]" />
              <col className="w-[55px]" />
              <col className="w-[58px]" />
              <col className="w-[62px]" />
              <col className="w-[74px]" />
              <col className="w-[88px]" />
              <col className="w-[88px]" />
              <col className="w-[72px]" />
              <col className="w-[82px]" />
              <col className="w-[90px]" />
            </colgroup>
            <thead className="bg-[#F4F1EA] text-[#596052]">
              <tr>
                <th className="text-left px-3 py-3">Item</th>
                <th className="text-right px-2 py-3">Atual</th>
                <th className="text-right px-2 py-3">Mín.</th>
                <th className="text-right px-2 py-3">Máx.</th>
                <th className="text-right px-2 py-3">Hoje</th>
                <th className="text-right px-2 py-3">7 dias</th>
                <th className="text-right px-2 py-3">Média/dia</th>
                <th className="text-right px-2 py-3 leading-tight">Cardápio<br />amanhã</th>
                <th className="text-right px-2 py-3 leading-tight">Demanda<br />prevista</th>
                <th className="text-right px-2 py-3">Segurança</th>
                <th className="text-right px-2 py-3">Comprar</th>
                <th className="text-right px-3 py-3">Custo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE3]">
              {loading ? (
                <tr><td colSpan={12} className="px-4 py-10 text-center text-[#6B705C]">Calculando necessidade de compras...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-10 text-center text-[#6B705C]">Nenhum item encontrado.</td></tr>
              ) : filtered.map(item => (
                <tr key={item.itemId} className="hover:bg-[#FAF9F5] align-top">
                  <td className="px-3 py-3">
                    <p className="font-bold text-[#2C3327] leading-tight break-words">{item.itemName}</p>
                    <p className="text-[11px] text-[#7A806F] mt-1 leading-snug break-words">{item.sector} · {item.reason}</p>
                  </td>
                  <td className="text-right px-2 py-3 font-semibold whitespace-nowrap">{fmt(item.currentStock)} {item.unit}</td>
                  <td className="text-right px-2 py-3 whitespace-nowrap">{fmt(item.minStock)}</td>
                  <td className="text-right px-2 py-3 whitespace-nowrap">{fmt(item.maxStock)}</td>
                  <td className="text-right px-2 py-3 whitespace-nowrap">{fmt(item.consumptionToday)}</td>
                  <td className="text-right px-2 py-3 whitespace-nowrap">{fmt(item.consumption7d)}</td>
                  <td className="text-right px-2 py-3 whitespace-nowrap">{fmt(item.dailyAverage)}</td>
                  <td className={`text-right px-2 py-3 font-semibold whitespace-nowrap ${item.menuForecastDemand > 0 ? 'text-[#588157]' : ''}`}>{fmt(item.menuForecastDemand)}</td>
                  <td className="text-right px-2 py-3 whitespace-nowrap">{fmt(item.forecastDemand)}</td>
                  <td className="text-right px-2 py-3 whitespace-nowrap">{fmt(item.safetyStock)}</td>
                  <td className={`text-right px-2 py-3 font-black whitespace-nowrap ${item.suggestedQuantity > 0 ? 'text-[#9E2A2B]' : 'text-[#588157]'}`}>{fmt(item.suggestedQuantity)} {item.unit}</td>
                  <td className="text-right px-3 py-3 font-bold whitespace-nowrap">{money(item.estimatedCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-[#E6E3D8] bg-[#F8F6F0] px-4 py-3 text-xs text-[#676D5F]">
        Fórmula atual: demanda prevista = média diária das saídas dos últimos 7 dias + ingredientes exigidos pela previsão do cardápio de amanhã; estoque de segurança = mínimo; compra sugerida = demanda prevista + segurança − estoque atual. Criar uma receita, por si só, não gera compra.
      </div>
    </div>
  );
};
