from pathlib import Path
p=Path('src/components/OnlineBookingEngine.tsx')
s=p.read_text()
repls={
'    <div className="min-h-screen bg-[#FDFBF7] pb-20">':'    <div className="min-h-screen bg-[#FDFBF7] pb-12">',
'      <section className="relative bg-[#2C3327] text-[#FDFBF7] pt-14 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">':'      <section className="relative bg-[#2C3327] text-[#FDFBF7] pt-8 sm:pt-10 pb-14 sm:pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">',
'        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-4">':'        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-3">',
'          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#FDFBF7]">':'          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-[#FDFBF7]">',
'      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">':'      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-7 sm:-mt-8 relative z-20">',
'        <div className="bg-white rounded-2xl shadow-xl border border-[#E6E3D8] p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">':'        <div className="bg-white rounded-2xl shadow-xl border border-[#E6E3D8] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end">',
'      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-6">':'      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-7 sm:mt-8 space-y-4">',
'        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">':'        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">',
'                className="bg-white rounded-2xl border border-[#E6E3D8] overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"':'                className="bg-white rounded-2xl border border-[#E6E3D8] overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between min-h-0"',
'                  <div className="h-52 w-full relative bg-[#F4F1EA] overflow-hidden">':'                  <div className="h-36 sm:h-40 lg:h-44 w-full relative bg-[#F4F1EA] overflow-hidden">',
'                  <div className="p-5 space-y-3">':'                  <div className="p-4 space-y-2.5">',
'                <div className="p-5 pt-3 border-t border-[#E6E3D8] bg-[#FDFBF7] flex items-center justify-between">':'                <div className="p-4 pt-3 border-t border-[#E6E3D8] bg-[#FDFBF7] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">',
'                    className="flex items-center space-x-1.5 px-4 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow-sm transition"':'                    className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow-sm transition shrink-0"',
'      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">':'      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">'
}
for a,b in repls.items():
    if a not in s: raise SystemExit(f'missing pattern: {a[:80]}')
    s=s.replace(a,b,1)
p.write_text(s)
