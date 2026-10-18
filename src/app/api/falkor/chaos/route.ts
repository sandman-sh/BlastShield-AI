import { NextResponse } from 'next/server';
import { triggerChaosCascade } from '@/lib/falkordb';
import { hasClearance, unauthorized } from '@/lib/auth';

export async function POST(req: Request) {
  if (!hasClearance(req)) return unauthorized();
  try {
    const { searchParams } = new URL(req.url);
    const graphName = searchParams.get('graph') || 'blastshield_infra';
    const chaosReport = await triggerChaosCascade(graphName);
    return NextResponse.json({ success: true, chaosReport });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Chaos injection failed' },
      { status: 500 }
    );
  }
}
