import React, { useState, useEffect } from 'react';
import { Tenant, AuthUser } from '../types';
import { saasStore } from '../services/storage';
import { Tv, ShieldCheck, Lock, Mail, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  slugParam?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, slugParam }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detectedTenant, setDetectedTenant] = useState<Tenant | null>(null);

  // Detectar tenant por slug se fornecido
  useEffect(() => {
    if (slugParam) {
      const tenant = saasStore.getTenantBySlug(slugParam);
      if (tenant) {
        setDetectedTenant(tenant);
      }
    }
  }, [slugParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = saasStore.login(email, senha);
    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else {
      setError(result.message || 'Credenciais inválidas.');
    }
  };

  const quickLogin = (userEmail: string, userPass = '123') => {
    setEmail(userEmail);
    setSenha(userPass);
    const result = saasStore.login(userEmail, userPass);
    if (result.success && result.user) {
      onLoginSuccess(result.user);
    }
  };

  const brandName = detectedTenant ? detectedTenant.nomeApp : 'StreamMaster SaaS';
  const brandColor = detectedTenant ? detectedTenant.corPrimaria : '#00E5FF';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0A0F1D] relative overflow-hidden">
      
      {/* Background Neon Atmosphere */}
      <div 
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[140px] opacity-20 pointer-events-none transition-colors"
        style={{ backgroundColor: brandColor }}
      />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-cyan-600/15 blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            {detectedTenant?.logoUrl ? (
              <img
                src={detectedTenant.logoUrl}
                alt={brandName}
                className="w-16 h-16 rounded-2xl object-cover shadow-2xl ring-2 ring-white/10"
              />
            ) : (
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl text-black font-black"
                style={{ backgroundColor: brandColor }}
              >
                <Tv className="w-8 h-8" />
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {brandName}
          </h1>

          <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto">
            {detectedTenant
              ? `Portal Oficial de Revenda e Acesso Exclusivo ${detectedTenant.nomeApp}`
              : 'Plataforma SaaS Multi-Tenant de Revenda White-Label para Streaming'}
          </p>
        </div>

        {/* Card Formulário */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl">
          
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Senha
                </label>
                <span className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-400">
                  Esqueceu a senha?
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <span>Entrar no Painel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Seção de Login Rápido (Demonstração dos 3 Níveis) */}
          <div className="mt-6 pt-5 border-t border-white/8">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Acesso Rápido para Testes:</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => quickLogin('admin@streammaster.com')}
                className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Nível 1 · Super Admin (Dono SaaS)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">admin@streammaster.com</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => quickLogin('roberto@cinefp.com')}
                className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Nível 2 · Dono do App (CINEFP TV)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">roberto@cinefp.com</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => quickLogin('lucas@revendacine.com')}
                className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 transition-all flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nível 3 · Revendedor (26 créditos)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">lucas@revendacine.com</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>

        </div>

        {/* Rodapé Seguro */}
        <div className="text-center mt-6 text-[11px] text-slate-500">
          Sessões criptografadas com isolamento estrito de inquilino e conexão REST ao Baserow.
        </div>

      </div>
    </div>
  );
};
