import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { db, DEFAULT_USER_ID, DEFAULT_WORKSPACE_ID } from '../db/store';
import { OAuthClient, OAuthGrant } from '../db/types';

export const oauthRouter = express.Router();

function getBaseUrl(req: Request): string {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return process.env.APP_URL || `${protocol}://${host}`;
}

// 1. RFC 8414 Authorization Server Metadata
export function getOauthServerMetadata(req: Request, res: Response) {
  const baseUrl = getBaseUrl(req);
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/oauth/token`,
    registration_endpoint: `${baseUrl}/api/oauth/register`,
    revocation_endpoint: `${baseUrl}/api/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    scopes_supported: [
      'dashboard:read',
      'products:read',
      'products:write',
      'inventory:read',
      'inventory:write',
      'customers:read',
      'customers:write',
      'orders:read',
      'orders:create',
      'orders:update',
      'orders:cancel',
      'packing:read',
      'packing:write',
      'shipping:read',
      'shipping:write',
      'payments:read',
      'payments:write',
      'returns:read',
      'returns:write',
      'reports:read',
      'reports:export',
      'audit:read',
    ],
  });
}

// 2. RFC 9728 Protected Resource Metadata
export function getProtectedResourceMetadata(req: Request, res: Response) {
  const baseUrl = getBaseUrl(req);
  res.json({
    resource: `${baseUrl}/api/mcp`,
    authorization_servers: [baseUrl],
    scopes_supported: [
      'dashboard:read',
      'products:read',
      'products:write',
      'inventory:read',
      'inventory:write',
      'customers:read',
      'customers:write',
      'orders:read',
      'orders:create',
      'orders:update',
      'orders:cancel',
      'packing:read',
      'packing:write',
      'shipping:read',
      'shipping:write',
      'payments:read',
      'payments:write',
      'returns:read',
      'returns:write',
      'reports:read',
      'reports:export',
      'audit:read',
    ],
  });
}

/**
 * Verify PKCE S256 verifier against challenge
 */
function verifyPkce(verifier: string, challenge: string): boolean {
  const hash = crypto.createHash('sha256').update(verifier).digest('base64url');
  return hash === challenge;
}

// 3. /api/oauth/authorize
oauthRouter.get('/authorize', (req: Request, res: Response) => {
  const clientId = req.query.client_id as string;
  const redirectUri = req.query.redirect_uri as string;
  const responseType = req.query.response_type as string;
  const scopeParam = (req.query.scope as string) || 'dashboard:read products:read orders:read';
  const state = req.query.state as string;
  const codeChallenge = req.query.code_challenge as string;
  const codeChallengeMethod = req.query.code_challenge_method as string;

  if (!clientId) {
    return res.status(400).send('Bad Request: Missing client_id');
  }
  if (!redirectUri) {
    return res.status(400).send('Bad Request: Missing redirect_uri');
  }
  if (responseType !== 'code') {
    return res.status(400).send('Bad Request: response_type must be "code"');
  }

  // Find or create registered client
  let client = db.oauthClients.get(clientId);
  if (!client) {
    client = {
      id: `client_${Date.now()}`,
      client_id: clientId,
      client_name: clientId,
      redirect_uris: [redirectUri],
      allowed_scopes: scopeParam.split(' '),
      created_at: new Date().toISOString(),
    };
    db.oauthClients.set(client.client_id, client);
  }

  // Parse scopes
  const requestedScopes = scopeParam ? scopeParam.split(' ') : ['dashboard:read'];

  // Issue Authorization Code
  const authCode = `code_${crypto.randomBytes(24).toString('hex')}`;
  const grant: OAuthGrant = {
    id: `grant_${Date.now()}`,
    client_id: client.client_id,
    workspace_id: DEFAULT_WORKSPACE_ID,
    user_id: DEFAULT_USER_ID,
    code: authCode,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod || 'S256',
    scopes: requestedScopes,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    created_at: new Date().toISOString(),
  };

  // Store grant mapped by code
  db.oauthGrants.set(authCode, grant);

  // Return redirect to client callback
  const targetUrl = new URL(redirectUri);
  targetUrl.searchParams.set('code', authCode);
  if (state) targetUrl.searchParams.set('state', state);

  return res.redirect(targetUrl.toString());
});

// 4. /api/oauth/token
oauthRouter.post('/token', (req: Request, res: Response) => {
  const grantType = req.body.grant_type;

  if (grantType === 'authorization_code') {
    const code = req.body.code;
    const clientId = req.body.client_id;
    const codeVerifier = req.body.code_verifier;

    if (!code) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing code' });
    }

    const grant = db.oauthGrants.get(code);
    if (!grant) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code' });
    }

    if (new Date(grant.expires_at) < new Date()) {
      db.oauthGrants.delete(code);
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code has expired' });
    }

    // Verify PKCE if challenge was set
    if (grant.code_challenge) {
      if (!codeVerifier) {
        return res.status(400).json({ error: 'invalid_request', error_description: 'code_verifier required for PKCE validation' });
      }
      if (!verifyPkce(codeVerifier, grant.code_challenge)) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE code_verifier does not match challenge' });
      }
    }

    // Remove used code
    db.oauthGrants.delete(code);

    // Issue Access Token & Refresh Token
    const accessToken = `nexus_at_${crypto.randomBytes(32).toString('hex')}`;
    const refreshToken = `nexus_rt_${crypto.randomBytes(32).toString('hex')}`;
    const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const tokenGrant: OAuthGrant = {
      ...grant,
      id: `grant_token_${Date.now()}`,
      code: undefined,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: tokenExpires,
    };

    // Store mapped by access_token and refresh_token
    db.oauthGrants.set(accessToken, tokenGrant);
    db.oauthGrants.set(refreshToken, tokenGrant);

    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 7 * 24 * 3600,
      refresh_token: refreshToken,
      scope: grant.scopes.join(' '),
    });
  }

  if (grantType === 'refresh_token') {
    const refreshToken = req.body.refresh_token;
    if (!refreshToken) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing refresh_token' });
    }

    const grant = db.oauthGrants.get(refreshToken);
    if (!grant) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid refresh token' });
    }

    const newAccessToken = `nexus_at_${crypto.randomBytes(32).toString('hex')}`;
    const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    grant.access_token = newAccessToken;
    grant.expires_at = newExpires;
    db.oauthGrants.set(newAccessToken, grant);

    return res.json({
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: 7 * 24 * 3600,
      scope: grant.scopes.join(' '),
    });
  }

  return res.status(400).json({ error: 'unsupported_grant_type', error_description: 'Supported: authorization_code, refresh_token' });
});

// 5. /api/oauth/register (RFC 7591 Dynamic Client Registration)
oauthRouter.post('/register', (req: Request, res: Response) => {
  const clientName = req.body.client_name || 'Dynamic MCP Client';
  const redirectUris = req.body.redirect_uris || [];

  const clientId = `client_${crypto.randomBytes(12).toString('hex')}`;
  const clientSecret = `sec_${crypto.randomBytes(24).toString('hex')}`;

  const client: OAuthClient = {
    id: `cl_${Date.now()}`,
    client_id: clientId,
    client_secret: clientSecret,
    client_name: clientName,
    redirect_uris: redirectUris,
    allowed_scopes: [
      'dashboard:read',
      'products:read',
      'products:write',
      'inventory:read',
      'inventory:write',
      'customers:read',
      'customers:write',
      'orders:read',
      'orders:create',
      'orders:update',
      'orders:cancel',
      'packing:read',
      'packing:write',
      'shipping:read',
      'shipping:write',
      'payments:read',
      'payments:write',
      'returns:read',
      'returns:write',
      'reports:read',
      'reports:export',
      'audit:read',
    ],
    created_at: new Date().toISOString(),
  };

  db.oauthClients.set(client.client_id, client);

  res.status(201).json({
    client_id: client.client_id,
    client_secret: client.client_secret,
    client_name: client.client_name,
    redirect_uris: client.redirect_uris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  });
});

// 6. /api/oauth/revoke (RFC 7009)
oauthRouter.post('/revoke', (req: Request, res: Response) => {
  const token = req.body.token;
  if (token) {
    db.oauthGrants.delete(token);
  }
  res.json({ success: true, message: 'Token revoked if valid' });
});
