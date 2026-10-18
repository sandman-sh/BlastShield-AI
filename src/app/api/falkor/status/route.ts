import { NextResponse } from 'next/server';
import { getFalkorStatus } from '@/lib/falkordb';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const graphName = searchParams.get('graph') || 'blastshield_infra';
    const status = await getFalkorStatus(graphName);
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { connected: false, error: error.message || 'Failed to connect to FalkorDB' },
      { status: 500 }
    );
  }
}
