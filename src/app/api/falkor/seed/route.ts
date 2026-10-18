import { NextResponse } from 'next/server';
import { seedInfrastructure } from '@/lib/falkordb';
import { hasClearance, unauthorized } from '@/lib/auth';

export async function POST(req: Request) {
  if (!hasClearance(req)) return unauthorized();
  try {
    const body = await req.json().catch(() => ({}));
    const graphName = body.graphName || 'blastshield_infra';
    const result = await seedInfrastructure(graphName);
    return NextResponse.json({
      success: true,
      message: 'Cloud infrastructure seeded successfully into FalkorDB',
      ...result
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to seed topology' },
      { status: 500 }
    );
  }
}
