import React, { useState } from 'react';
import { AuthUser, Tenant } from '../types';
import { 
  Tv, 
  ShieldCheck, 
  LogOut, 
  Coins, 
  UserCheck, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  currentUser: AuthUser;
  onLogout: () => void;
  onOpenPixModal?: () => void;
  onSelectPersona?: (role: 'SUPER_ADMIN' | 'TENANT_OWNER' | 'RESELLER', id?: string) => void;
  allTenants?: Tenant[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenPixModal,
  onSelectPersona,
  allTenants = [],
}) => {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  // Determinar marca do topo
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isTenantOwner = currentUser.role === 'TENANT_OWNER';
  const isReseller = currentUser.role === 'RESELLER';

  const tenant = currentUser.tenant;
  const reseller = currentUser.reseller;

  const appName = isSuperAdmin
    ? 'STREAMMASTER SAAS'
    : (tenant?.nomeApp || 'STREAMING OTT');

  const brandColor = tenant?.corPrimaria || '#00E5FF';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0A0F1D]/90 backdrop-blur-md border-b border-white/8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* ZONA 1: Marca / Brand Title (Single-line wordmark) */}
        <div className="flex items-center gap-3 shrink-0">
          {tenant?.logoUrl ? (
            <img 
              src={tenant.logoUrl} 
              alt={appName} 
              className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/10"
              onError={(e) => {
                // Fallback graceful se a imagem falhar
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
              {isSuperAdmin && 'Nível 1 · Painel Desenvolvedor SaaS'}
              {isTenantOwner && `Nível 2 · Dono do App (${tenant?.nomeDono})`}
              {isReseller && `Nível 3 · Revendedor Oficial`}
            </span>
          </div>
        </div>

        {/* ZONA 2: Context Navigation / Breadcrumb trail */}
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-400 font-medium whitespace-nowrap">
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">Painel Global</span>
              <span>·</span>
              <span>Gestão de Inquilinos</span>
              <span>·</span>
              <span>Métricas de Rede</span>
            </div>
          )}

          {isTenantOwner && (
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">Central Master</span>
              <span>·</span>
              <span>Revendedores & Clientes</span>
              <span>·</span>
              <span className="text-emerald-400">Baserow Live</span>
            </div>
          )}

          {isReseller && (
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">Portal da Revenda</span>
              <span>·</span>
              <span>{reseller?.nome}</span>
              <span>·</span>
              <span>WhatsApp Direct</span>
            </div>
          )}
        </div>

        {/* ZONA 3: Ações Primárias, Saldo e Perfil */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Card de Saldo para Revendedor */}
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

          {/* Troca Rápida de Perfil (Persona Switcher) */}
          {onSelectPersona && (
            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-[#11192C] hover:bg-[#182238] border border-white/10 rounded-lg transition-colors cursor-pointer"
                title="Alternar entre perfis para demonstração"
              >
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Trocar Perfil</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showPersonaMenu && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-[#11192C] border border-white/10 rounded-xl shadow-2xl py-2 z-50 text-xs text-slate-200 divide-y divide-white/5"
                  onMouseLeave={() => setShowPersonaMenu(false)}
                >
                  <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Simular Níveis de Acesso
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onSelectPersona('SUPER_ADMIN');
                        setShowPersonaMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 flex items-center justify-between text-white cursor-pointer"
                    >
                      <span className="font-semibold text-cyan-400">1. Super Admin</span>
                      <span className="text-[10px] text-slate-400">Dono do SaaS</span>
                    </button>
                  </div>

                  {allTenants.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1 text-[10px] text-slate-500 font-semibold uppercase">
                        2. Donos de Aplicativo (Master)
                      </div>
                      {allTenants.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            onSelectPersona('TENANT_OWNER', t.id);
                            setShowPersonaMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-white/5 flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate text-slate-200">{t.nomeApp}</span>
                          <span className="text-[10px] text-slate-400 ml-2">{t.nomeDono}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] text-slate-500 font-semibold uppercase">
                      3. Revendedores
                    </div>
                    <button
                      onClick={() => {
                        onSelectPersona('RESELLER', 'reseller-lucas-01');
                        setShowPersonaMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-white/5 flex items-center justify-between cursor-pointer"
                    >
                      <span className="text-amber-400">Lucas Revendas</span>
                      <span className="text-[10px] text-slate-400">CINEFP (26 cr.)</span>
                    </button>
                    <button
                      onClick={() => {
                        onSelectPersona('RESELLER', 'reseller-marcos-02');
                        setShowPersonaMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-white/5 flex items-center justify-between cursor-pointer"
                    >
                      <span className="text-amber-400">Marcos Stream</span>
                      <span className="text-[10px] text-slate-400">CINEFP (7 cr.)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botão Sair / Logout */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-rose-400 bg-[#11192C] hover:bg-rose-500/10 border border-white/10 rounded-lg transition-colors cursor-pointer"
            title="Sair da conta"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>

      </div>
    </header>
  );
};
