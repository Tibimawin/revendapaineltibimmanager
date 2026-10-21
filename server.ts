import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASEROW_DEFAULT_URL = 'http://31.220.72.235:8080/';
const SUPER_ADMIN_TOKEN = 'Mu9bhoLo59fRYoyNOgSjFaxb6sjqT9sj';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'StreamMaster SaaS Multi-Tenant Engine', timestamp: new Date().toISOString() });
  });

  // Baserow Dynamic Proxy endpoint
  app.post('/api/baserow/proxy', async (req: Request, res: Response) => {
    try {
      const { url, token, method, body } = req.body;
      if (!url || !token) {
        return res.status(400).json({ error: 'URL e Token do Baserow são obrigatórios' });
      }

      const response = await fetch(url, {
        method: method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json().catch(() => ({}));
      return res.status(response.status).json(data);
    } catch (err: any) {
      return res.status(502).json({ error: 'Falha ao conectar com Baserow', details: err.message });
    }
  });

  // Super Admin: Fetch all real rows from tables 1575 (Tenants), 1574 (Resellers), and 889 (Clients)
  app.get('/api/baserow/superadmin/sync-all', async (req: Request, res: Response) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Token ${SUPER_ADMIN_TOKEN}`,
      };

      // 1. Fetch Tenants (1575)
      const tenantsResp = await fetch(`${BASEROW_DEFAULT_URL}api/database/rows/table/1575/?user_field_names=true&size=200`, {
        method: 'GET',
        headers,
      });
      const tenantsData = tenantsResp.ok ? await tenantsResp.json() : { results: [] };

      // 2. Fetch Resellers (1574)
      const resellersResp = await fetch(`${BASEROW_DEFAULT_URL}api/database/rows/table/1574/?user_field_names=true&size=200`, {
        method: 'GET',
        headers,
      });
      const resellersData = resellersResp.ok ? await resellersResp.json() : { results: [] };

      // 3. Fetch Clients (889)
      const clientsResp = await fetch(`${BASEROW_DEFAULT_URL}api/database/rows/table/889/?user_field_names=true&size=200`, {
        method: 'GET',
        headers,
      });
      const clientsData = clientsResp.ok ? await clientsResp.json() : { results: [] };

      return res.json({
        success: true,
        tenants: tenantsData.results || [],
        resellers: resellersData.results || [],
        clients: clientsData.results || [],
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Super Admin: Create Tenant in Table 1575
  app.post('/api/baserow/superadmin/create-tenant', async (req: Request, res: Response) => {
    try {
      const tenantData = req.body;
      const response = await fetch(`${BASEROW_DEFAULT_URL}api/database/rows/table/1575/?user_field_names=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${SUPER_ADMIN_TOKEN}`,
        },
        body: JSON.stringify({
          nomeDono: tenantData.nomeDono || '',
          email: tenantData.email || '',
          senha: tenantData.senha || '',
          whatsapp: tenantData.whatsapp || '',
          nomeApp: tenantData.nomeApp || '',
          logoUrl: tenantData.logoUrl || '',
          corPrimaria: tenantData.corPrimaria || '#00E5FF',
          baserowUrl: tenantData.baserowUrl || BASEROW_DEFAULT_URL,
          baserowToken: tenantData.baserowToken || SUPER_ADMIN_TOKEN,
          baserowTableUsuarios: tenantData.baserowTableUsuarios || '889',
          chavePix: tenantData.chavePix || '',
          status: tenantData.status || 'ATIVO',
          vencimentoAssinatura: tenantData.vencimentoAssinatura || null,
        }),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Super Admin: Create Reseller in Table 1574
  app.post('/api/baserow/superadmin/create-reseller', async (req: Request, res: Response) => {
    try {
      const r = req.body;
      const response = await fetch(`${BASEROW_DEFAULT_URL}api/database/rows/table/1574/?user_field_names=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${SUPER_ADMIN_TOKEN}`,
        },
        body: JSON.stringify({
          tenantId: r.tenantId || '',
          nome: r.nome || '',
          email: r.email || '',
          senha: r.senha || '',
          whatsapp: r.whatsapp || '',
          saldoCreditos: Number(r.saldoCreditos) || 0,
          cotaTestesDiarios: Number(r.cotaTestesDiarios) || 10,
          testesUsadosHoje: String(r.testesUsadosHoje || 0),
          status: r.status || 'ATIVO',
        }),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Criar Cliente no Baserow (Tabela de Usuários, ex: 889) via Proxy Server-Side
  app.post('/api/baserow/create-client', async (req: Request, res: Response) => {
    try {
      const { tableId, token, baserowUrl, payload } = req.body;
      const targetTable = tableId || '889';
      const authToken = token || SUPER_ADMIN_TOKEN;
      let cleanUrl = (baserowUrl || BASEROW_DEFAULT_URL).trim();
      if (!cleanUrl.endsWith('/')) cleanUrl += '/';

      const safePayload = { ...payload };
      // O aparelho que gera o ID físico. Nunca enviar campo ID na criação!
      if (!safePayload.ID || String(safePayload.ID).trim() === '') {
        delete safePayload.ID;
      }
      if (safePayload.Status === 'Ativo') {
        safePayload.Status = 'Premium';
      }

      const response = await fetch(`${cleanUrl}api/database/rows/table/${targetTable}/?user_field_names=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${authToken}`,
        },
        body: JSON.stringify(safePayload),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Super Admin: Test all 3 master tables (Tenant 1575, Revendedor 1574, Usuários 889)
  app.post('/api/baserow/superadmin/test-all', async (req: Request, res: Response) => {
    const { token, tableTenant, tableReseller, tableUsuarios, baserowUrl } = req.body;
    const authToken = token || SUPER_ADMIN_TOKEN;
    let cleanUrl = (baserowUrl || BASEROW_DEFAULT_URL).trim();
    if (!cleanUrl.endsWith('/')) cleanUrl += '/';

    const tables = [
      { key: 'tenant', name: 'Tenant (Inquilinos)', id: tableTenant || '1575' },
      { key: 'reseller', name: 'Revendedor', id: tableReseller || '1574' },
      { key: 'usuarios', name: 'Usuários (Clientes Finais)', id: tableUsuarios || '889' },
    ];

    const results: Record<string, any> = {};

    for (const t of tables) {
      const startTime = Date.now();
      try {
        const url = `${cleanUrl}api/database/rows/table/${t.id}/?user_field_names=true&size=1`;
        const resp = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${authToken}`,
          },
        });
        const latencyMs = Date.now() - startTime;
        results[t.key] = {
          tableId: t.id,
          name: t.name,
          ok: resp.ok,
          status: resp.status,
          latencyMs,
          message: resp.ok ? `Tabela ${t.id} conectada com sucesso (${latencyMs}ms)` : `Erro HTTP ${resp.status}`,
        };
      } catch (err: any) {
        results[t.key] = {
          tableId: t.id,
          name: t.name,
          ok: false,
          latencyMs: Date.now() - startTime,
          message: `Falha na requisição: ${err.message}`,
        };
      }
    }

    const allOk = Object.values(results).every((r: any) => r.ok);
    res.json({ allOk, results });
  });

  // Setup Vite in development or static serving in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 StreamMaster SaaS Dev Server rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor:', err);
});
