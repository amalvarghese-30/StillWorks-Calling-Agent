import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
    },
  });
}
