import { getToken } from "next-auth/jwt";
import { getLinkedAccounts, refreshTokenIfNeeded } from "@/lib/linked-accounts";
import {
  getConnectedAccountToken,
  listConnectedAccounts,
  upsertConnectedAccount,
} from "@/lib/orbital-store";

async function primaryTokenFromSessionCookie(request) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  return token?.access_token || null;
}

async function refreshAndPersist(userEmail, accountEmail, tokenRecord) {
  const refreshed = await refreshTokenIfNeeded({
    email: accountEmail,
    ...tokenRecord,
  });

  if (refreshed?.access_token && refreshed.access_token !== tokenRecord.access_token) {
    await upsertConnectedAccount(userEmail, {
      email: accountEmail,
      name: accountEmail,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token || tokenRecord.refresh_token || null,
      token_expiry: refreshed.token_expiry || tokenRecord.token_expiry || null,
    }).catch(() => {});
  }

  return refreshed;
}

export async function resolveGmailAccessToken(request, session, accountEmail = null) {
  const userEmail = session?.user?.email;
  if (!userEmail) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  const targetEmail = accountEmail || userEmail;

  if (targetEmail === userEmail) {
    const primaryJwtToken = await primaryTokenFromSessionCookie(request);
    if (primaryJwtToken) return primaryJwtToken;

    const storedPrimary = await getConnectedAccountToken(userEmail, userEmail).catch(() => null);
    if (storedPrimary?.access_token) {
      return (await refreshAndPersist(userEmail, userEmail, storedPrimary)).access_token;
    }
  }

  const dbToken = await getConnectedAccountToken(userEmail, targetEmail).catch(() => null);
  if (dbToken?.access_token) {
    return (await refreshAndPersist(userEmail, targetEmail, dbToken)).access_token;
  }

  const linked = getLinkedAccounts(request);
  const cookieAccount = linked.find((entry) => entry.email === targetEmail);
  if (cookieAccount) {
    const refreshed = await refreshTokenIfNeeded(cookieAccount);
    await upsertConnectedAccount(userEmail, refreshed).catch(() => {});
    return refreshed.access_token;
  }

  const error = new Error("Gmail account token not available");
  error.status = targetEmail === userEmail ? 401 : 404;
  throw error;
}

export async function listLinkedGmailAccounts(request, session) {
  const userEmail = session?.user?.email;
  if (!userEmail) return [];

  const dbAccounts = await listConnectedAccounts(userEmail).catch(() => []);
  const filteredDbAccounts = dbAccounts.filter((account) => account.email !== userEmail);
  if (filteredDbAccounts.length) return filteredDbAccounts;

  return getLinkedAccounts(request).map((account) => ({
    email: account.email,
    name: account.name,
  }));
}
