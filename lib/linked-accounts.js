import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';

function getKey() {
  return createHash('sha256').update(process.env.NEXTAUTH_SECRET || 'dev-fallback').digest();
}

export function encryptAccounts(accounts) {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = JSON.stringify(accounts);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptAccounts(encoded) {
  try {
    const buf = Buffer.from(encoded, 'base64url');
    const iv = buf.subarray(0, 16);
    const tag = buf.subarray(16, 32);
    const encrypted = buf.subarray(32);
    const key = getKey();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    return [];
  }
}

export function getLinkedAccounts(request) {
  const cookie = request.cookies.get('orbital_linked');
  if (!cookie?.value) return [];
  return decryptAccounts(cookie.value);
}

export function setLinkedAccountsCookie(response, accounts) {
  response.cookies.set('orbital_linked', encryptAccounts(accounts), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
}

export function generateLinkState(primaryEmail) {
  const nonce = randomBytes(16).toString('hex');
  const hmac = createHmac('sha256', process.env.NEXTAUTH_SECRET || 'dev-fallback')
    .update(`${nonce}:${primaryEmail}`)
    .digest('hex');
  return Buffer.from(JSON.stringify({ nonce, primaryEmail, hmac })).toString('base64url');
}

export function verifyLinkState(stateParam) {
  try {
    const { nonce, primaryEmail, hmac } = JSON.parse(
      Buffer.from(stateParam, 'base64url').toString()
    );
    const expected = createHmac('sha256', process.env.NEXTAUTH_SECRET || 'dev-fallback')
      .update(`${nonce}:${primaryEmail}`)
      .digest('hex');
    if (hmac !== expected) return null;
    return { primaryEmail };
  } catch {
    return null;
  }
}

export async function refreshTokenIfNeeded(account) {
  if (!account.refresh_token) return account;
  const now = Math.floor(Date.now() / 1000);
  if (account.token_expiry && account.token_expiry > now + 60) return account;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    });
    if (!res.ok) return account;
    const tokens = await res.json();
    return {
      ...account,
      access_token: tokens.access_token,
      token_expiry: tokens.expires_in
        ? Math.floor(Date.now() / 1000) + tokens.expires_in
        : account.token_expiry,
    };
  } catch {
    return account;
  }
}
