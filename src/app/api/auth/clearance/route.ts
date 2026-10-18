import { NextResponse } from 'next/server';
import { getFalkorStatus } from '@/lib/falkordb';
import {
  BLASTSHIELD_SESSION_COOKIE,
  createSessionToken,
  isValidPasskey,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode === 'cluster' ? 'FALKORDB_CLUSTER_HANDSHAKE' : 'PASSKEY';

    if (mode === 'PASSKEY' && !isValidPasskey(String(body.passkey || ''))) {
      return NextResponse.json(
        { success: false, error: 'Invalid Incident Commander passkey.' },
        { status: 403 }
      );
    }

    let status = null;
    if (mode === 'FALKORDB_CLUSTER_HANDSHAKE') {
      status = await getFalkorStatus();
      if (!status.connected) {
        return NextResponse.json(
          { success: false, error: 'FalkorDB cluster is not reachable.' },
          { status: 503 }
        );
      }
    }

    const response = NextResponse.json({
      success: true,
      mode,
      status,
      message: 'Clearance authorized. Server-side session established.',
    });
    response.cookies.set({
      name: BLASTSHIELD_SESSION_COOKIE,
      value: createSessionToken(),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60,
      path: '/',
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Clearance failed.' },
      { status: 500 }
    );
  }
}
