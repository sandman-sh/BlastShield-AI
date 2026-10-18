import { NextResponse } from 'next/server';
import { calculateBlastRadius } from '@/lib/falkordb';
import { hasClearance, unauthorized } from '@/lib/auth';

export async function POST(req: Request) {
  if (!hasClearance(req)) return unauthorized();
  try {
    const body = await req.json();
    const { sourceNodeId, incidentCategory, graphName } = body;

    if (!sourceNodeId) {
      return NextResponse.json(
        { success: false, error: 'sourceNodeId is required' },
        { status: 400 }
      );
    }

    const report = await calculateBlastRadius(
      sourceNodeId,
      incidentCategory || 'IAM_LEAK',
      graphName || 'blastshield_infra'
    );

    return NextResponse.json({
      success: true,
      report
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate blast radius' },
      { status: 500 }
    );
  }
}
