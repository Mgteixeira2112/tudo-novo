import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, CheckCircle2, ChefHat, Minus, Plus, Send, Wine } from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { KitchenOrder, MenuItem, MinibarItem, RoomMinibarConsumption } from '../types.ts';
import { api } from '../services/api.ts';

export const MinibarOperationalModule: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const { rooms, settings, refreshData } = useHotel();
  const [items, setItems] = useState<MinibarItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [registeredBy, setRegisteredBy] = useState('Governança / Room Service');
  const [consumptions, setConsumptions] = useState<RoomMinibarConsumption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const occupiedRooms = rooms.filter(room => room.status === 'Ocupado');
  const currency = settings?.currency || 'R$';

  useEffect(() => {
    api.getMinibarItems().then(setItems).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedRoomId) {
      setConsumptions([]);
      return;
    }
    api.getRoomConsumptions(selectedRoomId).then(setConsumptions).catch(console.error);
  }, [selectedRoomId]);

  const submitConsumption = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || !selectedRoomId || !selectedItemId || quantity <= 0) return;
    try {
      setSubmitting(true);
      await api.registerMinibarConsumption({ roomId: selectedRoomId, itemId: selectedItemId, quantity, registeredBy });
      const [updatedItems, updatedConsumptions] = await Promise.all([
        api.getMinibarItems(),
        api.getRoomConsumptions(selectedRoomId)
      ]);
      setItems(updatedItems);
      setConsumptions(updatedConsumptions);
      setQuantity(1);
      await refreshData();
      alert('Consumo lançado com sucesso na conta do quarto e tarefa de reposição gerada!');
    } catch (error: any) {
      alert(error?.message || 'Erro ao lançar consumo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#2C3327] flex items-center gap-2"><Wine className="w-5 h-5 text-[#588157]" /> Controle de Frigobar</h2>
      </div>

      {!canManage && <div className="rounded-xl border border-[#DADFD1] bg-[#F7F8F2] px-4 py-3 text-xs font-semibold text-[#5F6655]">Modo consulta: seu perfil pode visualizar o Frigobar, mas não lançar consumos.</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={submitConsumption} className="bg-white rounded-2xl border border-[#E6E3D8] p-6 shadow-xs space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#6B705C] mb-1">Quarto Ocupado</label>
            <select value={selectedRoomId} onChange={e => setSelectedRoomId(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl">
              <option value="">Selecione o Quarto...</option>
              {occupiedRooms.map(room => <option key={room.id} value={room.id}>Quarto {room.number} - {room.currentGuestName || 'Hóspede'}</option>)}
            </select>
          </div>

          {canManage && <>
            <div>
              <label className="block text-xs font-semibold text-[#6B705C] mb-1">Item do Frigobar *</label>
              <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} required className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl">
                <option value="">Selecione o Produto...</option>
                {items.map(item => <option key={item.id} value={item.id}>{item.name} - {currency} {item.price.toFixed(2)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-[#6B705C] mb-1">Quantidade</label><input type="number" min="1" max="20" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl" /></div>
              <div><label className="block text-xs font-semibold text-[#6B705C] mb-1">Registrado Por</label><input value={registeredBy} onChange={e => setRegisteredBy(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl" /></div>
            </div>
            <button type="submit" disabled={submitting || !selectedRoomId || !selectedItemId} className="w-full py-2.5 bg-[#2C3327] text-white rounded-xl text-xs font-bold disabled:opacity-50">{submitting ? 'Lançando...' : 'Lançar na Conta do Quarto'}</button>
          </>}
        </form>

        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B705C]">Histórico do quarto selecionado</h3>
          {consumptions.length === 0 ? <div className="bg-white rounded-2xl border border-[#E6E3D8] p-12 text-center text-[#8E9280] text-sm">Selecione um quarto para visualizar os lançamentos.</div> : (
            <div className="bg-white rounded-2xl border border-[#E6E3D8] overflow-x-auto shadow-xs"><table className="w-full text-left text-xs"><thead className="bg-[#F4F1EA] text-[#6B705C]"><tr><th className="p-3">Data</th><th className="p-3">Quarto</th><th className="p-3">Produto</th><th className="p-3">Qtd</th><th className="p-3">Total</th><th className="p-3">Responsável</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-[#E6E3D8]">{consumptions.map(item => <tr key={item.id}><td className="p-3">{new Date(item.registeredAt).toLocaleString('pt-BR')}</td><td className="p-3 font-bold">{item.roomNumber}</td><td className="p-3">{item.itemName}</td><td className="p-3">{item.quantity}</td><td className="p-3 font-bold text-[#588157]">{currency} {item.totalPrice.toFixed(2)}</td><td className="p-3">{item.registeredBy}</td><td className="p-3">{item.status}</td></tr>)}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
};

type OrdersMode = 'room_service' | 'kitchen';

export const OrdersOperationalModule: React.FC<{ mode: OrdersMode; canManage: boolean }> = ({ mode, canManage }) => {
  const { rooms, settings, refreshData } = useHotel();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [roomId, setRoomId] = useState('');
  const [destination, setDestination] = useState<'Quarto' | 'Restaurante' | 'Piscina'>(mode === 'room_service' ? 'Quarto' : 'Restaurante');
  const [instructions, setInstructions] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ menuItemId: string; quantity: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const currency = settings?.currency || 'R$';
  const occupiedRooms = rooms.filter(room => room.status === 'Ocupado');
  const sector: KitchenOrder['deliverySector'] = mode === 'room_service' ? 'Room Service' : 'Cozinha';

  useEffect(() => {
    Promise.all([api.getMenuItems(), api.getOrders()]).then(([menu, currentOrders]) => { setMenuItems(menu); setOrders(currentOrders); }).catch(console.error);
  }, []);

  useEffect(() => {
    setDestination(mode === 'room_service' ? 'Quarto' : 'Restaurante');
    setSelectedItems([]);
    setInstructions('');
  }, [mode]);

  const visibleOrders = useMemo(
    () => mode === 'kitchen'
      ? orders.filter(order => order.deliverySector === 'Cozinha' || order.deliverySector === 'Room Service')
      : orders.filter(order => order.deliverySector === 'Room Service'),
    [orders, mode]
  );

  const changeItem = (menuItemId: string, delta: number) => {
    if (!canManage) return;
    setSelectedItems(current => {
      const existing = current.find(item => item.menuItemId === menuItemId);
      if (!existing) return delta > 0 ? [...current, { menuItemId, quantity: delta }] : current;
      const next = existing.quantity + delta;
      if (next <= 0) return current.filter(item => item.menuItemId !== menuItemId);
      return current.map(item => item.menuItemId === menuItemId ? { ...item, quantity: next } : item);
    });
  };

  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || !roomId || selectedItems.length === 0) return;
    try {
      setSubmitting(true);
      await api.createOrder({ roomId, items: selectedItems, destination, deliverySector: sector, specialInstructions: instructions });
      setSelectedItems([]);
      setInstructions('');
      setOrders(await api.getOrders());
      await refreshData();
      alert(mode === 'room_service' ? 'Pedido de Room Service enviado com sucesso!' : 'Pedido enviado para a Cozinha com sucesso!');
    } catch (error: any) {
      alert(error?.message || 'Erro ao enviar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (orderId: string, status: KitchenOrder['status']) => {
    if (!canManage) return;
    await api.updateOrderStatus(orderId, status);
    setOrders(await api.getOrders());
    await refreshData();
  };

  const title = mode === 'room_service' ? 'Pedidos Room Service' : 'Operação da Cozinha';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div><h2 className="text-xl sm:text-2xl font-bold text-[#2C3327] flex items-center gap-2">{mode === 'room_service' ? <BellRing className="w-5 h-5 text-[#D4A373]" /> : <ChefHat className="w-5 h-5 text-[#D4A373]" />}{title}</h2></div>
      {!canManage && <div className="rounded-xl border border-[#DADFD1] bg-[#F7F8F2] px-4 py-3 text-xs font-semibold text-[#5F6655]">Modo consulta: seu perfil pode acompanhar este módulo, mas não criar pedidos nem alterar status.</div>}

      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B705C]">Pedidos do setor ({visibleOrders.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleOrders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-[#E6E3D8] p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between"><span className="font-extrabold text-xs text-[#BC6C25]">{order.orderNumber}</span><span className="text-[10px] font-bold px-2 py-0.5 bg-[#F4F1EA] rounded">{order.status}</span></div>
              <div className="text-xs font-bold text-[#2C3327]">Quarto {order.roomNumber} • {order.guestName}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#8E9280]">Origem: {order.deliverySector} • Destino: {order.destination}</div>
              <div className="bg-[#F4F1EA] rounded-xl p-2.5 text-xs space-y-1">{order.items.map((item, index) => <div key={`${order.id}-${index}`} className="flex justify-between"><span>{item.quantity}x {item.name}</span><span>{currency} {(item.quantity * item.unitPrice).toFixed(2)}</span></div>)}</div>
              {order.specialInstructions && <p className="text-[11px] text-[#6B705C] italic">Obs: {order.specialInstructions}</p>}
              <div className="pt-2 border-t border-[#E6E3D8]">
                {canManage && order.status === 'Recebido' && <button onClick={() => updateStatus(order.id, 'Em Preparo')} className="w-full py-1.5 bg-[#D4A373] text-white font-bold rounded-lg text-xs">Iniciar Preparo</button>}
                {canManage && order.status === 'Em Preparo' && <button onClick={() => updateStatus(order.id, 'Pronto')} className="w-full py-1.5 bg-[#A3B18A] text-white font-bold rounded-lg text-xs">Pronto para Entrega</button>}
                {canManage && order.status === 'Pronto' && <button onClick={() => updateStatus(order.id, 'Entregue')} className="w-full py-1.5 bg-[#588157] text-white font-bold rounded-lg text-xs">Marcar como Entregue</button>}
                {order.status === 'Entregue' && <span className="text-[#588157] font-semibold flex items-center justify-center text-xs"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Entregue</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`grid grid-cols-1 ${canManage ? 'lg:grid-cols-3' : ''} gap-6 pt-4 border-t border-[#E6E3D8]`}>
        <div className={`${canManage ? 'lg:col-span-2' : ''} space-y-3`}>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B705C]">Cardápio disponível</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {menuItems.filter(item => item.available).map(item => {
              const quantity = selectedItems.find(selected => selected.menuItemId === item.id)?.quantity || 0;
              return <div key={item.id} className="bg-white rounded-xl border border-[#E6E3D8] p-3 flex items-center justify-between"><div><p className="text-xs font-bold text-[#2C3327]">{item.name}</p><p className="text-xs font-extrabold text-[#588157]">{currency} {item.price.toFixed(2)}</p></div>{canManage && <div className="flex items-center gap-1.5 bg-[#F4F1EA] p-1 rounded-lg"><button type="button" onClick={() => changeItem(item.id, -1)} disabled={quantity <= 0} className="p-1 bg-white rounded disabled:opacity-30"><Minus className="w-3 h-3" /></button><span className="w-5 text-center text-xs font-bold">{quantity}</span><button type="button" onClick={() => changeItem(item.id, 1)} className="p-1 bg-white rounded"><Plus className="w-3 h-3" /></button></div>}</div>;
            })}
          </div>
        </div>

        {canManage && <form onSubmit={submitOrder} className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs space-y-3 h-fit">
          <h3 className="text-sm font-bold text-[#2C3327] flex items-center gap-2"><Send className="w-4 h-4 text-[#D4A373]" />Novo pedido — {sector}</h3>
          <div><label className="block text-xs font-semibold text-[#6B705C] mb-1">Quarto associado *</label><select value={roomId} onChange={e => setRoomId(e.target.value)} required className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl"><option value="">Selecione...</option>{occupiedRooms.map(room => <option key={room.id} value={room.id}>Quarto {room.number} ({room.currentGuestName})</option>)}</select></div>
          <div><label className="block text-xs font-semibold text-[#6B705C] mb-1">Destino</label><select value={destination} onChange={e => setDestination(e.target.value as any)} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl"><option value="Quarto">Quarto</option><option value="Restaurante">Restaurante</option><option value="Piscina">Piscina</option></select></div>
          <div className="rounded-xl bg-[#F4F1EA] px-3 py-2 text-xs"><span className="text-[#6B705C]">Responsável:</span> <strong className="text-[#2C3327]">{sector}</strong></div>
          <textarea rows={3} placeholder="Instruções especiais..." value={instructions} onChange={e => setInstructions(e.target.value)} className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl" />
          <button type="submit" disabled={submitting || !roomId || selectedItems.length === 0} className="w-full py-2.5 bg-[#2C3327] text-white rounded-xl text-xs font-bold disabled:opacity-50">{submitting ? 'Enviando...' : `Enviar para ${sector}`}</button>
        </form>}
      </div>
    </div>
  );
};
