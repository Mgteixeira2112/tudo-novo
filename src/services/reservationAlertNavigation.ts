export const RESERVATION_NAVIGATION_KEY = 'novohotel:reservation-navigation';

/** Preserve the exact reservation origin before navigating to the reservations module. */
export function prepareReservationAlertNavigation(sourceType: string | null | undefined, sourceId: string | null | undefined): void {
  if (sourceType?.toLowerCase() !== 'reservation' || !sourceId?.trim()) return;
  sessionStorage.setItem(RESERVATION_NAVIGATION_KEY, JSON.stringify({ reservationId: sourceId }));
}
