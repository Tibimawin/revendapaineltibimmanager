import React, { useState, useEffect } from 'react';
import { AuthUser } from './types';
import { saasStore } from './services/storage';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { SuperAdminView } from './components/SuperAdminView';
import { TenantView } from './components/TenantView';
import { ResellerView } from './components/ResellerView';
import { PixModal } from './components/PixModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => saasStore.getCurrentUser());
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [urlSlug, setUrlSlug] = useState<string | null>(null);

  // Parse URL query parameter (ex: ?app=cinefp)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const appParam = params.get('app');
      if (appParam) {
        setUrlSlug(appParam);
      }
    } catch {
      // In sandbox environments
    }
  }, []);

  // Subscribe to storage changes
  useEffect(() => {
    const unsubscribe = saasStore.subscribe(() => {
      setCurrentUser(saasStore.getCurrentUser());
    });
    return unsubscribe;
  }, []);

  const handleLogout = () => {
    saasStore.logout();
    setCurrentUser(null);
  };

  const handleStopImpersonation = () => {
    saasStore.stopImpersonation();
  };

  const handleImpersonateTenant = (tenantId: string) => {
    saasStore.impersonateTenant(tenantId);
  };

  const handleImpersonateReseller = (resellerId: string) => {
    saasStore.impersonateReseller(resellerId);
  };

  // Se não estiver logado, exibe a tela de login profissional sem atalhos
  if (!currentUser) {
    return (
      <LoginView
        slugParam={urlSlug}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />
    );
  }

  const tenant = currentUser.tenant;
  const reseller = currentUser.reseller;

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      
      {/* Top Bar Contract */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenPixModal={() => setIsPixModalOpen(true)}
        onStopImpersonation={handleStopImpersonation}
      />

      {/* Main Viewport Container (1440px max-w standard) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Nível 1: Super Admin (acesso exclusivo awina1051@gmail.com) */}
        {currentUser.role === 'SUPER_ADMIN' && (
          <SuperAdminView onImpersonateTenant={handleImpersonateTenant} />
        )}

        {/* Nível 2: Dono do Aplicativo */}
        {currentUser.role === 'TENANT_OWNER' && tenant && (
          <TenantView
            tenant={tenant}
            onImpersonateReseller={handleImpersonateReseller}
          />
        )}

        {/* Nível 3: Revendedor (Totalmente isolado do painel admin) */}
        {currentUser.role === 'RESELLER' && tenant && reseller && (
          <ResellerView
            tenant={tenant}
            reseller={reseller}
          />
        )}

      </main>

      {/* Footer Minimalista e Discreto */}
      <footer className="w-full border-t border-white/5 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            {currentUser.role === 'SUPER_ADMIN' 
              ? 'StreamMaster SaaS Multi-Tenant Engine · Super Admin' 
              : `${tenant?.nomeApp || 'Sistema'} · Todos os direitos reservados`}
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-600">
            {currentUser.role === 'SUPER_ADMIN' ? (
              <>
                <span>Isolamento Multi-Tenant</span>
                <span>·</span>
                <span>Baserow REST API</span>
                <span>·</span>
                <span>Transações Atômicas de Créditos</span>
              </>
            ) : (
              <>
                <span>Conexão Segura SSL</span>
                <span>·</span>
                <span>Portal Autorizado</span>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Modal PIX Global se disparado da Navbar */}
      {isPixModalOpen && tenant && reseller && (
        <PixModal
          isOpen={isPixModalOpen}
          onClose={() => setIsPixModalOpen(false)}
          tenant={tenant}
          reseller={reseller}
        />
      )}

    </div>
  );
}
