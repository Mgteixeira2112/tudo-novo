import React, { useState, useEffect } from 'react';
import {
  Wine,
  UtensilsCrossed,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Send,
  Package,
  DoorOpen,
  DollarSign,
  ChefHat,
  BellRing
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { MinibarItem, MenuItem, KitchenOrder, RoomMinibarConsumption } from '../types.ts';
import { api } from '../services/api.ts';

export const MinibarAndKitchen: React.FC = () => {
  const { rooms, settings, refreshData } = useHotel();

  const [activeTab, setActiveTab] = useState<'minibar' | 'kitchen'>('minibar');

  // Minibar State
  const [minibarItems, setMinibarItems] = useState<MinibarItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [consumptionQty, setConsumptionQty] = useState<number>(1);
  const [registeredBy, setRegisteredBy] = useState<string>('Governança / Room Service');
  const [roomConsumptions, setRoomConsumptions] = useState<RoomMinibarConsumption[]>([]);
  const [launchingConsumption, setLaunchingConsumption] = useState(false);

  // Kitchen State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<KitchenOrder[]>([]);
  const [orderRoomId, setOrderRoomId] = useState<string>('');
  const [orderDestination, setOrderDestination] = useState<'Quarto' | 'Restaurante' | 'Piscina'>('Quarto');
  const [orderSector, setOrderSector] = useState<'Cozinha' | 'Room Service'>('Room Service');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [selectedMenuItems, setSelectedMenuItems] = useState<{ menuItemId: string; quantity: number }[]>([]);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Occupied rooms
  const occupiedRooms = rooms.filter(r => r.status === 'Ocupado');

  // Load minibar & menu items
  useEffect(() => {
    api.getMinibarItems().then(setMinibarItems).catch(console.error);
    api.getMenuItems().then(setMenuItems).catch(console.error);
    api.getOrders().then(setActiveOrders).catch(console.error);
  }, []);

  // When selected room changes in minibar, fetch its history
  useEffect(() => {
    if (selectedRoomId) {
      api.getRoomConsumptions(selectedRoomId).then(setRoomConsumptions).catch(console.error);
    } else {
      setRoomConsumptions([]);
    }
  }, [selectedRoomId]);

  // Handle launch minibar consumption
  const handleLaunchConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !selectedItemId || consumptionQty <= 0) return;

    try {
      setLaunchingConsumption(true);
      await api.registerMinibarConsumption({
        roomId: selectedRoomId,
        itemId: selectedItemId,
        quantity: consumptionQty,
        registeredBy
      });

      // Refresh data & items
      const [updatedItems, updatedConsumptions] = await Promise.all([
        api.getMinibarItems(),
        api.getRoomConsumptions(selectedRoomId)
      ]);
      setMinibarItems(updatedItems);
      setRoomConsumptions(updatedConsumptions);
      setConsumptionQty(1);
      await refreshData();
      alert('Consumo lançado com sucesso na conta do quarto e tarefa de reposição gerada!');
    } catch (err: any) {
      alert(err.message || 'Erro ao lançar consumo');
    } finally {
      setLaunchingConsumption(false);
    }
  };

  // Kitchen menu item selection helper
  const handleToggleMenuItem = (menuItemId: string, delta: number) => {
    setSelectedMenuItems(prev => {
      const existing = prev.find(i => i.menuItemId === menuItemId);
      if (!existing) {
        if (delta > 0) return [...prev, { menuItemId, quantity: delta }];
        return prev;
      }
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        return prev.filter(i => i.menuItemId !== menuItemId);
      }
      return prev.map(i => (i.menuItemId === menuItemId ? { ...i, quantity: newQty } : i));
    });
  };

  // Handle submit kitchen order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderRoomId || selectedMenuItems.length === 0) {
      alert('Por favor, selecione o quarto e pelo menos um item do cardápio.');
      return;
    }

    try {
      setPlacingOrder(true);
      await api.createOrder({
        roomId: orderRoomId,
        items: selectedMenuItems,
        destination: orderDestination,
        deliverySector: orderSector,
        specialInstructions
      });

      setSelectedMenuItems([]);
      setSpecialInstructions('');
      const updatedOrders = await api.getOrders();
      setActiveOrders(updatedOrders);
      await refreshData();
      alert('Pedido enviado para a Cozinha e Room Service com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar pedido');
    } finally {
      setPlacingOrder(false);
    }
  };

  // Handle update order status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: KitchenOrder['status']) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      const updatedOrders = await api.getOrders();
      setActiveOrders(updatedOrders);
      await refreshData();
    } catch (err) {
      console.error('Error updating order:', err);
    }
  };

  const currency = settings?.currency || 'R$';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#2C3327] tracking-tight">
            Controle de Frigobar, Cozinha & Room Service
          </h2>
          <p className="text-xs sm:text-sm text-[#6B705C] mt-1">
            Lançamento instantâneo de bebidas e pratos diretamente no extrato do hóspede com controle de estoque.
          </p>
        </div>

        <div className="flex bg-[#F4F1EA] p-1 rounded-xl border border-[#E6E3D8] text-xs font-semibold">
          <button
            id="tab-minibar"
            onClick={() => setActiveTab('minibar')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition ${
              activeTab === 'minibar'
                ? 'bg-[#2C3327] text-[#FDFBF7] shadow-xs font-bold'
                : 'text-[#6B705C] hover:text-[#2C3327]'
            }`}
          >
            <Wine className="w-4 h-4 text-[#A3B18A]" />
            <span>Controle de Frigobar</span>
          </button>
          <button
            id="tab-kitchen"
            onClick={() => setActiveTab('kitchen')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition ${
              activeTab === 'kitchen'
                ? 'bg-[#2C3327] text-[#FDFBF7] shadow-xs font-bold'
                : 'text-[#6B705C] hover:text-[#2C3327]'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 text-[#D4A373]" />
            <span>Cozinha & Room Service</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: FRIGOBAR VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'minibar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form to Launch Minibar Item to Room */}
          <div className="bg-white rounded-2xl border border-[#E6E3D8] p-6 shadow-xs space-y-5">
            <div className="pb-3 border-b border-[#E6E3D8]">
              <h3 className="text-sm font-bold text-[#2C3327] flex items-center space-x-2">
                <Wine className="w-4 h-4 text-[#588157]" />
                <span>Lançar Consumo de Frigobar</span>
              </h3>
              <p className="text-xs text-[#6B705C] mt-0.5">
                Debita do estoque e adiciona automaticamente na conta do hóspede.
              </p>
            </div>

            <form onSubmit={handleLaunchConsumption} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Quarto Ocupado *
                </label>
                <select
                  id="select-minibar-room"
                  required
                  value={selectedRoomId}
                  onChange={e => setSelectedRoomId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                >
                  <option value="">Selecione o Quarto...</option>
                  {occupiedRooms.map(r => (
                    <option key={r.id} value={r.id}>
                      Quarto {r.number} - {r.currentGuestName || 'Hóspede'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Item do Frigobar *
                </label>
                <select
                  id="select-minibar-item"
                  required
                  value={selectedItemId}
                  onChange={e => setSelectedItemId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                >
                  <option value="">Selecione o Produto...</option>
                  {minibarItems.map(item => (
                    <option key={item.id} value={item.id} disabled={item.stockQty <= 0}>
                      {item.name} - {currency} {item.price.toFixed(2)} (Estoque: {item.stockQty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Quantidade
                  </label>
                  <input
                    id="input-minibar-qty"
                    type="number"
                    min="1"
                    max="20"
                    value={consumptionQty}
                    onChange={e => setConsumptionQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Registrado Por
                  </label>
                  <input
                    id="input-minibar-registrar"
                    type="text"
                    value={registeredBy}
                    onChange={e => setRegisteredBy(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  />
                </div>
              </div>

              <button
                id="btn-submit-minibar"
                type="submit"
                disabled={launchingConsumption || !selectedRoomId || !selectedItemId}
                className="w-full py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{launchingConsumption ? 'Lançando...' : 'Lançar na Conta do Quarto'}</span>
              </button>
            </form>

            {/* Inventory table snippet */}
            <div className="pt-3 border-t border-[#E6E3D8]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B705C] mb-2">
                Itens de Frigobar em Estoque
              </h4>
              <div className="space-y-1.5 text-xs">
                {minibarItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-[#F4F1EA] rounded-lg border border-[#E6E3D8]">
                    <span className="font-medium text-[#2C3327]">{item.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[#588157] font-bold">{currency} {item.price.toFixed(2)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.stockQty < 15 ? 'bg-[#FAEDCD] text-[#BC6C25] border border-[#D4A373]' : 'bg-[#E6E3D8] text-[#6B705C]'
                      }`}>
                        {item.stockQty} un
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Consumptions History for Selected Room */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B705C]">
              Histórico de Lançamentos de Frigobar {selectedRoomId ? `(Quarto Selecionado)` : '(Geral)'}
            </h3>

            {roomConsumptions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E6E3D8] p-12 text-center text-[#8E9280] text-sm">
                Selecione um quarto ocupado para visualizar seus consumos ou realize o primeiro lançamento.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E6E3D8] overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F1EA] border-b border-[#E6E3D8] text-[#6B705C] font-semibold">
                    <tr>
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Quarto</th>
                      <th className="p-3">Produto</th>
                      <th className="p-3">Qtd</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Lançado Por</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E3D8] text-[#3D4035]">
                    {roomConsumptions.map(c => (
                      <tr key={c.id} className="hover:bg-[#F4F1EA]/60">
                        <td className="p-3 text-[#6B705C] whitespace-nowrap">
                          {new Date(c.registeredAt).toLocaleDateString('pt-BR')} {new Date(c.registeredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 font-bold text-[#2C3327]">
                          Qto {c.roomNumber}
                        </td>
                        <td className="p-3 font-semibold">{c.itemName}</td>
                        <td className="p-3">{c.quantity}</td>
                        <td className="p-3 font-bold text-[#588157]">
                          {currency} {c.totalPrice.toFixed(2)}
                        </td>
                        <td className="p-3 text-[#6B705C]">{c.registeredBy}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            c.status === 'Faturado' ? 'bg-[#F4F1EA] text-[#6B705C] border-[#E6E3D8]' : 'bg-[#F2F5E8] text-[#2C3327] border-[#CCD5AE]'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: COZINHA & ROOM SERVICE VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'kitchen' && (
        <div className="space-y-6">
          {/* Active Orders Track Bar */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B705C] flex items-center space-x-2">
                <ChefHat className="w-4 h-4 text-[#D4A373]" />
                <span>Comandas & Pedidos Ativos da Cozinha ({activeOrders.length})</span>
              </h3>
              <span className="text-xs text-[#8E9280]">Sincronização em tempo real</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOrders.map(order => {
                const getStatusColor = () => {
                  switch (order.status) {
                    case 'Recebido':
                      return 'bg-[#E9EDC9] text-[#2C3327] border-[#CCD5AE]';
                    case 'Em Preparo':
                      return 'bg-[#FAEDCD] text-[#BC6C25] border-[#D4A373] animate-pulse';
                    case 'Pronto':
                      return 'bg-[#D4A373]/20 text-[#BC6C25] border-[#D4A373]';
                    case 'Entregue':
                      return 'bg-[#F2F5E8] text-[#588157] border-[#CCD5AE]';
                    default:
                      return 'bg-[#F4F1EA] text-[#6B705C] border-[#E6E3D8]';
                  }
                };

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-[#E6E3D8] p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#CCD5AE] transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-[#BC6C25] bg-[#FAEDCD] px-2 py-0.5 rounded border border-[#D4A373]">
                          {order.orderNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor()}`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold text-[#2C3327]">
                        <span>Quarto {order.roomNumber} &bull; {order.guestName}</span>
                        <span className="text-[#588157]">
                          {currency} {(order.totalAmount + (order.deliveryFee || 0)).toFixed(2)}
                        </span>
                      </div>

                      <div className="bg-[#F4F1EA] rounded-xl p-2.5 text-xs text-[#3D4035] space-y-1 border border-[#E6E3D8]">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{it.quantity}x {it.name}</span>
                            <span className="text-[#6B705C]">{currency} {(it.quantity * it.unitPrice).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {order.specialInstructions && (
                        <p className="text-[11px] text-[#6B705C] italic">
                          Obs: {order.specialInstructions}
                        </p>
                      )}
                    </div>

                    {/* Status Advance Buttons */}
                    <div className="pt-2 border-t border-[#E6E3D8] flex items-center justify-between gap-1 text-[11px]">
                      {order.status === 'Recebido' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'Em Preparo')}
                          className="w-full py-1.5 bg-[#D4A373] hover:bg-[#BC6C25] text-white font-bold rounded-lg transition"
                        >
                          Iniciar Preparo
                        </button>
                      )}
                      {order.status === 'Em Preparo' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'Pronto')}
                          className="w-full py-1.5 bg-[#A3B18A] hover:bg-[#588157] text-[#FDFBF7] font-bold rounded-lg transition"
                        >
                          Pronto para Entrega
                        </button>
                      )}
                      {order.status === 'Pronto' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'Entregue')}
                          className="w-full py-1.5 bg-[#588157] hover:bg-[#3A5A40] text-[#FDFBF7] font-bold rounded-lg transition"
                        >
                          Marcar como Entregue
                        </button>
                      )}
                      {order.status === 'Entregue' && (
                        <span className="text-[#588157] font-semibold flex items-center justify-center w-full py-1">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#588157]" /> Entregue com Sucesso
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* New Order Form & Menu */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-[#E6E3D8]">
            {/* Menu Catalog */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B705C]">
                Cardápio do Hotel & Room Service
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {menuItems.map(item => {
                  const selected = selectedMenuItems.find(i => i.menuItemId === item.id);
                  const qty = selected?.quantity || 0;

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-[#E6E3D8] p-3 shadow-2xs hover:border-[#CCD5AE] transition flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F4F1EA] text-[#6B705C] border border-[#E6E3D8]">
                          {item.category}
                        </span>
                        <h4 className="text-xs font-bold text-[#2C3327]">{item.name}</h4>
                        <span className="text-xs font-extrabold text-[#588157] block">
                          {currency} {item.price.toFixed(2)}
                        </span>
                      </div>

                      {/* Quantity Controller */}
                      <div className="flex items-center space-x-1.5 bg-[#F4F1EA] p-1 rounded-lg border border-[#E6E3D8]">
                        <button
                          type="button"
                          onClick={() => handleToggleMenuItem(item.id, -1)}
                          disabled={qty <= 0}
                          className="p-1 rounded bg-white text-[#2C3327] hover:bg-[#E6E3D8] disabled:opacity-30 transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-[#2C3327]">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleMenuItem(item.id, 1)}
                          className="p-1 rounded bg-white text-[#2C3327] hover:bg-[#E6E3D8] transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Checkout Box */}
            <div className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs space-y-4 h-fit">
              <div className="pb-2 border-b border-[#E6E3D8]">
                <h3 className="text-sm font-bold text-[#2C3327] flex items-center space-x-2">
                  <BellRing className="w-4 h-4 text-[#D4A373]" />
                  <span>Emitir Pedido Room Service</span>
                </h3>
              </div>

              <form onSubmit={handlePlaceOrder} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Quarto Solicitante *
                  </label>
                  <select
                    id="select-order-room"
                    required
                    value={orderRoomId}
                    onChange={e => setOrderRoomId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  >
                    <option value="">Selecione o Quarto...</option>
                    {occupiedRooms.map(r => (
                      <option key={r.id} value={r.id}>
                        Quarto {r.number} ({r.currentGuestName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                      Destino
                    </label>
                    <select
                      id="select-order-destination"
                      value={orderDestination}
                      onChange={e => setOrderDestination(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                    >
                      <option value="Quarto">No Quarto (+ R$15 taxa)</option>
                      <option value="Restaurante">No Restaurante</option>
                      <option value="Piscina">Área da Piscina</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                      Responsável
                    </label>
                    <select
                      id="select-order-sector"
                      value={orderSector}
                      onChange={e => setOrderSector(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                    >
                      <option value="Room Service">Room Service</option>
                      <option value="Cozinha">Cozinha Geral</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Instruções Especiais / Ponto da Carne
                  </label>
                  <textarea
                    id="textarea-order-instructions"
                    rows={2}
                    placeholder="Ex: Sem cebola, talheres adicionais, caprichar no gelo..."
                    value={specialInstructions}
                    onChange={e => setSpecialInstructions(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  ></textarea>
                </div>

                {/* Items preview in basket */}
                <div className="bg-[#F4F1EA] rounded-xl p-3 border border-[#E6E3D8] text-xs space-y-1">
                  <div className="font-semibold text-[#2C3327] pb-1 border-b border-[#E6E3D8]">
                    Itens Selecionados ({selectedMenuItems.reduce((a, b) => a + b.quantity, 0)})
                  </div>
                  {selectedMenuItems.length === 0 ? (
                    <div className="text-[#8E9280] py-1 text-center italic">
                      Nenhum item adicionado ainda.
                    </div>
                  ) : (
                    selectedMenuItems.map(i => {
                      const m = menuItems.find(item => item.id === i.menuItemId);
                      return (
                        <div key={i.menuItemId} className="flex justify-between text-[#3D4035]">
                          <span>{i.quantity}x {m?.name}</span>
                          <span className="font-semibold">{currency} {((m?.price || 0) * i.quantity).toFixed(2)}</span>
                        </div>
                      );
                    })
                  )}
                </div>

                <button
                  id="btn-submit-kitchen-order"
                  type="submit"
                  disabled={placingOrder || selectedMenuItems.length === 0 || !orderRoomId}
                  className="w-full py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{placingOrder ? 'Enviando Pedido...' : 'Transmitir para Cozinha'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
