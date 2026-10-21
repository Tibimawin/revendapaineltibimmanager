import React, { useState } from 'react';
import { Tenant } from '../types';
import { saasStore } from '../services/storage';
import { DynamicBaserowClient, SuperAdminBaserowConfig } from '../services/baserowClient';
import { InternationalPhoneInput } from './InternationalPhoneInput';
import { 
  Users, 
  Tv, 
  Activity, 
  Plus, 
  Database, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  UserCheck, 
  AlertCircle,
  Coins,
  Calendar,
  Key,
  ShieldCheck,
  Settings,
  X
} from 'lucide-react';

interface SuperAdminViewProps {
  onImpersonateTenant: (tenantId: string) => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({ onImpersonateTenant }) => {
  const [tenants, setTenants] = useState<Tenant[]>(() => saasStore.getAllTenants());
  const [stats, setStats] = useState(() => saasStore.getGlobalStats());
  const [masterConfig, setMasterConfig] = useState<SuperAdminBaserowConfig>(() =>
    saasStore.getMasterBaserowConfig()
  );

  // Modals & testing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [testingTenantId, setTestingTenantId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string; latency?: number } | null>(null);
  
  // Master 3-tables test
  const [isTestingMasterTables, setIsTestingMasterTables] = useState(false);
  const [masterTestResult, setMasterTestResult] = useState<any | null>(null);

  // Sincronização direta de dados reais
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nomeDono: '',
    email: '',
    senha: '',
    whatsapp: '',
    nomeApp: '',
    slug: '',
    logoUrl: '',
    corPrimaria: '#00E5FF',
    baserowUrl: masterConfig.baserowUrl || 'http://31.220.72.235:8080/',
    baserowToken: masterConfig.token || 'Mu9bhoLo59fRYoyNOgSjFaxb6sjqT9sj',
    baserowTableUsuarios: masterConfig.tableUsuariosDefault || '889',
    chavePix: '',
    valorCreditoUnitario: 15.0,
    appDownloadUrl: '',
    vencimentoAssinatura: '2027-12-31',
  });

  // Config Form State
  const [tempConfig, setTempConfig] = useState({ ...masterConfig });

  const refreshData = () => {
    setTenants(saasStore.getAllTenants());
    setStats(saasStore.getGlobalStats());
    setMasterConfig(saasStore.getMasterBaserowConfig());
  };

  const handleOpenCreate = () => {
    setEditingTenant(null);
    setFormData({
      nomeDono: '',
      email: '',
      senha: '123',
      whatsapp: '55119',
      nomeApp: '',
      slug: '',
      logoUrl: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=150',
      corPrimaria: '#00E5FF',
      baserowUrl: masterConfig.baserowUrl || 'http://31.220.72.235:8080/',
      baserowToken: masterConfig.token || 'Mu9bhoLo59fRYoyNOgSjFaxb6sjqT9sj',
      baserowTableUsuarios: masterConfig.tableUsuariosDefault || '889',
      chavePix: '',
      valorCreditoUnitario: 15.0,
      appDownloadUrl: '',
      vencimentoAssinatura: '2027-12-31',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Tenant) => {
    setEditingTenant(t);
    setFormData({
      nomeDono: t.nomeDono,
      email: t.email,
      senha: t.senha || '',
      whatsapp: t.whatsapp,
      nomeApp: t.nomeApp,
      slug: t.slug,
      logoUrl: t.logoUrl,
      corPrimaria: t.corPrimaria,
      baserowUrl: t.baserowUrl,
      baserowToken: t.baserowToken,
      baserowTableUsuarios: t.baserowTableUsuarios || '889',
      chavePix: t.chavePix,
      valorCreditoUnitario: t.valorCreditoUnitario,
      appDownloadUrl: t.appDownloadUrl,
      vencimentoAssinatura: t.vencimentoAssinatura,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTenant) {
      saasStore.updateTenant(editingTenant.id, formData);
    } else {
      saasStore.createTenant({
        ...formData,
        status: 'ATIVO',
      });
    }
    setIsModalOpen(false);
    refreshData();
  };

  const handleSaveMasterConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saasStore.updateMasterBaserowConfig(tempConfig);
    setMasterConfig({ ...tempConfig });
    setIsConfigModalOpen(false);
  };

  const handleToggleStatus = (tenant: Tenant) => {
    const nextStatus = tenant.status === 'ATIVO' ? 'BLOQUEADO' : 'ATIVO';
    saasStore.updateTenant(tenant.id, { status: nextStatus });
    refreshData();
  };

  const handleRenewSubscription = (tenant: Tenant) => {
    const newDate = saasStore.calculateNewExpirationDate(tenant.vencimentoAssinatura, 30);
    saasStore.updateTenant(tenant.id, { vencimentoAssinatura: newDate });
    refreshData();
  };

  const handleTestBaserow = async (tenant: Tenant) => {
    setTestingTenantId(tenant.id);
    setTestResult(null);

    const client = new DynamicBaserowClient(tenant);
    const res = await client.testConnection();

    setTestResult({
      id: tenant.id,
      success: res.success,
      message: res.message,
      latency: res.latencyMs,
    });
    setTestingTenantId(null);
  };

  const handleTestMaster3Tables = async () => {
    setIsTestingMasterTables(true);
    setMasterTestResult(null);
    try {
      const res = await saasStore.testMasterBaserowTables();
      setMasterTestResult(res);
    } catch (err: any) {
      setMasterTestResult({
        allOk: false,
        error: err.message,
      });
    } finally {
      setIsTestingMasterTables(false);
    }
  };

  const handleSyncFromBaserow = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await saasStore.syncFromBaserowDirectly();
      setSyncFeedback(res);
      refreshData();
    } catch (err: any) {
      setSyncFeedback({ success: false, message: `Erro ao sincronizar: ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-white/8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>Infraestrutura SaaS Multi-Tenant</span>
            <span>·</span>
            <span>Super Administrador (Desenvolvedor)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Painel Geral da Plataforma
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gerencie os Donos de Aplicativos, controle as tabelas centrais do Baserow e monitore toda a rede de revenda.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => {
              setTempConfig(saasStore.getMasterBaserowConfig());
              setIsConfigModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-[#182238] hover:bg-[#202d4a] text-slate-200 border border-white/10 font-bold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap"
          >
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>Configurar Baserow</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Dono de App</span>
          </button>
        </div>
      </div>

      {/* BOX MASTER: Integração do Desenvolvedor com Baserow (Tabelas 1575, 1574, 889) */}
      <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-[#11192C] via-[#16223b] to-[#11192C] border border-cyan-500/30 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Database className="w-4 h-4" />
              <span>Instância Master do Desenvolvedor (Baserow Oficial)</span>
            </div>
            <div className="text-sm font-semibold text-white">
              Servidor: <span className="font-mono text-cyan-300">{masterConfig.baserowUrl}</span>
            </div>
            
            {/* Badges das 3 Tabelas */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
              <div className="bg-[#0A0F1D] px-2.5 py-1 rounded-lg border border-white/10 text-slate-300">
                <span className="text-slate-500 font-sans">Tenants:</span> <strong className="text-cyan-400">Tabela {masterConfig.tableTenants}</strong>
              </div>
              <div className="bg-[#0A0F1D] px-2.5 py-1 rounded-lg border border-white/10 text-slate-300">
                <span className="text-slate-500 font-sans">Revendedores:</span> <strong className="text-blue-400">Tabela {masterConfig.tableResellers}</strong>
              </div>
              <div className="bg-[#0A0F1D] px-2.5 py-1 rounded-lg border border-white/10 text-slate-300">
                <span className="text-slate-500 font-sans">Usuários (Clientes):</span> <strong className="text-emerald-400">Tabela {masterConfig.tableUsuariosDefault}</strong>
              </div>
              <div className="bg-[#0A0F1D] px-2.5 py-1 rounded-lg border border-white/10 text-slate-300">
                <span className="text-slate-500 font-sans">Token:</span> <strong className="text-amber-300">{masterConfig.token.slice(0, 10)}•••••</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleSyncFromBaserow}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-[#0A0F1D] hover:bg-[#152238] text-cyan-300 border border-cyan-500/30 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Puxar Dados Reais'}</span>
            </button>

            <button
              onClick={handleTestMaster3Tables}
              disabled={isTestingMasterTables}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${isTestingMasterTables ? 'animate-spin' : ''}`} />
              <span>{isTestingMasterTables ? 'Testando 3 Tabelas...' : 'Testar Conexão das 3 Tabelas'}</span>
            </button>
          </div>

        </div>

        {/* Feedback de Sincronização */}
        {syncFeedback && (
          <div className={`mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            syncFeedback.success 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncFeedback.message}</span>
            </div>
            <button 
              onClick={() => setSyncFeedback(null)} 
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Feedback do Teste das 3 Tabelas */}
        {masterTestResult && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Status da Conexão com suas Tabelas no Baserow:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              
              {/* Tenant 1575 */}
              <div className={`p-3 rounded-xl border ${
                masterTestResult.results?.tenants?.success 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {masterTestResult.results?.tenants?.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  )}
                  <span>Tabela Tenant ({masterConfig.tableTenants})</span>
                </div>
                <div className="mt-1 text-[11px] opacity-90">
                  {masterTestResult.results?.tenants?.message}
                </div>
                {masterTestResult.results?.tenants?.latencyMs && (
                  <div className="mt-1 text-[10px] font-mono opacity-75">
                    Latência: {masterTestResult.results.tenants.latencyMs}ms
                  </div>
                )}
              </div>

              {/* Revendedor 1574 */}
              <div className={`p-3 rounded-xl border ${
                masterTestResult.results?.resellers?.success 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {masterTestResult.results?.resellers?.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  )}
                  <span>Tabela Revendedor ({masterConfig.tableResellers})</span>
                </div>
                <div className="mt-1 text-[11px] opacity-90">
                  {masterTestResult.results?.resellers?.message}
                </div>
                {masterTestResult.results?.resellers?.latencyMs && (
                  <div className="mt-1 text-[10px] font-mono opacity-75">
                    Latência: {masterTestResult.results.resellers.latencyMs}ms
                  </div>
                )}
              </div>

              {/* Usuários 889 */}
              <div className={`p-3 rounded-xl border ${
                masterTestResult.results?.usuarios?.success 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {masterTestResult.results?.usuarios?.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  )}
                  <span>Tabela Usuários ({masterConfig.tableUsuariosDefault})</span>
                </div>
                <div className="mt-1 text-[11px] opacity-90">
                  {masterTestResult.results?.usuarios?.message}
                </div>
                {masterTestResult.results?.usuarios?.latencyMs && (
                  <div className="mt-1 text-[10px] font-mono opacity-75">
                    Latência: {masterTestResult.results.usuarios.latencyMs}ms
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Donos de Aplicativos */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Donos de Apps</span>
            <Tv className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
            {stats.activeTenants}
            <span className="text-xs font-sans text-slate-400 font-normal ml-2">/ {stats.totalTenants} ativos</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Inquilinos na tabela {masterConfig.tableTenants}
          </div>
        </div>

        {/* Card 2: Revendedores em toda a rede */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Rede de Revendedores</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
            {stats.totalResellers}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Parceiros na tabela {masterConfig.tableResellers}
          </div>
        </div>

        {/* Card 3: Clientes Finais no Baserow */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Clientes Finais Ativos</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
            {stats.activeClients}
            <span className="text-xs font-sans text-slate-400 font-normal ml-2">/ {stats.totalClients} totais</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Registrados na tabela {masterConfig.tableUsuariosDefault}
          </div>
        </div>

        {/* Card 4: Créditos em Circulação */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Créditos em Circulação</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-300 font-mono tabular-nums">
            {stats.totalCreditsInCirculation}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Saldo acumulado nos revendedores
          </div>
        </div>

      </div>

      {/* Alerta de Diagnóstico Baserow se houver teste recente de tenant */}
      {testResult && (
        <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
          testResult.success 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
            : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-xs uppercase tracking-wider">
                Diagnóstico de Conexão do Dono de App:
              </div>
              <div className="text-sm mt-0.5">{testResult.message}</div>
              {testResult.latency && (
                <div className="text-xs opacity-80 mt-1 font-mono">
                  Latência aferida: {testResult.latency}ms
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => setTestResult(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabela de Inquilinos / Donos de Apps */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-white/8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Donos de Aplicativos Cadastrados ({tenants.length})
            </h2>
            <p className="text-xs text-slate-400">
              Cada cliente possui isolamento completo, credenciais próprias de banco de dados e marca personalizada.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0A0F1D]/80 text-slate-400 border-b border-white/8">
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Aplicativo / Marca</th>
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Dono / Contato</th>
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Instância Baserow</th>
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Vencimento Assinatura</th>
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center">
                      <div className="p-3 bg-white/5 rounded-2xl mb-3 text-cyan-400">
                        <Database className="w-8 h-8" />
                      </div>
                      <div className="text-white font-bold text-sm">Nenhum Dono de App cadastrado na Tabela 1575</div>
                      <div className="text-slate-400 text-xs mt-1">
                        Sua tabela 1575 está vazia no Baserow. Cadastre o seu primeiro cliente de aplicativo para começar a gerenciar sua rede de streaming!
                      </div>
                      <button
                        onClick={handleOpenCreate}
                        className="mt-4 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                      >
                        + Cadastrar Primeiro Dono de App
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => {
                const isTesting = testingTenantId === tenant.id;
                const isExpired = new Date(tenant.vencimentoAssinatura) < new Date();

                return (
                  <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors">
                    
                    {/* App / Marca */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-black shrink-0 shadow-sm"
                          style={{ backgroundColor: tenant.corPrimaria || '#00E5FF' }}
                        >
                          <Tv className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{tenant.nomeApp}</div>
                          <div className="text-[11px] text-slate-400 font-mono">slug: /{tenant.slug}</div>
                        </div>
                      </div>
                    </td>

                    {/* Dono / Contato */}
                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-200">{tenant.nomeDono}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{tenant.email}</div>
                      <div className="text-slate-500 text-[11px]">WhatsApp: {tenant.whatsapp}</div>
                    </td>

                    {/* Baserow Info */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300">
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                        <span>Tabela: {tenant.baserowTableUsuarios || '889'}</span>
                      </div>
                      <div className="text-slate-500 font-mono text-[10px] truncate max-w-[200px]" title={tenant.baserowUrl}>
                        {tenant.baserowUrl}
                      </div>
                      <button
                        onClick={() => handleTestBaserow(tenant)}
                        disabled={isTesting}
                        className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                        <span>{isTesting ? 'Testando...' : 'Testar Conexão REST'}</span>
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleStatus(tenant)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                          tenant.status === 'ATIVO'
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                        }`}
                      >
                        {tenant.status === 'ATIVO' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{tenant.status}</span>
                      </button>
                    </td>

                    {/* Vencimento Assinatura */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 font-mono tabular-nums text-slate-200">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className={isExpired ? 'text-rose-400 font-bold' : ''}>
                          {tenant.vencimentoAssinatura}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRenewSubscription(tenant)}
                        className="mt-1 text-[10px] font-semibold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                      >
                        + Renovar 30 dias
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onImpersonateTenant(tenant.id)}
                          className="px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Acessar o painel como este Dono de App (Suporte)"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Acessar Painel</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(tenant)}
                          className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Configurações Master do Desenvolvedor (Tabelas 1575, 1574, 889) */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#11192C] border border-white/10 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Configurações Baserow do Desenvolvedor</h3>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMasterConfig} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  URL da Instância Baserow
                </label>
                <input
                  type="text"
                  required
                  value={tempConfig.baserowUrl}
                  onChange={(e) => setTempConfig({ ...tempConfig, baserowUrl: e.target.value })}
                  placeholder="http://31.220.72.235:8080/"
                  className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Token do Baserow (Super Admin)
                </label>
                <input
                  type="text"
                  required
                  value={tempConfig.token}
                  onChange={(e) => setTempConfig({ ...tempConfig, token: e.target.value })}
                  placeholder="Mu9bhoLo59fRYoyNOgSjFaxb6sjqT9sj"
                  className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Tabela Tenant
                  </label>
                  <input
                    type="text"
                    required
                    value={tempConfig.tableTenants}
                    onChange={(e) => setTempConfig({ ...tempConfig, tableTenants: e.target.value })}
                    placeholder="1575"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Tabela Revendedor
                  </label>
                  <input
                    type="text"
                    required
                    value={tempConfig.tableResellers}
                    onChange={(e) => setTempConfig({ ...tempConfig, tableResellers: e.target.value })}
                    placeholder="1574"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Tabela Usuários
                  </label>
                  <input
                    type="text"
                    required
                    value={tempConfig.tableUsuariosDefault}
                    onChange={(e) => setTempConfig({ ...tempConfig, tableUsuariosDefault: e.target.value })}
                    placeholder="889"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl"
                >
                  Salvar Configurações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cadastro / Edição de Dono do App */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-[#11192C] border border-white/10 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingTenant ? 'Editar Dados do Dono de App' : 'Cadastrar Novo Dono de Aplicativo'}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure o aplicativo white-label, a tabela de usuários (padrão 889) e as regras financeiras.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              
              {/* Seção 1: Dados do Dono & Acesso */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Nome do Dono (Cliente)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nomeDono}
                    onChange={(e) => setFormData({ ...formData, nomeDono: e.target.value })}
                    placeholder="Ex: Roberto Mendes"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Email de Login
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="roberto@cinefp.com"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Senha de Acesso
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    placeholder="Senha segura"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <InternationalPhoneInput
                    value={formData.whatsapp}
                    onChange={(fullNum) => setFormData({ ...formData, whatsapp: fullNum })}
                    label="WhatsApp do Dono (Qualquer País / DDI)"
                    required
                  />
                </div>
              </div>

              {/* Seção 2: Marca White-Label */}
              <div className="pt-3 border-t border-white/5">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">
                  Configurações da Marca White-Label
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Nome do Aplicativo
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nomeApp}
                      onChange={(e) => setFormData({ ...formData, nomeApp: e.target.value })}
                      placeholder="Ex: CINEFP TV"
                      className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Slug da URL
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      placeholder="cinefp"
                      className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Cor de Destaque
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.corPrimaria}
                        onChange={(e) => setFormData({ ...formData, corPrimaria: e.target.value })}
                        className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={formData.corPrimaria}
                        onChange={(e) => setFormData({ ...formData, corPrimaria: e.target.value })}
                        className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Link de Download do APK / App Oficial
                  </label>
                  <input
                    type="url"
                    value={formData.appDownloadUrl}
                    onChange={(e) => setFormData({ ...formData, appDownloadUrl: e.target.value })}
                    placeholder="https://cinefp.app/download/app.apk"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Seção 3: Credenciais Baserow do Dono */}
              <div className="pt-3 border-t border-white/5">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">
                  Credenciais Baserow do Dono (Tabela de Usuários)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      URL da API Baserow
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.baserowUrl}
                      onChange={(e) => setFormData({ ...formData, baserowUrl: e.target.value })}
                      placeholder="http://31.220.72.235:8080/"
                      className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      ID da Tabela Usuários
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.baserowTableUsuarios}
                      onChange={(e) => setFormData({ ...formData, baserowTableUsuarios: e.target.value })}
                      placeholder="889"
                      className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Token da API do Baserow
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.baserowToken}
                    onChange={(e) => setFormData({ ...formData, baserowToken: e.target.value })}
                    placeholder="Mu9bhoLo59fRYoyNOgSjFaxb6sjqT9sj"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Seção 4: Financeiro & PIX */}
              <div className="pt-3 border-t border-white/5">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">
                  Financeiro & Cobrança
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Chave PIX do Dono (para receber de revendedores)
                    </label>
                    <input
                      type="text"
                      value={formData.chavePix}
                      onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })}
                      placeholder="Ex: pix@cinefp.com ou CPF/CNPJ"
                      className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Preço Crédito (R$)
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      value={formData.valorCreditoUnitario}
                      onChange={(e) => setFormData({ ...formData, valorCreditoUnitario: parseFloat(e.target.value) || 15 })}
                      className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Botões do Formulário */}
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  {editingTenant ? 'Salvar Alterações' : 'Criar Dono de App'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
