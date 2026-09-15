import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, X } from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { cancelReservationAtomicCloud } from '../services/reservationPages.ts';
import { Reservation } from '../types.ts';

const CANCELLABLE_STATUSES = new Set(['Pendente', 'Confirmada']);

const formatDate = (value: string) => {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

export const ReservationsCancelShortcut: React.FC = () => {
  const { reservations, settings, refreshData, hasPermission } = useHotel();
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canManage = hasPermission('manage_checkinout');
  const reservationsByTitle = useMemo(
    () => new Map(
      reservations.map(reservation => [
        `Abrir ${reservation.code} · ${reservation.guestName}`,
        reservation
      ])
    ),
    [reservations]
  );

  useEffect(() => {
    const syncShortcuts = () => {
      document
        .querySelectorAll<HTMLButtonElement>('button[title^="Abrir "]')
        .forEach(openButton => {
          const card = openButton.parentElement;
          if (!card?.classList.contains('z-10')) return;

          const baseTitle = openButton.dataset.paymentBaseTitle
            || openButton.title.split(' · Pagamento ')[0];
          const reservation = reservationsByTitle.get(baseTitle);
          const existing = card.querySelector<HTMLButtonElement>(':scope > button.reservation-cancel-shortcut');
          const eligible = Boolean(
            canManage
            && reservation
            && CANCELLABLE_STATUSES.has(reservation.status)
          );

          if (!eligible) {
            existing?.remove();
            card.removeAttribute('data-cancel-shortcut-card');
            return;
          }

          card.dataset.cancelShortcutCard = 'true';
          if (existing?.dataset.reservationId === reservation!.id) return;
          existing?.remove();

          const shortcut = document.createElement('button');
          shortcut.type = 'button';
          shortcut.className = 'reservation-cancel-shortcut';
          shortcut.dataset.reservationId = reservation!.id;
          shortcut.title = `Conferir cancelamento de ${reservation!.code}`;
          shortcut.setAttribute('aria-label', `Cancelar reserva ${reservation!.code}`);
          shortcut.textContent = '×';
          shortcut.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            setError('');
            setReason('');
            setSelected(reservation!);
          });
          card.appendChild(shortcut);
        });
    };

    const frame = window.requestAnimationFrame(syncShortcuts);
    const observer = new MutationObserver(syncShortcuts);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document
        .querySelectorAll<HTMLButtonElement>('button.reservation-cancel-shortcut')
        .forEach(button => button.remove());
      document
        .querySelectorAll<HTMLElement>('[data-cancel-shortcut-card]')
        .forEach(card => card.removeAttribute('data-cancel-shortcut-card'));
    };
  }, [reservationsByTitle, canManage]);

  useEffect(() => {
    if (!selected) return;
    const latest = reservations.find(item => item.id === selected.id);
    if (!latest || !CANCELLABLE_STATUSES.has(latest.status)) {
      setSelected(null);
      setReason('');
      setError('');
      return;
    }
    if (latest !== selected) setSelected(latest);
  }, [reservations, selected?.id]);

  const money = (value: number) => `${settings?.currency || 'R$'} ${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

  const close = () => {
    if (busy) return;
    setSelected(null);
    setReason('');
    setError('');
  };

  const confirmCancel = async () => {
    if (!selected) return;
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setError('Informe o motivo do cancelamento para manter o histórico da reserva.');
      return;
    }

    try {
      setBusy(true);
      setError('');
      await cancelReservationAtomicCloud(selected.id, cleanReason);
      await refreshData();
      setSelected(null);
      setReason('');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível cancelar a reserva.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <style>{`
        div.z-10.mx-1.my-3.h-10.rounded-lg[data-cancel-shortcut-card='true'] {
          position: relative;
        }

        .reservation-cancel-shortcut {
          position: absolute;
          left: 3px;
          top: 3px;
          z-index: 40;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          border: 1px solid rgba(185, 28, 28, 0.55);
          background: rgba(255, 255, 255, 0.96);
          color: #991b1b;
          font-size: 12px;
          line-height: 11px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(0.88);
          transition: opacity 120ms ease, transform 120ms ease, background 120ms ease;
          box-shadow: 0 1px 4px rgba(127, 29, 29, 0.18);
        }

        div.z-10.mx-1.my-3.h-10.rounded-lg[data-cancel-shortcut-card='true']:hover > .reservation-cancel-shortcut,
        .reservation-cancel-shortcut:focus-visible {
          opacity: 1;
          transform: scale(1);
        }

        .reservation-cancel-shortcut:hover {
          background: #fee2e2;
        }
      `}</style>

      {selected && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]"
          onMouseDown={event => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-red-200 bg-[#FDFBF7] shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-red-100 bg-white px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-700">
                  <Ban className="h-4 w-4" /> Cancelamento de reserva
                </div>
                <h3 className="mt-1 text-lg font-black text-[#2C3327]">{selected.guestName}</h3>
                <p className="mt-1 text-xs text-[#6B705C]">{selected.code} · Quarto {selected.roomNumber}</p>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="rounded-xl p-2 text-[#6B705C] hover:bg-[#F4F1EA] disabled:opacity-50"
                aria-label="Fechar cancelamento"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[#E6E3D8] bg-white p-4 text-xs">
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-wide text-[#8A8F7D]">Período</span>
                  <strong className="mt-1 block text-[#2C3327]">{formatDate(selected.checkInDate)} → {formatDate(selected.checkOutDate)}</strong>
                </div>
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-wide text-[#8A8F7D]">Hospedagem</span>
                  <strong className="mt-1 block text-[#2C3327]">{selected.nights} diária(s)</strong>
                </div>
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-wide text-[#8A8F7D]">Pagamento</span>
                  <strong className="mt-1 block text-[#2C3327]">{selected.paymentStatus}</strong>
                </div>
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-wide text-[#8A8F7D]">Total</span>
                  <strong className="mt-1 block text-[#2C3327]">{money(selected.totalNightsAmount)}</strong>
                </div>
              </div>

              <div className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>O atalho apenas abriu esta conferência. A reserva só será cancelada após informar o motivo e clicar em <strong>Cancelar reserva</strong>.</span>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-[#2C3327]">Motivo do cancelamento *</span>
                <textarea
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  rows={3}
                  disabled={busy}
                  placeholder="Ex.: solicitação do hóspede, duplicidade, alteração de viagem..."
                  className="w-full resize-none rounded-2xl border border-[#DADFD1] bg-white px-3 py-2.5 text-sm text-[#2C3327] outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-60"
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700">{error}</div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  className="rounded-xl border border-[#DADFD1] bg-white px-4 py-2.5 text-xs font-black text-[#3D4035] hover:bg-[#F4F1EA] disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={confirmCancel}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Ban className="h-4 w-4" />
                  {busy ? 'Cancelando...' : 'Cancelar reserva'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
