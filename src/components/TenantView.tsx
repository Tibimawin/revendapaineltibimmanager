import React, { useState } from 'react';
import { Tenant, Reseller, BaserowClient, CreditTransaction } from '../types';
import { saasStore } from '../services/storage';
import { DynamicBaserowClient } from '../services/baserowClient';
import { InternationalPhoneInput } from './InternationalPhoneInput';
import { 
  Users, 
  Coins, 
  Tv, 
  UserCheck, 
  Plus, 
  Settings, 
  Database, 
  CheckCircle2, 
  XCircle, 
  QrCode, 
  RefreshCw, 
  Search, 
  Calendar,
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Clock,
  UserPlus,
  ShieldCheck,
  Key,
  Zap,
  Check,
  AlertCircle,
  X
} from 'lucide-react';

interface TenantViewProps {
  tenant: Tenant;
  onImpersonateReseller: (resellerId: string) => void;
}

export const TenantView: React.FC<TenantViewProps> = ({ tenant, onImpersonateReseller }) => {
  const [activeTab, setActiveTab] = useState<'resellers' | 'direct_clients' | 'transactions' | 'settings'>('resellers');
  
  // Data State
  const [resellers, setResellers] = useState<Reseller[]>(() => saasStore.getResellersByTenant(tenant.id));
  const [allClients, setAllClients] = useState<BaserowClient[]>(() => saasStore.getAllClientsForTenant(tenant.id));
  const [transactions, setTransactions] = useState<CreditTransaction[]>(() => saasStore.getTransactionsByTenant(tenant.id));
  const [stats, setStats] = useState(() => saasStore.getTenantStats(tenant.id));

  // Modals
  const [isResellerModalOpen, setIsResellerModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(10);
  const [creditNote, setCreditNote] = useState<string>('Venda de créditos via PIX');
  const [isDirectClientModalOpen, setIsDirectClientModalOpen] = useState(false);

  // Baserow test feedback
  const [isTestingBaserow, setIsTestingBaserow] = useState(false);
  const [baserowStatus, setBaserowStatus] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  // Reseller Form
  const [resellerForm, setResellerForm] = useState({
    nome: '',
    email: '',
    senha: '123',
    whatsapp: '',
    saldoCreditos: 10,
    cotaTestesDiarios: 10,
  });

  // Direct Client Form (0 credits cost for Owner)
  const [directClientForm, setDirectClientForm] = useState({
    Nome: '',
    Email: '',
    Senha: '',
    WhatsApp: '',
    meses: 1,
    Limite: 1,
  });

  // Asaas Gateway Configuration State
  const [asaasForm, setAsaasForm] = useState({
    asaasApiKey: tenant.asaasApiKey || '',
    asaasEnvironment: (tenant.asaasEnvironment || 'production') as 'production' | 'sandbox',
    valorCreditoUnitario: tenant.valorCreditoUnitario || 15.0,
    chavePix: tenant.chavePix || '',
    appDownloadUrl: tenant.appDownloadUrl || '',
  });
  const [isTestingAsaas, setIsTestingAsaas] = useState(false);
  const [asaasStatus, setAsaasStatus] = useState<{ success: boolean; message: string; balance?: number } | null>(null);
  const [saveAsaasSuccess, setSaveAsaasSuccess] = useState(false);

  // Filter Search
  const [searchTerm, setSearchTerm] = useState('');

  const refreshData = () => {
    setResellers(saasStore.getResellersByTenant(tenant.id));
    setAllClients(saasStore.getAllClientsForTenant(tenant.id));
    setTransactions(saasStore.getTransactionsByTenant(tenant.id));
    setStats(saasStore.getTenantStats(tenant.id));
  };

  const handleCreateReseller = (e: React.FormEvent) => {
    e.preventDefault();
    saasStore.createReseller({
      tenantId: tenant.id,
      nome: resellerForm.nome,
      email: resellerForm.email,
      senha: resellerForm.senha,
      whatsapp: resellerForm.whatsapp,
      saldoCreditos: Number(resellerForm.saldoCreditos) || 0,
      cotaTestesDiarios: Number(resellerForm.cotaTestesDiarios) || 10,
      status: 'ATIVO',
    });
    setIsResellerModalOpen(false);
    setResellerForm({ nome: '', email: '', senha: '123', whatsapp: '', saldoCreditos: 10, cotaTestesDiarios: 10 });
    refreshData();
  };

  const handleAdjustCredits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReseller) return;
    saasStore.adjustResellerCredits(selectedReseller.id, Number(creditAmount), creditNote);
    setIsCreditModalOpen(false);
    refreshData();
  };

  const handleToggleResellerStatus = (r: Reseller) => {
    const next = r.status === 'ATIVO' ? 'BLOQUEADO' : 'ATIVO';
    saasStore.updateReseller(r.id, { status: next });
    refreshData();
  };

  const handleCreateDirectClient = async (e: React.FormEvent) => {
    e.preventDefault();
    await saasStore.createClient({
      Nome: directClientForm.Nome,
      Email: directClientForm.Email,
      Senha: directClientForm.Senha,
      WhatsApp: directClientForm.WhatsApp,
      meses: directClientForm.meses,
      Limite: directClientForm.Limite,
      tenantId: tenant.id,
      revendedorId: 'DONO',
      criadoPorNome: 'DONO',
    });
    setIsDirectClientModalOpen(false);
    setDirectClientForm({ Nome: '', Email: '', Senha: '', WhatsApp: '', meses: 1, Limite: 1 });
    refreshData();
  };

  const handleTestBaserow = async () => {
    setIsTestingBaserow(true);
    setBaserowStatus(null);
    const client = new DynamicBaserowClient(tenant);
    const res = await client.testConnection();
    setBaserowStatus({
      success: res.success,
      message: res.message,
      latency: res.latencyMs,
    });
    setIsTestingBaserow(false);
  };

  const handleTestAsaas = async () => {
    if (!asaasForm.asaasApiKey || asaasForm.asaasApiKey.trim() === '') {
      setAsaasStatus({ success: false, message: 'Digite a Chave de API do Asaas primeiro.' });
      return;
    }
    setIsTestingAsaas(true);
    setAsaasStatus(null);
    try {
      const resp = await fetch('/api/asaas/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: asaasForm.asaasApiKey.trim(),
          environment: asaasForm.asaasEnvironment,
        }),
      });
      const data = await resp.json();
      setAsaasStatus({
        success: data.success,
        message: data.message,
        balance: data.balance,
      });
    } catch (err: any) {
      setAsaasStatus({
        success: false,
        message: `Falha ao conectar com Asaas: ${err.message}`,
      });
    } finally {
      setIsTestingAsaas(false);
    }
  };

  const handleSaveAsaasConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saasStore.updateTenant(tenant.id, {
      asaasApiKey: asaasForm.asaasApiKey.trim(),
      asaasEnvironment: asaasForm.asaasEnvironment,
      valorCreditoUnitario: Number(asaasForm.valorCreditoUnitario) || 15.0,
      chavePix: asaasForm.chavePix.trim(),
      appDownloadUrl: asaasForm.appDownloadUrl.trim(),
    });
    setSaveAsaasSuccess(true);
    setTimeout(() => setSaveAsaasSuccess(false), 3500);
    refreshData();
  };

  const directClientsList = allClients.filter((c) => c.RevendedorId === 'DONO');

  const filteredResellers = resellers.filter(
    (r) =>
      r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Brand Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/8">
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-black shadow-lg"
            style={{ backgroundColor: tenant.corPrimaria || '#00E5FF' }}
          >
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                Central do Dono do Aplicativo
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-400">{tenant.nomeDono}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {tenant.nomeApp}
            </h1>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => setIsResellerModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Revendedor</span>
          </button>

          <button
            onClick={() => setIsDirectClientModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-[#182238] hover:bg-[#202d4a] text-slate-200 border border-white/10 font-bold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Cliente Direto</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-panel rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Revendedores Ativos</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
            {stats.activeResellers}
            <span className="text-xs font-sans text-slate-400 font-normal ml-2">/ {stats.totalResellers}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Parceiros de revenda autorizados
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Créditos em Circulação</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-300 font-mono tabular-nums">
            {stats.totalCreditsCirculating}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Saldo total nas mãos dos revendedores
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Clientes no Baserow</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
            {stats.totalClients}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {stats.activeClients} ativos no seu app
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Preço por Crédito</span>
            <QrCode className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
            R$ {tenant.valorCreditoUnitario?.toFixed(2).replace('.', ',')}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 truncate">
            PIX: {tenant.chavePix || 'Não cadastrada'}
          </div>
        </div>

      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1 bg-[#11192C] border border-white/8 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('resellers')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'resellers'
              ? 'bg-cyan-500 text-black shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Meus Revendedores ({resellers.length})
        </button>

        <button
          onClick={() => setActiveTab('direct_clients')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'direct_clients'
              ? 'bg-cyan-500 text-black shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Clientes Diretos ({directClientsList.length})
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-cyan-500 text-black shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Histórico de Créditos
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-cyan-500 text-black shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Configurações & Baserow
        </button>
      </div>

      {/* TAB 1: MEUS REVENDEDORES */}
      {activeTab === 'resellers' && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          
          <div className="p-4 sm:p-5 border-b border-white/8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">Lista de Revendedores Parceiros</h2>
              <p className="text-xs text-slate-400">
                Gerencie o saldo de créditos, libere ou bloqueie o acesso ao portal da sua marca.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="bg-[#0A0F1D] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0A0F1D]/80 text-slate-400 border-b border-white/8">
                  <th className="py-3.5 px-4 font-semibold uppercase">Revendedor</th>
                  <th className="py-3.5 px-4 font-semibold uppercase">WhatsApp</th>
                  <th className="py-3.5 px-4 font-semibold uppercase">Saldo de Créditos</th>
                  <th className="py-3.5 px-4 font-semibold uppercase">Cota Testes (Hoje)</th>
                  <th className="py-3.5 px-4 font-semibold uppercase">Status</th>
                  <th className="py-3.5 px-4 font-semibold uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredResellers.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    
                    <td className="py-4 px-4">
                      <div className="font-bold text-white text-sm">{r.nome}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{r.email}</div>
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-300">
                      {r.whatsapp || 'Não informado'}
                    </td>

                    <td className="py-4 px-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-mono tabular-nums font-bold text-amber-300 text-sm">
                          {r.saldoCreditos}
                        </span>
                        <span className="text-[10px] text-slate-400">créditos</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-mono tabular-nums text-slate-200">
                        {r.testesUsadosHoje} / {r.cotaTestesDiarios} usados
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleResellerStatus(r)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                          r.status === 'ATIVO'
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                        }`}
                      >
                        {r.status === 'ATIVO' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{r.status}</span>
                      </button>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedReseller(r);
                            setCreditAmount(10);
                            setIsCreditModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          + Créditos
                        </button>

                        <button
                          onClick={() => onImpersonateReseller(r.id)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                          title="Acessar painel como este revendedor"
                        >
                          Acessar
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CLIENTES DIRETOS DO DONO */}
      {activeTab === 'direct_clients' && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-white/8 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Clientes Diretos do Dono</h2>
              <p className="text-xs text-slate-400">
                Você pode cadastrar clientes no seu Baserow sem consumir créditos.
              </p>
            </div>
            <button
              onClick={() => setIsDirectClientModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cliente Direto</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0A0F1D]/80 text-slate-400 border-b border-white/8">
                  <th className="py-3 px-4 font-semibold uppercase">Cliente & Contato</th>
                  <th className="py-3 px-4 font-semibold uppercase">Device ID (Aparelho)</th>
                  <th className="py-3 px-4 font-semibold uppercase">Login / Senha</th>
                  <th className="py-3 px-4 font-semibold uppercase">Status</th>
                  <th className="py-3 px-4 font-semibold uppercase">Vencimento (ISO)</th>
                  <th className="py-3 px-4 font-semibold uppercase">Criado em (DataCriacao)</th>
                  <th className="py-3 px-4 font-semibold uppercase">Telas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {directClientsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Nenhum cliente direto cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  directClientsList.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{c.Nome}</div>
                        {(c.WhatsApp || c.Telefone) && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            WhatsApp: {c.WhatsApp || c.Telefone}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {c.ID && String(c.ID).trim() !== '' ? (
                          <span className="font-mono text-cyan-300 text-[11px]">{c.ID}</span>
                        ) : (
                          <div
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#0A0F1D] border border-white/5 text-slate-400 text-[10px]"
                            title="O ID será registrado automaticamente pelo aparelho físico (TV Box/Celular) ao se conectar"
                          >
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span className="font-mono">Aguardando Aparelho</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        <div className="text-white">{c.Email}</div>
                        <div className="text-slate-500">Senha: {c.Senha}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {c.Status === 'Premium' || c.Status === 'Ativo' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                            PREMIUM
                          </span>
                        ) : c.Status === 'Grátis' || c.Status === 'Teste' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            <Zap className="w-2.5 h-2.5 text-purple-400" />
                            GRÁTIS
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/20">
                            {c.Status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums">
                        <div className="text-xs text-slate-200">
                          {new Date(c.Vencimento).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[130px]" title={c.Vencimento}>
                          {c.Vencimento}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-xs text-slate-300">
                          {c.DataCriacao || c.dataCriacao
                            ? new Date(c.DataCriacao || c.dataCriacao!).toLocaleDateString('pt-BR')
                            : '-'}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px]" title={c.DataCriacao || c.dataCriacao || ''}>
                          {c.DataCriacao || c.dataCriacao || 'Pendente'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{c.Limite} tela(s)</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSAÇÕES DE CRÉDITO */}
      {activeTab === 'transactions' && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-white/8">
            <h2 className="text-base font-bold text-white">Extrato de Créditos e Recargas</h2>
            <p className="text-xs text-slate-400">
              Registro auditável de todas as adições, consumos e renovações no seu aplicativo.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0A0F1D]/80 text-slate-400 border-b border-white/8">
                  <th className="py-3.5 px-4 font-semibold uppercase">Data</th>
                  <th className="py-3.5 px-4 font-semibold uppercase">Revendedor</th>
                  <th className="py-3.5 px-4 font-semibold uppercase">Tipo</th>
                  <th className="py-3.5 px-4 font-semibold uppercase">Descrição</th>
                  <th className="py-3.5 px-4 font-semibold uppercase text-right">Créditos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(tx.dataCriacao).toLocaleDateString()} {new Date(tx.dataCriacao).toLocaleTimeString().slice(0, 5)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">{tx.revendedorNome}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.tipo === 'ADICAO' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {tx.tipo}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{tx.descricao}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                      <span className={tx.quantidade > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {tx.quantidade > 0 ? `+${tx.quantidade}` : tx.quantidade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURAÇÕES E BASEROW */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card Baserow Live */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Servidor Baserow do Aplicativo</h3>
                <p className="text-xs text-slate-400">Tabela de Clientes: {tenant.baserowTableUsuarios}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[#0A0F1D] border border-white/5 font-mono text-cyan-300">
                {tenant.baserowUrl}api/database/rows/table/{tenant.baserowTableUsuarios}/
              </div>
              <div className="text-[11px] text-slate-400">
                As criações e renovações feitas pelos revendedores são enviadas diretamente para essa tabela.
              </div>
            </div>

            <button
              onClick={handleTestBaserow}
              disabled={isTestingBaserow}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isTestingBaserow ? 'animate-spin' : ''}`} />
              <span>{isTestingBaserow ? 'Testando Conectividade...' : 'Testar Conexão com Baserow'}</span>
            </button>

            {baserowStatus && (
              <div className={`p-3 rounded-xl text-xs border ${
                baserowStatus.success ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
              }`}>
                <div className="font-bold">{baserowStatus.message}</div>
                {baserowStatus.latency && <div className="mt-1 font-mono text-[10px]">Latência: {baserowStatus.latency}ms</div>}
              </div>
            )}
          </div>

          {/* Card Gateway Asaas & Regras Financeiras */}
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Gateway Asaas & Venda de Créditos</h3>
                  <p className="text-xs text-slate-400">
                    Permite que revendedores comprem créditos automaticamente com PIX instantâneo
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                asaasForm.asaasApiKey ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {asaasForm.asaasApiKey ? 'Asaas Ativo' : 'Pendente Chave'}
              </span>
            </div>

            <form onSubmit={handleSaveAsaasConfig} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase">
                    Chave de API Asaas (Access Token)
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    Obtenha em asaas.com &gt; Configurações da Conta &gt; Integrações
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={asaasForm.asaasApiKey}
                    onChange={(e) => setAsaasForm({ ...asaasForm, asaasApiKey: e.target.value })}
                    placeholder="Ex: $aact_YTU5YTE0M2M2N2I4MTliN..."
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                  <Key className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Os pagamentos PIX dos revendedores irão direto para a sua conta Asaas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Ambiente Asaas
                  </label>
                  <select
                    value={asaasForm.asaasEnvironment}
                    onChange={(e) => setAsaasForm({ ...asaasForm, asaasEnvironment: e.target.value as any })}
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="production">Produção (api.asaas.com)</option>
                    <option value="sandbox">Sandbox / Testes (sandbox.asaas.com)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Valor por Crédito Cobrado dos Revendedores
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.50"
                      min="1"
                      required
                      value={asaasForm.valorCreditoUnitario}
                      onChange={(e) => setAsaasForm({ ...asaasForm, valorCreditoUnitario: parseFloat(e.target.value) || 15 })}
                      className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Chave PIX Manual (Contingência)
                  </label>
                  <input
                    type="text"
                    value={asaasForm.chavePix}
                    onChange={(e) => setAsaasForm({ ...asaasForm, chavePix: e.target.value })}
                    placeholder="financeiro@app.com ou CNPJ"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Link de Download do Aplicativo
                  </label>
                  <input
                    type="text"
                    value={asaasForm.appDownloadUrl}
                    onChange={(e) => setAsaasForm({ ...asaasForm, appDownloadUrl: e.target.value })}
                    placeholder="https://meuapp.com/download"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {asaasStatus && (
                <div className={`p-3 rounded-xl text-xs border flex items-start gap-2 ${
                  asaasStatus.success ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                }`}>
                  {asaasStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">{asaasStatus.message}</div>
                    {asaasStatus.balance !== undefined && (
                      <div className="text-[11px] font-mono mt-0.5 opacity-90">
                        Saldo atual na sua conta Asaas: R$ {asaasStatus.balance.toFixed(2).replace('.', ',')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {saveAsaasSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Configurações do Asaas e valor do crédito salvos com sucesso!</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestAsaas}
                  disabled={isTestingAsaas}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingAsaas ? 'animate-spin' : ''}`} />
                  <span>{isTestingAsaas ? 'Testando Asaas...' : 'Testar Conexão com Asaas'}</span>
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Regras de Créditos & Asaas</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* Modal: Adicionar Revendedor */}
      {isResellerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#11192C] border border-white/10 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Novo Revendedor do {tenant.nomeApp}</h3>
                  <p className="text-xs text-slate-400">Cadastre um parceiro comercial na rede do seu aplicativo</p>
                </div>
              </div>
              <button 
                onClick={() => setIsResellerModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReseller} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={resellerForm.nome}
                    onChange={(e) => setResellerForm({ ...resellerForm, nome: e.target.value })}
                    placeholder="Ex: Pedro Revendas"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email de Login</label>
                  <input
                    type="email"
                    required
                    value={resellerForm.email}
                    onChange={(e) => setResellerForm({ ...resellerForm, email: e.target.value })}
                    placeholder="pedro@revenda.com"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Senha de Acesso</label>
                  <input
                    type="text"
                    required
                    value={resellerForm.senha}
                    onChange={(e) => setResellerForm({ ...resellerForm, senha: e.target.value })}
                    placeholder="Senha do revendedor"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Saldo Inicial (Créditos)</label>
                  <input
                    type="number"
                    min="0"
                    value={resellerForm.saldoCreditos}
                    onChange={(e) => setResellerForm({ ...resellerForm, saldoCreditos: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <InternationalPhoneInput
                    value={resellerForm.whatsapp}
                    onChange={(fullNum) => setResellerForm({ ...resellerForm, whatsapp: fullNum })}
                    label="WhatsApp do Revendedor (Qualquer País / DDI)"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Cota de Testes Diários</label>
                  <input
                    type="number"
                    min="1"
                    value={resellerForm.cotaTestesDiarios}
                    onChange={(e) => setResellerForm({ ...resellerForm, cotaTestesDiarios: parseInt(e.target.value) || 10 })}
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsResellerModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  Cadastrar Revendedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar / Remover Créditos */}
      {isCreditModalOpen && selectedReseller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#11192C] border border-white/10 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Ajustar Créditos para {selectedReseller.nome}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedReseller.email}</p>
                </div>
              </div>
              <button onClick={() => setIsCreditModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustCredits} className="mt-4 space-y-4">
              <div className="p-3.5 bg-[#0A0F1D] rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-xs text-slate-400">Saldo Atual do Revendedor:</span>
                <span className="font-mono font-bold text-amber-300 text-base">{selectedReseller.saldoCreditos} créditos</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Quantidade a adicionar (use valor negativo para subtrair)
                </label>
                <input
                  type="number"
                  required
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Motivo / Observação
                </label>
                <input
                  type="text"
                  value={creditNote}
                  onChange={(e) => setCreditNote(e.target.value)}
                  placeholder="Ex: Pagamento PIX confirmado"
                  className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreditModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  Confirmar Créditos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cliente Direto (Wider 2-Column Responsive Layout) */}
      {isDirectClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-[#11192C] border border-white/10 rounded-2xl shadow-2xl p-5 sm:p-7 text-slate-100 my-auto max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Novo Cliente Direto (Baserow)</h3>
                  <p className="text-xs text-slate-400">
                    Cadastro direto na tabela {tenant.baserowTableUsuarios || '889'} do {tenant.nomeApp}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDirectClientModalOpen(false)} 
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDirectClient} className="mt-5 space-y-5">
              
              {/* Grid 2 Colunas para evitar altura excessiva */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                
                {/* Coluna 1: Dados de Identificação e Acesso */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      1. Identificação e Login do Cliente
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nome do Cliente</label>
                    <input
                      type="text"
                      required
                      value={directClientForm.Nome}
                      onChange={(e) => setDirectClientForm({ ...directClientForm, Nome: e.target.value })}
                      placeholder="Ex: Carlos Alberto da Silva"
                      className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <InternationalPhoneInput
                    value={directClientForm.WhatsApp}
                    onChange={(fullNum) => setDirectClientForm({ ...directClientForm, WhatsApp: fullNum })}
                    label="WhatsApp do Cliente (Qualquer País / DDI)"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email / Usuário</label>
                      <input
                        type="text"
                        required
                        value={directClientForm.Email}
                        onChange={(e) => setDirectClientForm({ ...directClientForm, Email: e.target.value })}
                        placeholder="login@app.com"
                        className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Senha do App</label>
                      <input
                        type="text"
                        required
                        value={directClientForm.Senha}
                        onChange={(e) => setDirectClientForm({ ...directClientForm, Senha: e.target.value })}
                        placeholder="Senha"
                        className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Coluna 2: Licença, Assinatura e Duração */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        2. Plano e Regras de Licença
                      </span>
                    </div>

                    <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>Assinatura Automática PREMIUM</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        O cliente será ativado como <strong className="text-emerald-400">Premium</strong> com datas em formato ISO internacional (ex: <code className="text-cyan-300 font-mono">2026-10-28T06:45:39.809Z</code>).
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        O <strong className="text-cyan-300">Device ID</strong> não precisa ser inserido: o aparelho do usuário (TV Box/Celular) vincula automaticamente no 1º login.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Duração (Meses)</label>
                        <select
                          value={directClientForm.meses}
                          onChange={(e) => setDirectClientForm({ ...directClientForm, meses: parseInt(e.target.value) || 1 })}
                          className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                        >
                          <option value={1}>1 Mês (30 dias)</option>
                          <option value={3}>3 Meses (90 dias)</option>
                          <option value={6}>6 Meses (180 dias)</option>
                          <option value={12}>1 Ano (365 dias)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Telas Simultâneas</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={directClientForm.Limite}
                          onChange={(e) => setDirectClientForm({ ...directClientForm, Limite: parseInt(e.target.value) || 1 })}
                          className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <span className="text-base shrink-0">👑</span>
                    <span>Como <strong>Dono do Aplicativo</strong>, este cliente não consome créditos da sua conta.</span>
                  </div>
                </div>

              </div>

              {/* Rodapé da Janela Modal */}
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  <span>Gravação direta no Baserow do {tenant.nomeApp}</span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsDirectClientModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Gravar no Baserow</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
