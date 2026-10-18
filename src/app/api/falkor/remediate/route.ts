import { NextResponse } from 'next/server';
import { executeRemediation } from '@/lib/falkordb';
import { hasClearance, unauthorized } from '@/lib/auth';

export async function POST(req: Request) {
  if (!hasClearance(req)) return unauthorized();
  try {
    const body = await req.json();
    const { sourceNodeId, cutVertexAction, graphName } = body;

    if (!sourceNodeId) {
      return NextResponse.json(
        { success: false, error: 'sourceNodeId is required' },
        { status: 400 }
      );
    }

    const result = await executeRemediation(
      sourceNodeId,
      cutVertexAction || 'ISOLATE_NODE_AND_SEVER_EDGES',
      graphName || 'blastshield_infra'
    );

    return NextResponse.json({
      success: true,
      message: 'Autonomous remediation executed in FalkorDB',
      result
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute remediation' },
      { status: 500 }
    );
  }
}
