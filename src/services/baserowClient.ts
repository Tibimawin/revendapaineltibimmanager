import { BaserowClient, Tenant, Reseller } from '../types';

export interface BaserowTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  statusCode?: number;
  usingFallback?: boolean;
}

export interface SuperAdminBaserowConfig {
  baserowUrl: string;
  token: string;
  tableTenants: string; // 1575
  tableResellers: string; // 1574
  tableUsuariosDefault: string; // 889
}

export const SUPER_ADMIN_DEFAULT_CONFIG: SuperAdminBaserowConfig = {
  baserowUrl: 'http://31.220.72.235:8080/',
  token: 'Mu9bhoLo59fRYoyNOgSjFaxb6sjqT9sj',
  tableTenants: '1575',
  tableResellers: '1574',
  tableUsuariosDefault: '889',
};

/**
 * Cliente Baserow Master para o Super Admin
 * Gerencia Tenants na tabela 1575, Revendedores na tabela 1574 e Usuários na tabela 889
 */
export class SuperAdminBaserowMaster {
  private config: SuperAdminBaserowConfig;

  constructor(customConfig?: Partial<SuperAdminBaserowConfig>) {
    this.config = {
      ...SUPER_ADMIN_DEFAULT_CONFIG,
      ...customConfig,
    };
  }

  public getConfig(): SuperAdminBaserowConfig {
    return { ...this.config };
  }

  private getCleanBaseUrl(): string {
    let url = this.config.baserowUrl.trim();
    if (!url.endsWith('/')) url += '/';
    return url;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.config.token}`,
    };
  }

  /**
   * Testa todas as 3 tabelas criadas no Baserow (1575, 1574, 889)
   */
  async testAllMasterTables(): Promise<{
    allOk: boolean;
    results: {
      tenants: BaserowTestResult;
      resellers: BaserowTestResult;
      usuarios: BaserowTestResult;
    };
  }> {
    // Tenta primeiro via endpoint server-side proxy para contornar qualquer CORS de iframe
    try {
      const serverResp = await fetch('/api/baserow/superadmin/test-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: this.config.token,
          tableTenant: this.config.tableTenants,
          tableReseller: this.config.tableResellers,
          tableUsuarios: this.config.tableUsuariosDefault,
          baserowUrl: this.config.baserowUrl,
        }),
      });

      if (serverResp.ok) {
        const json = await serverResp.json();
        return {
          allOk: json.allOk,
          results: {
            tenants: {
              success: json.results.tenant?.ok,
              message: json.results.tenant?.message,
              latencyMs: json.results.tenant?.latencyMs,
            },
            resellers: {
              success: json.results.reseller?.ok,
              message: json.results.reseller?.message,
              latencyMs: json.results.reseller?.latencyMs,
            },
            usuarios: {
              success: json.results.usuarios?.ok,
              message: json.results.usuarios?.message,
              latencyMs: json.results.usuarios?.latencyMs,
            },
          },
        };
      }
    } catch {
      // fallback para direct fetch
    }

    // Direct fetch fallback
    const testSingle = async (tableId: string, name: string): Promise<BaserowTestResult> => {
      const start = performance.now();
      try {
        const url = `${this.getCleanBaseUrl()}api/database/rows/table/${tableId}/?user_field_names=true&size=1`;
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 4000);

        const r = await fetch(url, {
          method: 'GET',
          headers: this.getHeaders(),
          signal: ctrl.signal,
        });
        clearTimeout(timeout);
        const latencyMs = Math.round(performance.now() - start);

        return {
          success: r.ok,
          message: r.ok ? `${name} (Tabela ${tableId}) conectada!` : `Erro HTTP ${r.status}`,
          latencyMs,
          statusCode: r.status,
          usingFallback: !r.ok,
        };
      } catch (err: any) {
        return {
          success: false,
          message: `${name} (Tabela ${tableId}): ${err.message || 'Falha de rede/CORS'}`,
          latencyMs: Math.round(performance.now() - start),
          usingFallback: true,
        };
      }
    };

    const [resTenants, resResellers, resUsuarios] = await Promise.all([
      testSingle(this.config.tableTenants, 'Tenants'),
      testSingle(this.config.tableResellers, 'Revendedores'),
      testSingle(this.config.tableUsuariosDefault, 'Usuários'),
    ]);

    const allOk = resTenants.success && resResellers.success && resUsuarios.success;
    return {
      allOk,
      results: {
        tenants: resTenants,
        resellers: resResellers,
        usuarios: resUsuarios,
      },
    };
  }

  /**
   * Grava um novo Tenant na tabela 1575 do Baserow
   */
  /**
   * Grava um novo Tenant na tabela 1575 do Baserow com os nomes exatos de campos
   */
  async syncTenantToBaserow(tenant: Tenant): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const url = `${this.getCleanBaseUrl()}api/database/rows/table/${this.config.tableTenants}/?user_field_names=true`;
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 5000);

      const resp = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          nomeDono: tenant.nomeDono || '',
          email: tenant.email || '',
          senha: tenant.senha || '',
          whatsapp: tenant.whatsapp || '',
          nomeApp: tenant.nomeApp || '',
          logoUrl: tenant.logoUrl || '',
          corPrimaria: tenant.corPrimaria || '#00E5FF',
          baserowUrl: tenant.baserowUrl || this.config.baserowUrl,
          baserowToken: tenant.baserowToken || this.config.token,
          baserowTableUsuarios: tenant.baserowTableUsuarios || '889',
          chavePix: tenant.chavePix || '',
          status: tenant.status || 'ATIVO',
          vencimentoAssinatura: tenant.vencimentoAssinatura || null,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const data = await resp.json();
        return { success: true, data };
      }
      return { success: false, error: `Erro ${resp.status}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Grava um novo Revendedor na tabela 1574 do Baserow com os nomes exatos de campos
   */
  async syncResellerToBaserow(reseller: Reseller, appName?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const url = `${this.getCleanBaseUrl()}api/database/rows/table/${this.config.tableResellers}/?user_field_names=true`;
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 5000);

      const resp = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          tenantId: reseller.tenantId || '',
          nome: reseller.nome || '',
          email: reseller.email || '',
          senha: reseller.senha || '',
          whatsapp: reseller.whatsapp || '',
          saldoCreditos: Number(reseller.saldoCreditos) || 0,
          cotaTestesDiarios: Number(reseller.cotaTestesDiarios) || 10,
          testesUsadosHoje: String(reseller.testesUsadosHoje || 0),
          status: reseller.status || 'ATIVO',
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const data = await resp.json();
        return { success: true, data };
      }
      return { success: false, error: `Erro ${resp.status}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Busca todos os registros REAIS das tabelas 1575 (Tenants), 1574 (Revendedores) e 889 (Usuários)
   */
  async fetchAllRealData(): Promise<{
    success: boolean;
    tenants: Tenant[];
    resellers: Reseller[];
    clients: BaserowClient[];
    error?: string;
  }> {
    try {
      // 1. Tentar via endpoint backend proxy
      try {
        const resp = await fetch('/api/baserow/superadmin/sync-all');
        if (resp.ok) {
          const json = await resp.json();
          if (json.success) {
            return this.mapBaserowRows(json.tenants || [], json.resellers || [], json.clients || []);
          }
        }
      } catch {
        // fallback para requisição direta
      }

      // 2. Requisições diretas ao Baserow
      const headers = this.getHeaders();
      const baseUrl = this.getCleanBaseUrl();

      const [respTenants, respResellers, respClients] = await Promise.all([
        fetch(`${baseUrl}api/database/rows/table/${this.config.tableTenants}/?user_field_names=true&size=200`, { headers }),
        fetch(`${baseUrl}api/database/rows/table/${this.config.tableResellers}/?user_field_names=true&size=200`, { headers }),
        fetch(`${baseUrl}api/database/rows/table/${this.config.tableUsuariosDefault}/?user_field_names=true&size=200`, { headers }),
      ]);

      const tenantsData = respTenants.ok ? await respTenants.json() : { results: [] };
      const resellersData = respResellers.ok ? await respResellers.json() : { results: [] };
      const clientsData = respClients.ok ? await respClients.json() : { results: [] };

      return this.mapBaserowRows(
        tenantsData.results || [],
        resellersData.results || [],
        clientsData.results || []
      );
    } catch (err: any) {
      return {
        success: false,
        tenants: [],
        resellers: [],
        clients: [],
        error: err.message,
      };
    }
  }

  private mapBaserowRows(rawTenants: any[], rawResellers: any[], rawClients: any[]) {
    const tenants: Tenant[] = rawTenants.map((r) => ({
      id: String(r.id),
      nomeDono: r.nomeDono || 'Sem Nome',
      email: r.email || '',
      senha: r.senha || '123',
      whatsapp: r.whatsapp || '',
      nomeApp: r.nomeApp || 'Streaming App',
      slug: (r.nomeApp || 'app').toLowerCase().replace(/[^a-z0-9]/g, ''),
      logoUrl: r.logoUrl || '',
      corPrimaria: r.corPrimaria || '#00E5FF',
      baserowUrl: r.baserowUrl || this.config.baserowUrl,
      baserowToken: r.baserowToken || this.config.token,
      baserowTableUsuarios: r.baserowTableUsuarios || '889',
      chavePix: r.chavePix || '',
      valorCreditoUnitario: 15.0,
      appDownloadUrl: '',
      status: r.status === 'BLOQUEADO' ? 'BLOQUEADO' : 'ATIVO',
      vencimentoAssinatura: r.vencimentoAssinatura || '2027-12-31',
      dataCriacao: new Date().toISOString(),
    }));

    const resellers: Reseller[] = rawResellers.map((r) => ({
      id: String(r.id),
      tenantId: r.tenantId || (tenants[0]?.id || ''),
      nome: r.nome || 'Revendedor',
      email: r.email || '',
      senha: r.senha || '123',
      whatsapp: r.whatsapp || '',
      saldoCreditos: Number(r.saldoCreditos) || 0,
      cotaTestesDiarios: Number(r.cotaTestesDiarios) || 10,
      testesUsadosHoje: Number(r.testesUsadosHoje) || 0,
      status: r.status === 'BLOQUEADO' ? 'BLOQUEADO' : 'ATIVO',
      dataCriacao: new Date().toISOString(),
    }));

    const clients: BaserowClient[] = rawClients.map((c) => ({
      id: c.id,
      ID: c.ID || c.DeviceId || null,
      DeviceId: c.DeviceId || c.ID || null,
      Nome: c.Nome || 'Cliente',
      Email: c.Email || '',
      Senha: c.Senha || '',
      Status: (c.Status === 'Grátis' || c.Status === 'Teste' || c.Status === 'Vencido') ? c.Status : 'Premium',
      Vencimento: c.Vencimento || new Date().toISOString(),
      DataCriacao: c.DataCriacao || new Date().toISOString(),
      Limite: Number(c.Limite) || 1,
      RevendedorId: c.RevendedorId || 'DONO',
      CriadoPor: c.CriadoPor || 'DONO',
      Telefone: c.Telefone || null,
      WhatsApp: c.Telefone || null,
      tenantId: tenants[0]?.id || 'tenant-master',
      dataCriacao: c.DataCriacao || new Date().toISOString(),
    }));

    return {
      success: true,
      tenants,
      resellers,
      clients,
    };
  }
}

/**
 * Cliente REST dinâmico para o Baserow do Dono do Aplicativo
 * Alvo padrão: http://31.220.72.235:8080/api/database/rows/table/{TABLE_ID}/
 */
export class DynamicBaserowClient {
  private tenant: Tenant;

  constructor(tenant: Tenant) {
    this.tenant = tenant;
  }

  private getCleanBaseUrl(): string {
    let url = this.tenant.baserowUrl || 'http://31.220.72.235:8080/';
    if (!url.endsWith('/')) {
      url += '/';
    }
    return url;
  }

  private getTableRowsUrl(): string {
    const base = this.getCleanBaseUrl();
    const tableId = this.tenant.baserowTableUsuarios || '889';
    return `${base}api/database/rows/table/${tableId}/?user_field_names=true`;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.tenant.baserowToken || SUPER_ADMIN_DEFAULT_CONFIG.token}`,
    };
  }

  async testConnection(): Promise<BaserowTestResult> {
    const startTime = performance.now();
    try {
      const url = this.getTableRowsUrl() + '&size=1';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        return {
          success: true,
          message: `Conectado com sucesso ao Baserow na tabela ${this.tenant.baserowTableUsuarios || '889'}!`,
          latencyMs,
          statusCode: response.status,
          usingFallback: false,
        };
      } else {
        return {
          success: false,
          message: `Servidor Baserow respondeu com erro HTTP ${response.status}: ${response.statusText}`,
          latencyMs,
          statusCode: response.status,
          usingFallback: true,
        };
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      const isAbort = err.name === 'AbortError';
      return {
        success: false,
        message: isAbort
          ? 'Tempo limite excedido ao conectar ao Baserow (Timeout 4s). Modo fallback ativo.'
          : `Não foi possível alcançar o Baserow (${err.message || 'Erro de rede/CORS'}). Modo seguro ativo.`,
        latencyMs,
        usingFallback: true,
      };
    }
  }

  async fetchClientsFromBaserow(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(this.getTableRowsUrl(), {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const results = json.results || [];
        return { success: true, data: results };
      }
      return { success: false, error: `Status ${response.status}` };
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha de conexão com Baserow' };
    }
  }

  async createClientInBaserow(clientData: Partial<BaserowClient>): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const nowIso = new Date().toISOString();
      const statusFinal = clientData.Status === 'Teste' ? 'Teste' : clientData.Status === 'Grátis' ? 'Grátis' : 'Premium';
      const tableId = this.tenant.baserowTableUsuarios || '889';
      const cleanBase = this.getCleanBaseUrl();
      const token = this.tenant.baserowToken || SUPER_ADMIN_DEFAULT_CONFIG.token;

      // Montar payload com os campos exatos do app
      // IMPORTANTE: NUNCA enviar campo 'ID' na criação, pois o Device ID é gerado pelo aparelho físico no 1º acesso
      const payload: Record<string, any> = {
        Nome: clientData.Nome || '',
        Email: clientData.Email || '',
        Senha: clientData.Senha || '',
        Status: statusFinal,
        Vencimento: clientData.Vencimento || nowIso,
        DataCriacao: clientData.DataCriacao || nowIso,
        Limite: clientData.Limite || 1,
        RevendedorId: clientData.RevendedorId || 'DONO',
        CriadoPor: clientData.CriadoPor || 'DONO',
      };

      if (clientData.WhatsApp || clientData.Telefone) {
        payload.Telefone = clientData.WhatsApp || clientData.Telefone;
        payload.WhatsApp = clientData.WhatsApp || clientData.Telefone;
      }

      // Se e somente se o aparelho já tiver conectado e passado um ID físico prévio
      if (clientData.ID && String(clientData.ID).trim() !== '') {
        payload.ID = String(clientData.ID).trim();
      }

      // 1. Tentar primeiro via server-side proxy para garantir sucesso sem restrições de CORS no browser
      try {
        const proxyResp = await fetch('/api/baserow/create-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableId,
            token,
            baserowUrl: cleanBase,
            payload,
          }),
        });

        if (proxyResp.ok) {
          const json = await proxyResp.json();
          return { success: true, data: json };
        }
      } catch {
        // Segue para fetch direto
      }

      // 2. Fallback para requisição REST direta ao Baserow
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(this.getTableRowsUrl(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        return { success: true, data: json };
      }
      return { success: false, error: `Erro Baserow ${response.status}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async updateClientInBaserow(rowId: string | number, updates: Partial<BaserowClient>): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const base = this.getCleanBaseUrl();
      const tableId = this.tenant.baserowTableUsuarios || '889';
      const url = `${base}api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`;

      const safeUpdates: Record<string, any> = { ...updates };
      if (safeUpdates.Status === 'Ativo') {
        safeUpdates.Status = 'Premium';
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(safeUpdates),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        return { success: true, data: json };
      }
      return { success: false, error: `Erro Baserow ${response.status}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
