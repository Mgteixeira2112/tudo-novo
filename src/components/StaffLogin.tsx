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

export const StaffLogin: React.FC = () => {
  const { login, bootstrapAdmin, settings, supabaseStatus } = useHotel();

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

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBootstrap = async () => {
    if (!email || !password) {
      setErrorMessage('Informe o e-mail e a senha desejados para o primeiro administrador.');
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await bootstrapAdmin(email.trim(), password);
      if (result.requiresEmailConfirmation) {
        setErrorMessage('Conta criada. Confirme o e-mail no Supabase e depois use o botão de login.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Não foi possível criar o administrador inicial.');
    } finally {
      setSubmitting(false);
    }
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

            <div className="p-4 rounded-2xl bg-white border border-[#E6E3D8] text-xs text-[#6B705C] leading-relaxed">
              O acesso administrativo exige uma conta ativa no Supabase Auth e um perfil de colaborador ativo no hotel.
              Não existem mais atalhos de demonstração ou troca de usuário sem autenticação.
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-[#E6E3D8] flex items-center justify-between text-[11px] text-[#6B705C]">
            <span className="flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-[#588157]" />
              <span>{supabaseStatus?.connected ? 'Supabase Auth Online' : 'Supabase Auth não configurado'}</span>
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

            <button
              type="button"
              onClick={handleBootstrap}
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-white hover:bg-[#F4F1EA] text-[#2C3327] rounded-2xl text-xs font-bold transition border border-[#CCD5AE] disabled:opacity-50"
            >
              Criar primeiro administrador
            </button>

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
