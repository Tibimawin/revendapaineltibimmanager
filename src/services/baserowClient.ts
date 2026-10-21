import { BaserowClient, Tenant } from '../types';

export interface BaserowTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  statusCode?: number;
  usingFallback?: boolean;
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
    const tableId = this.tenant.baserowTableUsuarios || '1165';
    return `${base}api/database/rows/table/${tableId}/?user_field_names=true`;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.tenant.baserowToken}`,
    };
  }

  /**
   * Testa a conectividade com o servidor Baserow configurado para este Tenant
   */
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
          message: `Conectado com sucesso ao Baserow na tabela ${this.tenant.baserowTableUsuarios}!`,
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
          ? 'Tempo limite excedido ao conectar ao Baserow (Timeout 4s). Modo fallback em memória ativo.'
          : `Não foi possível alcançar o Baserow (${err.message || 'Erro de rede/CORS'}). Modo seguro ativo.`,
        latencyMs,
        usingFallback: true,
      };
    }
  }

  /**
   * Busca linhas de clientes no Baserow
   */
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

  /**
   * Adiciona uma nova linha de cliente na tabela do Baserow
   */
  async createClientInBaserow(clientData: Partial<BaserowClient>): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const payload = {
        ID: clientData.ID,
        Nome: clientData.Nome,
        Email: clientData.Email,
        Senha: clientData.Senha,
        Status: clientData.Status || 'Ativo',
        Vencimento: clientData.Vencimento,
        Limite: clientData.Limite || 1,
        RevendedorId: clientData.RevendedorId || 'DONO',
        CriadoPor: clientData.CriadoPor || 'DONO',
      };

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

  /**
   * Atualiza dados de cliente (ex: Vencimento ou Status) na tabela do Baserow
   */
  async updateClientInBaserow(rowId: string | number, updates: Partial<BaserowClient>): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const base = this.getCleanBaseUrl();
      const tableId = this.tenant.baserowTableUsuarios || '1165';
      const url = `${base}api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
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
