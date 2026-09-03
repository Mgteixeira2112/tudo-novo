import React, { useState } from 'react';
import {
  Hotel,
  ShieldCheck,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  UserCheck,
  Building2,
  Sparkles,
  AlertCircle,
  Loader2,
  Database
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { ROLE_DEFINITIONS, SECTOR_DEFINITIONS } from '../services/rbac.ts';
import { StaffUser } from '../types.ts';

export const StaffLogin: React.FC = () => {
  const { login, allUsers, switchUser, settings, supabaseStatus } = useHotel();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Por favor, informe o e-mail e a senha do colaborador.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const result = await login(email.trim(), password);
    setSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
    }
  };

  const handleQuickSelect = (user: StaffUser) => {
    switchUser(user);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl border border-[#E6E3D8] shadow-2xl overflow-hidden animate-fade-in">
        {/* Left Col: Hotel Brand & Quick Sector Pickers */}
        <div className="md:col-span-6 bg-[#FDFBF7] p-6 sm:p-8 border-b md:border-b-0 md:border-r border-[#E6E3D8] flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-[#2C3327] text-[#FDFBF7] rounded-2xl shadow-sm">
                <Hotel className="w-6 h-6 text-[#CCD5AE]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#2C3327] tracking-tight">
                  {settings?.hotelName || 'SaaS Hoteleiro'}
                </h2>
                <span className="text-xs text-[#6B705C]">
                  Portal do Colaborador & Controle de Acesso (RBAC)
                </span>
              </div>
            </div>

            <p className="text-xs text-[#3D4035] leading-relaxed mb-6">
              Acesso seguro com <strong>Supabase Auth</strong> e setorização operacional. O sistema filtra automaticamente as abas, relatórios financeiros e ações conforme o cargo do colaborador.
            </p>

            {/* Quick Sector Login Simulators */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B705C]">
                  Acesso Rápido por Setor / Função
                </span>
                <span className="text-[10px] text-[#588157] font-semibold bg-[#E9EDC9] px-2 py-0.5 rounded-full">
                  1-Click Demo
                </span>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {allUsers.map(user => {
                  const roleDef = ROLE_DEFINITIONS[user.role];
                  const sectorDef = SECTOR_DEFINITIONS[user.sector];

                  return (
                    <button
                      key={user.id}
                      onClick={() => handleQuickSelect(user)}
                      className="w-full group p-2.5 rounded-2xl bg-white hover:bg-[#E9EDC9]/40 border border-[#E6E3D8] hover:border-[#CCD5AE] flex items-center justify-between text-left transition shadow-2xs"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img
                          src={
                            user.avatarUrl ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
                          }
                          alt={user.fullName}
                          className="w-8 h-8 rounded-xl object-cover border border-[#E6E3D8] shrink-0"
                        />
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-[#2C3327] truncate group-hover:text-[#588157] transition">
                            {user.fullName}
                          </h4>
                          <span className="text-[10px] text-[#6B705C] truncate block">
                            {roleDef?.title} • {sectorDef?.label}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                          roleDef?.badgeColor || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        Entrar &rarr;
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-[#E6E3D8] flex items-center justify-between text-[11px] text-[#6B705C]">
            <span className="flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-[#588157]" />
              <span>{supabaseStatus?.connected ? 'Supabase Auth Online' : 'Auth Local Habilitado'}</span>
            </span>
            <span className="font-mono text-[10px] text-[#8E9280]">v2.4 RBAC</span>
          </div>
        </div>

        {/* Right Col: Direct Login Form */}
        <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full space-y-6">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#E9EDC9] text-[#2C3327] text-xs font-bold mb-3 border border-[#CCD5AE]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#588157]" />
                <span>Autenticação de Segurança</span>
              </div>
              <h3 className="text-xl font-bold text-[#2C3327]">Entrar no Sistema</h3>
              <p className="text-xs text-[#6B705C] mt-1">
                Digite as credenciais corporativas do seu usuário Supabase.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2C3327] mb-1.5">
                  E-mail do Colaborador
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B705C]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ex: admin@horizontehotel.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#E6E3D8] bg-[#FDFBF7] text-xs focus:ring-2 focus:ring-[#588157] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3327] mb-1.5">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B705C]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#E6E3D8] bg-[#FDFBF7] text-xs focus:ring-2 focus:ring-[#588157] focus:outline-none"
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-[10px] text-[#6B705C]">
                    Senha padrão demo: <code className="font-mono font-bold">admin123</code>
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-[#2C3327] hover:bg-[#3D4035] text-white rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Autenticando sessão...</span>
                  </>
                ) : (
                  <>
                    <span>Acessar Painel Operacional</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="p-3 bg-[#F4F1EA] rounded-2xl border border-[#E6E3D8] text-[11px] text-[#6B705C] space-y-1">
              <span className="font-bold text-[#2C3327] block">Políticas de Segurança:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                <li>Governança e Manutenção visualizam apenas os kanbans operacionais.</li>
                <li>Cozinha tem visão restrita ao Frigobar & Pedidos de Room Service.</li>
                <li>Finanças e Quartos restritos à Diretoria, Gerência e Recepção.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
