from pathlib import Path

changes = {}

def replace(path, old, new):
    data = changes.get(path, Path(path).read_text(encoding='utf-8'))
    count = data.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected exactly one match, got {count}: {old[:70]!r}')
    changes[path] = data.replace(old, new, 1)

helper = 'src/services/reservationAlertNavigation.ts'
replace(helper, "  sessionStorage.setItem(RESERVATION_NAVIGATION_KEY, JSON.stringify({ reservationId: sourceId }));\n", "  sessionStorage.setItem(RESERVATION_NAVIGATION_KEY, JSON.stringify({ reservationId: sourceId }));\n  window.dispatchEvent(new Event('hotel:reservation-navigation'));\n")

bell = 'src/components/OperationalAlertsBell.tsx'
replace(bell, "import { OperationalAlertNotificationToast } from './OperationalAlertNotificationToast.tsx';\n", "import { OperationalAlertNotificationToast } from './OperationalAlertNotificationToast.tsx';\nimport { prepareReservationAlertNavigation } from '../services/reservationAlertNavigation.ts';\n")
replace(bell, "    if (receptionModule) {\n      setOpen(false);\n      window.dispatchEvent(new CustomEvent('hotel:navigate-standalone-module', { detail: { module: receptionModule } }));", "    if (receptionModule) {\n      prepareReservationAlertNavigation(item.sourceType, item.sourceId);\n      setOpen(false);\n      window.dispatchEvent(new CustomEvent('hotel:navigate-standalone-module', { detail: { module: receptionModule } }));")

center = 'src/components/OperationalAlertsCenter.tsx'
replace(center, "import { AdminTab } from '../types.ts';\n", "import { AdminTab } from '../types.ts';\nimport { prepareReservationAlertNavigation } from '../services/reservationAlertNavigation.ts';\n")
replace(center, "    if (receptionModule) {\n      window.dispatchEvent(new CustomEvent('hotel:close_operational_alerts'));", "    if (receptionModule) {\n      prepareReservationAlertNavigation(item.sourceType, item.sourceId);\n      window.dispatchEvent(new CustomEvent('hotel:close_operational_alerts'));")

manager = 'src/components/ReservationsManager.tsx'
replace(manager, "import { loadGuestsCloud } from '../services/adminPages.ts';\n", "import { loadGuestsCloud } from '../services/adminPages.ts';\nimport { RESERVATION_NAVIGATION_KEY } from '../services/reservationAlertNavigation.ts';\n")
replace(manager, "const RESERVATION_NAVIGATION_KEY = 'novohotel:reservation-navigation';\n", '')
source = changes[manager]
begin = "  useEffect(() => {\n    try {\n      const raw = sessionStorage.getItem(RESERVATION_NAVIGATION_KEY);"
finish = "  }, [today]);\n\n  const timelineEnd"
assert source.count(begin) == 1 and source.count(finish) == 1, 'reservation effect anchors not unique'
start = source.index(begin)
end = source.index(finish, start) + len('  }, [today]);\n')
effect = '''  useEffect(() => {
    const applyNavigationIntent = () => {
      try {
        const raw = sessionStorage.getItem(RESERVATION_NAVIGATION_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as { filter?: DashboardReservationFilter; reservationId?: string };

        if (parsed.reservationId) {
          const reservation = reservations.find(item => item.id === parsed.reservationId);
          // Keep the intent until asynchronous reservations have been loaded.
          if (!reservation) return;
          sessionStorage.removeItem(RESERVATION_NAVIGATION_KEY);
          setSearch('');
          setRoomTypeFilter('ALL');
          setFloorFilter('ALL');
          setTimelineStart(today);
          setArchiveOpen(false);
          setStatusFilter('ALL');
          setOperationalView('active');
          setDashboardFilter('ALL');
          setSelectedActionMode(null);
          setSelectedReservation(reservation);
          return;
        }

        sessionStorage.removeItem(RESERVATION_NAVIGATION_KEY);
        if (!parsed.filter || !['ARRIVALS_TODAY', 'DEPARTURES_TODAY', 'PENDING'].includes(parsed.filter)) return;

        setSearch('');
        setRoomTypeFilter('ALL');
        setFloorFilter('ALL');
        setTimelineStart(today);
        setArchiveOpen(false);
        setSelectedReservation(null);
        setDashboardFilter(parsed.filter);

        if (parsed.filter === 'DEPARTURES_TODAY') {
          setStatusFilter('CheckIn');
          setOperationalView('staying');
        } else if (parsed.filter === 'PENDING') {
          setStatusFilter('Pendente');
          setOperationalView('active');
        } else {
          setStatusFilter('ALL');
          setOperationalView('active');
        }
      } catch {
        // Keep the default Central de Reservas view if transient navigation state is unavailable.
        sessionStorage.removeItem(RESERVATION_NAVIGATION_KEY);
      }
    };

    window.addEventListener('hotel:reservation-navigation', applyNavigationIntent);
    applyNavigationIntent();
    return () => window.removeEventListener('hotel:reservation-navigation', applyNavigationIntent);
  }, [today, reservations]);
'''
changes[manager] = source[:start] + effect + source[end:]
assert len(changes) == 4
for path, data in changes.items():
    Path(path).write_text(data, encoding='utf-8')
    print(f'Updated {path}')
