import React, { useState, useEffect } from 'react';
import { Tenant, AuthUser } from '../types';
import { saasStore } from '../services/storage';
import { Tv, Lock, Mail, ArrowRight, Shield } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  slugParam?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, slugParam }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedTenant, setDetectedTenant] = useState<Tenant | null>(null);

  // Detectar tenant por slug se fornecido na URL (ex: ?app=cinefp)
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
    setIsLoading(true);

    try {
      const result = saasStore.login(email, senha);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.message || 'Credenciais inválidas. Verifique seu email e senha.');
      }
    } catch {
      setError('Erro ao processar autenticação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const brandName = detectedTenant ? detectedTenant.nomeApp : 'Central de Acesso';
  const brandColor = detectedTenant ? detectedTenant.corPrimaria : '#00E5FF';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0A0F1D] relative overflow-hidden">
      
      {/* Background Atmosphere */}
      <div 
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[140px] opacity-20 pointer-events-none transition-colors"
        style={{ backgroundColor: brandColor }}
      />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-cyan-600/10 blur-[140px] pointer-events-none" />

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

          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
            {detectedTenant
              ? `Portal Oficial · Acesso Exclusivo ${detectedTenant.nomeApp}`
              : 'Entre com seu email e senha para acessar o painel'}
          </p>
        </div>

        {/* Card Formulário */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 bg-[#0E1526]/80 backdrop-blur-xl">
          
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
              <span>{error}</span>
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
                  autoComplete="email"
                  className="w-full bg-[#070B14] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Senha
                </label>
                <span className="text-[11px] text-slate-500 hover:text-slate-400 transition-colors cursor-pointer">
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
                  autoComplete="current-password"
                  className="w-full bg-[#070B14] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <span>{isLoading ? 'Autenticando...' : 'Entrar no Painel'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>

        {/* Rodapé Seguro e Discreto */}
        <div className="text-center mt-6 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          <span>Ambiente seguro e protegido por criptografia de ponta a ponta.</span>
        </div>

      </div>
    </div>
  );
};
