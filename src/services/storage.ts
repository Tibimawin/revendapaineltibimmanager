import { Tenant, Reseller, BaserowClient, CreditTransaction, AuthUser } from '../types';
import { INITIAL_TENANTS, INITIAL_RESELLERS, INITIAL_CLIENTS, INITIAL_TRANSACTIONS } from './mockData';
import { DynamicBaserowClient } from './baserowClient';

const STORAGE_KEYS = {
  TENANTS: 'streammaster_tenants_v1',
  RESELLERS: 'streammaster_resellers_v1',
  CLIENTS: 'streammaster_clients_v1',
  TRANSACTIONS: 'streammaster_transactions_v1',
  AUTH: 'streammaster_auth_v1',
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
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.tenants = loadFromStorage(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
    this.resellers = loadFromStorage(STORAGE_KEYS.RESELLERS, INITIAL_RESELLERS);
    this.clients = loadFromStorage(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    this.transactions = loadFromStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    
    // Default logged in user (or restored session)
    const savedAuth = loadFromStorage<AuthUser | null>(STORAGE_KEYS.AUTH, null);
    if (savedAuth) {
      this.currentUser = savedAuth;
    } else {
      // Default to Super Admin for immediate rich view
      this.currentUser = {
        id: 'super-admin-root',
        nome: 'Super Admin Master',
        email: 'admin@streammaster.com',
        role: 'SUPER_ADMIN',
      };
    }
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
    this.listeners.forEach((l) => l());
  }

  // ==========================================
  // AUTENTICAÇÃO E SESSÃO
  // ==========================================

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public login(email: string, senha?: string): { success: boolean; message?: string; user?: AuthUser } {
    // 1. Check Super Admin
    if (email.toLowerCase() === 'admin@streammaster.com') {
      const user: AuthUser = {
        id: 'super-admin-root',
        nome: 'Super Admin Master',
        email: 'admin@streammaster.com',
        role: 'SUPER_ADMIN',
      };
      this.currentUser = user;
      this.notify();
      return { success: true, user };
    }

    // 2. Check Tenants (Dono de App)
    const tenant = this.tenants.find((t) => t.email.toLowerCase() === email.toLowerCase());
    if (tenant) {
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

    // 3. Check Resellers (Revendedores)
    const reseller = this.resellers.find((r) => r.email.toLowerCase() === email.toLowerCase());
    if (reseller) {
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

    return { success: false, message: 'Credenciais inválidas. Verifique o email informado.' };
  }

  public impersonateTenant(tenantId: string): void {
    const tenant = this.tenants.find((t) => t.id === tenantId);
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

  public impersonateReseller(resellerId: string): void {
    const reseller = this.resellers.find((r) => r.id === resellerId);
    if (reseller) {
      const parentTenant = this.tenants.find((t) => t.id === reseller.tenantId);
      this.currentUser = {
        id: reseller.id,
        nome: reseller.nome,
        email: reseller.email,
        role: 'RESELLER',
        tenantId: reseller.tenantId,
        tenant: parentTenant,
        reseller,
      };
      this.notify();
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
  // SUPER ADMIN ACTIONS
  // ==========================================

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
    const activeClients = this.clients.filter((c) => c.Status === 'Ativo').length;
    
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
    const activeClients = tenantClients.filter((c) => c.Status === 'Ativo').length;
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

    // 2. Calcular data de vencimento
    const expirationDate = this.calculateNewExpirationDate(null, meses * 30);
    const deviceId = params.ID || this.generateRandomDeviceId();

    // 3. Montar cliente
    const newClient: BaserowClient = {
      id: Math.floor(1000 + Math.random() * 90000),
      ID: deviceId,
      Nome,
      Email,
      Senha,
      WhatsApp,
      Status: 'Ativo',
      Vencimento: expirationDate,
      Limite: params.Limite || 1,
      RevendedorId: revendedorId,
      CriadoPor: criadoPorNome,
      tenantId,
      dataCriacao: new Date().toISOString(),
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
        descricao: `Criação do cliente: ${Nome} (${meses} mês/meses)`,
        dataCriacao: new Date().toISOString(),
      });
    }

    // 5. Salvar na lista local (resiliente)
    this.clients.unshift(newClient);
    this.notify();

    // 6. Tentar despachar em background para a API real do Baserow
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
   * Geração de Teste Grátis (2h ou 4h) sem consumir créditos
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

    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    const cleanName = Nome.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const login = `teste.${cleanName || 'stream'}${testCode.slice(0, 3)}@app.com`;
    const senha = `test${testCode.slice(3)}`;
    const today = new Date().toISOString().split('T')[0];

    const testClient: BaserowClient = {
      id: Math.floor(1000 + Math.random() * 90000),
      ID: this.generateRandomDeviceId(),
      Nome: `${Nome} (Teste ${horas}h)`,
      Email: login,
      Senha: senha,
      WhatsApp,
      Status: 'Teste',
      Vencimento: today,
      Limite: 1,
      RevendedorId: revendedorId,
      CriadoPor: criadoPorNome,
      tenantId,
      dataCriacao: new Date().toISOString(),
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
   * Se vencimento for futuro: vencimentoAtual + dias
   * Se já estiver vencido: hoje + dias
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
        descricao: `Renovação do cliente: ${client.Nome} (+${meses * 30} dias)`,
        dataCriacao: new Date().toISOString(),
      });
    }

    // Calcular nova data de vencimento inteligente
    const newExpiration = this.calculateNewExpirationDate(client.Vencimento, meses * 30);
    client.Vencimento = newExpiration;
    client.Status = 'Ativo';

    this.notify();

    // Sync com Baserow
    const tenant = this.tenants.find((t) => t.id === client.tenantId);
    if (tenant) {
      const baserow = new DynamicBaserowClient(tenant);
      baserow.updateClientInBaserow(client.id, {
        Vencimento: newExpiration,
        Status: 'Ativo',
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

  public calculateNewExpirationDate(currentExpStr: string | null, daysToAdd: number): string {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let baseDate = now;
    if (currentExpStr) {
      const [year, month, day] = currentExpStr.split('-').map(Number);
      if (year && month && day) {
        const parsed = new Date(year, month - 1, day);
        parsed.setHours(0, 0, 0, 0);
        // Se a data de vencimento for futura, adiciona a partir dela!
        if (parsed > now) {
          baseDate = parsed;
        }
      }
    }

    const result = new Date(baseDate);
    result.setDate(result.getDate() + daysToAdd);

    const y = result.getFullYear();
    const m = String(result.getMonth() + 1).padStart(2, '0');
    const d = String(result.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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
   * Gera a mensagem formatada para envio no WhatsApp do cliente final
   */
  public generateWhatsAppMessage(client: BaserowClient, appName: string, downloadUrl?: string): string {
    const isTest = client.Status === 'Teste';
    const link = downloadUrl || 'https://cinefp.app/download';

    if (isTest) {
      return encodeURIComponent(
        `🎬 *SEU TESTE GRÁTIS NO ${appName.toUpperCase()} ESTÁ LIBERADO!*\n\n` +
        `Olá, *${client.Nome}*! Seguem os seus dados de acesso:\n\n` +
        `📱 *Device ID / Aparelho:* \`${client.ID}\`\n` +
        `👤 *Usuário:* \`${client.Email}\`\n` +
        `🔑 *Senha:* \`${client.Senha}\`\n` +
        `📺 *Telas Permitidas:* ${client.Limite}\n` +
        `⏳ *Validade:* Válido para teste rápido hoje!\n\n` +
        `📥 *Baixe o aplicativo oficial aqui:* ${link}\n\n` +
        `Qualquer dúvida para instalar na Smart TV ou Celular, me avise!`
      );
    }

    return encodeURIComponent(
      `⭐ *BEM-VINDO AO ${appName.toUpperCase()}!*\n\n` +
      `Olá, *${client.Nome}*, sua assinatura de streaming foi ativada com sucesso:\n\n` +
      `📱 *Device ID / Aparelho:* \`${client.ID}\`\n` +
      `👤 *Usuário:* \`${client.Email}\`\n` +
      `🔑 *Senha:* \`${client.Senha}\`\n` +
      `📺 *Limite de Telas:* ${client.Limite}\n` +
      `📅 *Vencimento:* ${client.Vencimento}\n\n` +
      `📥 *Baixar Aplicativo Oficial:* ${link}\n\n` +
      `Agradecemos pela preferência e bom entretenimento! 🍿`
    );
  }
}

export const saasStore = new SaaSDataManager();
