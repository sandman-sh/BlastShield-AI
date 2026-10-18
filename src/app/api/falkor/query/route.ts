import { NextResponse } from 'next/server';
import { executeCypher } from '@/lib/falkordb';
import { hasClearance, unauthorized } from '@/lib/auth';

export async function POST(req: Request) {
  if (!hasClearance(req)) return unauthorized();
  try {
    const body = await req.json();
    const { cypher, graphName } = body;

    if (!cypher || typeof cypher !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Cypher query string is required' },
        { status: 400 }
      );
    }

    const result = await executeCypher(
      cypher.trim(),
      graphName || 'blastshield_infra'
    );

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Cypher execution failed' },
      { status: 500 }
    );
  }
}
