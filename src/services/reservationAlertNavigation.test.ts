import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareReservationAlertNavigation, RESERVATION_NAVIGATION_KEY } from './reservationAlertNavigation.ts';

describe('prepareReservationAlertNavigation', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('preserves the reservation ID for a reservation alert', () => {
    prepareReservationAlertNavigation('reservation', 'reservation-123');
    expect(JSON.parse(sessionStorage.getItem(RESERVATION_NAVIGATION_KEY) || '{}')).toEqual({ reservationId: 'reservation-123' });
  });

  it('does not overwrite navigation for unrelated alerts or missing IDs', () => {
    prepareReservationAlertNavigation('room', 'room-123');
    prepareReservationAlertNavigation('reservation', '');
    expect(sessionStorage.getItem(RESERVATION_NAVIGATION_KEY)).toBeNull();
  });
});
