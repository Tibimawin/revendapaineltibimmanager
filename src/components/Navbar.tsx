import React from 'react';
import { AuthUser } from '../types';
import { saasStore } from '../services/storage';
import { 
  Tv, 
  ShieldCheck, 
  LogOut, 
  Coins, 
  User,
  ArrowLeft,
  Eye
} from 'lucide-react';

interface NavbarProps {
  currentUser: AuthUser;
  onLogout: () => void;
  onOpenPixModal?: () => void;
  onStopImpersonation?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenPixModal,
  onStopImpersonation,
}) => {
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isTenantOwner = currentUser.role === 'TENANT_OWNER';
  const isReseller = currentUser.role === 'RESELLER';

  const tenant = currentUser.tenant;
  const reseller = currentUser.reseller;
  const impersonator = currentUser.impersonatedBy;

  const appName = isSuperAdmin
    ? 'STREAMMASTER'
    : (tenant?.nomeApp || 'PORTAL DO USUÁRIO');

  const brandColor = tenant?.corPrimaria || '#00E5FF';

  return (
    <>
      {/* Banner de Impersonação / Modo de Visualização (Exibido apenas quando Dono/Admin está inspecionando uma conta) */}
      {impersonator && (
        <div className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-black px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-black shrink-0" />
            <span>
              Modo de Visualização: Você está visualizando como <strong className="underline">{currentUser.nome}</strong> ({isReseller ? 'Revendedor' : 'Dono'}).
            </span>
          </div>
          <button
            onClick={() => {
              if (onStopImpersonation) {
                onStopImpersonation();
              } else {
                saasStore.stopImpersonation();
              }
            }}
            className="flex items-center gap-1.5 bg-black text-amber-300 hover:text-white px-3 py-1 rounded-lg text-xs font-black shadow transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Meu Painel ({impersonator.name})</span>
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 w-full bg-[#0A0F1D]/90 backdrop-blur-md border-b border-white/8 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* ZONA 1: Marca do Aplicativo */}
          <div className="flex items-center gap-3 shrink-0">
            {tenant?.logoUrl ? (
              <img 
                src={tenant.logoUrl} 
                alt={appName} 
                className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/10"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div 
                className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white shadow-sm"
                style={{ backgroundColor: brandColor }}
              >
                {isSuperAdmin ? <ShieldCheck className="w-5 h-5 text-black" /> : <Tv className="w-5 h-5 text-black" />}
              </div>
            )}

            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-white text-base md:text-lg whitespace-nowrap">
                {appName}
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                {isSuperAdmin && 'Painel Administrativo Master'}
                {isTenantOwner && 'Central de Gestão'}
                {isReseller && 'Portal do Revendedor'}
              </span>
            </div>
          </div>

          {/* ZONA 2: Context Navigation / Breadcrumb trail */}
          <div className="hidden md:flex items-center gap-4 text-xs text-slate-400 font-medium whitespace-nowrap">
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">Painel Global</span>
                <span>·</span>
                <span>Gestão de Inquilinos</span>
                <span>·</span>
                <span>Tabelas Baserow</span>
              </div>
            )}

            {isTenantOwner && (
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">Gestão do Aplicativo</span>
                <span>·</span>
                <span>Revendedores & Clientes</span>
              </div>
            )}

            {isReseller && (
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">Painel de Clientes</span>
                <span>·</span>
                <span>Geração de Testes</span>
                <span>·</span>
                <span>Renovações</span>
              </div>
            )}
          </div>

          {/* ZONA 3: Saldo, Usuário e Logout */}
          <div className="flex items-center gap-3 shrink-0">
            
            {/* Saldo de Créditos para Revendedor */}
            {isReseller && reseller && (
              <div className="flex items-center gap-2 bg-[#11192C] border border-amber-500/30 rounded-lg px-3 py-1.5 shadow-sm">
                <Coins className="w-4 h-4 text-amber-400" />
                <div className="flex items-baseline gap-1">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Saldo:</span>
                  <span className="font-mono tabular-nums font-bold text-amber-300 text-sm">
                    {reseller.saldoCreditos}
                  </span>
                  <span className="text-[10px] text-slate-400">créditos</span>
                </div>
                {onOpenPixModal && (
                  <button
                    onClick={onOpenPixModal}
                    className="ml-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline transition-colors whitespace-nowrap cursor-pointer"
                  >
                    + Recarregar
                  </button>
                )}
              </div>
            )}

            {/* Informação do Usuário Logado */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/5 rounded-lg text-xs">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-200 font-medium truncate max-w-[140px]">
                {currentUser.nome}
              </span>
            </div>

            {/* Botão Sair */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-rose-400 bg-[#11192C] hover:bg-rose-500/10 border border-white/10 rounded-lg transition-colors cursor-pointer"
              title="Encerrar sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>

          </div>

        </div>
      </header>
    </>
  );
};
