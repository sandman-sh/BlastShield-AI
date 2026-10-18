import { NextResponse } from 'next/server';
import { getEntireTopology, getFalkorStatus, seedInfrastructure } from '@/lib/falkordb';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const graphName = searchParams.get('graph') || 'blastshield_infra';

    // Check if graph is seeded, if empty automatically seed it
    const status = await getFalkorStatus(graphName);
    if (status.connected && status.nodeCount === 0) {
      await seedInfrastructure(graphName);
    }

    const topology = await getEntireTopology(graphName);
    return NextResponse.json({
      success: true,
      graphName,
      ...topology
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch topology' },
      { status: 500 }
    );
  }
}
