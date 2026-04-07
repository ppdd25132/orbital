import { NextResponse } from 'next/server';
import {
  verifyLinkState,
  getLinkedAccounts,
  setLinkedAccountsCookie,
} from '@/lib/linked-accounts';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  if (error || !code || !stateParam) {
    return NextResponse.redirect(new URL('/?link_error=1', request.url));
  }

  const stateData = verifyLinkState(stateParam);
  if (!stateData) {
    return NextResponse.redirect(new URL('/?link_error=1', request.url));
  }

  // Exchange authorization code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/link-account/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/?link_error=1', request.url));
  }

  const tokens = await tokenRes.json();

  // Fetch the linked account's email
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoRes.ok) {
    return NextResponse.redirect(new URL('/?link_error=1', request.url));
  }

  const userInfo = await userInfoRes.json();

  // Don't allow linking the primary account to itself
  if (userInfo.email === stateData.primaryEmail) {
    return NextResponse.redirect(new URL('/?link_error=already_primary', request.url));
  }

  // Read current linked accounts from cookie and upsert
  const linked = getLinkedAccounts(request);
  const existingIdx = linked.findIndex((a) => a.email === userInfo.email);
  const entry = {
    email: userInfo.email,
    name: userInfo.name || userInfo.email,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || linked[existingIdx]?.refresh_token || null,
    token_expiry: tokens.expires_in
      ? Math.floor(Date.now() / 1000) + tokens.expires_in
      : null,
  };

  if (existingIdx >= 0) {
    linked[existingIdx] = entry;
  } else {
    linked.push(entry);
  }

  const response = NextResponse.redirect(new URL('/?linked=1', request.url));
  setLinkedAccountsCookie(response, linked);
  return response;
}
