import { createHmac } from 'node:crypto';

const required = name => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for Supabase mode`);
  return value.replace(/\/$/, '');
};

export function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SECRET_KEY);
}

export function createSupabaseClient() {
  const url = new URL(required('SUPABASE_URL')).origin;
  const publishable = required('SUPABASE_PUBLISHABLE_KEY');
  const secret = required('SUPABASE_SECRET_KEY');
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'website-media';
  const serviceHeaders = { apikey: secret, Authorization: `Bearer ${secret}` };

  async function request(path, { method = 'GET', body, headers = {}, key = secret, bearer = key, raw = false } = {}) {
    const response = await fetch(`${url}${path}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${bearer}`,
        ...(body !== undefined && !raw ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = await response.text();
      const error = new Error(detail || `Supabase request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    if (response.status === 204) return null;
    const type = response.headers.get('content-type') || '';
    return type.includes('json') ? response.json() : response.text();
  }

  const rest = (table, query = '', options = {}) => request(`/rest/v1/${table}${query}`, {
    ...options,
    headers: { Prefer: options.prefer || 'return=representation', ...(options.headers || {}) },
  });

  return {
    url,
    bucket,
    rest,
    serviceHeaders,
    csrf(accessToken) {
      return createHmac('sha256', secret).update(accessToken).digest('hex');
    },
    signIn(email, password) {
      return request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password }, key: publishable, bearer: publishable });
    },
    getAuthUser(accessToken) {
      return request('/auth/v1/user', { key: publishable, bearer: accessToken });
    },
    updatePassword(accessToken, password) {
      return request('/auth/v1/user', { method: 'PUT', body: { password }, key: publishable, bearer: accessToken });
    },
    requestPasswordRecovery(email, redirectTo) {
      return request(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, { method: 'POST', body: { email }, key: publishable, bearer: publishable });
    },
    verifyRecoveryToken(tokenHash) {
      return request('/auth/v1/verify', { method: 'POST', body: { token_hash: tokenHash, type: 'recovery' }, key: publishable, bearer: publishable });
    },
    logout(accessToken) {
      return request('/auth/v1/logout', { method: 'POST', key: publishable, bearer: accessToken });
    },
    createAuthUser(email, password, name) {
      return request('/auth/v1/admin/users', { method: 'POST', body: { email, password, email_confirm: true, user_metadata: { name } } });
    },
    updateAuthUser(id, body) {
      return request(`/auth/v1/admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body });
    },
    deleteAuthUser(id) {
      return request(`/auth/v1/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    async upload(storagePath, bytes, mimeType) {
      await request(`/storage/v1/object/${encodeURIComponent(bucket)}/${storagePath.split('/').map(encodeURIComponent).join('/')}`, {
        method: 'POST', body: bytes, raw: true,
        headers: { 'Content-Type': mimeType, 'x-upsert': 'false' },
      });
      return `${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${storagePath.split('/').map(encodeURIComponent).join('/')}`;
    },
  };
}
