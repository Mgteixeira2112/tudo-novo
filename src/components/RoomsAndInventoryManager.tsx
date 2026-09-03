import React, { useState, useEffect, useMemo } from 'react';
import {
  BedDouble,
  Wine,
  UtensilsCrossed,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  DollarSign,
  PackagePlus,
  PackageCheck,
  Edit3,
  Trash2,
  DoorOpen,
  ArrowUpRight,
  ChefHat,
  BellRing,
  Layers,
  FileText,
  UserCheck,
  X,
  Check,
  Info,
  Boxes
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { Room, RoomStatus, MinibarItem, MenuItem, KitchenOrder, RoomMinibarConsumption } from '../types.ts';
import { api } from '../services/api.ts';
import { IntegratedInventoryManager } from './IntegratedInventoryManager.tsx';

export const RoomsAndInventoryManager: React.FC = () => {
  const { rooms, settings, refreshData, currentUser } = useHotel();

  // Active sub-module tab
  const [activeTab, setActiveTab] = useState<'rooms' | 'inventory' | 'minibar' | 'room_service' | 'finance'>('rooms');

  // -------------------------------------------------------------
  // 1. Rooms State & Filters
  // -------------------------------------------------------------
  const [roomSearch, setRoomSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Room Modals
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomFormData, setRoomFormData] = useState({
    number: '',
    floor: 1,
    typeId: '',
    typeName: '',
    pricePerNight: 350,
    capacity: 2,
    amenities: ['Wi-Fi 500Mbps', 'Ar Condicionado', 'Smart TV 50"', 'Frigobar'],
    notes: ''
  });
  const [amenityInput, setAmenityInput] = useState('');
  const [roomSubmitting, setRoomSubmitting] = useState(false);

  // Quick Status Change Modal
  const [statusModalRoom, setStatusModalRoom] = useState<Room | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<RoomStatus>('Disponivel');
  const [statusChangeNotes, setStatusChangeNotes] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // -------------------------------------------------------------
  // 2. Minibar Inventory State
  // -------------------------------------------------------------
  const [minibarItems, setMinibarItems] = useState<MinibarItem[]>([]);
  const [minibarSearch, setMinibarSearch] = useState('');
  const [minibarCategoryFilter, setMinibarCategoryFilter] = useState<string>('ALL');
  const [consumptions, setConsumptions] = useState<RoomMinibarConsumption[]>([]);

  // Minibar Item Create/Edit Modal
  const [showMinibarItemModal, setShowMinibarItemModal] = useState(false);
  const [editingMinibarItem, setEditingMinibarItem] = useState<MinibarItem | null>(null);
  const [minibarItemForm, setMinibarItemForm] = useState<{
    name: string;
    category: MinibarItem['category'];
    price: number;
    stockQty: number;
    unit: string;
  }>({
    name: '',
    category: 'Bebidas',
    price: 10,
    stockQty: 50,
    unit: 'un'
  });
  const [minibarSubmitting, setMinibarSubmitting] = useState(false);

  // Quick Launch Minibar Consumption Form / Modal
  const [consumptionRoomId, setConsumptionRoomId] = useState<string>('');
  const [consumptionItemId, setConsumptionItemId] = useState<string>('');
  const [consumptionQty, setConsumptionQty] = useState<number>(1);
  const [consumptionStaff, setConsumptionStaff] = useState<string>('Governança / Frigobar');
  const [launchingConsumption, setLaunchingConsumption] = useState(false);
  const [consumptionSuccessMsg, setConsumptionSuccessMsg] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 3. Room Service State
  // -------------------------------------------------------------
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [orderRoomId, setOrderRoomId] = useState<string>('');
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, number>>({});
  const [orderSpecialNotes, setOrderSpecialNotes] = useState('');
  const [deliveryFeeIncluded, setDeliveryFeeIncluded] = useState(true);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // Load initial minibar, menu items, and orders
  useEffect(() => {
    if (!currentUser) return;
    loadMinibarData();
    loadKitchenData();
  }, [currentUser?.id]);

  const loadMinibarData = () => {
    api.getMinibarItems().then(setMinibarItems).catch(console.error);
    api.getRoomConsumptions().then(setConsumptions).catch(console.error);
  };

  const loadKitchenData = () => {
    api.getMenuItems().then(setMenuItems).catch(console.error);
    api.getOrders().then(setOrders).catch(console.error);
  };

  // -------------------------------------------------------------
  // Derived Statistics & Filters
  // -------------------------------------------------------------
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status === 'Ocupado');
  const availableRooms = rooms.filter(r => r.status === 'Disponivel');
  const cleaningRooms = rooms.filter(r => r.status === 'Limpeza');
  const maintenanceRooms = rooms.filter(r => r.status === 'Manutencao');
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms.length / totalRooms) * 100) : 0;

  const lowStockItems = minibarItems.filter(i => i.stockQty <= 15);
  const totalMinibarItemsCount = minibarItems.reduce((acc, i) => acc + i.stockQty, 0);

  const roomServiceOrders = orders.filter(o => o.deliverySector === 'Room Service' || o.destination === 'Quarto');
  const activeRoomServiceOrders = roomServiceOrders.filter(o => o.status !== 'Entregue' && o.status !== 'Cancelado');

  // Filtered rooms list
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchSearch =
        room.number.toLowerCase().includes(roomSearch.toLowerCase()) ||
        room.typeName.toLowerCase().includes(roomSearch.toLowerCase()) ||
        (room.currentGuestName && room.currentGuestName.toLowerCase().includes(roomSearch.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || room.status === statusFilter;
      const matchFloor = floorFilter === 'ALL' || String(room.floor) === floorFilter;
      const matchType = typeFilter === 'ALL' || room.typeId === typeFilter;

      return matchSearch && matchStatus && matchFloor && matchType;
    });
  }, [rooms, roomSearch, statusFilter, floorFilter, typeFilter]);

  // Filtered minibar items
  const filteredMinibarItems = useMemo(() => {
    return minibarItems.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(minibarSearch.toLowerCase());
      const matchCat = minibarCategoryFilter === 'ALL' || item.category === minibarCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [minibarItems, minibarSearch, minibarCategoryFilter]);

  // Unique floors for filter dropdown
  const uniqueFloors = useMemo(() => {
    const floorSet = new Set<number>();
    rooms.forEach(r => floorSet.add(Number(r.floor)));
    return Array.from(floorSet).sort((a, b) => a - b);
  }, [rooms]);

  // -------------------------------------------------------------
  // Room Handlers
  // -------------------------------------------------------------
  const handleOpenCreateRoom = () => {
    setEditingRoom(null);
    const defaultType = settings?.roomTypes[0];
    setRoomFormData({
      number: '',
      floor: 1,
      typeId: defaultType?.id || 'rt_standard',
      typeName: defaultType?.name || 'Suíte Standard',
      pricePerNight: defaultType?.basePrice || 380,
      capacity: defaultType?.capacityAdults || 2,
      amenities: defaultType?.amenities || ['Wi-Fi 500Mbps', 'Ar Condicionado', 'Smart TV 50"', 'Frigobar'],
      notes: ''
    });
    setAmenityInput('');
    setShowRoomModal(true);
  };

  const handleOpenEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomFormData({
      number: room.number,
      floor: room.floor,
      typeId: room.typeId,
      typeName: room.typeName,
      pricePerNight: room.pricePerNight,
      capacity: room.capacity,
      amenities: [...room.amenities],
      notes: room.notes || ''
    });
    setAmenityInput('');
    setShowRoomModal(true);
  };

  const handleRoomTypeChange = (typeId: string) => {
    const selected = settings?.roomTypes.find(t => t.id === typeId);
    if (selected) {
      setRoomFormData(prev => ({
        ...prev,
        typeId: selected.id,
        typeName: selected.name,
        pricePerNight: selected.basePrice,
        capacity: selected.capacityAdults,
        amenities: selected.amenities && selected.amenities.length > 0 ? selected.amenities : prev.amenities
      }));
    }
  };

  const handleAddAmenity = () => {
    if (!amenityInput.trim()) return;
    if (!roomFormData.amenities.includes(amenityInput.trim())) {
      setRoomFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenityInput.trim()]
      }));
    }
    setAmenityInput('');
  };

  const handleRemoveAmenity = (amenity: string) => {
    setRoomFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter(a => a !== amenity)
    }));
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomFormData.number.trim()) return;

    try {
      setRoomSubmitting(true);
      if (editingRoom) {
        await api.updateRoom(editingRoom.id, {
          number: roomFormData.number.trim(),
          floor: Number(roomFormData.floor),
          typeId: roomFormData.typeId,
          typeName: roomFormData.typeName,
          pricePerNight: Number(roomFormData.pricePerNight),
          capacity: Number(roomFormData.capacity),
          amenities: roomFormData.amenities,
          notes: roomFormData.notes
        });
      } else {
        await api.createRoom({
          number: roomFormData.number.trim(),
          floor: Number(roomFormData.floor),
          typeId: roomFormData.typeId,
          typeName: roomFormData.typeName,
          status: 'Disponivel',
          pricePerNight: Number(roomFormData.pricePerNight),
          capacity: Number(roomFormData.capacity),
          amenities: roomFormData.amenities,
          notes: roomFormData.notes
        });
      }

      await refreshData();
      setShowRoomModal(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar quarto.');
    } finally {
      setRoomSubmitting(false);
    }
  };

  const handleDeleteRoom = async (room: Room) => {
    if (room.status === 'Ocupado') {
      alert('Não é possível excluir um quarto que está ocupado por hóspede!');
      return;
    }
    if (!confirm(`Deseja realmente excluir o Quarto ${room.number} (${room.typeName})? Esta ação removerá o quarto do sistema.`)) {
      return;
    }

    try {
      await api.deleteRoom(room.id);
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir quarto.');
    }
  };

  // Quick Status change trigger
  const handleOpenStatusModal = (room: Room) => {
    setStatusModalRoom(room);
    setSelectedNewStatus(room.status);
    setStatusChangeNotes(room.notes || '');
  };

  const handleConfirmStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalRoom) return;

    try {
      setStatusSubmitting(true);
      await api.updateRoomStatus(statusModalRoom.id, selectedNewStatus, statusChangeNotes);
      await refreshData();
      setStatusModalRoom(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status do quarto.');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleDirectQuickStatus = async (room: Room, newStatus: RoomStatus) => {
    if (room.status === newStatus) return;
    try {
      await api.updateRoomStatus(room.id, newStatus, room.notes);
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao mudar status.');
    }
  };

  // -------------------------------------------------------------
  // Minibar Handlers
  // -------------------------------------------------------------
  const handleOpenCreateMinibarItem = () => {
    setEditingMinibarItem(null);
    setMinibarItemForm({
      name: '',
      category: 'Bebidas',
      price: 12,
      stockQty: 50,
      unit: 'un'
    });
    setShowMinibarItemModal(true);
  };

  const handleOpenEditMinibarItem = (item: MinibarItem) => {
    setEditingMinibarItem(item);
    setMinibarItemForm({
      name: item.name,
      category: item.category,
      price: item.price,
      stockQty: item.stockQty,
      unit: item.unit
    });
    setShowMinibarItemModal(true);
  };

  const handleSaveMinibarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minibarItemForm.name.trim()) return;

    try {
      setMinibarSubmitting(true);
      if (editingMinibarItem) {
        await api.updateMinibarItem(editingMinibarItem.id, minibarItemForm);
      } else {
        await api.createMinibarItem(minibarItemForm);
      }
      loadMinibarData();
      setShowMinibarItemModal(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar item de frigobar');
    } finally {
      setMinibarSubmitting(false);
    }
  };

  const handleRestockQuick = async (itemId: string, qty: number) => {
    try {
      await api.restockMinibarItem(itemId, qty);
      loadMinibarData();
    } catch (err: any) {
      alert(err.message || 'Erro ao reabastecer estoque');
    }
  };

  const handleDeleteMinibarItem = async (item: MinibarItem) => {
    if (!confirm(`Deseja remover "${item.name}" do catálogo de frigobar?`)) return;
    try {
      await api.deleteMinibarItem(item.id);
      loadMinibarData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir item');
    }
  };

  const handleLaunchConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consumptionRoomId || !consumptionItemId || consumptionQty <= 0) {
      alert('Selecione o quarto, o item e a quantidade para lançar consumo.');
      return;
    }

    try {
      setLaunchingConsumption(true);
      await api.registerMinibarConsumption({
        roomId: consumptionRoomId,
        itemId: consumptionItemId,
        quantity: consumptionQty,
        registeredBy: consumptionStaff
      });

      setConsumptionSuccessMsg('Consumo de frigobar registrado com sucesso no quarto e lançado no controle financeiro!');
      setTimeout(() => setConsumptionSuccessMsg(null), 4000);
      setConsumptionQty(1);
      loadMinibarData();
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao lançar consumo');
    } finally {
      setLaunchingConsumption(false);
    }
  };

  // -------------------------------------------------------------
  // Room Service Handlers
  // -------------------------------------------------------------
  const handleToggleOrderItem = (menuItemId: string, delta: number) => {
    setOrderItemsMap(prev => {
      const current = prev[menuItemId] || 0;
      const next = current + delta;
      const copy = { ...prev };
      if (next <= 0) {
        delete copy[menuItemId];
      } else {
        copy[menuItemId] = next;
      }
      return copy;
    });
  };

  const orderCalculatedTotal = useMemo(() => {
    let subtotal = 0;
    Object.entries(orderItemsMap).forEach(([itemId, qty]) => {
      const item = menuItems.find(m => m.id === itemId);
      if (item) {
        subtotal += item.price * Number(qty);
      }
    });
    const fee = deliveryFeeIncluded && Object.keys(orderItemsMap).length > 0 ? 15.0 : 0.0;
    return { subtotal, fee, total: subtotal + fee };
  }, [orderItemsMap, menuItems, deliveryFeeIncluded]);

  const handlePlaceRoomServiceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemEntries = Object.entries(orderItemsMap);
    if (!orderRoomId || itemEntries.length === 0) {
      alert('Por favor, selecione o quarto e adicione pelo menos um item ao pedido de room service.');
      return;
    }

    try {
      setOrderSubmitting(true);
      const itemsPayload: { menuItemId: string; quantity: number }[] = itemEntries.map(([menuItemId, quantity]) => ({
        menuItemId,
        quantity: Number(quantity)
      }));

      await api.createOrder({
        roomId: orderRoomId,
        items: itemsPayload,
        destination: 'Quarto',
        deliverySector: 'Room Service',
        specialInstructions: orderSpecialNotes
      });

      setOrderSuccessMsg('Pedido de Room Service enviado para a Cozinha e faturado na conta do quarto com sucesso!');
      setTimeout(() => setOrderSuccessMsg(null), 4000);
      setOrderItemsMap({});
      setOrderSpecialNotes('');
      loadKitchenData();
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar pedido de room service');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: KitchenOrder['status']) => {
    try {
      await api.updateOrderStatus(orderId, status);
      loadKitchenData();
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status do pedido');
    }
  };

  // Helper styling for room status
  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case 'Disponivel':
        return {
          label: 'Disponível',
          bg: 'bg-[#F2F5E8] text-[#588157] border-[#CCD5AE]',
          dot: 'bg-[#588157]'
        };
      case 'Ocupado':
        return {
          label: 'Ocupado',
          bg: 'bg-[#FEFAE0] text-[#D4A373] border-[#E9EDC9]',
          dot: 'bg-[#D4A373]'
        };
      case 'Limpeza':
        return {
          label: 'Em Limpeza',
          bg: 'bg-[#EBF2F7] text-[#4A6B82] border-[#C2D6E3]',
          dot: 'bg-[#4A6B82]'
        };
      case 'Manutencao':
        return {
          label: 'Em Manutenção',
          bg: 'bg-[#FDF0ED] text-[#BC6C25] border-[#F2C6B6]',
          dot: 'bg-[#BC6C25]'
        };
      case 'Bloqueado':
        return {
          label: 'Bloqueado',
          bg: 'bg-[#F4F1EA] text-[#6B705C] border-[#E6E3D8]',
          dot: 'bg-[#6B705C]'
        };
      default:
        return {
          label: status,
          bg: 'bg-[#F4F1EA] text-[#3D4035] border-[#E6E3D8]',
          dot: 'bg-[#6B705C]'
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* ------------------------------------------------------------- */}
      {/* Top Header & Overview KPI Strip                               */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E6E3D8] pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#F2F5E8] rounded-xl text-[#2C3327] border border-[#CCD5AE]">
              <BedDouble className="w-6 h-6 text-[#588157]" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-[#2C3327] tracking-tight font-serif">
                Gestão de Quartos & Inventário
              </h2>
              <p className="text-xs text-[#6B705C] mt-0.5">
                Controle de status em tempo real, inventário de frigobar e pedidos de room service integrados ao financeiro.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action CTA Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            id="btn-add-room-top"
            onClick={handleOpenCreateRoom}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Quarto</span>
          </button>

          <button
            id="btn-add-minibar-top"
            onClick={handleOpenCreateMinibarItem}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#F4F1EA] hover:bg-[#EFECE4] text-[#2C3327] border border-[#E6E3D8] rounded-xl text-xs font-bold transition"
          >
            <Wine className="w-4 h-4 text-[#588157]" />
            <span>Novo Item Frigobar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total & Ocupação */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6E3D8] shadow-xs">
          <div className="flex items-center justify-between text-[#6B705C] text-xs font-semibold">
            <span>Total Quartos</span>
            <Layers className="w-4 h-4 text-[#588157]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#2C3327] font-serif">{totalRooms}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F2F5E8] text-[#588157] border border-[#CCD5AE]/60">
              {occupancyRate}% Ocupado
            </span>
          </div>
        </div>

        {/* Disponíveis */}
        <div
          onClick={() => { setActiveTab('rooms'); setStatusFilter('Disponivel'); }}
          className="bg-white p-4 rounded-2xl border border-[#E6E3D8] shadow-xs hover:border-[#588157] cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-[#588157] text-xs font-semibold">
            <span>Disponíveis</span>
            <span className="w-2 h-2 rounded-full bg-[#588157]"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#2C3327] font-serif">{availableRooms.length}</span>
            <span className="text-[11px] text-[#6B705C]">Prontos p/ Check-in</span>
          </div>
        </div>

        {/* Ocupados */}
        <div
          onClick={() => { setActiveTab('rooms'); setStatusFilter('Ocupado'); }}
          className="bg-white p-4 rounded-2xl border border-[#E6E3D8] shadow-xs hover:border-[#D4A373] cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-[#D4A373] text-xs font-semibold">
            <span>Ocupados</span>
            <span className="w-2 h-2 rounded-full bg-[#D4A373]"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#2C3327] font-serif">{occupiedRooms.length}</span>
            <span className="text-[11px] text-[#6B705C]">Hóspedes instalados</span>
          </div>
        </div>

        {/* Em Limpeza */}
        <div
          onClick={() => { setActiveTab('rooms'); setStatusFilter('Limpeza'); }}
          className="bg-white p-4 rounded-2xl border border-[#E6E3D8] shadow-xs hover:border-[#4A6B82] cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-[#4A6B82] text-xs font-semibold">
            <span>Em Limpeza</span>
            <span className="w-2 h-2 rounded-full bg-[#4A6B82]"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#2C3327] font-serif">{cleaningRooms.length}</span>
            <span className="text-[11px] text-[#6B705C]">Governança ativa</span>
          </div>
        </div>

        {/* Em Manutenção */}
        <div
          onClick={() => { setActiveTab('rooms'); setStatusFilter('Manutencao'); }}
          className="bg-white p-4 rounded-2xl border border-[#E6E3D8] shadow-xs hover:border-[#BC6C25] cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-[#BC6C25] text-xs font-semibold">
            <span>Manutenção</span>
            <span className="w-2 h-2 rounded-full bg-[#BC6C25]"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#2C3327] font-serif">{maintenanceRooms.length}</span>
            <span className="text-[11px] text-[#6B705C]">Técnico acionado</span>
          </div>
        </div>

        {/* Frigobar / Room Service */}
        <div
          onClick={() => setActiveTab('minibar')}
          className="bg-white p-4 rounded-2xl border border-[#E6E3D8] shadow-xs hover:border-[#588157] cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-[#6B705C] text-xs font-semibold">
            <span>Estoque Frigobar</span>
            <Wine className="w-4 h-4 text-[#BC6C25]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#2C3327] font-serif">{totalMinibarItemsCount}</span>
            {lowStockItems.length > 0 ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FDF0ED] text-[#BC6C25]">
                {lowStockItems.length} baixo estoque
              </span>
            ) : (
              <span className="text-[10px] text-[#588157] font-semibold">Estoque OK</span>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Module Sub-Navigation Tabs                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="flex space-x-2 border-b border-[#E6E3D8] pb-1 overflow-x-auto text-xs sm:text-sm font-semibold">
        <button
          id="tab-rooms-sub"
          onClick={() => setActiveTab('rooms')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'rooms'
              ? 'bg-[#2C3327] text-[#FDFBF7] shadow-xs font-bold'
              : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA]'
          }`}
        >
          <BedDouble className="w-4 h-4 text-[#A3B18A]" />
          <span>Cadastro de Quartos & Status</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-inherit">
            {rooms.length}
          </span>
        </button>

        <button
          id="tab-inventory-sub"
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'inventory'
              ? 'bg-[#2C3327] text-[#FDFBF7] shadow-xs font-bold'
              : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA]'
          }`}
        >
          <Boxes className="w-4 h-4 text-[#A3B18A]" />
          <span>Estoque Integrado & Kardex</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#588157] text-white">
            Tempo Real
          </span>
        </button>

        <button
          id="tab-minibar-sub"
          onClick={() => setActiveTab('minibar')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'minibar'
              ? 'bg-[#2C3327] text-[#FDFBF7] shadow-xs font-bold'
              : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA]'
          }`}
        >
          <Wine className="w-4 h-4 text-[#D4A373]" />
          <span>Inventário do Frigobar & Consumo</span>
          {lowStockItems.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#BC6C25] text-white">
              {lowStockItems.length}
            </span>
          )}
        </button>

        <button
          id="tab-room-service-sub"
          onClick={() => setActiveTab('room_service')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'room_service'
              ? 'bg-[#2C3327] text-[#FDFBF7] shadow-xs font-bold'
              : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA]'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4 text-[#BC6C25]" />
          <span>Pedidos de Room Service</span>
          {activeRoomServiceOrders.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#588157] text-white">
              {activeRoomServiceOrders.length} ativos
            </span>
          )}
        </button>

        <button
          id="tab-finance-sub"
          onClick={() => setActiveTab('finance')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'finance'
              ? 'bg-[#2C3327] text-[#FDFBF7] shadow-xs font-bold'
              : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA]'
          }`}
        >
          <DollarSign className="w-4 h-4 text-[#588157]" />
          <span>Auditoria & Faturamento Integrado</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB: ESTOQUE INTEGRADO EM TEMPO REAL & KARDEX                 */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'inventory' && (
        <IntegratedInventoryManager />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: CADASTRO DE QUARTOS & STATUS EM TEMPO REAL              */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'rooms' && (
        <div className="space-y-6">
          {/* Controls Bar: Search & Multi-Filters */}
          <div className="bg-white p-4 rounded-2xl border border-[#E6E3D8] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#8E9280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-rooms"
                type="text"
                placeholder="Buscar por nº, categoria ou hóspede..."
                value={roomSearch}
                onChange={e => setRoomSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#2C3327] bg-[#FDFBF7]"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {/* Status Filter */}
              <select
                id="filter-room-status"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none"
              >
                <option value="ALL">Todos os Status ({rooms.length})</option>
                <option value="Disponivel">Disponível ({availableRooms.length})</option>
                <option value="Ocupado">Ocupado ({occupiedRooms.length})</option>
                <option value="Limpeza">Em Limpeza ({cleaningRooms.length})</option>
                <option value="Manutencao">Em Manutenção ({maintenanceRooms.length})</option>
                <option value="Bloqueado">Bloqueado</option>
              </select>

              {/* Floor Filter */}
              <select
                id="filter-room-floor"
                value={floorFilter}
                onChange={e => setFloorFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none"
              >
                <option value="ALL">Todos os Andares</option>
                {uniqueFloors.map(f => (
                  <option key={f} value={String(f)}>
                    {f}º Andar
                  </option>
                ))}
              </select>

              {/* Room Type Filter */}
              <select
                id="filter-room-type"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none"
              >
                <option value="ALL">Todas as Categorias</option>
                {settings?.roomTypes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {(roomSearch || statusFilter !== 'ALL' || floorFilter !== 'ALL' || typeFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setRoomSearch('');
                    setStatusFilter('ALL');
                    setFloorFilter('ALL');
                    setTypeFilter('ALL');
                  }}
                  className="p-2 text-xs text-[#BC6C25] hover:bg-[#FDF0ED] rounded-xl transition"
                  title="Limpar filtros"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map(room => {
              const badge = getStatusBadge(room.status);
              return (
                <div
                  key={room.id}
                  id={`card-room-${room.number}`}
                  className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  {/* Card Header: Room Number & Status */}
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-xl bg-[#F4F1EA] text-[#2C3327] flex items-center justify-center font-serif text-lg font-bold border border-[#E6E3D8]">
                          {room.number}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#2C3327] leading-tight">
                            {room.typeName}
                          </h4>
                          <span className="text-[11px] text-[#6B705C]">
                            {room.floor}º Andar &bull; Diária: {settings?.currency || 'R$'} {room.pricePerNight}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Status Pill */}
                      <div className="relative">
                        <button
                          onClick={() => handleOpenStatusModal(room)}
                          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bg} transition hover:opacity-90`}
                          title="Clique para alterar status e registrar notas"
                        >
                          <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
                          <span>{badge.label}</span>
                          <Edit3 className="w-3 h-3 opacity-60 ml-0.5" />
                        </button>
                      </div>
                    </div>

                    {/* Guest Banner if Occupied */}
                    {room.status === 'Ocupado' && (
                      <div className="mt-3 p-2.5 bg-[#FEFAE0] rounded-xl border border-[#E9EDC9] flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5 text-[#2C3327]">
                          <UserCheck className="w-3.5 h-3.5 text-[#D4A373]" />
                          <span className="font-bold truncate max-w-[180px]">
                            {room.currentGuestName || 'Hóspede Instalado'}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#6B705C] font-mono">
                          {room.currentReservationId || 'Ativo'}
                        </span>
                      </div>
                    )}

                    {/* Room Characteristics */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs py-2 border-y border-[#E6E3D8]/60 text-[#6B705C]">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-[#8E9280]">Capacidade</span>
                        <span className="font-semibold text-[#2C3327]">{room.capacity} Hóspedes</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-[#8E9280]">Status Limpeza</span>
                        <span className="font-semibold text-[#2C3327]">
                          {room.status === 'Limpeza' ? 'Em Higienização' : 'Higienizado'}
                        </span>
                      </div>
                    </div>

                    {/* Amenities pills */}
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {room.amenities.slice(0, 4).map((amenity, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[10px] font-medium bg-[#F4F1EA] text-[#6B705C] rounded-md border border-[#E6E3D8]"
                        >
                          {amenity}
                        </span>
                      ))}
                      {room.amenities.length > 4 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-[#8E9280]">
                          +{room.amenities.length - 4} mais
                        </span>
                      )}
                    </div>

                    {/* Room Notes */}
                    {room.notes && (
                      <p className="mt-2 text-[11px] text-[#6B705C] italic line-clamp-2">
                        &ldquo;{room.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Card Bottom Quick Actions */}
                  <div className="pt-2 border-t border-[#E6E3D8] flex items-center justify-between gap-1">
                    {/* Quick Direct Status Toggles */}
                    <div className="flex items-center space-x-1">
                      {room.status !== 'Disponivel' && (
                        <button
                          onClick={() => handleDirectQuickStatus(room, 'Disponivel')}
                          className="p-1.5 text-[10px] rounded-lg bg-[#F2F5E8] text-[#588157] hover:bg-[#E9EDC9] border border-[#CCD5AE] font-semibold transition"
                          title="Liberar Quarto para Disponível"
                        >
                          Liberar
                        </button>
                      )}
                      {room.status !== 'Limpeza' && room.status !== 'Ocupado' && (
                        <button
                          onClick={() => handleDirectQuickStatus(room, 'Limpeza')}
                          className="p-1.5 text-[10px] rounded-lg bg-[#EBF2F7] text-[#4A6B82] hover:bg-[#D5E5F0] border border-[#C2D6E3] font-semibold transition"
                          title="Mover para Limpeza"
                        >
                          Limpeza
                        </button>
                      )}
                      {room.status !== 'Manutencao' && room.status !== 'Ocupado' && (
                        <button
                          onClick={() => handleDirectQuickStatus(room, 'Manutencao')}
                          className="p-1.5 text-[10px] rounded-lg bg-[#FDF0ED] text-[#BC6C25] hover:bg-[#F9DDD5] border border-[#F2C6B6] font-semibold transition"
                          title="Mover para Manutenção"
                        >
                          Manut.
                        </button>
                      )}
                    </div>

                    {/* Edit & Room Service / Minibar Shortcuts */}
                    <div className="flex items-center space-x-1">
                      {room.status === 'Ocupado' && (
                        <>
                          <button
                            onClick={() => {
                              setActiveTab('minibar');
                              setConsumptionRoomId(room.id);
                            }}
                            className="p-1.5 text-[#2C3327] hover:bg-[#F4F1EA] rounded-lg border border-[#E6E3D8] transition text-xs"
                            title="Lançar consumo de frigobar para este quarto"
                          >
                            <Wine className="w-3.5 h-3.5 text-[#588157]" />
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('room_service');
                              setOrderRoomId(room.id);
                            }}
                            className="p-1.5 text-[#2C3327] hover:bg-[#F4F1EA] rounded-lg border border-[#E6E3D8] transition text-xs"
                            title="Registrar Room Service para este quarto"
                          >
                            <UtensilsCrossed className="w-3.5 h-3.5 text-[#BC6C25]" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleOpenEditRoom(room)}
                        className="p-1.5 text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA] rounded-lg transition"
                        title="Editar Características do Quarto"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteRoom(room)}
                        disabled={room.status === 'Ocupado'}
                        className={`p-1.5 rounded-lg transition ${
                          room.status === 'Ocupado'
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-red-500 hover:bg-red-50'
                        }`}
                        title="Excluir Quarto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredRooms.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#E6E3D8] space-y-3">
              <DoorOpen className="w-10 h-10 text-[#8E9280] mx-auto opacity-50" />
              <h5 className="font-bold text-[#2C3327]">Nenhum quarto encontrado</h5>
              <p className="text-xs text-[#6B705C]">
                Tente ajustar os filtros ou cadastre um novo quarto para o hotel.
              </p>
              <button
                onClick={handleOpenCreateRoom}
                className="px-4 py-2 bg-[#2C3327] text-white rounded-xl text-xs font-bold"
              >
                Cadastrar Quarto Agora
              </button>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: INVENTÁRIO DO FRIGOBAR & CONSUMO NOS QUARTOS            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'minibar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Inventory List & Restock (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Inventory Controls */}
            <div className="bg-white p-4 rounded-2xl border border-[#E6E3D8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-[#8E9280] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar item no frigobar..."
                  value={minibarSearch}
                  onChange={e => setMinibarSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <select
                  value={minibarCategoryFilter}
                  onChange={e => setMinibarCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none font-medium"
                >
                  <option value="ALL">Todas Categorias</option>
                  <option value="Bebidas">Bebidas</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Doces">Doces</option>
                  <option value="Vinhos">Vinhos</option>
                </select>

                <button
                  onClick={handleOpenCreateMinibarItem}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#2C3327] hover:bg-[#3A4135] text-white rounded-xl text-xs font-bold transition whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Item</span>
                </button>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-2xl border border-[#E6E3D8] overflow-hidden shadow-xs">
              <div className="p-4 border-b border-[#E6E3D8] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#2C3327]">Itens do Frigobar & Quantidades</h4>
                  <p className="text-xs text-[#6B705C]">
                    Reabastecimento rápido (+5, +10, +25) e controle por quarto
                  </p>
                </div>
                <span className="text-xs text-[#6B705C] font-mono">
                  {filteredMinibarItems.length} cadastrados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F4F1EA] text-[#6B705C] border-b border-[#E6E3D8]">
                      <th className="py-3 px-4 font-bold">Item</th>
                      <th className="py-3 px-3 font-bold">Categoria</th>
                      <th className="py-3 px-3 font-bold">Preço Unit.</th>
                      <th className="py-3 px-3 font-bold text-center">Estoque Atual</th>
                      <th className="py-3 px-3 font-bold text-center">Reabastecimento</th>
                      <th className="py-3 px-3 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E3D8]">
                    {filteredMinibarItems.map(item => (
                      <tr key={item.id} className="hover:bg-[#FDFBF7] transition">
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#2C3327] block">{item.name}</span>
                          <span className="text-[10px] text-[#8E9280]">Unidade: {item.unit}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F4F1EA] text-[#6B705C] border border-[#E6E3D8]">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-[#2C3327]">
                          {settings?.currency || 'R$'} {item.price.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${
                              item.stockQty <= 15
                                ? 'bg-[#FDF0ED] text-[#BC6C25] border-[#F2C6B6]'
                                : 'bg-[#F2F5E8] text-[#588157] border-[#CCD5AE]'
                            }`}
                          >
                            {item.stockQty} {item.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleRestockQuick(item.id, 5)}
                              className="px-2 py-1 bg-[#F4F1EA] hover:bg-[#EAE6DC] text-[#2C3327] rounded text-[10px] font-bold transition"
                              title="Adicionar 5 ao estoque"
                            >
                              +5
                            </button>
                            <button
                              onClick={() => handleRestockQuick(item.id, 10)}
                              className="px-2 py-1 bg-[#F4F1EA] hover:bg-[#EAE6DC] text-[#2C3327] rounded text-[10px] font-bold transition"
                              title="Adicionar 10 ao estoque"
                            >
                              +10
                            </button>
                            <button
                              onClick={() => handleRestockQuick(item.id, 25)}
                              className="px-2 py-1 bg-[#F4F1EA] hover:bg-[#EAE6DC] text-[#2C3327] rounded text-[10px] font-bold transition"
                              title="Adicionar 25 ao estoque"
                            >
                              +25
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleOpenEditMinibarItem(item)}
                              className="p-1.5 text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA] rounded transition"
                              title="Editar item"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMinibarItem(item)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                              title="Excluir item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Consumption History */}
            <div className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6E3D8]">
                <div>
                  <h4 className="font-bold text-sm text-[#2C3327]">
                    Últimos Lançamentos de Frigobar
                  </h4>
                  <p className="text-xs text-[#6B705C]">Histórico de reposição e consumos registrados nos quartos</p>
                </div>
              </div>

              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
                {consumptions.slice(0, 8).map(c => (
                  <div
                    key={c.id}
                    className="p-3 bg-[#FDFBF7] rounded-xl border border-[#E6E3D8] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#2C3327]">Quarto {c.roomNumber}</span>
                        <span className="text-[#6B705C]">&bull; {c.guestName}</span>
                      </div>
                      <span className="text-[11px] text-[#6B705C]">
                        {c.quantity}x {c.itemName} &bull; Lançado por {c.registeredBy}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-[#2C3327] block">
                        {settings?.currency || 'R$'} {c.totalPrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F2F5E8] text-[#588157] font-semibold">
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
                {consumptions.length === 0 && (
                  <p className="text-xs text-[#8E9280] text-center py-4">Nenhum consumo registrado ainda.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Launch Consumption Card */}
          <div className="bg-white rounded-2xl border border-[#E6E3D8] p-6 shadow-xs h-fit space-y-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#E6E3D8]">
              <div className="p-2 bg-[#F2F5E8] rounded-xl text-[#588157]">
                <Wine className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#2C3327]">Lançar Consumo de Frigobar</h4>
                <p className="text-xs text-[#6B705C]">Debita estoque e fatura na conta do hóspede</p>
              </div>
            </div>

            {consumptionSuccessMsg && (
              <div className="p-3 bg-[#F2F5E8] border border-[#CCD5AE] text-[#588157] rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{consumptionSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleLaunchConsumption} className="space-y-4">
              {/* Select Room */}
              <div>
                <label className="block text-xs font-bold text-[#6B705C] mb-1">
                  Quarto / Hóspede *
                </label>
                <select
                  id="select-consumption-room"
                  required
                  value={consumptionRoomId}
                  onChange={e => setConsumptionRoomId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]"
                >
                  <option value="">Selecione o quarto...</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      Quarto {r.number} - {r.typeName} {r.currentGuestName ? `(${r.currentGuestName})` : `[${r.status}]`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Item */}
              <div>
                <label className="block text-xs font-bold text-[#6B705C] mb-1">
                  Item Consumido *
                </label>
                <select
                  id="select-consumption-item"
                  required
                  value={consumptionItemId}
                  onChange={e => setConsumptionItemId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]"
                >
                  <option value="">Selecione o item do frigobar...</option>
                  {minibarItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {settings?.currency || 'R$'} {item.price.toFixed(2)} (Estoque: {item.stockQty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#6B705C] mb-1">
                    Quantidade *
                  </label>
                  <input
                    id="input-consumption-qty"
                    type="number"
                    min="1"
                    required
                    value={consumptionQty}
                    onChange={e => setConsumptionQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B705C] mb-1">
                    Responsável
                  </label>
                  <input
                    type="text"
                    value={consumptionStaff}
                    onChange={e => setConsumptionStaff(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]"
                  />
                </div>
              </div>

              {/* Live Price Estimation */}
              {consumptionItemId && (
                <div className="p-3 bg-[#F4F1EA] rounded-xl border border-[#E6E3D8] text-xs flex items-center justify-between">
                  <span className="text-[#6B705C]">Total a faturar no quarto:</span>
                  <span className="font-extrabold text-sm text-[#2C3327]">
                    {settings?.currency || 'R$'}{' '}
                    {(
                      (minibarItems.find(i => i.id === consumptionItemId)?.price || 0) * consumptionQty
                    ).toFixed(2)}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={launchingConsumption}
                className="w-full py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center space-x-1.5"
              >
                <PackageCheck className="w-4 h-4" />
                <span>{launchingConsumption ? 'Lançando...' : 'Confirmar Lançamento no Folio'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PEDIDOS DE ROOM SERVICE & INTEGRAÇÃO FINANCEIRA         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'room_service' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Register New Room Service Order (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-[#E6E3D8] p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6E3D8]">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-[#F2F5E8] rounded-xl text-[#588157]">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#2C3327]">Novo Pedido de Room Service</h4>
                    <p className="text-xs text-[#6B705C]">
                      Selecione o quarto do hóspede, adicione itens do cardápio e envie para preparo na cozinha.
                    </p>
                  </div>
                </div>
              </div>

              {orderSuccessMsg && (
                <div className="p-3 bg-[#F2F5E8] border border-[#CCD5AE] text-[#588157] rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{orderSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handlePlaceRoomServiceOrder} className="space-y-4">
                {/* Room Selector */}
                <div>
                  <label className="block text-xs font-bold text-[#6B705C] mb-1">
                    Quarto de Destino *
                  </label>
                  <select
                    id="select-room-service-room"
                    required
                    value={orderRoomId}
                    onChange={e => setOrderRoomId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]"
                  >
                    <option value="">Selecione o quarto ocupado...</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>
                        Quarto {r.number} - {r.typeName} {r.currentGuestName ? `(${r.currentGuestName})` : `[${r.status}]`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Menu Items Selector */}
                <div>
                  <label className="block text-xs font-bold text-[#6B705C] mb-2">
                    Cardápio Gastronômico (Adicionar Itens ao Pedido)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {menuItems.map(item => {
                      const qty = orderItemsMap[item.id] || 0;
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border transition flex items-center justify-between ${
                            qty > 0
                              ? 'bg-[#F2F5E8] border-[#CCD5AE]'
                              : 'bg-[#FDFBF7] border-[#E6E3D8]'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-[#2C3327] block">{item.name}</span>
                            <span className="text-[10px] text-[#6B705C] block">
                              {item.category} &bull; {settings?.currency || 'R$'} {item.price.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleOrderItem(item.id, -1)}
                              disabled={qty === 0}
                              className="w-6 h-6 rounded-lg bg-white border border-[#E6E3D8] flex items-center justify-center text-xs font-bold text-[#2C3327] disabled:opacity-30"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-[#2C3327]">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleOrderItem(item.id, 1)}
                              className="w-6 h-6 rounded-lg bg-[#2C3327] text-white flex items-center justify-center text-xs font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Special Instructions & Delivery Fee */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#6B705C] mb-1">
                      Instruções Especiais / Observações de Cozinha
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: sem cebola, talheres para 2, servir às 20h"
                      value={orderSpecialNotes}
                      onChange={e => setOrderSpecialNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="check-delivery-fee"
                      checked={deliveryFeeIncluded}
                      onChange={e => setDeliveryFeeIncluded(e.target.checked)}
                      className="w-4 h-4 rounded text-[#588157] focus:ring-[#588157]"
                    />
                    <label htmlFor="check-delivery-fee" className="text-xs text-[#2C3327] font-semibold">
                      Taxa de Entrega de Room Service ({settings?.currency || 'R$'} 15,00)
                    </label>
                  </div>
                </div>

                {/* Order Summary & Submit */}
                <div className="p-4 bg-[#F4F1EA] rounded-xl border border-[#E6E3D8] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs space-y-0.5">
                    <div className="text-[#6B705C]">
                      Subtotal Itens: {settings?.currency || 'R$'} {orderCalculatedTotal.subtotal.toFixed(2)} | Taxa: {settings?.currency || 'R$'} {orderCalculatedTotal.fee.toFixed(2)}
                    </div>
                    <div className="text-sm font-extrabold text-[#2C3327]">
                      Total Faturado no Quarto: {settings?.currency || 'R$'} {orderCalculatedTotal.total.toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={orderSubmitting || Object.keys(orderItemsMap).length === 0}
                    className="px-6 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5 disabled:opacity-40"
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>{orderSubmitting ? 'Enviando...' : 'Enviar Pedido & Lançar no Financeiro'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Live Room Service Orders Tracker */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6E3D8]">
                <h4 className="font-bold text-sm text-[#2C3327]">Pedidos Ativos de Room Service</h4>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FEFAE0] text-[#D4A373] font-bold border border-[#E9EDC9]">
                  {activeRoomServiceOrders.length} em andamento
                </span>
              </div>

              <div className="mt-3 space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {roomServiceOrders.map(order => (
                  <div
                    key={order.id}
                    className="p-3.5 bg-[#FDFBF7] rounded-xl border border-[#E6E3D8] space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-[#2C3327]">Quarto {order.roomNumber}</span>
                          <span className="text-[#8E9280]">&bull; {order.orderNumber}</span>
                        </div>
                        <span className="text-[11px] text-[#6B705C]">{order.guestName}</span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'Entregue'
                            ? 'bg-[#F2F5E8] text-[#588157]'
                            : order.status === 'Em Preparo'
                            ? 'bg-[#FEFAE0] text-[#D4A373]'
                            : 'bg-[#F4F1EA] text-[#2C3327]'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="bg-white p-2 rounded-lg border border-[#E6E3D8] text-[11px] text-[#3D4035] space-y-0.5">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{it.quantity}x {it.name}</span>
                          <span className="text-[#6B705C]">
                            {settings?.currency || 'R$'} {(it.unitPrice * it.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {order.deliveryFee > 0 && (
                        <div className="flex justify-between text-[#8E9280] pt-1 border-t border-gray-100">
                          <span>Taxa de Entrega</span>
                          <span>{settings?.currency || 'R$'} {order.deliveryFee.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {order.specialInstructions && (
                      <p className="text-[10px] text-[#BC6C25] italic">
                        Obs: {order.specialInstructions}
                      </p>
                    )}

                    {/* Status Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#E6E3D8]">
                      <span className="font-extrabold text-[#2C3327]">
                        Total: {settings?.currency || 'R$'} {(order.totalAmount + (order.deliveryFee || 0)).toFixed(2)}
                      </span>

                      <div className="flex items-center space-x-1">
                        {order.status === 'Recebido' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'Em Preparo')}
                            className="px-2 py-1 bg-[#D4A373] text-white rounded text-[10px] font-bold"
                          >
                            Em Preparo
                          </button>
                        )}
                        {order.status === 'Em Preparo' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'Pronto')}
                            className="px-2 py-1 bg-[#4A6B82] text-white rounded text-[10px] font-bold"
                          >
                            Pronto
                          </button>
                        )}
                        {order.status === 'Pronto' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'Entregue')}
                            className="px-2 py-1 bg-[#588157] text-white rounded text-[10px] font-bold"
                          >
                            Entregue
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {roomServiceOrders.length === 0 && (
                  <p className="text-xs text-[#8E9280] text-center py-6">
                    Nenhum pedido de room service registrado.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: AUDITORIA & FATURAMENTO INTEGRADO                       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E6E3D8] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E3D8]">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-[#F2F5E8] rounded-xl text-[#588157]">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#2C3327]">
                    Integração Financeira de Quartos, Frigobar & Room Service
                  </h4>
                  <p className="text-xs text-[#6B705C]">
                    Todas as transações de frigobar e room service são faturadas automaticamente na conta do quarto e liquidadas no check-out.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#FDFBF7] rounded-xl border border-[#E6E3D8]">
                <span className="text-xs text-[#6B705C] block">Total Lançado em Frigobar</span>
                <span className="text-xl font-extrabold text-[#2C3327] font-serif mt-1 block">
                  {settings?.currency || 'R$'}{' '}
                  {consumptions.reduce((acc, c) => acc + c.totalPrice, 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-[#588157] font-semibold">{consumptions.length} consumos lançados</span>
              </div>

              <div className="p-4 bg-[#FDFBF7] rounded-xl border border-[#E6E3D8]">
                <span className="text-xs text-[#6B705C] block">Total Faturado Room Service</span>
                <span className="text-xl font-extrabold text-[#2C3327] font-serif mt-1 block">
                  {settings?.currency || 'R$'}{' '}
                  {roomServiceOrders.reduce((acc, o) => acc + o.totalAmount + (o.deliveryFee || 0), 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-[#D4A373] font-semibold">{roomServiceOrders.length} pedidos realizados</span>
              </div>

              <div className="p-4 bg-[#FDFBF7] rounded-xl border border-[#E6E3D8]">
                <span className="text-xs text-[#6B705C] block">Receita Combinada Extras</span>
                <span className="text-xl font-extrabold text-[#588157] font-serif mt-1 block">
                  {settings?.currency || 'R$'}{' '}
                  {(
                    consumptions.reduce((acc, c) => acc + c.totalPrice, 0) +
                    roomServiceOrders.reduce((acc, o) => acc + o.totalAmount + (o.deliveryFee || 0), 0)
                  ).toFixed(2)}
                </span>
                <span className="text-[10px] text-[#6B705C]">Sem necessidade de faturamento manual</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: CADASTRO / EDIÇÃO DE QUARTO                          */}
      {/* ------------------------------------------------------------- */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E6E3D8] my-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E3D8]">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-[#F2F5E8] rounded-xl text-[#2C3327]">
                  <BedDouble className="w-5 h-5 text-[#588157]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2C3327]">
                    {editingRoom ? `Editar Quarto ${editingRoom.number}` : 'Cadastrar Novo Quarto'}
                  </h3>
                  <p className="text-xs text-[#6B705C]">
                    Defina número, categoria, capacidade, preço e comodidades
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRoomModal(false)}
                className="text-[#8E9280] hover:text-[#2C3327] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#6B705C] mb-1">
                    Número do Quarto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 105, 204, 302"
                    value={roomFormData.number}
                    onChange={e => setRoomFormData(prev => ({ ...prev, number: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B705C] mb-1">
                    Andar / Piso *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    required
                    value={roomFormData.floor}
                    onChange={e => setRoomFormData(prev => ({ ...prev, floor: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]"
                  />
                </div>
              </div>

              {/* Category / Type Selector */}
              <div>
                <label className="block text-xs font-bold text-[#6B705C] mb-1">
                  Tipo / Categoria de Quarto *
                </label>
                <select
                  required
                  value={roomFormData.typeId}
                  onChange={e => handleRoomTypeChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]"
                >
                  {settings?.roomTypes.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Padrão: {settings?.currency || 'R$'} {t.basePrice} &bull; {t.capacityAdults} adultos)
                    </option>
                  ))}
                </select>
              </div>

              {/* Price & Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#6B705C] mb-1">
                    Preço da Diária ({settings?.currency || 'R$'}) *
                  </label>
                  <input
                    type="number"
                    min="50"
                    required
                    value={roomFormData.pricePerNight}
                    onChange={e => setRoomFormData(prev => ({ ...prev, pricePerNight: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B705C] mb-1">
                    Capacidade de Pessoas *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={roomFormData.capacity}
                    onChange={e => setRoomFormData(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]"
                  />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-xs font-bold text-[#6B705C] mb-1">
                  Comodidades do Quarto
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="Adicionar comodidade (ex: Banheira, Vista Mar)..."
                    value={amenityInput}
                    onChange={e => setAmenityInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAmenity();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddAmenity}
                    className="px-3 py-1.5 bg-[#F4F1EA] hover:bg-[#EAE6DC] text-[#2C3327] rounded-xl text-xs font-bold border border-[#E6E3D8]"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {roomFormData.amenities.map(a => (
                    <span
                      key={a}
                      className="px-2.5 py-1 rounded-lg text-xs bg-[#F4F1EA] text-[#2C3327] border border-[#E6E3D8] flex items-center space-x-1"
                    >
                      <span>{a}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAmenity(a)}
                        className="text-[#8E9280] hover:text-red-500 ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-bold text-[#6B705C] mb-1">
                  Observações Internas (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Quarto adaptado para acessibilidade PNE, voltagem 220V..."
                  value={roomFormData.notes}
                  onChange={e => setRoomFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E6E3D8]">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2 border border-[#E6E3D8] text-[#6B705C] hover:bg-[#F4F1EA] rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={roomSubmitting}
                  className="px-6 py-2 bg-[#2C3327] hover:bg-[#3A4135] text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  {roomSubmitting ? 'Salvando...' : editingRoom ? 'Salvar Alterações' : 'Cadastrar Quarto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: ALTERAÇÃO DE STATUS EM TEMPO REAL COM KANBAN SYNC     */}
      {/* ------------------------------------------------------------- */}
      {statusModalRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E6E3D8] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E3D8]">
              <div>
                <h3 className="text-base font-bold text-[#2C3327]">
                  Status do Quarto {statusModalRoom.number}
                </h3>
                <p className="text-xs text-[#6B705C]">{statusModalRoom.typeName}</p>
              </div>
              <button
                onClick={() => setStatusModalRoom(null)}
                className="text-[#8E9280] hover:text-[#2C3327] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmStatusChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#6B705C] mb-2">
                  Selecione o Novo Status em Tempo Real:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Disponivel', 'Ocupado', 'Limpeza', 'Manutencao', 'Bloqueado'] as RoomStatus[]).map(st => {
                    const b = getStatusBadge(st);
                    const isSelected = selectedNewStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSelectedNewStatus(st)}
                        className={`p-3 rounded-xl border text-left transition flex items-center space-x-2 ${
                          isSelected
                            ? 'ring-2 ring-[#2C3327] border-[#2C3327] bg-[#F4F1EA]'
                            : 'border-[#E6E3D8] hover:bg-[#FDFBF7]'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${b.dot}`}></span>
                        <span className="text-xs font-bold text-[#2C3327]">{b.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informative Note */}
              <div className="p-3 bg-[#F4F1EA] rounded-xl text-[11px] text-[#6B705C] flex items-start space-x-2">
                <Info className="w-4 h-4 text-[#588157] shrink-0 mt-0.5" />
                <span>
                  {selectedNewStatus === 'Limpeza' &&
                    'Ao definir como Limpeza, uma tarefa automática de higienização de quarto será gerada no Kanban da Governança.'}
                  {selectedNewStatus === 'Manutencao' &&
                    'Ao definir como Manutenção, um chamado técnico prioritário será gerado no Kanban da Manutenção.'}
                  {selectedNewStatus === 'Disponivel' &&
                    'Ao liberar para Disponível, as tarefas pendentes de limpeza/manutenção deste quarto são concluídas automaticamente.'}
                  {selectedNewStatus === 'Ocupado' &&
                    'Quartos ocupados mantêm o registro do hóspede e quarto ativo para room service.'}
                  {selectedNewStatus === 'Bloqueado' &&
                    'Quartos bloqueados não são ofertados no Motor de Reservas Online.'}
                </span>
              </div>

              {/* Status Note */}
              <div>
                <label className="block text-xs font-bold text-[#6B705C] mb-1">
                  Observações de Status / Motivo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Troca de enxoval completa, vazamento na pia, etc."
                  value={statusChangeNotes}
                  onChange={e => setStatusChangeNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E6E3D8]">
                <button
                  type="button"
                  onClick={() => setStatusModalRoom(null)}
                  className="px-4 py-2 border border-[#E6E3D8] text-[#6B705C] rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={statusSubmitting}
                  className="px-5 py-2 bg-[#2C3327] hover:bg-[#3A4135] text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  {statusSubmitting ? 'Salvando...' : 'Confirmar Mudança de Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: CADASTRO / EDIÇÃO DE ITEM DE FRIGOBAR                 */}
      {/* ------------------------------------------------------------- */}
      {showMinibarItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E6E3D8] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E3D8]">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-[#F2F5E8] rounded-xl text-[#588157]">
                  <Wine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2C3327]">
                    {editingMinibarItem ? 'Editar Item do Frigobar' : 'Cadastrar Item no Frigobar'}
                  </h3>
                  <p className="text-xs text-[#6B705C]">
                    Defina nome, categoria, preço e estoque inicial
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMinibarItemModal(false)}
                className="text-[#8E9280] hover:text-[#2C3327] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMinibarItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#6B705C] mb-1">
                  Nome do Item *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Água com Gás 500ml, Chocolate Lindt..."
                  value={minibarItemForm.name}
                  onChange={e => setMinibarItemForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#6B705C] mb-1">
                    Categoria *
                  </label>
                  <select
                    value={minibarItemForm.category}
                    onChange={e =>
                      setMinibarItemForm(prev => ({
                        ...prev,
                        category: e.target.value as MinibarItem['category']
                      }))
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none"
                  >
                    <option value="Bebidas">Bebidas</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Doces">Doces</option>
                    <option value="Vinhos">Vinhos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B705C] mb-1">
                    Unidade de Medida
                  </label>
                  <input
                    type="text"
                    placeholder="un, pct, garrafa, lata"
                    value={minibarItemForm.unit}
                    onChange={e => setMinibarItemForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#6B705C] mb-1">
                    Preço Unitário ({settings?.currency || 'R$'}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={minibarItemForm.price}
                    onChange={e => setMinibarItemForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B705C] mb-1">
                    Quantidade em Estoque *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={minibarItemForm.stockQty}
                    onChange={e => setMinibarItemForm(prev => ({ ...prev, stockQty: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs border border-[#E6E3D8] rounded-xl bg-[#FDFBF7] text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E6E3D8]">
                <button
                  type="button"
                  onClick={() => setShowMinibarItemModal(false)}
                  className="px-4 py-2 border border-[#E6E3D8] text-[#6B705C] rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={minibarSubmitting}
                  className="px-5 py-2 bg-[#2C3327] hover:bg-[#3A4135] text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  {minibarSubmitting ? 'Salvando...' : 'Salvar Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
