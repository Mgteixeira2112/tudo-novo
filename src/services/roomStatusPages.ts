import { Room, RoomStatus } from '../types.ts';
import { createOperationalNotification } from './operationalNotifications.ts';
import { getSupabaseClient } from './supabase.ts';

function mapRoomRow(row: any): Room {
  return {
    id: row.id,
    number: row.number,
    typeId: row.type_id,
    typeName: row.type_name,
    floor: Number(row.floor || 1),
    status: row.status,
    pricePerNight: Number(row.price_per_night || 0),
    capacity: Number(row.capacity || 1),
    currentReservationId: row.current_reservation_id || undefined,
    currentGuestName: row.current_guest_name || undefined,
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    notes: row.notes || undefined
  } as Room;
}

export async function updateRoomStatusSafeCloud(
  roomId: string,
  status: RoomStatus,
  notes?: string
): Promise<Room> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('update_room_status_safe', {
    p_room_id: roomId,
    p_status: status,
    p_notes: notes ?? null
  });

  if (error) throw error;
  if (!data) throw new Error('Quarto não encontrado após atualização.');

  const room = mapRoomRow(data);

  if (room.status === 'Manutencao') {
    try {
      await createOperationalNotification({
        type: 'room_maintenance_required',
        priority: 'attention',
        title: `Quarto ${room.number} em manutenção`,
        message: `O quarto ${room.number} entrou em manutenção e está indisponível para a operação.`,
        general: true,
        sourceType: 'maintenance_room_status',
        sourceId: room.id
      });
    } catch (alertError) {
      console.warn('[Central de Alertas] Não foi possível publicar o alerta geral de manutenção.', alertError);
    }
  }

  return room;
}
