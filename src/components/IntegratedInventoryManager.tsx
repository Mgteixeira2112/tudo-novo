import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  PackagePlus,
  ArrowRightLeft,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  History,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  RefreshCw,
  FileText,
  DollarSign,
  Layers,
  ShoppingCart,
  ShieldAlert,
  Barcode,
  ClipboardList,
  Warehouse,
  Check,
  X
} from 'lucide-react';
import {
  InventoryItem,
  StockMovement,
  InventoryStats,
  InventorySector,
  StockMovementType
} from '../types.ts';
import { api } from '../services/api.ts';
import { useHotel } from '../context/HotelContext.tsx';

const SECTORS: { id: InventorySector | 'ALL'; label: string; icon: any }[] = [
  { id: 'ALL', label: 'Todos os Setores', icon: Boxes },
  { id: 'Almoxarifado', label: 'Almoxarifado Central', icon: Warehouse },
  { id: 'Frigobar', label: 'Subestoque Frigobar', icon: Layers },
  { id: 'Alimentos_Bebidas', label: 'Alimentos & Bebidas', icon: ShoppingCart },
  { id: 'Governanca_Enxoval', label: 'Governança & Enxoval', icon: ClipboardList },
  { id: 'Manutencao', label: 'Manutenção & Peças', icon: ShieldAlert }
];

export const IntegratedInventoryManager: React.FC = () => {
  const { refreshData, currentUser } = useHotel();

  // Primary view tabs
  const [activeView, setActiveView] = useState<'items' | 'kardex' | 'replenishment'>('items');
  const [selectedSector, setSelectedSector] = useState<InventorySector | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Data states
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemFormData, setItemFormData] = useState<{
    sku: string;
    name: string;
    sector: InventorySector;
    category: string;
    currentStock: number;
    minStock: number;
    maxStock: number;
    unit: string;
    costPrice: number;
    sellingPrice: number;
    supplier: string;
    locationBarcode: string;
  }>({
    sku: '',
    name: '',
    sector: 'Almoxarifado',
    category: 'Consumíveis Gerais',
    currentStock: 10,
    minStock: 5,
    maxStock: 50,
    unit: 'un',
    costPrice: 10,
    sellingPrice: 0,
    supplier: '',
    locationBarcode: ''
  });
  const [itemSubmitting, setItemSubmitting] = useState(false);

  // Movement Modal (Entrada, Transferência, Baixa/Perda, Ajuste)
  const [movementModalType, setMovementModalType] = useState<StockMovementType | null>(null);
  const [selectedMovementItem, setSelectedMovementItem] = useState<InventoryItem | null>(null);
  const [movementForm, setMovementForm] = useState<{
    quantity: number;
    unitCost?: number;
    originLocation: string;
    destinationLocation: string;
    documentNumber: string;
    operator: string;
    notes: string;
  }>({
    quantity: 1,
    unitCost: 0,
    originLocation: '',
    destinationLocation: '',
    documentNumber: '',
    operator: 'Almoxarife / Suprimentos',
    notes: ''
  });
  const [movementSubmitting, setMovementSubmitting] = useState(false);

  // Notification Banner
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Kardex Filters
  const [kardexTypeFilter, setKardexTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    if (!currentUser) return;
    loadInventoryData();
  }, [selectedSector, onlyLowStock, currentUser?.id]);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      const [itemsResult, movementsResult, statsResult] = await Promise.allSettled([
        api.getInventoryItems(selectedSector, onlyLowStock),
        api.getStockMovements({ sector: selectedSector !== 'ALL' ? selectedSector : undefined }),
        api.getInventoryStats()
      ]);

      let failed = 0;
      if (itemsResult.status === 'fulfilled') setItems(itemsResult.value); else failed++;
      if (movementsResult.status === 'fulfilled') setMovements(movementsResult.value); else failed++;
      if (statsResult.status === 'fulfilled') setStats(statsResult.value); else failed++;

      if (itemsResult.status === 'rejected') {
        throw itemsResult.reason;
      }
      if (failed > 0) {
        showToast('Inventário carregado; alguns indicadores auxiliares serão atualizados novamente.', 'error');
      }
    } catch (err: any) {
      console.error('Failed to load inventory data:', err);
      showToast('Erro ao carregar dados de inventário.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInventoryData();
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchSearch;
    });
  }, [items, searchQuery]);

  // Filtered Kardex Movements
  const filteredMovements = useMemo(() => {
    return movements.filter(mov => {
      const matchType = kardexTypeFilter === 'ALL' || mov.type === kardexTypeFilter;
      const matchSearch =
        mov.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mov.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (mov.documentNumber && mov.documentNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (mov.relatedRoomNumber && mov.relatedRoomNumber.includes(searchQuery));
      return matchType && matchSearch;
    });
  }, [movements, kardexTypeFilter, searchQuery]);

  // Critical / Replenishment List
  const replenishmentItems = useMemo(() => {
    return items.filter(i => i.currentStock <= i.minStock);
  }, [items]);

  // -------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------
  const openNewItemModal = () => {
    setEditingItem(null);
    setItemFormData({
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      sector: selectedSector !== 'ALL' ? selectedSector : 'Almoxarifado',
      category: 'Consumíveis Gerais',
      currentStock: 10,
      minStock: 5,
      maxStock: 50,
      unit: 'un',
      costPrice: 10,
      sellingPrice: 0,
      supplier: '',
      locationBarcode: ''
    });
    setShowItemModal(true);
  };

  const openEditItemModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemFormData({
      sku: item.sku,
      name: item.name,
      sector: item.sector,
      category: item.category,
      currentStock: item.currentStock,
      minStock: item.minStock,
      maxStock: item.maxStock || item.minStock * 4,
      unit: item.unit,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice || 0,
      supplier: item.supplier || '',
      locationBarcode: item.locationBarcode || ''
    });
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.name || !itemFormData.sku) {
      showToast('Preencha o nome e o código SKU.', 'error');
      return;
    }

    try {
      setItemSubmitting(true);
      if (editingItem) {
        await api.updateInventoryItem(editingItem.id, itemFormData);
        showToast(`Item "${itemFormData.name}" atualizado com sucesso.`);
      } else {
        await api.createInventoryItem(itemFormData);
        showToast(`Item "${itemFormData.name}" cadastrado e saldo inicial registrado.`);
      }
      setShowItemModal(false);
      await loadInventoryData();
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar item.', 'error');
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja remover "${name}" do inventário?`)) return;
    try {
      await api.deleteInventoryItem(id);
      showToast(`Item "${name}" removido.`);
      await loadInventoryData();
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir item.', 'error');
    }
  };

  // Open Movement Modal
  const openMovementModal = (type: StockMovementType, item?: InventoryItem) => {
    setMovementModalType(type);
    setSelectedMovementItem(item || (items.length > 0 ? items[0] : null));

    let defOrigin = '';
    let defDest = '';

    if (type === 'Entrada_Compra') {
      defOrigin = 'Fornecedor Externo';
      defDest = item ? item.sector : 'Almoxarifado Central';
    } else if (type === 'Transferencia') {
      defOrigin = item ? item.sector : 'Almoxarifado Central';
      defDest = 'Subestoque Frigobar / Governança';
    } else if (type === 'Saida_Uso_Interno' || type === 'Perda_Avaria') {
      defOrigin = item ? item.sector : 'Setor Operacional';
      defDest = type === 'Perda_Avaria' ? 'Descarte / Perda' : 'Consumo Interno / Higienização';
    } else if (type === 'Ajuste_Inventario') {
      defOrigin = 'Balanço Físico';
      defDest = item ? item.sector : 'Inventário Real';
    }

    setMovementForm({
      quantity: 1,
      unitCost: item ? item.costPrice : 0,
      originLocation: defOrigin,
      destinationLocation: defDest,
      documentNumber: type === 'Entrada_Compra' ? 'NF-e ' : '',
      operator: 'Almoxarifado Central',
      notes: ''
    });
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovementItem || !movementModalType) return;
    if (movementForm.quantity <= 0 && movementModalType !== 'Ajuste_Inventario') {
      showToast('A quantidade deve ser maior que zero.', 'error');
      return;
    }

    try {
      setMovementSubmitting(true);
      await api.registerStockMovement({
        itemId: selectedMovementItem.id,
        type: movementModalType,
        quantity: movementForm.quantity,
        unitCost: movementForm.unitCost,
        originLocation: movementForm.originLocation,
        destinationLocation: movementForm.destinationLocation,
        documentNumber: movementForm.documentNumber,
        operator: movementForm.operator,
        notes: movementForm.notes
      });

      const labelMap: Record<StockMovementType, string> = {
        Entrada_Compra: 'Entrada por compra',
        Saida_Consumo_Quarto: 'Saída por consumo de quarto',
        Saida_Venda_A_B: 'Saída por venda A&B',
        Saida_Uso_Interno: 'Saída para uso interno',
        Transferencia: 'Transferência interna',
        Perda_Avaria: 'Registro de perda/avaria',
        Ajuste_Inventario: 'Ajuste de inventário'
      };

      showToast(`${labelMap[movementModalType]} registrada com sucesso no Kardex.`);
      setMovementModalType(null);
      await loadInventoryData();
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar movimentação.', 'error');
    } finally {
      setMovementSubmitting(false);
    }
  };

  // Trigger Purchase / Replenishment Tasks
  const handleTriggerReplenishment = async () => {
    if (replenishmentItems.length === 0) {
      showToast('Nenhum item abaixo do estoque mínimo no momento.');
      return;
    }

    try {
      const res = await api.triggerReplenishmentOrder();
      showToast(
        `Disparadas ${res.tasksCreated} ordens de compra automáticas para a equipe de Suprimentos (Total estimado: R$ ${res.estimatedCost.toFixed(
          2
        )}).`
      );
      await loadInventoryData();
      await refreshData();
    } catch (err: any) {
      showToast('Erro ao disparar ordens de compra.', 'error');
    }
  };

  return (
    <div id="integrated-inventory-manager" className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          id="inventory-toast-notification"
          className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all transform animate-bounce-short ${
            toastMsg.type === 'success'
              ? 'bg-[#2C3327] text-[#F4F1EA] border-[#588157]'
              : 'bg-[#9E2A2B] text-white border-red-400'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-[#A3B18A]" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header Banner & Real-Time Pulse */}
      <div className="bg-white border border-[#E6E3D8] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[#588157]/10 flex items-center justify-center text-[#588157] shrink-0">
            <Boxes className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-serif font-bold text-[#2C3327]">Controle de Estoque Integrado & Kardex</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#588157]/10 text-[#588157]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#588157] animate-ping mr-1.5" />
                Tempo Real
              </span>
            </div>
            <p className="text-sm text-[#6B705C] mt-1">
              Almoxarifado central, subestoques de frigobar, cozinha, governança e enxoval sincronizados com baixa automática.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          <button
            id="btn-inventory-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-2 border border-[#E6E3D8] hover:bg-[#F4F1EA] text-[#2C3327] rounded-xl text-sm font-medium transition"
            title="Sincronizar saldos"
          >
            <RefreshCw className={`w-4 h-4 text-[#6B705C] ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>

          <button
            id="btn-quick-entry"
            onClick={() => openMovementModal('Entrada_Compra')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#F4F1EA] hover:bg-[#EAE6DC] text-[#2C3327] border border-[#E6E3D8] rounded-xl text-sm font-semibold transition"
          >
            <TrendingUp className="w-4 h-4 text-[#588157]" />
            <span>Entrada / Compra (NF)</span>
          </button>

          <button
            id="btn-quick-transfer"
            onClick={() => openMovementModal('Transferencia')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#F4F1EA] hover:bg-[#EAE6DC] text-[#2C3327] border border-[#E6E3D8] rounded-xl text-sm font-semibold transition"
          >
            <ArrowRightLeft className="w-4 h-4 text-[#3A5A40]" />
            <span>Transferência</span>
          </button>

          <button
            id="btn-new-item"
            onClick={openNewItemModal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#2C3327] hover:bg-[#3A5A40] text-[#F4F1EA] rounded-xl text-sm font-semibold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Item</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Valuation */}
        <div className="bg-white border border-[#E6E3D8] rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#6B705C]">Valoração Total em Estoque</p>
            <p className="text-2xl font-bold font-serif text-[#2C3327] mt-1">
              R$ {stats ? stats.totalValuation.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
            </p>
            <p className="text-xs text-[#588157] mt-1 flex items-center">
              <Boxes className="w-3.5 h-3.5 mr-1" />
              {stats?.totalItems || 0} itens catalogados
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#588157]/10 flex items-center justify-center text-[#588157]">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Critical Stock */}
        <div className="bg-white border border-[#E6E3D8] rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#6B705C]">Estoque Crítico / Ruptura</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <p className="text-2xl font-bold font-serif text-[#9E2A2B]">{stats?.criticalStockCount || 0}</p>
              <span className="text-xs text-[#9E2A2B] font-semibold">itens abaixo do mínimo</span>
            </div>
            <p className="text-xs text-[#6B705C] mt-1">Ponto de pedido atingido</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-[#9E2A2B]">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Replenishments Suggested */}
        <div className="bg-white border border-[#E6E3D8] rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#6B705C]">Reposição Sugerida</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <p className="text-2xl font-bold font-serif text-[#D4A373]">{stats?.replenishmentSuggestedCount || 0}</p>
              <span className="text-xs text-[#6B705C]">alertas de atenção</span>
            </div>
            <p className="text-xs text-[#588157] mt-1">Suprimentos preventivos</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-[#D4A373]">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        {/* Movements Today */}
        <div className="bg-white border border-[#E6E3D8] rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#6B705C]">Movimentações Hoje</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <p className="text-2xl font-bold font-serif text-[#2C3327]">{stats?.movementsToday || 0}</p>
              <span className="text-xs text-[#588157] font-semibold">baixas & entradas</span>
            </div>
            <p className="text-xs text-[#6B705C] mt-1">Registradas no Kardex</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#588157]/10 flex items-center justify-center text-[#588157]">
            <History className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Subestoques / Setores Navigation Bar */}
      <div className="bg-white border border-[#E6E3D8] rounded-2xl p-3 shadow-xs">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {SECTORS.map(sec => {
            const Icon = sec.icon;
            const isSelected = selectedSector === sec.id;
            return (
              <button
                key={sec.id}
                id={`sector-pill-${sec.id}`}
                onClick={() => setSelectedSector(sec.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-[#2C3327] text-[#F4F1EA] shadow-xs'
                    : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-[#A3B18A]' : 'text-[#6B705C]'}`} />
                <span>{sec.label}</span>
                {sec.id !== 'ALL' && stats && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-[#F4F1EA]' : 'bg-[#F4F1EA] text-[#2C3327]'
                    }`}
                  >
                    {stats.bySector.find(s => s.sector === sec.id)?.count || 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tabs (Catálogo, Kardex, Reposição) & Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 bg-white border border-[#E6E3D8] p-1.5 rounded-2xl">
          <button
            id="tab-view-items"
            onClick={() => setActiveView('items')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeView === 'items'
                ? 'bg-[#2C3327] text-[#F4F1EA] shadow-xs'
                : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA]'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Itens & Saldos ({filteredItems.length})</span>
          </button>

          <button
            id="tab-view-kardex"
            onClick={() => setActiveView('kardex')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeView === 'kardex'
                ? 'bg-[#2C3327] text-[#F4F1EA] shadow-xs'
                : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Extrato Kardex ({filteredMovements.length})</span>
          </button>

          <button
            id="tab-view-replenishment"
            onClick={() => setActiveView('replenishment')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeView === 'replenishment'
                ? 'bg-[#2C3327] text-[#F4F1EA] shadow-xs'
                : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA]'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-[#9E2A2B]" />
            <span>Ponto de Reposição</span>
            {replenishmentItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#9E2A2B] text-white">
                {replenishmentItems.length}
              </span>
            )}
          </button>
        </div>

        {/* Search & Quick Filter */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B705C]" />
            <input
              id="input-inventory-search"
              type="text"
              placeholder="Buscar por nome, SKU, fornecedor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-sm text-[#2C3327] focus:outline-none focus:ring-1 focus:ring-[#588157]"
            />
          </div>

          {activeView === 'items' && (
            <button
              id="btn-filter-low-stock"
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition ${
                onlyLowStock
                  ? 'bg-red-50 border-red-300 text-[#9E2A2B]'
                  : 'bg-white border-[#E6E3D8] text-[#6B705C] hover:bg-[#F4F1EA]'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Apenas Baixo Estoque</span>
            </button>
          )}

          {activeView === 'kardex' && (
            <select
              id="select-kardex-type-filter"
              value={kardexTypeFilter}
              onChange={e => setKardexTypeFilter(e.target.value)}
              className="bg-white border border-[#E6E3D8] rounded-xl text-sm text-[#2C3327] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#588157]"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="Entrada_Compra">Entradas por Compra</option>
              <option value="Saida_Consumo_Quarto">Saídas p/ Quarto</option>
              <option value="Saida_Venda_A_B">Vendas A&B / Room Service</option>
              <option value="Saida_Uso_Interno">Uso Interno</option>
              <option value="Transferencia">Transferências</option>
              <option value="Perda_Avaria">Perdas & Avarias</option>
              <option value="Ajuste_Inventario">Ajustes de Balanço</option>
            </select>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* 1. VIEW: Itens & Saldos em Tempo Real */}
      {/* --------------------------------------------------------- */}
      {activeView === 'items' && (
        <div className="bg-white border border-[#E6E3D8] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F1EA]/70 border-b border-[#E6E3D8] text-[11px] font-bold text-[#6B705C] uppercase tracking-wider">
                  <th className="py-3 px-4">Item & SKU</th>
                  <th className="py-3 px-4">Setor / Categoria</th>
                  <th className="py-3 px-4">Saldo Atual & Nível</th>
                  <th className="py-3 px-4">Estoque Mínimo</th>
                  <th className="py-3 px-4">Custo Unitário</th>
                  <th className="py-3 px-4">Valor Total</th>
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E3D8] text-sm">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#6B705C]">
                      Nenhum item encontrado no inventário com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const isCritical = item.currentStock <= item.minStock;
                    const isLow = item.currentStock < item.minStock * 1.5 && !isCritical;
                    const stockPercent = Math.min(100, Math.round((item.currentStock / (item.maxStock || item.minStock * 3)) * 100));

                    return (
                      <tr key={item.id} className="hover:bg-[#F4F1EA]/40 transition">
                        {/* Name & SKU */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                isCritical ? 'bg-red-500 animate-pulse' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              title={isCritical ? 'Estoque Crítico' : isLow ? 'Estoque Baixo' : 'Estoque Regular'}
                            />
                            <div>
                              <p className="font-semibold text-[#2C3327] leading-tight">{item.name}</p>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <span className="text-xs font-mono text-[#6B705C] bg-[#F4F1EA] px-1.5 py-0.2 rounded">
                                  {item.sku}
                                </span>
                                {item.linkedMinibarItemId && (
                                  <span className="text-[10px] font-bold text-[#588157] bg-[#588157]/10 px-1.5 py-0.2 rounded">
                                    Frigobar Sync
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Sector & Category */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block text-xs font-medium text-[#2C3327] bg-[#F4F1EA] px-2 py-0.5 rounded-lg border border-[#E6E3D8]">
                            {item.sector.replace('_', ' ')}
                          </span>
                          <p className="text-xs text-[#6B705C] mt-0.5">{item.category}</p>
                        </td>

                        {/* Stock & Progress Bar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-base font-bold font-serif ${
                                isCritical ? 'text-[#9E2A2B]' : isLow ? 'text-[#D4A373]' : 'text-[#2C3327]'
                              }`}
                            >
                              {item.currentStock} {item.unit}
                            </span>
                            {isCritical && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-[#9E2A2B]">
                                Repor!
                              </span>
                            )}
                          </div>
                          {/* Visual Progress Bar */}
                          <div className="w-28 bg-[#E6E3D8] h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isCritical ? 'bg-[#9E2A2B]' : isLow ? 'bg-[#D4A373]' : 'bg-[#588157]'
                              }`}
                              style={{ width: `${Math.max(5, stockPercent)}%` }}
                            />
                          </div>
                        </td>

                        {/* Min Stock */}
                        <td className="py-3.5 px-4 text-[#6B705C]">
                          <span className="font-medium text-[#2C3327]">{item.minStock}</span> {item.unit}
                        </td>

                        {/* Cost Price */}
                        <td className="py-3.5 px-4 text-[#2C3327]">
                          R$ {item.costPrice.toFixed(2)}
                        </td>

                        {/* Total Valuation */}
                        <td className="py-3.5 px-4 font-semibold text-[#2C3327]">
                          R$ {(item.currentStock * item.costPrice).toFixed(2)}
                        </td>

                        {/* Supplier */}
                        <td className="py-3.5 px-4 text-xs text-[#6B705C] max-w-[140px] truncate">
                          {item.supplier || '—'}
                        </td>

                        {/* Quick Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => openMovementModal('Entrada_Compra', item)}
                              className="p-1.5 hover:bg-[#F4F1EA] text-[#588157] rounded-lg transition"
                              title="Dar entrada / Comprar"
                            >
                              <TrendingUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openMovementModal('Transferencia', item)}
                              className="p-1.5 hover:bg-[#F4F1EA] text-[#3A5A40] rounded-lg transition"
                              title="Transferir subestoque"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openMovementModal('Perda_Avaria', item)}
                              className="p-1.5 hover:bg-[#F4F1EA] text-[#9E2A2B] rounded-lg transition"
                              title="Baixa por avaria ou perda"
                            >
                              <TrendingDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditItemModal(item)}
                              className="p-1.5 hover:bg-[#F4F1EA] text-[#6B705C] hover:text-[#2C3327] rounded-lg transition"
                              title="Editar características"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="p-1.5 hover:bg-red-50 text-[#6B705C] hover:text-[#9E2A2B] rounded-lg transition"
                              title="Remover do catálogo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* 2. VIEW: Extrato Kardex em Tempo Real */}
      {/* --------------------------------------------------------- */}
      {activeView === 'kardex' && (
        <div className="bg-white border border-[#E6E3D8] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#E6E3D8] bg-[#F4F1EA]/40 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-[#588157]" />
              <h3 className="font-serif font-bold text-[#2C3327]">Auditoria de Movimentações (Kardex Hoteleiro)</h3>
            </div>
            <span className="text-xs text-[#6B705C]">Rastreabilidade completa de baixas, entradas e transferências</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F1EA]/70 border-b border-[#E6E3D8] text-[11px] font-bold text-[#6B705C] uppercase tracking-wider">
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Item & Setor</th>
                  <th className="py-3 px-4">Qtd</th>
                  <th className="py-3 px-4">Saldo Ant. $\rightarrow$ Novo</th>
                  <th className="py-3 px-4">Valor Total</th>
                  <th className="py-3 px-4">Origem / Destino</th>
                  <th className="py-3 px-4">Operador & Doc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E3D8] text-sm">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#6B705C]">
                      Nenhuma movimentação registrada no Kardex para os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map(mov => {
                    const isPositive = mov.type === 'Entrada_Compra' || mov.newStock > mov.previousStock;
                    const typeColors: Record<StockMovementType, { bg: string; text: string; label: string }> = {
                      Entrada_Compra: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', label: 'Entrada Compra' },
                      Saida_Consumo_Quarto: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', label: 'Consumo Quarto' },
                      Saida_Venda_A_B: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', label: 'Venda A&B' },
                      Saida_Uso_Interno: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800', label: 'Uso Interno' },
                      Transferencia: { bg: 'bg-teal-50 border-teal-200', text: 'text-teal-800', label: 'Transferência' },
                      Perda_Avaria: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', label: 'Perda / Avaria' },
                      Ajuste_Inventario: { bg: 'bg-stone-100 border-stone-300', text: 'text-stone-800', label: 'Ajuste Balanço' }
                    };

                    const style = typeColors[mov.type] || { bg: 'bg-stone-100', text: 'text-stone-800', label: mov.type };

                    return (
                      <tr key={mov.id} className="hover:bg-[#F4F1EA]/30 transition">
                        {/* Timestamp */}
                        <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-[#6B705C]">
                          {new Date(mov.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{' '}
                          {new Date(mov.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        {/* Movement Type Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                        </td>

                        {/* Item Name & Sector */}
                        <td className="py-3 px-4">
                          <p className="font-medium text-[#2C3327] leading-tight">{mov.itemName}</p>
                          <span className="text-[11px] text-[#6B705C]">{mov.sector.replace('_', ' ')}</span>
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-4 whitespace-nowrap font-bold">
                          <span className={isPositive ? 'text-[#588157]' : 'text-[#9E2A2B]'}>
                            {isPositive ? '+' : '-'} {mov.quantity}
                          </span>
                        </td>

                        {/* Stock Balance Transition */}
                        <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-[#6B705C]">
                          <span className="text-[#2C3327] font-semibold">{mov.previousStock}</span> $\rightarrow${' '}
                          <span className="text-[#2C3327] font-bold">{mov.newStock}</span>
                        </td>

                        {/* Cost */}
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-[#2C3327]">
                          R$ {mov.totalCost.toFixed(2)}
                        </td>

                        {/* Origin & Destination */}
                        <td className="py-3 px-4 text-xs text-[#6B705C]">
                          <p className="text-[#2C3327] truncate max-w-[160px]">{mov.destinationLocation || mov.originLocation}</p>
                          {mov.relatedRoomNumber && (
                            <span className="text-[10px] font-bold text-[#588157] bg-[#588157]/10 px-1 rounded">
                              Quarto {mov.relatedRoomNumber}
                            </span>
                          )}
                        </td>

                        {/* Operator & Doc */}
                        <td className="py-3 px-4 text-xs text-[#6B705C]">
                          <p className="text-[#2C3327] font-medium">{mov.operator}</p>
                          {mov.documentNumber && <span className="font-mono text-[10px] text-[#6B705C]">{mov.documentNumber}</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* 3. VIEW: Ponto de Reposição & Compras Inteligentes */}
      {/* --------------------------------------------------------- */}
      {activeView === 'replenishment' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-[#2C3327]">
                  Ponto de Pedido Automático ({replenishmentItems.length} itens necessitando compra)
                </h3>
                <p className="text-xs text-[#6B705C] mt-1">
                  O sistema calcula o estoque de segurança contra o histórico de ocupação e sugere o volume ideal para reabastecimento.
                </p>
              </div>
            </div>

            <button
              id="btn-trigger-replenish-orders"
              onClick={handleTriggerReplenishment}
              className="flex items-center space-x-2 px-4 py-2.5 bg-[#2C3327] hover:bg-[#3A5A40] text-[#F4F1EA] rounded-xl text-sm font-semibold transition shadow-xs whitespace-nowrap"
            >
              <ShoppingCart className="w-4 h-4 text-[#A3B18A]" />
              <span>Gerar Ordens de Compra p/ Suprimentos</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {replenishmentItems.length === 0 ? (
              <div className="col-span-3 bg-white border border-[#E6E3D8] rounded-2xl p-12 text-center text-[#6B705C]">
                <CheckCircle2 className="w-12 h-12 text-[#588157] mx-auto mb-3" />
                <p className="text-base font-bold text-[#2C3327]">Todos os estoques estão abastecidos!</p>
                <p className="text-xs text-[#6B705C] mt-1">Nenhum item atingiu o estoque mínimo de segurança no momento.</p>
              </div>
            ) : (
              replenishmentItems.map(item => {
                const suggestedQty = Math.max(1, item.minStock * 2 - item.currentStock);
                const estimatedCost = suggestedQty * item.costPrice;

                return (
                  <div key={item.id} className="bg-white border border-red-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full uppercase">
                            {item.sector.replace('_', ' ')}
                          </span>
                          <h4 className="font-serif font-bold text-[#2C3327] text-base mt-2">{item.name}</h4>
                          <p className="text-xs font-mono text-[#6B705C] mt-0.5">{item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[#6B705C]">Saldo Atual</p>
                          <p className="text-lg font-serif font-bold text-red-700">
                            {item.currentStock} {item.unit}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-[#F4F1EA] rounded-xl text-xs space-y-1.5 border border-[#E6E3D8]">
                        <div className="flex justify-between">
                          <span className="text-[#6B705C]">Estoque Mínimo Seguro:</span>
                          <span className="font-semibold text-[#2C3327]">
                            {item.minStock} {item.unit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#6B705C]">Compra Sugerida:</span>
                          <span className="font-bold text-[#588157]">
                            +{suggestedQty} {item.unit}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-[#E6E3D8] pt-1">
                          <span className="text-[#6B705C]">Custo Estimado:</span>
                          <span className="font-bold text-[#2C3327]">R$ {estimatedCost.toFixed(2)}</span>
                        </div>
                        {item.supplier && (
                          <div className="flex justify-between pt-1">
                            <span className="text-[#6B705C]">Fornecedor:</span>
                            <span className="text-[#2C3327] font-medium truncate max-w-[140px]">{item.supplier}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center space-x-2">
                      <button
                        onClick={() => openMovementModal('Entrada_Compra', item)}
                        className="flex-1 flex items-center justify-center space-x-1 py-2 bg-[#2C3327] hover:bg-[#3A5A40] text-[#F4F1EA] text-xs font-semibold rounded-xl transition"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-[#A3B18A]" />
                        <span>Lançar Entrada (NF)</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* MODAL: Cadastrar / Editar Item de Inventário */}
      {/* --------------------------------------------------------- */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-[#E6E3D8] rounded-2xl w-full max-w-xl shadow-2xl p-6 animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-[#E6E3D8] pb-4">
              <div className="flex items-center space-x-2">
                <Boxes className="w-5 h-5 text-[#588157]" />
                <h3 className="font-serif font-bold text-lg text-[#2C3327]">
                  {editingItem ? 'Editar Item de Estoque' : 'Novo Item no Almoxarifado / Estoque'}
                </h3>
              </div>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-[#6B705C] hover:text-[#2C3327] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Nome do Item / Produto *</label>
                  <input
                    type="text"
                    required
                    value={itemFormData.name}
                    onChange={e => setItemFormData({ ...itemFormData, name: e.target.value })}
                    placeholder="Ex: Água Mineral 500ml, Toalha Banho 550g..."
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Código SKU / Referência *</label>
                  <input
                    type="text"
                    required
                    value={itemFormData.sku}
                    onChange={e => setItemFormData({ ...itemFormData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] font-mono text-xs focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Setor / Subestoque *</label>
                  <select
                    value={itemFormData.sector}
                    onChange={e => setItemFormData({ ...itemFormData, sector: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:ring-1 focus:ring-[#588157] outline-none"
                  >
                    <option value="Almoxarifado">Almoxarifado Central</option>
                    <option value="Frigobar">Subestoque Frigobar</option>
                    <option value="Alimentos_Bebidas">Alimentos & Bebidas (Cozinha)</option>
                    <option value="Governanca_Enxoval">Governança & Enxoval</option>
                    <option value="Manutencao">Manutenção & Reparos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Categoria</label>
                  <input
                    type="text"
                    value={itemFormData.category}
                    onChange={e => setItemFormData({ ...itemFormData, category: e.target.value })}
                    placeholder="Ex: Bebidas, Amenities, Enxoval..."
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Saldo Atual</label>
                  <input
                    type="number"
                    min="0"
                    value={itemFormData.currentStock}
                    onChange={e => setItemFormData({ ...itemFormData, currentStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] font-semibold focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={itemFormData.minStock}
                    onChange={e => setItemFormData({ ...itemFormData, minStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Unidade</label>
                  <select
                    value={itemFormData.unit}
                    onChange={e => setItemFormData({ ...itemFormData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:ring-1 focus:ring-[#588157] outline-none"
                  >
                    <option value="un">un (Unidade)</option>
                    <option value="kg">kg (Quilograma)</option>
                    <option value="lt">lt (Litro)</option>
                    <option value="pct">pct (Pacote)</option>
                    <option value="cx">cx (Caixa)</option>
                    <option value="fardo">fardo (Fardo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Preço de Custo (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemFormData.costPrice}
                    onChange={e => setItemFormData({ ...itemFormData, costPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] font-semibold focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Preço de Venda (opcional p/ Frigobar)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemFormData.sellingPrice}
                    onChange={e => setItemFormData({ ...itemFormData, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Fornecedor Principal</label>
                  <input
                    type="text"
                    value={itemFormData.supplier}
                    onChange={e => setItemFormData({ ...itemFormData, supplier: e.target.value })}
                    placeholder="Ex: Ambev, Distribuidora Cristal..."
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Código de Barras / EAN</label>
                  <input
                    type="text"
                    value={itemFormData.locationBarcode}
                    onChange={e => setItemFormData({ ...itemFormData, locationBarcode: e.target.value })}
                    placeholder="789..."
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] font-mono text-xs focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E6E3D8]">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 border border-[#E6E3D8] hover:bg-[#F4F1EA] text-[#6B705C] rounded-xl transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={itemSubmitting}
                  className="px-5 py-2 bg-[#2C3327] hover:bg-[#3A5A40] text-[#F4F1EA] rounded-xl transition font-semibold shadow-xs flex items-center space-x-2"
                >
                  {itemSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingItem ? 'Salvar Alterações' : 'Cadastrar Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* MODAL: Movimentação de Estoque (Entrada, Transferência, Baixa) */}
      {/* --------------------------------------------------------- */}
      {movementModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-[#E6E3D8] rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-[#E6E3D8] pb-4">
              <div className="flex items-center space-x-2">
                {movementModalType === 'Entrada_Compra' && <TrendingUp className="w-5 h-5 text-[#588157]" />}
                {movementModalType === 'Transferencia' && <ArrowRightLeft className="w-5 h-5 text-[#3A5A40]" />}
                {movementModalType === 'Perda_Avaria' && <TrendingDown className="w-5 h-5 text-[#9E2A2B]" />}
                {movementModalType === 'Ajuste_Inventario' && <ClipboardList className="w-5 h-5 text-[#D4A373]" />}
                <h3 className="font-serif font-bold text-lg text-[#2C3327]">
                  {movementModalType === 'Entrada_Compra' && 'Registrar Entrada / Compra (NF)'}
                  {movementModalType === 'Transferencia' && 'Transferência entre Subestoques'}
                  {movementModalType === 'Perda_Avaria' && 'Baixa por Perda, Quebra ou Vencimento'}
                  {movementModalType === 'Ajuste_Inventario' && 'Ajuste de Balanço / Contagem Física'}
                </h3>
              </div>
              <button
                onClick={() => setMovementModalType(null)}
                className="text-[#6B705C] hover:text-[#2C3327] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-4 mt-4 text-sm">
              {/* Item Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#2C3327] mb-1">Item a Movimentar *</label>
                <select
                  value={selectedMovementItem?.id || ''}
                  onChange={e => {
                    const it = items.find(i => i.id === e.target.value);
                    if (it) {
                      setSelectedMovementItem(it);
                      setMovementForm(prev => ({
                        ...prev,
                        unitCost: it.costPrice,
                        quantity: movementModalType === 'Ajuste_Inventario' ? it.currentStock : prev.quantity
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] font-semibold focus:ring-1 focus:ring-[#588157] outline-none"
                >
                  {items.map(it => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.sku}) — Saldo Atual: {it.currentStock} {it.unit}
                    </option>
                  ))}
                </select>
                {selectedMovementItem && (
                  <p className="text-xs text-[#6B705C] mt-1">
                    Setor atual: <span className="font-semibold text-[#2C3327]">{selectedMovementItem.sector.replace('_', ' ')}</span> | Custo médio: R$ {selectedMovementItem.costPrice.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Quantity and Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">
                    {movementModalType === 'Ajuste_Inventario' ? 'Novo Saldo Real Contado *' : 'Quantidade *'}
                  </label>
                  <input
                    type="number"
                    min={movementModalType === 'Ajuste_Inventario' ? '0' : '1'}
                    required
                    value={movementForm.quantity}
                    onChange={e => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] font-bold text-base focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                  {selectedMovementItem && (
                    <span className="text-xs text-[#6B705C]">{selectedMovementItem.unit}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">
                    {movementModalType === 'Entrada_Compra' ? 'Novo Custo Unitário (R$)' : 'Custo Unitário Referência'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={movementForm.unitCost}
                    onChange={e => setMovementForm({ ...movementForm, unitCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                </div>
              </div>

              {/* Origin & Destination */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Local / Setor de Origem</label>
                  <input
                    type="text"
                    value={movementForm.originLocation}
                    onChange={e => setMovementForm({ ...movementForm, originLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Local / Setor de Destino</label>
                  <input
                    type="text"
                    value={movementForm.destinationLocation}
                    onChange={e => setMovementForm({ ...movementForm, destinationLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                </div>
              </div>

              {/* Document & Operator */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Documento / NF / Protocolo</label>
                  <input
                    type="text"
                    placeholder="Ex: NF-e 88412, O.S. 402..."
                    value={movementForm.documentNumber}
                    onChange={e => setMovementForm({ ...movementForm, documentNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] font-mono text-xs focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">Responsável / Operador</label>
                  <input
                    type="text"
                    value={movementForm.operator}
                    onChange={e => setMovementForm({ ...movementForm, operator: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:ring-1 focus:ring-[#588157] outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#2C3327] mb-1">Justificativa / Observações</label>
                <textarea
                  rows={2}
                  value={movementForm.notes}
                  onChange={e => setMovementForm({ ...movementForm, notes: e.target.value })}
                  placeholder="Ex: Lote semanal recebido com conferência física realizada..."
                  className="w-full px-3 py-2 bg-white border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:ring-1 focus:ring-[#588157] outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E6E3D8]">
                <button
                  type="button"
                  onClick={() => setMovementModalType(null)}
                  className="px-4 py-2 border border-[#E6E3D8] hover:bg-[#F4F1EA] text-[#6B705C] rounded-xl transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={movementSubmitting}
                  className="px-5 py-2 bg-[#2C3327] hover:bg-[#3A5A40] text-[#F4F1EA] rounded-xl transition font-semibold shadow-xs flex items-center space-x-2"
                >
                  {movementSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Confirmar Movimentação & Atualizar Kardex</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
