import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import { getLinkedAccounts, setLinkedAccountsCookie } from '@/lib/linked-accounts';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const linked = getLinkedAccounts(request);
  return NextResponse.json({
    accounts: linked.map((a) => ({ email: a.email, name: a.name })),
  });
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email } = body;
  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }

  const linked = getLinkedAccounts(request).filter((a) => a.email !== email);
  const response = NextResponse.json({ ok: true });
  setLinkedAccountsCookie(response, linked);
  return response;
}
