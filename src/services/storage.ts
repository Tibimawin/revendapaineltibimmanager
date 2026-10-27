import { Tenant, Reseller, BaserowClient, CreditTransaction, AuthUser } from '../types';
import { INITIAL_TENANTS, INITIAL_RESELLERS, INITIAL_CLIENTS, INITIAL_TRANSACTIONS } from './mockData';
import { DynamicBaserowClient, SuperAdminBaserowMaster, SUPER_ADMIN_DEFAULT_CONFIG, SuperAdminBaserowConfig } from './baserowClient';

const STORAGE_KEYS = {
  TENANTS: 'streammaster_tenants_v1',
  RESELLERS: 'streammaster_resellers_v1',
  CLIENTS: 'streammaster_clients_v1',
  TRANSACTIONS: 'streammaster_transactions_v1',
  AUTH: 'streammaster_auth_v1',
  MASTER_BASEROW: 'streammaster_master_baserow_v1',
};

// Safe LocalStorage loader
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Falha ao salvar no storage:', e);
  }
}

/**
 * Motor central de estado e regras de negócio SaaS
 */
class SaaSDataManager {
  private tenants: Tenant[];
  private resellers: Reseller[];
  private clients: BaserowClient[];
  private transactions: CreditTransaction[];
  private currentUser: AuthUser | null;
  private masterBaserowConfig: SuperAdminBaserowConfig;
  private superAdminMaster: SuperAdminBaserowMaster;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.tenants = loadFromStorage(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
    this.resellers = loadFromStorage(STORAGE_KEYS.RESELLERS, INITIAL_RESELLERS);
    this.clients = loadFromStorage(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    this.transactions = loadFromStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    this.masterBaserowConfig = loadFromStorage(STORAGE_KEYS.MASTER_BASEROW, SUPER_ADMIN_DEFAULT_CONFIG);
    this.superAdminMaster = new SuperAdminBaserowMaster(this.masterBaserowConfig);

    // Expurgar dados fictícios mock gravados no localStorage de sessões anteriores
    this.tenants = this.tenants.filter((t) => t.id !== 'tenant-cinefp-01' && t.id !== 'tenant-vipplay-02');
    this.resellers = this.resellers.filter((r) => !r.id.startsWith('reseller-lucas') && !r.id.startsWith('reseller-marcos') && !r.id.startsWith('reseller-juliana'));
    this.clients = this.clients.filter((c) => c.RevendedorId !== 'reseller-lucas-01' && c.tenantId !== 'tenant-cinefp-01' && c.tenantId !== 'tenant-vipplay-02');
    this.transactions = [];

    // Se o usuário não está autenticado, currentUser é estritamente null (não entra no painel)
    const savedAuth = loadFromStorage<AuthUser | null>(STORAGE_KEYS.AUTH, null);
    this.currentUser = savedAuth;

    // Disparar sincronização automática imediata com as tabelas reais do Baserow (1575, 1574, 889)
    setTimeout(() => {
      this.syncFromBaserowDirectly().catch(() => {});
    }, 50);
  }

  // Subscribe to changes for reactive UI
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    saveToStorage(STORAGE_KEYS.TENANTS, this.tenants);
    saveToStorage(STORAGE_KEYS.RESELLERS, this.resellers);
    saveToStorage(STORAGE_KEYS.CLIENTS, this.clients);
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, this.transactions);
    saveToStorage(STORAGE_KEYS.AUTH, this.currentUser);
    saveToStorage(STORAGE_KEYS.MASTER_BASEROW, this.masterBaserowConfig);
    this.listeners.forEach((l) => l());
  }

  // ==========================================
  // AUTENTICAÇÃO E SESSÃO
  // ==========================================

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public login(email: string, senha?: string): { success: boolean; message?: string; user?: AuthUser } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = senha?.trim() || '';

    // 1. Super Admin Dono (awina1051@gmail.com / 12345678)
    if (cleanEmail === 'awina1051@gmail.com') {
      if (cleanPass !== '12345678') {
        return { success: false, message: 'Senha incorreta para o Super Admin Dono.' };
      }
      const user: AuthUser = {
        id: 'super-admin-root',
        nome: 'Super Admin Dono',
        email: 'awina1051@gmail.com',
        role: 'SUPER_ADMIN',
      };
      this.currentUser = user;
      this.notify();
      return { success: true, user };
    }

    // 2. Tenants (Dono de App)
    const tenant = this.tenants.find((t) => t.email.toLowerCase() === cleanEmail);
    if (tenant) {
      if (tenant.senha && tenant.senha !== cleanPass) {
        return { success: false, message: 'Senha incorreta para o Dono do Aplicativo.' };
      }
      if (tenant.status === 'BLOQUEADO') {
        return { success: false, message: 'Conta do aplicativo bloqueada. Entre em contato com a administração.' };
      }
      const user: AuthUser = {
        id: tenant.id,
        nome: tenant.nomeDono,
        email: tenant.email,
        role: 'TENANT_OWNER',
        tenantId: tenant.id,
        tenant,
      };
      this.currentUser = user;
      this.notify();
      return { success: true, user };
    }

    // 3. Resellers (Revendedores)
    const reseller = this.resellers.find((r) => r.email.toLowerCase() === cleanEmail);
    if (reseller) {
      if (reseller.senha && reseller.senha !== cleanPass) {
        return { success: false, message: 'Senha incorreta para o Revendedor.' };
      }
      const parentTenant = this.tenants.find((t) => t.id === reseller.tenantId);
      if (parentTenant && parentTenant.status === 'BLOQUEADO') {
        return { success: false, message: 'O servidor deste aplicativo está temporariamente indisponível.' };
      }
      if (reseller.status === 'BLOQUEADO') {
        return { success: false, message: 'Seu cadastro de revendedor está bloqueado. Fale com seu Dono de App.' };
      }

      const user: AuthUser = {
        id: reseller.id,
        nome: reseller.nome,
        email: reseller.email,
        role: 'RESELLER',
        tenantId: reseller.tenantId,
        tenant: parentTenant,
        reseller,
      };
      this.currentUser = user;
      this.notify();
      return { success: true, user };
    }

    return { success: false, message: 'Usuário não encontrado. Verifique o email e senha digitados.' };
  }

  public impersonateTenant(tenantId: string): void {
    // Revendedor NUNCA pode acessar painel do dono
    if (this.currentUser?.role === 'RESELLER' || this.currentUser?.role !== 'SUPER_ADMIN') {
      console.warn('Acesso restrito: Revendedores não têm permissão para acessar o painel do Dono.');
      return;
    }

    const tenant = this.tenants.find((t) => t.id === tenantId);
    if (tenant) {
      const actor = this.currentUser;
      this.currentUser = {
        id: tenant.id,
        nome: tenant.nomeDono,
        email: tenant.email,
        role: 'TENANT_OWNER',
        tenantId: tenant.id,
        tenant,
        impersonatedBy: actor ? {
          userId: actor.id,
          role: actor.role,
          name: actor.nome,
        } : undefined,
      };
      this.notify();
    }
  }

  public impersonateReseller(resellerId: string): void {
    const reseller = this.resellers.find((r) => r.id === resellerId);
    if (reseller) {
      const parentTenant = this.tenants.find((t) => t.id === reseller.tenantId);
      const actor = this.currentUser;
      this.currentUser = {
        id: reseller.id,
        nome: reseller.nome,
        email: reseller.email,
        role: 'RESELLER',
        tenantId: reseller.tenantId,
        tenant: parentTenant,
        reseller,
        impersonatedBy: actor ? {
          userId: actor.id,
          role: actor.role,
          name: actor.nome,
        } : undefined,
      };
      this.notify();
    }
  }

  public stopImpersonation(): void {
    if (!this.currentUser?.impersonatedBy) return;

    const imp = this.currentUser.impersonatedBy;
    if (imp.role === 'SUPER_ADMIN') {
      this.currentUser = {
        id: 'super-admin-root',
        nome: 'Super Admin Dono',
        email: 'awina1051@gmail.com',
        role: 'SUPER_ADMIN',
      };
      this.notify();
    } else if (imp.role === 'TENANT_OWNER') {
      const tenant = this.tenants.find((t) => t.id === imp.userId);
      if (tenant) {
        this.currentUser = {
          id: tenant.id,
          nome: tenant.nomeDono,
          email: tenant.email,
          role: 'TENANT_OWNER',
          tenantId: tenant.id,
          tenant,
        };
        this.notify();
      }
    }
  }

  public logout(): void {
    this.currentUser = null;
    this.notify();
  }

  public getTenantBySlug(slug: string): Tenant | undefined {
    return this.tenants.find((t) => t.slug.toLowerCase() === slug.toLowerCase());
  }

  // ==========================================
  // SUPER ADMIN & BASEROW MASTER (1575, 1574, 889)
  // ==========================================

  public getMasterBaserowConfig(): SuperAdminBaserowConfig {
    return { ...this.masterBaserowConfig };
  }

  public updateMasterBaserowConfig(updates: Partial<SuperAdminBaserowConfig>): void {
    this.masterBaserowConfig = { ...this.masterBaserowConfig, ...updates };
    this.superAdminMaster = new SuperAdminBaserowMaster(this.masterBaserowConfig);
    this.notify();
  }

  public async testMasterBaserowTables() {
    return this.superAdminMaster.testAllMasterTables();
  }

  /**
   * Puxa todos os registros 100% REAIS das tabelas do Baserow
   */
  public async syncFromBaserowDirectly(): Promise<{ success: boolean; message: string; counts?: any }> {
    const res = await this.superAdminMaster.fetchAllRealData();
    if (res.success) {
      this.tenants = res.tenants;
      this.resellers = res.resellers;
      this.clients = res.clients;
      this.notify();
      return {
        success: true,
        message: `Sincronizado com sucesso! ${res.tenants.length} Donos de App (Tabela 1575), ${res.resellers.length} Revendedores (Tabela 1574) e ${res.clients.length} Clientes Finais (Tabela 889) reais carregados do Baserow.`,
        counts: {
          tenants: res.tenants.length,
          resellers: res.resellers.length,
          clients: res.clients.length,
        },
      };
    }
    return { success: false, message: res.error || 'Falha ao sincronizar com Baserow' };
  }

  public getAllTenants(): Tenant[] {
    return [...this.tenants];
  }

  public createTenant(tenantData: Omit<Tenant, 'id' | 'dataCriacao'>): Tenant {
    const newTenant: Tenant = {
      ...tenantData,
      id: `tenant-${Date.now()}`,
      dataCriacao: new Date().toISOString(),
    };
    this.tenants.unshift(newTenant);
    this.notify();

    // Sincronização automática com a tabela 1575 (Tenant) no Baserow
    this.superAdminMaster.syncTenantToBaserow(newTenant).catch((err) => {
      console.warn('Sync diferido com tabela 1575 de Tenants:', err);
    });

    return newTenant;
  }

  public updateTenant(id: string, updates: Partial<Tenant>): void {
    this.tenants = this.tenants.map((t) => (t.id === id ? { ...t, ...updates } : t));
    // If current user is this tenant, update session
    if (this.currentUser?.tenantId === id && this.currentUser.tenant) {
      this.currentUser.tenant = { ...this.currentUser.tenant, ...updates };
    }
    this.notify();
  }

  public deleteTenant(id: string): void {
    this.tenants = this.tenants.filter((t) => t.id !== id);
    this.resellers = this.resellers.filter((r) => r.tenantId !== id);
    this.clients = this.clients.filter((c) => c.tenantId !== id);
    this.notify();
  }

  public getGlobalStats() {
    const totalTenants = this.tenants.length;
    const activeTenants = this.tenants.filter((t) => t.status === 'ATIVO').length;
    const totalResellers = this.resellers.length;
    const totalClients = this.clients.length;
    const activeClients = this.clients.filter((c) => c.Status === 'Premium' || c.Status === 'Ativo').length;
    
    // Total credits in circulation across all resellers
    const totalCreditsInCirculation = this.resellers.reduce((acc, r) => acc + (r.saldoCreditos || 0), 0);

    return {
      totalTenants,
      activeTenants,
      totalResellers,
      totalClients,
      activeClients,
      totalCreditsInCirculation,
    };
  }

  // ==========================================
  // TENANT (DONO DO APP) ACTIONS
  // ==========================================

  public getResellersByTenant(tenantId: string): Reseller[] {
    return this.resellers.filter((r) => r.tenantId === tenantId);
  }

  public createReseller(data: Omit<Reseller, 'id' | 'dataCriacao' | 'testesUsadosHoje'>): Reseller {
    const newReseller: Reseller = {
      ...data,
      id: `reseller-${Date.now()}`,
      testesUsadosHoje: 0,
      dataCriacao: new Date().toISOString(),
    };
    this.resellers.unshift(newReseller);

    // If initial credits > 0, log transaction
    if (newReseller.saldoCreditos > 0) {
      this.transactions.unshift({
        id: `tx-${Date.now()}`,
        tenantId: data.tenantId,
        revendedorId: newReseller.id,
        revendedorNome: newReseller.nome,
        tipo: 'ADICAO',
        quantidade: newReseller.saldoCreditos,
        descricao: 'Saldo inicial de créditos atribuído no cadastro',
        dataCriacao: new Date().toISOString(),
      });
    }

    this.notify();

    // Sincronização automática com a tabela 1574 (Revendedor) no Baserow
    const parentTenant = this.tenants.find((t) => t.id === data.tenantId);
    this.superAdminMaster.syncResellerToBaserow(newReseller, parentTenant?.nomeApp).catch((err) => {
      console.warn('Sync diferido com tabela 1574 de Revendedores:', err);
    });

    return newReseller;
  }

  public updateReseller(id: string, updates: Partial<Reseller>): void {
    this.resellers = this.resellers.map((r) => (r.id === id ? { ...r, ...updates } : r));
    this.notify();
  }

  public adjustResellerCredits(
    resellerId: string,
    quantidade: number,
    descricao: string
  ): { success: boolean; novoSaldo: number; message?: string } {
    const reseller = this.resellers.find((r) => r.id === resellerId);
    if (!reseller) return { success: false, novoSaldo: 0, message: 'Revendedor não encontrado' };

    const novoSaldo = (reseller.saldoCreditos || 0) + quantidade;
    if (novoSaldo < 0) {
      return { success: false, novoSaldo: reseller.saldoCreditos, message: 'O saldo não pode ficar negativo' };
    }

    reseller.saldoCreditos = novoSaldo;

    // Log transaction
    this.transactions.unshift({
      id: `tx-${Date.now()}`,
      tenantId: reseller.tenantId,
      revendedorId: reseller.id,
      revendedorNome: reseller.nome,
      tipo: quantidade >= 0 ? 'ADICAO' : 'SUBTRACAO',
      quantidade,
      descricao: descricao || (quantidade >= 0 ? 'Adição de créditos pelo Dono' : 'Ajuste de créditos pelo Dono'),
      dataCriacao: new Date().toISOString(),
    });

    this.notify();
    return { success: true, novoSaldo };
  }

  public getTenantStats(tenantId: string) {
    const resellers = this.getResellersByTenant(tenantId);
    const tenantClients = this.clients.filter((c) => c.tenantId === tenantId);
    const activeClients = tenantClients.filter((c) => c.Status === 'Premium' || c.Status === 'Ativo').length;
    const directClients = tenantClients.filter((c) => c.RevendedorId === 'DONO').length;
    const totalCreditsCirculating = resellers.reduce((acc, r) => acc + (r.saldoCreditos || 0), 0);

    return {
      totalResellers: resellers.length,
      activeResellers: resellers.filter((r) => r.status === 'ATIVO').length,
      totalClients: tenantClients.length,
      activeClients,
      directClients,
      totalCreditsCirculating,
    };
  }

  // ==========================================
  // CLIENTS & RESELLER ACTIONS (COM BASEROW)
  // ==========================================

  public getClientsForReseller(resellerId: string, tenantId: string): BaserowClient[] {
    return this.clients.filter((c) => c.tenantId === tenantId && c.RevendedorId === resellerId);
  }

  public getAllClientsForTenant(tenantId: string): BaserowClient[] {
    return this.clients.filter((c) => c.tenantId === tenantId);
  }

  /**
   * Criação de novo cliente com consumo atômico de créditos para revendedores
   */
  public async createClient(
    params: {
      Nome: string;
      Email: string;
      Senha: string;
      WhatsApp?: string;
      ID?: string;
      Limite?: number;
      meses: number; // 1, 3, 6 ou 12 meses
      tenantId: string;
      revendedorId: string;
      criadoPorNome: string;
    }
  ): Promise<{ success: boolean; client?: BaserowClient; message?: string }> {
    const { Nome, Email, Senha, WhatsApp, meses, tenantId, revendedorId, criadoPorNome } = params;
    const isOwner = revendedorId === 'DONO';
    const creditsNeeded = meses; // 1 mês = 1, 3 = 3, 6 = 6, 12 = 12

    // 1. Se for revendedor, validar saldo de créditos
    let reseller: Reseller | undefined;
    if (!isOwner) {
      reseller = this.resellers.find((r) => r.id === revendedorId);
      if (!reseller) {
        return { success: false, message: 'Revendedor não identificado.' };
      }
      if (reseller.saldoCreditos < creditsNeeded) {
        return {
          success: false,
          message: `Saldo insuficiente! Você tem ${reseller.saldoCreditos} créditos, mas são necessários ${creditsNeeded} créditos para ${meses} mês(es).`,
        };
      }
    }

    // 2. Formato exato ISO 8601 exigido pelo app (ex: 2026-10-28T06:45:39.809Z)
    const nowIso = new Date().toISOString();
    const expirationDate = this.calculateNewExpirationDate(null, meses * 30);
    
    // REGRA FUNDAMENTAL: NUNCA criar cliente com ID gerado pelo sistema.
    // O ID é atribuído exclusivamente pelo aparelho físico (TV Box/Celular) quando ele se conecta.
    const deviceId = params.ID && params.ID.trim() !== '' ? params.ID.trim() : null;

    // 3. Montar cliente com Status 'Premium', DataCriacao ISO e Vencimento ISO
    const newClient: BaserowClient = {
      id: Math.floor(1000 + Math.random() * 90000),
      ID: deviceId,
      Nome,
      Email,
      Senha,
      WhatsApp: WhatsApp || null,
      Telefone: WhatsApp || null,
      Status: 'Premium', // Nunca "Ativo"
      Vencimento: expirationDate, // ex: 2026-10-28T06:45:39.809Z
      DataCriacao: nowIso, // ex: 2026-10-28T06:45:39.809Z
      dataCriacao: nowIso,
      Limite: params.Limite || 1,
      RevendedorId: revendedorId,
      CriadoPor: criadoPorNome,
      tenantId,
    };

    // 4. Executar transação de crédito se for revendedor
    if (!isOwner && reseller) {
      reseller.saldoCreditos -= creditsNeeded;
      this.transactions.unshift({
        id: `tx-${Date.now()}`,
        tenantId,
        revendedorId,
        revendedorNome: reseller.nome,
        tipo: 'CONSUMO_NOVO',
        quantidade: -creditsNeeded,
        descricao: `Criação do cliente Premium: ${Nome} (${meses} mês/meses)`,
        dataCriacao: nowIso,
      });
    }

    // 5. Salvar na lista local (resiliente)
    this.clients.unshift(newClient);
    this.notify();

    // 6. Sincronizar com a API real do Baserow
    const tenant = this.tenants.find((t) => t.id === tenantId);
    if (tenant) {
      const baserow = new DynamicBaserowClient(tenant);
      baserow.createClientInBaserow(newClient).catch((err) => {
        console.warn('Sync Baserow remoto diferido (fallback em memória garantido):', err);
      });
    }

    return { success: true, client: newClient };
  }

  /**
   * Geração de Teste Grátis (2h ou 4h) sem consumir créditos e com formato ISO
   */
  public async createFreeTest(
    params: {
      Nome: string;
      WhatsApp?: string;
      horas: 2 | 4;
      tenantId: string;
      revendedorId: string;
      criadoPorNome: string;
    }
  ): Promise<{ success: boolean; client?: BaserowClient; message?: string }> {
    const { Nome, WhatsApp, horas, tenantId, revendedorId, criadoPorNome } = params;
    const isOwner = revendedorId === 'DONO';

    let reseller: Reseller | undefined;
    if (!isOwner) {
      reseller = this.resellers.find((r) => r.id === revendedorId);
      if (reseller) {
        if (reseller.testesUsadosHoje >= reseller.cotaTestesDiarios) {
          return {
            success: false,
            message: `Cota diária de testes esgotada (${reseller.testesUsadosHoje}/${reseller.cotaTestesDiarios}). Novos testes liberados amanhã ou fale com o Dono do App.`,
          };
        }
        reseller.testesUsadosHoje += 1;
      }
    }

    // Email pequeno e simples conforme solicitado: teste12@gmail.com ou teste.nome@gmail.com
    const cleanFirstName = Nome.trim().split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').slice(0, 7);
    const shortNum = Math.floor(10 + Math.random() * 89); // 2 dígitos: ex 12, 34, 78
    const login = cleanFirstName && cleanFirstName.length >= 3 && cleanFirstName.length <= 6
      ? `teste.${cleanFirstName}@gmail.com`
      : `teste${shortNum}@gmail.com`;

    const senha = Math.floor(1000 + Math.random() * 9000).toString(); // Senha de 4 dígitos fácil de digitar no controle
    const now = new Date();
    const nowIso = now.toISOString();
    const expIso = new Date(now.getTime() + horas * 60 * 60 * 1000).toISOString();

    const testClient: BaserowClient = {
      id: Math.floor(1000 + Math.random() * 90000),
      ID: null, // Sem ID no teste: o aparelho atribui ao conectar
      Nome: `${Nome} (Teste ${horas}h)`,
      Email: login,
      Senha: senha,
      WhatsApp: WhatsApp || null,
      Telefone: WhatsApp || null,
      Status: 'Grátis', // Conforme solicitado: deve ser Grátis e NÃO Teste
      Vencimento: expIso,
      DataCriacao: nowIso,
      dataCriacao: nowIso,
      Limite: 1,
      RevendedorId: revendedorId,
      CriadoPor: criadoPorNome,
      tenantId,
    };

    this.clients.unshift(testClient);
    this.notify();

    // Async sync with Baserow
    const tenant = this.tenants.find((t) => t.id === tenantId);
    if (tenant) {
      const baserow = new DynamicBaserowClient(tenant);
      baserow.createClientInBaserow(testClient).catch((err) => {
        console.warn('Sync Baserow remoto diferido para teste:', err);
      });
    }

    return { success: true, client: testClient };
  }

  /**
   * Renovação inteligente de cliente (+30, 90, 180 ou 365 dias)
   * Vencimento e Status atualizado para 'Premium'
   */
  public async renewClient(
    clientId: string | number,
    meses: number,
    executorRole: 'TENANT_OWNER' | 'RESELLER'
  ): Promise<{ success: boolean; novoVencimento?: string; message?: string }> {
    const client = this.clients.find((c) => c.id === clientId);
    if (!client) return { success: false, message: 'Cliente não encontrado.' };

    const creditsNeeded = meses;
    const isOwner = executorRole === 'TENANT_OWNER' || client.RevendedorId === 'DONO';

    if (!isOwner) {
      const reseller = this.resellers.find((r) => r.id === client.RevendedorId);
      if (!reseller) return { success: false, message: 'Revendedor não encontrado.' };
      if (reseller.saldoCreditos < creditsNeeded) {
        return {
          success: false,
          message: `Saldo insuficiente! Você possui ${reseller.saldoCreditos} créditos, mas são necessários ${creditsNeeded} créditos para ${meses} mês(es).`,
        };
      }

      // Descontar créditos
      reseller.saldoCreditos -= creditsNeeded;
      this.transactions.unshift({
        id: `tx-${Date.now()}`,
        tenantId: client.tenantId,
        revendedorId: reseller.id,
        revendedorNome: reseller.nome,
        tipo: 'CONSUMO_RENOVACAO',
        quantidade: -creditsNeeded,
        descricao: `Renovação Premium: ${client.Nome} (+${meses * 30} dias)`,
        dataCriacao: new Date().toISOString(),
      });
    }

    // Calcular nova data de vencimento inteligente em ISO 8601
    const newExpiration = this.calculateNewExpirationDate(client.Vencimento, meses * 30);
    client.Vencimento = newExpiration;
    client.Status = 'Premium'; // Sempre Premium na renovação

    this.notify();

    // Sync com Baserow
    const tenant = this.tenants.find((t) => t.id === client.tenantId);
    if (tenant) {
      const baserow = new DynamicBaserowClient(tenant);
      baserow.updateClientInBaserow(client.id, {
        Vencimento: newExpiration,
        Status: 'Premium',
      }).catch((err) => {
        console.warn('Sync Baserow remoto de renovação diferido:', err);
      });
    }

    return { success: true, novoVencimento: newExpiration };
  }

  public deleteClient(clientId: string | number): void {
    this.clients = this.clients.filter((c) => c.id !== clientId);
    this.notify();
  }

  // ==========================================
  // HELPERS
  // ==========================================

  public calculateNewExpirationDate(currentExpStr: string | null | undefined, daysToAdd: number): string {
    const now = new Date();
    let baseDate = now;

    if (currentExpStr) {
      const parsed = new Date(currentExpStr);
      // Se parsed for válido e for data futura, adiciona a partir de parsed
      if (!isNaN(parsed.getTime()) && parsed > now) {
        baseDate = parsed;
      }
    }

    const result = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return result.toISOString(); // Formato exato do app: 2026-10-28T06:45:39.809Z
  }

  public generateRandomDeviceId(): string {
    const chars = '0123456789abcdef';
    let res = '';
    for (let i = 0; i < 16; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    return res;
  }

  public getTransactionsByTenant(tenantId: string): CreditTransaction[] {
    return this.transactions.filter((t) => t.tenantId === tenantId);
  }

  public getTransactionsByReseller(resellerId: string): CreditTransaction[] {
    return this.transactions.filter((t) => t.revendedorId === resellerId);
  }

  /**
   * Gera o texto limpo para cópia direta na área de transferência (para mandar ao cliente)
   */
  public generateClientAccessText(client: BaserowClient, appName: string, downloadUrl?: string): string {
    const isTest = client.Status === 'Grátis' || client.Status === 'Teste';
    const link = downloadUrl || 'https://cinefp.app/download';

    let formattedDate = client.Vencimento;
    try {
      const d = new Date(client.Vencimento);
      if (!isNaN(d.getTime())) {
        formattedDate = `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      }
    } catch {}

    const deviceLine = client.ID && String(client.ID).trim() !== ''
      ? `📱 Device ID do Aparelho: ${client.ID}\n`
      : `📱 Instalação do Aparelho: Abra o aplicativo e entre com seu Usuário e Senha abaixo. Seu aparelho será vinculado automaticamente no 1º acesso!\n`;

    if (isTest) {
      return (
        `🎬 SEU TESTE GRÁTIS NO ${appName.toUpperCase()} ESTÁ LIBERADO!\n\n` +
        `Olá, ${client.Nome}! Seguem os seus dados de acesso:\n\n` +
        deviceLine +
        `👤 Usuário: ${client.Email}\n` +
        `🔑 Senha: ${client.Senha}\n` +
        `💎 Status: GRÁTIS\n` +
        `📺 Telas Permitidas: ${client.Limite}\n` +
        `⏳ Válido até: ${formattedDate}\n\n` +
        `📥 Baixe o aplicativo oficial aqui: ${link}\n\n` +
        `Qualquer dúvida para instalar na Smart TV ou Celular, me avise!`
      );
    }

    return (
      `⭐ BEM-VINDO AO ${appName.toUpperCase()}!\n\n` +
      `Olá, ${client.Nome}, seu plano PREMIUM foi ativado com sucesso:\n\n` +
      deviceLine +
      `👤 Usuário: ${client.Email}\n` +
      `🔑 Senha: ${client.Senha}\n` +
      `💎 Status: PREMIUM\n` +
      `📺 Limite de Telas: ${client.Limite}\n` +
      `📅 Vencimento: ${formattedDate}\n\n` +
      `📥 Baixar Aplicativo Oficial: ${link}\n\n` +
      `Agradecemos pela preferência e bom entretenimento! 🍿`
    );
  }

  /**
   * Gera a mensagem formatada para envio no WhatsApp do cliente final
   */
  public generateWhatsAppMessage(client: BaserowClient, appName: string, downloadUrl?: string): string {
    const isTest = client.Status === 'Grátis' || client.Status === 'Teste';
    const link = downloadUrl || 'https://cinefp.app/download';

    let formattedDate = client.Vencimento;
    try {
      const d = new Date(client.Vencimento);
      if (!isNaN(d.getTime())) {
        formattedDate = `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      }
    } catch {}

    const deviceLine = client.ID && String(client.ID).trim() !== ''
      ? `📱 *Device ID do Aparelho:* \`${client.ID}\`\n`
      : `📱 *Instalação do Aparelho:* Abra o aplicativo e entre com seu Usuário e Senha abaixo. Seu aparelho será vinculado automaticamente no 1º acesso!\n`;

    if (isTest) {
      return encodeURIComponent(
        `🎬 *SEU TESTE GRÁTIS NO ${appName.toUpperCase()} ESTÁ LIBERADO!*\n\n` +
        `Olá, *${client.Nome}*! Seguem os seus dados de acesso:\n\n` +
        deviceLine +
        `👤 *Usuário:* \`${client.Email}\`\n` +
        `🔑 *Senha:* \`${client.Senha}\`\n` +
        `💎 *Status:* GRÁTIS\n` +
        `📺 *Telas Permitidas:* ${client.Limite}\n` +
        `⏳ *Válido até:* ${formattedDate}\n\n` +
        `📥 *Baixe o aplicativo oficial aqui:* ${link}\n\n` +
        `Qualquer dúvida para instalar na Smart TV ou Celular, me avise!`
      );
    }

    return encodeURIComponent(
      `⭐ *BEM-VINDO AO ${appName.toUpperCase()}!*\n\n` +
      `Olá, *${client.Nome}*, seu plano *PREMIUM* foi ativado com sucesso:\n\n` +
      deviceLine +
      `👤 *Usuário:* \`${client.Email}\`\n` +
      `🔑 *Senha:* \`${client.Senha}\`\n` +
      `💎 *Status:* PREMIUM\n` +
      `📺 *Limite de Telas:* ${client.Limite}\n` +
      `📅 *Vencimento:* ${formattedDate}\n\n` +
      `📥 *Baixar Aplicativo Oficial:* ${link}\n\n` +
      `Agradecemos pela preferência e bom entretenimento! 🍿`
    );
  }
}

export const saasStore = new SaaSDataManager();
