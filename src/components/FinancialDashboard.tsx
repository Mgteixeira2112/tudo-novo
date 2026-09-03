import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  CreditCard,
  QrCode,
  PieChart,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle,
  Clock,
  Printer
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { FinancialTransaction } from '../types.ts';
import { api } from '../services/api.ts';

export const FinancialDashboard: React.FC = () => {
  const { stats, transactions, settings, refreshData } = useHotel();

  const [filterType, setFilterType] = useState<'Todos' | 'Receita' | 'Despesa'>('Todos');
  const [showNewTxModal, setShowNewTxModal] = useState(false);

  // New Transaction Form
  const [txType, setTxType] = useState<'Receita' | 'Despesa'>('Despesa');
  const [txCategory, setTxCategory] = useState<FinancialTransaction['category']>('Operacional');
  const [txDescription, setTxDescription] = useState('');
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txPaymentMethod, setTxPaymentMethod] = useState<FinancialTransaction['paymentMethod']>('PIX');
  const [submitting, setSubmitting] = useState(false);

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'Todos') return true;
    return t.type === filterType;
  });

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDescription.trim() || txAmount <= 0) return;

    try {
      setSubmitting(true);
      await api.createTransaction({
        type: txType,
        category: txCategory,
        description: txDescription,
        amount: Number(txAmount),
        paymentMethod: txPaymentMethod,
        status: 'Pago',
        date: new Date().toISOString().split('T')[0]
      });

      setTxDescription('');
      setTxAmount(0);
      setShowNewTxModal(false);
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar transação');
    } finally {
      setSubmitting(false);
    }
  };

  const currency = settings?.currency || 'R$';

  // Calculate maximum for 7 days chart scaling
  const maxDayAmount = stats?.dailyRevenueLast7Days
    ? Math.max(...stats.dailyRevenueLast7Days.map(d => d.amount), 1000)
    : 1000;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#2C3327] tracking-tight">
            Controle Financeiro Integrado & Faturamento
          </h2>
          <p className="text-xs sm:text-sm text-[#6B705C] mt-1">
            Gestão em tempo real de receitas de diárias, frigobar, gastronomia, faturas em aberto e despesas.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-[#E6E3D8] text-[#3D4035] rounded-xl text-xs font-semibold hover:bg-[#FDFBF7] transition"
          >
            <Printer className="w-4 h-4 text-[#6B705C]" />
            <span>Imprimir Relatório</span>
          </button>

          <button
            id="btn-new-transaction"
            onClick={() => setShowNewTxModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Transação Manual</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Faturamento Mês */}
        <div className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#588157]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B705C]">
              Faturamento do Mês
            </span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#2C3327] pt-1">
            {currency} {(stats?.totalRevenueMonth || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#588157] font-semibold block">
            Receitas liquidadas
          </span>
        </div>

        {/* Card 2: Faturamento Hoje */}
        <div className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#3A5A40]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B705C]">
              Receita de Hoje
            </span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#2C3327] pt-1">
            {currency} {(stats?.totalRevenueToday || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#3A5A40] font-semibold block">
            Entradas diárias
          </span>
        </div>

        {/* Card 3: Faturas Pendentes nos Quartos */}
        <div className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#BC6C25]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B705C]">
              A Receber (Folios Abertos)
            </span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#2C3327] pt-1">
            {currency} {(stats?.totalPendingFolios || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#BC6C25] font-semibold block">
            Consumos e diárias a quitar
          </span>
        </div>

        {/* Card 4: Despesas Operacionais */}
        <div className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#9C5A2B]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B705C]">
              Despesas Operacionais
            </span>
            <TrendingDown className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#2C3327] pt-1">
            {currency} {(stats?.totalExpensesMonth || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#9C5A2B] font-semibold block">
            Insumos & manutenção
          </span>
        </div>

        {/* Card 5: Lucro Líquido */}
        <div className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#2C3327]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B705C]">
              Lucro Líquido
            </span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-[#2C3327] pt-1">
            {currency} {(stats?.netIncomeMonth || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#588157] font-semibold block">
            Resultado operacional
          </span>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7 Days Revenue Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E6E3D8] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E3D8]">
            <div>
              <h3 className="text-sm font-bold text-[#2C3327]">
                Faturamento dos Últimos 7 Dias
              </h3>
              <p className="text-xs text-[#6B705C]">
                Desempenho de receitas líquidas diárias recebidas
              </p>
            </div>
            <span className="text-xs font-bold text-[#2C3327] bg-[#F2F5E8] border border-[#CCD5AE] px-2.5 py-1 rounded-lg">
              Tendência Estável
            </span>
          </div>

          <div className="h-52 flex items-end justify-between gap-3 pt-4">
            {stats?.dailyRevenueLast7Days?.map((day, idx) => {
              const heightPct = Math.max(8, Math.round((day.amount / maxDayAmount) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-bold text-[#2C3327] opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    {currency} {day.amount.toLocaleString('pt-BR')}
                  </span>
                  <div className="w-full bg-[#F4F1EA] rounded-t-xl h-36 flex items-end p-1">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-[#588157] group-hover:bg-[#3A5A40] rounded-t-lg transition-all duration-300"
                    ></div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#6B705C] capitalize">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category & Payment Method Distribution */}
        <div className="bg-white rounded-2xl border border-[#E6E3D8] p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-[#2C3327]">
              Origem do Faturamento
            </h3>
            <p className="text-xs text-[#6B705C]">
              Participação de cada centro de receita
            </p>
          </div>

          <div className="space-y-2.5">
            {stats?.byCategory?.map(cat => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[#3D4035]">{cat.category}</span>
                  <span className="text-[#2C3327] font-bold">
                    {currency} {cat.amount.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="w-full bg-[#F4F1EA] h-2 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${stats.totalRevenueMonth > 0 ? (cat.amount / stats.totalRevenueMonth) * 100 : 0}%`
                    }}
                    className="bg-[#588157] h-full rounded-full"
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#E6E3D8] space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B705C]">
              Formas de Pagamento
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {stats?.byPaymentMethod?.map(pm => (
                <div key={pm.method} className="p-2 bg-[#FDFBF7] rounded-xl border border-[#E6E3D8]">
                  <span className="text-[#6B705C] block text-[10px]">{pm.method}</span>
                  <span className="font-bold text-[#2C3327]">{pm.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-[#E6E3D8] overflow-hidden shadow-xs space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6E3D8]">
          <div>
            <h3 className="text-sm font-bold text-[#2C3327]">
              Livro Caixa & Lançamentos Financeiros
            </h3>
            <p className="text-xs text-[#6B705C]">
              Histórico unificado de todas as receitas e despesas registradas
            </p>
          </div>

          <div className="flex items-center space-x-1.5 bg-[#F4F1EA] p-1 rounded-xl text-xs font-semibold">
            {(['Todos', 'Receita', 'Despesa'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-lg transition ${
                  filterType === t
                    ? 'bg-white text-[#2C3327] shadow-2xs font-bold border border-[#E6E3D8]'
                    : 'text-[#6B705C] hover:text-[#2C3327]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FDFBF7] border-b border-[#E6E3D8] text-[#6B705C] font-semibold">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Descrição</th>
                <th className="p-3">Quarto / Hóspede</th>
                <th className="p-3">Forma</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E3D8] text-[#3D4035]">
              {filteredTransactions.map(tx => {
                const isRevenue = tx.type === 'Receita';
                return (
                  <tr key={tx.id} className="hover:bg-[#FDFBF7]">
                    <td className="p-3 text-[#6B705C] whitespace-nowrap">
                      {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        isRevenue ? 'bg-[#F2F5E8] text-[#2C3327] border border-[#CCD5AE]' : 'bg-[#FAEDCD] text-[#BC6C25] border border-[#D4A373]/30'
                      }`}>
                        {isRevenue ? <ArrowUpRight className="w-3 h-3 text-[#588157]" /> : <ArrowDownRight className="w-3 h-3 text-[#BC6C25]" />}
                        <span>{tx.type}</span>
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-[#2C3327]">{tx.category}</td>
                    <td className="p-3 font-medium text-[#2C3327] max-w-xs truncate">
                      {tx.description}
                    </td>
                    <td className="p-3 text-[#6B705C] whitespace-nowrap">
                      {tx.roomNumber ? `Qto ${tx.roomNumber}` : '—'} {tx.guestName ? `(${tx.guestName})` : ''}
                    </td>
                    <td className="p-3 text-[#6B705C]">{tx.paymentMethod}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.status === 'Pago' ? 'bg-[#F2F5E8] text-[#3A5A40] border border-[#CCD5AE]' : 'bg-[#FAEDCD] text-[#BC6C25] border border-[#D4A373]/30'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-extrabold whitespace-nowrap ${
                      isRevenue ? 'text-[#588157]' : 'text-[#BC6C25]'
                    }`}>
                      {isRevenue ? '+' : '-'} {currency} {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Manual Transaction */}
      {showNewTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E6E3D8]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E3D8]">
              <h3 className="text-base font-bold text-[#2C3327]">
                Lançar Transação Manual
              </h3>
              <button
                onClick={() => setShowNewTxModal(false)}
                className="text-[#8E9280] hover:text-[#2C3327] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Tipo de Movimento
                  </label>
                  <select
                    id="select-tx-type"
                    value={txType}
                    onChange={e => setTxType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  >
                    <option value="Despesa">Despesa (-)</option>
                    <option value="Receita">Receita (+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Categoria
                  </label>
                  <select
                    id="select-tx-category"
                    value={txCategory}
                    onChange={e => setTxCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  >
                    <option value="Operacional">Operacional</option>
                    <option value="Manutencao">Manutenção</option>
                    <option value="Cozinha">Alimentos Cozinha</option>
                    <option value="Frigobar">Reposição Frigobar</option>
                    <option value="Diarias">Diárias Extras</option>
                    <option value="Taxas">Taxas Administrativas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Descrição da Movimentação *
                </label>
                <input
                  id="input-tx-desc"
                  type="text"
                  required
                  placeholder="Ex: Compra de insumos no hortifruti para café da manhã"
                  value={txDescription}
                  onChange={e => setTxDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Valor ({currency}) *
                  </label>
                  <input
                    id="input-tx-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={txAmount}
                    onChange={e => setTxAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    id="select-tx-payment"
                    value={txPaymentMethod}
                    onChange={e => setTxPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartao_Credito">Cartão de Crédito</option>
                    <option value="Cartao_Debito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#E6E3D8]">
                <button
                  type="button"
                  onClick={() => setShowNewTxModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B705C] hover:text-[#2C3327]"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-tx"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow transition"
                >
                  {submitting ? 'Registrando...' : 'Registrar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
