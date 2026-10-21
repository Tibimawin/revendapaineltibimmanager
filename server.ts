import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'StreamMaster SaaS Multi-Tenant Engine', timestamp: new Date().toISOString() });
  });

  // Baserow Dynamic Proxy endpoint to bypass any client-side CORS issues if needed
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

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      return res.status(502).json({ error: 'Falha ao conectar com Baserow', details: err.message });
    }
  });

  // Test Baserow connection directly from server
  app.post('/api/baserow/test', async (req: Request, res: Response) => {
    try {
      const { baserowUrl, baserowToken, baserowTableUsuarios } = req.body;
      let cleanUrl = (baserowUrl || 'http://31.220.72.235:8080/').trim();
      if (!cleanUrl.endsWith('/')) cleanUrl += '/';
      const targetUrl = `${cleanUrl}api/database/rows/table/${baserowTableUsuarios || '1165'}/?user_field_names=true&size=1`;

      const startTime = Date.now();
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${baserowToken}`,
        },
      });

      const latencyMs = Date.now() - startTime;
      if (response.ok) {
        return res.json({ success: true, latencyMs, message: `Conexão OK com tabela ${baserowTableUsuarios} (${latencyMs}ms)` });
      } else {
        return res.status(response.status).json({ success: false, latencyMs, message: `Status HTTP ${response.status}: ${response.statusText}` });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, message: `Erro de conexão: ${err.message}` });
    }
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
