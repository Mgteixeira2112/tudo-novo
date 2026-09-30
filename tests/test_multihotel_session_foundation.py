import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class MultiHotelSessionFoundationTests(unittest.TestCase):
    def read(self, path: str) -> str:
        return (ROOT / path).read_text(encoding="utf-8")

    def test_session_is_derived_from_memberships(self):
        src = self.read("src/services/tenantSession.ts")
        self.assertIn(".from('hotel_memberships')", src)
        self.assertIn(".eq('user_id', userId)", src)
        self.assertIn(".from('hoteis')", src)
        self.assertIn("HOTEL_TENANT_NOT_ALLOWED", src)
        self.assertIn("novohotel_active_hotel_id", src)

    def test_core_reads_are_hotel_scoped(self):
        pages = self.read("src/services/pagesData.ts")
        self.assertGreaterEqual(pages.count(".eq('hotel_id', hotelId)"), 2)
        self.assertIn("const hotelId = requireActiveHotelId();", pages)

        guests = self.read("src/services/adminPages.ts")
        self.assertIn(".from('guests').select('*').eq('hotel_id', hotelId)", guests)
        self.assertIn("hotel_id: hotelId", guests)
        self.assertIn(".eq('id', id).eq('hotel_id', hotelId)", guests)

    def test_settings_use_hotel_specific_rpcs(self):
        src = self.read("src/services/settingsPages.ts")
        self.assertIn("get_hotel_settings_admin_for_hotel", src)
        self.assertIn("update_hotel_settings_safe_for_hotel", src)
        self.assertIn("p_hotel_id: hotelId", src)
        self.assertNotIn("rpc('get_hotel_settings_admin')", src)
        self.assertNotIn("rpc('update_hotel_settings_safe'", src)

    def test_realtime_is_hotel_scoped(self):
        for path in (
            "src/services/roomsRealtime.ts",
            "src/services/reservationsRealtime.ts",
        ):
            src = self.read(path)
            self.assertIn("hotelId?: string", src)
            self.assertIn("hotel_id=eq.${config.hotelId}", src)

        app = self.read("src/App.tsx")
        self.assertGreaterEqual(app.count("hotelId: activeHotel?.id"), 2)

    def test_context_establishes_tenant_before_private_refresh(self):
        src = self.read("src/context/HotelContext.tsx")
        self.assertIn("await establishTenantSession(staff.id);", src)
        self.assertIn("availableHotels", src)
        self.assertIn("activeHotel", src)
        self.assertIn("selectActiveHotel", src)
        self.assertIn("clearActiveHotelId();", src)

    def test_settings_rpc_requires_hotel_access(self):
        sql = self.read("supabase/migrations/20260930223000_multihotel_settings_rpc.sql")
        self.assertIn("user_has_hotel_access(p_hotel_id)", sql)
        self.assertIn("where id = p_hotel_id", sql)
        self.assertIn("join public.hotel_memberships hm", sql)
        self.assertIn("hm.hotel_id = p_hotel_id", sql)
        self.assertIn("revoke all on function public.get_hotel_settings_admin_for_hotel", sql)
        self.assertIn("grant execute on function public.get_hotel_settings_admin_for_hotel", sql)

if __name__ == "__main__":
    unittest.main()
