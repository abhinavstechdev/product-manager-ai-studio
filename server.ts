import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleMcpPost } from './server/mcp/handler';
import { oauthRouter, getOauthServerMetadata, getProtectedResourceMetadata } from './server/oauth/router';
import { apiRouter } from './server/apiRouter';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON Body Parser with reasonable limits
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // CORS headers for Streamable HTTP MCP & OAuth clients
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-workspace-id, x-user-name');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // 1. OAuth 2.1 RFC Discovery Endpoints
  app.get('/.well-known/oauth-authorization-server', getOauthServerMetadata);
  app.get('/.well-known/oauth-protected-resource', getProtectedResourceMetadata);

  // 2. OAuth Router
  app.use('/api/oauth', oauthRouter);

  // 3. Remote MCP Server Streamable HTTP Endpoint (JSON-RPC 2.0 / Streamable HTTP)
  app.post('/api/mcp', handleMcpPost);
  app.get('/api/mcp', (_req, res) => {
    res.json({
      status: 'active',
      protocol: 'Model Context Protocol (MCP) Streamable HTTP',
      version: '2024-11-05',
      documentation: 'Send POST requests with JSON-RPC 2.0 payloads or connect with an official MCP client.',
    });
  });

  // 4. Human Web Dashboard REST APIs
  app.use('/api', apiRouter);

  // 5. Frontend Vite Middleware in dev, Static files in production
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NexusAI Inventory & MCP Server listening at http://0.0.0.0:${PORT}`);
    console.log(`MCP Endpoint available at http://0.0.0.0:${PORT}/api/mcp`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
