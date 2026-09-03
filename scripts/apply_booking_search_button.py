from pathlib import Path
p=Path('src/components/OnlineBookingEngine.tsx')
s=p.read_text()
s=s.replace("  Check\n} from 'lucide-react';", "  Check,\n  Search\n} from 'lucide-react';")
anchor="""  const handleOpenBooking = (roomType: RoomTypeConfig) => {\n    setSelectedRoomType(roomType);\n    setConfirmedReservation(null);\n    setErrorMessage(null);\n  };\n"""
insert="""  const handleOpenBooking = (roomType: RoomTypeConfig) => {\n    setSelectedRoomType(roomType);\n    setConfirmedReservation(null);\n    setErrorMessage(null);\n  };\n\n  const handleSearchAvailability = () => {\n    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {\n      setErrorMessage('Selecione uma data de saída posterior à data de entrada.');\n      return;\n    }\n    setErrorMessage(null);\n    document.getElementById('available-room-types')?.scrollIntoView({ behavior: 'smooth', block: 'start' });\n  };\n"""
if anchor not in s: raise SystemExit('anchor handler not found')
s=s.replace(anchor,insert,1)
s=s.replace('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end','grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 items-end',1)
summary="""          <div className=\"bg-[#F2F5E8] border border-[#CCD5AE] rounded-xl p-2.5 flex items-center justify-between text-xs\">\n            <div>\n              <span className=\"text-[#6B705C] block\">Estadia calculada:</span>\n              <span className=\"font-bold text-[#2C3327] text-sm\">\n                {nights} {nights === 1 ? 'noite' : 'noites'}\n              </span>\n            </div>\n            <div className=\"text-right\">\n              <span className=\"text-[#6B705C] block\">Check-in:</span>\n              <span className=\"font-semibold text-[#2C3327]\">{settings?.checkInTime || '14:00'}</span>\n            </div>\n          </div>\n"""
button=summary+"""\n          <button\n            id=\"btn-search-availability\"\n            type=\"button\"\n            onClick={handleSearchAvailability}\n            className=\"w-full min-h-[42px] flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-sm font-bold shadow-sm transition\"\n          >\n            <Search className=\"w-4 h-4\" />\n            <span>Buscar disponibilidade</span>\n          </button>\n"""
if summary not in s: raise SystemExit('summary block not found')
s=s.replace(summary,button,1)
s=s.replace('<section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-7 sm:mt-8 space-y-4">','<section id="available-room-types" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-7 sm:mt-8 space-y-4 scroll-mt-6">',1)
p.write_text(s)

# trigger
