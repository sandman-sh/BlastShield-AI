import { NextResponse } from 'next/server';
import { getAgentMemories } from '@/lib/falkordb';
import { hasClearance, unauthorized } from '@/lib/auth';

export async function GET(req: Request) {
  if (!hasClearance(req)) return unauthorized();
  try {
    const { searchParams } = new URL(req.url);
    const graphName = searchParams.get('graph') || 'blastshield_infra';
    const memories = await getAgentMemories(graphName);
    return NextResponse.json({ success: true, memories });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch agent memories' },
      { status: 500 }
    );
  }
}
