import React, { useState } from 'react';
import { Tenant, Reseller, BaserowClient, CreditTransaction } from '../types';
import { saasStore } from '../services/storage';
import { PixModal } from './PixModal';
import { InternationalPhoneInput } from './InternationalPhoneInput';
import { 
  Coins, 
  Users, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Zap, 
  Search, 
  MessageSquare, 
  RefreshCw, 
  Copy, 
  Check, 
  Trash2, 
  Calendar,
  Sparkles,
  X
} from 'lucide-react';

interface ResellerViewProps {
  tenant: Tenant;
  reseller: Reseller;
}

export const ResellerView: React.FC<ResellerViewProps> = ({ tenant, reseller }) => {
  // Reactive Data
  const [clients, setClients] = useState<BaserowClient[]>(() =>
    saasStore.getClientsForReseller(reseller.id, tenant.id)
  );
  const [currentReseller, setCurrentReseller] = useState<Reseller>(reseller);
  const [transactions, setTransactions] = useState<CreditTransaction[]>(() =>
    saasStore.getTransactionsByReseller(reseller.id)
  );

  // Modals
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [selectedClientForRenew, setSelectedClientForRenew] = useState<BaserowClient | null>(null);

  // Forms
  const [newClientForm, setNewClientForm] = useState({
    Nome: '',
    Email: '',
    Senha: '',
    WhatsApp: '',
    meses: 1,
    Limite: 1,
  });

  const [testForm, setTestForm] = useState<{
    Nome: string;
    WhatsApp: string;
    horas: 2 | 4;
  }>({
    Nome: '',
    WhatsApp: '',
    horas: 2,
  });

  const [renewMonths, setRenewMonths] = useState<number>(1);
  const [formError, setFormError] = useState<string | null>(null);

  // Search and Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PREMIUM' | 'AVENCER' | 'VENCIDOS' | 'TESTES'>('TODOS');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refreshData = () => {
    setClients(saasStore.getClientsForReseller(currentReseller.id, tenant.id));
    const updatedReseller = saasStore.getResellersByTenant(tenant.id).find((r) => r.id === currentReseller.id);
    if (updatedReseller) {
      setCurrentReseller({ ...updatedReseller });
    }
    setTransactions(saasStore.getTransactionsByReseller(currentReseller.id));
  };

  // Metrics
  const now = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  const activeCount = clients.filter((c) => c.Status === 'Premium' || c.Status === 'Ativo').length;
  const expiredCount = clients.filter((c) => {
    if (c.Status === 'Vencido') return true;
    const exp = new Date(c.Vencimento);
    return exp < now && c.Status !== 'Teste';
  }).length;

  const expiringSoonCount = clients.filter((c) => {
    if (c.Status !== 'Premium' && c.Status !== 'Ativo') return false;
    const exp = new Date(c.Vencimento);
    return exp >= now && exp <= threeDaysFromNow;
  }).length;

  const testsUsedToday = currentReseller.testesUsadosHoje || 0;
  const testsRemaining = Math.max(0, currentReseller.cotaTestesDiarios - testsUsedToday);

  // Handlers
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const res = await saasStore.createClient({
      Nome: newClientForm.Nome,
      Email: newClientForm.Email,
      Senha: newClientForm.Senha,
      WhatsApp: newClientForm.WhatsApp,
      meses: newClientForm.meses,
      Limite: newClientForm.Limite,
      tenantId: tenant.id,
      revendedorId: currentReseller.id,
      criadoPorNome: currentReseller.nome,
    });

    if (!res.success) {
      setFormError(res.message || 'Erro ao criar cliente');
      return;
    }

    setIsNewClientModalOpen(false);
    setNewClientForm({ Nome: '', Email: '', Senha: '', WhatsApp: '', meses: 1, Limite: 1 });
    refreshData();
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const res = await saasStore.createFreeTest({
      Nome: testForm.Nome,
      WhatsApp: testForm.WhatsApp,
      horas: testForm.horas,
      tenantId: tenant.id,
      revendedorId: currentReseller.id,
      criadoPorNome: currentReseller.nome,
    });

    if (!res.success) {
      setFormError(res.message || 'Erro ao gerar teste');
      return;
    }

    setIsTestModalOpen(false);
    setTestForm({ Nome: '', WhatsApp: '', horas: 2 });
    refreshData();
  };

  const handleRenewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForRenew) return;
    setFormError(null);

    const res = await saasStore.renewClient(
      selectedClientForRenew.id,
      renewMonths,
      'RESELLER'
    );

    if (!res.success) {
      setFormError(res.message || 'Erro ao renovar');
      return;
    }

    setIsRenewModalOpen(false);
    setSelectedClientForRenew(null);
    refreshData();
  };

  const handleDeleteClient = (clientId: string | number) => {
    saasStore.deleteClient(clientId);
    refreshData();
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Client filtering
  const filteredClients = clients.filter((c) => {
    // Search com suporte seguro a ID nulo
    const matchSearch =
      c.Nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.Email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.ID || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.WhatsApp || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    // Filter
    if (statusFilter === 'PREMIUM') return c.Status === 'Premium' || c.Status === 'Ativo';
    if (statusFilter === 'TESTES') return c.Status === 'Teste';
    if (statusFilter === 'VENCIDOS') return c.Status === 'Vencido' || new Date(c.Vencimento) < now;
    if (statusFilter === 'AVENCER') {
      const exp = new Date(c.Vencimento);
      return (c.Status === 'Premium' || c.Status === 'Ativo') && exp >= now && exp <= threeDaysFromNow;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* CARD DESTAQUE: Saldo de Créditos & Compra via PIX */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#11192C] via-[#152037] to-[#11192C] border border-amber-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
              <span>Painel do Revendedor Oficial</span>
              <span>·</span>
              <span>{tenant.nomeApp}</span>
            </div>
            
            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-sm font-medium text-slate-300">SEU SALDO DISPONÍVEL:</span>
              <span className="text-4xl sm:text-5xl font-black text-amber-300 font-mono tabular-nums tracking-tight">
                ⭐ {currentReseller.saldoCreditos}
              </span>
              <span className="text-sm text-amber-400 font-semibold uppercase">Créditos</span>
            </div>
            
            <p className="text-xs text-slate-400 pt-1">
              1 crédito = 30 dias de assinatura no app {tenant.nomeApp}. Cada cliente ou renovação consome créditos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsPixModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer whitespace-nowrap"
            >
              <Coins className="w-4 h-4" />
              <span>+ Comprar Mais Créditos (PIX)</span>
            </button>

            <button
              onClick={() => {
                setFormError(null);
                setIsNewClientModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cliente</span>
            </button>

            <button
              onClick={() => {
                setFormError(null);
                setIsTestModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-4 h-4" />
              <span>Gerar Teste Grátis</span>
            </button>
          </div>

        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Ativos */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Clientes Ativos</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
            {activeCount}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Acessos funcionando normalmente
          </div>
        </div>

        {/* A Vencer */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>A Vencer (≤ 3 dias)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-300 font-mono tabular-nums">
            {expiringSoonCount}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Prontos para renovação via WhatsApp
          </div>
        </div>

        {/* Vencidos */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Clientes Vencidos</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-300 font-mono tabular-nums">
            {expiredCount}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Necessitam de renovação para reativar
          </div>
        </div>

        {/* Testes Hoje */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Testes Rápidos Hoje</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">
            {testsUsedToday}
            <span className="text-xs font-sans text-slate-400 font-normal ml-2">/ {currentReseller.cotaTestesDiarios}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {testsRemaining} disponíveis sem gastar créditos
          </div>
        </div>

      </div>

      {/* Tabela de Clientes Gerenciados */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        
        {/* Barra de Filtros e Busca */}
        <div className="p-4 sm:p-5 border-b border-white/8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">
              Meus Clientes no {tenant.nomeApp} ({filteredClients.length})
            </h2>
            <p className="text-xs text-slate-400">
              Apenas você e o Dono têm acesso a esta lista. Conexão direta com a tabela do Baserow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-[#0A0F1D] p-1 rounded-xl border border-white/5 text-xs">
              {(['TODOS', 'PREMIUM', 'AVENCER', 'VENCIDOS', 'TESTES'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-cyan-500 text-black font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'TODOS' && 'Todos'}
                  {tab === 'PREMIUM' && 'Premium'}
                  {tab === 'AVENCER' && 'A Vencer'}
                  {tab === 'VENCIDOS' && 'Vencidos'}
                  {tab === 'TESTES' && 'Testes'}
                </button>
              ))}
            </div>

            {/* Input Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente, login ou ID..."
                className="bg-[#0A0F1D] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-52 sm:w-60"
              />
            </div>

          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0A0F1D]/80 text-slate-400 border-b border-white/8">
                <th className="py-3.5 px-4 font-semibold uppercase">Cliente Final</th>
                <th className="py-3.5 px-4 font-semibold uppercase">Device ID (Aparelho)</th>
                <th className="py-3.5 px-4 font-semibold uppercase">Usuário / Senha</th>
                <th className="py-3.5 px-4 font-semibold uppercase">Status</th>
                <th className="py-3.5 px-4 font-semibold uppercase">Vencimento (ISO)</th>
                <th className="py-3.5 px-4 font-semibold uppercase">Criado em (DataCriacao)</th>
                <th className="py-3.5 px-4 font-semibold uppercase">Telas</th>
                <th className="py-3.5 px-4 font-semibold uppercase text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Nenhum cliente encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isExpiring = new Date(client.Vencimento) <= threeDaysFromNow && (client.Status === 'Premium' || client.Status === 'Ativo');
                  const isExpired = new Date(client.Vencimento) < now && client.Status !== 'Teste';
                  const whatsappMsg = saasStore.generateWhatsAppMessage(
                    client,
                    tenant.nomeApp,
                    tenant.appDownloadUrl
                  );
                  const cleanPhone = (client.WhatsApp || client.Telefone || '').replace(/\D/g, '');
                  const whatsappLink = cleanPhone
                    ? `https://wa.me/${cleanPhone}?text=${whatsappMsg}`
                    : `https://wa.me/?text=${whatsappMsg}`;

                  return (
                    <tr key={client.id} className="hover:bg-white/[0.02] transition-colors">
                      
                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{client.Nome}</div>
                        {(client.WhatsApp || client.Telefone) && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            WhatsApp: {client.WhatsApp || client.Telefone}
                          </div>
                        )}
                      </td>

                      {/* Device ID */}
                      <td className="py-3.5 px-4">
                        {client.ID && String(client.ID).trim() !== '' ? (
                          <div className="flex items-center gap-1.5 font-mono text-cyan-300 text-[11px]">
                            <span>{client.ID}</span>
                            <button
                              onClick={() => handleCopyText(client.ID!, `dev-${client.id}`)}
                              className="p-1 hover:text-white transition-colors cursor-pointer"
                              title="Copiar Device ID"
                            >
                              {copiedId === `dev-${client.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </button>
                          </div>
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

                      {/* Usuário / Senha */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[11px] text-slate-300">{client.Email}</div>
                        <div className="font-mono text-[11px] text-slate-500">Senha: {client.Senha}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {client.Status === 'Premium' || client.Status === 'Ativo' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                            PREMIUM
                          </span>
                        ) : client.Status === 'Teste' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/20">
                            TESTE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/20">
                            {client.Status}
                          </span>
                        )}
                      </td>

                      {/* Vencimento */}
                      <td className="py-3.5 px-4 font-mono tabular-nums">
                        <div className={`${
                          isExpired ? 'text-rose-400 font-bold' : isExpiring ? 'text-amber-400 font-bold' : 'text-slate-200'
                        }`}>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="text-xs">{new Date(client.Vencimento).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[130px] font-mono" title={client.Vencimento}>
                            {client.Vencimento}
                          </div>
                        </div>
                      </td>

                      {/* Criado em (DataCriacao) */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-xs text-slate-300">
                          {client.DataCriacao || client.dataCriacao
                            ? new Date(client.DataCriacao || client.dataCriacao!).toLocaleDateString('pt-BR')
                            : '-'}
                        </div>
                        <div
                          className="text-[10px] text-slate-500 truncate max-w-[120px]"
                          title={client.DataCriacao || client.dataCriacao || ''}
                        >
                          {client.DataCriacao || client.dataCriacao || 'Pendente'}
                        </div>
                      </td>

                      {/* Telas */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono">{client.Limite} tela(s)</span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Botão WhatsApp Formatado */}
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Enviar dados de acesso no WhatsApp do cliente"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </a>

                          {/* Botão Renovar */}
                          <button
                            onClick={() => {
                              setSelectedClientForRenew(client);
                              setRenewMonths(1);
                              setFormError(null);
                              setIsRenewModalOpen(true);
                            }}
                            className="p-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Renovar assinatura (+30 dias)"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">+30d</span>
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Excluir cliente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo Cliente */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#11192C] border border-white/10 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Novo Cliente no {tenant.nomeApp}</h3>
                <p className="text-xs text-slate-400">Gera acesso no Baserow e consome créditos</p>
              </div>
              <button onClick={() => setIsNewClientModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateClient} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  required
                  value={newClientForm.Nome}
                  onChange={(e) => setNewClientForm({ ...newClientForm, Nome: e.target.value })}
                  placeholder="Ex: Carlos Alberto"
                  className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <InternationalPhoneInput
                value={newClientForm.WhatsApp}
                onChange={(fullNum) => setNewClientForm({ ...newClientForm, WhatsApp: fullNum })}
                label="WhatsApp do Cliente (Qualquer País / DDI)"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email / Usuário</label>
                  <input
                    type="text"
                    required
                    value={newClientForm.Email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, Email: e.target.value })}
                    placeholder="carlos@tv.com"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Senha do App</label>
                  <input
                    type="text"
                    required
                    value={newClientForm.Senha}
                    onChange={(e) => setNewClientForm({ ...newClientForm, Senha: e.target.value })}
                    placeholder="senha123"
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Informação sobre Status Premium e Device ID */}
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Assinatura Automática PREMIUM</span>
                </div>
                <p className="text-slate-300">
                  O cliente será criado como <strong className="text-emerald-400">Premium</strong> com data de vencimento e criação no formato ISO. O <strong className="text-cyan-300">Device ID</strong> não precisa ser digitado: o aparelho do usuário registra seu próprio ID físico no 1º acesso.
                </p>
              </div>

              {/* Seletor de Plano & Consumo de Créditos */}
              <div className="p-3 bg-[#0A0F1D] rounded-xl border border-white/5 space-y-2">
                <label className="block text-xs font-semibold text-amber-300 uppercase">
                  Duração e Consumo de Crédito:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '1 Mês', val: 1, cost: 1 },
                    { label: '3 Meses', val: 3, cost: 3 },
                    { label: '6 Meses', val: 6, cost: 6 },
                    { label: '1 Ano', val: 12, cost: 12 },
                  ].map((plan) => (
                    <button
                      key={plan.val}
                      type="button"
                      onClick={() => setNewClientForm({ ...newClientForm, meses: plan.val })}
                      className={`p-2 rounded-lg text-center border text-xs cursor-pointer transition-all ${
                        newClientForm.meses === plan.val
                          ? 'border-cyan-400 bg-cyan-500/20 text-white font-bold'
                          : 'border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div>{plan.label}</div>
                      <div className="text-[10px] text-amber-400 font-mono font-bold mt-0.5">
                        {plan.cost} crédito{plan.cost > 1 ? 's' : ''}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-400">Saldo após criação:</span>
                <span className="font-mono font-bold text-amber-300">
                  {currentReseller.saldoCreditos - newClientForm.meses} créditos restantes
                </span>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={currentReseller.saldoCreditos < newClientForm.meses}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl cursor-pointer"
                >
                  Confirmar e Ativar Premium
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gerar Teste Grátis (2h / 4h) */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#11192C] border border-white/10 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">⚡ Gerar Teste Rápido Grátis</h3>
                <p className="text-xs text-slate-400">Não consome créditos do seu saldo</p>
              </div>
              <button onClick={() => setIsTestModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTest} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nome do Cliente de Teste</label>
                <input
                  type="text"
                  required
                  value={testForm.Nome}
                  onChange={(e) => setTestForm({ ...testForm, Nome: e.target.value })}
                  placeholder="Ex: Rodrigo Santos"
                  className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <InternationalPhoneInput
                value={testForm.WhatsApp}
                onChange={(fullNum) => setTestForm({ ...testForm, WhatsApp: fullNum })}
                label="WhatsApp para Envio (Qualquer País / DDI)"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tempo do Teste</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTestForm({ ...testForm, horas: 2 })}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      testForm.horas === 2
                        ? 'border-purple-400 bg-purple-500/20 text-white'
                        : 'border-white/10 text-slate-400'
                    }`}
                  >
                    2 Horas
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestForm({ ...testForm, horas: 4 })}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      testForm.horas === 4
                        ? 'border-purple-400 bg-purple-500/20 text-white'
                        : 'border-white/10 text-slate-400'
                    }`}
                  >
                    4 Horas
                  </button>
                </div>
              </div>

              <div className="p-3 bg-purple-950/30 border border-purple-500/20 rounded-xl text-xs text-purple-300">
                Cota restante hoje: <strong className="font-mono">{testsRemaining}</strong> testes de {currentReseller.cotaTestesDiarios}.
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={testsRemaining <= 0}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Gerar Teste Agora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Renovar Cliente Inteligente */}
      {isRenewModalOpen && selectedClientForRenew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#11192C] border border-white/10 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Renovar Assinatura</h3>
                <p className="text-xs text-slate-400">Cliente: {selectedClientForRenew.Nome}</p>
              </div>
              <button onClick={() => setIsRenewModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleRenewClient} className="mt-4 space-y-4">
              <div className="p-3 bg-[#0A0F1D] rounded-xl border border-white/5 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vencimento Atual:</span>
                  <span className="font-mono font-bold text-white">{selectedClientForRenew.Vencimento}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Novo Vencimento Calculado:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {saasStore.calculateNewExpirationDate(selectedClientForRenew.Vencimento, renewMonths * 30)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-300 uppercase mb-2">
                  Selecione o Período de Renovação:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '+30 dias', val: 1 },
                    { label: '+90 dias', val: 3 },
                    { label: '+180 dias', val: 6 },
                    { label: '+1 ano', val: 12 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setRenewMonths(p.val)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold cursor-pointer transition-all ${
                        renewMonths === p.val
                          ? 'border-amber-400 bg-amber-500/20 text-white'
                          : 'border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div>{p.label}</div>
                      <div className="text-[10px] text-amber-300 font-mono mt-0.5">{p.val} cr</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Custo em créditos:</span>
                <span className="font-mono font-bold text-amber-300">{renewMonths} crédito(s)</span>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRenewModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={currentReseller.saldoCreditos < renewMonths}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl cursor-pointer"
                >
                  Confirmar Renovação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal PIX para Comprar Créditos com o Dono */}
      <PixModal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        tenant={tenant}
        reseller={currentReseller}
      />

    </div>
  );
};
